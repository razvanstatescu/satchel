# pay spike — RESULTS (2026-10-21, Phase 0, throwaway)

Agent `pay`. Account `satchel-spk-pay-e9ea1a.testnet` (10 NEAR at start). Sub-accounts created for this spike
(same public key as the parent, no new key files): `seller.satchel-spk-pay-e9ea1a.testnet` (no contract),
`recv.satchel-spk-pay-e9ea1a.testnet` (287–783-byte hand-written WAT receiver, see `wat/`).
Machine egress is in the EU (Cloudflare POP `OTP`). The whole team shares one IP, so every rate limit below was
hit with teammates' traffic mixed in.

Nothing here is product code. Scripts are one-question probes; `raw/` holds the raw responses.

---

## 1. Indexing / event sources (NEAR testnet)

### 1.1 nearblocks API — v1 frozen, v3 live
```
curl 'https://api-testnet.nearblocks.io/v1/account/v1.signer-prod.testnet/receipts?per_page=3'   # HTTP 200, 4.5 s
  -> newest receipt block 270420293 (2026-09-27T03:13Z) although chain head = 274088795
curl https://api-testnet.nearblocks.io/v1/blocks/latest?limit=1   -> block_height "270420307"
curl https://api-testnet.nearblocks.io/v1/sync/status             -> indexers.base.height "274088815", sync:true   (claims in sync!)
curl https://api-testnet.nearblocks.io/v1/txns/<tx from 1 min ago> -> {"txns":[]}
curl https://api.nearblocks.io/v1/blocks/latest?limit=1           -> HTTP 429 {"message":"You have exceeded your API request limit..."}
```
Then found the current spec `https://api.nearblocks.io/openapi.json` (147 paths, all `/v3/...`):
```
curl https://api-testnet.nearblocks.io/v3/txns/latest?limit=1      -> block_height "274092618" (current)
curl https://api-testnet.nearblocks.io/v3/txns/ADFzVr5o9yCBD3rASyVywGJeRmsQxKGPY2Y5tjJfRN2a  -> found (emit tx, ~5 min old)
curl https://api-testnet.nearblocks.io/v3/accounts/recv.satchel-spk-pay-e9ea1a.testnet/txns?per_page=3 -> both emit txs + deploy
curl https://api-testnet.nearblocks.io/v3/txns/<hash>/receipts     -> outcome.logs contains both EVENT_JSON lines (custom one too)
curl https://api-testnet.nearblocks.io/v3/accounts/seller.satchel-spk-pay-e9ea1a.testnet/nft-txns -> {"data": []}
curl https://api-testnet.nearblocks.io/v3/nfts/recv.satchel-spk-pay-e9ea1a.testnet/txns            -> {"data": []}
```
CORS: `access-control-allow-origin: *` on v1 and v3. No rate-limit headers on v3 testnet responses.
Pricing page (nearblocks.io/apis): Free = "6 calls/minute limit, Up to 333 API calls a day, Up to 10,000 API calls a
month, Personal Use, Attribution required".
The testnet *website* tx page `https://testnet.nearblocks.io/txns/GUv6yR2…` rendered my fresh tx (page HTML contains
`recv.satchel-spk-pay…` and `emit`); its i18n bundle carries the notice "Due to unexpected maintenance NearBlocks is
out of sync. Some blocks or transactions may be delayed."
`https://explorer.testnet.near.org/transactions/<hash>` serves a "Near Explorer Selector" page.

### 1.2 FastNEAR NEAR Data (neardata.xyz) — free tier 30 blocks/min
```
curl -L https://testnet.neardata.xyz/v0/last_block/final  -> 302 to /v0/block/274088795, 24 KB, 0.39 s
   top keys [block, shards]; shard keys [chunk, receipt_execution_outcomes, shard_id, state_changes]
node scan_neardata.mjs v1.signer-prod.testnet 300
   -> first ~6 blocks OK (found sign/respond receipts with logs, e.g. tx-bench.testnet sign @274088823)
   -> then HTTP 429 {"error": "rate-limit exceeded of 30 blocks per minute",
                     "message": "Please get a plan from https://fastnear.com for higher rate limits"}
```
Block responses: `cache-control: public, max-age=31536000`; CORS reflects Origin.

### 1.3 FastNEAR Transactions API (tx.test.fastnear.com) — live, fast, keyless (today)
```
POST https://tx.test.fastnear.com/v0/account {"account_id":"v1.signer-prod.testnet","limit":3}
  -> 200, 0.47 s, account_txs[0].tx_block_height 274088882 (head), txs_count 2309134, resume_token
POST /v0/transactions {"tx_hashes":["ESLmKLKBnqucsV3GgXnekte7vNAHniEUEk1US1MD9s3J"]}
  -> transaction + execution_outcome + receipts[] (each with outcome.logs) + data_receipts
     sign receipt @274088823 -> return_signature_and_clean_state_on_success @274088829 (6 blocks)
POST /v0/account {"account_id":"recv…","from_tx_block_height":274092340,"to_tx_block_height":274092361,"limit":10}
  -> exactly the emit tx (block-height -> tx-hash lookup works)
```
Filters available on `/v0/account` (OpenAPI `docs.fastnear.com/openapi/transactions.json`): `is_signer`,
`is_receiver`, `is_real_receiver`, `is_predecessor`, `is_event_log`, `is_function_call`, `is_action_arg`,
`is_success`, `from_tx_block_height`, `to_tx_block_height`, `desc`, `limit` (1–200), `resume_token`.
CORS: preflight 200, `access-control-allow-origin: <origin>`, `allow-headers: accept, content-type, authorization`.

### 1.4 FastNEAR API (test.api.fastnear.com)
```
GET /v1/account/satchel-spk-pay-e9ea1a.testnet/full -> {"account_id":..., "pools":[], "tokens":[], "nfts":[], "state":{...}}
GET /status -> {"version":"0.10.1","sync_block_height":274088796,"sync_latency_sec":2.18,...}
GET /v1/account/satchel-spk-pay-e9ea1a.testnet/ft (after minting 1000 USDC.e, which emits NO event) -> "tokens":[]
GET /v1/account/seller.satchel-spk-pay-e9ea1a.testnet/nft (after a fake nft_transfer event from recv…)
  -> {"tokens":[{"contract_id":"recv.satchel-spk-pay-e9ea1a.testnet","last_update_block_height":274091855}]}
```
=> the holdings index is event-driven and does not validate the emitting contract (a 783-byte WAT blob with no
`nft_metadata` was listed as an NFT contract). It lists contracts, not token IDs.

### 1.5 Indexer latency (my own event-emitting tx)
`node latency.mjs deploy` (run 1) and `SKIP_NB=1 node latency.mjs` (run 2); polls every 3 s after FINAL.
| check | run 1 (GUv6yR2DQdMGpai7992DRebY6knhWkevxBXwuUw9v2rc) | run 2 (ADFzVr5o9yCBD3rASyVywGJeRmsQxKGPY2Y5tjJfRN2a) |
|---|---|---|
| tx → FINAL (send_tx wait_until FINAL) | 3664 ms | 3218 ms |
| FastNEAR tx API, receiver view | 435 ms after FINAL | 3857 ms (first poll missed) |
| FastNEAR tx API, `is_event_log` for seller | 682 ms | 515 ms |
| FastNEAR NFT holdings index for seller | 924 ms | 636 ms |
| nearblocks **v1** `/v1/txns/{hash}` | NOT visible within 240 s | skipped |
Deploy tx (receiver v2): `82WUm7F7ebqXNKMMcnv96drv8c43ebyGp9eobNPqASDY`.

### 1.6 Plain JSON-RPC
```
node rpc_scan.mjs https://rpc.testnet.fastnear.com
  -> block + chunk scan of 15 blocks found 5 hits for v1.signer-prod.testnet (txs + receipts, method names)
  -> after ~130 calls in 2.7 s: {"code":-429,"message":"Rate limits exceeded. For higher rate limits get a subscription at https://fastnear.com"}
node rpc_scan2.mjs https://rpc.testnet.near.org
  -> chunk keys [author, header, receipts, transactions]  (no outcomes/logs)
  -> EXPERIMENTAL_tx_status gives logs per receipt (final_execution_status FINAL)
  -> EXPERIMENTAL_changes account_changes / EXPERIMENTAL_changes_in_block: work (0 entries at that head)
  -> block H-150000 ok (2026-10-20T11:35Z), H-200000 ok (2026-10-20T03:41Z), H-250000 UNKNOWN_BLOCK (GC'd)
later: rpc.testnet.near.org view_code -> {"code":-429,"message":"WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW!
        Switch to https://fastnear.com or alternative RPC providers at https://docs.near.org/api/rpc/providers"}
archival: archival-rpc.testnet.near.org block 270420307 ok in 3.13 s, block 200000000 ok 3.10 s;
          archival-rpc.testnet.fastnear.com same blocks ok in 0.12 s / 0.20 s
other testnet RPCs: test.rpc.fastnear.com ok (ACAO *), near-testnet.drpc.org ok (ACAO *),
                    testnet-rpc.intea.rs HTTP 502 {"code":-32603,"message":"Internal error"}
near CLI (config rpc_url archival-rpc.testnet.fastnear.com) once failed:
   "Cannot sign a transaction due to an error while fetching the most recent nonce value ... this client has exceeded the rate limit"
dRPC testnet: send_tx wait_until=FINAL for multi-receipt ft_transfer_call returned "Internal server error" (HTTP 500) twice;
   near-api-js FailoverRpcProvider retried and the call returned after ~91 s; the txs had executed normally.
```
Block time: testnet 0.554 s (last 1k), 0.568 s (10k), 0.573 s (100k) → ~105 blocks/min; mainnet 0.602 s / 0.609 s.

### 1.7 Intear
`https://events-v3.intear.tech/` → Cloudflare 521; testnet host redirects to docs. `docs.intear.tech/llms.txt`:
"The Intear API replaces the Events API (`wss://ws-events-v3.intear.tech`, `https://events-v3.intear.tech`) …";
api llms-full: "The Events API's other events, like the NFT, Potlock and SocialDB ones, have no counterpart: the Intear
API is about fungible tokens." Intear API (mainnet FT data) works keyless with CORS `*`:
```
POST https://api.intea.rs/tokens {"ids":["wrap.near","17208628…33a1"],"fields":["symbol","decimals","price_usd"]}
 -> wNEAR 5.1895552897874449391, USDC 1.0016686719156039311 (height 220939797), x-credits-used: 1
```

### 1.8 NEAR Lake
Not run (needs AWS credentials; requester-pays = real money). Sourced only (README cost table, see KB 50).

---

## 2. Per-chain balance/history endpoints (browser CORS) — `node chains_probe.mjs`
Origin sent: `https://satchel-test.vercel.app`.
| endpoint | result | CORS |
|---|---|---|
| mempool.space testnet4 `/api/address/tb1qur7330emxypadqvr0mu4989sfzw32gpkxgyd2m` | 200, 163 ms, chain_stats | `*` |
| … `/address/{a}/txs` | 200, 50 txs/page | `*` |
| … `/address/{a}/utxo` | 200, 1798 utxos | `*` |
| Sepolia `ethereum-sepolia-rpc.publicnode.com` eth_getBalance | 200, 74 ms | `*`, preflight 204 |
| Sepolia `sepolia.drpc.org` | 200 | origin echoed, preflight 204 |
| Sepolia `1rpc.io/sepolia` | 200 | `*`, preflight 200 |
| Sepolia `sepolia.gateway.tenderly.co` | 200 | `*`, preflight 204 |
| Sepolia `rpc.sepolia.org` | **522** after 19.6 s | — |
| Etherscan v2 `chainid=11155111` txlist, no key | 200 `{"status":"0","message":"NOTOK","result":"Missing/Invalid API Key"}` | `*` |
| Blockscout `eth-sepolia.blockscout.com/api/v2/addresses/{a}` | 200 | `*`, `x-ratelimit-limit: 180` (reset ms header) |
| Blockscout `/api/v2/addresses/{a}/transactions` | 200, 50 items + `next_page_params` | `*` |
| Blockscout etherscan-compat `/api?module=account&action=txlist` | 200 | `*`, `x-ratelimit-limit: 10` |
| Solana devnet getBalance (`Vote111…`) | 200, apiVersion 4.4.0-beta.1 | origin echoed; preflight allows `authorization, content-type` |
| Solana devnet getSignaturesForAddress | 200 | headers: `x-ratelimit-method-limit: 10` (vs 150 for getBalance), `rps-limit 250`, `conn-limit 40`, `tier free` |
Sample WETH(Sepolia) `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` was the EVM test address.

## 3. Prices
| source | call | result | CORS |
|---|---|---|---|
| CoinGecko keyless | `/api/v3/simple/price?ids=bitcoin,ethereum,solana,near,usd-coin&vs_currencies=usd&include_last_updated_at=true` | BTC 83367, ETH 2460.5, SOL 106.65, NEAR 5.17, USDC 0.999451 | `*` |
| Coinbase | `/v2/prices/BTC-USD/spot`; exchange `/products/NEAR-USD/ticker` | 83354.115; 5.1745 | `*` |
| Kraken | `/0/public/Ticker?pair=XBTUSD,ETHUSD,SOLUSD,NEARUSD` | ok | origin echoed |
| Binance.com | `/api/v3/ticker/price?symbols=[...]` | ok from EU | `*` |
| Binance.US | `/api/v3/ticker/price?symbol=BTCUSDT` | **451** "Service unavailable from a restricted location" | — |
| Pyth Hermes | `/v2/updates/price/latest?ids[]=…` and legacy `/api/latest_price_feeds` | **401 `unauthorized`** (metadata `/v2/price_feeds?query=` still 200) | — |
| 1Click `/v0/tokens` | keyless | BTC 83384, ETH 2461.91, SOL 106.71, wNEAR 5.16, USDC 0.999441 (priceUpdatedAt 11:46:30Z) | `*` |
| Intear `api.intea.rs/tokens` | keyless | wNEAR 5.1896, USDC 1.0017 | `*` |
Pyth feed ids (from `/v2/price_feeds`): BTC `e62df6c8…5b43`, ETH `ff61491a…0ace`, SOL `ef0d8b6f…b56d`,
NEAR `c415de8d…6750`, USDC `eaa020c6…c94a` (full ids in `raw/pyth_ids.txt`).

## 4. Testnet USDC discovery
`node view.mjs testnet <c> ft_metadata` and `node exports.mjs testnet <c>` (wasm exports via view_code):
| contract | name / symbol / decimals | exported methods (relevant) | supply | storage bounds |
|---|---|---|---|---|
| `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` | USDC / USDC / 6 | 37: `mint` (minter-only), `master_minters`, `minter_allowance`, `blocklist`, `pausers`, `approve`, `transfer_from`, multisig, `ft_*`, `storage_*` | 14081220210067770 | min=max=1250000000000000000000 |
| `usdc.fakes.testnet` | Bridged USDC / USDC.e / 6 | 17: `mint`, `burn`, `set_decimals`, `set_icon`, `set_token_name`, `ft_*`, `storage_*` | 301001660717894912748986810560003 | min=max=1250000000000000000000 |
| `usdc.testnet` | USDC / USDC / 6 | 12: `new` + standard `ft_*`/`storage_*` (no mint) | 10000000000000000 | min=max=1250000000000000000000 |
Circle docs (developers.circle.com/stablecoins/usdc-contract-addresses): NEAR mainnet `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1`,
testnet `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`.
faucet.circle.com HTML lists `"NEAR":"Near Testnet"`, "20 USDC on testnet every 2 hours, per address, and per blockchain",
reCAPTCHA (`recaptchaSiteKey`, `recaptchaV2FallbackEnabled`).
Circle testnet USDC live activity (FastNEAR tx API): txs_count 94921, newest 2026-10-21T11:37:02Z; logs include
`EVENT_JSON:{"standard":"nep141","version":"1.0.0","event":"ft_transfer",...}` and
`EVENT_JSON:{"standard":"x-fiat-token","version":"1.0.0","event":"approve",...}` (from `transfer_from`).

## 5. NEP-141 buy-flow mechanics spike (real testnet txs, token = usdc.fakes.testnet)
All via `node call.mjs <contract> <method> '<args>' <yocto> <tgas>` (near-api-js 7.3.1, FailoverRpcProvider).
| # | action | tx hash | outcome |
|---|---|---|---|
| 0 | `storage_deposit {account_id: me}` 0.00125 NEAR (near CLI) | (CLI, 14.1 s wall) | `{"available":"0","total":"1250000000000000000000"}` |
| 1 | `mint {account_id: me, amount: "1000000000"}` 0 deposit | `3VrfdU1eFLgS4tg3NT4zcjDJgFFM1H99kT4qiifjq1qi` | Success in 2951 ms, **logs: []** (no ft_mint event); balance 1000000000 → **mint is open to anyone** |
| A | `ft_transfer` to unregistered `seller.` (1 yocto) | `GrDXvEChNp87dgJ8feEZoPDTpmmmvUuz7oETPgoZQDyG` | Failure: "Smart contract panicked: The account seller.satchel-spk-pay-e9ea1a.testnet is not registered" |
| E | `ft_transfer` with 0 deposit | (error thrown before hash capture) | "Requires attached deposit of exactly 1 yoctoNEAR', …/near-sdk-3.1.0/src/utils/mod.rs:22:5" |
| B | `ft_transfer_call` to unregistered `seller.` | `9VnXd1g5HXG1UYPTX9ZJA2DSqjmBTTRJvqSvdAbshgxi` | Failure in first receipt (same "not registered"); no cross-contract call made |
| R1 | `storage_deposit {account_id: seller., registration_only:true}` paid by me | `3trnarL8oFnB5NxuNT5Kn5pjfSnAH1H25xKPrFfqC8ik` | registered on its behalf |
| R2 | same again with 0.00125 NEAR | `2BdsDcgxVUFJufkorqaPkd9k6twcZRUYHGV3eMJEG2Rd` | log "The account is already registered, refunding the deposit" |
| C | `ft_transfer_call` 1000000 to registered `seller.` (no contract), msg `{"buy":"1"}`, 100 Tgas | `5VY9ejgPyPbcS72fhdX3WeJrXrBqSVZAHHXNEq4Cuyhq` | blk 274090225 "Transfer 1000000 from … to seller…"; 274090226 `CodeDoesNotExist`; 274090227 "Refund 1000000 from seller… to …"; tx value `"0"` |
| R3 | register `recv.` | `BnminmeRpmLof8Vk1j4jBZuWL771kjyD4h5SaVC5ETXD` | ok |
| D | `ft_transfer_call` 1000000 to `recv.` (WAT returns `"250000"`), msg `{"buy":"1"}`, memo "satchel spike", 100 Tgas | `1W7TyDFicWGPV2j8qKeDg32CzGvsUHJ5kYzGjhp9qFP` | 274090432 "Transfer 1000000 …", "Memo: satchel spike" (2.83 Tgas); 274090433 receiver logs `pred=usdc.fakes.testnet`, `input={"sender_id":"satchel-spk-pay-e9ea1a.testnet","amount":"1000000","msg":"{\"buy\":\"1\"}"}` (0.97 Tgas); 274090434 "Refund 250000 from recv… to …" (2.04 Tgas); tx value **`"750000"`**; balances me 999250000, recv 750000 |
| S | `set_decimals {"dec":6}` (no-op probe) | `J17rn4CvvpLLmbVJCaRTBuoPU5EjPNNuC5Sjzx3FP6Rk` | "NO PERMISSION" (left caller, right `usdc.fakes.testnet`) → metadata setters owner-only |
| X | direct `recv.ft_on_transfer {"sender_id":"attacker.testnet","amount":"999999999","msg":"{\"buy\":\"1\"}"}` from my plain account | `52aCkXrun7PvjJvGbdx4K1WbUtxqzB2V2gBwAzpBQRVJ` | executed; receiver logged `pred=satchel-spk-pay-e9ea1a.testnet` → any account can call `ft_on_transfer` with forged args (contracts must gate on predecessor). Return value came back garbled (`net0000"`) because this spike's WAT writes the predecessor at offset 5 and a 30-char name overwrote the return buffer at offset 32 — a spike bug, not NEAR behaviour (Test D's 18-char predecessor didn't overlap) |
Protocol config (`EXPERIMENTAL_protocol_config`, finality final): testnet protocol 87 / mainnet 86 both have
`storage_amount_per_byte` = 10000000000000000000 (1e19 yocto = 0.00001 NEAR/byte), `max_total_log_length` = 16384,
`max_number_logs` = 100.
Mainnet native USDC `17208628…33a1`: same 37 method names as Circle testnet (`diff` of wasm exports identical),
code hash `DVJx7F3dHEHJYwpYPwXHu8K9Uo7h4kXFcALucY5oNX8q` (321,491 B) vs testnet `EoAUFWELjD9gYzsjKDXYRmHDHf1RJ95jaKNSYE6v9b2z`
(315,265 B); `storage_balance_bounds` min=max=0.00125 NEAR.
Observations: memo is **not** forwarded to `ft_on_transfer`; `msg` arrives as a JSON string inside JSON;
predecessor in `ft_on_transfer` is the token contract; usdc.fakes logs are plain text ("Transfer …", "Refund …"),
not NEP-297; whole C/D flow = 3–4 blocks (~2 s) after inclusion.

## 6. 1Click (mainnet, read-only, no key)
```
GET  https://1click.chaindefuser.com/v0/tokens  -> 200, 0.16 s, 205 tokens / 37 chains, fields
     [assetId, decimals, blockchain, symbol, price, priceUpdatedAt, contractAddress, coingeckoId]
     headers: access-control-allow-origin: *, x-ratelimit-limit-unauth: 1200, x-ratelimit-reset-unauth: 60
GET  https://1click.chaindefuser.com/docs/v0/openapi.yaml -> 1.9 MB, "1Click Swap API" 0.1.10;
     securitySchemes: X-API-Key (header, "recommended"), JWT-auth (bearer, "legacy, use X-API-Key instead"), User-Session
node quote.mjs / quote2.mjs  (dry:true, EXACT_OUTPUT 5000000 = 5 USDC, Arb USDC -> NEAR USDC, slippage 100 bps)
  recipient alice.near / relay.tg / aurora (USDC-registered) -> 201: amountIn 5051519, minAmountIn 5001003, amountOut 5000000,
       timeEstimate 25, withdrawFee 0, refundFee 5300
  recipient satchel.near / zzz.near (exist, NOT registered) and fresh implicit 'ab'*32 -> 201: minAmountIn 5007457
       (+6454 = ~0.00125 NEAR storage at ~$5.16)
  recipient satchel-demo-buyer.near (named, does NOT exist) -> 400 {"message":"Internal server error"}
  recipient = USDC contract id itself -> 400 {"message":"Internal server error"}
  recipientType INTENTS -> 201 minAmountIn 5001003
  EXACT_INPUT 5000000 -> amountOut 4999000, minAmountOut 4949010 (≈2 bps total spread, no 25 bps visible)
  amount "1" -> 400 {"message":"Failed to get quote"}; past deadline -> 400 "deadline is not valid";
  bad originAsset -> 400 "tokenIn is not valid"; X-API-Key: not-a-real-key -> 401 {"message":"Invalid token"}
GET  /v0/status?depositAddress=0x…dEaD -> 404 "Deposit address … not found" (no key needed); missing param -> 400
node sdk_test.mjs (@defuse-protocol/one-click-sdk-typescript 0.1.26, no OpenAPI.TOKEN) -> getTokens() and dry getQuote() OK,
     signature present, depositAddress null (dry)
```
Status page: `https://partners.near-intents.org/shield/status` (200, "Shield Status — Ongoing Incidents … Recently resolved
incidents … Maintenance"); `status.near-intents.org` does not resolve; `partners.near-intents.org/home` redirects to
`signin.near-intents.org` (login needed for API keys).

## 6b. Extra checks (12:00–12:20 UTC)
- nearblocks v3 event indexers are current: `GET /v3/nfts/txns?per_page=1` → latest row block 274093417 (`epochals.testnet`
  TRANSFER); `GET /v3/fts/txns?per_page=1` → block 274093412. Yet `/v3/accounts/seller…/nft-txns` and
  `/v3/nfts/recv…/txns` stayed `{"data": []}` ~15 min after my fake `nft_transfer` (emitter has no `nft_metadata`), and
  `/v3/accounts/satchel-spk-pay…/ft-txns` is empty (usdc.fakes emits no events).
- 1Click delivery pattern (mainnet, read-only): `POST tx.main.fastnear.com/v0/account {"account_id":"intents.near","is_predecessor":true,"is_success":true,"limit":20,"desc":true}`
  then `/v0/transactions` (max 20 hashes; 40 → `{"error":"Bad request","message":"Too many transactions requested. Limit is 20"}`).
  Outgoing receipts from intents.near: `execute_intents` ×23, `ft_resolve_withdraw` ×11, `ft_transfer` on token contracts
  (e.g. base USDC omft ×6, hood.omft ×2, eth.omft ×1), `near_withdraw` on wrap.near ×3, `ft_transfer_call` ×2,
  `do_storage_deposit` ×1, `storage_deposit` on omni.bridge.near ×1.
- Clean-history data calls: `GET mempool.space/testnet4/api/tx/5040ba62…0b16/outspends` → `[{"spent":false}]` (ACAO `*`);
  Sepolia `eth_getTransactionCount(0x2527…f10D,"latest")` → `0x0`; Solana devnet `getLatestBlockhash` (finalized) →
  `Cqeei8e8tBVZZPag6iEF4amGcdB4HxR6mGM4adBxQp8L`, lastValidBlockHeight 500726354, then `isBlockhashValid` → `value: true`.
- 1Click SDK internals (dist/index.mjs): `OpenAPI.TOKEN` → `headers["Authorization"] = \`Bearer ${token}\``;
  `OpenAPI.HEADERS` merged into every request (so `X-API-Key` can be passed there). Runtime 60 KB ESM + axios 1.20.0,
  form-data 4.0.6, tweetnacl 1.0.3, @noble/hashes, @scure/base, json-stable-stringify 1.3.0.

## 7. Package versions seen (npm view, 2026-10-21)
`@defuse-protocol/one-click-sdk-typescript` 0.1.26 (only tag) · `near-api-js` 7.3.1 · `@near-lake/framework` 0.1.5
(2025-02) · crate `near-lake-framework` 0.7.14 stable / 0.8.0-beta.5 · `prisma` **latest = 8.0.0-rc.24 (published
2026-10-21T06:52Z), prev = 7.10.1** · `@prisma/client` 7.10.1 · `@prisma/adapter-neon` 7.10.1 · `drizzle-orm` 0.45.4
(beta 1.0.0-beta.22) · `drizzle-kit` 0.31.11 · `@neondatabase/serverless` 1.2.0 · `viem` 2.57.7 · `@solana/web3.js`
3.1.1 · `@solana/kit` 8.5.0 · `@pythnetwork/hermes-client` 3.1.0 · near-sdk-rs tags: `near-sdk-v5.29.1` (commit
421ffb42), `near-sdk-v5.30.0-rc.1` / `near-contract-standards-v5.30.0-rc.1` (commit a0d61a03).

## Files
`view.mjs` (view call), `exports.mjs` (list wasm exports), `call.mjs` (sign+send one call), `create_sub.mjs`,
`scan_neardata.mjs`, `rpc_scan.mjs`, `rpc_scan2.mjs`, `latency.mjs`, `chains_probe.mjs`, `quote.mjs`, `quote2.mjs`,
`sdk_test.mjs`, `snippets_check.mjs` (runs the KB-50 snippets as plain JS; output `raw/snippets_check.txt`: 4 events found, BTC/ETH/SOL helpers and both price fetchers OK), `wat/ft_receiver.wat`, `wat/receiver_v2.wat` (+ `build.mjs`, wasm), `raw/*` (responses),
`vendor/*` (docs/specs snapshots: FastNEAR OpenAPI, 1Click OpenAPI 0.1.10, NEAR Intents llms-full, Intear API docs,
near-sdk FT core_impl.rs, Lake READMEs).
Sub-accounts were left in place (≈0.3 NEAR each) so tests A–D can be re-run against Circle testnet USDC once faucet tokens exist. Clean-up (optional): `near account delete-account seller.satchel-spk-pay-e9ea1a.testnet beneficiary satchel-spk-pay-e9ea1a.testnet ...`
(same for `recv.`) returns ~0.6 NEAR.
