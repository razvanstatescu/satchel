import { cacheLife } from "next/cache";
import { CONTRACT_ROLE, DATA_MODE, IS_FIXTURE, SATCHEL_CONTRACT } from "@/lib/config";
import { fixtureCleanReport, unavailableReport } from "@/lib/data/clean";
import { fixtureEvents } from "@/lib/data/fixtures";
import { dataSource, type LockRead } from "@/lib/data/source";
import type { ActivityRow, CleanReport, ContractFacts, MarketEntry, SatchelSnapshot } from "@/lib/data/types";
import { buildSnapshot, isTokenId, UPSTREAM_MS } from "@/lib/data/snapshot";
import { contractViews } from "@/lib/near/contract";
import { satchelEvents } from "@/lib/near/history";
import { withTimeout } from "@/lib/near/rpc";
import type { ConfigView, SigRecordView } from "@/lib/near/types";

/**
 * Server reads for the blocking judge pages and the JSON routes (kb/90 §8.1, §9).
 * Every read is a "use cache" function (15 s; 60 s for /contract) with a 1.5 s bound per upstream, so a judge page
 * never hangs and never streams its facts behind a Suspense fallback.
 */

export { isTokenId };

export async function getConfig(): Promise<ConfigView | null> {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  try {
    return await withTimeout(contractViews(dataSource().view).config(), UPSTREAM_MS, "config");
  } catch {
    return null;
  }
}

export async function getLock(): Promise<LockRead> {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  try {
    return await dataSource().lock({ timeoutMs: UPSTREAM_MS });
  } catch {
    return {
      access_keys: null,
      account_exists: null,
      locked: null,
      code_hash_hex: null,
      expected_code_hash: null,
      code_matches: null,
      birth_tx: null,
      birth_block: null,
      any_signer_tx_count: null,
      oldest_tx: null,
      mpc_version: null,
      birth_actions: [],
    };
  }
}

export async function getSatchelSnapshot(id: string): Promise<SatchelSnapshot | null> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  if (!isTokenId(id)) return null;
  const [config, lock] = await Promise.all([getConfig(), getLock()]);
  return buildSnapshot(id, dataSource(), { config, lock }, Date.now());
}

export async function getContractFacts(): Promise<ContractFacts> {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  // birth_error explains an empty birth_actions (live only); it goes to `errors`, not into the facts.
  const [{ birth_error, ...lock }, config] = await Promise.all([getLock(), getConfig()]);
  const errors: string[] = [];
  if (lock.access_keys === null) errors.push("access keys unavailable");
  if (!config) errors.push("config unavailable");
  if (birth_error) errors.push(`birth actions unavailable (${birth_error})`);
  return { account_id: SATCHEL_CONTRACT, role: CONTRACT_ROLE, data_mode: DATA_MODE, ...lock, config, as_of: Date.now(), errors };
}

export async function getSigRecords(id: string): Promise<SigRecordView[]> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  const views = contractViews(dataSource().view);
  try {
    const s = await withTimeout(views.satchel(id), UPSTREAM_MS, "satchel");
    if (!s) return [];
    return await withTimeout(views.allSigRecords(id, s.sig_count), UPSTREAM_MS * 2, "sig_records");
  } catch {
    return [];
  }
}

/** Server-side clean-history HINT (kb/90 §7.5 place 2). Never authoritative for Buy. */
export async function getCleanHint(id: string): Promise<CleanReport | null> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  const snap = await getSatchelSnapshot(id);
  if (!snap) return null;
  const records = await getSigRecords(id);
  if (IS_FIXTURE) return fixtureCleanReport(id, records, snap.lock, snap.listing?.id ?? null, "server-hint");
  try {
    const { runLiveCheck } = await import("@/lib/data/clean-live");
    const r = await withTimeout(runLiveCheck(id, "server-hint"), 8000, "clean-history");
    return { ...r, listing_id: snap.listing?.id ?? null };
  } catch {
    return unavailableReport(id, records, snap.lock, snap.listing?.id ?? null);
  }
}

export async function getMarket(): Promise<{ entries: MarketEntry[]; as_of: number; error: string | null }> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  try {
    const listings = await withTimeout(contractViews(dataSource().view).listings(0, 50), UPSTREAM_MS, "listings");
    const entries = (
      await Promise.all(
        listings.map(async (l) => {
          const snapshot = await getSatchelSnapshot(l.token_id);
          if (!snapshot) return null;
          const hint = await getCleanHint(l.token_id);
          return { token_id: l.token_id, listing: l.listing, snapshot, hint: hint ? { aggregate: hint.aggregate, checked_at: hint.checked_at, items: hint.items } : null } satisfies MarketEntry;
        }),
      )
    ).filter((x): x is MarketEntry => !!x);
    // Buyable first, blocked last (kb/80 R3 Market).
    const rank = (e: MarketEntry) => (e.hint?.aggregate === "clean" || e.hint?.aggregate === "empty" ? 0 : 1);
    entries.sort((a, b) => rank(a) - rank(b) || b.listing.listed_at - a.listing.listed_at);
    return { entries, as_of: Date.now(), error: null };
  } catch (e) {
    return { entries: [], as_of: Date.now(), error: e instanceof Error ? e.message : String(e) };
  }
}

/** Activity rows (first page) from NEP-297 events: FastNEAR tx API in live mode, fixtures otherwise. */
export async function getActivity(id: string): Promise<{ rows: ActivityRow[]; partial: boolean }> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  if (IS_FIXTURE) {
    return {
      partial: false,
      rows: fixtureEvents(id).map((e): ActivityRow => {
        if (e.event === "nft_mint") return { kind: "minted", tx: e.tx, block: e.block, timestampMs: e.timestampMs, from: String(e.data.owner_id) };
        if (e.event === "nft_transfer") return { kind: "transferred", tx: e.tx, block: e.block, timestampMs: e.timestampMs, from: String(e.data.old_owner_id), to: String(e.data.new_owner_id) };
        if (e.event === "listed") return { kind: "listed", tx: e.tx, block: e.block, timestampMs: e.timestampMs, price: String(e.data.price), currency: e.data.currency as "near" | "usdc" };
        if (e.chainTx) return { kind: "sent", tx: e.tx, block: e.block, timestampMs: e.timestampMs, chain: e.chainTx.chain, amount: e.chainTx.amount, to: e.chainTx.to, fee: e.chainTx.fee, chainTxId: e.chainTx.id, status: "final" };
        return { kind: "issued", tx: e.tx, block: e.block, timestampMs: e.timestampMs, chain: e.data.chain as "evm" | "btc", amount: e.data.amount ? String(e.data.amount) : undefined, to: e.data.to ? String(e.data.to) : undefined, status: "unused" };
      }),
    };
  }
  try {
    const key = process.env.FASTNEAR_API_KEY?.trim() || null;
    const { historyClient } = await import("@/lib/near/history");
    const evs = await withTimeout(satchelEvents(SATCHEL_CONTRACT, id, { client: historyClient({ apiKey: key, timeoutMs: 3000 }), limit: 60 }), 4000, "activity");
    const rows: ActivityRow[] = [];
    for (const e of evs) {
      const base = { tx: e.tx, block: e.block, timestampMs: e.timestampMs };
      if (e.event === "nft_mint") rows.push({ kind: "minted", ...base, from: String(e.data.owner_id ?? "") });
      else if (e.event === "nft_transfer") rows.push({ kind: "transferred", ...base, from: String(e.data.old_owner_id ?? ""), to: String(e.data.new_owner_id ?? "") });
      else if (e.event === "listed") rows.push({ kind: "listed", ...base, price: String(e.data.price), currency: e.data.currency as "near" | "usdc" });
      else if (e.event === "delisted") rows.push({ kind: "delisted", ...base });
      else if (e.event === "sold") rows.push({ kind: "sold", ...base, to: String(e.data.buyer_id ?? ""), price: String(e.data.price), currency: e.data.currency as "near" | "usdc" });
      else if (e.event === "sign_requested") rows.push({ kind: "issued", ...base, chain: e.data.chain as "btc" | "evm" | "sol", status: "final" });
    }
    return { rows, partial: false };
  } catch {
    return { rows: [], partial: true };
  }
}
