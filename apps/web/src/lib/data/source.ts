import { BTC_APIS, CONTRACT_ROLE, EXPECTED_CODE_HASH, IS_FIXTURE, SATCHEL_CONTRACT, SEPOLIA_RPCS, SOL_RPCS } from "@/lib/config";
import {
  FIXTURE_BALANCES,
  FIXTURE_CODE_HASH,
  FIXTURE_CONFIG,
  FIXTURE_HEIGHT,
  FIXTURE_LOCK,
  FIXTURE_MARKET_CONFIG,
  FIXTURE_RECORDS,
  fixtureListings,
  fixtureSatchel,
  fixtureToken,
  FIXTURE_TOKENS,
} from "@/lib/data/fixtures";
import { simOverlay } from "@/lib/data/sim";
import type { LockFacts } from "@/lib/data/types";
import type { ViewFn } from "@/lib/near/contract";
import { historyClient, readBirthActions } from "@/lib/near/history";
import { nearAccessKeys, nearBlockHeight, nearView, nearViewAccount, withTimeout } from "@/lib/near/rpc";
import type { NftToken, SigRecordView } from "@/lib/near/types";

/**
 * One data source per mode. Live reads real RPCs (FastNEAR → dRPC; mempool.space; Sepolia; Solana devnet);
 * fixture serves kb/90 §5.14-shaped views from `fixtures.ts`, plus the in-browser signing simulation overlay
 * (`sim.ts`) that the e2e tests drive with the mock wallet.
 */

export interface Balances {
  btc: { confirmed_sats: string; unconfirmed_sats: string } | null;
  evm: { wei: string } | null;
  sol: { lamports: string } | null;
  errors: string[];
}

/**
 * What `lock()` reads (kb/90 §5.16 proofs; `/api/contract`). `birth_actions` uses the `FIXTURE_LOCK` format (see
 * `birthActions` in near/history.ts); `birth_error` (live only, never part of the facts JSON) says why it is empty.
 */
export type LockRead = LockFacts & {
  any_signer_tx_count: number | null;
  oldest_tx: string | null;
  mpc_version: string | null;
  birth_actions: string[];
  birth_error?: string | null;
};

export interface DataSource {
  mode: "live" | "fixture";
  view: ViewFn;
  blockHeight(): Promise<number>;
  balances(addr: { btc: string; evm: string; sol: string }, tokenId: string, opts?: { timeoutMs?: number; includeSol?: boolean }): Promise<Balances>;
  lock(opts?: { timeoutMs?: number }): Promise<LockRead>;
  accountExists(accountId: string): Promise<boolean>;
}

/* ───────────────────────────── fixture ───────────────────────────── */

function fixtureView(): ViewFn {
  return async <T,>(_contract: string, method: string, args: Record<string, unknown>) => {
    const id = String(args.token_id ?? "");
    const sim = simOverlay();
    switch (method) {
      case "config":
        return { ...FIXTURE_CONFIG, next_token_id: FIXTURE_CONFIG.next_token_id + sim.minted.length } as T;
      case "satchel": {
        const base = sim.satchel(id) ?? fixtureSatchel(id);
        return (base ?? null) as T | null;
      }
      case "sig_records": {
        const all = [...(FIXTURE_RECORDS[id] ?? []), ...sim.records(id)];
        const from = Number(args.from_seq ?? 0);
        const limit = Math.min(Number(args.limit ?? 50), 50);
        return all.filter((r) => r.seq >= from).slice(0, limit) as T;
      }
      case "listings":
        return fixtureListings().filter((l) => !sim.delisted.has(l.token_id)) as T;
      case "proceeds_of":
        return sim.proceedsOf(String(args.account_id ?? "")) as T;
      case "derived_path":
        return `satchel/${id}/${String(args.chain)}` as T;
      case "nft_token":
        return (sim.token(id) ?? fixtureToken(id)) as T | null;
      case "nft_total_supply":
        return String(Object.keys(FIXTURE_TOKENS).length + sim.minted.length) as T;
      case "nft_tokens_for_owner": {
        const acct = String(args.account_id);
        const ids = [...Object.keys(FIXTURE_TOKENS), ...sim.minted.map((m) => m.id)];
        return ids.map((i) => sim.token(i) ?? fixtureToken(i)).filter((t): t is NftToken => !!t && t.owner_id === acct) as T;
      }
      case "nft_supply_for_owner": {
        const acct = String(args.account_id);
        const ids = [...Object.keys(FIXTURE_TOKENS), ...sim.minted.map((m) => m.id)];
        return String(ids.map((i) => sim.token(i) ?? fixtureToken(i)).filter((t) => t?.owner_id === acct).length) as T;
      }
      // ── C6 inside assets / C4 offers (docs/specs/C4-C6.md) ──────────────────────────────────
      case "inside_of":
        return (sim.token(id) ?? fixtureToken(id)) ? (sim.insideOf(id) as T) : (null as T | null);
      case "storage_credit_of":
        return sim.storageCreditOf(String(args.account_id ?? "")) as T;
      case "offer": {
        const offerId = Number(args.offer_id ?? -1);
        return (sim.offer(offerId) ?? null) as T | null;
      }
      case "offers_for": {
        const all = sim.offersFor(id);
        const from = Number(args.from_index ?? 0);
        const limit = Math.min(Number(args.limit ?? 50), 50);
        return all.slice(from, from + limit) as T;
      }
      case "offers_by": {
        const all = sim.offersBy(String(args.account_id ?? ""));
        const from = Number(args.from_index ?? 0);
        const limit = Math.min(Number(args.limit ?? 50), 50);
        return all.slice(from, from + limit) as T;
      }
      case "market_config":
        return { ...FIXTURE_MARKET_CONFIG, next_offer_id: FIXTURE_MARKET_CONFIG.next_offer_id } as T;
      case "market_totals":
        // Not exhaustively accurate in fixture mode (no UI reads it); the real contract's I-M2 is a sandbox invariant.
        return { inside_near: "0", offers_near: "0", storage_credit: "0" } as T;
      default:
        return null;
    }
  };
}

const fixtureSource: DataSource = {
  mode: "fixture",
  view: fixtureView(),
  blockHeight: async () => simOverlay().height(FIXTURE_HEIGHT),
  balances: async (_a, tokenId) => {
    const b = FIXTURE_BALANCES[tokenId] ?? { btc: { confirmed: "0", unconfirmed: "0" }, evm: "0", sol: "0" };
    return { btc: { confirmed_sats: b.btc.confirmed, unconfirmed_sats: b.btc.unconfirmed }, evm: { wei: b.evm }, sol: { lamports: b.sol }, errors: [] };
  },
  lock: async () => {
    const expected = EXPECTED_CODE_HASH ?? FIXTURE_CODE_HASH;
    return {
      access_keys: FIXTURE_LOCK.access_keys,
      account_exists: true,
      locked: true,
      code_hash_hex: FIXTURE_LOCK.code_hash_hex,
      expected_code_hash: expected,
      code_matches: FIXTURE_LOCK.code_hash_hex === expected,
      birth_tx: FIXTURE_LOCK.birth_tx,
      birth_block: FIXTURE_LOCK.birth_block,
      any_signer_tx_count: FIXTURE_LOCK.any_signer_tx_count,
      oldest_tx: FIXTURE_LOCK.oldest_tx,
      mpc_version: FIXTURE_LOCK.mpc_version,
      birth_actions: FIXTURE_LOCK.birth_actions,
    };
  },
  accountExists: async (id) => /\.testnet$/.test(id) && !id.startsWith("missing"),
};

/* ───────────────────────────── live ───────────────────────────── */

async function getJson(url: string, timeoutMs: number, init?: RequestInit) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    if (!r.ok) throw new Error(`${new URL(url).host} ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

async function firstOk<T>(urls: readonly string[], fn: (u: string) => Promise<T>): Promise<T> {
  let last: unknown;
  for (const u of urls) {
    try {
      return await fn(u);
    } catch (e) {
      last = e;
    }
  }
  throw last ?? new Error("no provider");
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
/** NEAR returns code_hash in base58; the published hash is SHA-256 hex. */
export function base58ToHex(s: string): string {
  let n = 0n;
  for (const c of s) {
    const i = BASE58.indexOf(c);
    if (i < 0) throw new Error("bad base58");
    n = n * 58n + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = "0" + hex;
  const lead = s.match(/^1*/)?.[0].length ?? 0;
  return "00".repeat(lead) + hex.padStart(64, "0");
}

/** True when a NEAR RPC error says the account doesn't exist (near-api-js `AccountDoesNotExistError`, or the raw RPC text). */
export function isMissingAccountError(e: unknown): boolean {
  const name = (e as { name?: string } | null)?.name ?? "";
  const msg = String((e as { message?: string } | null)?.message ?? e ?? "");
  return name === "AccountDoesNotExistError" || /UNKNOWN_ACCOUNT|does not exist/i.test(msg);
}

const ZERO_CODE_HASH = "0".repeat(64);
/** An account with no deployed contract has an all-zero code hash. */
export function isNoCode(codeHashHex: string | null): boolean {
  return codeHashHex === ZERO_CODE_HASH;
}

const liveSource: DataSource = {
  mode: "live",
  view: async <T,>(contractId: string, method: string, args: Record<string, unknown>) => nearView<T>(contractId, method, args),
  blockHeight: () => nearBlockHeight(),
  balances: async (a, _tokenId, opts = {}) => {
    const ms = opts.timeoutMs ?? 1500;
    const errors: string[] = [];
    const btcP = firstOk(BTC_APIS.slice(0, 1), (u) => getJson(`${u}/address/${a.btc}`, ms)).then(
      (j: { chain_stats: { funded_txo_sum: number; spent_txo_sum: number }; mempool_stats: { funded_txo_sum: number; spent_txo_sum: number } }) => ({
        confirmed_sats: String(j.chain_stats.funded_txo_sum - j.chain_stats.spent_txo_sum),
        unconfirmed_sats: String(j.mempool_stats.funded_txo_sum - j.mempool_stats.spent_txo_sum),
      }),
    );
    const evmP = firstOk(SEPOLIA_RPCS, (u) =>
      getJson(u, ms, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [a.evm, "latest"] }) }),
    ).then((j: { result?: string }) => {
      if (!j.result) throw new Error("eth_getBalance");
      return { wei: BigInt(j.result).toString() };
    });
    const solP = opts.includeSol
      ? firstOk(SOL_RPCS, (u) =>
          getJson(u, ms, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [a.sol] }) }),
        ).then((j: { result?: { value: number } }) => ({ lamports: String(j.result?.value ?? 0) }))
      : Promise.resolve(null);
    const [btc, evm, sol] = await Promise.allSettled([btcP, evmP, solP]);
    if (btc.status === "rejected") errors.push("btc balance unavailable");
    if (evm.status === "rejected") errors.push("evm balance unavailable");
    if (sol.status === "rejected") errors.push("sol balance unavailable");
    return {
      btc: btc.status === "fulfilled" ? btc.value : null,
      evm: evm.status === "fulfilled" ? evm.value : null,
      sol: sol.status === "fulfilled" ? sol.value : null,
      errors,
    };
  },
  lock: async (opts = {}) => {
    const ms = opts.timeoutMs ?? 1500;
    const [acct, keys] = await Promise.allSettled([withTimeout(nearViewAccount(SATCHEL_CONTRACT), ms, "view_account"), withTimeout(nearAccessKeys(SATCHEL_CONTRACT), ms, "keys")]);
    // A missing account is a definite "no" (not locked, nothing deployed); any other failure is "unknown" (null).
    const exists = acct.status === "fulfilled" ? true : isMissingAccountError(acct.reason) ? false : null;
    const keyCount = keys.status === "fulfilled" ? keys.value.keys.length : null;
    let code: string | null = null;
    if (acct.status === "fulfilled") {
      try {
        code = base58ToHex(acct.value.code_hash);
      } catch {
        code = null;
      }
    }
    const expected = EXPECTED_CODE_HASH;
    const key = typeof window === "undefined" ? process.env.FASTNEAR_API_KEY?.trim() || null : null;
    const h = historyClient({ apiKey: key, timeoutMs: Math.max(ms, 3000) });
    const [signer, oldest] = await Promise.allSettled([h.signerTxCount(SATCHEL_CONTRACT), h.oldestTx(SATCHEL_CONTRACT)]);
    const oldestTx = oldest.status === "fulfilled" ? oldest.value : null;
    // The MPC version and the birth tx's action list (§5.16 proof 1) are read side by side, each within `ms`; neither throws.
    const [mpcVersion, birth] = await Promise.all([
      withTimeout(nearView<string>("v1.signer-prod.testnet", "version", {}), ms, "mpc version").then(
        (v) => v ?? null,
        () => null,
      ),
      readBirthActions(historyClient({ apiKey: key, timeoutMs: ms }), SATCHEL_CONTRACT, oldestTx?.transaction_hash ?? null, ms),
    ]);
    return {
      access_keys: keyCount,
      account_exists: exists,
      locked: exists === false ? false : exists === true && keyCount === 0 ? true : exists === null || keyCount === null ? null : false,
      code_hash_hex: code,
      expected_code_hash: expected,
      code_matches: code && expected ? code === expected : CONTRACT_ROLE === "dev" ? null : false,
      birth_tx: oldestTx?.transaction_hash ?? null,
      birth_block: oldestTx?.tx_block_height ?? null,
      any_signer_tx_count: signer.status === "fulfilled" ? signer.value.count : null,
      oldest_tx: oldestTx?.transaction_hash ?? null,
      mpc_version: mpcVersion,
      birth_actions: birth.actions,
      birth_error: birth.error,
    };
  },
  accountExists: async (id) => {
    try {
      await nearViewAccount(id);
      return true;
    } catch {
      return false;
    }
  },
};

export function dataSource(): DataSource {
  return IS_FIXTURE ? fixtureSource : liveSource;
}

export type { SigRecordView };
