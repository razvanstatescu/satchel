import { IS_FIXTURE, SATCHEL_CONTRACT } from "@/lib/config";
import { simOverlay } from "@/lib/data/sim";
import { dataSource } from "@/lib/data/source";
import { contractViews } from "@/lib/near/contract";
import { contractEvents, historyClient, type FastnearTx } from "@/lib/near/history";
import type { Currency, ProceedsView } from "@/lib/near/types";

/**
 * The seller's side of a sale (kb/90 §5.12; kb/80 R3 Sale flows "Sold (seller)"):
 * - the receipt comes from the `sold` event (`{token_id, listing_id, seller_id, buyer_id, price, currency}`) and the
 *   `payout` event of the SAME tx (`{account_id, currency, amount, ok}`; the payout is detached, so `ok:false` means the
 *   amount was credited to `proceeds` instead and the sale still stands);
 * - the escrow comes from `proceeds_of(account)` (authoritative state), never from the event alone.
 * Live: FastNEAR `/v0/account` (the seller is in the events' `data`, so `is_event_log` finds the tx), falling back to
 * the contract's recent txs. Fixture: the in-browser simulation.
 */

/** paid: the payout landed · escrow: it failed and waits in `proceeds` · pending: no payout event indexed yet. */
export type PayoutState = "paid" | "escrow" | "pending";

export interface SaleReceipt {
  tokenId: string;
  listingId: number;
  seller: string;
  buyer: string;
  price: string;
  currency: Currency;
  tx: string;
  block: number | null;
  timestampMs: number | null;
  payout: PayoutState;
}

/** The newest `sold` event of `tokenId` by `seller` in these txs, with the payout outcome of the same tx. Pure. */
export function saleFromTxs(txs: FastnearTx[], contractId: string, tokenId: string, seller: string): SaleReceipt | null {
  let best: SaleReceipt | null = null;
  for (const t of txs) {
    const evs = contractEvents([t], contractId).filter((e) => e.standard === "satchel");
    const sold = evs.find((e) => e.event === "sold" && String(e.data.token_id) === tokenId && e.data.seller_id === seller);
    if (!sold) continue;
    const currency = sold.data.currency === "usdc" ? "usdc" : "near";
    const payout = evs.find((e) => e.event === "payout" && e.data.account_id === seller && (e.data.currency ?? currency) === currency);
    const r: SaleReceipt = {
      tokenId,
      listingId: Number(sold.data.listing_id),
      seller,
      buyer: String(sold.data.buyer_id ?? ""),
      price: String(sold.data.price ?? "0"),
      currency,
      tx: sold.tx,
      block: sold.block,
      timestampMs: sold.timestampMs,
      payout: !payout ? "pending" : payout.data.ok === false ? "escrow" : "paid",
    };
    if (!best || (r.block ?? 0) > (best.block ?? 0)) best = r;
  }
  return best;
}

export async function findSale(tokenId: string, seller: string, client = historyClient({ timeoutMs: 6000 })): Promise<SaleReceipt | null> {
  if (IS_FIXTURE) {
    const s = simOverlay().sales[tokenId];
    if (!s || s.seller !== seller) return null;
    return { tokenId, listingId: s.listingId, seller, buyer: s.buyer, price: s.price, currency: s.currency, tx: s.tx, block: s.height || null, timestampMs: s.at, payout: s.payoutOk ? "paid" : "escrow" };
  }
  const bySeller = await client.account({ account_id: seller, is_event_log: true, is_success: true, desc: true, limit: 25 });
  let sale = saleFromTxs(await client.transactions(bySeller.account_txs.map((t) => t.transaction_hash)), SATCHEL_CONTRACT, tokenId, seller);
  if (!sale) {
    const byContract = await client.account({ account_id: SATCHEL_CONTRACT, is_success: true, desc: true, limit: 40 });
    sale = saleFromTxs(await client.transactions(byContract.account_txs.map((t) => t.transaction_hash)), SATCHEL_CONTRACT, tokenId, seller);
  }
  return sale;
}

/** `proceeds_of(account)` with zero entries dropped. */
export async function proceedsOf(account: string): Promise<ProceedsView[]> {
  const rows = await contractViews(dataSource().view).proceedsOf(account);
  return rows.filter((r) => /^\d+$/.test(r.amount) && BigInt(r.amount) > 0n);
}

/* ── one shared lookup per (token, seller), so every useViewer() caller reuses it ── */

type Entry = { value: SaleReceipt | null | undefined; promise: Promise<SaleReceipt | null> | null; stamp: string; listeners: Set<() => void> };
const cache = new Map<string, Entry>();

export function saleKey(tokenId: string, seller: string) {
  return `${tokenId}|${seller}`;
}

/** `stamp` (e.g. the current owner) re-runs the lookup when it changes; same stamp = the same in-flight promise. */
export function loadSale(tokenId: string, seller: string, stamp = ""): Promise<SaleReceipt | null> {
  const entry = ensure(tokenId, seller);
  if (entry.promise && entry.stamp === stamp) return entry.promise;
  entry.stamp = stamp;
  entry.promise = findSale(tokenId, seller)
    .catch(() => null)
    .then((v) => {
      entry.value = v;
      entry.listeners.forEach((l) => l());
      return v;
    });
  return entry.promise;
}

export function peekSale(tokenId: string, seller: string): SaleReceipt | null | undefined {
  return cache.get(saleKey(tokenId, seller))?.value;
}

export function subscribeSale(tokenId: string, seller: string, fn: () => void): () => void {
  const e = ensure(tokenId, seller);
  e.listeners.add(fn);
  return () => {
    e.listeners.delete(fn);
  };
}

function ensure(tokenId: string, seller: string): Entry {
  const key = saleKey(tokenId, seller);
  let e = cache.get(key);
  if (!e) {
    e = { value: undefined, promise: null, stamp: "", listeners: new Set() };
    cache.set(key, e);
  }
  return e;
}
