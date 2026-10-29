# Satchel — decisions log (ADR-lite)

> Owner: lead architect · Written 2026-10-21 (Phase 0) · **Revision 2** (same day, after the independent review `plan/review.md` and the orchestrator's calls) · Each decision is final for v1 unless it is marked **Needs human**. The normative design is `kb/90-technical-spec.md`; this file records *why*.
> Citation legend: `kb/10 §TL;DR 6` = `kb/10-mpc-signer.md`, section TL;DR, item 6 (file index in `kb/README.md`); `spike/btc` = `research/spikes/btc/RESULTS.md`; "lean" = the orchestrator's leaning stated in the Phase-0 brief; `R-xx` = finding xx of `plan/review.md`.
> Status values: **Decided** (engineering call, no human needed) · **Decided, human confirm** (default chosen; a human should say yes by the date shown) · **Needs human** (no default may be assumed, per HACKATHON.md "What the human decides").

## Revision 2.2 (orchestrator, same day) — brand consolidation

- **D-36 (new):** Razvan's Satchel brand (`brand/`) is merged with the R2 Mobbin findings into `kb/81-design-tokens.md` R3 and `kb/80-ux-spec.md` R3: the brand wins on visual identity, R2 on structure and behaviour, kb/90 and this file on product facts.
- **Amended:** D-20 (cut order: the OG image is now the brand file; prices return if UX-1's reopened default stands), D-23 (the card art is the brand card), D-26 (routes presented as a sheet or dialog; H-19 closed). **Updated:** H-11 (the post-R3 design set), H-24 (the disclosure names the brand assets).
- **kb/90:** errata E-45…E-47; §8 fonts, theme and brand assets; §10 font families; §11 brand files.

## Revision 2.1 (orchestrator, same day) — keyless birth verified on testnet

- **A-17 VERIFIED** (`research/spikes/keyless-birth/RESULTS.md`):
  - An 11-action keyless batch (CreateAccount, Transfer, DeployContract, `new`, `nft_mint` ×7, no AddKey) succeeded: tx `2AMrb8J8…`, 78.2 Tgas burnt, FINAL in 4.5 s.
  - A batch whose 7th mint fails reverted *everything*: no account was left behind, and only ≈ 0.0075 NEAR of gas was spent.
  - FastNEAR `is_any_signer` → 0 txs; the unfiltered history = the birth only.
- **Correction:** near-cli-rs 0.30.1 cannot build actions after DeployContract (only `skip` may follow). The near-api-js tool (SAT-084) is therefore the **primary** birth path. The CLI 4-action `with-init-call` form (also verified) is the fallback, and it would need genesis mints inside `new`. Updated: spec §5.16 and §14 (A-17, A-20); impl-plan SAT-036, SAT-084, §6 step 5, R25; checklist G-17 (now PASS) and P0-A3.
- **Gas:** prepay 200 Tgas for the birth (measured 78.2 burnt vs the ≈ 50 estimate).

## Revision 2 (post-review) — changelog

Every review finding is listed. **Fixed** = applied as the review or the orchestrator asked. **Changed** = applied in a different form; the reason is given. **Declined** = not applied (none).

| R | Status | What changed | Where |
|---|---|---|---|
| R-01 | Fixed | Approval (b) now also covers the `<team>.testnet` key: creating and funding `devN`/`rc`, the rc keyless birth, USDC storage registration and contract top-ups, within the caps. Creating or deploying `satchel.<team>.testnet` stays excluded and needs its own "yes" | H-20; impl-plan §4 step 2; checklist P0-H16 |
| R-02 | Fixed | `<team>.testnet` is created in the same sitting as choosing the name (Oct 24), before P0-A1 and P0-H4. Its creation tx is recorded. An agent may run the faucet command once the human approves. The "≥ 120 NEAR" target is replaced by a line-by-line budget of 53 NEAR, or 63 NEAR with both contingencies (D-34). It needs at most one extra faucet account | H-01, D-34; checklist P0-H1, P0-H2; impl-plan §5.2 |
| R-03 | Fixed (superseded by R-04) | No trust window remains. The proofs use `is_any_signer` and the unfiltered ascending history, both checked on a spike account on 2026-10-21 (A-20) | D-02; spec §5.16 proofs 3–4, §7.7 |
| R-04 | **Changed** | Keyless birth (option b) is the default, with option (a) as the documented fallback. One tx from `<team>.testnet`: CreateAccount · Transfer · DeployContract · `new` · `nft_mint` ×**7**, and **no AddKey**. *Changed:* it mints 7 ids, not 6, because #7 is a pre-funded retake token (R-14, R-30) and every pre-funded id must be minted atomically. The identical batch runs on a keyless rc on Day 9, and USDC is registered afterwards | D-02, D-28; spec §5.5, §5.16; impl-plan §6 |
| R-05 | Fixed | The BTC builder computes the candidate txid first. If any record of the sending Satchel, or of a recipient Satchel, references it, the builder perturbs the tx (fee +1 sat, then nSequence `fffffffd`↔`fffffffe`) and re-checks. Output order is randomized by default. Test INV-32. D-04 gains case 3, and the README "does not cover" text changes | D-04; spec §4 T12, §7.7, §8.2, §8.7 |
| R-06 | **Changed** | *Changed from the boolean to three values:* `NEXT_PUBLIC_CONTRACT_ROLE = dev \| rc \| final`. On dev, lock and code-hash failures become a visible "DEV CONTRACT" warning and every other check still gates Buy. rc and final run the strict gate. rc is born keyless with the final wasm, so a boolean would have skipped exactly the code-hash check that rc exists to rehearse | D-30; spec §7.3, §8.4 |
| R-07 | Fixed | Judge routes render their facts blocking (`instant = false`, A-18) with ids 1–7 prerendered, and have a fallback. The acceptance criterion uses an AI fetch tool (WebFetch), checked on Days 2–3 (SAT-215) | D-31; spec §8.1 |
| R-08 | Fixed | FastNEAR `POST /v0/transactions` is the canonical NEAR tx proof. NearBlocks pages are links only, and `docs/evidence/*.json` is the offline copy. `tools/monitor.sh` re-runs every README command daily Nov 14–19. Plain RPC `tx` is never cited for a tx older than a day | D-10; spec §8.3, §8.8 |
| R-09 | Fixed | SAT-085: the scripted rc scenario (sign without broadcast → list → `blocked` → delist → broadcast → relist → `clean` → buy; stale `expected_sig_count` → `ERR_LISTING_CHANGED`; one BTC record `spent`) | spec §12.4; impl-plan SAT-085 |
| R-10 | Fixed | SAT-073 adds a failing Circle buy (`SuccessValue "0"`, balance unchanged) and a direct `ft_on_transfer` call. P0-R4 now tests Circle's refund path with the pay spike's receiver (needs the human's OK). Fallback: `usdc: None` | D-27, H-26; checklist P0-R4 |
| R-11 | Fixed | Workspace reproducible build plus local `near contract verify --use-contract-source-code-path` on dev on Day 4 (SAT-035), repeated on rc on Day 9 (SAT-081/082) | spec §5.2, §5.16 |
| R-12 | Fixed | #3 has an EVM-only history. The BTC `spent` row is shown on #5, which the video doesn't use. Cut-off DP9: if #5's BTC tx is unconfirmed on Nov 12 at 06:00 UTC, list #6 (EVM-only) for judges instead. The video depends on no BTC confirmation | D-32; impl-plan §5.4, §8 |
| R-13 | Fixed | #4's blocking record is an EVM tx with nonce = current + 1, which can't be mined. "Broadcast now" pre-checks the nonce. The README explains it | D-32; spec §7.6 |
| R-14 | Fixed | A testnet4-capable wallet must be confirmed by Oct 24 (H-23). Otherwise, from Nov 1, large UTXOs are claimed into dev1 #1 and fanned out with the product's own BTC send (SAT-032 `--fanout`). Funding rows now exist for rc and dev2, and #6/#7 are pre-funded. Human faucet work drops to 2 BTC claims, 1 pk910 session, 2 SOL airdrops and 3 USDC claims | D-33; checklist §4 |
| R-15 | Fixed | SAT-072 moves to S2 (Day 7). SECURITY.md is folded into SAT-110. Day 6 keeps a 4-hour S1 buffer. The 1Click clip is **cut now** (H-16, confirm by Oct 31), and the prices route is cut too. S1 now carries 10.5 h of buffer | D-19, D-20; impl-plan §2 |
| R-16 | Fixed | The `nft_transfer` wrapper checks `ERR_NOT_OWNER` first. The spec records the standard's real string "Approval extension is disabled" | spec §5.7, §5.11, §5.15, INV-03 |
| R-17 | Fixed | Disclosed (threat T11); K = 1 kept on testnet | spec §4 T11, §7.4, §7.7 |
| R-18 | Fixed | The UI blocks the contract id and the MPC id as recipients. The contract guard refuses `receiver_id ∈ {current_account_id, mpc}` with `ERR_BAD_RECEIVER` (INV-30) | spec §5.7, §5.15; SAT-005, SAT-240 |
| R-19 | **Changed** | SOL: `expired` = record age ≥ 120 s and one provider reports the blockhash invalid. BTC: *no third testnet4 Esplora exists today* (Blockstream has none; `testnet4.mempool.space` is mainnet; kb/30 §TL;DR 6), so instead of a third source, a one-provider verdict is labelled "1 of 2 sources" and the human decides whether testnet Buy may proceed (H-25). Disagreement is always `unknown` | D-35; spec §7.2, §7.5 |
| R-20 | **Changed** | The record cap is removed. *Chosen variant:* BTC is checked once per distinct txid (`/outspends`), with a soft cap of 100 distinct txids per run (beyond it, `unknown` with "ask the seller to consolidate"). The cap bounds browser work; EVM is O(1) and SOL is dead by age | D-35; spec §7.5 |
| R-21 | Fixed | The disclosure is reworded. Phase-0 research notes (with reference snippets) and testnet faucet funding happened Oct 20–31. All repository code was written from Nov 1, from the KB specs, without pasting spike files (H-24) | impl-plan §4 step 6 |
| R-22 | Fixed | The card SVG shows the status pill and `sig_count` from contract state (60 s cache). Still no balances | D-23; spec §9 |
| R-23 | Fixed | BTC amounts come from the chain. The record's `amount_sats` is labelled "claimed" | spec §7.3 |
| R-24 | Fixed | The SOL classifier scans for durable nonces before the single-instruction rule | spec §5.9 |
| R-25 | Fixed | `on_payout` uses `saturating_add` and is on the panic-free checklist | spec §5.7 |
| R-26 | Fixed | INV-18 asserts the exact storage charge | spec §6 |
| R-27 | Fixed | Tests added: INV-06 BTC (SAT-022), INV-11 `records_survive_transfer` (SAT-040), INV-17 sale half (SAT-065), NEAR-listing refund and FT self-buy (SAT-071) | spec §6; impl-plan §3 |
| R-28 | Fixed | A 400 from the submission API means: fix, re-print the corrected payload, get a new "yes", then resend | impl-plan §7 step 8 |
| R-29 | Fixed | SAT-090 tags `contract-v1.0.0` on the exact commit whose reproducible hash is born | spec §5.16 step 4; SAT-090 |
| R-30 | Fixed | The gift and sale beats are screen-recorded during SAT-100. #6/#7 are pre-funded for retakes | D-32 |
| R-31 | Fixed | The chain allowlist and "no ERC-20" must be confirmed by **Nov 1** | D-15, H-13 |
| R-32 | Fixed | `new` stays non-private. In the keyless batch its caller is `<team>.testnet`. It runs in the same atomic receipt as the deploy, and `#[init]` refuses a second call | D-02; spec §5.6 |
| R-33 | Fixed | Day 1 starts at 08:00 UTC (10:00 EET). New question H-22 asks who H is and which time zones apply | impl-plan §2, §4 |
| R-34 | Fixed (self-hosting conditional) | Wallets are re-tested on Day 12 (SAT-113), and `monitor.sh` diffs the live manifest. The manifest is self-hosted only if near-connect 0.11.4 supports it (A-19) | spec §8.5 |
| R-35 | Fixed | `check-wasm-imports.sh` also runs on the reproducible wasm (SAT-035, SAT-081) | spec §12.3 |
| R-36 | Fixed | S-13, S-14 and S-15 are defined in spec §6 | spec §6 |
| R-37 | Fixed | Erratum E-36 (transfer review copy) | spec §13 |
| R-38 | Fixed | The fallback is `usdc: None` on the final contract. USDC then appears only as sandbox evidence, disclosed | D-27, H-26; spec §14 A-05 |
| R-39 | Fixed | The README gives both `shasum -a 256` and `sha256sum` | spec §5.16, §7.7 |
| R-40 | Fixed | D-29: the heirloom timelock goes to Phase 3; `@fast-auth-near/*` is unused | D-29 |
| R-41 | Fixed | Every collection is declared on Day 1 (SAT-003). Explicit dev redeploys: SAT-014, 024, 037, 064, 074 | impl-plan §3 |

**Orchestrator call: no post-listing buy cooldown.** Applied. No safety reason to keep it was found (argument and evidence in D-05). Changed: D-05, the S-6 restatement, INV-13/14, tests, UI copy and the state machine (spec §5.10, E-37), and demo timings.

**Review §3 consistency mismatches** (all 24 resolved):

| # | Resolution |
|---|---|
| 1 | Sandbox suite on the reproducible wasm: SAT-035 (dev rehearsal, Day 4) and SAT-081 (release artifact, Day 9); spec §5.2 cites both |
| 2 | A-04 cites P0-R5 and SAT-224 (SAT-H03 never existed) |
| 3 | D-10 cites SAT-001 (Nov 1), SAT-113 (Day 12) and `monitor.sh` (SAT-103) |
| 4 | impl-plan §5 cites P0-A1 for the address computation |
| 5 | `ERR_CHAIN_UNSUPPORTED` is in spec §5.9 and §5.15 |
| 6 | Tags: `contract-v1.0.0-rc1` in SAT-081 (Day 9) and `contract-v1.0.0` in SAT-090 (Day 10); the README cites the latter |
| 7 | Non-owner transfer string: "Approval extension is disabled", behind the wrapper's `ERR_NOT_OWNER` |
| 8 | Card: status + `sig_count`, no balances (D-23); the README claims only that |
| 9 | Mint front-run: impossible; ids 1–7 are minted inside the birth tx |
| 10 | Pre-funding safety: `<team>.testnet` exists before any address is funded (P0-H1 before P0-H4) |
| 11 | Approval scope: H-20(b) names `<team>.testnet` |
| 12 | Buy gate on dev: lenient mode (D-30) |
| 13 | S-13/14/15: defined in spec §6 |
| 14 | Lock-proof filter: `is_any_signer` plus the ascending unfiltered history, everywhere |
| 15 | FastNEAR key deadline: Oct 28 everywhere |
| 16 | App host deadline: Oct 28 everywhere |
| 17 | Transfer storage: +180 B / −180 B, net ≈ 0 (spec §5.4) |
| 18 | Parser size: the v1 BTC parser is unmeasured until SAT-031 (spec §5.9) |
| 19 | Fallback token: `usdc: None` on the final; `usdc.fakes.testnet` only on dev and in tests (D-27) |
| 20 | rc funding: rows in checklist §4 and impl-plan §5.3 |
| 21 | Repo layout: no ARCHITECTURE.md; `judge-snippets.sh` = SAT-102; `vectors/derive.json` = SAT-204 |
| 22 | Allowlist deadline: Nov 1 |
| 23 | MPC timeout duration: erratum E-39 (115–119 s measured) |
| 24 | Transfer review copy: erratum E-36 |

---

## Summary

| ID | Topic | Decision (one line) | Lean? | Status |
|---|---|---|---|---|
| D-01 | Callback / pending design | Safety lives in `sign_for` (records + `last_sign_height`); a panic-free, UX-only `on_signed` overwrites a pre-paid fixed-size status/signature slot; no counter | adopted | Decided |
| D-02 | Final account and accounts | **Keyless birth:** `satchel.<team>.testnet` is created, funded, deployed, initialized and minted (ids 1–7) in **one tx from `<team>.testnet` with no AddKey** on Day 10, after an identical keyless rc birth on Day 9. Develop on keyed `devN.`. Pre-fund in Phase 0 once `<team>.testnet` exists | **amended (rev 2)** | Decided, human confirm (names H-01; method and the Day-10 "yes" H-15) |
| D-03 | Client libraries | Own derivation + viem 2.57.7 + bitcoinjs-lib 7.0.4 + @bitcoinerlab/secp256k1 2.0.0 + @solana/web3.js 1.99.0; **no chainsig.js at all** | adopted (stricter) | Decided |
| D-04 | BTC unknown outpoint | Status **unfunded**, non-blocking; coins later at that outpoint are "encumbered"; the BTC builder never creates a txid that a record references (rev 2) | sides with btc | Decided |
| D-05 | Quiet period, no buy cooldown | `COOLDOWN_BLOCKS = 250` is the **quiet period** before `list` only. **No post-listing buy cooldown** (rev 2) | **amended (rev 2)** | Decided |
| D-06 | Gas / deposit constants | Attach `min(300, 60+20n)` Tgas, floor `30+18n`; MPC 15 static + weight 1; callback `10+2n`, weight 0; deposit = measured storage + n × `mpc_deposit` (default 1 yocto, cap 0.01 NEAR); UI attaches 0.005 NEAR × n | resolved | Decided (re-measure Day 4) |
| D-07 | `nft_transfer_call`, approvals | Disable `nft_transfer_call` (always panics); no NEP-178 in v1 | adopted | Decided, human confirm (H-13, Nov 1) |
| D-08 | Gifts during an in-flight sign | Not blocked by the contract; UI soft guard only | adopted | Decided |
| D-09 | Solana blockhash lifetime | Use the measured ≈ 36 s; prefetch and refresh on Review (≤ 10 s old at click) | adopted | Decided |
| D-10 | NEAR tx proofs and NearBlocks | **FastNEAR `/v0/transactions` is the canonical proof**; NearBlocks pages are links only; `docs/evidence/*.json` offline; `monitor.sh` daily Nov 14–19 (rev 2) | adopted | Decided |
| D-11 | Data architecture | No Postgres, Prisma, indexer or worker; contract views + browser queries + cached route handlers | adopted | Decided |
| D-12 | Judge / demo access | P0: blocking SSR `/s/[id]`, `/contract`, `/market` (WebFetch-checked), JSON APIs, README commands, committed evidence, monitor; the near-connect "NEAR CLI" wallet documented; **no** demo signer, **no** relay | adopted (relay dropped) | Decided |
| D-13 | Delegates (S-10) | Cut from v1 (contract and UI) | cut | Decided, human confirm (H-13, Nov 1) |
| D-14 | Sale mechanics | Atomic sale in one receipt, detached payout, re-credit to `proceeds` on failure + `withdraw_proceeds`; exact price; `buy` and the FT msg carry `listing_id` + `expected_sig_count` | adopted (hybrid) | Decided |
| D-15 | EVM scope | Native ETH, type-2 only, allowlist `{11155111}`; no ERC-20 | adopted | Decided, human confirm (H-13, **Nov 1**) |
| D-16 | Signing UX timings, signed-not-sent, retries | Thresholds 15/20/60/150 s; `signed_not_sent` + "Broadcast again" (EVM only when the nonce is next); retries reuse the EVM nonce / BTC inputs | adopted | Decided |
| D-17 | Video length | X cut ≤ 2:15 unless the posting account has X Premium | adopted | Needs human (H-09) |
| D-18 | Payload shape | `SignRequest::{Evm{unsigned_tx}, Btc{preimages, outputs}, Sol{message}}`; the contract hashes | — | Decided |
| D-19 | 1Click mainnet clip (S-12) | **Cut now** (rev 2); reversible only if the human says so by Oct 31 with funds, key and mainnet account ready | — | Decided, human confirm (H-16, Oct 31) |
| D-20 | Cut order | 1Click already cut; prices cut unless UX-1's reopened default stands (D-36) → Solana UI → dynamic card (the OG image is the brand file, D-36) → USDC buy UI → market polish → R3 polish (kb/80 R3); never-cut list below | revised (rev 2; R3 note) | Decided, human confirm (H-13) |
| D-21 | EVM nonce-gap rule | Dropped (kb/70 INV-10). **Reversed by D-43** (security review S-04) | — | Superseded |
| D-22 | Solana policy | Legacy messages only; one System Transfer; one signer; durable nonces refused (scanned first) | — | Decided |
| D-23 | Card art / `base_uri` | The brand card SVG (D-36) at `/api/card/[id].svg` with **status + `sig_count`** from contract state (rev 2); no balances, no stitch; `base_uri` fixed at birth, so the app host is final by Oct 28 | — | Needs human (app host, H-05) |
| D-24 | MPC deposit drift | Caller-chosen `mpc_deposit` (default 1 yocto, cap 0.01 NEAR); leftover gas forwarded with weight 1; no admin | — | Decided |
| D-25 | Test execution | Unit + sandbox in CI; testnet e2e is human-approved and on demand; INV-22 also on the reproducible wasm; the rc clean-history scenario on Day 9 | — | Decided |
| D-26 | Send / Transfer / Receive presentation | Real routes in v1, **presented** as a bottom sheet (< 768 px) or a 480 px dialog (≥ 768 px) over the Satchel page the route renders; no intercepting routes (amended by D-36) | — | Decided (H-19 closed by D-36) |
| D-27 | Test USDC | Circle testnet USDC on rc and final; if its refund path fails, the final is born with `usdc: None` (rev 2); `usdc.fakes.testnet` only on dev and in tests | — | Decided, human confirm (H-26) |
| D-28 | Minting | Permissionless `nft_mint`; ids **1–7** are minted to `alice` **inside the birth tx**, so nobody can mint a pre-funded id first (rev 2) | — | Decided |
| D-29 | Heirloom timelock, FastAuth | Heirloom → Phase 3; `@fast-auth-near/*` not used in v1 (new, R-40) | — | Decided |
| D-30 | Clean-history gate modes | `NEXT_PUBLIC_CONTRACT_ROLE`: dev = lock/code-hash checks as a warning; rc and final strict (new, R-06) | orchestrator | Decided |
| D-31 | Judge routes render blocking | `instant = false` + `"use cache"` + ids 1–7 prerendered; WebFetch acceptance (new, R-07) | — | Decided |
| D-32 | Demo data plan | #3 EVM-only sale; #4 blocked by a nonce+1 EVM record; #5 shows the BTC `spent` row; #6/#7 retakes; beats recorded during staging; BTC cut-off Nov 12 06:00 UTC (new, R-12/13/30) | orchestrator (#3) | Decided |
| D-33 | Funding path | Team testnet4 wallet if one exists by Oct 24; otherwise claims into dev1 #1 and fan-out with the product's BTC send (new, R-14) | — | Decided, human confirm (H-23) |
| D-34 | NEAR budget | 68 NEAR planned (83 with contingencies) instead of "≥ 120"; final birth Transfer 20 NEAR, rc 10 NEAR (revised 2026-10-23 after security review S-02); sources: `<team>.testnet` faucet + spike sweep + one more faucet account (new, R-02) | — | Decided |
| D-35 | Checker provider policy and limits | SOL dead by age + one provider; BTC per-txid `/outspends`, two providers, "1 of 2 sources" policy, ≤ 100 distinct txids per run; no record cap (new, R-19/R-20) | — | Decided, human confirm (H-25) |
| D-36 | Brand consolidation (kb/81 R3, kb/80 R3) | The brand wins on visual identity (B-01…B-11: Night + Day, brass primary once per screen, Bricolage / Instrument Sans / Spline Sans Mono, the brand card with the stitch for owners, icon + word states, one handoff moment, left nav, brand assets and OG); R2 keeps structure and behaviour; flows are routes presented as sheet/dialog; UX-1 (fiat card total) reopened | orchestrator | Decided, human confirm (H-11, H-24) |

---

## D-01 · Callback and "pending" design

**Context.**
- The plan's `pending_signs` counter with a typed `#[callback_result]` can get stuck in two reproduced ways: the callback runs out of gas, or the typed parse fails. In a locked contract that bricks the token (kb/10 §TL;DR 8; spike/mpc §6.3).
- A signature can be public even if the callback fails or the request "times out" (kb/70 F16; kb/10 §Gotchas).
- The team split three ways: sec wanted no callback (kb/70 §TL;DR 4); mpc wanted a raw-bytes callback with a display-only counter (kb/10 §Rec 4–6); web wanted the callback to store the signature and status so the UI can recover without a tx hash (kb/40 §TL;DR 8).

**Options.**
- (a) No callback; `sign_for` returns the MPC promise.
- (b) Raw callback with a display-only counter.
- (c) UX-only callback that writes status and signature into the request-time record; no counter.

**Decision: (c).**
1. `sign_for` writes the `SigRecord` and `last_sign_height` before the MPC call. That is the only state safety depends on.
2. `on_signed` uses `promise_result_checked`, cannot panic, and only overwrites `status` (1-byte enum) and `signature` (`[u8; 65]`), which `sign_for` already paid for. It therefore causes no storage growth.
3. It returns the raw MPC JSON.
4. There is no counter. "Signing" in the UI is derived from records that are `pending` and younger than 250 blocks.

**Rationale.**
- (a) leaves the UI dependent on wallet-returned hashes or indexers to find the signature. Intear rejects after 60 s with no hash, and NEAR CLI/MNW wallets return partial outcomes (kb/40 §TL;DR 4).
- (c) gives a pure-RPC "contract watcher" that works for every wallet and every device.
- No safety property depends on the callback, so a callback bug only costs UX: the signature is still in the MPC receipt, and the client has a receipt-scan fallback (spec §8.6).
- Storing the signature tells an attacker nothing new, since it is already public.

**Evidence.**
- The raw callback was immune to the garbage test; the typed callback got stuck (spike/mpc §6.3).
- Callback gas: 10 Tgas static, weight 0; measured 1.4–2.3 Tgas (kb/10 §Latency and gas).
- Fixed-size overwrite = no growth (kb/20 §Never-fail callback, item 3).

**Consequences.**
- About 66 bytes more per record (≈ 0.0007 NEAR).
- Callback gas `10 + 2n` Tgas.
- INV-12 and INV-29 tests.
- kb/70 §TL;DR 4 and kb/80's counter-based states become errata (spec §13 E-04, E-05).

**Human:** no.

## D-02 · Final account: keyless birth (rev 2)

**Context.**
- The plan locked on Day 2. sdk and sec say lock late (kb/22 §TL;DR 3; kb/70 §TL;DR 9).
- The lean was to create the final account in Phase 0 and redeploy in place, so that addresses stay stable for early funding.
- sec warns that redeploying in place is unsound for clean history. A state wipe deletes records while the keys, and therefore every earlier signature, stay valid. Any full-access key on the account can call the MPC directly and sign without a record (kb/70 §Gotchas 18, §Threat o).
- Rev 1 chose a brand-new account with a ≈ 30-minute keyed session (create → deploy → six persona mints → delete keys). The review found three problems with it:
  - the window's proof used `is_signer`, which misses NEP-366 delegated signing (R-03);
  - anyone could mint a pre-funded id between the deploy and the persona mints (R-04);
  - pre-funding started before `<team>.testnet` existed (R-02).

**Options.**
- (a) The lean: create the final id now and develop in place.
- (b) Brand-new final account, born on Day 10; development on throwaway accounts:
  - (b1) keyed: create the account with a key, send one tx signed by that key with DeployContract + `new` + `nft_mint` ×7, then delete every key (review option a);
  - (b2) **keyless birth**: one tx from `<team>.testnet` with CreateAccount, Transfer, DeployContract, FunctionCall `new` and FunctionCall `nft_mint` ×7, and **no AddKey** (review option b).
- (c) Lock an MVP contract on Day 6 and a second one later (two address sets, double funding).

**Decision: (b2) keyless birth; (b1) is the documented fallback** (spec §5.16).
1. **Phase 0.** Choose the names and create `<team>.testnet` in the same sitting (Oct 24, H-01). Record its creation tx. Check that `satchel.`, `rc.` and `dev1.<team>.testnet` don't exist (`view_account` → unknown account; FastNEAR `/v0/account` → `txs_count: 0`).
2. **Phase 0.** Compute the final, rc and dev1 addresses (derivation needs only the account id: kb/11 §Verified facts) and fund them (D-33).
3. **Day 9 (SAT-082).** Birth `rc.<team>.testnet` with the identical batch (Transfer 5 NEAR) and the same wasm H. Run the strict-gate e2e and the clean-history scenario (SAT-085). Run `near contract verify --use-contract-source-code-path`.
4. **Day 10 (SAT-090).**
   - The final batch is printed with `sign-later` and reviewed: 11 actions, no AddKey.
   - The human types "yes" (H-15).
   - The batch is sent, and USDC is registered afterwards from `<team>.testnet`.
   - The proofs go to `docs/evidence/birth.json`.

**Rationale.**
- **No trust window at all.** "This account never had a key" follows from one tx (no AddKey) plus the current empty key list, an empty `is_any_signer` history and an ascending history that starts at the birth (spec §5.16 proofs 1–4). INV-22 adds that the wasm imports no add-key, deploy or delete-account host functions.
- **No mint race.** Ids 1–7 are minted in the same receipt as the deploy.
- **Fewer lock-day steps.** No `delete-keys` step, which is where the CLI printed a false error (kb/22 §TL;DR 6).
- **`new` stays non-private (R-32).** In the batch its caller is `<team>.testnet`. It runs in the same atomic receipt as the deploy, and `#[init]` refuses a second call.
- **The cost:** a wrong init argument can never be fixed. That is why the identical batch runs on rc first. A *failed* batch reverts everything and leaves no account, so it can be fixed and re-sent.

**Evidence.**
- Create/deploy/lock commands and a bit-identical reproducible build were rehearsed (kb/22 §Verified facts).
- After CreateAccount, the receipt acts with the new account's permissions (the factory pattern), and FunctionCalls keep the tx signer as predecessor. Protocol acceptance of the full batch and its atomicity were **VERIFIED on testnet on 2026-10-21** (`research/spikes/keyless-birth/RESULTS.md`: 11 actions, no AddKey, 78.2 Tgas; a failing mint reverted the account creation). near-cli-rs 0.30.1 cannot build it, so the near-api-js tool (SAT-084) is the primary path.
- The near-cli-rs 0.30.1 grammar (`construct-transaction … add-action …`, `sign-later`, `print-transaction`, `sign-transaction`) was checked with `--help` on 2026-10-21 (spec §5.16).
- FastNEAR checks on `lock1.satchel-spk-sdk-e9ea1a.testnet` (2026-10-21): `{"desc":false}` lists the creation tx first; `is_any_signer` lists exactly the deploy and delete-keys txs (A-20).
- Gas: ≈ 50 Tgas burnt (est.) of 170 Tgas prepaid, against the 1 PGas tx limit; the tx is ≈ 260 KB against 1.5 MiB (spec §5.5).

**Repo-public interaction.**
- `cargo near build reproducible-wasm` needs only a clean, committed tree, and the image embeds the repo URL and commit (kb/22 §TL;DR 7).
- `near contract verify --use-contract-source-code-path ./` works from a private checkout (kb/22 §TL;DR 8), so it is rehearsed on dev (Day 4) and rc (Day 9).
- Third-party verification from the public repo (`verify deployed-at`, NearBlocks "Verify and Publish") runs on Day 13. The README carries hash H from Day 10.

**Consequences.**
- rc is keyless and permanent: its 5 NEAR stay locked. rc2 is created only if SAT-083 needs a second rehearsal (D-34).
- dev accounts are keyed and run the lenient gate (D-30). The backup video (Day 6) runs on dev.
- Every contract feature must be in the Day-9 contract freeze. SOL, USDC and the sale are front-loaded into Days 4–8.
- If the batch fails on rc with the real wasm, fall back to the CLI 4-action form (genesis mints in `new`), then to (b1). The README then discloses the key window: "the account held a key for N minutes and signed only these two txs".

**Human:**
- Pick the names and create `<team>.testnet` in the same sitting by **Oct 24** (H-01).
- Confirm keyless birth as the method by **Oct 31** (H-15).
- Type the explicit "yes" before the final batch is sent on Day 10 (H-15).

## D-03 · Client libraries

**Context.** chains pinned chainsig.js 1.1.16 together with bitcoinjs-lib 6.1.9 and web3.js 1.99 (kb/11 §Rec). The btc agent showed that chainsig's BTC adapter:
- sets no RBF;
- overpays fees 1.6–3×;
- cannot expose preimages;
- nests bitcoinjs-lib 6 (kb/30 §TL;DR 9, §Gotchas).

chainsig.js is also about 2 MB gzip, cannot be tree-shaken and defaults to the deprecated near.org RPC (kb/41 §TL;DR).

**Decision.** An own derivation module (`@noble/curves 2.4.0`, `@noble/hashes 2.4.0`, `@scure/base`, viem `publicKeyToAddress`; 29 KB gzip, verified identical: kb/11 §Snippet A), plus:
- viem 2.57.7 (EVM; the viem-only flow is byte-identical to chainsig, kb/31 §Real MPC-signed tx);
- bitcoinjs-lib 7.0.4 + @bitcoinerlab/secp256k1 2.0.0 (BTC);
- @solana/web3.js 1.99.0 (SOL, P2).

chainsig.js is **not** a dependency, not even as a test oracle. The oracles are the KB vectors and the live MPC `derived_public_key` view, which is a stronger, first-party oracle (kb/70 F19).

**Consequences.**
- No Buffer/crypto polyfill headaches. Chain libraries are lazy-loaded.
- We write about 200 lines of BTC helpers from the kb/30 recipes (re-written; spike files are never pasted).
- kb/11's pins become errata (E-12).

**Human:** no.

## D-04 · BTC "unknown outpoint" in clean history (rev 2: case 3)

**Context.**
- sec treats a logged outpoint whose parent tx returns 404 as **live**, which blocks the sale (kb/70 §P2, §Gotchas 3).
- btc treats it as pending/NOT_CREATED, because blocking forever on a mistaken or never-created parent freezes sales permanently (kb/30 §7).
- The brief asked for a threat argument, given that a seller can pre-sign a spend of a deposit tx whose txid they know before broadcasting it (segwit txids don't depend on witnesses).

**Threat argument.** Let F be the unbroadcast parent and R a logged signature that spends F:v.
1. **F spends a Satchel UTXO U.** Then F itself needed a Satchel signature, which is **logged** with outpoint U. U is unspent, so that record is `unused` and the sale is blocked. Settling U kills F, and with it R.
2. **F spends only the seller's own coins.** Then F's output does not exist at purchase time and is not part of the balance the buyer pays for. If F appears after the sale, the seller can take back exactly the coins F added, nothing the buyer owned.
3. **F is a tx the buyer later builds with the Satchel UI (R-05).**
   - Without countermeasures the builder is deterministic: largest-first selection, nVersion 2, nSequence `fffffffd`, nLockTime 0, fee `max(2, halfHourFee)` (a constant 2 sat/vB on testnet4 today), and change back to the Satchel (kb/30 §1, §6).
   - A seller who expects a payment ("send me 10,000 sats from it") can predict its txid T and pre-sign a spend of the change outpoint (T, 1). At purchase, (T, 1) returns 404, so the record is `unfunded` and doesn't block.
   - **Fix:** the builder computes the candidate txid before any signature is requested. If any record of the sending token references it, or any record of the recipient token when the recipient is a Satchel, it perturbs the tx (fee +1 sat up to 3 times, then nSequence `fffffffd`↔`fffffffe`, both within the contract policy) and re-checks. Output order is randomized by default. With no free candidate it refuses (spec §8.2; INV-32).
4. **A mempool-visible F** makes `/tx/:txid/outspends` answer, so its outpoint is checked normally and is `unused`, which blocks.
5. **Coins from another wallet** that land on a referenced outpoint can't be prevented. They are excluded from the Verified balance as "encumbered", and the README says so (threat T12).
6. **Blocking on 404 has a real liveness cost.** An RBF-replaced parent of an unconfirmed chain makes its child's outpoint never exist, which would freeze that Satchel forever.

**Decision.**
- `unfunded` (404 parent or out-of-range vout) is **non-blocking**.
- The Verified balance excludes any UTXO whose outpoint a non-dead record references ("encumbered").
- The BTC builder's collision rule above (case 3), with randomized output order.
- The UI explains `unfunded` rows, and the README disclosure lists cases 3 and 5 (spec §7.3, §7.7).
- Requests still use the completeness shortcut: any input spent ⇒ the whole request is dead.

**Evidence.**
- Live verdicts DEAD/LIVE/NOT_CREATED/BAD_VOUT (spike/btc §14).
- The Esplora trap: an unknown txid returns `spent:false` from `/outspend/:v` (kb/30 §TL;DR 12), so the checker uses `/tx/:txid/outspends`, which returns 404 for an unknown txid (spec §7.2).

**Human:** no (an engineering call; disclosed).

## D-05 · Quiet period; no post-listing buy cooldown (rev 2)

**Context.**
- The plan says 200 blocks in B2 and 210 in S-6; sec says 210; mpc says 250 (kb/10 §Rec 6).
- Rev 1 used one constant for both the quiet period (`list`) and a buy cooldown.
- The review noted that the buy cooldown costs ≈ 140 s per sale and isn't needed for safety (review §6.5). The orchestrator asked to drop it unless there is a safety reason to keep it.

**Analysis: why the buy cooldown can go.**
1. kb/70 states it directly: "Neither timer is needed for safety" (kb/70 §Notes on the hard cases (g); also §TL;DR 7: "The cooldown is not what makes a sale safe"). Safety comes from the freeze while listed, request-time logging and the state-bound buy.
2. The **quiet period** keeps that argument valid without a cooldown. No signature can still *arrive* once a listing exists:
   - yield 200 blocks;
   - callback ≈ 3–5 blocks;
   - a late `respond` up to ≈ 215 blocks (nodes' 10-block stale threshold + 10 s retry);
   - all of which are < 250 blocks (kb/10 §Rec 6).
3. `sign_for` is frozen while listed (INV-13), so the record set is final for the life of the listing. A delist and relist yields a new `listing_id`.
4. `buy` binds `(listing_id, expected_sig_count)`. If the buyer's view was stale (RPC lag of 1–3 s, kb/10 §Gotchas), the buy fails `ERR_LISTING_CHANGED`. Staleness can make a buy fail, never succeed against unchecked records.
5. Records are judged by chain state (nonce, outpoint, blockhash), not by signature status. A signature that becomes public late (A-13; kb/70 F16) is still covered by its record.
6. The one rationale kb/70 gives for the cooldown, "gives the buyer's check and the indexer time to settle", no longer applies:
   - there is no indexer (D-11);
   - the check runs on demand and again right before Buy;
   - point 4 covers staleness.
7. SOL records are ≥ 250 blocks (≈ 140 s) old at listing, past the 120 s age rule (D-35).

**Decision.**
- `COOLDOWN_BLOCKS = 250` (≈ 140 s at 0.554–0.573 s/block, kb/50 §Chain timing) is the **quiet period** only: `list` requires `height ≥ last_sign_height + 250`. It is exposed as `config().cooldown_blocks`, and the UI never hard-codes it (kb/80 §D5).
- There is **no post-listing buy cooldown**. `buy` and `ft_on_transfer` are valid as soon as a listing exists. The UI gates them on clean history.

**Consequences.**
- S-6 restated: "`list` fails within 250 blocks of the last sign (`ERR_QUIET_PERIOD`); while listed, `sign_for` fails `ERR_FROZEN`; `buy` works right after `list` when it carries the current `(listing_id, sig_count)`".
- INV-13/INV-14 restated, with test `sale.rs::buy_right_after_list`.
- `ERR_COOLDOWN` and `buyable_at` are removed.
- The pills are Active · Signing · For sale · Sold. The FreezeBanner loses its countdown.
- Demo and e2e sales no longer wait ≈ 140 s.
- Errata E-06 and E-37.

**Human:** no.

## D-06 · Gas and deposit constants

**Context.**
- Single-sign attach: 50 Tgas (mpc), 100 Tgas (web) or 50–100 (sdk).
- BTC: `40 + 20·n` (btc) vs a 15 Tgas floor + `unused_gas_weight(1)` with the callback at 10 Tgas and a ≥ 40 requirement (mpc).
- Deposit: exactly 1 yocto forwarded per MPC call (any excess is refunded to the *contract*), plus storage for the record (kb/40 open question 2).

**Decision.** The single table in spec §5.5:

| Constant | Value |
|---|---|
| MPC `sign` promise | 15 Tgas static, weight 1 |
| `on_signed` | `10 + 2·n` Tgas static, weight 0 |
| Contract floor | `30 + 18·n` Tgas (`ERR_GAS` before any state change) |
| Caller attach | `min(300, 60 + 20·n)` Tgas (n=1 → 80; n=2 → 100; n=4 → 140; n=10 → 260) |
| Max BTC inputs | 10 |
| Deposit | `attached ≥ measured Δstorage × 1e19 + n × mpc_deposit`, refund the excess |
| `mpc_deposit` | default 1 yocto, cap 0.01 NEAR |
| UI deposit attach | 0.005 NEAR × n |

**Rationale.**
- 15 Tgas is exactly the live minimum, and governance can raise it, hence weight 1 (kb/10 §TL;DR 5).
- The hard floor measured ≈ 5 + 15n + 10 (2 inputs: 45 OK, 40 fail; spike/btc §8). Our entry receipt does more work (records, event), so the budget is 10 plus 10 Tgas of margin.
- Attaching more gas costs nothing beyond a temporary hold (0.1 NEAR per 100 Tgas, kb/10 §Gotchas).
- A deposit > 0 still blocks function-call keys (kb/10 §TL;DR 12).

**Consequences.**
- SAT-031 re-measures on Day 4 and adjusts before the Day-9 freeze.
- INV-18 asserts the storage charge **exactly** (R-26).
- The UI copy says "needs ≈ 0.1–0.3 NEAR free while signing (refunded)".

**Human:** no.

## D-07 · `nft_transfer_call` and NEP-178 approvals

**Context.**
- During `nft_transfer_call` the receiver owns the token. It can sign, list or add delegates, then return `true` to hand the token back (kb/20 §TL;DR 7; kb/70 §(i)).
- near-contract-standards gives the resolver only 5 Tgas. A revert restores the old approvals (kb/20 §TL;DR 6, 8).
- Approvals let a NEP-178 marketplace move a token outside Satchel's sale flow, or an accomplice front-run a buyer (kb/70 §(i)). `nft_key` shows how easy it is to break approved transfers in a hook (kb/01 §Gotchas 3).
- No NEAR NFT marketplace is live on testnet (kb/01 §TL;DR 8).

**Options.**
- (a) Support both, with an in-flight lock and a hand-written resolve ≥ 20 Tgas (~0.5 day + tests).
- (b) Disable both.

**Decision: (b).**
- `nft_transfer_call` exists and always panics `ERR_TRANSFER_CALL_DISABLED`.
- NEP-178 is not implemented (approval prefix `None`).
- The `nft_transfer` wrapper checks `ERR_NOT_OWNER` first. Behind it, near-contract-standards 5.29.1 would panic "Approval extension is disabled" for a non-owner (`core_impl.rs` L222; R-16).
- It also refuses the contract itself and the MPC account as receivers, `ERR_BAD_RECEIVER` (R-18). Either would strand the token's funds forever.
- Two ownership-change paths remain: `nft_transfer` and the internal sale transfer.

**Rationale.**
- It is the simplest safe option. It removes the transfer-call window, the 5 Tgas resolve trap, approval restoration and the accomplice attack.
- It saves S1 about 4–5 hours and removes contract surface from an immutable contract.
- Wallets transfer NFTs with `nft_transfer`, and MyNearWallet lists tokens via NEP-181 + metadata (kb/01 §NEAR NFT ecosystem).
- The README states it as a security decision.

**Consequences.**
- S-5 is restated: "no approvals surface".
- INV-03, INV-05 and INV-30 cover it.
- The Phase-3 design is kept in spec Appendix A.

**Human:** confirm (recommended: disable), by Nov 1 (H-13).

## D-08 · Gifts (transfers) during the quiet period or while a sign is in flight

**Context.** kb/80 disables Transfer while "Signing". The plan's hook required `pending_signs == 0`.

**Analysis.**
- Records are written at request time, so a transfer during an in-flight sign loses nothing: the record stays with the token, and `on_signed` still resolves it.
- Blocking does not stop the gift attack: the giver can sign, wait 10 s, then transfer. Gift recipients trust the giver by definition (kb/70 §Threat a).
- A contract block would need a 250-block lock after every send, which is pure UX cost.

**Decision.**
- The contract does **not** block `nft_transfer` on recent signs.
- The UI shows a soft guard: "A signature from {t} ago is still in progress. If you transfer now, it stays valid for anyone holding it." The user can proceed.
- INV-28 documents the behaviour.

**Human:** no.

## D-09 · Solana blockhash lifetime

**Context.**
- Measured lifetime: ≈ 36 s (150 blocks at 0.237 s on devnet; ≈ 32 s on mainnet). kb/70 and kb/80 say 60–90 s (kb/32 §TL;DR 3, §Deltas).
- kb/32 recommends fetching the blockhash right before the wallet popup. But an async fetch inside the click handler can trigger popup blockers (kb/40 §Gotchas 15).

**Decision.**
- Use 36 s in all timing.
- Prefetch the blockhash on the Review card and refresh it every 10 s, so the hash used at click time is ≤ 10 s old. That leaves ≥ 26 s for the wallet plus a 7 s p50 MPC sign.
- Expiry leads to the `expired` state, and **Try again** rebuilds the tx.
- The checker's SOL rule is "age ≥ 120 s and invalid" (D-35).
- Errata E-01 and E-30.

**Human:** no.

## D-10 · NEAR tx proofs and NearBlocks (rev 2)

**Context.**
- hackathon: the NearBlocks v1 API is frozen at block 270,420,307 (2026-09-27), so pages may be stale (kb/00 §TL;DR 12).
- pay: the testnet **tx pages** rendered a minutes-old tx; v3 is current; only v1 is frozen (kb/50 §TL;DR 3).
- The review (R-08): non-archival RPC nodes keep only ≈ 32–40 h of blocks (kb/50 §TL;DR 4, §Gotchas 8), and the archival endpoint answered 429 from a shared IP (kb/00 §Testnet RPC endpoints). An RPC `tx` proof from Days 6–11 is gone by judging (Nov 16–18).

**Decision.**
- **FastNEAR `POST https://tx.test.fastnear.com/v0/transactions`** (keyless, full receipts and logs) is the canonical proof for every NEAR tx in the README and on `/contract`. `/v0/account` backs the history proofs (spec §5.16).
- NearBlocks tx pages are **links only**. The app never calls the NearBlocks API.
- `docs/evidence/*.json` stores the FastNEAR outcome of every proof tx for offline judges.
- Plain RPC stays for **state** views (account, keys, `call_function`), which don't expire. RPC `tx` is never cited for a tx older than a day.
- Re-checks: Nov 1 (SAT-001), Day 12 (SAT-113), and daily Nov 14–19 through `tools/monitor.sh` (SAT-103).

**Human:** no.

## D-11 · Data architecture

**Context.** The plan has Postgres + Prisma + one worker. pay says nothing is needed for the MVP: every input is keyless and CORS-enabled; a block follower can't keep up on free tiers (neardata 30 blocks/min vs ≈ 105 produced); Vercel Hobby cron runs once a day; the `prisma` CLI's `latest` tag is an RC (kb/50 §TL;DR 1, 4, 8, 9).

**Decision.**
- No DB, no ORM, no indexer, no worker.
- Trusted facts come from contract views. Balances and history come from live browser or route-handler reads, cached 15 s.
- Activity combines the FastNEAR tx API with chain explorers.
- Clean history is computed on demand (spec §9).

**Consequences.**
- No "broadcast while the tab is closed" relay (D-12).
- The Activity tab for old events relies on the FastNEAR tx API (keyless today; server key, A-08).

**Human:** no.

## D-12 · Judge and demo access (rev 2)

**Context.**
- AI judges see only server HTML and cannot use wallets (kb/00 §TL;DR 10).
- web proposed a P1 server-key demo signer with an allowlist, a rate limit and a kill switch (kb/41 §Judge and demo access).
- ux proposed a server broadcast relay (kb/80 §D9).

**Decision.**
- **P0:**
  - blocking server-rendered `/s/[id]`, `/contract` and `/market` with every fact in the visible HTML, checked with an AI fetch tool (D-31);
  - `GET /api/satchels/[id]` and `/api/contract`;
  - README "do X → see Y" commands with curl and near CLI forms, NEAR tx proofs through FastNEAR (D-10);
  - `docs/evidence/` JSON for offline judges;
  - a public CI run;
  - `tools/monitor.sh` daily Nov 14–19.
- **P1:** document the near-connect "NEAR CLI" wallet for technical judges (zero code).
- **Not built:**
  - the demo signer (a full-access key in Vercel env, abuse surface, ≈ 5 h);
  - the relay (needs a worker; Hobby cron is daily).

On-chain signature storage (D-01) plus "Broadcast now" covers stranded signatures without a relay.

**Human:** no.

## D-13 · Delegates (S-10)

**Context.**
- Capped delegates need on-chain amount parsing, day windows, epoch invalidation, a revoke method and an Access tab.
- BTC delegates were impossible from preimages alone (kb/70 §(m)).
- The plan's cut order puts delegates third. They mainly serve the `security` track, which Satchel doesn't target (kb/00 §Tracks).

**Decision.**
- Cut from v1 in both the contract and the UI.
- `delegate_epoch` disappears.
- The design is kept in spec Appendix A.

**Rationale.**
- It saves about 1.5 engineer-days and removes contract surface before the freeze.
- The core novelty is the verifiable sale (kb/01 §TL;DR 2).

**Human:** confirm (recommended: cut), by Nov 1 (H-13).

## D-14 · Sale mechanics

**Context.**
- pay wants escrowed proceeds + withdraw (kb/51 §TL;DR 5).
- The plan's S-7 says "seller paid … in one transaction".
- sec wants claimable proceeds because the NEAR payout is a separate receipt (kb/70 §Deltas 17).
- Both agree on `listing_id` + `expected_sig_count` (kb/70 §(g); kb/51 §S-8 sketch).

**Decision.**
1. Every sale effect happens in **one receipt**: ownership, listing removal and the event.
2. That receipt starts a **detached** payout: a NEAR transfer, or USDC `ft_transfer` with 1 yocto. `on_payout` re-credits `proceeds[(seller, currency)]` with `saturating_add` if the payout fails, and never panics (R-25).
3. `withdraw_proceeds(currency)` is the fallback.
4. The price must match exactly (`attached == price`, `amount == price`). Any mismatch panics and refunds.
5. `buy(token_id, listing_id, expected_sig_count)`; FT msg `{"buy":{"token_id","listing_id","expected_sig_count"}}`. No cooldown (D-05).
6. `ft_on_transfer` checks that the predecessor is the configured USDC. It refuses a NEAR-priced listing (`ERR_CURRENCY`) and a seller buying their own listing (`ERR_SELF_BUY`).

**Rationale.**
- The seller is paid within the same tx's receipts in the normal case, so S-7 holds.
- Failures can't create "ghost funds", because the payout is never the promise `ft_on_transfer` returns (kb/51 §TL;DR 5, Oct 1 incident).
- An exact price avoids excess accounting.

**Human:** no.

## D-15 · EVM scope

**Decision.**
- Type-2 transactions only.
- `chainId == 11155111` only.
- `to` must be 20 bytes; empty calldata; empty access list.
- No ERC-20 in v1.

**Rationale.**
- This blocks EIP-7702 authorizations (`chain_id 0`), permits, EIP-712, cross-chain replay and contract calls (kb/31 §Security notes; kb/70 §(c)–(d)).
- Native transfers are all the demo needs.

**Consequences.**
- The same EOA on other chains is a "black hole": the UI shows "Sepolia only" (kb/70 §Gotchas 15).

**Human:** confirm the allowlist `{11155111}` (alternative: add Base Sepolia 84532 / Arbitrum Sepolia 421614) and "no ERC-20" by **Nov 1** (H-13). The classifier is written on Day 2 (SAT-010) and compiled into the immutable contract, and the checker's providers are Sepolia-only (R-31).

## D-16 · Signing UX timings, signed-but-not-broadcast, safe retry

**Context.**
- Measured latency: p50 6.7 s, p90 7.4 s, max 12.8 s via the contract; direct-call median 8.7 s; timeout ≈ 115–120 s (kb/10 §Latency; kb/40 §TL;DR 5).
- The plan's copy said "Usually under a minute" at 30 s.
- ux added the missing `signed_not_sent` state (kb/80 §D9).

**Decision.**
- Copy thresholds:
  - 0–15 s: "Usually about 10 seconds."
  - ≥ 20 s: "Taking longer than usual."
  - ≥ 60 s: "Still working. The network allows up to about 2 minutes."
  - ≥ 150 s: "Still waiting… we'll keep checking."
- Show "timed out" only when the record is `failed` or the tx outcome confirms it. Fall back to `unknown` at h0 + 250.
- The `signed_not_sent` state offers "Broadcast again", rebuilt from local data or from on-chain records and events. EVM "Broadcast now" first checks that the record's nonce equals the pending nonce count; otherwise it explains the nonce gap (spec §7.6).
- **Retries reuse the same EVM nonce and the same BTC input set.** A new send is blocked while an older intent for the same chain is unsent, so at most one signature per intent can ever be spent (spec §8.7).
- Never say "no signature exists" (kb/70 F16).

**Human:** no.

## D-17 · Video length

**Decision.**
- The X upload is ≤ 2:15. The non-Premium limit is 140 s (kb/00 §TL;DR, X post requirements). Use the kb/80 §Demo video beats, without the cooldown speed-ramp (D-05).
- An optional longer cut on YouTube can be linked from the README and the post.

**Human:** check whether the posting account has X Premium (H-09) by Oct 31.

## D-18 · Payload shape (structured payloads; BTC outputs)

**Context.** sec, chains, btc and hackathon all agree that hash-only signing makes Satchel a blind signer (kb/70 §TL;DR 1; kb/01 §Gotchas 1; kb/31 §Security notes; kb/30 §7).

**Decision.**
- `SignRequest::Evm{unsigned_tx} | Btc{preimages, outputs} | Sol{message}`. The contract classifies the request and computes the hash itself.
- BTC additionally requires the serialized `outputs` (checked against hashOutputs), the completeness check and the hashSequence check. That lets anyone rebuild a logged BTC tx and lets the UI show what an unused signature would pay.

**Evidence.**
- Narrower spike parsers added ≈ 7.9 KB of wasm and < 0.2 Tgas; 19/19 Rust/JS vectors agree (kb/70 F8–F10). The v1 multi-preimage BTC parser is measured in SAT-031.
- On-chain sha256d equals bitcoinjs (spike/btc §8).

**Human:** no.

## D-19 · 1Click mainnet clip (S-12) — cut now (rev 2)

**Context.** The clip needs:
- an **unlocked mainnet** Satchel deployment;
- a mainnet account with ≈ 6 NEAR;
- ≈ 3 USDC + $1 of ETH on Arbitrum;
- a partner key.

Every one of those mainnet actions requires a human (kb/51 §S-12 checklist; HACKATHON.md). 1Click is mainnet-only. Rev 1 kept a Day-9 go/no-go, which tied up 5.5 S1 hours and 2 H hours on the release days (R-15).

**Decision.**
- **Cut now.** Remove SAT-093 and SAT-101, the `/api/oneclick/*` routes and `ONECLICK_API_KEY`. The freed S1 hours become buffer on Days 10–11.
- The design stays in spec Appendix A (Phase 3).
- **Reversal:** only if the human says so by **Oct 31** and has the mainnet account, funds and partner key ready. The work then comes out of the S1 Day-10/11 buffer, and a human does every mainnet action.

**Human:** confirm the cut by Oct 31 (H-16).

## D-20 · Cut order (rev 2)

**Context.** The plan's order is Solana, 1Click, delegates, dynamic SVG, BTC; never cut transfer = control and freeze/cooldown. Research changed four things:
- BTC is de-risked (real fan-out signatures, kb/30).
- Delegates are already cut (D-13).
- 1Click is mainnet-only and needs human funds, and is now cut (D-19).
- The prices route is cut too (USD stays hidden in v1; kb/80 §TL;DR).

**Decision.** Already cut: 1Click clip, prices. Then, in this order:
1. Solana **UI** (DP7; the contract classifier ships if its tests pass by the Day-9 freeze).
2. OG image and the dynamic part of the card (the static seeded card stays).
3. USDC buy **UI** (the contract path ships if tested; or `usdc: None`, H-26).
4. Market polish (keep a plain list).

**Never cut:**
- mint;
- BTC + ETH send;
- transfer = control;
- list / freeze / quiet period / buy with NEAR;
- clean history for EVM + BTC (the headline novelty, plan Recommendation 4);
- the keyless final contract;
- the blocking SSR judge pages and JSON;
- the README with verified commands.

**Amended by D-36 (R3).** Item 2 is now the dynamic card only: the site-wide OG image is the brand's `og-image.png` (no generation work). If UX-1's reopened default stands on Oct 31, the prices route returns as P1 and is the last R3 cut. kb/80 R3 appends its cuts after item 4: A-09 overflow menu → A-04 home stack → the Day switch-on (the app stays Night) → prices ("{n} chains").

**Human:** confirm (recommended as above) with H-13.

## D-21 · Drop the EVM nonce-gap rule

**Context.** kb/70 proposed `nonce ≤ max_signed + 1`, mainly so delegates couldn't pre-sign far-future nonces (INV-10).

**Decision.** Drop it in v1. **Reversed on 2026-10-23 by D-43** (security review S-04): the poison travels with the token, so it is not only "the owner's own" problem.

**Rationale (original).**
- There are no delegates.
- A far-future nonce only blocks the owner's own sale, and the checker still reports it as unused. Demo token #4 uses exactly that on purpose (D-32).
- On dev accounts a state reset would brick EVM signing under that rule (kb/70 §Gotchas 18).

**Human:** no.

## D-22 · Solana policy

**Decision.**
- Legacy messages only.
- `numRequiredSignatures == 1`.
- Exactly one instruction: System Transfer.
- v0, ComputeBudget, ALTs and multi-signer messages are refused.
- The durable nonce (`04000000` as the first instruction) is refused **first**, so its vector names `ERR_SOL_DURABLE_NONCE` (R-24).

**Rationale.**
- The UI builds legacy transfers (web3.js `Transaction`, kb/32 §Send SOL).
- The smallest parser is the safest for an immutable contract.
- Every SOL signature then dies with its blockhash.

**Human:** no.

## D-23 · Card art and `base_uri` (rev 2)

**Decision.**
- A seeded SVG (kb/80 §SatchelCard) served at `/api/card/[id].svg`. NFT `media = "{id}.svg"` is relative to `base_uri`, which is set at birth.
- It shows the **status pill and `sig_count`** read from contract state, cached 60 s (R-22). That is the honest "dynamic NFT" claim: the image tracks the NFT's on-chain wallet state.
- No balances, so no stale numbers end up in wallet caches (kb/80 §OQ7).
- MyNearWallet shows only tokens with non-null metadata (kb/01 §NEAR NFT ecosystem).

**Consequences.** `base_uri` is immutable after the birth. The **app host must be final before Day 9** (the rc batch is identical): a Vercel project name or a custom domain.

**Amended by D-36 (R3).** The art is the brand card (kb/80 R3 §SatchelCard): the brass band with the name and the status pill, "{n} signatures" where the in-app total sits, the chain marks, the Night body in the token's leather; no balances, no stitch, no owner.

**Human:** pick the app host / Vercel project name (H-05) by Oct 28.

## D-24 · MPC drift protection without an admin

**Decision.**
- Forward leftover gas to the MPC (weight 1).
- The caller sets `mpc_deposit` (default 1 yocto, cap 0.01 NEAR).
- No admin, no upgrade path.
- Disclose that a breaking change to the MPC arguments would strand the immutable contract.
- Ask the MPC team about stability through Nov 18 (H-14).

**Evidence:** kb/70 §(j) option table; kb/10 §Deltas.

**Human:** asking the MPC team is a human action (H-14).

## D-25 · Test execution (rev 2)

**Decision.**
- CI runs Rust unit tests, the sandbox suite (with the cached sandbox binary), `check-wasm-imports.sh`, web typecheck/lint/unit tests and `next build`.
- The sandbox suite and `check-wasm-imports.sh` also run on the **reproducible** wasm: on dev in SAT-035 (Day 4) and on the release artifact in SAT-081 (Day 9) (R-11, R-35).
- The keyless-birth batch has its own sandbox test (SAT-036, INV-31).
- Testnet e2e (`tools/e2e`) is run by an engineer under the standing approval on Day 1, Days 3–5, Day 9 and Day 10. It includes the rc clean-history scenario (SAT-085, R-09) and the failing Circle buy (SAT-073, R-10). It is **not** nightly, because CI would need signing keys as GitHub secrets.
- Playwright runs against the hosted URL; an AI fetch tool checks the judge pages on Days 2–3 and 12 (SAT-215).

**Human:** standing approval (H-20).

## D-26 · Send / Transfer / Receive presentation

**Decision.**
- Full-page routes in v1, with a mobile layout styled like a sheet.
- They deep-link from the README and remove the intercepting-route and resume edge cases (kb/80 §IA notes; kb/41 §Next 16 `<Activity>`).

**Amended by D-36 (R3, B-08).** The routes stay (deep links, SSR, resume), but they are **presented** as a bottom sheet below 768 px and a centred 480 px dialog from 768 px, over a dimmed Satchel page that the route renders itself (no intercepting routes). Sell opens at `/s/[id]/sale?list` and Mint over Home. Cost ≈ +1 h (the FlowShell).

**Human:** none (H-19 closed by D-36).

## D-27 · Test USDC (rev 2)

**Decision.**
- The `usdc` of rc and of the final contract is Circle testnet USDC (`3e2210e1…b8af`), the "real" testnet USDC with a faucet (kb/51 §TL;DR 1). rc must use the same init arguments as the final.
- Circle's refund path is tested twice. P0-R4 (Phase 0, with the pay spike's receiver; needs the human's OK) and SAT-073 (Day 8) check that a refused buy returns `SuccessValue "0"` and leaves the buyer's balance unchanged, and that a direct `ft_on_transfer` call fails (R-10).
- **If either fails**, the final contract is born with `usdc: None` (NEAR-only sales). USDC then appears only as sandbox evidence, and the README says so (R-38, H-26). There is no USDC demo on an unlocked side deployment.
- `usdc.fakes.testnet` (open mint, no NEP-297 events) is used only on dev deployments and in tests (kb/51 §Rec P1).

**Human:** collect Circle faucet USDC (H-08); approve the `usdc: None` fallback (H-26).

## D-28 · Minting and demo token ids (rev 2)

**Decision.**
- `nft_mint` is permissionless (the minter pays ≈ 0.007–0.008 NEAR of storage).
- Demo ids **1–7** are minted to `alice.<team>.testnet` **inside the birth tx** (actions 5–11, 0.02 NEAR each, paid by `<team>.testnet`). They are minted in order, atomically with the deploy, so nobody can mint a pre-funded id first (R-04).
- Ownership then moves with normal `nft_transfer` and sales (D-32).

**Human:** no.

## D-29 · Heirloom timelock and FastAuth (new, R-40)

**Decision.**
- The heirloom timelock (plan B2 stretch; persona Elena, near_hackathon.md Phase 3) goes to **Phase 3**. It needs an inactivity-triggered owner change that respects the freeze, clears listings and passes INV-02. None of that exists in v1 (spec Appendix A).
- `@fast-auth-near/*` (the plan's versions list) is **not used** in v1. Wallet access goes through near-connect only (spec §8.5).

**Human:** no.

## D-30 · Clean-history gate modes (new, R-06)

**Context.** Every deployment before the final was keyed in rev 1, so the `unsafe` rule disabled Buy on dev and G6/SAT-282 could not pass. The gated Buy path would have run first on the final contract (R-06).

**Decision.** `NEXT_PUBLIC_CONTRACT_ROLE ∈ {dev, rc, final}` (spec §7.3):
- **dev:** lock and code-hash failures become a visible "DEV CONTRACT: lock and code checks skipped" warning. Every other check (records, account checks, providers) still gates Buy.
- **rc:** strict. rc is born keyless with the final wasm, so the lock and code-hash checks run for real (`EXPECTED_CODE_HASH` = H). Banner "RELEASE CANDIDATE".
- **final:** strict, no banner.

**Why three values instead of the review's boolean:** a boolean would put rc in dev mode and skip the code-hash check exactly where it is meant to be rehearsed.

**Tests:** INV-33 `gate.test.ts`; SAT-085 runs on rc with role `rc`.

**Human:** no (orchestrator call: dev lenient, rc strict).

## D-31 · Judge routes render blocking (new, R-07)

**Context.** Under Suspense/PPR the resolved data arrives at the end of the document inside hidden segments, while the visible slot holds the fallback. Readability-style extractors drop hidden nodes. The spike verified only `curl` (spike/web §3; kb/41 §Reading NFT state; erratum E-40).

**Decision** (spec §8.1):
- `/s/[id]`, `/s/[id]/sale`, `/contract` and `/market` export `instant = false`, the blocking option named in the Next 16 build error (spike/web §3; semantics [ASSUMED], A-18).
- Every read goes through `"use cache"` + `cacheLife` (15 s; 60 s for `/contract`), and no Suspense boundary sits above the facts.
- `generateStaticParams()` prerenders ids 1–7.
- Each upstream read has a 1.5 s timeout; the page renders the last cached value.
- Fallback: prerendered ids plus a cached snapshot outside Suspense.
- Acceptance: an AI fetch tool (WebFetch) shows owner, addresses, status, `sig_count` and lock facts. Checked on a preview deploy on Days 2–3 (SAT-215), again on Day 12, then daily by `monitor.sh`.

**Human:** no.

## D-32 · Demo data plan (new, R-12, R-13, R-30)

**Decision.** All seven tokens are minted to `alice` in the birth tx (D-28). States at recording:

| Token | Story | Records | Notes |
|---|---|---|---|
| #1 Flagship | judge view `/s/1`, video hook | 1 ETH send + 1 BTC send (Day 10) | never listed |
| #2 Gift | alice → bob; bob sends BTC | bob's BTC send (Day 11) | beat recorded during SAT-100 |
| #3 Sale | listed 5 USDC → carol buys | **EVM-only** history (1 ETH send, settled in ≈ 36 s) | the video never waits for testnet4; beat recorded during SAT-100 |
| #4 Blocked | listed → Buy disabled | one EVM tx with **nonce = current + 1**, never sent | it can't be mined while nonce `current` is unused, and only the owner could use it; #4 must never send; the README explains (R-13) |
| #5 For sale (judges) | listed 1 NEAR, clean | 1 BTC send (Day 10), `spent` at K = 1 | shows the BTC "spent" row; DP9 cut-off below |
| #6, #7 | retakes for the sale and gift beats | — until used | pre-funded (R-14, R-30) |

- **BTC cut-off (DP9, Nov 12 06:00 UTC):** if #5's BTC tx is still unconfirmed, #5 stays unlisted and #6 (EVM-only) is listed for judges instead. The BTC `spent` row then comes from the rc evidence (SAT-085 step 4).
- **Recording:** the gift and sale beats are screen-recorded while SAT-100 performs them (Day 11). #6/#7 allow retakes on Day 12 without re-funding.
- **Freeze** the demo data after Nov 13 18:00 UTC (SAT-121).

**Human:** no (orchestrator call for #3; R-12).

## D-33 · Funding path (new, R-14)

**Decision.**
- **Wallet path (H-23 = yes by Oct 24):**
  - BTC: the human makes 2 mempool.space faucet claims (≤ 500k sats each) into the team testnet4 wallet, then sends **one** multi-output tx to every final, rc and dev1 BTC output in checklist §4.
  - ETH: one pk910 session into the team MetaMask (≥ 0.4 ETH), then one MetaMask send per address.
- **Fallback (no wallet):**
  - From Nov 1 the human claims 2 × 500k sats straight to dev1 #1.
  - From Day 5 the agent fans out with the product's own BTC send (`tools/e2e/btc.ts --fanout`, SAT-032/SAT-044) under approval (b). That doubles as an early e2e. The tool may spend unconfirmed outputs (a mempool chain), so testnet4 block gaps (kb/30 §TL;DR 7) don't block it.
  - Final, rc and dev1 outputs are funded by Day 6, leaving ≥ 4 days to confirm before the birth.
- **SOL:** the human makes two faucet.solana.com airdrops (0.5 to final #1, 0.2 to dev1 #1). AI agents may not use that faucet (kb/32 §Open questions).
- **USDC:** 3 Circle claims: 2 for carol (40 USDC) and 1 for P0-R4 (20 USDC to the pay spike).
- **Agent caps (H-20 b):** ≤ 25 NEAR, ≤ 0.25 Sepolia ETH, ≤ 0.01 tBTC, ≤ 1 devnet SOL and ≤ 50 test USDC per day, only between team-controlled accounts and addresses.
- rc and dev2 have rows. dev2 is funded only if needed, by fan-out from dev1.

**Rationale.** It cuts human faucet sends from ≈ 11 BTC claims to 2. The fallback depends only on code the team must ship anyway (G3).

**Human:** say by Oct 24 whether a testnet4-capable wallet exists (H-23).

## D-34 · NEAR budget (new, R-02)

**Decision** (line by line; replaces "≥ 120 NEAR"):

| Item | NEAR | Why |
|---|---:|---|
| final birth Transfer | **20** (was 10) | ≈ 2.9 NEAR code storage (≈ 290 KB × 1e19 yocto/B) + state + records; keep ≥ 5 NEAR liquid through Nov 19 (kb/22 §TL;DR 5). Raised after security review S-02: every NEP-171 transfer or sale to a new holder costs the contract ≈ 0.0025 NEAR of storage, so a griefer can drain a thin balance; `tools/monitor.sh` alerts below 3 NEAR free |
| rc birth Transfer | **10** (was 5) | same code; few records; permanent; runs the same e2e and clean-history scenario as the final (S-02) |
| dev1 | 5 | code storage + state; redeployed in place (R-41) |
| alice | 8 | signs, lists and transfers; 0.1–0.3 NEAR temporary hold per sign (kb/10 §Gotchas) |
| bob | 4 | gift recipient; one BTC send |
| carol | 8 | buys on dev/rc/final (NEAR prices ≤ 1 NEAR, paid back to alice as proceeds), USDC registration, gas |
| `<team>.testnet` operating reserve | 3 | 7 × 0.02 NEAR mints per birth batch, 3 × 0.00125 USDC registrations, CLI gas |
| buffer | 10 | contract top-ups during keep-alive, retakes |
| **planned total** | **68** (was 53) | |
| contingency: dev2 | 5 | only if a state-layout change forces it (R-41 makes it unlikely) |
| contingency: rc2 | 10 (was 5) | only if SAT-083 needs a second keyless rehearsal |
| **total with contingencies** | **83** (was 63) | |

**Sources:**
- `<team>.testnet` faucet creation: 10 NEAR.
- Sweep of the spike accounts' leftovers. Their balances on 2026-10-21 were mpc 3.40, chain 10.00, btc 6.97, sdk 4.48, web 9.97 and pay 9.38 NEAR, 44.2 in total. Keep ≈ 2 NEAR each in chain, btc and pay until P0-R1…R4 finish: ≈ 38 now, ≈ +5 later.
- At most **one** extra faucet-created account (10 NEAR), and only if a contingency triggers.
- **Revision 2026-10-23 (S-02):** the +15 NEAR for the final and rc births exceeds the sources above (≈ 53 NEAR without the contingency account). The extra faucet-created account is therefore **planned, not a contingency**, and a second one covers the contingencies. Both are human steps (faucet), like the first.

The sweep signs with spike keys, so it needs the human's OK (checklist P0-A7).

**Human:** OK the sweep (P0-A7).

## D-35 · Checker provider policy and limits (new, R-19, R-20)

**Decision** (spec §7.2, §7.5):
- **SOL:** a record is `expired` when it is ≥ 120 s old **and** at least one provider reports `isBlockhashValid == false`. It is dead by construction otherwise: durable nonces are refused, and the quiet period is ≥ 138 s (kb/32 §TL;DR 3).
- **BTC:**
  - One `GET /tx/:txid/outspends` per distinct referenced txid, on mempool.space and mempool.emzy.de, which must agree.
  - 404 ⇒ `unfunded`; vout beyond the array ⇒ `unfunded`; `spent:false` ⇒ `unused`; an unconfirmed spend ⇒ `settling`; a confirmed spend at depth ≥ K ⇒ `spent`.
  - No third testnet4 Esplora is known: Blockstream has none, and `testnet4.mempool.space` is mainnet (kb/30 §TL;DR 6). A-07 keeps looking.
- **EVM:** two counts (`latest`, `latest − 3`) per address on two providers; O(1).
- **Disagreement ⇒ `unknown`** (Buy disabled), always.
- **One provider down** (errors, not disagreement): on testnet, the verdict comes from the remaining provider and is labelled "1 of 2 sources", **if H-25 allows it**. Never on mainnet.
- **Limits:** no record cap. BTC is deduplicated per txid, with a soft cap of 100 distinct txids per run; beyond it the BTC items are `unknown` with "ask the seller to consolidate". Final verdicts are cached permanently.

**Rationale.** The rev-1 rules made every BTC/SOL token `unknown` whenever the hobby mirror was down, and froze any Satchel with > 200 records (R-19, R-20). The new rules keep "disagreement blocks" and make the one-provider case an explicit, labelled human policy.

**Human:** H-25 (testnet single-provider policy) by Nov 6.

## D-36 · Brand consolidation (kb/81 R3, kb/80 R3) (new, 2026-10-21)

**Context.**
- On 2026-10-21 Razvan created the Satchel brand and design system with Claude (`brand/`): the Strap S logo, brass and leather, Night and Day themes, Bricolage Grotesque / Instrument Sans / Spline Sans Mono, the saddle stitch for "you own this", and layout, interaction and motion rules.
- The same day, R2 (`kb/80`, `kb/81`, `kb/82`) had defined structure and a graphite, near-white visual language from a Mobbin pass. The orchestrator issued B-01…B-11 to merge them.

**Decision.** Precedence: the brand for visual identity; R2 for flows, anatomy, states and copy structure; kb/90 and this file for product facts (they override brand sample copy, per `brand/README.md`).

| # | Decision (detail in kb/81 R3 and kb/80 R3) |
|---|---|
| B-01 Themes | Brand tokens verbatim. Night by default; Day on `prefers-color-scheme: light`; a System · Night · Day override in `localStorage`, applied as `data-theme` before first paint; `color-scheme: dark light`; `theme-color` per scheme. P1 ships Night; P2 switches Day on. Contrast is verified for both themes: every brand claim reproduces; **the brand's pressed primary fails (3.80:1)**, fixed by `brand-pressed` `#B7913F` (5.53:1; UX-34) |
| B-02 Type | Brand families and styles; derived `display` 56, `section` 44, `lead` 19, `caption` 12 (marked); sentence case; mono only for addresses and hashes. `≈` comes from a self-hosted Bricolage subset (no served subset has it) |
| B-03 Actions | Brass primary once per screen (`radius-md`, not a pill), outline secondary, danger outline, disabled at 40 % with `aria-disabled` and a written reason, a 2 px focus ring at 2 px |
| B-04 Card | The brand card: brass band (name + status pill) over a leather body (total + native chips); **the stitch only when the viewer owns it**; the per-token leather hue ±12° (UX-31). The NFT SVG is the card without balances and without the stitch. **UX-1 reopened:** the card total "≈ $X · at mainnet prices", or "{n} chains" |
| B-05 States | Active · Signing · Listed (= signing paused) · Sold + Needs attention, always icon + word; the clean-history mapping in kb/81 R3. kb/90's pill label "For sale" becomes "Listed" (E-46) |
| B-06 Motion | One signature moment (the handoff: lift, 6° tilt, ≈ 700 ms spring; the stitch appears on the receiving card) + the signing pulse. Frost, the hallmark strike, materialise and the rest are gone |
| B-07 Badge | The ProofChip: `shield-check` + "Clean history" + time + link. The GateLine stays |
| B-08 Layout | Brand breakpoints and containers; a top bar below 1024 and a left nav from 1024; grids 2 → 3 columns; flows are routes presented as a sheet or a 480 px dialog (amends D-26); a global Activity route is P2 and cut by default |
| B-09 Logo and assets | The lockup at 36 px (the canvas's 30 px breaks the brand's own minimums); brand favicons, PWA icons and manifest; the brand `og-image.png` is the site-wide OG image (the generated OG work is dropped) |
| B-10 Copy | The brand content fundamentals and its corrections table (no "Safe to buy in…", the 15/20/60/150 s thresholds, no "no funds moved", measured fees, no cooldown, Listed = signing paused). kb/90 §7.3 banner strings render in sentence case with the same words |
| B-11 Disclosure | The H-24 text names the brand, logo and design system as Phase-0 design assets |

**Consequences.**
- **D-20:** the OG item shrinks to the dynamic card; prices return (P1, the last R3 cut) if UX-1's default stands on Oct 31. **D-23:** the art is the brand card. **D-26:** amended as above; H-19 is closed.
- **kb/90:** E-45 (R3 supersedes R2's visual tokens), E-46 (pill vocabulary, sentence-case strings), E-47 (the conditional fiat total vs T7, §8.3 and §9); §8.10 fonts, theme and brand assets; §10 font families; §11 brand files.
- **S2 scope:** +8.5 h vs the plan (R2: +9.0 h), shifted to P1 (+6.0 h). It needs all of S1's Day-6 buffer as pairing; the plan owner confirms (H-11).
- **Upstream:** brand issues BI-1…BI-16 (kb/81 R3) go back to the design-system artefact; `brand/` itself is never edited here.

**Human:** H-11 (the post-R3 decisions, including UX-1 reopened and UX-31…UX-34) and H-24 (the updated text), both by Oct 31.

---

## D-37 · Design and engineering defaults decided (2026-10-21, delegated by Razvan)

Razvan delegated the open design-lead questions and the engineering defaults to the orchestrator: "You decide what's best for your questions."

| Item | Decision | Why |
|---|---|---|
| UX-1 fiat total | **Native only.** No fiat anywhere. The card hero uses the R3 fallback ("{n} chains" + native chips). The prices route stays cut | Testnet coins have no value, so a dollar figure invites a "fake numbers" reading by judges. It also saves 1.5 h on the S2 lane, which has no buffer (S2 delta +8.5 h → +7.0 h) |
| UX-32 landing H1 | **"An NFT that is a wallet."** with a factual lead. The brand tagline "One strap, every chain." is not used in the app (it stays in the brand OG image and manifest) | Clearer in 3 seconds for AI and human judges; "every chain" overstates three testnets |
| UX-17 home | One column below 768; the brass-band stack is cut | scope |
| UX-33 global Activity | Cut | scope; the per-Satchel Activity tab remains |
| UX-34 pressed primary | `brand-pressed` #B7913F (5.53:1) | AA fix; report upstream |
| UX-18/21/22/23/24/25/27/28/30/31 | R3 recommended defaults | reference-backed, no extra scope |
| UX-13 Figma | Optional, not blocking | the brand canvas covers identity; kb/80 R3 wireframes cover the screens |
| H-12 confirmation policy | EVM `latest − 3`, BTC K = 1 (reorg risk disclosed), SOL age ≥ 120 s | as recommended |
| H-13 scope | D-07, D-13, D-15 (`{11155111}`, no ERC-20), D-20, D-12 confirmed | as recommended |
| H-15 method | Keyless birth (verified on testnet). The Nov 10 send still needs the human's explicit "yes" (HACKATHON.md) | as recommended |
| H-16 1Click clip | **Cut** | mainnet-only, needs human funds, not in Satchel's tracks |
| H-25 single provider | Allow testnet Buy with "1 of 2 sources" shown; disagreement always blocks | as recommended |
| H-26 Circle refund failure | Final contract born with `usdc: None`; USDC shown as sandbox evidence | as recommended |

Not delegable (HACKATHON.md "What the human decides" or human-only actions): names and emails, the payout account, faucet funding, API keys, wallets, organizer questions, X Premium, who "H" is, the testnet4 wallet, and the Nov 1 standing approvals.

## D-38 · Names and setup defaults decided by the orchestrator (2026-10-21, delegated)

Razvan: "try to fix as many of those things … by yourself".

| Item | Decision |
|---|---|
| Team account (H-01) | **`<team>` = `satchelhq`** (free on 2026-10-21; no personal data). Final `satchel.satchelhq.testnet` (keyless, Day 10), `rc.satchelhq.testnet` (keyless, Day 9), `dev1.satchelhq.testnet`, personas `alice.`/`bob.`/`carol.satchelhq.testnet`. **Wherever the docs say `<team>`, read `satchelhq`.** |
| Addresses (P0-A1) | Computed and live-checked: `research/final-addresses.md` |
| Licence (H-03) | MIT |
| Repo (H-04) | `satchel`, private under Razvan's GitHub account or org until Day 13 |
| App host (H-05) | **`satchelhq.vercel.app`** (free on 2026-10-21), fallback `satchel-hq.vercel.app`. It is frozen into `base_uri` at the Day-10 birth, so confirm the Vercel project name before then |
| FastNEAR key (H-06) | Optional: dRPC is keyless and works; add the key only if rate limits bite |
| Who is "H" (H-22) | Razvan |
| testnet4 wallet (H-23) | None assumed → **fallback F** (D-33) |
| Hardware (H-18) | This machine is an Apple M5 Pro (arm64), so the sandbox runs; any teammate on an Intel Mac uses CI or Linux |
| X Premium (H-09) | Assume none → video ≤ 2:15 |

**Still human-only:**
- Creating `satchelhq.testnet`. The faucet hit its rate limit, and the funded creation was blocked by this session's auto-mode classifier (commands in `plan/human-actions-ready.md` §1).
- Faucet funding, Circle USDC, wallets, organizer and MPC-team messages (drafted), the payout account, submission fields, and the Nov 1 approvals.

## D-39 · Implementation starts 2026-10-21, before the hackathon window (Razvan's decision)

**Context.** The plan treated any code written before Nov 1 as disallowed (kb/00: no explicit rule, but every signal says "build Nov 1–14"). Asked to choose, Razvan answered: "start working now, but don't create any git repo yet".

**Decision.**
- Implementation starts now at the project root, with no git repo until Razvan says so.
- The chain libraries live in a workspace package `packages/core` (framework-free TS) instead of `apps/web/src/lib/{derive,chains,clean-history,card}`, so that parallel agents own separate directories. This deviates from spec §8.2, by choice.
- The README disclosure (H-24) must honestly state that development began Oct 21. The old "all repository code was written from Nov 1" line no longer holds.

**Risk.** Judges may treat the project as pre-existing work. This was accepted by Razvan.

## D-40 · Solana flags and seller tab label (2026-10-22, orchestrator)

| Item | Decision |
|---|---|
| DP7, Solana | `NEXT_PUBLIC_SOL_SEND=on`: the send flow is built and tested (blockhash refresh, `expired` → Try again). `NEXT_PUBLIC_SOL_UI=off` until the cards, wallet rows and Receive page get a visual pass. The full Solana UI stays first in the D-20 cut order |
| Seller tab after a sale | Label "Sold" (receipt + proceeds/Withdraw panel). Not specified in kb/80 R3 |

## D-41 · Landing v3: new H1 and a lean page (2026-10-23, Razvan)

| Item | Decision | Why |
|---|---|---|
| Landing H1 (supersedes D-37 UX-32) | **"A wallet you can sell, with a history the buyer can check."** "NFT" moves to the subhead. "An NFT that is a wallet." stays the tagline in metadata, the OG image and the README | Positioning research (2026-10-23): the old H1 says what Satchel is but not why you'd want it, and comparable products (Emblem Vault, Tokenbound) can say the same. The new H1 states the outcome and the one thing only Satchel does |
| Landing depth | **Lean.** The landing keeps the transfer demo, one simple without/with clean-history demo and a one-line live proof of Satchel #1. The live map, the check replay, the six-rule instrument and the birth tape leave the landing; their depth sits in a collapsed "Under the hood" section (still in the server HTML for AI judges) and on `/s/1`, the sale pages and `/contract` | v2 felt crowded and mechanism-first; visitors couldn't tell what it does, what problem it solves or how it helps |

## D-42 · Landing v4: a friendlier look, light by default (2026-10-23, Razvan)

| Item | Decision | Why |
|---|---|---|
| Visual direction | **C · "Saddle and cream"**: warm saddle-tan colour fields with soft circles and arches, hang-tag illustrations, pill buttons, and one dark band that tells the catch story. The logo, brass, leather, the type families and the stitch's meaning are unchanged | v3 was "too serious and gloomy for a wallet app" (91 % of the Night fold was near-black). Three live prototypes were compared (scratchpad `landing-v4/directions/`) |
| Default theme (supersedes the brand's "Night is the default identity") | **Light is the default site-wide**, app pages included. Night stays available in the theme toggle | Avoids a flip from a light landing to a dark `/s/1` |
| Landing content | **Simulated and generic.** No live chain reads on `/`, no real accounts or transactions, no "This happened on testnet" lines; the "contract doesn't run this check" disclosure moves into the collapsed Questions | The landing is a product story; the real judge facts live on `/s/1` and `/contract` |
| Clean-history story | **Scroll-driven**: a sticky stage whose beat follows scroll progress (no scroll-jacking), stacked frames on phones, and a static complete frame under reduced motion | Easier to follow while scrolling than a busy two-column widget |
| Hero | The H1 (D-41) with one supporting line and two CTAs; the right side is a self-explaining looping animation (seller → listed → buyer checks → coins included) with a pause control | v3's hero left side was noisy and its visual static |

## D-43 · Restore the EVM nonce-gap rule (2026-10-23, orchestrator, delegated by Razvan; security review S-04)

**Context.** D-21 dropped kb/70's `nonce ≤ max_signed + 1` rule because a far-future nonce "only blocks the owner's own sale". The security review (docs/security/contract-review.md S-04) showed that the poison travels with the token: one record at nonce 2^64 − 2 (≈ 0.004 NEAR) keeps the token `unused` forever, for every later owner, because only this contract can ever advance its EVM nonce. (D-41 is the landing decision, so this is D-43.)

**Decision.** `sign_for` refuses an EVM request with `ERR_EVM_NONCE_GAP` unless `nonce ≤ max_evm_nonce + 1`, or `nonce ≤ 1` when the token has no EVM record yet (spec §5.9).
- `max_evm_nonce` is per token, in `TokenState` (`Option<u64>`), updated by every EVM record whatever its MPC outcome, and kept across transfers and sales.
- The check runs after every stateless classifier rule and before any state change.
- Mirrors: `@satchel/core/policy` (`checkEvmNonce`, `maxSignedEvmNonce`, `classifySignRequest(req, ctx)`), the web Send builder (`apps/web/src/lib/chains/send.ts` refuses to build such a request), and the shared vectors (`state.evm_max_nonce`).

**Rationale.**
- It never blocks a legitimate send: incoming transfers (faucet funding included) don't bump an EVM nonce, so a Satchel's chain nonce is at most `max + 1`; retries and replacements reuse a nonce ≤ `max`.
- The first request may use nonce 1, so demo #4's "nonce = current + 1" record (D-32) still works.
- A poison now costs one record per nonce, and the next owner can clear it by broadcasting the published signatures or signing the missing nonces.

**Cost.** A dev contract whose state is reset while keeping its account (so its derived addresses) can find chain nonces above `max + 1` (the D-21 worry, kb/70 §Gotchas 18). Use a new `devN` account after a state reset (R-41 already makes resets unlikely).

**Human:** no.

## D-44 · Satchel 2.0: the "Sticker S" brand and a rebuilt web app (2026-10-26, Razvan)

**Context.** Razvan rebuilt the brand: brand 1.0 (the Strap S, brass and leather) "read as too serious for a wallet people collect, gift and trade". He asked for the app and the website to be recreated from scratch in the new brand. A design team prototyped it, and Razvan chose from the options on 2026-10-26.

| Item | Decision | Why |
|---|---|---|
| Brand (supersedes the 1.0 identity and D-42's "Saddle and cream" direction) | **Satchel 2.0, the "Sticker S"** (`brand/`): <ul><li>a coral `#FF5C4D` tile with a white S, an ink `#1D1340` outline and a hard sticker shadow;</li><li>chain charms with faces;</li><li>Funnel Display, Onest and Geist Mono;</li><li>Day ground `#F6F5FB`, Night `#120C26`.</li></ul> 1.0 is archived in `brand/archive/v1/` | Razvan's new brand. Product facts still override its sample copy (`brand/README.md` lists the corrections) |
| Web app | **Rebuilt in 2.0 from scratch:** the landing and every app screen. Behaviour, honest copy, the signing state machine, the clean-history gate and judge-first server HTML are kept | The app audit and the 2.0 design specs |
| Landing H1 (supersedes D-41's H1) | **"Sell a wallet with everything inside. The buyer checks it first."**, set in two tones. The brand line "Stick it on. Hand it over." closes the page in the coral band | It keeps D-41's positioning in the 2.0 voice and drops "history" (testers asked "a history of what?") |
| Hero | **"The shelf":** a centred H1, then the sample card, a price tag and the buyer's check slip on a sky shelf. A 12 s loop with Pause; the server frame is meaningful | Razvan's pick of two prototypes |
| Theme (keeps D-42 over the brand's "Night follows the OS") | **Day first, whatever the OS.** Night and System stay in the toggle | Razvan |
| Night stickers | Sticker outlines use **`#8A82AE`** in Night, because the canvas ink outline vanishes on Night surfaces (1.00–1.16:1) | Razvan's pick |
| Vocabulary | <ul><li>**Give** (never "Transfer" in UI copy);</li><li>the pill **Paused for sale** (was "Listed"; this reverses kb/80 R3's retirement of "For sale");</li><li>**Stop selling** (was "Delist");</li><li>**Add coins** (was "Fund");</li><li>the clean-history labels **Used, Confirming, Not its coin** (were Settled, Settling, Foreign).</li></ul> | The 2.0 voice: hand-off language, state words |
| Structure | <ul><li>a new app home, **`/satchels`** (My Satchels); `/` stays marketing (D-42 still holds: no data on `/`);</li><li>one shell, footer and button system;</li><li>one connect label, "Connect NEAR wallet";</li><li>the card shows each chain's charm and native amount (still no fiat);</li><li>a lemon **"Yours"** sticker replaces the stitch as "you own this";</li><li>Activity and Sale get a compact header;</li><li>Buy sits in the first screen on phones;</li><li>Sell defaults to NEAR.</li></ul> | The app audit (repetition, buried Buy, no app home, a double shell on 404) |
| Motion | One signature motion: on hand-off the card **swings like a charm** (a damped 10° pendulum) and slides to the new owner. Reduced motion becomes a cross-fade. WAAPI and CSS only, so the `motion` package is dropped | Brand 2.0; performance |

**Specs.** The 2.0 design specs (tokens and components, the design spec, app screens, motion, voice and copy) are copied to `docs/design/satchel-2.0/` when the rebuild lands. `kb/81` R4 holds the tokens.

**Human:** decided by Razvan (H1, hero, theme, Night outline).

## D-45 · The website names Bitcoin, Ethereum and Solana (2026-10-27, Razvan)

**Decision.** The website says plainly that a Satchel holds **Bitcoin, Ethereum and Solana** wallets. Not every visual
needs all three.
- **Landing copy:** the hero line, What it is, How it works, Under the hood, the chains answer and the meta descriptions
  always tell the three-chain story. `LANDING_SOL = "ui"` and `LANDING_NAMES_SOL` in `apps/web/src/lib/faq.ts` no
  longer follow the app's `NEXT_PUBLIC_SOL_UI` / `NEXT_PUBLIC_SOL_SEND` flags.
- **Site description:** `copy.home.lead` names all three.
- **Visuals:** the What it is card hangs three address tags (Bitcoin, Ethereum, Solana), and the OG/Twitter image shows
  all three coin charms. The hero and How it works scenes keep two coins.
- **Unchanged:**
  - the app's own Solana surfaces (card rows, Receive, the Send picker) still follow the flags, and D-40's default is
    off;
  - "never say every chain" (D-37) still holds: the site names the three chains instead.

**Why:** each Satchel has its own Solana devnet address and the contract signs plain SOL transfers (kb/90 §5.9). Razvan
wants the product's three-chain reach to be clear.

**Open:** whether to turn on `NEXT_PUBLIC_SOL_UI` (so the app's cards and Receive also show SOL) was a separate call.
D-46 settled it the same day.

**Human:** decided by Razvan.

## D-46 · The Solana UI is on by default (2026-10-27, Razvan; reverses D-40's default)

**Decision.** Satchel shows **Bitcoin, Ethereum and Solana** throughout the app, not only on the website. In
`apps/web/src/lib/config.ts`, `NEXT_PUBLIC_SOL_UI` now **defaults to `on`**. It implies SOL send. Setting it to `off`
stays as the cut switch: it hides the Solana UI and drops Solana from the app's copy.
- **The app:**
  - the card ledger has a SOL row;
  - Inside on `/s/[id]` lists Solana with its full address, Copy, QR and Solana Explorer;
  - Add coins has a Solana tab;
  - Send has the SOL segment;
  - Mint's preview and "You get" list "Its own Solana devnet address";
  - the NFT image has a SOL chip;
  - `/s/[id]`'s meta description names the Solana address.
- **App copy** names the chains through `src/lib/copy/chains.ts` (`chainList()`), which follows the flag. This covers:
  - the My Satchels empty state;
  - the visitor sub on `/s/[id]`;
  - How it works;
  - the mint meta.
- **The landing** (D-45, always all three):
  - a third (Solana) coin hangs on the hero shelf and on the phone's charm row;
  - the first hero caption reads "Coins inside";
  - the use case reads "Sell BTC, ETH and SOL together";
  - the "Why not just send the coins?" answer says "Bitcoin, Ethereum and Solana";
  - the cost answer says "Network fees on each chain".

**Why:** each Satchel has a Solana devnet address and the contract signs plain SOL transfers. Razvan wants the
three-chain wallet to be visible wherever the product lists what's inside. The 2.0 designs already covered the SOL
states.

**Checked:** unit 340/340; Playwright 133/133. A visual sweep covered the landing, Mint, `/s/1`, Add coins (SOL), Send
(SOL), `/satchels`, `/market` and Buy.

**Human:** decided by Razvan.

## D-47 · Apply the 2026-10-29 HACKATHON.md update (2026-10-29, orchestrator, at Razvan's request)

**What changed in the rules.** The organizers added a Rules section (Q-001 to Q-017), a prize table, and "one
submission per project" in place of "per team". The live copy is `research/spikes/hackathon/snapshots/HACKATHON.raw.md`
(sha256 `9da1c4b4…69678`); the Oct 21 copy is kept next to it.

**What it settles for Satchel:**
- **Q-001: code is allowed from the announcement on 2026-10-19.** The implementation start on 2026-10-21 (D-39) falls
  inside the window, so its eligibility risk is gone. The README keeps a short, factual timeline instead of a risk
  disclaimer (H-24 reworded). Submissions still open only Nov 1–14.
- **Q-015 does not apply to Satchel** (Razvan, 2026-10-29). Project names are no longer unique; the **repository
  URL** is (a 409 now means "this repo was already submitted").
- **Q-010: testnet-only projects are eligible in every track.**
- **Q-012: keep the hosted demo up until at least 2026-11-18, ideally 2026-11-25.** Keep-alive runs to Nov 25.
- **Q-014: any licence, with a LICENSE file.** MIT is already in the repo root.
- **Q-005: list libraries, templates and AI-written code in the README.**
- **Q-017: Claude Code and Codex screen every project** (reproducibility check, feature verification, report,
  preliminary score); humans decide. A clean-clone "reproduce" run is now a release task, not only server-rendered
  judge pages.
- **Q-007:** Intents has no testnet, which agrees with cutting 1Click (D-19). **Q-008:** near-faucet.io is another
  testnet NEAR faucet for the D-34 budget.

**Still open for the organizers (H-10, narrowed):** whether one project can win both a track prize and the grand
prize, or place in two tracks; whether commits after the deadline are ignored; the payout's KYC, tax and NEAR
conversion terms; and whether the screening agents have network access (testnet RPC, explorers).

## D-48 · Agents may sign testnet transactions; the team account exists (2026-10-29, Razvan)

**Decision.** Razvan, 2026-10-29: "It's on testnet so there is no security issue. I allow you to do that. Same for the
2nd point, I allow you to sign transactions on testnet." This is a standing approval for agents to create accounts
and sign testnet transactions (it covers H-20 (b), apart from caps). It does **not** cover:
- the final keyless birth of `satchel.satchelhq.testnet` (H-15 still needs an explicit "yes");
- anything on mainnet;
- pushes, making the repo public, the X post, or the submission.

**Done the same day** (all from the spike leftovers, so no faucet was used):
| Step | Detail |
|---|---|
| Team account | `satchelhq.testnet` created with 9 NEAR from `satchel-spk-pay`, using the key prepared on Oct 21 (`ed25519:6WmrWh72…`) |
| Sweep | 19.8 NEAR swept from the spikes (each keeps 0.5 NEAR) |
| Sub-accounts | `dev1` (5 NEAR), `alice` (3), `bob` (2), `carol` (3). This is less than D-34 planned; top them up as needed |
| Contract | `dev1.satchelhq.testnet` deployed with the audited wasm `aea0b2e9…1bd6` and `new(mpc = v1.signer-prod.testnet, usdc = 3e2210e1…b8af, base_uri = https://satchelhq.vercel.app/api/card/)`; registered at USDC. **Re-created the same day with `https://usesatchel.xyz/api/card/` (D-49)** |
| Tokens | Satchels #1–#3 minted to alice; their addresses equal `research/final-addresses.md` |

**Budget left:** `satchelhq.testnet` holds about 15.8 NEAR. The rc birth (10) plus the final birth (20) need about
15 NEAR more by Day 9. Get it from near-faucet.io (Q-008) or the CLI faucet into fresh throwaway accounts, then sweep.

## D-49 · The app domain is `usesatchel.xyz` (2026-10-29, Razvan; replaces D-38's `satchelhq.vercel.app`)

**Decision.** The app is served at **`https://usesatchel.xyz`** (on Vercel). Every Satchel contract's `base_uri` is
**`https://usesatchel.xyz/api/card/`**. That covers dev1 now, and rc and the final contract at their births (where it
is immutable). `NEXT_PUBLIC_APP_URL=https://usesatchel.xyz`.

**Done the same day:**
- `dev1.satchelhq.testnet` had `satchelhq.vercel.app` in its immutable metadata, and it had no signature records or
  listings. It was **deleted (its balance went back to `satchelhq.testnet`) and re-created under the same name**:
  - same audited wasm `aea0b2e9…`;
  - new `base_uri`;
  - registered at USDC;
  - #1–#3 re-minted to alice.
- The derived addresses depend only on the account id and the path, so they are unchanged. The coins already sent to
  dev1 #1 stay usable.
- Updated: the keyless-birth runbook and tool example, the tests and the fixtures, the launch checklist (A-11, E-01)
  and `apps/web/.env.production`.

**The human still has to:**
- add `usesatchel.xyz` to the Vercel project and point the DNS at it (none existed on 2026-10-29);
- check that `https://usesatchel.xyz/api/contract` answers before the Day-9 rc birth.

## Decisions that need the human (Razvan / team)

Merged from rev 1 and review §7 (questions 1–12), with duplicates folded into the existing H-xx. Every row has a default and a deadline. "Default" means what happens if nobody objects by the deadline. H-02 and the payout account have no default, because an agent may never fill them in.

| # | Decision / action | Recommended default | Needed by | Why it matters |
|---|---|---|---|---|
| H-01 | **[decided D-38]** Team account name `<team>` → `<team>.testnet`; final `satchel.<team>.testnet`; `dev1.`, `rc.`; personas `alice.`/`bob.`/`carol.<team>.testnet`. **Create `<team>.testnet` in the same sitting** (an agent may run the faucet command with your OK) and record its creation tx (R-02) | a short lowercase name unique to Satchel | **Sat Oct 24** | every address derives from the final id; nobody else may own `<team>.testnet` while its sub-account addresses hold funds (D-02) |
| H-02 | Submission fields: projectName, leadName, email (the Satchel team's own; monitored until payout), size, tracks, mainnet payout `nearAddress`; the repo URL must not have been submitted before | size `"2 - 4"`; tracks `["nfts","open"]` (kb/00 §Tracks); **no default for names, email or payout account**: the human creates the payout account and an agent must never invent it | Nov 12 (payout account by Nov 10) | HACKATHON.md "What the human decides" |
| H-03 | **[decided D-38]** Licence | MIT | **Oct 28** | "Is the project open source" (kb/00 §Rec P1-8) |
| H-04 | **[decided D-38]** GitHub org/repo name; private until Day 13 | `<org>/satchel` | **Oct 28** | `package.repository` is embedded in NEP-330 metadata |
| H-05 | **[decided D-38]** App host (Vercel project name or custom domain) | `satchel-<team>.vercel.app` | **Oct 28** | `base_uri` is immutable from the rc/final birth (D-23) |
| H-06 | **[decided D-38]** FastNEAR API key (server) | free dashboard key | **Oct 28** | rate limits (kb/41 §TL;DR) |
| H-07 | Faucet funding per D-33 and checklist §4 | wallet path if H-23 = yes; else the dev-Satchel fan-out | start Oct 24 (after H-01); wallet path done by Oct 31; fallback claims Nov 1–2 | testnet4 confirmations take hours; faucets need captchas or logins; the Solana faucet bans AI agents |
| H-08 | Circle testnet USDC: 2 claims for `carol` (40 USDC); 1 claim to the pay spike for P0-R4 | as stated | P0-R4 claim by **Oct 28**; carol by Nov 7 | S-8 demo; R-10 refund test |
| H-09 | **[decided D-38]** Does the posting X account have X Premium? | assume no → video ≤ 2:15 | Oct 31 | D-17 |
| H-10 | **Narrowed by D-47** (Q-010, Q-015 and Q-017 answer the rest). Still ask: multiple prizes (track + grand prize, two tracks), post-deadline commits, payout KYC/tax/conversion, and whether the screening agents have network access | ask on NEAR Discord now; record the answers in kb/00 | ask by Oct 23; record by Oct 31 | weighs live pages (R-07, R-08) against committed evidence |
| H-11 | Design-lead decisions (checklist §6 = the post-R3 set UX-1…UX-34; kb/80 R3 and kb/81 R3 §Open questions; brand in `brand/`; references kb/82). Also confirm the S1 Day-6 pairing hours R3 needs | as in checklist §6 (the brand's Night + Day, brass primary and card; the fiat card total "at mainnet prices" (UX-1, reopened); the quiet per-token tint; flows as sheet/dialog; `brand-pressed`) | **Oct 31** | the root layout and tokens are written on Day 1 |
| H-12 | **[decided D-37]** Clean-history confirmation policy | EVM `latest − 3`, BTC K = 1 (difficulty-1 reorg risk disclosed, R-17), SOL age ≥ 120 s (spec §7.4) | Nov 6 | badge semantics |
| H-13 | **[decided D-37]** Scope confirmations: D-07 (no transfer_call/approvals), D-13 (no delegates), **D-15 (allowlist `{11155111}`, no ERC-20)**, D-20 (cut order), D-12 (no demo signer) (review §7 Q11) | as recommended | **Nov 1** (D-15 included; R-31) | immutable contract surface; the classifier is written on Day 2 |
| H-14 | Ask the NEAR MPC team whether `sign` args, the 15 Tgas floor and the 1-yocto deposit stay stable until Nov 18 | ask now | ask by Oct 28; answer by Nov 7 | D-24 |
| H-15 | **[decided D-37]** **Final account: keyless birth (D-02 option b2)** as the method, with option (b1) only as the fallback; then the **explicit "yes"** to send the printed final batch (review §7 Q2) | keyless birth; Day 10, Nov 10 ≈ 10:00–12:00 UTC; hard deadline Nov 11, 12:00 UTC | method **Oct 31**; "yes" Nov 10 | irreversible; HACKATHON.md requires explicit confirmation for deploys and signing |
| H-16 | **[decided D-37]** 1Click mainnet clip (review §7 Q8) | **cut now** (D-19) | **Oct 31** | frees 5.5 S1 h + 2 H h on the birth days |
| H-17 | Testnet wallets: install Meteor and Intear, import the personas, run one `sign_for` per wallet | — | install Oct 31; test Nov 3 (SAT-224) | kb/40 §Open questions 1 |
| H-18 | **[decided D-38]** Hardware: any Intel Mac? (no sandbox binary) | Apple Silicon or Linux only | Oct 31 | kb/21 §TL;DR 6 |
| ~~H-19~~ | Modal vs full-page Send (design lead) | **closed by D-36 (B-08):** routes presented as a sheet below 768 px and a 480 px dialog from 768 px | — | — |
| H-20 | **Standing approvals on Nov 1** for AI agents (review §7 Q10, R-01). (a) Non-force pushes to the private repo. (b) Testnet txs signed with dev, rc, persona **and `<team>.testnet`** keys: creating and funding `devN`/`rc` (including the **rc keyless birth**), deploys to `devN`, mints, signs, sends of test funds, USDC storage registration, contract top-ups, the spike sweep, all within the caps (≤ 25 NEAR, ≤ 0.25 Sepolia ETH, ≤ 0.01 tBTC, ≤ 1 devnet SOL, ≤ 50 test USDC per day; only between team-controlled accounts and addresses). (c) Vercel preview/production deploys of the frontend. **Excluded:** force-push; making the repo public; X posts; the submission; **creating or deploying `satchel.<team>.testnet`**; anything on mainnet; spending beyond the caps | grant (a)–(c) in writing in the team channel | text approved by **Oct 31**; granted Nov 1, 08:00 UTC | HACKATHON.md "Never without the human's explicit confirmation" (kb/00 §Gotchas 14) |
| H-21 | Repo public, X post, submission (Day 13) | public 10:00 UTC, post 13:00, "yes" to submit 14:00; hard target 18:00 UTC Nov 13 | Nov 13 | kb/00 §Rec P0-1 |
| H-22 | **[decided D-38]** **Who is "H"?** A third person, or S1/S2? Which time zones do S1 and S2 work in? (review §7 Q1; R-33) | a third person; everyone on EET | **Oct 24** | Day-1 timing and lock-day staffing; if H is S1, S1's Day-10/11 buffer absorbs the H hours (impl-plan §2) |
| H-23 | **[decided D-38]** **Testnet4-capable wallet** (e.g. Sparrow) for a team BTC reserve? If not, accept funding through dev Satchels from Nov 1 (review §7 Q3; R-14) | fallback: dev-Satchel fan-out | **Oct 24** | decides whether P0-H4 BTC happens in October or on Days 1–6 |
| H-24 | **Superseded by D-47 (Q-001: code from Oct 19 counts):** approve the short timeline in README §Timeline instead. Old text: approve the reworded "Pre-hackathon work" disclosure (review §7 Q9; R-21; updated by D-36): "Phase-0 work, Oct 20–31: research notes with reference snippets; the Satchel brand, logo and design system, created as design assets (SVG and PNG files, JSON design tokens, a reference HTML head snippet); and testnet faucet funding. All repository code was written from Nov 1, following the KB specs; no spike file was copied. The logo, icon and image files in the repository are those Phase-0 design assets." | approve as written | **Oct 31** (the Day-1 README stub uses it) | rules on pre-existing code (kb/00 §Pre-existing code) |
| H-25 | **[decided D-37]** **Testnet single-provider policy** (review §7 Q6; R-19): may Buy proceed when one of two BTC/EVM providers is down, with "1 of 2 sources" shown? | allow on testnet, labelled; never on mainnet; disagreement always blocks | Nov 6 | availability of Buy during recording and judging |
| H-26 | **[decided D-37]** **If Circle USDC fails the refund test** (review §7 Q5; R-10, R-38) | final contract born with `usdc: None`; USDC shown only as sandbox evidence, disclosed | **Nov 8 EOD**, before the Day-9 rc birth, so rc and final share the init args; a later change needs an rc2 birth (D-34 contingency) | S-8 vs a broken refund path in an immutable contract |

**Resolved by the orchestrator** (no action needed; object by Oct 31 if you disagree):
- review §7 Q4: #3's sale story has an EVM-only history; the BTC `spent` row is shown on #5 (D-32).
- review §7 Q7: dev uses the lenient gate; rc and final use the strict gate, and rc is born keyless (D-30).

**Before Nov 1, by deadline:**
- **Oct 23:** H-10 questions asked.
- **Oct 24:** H-01 (names + `<team>.testnet` created), H-22 (who is H), H-23 (testnet4 wallet).
- **Oct 28:** H-03, H-04, H-05, H-06; H-08 (P0-R4 claim + OK for the refund test); H-14 asked.
- **Oct 31:** H-09, H-11 (H-19 closed by D-36), H-15 (method), H-16 (1Click cut), H-17 (install), H-18, H-20 (text), H-24; H-07 wallet-path funding done; H-10 answers recorded.
- **Nov 1:** H-13 (scope incl. allowlist); H-20 granted at 08:00 UTC; repo created.
