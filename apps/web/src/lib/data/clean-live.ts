import { BTC_APIS, CONTRACT_ROLE, EXPECTED_CODE_HASH, MPC_CONTRACT, NEAR_RPCS, SATCHEL_CONTRACT, SEPOLIA_RPCS, SOL_RPCS } from "@/lib/config";
import { copy, CHAIN_NAME } from "@/lib/copy";
import { lockChecks } from "@/lib/data/clean";
import type { CleanItem, CleanReport, ItemStatus } from "@/lib/data/types";
import { formatAmount, truncateMiddle } from "@/lib/format";
import { makeNearProvider } from "@/lib/near/rpc";
import type { SigRecordView } from "@/lib/near/types";
import { satchelAddresses } from "@/lib/derive";
import { EVM_IDS, evmNetworkName, evmRpcs, SEPOLIA } from "@/lib/evm-networks";
import { safeMessage } from "@/lib/message";

/**
 * The live clean-history check through @satchel/core/clean-history (kb/90 §7): two NEAR sources (FastNEAR, dRPC),
 * two RPCs per EVM testnet (C3), mempool.space + emzy, Solana devnet. Isomorphic: the browser result gates Buy; the server route
 * returns the same report as a hint. The core report is mapped to the UI view model here.
 */

type CoreReport = Awaited<ReturnType<typeof import("@satchel/core/clean-history").checkCleanHistory>>;

function nearViews(url: string) {
  const p = makeNearProvider({ urls: [url], apiKey: typeof window === "undefined" ? process.env.FASTNEAR_API_KEY?.trim() || null : null });
  return {
    viewFunction: (contractId: string, method: string, args: Record<string, unknown>) =>
      p.callFunction({ contractId, method, args, blockQuery: { finality: "final" } } as never) as Promise<unknown>,
    viewAccount: async (accountId: string) => {
      try {
        const a = (await p.viewAccount({ accountId, blockQuery: { finality: "final" } } as never)) as { code_hash: string };
        return { code_hash: a.code_hash };
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (/does not exist|UNKNOWN_ACCOUNT/i.test(m)) return null;
        throw e;
      }
    },
    viewAccessKeyList: (accountId: string) => p.viewAccessKeyList({ accountId, finalityQuery: { finality: "final" } } as never) as Promise<{ keys: unknown[] }>,
  };
}

const CACHE_PREFIX = "satchel:verdict:v1:";
function browserCache() {
  if (typeof window === "undefined") return undefined;
  return {
    get(key: string) {
      try {
        const raw = window.localStorage.getItem(CACHE_PREFIX + key);
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    },
    set(key: string, v: unknown) {
      try {
        window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    },
  };
}

type CleanHistory = typeof import("@satchel/core/clean-history");
type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<Response>;

/**
 * The chain sources of the checker (kb/90 §7.5): 2 RPCs per EVM testnet, mempool.space + emzy, and Solana devnet.
 * SOL MUST have a source: without one the core checker reports the SOL account check as `unknown`, which blocks Buy
 * for every Satchel (docs/handoff/core.md §3 item 8). One SOL provider is enough by design (R-19, plan/decisions.md).
 */
export async function cleanSources(ch: CleanHistory, fetchImpl?: FetchLike) {
  const { MEMPOOL_TESTNET4, EMZY_TESTNET4 } = await import("@satchel/core/chains/btc");
  const { SOL_DEVNET_RPC } = await import("@satchel/core/chains/sol");
  const f = fetchImpl ? { fetch: fetchImpl as never } : {};
  const solUrls = SOL_RPCS.length ? SOL_RPCS.slice(0, 1) : [SOL_DEVNET_RPC];
  // C3 (SR-02): two providers per EVM testnet, so records on Base, Arbitrum or OP Sepolia are checked on their own
  // chain instead of failing closed as `unknown` (which would block Buy). Sepolia keeps the env list.
  const evmByChain = Object.fromEntries(EVM_IDS.map((id) => [id, evmRpcs(id).slice(0, 2).map((u) => ch.jsonRpcEvmSource(u, f))]));
  return {
    evm: SEPOLIA_RPCS.slice(0, 2).map((u) => ch.jsonRpcEvmSource(u, f)),
    evmByChain,
    btc: [ch.esploraBtcSource(BTC_APIS[0] ?? MEMPOOL_TESTNET4, f), ch.esploraBtcSource(BTC_APIS[1] ?? EMZY_TESTNET4, f)],
    sol: solUrls.map((u) => ch.solRpcSource(u, f)),
  };
}

export async function runLiveCheck(tokenId: string, source: CleanReport["source"]): Promise<CleanReport> {
  const ch = await import("@satchel/core/clean-history");
  const near = await Promise.all(
    NEAR_RPCS.slice(0, 2).map((u) => ch.collectNearSnapshot(new URL(u).host, nearViews(u), SATCHEL_CONTRACT, tokenId, { mpcContract: MPC_CONTRACT })),
  );
  const addr = satchelAddresses(tokenId);
  const report = await ch.checkCleanHistory(
    {
      network: "testnet",
      contractId: SATCHEL_CONTRACT,
      tokenId,
      role: CONTRACT_ROLE,
      expectedCodeHash: EXPECTED_CODE_HASH ?? undefined,
      displayedAddresses: { btc: addr.btc, evm: addr.evm, sol: addr.sol },
      near,
      now: Date.now(),
    },
    { ...(await cleanSources(ch)), cache: browserCache() as never },
  );
  const records = near.flatMap((n) => ("records" in n ? n.records : []))
    .filter((r, i, all) => all.findIndex((x) => x.seq === r.seq) === i) as unknown as SigRecordView[];
  return mapCoreReport(report, records, source);
}

function evidenceLine(it: CoreReport["items"][number]): string {
  const ev = it.evidence as Record<string, unknown>;
  switch (it.reason) {
    case "nonce_used":
      return `Nonce ${it.nonce} used${ev.confirmations ? ` · ${ev.confirmations} confirmations` : ""}`;
    case "nonce_unused":
      return `Nonce ${it.nonce} not used yet`;
    case "outpoint_unspent":
      return `${it.outpoint ? truncateMiddle(it.outpoint, 8, 6) : "coin"} unspent`;
    case "spent":
    case "tx_conflict":
      return ev.spending_txid ? `Spent in ${truncateMiddle(String(ev.spending_txid), 8, 4)}` : "All inputs spent";
    case "unfunded":
    case "unknown_txid":
      return copy.clean.item.unfundedBody;
    case "prevout_not_ours":
      return copy.clean.item.foreignBody;
    case "not_a_current_coin":
      return copy.clean.item.inactiveBody;
    case "young":
    case "blockhash_valid":
      return "Blockhash still valid";
    case "expired":
      return "Blockhash expired. It can't be used.";
    case "message_signature":
      return it.message_text !== undefined ? copy.record.messageBody(safeMessage(it.message_text).text) : copy.record.messageNote;
    case "providers_disagree":
      return "Providers disagree";
    case "too_many_txids":
      return "Too many coins to verify in the browser; ask the seller to consolidate.";
    default:
      return it.reason.replace(/_/g, " ");
  }
}

export function mapCoreReport(r: CoreReport, records: SigRecordView[], source: CleanReport["source"]): CleanReport {
  const items: CleanItem[] = r.items.map((it) => {
    const rec = records.find((x) => x.seq === it.seq);
    let key = `${CHAIN_NAME[it.chain]} · `;
    if (it.message_kind) key = copy.record.messageKey(CHAIN_NAME[it.chain]);
    else if (it.chain === "evm" && it.chain_id && it.chain_id !== SEPOLIA) key = copy.record.chainNonce(evmNetworkName(it.chain_id), it.nonce ?? "?");
    else if (it.chain === "evm") key += `nonce ${it.nonce ?? "?"}`;
    else if (it.chain === "btc") key += `coin ${it.outpoint ? truncateMiddle(it.outpoint, 4, 4) : "?"}`;
    else key += `blockhash ${(it.recent_blockhash ?? "").slice(0, 4)}…`;
    const wouldPay =
      it.chain === "btc" && it.claimed_amount_sats
        ? copy.clean.item.wouldPay(formatAmount(it.claimed_amount_sats, "BTC"), "its recipient", true)
        : it.erc20
          ? copy.clean.item.wouldPay(formatAmount(it.erc20.amount, "USDC"), truncateMiddle(`0x${it.erc20.to.replace(/^0x/, "")}`, 6, 4), false)
          : null;
    const message = it.message_kind && it.message_text !== undefined ? { kind: it.message_kind, text: it.message_text } : undefined;
    return {
      ...(message ? { message } : {}),
      ...(it.erc20 ? { erc20: it.erc20 } : {}),
      ...(it.chain_id ? { chainId: it.chain_id } : {}),
      seq: it.seq,
      chain: it.chain,
      key,
      wouldPay,
      amountSource: it.chain === "btc" ? "claimed" : "chain",
      evidence: evidenceLine(it),
      evidenceUrl: it.evidence_url ?? null,
      status: it.status as ItemStatus,
      signedAt: rec?.timestamp_ms ?? 0,
      height: rec?.height ?? 0,
      requester: rec?.requester ?? "",
    };
  });
  const c = r.contract;
  const lock = {
    access_keys: c.access_keys,
    account_exists: c.exists,
    locked: c.locked,
    code_hash_hex: c.code_hash,
    expected_code_hash: c.expected_code_hash,
    code_matches: c.code_ok,
    birth_tx: null,
    birth_block: null,
  };
  // C3: one EVM account check per chain that has records (Sepolia always); the row passes only if every one does
  const evmAccts = r.accounts.filter((a) => a.chain === "evm");
  const evmAcct = evmAccts.find((a) => a.status !== "ok") ?? evmAccts[0];
  const solAcct = r.accounts.find((a) => a.chain === "sol");
  const unsafeReason = r.aggregate !== "unsafe" ? null : evmAcct?.status === "unsafe" ? "delegated" : solAcct?.status === "unsafe" ? "sol" : c.locked === false ? "keys" : c.code_ok === false ? "code" : "keys";
  return {
    token_id: r.token_id,
    aggregate: r.aggregate,
    checked_at: Date.parse(r.checked_at) || Date.now(),
    sig_count: r.sig_count ?? 0,
    listing_id: null,
    one_of_two: !!r.sources_note,
    role: CONTRACT_ROLE,
    checks: [
      ...lockChecks(lock, CONTRACT_ROLE),
      { name: evmAcct?.status === "ok" ? copy.clean.checks.evm : "Ethereum address: couldn't check delegated code", ok: evmAcct?.status === "ok" },
    ],
    items,
    sources: [],
    unsafe_reason: unsafeReason,
    encumbered_utxos: r.encumbered_outpoints,
    source,
  };
}
