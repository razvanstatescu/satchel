import { evmDepth, TESTNET_POLICY, verifiedBtcBalance } from "@satchel/core/clean-history";
import { BTC_APIS, IS_FIXTURE } from "@/lib/config";
import { satchelAddresses } from "@/lib/derive";
import { dataSource } from "@/lib/data/source";
import type { EvmChainBalance, SatchelSnapshot } from "@/lib/data/types";
import { evmRpcs, EVM_IDS, SEPOLIA, usdcAddress } from "@/lib/evm-networks";
import { holdings, type Holding } from "@/lib/holdings";

/**
 * The balance shown next to a clean verdict ("You get"), read FRESH in the browser (no server or CDN cache) at the
 * depth the check uses (kb/90 §7.3 "Verified balance"; docs/security/seller-threat-model.md G-2):
 * - BTC: confirmed coins at policy depth K, leaving out any coin an earlier signature references ("encumbered") and
 *   any coin not deep enough; a send already in the mempool lowers it. Coins that never existed are not in the UTXO set.
 * - EVM: ETH and USDC at `latest - depth` on each network (the same depth the nonce check uses), never `latest`.
 * - SOL and the coins inside the contract are not touched by a signature drain: they keep the snapshot's values.
 * Loaded on demand (its own chunk): only the Buy tab asks for it.
 */

export type VerifiedBalances = SatchelSnapshot["balances"];

export interface BtcUtxo {
  txid: string;
  vout: number;
  value: number | bigint;
  status: { confirmed: boolean; block_height?: number };
}

/** Pure: the Bitcoin balance a buyer is promised. `addressUnconfirmed` is the mempool net (negative = a send in flight). */
export function verifiedBtc(utxos: BtcUtxo[], encumbered: string[], tip: number, addressUnconfirmed: bigint, k = TESTNET_POLICY.btcK): { btc: NonNullable<VerifiedBalances["btc"]>; excluded_sats: bigint } {
  const v = verifiedBtcBalance(utxos, encumbered, tip, k);
  // holdings() subtracts a negative unconfirmed amount (a spend in the mempool); a positive one never counts
  return { btc: { confirmed_sats: v.verified.toString(), unconfirmed_sats: (addressUnconfirmed < 0n ? addressUnconfirmed : 0n).toString() }, excluded_sats: v.encumbered };
}

/** The block number an EVM balance is read at: `latest - depth` for this network, never below 0. */
export function evmReadBlock(tip: bigint, chainId: number): bigint {
  const at = tip - BigInt(evmDepth(TESTNET_POLICY, chainId));
  return at < 0n ? 0n : at;
}

async function fetchJson(url: string, init?: RequestInit, ms = 4000): Promise<unknown> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    // no-store: the point is to bypass every cache between the buyer and the chain
    const r = await fetch(url, { ...init, cache: "no-store", signal: ctl.signal });
    if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function rpc(chainId: number, method: string, params: unknown[]): Promise<string> {
  let last: unknown;
  for (const u of evmRpcs(chainId)) {
    try {
      const j = (await fetchJson(u, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) })) as { result?: string };
      if (typeof j.result === "string") return j.result;
      throw new Error(method);
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error(method);
}

const big = (hex: string) => BigInt(hex === "0x" ? "0x0" : hex).toString();

async function liveEvmChain(chainId: number, evm: string): Promise<EvmChainBalance> {
  if (chainId !== SEPOLIA) {
    // An L2 that doesn't answer reads as unavailable (null), never as a failed read: only Bitcoin and Sepolia fail closed.
    try {
      return await readEvmChain(chainId, evm);
    } catch {
      return { chain_id: chainId, wei: null, usdc: null };
    }
  }
  return readEvmChain(chainId, evm);
}

async function readEvmChain(chainId: number, evm: string): Promise<EvmChainBalance> {
  const tip = BigInt(await rpc(chainId, "eth_blockNumber", []));
  const tag = `0x${evmReadBlock(tip, chainId).toString(16)}`;
  const data = `0x70a08231${evm.slice(2).toLowerCase().padStart(64, "0")}`;
  const [wei, usdc] = await Promise.allSettled([rpc(chainId, "eth_getBalance", [evm, tag]), rpc(chainId, "eth_call", [{ to: usdcAddress(chainId), data }, tag])]);
  if (chainId === SEPOLIA && wei.status === "rejected") throw new Error("sepolia balance");
  return { chain_id: chainId, wei: wei.status === "fulfilled" ? big(wei.value) : null, usdc: usdc.status === "fulfilled" ? big(usdc.value) : null };
}

/** FIXTURE ONLY (`satchel:sim:drained`): the chain read comes back empty, as after a broadcast drain that reached depth. */
function simDrained(b: VerifiedBalances): VerifiedBalances {
  try {
    if (!IS_FIXTURE || window.localStorage.getItem("satchel:sim:drained") !== "1") return b;
  } catch {
    return b;
  }
  return {
    ...b,
    btc: b.btc ? { confirmed_sats: "0", unconfirmed_sats: "0" } : b.btc,
    evm: b.evm ? { wei: "0" } : b.evm,
    evm_chains: b.evm_chains?.map((r) => ({ ...r, wei: r.wei === null ? null : "0", usdc: r.usdc === null ? null : "0" })),
  };
}

/**
 * Read the verified balances now. `base` supplies what a signature can't change (Solana). Throws when Bitcoin or
 * Sepolia can't be read (the caller fails closed); another network that doesn't answer reads as unavailable.
 */
export interface VerifiedRead {
  balances: VerifiedBalances;
  /** Bitcoin left out because an earlier signature can still spend it. */
  excluded_sats: bigint;
}

type BtcStats = { mempool_stats: { funded_txo_sum: number; spent_txo_sum: number } };

/** The three Bitcoin reads from one provider, trying each configured provider in turn (all three from the same one). */
async function readBtc(address: string): Promise<[BtcUtxo[], number, BtcStats]> {
  let last: unknown;
  for (const api of BTC_APIS) {
    try {
      return (await Promise.all([
        fetchJson(`${api}/address/${address}/utxo`),
        fetchJson(`${api}/blocks/tip/height`),
        fetchJson(`${api}/address/${address}`),
      ])) as [BtcUtxo[], number, BtcStats];
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error("bitcoin balance");
}

export async function readVerifiedBalances(tokenId: string, encumbered: string[], base: VerifiedBalances): Promise<VerifiedRead> {
  if (IS_FIXTURE) {
    const addr = satchelAddresses(tokenId);
    const b = await dataSource().balances(addr, tokenId, { timeoutMs: 1500 });
    return { balances: simDrained({ btc: b.btc, evm: b.evm, sol: base.sol, ...(b.evm_chains ? { evm_chains: b.evm_chains } : {}) }), excluded_sats: 0n };
  }
  const addr = satchelAddresses(tokenId);
  const [[utxos, tip, stats], chains] = await Promise.all([readBtc(addr.btc), Promise.all(EVM_IDS.map((id) => liveEvmChain(id, addr.evm)))]);
  const unconfirmed = BigInt(stats.mempool_stats.funded_txo_sum) - BigInt(stats.mempool_stats.spent_txo_sum);
  const sep = chains.find((c) => c.chain_id === SEPOLIA);
  const btc = verifiedBtc(utxos, encumbered, Number(tip), unconfirmed);
  return { balances: { btc: btc.btc, evm: sep?.wei != null ? { wei: sep.wei } : null, sol: base.sol, evm_chains: chains }, excluded_sats: btc.excluded_sats };
}

/**
 * What a buyer was shown versus what the chains say now. `lowered` lists every coin that is now less than the baseline
 * (or can no longer be read). The baseline only moves up or stays: a figure that dropped stays the one to confirm
 * against until the buyer has been shown the new one (`ack`).
 */
export function reconcile(baseline: VerifiedBalances | null, next: VerifiedBalances, inside?: SatchelSnapshot["inside"]): { lowered: Holding[]; baseline: VerifiedBalances } {
  if (!baseline) return { lowered: [], baseline: next };
  const was = holdings({ balances: baseline, inside });
  const now = holdings({ balances: next, inside });
  const lowered = now.filter((h) => {
    const w = was.find((x) => x.key === h.key);
    return !!w && w.amount !== null && w.amount > 0n && (h.amount === null || h.amount < w.amount);
  });
  return { lowered, baseline: lowered.length ? baseline : next };
}
