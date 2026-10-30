import { EXPLORERS, USDC_CONTRACT } from "@/lib/config";
import { evmTxLink, usdcAddress } from "@/lib/evm-networks";
import type { Coin, Network } from "@/lib/holdings";
import { WNEAR_TESTNET } from "@/lib/near/contract";

/**
 * The Transactions tab: what moved in and out of a Satchel, on every chain we can read without a key, newest first.
 * Pure parsers, one per source, from the public APIs' own shapes (checked live 2026-10-30):
 * - Bitcoin testnet4: mempool.space `GET /address/{a}/txs`;
 * - Ethereum Sepolia, Base Sepolia, OP Sepolia: Blockscout `GET /api/v2/addresses/{a}/transactions` (ETH) and
 *   `/token-transfers?type=ERC-20` (only the network's Circle USDC; other tokens are ignored, so spam never shows);
 * - Solana devnet: `getSignaturesForAddress` + batched `getTransaction` (jsonParsed), the balance change of the address;
 * - inside (NEAR testnet): the contract's `inside_deposit` / `inside_withdraw` events for this token.
 * Arbitrum Sepolia has no keyless source today (its Blockscout sits behind a bot check), so it is not listed.
 * This is not the clean history: that is the Activity tab (what the contract signed); this is what the chains saw.
 */

export interface ChainTx {
  /** unique per row: `${network}:${hash}:${coin}` */
  id: string;
  network: Network;
  coin: Coin;
  /** `self`: between the Satchel's own outputs (a BTC consolidation) */
  direction: "in" | "out" | "self";
  /** base units, positive */
  amount: string;
  /** the other side: a sender (in) or a receiver (out); null when there's none to name */
  counterparty: string | null;
  hash: string;
  url: string;
  /** null while pending */
  timestampMs: number | null;
  status: "confirmed" | "pending" | "failed";
  /** base units of the network's own coin, paid by this Satchel (out only) */
  fee?: string;
}

export type TxSourceKey = "bitcoin" | "sepolia" | "base" | "optimism" | "solana" | "near";

export interface TxSourceRead {
  key: TxSourceKey;
  ok: boolean;
}

export interface TxPage {
  txs: ChainTx[];
  sources: TxSourceRead[];
  as_of: number;
}

const big = (v: unknown): bigint => {
  try {
    return BigInt(String(v ?? "0"));
  } catch {
    return 0n;
  }
};
const lower = (s: unknown) => String(s ?? "").toLowerCase();

/* ── Bitcoin (mempool.space) ─────────────────────────────────────────────────────────────────────────────────────── */

interface MempoolTx {
  txid: string;
  fee?: number;
  status?: { confirmed?: boolean; block_time?: number };
  vin?: { prevout?: { scriptpubkey_address?: string; value?: number } | null }[];
  vout?: { scriptpubkey_address?: string; value?: number }[];
}

export function parseMempool(rows: unknown, address: string): ChainTx[] {
  if (!Array.isArray(rows)) return [];
  const out: ChainTx[] = [];
  for (const t of rows as MempoolTx[]) {
    if (!t?.txid) continue;
    const vin = t.vin ?? [];
    const vout = t.vout ?? [];
    const spent = vin.reduce((a, i) => a + (i.prevout?.scriptpubkey_address === address ? BigInt(i.prevout.value ?? 0) : 0n), 0n);
    const received = vout.reduce((a, o) => a + (o.scriptpubkey_address === address ? BigInt(o.value ?? 0) : 0n), 0n);
    const toOthers = vout.filter((o) => o.scriptpubkey_address !== address);
    const paid = toOthers.reduce((a, o) => a + BigInt(o.value ?? 0), 0n);
    const confirmed = !!t.status?.confirmed;
    const base = {
      id: `bitcoin:${t.txid}:BTC`,
      network: "bitcoin" as const,
      coin: "BTC" as const,
      hash: t.txid,
      url: EXPLORERS.btcTx(t.txid),
      timestampMs: confirmed && t.status?.block_time ? t.status.block_time * 1000 : null,
      status: confirmed ? ("confirmed" as const) : ("pending" as const),
    };
    if (spent === 0n) {
      if (received === 0n) continue;
      const from = vin.map((i) => i.prevout?.scriptpubkey_address).find((a) => a && a !== address) ?? null;
      out.push({ ...base, direction: "in", amount: received.toString(), counterparty: from });
    } else if (paid > 0n) {
      out.push({ ...base, direction: "out", amount: paid.toString(), counterparty: toOthers.find((o) => o.scriptpubkey_address)?.scriptpubkey_address ?? null, fee: String(t.fee ?? 0) });
    } else {
      out.push({ ...base, direction: "self", amount: received.toString(), counterparty: null, fee: String(t.fee ?? 0) });
    }
  }
  return out;
}

/* ── EVM (Blockscout) ────────────────────────────────────────────────────────────────────────────────────────────── */

const NET_OF_CHAIN: Record<number, TxSourceKey> = { 11155111: "sepolia", 84532: "base", 11155420: "optimism" };

/** The keyless Blockscout per EVM testnet (Arbitrum Sepolia has none that answers without a browser challenge). */
export const BLOCKSCOUT: Record<number, string> = {
  11155111: "https://eth-sepolia.blockscout.com",
  84532: "https://base-sepolia.blockscout.com",
  11155420: "https://testnet-explorer.optimism.io",
};

interface BsTx {
  hash: string;
  value?: string;
  status?: string | null;
  result?: string;
  timestamp?: string | null;
  from?: { hash?: string } | null;
  to?: { hash?: string } | null;
  fee?: { value?: string } | null;
}
interface BsTransfer {
  transaction_hash: string;
  timestamp?: string | null;
  from?: { hash?: string } | null;
  to?: { hash?: string } | null;
  total?: { value?: string } | null;
  token?: { address_hash?: string; address?: string } | null;
}

const evmStatus = (t: { status?: string | null; result?: string }): ChainTx["status"] =>
  t.status === "error" || (t.result && t.result !== "success" && t.result !== "pending") ? "failed" : t.status === "ok" ? "confirmed" : "pending";
const isoMs = (s: string | null | undefined) => (s ? Date.parse(s) || null : null);

export function parseBlockscout(chainId: number, txs: unknown, transfers: unknown, address: string): ChainTx[] {
  const network = NET_OF_CHAIN[chainId];
  if (!network) return [];
  const me = lower(address);
  const out: ChainTx[] = [];
  const items = (v: unknown) => (v && typeof v === "object" && Array.isArray((v as { items?: unknown }).items) ? ((v as { items: unknown[] }).items as unknown[]) : []);
  for (const t of items(txs) as BsTx[]) {
    const value = big(t.value);
    if (!t?.hash || value === 0n) continue; // a token call or a contract call: its coin shows in the transfers
    const from = lower(t.from?.hash);
    const to = lower(t.to?.hash);
    const direction = from === me && to === me ? "self" : from === me ? "out" : to === me ? "in" : null;
    if (!direction) continue;
    const status = evmStatus(t);
    out.push({
      id: `${network}:${t.hash}:ETH`,
      network,
      coin: "ETH",
      direction,
      amount: value.toString(),
      counterparty: direction === "out" ? (t.to?.hash ?? null) : direction === "in" ? (t.from?.hash ?? null) : null,
      hash: t.hash,
      url: evmTxLink(chainId, t.hash),
      timestampMs: status === "pending" ? null : isoMs(t.timestamp),
      status,
      ...(direction !== "in" && t.fee?.value ? { fee: String(t.fee.value) } : {}),
    });
  }
  const usdc = lower(usdcAddress(chainId));
  for (const x of items(transfers) as BsTransfer[]) {
    if (!x?.transaction_hash || lower(x.token?.address_hash ?? x.token?.address) !== usdc) continue;
    const from = lower(x.from?.hash);
    const to = lower(x.to?.hash);
    const direction = from === me ? "out" : to === me ? "in" : null;
    const amount = big(x.total?.value);
    if (!direction || amount === 0n) continue;
    out.push({
      id: `${network}:${x.transaction_hash}:USDC`,
      network,
      coin: "USDC",
      direction,
      amount: amount.toString(),
      counterparty: direction === "out" ? (x.to?.hash ?? null) : (x.from?.hash ?? null),
      hash: x.transaction_hash,
      url: evmTxLink(chainId, x.transaction_hash),
      timestampMs: isoMs(x.timestamp),
      status: x.timestamp ? "confirmed" : "pending",
    });
  }
  return out;
}

/* ── Solana (devnet RPC) ─────────────────────────────────────────────────────────────────────────────────────────── */

interface SolTx {
  blockTime?: number | null;
  meta?: { err?: unknown; fee?: number; preBalances?: number[]; postBalances?: number[] } | null;
  transaction?: { signatures?: string[]; message?: { accountKeys?: (string | { pubkey: string })[] } };
}

/** `getTransaction` results (jsonParsed) → the address's SOL movement in each. */
export function parseSolana(results: unknown, address: string): ChainTx[] {
  if (!Array.isArray(results)) return [];
  const out: ChainTx[] = [];
  for (const r of results as SolTx[]) {
    const sig = r?.transaction?.signatures?.[0];
    const keys = (r?.transaction?.message?.accountKeys ?? []).map((k) => (typeof k === "string" ? k : k.pubkey));
    const i = keys.indexOf(address);
    const pre = r?.meta?.preBalances ?? [];
    const post = r?.meta?.postBalances ?? [];
    if (!sig || i < 0 || pre[i] === undefined || post[i] === undefined) continue;
    const fee = i === 0 ? BigInt(r.meta?.fee ?? 0) : 0n; // the fee payer is account 0
    const delta = BigInt(post[i]) - BigInt(pre[i]);
    const moved = delta < 0n ? -delta - fee : delta;
    if (moved <= 0n) continue;
    const direction = delta < 0n ? "out" : "in";
    // the other side: the account whose balance moved the opposite way the most
    let other: string | null = null;
    let best = 0n;
    keys.forEach((k, j) => {
      if (j === i || pre[j] === undefined || post[j] === undefined) return;
      const d = BigInt(post[j]) - BigInt(pre[j]);
      const opposite = direction === "out" ? d : -d;
      if (opposite > best) {
        best = opposite;
        other = k;
      }
    });
    out.push({
      id: `solana:${sig}:SOL`,
      network: "solana",
      coin: "SOL",
      direction,
      amount: moved.toString(),
      counterparty: other,
      hash: sig,
      url: EXPLORERS.solTx(sig),
      timestampMs: r.blockTime ? r.blockTime * 1000 : null,
      status: r.meta?.err ? "failed" : "confirmed",
      ...(direction === "out" && fee > 0n ? { fee: fee.toString() } : {}),
    });
  }
  return out;
}

/* ── Inside (the contract's events) ──────────────────────────────────────────────────────────────────────────────── */

interface InsideEvent {
  event: string;
  tx: string;
  timestampMs: number | null;
  data: Record<string, unknown>;
}

const insideCoin = (ft: unknown): Coin | null => (ft == null ? "NEAR" : ft === USDC_CONTRACT ? "USDC" : ft === WNEAR_TESTNET ? "wNEAR" : null);

export function parseInside(events: readonly InsideEvent[]): ChainTx[] {
  const out: ChainTx[] = [];
  for (const e of events) {
    if (e.event !== "inside_deposit" && e.event !== "inside_withdraw") continue;
    const coin = insideCoin(e.data.ft);
    if (!coin) continue;
    const dep = e.event === "inside_deposit";
    out.push({
      id: `near:${e.tx}:${coin}`,
      network: "near",
      coin,
      direction: dep ? "in" : "out",
      amount: String(e.data.amount ?? "0"),
      counterparty: String((dep ? e.data.sender_id : e.data.receiver_id) ?? "") || null,
      hash: e.tx,
      url: EXPLORERS.nearTx(e.tx),
      timestampMs: e.timestampMs,
      status: "confirmed",
    });
  }
  return out;
}

/** Newest first; pending ones (no time yet) on top. One row per id. */
export function mergeTxs(lists: readonly ChainTx[][]): ChainTx[] {
  const seen = new Map<string, ChainTx>();
  for (const l of lists) for (const t of l) if (!seen.has(t.id)) seen.set(t.id, t);
  return [...seen.values()].sort((a, b) => (b.timestampMs ?? Number.MAX_SAFE_INTEGER) - (a.timestampMs ?? Number.MAX_SAFE_INTEGER));
}

/** The tab's filter: all, or one chain family (Ethereum covers every EVM testnet). */
export type TxFilter = "all" | "bitcoin" | "ethereum" | "solana" | "inside";
export const TX_FILTERS: TxFilter[] = ["all", "bitcoin", "ethereum", "solana", "inside"];
const FAMILY: Record<Network, TxFilter> = { bitcoin: "bitcoin", sepolia: "ethereum", base: "ethereum", arbitrum: "ethereum", optimism: "ethereum", solana: "solana", near: "inside" };
export const familyOf = (n: Network): TxFilter => FAMILY[n];
export function parseTxFilter(raw: unknown): TxFilter {
  const v = String(Array.isArray(raw) ? raw[0] : (raw ?? "all"));
  return (TX_FILTERS as string[]).includes(v) ? (v as TxFilter) : "all";
}
