import { CONTRACT_ROLE } from "@/lib/config";
import { copy, TICKER } from "@/lib/copy";
import { formatAmount, truncateAddress } from "@/lib/format";
import type { Aggregate, CleanCheck, CleanItem, CleanReport, ItemStatus, LockFacts } from "@/lib/data/types";
import { FIXTURE_EVM, fixtureEvidence, fixtureItemStatus } from "@/lib/data/fixtures";
import type { SigRecordView } from "@/lib/near/types";

/**
 * Clean-history view model. The checker itself is isomorphic and lives in @satchel/core/clean-history (D-39);
 * this file aggregates item statuses with the kb/90 §7.3 rules, applies the gate mode per contract role (R-06),
 * and builds the fixture report. Only the BROWSER result ever enables Buy.
 */

const BLOCKING: ReadonlySet<ItemStatus> = new Set(["settling", "unused", "unknown"]);

export function aggregate(args: {
  sigCount: number;
  items: { status: ItemStatus | "checking" }[];
  accountChecksOk: boolean;
  lockOk: boolean | null; // contract exists && keys == 0
  codeOk: boolean | null; // code hash == expected
  role: "dev" | "rc" | "final";
}): { aggregate: Aggregate; unsafeReason: string | null } {
  if (!args.accountChecksOk) return { aggregate: "unsafe", unsafeReason: "delegated" };
  if (args.role !== "dev") {
    if (args.lockOk !== true) return { aggregate: "unsafe", unsafeReason: "keys" };
    if (args.codeOk !== true) return { aggregate: "unsafe", unsafeReason: "code" };
  }
  if (args.items.some((i) => i.status === "checking")) return { aggregate: "checking", unsafeReason: null };
  if (args.sigCount === 0) return { aggregate: "empty", unsafeReason: null };
  if (args.items.length < args.sigCount) return { aggregate: "unknown", unsafeReason: null }; // completeness anchor
  if (args.items.some((i) => i.status === "unknown")) return { aggregate: "unknown", unsafeReason: null };
  if (args.items.some((i) => i.status === "unused")) return { aggregate: "blocked", unsafeReason: null };
  if (args.items.some((i) => i.status === "settling")) return { aggregate: "settling", unsafeReason: null };
  return { aggregate: "clean", unsafeReason: null };
}

export const buyEnabled = (a: Aggregate) => a === "clean" || a === "empty";
export const isBlockingItem = (s: ItemStatus | "checking") => s === "checking" || BLOCKING.has(s as ItemStatus);

export function lockChecks(lock: LockFacts, role: "dev" | "rc" | "final"): CleanCheck[] {
  if (role === "dev") return [{ name: copy.clean.checks.dev, ok: true, warn: true }];
  return [
    { name: lock.locked ? copy.clean.checks.keys(lock.birth_block) : "Contract keys: has access keys", ok: lock.locked === true },
    { name: lock.code_matches ? copy.clean.checks.code : "Code: doesn't match the published build", ok: lock.code_matches === true },
  ];
}

export function itemKey(r: SigRecordView): string {
  if ("evm" in r.detail) return `nonce ${r.detail.evm.nonce}`;
  if ("btc" in r.detail) return `coin ${r.detail.btc.txid.slice(0, 2)}…${r.detail.btc.txid.slice(-2)}:${r.detail.btc.vout}`;
  return `blockhash ${r.detail.sol.recent_blockhash.slice(0, 2)}…`;
}

/** Fixture report: what the browser checker would find for the demo world (D-32: #4 is the honest blocked example). */
export function fixtureCleanReport(tokenId: string, records: SigRecordView[], lock: LockFacts, listingId: number | null, source: CleanReport["source"] = "fixture"): CleanReport {
  const items: CleanItem[] = records.map((r) => {
    const status = fixtureItemStatus(tokenId, r.seq);
    const ev = fixtureEvidence(tokenId, r.seq);
    let wouldPay: string | null = null;
    if ("evm" in r.detail) {
      const e = tokenId === "1" ? FIXTURE_EVM.t1 : tokenId === "3" ? FIXTURE_EVM.t3 : FIXTURE_EVM.t4;
      wouldPay = copy.clean.item.wouldPay(formatAmount(e.valueWei, "ETH"), truncateAddress(e.to), false);
    } else if ("btc" in r.detail) {
      wouldPay = copy.clean.item.wouldPay(formatAmount(r.detail.btc.amount_sats, "BTC"), "its recipient", false);
    }
    return {
      seq: r.seq,
      chain: r.chain,
      key: `${TICKER[r.chain] === "ETH" ? "Ethereum" : TICKER[r.chain] === "BTC" ? "Bitcoin" : "Solana"} · ${itemKey(r)}`,
      wouldPay,
      amountSource: "chain",
      evidence: ev.line,
      evidenceUrl: ev.url ?? null,
      status,
      signedAt: r.timestamp_ms,
      height: r.height,
      requester: r.requester,
    };
  });
  const role = CONTRACT_ROLE;
  const { aggregate: agg, unsafeReason } = aggregate({
    sigCount: records.length,
    items,
    accountChecksOk: true,
    lockOk: lock.locked,
    codeOk: lock.code_matches,
    role,
  });
  return {
    token_id: tokenId,
    aggregate: agg,
    checked_at: Date.now(),
    sig_count: records.length,
    listing_id: listingId,
    one_of_two: false,
    role,
    checks: [...lockChecks(lock, role), { name: copy.clean.checks.evm, ok: true }],
    items,
    sources: [
      { chain: "btc", provider: "mempool.space", ok: true },
      { chain: "btc", provider: "mempool.emzy.de", ok: true },
      { chain: "evm", provider: "publicnode", ok: true },
      { chain: "evm", provider: "drpc", ok: true },
    ],
    unsafe_reason: unsafeReason,
    encumbered_utxos: [],
    source,
  };
}

/** Live report placeholder until @satchel/core/clean-history lands: never "clean" (Buy stays disabled). */
export function unavailableReport(tokenId: string, records: SigRecordView[], lock: LockFacts, listingId: number | null): CleanReport {
  const items: CleanItem[] = records.map((r) => ({
    seq: r.seq,
    chain: r.chain,
    key: itemKey(r),
    wouldPay: null,
    amountSource: "claimed",
    evidence: "No provider answered",
    evidenceUrl: null,
    status: "unknown",
    signedAt: r.timestamp_ms,
    height: r.height,
    requester: r.requester,
  }));
  const { aggregate: agg, unsafeReason } = aggregate({ sigCount: records.length, items, accountChecksOk: true, lockOk: lock.locked, codeOk: lock.code_matches, role: CONTRACT_ROLE });
  return {
    token_id: tokenId,
    aggregate: agg === "clean" || agg === "empty" ? (records.length === 0 ? agg : "unknown") : agg,
    checked_at: Date.now(),
    sig_count: records.length,
    listing_id: listingId,
    one_of_two: false,
    role: CONTRACT_ROLE,
    checks: lockChecks(lock, CONTRACT_ROLE),
    items,
    sources: [],
    unsafe_reason: unsafeReason,
    encumbered_utxos: [],
    source: "server-hint",
  };
}

/** Counts used by the verdict and GateLine copy. */
export function counts(items: { status: ItemStatus | "checking" }[]) {
  const c = { spent: 0, expired: 0, unfunded: 0, foreign: 0, settling: 0, unused: 0, unknown: 0, checking: 0 };
  for (const i of items) c[i.status as keyof typeof c]++;
  return c;
}
