# Satchel: independent adversarial review of the Phase-0 design and plan

> **Status (2026-11-04): historical.** The independent review of the Phase-0 design (2026-10-21), before any product code. The status of every R-xx finding is in the revision-2 changelog at the top of `plan/decisions.md`, and the fixes are folded into `kb/90-technical-spec.md`. `near_hackathon.md`, cited below, is the team's original plan and is not in this repo. The code security reviews are in `docs/security/`.

> Reviewer: independent; took no part in Phase 0. Written 2026-10-21.
> Reviewed (not edited): `kb/90-technical-spec.md` ("spec"), `plan/decisions.md` (D-xx, H-xx), `plan/implementation-plan.md` (SAT-xxx), `plan/phase0-checklist.md` (P0-xx), `kb/README.md`.
> Checked against: `near_hackathon.md`, `kb/00`–`kb/81`, `research/spikes/*/RESULTS.md`, `research/spikes/hackathon/HACKATHON.snapshot.md`, and the near-sdk **5.29.1** source vendored at tag `near-sdk-v5.29.1` in `research/spikes/sdk/vendor/near-sdk-rs`.
> Severity: **Blocker** = must be fixed before Nov 1 (it affects Phase-0 actions or Day-1 approvals) · **Major** = fix before the related task starts · **Minor** = fix when convenient.

---

## 1. Summary verdict

The design is unusually well evidenced. Its core security mechanism survived every attack I tried, and I found no way for a seller to defeat it as specified: structured payloads that the contract hashes itself, records written in the same receipt as the MPC call, BTC completeness plus SIGHASH_ALL, signing frozen while listed, a buy bound to `(listing_id, expected_sig_count)`, a UX-only callback that cannot panic, and a detached payout with an escrow fallback.

The weak points are around that core:
- **Day-10 trust window.** The proof that the account never signed directly uses the wrong FastNEAR filter, and the pre-funded demo token ids can be minted by someone else first.
- **D-04 ("unfunded" BTC outpoints).** The argument misses parent transactions that the *buyer* will later build, deterministically, in Satchel's own UI.
- **Judge-facing evidence.** The streamed SSR pages and the RPC `tx` proofs were checked only under conditions that will not hold during judging.

The plan's arithmetic is internally consistent: the task estimates add up exactly to 110 h (S1) and 108 h (S2). But S1 is the critical path from Day 1 to Day 13, and the chain "Day-10 lock → testnet4 confirmation → Day-12 video" has no slack.

**Verdict: GO, conditional on fixing the 2 Blockers before Nov 1 and the 13 Majors before their tasks start.** Counts: **2 Blocker, 13 Major, 26 Minor.**

**Top 10 findings**
1. **R-03 + R-04 (Major).** The lock-window proof queries FastNEAR with `is_signer:true`, which does not show NEP-366 delegated signing. Separately, permissionless `nft_mint` plus six separate persona mint txs after the deploy leave pre-funded token #1 open to being minted by someone else first. One atomic creation tx (ideally keyless) fixes both.
2. **R-05 (Major).** "Unfunded" BTC records are not harmless. A seller can pre-sign a spend of the change output of a transaction the buyer will later build in the deterministic Satchel UI (largest-first selection, 2 sat/vB, locktime 0).
3. **R-07 (Major).** Judge pages stream their data inside hidden Suspense segments, which was verified only with raw `curl`. AI fetch tools may show the "loading" shell instead.
4. **R-08 (Major).** README NEAR `tx` proofs will fail during judging. Non-archival RPC keeps only about 32–40 h of history.
5. **R-06 (Major).** The Buy gate can never open on an unlocked dev or rc contract (aggregate `unsafe`), so G6 and SAT-282 cannot pass as written.
6. **R-09 (Major).** The headline clean-history gate has no end-to-end test before staging on the locked contract.
7. **R-12 (Major).** If the lock slips, #3's sale story waits on a testnet4 confirmation (median 2 h, max 21 h) with only about a day left before the video.
8. **R-10 (Major).** The refund-on-failure path of Circle testnet USDC (not near-contract-standards code) is never tested; SAT-073 covers only the happy path.
9. **R-11 (Major).** The reproducible build, NEP-330 metadata and `near contract verify` were proven only on a standalone crate. The workspace layout is first tried on Day 9, and verification only on Day 13, after the lock.
10. **R-01, R-02 (Blocker).** The standing-approval text does not cover the `<team>.testnet` key that agents use on Day 1. Funding of the final addresses starts the day *before* `<team>.testnet` exists.

---

## 2. Findings

| ID | Sev | Area | Where | Problem | Evidence | Fix |
|---|---|---|---|---|---|---|
| R-01 | **Blocker** | Compliance | impl-plan §4 steps 2 and 12; decisions H-20; SAT-007, SAT-044, SAT-082; §5.1–5.4 | Approval (b) of H-20 covers "testnet txs signed with **dev/rc/persona** keys". Yet agents are scheduled to sign with the `<team>.testnet` key: step 12 says "Create `dev1.<team>.testnet` (5 NEAR) with the team key (approval b)". The same applies to the creation of rc and dev2, the USDC `storage_deposit` "signed by `<team>.testnet`", and contract top-ups. | HACKATHON.md: "Never without the human's explicit confirmation: … Sign transactions, spend tokens". | Before Nov 1, edit the approval draft (P0-H16) to name `<team>.testnet` for creating and funding `devN`/`rc` accounts and for USDC registration, within the caps. Keep creating `satchel.<team>.testnet` explicitly excluded. Alternatively, make those steps human-only. |
| R-02 | **Blocker** | Security (Phase 0) | checklist P0-H2 (Oct 25), P0-H4 and §7 ("Sat Oct 24 … start P0-H4 funding"); impl-plan §5.2 "Safety of pre-funding" | Funding of the final `satchel/N/*` addresses starts on Oct 24, but `<team>.testnet` is created only on Oct 25. Until the team owns that name, anyone can register it through the faucet, create `satchel.<team>.testnet`, sign anything for every pre-funded path, and delete the account again. | Plan §5.2: "only `<team>.testnet` can create it". That is true only once the team owns `<team>.testnet`. | Create `<team>.testnet` in the same sitting as choosing the name, before P0-A1 and P0-H4. Record its creation tx. Add to the README proof "no tx involves `satchel.<team>.testnet` before block A" (see R-03). |
| R-03 | Major | Security (lock proof) | spec §4 T4, §5.16 step 8, §7.7; D-02 rationale; impl-plan §6 step 7; checklist P0-A5 | The trust-window proof is `tx.test.fastnear.com /v0/account {"is_signer":true}`, read as "only the deploy and delete-key txs". FastNEAR distinguishes several signer flags. A NEP-366 DelegateAction signed by the satchel key and relayed by another account has the relayer as tx signer, but can still call `v1.signer-prod.testnet.sign` with predecessor = satchel. Such a call would not appear under `is_signer`. | kb/50 §FastNEAR Transactions API: the filters are "`is_signer`, `is_delegated_signer`, `is_real_signer`, `is_any_signer`, `is_predecessor` …". | Prove the window with `is_any_signer:true` (expect exactly the deploy and delete-key txs). Also show an unfiltered `/v0/account` listing whose earliest entry is the creation at block A, which rules out an earlier incarnation of the same account id. Better still, remove the window entirely (R-04). |
| R-04 | Major | Security (release) | D-28; spec §5.6 (`nft_mint` "Anyone"), §5.16 steps 3–7; impl-plan §6 steps 2–6 | Demo ids 1–6 are pre-funded (≈ 450k sats, 0.11 ETH and 0.7 SOL in total; #1 alone holds 200k sats, 0.05 ETH and 0.5 SOL). They are minted by six separate persona txs *after* the deploy tx, and `nft_mint` is permissionless. Anyone who mints between block B and the persona mints owns pre-funded #1. Mint order across six txs is not guaranteed either. On top of that, the session holds a full-access key for about 30 minutes and includes a step where the CLI is known to report false errors. | D-28: "Minting immediately means nobody else can mint those ids first". This does not hold. kb/22 §TL;DR 6 documents the false `delete-keys` error. | Rehearse the identical batch on `rc` on Day 9, then pick one: **(a)** a single tx signed by the satchel key containing `DeployContract`, `FunctionCall new` and `FunctionCall nft_mint` ×6 (each with the persona as `receiver_id`), then delete the key; or **(b)** a keyless account: one tx from `<team>.testnet` containing `CreateAccount`, `Transfer 10 NEAR`, `DeployContract`, `FunctionCall new` and `nft_mint` ×6, with **no `AddKey`** (the factory pattern: after `CreateAccount`, the batch acts with the new account's permissions). Option (b) removes T4 completely: "this account never had a key" is provable from one tx. Its cost is that a wrong init argument can never be fixed, so use (b) only after an identical rc run. In both cases, register USDC from `<team>.testnet`. |
| R-05 | Major | Security (clean history) | D-04 threat argument, points 1–2; spec §7.2–§7.3, §7.7; SAT-231/232 | D-04 assumes that an unbroadcast parent F is either (1) signed by Satchel before the sale, so it is logged and blocks the sale, or (2) funded by the seller. It misses case (3): F is a transaction the **buyer** builds later with the Satchel UI. Segwit txids do not cover witnesses, and the UI is deterministic: largest-first selection, nVersion 2, nSequence `fffffffd`, nLockTime 0 (the contract allows nothing else), fee `max(2, halfHourFee)`, and change back to the Satchel's own address. A seller who expects a payment ("send me 10,000 sats from it") can pre-sign a spend of the predicted change outpoint (T, 1). At purchase time that outpoint returns 404, so the record is `unfunded` and does not block. After the buyer's send, the seller broadcasts it and takes the change. | kb/30 §1: the testnet4 fee API returns 1 in every bucket, so the fee rate is currently a constant 2 sat/vB. kb/30 §6 fixes the vsize formula. SAT-231 specifies largest-first. spec §5.9 enforces nLockTime == 0 and nSequence ≥ fffffffd. | In the BTC builder, compute the candidate txid before requesting signatures. If it equals any txid referenced by the token's records (the checker already loads them), perturb the tx (fee +1 sat, output order, or nSequence `fffffffd`↔`fffffffe`) and check again. Also randomize output order. Add a unit test. Amend D-04 and the README "does not cover" text. Apply the same check when one Satchel pays another. |
| R-06 | Major | Clean history / plan | spec §7.2 contract-level checks and §7.3 aggregate `unsafe`; impl-plan G6, SAT-271, SAT-282 | The aggregate is `unsafe`, which disables Buy, whenever the contract is not locked or its code hash differs from `NEXT_PUBLIC_EXPECTED_CODE_HASH`. Every deployment before Day 10 (`devN`, `rc`) is unlocked. So G6 ("buy (NEAR) on dev via the UI", Day 8) and SAT-282 ("list → cooldown → buy (NEAR and USDC)" on dev) cannot pass. The gated Buy path would first run on the final contract, during staging on Day 11. | spec §7.3: "`unsafe` \| any account check fails, contract not locked, or code hash mismatch \| **disabled**". | Specify a dev rule: when `NEXT_PUBLIC_IS_FINAL_CONTRACT=false`, a lock or code-hash failure becomes a visible warning while every other check still gates Buy. Alternatively, lock `rc` after its rehearsal and point a preview build at it. Make "Buy enabled only for clean/empty" part of the rc e2e (R-09). |
| R-07 | Major | Judge evidence | spec §8.1 ("PPR streams the final markup … so `curl` sees the data"); SAT-210 and SAT-252 acceptance criteria; checklist G-9 | The only evidence is a no-JS `curl` that "gets the `loading` shell **and** the streamed `account …` in one response". Under Suspense/PPR the resolved data arrives at the end of the document inside React's hidden segments (`<div hidden id="S:…">` plus a `$RC` script), while the visible slot holds the fallback. Readability-style extractors drop `hidden` nodes, so an AI judge's fetch tool may show only the loading skeleton. kb/00 tested an AI fetch tool only against a client-rendered page. | spike/web §3. The same spike shows that Next can render a blocking route instead: its build error says "Set export const instant = false to allow a blocking route". | Render the judge routes (`/s/[id]`, `/contract`, `/market`) as blocking (`instant = false`), or fully prerendered for ids 1–6, or put the facts outside Suspense from a cached snapshot. Change the acceptance criteria of SAT-210 and SAT-252 to: "an AI fetch tool (e.g. WebFetch) shows owner, addresses, `sig_count` and lock facts", not only curl. |
| R-08 | Major | Judge evidence | D-10 ("an RPC `tx` curl or FastNEAR tx API form"); spec §8.3, §8.8; SAT-102, SAT-110, SAT-103 | README proofs are checked on Days 11–12, but judging runs Nov 16–18. The RPCs in §8.3 (`rpc.testnet.fastnear.com`, `near-testnet.drpc.org`, `test.rpc.fastnear.com`) are non-archival. By judging time, every NEAR `tx` proof from Days 6–11 will return `UNKNOWN_TRANSACTION`. The archival FastNEAR endpoint returned 429s from a shared IP. | kb/50 §TL;DR 4: "non-archival nodes keep only ~200–250k blocks (~32–40 h)". kb/50 Gotcha 8. kb/00 endpoint table: archival endpoint → 429. | Make FastNEAR `POST /v0/transactions` (keyless, full history) the canonical NEAR tx proof. Keep NearBlocks pages as links and `docs/evidence/*.json` as the offline copy. Have `tools/monitor.sh` re-run every README command daily from Nov 14 to Nov 19. Never cite plain RPC `tx` for anything older than a day. |
| R-09 | Major | Testing | spec §12.4 e2e flows; impl-plan SAT-082, SAT-282, SAT-072/271 | The headline differentiator is never tested end to end before staging on the locked contract. The rc e2e covers "EVM, BTC, transfer, sale NEAR + USDC". S-9 itself is covered only by vitest fixtures (SAT-072) and manual checks (SAT-271/272). | Task acceptance-criteria and test columns in impl-plan §3. | Add a scripted dev/rc scenario on Day 9: sign an EVM tx without broadcasting → list → checker returns `blocked` and Buy is disabled → delist → broadcast → relist → `clean` → buy with `(listing_id, expected_sig_count)`. Also check that a buy with a stale `expected_sig_count` fails with `ERR_LISTING_CHANGED`, and that one BTC record reaches `spent` at K = 1. |
| R-10 | Major | USDC | kb/51 Gotcha 9 and G-12; spec §5.7 ("Why `ft_on_transfer` panics"); A-05; SAT-073 | The USDC buy is safe only if Circle's `ft_resolve_transfer` refunds 100 % when `ft_on_transfer` panics. If it does not, the buyer loses USDC on every refused buy (cooldown running, listing changed, wrong amount). SAT-073 tests only the happy path. | kb/51: "Circle's code is a separate implementation, and its `ft_resolve_transfer` gas and edge cases are unverified." | Extend SAT-073's acceptance criteria with a failing buy (wrong `listing_id`): the tx `SuccessValue` must be `"0"` and the buyer's balance unchanged. Add a direct-call `ft_on_transfer` test as well. If either fails, set `usdc: None` on the final contract (DP5). |
| R-11 | Major | Release / verifiability | spec §5.2 (4-member workspace with `[workspace.package]` inheritance, contract under `contracts/satchel`); kb/22 §Verified facts; SAT-081 (Day 9); impl-plan §7 step 4 (Day 13) | The reproducible build, NEP-330 `build_info` and `near contract verify` were proven only "in a standalone repo" with `contract_path:""`. Satchel is a workspace whose contract lives in a sub-path. The first reproducible build is on Day 9. The first `verify` is on Day 13, after the lock, when nothing can be fixed any more. | kb/22 §Verified facts row "Reproducible build"; kb/22 NEP-330 row. | On Days 2–4, run `cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml` on the real workspace, then `near contract verify --use-contract-source-code-path ./ deployed-at devN` (this works with a private repo). Repeat both on rc on Day 9. |
| R-12 | Major | Schedule / demo | impl-plan §1 G8–G11, §5.3 (#3), SAT-092/100/310; risk R3 | #3's sale story needs its Day-10 BTC send to confirm (K = 1) before the Day-11 listing and the Day-12 recording. If the lock slips to its hard deadline (Nov 11, 12:00), only about a day remains before the recording, against an observed maximum gap of 21 h. G10's "re-stage on Day 12 morning" cannot speed up a confirmation. | kb/30 §TL;DR 7: real-difficulty blocks arrive with a "median gap of 2 h and a max of 21 h", and 85 % of txs wait for them. | Decouple the sale beat from testnet4. Either give #3 an EVM-only history (settles in about 36 s), or broadcast #3's BTC spend in the first minutes after the lock and show the BTC `spent` row on a token the video does not need. Define a cut-off: if #3's BTC tx is unconfirmed on Nov 12 at 06:00, use the EVM-only variant or the backup video. |
| R-13 | Major | Demo robustness | impl-plan §5.3 (#4 "Blocked"); spec §7.1 ("anyone can rebuild and broadcast any logged signature"), §8.6 | #4's "1 signature was issued but never used" holds only while nobody broadcasts that signature. But the record stores the full unsigned tx and the signature, and "Broadcast now" exists by design. Any judge, visitor or script can turn #4 `clean` during judging. | spec §7.1 and §8.6 ("EVM rebuilds from the record's `unsigned_tx`"). | Make #4's live record unbroadcastable: sign nonce = current + 1. That tx can never be mined while nonce N is unused, and only the Satchel key can use N, so the record stays `unused` forever. Avoid "value > balance": anyone could fund #4 and then broadcast. Explain this in the README. |
| R-14 | Major | Phase-0 feasibility | checklist §4; impl-plan §5.2; A-16 | BTC funding needs about 11 separate faucet sends plus reserves (final #1 ×3, #2 ×2, #3 ×2, #5 ×1, dev1 ×3). Each needs a human solving a captcha, and the faucets' per-account cooldowns are unknown. The reserve wallet that would allow one big claim plus a fan-out (Sparrow on testnet4) is still `[ASSUMED]`. Funding for rc and dev2 is never scheduled, although SAT-082 needs funded rc addresses. | kb/30 §Open questions ("Send the coins to a team reserve address first, then fan out"); A-16. | Confirm a testnet4 wallet by Oct 24. Otherwise, on Nov 1 claim large UTXOs into dev Satchels and fan out with the product's own BTC send; this doubles as an early e2e, and spending unconfirmed outputs is allowed. Add funding rows (amounts and day) for rc and dev2, and pre-fund #6 for retakes. |
| R-15 | Major | Schedule | impl-plan §1–§3 | S1 is the critical path from Day 1 to Day 13 (contract → freeze → lock → staging → README). S1 also owns the TypeScript checker core (SAT-072), SECURITY.md, the evidence files, staging and the 1Click clip. Days 1–11 average 9.0 h, and Day 6 at 8 h is the only lighter day. Any S1 slip moves the lock, then staging, then the video. | Recomputed hours in §6.1. | Move SAT-072 to S2, or split it. Fold SECURITY.md into SAT-110. Cut the 1Click clip now, which frees 5.5 S1 h on Days 10–11. Keep Day 6 as a real buffer. |
| R-16 | Minor | Contract facts | spec §5.11, §5.15 (strings table), INV-03 | The spec says a non-owner `nft_transfer` panics with `Unauthorized`. In 5.29.1 it panics with `"Approval extension is disabled"`. `Unauthorized` exists only in the deprecated `mint`. | Vendored `near-contract-standards` at tag `near-sdk-v5.29.1`, `core_impl.rs` L222 (and L290 for the `mint` string). | Fix the string in §5.11, §5.15, the INV-03 test and the UI error map. |
| R-17 | Minor | Security / disclosure | spec §7.4 (BTC K = 1) | On testnet4 anyone can CPU-mine difficulty-1 blocks under the 20-minute rule, with timestamps up to about 2 h in the future. If the spending tx sits in a difficulty-1 block, a two-block difficulty-1 fork can reorg it out, which revives an old pre-signed spend. | kb/30 Gotchas: "difficulty-1 blocks carry timestamps ~2 h in the future"; 424 of the last 450 blocks were difficulty-1. | Disclose this. Optionally, count only confirmations in real-difficulty blocks, or require K = 2 when the confirming block is difficulty-1. |
| R-18 | Minor | UX safety | SAT-240; spec §5.7 `nft_transfer` | NEP-171 accepts any valid account id. Transferring a Satchel to the contract itself, to the MPC account, or to an id that does not exist strands its funds forever. The UI blocks only missing accounts. | Vendored `core_impl.rs`: there is no receiver check beyond "Current and next owner must differ". | Block the contract and MPC ids in the UI. Optionally add a one-line contract guard: `receiver_id != current_account_id`. |
| R-19 | Minor | Robustness / simplification | spec §7.2, §7.5; A-06, A-07 | The two-provider rule rests on a single hobby BTC mirror (emzy) and on a second devnet RPC that has not been found yet. An outage turns every token with BTC or SOL history to `unknown`, which disables Buy, during recording or judging. SOL records are in fact dead by construction once they are ≥ 120 s old: durable nonces are refused, and the quiet period is ≥ 138 s. | kb/32 TL;DR: "Clean history then needs no off-chain check for Solana". | SOL: `expired` = age ≥ 120 s and one provider reports the blockhash invalid. BTC: find a third Esplora instance by Nov 1, or show "1 of 2 sources" and let the human decide whether testnet Buy may proceed. |
| R-20 | Minor | Product limit | spec §7.5 ("caps a run at 200 records") | After 200 signatures a Satchel can never be sold in the browser, and a giver could pre-load a gift with records. EVM needs only the maximum nonce (O(1)), SOL records are dead by age, and BTC can be checked once per txid with `/outspends`. | Rule stated in spec §7.5. | Cap requests or txids instead of records, or remove the cap. |
| R-21 | Minor | Disclosure accuracy | impl-plan §4 step 6 (README stub); SAT-004/013/201/220 ("re-type" KB snippets); §5.2 (October funding) | The stub says "no code from that period is in this repository". Yet several tasks re-type tested Phase-0 code: a 55-line CSS block (kb/81), a 52-line tracker (kb/40), and the mock signer and test helpers (kb/21). The demo addresses are also funded on-chain in October. | KB code blocks; checklist §4. | Reword: "Phase-0 research notes (with reference snippets) and testnet faucet funding happened Oct 20–31; all repository code was written from Nov 1." |
| R-22 | Minor | Claims | SAT-110 ("NEP-177 dynamic card"); D-23; spec §9 | The README is planned to claim a "dynamic card" for the DYNAMIC NFTS track hint, but the card is a static seeded SVG with no balances. | D-23: "Static seeded SVG … No balances". | Reword: the dynamic part is the NFT's live wallet and status. Or add a status or `sig_count` element to the SVG. |
| R-23 | Minor | UX safety | spec §5.3 `SigDetail::Btc.amount_sats`; §5.9 offset 130 ("informational") | The BTC record's amount is copied from the seller's preimage and never verified, because a wrong amount only invalidates the signature. If the UI shows it as the coin's value, it can understate what an unused record can move. | spec §5.9. | Show the prevout value from the chain, and label the record's amount "claimed". |
| R-24 | Minor | Classifier spec | spec §5.9 SOL table; §12.2 SOL refusals | A durable-nonce message has at least two instructions. With the table order, it fails with `ERR_SOL_INSTRUCTION` before `ERR_SOL_DURABLE_NONCE` is ever checked, while §12.2 requires every refusal vector to "name the error". | spec §5.9 ("also implied by the row above"). | Fix the check order (scan for `04000000` first), or let the vector accept either code. |
| R-25 | Minor | Callback safety | spec §5.7 `on_payout` ("checked add"); §5.6 ("Never panics") | A checked add that is unwrapped can panic, which contradicts "never panics". | spec §5.7. | Use `saturating_add` (overflow cannot happen anyway), and add `on_payout` to the panic-free checklist. |
| R-26 | Minor | Test oracle | spec INV-18 | "Never lower the contract's free balance" can still pass when storage is under-charged. The MPC refunds `mpc_deposit − 1 yocto` to the contract, and the contract also earns a share of the gas its own receipts burn. | kb/10 §TL;DR 4 (refunds go to the predecessor); NEAR's burnt-gas reward. | Assert exactly: `attached − refund == Δstorage × byte_cost + n × mpc_deposit`. |
| R-27 | Minor | Test coverage | impl-plan task acceptance-criteria and test columns vs spec §6 | Some tests are assigned to no task: the BTC variant of INV-06 (`mpc_request_shape_btc`), INV-11's `transfer.rs::records_survive_transfer`, and INV-17's `sale.rs::zero_deposit_rejected`. Two properties are never tested: `ft_on_transfer` on a **NEAR** listing must refund, and an FT self-buy must fail. | Cross-check of spec §6 against impl-plan §3. | Add them to SAT-022, SAT-040, SAT-060 and SAT-071. |
| R-28 | Minor | Compliance | impl-plan §7 step 8 | "400 → fix `fields` and resend with the same requestId" skips re-printing the corrected JSON and getting a fresh "yes". | HACKATHON.md: "Print the full JSON payload first and wait for a yes." | Add: print the corrected payload and wait for a new "yes". |
| R-29 | Minor | Release | spec §5.16 step 0, §7.7; impl-plan SAT-081, §7 step 2 | The README and the runbook cite tag `contract-v1.0.0`, but no task creates it: SAT-081 tags `contract-v1.0.0-rc1`, and §7 says the final tag "already exists". | Text of the cited sections. | In SAT-090, tag `contract-v1.0.0` on the exact commit whose reproducible hash was deployed. |
| R-30 | Minor | Demo staging | impl-plan §5.3, SAT-100 (Day 11), SAT-310 (Day 12) | The video's gift and sale beats use up staged states that SAT-100 already plays out on Day 11 (the #2 gift and the #3 sale). Re-recording them on Day 12 needs fresh funded tokens, and #6 is "spare, unfunded". | impl-plan §5.3. | Screen-record those beats during SAT-100, or pre-fund #6 and #7 for retakes. |
| R-31 | Minor | Decision timing | D-15; H-13 ("D-15 by Nov 8") | The chain allowlist is compiled into the classifier on Day 2 (SAT-010), and the checker's providers are Sepolia-only. Adding Base or Arbitrum Sepolia on Nov 8 would need RPC, explorer and checker work that is not in the plan. | SAT-010; spec §8.3. | Make the decision by Nov 1. |
| R-32 | Minor | Contract | spec §5.6 (`#[init] pub fn new`, without `#[private]`) | Calling `new` is safe only because deploy and init happen in one tx. | spec §5.16 step 4. | State this in the runbook. Keep `new` non-private if R-04(b) is chosen (the init caller is `<team>.testnet`); otherwise add `#[private]`. |
| R-33 | Minor | Plan realism | impl-plan §4 timetable; §2 H column | Day 1 runs 00:00–09:00 UTC, which is 02:00–11:00 in Bucharest on a Sunday: approvals at 00:00+, first push at 01:30. The H lane has no named owner. If H is S1 or S2, Days 10–12 reach about 11 h for that person. | impl-plan §4 and §2. | Re-time Day 1 and name the H owner (questions §7). |
| R-34 | Minor | Dependency | spec §8.5; kb/40 §A | near-connect fetches its wallet manifest and executors live from GitHub, so pinning 0.11.4 does not pin the set of wallets. Meteor or Intear could change during judging. | kb/40 §A ("live manifest v1.1.0 from raw.githubusercontent.com/…"). | Re-check on Day 12 and in `monitor.sh`. Pin or self-host the manifest if the connector allows it. |
| R-35 | Minor | Process | spec §12.6 CI; INV-22 | INV-22 (forbidden wasm imports) runs only on CI's non-reproducible build (rustc 1.93). The deployed artifact is built with rustc 1.99.1. | spec §5.2 notes; kb/22 §TL;DR 7. | Also run `check-wasm-imports.sh` on the reproducible wasm in SAT-081. |
| R-36 | Minor | Consistency | impl-plan header ("S-13 … S-15 (spec §1, decisions)") | S-13, S-14 and S-15 are used 29 times in the plan but defined nowhere: neither spec §1 nor decisions.md contains them. | grep: only one spec hit (INV-22). | Write their acceptance text in spec §6. |
| R-37 | Minor | Errata gap | kb/80 §Transfer review ("Approvals are cleared." / "P2 adds '{n} delegate will be removed'") | This copy is not in spec §13, yet v1 has no approvals and no delegates. | kb/80 L125. | Add an erratum. |
| R-38 | Minor | Scope | A-05 fallback ("usdc.fakes.testnet for the demo (separate test deployment)") vs D-27 | If Circle USDC fails, the USDC demo moves to an unlocked test deployment. That contradicts the README's "locked final contract" story for that beat. | spec §14 A-05. | Prefer `usdc: None` on the final contract and show USDC only from sandbox evidence, or disclose the switch. |
| R-39 | Minor | Judge commands | spec §5.16 step 0 (`sha256sum`) | macOS, which the team and many judges use, ships `shasum -a 256`, not `sha256sum`. | — | Give both commands in the README. |
| R-40 | Minor | Coverage | near_hackathon.md B2 ("Stretch: heirloom timelock"); the plan's versions list (`@fast-auth-near/*`) | Both were dropped without a decision entry. | grep of spec and plan. | Add one line to decisions.md (cut, or Phase 3). |
| R-41 | Minor | Dev churn | spec §5.3 `Contract`; impl-plan SAT-006 → SAT-061/071; risk R23 | No task redeploys dev1 between Day 1 and Day 5, although G2 and G3 need the newer classifiers. If the root `Contract` struct changes later (e.g. `listings`/`proceeds` added on Day 7), dev1 breaks and dev2 needs fresh BTC/ETH funding. | Day 3–4 gates in impl-plan §1. | Declare every collection on Day 1, even unused ones, so dev1 can be redeployed in place through Day 9. Schedule explicit dev redeploys after SAT-010, 020, 030, 061 and 071. |

---

## 3. Consistency mismatches

| # | Item | Values found, and where |
|---|---|---|
| 1 | Task that runs the sandbox suite on the reproducible wasm | spec §5.2 notes: "(SAT-090)". impl-plan: SAT-081 (Day 9) does it; SAT-090 is the final deploy. |
| 2 | Wallet-test task id | spec §14 A-04: "SAT-H03", which does not exist. The real tasks are SAT-224 (G2) and checklist P0-H3/P0-R5. |
| 3 | NearBlocks re-check tasks | D-10: "Nov 1 (SAT-002) and Day 12 (SAT-150)". SAT-002 is the repo skeleton (Day-1 checks are SAT-001), and SAT-150 does not exist (Day 12 has SAT-110…114 and SAT-310…312). |
| 4 | Task that computes the addresses | impl-plan §5.2: "P0-A3". checklist: P0-A1 computes the addresses; P0-A3 is the Oct 31 re-check sweep. |
| 5 | Error code for removing SOL | impl-plan DP5: `ERR_CHAIN_UNSUPPORTED`. Absent from spec §5.15 and §5.9. |
| 6 | Contract tag | spec §5.16 step 0: "tag `contract-v1.0.0`" on Day 9. spec §7.7 README: "at tag `contract-v1.0.0`". impl-plan SAT-081: `contract-v1.0.0-rc1`. impl-plan §7 step 2: "already exists". No task creates it. |
| 7 | Panic for a non-owner transfer | spec §5.11, §5.15 and INV-03: "Unauthorized". near-contract-standards 5.29.1: "Approval extension is disabled". |
| 8 | Card | SAT-110: "NEP-177 dynamic card". D-23 and spec §9: static SVG, "balances are not baked in". |
| 9 | Mint front-run | D-28: "nobody else can mint those ids first". spec §5.16 step 5 and impl-plan §6 step 4: six persona txs after the deploy. |
| 10 | Pre-funding safety | impl-plan §5.2: "only `<team>.testnet` can create it". checklist: funding from Oct 24 (P0-H4), `<team>.testnet` created on Oct 25 (P0-H2). |
| 11 | Approval scope | H-20(b): "dev/rc/persona keys". impl-plan §4 step 12: "with the team key (approval b)". |
| 12 | Buy gate on dev | spec §7.3: `unsafe` if "contract not locked". impl-plan G6: "buy (NEAR) on dev via the UI"; SAT-282. |
| 13 | Definition of S-13/S-14/S-15 | impl-plan header cites "(spec §1, decisions)". Neither defines them. |
| 14 | Lock-proof filter | `is_signer:true` in spec T4, §5.16 and §7.7, D-02, impl-plan §6 and checklist P0-A5. kb/50 also documents `is_delegated_signer` and `is_any_signer`. |
| 15 | FastNEAR key deadline | H-06: Oct 31. P0-H5: Oct 28. (Harmless.) |
| 16 | App-host deadline | D-23/H-05: Nov 1. P0-H1b: Oct 28. (Harmless.) |
| 17 | Storage cost of a transfer | spec §5.4: "+180 B measured" for the first transfer to a new owner. kb/20 and kb/22: "+180 B; sender's set emptied −180 B", so the net is about 0 when the sender held one token. |
| 18 | Parser size | spec §5.9: "+7.9 KB". kb/70 F9 measured narrower parsers (single-input BTC, +0.6 KB). The v1 multi-preimage BTC parser with outputs parsing has not been measured. |
| 19 | Fallback test token | A-05: "fall back to usdc.fakes.testnet for the demo". D-27: "only on dev/rc test deployments". |
| 20 | rc funding | SAT-082 needs funded rc addresses. Neither impl-plan §5.2 nor checklist §4 has rc rows. |
| 21 | Files in the repo layout | spec §11 lists `tools/judge-snippets.sh`, `ARCHITECTURE.md` and `vectors/derive.json`. No task creates them; SAT-011 generates only the evm/btc/sol vectors. |
| 22 | Allowlist deadline | H-13: "D-15 by Nov 8". The classifier is built on Day 2 (SAT-010). |
| 23 | MPC timeout duration (KB-internal) | kb/40: "200 blocks ≈ 120 s (0.57–0.60 s)". kb/10: block time 0.555–0.569 s, so 111–114 s. spec: 115–119 s measured, which is the right value. No spec action needed. |
| 24 | Transfer review copy | kb/80: "Approvals are cleared." Not in the spec §13 errata. |

Checked and consistent across all five documents: COOLDOWN 250; gas `min(300, 60+20n)` with floor `30+18n`; callback `10+2n`; MAX_BTC_INPUTS 10; 0.005 NEAR × n; mint 0.02 NEAR; USDC buy 150 Tgas; `mpc_deposit` cap 0.01 NEAR (1e22 yocto in the `config()` example); event names; view names; routes; pinned versions (spec §10 = kb/40/41); every date and weekday (Nov 1 = Sunday, deadline 2026-11-14T23:59:00Z); video ≤ 2:15; G8 12:00 with a hard deadline of Nov 11, 12:00; and the hour totals (§6.1).

---

## 4. Fact-check (spot checks against the KB, spike results and vendored source)

| # | Claim | Location | Verdict | Evidence |
|---|---|---|---|---|
| 1 | MPC `sign` needs exactly 15 Tgas prepaid; 14.999… fails | spec §5.5 | ✓ | spike/mpc §5 rows `A-gas-14.999…T` (fails) and `A-gas-15T` ("min = exactly 15 Tgas") |
| 2 | Deposit ≥ 1 yocto; any excess is refunded to the predecessor (the contract) | spec §5.5, D-24 | ✓ | spike/mpc §6.2: "refund <0.001 NEAR to spike.satchel-spk-mpc…" |
| 3 | 200-block yield; the callback sees the timeout ~203–205 blocks later (115–119 s) | spec §5.8 | ✓ | spike/mpc §6.3: +205 blocks / 116.0 s; 115.1 s; direct call 119.3 s |
| 4 | Never two `sign` actions in one receipt (both time out) | spec §1.7 | ✓ | kb/30 §TL;DR 3: tx `9afVH1…`, 118.8 s, 22.37 Tgas |
| 5 | BTC fan-out: one call joined with `.and()`, ~9.2 s for any N; n = 2 fails at 40 Tgas and works at 45 | spec §5.5 | ✓ | spike/btc table: `AeJoy…` "Exceeded the prepaid gas."; `5Nijq…` OK |
| 6 | Entry burn 2.1–2.6 Tgas (n = 1), 3.1 (n = 2), 4.5 (n = 4) | spec §5.5 | ✓ | spike/mpc 2.100; kb/20 2.57/2.60; spike/btc "entry 3.107", "entry 4.515" |
| 7 | `on_signed` burns 1.42–2.26 Tgas (n = 1) | spec §5.5 | ✓ | spike/mpc: 1.418 (ECDSA), 2.256 (1232-byte EdDSA) |
| 8 | ~12.4 Tgas ≈ 0.0012 NEAR burnt per sign | spec §5.4 | ✓ | kb/10 §TL;DR 6; 0.001165–0.001170 NEAR whether 21 or 100 Tgas is attached |
| 9 | Hold of ≈ 0.1 NEAR per 100 Tgas attached (min_gas_purchase_price 1e9) | spec §5.4 | ✓ | spike/mpc §6.5: 0.0997 NEAR refunded |
| 10 | EVM `yParity = recovery_id`; the `big_r` prefix disagreed in 26 of 50 | spec §5.8 | ✓ | kb/10 Gotchas: "matched in only 24 of 50" |
| 11 | MPC signatures are always low-S | spec §5.8 | ✓ | kb/30 §TL;DR 2 (18/18); kb/31 (source) |
| 12 | Max prepaid gas per tx is 1 PGas | task brief, spec §5.5 | ✓ | kb/10 protocol line `max_total_prepaid_gas 1e15`; kb/20 Limits |
| 13 | Logs are ≤ 16 KB per receipt | spec §5.13 | ✓ | kb/20 Limits: `max_total_log_length 16384`, `max_number_logs 100` |
| 14 | Deploy + init costs 23.1 Tgas | spec §5.7 | ✓ | kb/22 §Verified facts: tx `AovRm6…`, 23.13 Tgas |
| 15 | Mint stores 682–708 B; a first transfer to a new owner costs the contract +180 B | spec §5.4 | ✓ (incomplete) | kb/20 and spike/sdk `transfer_storage_delta`; the spec omits "−180 B when the sender's set empties" |
| 16 | 204.5 KB cdylib-only; opt "s" gives 223.4 KB; cdylib+rlib adds 27–55 % | spec §5.2 | ✓ | spike/sdk §7 table |
| 17 | near-sdk 5.29.1 on rustc 1.93 needs near-sdk-env 0.1.6; edition 2024 with resolver 3 picks it | spec §5.2, §10 | ✓ | spike/btc §17 ("edition 2024 → 0.1.6"); spike/mpc §7 |
| 18 | Reproducible image `sourcescan/cargo-near:0.22.0-rust-1.99.1` builds bit-identically | spec §5.2 | ✓ (standalone repo only) | kb/22 §TL;DR 7; see R-11 |
| 19 | `env::promise_result_checked(idx, max_len)` exists in 5.29.1 | spec §5.8 | ✓ | vendored `env.rs` L2163; kb/10 ("VERIFIED build + live") |
| 20 | A non-owner `nft_transfer` panics `Unauthorized` | spec §5.11, §5.15 | **✗** | vendored `core_impl.rs` L222: "Approval extension is disabled" |
| 21 | `Promise::detach()` exists | spec §5.8 | ✓ | vendored `promise.rs` L951 |
| 22 | near-workspaces 0.23.0 runs sandbox nearcore 2.13.4 and also passes on 2.14.0-rc.5 | spec §10, §12.3 | ✓ | spike/sdk §1, §4 (`SANDBOX_VERSION=2.14.0-rc.5`) |
| 23 | `fast_forward(250)` takes ≈ 2.4 s | spec §12.3 | ✓ | spike/sdk §4: 2.42 s; resolved at request + 211 blocks |
| 24 | Testnet blocks every 0.554–0.573 s, so 250 blocks ≈ 140 s | spec §5.5, §8.9 | ✓ | kb/50 §Chain timing |
| 25 | Solana blockhash lives ≈ 36 s (150 blocks × 0.237 s) | spec §5.9, D-09 | ✓ | kb/32 timing table: devnet ≈ 35.6 s |
| 26 | Solana rent minimum is 650,240 lamports | spec §8.9 | ✓ | kb/32 fees table (simulated `InsufficientFundsForRent` at 650,239) |
| 27 | Anyone can create a durable-nonce account for the Satchel's key, so AdvanceNonce must be refused | spec §5.9 | ✓ | kb/32 TL;DR ("InitializeNonceAccount needs no authority signature") |
| 28 | P2WPKH vsize gives 141 vB for 1 in / 2 out; dust 294/330/540/546 | spec §8.9 | ✓ | kb/30 §6: formula verified against bitcoinjs; algebraically equal to 10.5 + 68·in + 31·out |
| 29 | testnet4 real blocks: median gap 2 h, max 21 h; 85 % of txs wait for them | spec §7.4 | ✓ | kb/30 §TL;DR 7 |
| 30 | mempool.space sends ACAO `*` but its preflight 404s; emzy sends ACAO `*` and has no `/address` | spec §7.5, §8.3 | ✓ | kb/30 §TL;DR 6; spike/btc L45, L50 |
| 31 | Esplora returns `{"spent":false}` for an unknown txid, so check `/tx` first | spec §7.2 | ✓ | kb/30 §TL;DR 12 |
| 32 | `testnet4.mempool.space` is mainnet | spec §7.5 | ✓ | spike/btc L45: tip 972,467, mainnet genesis |
| 33 | Circle testnet USDC is `3e2210e1…b8af` with 6 decimals; faucet gives 20 USDC per 2 h per address; storage 0.00125 NEAR | spec §5.5 | ✓ | kb/51 §TL;DR 1, 3 |
| 34 | `ft_transfer_call` burns ≈ 2.8 Tgas; resolve gets 5 Tgas static | spec §5.5 | ✓ | kb/51 test D: 2.83 Tgas; resolve 2.04 burnt (on `usdc.fakes`) |
| 35 | Circle's resolve refunds 100 % when the receiver panics | spec §5.7 (implied) | **Unsupported** | Only `usdc.fakes.testnet` was tested; A-05 is [ASSUMED]; see R-10 |
| 36 | near-connect 0.11.4 shows 6 testnet wallets; HOT and MNW are absent | spec §8.5 | ✓ | kb/40 §TL;DR 2 (probe of the live manifest) |
| 37 | Intear rejects after 60 s; the NEAR CLI and MNW executors return at NONE | spec §8.5 | ✓ | kb/40 §TL;DR 4 |
| 38 | FastNEAR long-poll returns 408 after 10–30 s; dRPC cuts requests at ≈ 2 s | spec §8.3 | ✓ | kb/40 §TL;DR 6; kb/41 |
| 39 | MPC latency p50 6.7 s, p90 7.4 s, max 12.8 s (n = 38) | spec §8.9 | ✓ | kb/10 latency table |
| 40 | Sepolia `finalized` lags ≈ 18 min | spec §7.4 | ✓ | kb/70 F20: 88 blocks, 1,068 s |
| 41 | MPC is 3.17.0, threshold 11 of 17; the testnet MPC account has 4 full-access keys | spec §3, §4 | ✓ | kb/10 deployment table; kb/70 F17 |
| 42 | The parsers add ≈ 7.9 KB of wasm and < 0.2 Tgas | spec §5.9 | Partial | kb/70 F9 measured narrower parsers; the v1 BTC classifier is larger and unmeasured |
| 43 | X allows non-Premium uploads of at most 140 s | D-17 | Partial | kb/00: secondary sources only ("X's help centre blocks automated fetches") |
| 44 | `is_signer:true` proves the account never signed anything else | spec T4, §7.7 | **✗** | kb/50 lists `is_delegated_signer` and `is_any_signer`; see R-03 |
| 45 | "curl sees the data", therefore AI judges see it | spec §8.1 | **Unsupported** | spike/web §3 used curl only; see R-07 |
| 46 | README RPC `tx` proofs stay checkable through judging | D-10 | **✗** (non-archival) | kb/50 §TL;DR 4: ~32–40 h of history; see R-08 |
| 47 | "Minting immediately means nobody else can mint those ids first" | D-28 | **✗** | Separate persona txs after the deploy; see R-04 |
| 48 | Wallets accept 260 Tgas plus 0.05 NEAR on one FunctionCall | spec §5.5 | Unsupported | [ASSUMED] A-04; G-11 is PARTIAL (Meteor and Intear not yet tested by a human) |
| 49 | 48-byte Sepolia tx `02ee83aa36a7…80c0` hashes (keccak) to `bc657845…c377` | spec §12.1 | ✓ | kb/31 §Real MPC-signed tx |
| 50 | The FastNEAR tx API resolves a block height to a tx hash and indexes custom NEP-297 events | spec §8.6 | ✓ | kb/50 §TL;DR 2, 10 (VERIFIED) |

Result: 41 ✓ (two with caveats), 5 partial or unsupported, 4 ✗ out of the 50 rows. Every ✗ is listed as a finding in §2: #20 → R-16, #44 → R-03, #46 → R-08, #47 → R-04.

---

## 5. Coverage: S-1…S-12, journeys, UX and tests

| S | Original acceptance criterion (B3) | v1 status | Rationale recorded? | Test tasks | Notes |
|---|---|---|---|---|---|
| S-1 Mint | Returns a token; minter pays storage; excess refunded | Built (permissionless) | D-28 | SAT-005 (INV-21), SAT-012/013 (INV-18), SAT-214 | Front-run risk R-04 |
| S-2 Derived addresses | Match chainsig.js across reloads and devices | Changed: own derivation, checked against KB vectors and the live `derived_public_key` view | D-03, E-12 | SAT-204 (vitest + `@network`), checker contract-level check (SAT-281) | Stronger oracle than the original |
| S-3 Owner-only signing | Non-owner gets `ERR_NOT_OWNER`; owner's tx is visible on Sepolia and testnet4 | Built, with structured payloads | D-18 | SAT-013 (INV-01), SAT-023/032, G1–G3 | G3 = mempool acceptance only (fits testnet4) |
| S-4 Transfer = control | A fails and B succeeds after a transfer | Built | n/a | SAT-040 (INV-02), SAT-240, G4 | ✓ |
| S-5 Approvals cleared | NEP-178 approvals empty after transfer | Changed: no NEP-178 at all; `nft_transfer_call` disabled | D-07, E-20 | SAT-040 (INV-03/05) | Wrong panic string (R-16) |
| S-6 Freeze + cooldown | `list` fails while `pending_signs > 0`; `ERR_FROZEN`; `buy` from `listed_at + 210` | Changed: quiet period from `last_sign_height + 250`; cooldown 250 | D-01, D-05, E-04, E-06 | SAT-013 (INV-12), SAT-060 (INV-13), SAT-061 (INV-14) | D-05 admits neither timer is needed for safety |
| S-7 Buy with NEAR | Ownership, payment and listing removal in one tx | Built: one receipt plus a detached payout with escrow | D-14 | SAT-061 (INV-15/25), SAT-062, SAT-270 | The payout is a second receipt of the same tx, so the criterion holds |
| S-8 Buy with USDC | `{"buy": id}` at the exact price; wrong amount or token refunded | Built in the contract (msg now binds `listing_id` and `expected_sig_count`); the UI is cut #4 | D-14, D-27, E-19 | SAT-070/071 (INV-16/25), SAT-073, SAT-280 | Circle refund path untested (R-10); currency mismatch and self-buy untested (R-27) |
| S-9 Clean history | Show every signature as spent or unspent; Buy disabled while any is unspent | Changed: adds `unfunded` (non-blocking), `settling`, `unknown`, `unsafe`; checker runs in the browser | D-04, D-11, E-09, E-10 | SAT-072, SAT-271/272/273, SAT-281, SAT-100 (staging) | No e2e before staging (R-09); `unfunded` gap (R-05); gate unusable on dev (R-06) |
| S-10 Delegates | Over-cap use fails; delegates void after transfer | **Cut** | D-13 (design kept in Appendix A) | n/a | ✓ recorded |
| S-11 Solana | A devnet transfer confirms | Classifier ships in the lock; UI is P2 and cut #2 | D-20, D-22 | SAT-030, SAT-041, SAT-263, SAT-291, DP7 | Second RPC A-06 (see R-19) |
| S-12 Pay from any chain | 1Click quote → deposit → SUCCESS → USDC → buy | Optional mainnet clip, cut first, human-only | D-19 | SAT-093, SAT-101 | Needs an unlocked mainnet deployment and human funds |

**B1 journeys.** "Mint and fund": built (SAT-214, SAT-235). "Send on any chain": BTC and ETH built, SOL is P2. "Gift or transfer": built. "List, freeze, cooldown, buy": built. "Add a capped delegate": cut (D-13). Personas: Dana's needs (balances, safe handoff, USDC price) are covered. Jonas's third-party marketplaces are impossible without NEP-178 (D-07, recorded). Elena's heirloom timelock is not mentioned (R-40).

**B4 UI/UX.**
- Access tab: cut.
- Send presented as a sheet: now full-page routes styled as a sheet (D-26).
- USD totals: hidden (UX-1 default).
- "Signing 2 of 3 inputs": replaced (E-08).
- Timeout copy "no funds moved": corrected (spec §8.6, F16).
- Handoff animation (SAT-240), sale-state copy, Market badges (SAT-262/273) and accessibility (SAT-253/300): all present.

**B7 tests.**
- Present: non-owner (INV-01), transfer voids the old owner (INV-02), list blocked while pending, now as the quiet period (INV-13), buy blocked before the cooldown (INV-14), wrong USDC refunded (INV-16).
- Delegate tests: cut.
- "nightly `e2e:testnet`": changed to on-demand (D-25, recorded).
- Playwright smoke: present (SAT-252).

**Invariant → task mapping.** Every INV-xx has a task except three test halves: INV-06 (BTC variant), INV-11 (`records_survive_transfer`) and INV-17 (the sale half). See R-27.

**Do the acceptance criteria test what they claim?**
- Mostly yes.
- Exceptions: S-9 (no e2e, R-09); S-13 ("verifiable", but the first verify is on Day 13, R-11); S-14 (curl ≠ AI fetch, R-07); SAT-073 (happy path only, R-10).
- INV-18's oracle can pass while storage is under-charged (R-26).

---

## 6. Schedule analysis

### 6.1 Recomputed hours (sum of the Est column of all 114 SAT tasks; no duplicate ids)

| Day | S1 | S1+H | S2 | S2+H | H only | **S1 total** | **S2 total** | plan §2 |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| 1 Sun Nov 1 | 10.0 | 0 | 9.5 | 0 | 1.0 | 10.0 | 9.5 | ✓ |
| 2 | 9.5 | 0 | 9.5 | 0 | 0 | 9.5 | 9.5 | ✓ |
| 3 | 9.5 | 0 | 8.0 | 1.0 | 0 | 9.5 | 9.0 | ✓ |
| 4 | 9.0 | 0 | 9.0 | 0 | 0 | 9.0 | 9.0 | ✓ |
| 5 | 8.0 | 1.0 | 9.0 | 0 | 0 | 9.0 | 9.0 | ✓ |
| 6 | 8.0 | 0 | 6.0 | 2.5 | 0 | 8.0 | 8.5 | ✓ |
| 7 | 9.0 | 0 | 9.0 | 0 | 0 | 9.0 | 9.0 | ✓ |
| 8 | 7.0 | 1.5 | 9.0 | 0 | 0 | 8.5 | 9.0 | ✓ |
| 9 | 8.5 | 0 | 9.0 | 0 | 0 | 8.5 | 9.0 | ✓ |
| 10 | 4.5 | 4.5 | 8.5 | 0 | 0 | 9.0 | 8.5 | ✓ |
| 11 | 3.0 | 6.0 | 8.0 | 0 | 0 | 9.0 | 8.0 | ✓ |
| 12 | 8.0 | 0 | 3.0 | 5.0 | 0 | 8.0 | 8.0 | ✓ |
| 13 | 1.0 | 2.0 | 2.0 | 0 | 0 | 3.0 | 2.0 | ✓ |
| **Σ** | 95.0 | 15.0 | 99.5 | 8.5 | 1.0 | **110.0** | **108.0** | ✓ |

The arithmetic is right. Three caveats:
- **Human time.** Shared tasks that need a human present (S1+H, S2+H) add up to 23.5 h. If the human is S1 or S2 rather than a third person, per-person loads on Days 10, 11 and 12 reach about 11 h (R-33).
- **Unbudgeted work.** No hours are budgeted for reviewing about 100 PRs ("a human reviewing every change"), CI waits, or the reproducible Docker builds (≈ 5 min each under QEMU).
- **Pace.** 110 h over 13 consecutive days, including two weekends, is 8.5 h/day with no day off. That is possible as a sprint with AI assistance, but only if the estimates hold for integration work (wallets, RPCs, yields), which historically they do not. The plan's real buffer is Day 14 (16 h), which falls *after* the target submission.

### 6.2 Critical path and dependencies

The critical path runs through S1:

SAT-003 → 004/005 → 006 → 010 → 012/013 → 020 → 021 → 022/031 → 040/041 → 052 → 060 → 061 → 071 → 080 → 081 → 082 → 084 → **090 (lock, human gate)** → 092 (**testnet4 confirmation, external**) → 100 → 303 → 310 → 120 (human gate).

- **No task is scheduled before its listed prerequisite.**
- **Same-day cross-lane dependencies (fragile):** SAT-260 ← SAT-062 (Day 7), SAT-271/273 ← SAT-072 (Day 8), SAT-073 ← SAT-071 (Day 8), SAT-291 ← SAT-090 (Day 10, after noon).
- **Implicit work with no task:** dev redeploys before G2 and G3 (R-41); rc funding (R-14); a Buy gate that works on dev (R-06).
- **Human dependencies and deadlines:**

| Due | Action |
|---|---|
| Oct 24 | Names, and create `<team>.testnet` the same day (R-02) |
| Oct 24 → 31 | Faucets (R-14) |
| Oct 28 | FastNEAR key, MPC-team question |
| Oct 31 | Wallets, design decisions, X Premium answer, approval text (R-01) |
| Nov 1, 00:00–09:00 UTC | Repo creation and standing approvals |
| Nov 9 | ≥ 60 USDC collected; 1Click go/no-go at 12:00 |
| Nov 10 | Payout account; lock approval in the 10:00–12:00 window |
| Nov 12 | Video and payload fields |
| Nov 13 | Public repo (10:00), X post (13:00), "yes" to submit (14:00) |

### 6.3 Top 5 schedule risks

1. **S1 is overloaded and sits on the critical path** (R-15). A one-day S1 slip moves the freeze, the lock, staging and the video.
2. **The lock slips into testnet4 timing** (R-12). The hard deadline of Nov 11, 12:00 leaves only about a day for a BTC confirmation before the Day-12 recording, and gaps of up to 21 h have been observed.
3. **Wallets and RPCs.** Meteor and Intear with 260 Tgas, yields and partial outcomes (A-04, risk R6) on Days 3–4. If one misbehaves, the signing store and G2/G3 need rework.
4. **Release tooling discovered late.** The workspace reproducible build (R-11), the Buy gate on dev (R-06) and Circle refunds (R-10) all first surface on Days 8–9, right before the freeze.
5. **Human availability at fixed times.** Nov 1 00:00 UTC is 02:00 EET. The lock window needs a human per step. The Day-13 sequence is public → post → submit. On top of that come Phase-0 captcha faucets (R-14).

### 6.4 De-scoping options (ranked; hours freed)

| # | Cut | Frees | Pitch / safety impact |
|---|---|---|---|
| 1 | 1Click mainnet clip, decided now rather than on Day 9 | S1 5.5 h (Days 10–11), H 2 h, mainnet risk | None for testnet judging; the clip was optional |
| 2 | Solana UI (contract classifier still ships) | S2 5.5 h | Small; the README can say "contract supports SOL" |
| 3 | OG image and prices | S2 3 h | None |
| 4 | Activity tab reduced to contract records plus explorer links | S2 ≈ 2 h | Small |
| 5 | SECURITY.md folded into the README security section | S1 1.5 h | None |
| 6 | USDC entirely (`usdc: None`; drops SAT-070/071/073/280) | ≈ 8 h across lanes, plus the Circle risk and contract surface | Loses S-8 (Dana's "USDC price"); NEAR buy remains |
| 7 | Simplify the checker: SOL dead by age, EVM checks only the max nonce, BTC checked per txid (R-19, R-20) | S1/S2 ≈ 2 h, plus fewer provider failure modes | None; arguably safer |

**If one day behind on Day 5:** cut #1 and #2 at once (≈ 11 h across both lanes), plus #3. Move SAT-072 (checker core) to S2 on Day 8. Keep every never-cut item from D-20. If still behind on Day 7, take #6 before compromising the BTC send or the clean-history gate.

### 6.5 Over-engineering that can go without hurting the pitch or safety

- Two-provider agreement for SOL (it is dead by construction after 120 s) and the 200-record cap (R-19, R-20).
- The buy cooldown after listing. D-05 itself says it is not needed for safety. Keep it only for S-6 continuity: it costs about 2 × 140 s per demo or e2e sale.
- Rebuilding a BTC tx on another device from FastNEAR events. Same-device rebuild plus EVM-from-state covers the demo.
- The 30-minute keyed lock session with separate mints. One atomic tx is simpler *and* safer (R-04).

---

## 7. Questions only the human can answer

1. **Who is "H"?** A third person, or S1/S2? Which time zones do S1 and S2 work in? The Day-1 timetable starts at 02:00 EET on a Sunday (R-33).
2. **Final-account creation (R-04):** option (a), one atomic deploy + init + mint tx and then delete the key, or option (b), a keyless account that never has a key? Option (b) gives up the ability to fix a wrong init argument.
3. **Do you have a testnet4-capable wallet (e.g. Sparrow) by Oct 24?** If not, do you accept funding through dev Satchels from Nov 1 (R-14)?
4. **Should #3's sale story include BTC records at all**, given the testnet4 confirmation risk, or should BTC "settled" be shown on a separate token (R-12)?
5. **If Circle USDC fails the refund test**, should the final contract use `usdc: None` (drop S-8), or should USDC be demonstrated on a separate unlocked deployment and disclosed (R-10, R-38)?
6. **For testnet only**, may Buy proceed when one of the two providers is down, if the UI says so explicitly (R-19)?
7. **On dev and rc**, may the UI downgrade the lock and code-hash checks to a warning, or should `rc` be locked after its rehearsal (R-06)?
8. **Cut the 1Click clip now** instead of at DP4 (frees 5.5 S1 h and 2 H h on the lock days)?
9. **Approve the reworded "Pre-hackathon work" disclosure** (re-typed research snippets, October faucet funding; R-21).
10. **Expand the H-20 standing approval** to cover the `<team>.testnet` key for creating and funding dev/rc accounts and for USDC registration, within the caps (R-01)?
11. **Confirm the chain allowlist `{11155111}` and "no ERC-20" by Nov 1** rather than Nov 8 (R-31).
12. **Organizer answers (H-10)**, especially whether the AI judges have network access and run code. That decides how much weight R-07 and R-08 carry compared with the committed evidence.
