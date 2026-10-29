import { hexToBytesStrict, toHex } from "@satchel/core/bytes";
import { buildBtcSend, MempoolClient, referencedTxids, testnet4FeeRate, type Utxo } from "@satchel/core/chains/btc";
import { buildUnsignedEvmTx, createSepoliaClient, evmPayloadHash, prepareEvmSend, serializeUnsignedEvmTx } from "@satchel/core/chains/evm";
import {
  buildSolTransfer,
  checkSolSend,
  createSolConnection,
  getSolBalance,
  solAccountExists,
  SOL_FEE_LAMPORTS,
  SOL_RENT_MIN_LAMPORTS,
  solMaxSend,
  toBase58,
  type BuiltSolTransfer,
  type SolSendProblem,
} from "@satchel/core/chains/sol";
import { checkEvmNonce, classifySignRequest, evmMaxAllowedNonce, maxSignedEvmNonce } from "@satchel/core/policy";
import { copy } from "@/lib/copy";
import { BTC_APIS, IS_FIXTURE, SEPOLIA_RPCS, SOL_RPCS } from "@/lib/config";
import { FIXTURE_BALANCES, FIXTURE_RECORDS } from "@/lib/data/fixtures";
import { simSolBlockhashHex, simSolHeight, simSolLife } from "@/lib/data/sim";
import { satchelAddresses } from "@/lib/derive";
import type { SigRecordView, SignRequest } from "@/lib/near/types";
import type { PendingIntent } from "@/lib/signing/types";

/**
 * Send preparation (kb/90 §8.2, §8.6 `preparing`): build the unsigned chain tx and the exact `sign_for` request while
 * the Review card is shown, so the wallet call can happen synchronously in the click handler. Loaded lazily by the
 * Send route (chain libraries never enter other bundles). Uses @satchel/core builders in both modes; fixture mode only
 * replaces the network reads (nonce, fees, UTXOs) with fixture values.
 */

export interface PreparedSend {
  chain: "btc" | "evm" | "sol";
  request: SignRequest;
  payloadHashes: string[];
  unsigned: PendingIntent["unsigned"];
  evmNonce?: number;
  amount: bigint;
  fee: bigint;
  feeRate?: number;
  inputsCount: number;
  to: string;
  balance: bigint;
  after: bigint;
  /** SOL only: what the message was built from, and when its blockhash was fetched (≤ 10 s old at the click, D-09). */
  sol?: { from: string; lamports: bigint; recentBlockhash: string; lastValidBlockHeight: number; fetchedAt: number; rentMin: bigint; recipientExists: boolean };
}

export interface PrepareArgs {
  tokenId: string;
  chain: "btc" | "evm" | "sol";
  to: string;
  amount: bigint | "max";
  records: SigRecordView[];
  /**
   * Retry rules (kb/90 §8.7): reuse the nonce / the input set of the earlier intent; SOL rebuilds only once the old
   * blockhash is invalid (`solNotBefore` = the old lastValidBlockHeight).
   */
  reuse?: { evmNonce?: number; btcInputs?: string[]; bumpFees?: boolean; solNotBefore?: number };
  recipientTokenRecords?: SigRecordView[];
}

const FIXTURE_FEES = { maxFeePerGas: 3_000_000_000n, maxPriorityFeePerGas: 1_500_000_000n };

function fixtureNextNonce(tokenId: string): number {
  const used = (FIXTURE_RECORDS[tokenId] ?? []).filter((r) => "evm" in r.detail).map((r) => ("evm" in r.detail ? r.detail.evm.nonce : 0));
  return used.length ? Math.max(...used) + 1 : 0;
}

function fixtureUtxos(tokenId: string): Utxo[] {
  const total = BigInt(FIXTURE_BALANCES[tokenId]?.btc.confirmed ?? "0");
  if (total === 0n) return [];
  const big = total > 60_000n ? total - 50_000n : total;
  const out: Utxo[] = [{ txid: (tokenId.padStart(2, "0") + "a1").repeat(16), vout: 0, value: big, confirmed: true }];
  if (total > 60_000n) out.push({ txid: (tokenId.padStart(2, "0") + "b2").repeat(16), vout: 1, value: 50_000n, confirmed: true });
  return out;
}

/** mempool.space/testnet4 primary + the configured fallbacks (core `MempoolClient`, kb/90 §8.3). */
export const mempoolClient = () => new MempoolClient({ primary: BTC_APIS[0], fallbacks: BTC_APIS.slice(1) });

export async function prepareSend(a: PrepareArgs): Promise<PreparedSend> {
  const addr = satchelAddresses(a.tokenId);
  if (a.chain === "sol") return prepareSol(a, addr.sol);
  if (a.chain === "evm") {
    let unsignedHex: `0x${string}`;
    let nonce: number;
    let fee: bigint;
    let value: bigint;
    let balance: bigint;
    if (IS_FIXTURE) {
      balance = BigInt(FIXTURE_BALANCES[a.tokenId]?.evm ?? "0");
      nonce = a.reuse?.evmNonce ?? fixtureNextNonce(a.tokenId);
      const bump = a.reuse?.bumpFees ? 110n : 100n;
      const maxFee = (FIXTURE_FEES.maxFeePerGas * bump) / 100n;
      const tip = (FIXTURE_FEES.maxPriorityFeePerGas * bump) / 100n;
      fee = 21_000n * maxFee;
      value = a.amount === "max" ? balance - fee : a.amount;
      if (value <= 0n || value + fee > balance) throw new Error("insufficient funds");
      unsignedHex = serializeUnsignedEvmTx(buildUnsignedEvmTx({ nonce, to: a.to as `0x${string}`, value, maxFeePerGas: maxFee, maxPriorityFeePerGas: tip }));
    } else {
      const client = createSepoliaClient(SEPOLIA_RPCS);
      const p = await prepareEvmSend(client, { from: addr.evm, to: a.to as `0x${string}`, value: a.amount, nonce: a.reuse?.evmNonce });
      unsignedHex = p.unsigned;
      nonce = Number(p.tx.nonce);
      fee = p.feeMax;
      value = p.tx.value ?? 0n;
      balance = p.balance;
    }
    // kb/90 §5.9 nonce-gap rule (D-43): never build a request the contract would refuse with ERR_EVM_NONCE_GAP.
    const maxSigned = maxSignedEvmNonce(a.records);
    if (checkEvmNonce(BigInt(nonce), maxSigned)) {
      throw Object.assign(new Error(copy.errors.nonceGap(evmMaxAllowedNonce(maxSigned).toString())), { problem: "evm_nonce_gap" });
    }
    const payload = toHex(evmPayloadHash(unsignedHex));
    const raw = unsignedHex.slice(2);
    return {
      chain: "evm",
      request: { evm: { unsigned_tx: raw } },
      payloadHashes: [payload],
      unsigned: { evmTx: unsignedHex },
      evmNonce: nonce,
      amount: value,
      fee,
      inputsCount: 1,
      to: a.to,
      balance,
      after: balance - value - fee,
    };
  }

  // BTC
  let utxos: Utxo[];
  let feeRate: number;
  if (IS_FIXTURE) {
    utxos = fixtureUtxos(a.tokenId);
    feeRate = 2;
  } else {
    const c = mempoolClient();
    const [u, f] = await Promise.all([c.utxos(addr.btc), c.fees()]);
    utxos = u.map((x) => ({ txid: x.txid, vout: x.vout, value: BigInt(x.value), confirmed: !!x.status?.confirmed }));
    feeRate = testnet4FeeRate(f);
  }
  const reuse = a.reuse?.btcInputs?.length ? utxos.filter((u) => a.reuse!.btcInputs!.includes(`${u.txid}:${u.vout}`)) : undefined;
  if (a.reuse?.btcInputs?.length && reuse?.length !== a.reuse.btcInputs.length) throw new Error("the earlier coins are no longer available");
  const forbidden = new Set<string>([...referencedTxids(a.records), ...referencedTxids(a.recipientTokenRecords ?? [])]);
  const built = buildBtcSend({ from: { address: addr.btc, pubkey: addr.btcPubkey }, to: a.to, amount: a.amount, utxos, feeRate, forbiddenTxids: forbidden, inputs: reuse });
  const balance = utxos.reduce((s, u) => s + u.value, 0n);
  return {
    chain: "btc",
    request: built.signRequest as SignRequest,
    payloadHashes: built.payloads.map((p) => toHex(p)),
    unsigned: { btc: { psbtHex: "", preimages: built.preimages.map((p) => toHex(p)), outputs: toHex(built.outputs), inputs: built.inputOutpoints } },
    amount: built.amount,
    fee: built.fee,
    feeRate,
    inputsCount: built.preimages.length,
    to: a.to,
    balance,
    after: balance - built.amount - built.fee,
  };
}

/* ───────────────────────────── Solana (P2; kb/32, D-09) ───────────────────────────── */

/** A rent or balance rule failed (kb/32 §Fees and rent; kb/80 E25/E26). `problem` maps to copy. */
export class SolSendError extends Error {
  constructor(readonly problem: Exclude<SolSendProblem, null> | "no_balance" | "old_blockhash_valid") {
    super(problem);
  }
}

interface SolChainReads {
  balance(address: string): Promise<bigint>;
  recipientExists(address: string): Promise<boolean>;
  rentMin(): Promise<bigint>;
  latestBlockhash(): Promise<{ blockhash: string; lastValidBlockHeight: number }>;
  blockHeight(): Promise<number>;
}

/** Fixture: the clock-driven devnet stand-in in sim.ts (no network). Live: Solana devnet RPC (kb/90 §8.3). */
function solReads(): SolChainReads {
  if (IS_FIXTURE) {
    return {
      balance: async (address) => {
        const id = Object.keys(FIXTURE_BALANCES).find((k) => satchelAddresses(k).sol === address);
        return BigInt(id ? FIXTURE_BALANCES[id].sol : "0");
      },
      recipientExists: async () => true,
      rentMin: async () => SOL_RENT_MIN_LAMPORTS,
      latestBlockhash: async () => {
        const h = simSolHeight();
        return { blockhash: toBase58(hexToBytesStrict(simSolBlockhashHex(h))), lastValidBlockHeight: h + simSolLife() };
      },
      blockHeight: async () => simSolHeight(),
    };
  }
  const conn = createSolConnection(SOL_RPCS[0]);
  return {
    balance: (address) => getSolBalance(conn, address),
    recipientExists: (address) => solAccountExists(conn, address),
    rentMin: async () => BigInt(await conn.getMinimumBalanceForRentExemption(0)),
    latestBlockhash: () => conn.getLatestBlockhash("confirmed"),
    blockHeight: () => conn.getBlockHeight("confirmed"),
  };
}

/** The SOL balance of a Satchel (the form's "Available"), when the snapshot didn't carry it. */
export async function solBalance(address: string): Promise<bigint> {
  return solReads().balance(address);
}

function solPrepared(built: BuiltSolTransfer, base: Omit<NonNullable<PreparedSend["sol"]>, "recentBlockhash" | "lastValidBlockHeight" | "fetchedAt">, to: string, balance: bigint, fetchedAt: number): PreparedSend {
  const message = toHex(built.message);
  const request: SignRequest = { sol: { message } };
  // The record payload is what the contract hashes (sha256(message) for SOL): take it from the reference classifier.
  const c = classifySignRequest(request as never);
  if (!c.ok) throw new Error(c.error);
  return {
    chain: "sol",
    request,
    payloadHashes: c.recordPayloads.map((p) => toHex(p)),
    unsigned: { sol: { message, lastValidBlockHeight: built.lastValidBlockHeight } },
    amount: base.lamports,
    fee: SOL_FEE_LAMPORTS,
    inputsCount: 1,
    to,
    balance,
    after: balance - base.lamports - SOL_FEE_LAMPORTS,
    sol: { ...base, recentBlockhash: built.recentBlockhash, lastValidBlockHeight: built.lastValidBlockHeight, fetchedAt },
  };
}

const SOL_RETRY_POLL_MS = 1500;
const SOL_RETRY_MAX_MS = 60_000;

async function prepareSol(a: PrepareArgs, from: string): Promise<PreparedSend> {
  const r = solReads();
  // Retry after a timeout: the old blockhash must be invalid first, so at most one of the two can ever land (§8.7).
  if (a.reuse?.solNotBefore != null) {
    const until = Date.now() + SOL_RETRY_MAX_MS;
    while ((await r.blockHeight()) <= a.reuse.solNotBefore) {
      if (Date.now() > until) throw new SolSendError("old_blockhash_valid");
      await new Promise((res) => setTimeout(res, SOL_RETRY_POLL_MS));
    }
  }
  const [balance, recipientExists, rentMin, bh] = await Promise.all([r.balance(from), r.recipientExists(a.to), r.rentMin(), r.latestBlockhash()]);
  const fetchedAt = Date.now();
  if (balance === 0n) throw new SolSendError("no_balance");
  const lamports = a.amount === "max" ? solMaxSend(balance) : a.amount;
  const problem = checkSolSend({ balance, lamports, recipientExists, rentMin });
  if (problem) throw new SolSendError(problem);
  const built = buildSolTransfer({ from, to: a.to, lamports, recentBlockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight });
  return solPrepared(built, { from, lamports, rentMin, recipientExists }, a.to, balance, fetchedAt);
}

/**
 * D-09: refresh the blockhash of a prepared SOL send (Review refreshes every 8 s so the hash is ≤ 10 s old at the
 * click). Only the blockhash changes; amount, recipient and rent checks stay as reviewed.
 */
export async function refreshSolBlockhash(p: PreparedSend): Promise<PreparedSend> {
  if (p.chain !== "sol" || !p.sol) return p;
  const bh = await solReads().latestBlockhash();
  const fetchedAt = Date.now();
  const built = buildSolTransfer({ from: p.sol.from, to: p.to, lamports: p.sol.lamports, recentBlockhash: bh.blockhash, lastValidBlockHeight: bh.lastValidBlockHeight });
  return solPrepared(built, { from: p.sol.from, lamports: p.sol.lamports, rentMin: p.sol.rentMin, recipientExists: p.sol.recipientExists }, p.to, p.balance, fetchedAt);
}
