import { cacheLife } from "next/cache";
import { CONTRACT_ROLE, DATA_MODE, IS_FIXTURE, SATCHEL_CONTRACT } from "@/lib/config";
import { fixtureCleanReport, unavailableReport } from "@/lib/data/clean";
import { fixtureEvents, fixtureInside, FIXTURE_MARKET_CONFIG } from "@/lib/data/fixtures";
import { dataSource, type LockRead } from "@/lib/data/source";
import type { ActivityRow, CleanReport, ContractFacts, MarketEntry, SatchelSnapshot, UnlistedEntry } from "@/lib/data/types";
import { buildSnapshot, isTokenId, UPSTREAM_MS } from "@/lib/data/snapshot";
import { contractViews } from "@/lib/near/contract";
import { satchelEvents, type SatchelEvent } from "@/lib/near/history";
import { withTimeout } from "@/lib/near/rpc";
import { isMessageDetail, type ConfigView, type InsideView, type MarketConfigView, type OfferView, type SigRecordView } from "@/lib/near/types";
import { messageFromHex } from "@/lib/message";

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

/** For prerendered routes (the social card): the plain 15 s cache, a missing id included (they can't hold an uncached
 * read, and their fallback image for an unknown id is fine to keep briefly). */
export async function getSatchelSnapshotStatic(id: string): Promise<SatchelSnapshot | null> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  if (!isTokenId(id)) return null;
  const [config, lock] = await Promise.all([getConfig(), getLock()]);
  return buildSnapshot(id, dataSource(), { config, lock }, Date.now());
}

/** The cached read. A found Satchel is kept 15 s; a missing one is not kept at all (`revalidate: 0`), so a Satchel
 * minted a moment ago, or asked for by a prefetch just before its mint landed, never stays a 404. */
export async function getSatchelSnapshot(id: string): Promise<SatchelSnapshot | null> {
  "use cache";
  if (!isTokenId(id)) {
    cacheLife({ revalidate: 15, expire: 3600 });
    return null;
  }
  const [config, lock] = await Promise.all([getConfig(), getLock()]);
  const s = await buildSnapshot(id, dataSource(), { config, lock }, Date.now());
  if (s) cacheLife({ revalidate: 15, expire: 3600 });
  else cacheLife({ stale: 0, revalidate: 0, expire: 1 });
  return s;
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

/**
 * A `sign_requested` event as an Activity row (docs/specs/C1-C2-C3-C7.md §4.3): `details[0]` names a message kind (C7;
 * the text comes from the record at that seq), or the EVM chain id (C3) and a USDC transfer (C2).
 */
export function signRow(base: Pick<ActivityRow, "tx" | "block" | "timestampMs">, data: Record<string, unknown>, records: readonly SigRecordView[], ownerThen?: string): ActivityRow {
  const chain = (data.chain as "btc" | "evm" | "sol") ?? "evm";
  const d = (Array.isArray(data.details) ? data.details[0] : null) as { seq?: number; kind?: string; chain_id?: number; erc20?: { to: string; amount: string } } | null;
  const seq = d?.seq ?? (typeof data.first_seq === "number" ? data.first_seq : undefined);
  const rec = seq !== undefined ? records.find((r) => r.seq === seq) : undefined;
  if (d?.kind === "evm_message" || d?.kind === "sol_message" || (rec && isMessageDetail(rec.detail))) {
    const hex = rec && "evm_message" in rec.detail ? rec.detail.evm_message.message : rec && "sol_message" in rec.detail ? rec.detail.sol_message.message : null;
    const text = hex ? messageFromHex(hex).text : null;
    return { kind: "message", ...base, chain: d?.kind === "sol_message" || rec?.chain === "sol" ? "sol" : "evm", status: "message", ...(text !== null ? { messageText: text } : {}) };
  }
  const row: ActivityRow = { kind: "issued", ...base, chain, status: "final" };
  // C5: the event never names the caller (C5.md §1.3); the record does. Named only when it wasn't the owner then.
  if (rec?.requester && rec.requester !== ownerThen) row.requester = rec.requester;
  if (d?.chain_id) row.evmChainId = d.chain_id;
  if (d?.erc20) Object.assign(row, { token: "USDC" as const, amount: d.erc20.amount, to: `0x${d.erc20.to.replace(/^0x/, "")}` });
  return row;
}

/** C6: NEAR + allowlisted FTs held inside the Satchel contract for this token (docs/specs/C4-C6.md §4). Server-rendered
 * next to the chain balances, no action required — anyone can read it. */
export async function getInside(id: string): Promise<InsideView> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  if (!isTokenId(id)) return { near: "0", fts: [], inside_epoch: 0 };
  if (IS_FIXTURE) return fixtureInside(id);
  try {
    const v = await withTimeout(contractViews(dataSource().view).insideOf(id), UPSTREAM_MS, "inside_of");
    return v ?? { near: "0", fts: [], inside_epoch: 0 };
  } catch {
    return { near: "0", fts: [], inside_epoch: 0 };
  }
}

/** C4: open offers on this token (the owner's incoming offers), oldest first. */
export async function getOffersFor(id: string): Promise<OfferView[]> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  if (!isTokenId(id)) return [];
  try {
    return await withTimeout(contractViews(dataSource().view).offersFor(id, 0, 50), UPSTREAM_MS, "offers_for");
  } catch {
    return [];
  }
}

/** C4: open offers made by this account ("My offers"). Not cached as long as the per-token reads: it's read from a
 * client component (MySatchels), so a short-lived cache is enough to avoid hammering RPC on every poll. */
export async function getOffersBy(accountId: string): Promise<OfferView[]> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  try {
    return await withTimeout(contractViews(dataSource().view).offersBy(accountId, 0, 50), UPSTREAM_MS, "offers_by");
  } catch {
    return [];
  }
}

/**
 * C4: Satchels that aren't listed, with a "Make an offer" link (docs/specs/C4-C6.md §3: anyone can offer whether or
 * not it's for sale). `nft_tokens` enumerates everything ever minted; the listed ones are dropped. Capped at the
 * contract's enumeration page (50): fine for a hackathon-scale mint count, and a judge page must still bound its
 * own upstream calls (kb/90 §9).
 */
export async function getUnlistedMarket(): Promise<{ entries: UnlistedEntry[]; error: string | null }> {
  "use cache";
  cacheLife({ revalidate: 15, expire: 3600 });
  try {
    const [tokens, listings] = await Promise.all([
      withTimeout(contractViews(dataSource().view).nftTokens("0", 50), UPSTREAM_MS, "nft_tokens"),
      withTimeout(contractViews(dataSource().view).listings(0, 50), UPSTREAM_MS, "listings"),
    ]);
    const listed = new Set(listings.map((l) => l.token_id));
    const unlisted = tokens.filter((t) => !listed.has(t.token_id)).sort((a, b) => Number(a.token_id) - Number(b.token_id));
    const entries = (
      await Promise.all(
        unlisted.map(async (t) => {
          const snapshot = await getSatchelSnapshot(t.token_id);
          return snapshot ? ({ token_id: t.token_id, snapshot } satisfies UnlistedEntry) : null;
        }),
      )
    ).filter((x): x is UnlistedEntry => !!x);
    return { entries, error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getMarketConfig(): Promise<MarketConfigView> {
  "use cache";
  cacheLife({ revalidate: 60, expire: 3600 });
  if (IS_FIXTURE) return FIXTURE_MARKET_CONFIG;
  try {
    const v = await withTimeout(contractViews(dataSource().view).marketConfig(), UPSTREAM_MS, "market_config");
    return v ?? FIXTURE_MARKET_CONFIG;
  } catch {
    return FIXTURE_MARKET_CONFIG;
  }
}

/** Activity rows from a token's live NEP-297 events (newest or oldest first, any order). A signature names its
 * requester (from the record) only when that wasn't the owner at the time; an accepted offer reads as a sale. */
export function liveActivityRows(evs: readonly SatchelEvent[], records: readonly SigRecordView[]): ActivityRow[] {
  // who owned the token at each block: mint and every transfer, oldest first
  const moves = evs
    .filter((e) => e.event === "nft_mint" || e.event === "nft_transfer")
    .map((e) => ({ block: e.block, owner: String(e.event === "nft_mint" ? (e.data.owner_id ?? "") : (e.data.new_owner_id ?? "")) }))
    .sort((a, b) => a.block - b.block);
  const ownerAt = (block: number) => {
    let o: string | undefined;
    for (const m of moves) if (m.block <= block) o = m.owner;
    return o;
  };
  const rows: ActivityRow[] = [];
  for (const e of evs) {
    const base = { tx: e.tx, block: e.block, timestampMs: e.timestampMs };
    if (e.event === "nft_mint") rows.push({ kind: "minted", ...base, from: String(e.data.owner_id ?? "") });
    else if (e.event === "nft_transfer") rows.push({ kind: "transferred", ...base, from: String(e.data.old_owner_id ?? ""), to: String(e.data.new_owner_id ?? "") });
    else if (e.event === "listed") rows.push({ kind: "listed", ...base, price: String(e.data.price), currency: e.data.currency as "near" | "usdc" });
    else if (e.event === "delisted") rows.push({ kind: "delisted", ...base });
    else if (e.event === "sold") rows.push({ kind: "sold", ...base, to: String(e.data.buyer_id ?? ""), price: String(e.data.price), currency: e.data.currency as "near" | "usdc" });
    else if (e.event === "offer_accepted") rows.push({ kind: "sold", ...base, to: String(e.data.buyer_id ?? ""), price: String(e.data.amount), currency: e.data.currency as "near" | "usdc" });
    else if (e.event === "sign_requested") rows.push(signRow(base, e.data, records, ownerAt(e.block)));
  }
  return rows;
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
        // C5: a delegate's `requester` rides the event (fixtures only name it when the signer wasn't the owner).
        const requester = e.data.requester ? String(e.data.requester) : undefined;
        if (e.message) return { kind: "message", tx: e.tx, block: e.block, timestampMs: e.timestampMs, chain: e.message.chain, messageText: e.message.text, status: "message" };
        if (e.chainTx)
          return {
            kind: "sent",
            tx: e.tx,
            block: e.block,
            timestampMs: e.timestampMs,
            chain: e.chainTx.chain,
            amount: e.chainTx.amount,
            to: e.chainTx.to,
            fee: e.chainTx.fee,
            chainTxId: e.chainTx.id,
            status: "final",
            ...(e.chainTx.token ? { token: e.chainTx.token } : {}),
            ...(e.chainTx.chainId ? { evmChainId: e.chainTx.chainId } : {}),
            requester,
          };
        return { kind: "issued", tx: e.tx, block: e.block, timestampMs: e.timestampMs, chain: e.data.chain as "evm" | "btc", amount: e.data.amount ? String(e.data.amount) : undefined, to: e.data.to ? String(e.data.to) : undefined, status: "unused", requester };
      }),
    };
  }
  try {
    const key = process.env.FASTNEAR_API_KEY?.trim() || null;
    const { historyClient } = await import("@/lib/near/history");
    const evs = await withTimeout(satchelEvents(SATCHEL_CONTRACT, id, { client: historyClient({ apiKey: key, timeoutMs: 3000 }), limit: 60 }), 4000, "activity");
    const records = evs.some((e) => e.event === "sign_requested") ? await getSigRecords(id) : [];
    const rows = liveActivityRows(evs, records);
    return { rows, partial: false };
  } catch {
    return { rows: [], partial: true };
  }
}
