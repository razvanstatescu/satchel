import type { NftToken, SatchelView, SigDetailView, SigRecordView } from "@/lib/near/types";
import { FIXTURE_RECORDS, fixtureSatchel, fixtureToken, FIXTURE_TOKENS } from "@/lib/data/fixtures";

/**
 * FIXTURE MODE ONLY: an in-browser simulation of what the contract and the chains would do after a wallet call,
 * so the send / mint / transfer / sale flows can be walked end to end (Playwright) with no testnet transaction.
 * State lives in sessionStorage so a reload resumes exactly like the real chain would. On the server it is empty.
 *
 * Knobs (localStorage, set by tests): "satchel:sim:mode" = "normal" | "timeout" | "broadcast-fail";
 * "satchel:sim:delay" = ms until the MPC "signs" (default 2500); "satchel:sim:payout" = "fail" makes the seller payout of
 * the next sale (and of a withdraw, "fail-always") fail, so the contract credits `proceeds` (spec §5.12, INV-25);
 * "satchel:sim:sollife" = blocks a fixture Solana blockhash stays valid (default 150 ≈ 36 s at 240 ms per block).
 */

const KEY = "satchel:sim:v1";

interface SimRecord {
  tokenId: string;
  seq: number;
  chain: "btc" | "evm" | "sol";
  payload: string;
  detail: SigDetailView;
  requester: string;
  createdAt: number;
  height: number;
  resolveAt: number;
  outcome: "signed" | "failed";
}

interface SimState {
  startedAt: number;
  records: SimRecord[];
  owners: Record<string, string>;
  minted: { id: string; owner: string; at: number }[];
  delisted: string[];
  listed: Record<string, NonNullable<SatchelView["listing"]>>;
  broadcastAttempts: Record<string, number>;
  nextListingId: number;
  /** Latest sale per token (the `sold` event + the payout outcome of the same tx). */
  sales: Record<string, SimSale>;
  /** Escrow (`proceeds[(account, currency)]`): written only when a payout fails. */
  proceeds: Record<string, { near?: string; usdc?: string }>;
  /** A2 Give by link: NEAR yocto held by fresh implicit (claim) accounts. Regular accounts are never tracked here. */
  near: Record<string, string>;
}

export interface SimSale {
  tokenId: string;
  listingId: number;
  seller: string;
  buyer: string;
  price: string;
  currency: "near" | "usdc";
  tx: string;
  at: number;
  height: number;
  payoutOk: boolean;
}

const empty = (): SimState => ({ startedAt: Date.now(), records: [], owners: {}, minted: [], delisted: [], listed: {}, broadcastAttempts: {}, nextListingId: 6, sales: {}, proceeds: {}, near: {} });

function read(): SimState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) return { ...empty(), ...(JSON.parse(raw) as SimState) };
  } catch {
    /* ignore */
  }
  const s = empty();
  write(s);
  return s;
}
function write(s: SimState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function simKnob(name: "mode" | "delay" | "payout" | "sollife"): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(`satchel:sim:${name}`);
  } catch {
    return null;
  }
}

const BLOCK_MS = 560;

/** Deterministic 32-byte hex "hash" for fixture payloads (NOT a cryptographic hash; fixture mode only). */
export function fixtureHash(input: string): string {
  let out = "";
  let h = 0x811c9dc5;
  for (let round = 0; round < 8; round++) {
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i) + round;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    out += h.toString(16).padStart(8, "0");
  }
  return out;
}

export function simOverlay() {
  const s = read();
  const now = Date.now();
  const baseCount = (id: string) => (FIXTURE_RECORDS[id]?.length ?? 0);
  const owner = (id: string) => s.owners[id] ?? s.minted.find((m) => m.id === id)?.owner ?? FIXTURE_TOKENS[id]?.owner ?? null;

  const records = (id: string): SigRecordView[] =>
    s.records
      .filter((r) => r.tokenId === id)
      .map((r) => {
        const done = now >= r.resolveAt;
        const status = done ? r.outcome : "pending";
        return {
          seq: r.seq,
          request_id: r.seq,
          input_index: 0,
          chain: r.chain,
          height: r.height,
          timestamp_ms: r.createdAt,
          requester: r.requester,
          payload: r.payload,
          status,
          signature: status === "signed" ? (r.chain === "sol" ? { signature: fixtureHash(r.payload + "sig") + fixtureHash(r.payload + "sig2") } : { r: fixtureHash(r.payload + "r"), s: "1" + fixtureHash(r.payload + "s").slice(1), recovery_id: 1 }) : null,
          detail: r.detail,
        } satisfies SigRecordView;
      });

  return {
    minted: s.minted,
    sales: s.sales,
    proceedsOf: (account: string) =>
      (["near", "usdc"] as const).flatMap((currency) => {
        const amount = s.proceeds[account]?.[currency];
        return amount && BigInt(amount) > 0n ? [{ currency, amount }] : [];
      }),
    delisted: new Set(s.delisted),
    height: (base: number) => base + Math.floor((now - s.startedAt) / BLOCK_MS),
    records,
    token(id: string): NftToken | null {
      const o = owner(id);
      if (!o) return null;
      const base = fixtureToken(id);
      if (base) return { ...base, owner_id: o };
      const m = s.minted.find((x) => x.id === id);
      return m ? { token_id: id, owner_id: o, metadata: { title: `Satchel #${id}`, media: `${id}.svg`, issued_at: String(m.at) }, approved_account_ids: null } : null;
    },
    satchel(id: string): SatchelView | null {
      const o = owner(id);
      if (!o) return null;
      const base = fixtureSatchel(id) ?? { token_id: id, owner_id: o, sig_count: 0, last_sign_height: 0, listable_at: 0, listing: null, paths: { btc: `satchel/${id}/btc`, evm: `satchel/${id}/evm`, sol: `satchel/${id}/sol` } };
      const extra = records(id);
      const last = extra.length ? Math.max(...extra.map((r) => r.height)) : base.last_sign_height;
      const listing = s.delisted.includes(id) ? null : s.listed[id] ?? base.listing;
      return { ...base, owner_id: o, sig_count: baseCount(id) + extra.length, last_sign_height: last, listable_at: last === 0 ? 0 : last + 250, listing };
    },
  };
}

/* ── mutations the mock wallet performs ── */

export function simSignFor(args: { tokenId: string; requester: string; items: { chain: "btc" | "evm" | "sol"; payload: string; detail: SigDetailView }[]; height: number }) {
  const s = read();
  const mode = simKnob("mode");
  const delay = Number(simKnob("delay") ?? "2500");
  const existing = (FIXTURE_RECORDS[args.tokenId]?.length ?? 0) + s.records.filter((r) => r.tokenId === args.tokenId).length;
  const now = Date.now();
  args.items.forEach((it, i) =>
    s.records.push({
      tokenId: args.tokenId,
      seq: existing + i,
      chain: it.chain,
      payload: it.payload,
      detail: it.detail,
      requester: args.requester,
      createdAt: now,
      height: args.height,
      resolveAt: now + (mode === "timeout" ? Math.max(delay, 4000) : delay),
      outcome: mode === "timeout" ? "failed" : "signed",
    }),
  );
  write(s);
}

export function simTransfer(tokenId: string, to: string) {
  const s = read();
  s.owners[tokenId] = to;
  write(s);
}

/* ── A2 Give by link: a fresh implicit account's NEAR balance ── */

export function simFundNear(accountId: string, amountYocto: string) {
  const s = read();
  const cur = BigInt(s.near[accountId] ?? "0");
  s.near[accountId] = (cur + BigInt(amountYocto)).toString();
  write(s);
}

export function simNearBalance(accountId: string): string {
  return read().near[accountId] ?? "0";
}

export function simImplicitExists(accountId: string): boolean {
  return BigInt(simNearBalance(accountId)) > 0n;
}

/** The claim: every Satchel this implicit account owns moves to `to`, and its leftover NEAR goes along too. */
export function simClaim(implicitAccountId: string, to: string): { tokenIds: string[]; nearSent: string } {
  const s = read();
  const tokenIds = Object.entries(s.owners)
    .filter(([, owner]) => owner === implicitAccountId)
    .map(([id]) => id);
  for (const id of tokenIds) s.owners[id] = to;
  const nearSent = s.near[implicitAccountId] ?? "0";
  s.near[implicitAccountId] = "0";
  write(s);
  return { tokenIds, nearSent };
}

export function simMint(owner: string): string {
  const s = read();
  const id = String(Object.keys(FIXTURE_TOKENS).length + s.minted.length + 1);
  s.minted.push({ id, owner, at: Date.now() });
  write(s);
  return id;
}

export function simList(tokenId: string, seller: string, price: string, currency: "near" | "usdc", height: number) {
  const s = read();
  s.delisted = s.delisted.filter((x) => x !== tokenId);
  const sigCount = simOverlay().satchel(tokenId)?.sig_count ?? 0;
  s.listed[tokenId] = { id: s.nextListingId++, seller, price, currency, listed_at: height, sig_count: sigCount };
  write(s);
}

export function simDelist(tokenId: string) {
  const s = read();
  delete s.listed[tokenId];
  if (!s.delisted.includes(tokenId)) s.delisted.push(tokenId);
  write(s);
}

export function simBuy(tokenId: string, buyer: string, tx = fixtureHash(`${tokenId}:${buyer}:${Date.now()}`).slice(0, 44), height = 0) {
  const listing = simOverlay().satchel(tokenId)?.listing ?? null;
  const s = read();
  s.owners[tokenId] = buyer;
  delete s.listed[tokenId];
  if (!s.delisted.includes(tokenId)) s.delisted.push(tokenId);
  if (listing) {
    // The payout is detached (spec §5.12): a failure never undoes the sale; on_payout credits proceeds instead.
    const payoutOk = !/^fail/.test(simKnob("payout") ?? "");
    s.sales[tokenId] = { tokenId, listingId: listing.id, seller: listing.seller, buyer, price: listing.price, currency: listing.currency, tx, at: Date.now(), height, payoutOk };
    if (!payoutOk) credit(s, listing.seller, listing.currency, BigInt(listing.price));
  }
  write(s);
}

function credit(s: SimState, account: string, currency: "near" | "usdc", amount: bigint) {
  const cur = BigInt(s.proceeds[account]?.[currency] ?? "0");
  s.proceeds[account] = { ...s.proceeds[account], [currency]: (cur + amount).toString() };
}

/** withdraw_proceeds: ERR_NOTHING_OWED when nothing is owed; else remove the entry and pay (re-credited on failure). */
export function simWithdraw(account: string, currency: "near" | "usdc"): { ok: true; paid: boolean; amount: string } | { ok: false; error: string } {
  const s = read();
  const owed = BigInt(s.proceeds[account]?.[currency] ?? "0");
  if (owed === 0n) return { ok: false, error: "ERR_NOTHING_OWED: nothing to withdraw" };
  s.proceeds[account] = { ...s.proceeds[account], [currency]: "0" };
  const paid = simKnob("payout") !== "fail-always";
  if (!paid) credit(s, account, currency, owed);
  write(s);
  return { ok: true, paid, amount: owed.toString() };
}

/** Broadcast simulation: "broadcast-fail" fails the first attempt per intent, then succeeds (Broadcast again). */
export function simBroadcast(intentId: string): { ok: true; chainTxId: string } | { ok: false; reason: string } {
  const s = read();
  const n = (s.broadcastAttempts[intentId] ?? 0) + 1;
  s.broadcastAttempts[intentId] = n;
  write(s);
  if (simKnob("mode") === "broadcast-fail" && n === 1) return { ok: false, reason: "mempool.space isn't responding." };
  return { ok: true, chainTxId: fixtureHash(intentId + ":tx") };
}

/* ── Solana devnet stand-in (fixture only): block height and blockhashes move with the clock ── */

/** ≈ 150 blocks in 36 s (kb/32 §TL;DR 3): a blockhash lives ~36 s. */
export const SIM_SOL_BLOCK_MS = 240;
const SOL_EPOCH = Date.UTC(2026, 0, 1);

export function simSolHeight(now = Date.now()): number {
  return 300_000_000 + Math.floor((now - SOL_EPOCH) / SIM_SOL_BLOCK_MS);
}

/** Blocks a fixture blockhash stays valid (test knob "satchel:sim:sollife"; default 150). */
export function simSolLife(): number {
  const v = Number(simKnob("sollife") ?? "150");
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 150;
}

/** The fixture "latest blockhash" at a height: 32 deterministic bytes (hex), like getLatestBlockhash. */
export function simSolBlockhashHex(height: number): string {
  return fixtureHash(`sol-blockhash:${height}`);
}

export function simReset() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
