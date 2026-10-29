# Pre-hackathon testnet smoke of the real contract (2026-10-27)

> This is throwaway evidence and must not be imported. The contract account
> `smoke1.satchel-spk-web-e9ea1a.testnet` is a sub-account of a spike account, so it has nothing to do with
> `satchelhq` and its derived addresses can't be confused with the real dev, rc or final ones.
> The goal was to run the audited wasm against the live MPC signer `v1.signer-prod.testnet` (3.17.0, state `Running`,
> keyset epoch 26) before Nov 1, using the product tools (`tools/e2e/*`) with the new `--sign-only` flag.
> The derived chain addresses are unfunded, so nothing was broadcast to Sepolia, testnet4 or devnet.

## Setup
| Step | Detail |
|---|---|
| Account | `smoke1.satchel-spk-web-e9ea1a.testnet`, 4 NEAR from `satchel-spk-web-e9ea1a.testnet`. It keeps its full-access key, as a dev contract does. |
| Code | `target/near/satchel/satchel.wasm`, sha256 `aea0b2e95d1a45278b7b020c2b7e015a41aea6cf5248b765f5cbb72ede451bd6`, the same as the release candidate. The on-chain `code_hash` matches. |
| Init | `new(mpc = v1.signer-prod.testnet, usdc = null, base_uri = https://example.invalid/smoke/card/)` |
| Personas | alice = `satchel-spk-pay-e9ea1a`, bob = `satchel-spk-sdk-e9ea1a`, carol = `satchel-spk-btc-e9ea1a` (all `.testnet`) |
| Tokens | #1 and #2 minted to alice (`wwRVueWkb8L4sXSN8D7C3S9zTijbi3HPpgHpwQSoVei`, `uRyUXQDusQQUYhbhSjpRBkQaQfMWsCedTWmHvAJ1NN3`) |

## Results
| # | Flow | Tx (NEAR testnet) | Latency | Burnt | Result |
|---|---|---|---|---|---|
| 1 | EVM `sign_for` #1, nonce 0 | `BDRuPREnSvQggEfH2GJW2NUc8eNPqvMiHmgCCmJYYGgY` | 120.1 s (+206 blocks) | 18.2 Tgas | **The MPC timed out** (`fail_on_timeout`: "Request has timed out."). The record was written first (seq 0, `failed`). `on_signed` returned `[null]` without panicking and emitted `sign_resolved: failed`. The design held. |
| 2 | Direct MPC `sign` from `satchel-spk-mpc-e9ea1a` (control, without Satchel) | (CLI) | 121 s | — | **It also timed out**, so the cause is the MPC network, not our contract |
| 3 | EVM `sign_for` #1, retrying **the same nonce 0** (§8.7) | `GvQsAZfoFQUYmpZoXDtyLR9wAjBvorPH6txjaBZct1Yo` | 6.1 s | 15.5 Tgas | The signature recovers to `0x2c0e6A57Af6b270cd1770050e05f6423E6713437`. Sepolia publicnode `eth_sendRawTransaction` answered `insufficient funds … have 0 want 100000000399000`: the node recovered the sender and checked its balance |
| 4 | BTC `sign_for` #2, **2 inputs** (synthetic outpoints), contract fan-out with `.and()` | `CGMJUx9z6kRqDooNgMt1hHEHiQEw4J8zUXFVrLpVRtxB` | 7.3 s | 26.3 Tgas | Both signatures pass the strict low-S verify, and the signed txid equals the unsigned txid `94020504…b698` |
| 5 | SOL `sign_for` #1 (Eddsa, domain 1) | `ECLaSqwrsmD3csy7otaLyofjCaXzJ8h45pq5HBkRfqBG` | 5.8 s | 16.1 Tgas | ed25519 verifies against `NagBdMLF…352`. Devnet `simulateTransaction` with `sigVerify: true` → `AccountNotFound` (only the funding is missing); the control with one signature byte flipped → `SignatureFailure` |
| 6 | Clean-history checker (`tools/e2e/checker.ts`) on #1 and #2 | (views) | — | — | #1 `blocked`: two unused EVM nonce-0 signatures, and the timed-out record counts too, which is correct; SOL `young`, later `expired`. #2 `clean`: its BTC inputs don't exist (`unfunded`). **`mpc_keys_ok: true`: the MPC's own `derived_public_key` equals our local derivation for btc, evm and sol.** Both NEAR sources (FastNEAR, dRPC) agree |
| 7 | NEAR sale #2: list 0.1 → check → buy (carol) | list `4m3JoHCFRuXAFoKWgr9kbPas4aHNXEx9qzZq2KKfwhkd`, buy `HMvdZ6m884MQc8LEyer23o6UFZAiowCtRGDh7VgiiiSV` | 1.8 s, 2.5 s | 3.6, 7.3 Tgas | The owner changed, the listing cleared and the seller was paid exactly once |
| 8 | Transfer = control: carol → bob (`nft_transfer`) | `6UxPKBbCgiqqT6PcTvPhLR7mGtqmQw3xdN3PPATt8rdR` | 0.7 s | 3.4 Tgas | Owner = bob; `sig_count` unchanged |
| 9 | Old owner carol `sign_for` #2 | `GMe8RUuv5iSkR2gKfGaZLLm89YcCmTL7KxpetmJvHccT` | 1.3 s | 2.2 Tgas | `ERR_NOT_OWNER` |
| 10 | New owner bob `sign_for` #2 (BTC, 1 input) | `4a5PhgXHxoRbVYt2GEjqrz98iTstz7PDpPSn47UBPSGt` | **83.6 s** | 15.9 Tgas | Signed; txid unchanged. The MPC was slow under load |

Proof for any row: `curl -s -X POST https://tx.test.fastnear.com/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["<hash>"]}'`

## Findings
1. **The testnet MPC is unreliable under load.** Of the last ~58 `sign` requests to `v1.signer-prod.testnet`, 14 timed out (sampled via the FastNEAR account API). Most traffic came from `tx-bench.testnet`. Our own latencies were 6, 7, 6 and 84 s, plus one 120 s timeout.
   - **Impact:** demos and judge runs can hit the timeout copy.
   - **Mitigation:** stage the demo signatures early (Day 10 E-04); keep the honest timeout UX; on retry, reuse the same EVM nonce (that worked here); add a line to H-14 for the MPC team.
2. **`sepolia.drpc.org` no longer serves Sepolia on the free plan** ("chain is not available on free plan"). It was our second Sepolia source, so the checker silently ran EVM on a single source.
   - **Fixed:** it was replaced in `packages/core` `SEPOLIA_RPCS`, `apps/web/src/lib/config.ts`, `tools/lib/config.ts`, `tools/monitor.sh`, the tests and kb/90 §8.3. The new order is publicnode → ethpandaops → 0xrpc → tenderly, all CORS-checked.
   - NEAR `near-testnet.drpc.org` still works.
3. **The tools read state too early.** A `final` view issued right after an `EXECUTED_OPTIMISTIC` outcome missed the new token (the mint check failed even though the mint had succeeded).
   - **Fixed:** `executePlan` now waits until the final head passes the optimistic head (`waitForFinalViews`, with 2 unit tests).
4. **`--sign-only` added** to `tools/e2e/{evm,btc,sol}.ts`. It runs sign + verify without broadcasting, so it works unfunded. It is useful for the Day-1 smoke before funding lands, and for the "blocked" demo token (#4).
5. **Gas:** the sign_for burns are in line with the §5.5 formulas: EVM 15.5 Tgas and SOL 16.1 Tgas (80 Tgas attached each), BTC 2-input 26.3 Tgas.

## Clean-up
`smoke1` keeps about 1 NEAR liquid and about 2.9 NEAR locked for storage. Once `satchelhq.testnet` exists, it can be
deleted with `near account delete-account smoke1.satchel-spk-web-e9ea1a.testnet beneficiary <team>.testnet …`, which
needs a fresh "yes". Token #1 is deliberately left `blocked`.
