# btc spike — RESULTS (THROWAWAY, Phase 0, 2026-10-21)

Owner: `btc` agent. Account: `satchel-spk-btc-e9ea1a.testnet` (+ sub-account `fanout.satchel-spk-btc-e9ea1a.testnet`).
Distilled knowledge: `kb/30-bitcoin-testnet4.md`. Nothing here may be copied into the product.

## Layout
| Path | What |
|---|---|
| `js/lib.mjs` | helpers: hand-built BIP143 preimage, preimage parser, MPC→(r,s), low-S check, vsize estimator, dust constants |
| `js/01-derive.mjs` | address derivation 3 ways (live view + bitcoinjs v7, chainsig.js adapter, chainsig.js local key) |
| `js/02-build-offline.mjs` | N-input P2WPKH PSBT over **fabricated** outpoints; sighash 3 ways; preimage parse; chainsig.js comparison |
| `js/03-mpc-sign.mjs` | REAL MPC `sign` calls from the spike account: `seq` / `par` / `batch` modes |
| `js/04-assemble.mjs` | MPC sig → 64-byte r‖s → PSBT → strict low-S validation → finalize → `/txs/test` (+ optional broadcast); high-S demo |
| `js/05-cors-browser.mjs` | real Chrome (playwright-core) CORS test from `http://localhost:8765` |
| `js/06-deploy-fanout.mjs`, `contract-fanout/` | throwaway contract: preimages → on-chain sha256d → N MPC `sign` promises joined with `.and()` |
| `js/07-call-fanout.mjs` | calls `sign_btc` (2 and 4 inputs, negative tests, low-gas test) |
| `js/08-coinselect.mjs` | coinselect (as chainsig.js uses it) vs exact P2WPKH vbytes; dust behaviour |
| `js/09-ecc-and-addresses.mjs` | recipient address types with/without `initEccLib`; dust per output type |
| `js/10-sighash-reuse.mjs` | which sighash types let a signature be reused in a modified tx (local throwaway key) |
| `js/11-latency-blocks.mjs` | blocks from MPC `sign` receipt to resume callback |
| `js/12-clean-history.mjs` | BTC clean-history verdicts (DEAD / LIVE / REPLACEABLE / NOT_CREATED / BAD_VOUT) against live testnet4 |
| `js/13-real-spend.mjs` | READY, NOT YET RUN (address unfunded): real 1-input + 2-input spends via the contract + `/txs/test` probes |
| `js/14-preimage-browser.mjs` | Buffer-free preimage builder == Node version (8/8 inputs) |
| `monitor/blockwatch.sh`, `monitor/last450.json` | testnet4 block cadence (wall clock) and last-450-block analysis |
| `vendor/` | `chainsig.js` @ `17aec4f` (v1.1.16), `near/mpc` @ `13f42bf` (main, 2026-10-21) + key files at tag `3.17.0`, `cypherfaucet` @ `976b992` |

Versions: node 22.22.2, bitcoinjs-lib 7.0.4 (top level) + 6.1.9 (nested under chainsig.js 1.1.16), @noble/curves 2.4.0,
@noble/hashes 2.4.0, tiny-secp256k1 2.2.4, @bitcoinerlab/secp256k1 2.0.0, coinselect 3.1.13, near-api-js 7.3.1,
near-sdk 5.29.1 (with `near-sdk-env` pinned to 0.1.6), rustc 1.93.0, cargo-near 0.22.0. Deployed MPC: `version()` = `"3.17.0"`.

## 1. mempool.space testnet4 API (curl, 2026-10-21 ~11:20–11:45Z)
- `GET /blocks/tip/height` → `157200`; `/blocks/tip/hash` → `00000000007a101e…`; genesis `/block-height/0` → `00000000da84f2bafbbc53dee25a72ae507ff4914b867c565be350b0da8bf043` (BIP94 testnet4).
- Headers: `server: nginx`, `x-powered-by: mempool-electrs 3.4.0-dev-bf622e5`, `x-bitcoin-version: /Satoshi:30.0.0(@wiz)/`, `access-control-allow-origin: *`. No rate-limit headers.
- `GET /v1/fees/recommended` → `{"fastestFee":1,"halfHourFee":1,"hourFee":1,"economyFee":1,"minimumFee":1}`.
- `GET /address/:a` → `{"address":…,"chain_stats":{funded_txo_count,funded_txo_sum,spent_txo_count,spent_txo_sum,tx_count},"mempool_stats":{…}}`.
- `GET /address/:a/utxo` → `[{"txid","vout","status":{"confirmed","block_height","block_hash","block_time"},"value"}]` (includes unconfirmed).
- `GET /address/:a/txs` → 50 txs (keys fee, locktime, sigops, size, status, txid, version, vin, vout, weight); `/txs/mempool` → `[]`.
- `GET /tx/:txid/status` → `{"confirmed":true,"block_height":157177,…}`.
- `GET /tx/:txid/outspend/:vout` unspent → `{"spent":false}`; spent → `{"spent":true,"txid":"515f4966…","vin":0,"status":{"confirmed":true,"block_height":157177,…}}`. `/outspends` → array.
- **Nonexistent txid**: `/outspend/0` → 200 `{"spent":false}`; `/status` → 200 `{"confirmed":false}`; `/outspends` → 404 `Transaction not found`. Out-of-range vout on a real tx → `{"spent":false}`.
- `POST /tx` garbage → 400 `sendrawtransaction RPC error: {"code":-22,"message":"TX decode failed. Make sure the tx has at least one input."}`.
- `POST /txs/test` (testmempoolaccept) works: `[{"txid":…,"wtxid":…,"allowed":false,"vsize":null,"fees":null,"reject-reason":"missing-inputs"}]`.
- `OPTIONS` on esplora paths (`/tx`, `/blocks/tip/height`, `/address/…`) → **404** with only `access-control-allow-origin: *`; on `/v1/*` → 200 with full allow-methods/headers.
- Burst: 25 concurrent `GET /blocks/tip/height` → 25×200 (single test only, to avoid an IP ban for teammates).
- Alternatives: `mempool.emzy.de/testnet4/api` = testnet4 (same genesis), ACAO `*`, but **`/address/*` → 404** (no address index). `blockstream.info/testnet4/api/*` → HTML (no testnet4 API); `blockstream.info/testnet/api` = testnet3 (tip 5,195,950). **`testnet4.mempool.space/api` is MAINNET** (tip 972,467; genesis `000000000019d6…`).

## 2. Browser CORS (real Chrome 1228-era via playwright-core, origin http://localhost:8765)
mempool.space/testnet4: GET tip/utxo/fees/outspends OK; `POST /tx` with default text/plain body → readable 400; `POST /tx` with
`Content-Type: application/json` → `TypeError: Failed to fetch`; `POST /txs/test` text/plain → readable 400 `Invalid transaction size for item 0`
(JSON array accepted with text/plain); GET with custom header → `Failed to fetch`. emzy: same, plus `/address/:a/utxo` fails (404 without ACAO).

## 3. Testnet4 block cadence (last 450 blocks, heights 156752–157201, Oct 16–21)
26 real-difficulty blocks (difficulty ≈1.23e9) carried 4,762 txs; 424 min-difficulty (difficulty 1, timestamps ~2 h in the future, one every ~20 min wall clock) carried 836 txs (67 of 424 had any tx; fee rates 0.1–16 sat/vB, no clear fee preference).
Gaps between real-difficulty blocks (by header time): median 2.0 h, max 21.0 h. At 11:22–12:0xZ the newest real block was 157177 (05:42Z) — 6 h+ with mempool at ~340 txs.
`monitor/blockwatch.log` (60 s polling, 11:24Z–16:23Z, monitor completed): heights 157200 → 157215 (16 blocks in 5 h, ~20 min apart), **every one coinbase-only, difficulty 1**;
no tx-carrying block since 157177 (05:42Z) → 10.7 h+ at monitor end; mempool grew 336 → 513 txs (146.8 → 229.6 kvB).
Tip flapping at equal height: 157204 `0000000081ce…` → `000000000016fad5…` (12:43→12:50); 157206 `b61b9f…` → `283b8f…` (13:33) → `b61b9f…` (13:39);
157208 `000000000031d7…` → `00000000d6f252…` (14:10→14:17). Some polls got a new tip hash but no block JSON (empty height fields).

## 4. Derivation (`node 01-derive.mjs`)
```
predecessor satchel-spk-btc-e9ea1a.testnet, path satchel/1/btc
root (live public_key domain 0) = secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3 (== chainsig.js hardcoded TESTNET root)
derived_public_key (live) = secp256k1:cPnZmsVnrgRy2sLnA84RgjYDgdXWNgYeQLAb2LUr9SuZGtzcESnuKaa58JksFwGMGxAb439SNGqeK6giqUCQ6ij
compressed 021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d -> tb1qzplwrxu3p9xy95twx3tm2fveql80fvcjgc0ze7  (A view+bitcoinjs7 == B chainsig adapter == C chainsig local) MATCH: true
satchel/2/btc -> tb1qakdsc8u04sr8ujluyjfczud9mvx8ulx06ddkl7 MATCH: true
predecessor fanout.satchel-spk-btc-e9ea1a.testnet, satchel/1/btc -> 023e36ee8dbf9314fd73cfb4f204dc1f38249ef20d5ff72395eff009586e441df6 -> tb1qd6c87hqfmfltxhra55k3w8ngcdr2dsk89ptr9a MATCH: true
```
chainsig.js derives locally (hardcoded root) when contractId is `v1.signer-prod.testnet`; view call took ~169 ms vs 15 ms local.

## 5. Offline 2-input build (`node 02-build-offline.mjs`)
Inputs (fabricated): `37ea6fce…42a0:0` 30,000 sat, `092c7db5…5072:1` 25,000 sat; outputs 40,000 → `tb1qlj64…5p7q`, change 14,582 → self; fee 418 (2 sat/vB × 209 vB est.); nSequence `0xfffffffd`; version 2; locktime 0.
Unsigned txid `5cbd4ff872dc16c1d1f5fcf2c9ea8e9047c9b20bec1cf4674532272e14a199a1`. Sighashes: in0 `b7f0149b…9496`, in1 `16f39ad5…e40e`.
For every input: captured-by-fake-Signer == `hashForWitnessV0` == `sha256d(hand-built 182-byte preimage)` → **true**. Parser recovers version 2, outpoint txid (BE) + vout, pkh `107ee19b…b312`, amount, sequence 4294967293, hashOutputs `4402c2f7…201a`, locktime 0, sighashType 1.
chainsig.js `prepareTransactionForSigning` with the same explicit inputs/outputs uses sequence `0xffffffff` (no BIP125 signal) → different hashes; for an identical tx (same sequence) its hashes are byte-identical to bitcoinjs v7 (**true**).

## 6. Real MPC signatures, direct calls (`node 03-mpc-sign.mjs out/unsigned-fake.json <mode> 50`)
RPC `https://near-testnet.drpc.org` (fastnear returned `-429 Rate limits exceeded`; `rpc.testnet.near.org` returned `-429 "WARNING! THIS ENDPOINT IS DEPRECATED!…"`).
Request: `sign({"request":{"payload_v2":{"Ecdsa":"<64 hex>"},"path":"satchel/1/btc","domain_id":0}})`, 50 Tgas, 1 yocto.

| mode | NEAR tx | wall ms (send→FINAL, 1 s polling) | gas burnt | result |
|---|---|---|---|---|
| seq #1 | `8Du9bBU9znLouRRETMwMf4CCvkodwYDeFVyRxQXkJ4vo` | 9,247 | 8.604 Tgas (sign 4.33 + resume cb 3.51 + 2×0.22 refunds) | ok, s=0x4033…, recid 0 |
| seq #2 | `AhP1NbUUYBPiX7dDhf4ZhLtJFkDgwUHHfcuKKPYW3XuX` | 9,228 | 8.605 Tgas | ok, s=0x5618…, recid 1 |
| par #1,#2 (nonces n+1,n+2) | `AP8YdW7QL98J8TF8oQiCCCFAiWD2qmMu6TrbCvsZbsmn`, `13GEyKUvmjXh2qVW9tHgxu8i9NfGx62rpoRrVxni9UgV` | 7,067 both (7,187 total vs 18,618 seq) | 8.556 / 8.555 | ok, ok |
| batch (1 tx, 2 `sign` actions) | `9afVH1GCZibSeJwPNEofmj1R5rQPxbDPfCN7ge6Z2yC6` | 118,776 | 22.37 Tgas | **both `Smart contract panicked: Request has timed out.`** |

Tokens burnt per direct sign ≈ 0.000816 NEAR. Response JSON (lowercase hex):
`{"scheme":"Secp256k1","big_r":{"affine_point":"0361a155…5e75"},"s":{"scalar":"4033fac2…5694"},"recovery_id":0}`.
Same payload signed twice → different (r,s) (randomized threshold ECDSA).
Batch failure cause [SOURCED]: node indexer `try_extract_function_call_args` returns `None` when `actions.len() != 1` (`crates/node/src/indexer/handler.rs:292` at tag `3.17.0`).
Latency in blocks (`11-latency-blocks.mjs`): sign receipt → resume callback = 8, 6, 6, 6 blocks; batch: yields failed at +202 blocks.

## 7. Assembly + validation (`node 04-assemble.mjs out/unsigned-fake.json out/sigs-seq-*.json --broadcast`)
r = x(big_r) (strip 1-byte prefix), s = scalar; both inputs: `lowS_from_mpc: true`, strict noble verify (lowS, prehash:false) **true**,
pubkey recovered from (r,s,recovery_id) == derived key **true**; `psbt.validateSignaturesOfAllInputs(strict)` **true**; finalize/extract OK:
txid `5cbd4ff8…99a1` (== unsigned txid), wtxid `59266551…d07c`, vsize 208, weight 832, fee 418 (2.01 sat/vB), DER+type lengths 71/71 (par run: 72/71).
`/txs/test` → `reject-reason: missing-inputs`; `POST /tx` → 400 `{"code":-25,"message":"bad-txns-inputs-missingorspent"}`.
High-S variant of input 0 (s' = n − s): bitcoinjs `validateSignaturesOfInput` with a loose verifier → **true** (bitcoinjs does not enforce low-S); strict → false; same txid, different wtxid.
All 18 MPC signatures obtained today had s < n/2 (direct: seq 2, par 2; contract fan-out: 2+4+2+4+2) — scanned from `js/out/*.json`.

## 8. Contract fan-out (`contract-fanout/`, deployed to `fanout.satchel-spk-btc-e9ea1a.testnet`, deploy tx `8EfiZcNCUuMnHJJp87zUqmUaxhf87YzGS7CBMMB28RUw`)
Build: `cargo near build non-reproducible-wasm` failed with near-sdk 5.29.1 → `near-sdk-env@0.1.7 requires rustc 1.95`; fixed by `cargo update near-sdk-env --precise 0.1.6`; wasm 142,239 bytes. Warning: `env::promise_result` deprecated → use `promise_result_checked`.
`sign_btc(token_id, preimages_hex, sign_gas_tgas=15, cb_gas_tgas=10)` validates each preimage (182 B, sighash type 1, P2WPKH scriptCode, same tx fields, `sha256d(outpoints) == hashPrevouts`), computes `env::sha256(env::sha256(preimage))`, logs an event, fans out N `sign` promises with `.and()`, `.then(on_signed_batch(n))`.

| call | NEAR tx | wall ms | total gas burnt | notes |
|---|---|---|---|---|
| 2 inputs, 100 Tgas attached | `Ay74ew1ehz91Yu3aradtqadrAURsjLFXWxkCrzsepCgJ` | 9,222 | 21.883 Tgas (0.00205 NEAR) | entry 3.107, cb 1.468; both sigs valid; on-chain payload == bitcoinjs sighash **true** ×2 |
| 4 inputs, 100 Tgas | `Ugim2Ja66xFffCwnG1ehCv1uMijZb75Z4WZmaQkcADf` | 9,231 | 39.876 Tgas (0.00376 NEAR) | entry 4.515, cb 1.590; 4 sign receipts in one block, 4 callbacks in one block (+8); 4/4 valid low-S, DER 71/72/72/71, vsize 344 |
| 2 inputs, sign_gas 14 Tgas | `BTp7dHANRSQZmwtJxY81XMdw1fbxofr74yqjmPvvTKbm` | 9,391 | 21.907 | still OK: unused gas is shared by weight, so prepaid per sign > 15 |
| 4 inputs, **80 Tgas** attached | `DwQmE3AWmLzo4Uw6XUXTXR8WAgc4VUShKWS3uhDC2H9N` | 10,217 | 39.867 | 4/4 OK |
| 2 inputs, **45 Tgas** attached | `5NijqqmonfBY9WBKEmdvYRZ2dLTHbWmFda9jYK7mbdaH` | 9,399 | 21.907 | 2/2 OK |
| 2 inputs, **40 Tgas** attached | `AeJoyYgx9zzj8NRo5gtUrsbAEjQDVRtXrJcnU2Ce59pT` | 5,208 | 3.916 | `Exceeded the prepaid gas.` in entry receipt (no MPC call) → min ≈ 5 + 15·N + 10 |
| neg: preimage 0 with sighash NONE | `3gM2JEbWdfN1xvbMogA1Xia36p73mqs23xaoEkbJFRuZ` | — | 2.056 | `Smart contract panicked: ERR_SIGHASH_NOT_ALL` (no MPC call) |
| neg: only 1 of 2 preimages | `6eCzQrPR4iqTAaiHy8sRCJFZ8U1rLsemJgFvgV9Tzv5B` | — | 2.021 | `ERR_PREVOUTS_INCOMPLETE` |

## 9. Coin selection / dust (`node 08-coinselect.mjs`)
```
A 2 utxos 40k @2: coinselect default fee 748 (eff 3.58 sat/vB); with P2WPKH length hints 422 (2.02); largest-first exact 418 (2.00)
B 1 utxo, change ~200 @1: default -> no change, fee 340; WITH hints -> change 197 sats (< 294 dust!) ; exact -> no change, fee 340
C 3 utxos 12k @2: default 452 (3.21); hints 286 (2.03); exact 282 (2.00)
estimateVsizeP2WPKH == bitcoinjs virtualSize (72-byte sigs): 1/1 110, 1/2 141, 2/2 209, 4/2 345, 10/2 753
```

## 10. Address types / ECC (`node 09-ecc-and-addresses.mjs`)
Without `initEccLib`: p2wpkh/p2pkh/p2sh OK; **p2tr `tb1p…` → "No ECC Library provided. You must call initEccLib()…"**; `bc1…` → "has an invalid prefix".
With `initEccLib(@bitcoinerlab/secp256k1)`: p2tr OK. tiny-secp256k1 2.2.4 (wasm) also loads in Node.
Dust (Core formula, 3 sat/vB): P2WPKH 294, P2TR 330, P2PKH 546, P2SH 540.

## 11. Sighash reuse (`node 10-sighash-reuse.mjs`, local key)
| type | redirect all outputs | add input+output | change output 1 only |
|---|---|---|---|
| ALL | invalid | invalid | invalid |
| NONE | **STILL VALID** | invalid | **STILL VALID** |
| SINGLE | invalid | invalid | **STILL VALID** |
| ALL\|ANYONECANPAY | invalid | invalid | invalid |
| NONE\|ANYONECANPAY | **STILL VALID** | **STILL VALID** | **STILL VALID** |

## 12. MPC domains / foreign-tx (live `state`, `get_available_foreign_chains`)
Domains: 0 CaitSith Sign (secp256k1 ECDSA), 1 Frost Sign (Ed25519), 2 CKD (BLS12-381), 3 CaitSith ForeignTx. No secp256k1 Schnorr → no P2TR key-path.
`get_available_foreign_chains` includes `"Bitcoin"`; inspector source knows only mainnet + testnet3 genesis hashes; extractor `BlockHash` only.

## 13. Faucets (2026-10-21)
mempool.space/testnet4/faucet: GitHub-linked mempool account (+ verified email), 5k–500k sats/request (source: `faucet.component.*`).
coinfaucet.eu/en/btc-testnet4 and faucet.testnet4.dev: hCaptcha. testnet4.anyone.eu.org: discontinued. bitcoinfaucet.uo1.net: testnet3.
Crypto Chief: signed-in dashboard account, 1 claim/network/24 h. CypherFaucet: website hCaptcha; **keyless API** `POST https://cypherfaucet.com/api/v1/claim {"network":"btc-testnet","address":…}` → 0.01 tBTC, 1/address/h + 1/IP/h; `GET /api/v1/info` showed balance 159.18 tBTC.
Attempts at 11:31:47Z, 11:32:24Z, 11:41:48Z (Cloudflare 522), 11:44:24Z, 11:53:24Z → `503 {"ok":false,"error":"send_failed"}` (Core `sendtoaddress` returned a definite error; reservation released). Background retry every 10 min (`monitor/faucet-retry.sh`): all 18 tries 12:05Z–15:10Z failed (16× `send_failed`, 2× Cloudflare `522`) → `GAVE_UP`. Total today: 23 attempts, 0 payouts. `js/13-real-spend.mjs` remains ready for when the address is funded.

## 14. Clean-history checker against live testnet4 (`node 12-clean-history.mjs`, tip 157202, K=1)
```
spent+confirmed efc545…:429 -> {"verdict":"DEAD","spender":"515f4966…","confirmations":26}
unspent e300a99d…:0         -> {"verdict":"LIVE","value":5600085064}
fabricated 37ea6fce…:0      -> {"verdict":"NOT_CREATED"}      (/tx/:txid 404; /outspend alone would have said spent:false)
real tx, vout 99            -> {"verdict":"BAD_VOUT"}
request {spent, unspent} -> HARMLESS ; request {unspent} -> BLOCKS_SALE ; request {fabricated} -> PENDING_NOT_CREATED
```
Address history paging: `/address/:a/txs` returned 50 (all confirmed, empty mempool part); `/txs/chain` and `/txs/chain/:last_txid` return pages of 25.

## 15. Browser-safe preimage (`node 14-preimage-browser.mjs`)
`browser-safe preimage == Buffer version == stored preimage, and sha256d == sighash: 8/8` (inputs of unsigned-fake, unsigned-fanout-2, unsigned-fanout-4).

## 16. WebSocket (`node 15-websocket.mjs`)
`wss://mempool.space/testnet4/api/v1/ws` — Node 22 global WebSocket: first message keys `blocks,mempoolInfo,vBytesPerSecond,fees,da…`;
real Chrome from `http://localhost:8765`: `["open","blocks"]` (cross-origin WS accepted). `track-address` replies (`address-transactions`,
`block-transactions`) only arrive when a tx touches the address (none during the 8 s window; address unfunded).

## 17. Cross-checks done at the end
- MPC foreign-tx Bitcoin provider (`allowed_foreign_chain_providers` view): `https://bitcoin-testnet-rpc.publicnode.com`, quorum 1; its
  `getblockhash 0` → `000000000933ea01ad0ee984209779baaec3ced90fa3f408719526f8d77f4943` (testnet3), `getblockcount` → 5,195,953.
- near-sdk-env: 0.1.7 created 2026-10-19T17:10Z (rust_version 1.95); 0.1.6 2026-09-17 (1.93). near-sdk 5.29.1 requires `near-sdk-env ~0.1.6`, `near-sys ^0.2.14`.
  Fresh `cargo generate-lockfile` with `near-sdk = "=5.29.1"` + toolchain 1.93.0: edition 2021 → 0.1.7 (with or without rust-version 1.93);
  edition 2024 → 0.1.6 (with or without rust-version) — MSRV-aware resolver v3.
