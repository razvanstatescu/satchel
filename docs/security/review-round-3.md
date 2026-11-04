# Satchel contract: adversarial security review, round 3

Reviewed on 2026-11-04. Scope: `contracts/satchel/src/**` at `main` `bf32bac` (the contract code is identical to
`b8ccb5e`; the commits in between only touched comments and docs), plus the parts of the buyer's checker
(`packages/core/src/clean-history`), the web app and `tools/deploy` that a finding depends on.

This round reports only **new** issues, or fixes found incomplete. The baseline is the two earlier rounds,
`contract-review.md` (S-01 to S-13) and `sprint-review.md` (M-01, L-01 to L-05, I-01 to I-09), and
`docs/testing/contract.md` (AUDIT-01 to 04, Q-03, Q-04).

**Method.** Four independent adversarial reviewers, each with its own scope:
- escrow and money flows;
- the signing pipeline, parsers and clean history;
- C5 delegated allowances;
- access control, the token lifecycle, griefing and the NEAR platform layer.

A consolidation pass then re-ran every proof, re-read the cited dependency code (near-sdk and
near-contract-standards 5.29.1) and the checker code, and re-rated each finding against the earlier rounds.

**Proofs.** The proofs are unit tests on near-sdk's mocked runtime. No sandbox suite was run this round (see
Limitations). No contract source was changed.

## Summary verdict

**There is no Critical or High finding in the contract.** The properties behind the product promise hold on every path
the reviewers could find:

- **No signature without an exact record.** The MPC arguments equal the records for all six request kinds (EVM, USDC,
  10-input BTC, SOL, both message kinds). Crafted token ids (`"1/evm"`, `"01"`, `" 1"`, `""`, `"1\0"`) are refused
  before any write or promise.
- **No blind signing, and the parsers are canonical and panic-free.** This was checked exhaustively against the
  reference decoders for compact-u16 (Solana) and CompactSize (Bitcoin Core), and with proptests for RLP header abuse,
  UTF-8 and hex boundaries.
- **Escrow is conserved.** A new fuzz runs random sequences of 19 money operations, with every payout, refund and inside
  withdrawal delivered or failed at random. After every step:
  - the contract's spare NEAR never drops by more than the storage growth M-01 already guards;
  - each FT ledger (USDC, wNEAR) equals the contract's real FT balance exactly;
  - I-M2 holds;
  - the offer indexes are consistent.

  It passed 256 cases.
- **No outsider can affect a token they don't own.** An outsider can't change state they don't own, can't make an
  offer stale, can't restart a token's quiet period, and can't make a pending `buy` or `accept_offer` fail.
- **Every ownership path clears allowances.**

**New findings:** 2 Medium (one is a design gap in C5, the other is in the off-chain buyer's checker), 4 Low (R3-X-3
is in the web app only) and 5 Info (R3-X-4 is reasoning only).

**Status (2026-11-04):** every finding is fixed or mitigated on branch `fix/r3-findings`; see "Fix pass" below.
R3-A-1 and R3-A-2 are by design, so they are documented and surfaced in the app rather than changed in the contract.

**Fix first:**

1. **R3-S-1** (checker only, no contract change): the BTC txid cap must not cover history that can never be cached.
   Today it makes tokens permanently unbuyable.
2. **R3-A-1** (docs and UI now, contract optional): stop presenting the cap as a 24 h *spending* limit and revoke as an
   immediate stop. Show each delegate's outstanding exposure, and offer to settle it on revoke.
3. Before the Nov 9 freeze, two small contract changes are worth taking:
   - R3-X-1/R3-X-2: `nft_tokens` pages by numeric id;
   - R3-I-1: `deny_unknown_fields` on `SignRequest` and `#[deny_unknown_arguments]` on `sign_for`.

## Fix pass (2026-11-04)

Every finding now has a status. The fixes are on branch `fix/r3-findings`, on top of `review/r3-contract-audit`.

| ID | Status | What changed | Tests |
|---|---|---|---|
| R3-S-1 | **Fixed** | `checkBtc`: past the cap it lists the coins at the Satchel's address (`BtcSource.utxos`, Esplora `/address/:a/utxo`, union over the providers). Only requests that spend one of them are queried and count against the cap. The others get the new non-blocking status `inactive` (never cached, outpoints still encumbered). With no coin list the cap applies to every record (fail closed). The app shows `inactive` as "Not a current coin". kb/90 §7.3 and §7.5 updated | core `review-r3s1.test.ts` (9); web `clean-view.test.ts`, `allowance-outstanding.test.ts` |
| R3-A-1 | **Mitigated** (docs + UI) | C5.md §4 now says the cap limits signing, not spending, and that revoke, expiry and a transfer stop only new signatures; §7 has the note. The app shows each delegate's signatures that the clean-history check hasn't shown dead (count and amounts). The Revoke confirmation says revoking stops only new signatures and links to settling them. A contract-side cumulative budget is a design change, deferred past the freeze | web `allowance-outstanding.test.ts`, e2e `allowance.spec.ts`; the `r3a1_*` demos still pass (the behaviour is by design) |
| R3-X-1 | **Fixed** | `nft_tokens` pages by numeric id: 6.87 Tgas at any depth (was ≥ 710 Tgas at `from_index` 950 of 1,000 tokens). The library's refusals are kept | unit `r3x1_guard_deep_nft_tokens_page_costs_like_the_first`, the ignored 1,000-token proof (passes); sandbox `review3.rs::r3_x_nft_tokens_pages_in_mint_order` (run 2026-11-04 on the cargo-near wasm: pass) |
| R3-X-2 | **Fixed** | The same override: mint order, so page 0 holds tokens 1–50 | unit `r3x2_guard_pages_follow_mint_order`, `r3x_guard_nft_tokens_refusals_and_shape_match_the_library` |
| R3-A-2 | **Mitigated** (docs + UI) | C5.md §7 documents it. Before List and Accept offer, the app tells an owner with live access granted to revoke first. No contract change: a minimum fee can't stop a delegate who pays a near-zero one | e2e `allowance.spec.ts`; the `r3a2_*` demo still passes (by design) |
| R3-X-3 | **Fixed** | `listOwnerTokens` pages `nft_tokens_for_owner` up to `nft_supply_for_owner` (at most 20 pages, de-duplicated, sorted by id). My Satchels, Mint and the claim page use it | web `owner-tokens.test.ts` |
| R3-A-3 | **Fixed** | `set_allowance` emits `allowances_cleared {reason: "expired"}` for the delegates it drops, after the storage charge and before `allowance_set` | unit `r3a3_set_allowance_announces_dropped_expired_allowances` |
| R3-I-1 | **Fixed** | `SignRequest` has `deny_unknown_fields`, and `sign_for` has `#[deny_unknown_arguments]` | unit `review3_i1_sign_request_refuses_unknown_fields`; sandbox `review3.rs::r3_i1_*` (run 2026-11-04 on the cargo-near wasm: pass) |
| R3-X-4 | **Fixed** | The gift link names the gifted ids (`/claim#<secret>&gift=<ids>`, fragment only), and a claim moves only those. Anything else is listed as "also here, not part of this gift". Each transfer is isolated and the NEAR sweep always runs. Older links still work, with a note | web `claim-plan.test.ts`, e2e `give-link.spec.ts` |
| R3-D-1 | **Fixed** | `validateBirth` refuses any two of the child, `--mpc`, `--usdc` and `wrap.testnet` being the same account, and demo mints to USDC. The pre-checks require USDC's `ft_metadata` to be `USDC` with 6 decimals | tools `keyless-birth.test.ts` |
| R3-N-1 | Accepted | — | guards `r3_m1_*` |
| R2-02 + the order note | **Fixed** | `checkDelegatedSign` refuses a delegate's message kind first, as the contract's `authorize_signer` does | tools `new-features.test.ts`, core `allowance.test.ts` |

**The wasm changes.** Before the rc birth:
- rebuild with cargo-near (reproducible);
- run the sandbox suite on that artifact, including the new `review3.rs`;
- run `tools/check-wasm-imports.sh` on it;
- update the expected code hash (`EXPECTED_CODE_HASH`, docs).

Here, a plain `cargo build -p satchel --target wasm32-unknown-unknown --release` of this branch compiles (so the
macro-generated entry points with `deny_unknown_fields` are valid) and passes INV-22.

## Findings

| ID | Severity | Status | Where | Summary |
|---|---|---|---|---|
| R3-A-1 | **Medium** | **Mitigated** (docs + UI, 2026-11-04); contract change deferred | `allowance.rs:219-276`, `:616-632`; `evm_nonces.rs:31-40`; `docs/specs/C5.md` §4 | The cap limits what a delegate may **sign** per 24 h, not what it can **spend**. Banked signatures exceed the cap and survive revoke |
| R3-S-1 | **Medium** (off-chain) | **Fixed** (`packages/core` + app, 2026-11-04) | `clean-history/btc.ts:85-86`, `:133-135`; `checker.ts:140-148`; `types.ts:98` | More than 100 distinct BTC txids in a token's history make it permanently unbuyable from any fresh browser |
| R3-X-1 | Low | **Fixed** (contract, 2026-11-04) | `lib.rs:318-320`; nc-standards `enumeration_impl.rs:37-40`; near-sdk `collections/tree_map.rs:823-831` | S-05's fix is incomplete: deep `nft_tokens` pages cost O(from_index × log n) reads and exceed the view gas limit |
| R3-X-2 | Low | **Fixed** (contract, 2026-11-04) | same; `apps/web/src/lib/data/server.ts:218` | `nft_tokens` pages in lexicographic id order, so the SSR market page drops Satchels (genesis 6–9, ids ≥ 55) |
| R3-A-2 | Low | **Mitigated** (docs + UI, 2026-11-04); no contract change | `allowance.rs:384`; `sign.rs:91-92`; `sale.rs:93-96`; `offers.rs:281-289` | A delegate can stall `list`/`accept_offer` and stale every offer with zero-debit requests, up to 32 times a day |
| R3-X-3 | Low (web) | **Fixed** (`apps/web`, 2026-11-04) | `MySatchels.tsx:64`, `MintFlow.tsx:173`, `claim-source.ts:28,41` | Spam mints push a holder's newly received Satchel off page 0 of every web reader |
| R3-A-3 | Info | **Fixed** (contract, 2026-11-04) | `allowance.rs:583` | `set_allowance` drops other expired allowances without an event |
| R3-I-1 | Info | **Fixed** (contract, 2026-11-04) | `types.rs:36-47`; `sign.rs:45-46` | `sign_for` silently accepts unknown JSON fields (phishing decoys in wallet prompts) |
| R3-X-4 | Info (web; reasoning only) | **Fixed** (`apps/web`, 2026-11-04) | `ClaimFlow.tsx:113,156`; `claim-source.ts:59-64` | A give-by-link claim takes every token in the gift account, including ones an outsider injected |
| R3-D-1 | Info | **Fixed** (`tools`, 2026-11-04) | `tools/deploy/keyless-birth.ts:61-82`, `:163-184` | The birth pre-checks verify the USDC account exists, not that it is USDC |
| R3-N-1 | Info | Accepted (pinned by a guard test) | `sale.rs:68-79`; `market.rs:133-147` | A USDC buy's payout yocto comes from the contract's own NEAR. It's harmless because no USDC buy leaves storage level |

### R3-A-1 (Medium): the cap limits signing, not spending, and revoke stops only new signatures

**What happens:**
- Each delegated debit is stamped with the time it was **signed**. It leaves the rolling window after 24 h whether or
  not its signature was ever broadcast.
- Nothing in the contract, or on any chain, voids an unbroadcast EVM or BTC signature. `revoke_allowance`, expiry and
  ownership changes stop only new signatures.
- So C5.md §4's "there is no boundary where 2× the cap can be spent" holds for signing, not for spending.

**How a delegate exploits it:**
- **EVM:**
  - The delegate signs a full-cap send each day at consecutive nonces N, N+1, N+2 (the nonce-gap rule allows max + 1
    every time) and broadcasts none.
  - After k days it can broadcast all k in one block, which moves k × cap, also after a revoke.
  - Until those nonces are used, it can also front-run each of the owner's own sends at a banked nonce.
- **BTC, with a single UTXO:**
  - tx1 spends U and sends `cap − fee` out, with change to the Satchel's own P2WPKH.
  - The next day, tx2 spends tx1's unbroadcast change outpoint. A segwit txid excludes the witness, so the outpoint is
    known before anything is signed. tx3 does the same on day 3.
  - Each debit equals the cap and is accepted, and together they form a valid parent → child chain.
- **SOL** is not affected: a blockhash expires in about 60–90 s.

**Who is protected:**
- The buyer still is: the banked records are `unused`, so the Buy gate blocks (as A-25 and C5.md §7 describe).
- The owner is not. The owner's model ("at most X a day; revoke ends it") is wrong by a factor of up to the number of
  days the allowance was live.

**Why Medium:**
- Every unit is a recorded, debited signature, and over the allowance's life the total is still at most cap × days.
- But a burst of that whole amount, after revoke, is real value the owner believes is protected.

**Proof** (both pass; they demonstrate the behaviour):
- `review3_allowance_tests::r3a1_banked_evm_signatures_exceed_the_cap_and_survive_revoke`: three full-cap sends at
  nonces 0–2, worth 3 × cap, still live after the revoke.
- `review3_allowance_tests::r3a1_banked_btc_chain_on_own_change_exceeds_the_cap`: one UTXO, a three-transaction chain
  worth 3 × cap, all signed and broadcastable at once.

**Fix:**
- **Docs:** C5.md §3, §4 and §7 should say the cap limits signing and that revoke stops only new signatures.
- **UI:**
  - Show each delegate's **outstanding exposure**: the total debit of its records that the checker still calls
    `unused`.
  - On revoke or expiry, offer **settle**: a self-send at each outstanding EVM nonce, and spending each signed BTC input
    back to the Satchel.
- **Contract (optional, after the freeze):** replace the rolling window with a cumulative budget that the owner tops
  up. That bounds the bank.

### R3-S-1 (Medium, off-chain): the BTC txid cap permanently blocks Buy

**What happens:**
- `checkBtc` counts the distinct txids of uncached records. Above `maxBtcTxids` (100) it queries **nothing** and marks
  every BTC item `unknown / too_many_txids`.
- Only `spent` (BTC) and `expired` (SOL) verdicts are ever cached, and the cache is the buyer's browser.
- So a fresh browser over the cap can never make progress: nothing is queried, so nothing becomes `spent`, so nothing is
  cached.
- `unfunded` (fabricated) and `foreign` txids can't be cached in any browser.
- This also gets around S-07's "foreign is non-blocking".
- The spec's remedy (`kb/90` §7.5, R-20: "ask the seller to consolidate") can't work, because records are permanent and
  the cap counts history, not current UTXOs.

**Scenarios:**
- **Malicious:**
  - An owner signs 11 BTC requests of 10 inputs each, naming 110 fabricated txids. That costs about 0.263 NEAR of
    storage and MPC deposit, plus about 0.22 NEAR of gas.
  - The owner then gives the token away or sells it OTC. No buyer can pass the gate, ever.
- **Organic:** any Satchel whose BTC history spent from more than 100 distinct funding txs (roughly 100 sends) can't be
  bought from a fresh browser, even if every record has long been spent.

It fails closed, so no funds are at risk. It is fixable because the checker isn't immutable.

**Why Medium and not the reviewer's High:** this is consistent with the earlier poison findings S-04 and S-07 (Low),
raised a step for the organic case and the low cost.

**Proof:**
- `review3_sign_tests::review3_s1_btc_txid_cap_poison_is_cheap_and_travels_with_the_token` (passes): 110 records with
  110 distinct fabricated txids are accepted, cost 0.2629 NEAR, and survive `nft_transfer`.
- The checker side is shown by the existing `packages/core/test/clean-history.test.ts:266` (101 txids →
  `too_many_txids`) plus the code read above.

**Fix (TS only):**
- Apply the cap only to records whose outpoint is a current UTXO of the token's own scripts (one `/address/:a/utxo` per
  script type), plus their sibling inputs.
- Treat every other record as non-blocking, but keep its outpoint in `encumbered`.
- Or query in capped batches across runs, so the cache fills.
- Do **not** cache `unfunded`: the txid may still appear.
- Correct the R-20 text.

### R3-X-1 (Low): deep `nft_tokens` pages exceed the view gas limit

**Cause:**
- The S-05 fix clamps `limit` but still `skip`s `from_index` keys on the legacy `TreeMap`.
- Its cursor's `nth` calls `progress_key()` once per skipped key, and each call is a fresh root-to-leaf `higher()`
  search, each step a storage read (`tree_map.rs:823-831`, `:913-919`, `:225`).

**Measured** (host gas only, a lower bound), with 1,000 tokens, for `nft_tokens(from, 50)`:

| `from` | Host gas |
|---|---|
| 0 | 43 Tgas |
| 250 | 221 Tgas |
| 500 | 395 Tgas |
| 750 | 566 Tgas |
| 950 | 710 Tgas |

`nft_tokens_for_owner` stays at 7 Tgas at any depth.

**Impact:**
- Past from ≈ 350, every page exceeds the 300 Tgas view limit, so wallets, indexers and judge scripts can't enumerate
  the collection.
- 1,000 tokens comes from organic growth, or from about 5 NEAR of spam mints (4.97 mNEAR each).

**Proof:**
- `review3_acl_tests::r3x1_proof_every_nft_tokens_page_fits_a_view_call` (ignored; fails today with ≥ 710.13 Tgas).
- The demos `r3x1_demo_nft_tokens_page_cost_grows_with_from_index` and `r3x1_demo_numeric_id_paging_is_flat` (ignored as
  slow; they pass).

**Fix:** override `nft_tokens` to page by numeric id. Ids are dense (`1..next_token_id`) and there is no burn. NEP-181
doesn't fix the order. Measured flat at 6.9 Tgas at any offset:

```rust
fn nft_tokens(&self, from_index: Option<U128>, limit: Option<u64>) -> Vec<Token> {
    let from = from_index.map_or(0, |i| i.0);
    let n = page_limit(limit).unwrap_or(MAX_PAGE as u64) as usize;
    (from.saturating_add(1)..self.next_token_id as u128).take(n).filter_map(|i| self.tokens.nft_token(i.to_string())).collect()
}
```

### R3-X-2 (Low): `nft_tokens` order hides Satchels on the SSR market page

**What happens:**
- The TreeMap is keyed by `String`, so the order is lexicographic.
- Past 54 tokens, page 0 is `1, 10…19, 2, 20…29, 3, …, 5, 50…54`.
- `getUnlistedMarket` (`server.ts:218`) reads only `nftTokens("0", 50)`, so genesis tokens 6–9 and every id ≥ 55 vanish
  from the judge-visible "Make an offer" page.
- It happens organically, or on purpose for about 0.7 NEAR of mints.

**Proof:** `r3x2_proof_first_page_holds_the_first_minted_tokens` (ignored; fails today) and
`r3x2_demo_first_nft_tokens_page_is_lexicographic` (passes).

**Fix:** the R3-X-1 override. Or, in the app, page until the supply is exhausted (capped).

### R3-A-2 (Low): zero-debit delegate requests stall sales

**What happens:**
- An EVM request with `gas_limit = 0, max_fee = 0, value = 0` classifies and is debited 0. It can never execute, and a
  1-wei cap is enough to send it.
- Each one bumps `sig_count`, so every open offer fails with `ERR_OFFER_STALE`.
- Each one also restarts the 250-block quiet period, so `list` and `accept_offer` refuse.
- A delegate can send up to 32 a day: either front-running each accept attempt, or keeping the token unlistable for
  about 7,969 blocks a day (about 74 min).
- The owner ends it with `revoke_allowance` (1 yocto), then waits out one quiet period.

**Proof:** `review3_allowance_tests::r3a2_zero_debit_requests_stale_offers_and_restart_the_quiet_period` (passes).

**Fix:**
- Docs (C5.md §7) and UI: prompt "revoke delegates first" before list or accept.
- Optionally, refuse delegated EVM requests with `gas_limit < 21000` or `max_fee == 0`. That makes griefing use up
  budget, though it doesn't prevent it.

### R3-X-3 (Low, web): spam mints hide a newly received Satchel

**What happens:**
- Minting is permissionless to any receiver, and `nft_tokens_for_owner` keeps insertion order.
- Every web reader reads only page 0.
- After an outsider mints 50 tokens to alice (about 0.25 NEAR), any Satchel she later receives (a gift, a buy, an
  accepted offer) lands at index ≥ 51 and is missing from "My Satchels".

**Proof:** `review3_acl_tests::r3x3_demo_spam_mints_hide_a_newly_received_token` (passes).

**Fix:** page up to `nft_supply_for_owner` (capped, with "more"), or sort by id across pages.

### Info items

- **R3-A-3.** `set_allowance` drops other delegates' expired allowances (spec §2 step 7) without an event.
  - An event-only indexer keeps showing them, and `revoke_allowance` then fails with `ERR_ALLOWANCE_NOT_FOUND`.
  - Fix: emit `allowances_cleared {reason: "expired"}` for the dropped delegates.
  - Proof: `r3a3_set_allowance_drops_expired_allowances_without_an_event`.
- **R3-I-1.** `SignRequest` has no `deny_unknown_fields`, and `sign_for` has no `#[deny_unknown_arguments]` (which
  near-sdk-macros 5.29.1 supports).
  - A phishing dapp can add decoy fields that a wallet shows the owner, e.g.
    `{"evm":{"unsigned_tx":"02…","to":"0x…a11c","value":"0.000001 ETH"}}`.
  - The record stays exact, so clean history is unaffected. `FtMsg` is already strict for this reason (Q-04).
  - Fix: add both attributes; consider `#[deny_unknown_arguments]` on the other mutating methods too.
  - Proof: `review3_sign_tests::review3_i1_sign_request_ignores_unknown_fields`.
- **R3-X-4** (reasoning only). A give-by-link claim transfers every token in the gift's implicit account, including any
  an outsider minted or transferred in after the link was made.
  - Each row runs the clean check, so poison is flagged. The rest is confusion and a small gas drain, since an
    exception aborts the loop before the NEAR sweep. The attacker pays more than the victim loses.
  - Fix: record the gifted ids in the link, and show anything else as "also here, not part of the gift".
- **R3-D-1.** `usdc` is immutable after birth, but the pre-checks only confirm that the account exists.
  - A wrong account (e.g. `wrap.testnet`, 24 decimals) would make USDC-priced listings payable in that token at USDC base
    units.
  - Fix: pre-check `ft_metadata()` (`symbol == "USDC"`, `decimals == 6`) and that `usdc`, `mpc`, `wrap.testnet` and the
    child are pairwise distinct. Keep asserting `config()` after birth (S-08).
- **R3-N-1** (accepted).
  - A USDC buy carries no NEAR, yet the payout `ft_transfer` attaches 1 yocto of the contract's own NEAR, and
    `ensure_solvent` returns early when storage didn't grow. A USDC buy that left storage exactly level would leave
    escrow 1 yocto short.
  - None does:
    - a first-time buyer nets `2·(len(buyer) − len(seller)) − 35` B, which is always odd;
    - otherwise the net is ≤ −100 B.
  - Pinned by `review3_money_tests::r3_m1_no_usdc_buy_keeps_storage_level`, with the yocto itself pinned by
    `r3_m1_usdc_buy_spends_one_yocto_of_contract_near`.
  - Optional hardening: also run the check when the call spent contract NEAR without growing storage.

### Notes (no finding)

- **Mainnet readiness.** BIP143 commits to no network. A record whose outpoint is on another network is `unfunded` to the
  testnet4 checker. That doesn't matter for this testnet product, but a mainnet checker must judge every outpoint on its
  own network.
- **Rust/TS error-code order.** For an expired or listed delegate sending a valid message, Rust returns
  `ERR_ALLOWANCE_KIND`, while core returns `ERR_ALLOWANCE_EXPIRED` or `ERR_FROZEN`. Both refuse. It's the same class as
  the known R2-02: check the message kind first in TS.
- **Checker throughput** (reasoning only). `unfunded` and `foreign` BTC txids are re-queried on every check on two
  providers, and SOL has no cap on distinct blockhashes. Very large histories may hit provider rate limits and read
  `unknown`. That fails closed, and SOL progress is cached.

## Proof tests

The tests come in three kinds:
- **Demonstrating tests** pass while a behaviour exists. They stay for R3-A-1 and R3-A-2, which are by design.
- **Guards** pass since the 2026-11-04 fix pass and fail if a fix regresses. The R3-X, R3-A-3 and R3-I-1 tests were
  flipped from demonstrations or `PROOF` tests into guards.
- **Slow tests** are `#[ignore]`d and should be run on demand.

| ID | File · test | Today |
|---|---|---|
| R3-A-1 | `review3_allowance_tests::r3a1_banked_evm_signatures_exceed_the_cap_and_survive_revoke`, `::r3a1_banked_btc_chain_on_own_change_exceeds_the_cap` | pass (demonstrate) |
| R3-A-2 | `review3_allowance_tests::r3a2_zero_debit_requests_stale_offers_and_restart_the_quiet_period` | pass (demonstrates) |
| R3-A-3 | `review3_allowance_tests::r3a3_set_allowance_announces_dropped_expired_allowances` | pass (guard) |
| R3-S-1 | `review3_sign_tests::review3_s1_btc_txid_cap_poison_is_cheap_and_travels_with_the_token` (the records are still accepted; the checker no longer blocks on them); core `review-r3s1.test.ts` (9) | pass (guards) |
| R3-I-1 | `review3_sign_tests::review3_i1_sign_request_refuses_unknown_fields`; sandbox `review3.rs::r3_i1_sign_for_refuses_unknown_arguments_and_fields` (run 2026-11-04 on the cargo-near wasm: pass) | pass (guard) |
| R3-X-1 | `review3_acl_tests::r3x1_guard_deep_nft_tokens_page_costs_like_the_first` (200 tokens, with the library measured alongside) | pass (guard) |
| R3-X-1 | `review3_acl_tests::r3x1_proof_every_nft_tokens_page_fits_a_view_call` (1,000 tokens) | ignored (slow); passes since the fix (6.87 Tgas) |
| R3-X-2 | `review3_acl_tests::r3x2_guard_pages_follow_mint_order`, `::r3x_guard_nft_tokens_refusals_and_shape_match_the_library`; sandbox `review3.rs::r3_x_nft_tokens_pages_in_mint_order` (run 2026-11-04 on the cargo-near wasm: pass) | pass (guards) |
| R3-X-3 | `review3_acl_tests::r3x3_demo_spam_mints_hide_a_newly_received_token` | pass (demonstrates) |
| R3-N-1 | `review3_money_tests::r3_m1_usdc_buy_spends_one_yocto_of_contract_near`, `::r3_m1_no_usdc_buy_keeps_storage_level` | pass (guards) |
| — | `review3_money_tests::prop_r3_conservation_over_every_money_path` (conservation fuzz, ≈ 1 s per case) | ignored (slow); 256 cases pass |
| — | `review3_acl_tests::r3x_sound_*` (zero-deposit refusals for 18 methods, constant root state size, NFT library key layout, outsiders vs a pending sale/accept) | pass |
| — | `review3_sign_tests::review3_q1_*`, `q5`, `q6`, `q8`; `parse::review3_parse_tests::*` (8, incl. 5 proptests) | pass |
| — | `review3_allowance_tests::r3_sound_*` (window boundary and re-keying, BTC varint agreement) | pass |

Run all of them:

```
cargo test -p satchel --lib review3_ -- --include-ignored
```

Since the fix pass every one of them passes, including the ignored slow ones. The fuzz takes `PROPTEST_CASES`
(default 64). The checker's tests: `cd packages/core && pnpm exec vitest run test/review-r3s1.test.ts`.

## What was checked and found sound

**Signing and clean history**
- **MPC calls.** Each MPC call is exactly `{"request":{path,payload_v2,domain_id}}`:
  - the path is `satchel/{id}/{chain}`, and the domain is 0/0/1 for BTC/EVM/SOL;
  - the Ecdsa payload equals the record payload, and for Eddsa, sha256 of the signed bytes equals the record payload;
  - the deposit is `d`;
  - `on_signed` waits on all n receipts.
- **`on_signed` handles every result shape:** Signed, Failed, garbage, TooLong (1,025 B), a wrong scheme, n larger than
  the result count, missing tokens and seqs, and `first_seq = u64::MAX`. It never overwrites a non-Pending slot or grows
  storage. A maximal real ed25519 reply is 290 B, under `MAX_MPC_RESPONSE = 1024`.
- **Worst-case sizes fit.**
  - 10 BTC inputs with 1,024 B of outputs log 8,066 B; the largest messages log about 2.5 KB. Both are under the
    16,384 B limit.
  - The largest MPC args are 2,164 B.
  - The gas floor for n = 10 is covered by the existing sandbox tests.
- **Parsers.**
  - compact-u16 matches Solana's `short_vec` on all 34,048 one- and two-byte encodings.
  - CompactSize matches Bitcoin Core on every width.
  - RLP accepts only the unique canonical encoding (header-abuse proptest, depth up to 20, length-of-length 1–8).
  - UTF-8 matches Unicode Table 3-7, and hex is strict against an adversarial alphabet.
- **No cross-format or cross-key reuse.**
  - An accepted BIP143 preimage can never align as a legacy sighash preimage.
  - The Solana key can't produce a NEAR tx or NEP-413 signature: those sign 32-byte hashes, and the smallest acceptable
    SOL message is 118 B.
  - The EVM key can't produce a NEAR eth-wallet signature: that needs chain id 397/398, which the allowlist refuses.
  - The nonce-gap rule is per chain, and messages never touch it.
- **History views.** `history_digest` ignores callbacks, `write_entry` is injective over the details, and nonexistent
  tokens give null or empty pages.

**Money**
- **`ensure_solvent` is exact under nearcore semantics** (`account_balance` includes the attached deposit, and transfers
  created earlier in the call are already deducted). `escrow_near` is complete.
- **Contract-paid storage grows only on the three guarded paths.** Callbacks never change storage or NEAR.
- **Every re-credit hits an existing slot, and every `-=` is bounded by a per-entry value**, so an underflow panic can't
  block a withdrawal.
- **`ft_on_transfer` never credits a ledger without tokens received**, and any refusal makes the FT refund 100 %.
- **Offers are taken exactly once.** The swap-remove indexes stay consistent, so the `env::abort()` in `IdIndex::remove`
  is unreachable (fuzz-checked).

**C5 allowances**
- **Per request, debits are true upper bounds:**
  - EVM `value + gas × max_fee` (the network refuses a tip above `max_fee`; Arbitrum charges at most `max_fee` per gas);
  - BTC with one input (change detection can only keep coins under the Satchel's own key; re-signing, RBF and CPFP
    over-count, which is the safe direction);
  - SOL `lamports + 5000`.
- **The debit parsers agree with the classifier** on every accepted byte string.
- **The window is exact at t + 24 h.** An ERC-20 request takes 2 of the 32 slots. Re-keying a token address keeps its
  spends.
- **Every ownership path clears allowances.** A→B→A doesn't revive them, and the owner binding is a backstop.

**Access control and platform**
- **No user-called mutating method runs with 0 deposit** (all 18 were checked), so a function-call access key can't
  call any of them. The exceptions run with 0 deposit by design: `ft_on_transfer`, which only allowlisted FTs reach,
  and the `#[private]` callbacks.
- **Every ACL uses the predecessor.**
- **The current owner always equals `listing.seller`.**
- **Storage prefixes are disjoint** from the near-contract-standards keys (TreeMap `0x00 'v'/'n'` against per-owner sets
  `0x00 0x20…`), checked on real keys.
- **The root `Contract` borsh size is constant across every kind of call.**
- **`#[private]` expands to `current_account_id == predecessor`, and `#[init]` refuses a second init.**
- **Every user string in an event is JSON-escaped inside one log line.**

## Test runs (2026-11-04)

**During the review** (branch `review/r3-contract-audit`, contract unchanged):

| Suite | Result |
|---|---|
| `cargo test -p satchel --lib` (default) | **230 passed, 0 failed, 6 ignored** in 32 s (the baseline before this round was 202 passed in 29 s) |
| `PROPTEST_CASES=16 cargo test -p satchel --lib review3_ -- --include-ignored` | 32 passed and 2 failed: exactly the R3-X-1 and R3-X-2 `PROOF` tests, as intended |
| `PROPTEST_CASES=256 … prop_r3_conservation_over_every_money_path -- --include-ignored` | 256 cases passed in the reviewer's run (≈ 258 s); 24 cases re-run and passed during consolidation |
| `PROPTEST_CASES=2000 cargo test -p satchel --lib review3_` (parser and signing proptests, before the money tests were merged) | 28 passed, 0 failed, 2 ignored |

**After the fix pass** (branch `fix/r3-findings`):

| Suite | Result |
|---|---|
| `cargo test -p satchel --lib` (default) | **232 passed, 0 failed, 3 ignored** (the slow 1,000-token proof, a diagnostic and the conservation fuzz) |
| `PROPTEST_CASES=16 cargo test -p satchel --lib review3_ -- --include-ignored` | **33 passed, 0 failed** |
| `cargo build -p satchel --target wasm32-unknown-unknown --release` + `tools/check-wasm-imports.sh` | compiles; INV-22 OK (promise actions FunctionCall and Transfer only) |
| `cargo test -p satchel-tests --test review3 --no-run` | compiles (not run: no cargo-near wasm here) |
| `packages/core`: `vitest run --exclude 'test/network/**'`, `typecheck`, `check-browser.mjs` | **549 passed** (19 files), typecheck clean, bundle check OK |
| `tools`: `pnpm test` (vitest + `vectors/gen.ts --check`), `typecheck` | **94 passed**, every vector file byte-identical, typecheck clean |
| `apps/web`: `vitest run`, `typecheck`, `lint` | **673 passed** (52 files), clean |
| `apps/web` Playwright, desktop project (`allowance`, `reject-coverage`, `give-link`, `offers`, then `allowance`, `theme-a11y`, `flows`), run by the web agent | 34/34, then 81/82: the one failure was an axe colour-contrast hit on the untouched gate line at `/s/4/sale` (Day), which passed when re-run alone |

## Limitations

- **Resolved on 2026-11-04, at integration:** the sandbox suite ran on the cargo-near wasm `3a73b492…`, 139/139
  with `review3.rs`, after one stale round-two pin was updated to the R3-I-1 refusal; dev2 runs that wasm. See
  `docs/testing/README.md` "Round three integration". The note below is what this round found at review time.
- **No sandbox run.** `cargo-near` couldn't be installed in this environment (an external binary download was
  declined), so no reproducible wasm was built and `tests/` (near-workspaces) wasn't run.
  - The R3-X-1 gas figures are host-gas lower bounds from the mocked runtime. Real calls also pay wasm execution and
    trie-node costs, so they're higher.
  - **The fix pass changed the contract**, so the sandbox suite (137 tests plus the new `review3.rs`) must run on the
    rebuilt cargo-near artifact before the rc birth. The changes are small and covered by unit tests: `nft_tokens`,
    `sign_for`'s argument parsing and one event in `set_allowance`. `review3.rs` checks the two behaviours that only the
    wasm entry points show.
- **The checker and the app were tested here.** The workspace's npm dependencies were installed from the lockfile for
  the fix pass, and the core, tools and web suites above ran on this branch. Live provider behaviour (mempool.space's
  `/address/:a/utxo` on testnet4) wasn't exercised. `EsploraClient.utxos` already serves the app's balances.
