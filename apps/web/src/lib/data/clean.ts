import { toHex } from "@satchel/core/bytes";
import { classifyEvm, classifyEvmMessage, classifySolMessage } from "@satchel/core/policy";
import { CONTRACT_ROLE } from "@/lib/config";
import { CHAIN_NAME, copy } from "@/lib/copy";
import { formatAmount, truncateAddress } from "@/lib/format";
import type { Aggregate, CleanCheck, CleanItem, CleanReport, ItemStatus, LockFacts } from "@/lib/data/types";
import { fixtureEvidence, fixtureItemStatus } from "@/lib/data/fixtures";
import { evmNetworkName } from "@/lib/evm-networks";
import { isMessageDetail, type SigRecordView } from "@/lib/near/types";

/**
 * Clean-history view model. The checker itself is isomorphic and lives in @satchel/core/clean-history (D-39);
 * this file aggregates item statuses with the kb/90 §7.3 rules, applies the gate mode per contract role (R-06),
 * and builds the fixture report. Only the BROWSER result ever enables Buy.
 */

/**
 * Exactly core's gate (packages/core/src/clean-history/gate.ts): only `unknown`, `unused` and `settling` block, in that
 * order of precedence. `spent`, `expired`, `unfunded`, `foreign` and (C7) `message` never do.
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
  if ("sol" in r.detail) return `blockhash ${r.detail.sol.recent_blockhash.slice(0, 2)}…`;
  return "message";
}

/** "Ethereum · nonce 3" on Sepolia; "Base Sepolia · nonce 0" on the other three (C3); "Ethereum · message" (C7). */
export function itemLabel(r: SigRecordView): string {
  if ("evm" in r.detail && r.detail.evm.chain_id !== 11155111) return copy.record.chainNonce(evmNetworkName(r.detail.evm.chain_id), r.detail.evm.nonce);
  if (isMessageDetail(r.detail)) return copy.record.messageKey(CHAIN_NAME[r.chain]);
  return `${CHAIN_NAME[r.chain]} · ${itemKey(r)}`;
}

/** What an EVM record's tx would pay, read from its own `unsigned_tx` (C2: a USDC transfer's token amount). */
export function evmWouldPay(unsignedTx: string): string | null {
  const c = classifyEvm(unsignedTx);
  if (!c.ok) return null;
  const f = c.fields;
  if (f.erc20) return copy.clean.item.wouldPay(formatAmount(f.erc20.amount, "USDC"), truncateAddress(f.erc20.to), false);
  return copy.clean.item.wouldPay(formatAmount(f.value, "ETH"), truncateAddress(f.to), false);
}

/**
 * A message record's item: the same rule as core's `checkMessages` (packages/core/src/clean-history/messages.ts, built
 * from the same policy functions so this module stays light enough for the client bundle; test/unit/clean-messages
 * asserts both agree): `message` when the body is 1–1024 bytes of UTF-8, the payload matches it and the right key
 * signed it; otherwise `unknown` (fail closed, which blocks Buy).
 */
export function messageItem(r: SigRecordView): Pick<CleanItem, "status" | "message" | "evidence"> {
  const evm = "evm_message" in r.detail;
  const hex = "evm_message" in r.detail ? r.detail.evm_message.message : "sol_message" in r.detail ? r.detail.sol_message.message : "";
  const fail = (reason: string) => ({ status: "unknown" as const, evidence: reason });
  // the contract's own rule (strict hex, 1–1024 bytes, UTF-8) and the payload it records, from core's policy mirror
  const c = evm ? classifyEvmMessage(hex) : classifySolMessage(hex);
  if (!c.ok) return fail("record unparseable");
  if (toHex(c.recordPayloads[0]) !== r.payload.toLowerCase()) return fail("record inconsistent");
  if ((evm && r.chain !== "evm") || (!evm && r.chain !== "sol")) return fail("record inconsistent");
  return { status: "message", message: { kind: evm ? "evm_message" : "sol_message", text: c.fields.text }, evidence: copy.record.messageNote };
}

/** Fixture report: what the browser checker would find for the demo world (D-32: #4 is the honest blocked example). */
export function fixtureCleanReport(tokenId: string, records: SigRecordView[], lock: LockFacts, listingId: number | null, source: CleanReport["source"] = "fixture"): CleanReport {
  const items: CleanItem[] = records.map((r) => {
    const base = { seq: r.seq, chain: r.chain, key: itemLabel(r), signedAt: r.timestamp_ms, height: r.height, requester: r.requester };
    // C7: a message is judged by the contract's rule alone (it never touches a chain), and never blocks Buy
    if (isMessageDetail(r.detail)) return { ...base, wouldPay: null, amountSource: "chain", evidenceUrl: null, ...messageItem(r) };
    const status = fixtureItemStatus(tokenId, r.seq);
    const ev = fixtureEvidence(tokenId, r.seq);
    let wouldPay: string | null = null;
    // each EVM record's own tx says what it would pay (C2: a USDC transfer pays USDC)
    if ("evm" in r.detail) wouldPay = evmWouldPay(r.detail.evm.unsigned_tx);
    else if ("btc" in r.detail) wouldPay = copy.clean.item.wouldPay(formatAmount(r.detail.btc.amount_sats, "BTC"), "its recipient", false);
    return {
      ...base,
      wouldPay,
      amountSource: "chain",
      evidence: ev.line,
      evidenceUrl: ev.url ?? null,
      status,
      ...("evm" in r.detail ? { chainId: r.detail.evm.chain_id, ...(r.detail.evm.erc20 ? { erc20: r.detail.evm.erc20 } : {}) } : {}),
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

/** The server hint when the live check fails or passes its 8 s cap (`getCleanHint`): every item `unknown`, never "clean". */
export function unavailableReport(tokenId: string, records: SigRecordView[], lock: LockFacts, listingId: number | null): CleanReport {
  const items: CleanItem[] = records.map((r) => ({
    seq: r.seq,
    chain: r.chain,
    key: itemLabel(r),
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
  const c = { spent: 0, expired: 0, unfunded: 0, foreign: 0, message: 0, settling: 0, unused: 0, unknown: 0, checking: 0 };
  for (const i of items) c[i.status as keyof typeof c]++;
  return c;
}
