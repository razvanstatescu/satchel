import { FT_STORAGE, MAX_OFFER_TTL_MS, MAX_OFFERS_PER_ACCOUNT, offerAcceptBlock, offerExpiryValid } from "@satchel/core/near";
import {
  allowanceDebits,
  applyDebits,
  capsOfView,
  isExpired,
  MAX_DELEGATES,
  sameAsset,
  validateCaps,
  type AllowanceView,
  type CapInput,
} from "@satchel/core/policy";
import { MPC_CONTRACT, SATCHEL_CONTRACT, USDC_CONTRACT } from "@/lib/config";
import { fixtureInside, FIXTURE_ALLOWANCES, FIXTURE_RECORDS, fixtureSatchel, fixtureToken, FIXTURE_TOKENS } from "@/lib/data/fixtures";
import type { AllowanceRecord, InsideView, NftToken, OfferView, SatchelView, SigDetailView, SigRecordView, SignRequest } from "@/lib/near/types";

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
  /** C5 (docs/specs/C5.md): mutations on top of `FIXTURE_ALLOWANCES`, keyed by token id. */
  allowances: Record<string, AllowanceRecord[]>;
  /** A2 Give by link: NEAR yocto held by fresh implicit (claim) accounts. Regular accounts are never tracked here. */
  near: Record<string, string>;
  /** Implicit accounts ever funded (A2): existence persists even after a claim drains the balance, like real NEAR. */
  funded: Record<string, true>;
  /** C6: inside-asset deltas on top of `FIXTURE_INSIDE` (fixtures.ts). */
  inside: Record<string, SimInside>;
  /** C4: open offers, keyed by id. */
  offers: Record<number, SimOffer>;
  nextOfferId: number;
  /** C4/C6: storage credit per account (`prepay_storage`). */
  storageCredit: Record<string, string>;
}

interface SimInside {
  near: string;
  fts: Record<string, string>;
  epoch: number;
}

interface SimOffer {
  id: number;
  tokenId: string;
  offererId: string;
  amount: string;
  currency: "near" | "usdc";
  expectedSigCount: number;
  expectedInsideEpoch: number;
  expiresAtMs: number;
  createdAtMs: number;
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

const empty = (): SimState => ({
  startedAt: Date.now(),
  records: [],
  owners: {},
  minted: [],
  delisted: [],
  listed: {},
  broadcastAttempts: {},
  nextListingId: 6,
  sales: {},
  proceeds: {},
  allowances: {},
  near: {},
  funded: {},
  inside: {},
  offers: {},
  nextOfferId: 1,
  storageCredit: {},
});

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

/** ≈ 0.0009 NEAR: the one-time storage a brand-new inside record or storage-credit slot costs (spec §1, §C4-C6 1.1). */
const STORAGE_SLOT = 900_000_000_000_000_000_000n;

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

/* ── C5 spending allowance: shared helpers (module scope, used by the overlay and the mutations below) ── */

const ALLOWANCE_WINDOW_MS = 86_400_000;
const MAX_SPENDS = 32;

function ownerOf(s: SimState, id: string): string | null {
  return s.owners[id] ?? s.minted.find((m) => m.id === id)?.owner ?? FIXTURE_TOKENS[id]?.owner ?? null;
}

function listingOf(s: SimState, id: string) {
  return s.delisted.includes(id) ? null : s.listed[id] ?? fixtureSatchel(id)?.listing ?? null;
}

/** The fixture demo delegations, overridden entirely once this token has seen a set/revoke/transfer/sale this session. */
function allowanceRecordsOf(s: SimState, tokenId: string): AllowanceRecord[] {
  return s.allowances[tokenId] ?? FIXTURE_ALLOWANCES[tokenId] ?? [];
}

/** An `AllowanceRecord` → the contract's `AllowanceView` (spec §1.2), rolling the window forward to `nowMs`. */
function allowanceToView(tokenId: string, rec: AllowanceRecord, nowMs: number, listed: boolean): AllowanceView {
  const caps = rec.caps.map((c) => {
    const liveSpends = c.spends.filter((sp) => nowMs < sp.at_ms + ALLOWANCE_WINDOW_MS);
    const spent = liveSpends.reduce((a, sp) => a + BigInt(sp.amount), 0n);
    const limit = BigInt(c.limit);
    return { asset: c.asset, limit: c.limit, spent: spent.toString(), remaining: (spent >= limit ? 0n : limit - spent).toString(), spends: liveSpends };
  });
  return {
    token_id: tokenId,
    delegate: rec.delegate,
    owner_id: rec.owner,
    set_at_ms: rec.set_at_ms,
    expires_at_ms: rec.expires_at_ms,
    status: isExpired(rec.expires_at_ms, nowMs) ? "expired" : listed ? "paused" : "active",
    now_ms: nowMs,
    window_ms: ALLOWANCE_WINDOW_MS,
    spends_in_window: caps.reduce((a, c) => a + c.spends.length, 0),
    max_spends: MAX_SPENDS,
    caps,
  };
}

export function simOverlay() {
  const s = read();
  const now = Date.now();
  const baseCount = (id: string) => (FIXTURE_RECORDS[id]?.length ?? 0);
  const owner = (id: string) => ownerOf(s, id);

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
    /* ── C6 inside assets / C4 offers (docs/specs/C4-C6.md) ── */
    insideOf(id: string): InsideView {
      const base = fixtureInside(id);
      const delta = s.inside[id];
      if (!delta) return base;
      const fts = Object.entries(delta.fts)
        .filter(([, amount]) => BigInt(amount) > 0n)
        .map(([token, amount]) => ({ token, amount }));
      return { near: delta.near, fts, inside_epoch: delta.epoch };
    },
    offer(id: number): OfferView | null {
      const o = s.offers[id];
      if (!o) return null;
      return { id: o.id, token_id: o.tokenId, offerer_id: o.offererId, amount: o.amount, currency: o.currency, expected_sig_count: o.expectedSigCount, expected_inside_epoch: o.expectedInsideEpoch, expires_at_ms: o.expiresAtMs, created_at_ms: o.createdAtMs };
    },
    offersFor(tokenId: string): OfferView[] {
      return Object.values(s.offers)
        .filter((o) => o.tokenId === tokenId)
        .sort((a, b) => a.id - b.id)
        .map((o) => ({ id: o.id, token_id: o.tokenId, offerer_id: o.offererId, amount: o.amount, currency: o.currency, expected_sig_count: o.expectedSigCount, expected_inside_epoch: o.expectedInsideEpoch, expires_at_ms: o.expiresAtMs, created_at_ms: o.createdAtMs }));
    },
    offersBy(accountId: string): OfferView[] {
      return Object.values(s.offers)
        .filter((o) => o.offererId === accountId)
        .sort((a, b) => a.id - b.id)
        .map((o) => ({ id: o.id, token_id: o.tokenId, offerer_id: o.offererId, amount: o.amount, currency: o.currency, expected_sig_count: o.expectedSigCount, expected_inside_epoch: o.expectedInsideEpoch, expires_at_ms: o.expiresAtMs, created_at_ms: o.createdAtMs }));
    },
    storageCreditOf(accountId: string): string {
      return s.storageCredit[accountId] ?? "0";
    },
    /** C5: at most MAX_DELEGATES rows, dropping a record whose owner no longer matches (the backstop rule, spec §4). */
    allowancesOf(id: string): AllowanceView[] {
      const o = owner(id);
      if (!o) return [];
      const listed = !!listingOf(s, id);
      return allowanceRecordsOf(s, id)
        .filter((r) => r.owner === o)
        .map((r) => allowanceToView(id, r, now, listed));
    },
    allowanceOf(id: string, delegate: string): AllowanceView | null {
      const o = owner(id);
      if (!o) return null;
      const rec = allowanceRecordsOf(s, id).find((r) => r.delegate === delegate && r.owner === o);
      return rec ? allowanceToView(id, rec, now, !!listingOf(s, id)) : null;
    },
  };
}

/** `inside_epoch` of a fixture token, folding in this browser's sim deltas (fixtures.ts has none above 0). */
function insideOfRaw(s: SimState, id: string): SimInside {
  const base = fixtureInside(id);
  return s.inside[id] ?? { near: base.near, fts: Object.fromEntries(base.fts.map((f) => [f.token, f.amount])), epoch: base.inside_epoch };
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
  s.allowances[tokenId] = []; // C5 reset rule (spec §4): every ownership change clears all allowances
  write(s);
}

/* ── A2 Give by link: a fresh implicit account's NEAR balance ── */

export function simFundNear(accountId: string, amountYocto: string) {
  const s = read();
  const cur = BigInt(s.near[accountId] ?? "0");
  s.near[accountId] = (cur + BigInt(amountYocto)).toString();
  s.funded[accountId] = true;
  write(s);
}

export function simNearBalance(accountId: string): string {
  return read().near[accountId] ?? "0";
}

/** Existence persists once funded, even after a claim drains the balance (like a real NEAR account). */
export function simImplicitExists(accountId: string): boolean {
  return !!read().funded[accountId];
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
  s.allowances[tokenId] = []; // C5 reset rule (spec §4): a sale clears all allowances too
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

/* ── C6: NEAR-side assets inside a Satchel (docs/specs/C4-C6.md §2) ─────────────────────────────── */

/** `deposit_near`: anyone, any time (even while listed). Storage is charged only on the token's first inside record. */
export function simDepositNear(tokenId: string, attached: bigint): string {
  const s = read();
  const cur = insideOfRaw(s, tokenId);
  const isFirst = BigInt(cur.near) === 0n && Object.keys(cur.fts).length === 0 && !s.inside[tokenId];
  const credited = isFirst ? (attached > STORAGE_SLOT ? attached - STORAGE_SLOT : 0n) : attached;
  s.inside[tokenId] = { near: (BigInt(cur.near) + credited).toString(), fts: cur.fts, epoch: cur.epoch };
  write(s);
  return credited.toString();
}

/** Deducts `needed` from `accountId`'s storage credit, or throws `ERR_STORAGE_CREDIT` naming the shortfall (spec
 * §1.2: "a full refund" — the caller never applies its effect when this throws, exactly like the real `ft_on_transfer`,
 * which panics and the FT refunds 100%). */
function chargeCredit(s: SimState, accountId: string, needed: bigint): void {
  if (needed <= 0n) return;
  const have = BigInt(s.storageCredit[accountId] ?? "0");
  if (have < needed) throw new Error(`ERR_STORAGE_CREDIT: prepay_storage ≥ ${(needed - have).toString()} yocto`);
  s.storageCredit[accountId] = (have - needed).toString();
}

/** `deposit` ft_on_transfer message: same storage rule, per (token, ft) slot. Storage credit is charged only when
 * this creates a slot (the token's first deposit of this FT, and the token's inside record if it had none, spec §1.2). */
export function simDepositFt(tokenId: string, ft: string, amount: bigint, senderId: string): void {
  const s = read();
  const cur = insideOfRaw(s, tokenId);
  // A slot "exists" once it has ever been created, even emptied by a withdrawal (spec §2.1: kept forever). Fixture
  // tokens never start with an FT slot (FIXTURE_INSIDE only seeds NEAR), so this is exactly `s.inside`'s own delta.
  const isNewSlot = !(ft in (s.inside[tokenId]?.fts ?? {}));
  if (isNewSlot) chargeCredit(s, senderId, FT_STORAGE.depositFirstSlot);
  const fts = { ...cur.fts, [ft]: (BigInt(cur.fts[ft] ?? "0") + amount).toString() };
  s.inside[tokenId] = { near: cur.near, fts, epoch: cur.epoch };
  write(s);
}

function assertOwnerAndNotListed(s: SimState, tokenId: string, owner: string) {
  const sat = simOverlayFromState(s).satchel(tokenId);
  if (!sat) throw new Error("ERR_TOKEN_NOT_FOUND: no such Satchel");
  if (sat.owner_id !== owner) throw new Error("ERR_NOT_OWNER: only the owner can do this");
  if (sat.listing) throw new Error("ERR_LISTED: can't withdraw while it's for sale");
  return sat;
}

/** `withdraw_near`: owner only, not while listed. Debits first and bumps `inside_epoch`. */
export function simWithdrawNear(tokenId: string, owner: string, amount: bigint): void {
  const s = read();
  assertOwnerAndNotListed(s, tokenId, owner);
  const cur = insideOfRaw(s, tokenId);
  if (amount <= 0n) throw new Error("ERR_AMOUNT: amount must be > 0");
  if (amount > BigInt(cur.near)) throw new Error("ERR_INSIDE_BALANCE: not that much inside this Satchel");
  s.inside[tokenId] = { near: (BigInt(cur.near) - amount).toString(), fts: cur.fts, epoch: cur.epoch + 1 };
  write(s);
}

/** `withdraw_ft`: same guards, per FT. */
export function simWithdrawFt(tokenId: string, owner: string, ft: string, amount: bigint): void {
  const s = read();
  assertOwnerAndNotListed(s, tokenId, owner);
  const cur = insideOfRaw(s, tokenId);
  const bal = BigInt(cur.fts[ft] ?? "0");
  if (amount <= 0n) throw new Error("ERR_AMOUNT: amount must be > 0");
  if (amount > bal) throw new Error("ERR_INSIDE_BALANCE: not that much inside this Satchel");
  s.inside[tokenId] = { near: cur.near, fts: { ...cur.fts, [ft]: (bal - amount).toString() }, epoch: cur.epoch + 1 };
  write(s);
}

/** `prepay_storage`: anyone; only the account's first prepay keeps a slice for the credit slot's own storage. */
export function simPrepayStorage(accountId: string, attached: bigint): string {
  const s = read();
  const had = s.storageCredit[accountId] !== undefined;
  const credited = had ? attached : attached > STORAGE_SLOT ? attached - STORAGE_SLOT : 0n;
  const next = (BigInt(s.storageCredit[accountId] ?? "0") + credited).toString();
  s.storageCredit[accountId] = next;
  write(s);
  return next;
}

export function simWithdrawStorageCredit(accountId: string): string {
  const s = read();
  const owed = s.storageCredit[accountId] ?? "0";
  if (BigInt(owed) === 0n) throw new Error("ERR_NOTHING_OWED: nothing to withdraw");
  s.storageCredit[accountId] = "0";
  write(s);
  return owed;
}

/* ── C4: offers (docs/specs/C4-C6.md §3) ─────────────────────────────────────────────────────── */

export interface OfferTermsSim {
  expectedSigCount: number;
  expectedInsideEpoch: number;
  expiresAtMs: number;
}

/** `make_offer` / the `offer` ft_on_transfer message (spec §3.1). Returns the new offer id. */
export function simMakeOffer(tokenId: string, offererId: string, amount: bigint, currency: "near" | "usdc", t: OfferTermsSim): number {
  const s = read();
  const sat = simOverlayFromState(s).satchel(tokenId);
  if (!sat) throw new Error("ERR_TOKEN_NOT_FOUND: no such Satchel");
  if (sat.owner_id === offererId) throw new Error("ERR_SELF_BUY: you already own this Satchel");
  if (amount <= 0n) throw new Error("ERR_AMOUNT: amount must be > 0");
  const insideEpoch = insideOfRaw(s, tokenId).epoch;
  if (sat.sig_count !== t.expectedSigCount || insideEpoch !== t.expectedInsideEpoch) throw new Error("ERR_OFFER_STALE: this Satchel changed since you reviewed it");
  const now = Date.now();
  if (!offerExpiryValid(t.expiresAtMs, now) || t.expiresAtMs - now > MAX_OFFER_TTL_MS) throw new Error("ERR_OFFER_EXPIRY: expiry must be in the future and at most 90 days away");
  const open = Object.values(s.offers).filter((o) => o.offererId === offererId).length;
  if (open >= MAX_OFFERS_PER_ACCOUNT) throw new Error("ERR_TOO_MANY_OFFERS: you already have 20 open offers");
  // USDC offers always charge the offerer's storage credit (spec §1.2); a NEAR offer pays its own storage from the
  // attached deposit instead (make_offer's `amount + storageExtra`), so nothing is charged here for that path.
  if (currency === "usdc") chargeCredit(s, offererId, FT_STORAGE.offer);
  const id = s.nextOfferId++;
  s.offers[id] = { id, tokenId, offererId, amount: amount.toString(), currency, expectedSigCount: t.expectedSigCount, expectedInsideEpoch: t.expectedInsideEpoch, expiresAtMs: t.expiresAtMs, createdAtMs: now };
  write(s);
  return id;
}

/** `accept_offer`: owner only. Mirrors `offerAcceptBlock` (the UX mirror from `@satchel/core/near`) for the same
 * refusal the contract would give, then moves the NFT (inside balances stay put: they're keyed by token id). */
export function simAcceptOffer(offerId: number, owner: string, height: number): { tokenId: string; offererId: string } {
  const s = read();
  const o = s.offers[offerId];
  if (!o) throw new Error("ERR_NO_OFFER: no open offer with that id");
  const overlay = simOverlayFromState(s);
  const sat = overlay.satchel(o.tokenId);
  if (!sat) throw new Error("ERR_TOKEN_NOT_FOUND: no such Satchel");
  if (sat.owner_id !== owner) throw new Error("ERR_NOT_OWNER: only the owner can accept an offer");
  const insideEpoch = insideOfRaw(s, o.tokenId).epoch;
  const block = offerAcceptBlock(
    { offerer_id: o.offererId, expected_sig_count: o.expectedSigCount, expected_inside_epoch: o.expectedInsideEpoch, expires_at_ms: o.expiresAtMs },
    sat,
    insideEpoch,
    { ms: Date.now(), height },
  );
  if (block) throw new Error(`${block}: this offer can no longer be accepted`);
  delete s.offers[offerId];
  if (!s.delisted.includes(o.tokenId)) s.delisted.push(o.tokenId);
  s.owners[o.tokenId] = o.offererId;
  write(s);
  return { tokenId: o.tokenId, offererId: o.offererId };
}

/** `cancel_offer`: the offerer at any time, or anyone once expired. The refund always goes to the offerer (not
 * tracked as a NEAR balance here, same as `simWithdraw`'s payout: sim only tracks implicit-account NEAR). */
export function simCancelOffer(offerId: number, caller: string, nowMs = Date.now()): SimOffer {
  const s = read();
  const o = s.offers[offerId];
  if (!o) throw new Error("ERR_NO_OFFER: no open offer with that id");
  if (caller !== o.offererId && nowMs < o.expiresAtMs) throw new Error("ERR_NOT_OFFERER: only the offerer can cancel before it expires");
  delete s.offers[offerId];
  write(s);
  return o;
}

/** Internal: `simOverlay()`'s `satchel()` needs a `SimState` it didn't just re-read from storage. */
function simOverlayFromState(s: SimState) {
  write(s);
  return simOverlay();
}

/* ── C5 spending allowance: mutations the mock wallet performs (mirrors contracts/satchel/src/allowance.rs) ── */

const allowancePanic = (code: string, detail?: string) => new Error(`Smart contract panicked: ${code}${detail ? `: ${detail}` : ""}`);

/** `set_allowance` (spec §2 steps 2, 4–7): owner only; validates and normalizes caps like the contract. */
export function simSetAllowance(tokenId: string, caller: string, delegate: string, caps: readonly CapInput[], expiresAtMs: number | undefined, nowMs = Date.now()): void {
  const s = read();
  const owner = ownerOf(s, tokenId);
  if (!owner) throw allowancePanic("ERR_TOKEN_NOT_FOUND");
  if (caller !== owner) throw allowancePanic("ERR_NOT_OWNER");
  if (delegate === owner || delegate === SATCHEL_CONTRACT || delegate === MPC_CONTRACT || delegate === USDC_CONTRACT) throw allowancePanic("ERR_ALLOWANCE_DELEGATE");
  const v = validateCaps(caps);
  if (!v.ok) throw allowancePanic(v.error, v.detail);
  if (expiresAtMs !== undefined && expiresAtMs <= nowMs) throw allowancePanic("ERR_ALLOWANCE_EXPIRY");
  // expired allowances are dropped first (step 7); a replace of an existing, still-live delegate never counts against the limit
  const live = allowanceRecordsOf(s, tokenId).filter((r) => r.owner === owner && !isExpired(r.expires_at_ms, nowMs));
  const existing = live.find((r) => r.delegate === delegate);
  if (!existing && live.length >= MAX_DELEGATES) throw allowancePanic("ERR_ALLOWANCE_LIMIT");
  // replacing keeps spends still inside the window for every asset that keeps a cap (step 9 note)
  const nextCaps = v.caps.map((c) => {
    const prior = existing?.caps.find((p) => sameAsset(p.asset, c.asset));
    const spends = (prior?.spends ?? []).filter((sp) => nowMs < sp.at_ms + ALLOWANCE_WINDOW_MS);
    return { asset: c.asset, limit: c.limit.toString(), spends };
  });
  const rec: AllowanceRecord = { delegate, owner, set_at_ms: nowMs, expires_at_ms: expiresAtMs ?? null, caps: nextCaps };
  s.allowances[tokenId] = [...live.filter((r) => r.delegate !== delegate), rec];
  write(s);
}

/** `revoke_allowance` (spec §2): owner only; works on an expired allowance too (cleanup). */
export function simRevokeAllowance(tokenId: string, caller: string, delegate: string): void {
  const s = read();
  const owner = ownerOf(s, tokenId);
  if (!owner) throw allowancePanic("ERR_TOKEN_NOT_FOUND");
  if (caller !== owner) throw allowancePanic("ERR_NOT_OWNER");
  const list = allowanceRecordsOf(s, tokenId).filter((r) => r.owner === owner);
  if (!list.some((r) => r.delegate === delegate)) throw allowancePanic("ERR_ALLOWANCE_NOT_FOUND");
  s.allowances[tokenId] = list.filter((r) => r.delegate !== delegate);
  write(s);
}

/**
 * `sign_for` by a delegate (spec §2 step 1 and 4c): would it pass, and if so debit it. Mirrors the contract's order
 * (expiry, `ERR_FROZEN`, the classifier via `allowanceDebits`, then the caps via `applyDebits`) using the same
 * `@satchel/core/policy` functions the real contract's behaviour is checked against.
 */
export function simDebitDelegated(tokenId: string, delegate: string, request: SignRequest, listed: boolean, nowMs = Date.now()): { ok: true } | { ok: false; error: string } {
  const s = read();
  const owner = ownerOf(s, tokenId);
  if (!owner) return { ok: false, error: "ERR_NOT_OWNER" };
  const list = allowanceRecordsOf(s, tokenId).filter((r) => r.owner === owner);
  const idx = list.findIndex((r) => r.delegate === delegate);
  if (idx < 0) return { ok: false, error: "ERR_NOT_OWNER" };
  const rec = list[idx]!;
  if (isExpired(rec.expires_at_ms, nowMs)) return { ok: false, error: "ERR_ALLOWANCE_EXPIRED" };
  if (listed) return { ok: false, error: "ERR_FROZEN" };
  const view = allowanceToView(tokenId, rec, nowMs, listed);
  const d = allowanceDebits(request);
  if (!d.ok) return { ok: false, error: d.error };
  const r = applyDebits(capsOfView(view), d.debits, nowMs);
  if (!r.ok) return { ok: false, error: r.error };
  list[idx] = { ...rec, caps: r.caps.map((c) => ({ asset: c.asset, limit: c.limit.toString(), spends: c.spends.map((sp) => ({ at_ms: sp.at_ms, amount: sp.amount.toString() })) })) };
  s.allowances[tokenId] = list;
  write(s);
  return { ok: true };
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
