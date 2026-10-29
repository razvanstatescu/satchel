# 50 · Data plumbing: NEAR events and indexing, per-chain balances and history, prices, hosting

> Owner: pay · Checked: 2026-10-21 (11:20–12:30 UTC) · Confidence: high for API behaviour and shapes (live-tested today); medium for rate limits (unpublished and measured from one IP shared by 9 research agents); low for anything marked [ASSUMED]
> Primary sources: live calls (commands and raw output in `research/spikes/pay/RESULTS.md` and `research/spikes/pay/raw/`); FastNEAR OpenAPI specs `docs.fastnear.com/openapi/{transactions,fastnear,neardata}.json` (v3.0.3, snapshots in `research/spikes/pay/vendor/fastnear-docs/`) and `docs.fastnear.com/llms-full.txt`; nearblocks `https://api.nearblocks.io/openapi.json` (147 `/v3` paths) and `nearblocks.io/apis` pricing; Intear `docs.intear.tech/llms.txt` + `/api/llms-full.txt`; `near/near-lake-framework-rs` README @ `e611fc8`; Vercel `docs/cron-jobs/usage-and-pricing` (last_updated 2026-07-15); `neon.com/pricing`; GitHub Docs "Events that trigger workflows"; CoinGecko `docs/errors-and-rate-limits.md`, `demo/reference/authentication.md`; Etherscan `docs.etherscan.io/resources/rate-limits` and `/supported-chains`; npm registry.
> Related KB: RPC providers and wallet tx lifecycle are owned by `web` (`41-web-stack.md`, `40-frontend-wallet.md`); mempool.space details by `btc` (`30-bitcoin-testnet4.md`); Sepolia/Solana tx building by `chains` (`31-evm-sepolia.md`, `32-solana-devnet.md`); clean-history rules by `sec` (`70-security-and-clean-history.md`); USDC, buy flow and 1Click are in `51-1click-and-usdc.md`.

## TL;DR — what an implementer must know

1. **The MVP needs no indexer, no Postgres and no worker.** Put everything the UI must trust in contract state, read it with view calls, and fetch per-chain balances/history live (browser or a cached Next.js route handler). The plan's B5 "Indexer worker → Postgres" box and B5 data model can be dropped for Phase 1 and most of Phase 2. **[VERIFIED]** that every data source below is callable keyless from a browser (CORS) today.
2. **For NEAR-side history use the FastNEAR Transactions API** (`https://tx.test.fastnear.com`, mainnet `tx.main.fastnear.com`): live at the chain head, keyless today, CORS-enabled, and it showed my txs **0.4–3.9 s after FINAL** (two runs). `POST /v0/account` lists txs touching an account (filters: `is_receiver`, `is_event_log`, block range, `desc`); `POST /v0/transactions` (≤ 20 hashes) returns every receipt with its **logs**, so NEP-297 events, including custom ones, are readable. **[VERIFIED]**
3. **nearblocks: use `/v3` only.** The legacy **`/v1` testnet API is frozen at block 270,420,307 (2026-09-27 03:13 UTC)** while `/v1/sync/status` still claims "sync: true"; `/v3` is current. The free tier is **6 calls/min, 333/day, 10,000/month, attribution required**, so it is a proof-link explorer, not a backend. Its testnet tx page `testnet.nearblocks.io/txns/<hash>` rendered a tx that was a few minutes old, while the v1 API never showed it, so README links are fine. **[VERIFIED]**
4. **Do not build a block-following indexer in 14 days.** neardata.xyz free = **30 blocks/min** (HTTP 429) vs **~105 blocks/min** produced on testnet (0.57 s blocks). Plain RPC `chunk` has no logs, non-archival nodes keep only **~200–250k blocks (~32–40 h)**, and FastNEAR RPC 429s at bursts. NEAR Lake needs a paid AWS requester-pays account. Intear's events API is retired (its replacement is fungible-token-only). **[VERIFIED]** (Lake: [SOURCED])
5. **Never trust indexer "holdings" for ownership.** FastNEAR's NFT index listed a 783-byte WAT contract with no `nft_metadata` as an NFT contract of `seller.*` within 0.6–0.9 s, purely from one fake `nft_transfer` log. Ownership and listings come only from `nft_token` / `nft_tokens_for_owner` / our own views. **[VERIFIED]**
6. **Per-chain balances/history, all browser-callable:** BTC testnet4 → mempool.space (`*`, simple GETs only: its preflight returns 404, per `30`); Sepolia → `ethereum-sepolia-rpc.publicnode.com` (or Tenderly/dRPC/1rpc) for `eth_getBalance`/`eth_getTransactionCount`, and **Blockscout `eth-sepolia.blockscout.com/api/v2`** for history (keyless, `x-ratelimit-limit: 180`); Solana devnet → `api.devnet.solana.com` (`getSignaturesForAddress` has a **method limit of 10** vs 150 for `getBalance`). `rpc.sepolia.org` is dead (522). **Etherscan v2 needs a key** (free tier includes Sepolia, 3 calls/s, 100k/day), so it is server-only and unnecessary. **[VERIFIED]**
7. **Prices:** primary = **1Click `GET /v0/tokens`** (keyless, CORS `*`, `x-ratelimit-limit-unauth: 1200`/60 s, one call gives BTC/ETH/SOL/NEAR/USDC); fallback = CoinGecko keyless `/simple/price` (IP-shared limits; Demo key 100 calls/min); third = Coinbase. **Pyth Hermes now returns 401 without a key** (since the 2026-08-26 Pyth Core upgrade). Avoid Binance: Binance.US returned 451 here **[VERIFIED]**, and Binance.com probably blocks US-hosted functions **[ASSUMED]**. Display "≈ $X at mainnet prices" only, per `ux`. **[VERIFIED]** for the measured endpoints; the Demo-key limit and the Pyth cutover date are **[SOURCED]**
8. **Vercel Cron on Hobby runs at most once per day (±59 min).** Pro allows once per minute. GitHub Actions `schedule` is ≥ 5 min and best-effort. So "one worker" in the plan means a Pro plan or a third-party host. Avoid needing one. **[SOURCED]**
9. **If a DB becomes necessary (P2 pending-tx relay or market cache):** Neon Free via the Vercel Marketplace (1 GB/project, 100 CU-hours/project/month, autosuspend after 5 min, 6 h PITR) with `drizzle-orm@0.45.4` + `@neondatabase/serverless@1.2.0`. If you use Prisma, **pin `prisma@7.10.1`**: npm's `latest` tag for the `prisma` CLI points to **`8.0.0-rc.24` (published today)** while `@prisma/client` latest is 7.10.1. Versions **[VERIFIED]** (npm); Neon limits **[SOURCED]**
10. **Activity timeline recipe:** contract state gives `block_height` per event; FastNEAR `/v0/account {account_id: <satchel>, from_tx_block_height, to_tx_block_height}` turns a height into the tx hash for explorer links (verified exact match); per-chain explorers give the chain-side rows. No server state.

## Verified facts & measurements

### Indexing options evaluated (testnet, 2026-10-21)

| Option | What I ran | Result | Fit for Satchel |
|---|---|---|---|
| (a) On-chain state + views | `call_function` views on several contracts via FastNEAR/dRPC RPC | Works; one RPC call per view; strongly consistent at `final` | **Primary source of truth** (ownership, listing, sig log, pending signs) |
| (b) nearblocks **v1** | `/v1/account/v1.signer-prod.testnet/receipts`, `/v1/blocks/latest`, `/v1/txns/<fresh hash>` | Newest data at block **270,420,307** (2026-09-27T03:13:30Z); fresh tx → `{"txns":[]}`; `/v1/sync/status` says base indexer at 274,088,815 "sync": true (misleading) | **Do not use** |
| (b) nearblocks **v3** | `/v3/txns/latest`, `/v3/txns/<hash>`, `/v3/txns/<hash>/receipts`, `/v3/accounts/<id>/txns`, `/v3/nfts/txns` | Current (latest NFT event at block 274,093,417; my tx indexed within ~5 min, earlier checks not run); `receipts` include `outcome.logs` (custom `signature_issued` visible); my fake `nft_transfer` was **not** indexed in `nft-txns` after 15 min (emitter has no `nft_metadata`); CORS `*` | Optional, server-side and cached only (6 calls/min free). Per-token NFT history exists at `/v3/nfts/{contract}/tokens/{token}/txns` [SOURCED openapi] |
| (c) FastNEAR **Transactions API** | `/v0/account`, `/v0/transactions`, block-range query | Head-current (2.3M txs for the signer); full receipts + logs; `is_event_log` worked for an account named inside an event; visible **0.4–3.9 s** after FINAL; CORS reflects Origin and preflight allows `content-type, authorization` | **Recommended for NEAR history/tx hashes** |
| (c) FastNEAR **API** (`test.api.fastnear.com`) | `/v1/account/{id}/full`, `/nft`, `/ft`, `/status` | `/status` sync latency 2.2 s; NFT index event-driven and unvalidated (see TL;DR 5); FT index stayed empty for a token whose `mint` emits no event | Not needed (use our own views) |
| (c) FastNEAR **NEAR Data** (`testnet.neardata.xyz`) | `/v0/last_block/final` (302 → `/v0/block/{h}`), scan of 300 blocks | 24 KB/block JSON with `receipt_execution_outcomes` (logs) per shard; **429 "rate-limit exceeded of 30 blocks per minute"** after ~6 blocks | Only with a paid plan; not needed |
| (d) Plain JSON-RPC | `block` → `chunk` scan, `EXPERIMENTAL_tx_status`, `EXPERIMENTAL_changes`, GC depth | Chunk scan finds receipts/methods but **no logs** (`chunk` keys: author, header, receipts, transactions); logs need a per-tx status call; `block` H-200,000 OK, H-250,000 `UNKNOWN_BLOCK`; FastNEAR RPC 429 after ~130 calls in 2.7 s | Fine for views and tx status; not an indexer |
| (d) Archival RPC | `block` 270,420,307 and 200,000,000 | `archival-rpc.testnet.fastnear.com` 0.12–0.20 s; `archival-rpc.testnet.near.org` ~3.1 s | Only for old tx lookups |
| (e) NEAR Lake | not run (AWS requester-pays = real money) | README: "approximately $20 per month … for the reading of fresh blocks" at 1 block/s and 5 GETs/block (2023 estimate) | **No** (cost, AWS account, always-on process) |
| (f) Intear Events API | `events-v3.intear.tech` → Cloudflare 521; docs | Replaced by Intear API (`api.intea.rs`), which is FT-only: "The Events API's other events, like the NFT … ones, have no counterpart" | **No** for events; OK as a NEAR/USDC price source |

### Indexer latency (two runs, my own event-emitting tx; polls every 3 s)

| Check | Run 1 `GUv6yR2D…v2rc` | Run 2 `ADFzVr5o…RN2a` |
|---|---|---|
| `send_tx` → FINAL | 3,664 ms | 3,218 ms |
| FastNEAR tx API, receiver | +435 ms | +3,857 ms (first poll missed) |
| FastNEAR tx API, `is_event_log` (account in event data) | +682 ms | +515 ms |
| FastNEAR NFT holdings index | +924 ms | +636 ms |
| nearblocks v1 `/v1/txns/{hash}` | not visible in 240 s | — |

### Chain timing
- Testnet: **0.554 s** (last 1k blocks), **0.568 s** (10k), **0.573 s** (100k), so ~105 blocks/min, and the 210-block cooldown is about 2.0 min. Mainnet: **0.602 s / 0.609 s**, about 2.1 min. **[VERIFIED]** (RPC header timestamps)
- A `sign` request on `v1.signer-prod.testnet` by `tx-bench.testnet` was answered 6 blocks later (`sign` at 274,088,823, `return_signature_and_clean_state_on_success` at 274,088,829). That is one data point for the `mpc` agent, not a latency study. **[VERIFIED]**

### Per-chain endpoints (Origin `https://satchel-test.vercel.app`)

| Chain / use | Endpoint | Result | CORS / limits |
|---|---|---|---|
| BTC testnet4 balance | `GET https://mempool.space/testnet4/api/address/{addr}` | 200, `chain_stats`/`mempool_stats` | `*` on GET; **preflight `OPTIONS` → 404**, so browsers can only make simple requests (no JSON content-type, no custom headers) **[SOURCED]** `30` |
| BTC history | `GET …/address/{addr}/txs` (newest first, 50); more via `/txs/chain/{last_seen_txid}` (pages of 25) **[SOURCED]** `30-bitcoin-testnet4.md` | 200 | `*` |
| BTC UTXOs | `GET …/address/{addr}/utxo` | 200 | `*` |
| BTC spent check (clean history) | `GET …/tx/{txid}/outspends` | 200 `[{"spent":false}]` | `*` |
| Sepolia balance / nonce | `eth_getBalance`, `eth_getTransactionCount` on `https://ethereum-sepolia-rpc.publicnode.com` | 200, 74 ms | `*`, preflight 204 |
| Sepolia RPC alternates | `sepolia.drpc.org` (echo), `1rpc.io/sepolia` (`*`), `sepolia.gateway.tenderly.co` (`*`) | 200 | preflight OK |
| Sepolia RPC dead | `rpc.sepolia.org` | **522** after 19.6 s | — |
| Sepolia history | `GET https://eth-sepolia.blockscout.com/api/v2/addresses/{a}/transactions` | 200, 50 items + `next_page_params` | `*`, `x-ratelimit-limit: 180` (+ `x-ratelimit-reset` in ms) |
| Sepolia history (Etherscan-compatible) | `GET https://eth-sepolia.blockscout.com/api?module=account&action=txlist&address=…` | 200 | `*`, `x-ratelimit-limit: 10` |
| Etherscan v2 | `GET https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist…` no key | `{"status":"0","message":"NOTOK","result":"Missing/Invalid API Key"}` | key required |
| Solana devnet balance | `getBalance` on `https://api.devnet.solana.com` | 200 (`apiVersion 4.4.0-beta.1`) | Origin echoed; `x-ratelimit-method-limit: 150`, `rps-limit: 250`, `conn-limit: 40`, `tier: free` |
| Solana history | `getSignaturesForAddress` | 200 | **`x-ratelimit-method-limit: 10`** |
| Solana blockhash expiry (clean history) | `getLatestBlockhash` → `isBlockhashValid` | 200 `value: true` | as above |

### Prices (mainnet, 11:46–11:48 UTC)

| Source | Keyless? | CORS | Sample | Notes |
|---|---|---|---|---|
| 1Click `GET https://1click.chaindefuser.com/v0/tokens` | yes | `*` | BTC 83384, ETH 2461.91, SOL 106.71, wNEAR 5.16, USDC 0.999441 | `x-ratelimit-limit-unauth: 1200`, reset 60 s; `priceUpdatedAt` per row |
| CoinGecko `/api/v3/simple/price` | yes | `*` | BTC 83367, ETH 2460.5, SOL 106.65, NEAR 5.17 | Keyless = IP-based, shared; Demo key: 100 calls/min, header `x-cg-demo-api-key` [SOURCED] |
| Coinbase `/v2/prices/BTC-USD/spot`, `api.exchange.coinbase.com/products/NEAR-USD/ticker` | yes | `*` | 83354.115; 5.1745 | one pair per call |
| Kraken `/0/public/Ticker?pair=XBTUSD,ETHUSD,SOLUSD,NEARUSD` | yes | Origin echoed | ok | odd pair names (`XXBTZUSD`, `XETHZUSD`) |
| Intear `POST https://api.intea.rs/tokens` | yes | `*` | wNEAR 5.1896, USDC 1.0017 | NEAR-FT only (no BTC/ETH/SOL) |
| Binance.com / Binance.US | yes | `*` | .com ok from EU; **.US 451** "restricted location" | expect .com 451 from US regions [ASSUMED] |
| Pyth Hermes `/v2/updates/price/latest` | **no** | — | **401 `unauthorized`** | key required since 2026-08-26 [SOURCED: docs.pyth.network "Completing the Pyth Core upgrade"] |

### Hosting limits
- Vercel Cron: Hobby 100 jobs, **once per day**, precision "Per-hour (±59 min)"; Pro/Enterprise once per minute. Quote: "Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day." **[SOURCED]** vercel.com/docs/cron-jobs/usage-and-pricing (last_updated 2026-07-15)
- GitHub Actions `schedule`: "The shortest interval you can run scheduled workflows is once every 5 minutes"; "can be delayed during periods of high loads … some queued jobs may be dropped"; public repos disable schedules after 60 days without activity. **[SOURCED]**
- Neon Free: "1 GB/project", "100 CU-hours/project", 100 projects, 10 branches, autosuspend "After 5 min, cannot be turned off", 5 GB egress, 6 h history. Available in the Vercel Marketplace ("Plans starting at $0"). **[SOURCED]** neon.com/pricing, vercel.com/marketplace/neon

## Reference — exact APIs, types, commands, tested snippets

### FastNEAR Transactions API (OpenAPI 3.0.3; servers `https://tx.main.fastnear.com`, `https://tx.test.fastnear.com`)
- `POST /v0/account` body `AccountInput`: `account_id` (required), `desc` (newest first if true), `limit` 1–200, `resume_token` (opaque, reuse exactly), `from_tx_block_height` (inclusive), `to_tx_block_height` (exclusive), and boolean filters `is_signer`, `is_delegated_signer`, `is_real_signer`, `is_any_signer`, `is_predecessor`, `is_explicit_refund_to`, `is_receiver`, `is_real_receiver`, `is_function_call`, `is_action_arg`, `is_event_log`, `is_success`. Response: `{account_txs: [{account_id, transaction_hash, tx_block_height, tx_block_timestamp, tx_index, is_*…}], resume_token?, txs_count}`.
- `POST /v0/transactions` body `{"tx_hashes": [...]}`, **max 20** (error: `{"error":"Bad request","message":"Too many transactions requested. Limit is 20"}`). Response: `{transactions: [{transaction, execution_outcome, receipts: [{receipt, execution_outcome: {block_height, outcome: {logs, status, …}}}], data_receipts}]}`.
- Also `POST /v0/receipt {receipt_id}`, `/v0/block {block_id, with_receipts, with_transactions}`, `/v0/blocks {from_block_height, to_block_height, limit, desc}`.
- Auth (for when we have a key): `Authorization: Bearer $FASTNEAR_API_KEY` or `?apiKey=`. Browser keys restricted to our domain are a paid feature (see `41-web-stack.md`). **[SOURCED]**

Snippet: NEAR-side activity for one token. It works keyless from the browser; on the server, add the key and cache 15 s. **[VERIFIED]**: run as plain JS by `research/spikes/pay/snippets_check.mjs`, it returned the 4 events (2× `nep171 nft_transfer`, 2× `satchel signature_issued`) from my two emit txs.
```ts
// Activity rows for Satchel token `id` from the contract's own NEP-297 events.
const TX = 'https://tx.test.fastnear.com';
const post = (path: string, body: unknown) =>
  fetch(TX + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => { if (!r.ok) throw new Error(`fastnear ${r.status}`); return r.json(); });

export async function satchelEvents(contract: string, id: string, limit = 60) {
  const { account_txs } = await post('/v0/account', { account_id: contract, desc: true, limit, is_success: true });
  const hashes: string[] = account_txs.map((t: any) => t.transaction_hash);
  const out: any[] = [];
  for (let i = 0; i < hashes.length; i += 20) {                       // API limit: 20 hashes per call
    const { transactions } = await post('/v0/transactions', { tx_hashes: hashes.slice(i, i + 20) });
    for (const t of transactions) for (const r of t.receipts) {
      if (r.receipt.receiver_id !== contract) continue;              // only logs emitted BY our contract
      for (const log of r.execution_outcome.outcome.logs as string[]) {
        if (!log.startsWith('EVENT_JSON:')) continue;
        const ev = JSON.parse(log.slice(11));                        // {standard, version, event, data}
        const rows = Array.isArray(ev.data) ? ev.data : [ev.data];
        if (rows.some((d: any) => d?.token_id === id || d?.token_ids?.includes(id)))
          out.push({ tx: t.transaction.hash, block: r.execution_outcome.block_height, standard: ev.standard, event: ev.event, data: ev.data });
      }
    }
  }
  return out; // newest first (by tx); events like nft_mint/nft_transfer (nep171) and satchel/* custom ones
}
```
Block height → tx hash (for a `block_height` stored on-chain): `POST /v0/account {"account_id":"<satchel>","from_tx_block_height":h-N,"to_tx_block_height":h+1,"limit":10}`. Use N ≈ 300 for records written in an MPC callback, since the MPC yield lasts 200 blocks and the callback runs ~203 blocks after `sign` on timeout (**[SOURCED]** `10-mpc-signer.md`). **[VERIFIED]** with N = 20 for a single-receipt tx.

### NEP-297 event format our contract should emit (so FastNEAR `is_event_log` and the snippet above work)
- One log line per event: `EVENT_JSON:{"standard":"satchel","version":"1.0.0","event":"signature_issued","data":{...}}`. Put account ids that should be searchable (`owner_id`, `buyer_id`, `seller_id`) inside `data`: FastNEAR flagged `seller.*` via `is_event_log` when it appeared in either the `nep171` or the custom event. **[VERIFIED]**
- Standard NFT events (`nep171` `nft_mint`, `nft_transfer`) come from near-contract-standards; keep them, since wallets and explorers key on them.
- Logs are not stored in state, so they make a cheap "blob" channel. For example, `sec`/`sdk` can emit the **unsigned tx bytes** in `signature_issued` and store only the hash in `sig_log`. A checker can then recompute the payload hash from the logged tx and trust it, without relying on the seller's local storage [ASSUMED design, owner `sec`]. Log limits per receipt (`EXPERIMENTAL_protocol_config`, testnet protocol 87 and mainnet 86): `max_total_log_length` **16,384 bytes**, `max_number_logs` **100**. A multi-input BTC tx in hex fits easily, but don't log unbounded data. **[VERIFIED]**

### Contract views the UI needs (proposal for `sdk`; names illustrative)
| View | Returns | UI use | Poll |
|---|---|---|---|
| `nft_token(token_id)`, `nft_tokens_for_owner(account_id, from_index, limit)` | NEP-171/181 | My Satchels, owner check | on load, after tx |
| `satchel_state(token_id)` | `{pending_signs, listed: Option<{price, currency, listed_at, seller}>, delegate_epoch}` | status pill, Sell tab, cooldown countdown | 5 s while Signing/Listed (per `ux`) |
| `sig_log(token_id, from_index, limit)` | `[{idx, chain, payload_hash, requested_at, status, signed_at?}]` | clean history, Activity | on Sale tab |
| `get_listings(from_index, limit)` | `[(token_id, listing)]` | `/market` | 15 s |
| optional `history(token_id, from, limit)` | bounded `[{kind, block_height, actor}]` | Activity without any indexer | 15 s |

### Per-chain fetch snippets (browser-safe; each helper run once as plain JS in `snippets_check.mjs` **[VERIFIED]**)
```ts
// BTC testnet4 (btc agent owns the details: fees, UTXO selection, broadcast)
const MS = 'https://mempool.space/testnet4/api';
const btcBalance = async (a: string) => { const j = await (await fetch(`${MS}/address/${a}`)).json();
  return (j.chain_stats.funded_txo_sum - j.chain_stats.spent_txo_sum) + (j.mempool_stats.funded_txo_sum - j.mempool_stats.spent_txo_sum); }; // sats
const btcTxs = (a: string) => fetch(`${MS}/address/${a}/txs`).then(r => r.json());            // newest first, 50 per page
const btcOutspends = (txid: string) => fetch(`${MS}/tx/${txid}/outspends`).then(r => r.json()); // [{spent, txid?, vin?, status?}]

// Sepolia
const SEP = 'https://ethereum-sepolia-rpc.publicnode.com';
const evm = (method: string, params: unknown[]) => fetch(SEP, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then(r => r.json()).then(j => j.result);
const ethBalanceWei = async (a: string) => BigInt(await evm('eth_getBalance', [a, 'latest']));
const ethNonce = async (a: string) => Number(BigInt(await evm('eth_getTransactionCount', [a, 'latest'])));
const ethHistory = (a: string) => fetch(`https://eth-sepolia.blockscout.com/api/v2/addresses/${a}/transactions`).then(r => r.json()); // {items, next_page_params}

// Solana devnet
const SOL = 'https://api.devnet.solana.com';
const sol = (method: string, params: unknown[]) => fetch(SOL, { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }).then(r => r.json()).then(j => j.result);
const solLamports = async (a: string) => (await sol('getBalance', [a, { commitment: 'confirmed' }])).value;
const solSigs = (a: string) => sol('getSignaturesForAddress', [a, { limit: 20 }]); // method limit 10 per window: cache it
const solBlockhashValid = async (bh: string) => (await sol('isBlockhashValid', [bh, { commitment: 'processed' }])).value;
```

### Price route (Next.js route handler, cached 60 s, fallbacks; no key needed; both fetchers **[VERIFIED]** in plain Node; the route wrapper itself not run)
```ts
// app/api/prices/route.ts  → { BTC, ETH, SOL, NEAR, USDC, source, at }
export const revalidate = 60;
const ID = { BTC: 'nep141:btc.omft.near', ETH: 'nep141:eth.omft.near', SOL: 'nep141:sol.omft.near',
             NEAR: 'nep141:wrap.near', USDC: 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1' };
async function from1Click() {
  const rows: any[] = await fetch('https://1click.chaindefuser.com/v0/tokens', { next: { revalidate: 60 } }).then(r => r.json());
  const m = Object.fromEntries(rows.map(t => [t.assetId, t]));
  return Object.fromEntries(Object.entries(ID).map(([k, id]) => [k, m[id]?.price]));
}
async function fromCoinGecko() {
  const j = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,near,usd-coin&vs_currencies=usd',
    { next: { revalidate: 60 } }).then(r => r.json());
  return { BTC: j.bitcoin?.usd, ETH: j.ethereum?.usd, SOL: j.solana?.usd, NEAR: j.near?.usd, USDC: j['usd-coin']?.usd };
}
export async function GET() {
  for (const [source, f] of [['1click', from1Click], ['coingecko', fromCoinGecko]] as const) {
    try { const p = await f(); if (Object.values(p).every(v => typeof v === 'number')) return Response.json({ ...p, source, at: Date.now() }); } catch {}
  }
  return Response.json({ error: 'prices unavailable' }, { status: 503 }); // UI hides "≈ $" when this fails
}
```
Asset ids above were read from `/v0/tokens` today: `nep141:btc.omft.near` (BTC), `nep141:eth.omft.near` (ETH), `nep141:sol.omft.near` (SOL), `nep141:wrap.near` (wNEAR). **[VERIFIED]**

### On-demand clean-history data (no worker; the rules are `sec`'s)
`GET /api/clean-history/:id` (cache 10–30 s) is only a **hint**. Per `sec` (`70`, threat u), the browser re-runs the check before **Buy** with **two providers per chain that must agree**: BTC `mempool.space/testnet4/api` + `mempool.emzy.de/testnet4/api` (outspends work there, no address endpoints, **[SOURCED]** `30`); Sepolia publicnode + Tenderly or dRPC **[VERIFIED]** above; Solana devnet `api.devnet.solana.com` + a second devnet RPC (see `32-solana-devnet.md`) [ASSUMED]. Beware the Esplora trap: `/tx/:id/outspend/:v` returns `{"spent":false}` for a **non-existent** txid, so check `/tx/:id` first (`30`). Read `sig_log` (view) → per record: EVM: `eth_getTransactionCount(addr,'latest') > signed_nonce` ⇒ spent; BTC: every input outpoint of the signed tx is spent (`/tx/{prev_txid}/outspends`, or `/tx/{txid}/status` if the tx itself confirmed); SOL: signature landed (`getSignatureStatuses`) or blockhash no longer valid (`isBlockhashValid` false) ⇒ dead. Each call above was tested once today. Sizing: N listed Satchels × ≤ 3 calls × 1 per cache window, so the route stays far below every keyless limit measured here.

### If you add a DB anyway (P2)
```bash
pnpm add drizzle-orm@0.45.4 @neondatabase/serverless@1.2.0 && pnpm add -D drizzle-kit@0.31.11
# or Prisma (pin both!): pnpm add @prisma/client@7.10.1 @prisma/adapter-neon@7.10.1 && pnpm add -D prisma@7.10.1
```
`drizzle-orm/neon-http` over `@neondatabase/serverless` is one HTTP fetch per query and has no pooling concerns on Vercel Functions [SOURCED Drizzle/Neon docs, not re-verified]. Provision Neon from the Vercel Marketplace so the connection string arrives as a Vercel env var (exact variable names were not checked [ASSUMED]: confirm in the integration UI).

## Gotchas & failure modes

1. **nearblocks `/v1/sync/status` lies.** It reports the base indexer at the chain head while every `/v1` data endpoint is frozen at block 270,420,307. Use `/v3`. If nearblocks v1 recovers, `/v1` responses may also differ in shape from `/v3` (`{"txns": [...]}` vs `{"data": ...}`). **[VERIFIED]**
2. **nearblocks free tier is 6 calls/min per IP**, shared across our Vercel region and the whole team during development. One extra call returned HTTP 429 `{"message":"You have exceeded your API request limit..."}` on mainnet. **[VERIFIED]**
3. **neardata 429 arrives as JSON with `retry-after: 0`.** A naive retry loop hammers it. 30 blocks/min is below the chain's ~105 blocks/min. **[VERIFIED]**
4. **FastNEAR RPC rate limits are per IP and shared** (`-429 "Rate limits exceeded…"`), and near-api-js `JsonRpcProvider` does not retry 429 (`41-web-stack.md`). near-cli-rs once failed to fetch a nonce for this reason ("this client has exceeded the rate limit"). Get the FastNEAR key (human action) before the demo. **[VERIFIED]**
5. **`rpc.testnet.near.org` is deprecated** (`-429 "WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW!"`). Same finding as `web`. **[VERIFIED]**
6. **dRPC testnet `send_tx` with `wait_until: FINAL`** on a 6-receipt `ft_transfer_call` returned HTTP 500 "Internal server error" twice. near-api-js's failover then took ~91 s to return, although the tx had executed in ~2 s. Never block on dRPC; see `40-frontend-wallet.md` for the tracker. **[VERIFIED]**
7. **FastNEAR NFT/FT holdings are event-driven.** A token whose `mint` logs nothing (e.g. `usdc.fakes.testnet`) never shows up in `/v1/account/{id}/ft`, and a fake `nft_transfer` from any contract does show up. **[VERIFIED]**
8. **Non-archival RPC forgets blocks after ~1.5 days.** "Look up the tx of sig N" for older records needs FastNEAR tx API or archival RPC. **[VERIFIED]**
9. **Solana devnet `getSignaturesForAddress` has a method limit of 10** (per window, per IP). Poll it at most every 15–30 s and cache server-side if the market page lists many Satchels. **[VERIFIED]** headers
10. **CORS on 429:** FastNEAR documents that a 429 may arrive without CORS headers, so the browser reports a generic `TypeError: Failed to fetch`. Treat that as retryable with backoff. **[SOURCED]**
11. **1Click `/v0/tokens` is a mainnet price list.** It is fine for "at mainnet prices" labels, but it couples the price widget to 1Click's availability. That is why CoinGecko is the fallback. **[VERIFIED]**
12. **Pyth Hermes and Etherscan both need keys now.** Do not pick them for a keyless MVP. **[VERIFIED]**
13. **GitHub API (60 req/h unauthenticated) was exhausted by the team today.** Fetch sources with `raw.githubusercontent.com` or `git ls-remote`/`git clone --depth 1`. **[VERIFIED]**

## Recommendations for Satchel (concrete, with priority)

- **P0 — Architecture: no indexer, no DB, no worker for Phase 1.**
  - Browser → our contract views (via the FastNEAR→dRPC failover from `41-web-stack.md`).
  - Browser → mempool.space / Sepolia publicnode + Blockscout / Solana devnet for balances and chain history.
  - Browser → FastNEAR tx API for NEAR tx hashes and event logs.
  - SSR for `/s/[id]` uses the same calls server-side with 1.5 s timeouts and `revalidate: 15`, so it matches `ux`'s judge-first page.
- **P0 — Contract stores what the UI must trust:** `sig_log` with status and `requested_at` height, `pending_signs`, `listed` (+ `seller`, `listed_at`), an enumerable listings index for `/market`, and NEP-297 events for every state change (`nep171` standard events plus `satchel` custom events with account ids inside `data`). Coordinate names with `sdk` and `sec`.
- **P0 — Prices:** `/api/prices` route (snippet above) with 1Click → CoinGecko fallback, 60 s revalidate, and the "≈ $X at mainnet prices" label. If both fail, hide USD rather than show stale numbers.
- **P1 — Activity tab:** implement `satchelEvents()` (above) plus per-chain history merges. Show local in-flight items first (`ux`). Explorer links: NEAR tx → `https://testnet.nearblocks.io/txns/<hash>` (page works); BTC → `https://mempool.space/testnet4/tx/<txid>`; Sepolia → `https://sepolia.etherscan.io/tx/<hash>` or `https://eth-sepolia.blockscout.com/tx/<hash>`; Solana → `https://explorer.solana.com/tx/<sig>?cluster=devnet`.
- **P1 — Get a FastNEAR API key** (free dashboard). Use it only server-side (route handlers / SSR) and keep the browser keyless. Optionally put the activity merge behind `/api/activity/:id` with a 15 s cache so judges never hit per-IP limits.
- **P2 — `/api/clean-history/:id`** computed on demand from `sig_log` + chain calls (cache 10–30 s). No `sig_check` table.
- **P2 — Only if needed: a tiny store** for the "pending-tx relay" (`ux`/`web`/`sec` idea: broadcast a signed tx even if the user closed the tab). Options: Neon + Drizzle, or a Marketplace Redis/KV [ASSUMED availability and limits, not checked]. Implement the "follow `sign_requested`/MPC responses" part as a **FastNEAR tx-API poll** of the Satchel contract (`/v0/account {desc:true, from_tx_block_height}` every 5–10 s), not a block-follower. Trigger it lazily on page load, or from a Vercel Pro cron (≥ 1/min); Hobby cron can't do it.
- **Avoid:** Lake, neardata, nearblocks-as-backend, Intear events, Pyth, Etherscan, Binance; Prisma unpinned.

## Deltas vs plan (near_hackathon.md)

| Plan item | Finding | Recommended change |
|---|---|---|
| B5 architecture: "[Indexer worker] NEP-297 logs + balances/txs … → Postgres" | Not needed. Every input is available live and keyless; free block-following options are rate-limited below chain speed; Vercel Hobby cron is daily only | Drop the worker and Postgres from Phase 1. Views + client queries + cached route handlers. Revisit only for a P2 relay |
| B5 "Data model: satchel, chain_address, balance_snapshot, event(…), listing, sig_check(…)" | Ownership/listing/sig log must be on-chain anyway (trust); balances are cheap to fetch live; `sig_check` is a pure function of chain state | Replace the tables with contract views (`satchel_state`, `sig_log`, `get_listings`) and on-demand `/api/clean-history/:id` |
| B5 API routes `/api/satchels/:id`, `/api/clean-history/:id` | Fine, but stateless (fetch + cache), no DB behind them | Keep as cached proxies; add `/api/prices` |
| Plan stack "Postgres + Prisma, Vercel … route handlers plus one worker" | Worker needs Vercel Pro (1/min cron) or another host; `prisma` CLI `latest` = 8.0.0-rc.24 today | No worker. If a DB is ever added: Neon Free + Drizzle 0.45.4 (or Prisma pinned to 7.10.1) |
| B6 day 9 "Clean-history worker + UI" | Can be a route handler, not a worker | Rename to "clean-history route + UI" |
| B4 "large total USD" on the card | Testnet coins are worthless; `ux` already hides USD by default | Agree with `ux`: "≈ $X at mainnet prices" only, never a bare total |
| B7 README proof links (testnet nearblocks) | `testnet.nearblocks.io/txns/<hash>` pages render fresh txs; the nearblocks **v1 API** is frozen | Use nearblocks tx pages for links; never the v1 API |
| (missing) | FastNEAR rate limits on a shared IP; nearblocks 6/min | Add "FastNEAR API key" (also in `41`) to Phase 0 human actions |

## Open questions / human actions

1. **Human:** create a FastNEAR dashboard account (`https://dashboard.fastnear.com`) and issue a server key → Vercel env `FASTNEAR_API_KEY` (server only). Shared with `web`'s request; one key is enough.
2. **Human (optional):** CoinGecko Demo key (free, 100 calls/min) as a sturdier fallback → `COINGECKO_DEMO_KEY`, sent as `x-cg-demo-api-key` from the server only.
3. **sdk + sec:** agree the view names/shapes above, and whether `signature_issued` carries the unsigned tx bytes (log) so clean-history can recompute and verify payload hashes.
4. **Open:** do nearblocks v3 NFT views index a real NEP-171 contract that has `nft_metadata` on testnet? I believe so (they index `epochals.testnet`), but our fake emitter wasn't indexed. Re-check with the first real deploy on Nov 1–2 if the README wants nearblocks NFT pages.
5. **Open:** exact FastNEAR free-tier numbers for the tx API (none published; it didn't throttle me today at a few req/s). Measure once with the team key.
6. **Open:** whether Binance.com blocks Vercel US regions (not testable from here). Irrelevant if we follow the recommendation.
