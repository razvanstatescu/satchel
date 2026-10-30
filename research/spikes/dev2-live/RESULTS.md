# dev2 live run: C1–C7, C4/C6, C5 against the real sprint contract (2026-10-30)

> Evidence for the `tools/e2e` extensions on `feat/tools-live`. Target: `dev2.satchelhq.testnet`, wasm `10c6a8e9…`,
> deployed from `main` with every sprint feature, `usdc_contract_id` = Circle testnet USDC `3e2210e1…b8af`,
> MPC `v1.signer-prod.testnet`. Satchels #1–#3 belong to `alice.satchelhq.testnet`. Signing done under the standing
> testnet-signing approval (D-48), with alice/bob/carol only, against dev2 only, between dev2's own Satchel addresses,
> within the stated caps. Nothing above the caps was sent; two chains (Base Sepolia USDC/ETH beyond sign-only) were
> never funded, so their flows are `--sign-only` by design, not by failure.

## Setup
| Item | Detail |
|---|---|
| Contract | `dev2.satchelhq.testnet`; `config()` confirms `evm_chain_ids` = [11155111, 84532, 421614, 11155420], `erc20_tokens` = the 4 Circle testnet USDC addresses, `usdc_contract_id` = `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af`, `max_message_bytes` = 1024 |
| Starting state | #1/#2/#3 all `sig_count 0`, owner `alice.satchelhq.testnet`, unlisted |
| Funding (#1 only) | 0.02 Sepolia ETH, 0.2 devnet SOL, 300,000 testnet4 sats (confirmed at block 158101, txid `68a0ee8a…`, 1 UTXO vout 1) |
| Personas | alice 2.92 NEAR, bob 2.0 NEAR, carol 3.0 NEAR (all `.satchelhq.testnet`); dev2 itself had 5.51 NEAR free, 426,304 B storage (spare ≈ 1.25 NEAR after the market deposit) |
| Addresses used | #1 evm `0x2f63B9eAa9F225aaD72Db4391e024761c9613Fe8`, btc `tb1qnqe0734xrsnpm5yt36r627g6kdkt4u9wjrrnaq`, sol `2jgCnruxgsWMP2EwbtjYdG8gqepRNkBE7T3qJAA71Afo`; #2 evm `0x1b2E04d7bB8fB00C92F7923b717CAc398eAFf3d3`, sol `7RbAqKKncnLcaNkiuFsfUSu8Jo7wGwvFz4DyjZ7fQaqq`; #3 btc `tb1q9v9t4ay7ssgry9l7s9yf7hs6s39uhxtd8f6gs3` |

## Results
| # | Flow | NEAR tx (hash / nearblocks) | Chain proof | Latency | Burnt | Result |
|---|---|---|---|---|---|---|
| 1 | EVM native send #1 → #2 on Sepolia, 0.002 ETH | `DuNMM3cGLqmvE6ipbpGvYsoACBkbD3snYT1ZcfU7u4sc` | [Sepolia tx](https://sepolia.etherscan.io/tx/0x4a2771dc8712150e1b7667002c359473af5f2e580972039e7cb2c268249c1785) (block 12025440) | 6.0 s | 14.9 Tgas | **PASS** first try. Signature recovered to the Satchel address; MPC gas limit 207,391 from `estimateTransferGas` |
| 2 | EVM native, Base Sepolia (84532), `--sign-only`, unfunded | `5abScPL9zTGavgBX8HdP8GocNztByw1ejMGrUwjz8thZ` | signed, not broadcast (unfunded chain) | 5.4 s | 15.1 Tgas | **PASS**. Proves the per-chain nonce path and signature recovery on a second chain with one unmodified key |
| 3 | EVM USDC transfer (C2), Sepolia, `--usdc --sign-only`, unfunded USDC | `HBpmZdEbnNSVyVwsVDYiCEhrDY4GyU2MMNAkpzypgty4` | signed, not broadcast | 5.4 s | 15.1 Tgas | **PASS**. The contract accepted the `transfer(to,amount)` calldata to Sepolia's configured USDC, and the signature recovers to the Satchel's EVM address |
| 4 | `evm_message` (C7), #1 | `CWZGe4sFjQx9F3q29Xz3xTfBLvxhHgsVAuMviJ3CfcNH` | record seq 3, payload `26f84877…` | 5.4 s | 14.9 Tgas | **PASS**. Payload == `keccak256(EIP-191(message))` (INV-08); `verifyEvmMessageSignature` recovers the Satchel's EVM address |
| 5 | `sol_message` (C7), #1 | `dr6u4tRpEtZ7y7fj39wakERpox5K4GrcvgY8QGLBHiG` | record seq 4, payload `c6150247…` | 5.4 s | 15.1 Tgas | **PASS**. Payload == `sha256(offchain(message))`; `verifySolOffchainSignature` verifies against the Satchel's SOL address |
| 6 | `history_digest` (C1) recomputed vs. on-chain, #1 at sig_count 5 | (view only) | — | — | — | **PASS**. `historyDigest(contract, "1", sig_records)` == `history_digest("1").digest_hex` = `6fa169bc…` |
| 7 | SOL send #1 → #2, 0.001 SOL | `3bh1pDhvYi7DTcK3TdSinDzvyZPyyGi7dMTWCw9kV6n8` | [Solana tx](https://explorer.solana.com/tx/3jP9S3hug5tdNrnw3LS3WBwQQaFAc7tihFGJAZa7ddN85JV6Nof62Y1UM6CvBRSZxVkcEAx9fCu4H6jBxcGJpDwH?cluster=devnet) | 6.1 s | 15.5 Tgas | **PASS** first try. ed25519 verified before broadcast; devnet accepted |
| 8 | BTC send #1 → #3, 1 input, 5,000 sats | `3zSswR2VmAsoWhp5nfKSG3hLcksKSvjnUi1RnrwRKXVn` | [mempool.space/testnet4](https://mempool.space/testnet4/tx/f4db80ecd509bdd0655e1cc4f89c35b810b055bdd047fe761f650cf3f131908c) | 6.1 s | 15.3 Tgas | **PASS** first try (block 158101's UTXO had confirmed by run time). Signed txid == unsigned txid; mempool accepted |
| 9 | C6: alice `deposit_near` 0.1 NEAR into #2 | `AGtWKMHA6RPkbbvuYQRVhAVJQBrKwgT1zDUeTERPFqse` | `inside_of("2").near` 0 → 99,300,000,000,000,000,000,000 (storage ≈ 0.0007 NEAR charged) | 1.2 s | 2.6 Tgas | **PASS** (see finding 1: the first read-back raced the view and had to retry) |
| 10 | C4: carol `make_offer` 0.2 NEAR on #2 (offer 1) | `2rartXFgezBw74DPhPGHXVjwJ6BS7KzBY9ujDhTaAjVF` | `offers_for("2")` → offer 1, carol, 0.2 NEAR | 1.8 s | 4.3 Tgas | **PASS**. No quiet-period wait needed: #2 had never signed (`listable_at` 0) |
| 11 | C4: alice `accept_offer(1)` | `De4asMuL8BG4eHzes95gTaywBkRxuqhMbGQEgSCZeXKD` | owner of #2 → carol | 2.5 s | 8.5 Tgas | **PASS**. Inside NEAR unchanged across the sale (I-M8); `market_totals()` after: `escrow_near` 99,300,000,000,000,000,000,000 ≤ spare ≈ 1.25 NEAR (I-M1 holds) |
| 12 | C6: carol `withdraw_near` 0.0993 NEAR from #2 | `4zCS9dx2cPZ1pv9QWKPFagPhJpVn6AQJrRf9nZnbwCK4` | `inside_of("2")` → `{near:"0", inside_epoch:1}` | 2.0 s | 5.7 Tgas | **PASS**. `inside_epoch` bumped exactly once (I-M4) |
| 13 | C4: bob `make_offer` 0.05 NEAR on #3 (offer 2) | `H2177vGgPUa3H1Du2g6KvwCqzFHxLWxUXSWJTQZ5ypV5` | `offers_for("3")` → offer 2, bob | 1.7 s | 4.3 Tgas | **PASS** |
| 14 | C4: bob `cancel_offer(2)` | `CnSevEmfRw4sQGextGSTP7tqEN4uYkai6Vsf2UG9E7om` | `offer(2)` → null | 2.5 s | 6.3 Tgas | **PASS**. bob's balance recovered to 1.994 NEAR (2.0 − gas only; the 0.05 NEAR escrow came back in full) |
| 15 | C5: alice `set_allowance` bob on #1, cap btc ≤ 20,000 sats, 24 h expiry | `GTaoWcfGTqaEkex4cx3zNv4skRSxEB2c2Z37pTk9HAYC` | `allowance("1","bob…")` → `status:"active"` | 1.3 s | 3.2 Tgas | **PASS** |
| 16 | C5: bob delegated `sign_for` within cap, BTC, 10,000 sats (`--sign-only`) | `FAFuuaY5WECmD2xZgWLpiw6ByKz9jfy3xGJUtHrW38cg` | signed, not broadcast | 5.9 s | 15.7 Tgas | **PASS**. Debited 10,282 sats (amount + fee, §3); local `checkDelegatedSign` and the contract agree; `spends_in_window` → 1 |
| 17 | C5: bob delegated `sign_for` over cap, BTC, 15,000 sats requested (remaining was 9,718) | `86eBA5ZqyN62jKw6vuXEu4zkrYD7ScDfJ6vx1VGkdJht` | — | 0.9 s | 2.8 Tgas | **PASS (expected refusal)**. Local mirror and the live contract both refuse with `ERR_ALLOWANCE_EXCEEDED: remaining 9718, request needs 15282`, byte-for-byte |
| 18 | C5: alice `revoke_allowance` bob on #1 | `7o9DGFd2Hz5DYWjcTXm4SPj92seJehrVXBXXEywrpcms` | `allowance("1","bob…")` → `null` | 0.9 s | 2.5 Tgas | **PASS** |
| 19 | Clean-history checker, #1 (after all of the above, sig_count 8) | (views) | — | — | — | **`blocked`**. Two `unused` items (the Base Sepolia nonce-0 record and the Sepolia USDC nonce-1 record, both `--sign-only` by design), one `message` each for the evm_message/sol_message records (never blocking), SOL `expired` (devnet blockhash expired after the run), BTC `settling` (the real send, 1 confirmation so far) and BTC `unfunded` (the delegate's synthetic sign-only preimage, never a real UTXO). All expected; Buy correctly disabled |
| 20 | Clean-history checker, #2 and #3 (never signed) | (views) | — | — | — | **`empty`**, Buy enabled on both, as expected for untouched tokens |

Proof for any NEAR row: `curl -s -X POST https://tx.test.fastnear.com/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["<hash>"]}'`

## Caps (D-48 standing approval): nothing above the stated limits
| Asset | Spent (real broadcasts only) | Cap |
|---|---|---|
| NEAR (market escrow moved, net of refunds) | ≈ 0.35 NEAR (0.1 deposit + 0.2 offer paid out + 0.05 offer refunded in full) | ≤ 1 NEAR |
| Sepolia ETH | 0.002 ETH | ≤ 0.01 ETH |
| testnet4 BTC | 5,000 sats | ≤ 50,000 sats |
| devnet SOL | 0.001 SOL (1,000,000 lamports) | ≤ 0.05 SOL |

The Base Sepolia and Sepolia-USDC EVM flows, and the delegate's BTC debit demo, were all `--sign-only`: nothing was
broadcast, so they moved no real coins and don't count against the caps above.

## Findings
1. **A multi-RPC fallback pool can still answer a stale "final" view, even after `waitForFinalViews`.** The very
   first `deposit_near` re-read (`inside_of("2")`) came back `near: "0"` right after a `SUCCESS` tx — the deposit had
   landed (confirmed a few seconds later), but the view answered from a node in the FastNEAR/dRPC pool that
   individually lagged a touch further behind the optimistic head `waitForFinalViews` had waited for. This is the
   same class of bug as the 2026-10-27 smoke finding #3, just one layer deeper (multi-provider fallback, not a single
   RPC's optimistic/final gap).
   - **Fixed:** `tools/e2e/market.ts` now wraps every post-tx read in `readUntil()`, a short bounded retry (5×2 s),
     instead of trusting one read. Applied to `deposit`, `withdraw`, `make-offer`, `accept-offer` and `cancel-offer`.
2. **The checker's own tool wiring only checked Sepolia records, even for Base Sepolia/Arbitrum/OP Sepolia (C3).**
   `tools/e2e/checker.ts` passed `deps.evm` (Sepolia only) and never `deps.evmByChain`, so `@satchel/core/clean-history`
   fell back to `providers_down` → `unknown` for every non-Sepolia chain id, which blocks Buy for the wrong reason.
   Caught live: #1's Base Sepolia sign-only record (nonce 0, never broadcast) first reported `unknown
   (providers_down)` instead of `unused (nonce_not_used)`.
   - **Fixed:** added `evmByChainSources(cfg)`, two independent providers per C3 chain read from
     `@satchel/core/chains/evm`'s `EVM_NETWORKS[chainId].rpcs`, and wired it into `checkCleanHistory`'s `deps`. Re-ran
     the checker: the item now reports the correct `unused (nonce_not_used)`.
3. **A same-address BTC "sweep" doesn't debit a C5 allowance at all.** The first allowance demo sent the delegate's
   BTC leg back to the Satchel's own address (`to === from`), which `btcDebit`'s "external outputs" filter correctly
   excludes — so the within-cap and over-cap checks would have passed/failed for the wrong reason (only the ~280-sat
   fee was ever debited, regardless of the requested amount).
   - **Fixed:** `tools/e2e/allowance.ts`'s `buildAssetRequest` now sends the BTC leg to the *next* token's address
     (still one of dev2's own Satchel addresses, so it stays inside the D-48 caps), which is external to the
     delegate's own output and debits the full amount + fee as spec §3 intends. Confirmed live (finding row 16/17
     above): a 10,000-sat ask debited 10,282 sats, and a 15,000-sat ask against the 9,718 remaining was refused with
     the exact remaining/needed numbers, by both the local mirror and the contract.
4. **The MPC did not time out once** across 8 real `sign_for` calls (1 EVM native, 2 EVM sign-only, 2 messages, 1 SOL,
   1 BTC, 1 delegated BTC sign-only) — latencies 5.4–6.1 s throughout, well inside the quoted ≈ 25 % timeout rate from
   the earlier smoke run. No retry was needed.
5. **Messages are correctly non-blocking.** The clean-history aggregate for #1 was `blocked` only because of the two
   intentionally-unbroadcast EVM sign-only records; both message records (seq 3, 4) reported status `message` and
   never contributed to the block, matching docs/specs/C1-C2-C3-C7.md §7.2.
6. **`market_totals()` / I-M1 held throughout**, including right after the 0.2 NEAR `accept_offer` payout: `escrow_near`
   tracked exactly the inside balance before the withdrawal, and the contract's spare NEAR (≈ 1.25 NEAR after the
   first deposit) never dropped below what any of our calls needed.

## Not run
- No Base Sepolia/Arbitrum Sepolia/OP Sepolia ETH, and no Sepolia USDC, has been funded on dev2 yet (noted in the
  brief): the Base Sepolia native and Sepolia USDC flows above are `--sign-only` by design, proving the signing and
  verification path without needing those human-run faucets. Arbitrum Sepolia and OP Sepolia were not exercised at
  all this run (C3's chain allowlist and per-chain nonce map are already covered by the Sepolia + Base Sepolia pair
  above; add Arbitrum/OP sign-only runs once there's a reason to, e.g. before the rc rehearsal).
- USDC `prepareErc20Send`'s real-balance branch (`erc20BalanceOf` → actual transfer) was not exercised: #1 holds no
  USDC on any chain. The `--sign-only` run above still proves the contract-side classify/record/sign path for C2.
