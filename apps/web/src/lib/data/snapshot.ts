import { isNoCode } from "@/lib/data/source";
import { CONTRACT_ROLE, DATA_MODE, EXPLORERS, SATCHEL_CONTRACT, SOL_SEND_ENABLED } from "@/lib/config";
import type { DataSource } from "@/lib/data/source";
import type { LockFacts, SatchelSnapshot } from "@/lib/data/types";
import { satchelAddresses } from "@/lib/derive";
import { contractViews, deriveStatus } from "@/lib/near/contract";
import { withTimeout } from "@/lib/near/rpc";
import type { ConfigView, SigRecordView } from "@/lib/near/types";

/** Builds the kb/90 §9 snapshot from a data source. Shared by the cached server read and the fixture client refresh. */

export const UPSTREAM_MS = 1500;

export function isTokenId(id: string): boolean {
  return /^[1-9]\d{0,9}$/.test(id);
}

async function bounded<T>(p: Promise<T>, label: string, errors: string[], fallback: T, ms = UPSTREAM_MS): Promise<T> {
  try {
    return await withTimeout(p, ms, label);
  } catch (e) {
    errors.push(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    return fallback;
  }
}

export async function buildSnapshot(id: string, src: DataSource, deps: { config: ConfigView | null; lock: LockFacts }, now: number): Promise<SatchelSnapshot | null> {
  if (!isTokenId(id)) return null;
  const views = contractViews(src.view);
  const errors: string[] = [];
  const addr = satchelAddresses(id);

  const [token, satchel, height] = await Promise.all([
    bounded(views.nftToken(id), "nft_token", errors, undefined),
    bounded(views.satchel(id), "satchel", errors, undefined),
    bounded(src.blockHeight(), "block", errors, null as number | null),
  ]);
  // Both views answered null: the token doesn't exist (404). `undefined` means "couldn't read" (render degraded).
  if (token === null && satchel === null) return null;
  // Neither view could be read AND the contract account is missing or has no code: there is no Satchel here (404),
  // not a degraded "Active · 0 signatures" page. A plain RPC outage (account state unknown) still renders degraded.
  if (token === undefined && satchel === undefined && (deps.lock.account_exists === false || isNoCode(deps.lock.code_hash_hex ?? null))) return null;

  const balances = await src.balances({ btc: addr.btc, evm: addr.evm, sol: addr.sol }, id, { timeoutMs: UPSTREAM_MS, includeSol: SOL_SEND_ENABLED });
  errors.push(...balances.errors);

  const sigCount = satchel?.sig_count ?? 0;
  let recent: SigRecordView[] = [];
  if (sigCount > 0) recent = await bounded(views.sigRecords(id, Math.max(0, sigCount - 20), 20), "sig_records", errors, [] as SigRecordView[]);
  const last = recent.length ? recent[recent.length - 1] : null;

  const cooldown = deps.config?.cooldown_blocks ?? 250;
  const status = satchel ? deriveStatus({ satchel, records: recent, height, cooldownBlocks: cooldown }) : "active";
  const issued = token?.metadata?.issued_at;

  return {
    token_id: id,
    contract: SATCHEL_CONTRACT,
    role: CONTRACT_ROLE,
    data_mode: DATA_MODE,
    owner: token?.owner_id ?? satchel?.owner_id ?? "unavailable",
    status,
    listing: satchel?.listing ?? null,
    sig_count: sigCount,
    last_sign_height: satchel?.last_sign_height ?? 0,
    listable_at: satchel?.listable_at ?? 0,
    addresses: { btc: addr.btc, evm: addr.evm, sol: addr.sol },
    paths: addr.paths,
    balances: { btc: balances.btc, evm: balances.evm, sol: balances.sol },
    as_of: now,
    links: {
      nearblocks_token: EXPLORERS.nearAccount(SATCHEL_CONTRACT),
      btc: EXPLORERS.btcAddress(addr.btc),
      evm: EXPLORERS.evmAddress(addr.evm),
      sol: EXPLORERS.solAddress(addr.sol),
      contract_facts: "/contract",
    },
    quiet_period_blocks: cooldown,
    height,
    minted_at: issued != null && !Number.isNaN(Number(issued)) ? Number(issued) : null,
    last_signature: last ? { seq: last.seq, chain: last.chain, height: last.height, timestamp_ms: last.timestamp_ms, status: last.status, url: null } : null,
    lock: {
      access_keys: deps.lock.access_keys,
      account_exists: deps.lock.account_exists,
      locked: deps.lock.locked,
      code_hash_hex: deps.lock.code_hash_hex,
      expected_code_hash: deps.lock.expected_code_hash,
      code_matches: deps.lock.code_matches,
      birth_tx: deps.lock.birth_tx,
      birth_block: deps.lock.birth_block,
    },
    errors,
  };
}
