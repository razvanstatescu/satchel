import { NEAR_TX_API } from "@/lib/config";

/**
 * FastNEAR Transactions API (kb/50 §FastNEAR Transactions API; kb/90 §8.3). The canonical NEAR proof source:
 * non-archival RPC forgets txs after ≈ 1.5 days (R-08). Keyless today; the server adds the key if configured.
 */

export interface AccountTx {
  account_id: string;
  transaction_hash: string;
  tx_block_height: number;
  tx_block_timestamp: number | string;
  tx_index?: number;
  [flag: string]: unknown;
}

export interface AccountTxsResponse {
  account_txs: AccountTx[];
  resume_token?: string;
  txs_count?: number;
}

export interface AccountQuery {
  account_id: string;
  desc?: boolean;
  limit?: number;
  resume_token?: string;
  from_tx_block_height?: number;
  to_tx_block_height?: number;
  is_signer?: boolean;
  is_any_signer?: boolean;
  is_receiver?: boolean;
  is_event_log?: boolean;
  is_success?: boolean;
}

export interface FastnearTx {
  transaction: { hash: string; signer_id: string; receiver_id: string; actions: unknown[] };
  execution_outcome?: { block_height?: number };
  receipts: Array<{
    receipt: {
      receiver_id: string;
      predecessor_id?: string;
      receipt_id?: string;
      /** The receipt body: `{Action: {signer_id, actions, …}}` (or `{Data: …}`). Actions are `"CreateAccount"` or `{Kind: {…}}`. */
      receipt?: { Action?: { signer_id?: string; actions?: unknown[] } };
    };
    execution_outcome: { block_height: number; block_timestamp?: number | string; outcome: { logs: string[]; status: unknown } };
  }>;
}

export type Fetcher = typeof fetch;

export function historyClient(opts: { base?: string; apiKey?: string | null; fetchImpl?: Fetcher; timeoutMs?: number } = {}) {
  const base = (opts.base ?? NEAR_TX_API).replace(/\/$/, "");
  const f = opts.fetchImpl ?? fetch;
  const post = async <T>(path: string, body: unknown): Promise<T> => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 8000);
    try {
      const res = await f(base + path, {
        method: "POST",
        headers: { "content-type": "application/json", ...(opts.apiKey ? { authorization: `Bearer ${opts.apiKey}` } : {}) },
        body: JSON.stringify(body),
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`fastnear ${path} ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(t);
    }
  };

  return {
    account: (q: AccountQuery) => post<AccountTxsResponse>("/v0/account", q),

    /** ≤ 20 hashes per call (API limit), chunked. */
    transactions: async (hashes: string[]): Promise<FastnearTx[]> => {
      const out: FastnearTx[] = [];
      for (let i = 0; i < hashes.length; i += 20) {
        const r = await post<{ transactions: FastnearTx[] }>("/v0/transactions", { tx_hashes: hashes.slice(i, i + 20) });
        out.push(...(r.transactions ?? []));
      }
      return out;
    },

    /** Lock proofs (kb/90 §5.16 proofs 3 and 4). */
    signerTxCount: async (accountId: string) => {
      const r = await post<AccountTxsResponse>("/v0/account", { account_id: accountId, is_any_signer: true, limit: 1 });
      return { count: r.txs_count ?? r.account_txs.length, txs: r.account_txs };
    },
    oldestTx: async (accountId: string) => {
      const r = await post<AccountTxsResponse>("/v0/account", { account_id: accountId, desc: false, limit: 1 });
      return r.account_txs[0] ?? null;
    },

    /** Height → tx hash (records written in a callback can be ≈ 203 blocks after the tx; use a wide window). */
    txAtHeight: async (accountId: string, height: number, window = 300) => {
      const r = await post<AccountTxsResponse>("/v0/account", {
        account_id: accountId,
        from_tx_block_height: Math.max(0, height - window),
        to_tx_block_height: height + 1,
        desc: true,
        limit: 10,
      });
      return r.account_txs;
    },
  };
}

export type HistoryClient = ReturnType<typeof historyClient>;

/* ───────────── birth actions (kb/90 §5.16 proof 1) ───────────── */

/**
 * The contract account's creation, action by action, in the format of `FIXTURE_LOCK.birth_actions` (fixtures.ts), served
 * in `/api/contract` as a read-only proof that no key was added: `CreateAccount` · `Transfer` · `DeployContract` ·
 * `FunctionCall <method>` · `FunctionCall nft_mint #<token id>` (plain `FunctionCall nft_mint` when the id can't be read) ·
 * `AddKey <public key>` · `DeleteKey <public key>` · any other action by its kind (`Stake`, `UseGlobalContract`, …).
 * `error` is null once read; otherwise `actions` is `[]` and `error` says why (an empty list means "unread", never
 * "no key added").
 */
export interface BirthRead {
  actions: string[];
  error: string | null;
}

type TxReceipt = FastnearTx["receipts"][number];
type ParsedAction = { kind: string; body: Record<string, unknown> };

/** `"CreateAccount"` or `{Kind: {…}}` (nearcore's action view) → its kind and body; null for any other shape. */
function parseAction(a: unknown): ParsedAction | null {
  if (typeof a === "string") return /^[A-Z]\w*$/.test(a) ? { kind: a, body: {} } : null;
  if (!a || typeof a !== "object" || Array.isArray(a)) return null;
  const keys = Object.keys(a);
  if (keys.length !== 1 || !/^[A-Z]\w*$/.test(keys[0])) return null;
  const body = (a as Record<string, unknown>)[keys[0]];
  return { kind: keys[0], body: body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {} };
}

/** FunctionCall args (base64) → JSON value; undefined for anything else (borsh, binary, bad base64). Browser-safe (no Buffer). */
function base64Json(s: unknown): unknown {
  if (typeof s !== "string") return undefined;
  try {
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return undefined;
  }
}

const isMint = (p: ParsedAction) => p.kind === "FunctionCall" && p.body.method_name === "nft_mint";

function argTokenId(p: ParsedAction): string | null {
  const args = base64Json(p.body.args);
  const id = args && typeof args === "object" ? (args as Record<string, unknown>).token_id : undefined;
  if (typeof id === "string") return id || null;
  return typeof id === "number" && Number.isSafeInteger(id) && id >= 0 ? String(id) : null;
}

/** Token ids of the NEP-171 `nft_mint` events in a receipt's logs, in log order (Satchel's `nft_mint` logs one per call). */
function mintedIds(logs: unknown): string[] {
  const ids: string[] = [];
  for (const log of Array.isArray(logs) ? logs : []) {
    if (typeof log !== "string" || !log.startsWith("EVENT_JSON:")) continue;
    let ev: { standard?: unknown; event?: unknown; data?: unknown } | null;
    try {
      ev = JSON.parse(log.slice(11));
    } catch {
      continue;
    }
    if (ev?.standard !== "nep171" || ev.event !== "nft_mint") continue;
    for (const d of Array.isArray(ev.data) ? ev.data : [ev.data]) {
      const t = (d as { token_ids?: unknown } | null)?.token_ids;
      if (Array.isArray(t)) ids.push(...t.filter((x): x is string => typeof x === "string"));
    }
  }
  return ids;
}

function actionLabel(p: ParsedAction, mintId: string | null = null): string {
  if (p.kind === "FunctionCall") {
    const m = p.body.method_name;
    if (typeof m !== "string" || !m) return "FunctionCall";
    return m === "nft_mint" && mintId !== null ? `FunctionCall nft_mint #${mintId}` : `FunctionCall ${m}`;
  }
  if ((p.kind === "AddKey" || p.kind === "DeleteKey") && typeof p.body.public_key === "string") return `${p.kind} ${p.body.public_key}`;
  return p.kind;
}

function succeeded(r: TxReceipt): boolean {
  const st = r.execution_outcome?.outcome?.status;
  return !!st && typeof st === "object" && ("SuccessValue" in st || "SuccessReceiptId" in st);
}

/**
 * Pure: the birth of `accountId` in transaction `tx` (FastNEAR `/v0/transactions` shape). The receipt that runs
 * `CreateAccount` on the account carries the batch: for a direct batch (kb/90 §5.16) its actions ARE the transaction's
 * action list, and a factory or relayer birth puts them in a child receipt. It must have succeeded (a reverted attempt
 * created nothing). An `AddKey` that another receipt of the same transaction applied to the account is appended, so "no
 * AddKey" covers the whole transaction. Mint ids come from the `nft_mint` args (`token_id`) or, for Satchel's
 * `nft_mint {receiver_id}`, from the receipt's NEP-171 `nft_mint` events when they pair one-to-one with the calls.
 */
export function birthActions(tx: FastnearTx | null | undefined, accountId: string): BirthRead {
  const unread = (error: string): BirthRead => ({ actions: [], error });
  if (!tx || !Array.isArray(tx.receipts)) return unread("transaction not found");
  const onAccount: { r: TxReceipt; ps: ParsedAction[] }[] = [];
  for (const r of tx.receipts) {
    const acts = r?.receipt?.receiver_id === accountId ? r.receipt.receipt?.Action?.actions : undefined;
    if (!Array.isArray(acts)) continue;
    const ps = acts.map(parseAction);
    // One unreadable action could be an AddKey: never return a partial list.
    if (ps.some((p) => p === null)) return unread("unexpected action shape");
    onAccount.push({ r, ps: ps as ParsedAction[] });
  }
  const birth = onAccount.find((x) => x.ps.some((p) => p.kind === "CreateAccount"));
  if (!birth) return unread("not the account's creation");
  if (!succeeded(birth.r)) return unread("creation failed");
  const mints = birth.ps.filter(isMint).length;
  const logged = mintedIds(birth.r.execution_outcome?.outcome?.logs);
  let k = -1;
  const actions = birth.ps.map((p) => {
    if (!isMint(p)) return actionLabel(p);
    k += 1;
    return actionLabel(p, argTokenId(p) ?? (logged.length === mints ? logged[k] : null));
  });
  for (const x of onAccount) {
    if (x !== birth && succeeded(x.r)) actions.push(...x.ps.filter((p) => p.kind === "AddKey").map((p) => actionLabel(p)));
  }
  return { actions, error: null };
}

/**
 * Reads the birth transaction from the FastNEAR tx API and maps it (`birthActions`). Never throws and settles within
 * `timeoutMs` (the SSR budget, kb/90 §8.1) even if the request hangs: any failure is `[]` plus the reason.
 */
export async function readBirthActions(client: Pick<HistoryClient, "transactions">, accountId: string, txHash: string | null, timeoutMs = 1500): Promise<BirthRead> {
  if (!txHash) return { actions: [], error: "no birth transaction" };
  const timedOut: BirthRead = { actions: [], error: "timed out" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<BirthRead>((resolve) => {
    timer = setTimeout(() => resolve(timedOut), timeoutMs);
  });
  const read = Promise.resolve()
    .then(() => client.transactions([txHash]))
    .then((txs) => birthActions(txs.find((t) => t?.transaction?.hash === txHash), accountId))
    .catch((e: unknown): BirthRead => {
      if ((e as { name?: unknown } | null)?.name === "AbortError") return timedOut;
      return { actions: [], error: e instanceof Error && e.message.startsWith("fastnear ") ? e.message : "transaction API error" };
    });
  try {
    return await Promise.race([read, late]);
  } finally {
    clearTimeout(timer);
  }
}

export interface SatchelEvent {
  tx: string;
  block: number;
  timestampMs: number | null;
  standard: string;
  event: string;
  data: Record<string, unknown>;
}

/** Every NEP-297 event emitted BY `contractId` in these txs (successful receipts only, in receipt order). */
export function contractEvents(txs: FastnearTx[], contractId: string): SatchelEvent[] {
  const out: SatchelEvent[] = [];
  for (const t of txs) {
    for (const r of t.receipts ?? []) {
      if (r.receipt.receiver_id !== contractId) continue;
      const st = r.execution_outcome.outcome.status as Record<string, unknown> | undefined;
      if (st && typeof st === "object" && "Failure" in st) continue; // indexers trust events only from successful receipts (§5.13)
      for (const log of r.execution_outcome.outcome.logs ?? []) {
        if (!log.startsWith("EVENT_JSON:")) continue;
        let ev: { standard: string; event: string; data: unknown };
        try {
          ev = JSON.parse(log.slice(11));
        } catch {
          continue;
        }
        const ts = r.execution_outcome.block_timestamp;
        const rows = (Array.isArray(ev.data) ? ev.data : [ev.data]) as Record<string, unknown>[];
        for (const d of rows) {
          if (!d || typeof d !== "object") continue;
          out.push({
            tx: t.transaction.hash,
            block: r.execution_outcome.block_height,
            timestampMs: ts == null ? null : Math.floor(Number(ts) / 1e6),
            standard: ev.standard,
            event: ev.event,
            data: d,
          });
        }
      }
    }
  }
  return out;
}

/** NEP-297 events emitted BY the contract that mention `tokenId` (newest first by tx). */
export function eventsForToken(txs: FastnearTx[], contractId: string, tokenId: string): SatchelEvent[] {
  return contractEvents(txs, contractId).filter((e) => e.data.token_id === tokenId || ((e.data.token_ids as string[] | undefined) ?? []).includes(tokenId));
}

export async function satchelEvents(contractId: string, tokenId: string, opts: { limit?: number; client?: ReturnType<typeof historyClient> } = {}) {
  const c = opts.client ?? historyClient();
  const { account_txs } = await c.account({ account_id: contractId, desc: true, limit: opts.limit ?? 60, is_success: true });
  const txs = await c.transactions(account_txs.map((t) => t.transaction_hash));
  return eventsForToken(txs, contractId, tokenId);
}
