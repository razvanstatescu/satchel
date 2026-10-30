import { cacheLife } from "next/cache";
import { IS_FIXTURE, SATCHEL_CONTRACT, SOL_RPCS, SOL_UI_ENABLED } from "@/lib/config";
import { BLOCKSCOUT, mergeTxs, parseBlockscout, parseInside, parseMempool, parseSolana, type ChainTx, type TxPage, type TxSourceKey, type TxSourceRead } from "@/lib/chain-txs";
import { fixtureTxs } from "@/lib/data/fixture-txs";
import { isTokenId } from "@/lib/data/snapshot";
import { satchelAddresses } from "@/lib/derive";
import { satchelEvents } from "@/lib/near/history";
import { withTimeout } from "@/lib/near/rpc";
import { BTC_APIS } from "@/lib/config";

/**
 * The Transactions tab's server read (lib/chain-txs.ts): every keyless source at once, each bounded on its own, so one
 * slow or failing chain never hides the others (it is reported as unread instead). Cached 30 s, which also keeps the
 * Solana devnet RPC under its per-IP method limit. Server-rendered: the tab has no loading state.
 */

const SOURCE_MS = 4000;

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(SOURCE_MS), cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function readBitcoin(address: string): Promise<ChainTx[]> {
  return parseMempool(await getJson(`${BTC_APIS[0]}/address/${address}/txs`), address);
}

async function readEvm(chainId: number, address: string): Promise<ChainTx[]> {
  const base = `${BLOCKSCOUT[chainId]}/api/v2/addresses/${address}`;
  const [txs, transfers] = await Promise.all([getJson(`${base}/transactions`), getJson(`${base}/token-transfers?type=ERC-20`)]);
  return parseBlockscout(chainId, txs, transfers, address);
}

async function readSolana(address: string): Promise<ChainTx[]> {
  const rpc = SOL_RPCS[0];
  const post = (body: unknown) => getJson(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const sigs = (await post({ jsonrpc: "2.0", id: 1, method: "getSignaturesForAddress", params: [address, { limit: 15 }] })) as { result?: { signature: string }[] };
  const list = sigs.result ?? [];
  if (!list.length) return [];
  // one batched request for every transaction (one call against the method limit, not fifteen)
  const batch = (await post(list.map((s, i) => ({ jsonrpc: "2.0", id: i, method: "getTransaction", params: [s.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }] })))) as { result?: unknown }[];
  return parseSolana(Array.isArray(batch) ? batch.map((b) => b.result) : [], address);
}

async function readInside(tokenId: string): Promise<ChainTx[]> {
  const { historyClient } = await import("@/lib/near/history");
  const key = process.env.FASTNEAR_API_KEY?.trim() || null;
  const evs = await satchelEvents(SATCHEL_CONTRACT, tokenId, { client: historyClient({ apiKey: key, timeoutMs: 3000 }), limit: 60 });
  return parseInside(evs);
}

export async function getTransactions(id: string): Promise<TxPage | null> {
  "use cache";
  cacheLife({ revalidate: 30, expire: 3600 });
  if (!isTokenId(id)) return null;
  if (IS_FIXTURE) return fixtureTxs(id);
  const a = satchelAddresses(id);
  const jobs: [TxSourceKey, () => Promise<ChainTx[]>][] = [
    ["bitcoin", () => readBitcoin(a.btc)],
    ["sepolia", () => readEvm(11155111, a.evm)],
    ["base", () => readEvm(84532, a.evm)],
    ["optimism", () => readEvm(11155420, a.evm)],
    ...(SOL_UI_ENABLED ? ([["solana", () => readSolana(a.sol)]] as [TxSourceKey, () => Promise<ChainTx[]>][]) : []),
    ["near", () => readInside(id)],
  ];
  const results = await Promise.all(
    jobs.map(async ([key, run]): Promise<{ read: TxSourceRead; txs: ChainTx[] }> => {
      try {
        return { read: { key, ok: true }, txs: await withTimeout(run(), SOURCE_MS + 500, key) };
      } catch {
        return { read: { key, ok: false }, txs: [] };
      }
    }),
  );
  return { txs: mergeTxs(results.map((r) => r.txs)), sources: results.map((r) => r.read), as_of: Date.now() };
}
