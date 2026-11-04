# 90 · Satchel v1 — definitive technical specification

> **What this is.** The design that the code in this repo implements: contract interface, invariants (INV-xx), the
> clean-history protocol, the web app and its route handlers, pinned versions, repo layout and tests. It is the
> **source of truth**; the research notes kb/00–82 are evidence and lose to it wherever they differ (§13 Errata).
> The feature-sprint specs `docs/specs/C1-C2-C3-C7.md`, `docs/specs/C4-C6.md` and `docs/specs/C5.md` extend it and win
> over it for C1–C7 (index: §5.17 and §6.1). IDs such as D-xx, H-xx, E-xx and SAT-xxx are listed in `docs/GLOSSARY.md`.
>
> **Status as of 2026-11-04.** Written 2026-10-21 as a plan, then kept in step with the code: the contract is built
> and audited (`docs/security/`), the sprint features are merged, and the app runs at `https://usesatchel.xyz`
> against `dev2.satchelhq.testnet`. Contract freeze is Nov 9; the keyless birth of `satchel.satchelhq.testnet`
> (§5.16) is planned for Nov 10 and has **not** happened yet. Phrases such as "on Nov 1" or "after Nov 1" are the
> Phase-0 schedule: implementation actually began on 2026-10-21 (D-39), and the hackathon counts code from 2026-10-19
> (D-47). How each part was built and tested: `docs/handoff/*.md` and `docs/testing/README.md`.
>
> **Contents.** §1 TL;DR (the facts not to get wrong) · §2 Scope · §3 System overview · §4 Trust model ·
> §5 Contract (5.1 accounts, 5.2 crate, 5.3 types, 5.4 storage, 5.5 constants, 5.6 interface, 5.7 methods,
> 5.8 `sign_for`, 5.9 payload classifiers, 5.10 state machine, 5.11 ownership changes, 5.12 sale, 5.13 events,
> 5.14 views, 5.15 error codes, 5.16 keyless birth, 5.17 sprint additions) · §6 Invariants · §7 Clean-history
> protocol · §8 Frontend · §9 Backend · §10 Pinned versions · §11 Repository layout · §12 Testing · §13 Errata
> (which KB value wins) · §14 `[ASSUMED]` register · Appendix A (designs kept out of v1).
>
> `near_hackathon.md`, cited below as the original plan, is the team's pre-research plan. It is **not in this repo**
> (gitignored); where it is cited, this document already states the outcome.

> Owner: lead architect · Written: 2026-10-21 (Phase 0) · Status: **source of truth for v1**. It supersedes `near_hackathon.md` §B5 (architecture, interface, data model) and every interface sketch in kb/10, kb/20, kb/30, kb/40, kb/50, kb/51 and kb/70 wherever they differ (differences are listed in §13 Errata).
> Rationale for each choice: `plan/decisions.md` (D-xx). Build order, owners and hours: `plan/implementation-plan.md` (SAT-xxx). Pre-Nov-1 actions: `plan/phase0-checklist.md`.
> **Revision 2 (2026-10-21, post-review).** Applies the independent review `plan/review.md` (R-01…R-41) and the orchestrator's calls. The main changes: keyless birth of the final contract, no post-listing buy cooldown, a BTC txid-collision check, a gate mode per contract role, blocking judge pages, and FastNEAR as the canonical NEAR proof. The changelog, with a status for every R-xx, is at the top of `plan/decisions.md`.
> **Security fix pass (2026-10-23).** Brings §1, §5.3–§5.7, §5.11, §5.14–§5.16, §6 and §13 in line with the fixes for `docs/security/contract-review.md` S-01…S-13 (wasm 290,504 B, sha256 `aea0b2e9…451bd6`): `list` reserves the seller's proceeds slot; `on_payout` gets 10 Tgas and needs exactly one promise result; `delist` / `withdraw_proceeds` take exactly 1 yocto; the receiver guard also refuses the USDC contract and applies to `nft_mint`; NEP-181 views are paged at 50; the EVM nonce-gap rule INV-10 is restored (D-43, reverses D-21); birth funding is 20 NEAR (final) / 10 NEAR (rc) (D-34). Interface summary: `docs/handoff/contract.md` §7.
> **No product code before 2026-11-01** (Phase-0 rule, superseded on 2026-10-21 by D-39: implementation started that day). This document contains interface signatures, data layouts, state machines, constants, command lines and pseudo-code only. Spike code under `research/spikes/` is evidence, never a source to copy.
> **Sprint update (2026-10-29).** Seven contract features merged into `main` on top of the security fix pass: a
> history-hashing view, USDC transfers on EVM, three more EVM testnets with a per-chain nonce rule, and message
> signing (`docs/specs/C1-C2-C3-C7.md`); delegated spending allowances (`docs/specs/C5.md`); and offers plus
> NEAR/FT assets held inside a token (`docs/specs/C4-C6.md`). Those three files are now normative for the features
> they cover and win over this document where they differ, exactly as this document wins over kb/10...kb/70. This
> revision folds in the interface, invariant, clean-history, errata and open-assumption deltas; touched sections are
> marked "(sprint 2026-10-29)". Long JSON shapes are not duplicated here, see the three spec files.
>
> **Citation legend.** `kb/10 §TL;DR 6` = `kb/10-mpc-signer.md`, section "TL;DR", item 6. File names: 00-hackathon-rules, 01-prior-art, 10-mpc-signer, 11-chainsig-js-and-derivation, 20-near-contract-stack, 21-testing-sandbox, 22-deploy-and-lock, 30-bitcoin-testnet4, 31-evm-sepolia, 32-solana-devnet, 40-frontend-wallet, 41-web-stack, 50-data-and-indexing, 51-1click-and-usdc, 70-security-and-clean-history, 80-ux-spec, 81-design-tokens (full index in `kb/README.md`). `spike/mpc` = `research/spikes/mpc/RESULTS.md`, etc. `[ASSUMED]` marks anything not yet verified; every one has a Nov 1 (or named-day) re-check in §14.

---

## 1. TL;DR — the twelve facts an implementer must not get wrong

1. **One contract owns every key.** `satchel.<team>.testnet` (NEP-171) is the MPC *predecessor*; token N's keys live at paths `satchel/N/btc`, `satchel/N/evm` (domain 0, secp256k1) and `satchel/N/sol` (domain 1, ed25519). Addresses depend only on (contract account id, path) and survive transfers (kb/10 §Key derivation; kb/11 §KDF).
2. **The final contract account is born keyless.** On **Day 10 (Nov 10)**, one transaction from `<team>.testnet` does all of the following and contains **no AddKey**:
   - creates `satchel.<team>.testnet` and funds it;
   - deploys the reproducible wasm and calls `new`;
   - mints demo tokens 1–7 to the persona `alice`.

   The account therefore never has a key, and no signature can ever come from it except through `sign_for` (§5.16; D-02, D-28). The identical batch is rehearsed on a keyless `rc.<team>.testnet` on Day 9. All development happens on throwaway, keyed `devN.<team>.testnet` accounts (kb/70 §Gotchas 18). Final addresses can be computed and funded in Phase 0, because derivation does not need the account to exist (kb/11 §Verified facts). This starts only after the team owns `<team>.testnet` (R-02).
3. **`sign_for` signs only structured, classifiable payloads, never a hash.** EVM: unsigned type-2 tx bytes; BTC: BIP143 P2WPKH preimages plus the serialized outputs; SOL: a legacy message. The contract parses, enforces policy and computes the MPC payload from the same bytes (kb/70 §TL;DR 1–2; kb/30 §TL;DR 5; kb/31 §Security notes; kb/32 §Contract-side Eddsa policy).
4. **The record is written before the MPC call, in the same receipt.** One append-only `SigRecord` per signature (per BTC input). A failed or timed-out sign may still have produced a public signature (kb/70 F16; kb/10 §Gotchas), so every record counts as "issued" forever.
5. **Safety never depends on a callback.** `on_signed` is panic-free, reads raw promise bytes, only overwrites fixed-size status/signature bytes that `sign_for` already paid for, and returns the raw MPC JSON. There is no `pending_signs` counter (D-01; kb/10 §TL;DR 8; kb/20 §TL;DR 9).
6. **One quiet-period constant: `COOLDOWN_BLOCKS = 250`** (≈ 140 s on testnet at 0.56 s/block). `list` needs `height ≥ last_sign_height + 250`. There is **no post-listing buy cooldown**: `buy` works as soon as a listing exists, still bound to `(listing_id, expected_sig_count)` and gated by clean history. The UI reads the constant from `config()` (D-05 rev 2; kb/10 §Rec 6).
7. **BTC multi-input = one call, N single-action `sign` receipts joined with `.and()`.** Never two `sign` actions in one receipt: the MPC indexer skips them and both time out (kb/30 §TL;DR 3–4).
8. **Gas and deposit:** callers attach `min(300, 60 + 20·n)` Tgas and `0.005 NEAR × n`; the contract requires ≥ `30 + 18·n` Tgas, forwards 15 Tgas static + all leftover (weight 1) to each MPC call, reserves `10 + 2·n` Tgas (weight 0) for `on_signed`, charges measured storage plus `n × mpc_deposit` (default 1 yocto) and refunds the rest (§5.5, D-06).
9. **Sale = freeze + quiet period + state-bound buy.** While a token is listed, signing and transfers are refused. `buy` / `ft_on_transfer` must match `(listing_id, expected_sig_count)`, the currency and the exact price, and every sale effect happens in one receipt. The payout is attempted immediately and re-credited to an escrow if it fails (kb/70 §(g); kb/51 §TL;DR 5–6; D-14).
10. **v1 is deliberately small.**
    - No NEP-178 approvals, no delegates (S-10 cut), no ERC-20.
    - `nft_transfer_call` is disabled.
    - EVM is Sepolia-only; Solana accepts legacy messages only.
    - Only two code paths change ownership: `nft_transfer` (owner only; refuses the contract itself, the MPC account and the configured USDC contract as receivers, as `nft_mint` does) and the internal sale transfer (D-07, D-13, D-15; review S-06, S-09).
    - **(sprint 2026-10-29)** This item is the original v1 scope. Since the sprint: capped delegates (C5), USDC
      ERC-20 on EVM (C2), four EVM testnets (C3), message signing (C7), and a third ownership path, `accept_offer`
      (C4). See §2's note, §5.17 and `docs/specs/*.md`.
11. **Clean history runs in the buyer's browser.** It reads `sig_records` from two NEAR RPCs and checks every record:
    - EVM: nonce consumed, checked on two providers;
    - BTC: outpoint spent at depth K, checked on two providers, one query per distinct txid;
    - SOL: blockhash expired, which needs age ≥ 120 s plus one provider.

    It also runs account-level and lock checks. The contract cannot see other chains, so the UI enforces the gate, and this is disclosed (§7). Satchel's own BTC builder never produces a txid that an existing record already spends (R-05).
12. **The frontend is driven by chain state, not by wallet promises.**
    - A contract watcher (`sig_records`) and a long-poll `tx` tracker run over FastNEAR with dRPC failover; never `rpc.testnet.near.org`.
    - Pending intents live in `localStorage` and resume after a reload.
    - Judge pages render their facts **blocking** (no streaming fallback), so AI fetch tools see them (R-07).
    - The canonical NEAR proof of a past tx is the FastNEAR tx API, never non-archival RPC `tx` (R-08).
    - There is no database and no worker (kb/40 §TL;DR 4–9; kb/41 §TL;DR; kb/50 §TL;DR 1; D-11).

---

## 2. Scope of v1

| Area | In v1 | Out of v1 (Phase 3 unless noted) | Why |
|---|---|---|---|
| Chains | BTC testnet4 P2WPKH (in and out); EVM Sepolia `chainId 11155111`, native ETH only; SOL devnet native transfers (contract support ships in the final contract; the Solana UI is **on by default** since D-46, and `NEXT_PUBLIC_SOL_UI=off` is the cut switch) | ERC-20/SPL tokens, other EVM chains, P2TR spending (no Schnorr domain, kb/30 §TL;DR 1), NEAR-side derived account | kb/70 §Enforcement matrix; D-15 |
| NFT standards | NEP-171 core (`nft_transfer`, `nft_token`), NEP-177 metadata, NEP-181 enumeration, NEP-297 events, NEP-330 source metadata | NEP-178 approvals, `nft_transfer_call` (method present, always panics), NEP-199 payouts | D-07 |
| Signing | Owner-only `sign_for`, structured payloads, request-time records, UX callback | Delegates (S-10), message signing, durable nonces | D-13; kb/70 §(c), (f) |
| Sale | `list` / `delist` / `buy` (NEAR) / `ft_on_transfer` (Circle testnet USDC), exact price, escrow + immediate payout | Auctions, offers, royalties, third-party marketplaces (none live on testnet, kb/01 §TL;DR 8) | D-14 |
| Proof | On-chain records, views, events, browser checker, keyless birth ("this account never had a key", provable from one tx), reproducible build + `near contract verify` | On-chain proof of death via MPC `verify_foreign_transaction` (no Sepolia; testnet "Bitcoin" is testnet3, kb/70 F18) | kb/70 §P3; D-02 |
| Infra | Vercel (SSR + route handlers), browser-side reads, no DB | Indexer, relay worker, server-side demo signer | D-11, D-12 |
| Mainnet | Nothing by default. The 1Click clip (S-12) is **cut** unless the human reverses H-16 by Oct 31; if kept, it runs on an unlocked mainnet deployment | Locked mainnet deployment (needs audit) | kb/51 §S-12; D-19 |

**(sprint 2026-10-29).** This table is the original v1 scope and is kept verbatim for history. The merged `main`
moved several "Out of v1" cells into scope: EVM now covers four testnets (not Sepolia only) and USDC ERC-20
transfers (not native-only); Signing now has delegates (C5, capped and rolling-window, not unbounded) and message
signing (C7: EIP-191 `personal_sign` and Solana off-chain message v0, never raw hashes); Sale gains
offers (C4) and a NEAR/FT balance held inside the token (C6). P2TR, SPL tokens and other EVM chains are still out.
See §5.17 for the full index and `docs/specs/*.md` for the normative detail.

---

## 3. System overview

```
                         ┌─────────────────────────── Browser: Next.js 16 client islands ───────────────────────────┐
  human user ───────────►│ near-connect 0.11.4 wallet (Meteor / Intear / NEAR CLI …)  ── signAndSendTransaction ───┐ │
                         │ lib/derive (noble)   lib/chains/{evm viem | btc bitcoinjs 7 | sol web3.js 1.99}         │ │
                         │ lib/signing (pending store, contract watcher, tx tracker)   lib/clean-history (checker) │ │
                         └──────┬───────────────────────┬───────────────────────────────┬──────────────────────────┼─┘
                   views + tx   │                       │ chain reads + broadcast        │ cached JSON             │
                   long-poll    ▼                       ▼                                ▼                         │
  AI judge / curl ─► Vercel (Next 16, Node 22)    mempool.space/testnet4  (+ mempool.emzy.de)                      │
     (no JS)        SSR: /s/[id] /market /contract  Sepolia RPCs: publicnode, drpc, ethpandaops, 0xrpc; Blockscout │
                    API: /api/satchels/[id] …       Solana devnet RPC; FastNEAR tx API (tx.test.fastnear.com)     │
                    (no DB, "use cache" 15 s)                                                                      │
                         │ NEAR RPC: FastNEAR (server key) → dRPC fallback; never rpc.testnet.near.org             │
                         ▼                                                                                         ▼
   ┌──────────────────────────────── NEAR testnet ───────────────────────────────────────────────────────────────────┐
   │ satchel.<team>.testnet  (keyless since birth; near-sdk 5.29.1; no admin)                                        │
   │   sign_for ── owner? not listed? classify(payload)? ── write SigRecord(s) + event ──┬─► v1.signer-prod.testnet │
   │                                                                                     │    .sign ×n (1 action    │
   │   on_signed (UX only: status + signature bytes)  ◄──── yield/resume ≤ 200 blocks ───┘     per receipt)         │
   │   list / delist / buy ── payout ─► seller (re-credit to proceeds on failure)                                    │
   │   ft_on_transfer ◄── 3e2210e1…b8af (Circle testnet USDC) ft_transfer_call                                       │
   └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
   Signatures land on: Bitcoin testnet4 · Ethereum Sepolia · Solana devnet (broadcast by the browser)
```

| Component | Responsibility | Trust |
|---|---|---|
| `satchel` contract | Ownership, signing gate, payload policy, append-only signature log, sale state machine, escrow | Trusted: keyless since birth, code hash = reproducible build |
| NEAR MPC `v1.signer-prod.testnet` 3.17.0 | Threshold signing, yield up to 200 blocks | Trusted (assumption; 11-of-17 threshold; contract account has 4 full-access keys on testnet, kb/70 F17) |
| Browser app | Builds unsigned txs, drives the wallet, assembles and broadcasts signed txs, runs clean history | Untrusted by the contract; the user trusts it to build the tx they reviewed |
| Vercel routes | Blocking SSR for judges, cached JSON, card art (status + `sig_count`) | Hint only; never authoritative for Buy |
| Chain providers | Balances, UTXOs, nonces, blockhash validity, broadcast | BTC and EVM: two providers must agree in the checker. SOL: dead by age (R-19). A one-provider verdict is labelled "1 of 2 sources" (H-25) |

---

## 4. Trust model and assumptions

| # | Assumption / window | Consequence if false | Mitigation / disclosure | Ref |
|---|---|---|---|---|
| T1 | The NEAR MPC network signs only what Satchel asks for (threshold honest) | Anyone could sign for any Satchel | Disclose; Satchel cannot mitigate | kb/70 §Threat r |
| T2 | MPC keeps `sign` args, 15 Tgas floor and 1-yocto deposit stable through Nov 18 | A locked Satchel can no longer sign (funds stuck) | Leftover gas forwarded (weight 1); caller-chosen `mpc_deposit` (cap 0.01 NEAR); re-check `version()` Nov 1, Nov 10, Nov 13; ask MPC team | kb/70 §(j); kb/10 §Deltas |
| T3 | MPC resharing keeps domain keys (domains 0 and 1) | All addresses change | Resharing keeps keys (kb/70 F15); disclose | kb/70 §(k) |
| T4 | **No key ever existed on the contract account.** Any key on it could call the MPC directly as the predecessor and sign without a record (kb/70 §Threat o) | Unlogged signatures could exist | **Keyless birth** (§5.16): one atomic tx from `<team>.testnet` creates, funds, deploys, initializes and mints, with no AddKey. Judges can check four things: (1) the creation tx's action list (FastNEAR `/v0/transactions`) has no AddKey; (2) `view_access_key_list` is empty **and** `view_account` succeeds; (3) FastNEAR `/v0/account {"is_any_signer":true}` is empty, which also covers NEP-366 delegated signing (kb/50 §FastNEAR Transactions API; R-03); (4) the unfiltered account history starts at the creation block, so there was no earlier incarnation of the id. A parent account has no rights over a sub-account after creation | D-02, D-28; R-03, R-04 |
| T5 | Dev and rc accounts are never confused with the final one | Clean history on the wrong contract | The final contract id is a build-time constant shown in the UI, README and badge. `NEXT_PUBLIC_CONTRACT_ROLE=dev` builds show a "DEV CONTRACT" banner (gone since E-55: the role shows on `/contract` and in the checklist's dev line) and downgrade only the lock/code-hash checks to a warning; `rc` and `final` run the strict gate (§7.3; R-06) | D-02 |
| T6 | The checker's RPC providers do not collude to lie | False "clean" | BTC and EVM: two providers must agree, and disagreement ⇒ `unknown`. If one is down, the verdict says "1 of 2 sources" and is allowed on testnet only if H-25 says so. SOL: the age rule (§7.2). Confirmation depth; browser re-check right before Buy | kb/70 §Threat u; R-19 |
| T7 | Testnet only (BTC testnet4, Sepolia, Solana devnet, NEAR testnet). Coins have no value | — | "Testnet only" badge; no USD values in v1, except the labelled card total if UX-1's reopened default stands (E-47) | kb/80 §TL;DR |
| T8 | The frontend builds the tx the user reviewed | A malicious frontend could request a different (still classifiable) tx | Full-access key + wallet approval required (≥ 1 yocto deposit blocks function-call keys, kb/10 §TL;DR 12); review screen shows full address; verify-before-broadcast | kb/70 §Threat p |
| T9 | The immutable code (and init args) are bug-free enough | A bug or a wrong init argument can't be fixed in place | Sandbox invariant suite (incl. a keyless-birth batch test), keyless rc rehearsal with the identical wasm and init args, testnet-only; fallback = new account `satchel-v2` with **new** addresses (old funds stay with v1) | kb/22 §TL;DR 2 |
| T10 | Solana does not halt for > 2 min while a SOL record is young | Blockhash stays valid during a halt | Status stays "unused" until a provider reports the blockhash invalid; correct by construction | kb/70 §P2 SOL |
| T11 | Testnet4 confirmations stick at K = 1 | Anyone can CPU-mine testnet4 difficulty-1 blocks (timestamps up to ~2 h in the future). A two-block difficulty-1 fork could reorg a confirming spend out and revive an old pre-signed one | **Disclosed** in the README (§7.7). Testnet only; mainnet policy is K = 6 (§7.4; R-17) | kb/30 §Gotchas |
| T12 | Coins that arrive later come from Satchel's own builder or from an unrelated party | A pre-signed spend of a predicted outpoint could take them | Satchel's BTC builder refuses any txid that a record of the sending or receiving Satchel already references, and randomizes output order (§8.2; R-05). Coins from other wallets that land on a referenced outpoint are shown as "encumbered" (§7.3) | D-04 |

**What clean history does not cover:**
- chains, tokens and accounts other than the three derived addresses on the three listed networks;
- any signature made after the purchase;
- the honesty of the MPC (T1);
- testnet4 difficulty-1 reorgs (T11);
- coins sent later by another wallet to an outpoint an old signature already spends (T12; marked encumbered).

---

## 5. Contract

### 5.1 Accounts and deployment topology

| Account | Purpose | Keys | Lifetime |
|---|---|---|---|
| `<team>.testnet` | Human-owned parent; funds; signs the keyless-birth batches, USDC registrations and dev/rc creation (standing approval H-20b) | full-access (human) | Permanent; created **in the same sitting as choosing the name** (R-02) |
| `dev1.<team>.testnet`, `dev2…` | Daily dev deploys (Days 1–9), redeployed in place. Every collection is declared from Day 1, so a new `devN` is needed only for an unforeseen layout change (R-41) | keyed | Throwaway |
| `rc.<team>.testnet` (`rc2.` if needed) | Release-candidate rehearsal: born keyless with the **exact** batch and wasm of the final (Day 9); runs the strict gate | **none** (keyless) | Permanent (can't be deleted); one per rehearsal |
| `satchel.<team>.testnet` | **Final.** Born keyless on Day 10 in one atomic tx | **none, ever** | Through judging and beyond |
| `alice.` / `bob.` / `carol.<team>.testnet` | Personas: owner/seller, gift recipient, buyer | keyed (wallets) | Demo |
| (only if H-16 reverses) `app.<team>.near` | Unlocked mainnet deployment for the 1Click clip | keyed | Delete after Nov 19 |

`<team>` is a human decision (decisions.md H-01; phase0-checklist P0-H1). Token ids are decimal counters starting at `"1"` and are never reused (kb/70 §(q)).

### 5.2 Crate layout, toolchain, Cargo.toml and build profile

```
contracts/satchel/src/
  lib.rs          contract struct, init, NEP-171/177/181 trait impls, mint, transfer guard
  sign.rs         sign_for, on_signed, record writing, storage charging
  mpc.rs          MPC wire types, request builder, response parser (own types; no near-mpc crates, kb/10 §Crate or own types)
  parse/hex.rs    strict hex (optional 0x, even length)
  parse/rlp.rs    minimal canonical RLP decoder (hand-rolled, no deps, kb/70 F9)
  parse/evm.rs    EVM type-2 classifier
  parse/btc.rs    BIP143 preimage + outputs classifier
  parse/sol.rs    legacy message classifier
  sale.rs         list, delist, buy, ft_on_transfer, payout, withdraw
  views.rs        config, satchel, sig_records, listings, proceeds_of, derived_path
  events.rs       NEP-297 "satchel" events
  errors.rs       error code constants
  types.rs        Chain, SignRequest, SigRecord, SigDetail, SigStatus, TokenState, Listing, Currency, FtMsg, views
contracts/mock-signer/   sandbox fixture mirroring v1.signer-prod.testnet (sign → yield; respond; garbage; never; panic)
contracts/mock-ft/       sandbox NEP-141 (6 decimals) re-typed from near-sdk examples/fungible-token at 5.29.1 (kb/51 §Rec P0)
tests/                   near-workspaces integration crate
```

`rust-toolchain.toml` (repo root), verbatim from kb/20 §Cargo.toml:
```toml
[toolchain]
channel = "1.93.0"
components = ["rustfmt", "clippy"]
targets = ["wasm32-unknown-unknown"]
```

Workspace `Cargo.toml` (root). Members' profiles are ignored, so the profile lives here (kb/20 §Cargo.toml). `resolver = "3"` + edition 2024 makes the MSRV-aware resolver pick `near-sdk-env 0.1.6` instead of 0.1.7, which needs rustc 1.95 (spike/btc §17; kb/30 §4 Build note):
```toml
[workspace]
resolver = "3"
members = ["contracts/satchel", "contracts/mock-signer", "contracts/mock-ft", "tests"]

[workspace.package]
edition = "2024"
rust-version = "1.93"
license = "MIT"                                   # human confirms the licence (H-03)
repository = "https://github.com/<org>/<repo>"    # NEP-330 link; must be the repo that becomes public

[profile.release]
codegen-units = 1
opt-level = "z"        # "s" was larger: 223.4 vs 204.5 KB (kb/20 §Cargo.toml)
lto = true
debug = false
panic = "abort"
overflow-checks = true
```

`contracts/satchel/Cargo.toml`:
```toml
[package]
name = "satchel"
version = "1.0.0"
edition.workspace = true
rust-version.workspace = true
license.workspace = true
repository.workspace = true

[lib]
crate-type = ["cdylib"]                 # NOT ["cdylib","rlib"]: +27–55 % wasm (kb/20 §TL;DR 12)

[dependencies]
near-sdk = "=5.29.1"                    # default features (wee_alloc smaller, kb/20 §Cargo.toml)
near-contract-standards = "=5.29.1"     # enables near-sdk "legacy" (NFT uses near_sdk::collections)
hex = { version = "0.4", default-features = false, features = ["alloc"] }   # [ASSUMED] exact patch pinned by Cargo.lock on Nov 1

[dev-dependencies]
near-sdk = { version = "=5.29.1", features = ["unit-testing"] }   # does not change the wasm hash (kb/20 §Cargo.toml)

[package.metadata.near.reproducible_build]          # kb/22 §TL;DR 7, verified bit-identical twice
image = "sourcescan/cargo-near:0.22.0-rust-1.99.1"
image_digest = "sha256:c9655eaf7436b90c87ea8b25739f91063032c5c30ba24cfeafe72c142943b5bb"
passed_env = []
container_build_command = ["cargo", "near", "build", "non-reproducible-wasm", "--locked"]

[lints.rust.unexpected_cfgs]
level = "warn"
check-cfg = ['cfg(near)']
```
Notes:
- Always build with `cargo near build`. A plain `cargo build --target wasm32` compiles pure-Rust fallbacks that are "not for on-chain use" (kb/20 §TL;DR 3).
- The reproducible image compiles with **rustc 1.99.1** inside Docker and ignores `rust-toolchain.toml` (kb/22 §Verified facts). Run the sandbox suite and `tools/check-wasm-imports.sh` against the reproducible artifact before deploying it (SAT-081; R-35).
- The reproducible build was proven only on a standalone crate (kb/22). The **workspace** layout (contract under `contracts/satchel`, `[workspace.package]` inheritance) is rehearsed early (R-11):
  - Day 4 (SAT-035): `cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml`, deploy the artifact to a dev account, then `near contract verify --use-contract-source-code-path ./ deployed-at dev1.<team>.testnet network-config testnet-fastnear now`. This works while the repo is private. Check that NEP-330 `build_info.contract_path` points at `contracts/satchel`.
  - Day 9 (SAT-081/082): both steps again on rc.
- On a machine whose global default toolchain is an old nightly (this Mac: nightly-2023-12-11), use `cargo +1.93.0 near new …` or rely on `rust-toolchain.toml`. Running `cargo near new` from the old default fails on `edition2024` (kb/20 §Gotchas).
- Commit `Cargo.lock`. CI builds with `--locked`. After the first `cargo generate-lockfile`, confirm `near-sdk-env` is 0.1.6 (`cargo tree -i near-sdk-env`). If it is not, run `cargo update near-sdk-env --precise 0.1.6` (kb/10 §Gotchas).

`tests/Cargo.toml` (kb/21 §Layout):
```toml
[package]
name = "satchel-tests"
edition.workspace = true
publish = false

[dev-dependencies]
near-workspaces = { version = "=0.23.0", features = ["unstable"] }   # sandbox nearcore 2.13.4; NOT 0.24.0-rc (Rust 1.95)
tokio = { version = "1", features = ["full"] }
anyhow = "1"
serde_json = "1"
```

### 5.3 Types

Encoding rules for all JSON args and views:
- Token amounts (yocto, USDC base units) are `U128` decimal strings.
- Counters and heights (`seq`, `listing_id`, `sig_count`, block heights, `timestamp_ms`) are plain JSON numbers (`u64`). They stay below 2^53 for v1.
- Byte strings are lowercase hex with no `0x` in outputs. Inputs accept an optional `0x` prefix and either case.
- Enum tags are snake_case.

```rust
// types.rs — near-sdk 5.29.1 idioms (#[near(serializers = …)], store collections). Signatures only.
pub type TokenId = String;                                   // "1", "2", … decimal counter, never reused

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Chain { Btc, Evm, Sol }                              // path slug = "btc" | "evm" | "sol"; domain 0 | 0 | 1

/// What the caller asks the contract to sign. Externally tagged JSON, e.g.
/// {"evm":{"unsigned_tx":"02ee83aa36a7…80c0"}}
/// {"btc":{"preimages":["0200…01000000", "…"],"outputs":"409c000000000000160014…"}}
/// {"sol":{"message":"0100020…"}}
#[near(serializers = [json])]
#[serde(rename_all = "snake_case")]
pub enum SignRequest {
    Evm { unsigned_tx: String },                  // 0x02 ‖ rlp([chainId, nonce, tip, maxFee, gas, to, value, data, accessList])
    Btc { preimages: Vec<String>, outputs: String },// 1..=10 × 182-byte BIP143 P2WPKH preimages, in input order;
                                                  // outputs = Σ(value u64 LE ‖ varint(len) ‖ scriptPubKey), exactly the bytes behind hashOutputs
    Sol { message: String },                      // serialized LEGACY message (≤ 1232 B), signed as-is by the Ed25519 domain
}

#[near(serializers = [borsh])]
pub struct SigRecord {                            // sig_log[(token_id, seq)] — append-only, never deleted
    pub request_id: u64,                          // = seq of the first record written by the same sign_for call
    pub input_index: u8,                          // 0 for EVM/SOL; BTC input index (0..n)
    pub height: u64,                              // env::block_height() of the sign_for receipt
    pub timestamp_ms: u64,                        // env::block_timestamp_ms()
    pub requester: AccountId,                     // the owner at request time
    pub payload: [u8; 32],                        // EVM keccak256(tx) | BTC sha256d(preimage) | SOL sha256(message) (id only)
    pub detail: SigDetail,
    pub status: SigStatus,                        // UX only — checker ignores it (every record counts as issued)
    pub signature: [u8; 65],                      // zero until Signed. secp256k1: r(32)‖s(32)‖recovery_id(1); ed25519: R‖S(64)‖0x00
}

#[near(serializers = [borsh])]
pub enum SigDetail {
    Evm { chain_id: u64, nonce: u64, unsigned_tx: Vec<u8> },     // unsigned_tx ≤ 128 B, enough to rebuild the signed tx from state
    Btc { txid: [u8; 32], vout: u32, amount_sats: u64 },         // txid in DISPLAY order (reverse of preimage[68..100]); one record per input
    Sol { recent_blockhash: [u8; 32], lamports: u64 },           // lamports = Σ System Transfer amounts
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum SigStatus { Pending, Signed, Failed, Unparsed }        // Failed = promise failed (MPC rejected or timed out); Unparsed = MPC succeeded, bytes not understood

#[near(serializers = [borsh])]
#[derive(Default)]
pub struct TokenState {
    pub sig_count: u64,                            // number of SigRecords for this token (next seq)
    pub last_sign_height: u64,                     // 0 = never signed
    pub listing: Option<Listing>,
    pub max_evm_nonce: Option<u64>,                // highest EVM nonce ever signed (any status); None = no EVM record yet.
                                                   // Drives the nonce-gap rule (§5.9, D-43). Last field: +1 B per mint, +8 B on the first EVM record
}

#[near(serializers = [json, borsh])]
#[derive(Clone)]
pub struct Listing {
    pub id: u64,                                   // global, strictly increasing (Contract.next_listing_id)
    pub seller: AccountId,
    pub price: U128,                               // yoctoNEAR (Near) or USDC base units, 6 decimals (Usdc)
    pub currency: Currency,
    pub listed_at: u64,                            // block height
    pub sig_count: u64,                            // snapshot at list time (equals state.sig_count while listed: signing is frozen)
}

#[near(serializers = [json, borsh])]
#[serde(rename_all = "snake_case")]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum Currency { Near, Usdc }

/// msg of usdc.ft_transfer_call(receiver_id = satchel, amount = price, msg = …)
/// {"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}
#[near(serializers = [json])]
#[serde(rename_all = "snake_case")]
pub enum FtMsg { Buy { token_id: TokenId, listing_id: u64, expected_sig_count: u64 } }

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {                              // ALL fields declared from Day 1 (even unused ones), so dev deployments can be
                                                   // redeployed in place through Day 9 without a migration or re-funding (R-41)
    tokens: NonFungibleToken,                      // approvals prefix = None (NEP-178 disabled)
    metadata: LazyOption<NFTContractMetadata>,
    mpc: AccountId,                                // immutable after init
    usdc: Option<AccountId>,                       // immutable; None disables USDC sales
    next_token_id: u64,                            // starts at 1
    next_listing_id: u64,                          // starts at 1
    state: LookupMap<TokenId, TokenState>,                  // store::LookupMap (lazy: flush before measuring storage, kb/20 §TL;DR 10)
    sig_log: LookupMap<(TokenId, u64), SigRecord>,          // flat top-level map, never nested (kb/70 §Gotchas 12)
    listings: IterableSet<TokenId>,                         // index for /market
    proceeds: LookupMap<(AccountId, Currency), u128>,       // escrow. The slot is reserved (= 0) by the seller's first `list` in that
                                                            // currency and paid by the seller; `on_payout` only overwrites it, and
                                                            // `withdraw_proceeds` zeroes it, never removes it (review S-01)
}
```

MPC wire types (own ~30 lines; the published `near-mpc-*` 0.0.1 crates are stale, kb/10 §Crate or own types):
```rust
#[near(serializers = [json])] pub enum MpcPayload { Ecdsa(String), Eddsa(String) }   // externally tagged: {"Ecdsa":"<64 hex>"}
#[near(serializers = [json])] pub struct MpcSignRequest { pub path: String, pub payload_v2: MpcPayload, pub domain_id: u64 }
#[near(serializers = [json])] pub struct K256AffinePoint { pub affine_point: String }     // 33-byte compressed, hex
#[near(serializers = [json])] pub struct K256Scalar { pub scalar: String }                // 32 bytes, hex
#[near(serializers = [json])] #[serde(tag = "scheme")]
pub enum MpcSignature {
    Secp256k1 { big_r: K256AffinePoint, s: K256Scalar, recovery_id: u8 },
    Ed25519 { signature: Vec<u8> },                                                     // JSON array of 64 numbers
}
#[ext_contract(ext_mpc)] pub trait MpcSigner { fn sign(&mut self, request: MpcSignRequest); }  // args {"request":{…}}
```

### 5.4 Storage layout, record sizes, cost model, contract balance

`#[derive(BorshStorageKey)] #[near] enum StorageKey { OwnerById, TokenMetadata, Enumeration, ContractMetadata, TokenState, SigLog, Listings, Proceeds }`. The variant order is the on-chain prefix (1 byte each) and must never be reordered after the final deploy.

Record cost = `40 + len(key) + len(value)` bytes at 1e19 yocto/byte (kb/20 §Collections: measured 151 B for a 7 B key + 104 B value).

| Collection | Key | Value (borsh) | Est. bytes/entry incl. 40 B overhead | Paid by |
|---|---|---|---|---|
| NFT records (`tokens.*`, legacy collections) | TokenId | owner, metadata, per-owner set | 682–708 B per mint, **measured** (kb/20 §Verified facts) | minter |
| `state` | TokenId (~6 B) | TokenState ≈ 18 B (+ ~70 B while listed; + 8 B once `max_evm_nonce` is set) | ≈ 65 B (≈ 135 B listed) | minter / lister / first EVM requester |
| `sig_log`, EVM | (TokenId, u64) ≈ 15 B | 8+1+8+8+(4+≈25)+32+(1+8+8+4+52)+1+65 ≈ 225 B | **≈ 280 B ≈ 0.0028 NEAR** [ASSUMED, measure SAT-012] | requester |
| `sig_log`, BTC (per input) | ≈ 15 B | ≈ 197 B | ≈ 252 B ≈ 0.0025 NEAR | requester |
| `sig_log`, SOL | ≈ 15 B | ≈ 193 B | ≈ 248 B ≈ 0.0025 NEAR | requester |
| `listings` | TokenId | () | ≈ 50 B | lister |
| `proceeds` | (AccountId, Currency) | u128 | ≈ 77 B for a short seller id (handoff §7) | **seller**, at the first `list` per (seller, currency), which reserves the slot at 0. A failed payout only overwrites it and `withdraw_proceeds` zeroes it, so the escrow never needs contract-paid storage (review S-01) |
| transfer to an owner who holds no token yet | per-owner set | — | **+180 B measured**, and **−180 B** when the sender's set empties, so the net is ≈ 0 when the sender held one token (kb/20 §Verified facts). To a fresh 64-character implicit id while the sender keeps another token: **+250 B ≈ 0.0025 NEAR** (review S-02, `security.rs::s02_contract_pays_storage_for_new_holders`) | contract (NEP-171 transfers carry exactly 1 yocto); a griefer can drain a thin balance this way, hence the 20 NEAR funding below |

**Charging pattern** (kb/20 §Mint with storage deposit; kb/22 §Storage math):
1. Measure `env::storage_usage()`.
2. Mutate.
3. `flush()` every `store::*` collection that was touched.
4. Measure again.
5. Required = Δbytes × `env::storage_byte_cost()` (+ `n × mpc_deposit` in `sign_for`).
6. Panic `ERR_DEPOSIT` if the attached deposit is short.
7. Refund the excess to the predecessor with a detached transfer.

Stake freed by delists and sales stays in the contract as buffer.

**Contract balance:**
- Code stake **(sprint 2026-10-29)**: the fix-pass wasm was **290,504 B ≈ 2.9 NEAR** (the nft-spike was 204.5 KB = 2.05 NEAR). After C1 (history digest), C2 (USDC calldata), C3 (3 more EVM chains + the per-chain nonce map), C7 (message classifiers), C5 (allowances) and C4/C6 (offers, inside assets) it measures **≈ 422,000 B ≈ 4.2 NEAR** [ASSUMED pending the Day-9 reproducible build, SAT-081]. The 20 NEAR (final) / 10 NEAR (rc) birth funding below already covers this with headroom; re-measure at the Day-9 freeze and adjust `tools/deploy/keyless-birth.ts` only if it does not.
- Fund the final account with **20 NEAR** (rc: **10 NEAR**) through the Transfer action of the keyless-birth batch (D-34 as revised after review S-02; the `tools/deploy/keyless-birth.ts` defaults `parseNear('20')` for `satchel.*` and `parseNear('10')` for `rc*`). Keep ≥ 5 NEAR **spare**: `balance − storage_usage × 1e19 − market_totals().escrow_near` (M-01, §5.17: since C4/C6 the balance also holds user escrow, which never pays storage); `tools/monitor.sh` check [4] fails (alert) below 3 NEAR spare and warns below 5.
- Anyone can top it up with a plain transfer (kb/22 §TL;DR 4). `tools/monitor.sh` (SAT-103) checks it daily through Nov 19 (SAT-121).
- Storage exhaustion shows up as `LackBalanceForState` (kb/22 §Verified facts). Since the M-01 fix, a transfer or buy whose new-holder storage only escrow could pay is refused first with `ERR_INSOLVENT` (§5.17), so escrow stays withdrawable.

**User cost per signature** (shown as "NEAR fee ≈ 0.004 NEAR"):
- ≈ 0.0012 NEAR of gas burnt (12.4 Tgas × 1e8; kb/10 §TL;DR 6) plus ≈ 0.0025–0.0028 NEAR of permanent record storage.
- A temporary hold of ≈ 0.1 NEAR per 100 Tgas attached, refunded within seconds (kb/10 §Gotchas: `min_gas_purchase_price` 1e9).
- So the wallet needs ≈ 0.3 NEAR free for a 10-input BTC send.

### 5.5 Constants (single source of truth; mirrored in `config()` and `apps/web/src/lib/near/constants.ts`)

| Constant | Value | Formula / reason | Evidence |
|---|---|---|---|
| `MPC_ACCOUNT` | `v1.signer-prod.testnet` (init arg) | live MPC 3.17.0 | kb/10 §Deployment |
| Domains | BTC, EVM → `0`; SOL → `1` | hard-coded. **Never** call `latest_key_version` (it returns 3 = ForeignTx) | kb/10 §TL;DR 12 |
| `MPC_SIGN_STATIC_GAS` | **15 Tgas** per `sign` promise, `unused_gas_weight = 1` | = live `sign_call_gas_attachment_requirement_tera_gas`. 14.999… Tgas fails. Weight 1 hands all leftover gas to the MPC (future-proofing) | kb/10 §TL;DR 5; spike/mpc §6.4 |
| `ON_SIGNED_GAS(n)` | **10 + 2·n Tgas** static, weight 0 | measured 1.42–2.26 Tgas for n=1 (incl. receipt fees); +≈0.2 Tgas per in-place record overwrite; weight 0 so a large prepaid can't starve it | kb/10 §Latency and gas; kb/20 §Never-fail callback |
| `MIN_SIGN_PREPAID(n)` | **30 + 18·n Tgas** (`ERR_GAS` before any state change) | entry budget 10 (measured 2.1–2.6 for n=1, 3.1 for n=2, 4.5 for n=4) + 15·n + (10 + 2·n) + 10 margin. n=1 → 48; n=4 → 102; n=10 → 210 | kb/10 §Rec 2; kb/30 §Contract fan-out |
| `SIGN_ATTACH_GAS(n)` (callers) | **min(300, 60 + 20·n) Tgas** | ≥ MIN + margin; n=1 → 80, n=2 → 100, n=4 → 140, n=10 → 260; stays ≤ 300 for wallets with a 300 Tgas habit [ASSUMED] | kb/30 §Gotchas (≈5 + 15·N + 10 hard floor; 45 OK / 40 failed for n=2) |
| `MAX_BTC_INPUTS` | **10** | gas above; coin selection is largest-first, so real sends use 1–3 inputs | kb/30 §6 |
| `MPC_DEPOSIT` default / cap | **1 yoctoNEAR** per `sign` promise; caller may raise it via `mpc_deposit`, capped at **0.01 NEAR** (`ERR_MPC_DEPOSIT`) | MPC refunds any excess to the **predecessor = this contract**, not the user | kb/10 §TL;DR 4; kb/70 §(j) |
| `SIGN_ATTACH_DEPOSIT(n)` (callers) | **0.005 NEAR × n** | covers ≈ 0.0028 NEAR record + `n × 1 yocto`; contract refunds the excess | §5.4 |
| `COOLDOWN_BLOCKS` | **250**: the **quiet period** before `list` (`height ≥ last_sign_height + 250`). There is **no** post-listing buy cooldown | yield 200 blocks + callback ≈ 3–5 + late `respond` ≈ 15 (nodes' stale threshold 10 blocks + 10 s retry) + margin, so no signature can still arrive once a listing exists. ≈ 140 s at 0.554–0.573 s/block | kb/10 §Rec 6; kb/50 §Chain timing; D-05 |
| `EVM_CHAIN_IDS` **(sprint 2026-10-29)** | **11155111, 84532, 421614, 11155420** (was 11155111 only). Frozen at birth: adding a chain needs a new contract | docs/specs/C1-C2-C3-C7.md §2; D-15 |
| `EVM_MAX_TX_BYTES` **(sprint 2026-10-29)** | **160** (was 128) | a maximal native transfer is ≈ 99 B; a maximal USDC `transfer` is 152 B (C2) | docs/specs/C1-C2-C3-C7.md §3.1 rule 1 |
| `SOL_MAX_MESSAGE_BYTES` | 1232 | MPC Eddsa upper bound | kb/10 §TL;DR 3 |
| `MINT_ATTACH` | 0.02 NEAR, 30 Tgas | measured 682–708 B (≈ 0.007 NEAR), 3.5–3.9 Tgas | kb/20 §Mint with storage deposit |
| `TRANSFER_ATTACH` | exactly 1 yocto, 30 Tgas | NEP-171 `assert_one_yocto`; measured ≈ 3 Tgas | kb/20 §Verified facts |
| `LIST_ATTACH` | 0.01 NEAR (excess refunded), 30 Tgas | listing ≈ 70 B + index ≈ 50 B, + the proceeds slot ≈ 77 B on the seller's first listing in that currency (review S-01); still well under 0.01 NEAR. `charge_storage(s0, 0, 1)`: at least 1 yocto | §5.4 |
| `DELIST_ATTACH` / `WITHDRAW_ATTACH` | **exactly 1 yocto**, 30 / 50 Tgas | the deposit is only a full-access-key guard. Code: `ensure_one_yocto()` → `env::attached_deposit() != NearToken::from_yoctonear(1)` panics `ERR_DEPOSIT: attach exactly 1 yocto`, so a wallet's default deposit can never be kept (review S-03) | kb/70 §TL;DR 12 |
| `BUY_ATTACH` (NEAR) | exactly `price`, 50 Tgas | sale ≈ 4 Tgas measured + payout transfer + `on_payout` 10 Tgas static | kb/21 §Test matrix (buy 4.02 Tgas) |
| `BUY_USDC_ATTACH` | `usdc.ft_transfer_call`, 1 yocto, **150 Tgas** | `ft_transfer_call` ≈ 2.8 + resolve 5 (static) + our receiver | kb/51 §Gas |
| `PAYOUT_FT_GAS` / `ON_PAYOUT_GAS` | **15 Tgas / 10 Tgas** static, weight 0. Code: `PAYOUT_FT_GAS_TGAS: u64 = 15`, `ON_PAYOUT_GAS_TGAS: u64 = 10` | `ft_transfer` + re-credit callback. `on_payout` measured 1.68 Tgas burnt (`security.rs::on_payout_recredit_gas_margin`); 10 gives a 6× margin (was 5, review S-01) | kb/51 §S-8 sketch |
| `MAX_PAGE` | **50**. Code: `pub const MAX_PAGE: u32 = 50` | cap of `sig_records` and `listings`; also the default **and** the cap of the NEP-181 `limit` (`page_limit(limit) = Some(limit.unwrap_or(MAX_PAGE).min(MAX_PAGE))`, review S-05) | §5.14 |
| Contract funding | **20 NEAR (final) / 10 NEAR (rc)** through the birth batch's Transfer (`keyless-birth.ts` defaults); ≥ 5 NEAR spare (free − escrow, M-01) on the final; `tools/monitor.sh` alerts below 3 NEAR spare | §5.4; raised after review S-02 (D-34) | kb/22 §Rec P0 |
| Keyless-birth batch | Actions in this order: CreateAccount · Transfer · DeployContract · FunctionCall `new` (30 Tgas, 0 NEAR) · FunctionCall `nft_mint` ×7, ids 1–7 (20 Tgas, 0.02 NEAR each). **170 Tgas** of prepaid FunctionCall gas in total | Est. **≈ 50 Tgas burnt**: deploy ≈ 19 Tgas (≈ 71 Mgas/B × 260 KB, consistent with the measured 23.1 Tgas for deploy + init of 261.6 KB, kb/22) + `new` ≈ 3 + mints 7 × ≈ 3.9 (kb/20 measured 3.5–3.9) + create/transfer ≈ 0.5. The protocol allows 1 PGas per tx; the tx is ≈ 260 KB against a 1.5 MiB limit [ASSUMED estimate; measured on rc, SAT-082] | kb/20 §Limits; §5.16 |
| Circle testnet USDC | `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` (6 decimals; storage 0.00125 NEAR) | `usdc` init arg; the contract **must** be storage-registered before the first USDC sale | kb/51 §TL;DR 1, 3 |

### 5.6 Public interface (near-sdk 5.29.1)

```rust
#[near]
impl Contract {
    /// One-time init. All arguments are immutable afterwards (no admin methods exist).
    /// base_uri: "https://<app-host>/api/card/" (token media = "<id>.svg"). Decide the app host BEFORE the final deploy.
    /// NOT #[private], on purpose (R-32): in the keyless birth the caller is <team>.testnet, not the contract itself.
    /// Safe because deploy + `new` (+ mints) execute in ONE atomic receipt, so nobody can call `new` first, and
    /// near-sdk's #[init] refuses any second init ("already initialized").
    #[init] pub fn new(mpc: AccountId, usdc: Option<AccountId>, base_uri: String) -> Self;

    // ── NFT ─────────────────────────────────────────────────────────────────────────────
    /// Anyone. Mints token next_token_id to receiver_id. Caller pays storage; excess refunded to the caller. Emits nep171 nft_mint.
    /// Applies the same receiver guard as nft_transfer FIRST (contract itself, mpc, configured usdc → ERR_BAD_RECEIVER; R-18, S-06).
    /// Pre-funded demo ids 1–7 are minted INSIDE the birth batch, so nobody can mint them first (R-04).
    #[payable] pub fn nft_mint(&mut self, receiver_id: AccountId) -> Token;

    // ── signing ─────────────────────────────────────────────────────────────────────────
    /// Owner only. Classifies `request`, writes one SigRecord per MPC request (n = 1, or number of BTC inputs),
    /// emits `sign_requested`, then returns sign×n (each a single-action receipt, joined with .and()) .then(on_signed).
    /// Tx result = on_signed's return value. mpc_deposit: yocto forwarded per MPC call (default 1, max 0.01 NEAR).
    #[payable] pub fn sign_for(&mut self, token_id: TokenId, request: SignRequest, mpc_deposit: Option<U128>) -> Promise;

    /// Self only. Never panics. Per index i: Ok(bytes) → parse → status Signed (+ signature bytes) or Unparsed;
    /// Err → Failed. Emits `sign_resolved`. Returns the raw MPC JSON per request (null on failure), in input order.
    #[private] pub fn on_signed(&mut self, token_id: TokenId, first_seq: u64, n: u32) -> Vec<Option<near_sdk::serde_json::Value>>;

    // ── sale ────────────────────────────────────────────────────────────────────────────
    /// Owner only, ≥ 1 yocto + storage. Requires height ≥ last_sign_height + COOLDOWN_BLOCKS. Returns the new listing id.
    /// Reserves proceeds[(seller, currency)] = 0 if absent, charged to the seller with the listing (S-01).
    #[payable] pub fn list(&mut self, token_id: TokenId, price: U128, currency: Currency) -> u64;
    /// Owner only, EXACTLY 1 yocto (S-03). Signing resumes immediately.
    #[payable] pub fn delist(&mut self, token_id: TokenId);
    /// Anyone but the seller. attached == price exactly; listing must be Near; listing_id and sig_count must match.
    /// No post-listing cooldown: buyable as soon as the listing exists (the UI gates it on clean history).
    #[payable] pub fn buy(&mut self, token_id: TokenId, listing_id: u64, expected_sig_count: u64);
    /// Escrow fallback: pays out everything credited to the caller in `currency` (EXACTLY 1 yocto, S-03). Sets the slot
    /// to 0 (never removes it, S-01). Returns nothing itself: env::promise_return(payout) makes the payout chain the tx result.
    #[payable] pub fn withdraw_proceeds(&mut self, currency: Currency);
    /// Self only. Never panics. A no-op (log line only: no credit, no event) unless promise_results_count() == 1 (S-13).
    /// Re-credits `proceeds` if the payout promise Failed, overwriting the reserved fixed-size slot (S-01). Emits `payout`.
    #[private] pub fn on_payout(&mut self, account_id: AccountId, currency: Currency, amount: U128);

    // ── views ───────────────────────────────────────────────────────────────────────────
    pub fn config(&self) -> ConfigView;
    pub fn satchel(&self, token_id: TokenId) -> Option<SatchelView>;
    pub fn sig_records(&self, token_id: TokenId, from_seq: u64, limit: u32) -> Vec<SigRecordView>;   // limit ≤ 50
    pub fn listings(&self, from_index: u64, limit: u32) -> Vec<ListingView>;                        // limit ≤ 50
    pub fn proceeds_of(&self, account_id: AccountId) -> Vec<ProceedsView>;
    pub fn derived_path(&self, token_id: TokenId, chain: Chain) -> String;                          // "satchel/{id}/{btc|evm|sol}"
}

#[near] impl NonFungibleTokenCore for Contract {
    /// Owner only: the wrapper checks ERR_NOT_OWNER itself BEFORE delegating to the standard (R-16).
    /// Refuses receiver_id == env::current_account_id(), == mpc or == the configured usdc with ERR_BAD_RECEIVER, which
    /// would strand the funds (R-18, S-09). Same `ensure_receiver` as nft_mint.
    #[payable] fn nft_transfer(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>, memo: Option<String>);
    /// Always panics ERR_TRANSFER_CALL_DISABLED (D-07). Present so NEP-171 tooling gets a clear error instead of MethodNotFound.
    #[payable] fn nft_transfer_call(&mut self, receiver_id: AccountId, token_id: TokenId, approval_id: Option<u64>,
                                    memo: Option<String>, msg: String) -> PromiseOrValue<bool>;
    fn nft_token(&self, token_id: TokenId) -> Option<Token>;
}
#[near] impl NonFungibleTokenEnumeration for Contract { /* nft_total_supply, nft_tokens, nft_supply_for_owner, nft_tokens_for_owner → self.tokens.*;
                                                           nft_tokens / nft_tokens_for_owner pass limit = min(limit ?? 50, 50) (MAX_PAGE, S-05) */ }
#[near] impl NonFungibleTokenMetadataProvider for Contract { fn nft_metadata(&self) -> NFTContractMetadata; }
#[near] impl FungibleTokenReceiver for Contract {
    /// Only the configured USDC may call. Panics on any mismatch (FT refunds 100 %). Success → Value(U128(0)).
    fn ft_on_transfer(&mut self, sender_id: AccountId, amount: U128, msg: String) -> PromiseOrValue<U128>;
}
// NOT implemented on purpose: NonFungibleTokenApproval (nft_approve/nft_revoke/…), NonFungibleTokenResolver, any admin/upgrade/pause.
```

### 5.7 Method specifications (preconditions are checked in the order listed)

| Method | Caller | Preconditions → error | Effects | Gas attach | Deposit |
|---|---|---|---|---|---|
| `new` | `<team>.testnet` inside the birth batch (not `#[private]`, R-32) | not initialized (near-sdk `#[init]`) | metadata `{spec: "nft-1.0.0", name: "Satchel", symbol: "SATCHEL", base_uri}`; counters = 1; NEP-178 off | 30 Tgas inside the batch (deploy + init measured 23.1 Tgas, kb/22 §Verified facts) | 0 |
| `nft_mint` | anyone (ids 1–7: inside the birth batch) | **`receiver_id ∉ {current_account_id, mpc, usdc}` → `ERR_BAD_RECEIVER`** (checked first, the same `ensure_receiver` as `nft_transfer`; R-18, S-06, S-09); deposit ≥ measured storage → `ERR_DEPOSIT` | token `next_token_id++`; metadata `{title: "Satchel #N", media: "N.svg", issued_at: ms}`; `TokenState::default()`; standard `nft_mint` event; refund excess to the caller | 30 Tgas (20 inside the batch) | 0.02 NEAR |
| `nft_transfer` | owner | token exists → `ERR_TOKEN_NOT_FOUND`; **predecessor == owner → `ERR_NOT_OWNER`** (the wrapper checks first, R-16); not listed → `ERR_LISTED`; `receiver_id ∉ {current_account_id, mpc, usdc}` → `ERR_BAD_RECEIVER` (R-18; the configured USDC contract since S-09; `usdc: None` makes that id an ordinary receiver); then the standard's checks (exactly 1 yocto; "Current and next owner must differ") | owner changes; standard `nft_transfer` event. Records, `sig_count` and `last_sign_height` are **unchanged** (history belongs to the token) | 30 Tgas | exactly 1 yocto |
| `nft_transfer_call` | — | always → `ERR_TRANSFER_CALL_DISABLED` | none | — | — |
| `sign_for` | owner | see §5.8 steps 1–7 | records + event + promises (§5.8) | `min(300, 60+20n)` | 0.005 NEAR × n |
| `on_signed` | self | `#[private]` | status/signature overwrite per record; `sign_resolved` event | (static `10+2n`) | — |
| `list` | owner | token exists → `ERR_TOKEN_NOT_FOUND`; owner → `ERR_NOT_OWNER`; not listed → `ERR_ALREADY_LISTED`; `price > 0` → `ERR_PRICE`; `currency == Usdc ⇒ usdc.is_some()` → `ERR_CURRENCY`; `height ≥ last_sign_height + 250` → `ERR_QUIET_PERIOD`; deposit ≥ storage (≥ 1 yocto) → `ERR_DEPOSIT` | `listing = {id: next_listing_id++, seller, price, currency, listed_at: height, sig_count}`; insert into `listings`; **if `proceeds[(seller, currency)]` is absent, insert it as 0** (reserves the escrow slot, charged to the seller in the same storage measurement, S-01); `listed` event; refund excess | 30 Tgas | 0.01 NEAR |
| `delist` | owner | token exists → `ERR_TOKEN_NOT_FOUND`; listed → `ERR_NOT_LISTED`; owner → `ERR_NOT_OWNER`; deposit **exactly 1 yocto** → `ERR_DEPOSIT: attach exactly 1 yocto` (S-03) | listing = None; remove from `listings`; `delisted` event | 30 Tgas | exactly 1 yocto |
| `buy` | anyone | listed → `ERR_NOT_LISTED`; `listing.id == listing_id && state.sig_count == expected_sig_count && listing.sig_count == state.sig_count` → `ERR_LISTING_CHANGED`; `currency == Near` → `ERR_CURRENCY`; `attached == price` → `ERR_WRONG_AMOUNT`; `buyer ≠ seller` → `ERR_SELF_BUY`; `seller == current owner` → `ERR_LISTING_CHANGED`. **No cooldown check** | **one receipt:** `tokens.internal_transfer(seller → buyer, memo "sale")` (emits nep171 `nft_transfer`), listing = None, remove from `listings`, `sold` event; then a **detached** payout `Promise::new(seller).transfer(price).then(on_payout(seller, Near, price))` | 50 Tgas | exactly `price` |
| `ft_on_transfer` | USDC contract | `predecessor == usdc` → `ERR_WRONG_TOKEN`; msg parses as `FtMsg::Buy` → `ERR_BAD_MSG`; then the same checks as `buy` with `currency == Usdc` and `amount == price` (a NEAR-priced listing → `ERR_CURRENCY`; sender == seller → `ERR_SELF_BUY`) | same as `buy`; payout = detached `usdc.ft_transfer(seller, price, "satchel sale")` (1 yocto, 15 Tgas) `.then(on_payout(seller, Usdc, price))`; returns `PromiseOrValue::Value(U128(0))` | 150 Tgas on `ft_transfer_call` | 1 yocto on `ft_transfer_call` |
| `on_payout` | self | `#[private]`; **must not panic** (same checklist as `on_signed`); **exactly one promise result**, else a no-op: log `on_payout: ignored (expects exactly one promise result)`, no credit, no event (S-13) | `ok = !matches!(promise_result_checked(0, 0), Err(Failed))` (Ok and TooLong both mean the payout receipt succeeded). If `!ok`: `proceeds[(account, currency)] = owed.saturating_add(amount)` (R-25), an **overwrite** of the slot `list` reserved or `withdraw_proceeds` zeroed, so it never needs contract-paid storage (S-01); `payout` event `{ok}` | (static 10, `ON_PAYOUT_GAS_TGAS`) | — |
| `withdraw_proceeds` | anyone owed | deposit **exactly 1 yocto** → `ERR_DEPOSIT: attach exactly 1 yocto` (S-03, checked first); `proceeds[(caller, currency)] > 0` → `ERR_NOTHING_OWED` | **set the entry to 0** (never removed, S-01); payout promise as above, returned with `env::promise_return` (re-credited by `on_payout` if it fails again) | 50 Tgas | exactly 1 yocto |
| views | anyone | — | — | — | — |

Why `ft_on_transfer` panics instead of returning `amount`:
- A panic reverts our state.
- `ft_resolve_transfer` treats a failed promise as "unused = all" and refunds 100 % (kb/51 §NEP-141 semantics, Test C).
- Never mutate state and then return a non-zero unused amount, because the refund is capped at the receiver's balance (kb/51 §Gotchas 5).

The payout is **detached**, never the returned promise. If the payout fails after the NFT has moved, a returned promise would make the FT refund the buyer, which is the Oct 1 "ghost funds" bug class (kb/51 §TL;DR 5).

**Why there is no post-listing cooldown (D-05 rev 2).** Safety comes from three things: signing is frozen while listed, records are written at request time, and the buy is bound to `(listing_id, expected_sig_count)` (kb/70 §(g)). The quiet period guarantees that no MPC request can still produce a signature once a listing exists: 250 ≥ 200 (yield) + ≈ 15 (late `respond`) + margin. So the set of records is final for the whole listing, and a buyer's check cannot be invalidated by waiting less. (Under receipt congestion a late `on_signed` can still update a record's UX-only `status`/`signature` while listed; the safety fields and `sig_count` never change, and the checker treats every record as issued whatever its status, review S-10.)
- A seller who wants to change anything must delist. That re-opens signing, and a new sign restarts the quiet period and yields a new `listing_id` on relist.
- SOL records are ≥ 250 blocks (≈ 140 s) old at listing time, past the 120 s age rule.
- The cooldown only cost ≈ 140 s per sale in demos and e2e runs (review §6.5).

### 5.8 `sign_for` — normative algorithm, MPC wrapper, `on_signed`

```text
sign_for(token_id, request, mpc_deposit):
 1. owner := tokens.owner_by_id[token_id]                      else panic ERR_TOKEN_NOT_FOUND
    require predecessor == owner                               else ERR_NOT_OWNER          (INV-01)
 2. st := state[token_id]; require st.listing == None          else ERR_FROZEN             (INV-13)
 3. n := 1 for Evm/Sol, len(preimages) for Btc; require 1 ≤ n ≤ 10   else ERR_BTC_INPUT_COUNT
    require env::prepaid_gas() ≥ (30 + 18·n) Tgas              else ERR_GAS ("attach ≥ X Tgas")   (INV-19)
    d := mpc_deposit.unwrap_or(1 yocto); require 1 yocto ≤ d ≤ 0.01 NEAR   else ERR_MPC_DEPOSIT
 4. classify(request) → items[0..n] = (mpc_payload, record_payload32, detail)      else ERR_<CHAIN>_*  (§5.9, INV-09)
       Evm: mpc_payload = Ecdsa(hex(keccak256(tx)))          record_payload = keccak256(tx)
       Btc: mpc_payload = Ecdsa(hex(sha256(sha256(p_i))))    record_payload = sha256d(p_i)
       Sol: mpc_payload = Eddsa(hex(message))                record_payload = sha256(message)
    (The hash is computed by the contract from the exact bytes it parsed: env::keccak256_array / env::sha256_array.)
 5. s0 := env::storage_usage(); first_seq := st.sig_count
    for i in 0..n: sig_log[(token_id, first_seq + i)] = SigRecord{request_id: first_seq, input_index: i, height, timestamp_ms,
                     requester: owner, payload: record_payload_i, detail_i, status: Pending, signature: [0; 65]}
    st.sig_count += n; st.last_sign_height = env::block_height(); flush state + sig_log
 6. required := (env::storage_usage() − s0) × storage_byte_cost + n × d
    require attached ≥ required                                 else ERR_DEPOSIT ("attach ≥ X yocto")   (INV-17, INV-18)
    if attached > required: Promise::new(predecessor).transfer(attached − required).detach()
 7. emit sign_requested {…}                                     (after every require; logs of failed receipts survive, kb/20 §Events)
 8. p_i := ext_mpc::ext(mpc).with_attached_deposit(d).with_static_gas(15 Tgas).with_unused_gas_weight(1)
                 .sign(MpcSignRequest{ path: "satchel/{token_id}/{chain}", payload_v2: mpc_payload_i, domain_id: 0|1 })
    joint := p_0.and(p_1)…and(p_{n−1})          // separate single-action receipts: NEVER batch actions (kb/30 §TL;DR 3)
    return joint.then(Self::ext(current).with_static_gas((10 + 2n) Tgas).with_unused_gas_weight(0)
                       .on_signed(token_id, first_seq, n))
```

**Exact MPC request** (one per promise; `domain_id` is a JSON number; hex has no `0x`; kb/10 §`sign`):
```json
{"request":{"path":"satchel/1/evm","payload_v2":{"Ecdsa":"bc657845d9165bf3555d8b8a9a5b830272d83b762c60ceab048355a87deac377"},"domain_id":0}}
{"request":{"path":"satchel/1/btc","payload_v2":{"Ecdsa":"<sha256d of preimage i, 64 hex>"},"domain_id":0}}
{"request":{"path":"satchel/1/sol","payload_v2":{"Eddsa":"<hex of the full legacy message, ≤ 2464 hex chars>"},"domain_id":1}}
```
**Exact MPC response** (the `SuccessValue` of the MPC yield callback, kb/10 §Response):
```json
{"scheme":"Secp256k1","big_r":{"affine_point":"02f6efe9455463c738e2bd553f14f638fcfbf8465a54eae1ffac915111aebb0f0c"},"s":{"scalar":"549e7285bfe162a32441fef9305b83cc2961071bf7a4bec83d2e99ae3cac87e1"},"recovery_id":1}
{"scheme":"Ed25519","signature":[171,150,115,129, … 64 numbers …]}
```
Signature byte rules:
- `r = affine_point[2..]` (drop the 02/03 prefix); `s` is already low-S.
- **EVM `yParity = recovery_id`**, never the `big_r` prefix. They disagreed in 26 of 50 samples (kb/10 §TL;DR 10).
- BTC: DER(r, s) + 0x01, handled by bitcoinjs. Keep a defensive `s ≤ n/2` assert (kb/30 §TL;DR 2).
- SOL: the 64 bytes are the transaction signature as-is.

**MPC-side failures** (bad args, gas, deposit, domain, payload ≥ n, timeout) reach `on_signed` as `Err(PromiseError::Failed)`. Most arrive within about 3 blocks; a timeout arrives about 203–205 blocks (115–119 s) after the request (kb/10 §What `on_signed` sees).

```text
on_signed(token_id, first_seq, n) -> Vec<Option<Value>>:        #[private]; MUST NOT panic (no unwrap/expect/require/typed #[callback_result])
  out := []; statuses := []
  for i in 0..min(n, env::promise_results_count()):
     match env::promise_result_checked(i, 1024):                // raw bytes; a parse failure can never revert anything (kb/10 §TL;DR 8)
        Ok(bytes) → v := serde_json::from_slice::<Value>(&bytes).ok()
                    sig := v.and_then(extract_signature_65)     // secp: r‖s‖recid; ed25519: 64 B ‖ 0x00; length-checked
                    status := if sig.is_some() { Signed } else { Unparsed }
        Err(_)    → v := None; status := Failed                 // MPC rejected or timed out; F16: a signature may still exist
     if let Some(rec) = sig_log.get_mut(&(token_id, first_seq + i)) { if rec.status == Pending { rec.status = status; rec.signature = sig.unwrap_or([0;65]) } }
     out.push(v); statuses.push(status)
  emit sign_resolved {token_id, first_seq, n, statuses}
  return out                                                   // becomes the tx's final SuccessValue: JSON array, one entry per input
```
- The record is fixed-size: `status` is a 1-byte unit enum and `signature` is `[u8; 65]`. Overwriting it therefore grows no storage, so `on_signed` can never fail with `LackBalanceForState` (kb/20 §Never-fail callback 3).
- If `on_signed` ever does fail (a bug), the user's tx shows `Failure`, the record stays `Pending` and the signature is still public in the MPC receipts. The client falls back to scanning `receipts_outcome` (§8.6). Safety is unaffected.

### 5.9 Payload classifiers (normative; any refusal panics with the code shown and changes nothing — INV-09)

**Common:** hex decoding is strict (an optional `0x`, even length, `[0-9a-fA-F]`); otherwise `ERR_HEX`. There is no "hash plus description" path: the contract hashes the exact bytes it parsed (kb/70 §Gotchas 1).

**EVM (`parse/evm.rs`), type-2 native transfer on Sepolia only.** The layout is `0x02 ‖ rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, to, value, data, access_list])` (kb/31 §Unsigned EIP-1559 byte layout).

| Rule | Error | Rejects (example vector) |
|---|---|---|
| `len ≤ 128` | `ERR_EVM_TOO_LONG` | oversized blobs |
| `p[0] == 0x02` | `ERR_EVM_TYPE` | legacy / EIP-155 / pre-155 (chain-independent hash, kb/70 F3), type-1, **type-4 (EIP-7702)**, `0x05‖rlp(auth)` (7702 authorization, `chain_id 0` = every chain), `0x19 0x45` (EIP-191), `0x19 0x01` (EIP-712 / ERC-2612 permits / Permit2), raw 32-byte hashes |
| exactly one canonical RLP list consuming all remaining bytes, exactly 9 items; minimal big-endian integers (no leading zero; single byte < 0x80 not wrapped); **nesting depth ≤ 16** (the outer list is depth 0, each list level adds 1; any deeper item is refused while the structure is decoded, so this code pre-empts every rule below, e.g. a 17-deep access list on chain 1 is `ERR_EVM_RLP`, not `ERR_EVM_CHAIN_ID`; fuzzing F-01) | `ERR_EVM_RLP` | trailing bytes, non-canonical ints, short lists, > 16-deep nesting |
| `chain_id` ≤ 8 bytes and `== 11155111` | `ERR_EVM_CHAIN_ID` | mainnet `chainId 1`, L2s |
| `nonce`, `gas_limit` ≤ 8 bytes; `nonce < 2^64 − 1` (EIP-2681); fees and `value` ≤ 16 bytes | `ERR_EVM_INT_WIDTH` | over-wide integers (refused, never truncated) |
| `to` is exactly 20 bytes | `ERR_EVM_TO` | contract creation (empty `to`) |
| `data` empty (`0x80`) | `ERR_EVM_DATA` | `approve`/`transfer`/any calldata |
| `access_list` empty (`0xc0`) | `ERR_EVM_ACCESS_LIST` | non-empty lists |
| **nonce-gap rule** (token state; checked after every rule above, before any state change): let `m` = the highest nonce of the token's EVM records (`TokenState.max_evm_nonce`, any status, kept across transfers and sales). Require `nonce ≤ m + 1`; if the token has no EVM record yet, require `nonce ≤ 1` | `ERR_EVM_NONCE_GAP` | far-future "poison" nonces (review S-04), skipped nonces |
| → record `Evm{chain_id, nonce, unsigned_tx}`; MPC payload `keccak256(p)`; `max_evm_nonce = max(m, nonce)` | — | — |

**Nonce-gap rule** (D-43, reverses D-21; security review S-04).
- Why: only this contract can advance a Satchel's EVM nonce, and the token's records outlive transfers. Without the rule, one record at nonce 2^64 − 2 stays `unused` forever and makes the token unsellable for every later owner. With it, a poison costs one record per nonce, and a later owner can always clear it by broadcasting the published signatures or signing the missing nonces.
- It never blocks a legitimate send. The chain nonce of a Satchel's EVM address is at most `m + 1` (0 when it never signed): incoming transfers, including faucet funding, do not bump it. A retry or replacement reuses a nonce ≤ `m`.
- The first EVM request may use nonce 1 (not only 0), so demo #4's blocking record ("nonce = current + 1", §7.6) stays possible.
- `max_evm_nonce` is `Option<u64>` in `TokenState` (+8 B on the first EVM record, charged to the requester). Clients compute `m` from `sig_records` (`@satchel/core/policy` `maxSignedEvmNonce`, `checkEvmNonce`), and the Send builder refuses to build a request the contract would refuse.
- A dev contract whose state is reset while its account (so its derived addresses) is kept can find its tokens' chain nonces above `m + 1`; use a new `devN` account instead (D-43).

**EVM, BTC and SOL policy deltas (sprint 2026-10-29; normative text: `docs/specs/C1-C2-C3-C7.md` §2–§3, which wins
over the EVM table above where they differ).**
- **C3, four EVM chains.** `chain_id` is now checked against `EVM_CHAIN_IDS` = {11155111, 84532, 421614, 11155420}
  (rule 4), not `== 11155111`. The Satchel's EVM address is the same on every chain (one key, domain 0); only
  `chain_id` inside the signed tx differs.
- **C3, per-chain nonce-gap rule.** The nonce-gap rule (rule 11, below) runs **per `chain_id`**. Sepolia keeps using
  `TokenState.max_evm_nonce` (unchanged field); the other three chains use a new map
  `LookupMap<(TokenId, u64 /* chain_id */), u64>` under `StorageKey::EvmNonces`, opened on demand (not a `Contract`
  field), appended to the `StorageKey` enum after `Proceeds` (and before C5/C4/C6's keys, §13 E-21, E-52).
- **C2, USDC calldata.** `data` (rule 7) may now be empty **or** exactly a canonical 68-byte ERC-20
  `transfer(address,uint256)` to this chain's configured USDC (rule 8), with `value == 0` (rule 9). Any other
  calldata is still `ERR_EVM_DATA`. `EVM_MAX_TX_BYTES` is 160 (was 128, above) to fit a USDC transfer.
- **C7, message signing.** Two new, EVM/SOL-keyed request kinds, `evm_message` (EIP-191 `personal_sign`) and
  `sol_message` (Solana off-chain message v0), each one record, one MPC request, classified by `parse/msg.rs` and
  normatively specified in `docs/specs/C1-C2-C3-C7.md` §3.3. They never touch an EVM nonce or a BTC/SOL balance, and
  a message signature can never satisfy any transaction/authorization encoding on any of the three chains (§3.4 of
  that spec) — see §7 below for why clean history never blocks on them.
- **C5, delegated signing.** `sign_for`'s owner-only check (step 1 above) now also admits a delegate with a live,
  unexpired allowance that covers the request's asset and amount (`docs/specs/C5.md` §1.3's `authorize_signer` /
  `debit_allowance`); message requests (C7) and any EVM calldata other than a canonical USDC transfer are refused
  for delegates with `ERR_ALLOWANCE_KIND`, whatever the classifier above accepts for an owner, and a delegate's BTC
  request must have exactly one input (`ERR_ALLOWANCE_BTC_ONE_INPUT`, AUDIT-01: BIP143 commits each input's amount
  only in its own sighash, so with several inputs the stated fee could understate the real one).

**BTC (`parse/btc.rs`), P2WPKH, SIGHASH_ALL, one complete transaction per call.** The preimage layout follows kb/30 §Preimage layout (182 B):

| Offset | Len | Field | Rule | Error |
|---|---|---|---|---|
| — | — | count | `1 ≤ n ≤ 10` | `ERR_BTC_INPUT_COUNT` |
| — | 182 | each preimage | exactly 182 bytes | `ERR_BTC_PREIMAGE_LEN` |
| 0 | 4 | nVersion | `== 2` (LE `02000000`) | `ERR_BTC_VERSION` |
| 4 | 32 | hashPrevouts | equal in all preimages, and `== sha256d(outpoint_0 ‖ … ‖ outpoint_{n−1})` (all inputs present, in order) | `ERR_BTC_MIXED_TX` / `ERR_BTC_PREVOUTS_INCOMPLETE` |
| 36 | 32 | hashSequence | equal in all preimages, and `== sha256d(seq_0 ‖ … ‖ seq_{n−1})` | `ERR_BTC_MIXED_TX` / `ERR_BTC_SEQUENCES_MISMATCH` |
| 68 | 36 | outpoint (txid LE ‖ vout LE) | no duplicates within the call | `ERR_BTC_DUPLICATE_INPUT` |
| 104 | 26 | scriptCode | `19 76 a9 14 <20-byte pkh> 88 ac`, the same pkh in all preimages | `ERR_BTC_SCRIPTCODE` / `ERR_BTC_MIXED_TX` |
| 130 | 8 | amount | informational (BIP143 commits to it; a wrong value just invalidates the signature) | — |
| 138 | 4 | nSequence | `≥ 0xfffffffd` (no relative timelock; the UI uses `0xfffffffd`, BIP125) | `ERR_BTC_SEQUENCE` |
| 142 | 32 | hashOutputs | equal in all, and `== sha256d(outputs)` | `ERR_BTC_MIXED_TX` / `ERR_BTC_OUTPUTS_MISMATCH` |
| 174 | 4 | nLockTime | `== 0` | `ERR_BTC_LOCKTIME` |
| 178 | 4 | sighash type | `== 1` (`01000000`, SIGHASH_ALL) | `ERR_BTC_SIGHASH` |
| `outputs` | ≤ 1024 B | Σ(value u64 LE ‖ varint len ‖ script) | parses exactly to the end; 1–16 outputs; each script ≤ 520 B | `ERR_BTC_OUTPUTS_MALFORMED` |
| → one record per input `Btc{txid = reverse(p[68..100]), vout, amount_sats}`; MPC payload `sha256(sha256(p_i))` | | | | |

Why these rules hold (kb/70 §(e), notes on BTC; kb/30 §7):
- SIGHASH_ALL blocks NONE/SINGLE recombination and the legacy SIGHASH_SINGLE "hash = 1" reuse (kb/70 F5; spike/btc §11).
- Completeness lets the checker apply "any input spent ⇒ the whole request is dead", because SIGHASH_ALL commits to every prevout (kb/30 §7).
- A wrong pkh only yields a useless signature, so the contract never needs the derived pubkey on-chain (kb/30 §Rec P1).
- `outputs` lets anyone rebuild the full signed tx from the event log: version, inputs, sequences, outputs and locktime are all determined, plus the off-chain-derived pubkey.

**SOL (`parse/sol.rs`), legacy single-signer System Transfer.** Contract support ships in the final contract; the UI flow is on by default (D-46; it was P2 under D-40). If the SOL classifier is not green by the Day-9 contract freeze (DP5), `SignRequest::Sol` panics `ERR_CHAIN_UNSUPPORTED` instead.

Checks run in this order (R-24: the durable-nonce scan comes before the instruction-count rule, so its vector gets its own error):

| # | Rule | Error |
|---|---|---|
| 1 | `len ≤ 1232` | `ERR_SOL_TOO_LONG` |
| 2 | first byte `< 0x80` (legacy). Any versioned message (`0x80` = v0, `0xff` = off-chain message) is refused (D-22) | `ERR_SOL_VERSION` |
| 3 | parse the whole message: header `num_required_signatures == 1`, `num_readonly_signed == 0` (`ERR_SOL_HEADER`, checked right after the 3 header bytes); canonical compact-u16 lengths; `2 ≤ num_keys ≤ 16`; `1 + num_readonly_unsigned ≤ num_keys` (i.e. `num_required_signatures + num_readonly_unsigned ≤ num_keys`; fuzzing F-02); 32 B keys; 32 B recent blockhash; instruction list with in-range program and account indices; no trailing bytes | `ERR_SOL_HEADER` / `ERR_SOL_MALFORMED` |
| 4 | **scan every instruction**: program == System (32 zero bytes) and `data[0..4] == 04 00 00 00` (AdvanceNonceAccount, durable nonce) | `ERR_SOL_DURABLE_NONCE` |
| 5 | exactly **one** instruction: program key == System program; data length 12, `data[0..4] == 02 00 00 00` (Transfer) + u64 LE lamports; accounts `[0, k]` with `k < num_keys` | `ERR_SOL_INSTRUCTION` |
| → | record `Sol{recent_blockhash, lamports}`; MPC payload = the message itself (Eddsa) | — |

These rules make every SOL signature expire with its blockhash, roughly 150 blocks ≈ **36 s** after the hash was fetched (kb/32 §TL;DR 3). They also prevent the Ed25519 key from signing NEAR-implicit, Aptos or off-chain messages: a 32-byte hash can never parse as a message (kb/70 §Notes Solana).

**Wasm and gas cost.**
- kb/70's narrower spike parsers added ≈ 7.9 KB of wasm (hand-rolled RLP; alloy-rlp +9.1 KB) and cost < 0.2 Tgas against the MPC's own 15 Tgas (kb/70 F9, §Costs).
- The v1 BTC classifier is larger: multi-preimage, `hashSequence`, outputs parsing. Its size and gas are **unmeasured**; SAT-031 measures them on Day 4 [ASSUMED small].
- Test vectors: §12.2.

### 5.10 Token state machine

```
                 nft_transfer (owner; not listed)            sign_for (owner)  → records++, last_sign_height = h
                 ┌───────────┐                                ┌───────────┐
                 ▼           │                                ▼           │
  mint ──►  ┌──────────── ACTIVE ────────────┐  list (owner; h ≥ last_sign_height+250)   ┌───────── LISTED / FOR SALE ─────────┐
            │ quiet period while              │ ─────────────────────────────────────────►│ buyable at once (no cooldown)       │
            │ h < last_sign_height + 250      │ ◄───────────────── delist (owner) ────────│ sign_for → ERR_FROZEN               │
            └─────────────────────────────────┘ ◄── buy / ft_on_transfer:                 │ nft_transfer → ERR_LISTED           │
                         ▲                          new owner, listing cleared ("SOLD")   │ list → ERR_ALREADY_LISTED           │
                         └────────────────────────────────────────────────────────────────┴─────────────────────────────────────┘
```

| UI status pill (kb/80 §Role × status, as revised) | Derived from | Allowed for owner |
|---|---|---|
| **Active** | `listing == None` | Send · Fund · Transfer · List (during the quiet period: "You can list in {n} blocks (~{t})") |
| **Signing** (overlay on Active) | a record with `status == Pending && height > now − 250`, or a local in-flight intent | Send (another one replaces the same nonce/inputs, §8.7); Transfer allowed but discouraged (UI soft guard, D-08) |
| **For sale** | listed | Delist · Fund. Signing and transfers paused |
| **Sold** (flow end) | `sold` event / owner changed by a sale | — |

kb/80's "Listed · cooling down" pill and the buyer-side "Safe to buy in {n} blocks" countdown are gone (§13 E-37). The FreezeBanner keeps "Signing paused while listed" without a countdown.

### 5.11 Ownership-change paths (complete list for v1)

| Path | Guard | Effect on Satchel state | Approvals |
|---|---|---|---|
| `nft_transfer` | `ERR_NOT_OWNER` (wrapper, first); not listed (`ERR_LISTED`); receiver ≠ contract / MPC / configured USDC (`ERR_BAD_RECEIVER`); standard checks | none (history and `last_sign_height` stay with the token) | N/A (NEP-178 disabled) |
| sale via `buy` / `ft_on_transfer` | §5.7 | listing cleared, index updated, `sold` event | N/A |
| ~~`nft_transfer_call` / `nft_resolve_transfer` revert~~ | disabled | — | — |

- Approvals are disabled, so near-contract-standards' `internal_transfer` lets only the owner move a token. In 5.29.1 a non-owner sender panics with **"Approval extension is disabled"** (`core_impl.rs` L222; the spec's earlier "Unauthorized" is the deprecated `mint`'s string, L290; review R-16).
- The Satchel wrapper checks ownership first, so users and tests see the stable `ERR_NOT_OWNER`. The standard's string only appears if the wrapper is ever bypassed.
- The accomplice-approval attack from kb/70 §(i) and the `nft_key` hook bug from kb/01 §Gotchas 3 therefore cannot happen.
- **Receiver guard (R-18; review S-06, S-09).** NEP-171 accepts any valid account id. A Satchel owned by the contract itself, the MPC account or the configured USDC contract would have its funds stranded forever (none of them can ever call `sign_for`), so the contract refuses all three with `ERR_BAD_RECEIVER`. The same guard runs first in **`nft_mint`**, so a token cannot be *born* stranded either, and (Q-03, 2026-10-31) on every other receiver a caller picks: the `withdraw_near` / `withdraw_ft` receiver, the `prepay_storage` account and the offerer (C4-C6.md §2.2, §3.1). Payouts whose receiver the contract fixes (seller, offerer refund, the caller of `withdraw_proceeds` / `withdraw_storage_credit`) need no check. Code (`lib.rs` `ensure_receiver`): `*receiver_id != env::current_account_id() && *receiver_id != self.mpc && Some(receiver_id) != self.usdc.as_ref()`. With `usdc: None` the USDC id is an ordinary receiver. Nonexistent receivers and the token's own derived NEAR implicit accounts (hex SOL pk, the EVM key's eth-implicit id) stay UI checks: the UI blocks the three ids above, requires the receiver to exist (`view_account`) and refuses this token's derived accounts.
- Phase-3 re-enable design: Appendix A.
- **(sprint 2026-10-29)** C4 adds a third path, `accept_offer`, with its own guards (`docs/specs/C4-C6.md` §3.2).
  Every ownership change, including it, clears the token's allowances (INV-35, §6.1).

### 5.12 Sale flow

There is no waiting after `list`: a buyer whose browser check says `clean` can buy in the next block.

**NEAR:** `carol` calls `buy(3, 7, 4)` and attaches exactly `price`.
- Receipt 1 (≈ 4 Tgas): checks, `internal_transfer`, listing cleared, events. It also creates the detached payout: transfer to `alice` → `on_payout`.
- Receipt 2: transfer to `alice`.
- Receipt 3: `on_payout`. It is a no-op on success; on failure (e.g. a deleted account) it credits `proceeds[(alice, Near)]` by overwriting the slot alice's `list` reserved, so the credit needs no new storage even when the contract's free balance is exhausted (review S-01).
- The tx succeeds once receipt 1 succeeds. The seller sees the NEAR within about 2 blocks, which satisfies S-7 ("seller paid in one transaction").

**USDC:** `carol` calls `usdc.ft_transfer_call({receiver_id: satchel, amount: price, msg: '{"buy":{"token_id":"3","listing_id":7,"expected_sig_count":4}}'})` with 1 yocto and 150 Tgas.
1. USDC `internal_transfer` moves the funds to satchel.
2. `satchel.ft_on_transfer` runs the checks, makes the sale atomic and starts the detached `usdc.ft_transfer(alice)` → `on_payout`. It returns `"0"`.
3. USDC `ft_resolve_transfer` keeps everything.

The tx `SuccessValue` is the **used** amount. `"5000000"` means bought; `"0"` means refunded. A failed purchase is still a *successful* tx, so the UI must read the value (kb/51 §Gotchas 1).

Prerequisites:
- `satchel.<team>.testnet` must be USDC-storage-registered, or every `ft_transfer_call` to it panics in the first receipt (kb/51 §TL;DR 3).
- The seller should be registered too, or the payout fails and is re-credited. The Sell UI checks `storage_balance_of(seller)` and offers "Register for USDC (0.00125 NEAR)" before a USDC listing (kb/51 §Gotchas 4).

### 5.13 Events (NEP-297, `standard: "satchel"`, `version: "1.0.0"`; `#[near(event_json(standard = "satchel"))]`)

Account ids go inside `data`, so FastNEAR `is_event_log` finds them (kb/50 §NEP-297 event format). Indexers must trust events only from successful receipts (kb/20 §Events). Total log size per receipt is ≤ 16 KB: 10 BTC preimages plus outputs come to about 5 KB of hex.

| event | emitted by | `data` |
|---|---|---|
| `sign_requested` | `sign_for` | `{token_id, owner_id, request_id, first_seq, count, chain, path, domain_id, height, payloads: [hex32…], preimages: [hex…] /* EVM tx · BTC preimages · SOL message */, btc_outputs: hex \| null, details: [{seq, …detail}]}` |
| `sign_resolved` | `on_signed` | `{token_id, first_seq, count, statuses: ["signed"\|"failed"\|"unparsed"…]}` |
| `listed` | `list` | `{token_id, listing_id, seller_id, price, currency, listed_at, sig_count}` |
| `delisted` | `delist` | `{token_id, listing_id, seller_id}` |
| `sold` | `buy` / `ft_on_transfer` | `{token_id, listing_id, seller_id, buyer_id, price, currency}` |
| `payout` | `on_payout` | `{account_id, currency, amount, ok}` (`ok:false` ⇒ credited to proceeds) |
| (standard) `nep171` `nft_mint`, `nft_transfer` | near-contract-standards (version "1.0.0"; `authorized_id` never filled, kb/20 §TL;DR 11) | standard |

Example: `EVENT_JSON:{"standard":"satchel","version":"1.0.0","event":"sign_requested","data":{"token_id":"1","owner_id":"alice.team.testnet","request_id":0,"first_seq":0,"count":1,"chain":"evm","path":"satchel/1/evm","domain_id":0,"height":274500000,"payloads":["bc65…c377"],"preimages":["02ee83aa36a7…80c0"],"btc_outputs":null,"details":[{"seq":0,"chain_id":11155111,"nonce":0}]}}`

### 5.14 Views (JSON shapes the UI, the SSR pages and the README use)

```jsonc
// config()
{"version":"1.0.0","mpc_contract_id":"v1.signer-prod.testnet","usdc_contract_id":"3e2210e1…b8af","cooldown_blocks":250,
 "evm_chain_ids":[11155111],"max_btc_inputs":10,"mpc_sign_gas_tgas":15,"on_signed_gas_tgas":{"base":10,"per_request":2},
 "min_sign_prepaid_tgas":{"base":30,"per_request":18},"max_mpc_deposit":"10000000000000000000000",
 "storage_byte_cost":"10000000000000000000","base_uri":"https://<app-host>/api/card/","next_token_id":7,"next_listing_id":3}
// satchel("3")   — "listable_at" = last_sign_height + cooldown_blocks (the quiet period); there is no "buyable_at"
{"token_id":"3","owner_id":"alice.team.testnet","sig_count":4,"last_sign_height":274600123,"listable_at":274600373,
 "listing":{"id":7,"seller":"alice.team.testnet","price":"5000000","currency":"usdc","listed_at":274700000,"sig_count":4},
 "paths":{"btc":"satchel/3/btc","evm":"satchel/3/evm","sol":"satchel/3/sol"}}
// sig_records("3", 0, 50) → [SigRecordView]
[{"seq":0,"request_id":0,"input_index":0,"chain":"evm","height":274600001,"timestamp_ms":1793000000000,"requester":"alice.team.testnet",
  "payload":"bc65…c377","status":"signed","signature":{"r":"f6ef…0f0c","s":"549e…87e1","recovery_id":1},
  "detail":{"evm":{"chain_id":11155111,"nonce":0,"unsigned_tx":"02ee83aa36a7…80c0"}}},
 {"seq":1,"request_id":1,"input_index":0,"chain":"btc","status":"pending","signature":null,
  "detail":{"btc":{"txid":"efc545…","vout":1,"amount_sats":"50000"}}, "…":"…"},
 {"seq":3,"chain":"sol","status":"failed","signature":null,"detail":{"sol":{"recent_blockhash":"<hex32>","lamports":"1000000"}}, "…":"…"}]
// listings(0, 50) → [{"token_id":"3","listing":{…}}]          proceeds_of("alice.team.testnet") → [{"currency":"usdc","amount":"5000000"}]
// nft_tokens(from_index?, limit?) / nft_tokens_for_owner(account_id, from_index?, limit?) → [Token]   (NEP-181, at most 50)
```

Page limits:
- `sig_records` and `listings` clamp `limit` to `MAX_PAGE` = 50.
- **NEP-181** (`nft_tokens`, `nft_tokens_for_owner`): `limit` **defaults to 50 and is capped at 50** (review S-05). Code: `page_limit(limit) = Some(limit.unwrap_or(MAX_PAGE as u64).min(MAX_PAGE as u64))`, passed to the near-contract-standards implementation. A missing `limit` means 50, never "all", so spam mints cannot push an unpaged call past the view gas limit. Clients that need more page with `from_index`. NEP-181 allows a contract-chosen limit.
- `proceeds_of` hides zero entries, so a reserved or withdrawn slot (value 0) does not show.

Signature encoding in views:
- `secp256k1 → {r, s, recovery_id}` (32-byte hex each); `ed25519 → {signature: hex64}`; `null` unless `status == signed`.
- Amounts (`amount_sats`, `lamports`, the EVM `value` that the client parses from `unsigned_tx`) are decimal strings, like every token amount.
- The EVM `to` and `value` are not stored separately: the client parses them from `unsigned_tx` (viem `parseTransaction`) and must check that `keccak256(unsigned_tx) == payload`.

### 5.15 Error codes (stable; the UI maps by the prefix before ":"; each panic reads `ERR_X: human sentence`)

| Code | Raised by | Meaning → UI copy key (kb/80 §Error map) |
|---|---|---|
| `ERR_TOKEN_NOT_FOUND` | all token methods | token id doesn't exist → `page.notfound` |
| `ERR_NOT_OWNER` | sign_for, list, delist, **nft_transfer** (wrapper check, R-16) | caller isn't the owner → E3 |
| `ERR_FROZEN` | sign_for | token is listed → E4 |
| `ERR_LISTED` | nft_transfer | token is listed → `xfer.blocked.listed` |
| `ERR_BAD_RECEIVER` | nft_mint, nft_transfer, withdraw_near, withdraw_ft, prepay_storage, make_offer / USDC offer (the offerer) | receiver (or credited account, or offerer) is the Satchel contract, the MPC account or the configured USDC contract (funds would be stranded, R-18, S-06, S-09) → `xfer.err.contract` / `xfer.err.mpc` (kb/80 R2; inline under the account field, caught before the wallet) |
| `ERR_TRANSFER_CALL_DISABLED` | nft_transfer_call | disabled in v1 |
| `ERR_CHAIN_UNSUPPORTED` | sign_for | only if DP5 removes the SOL classifier at the Day-9 contract freeze (G7): `SignRequest::Sol` is refused → "Solana signing isn't enabled on this contract." |
| `ERR_DEPOSIT` | mint, sign_for, list, delist, withdraw | mint / sign_for / list: deposit too small (`ERR_DEPOSIT: attach ≥ N yocto`) → E6. delist / withdraw_proceeds: anything but exactly 1 yocto (`ERR_DEPOSIT: attach exactly 1 yocto`, S-03) |
| `ERR_GAS` | sign_for | prepaid below `30 + 18·n` Tgas → E7 |
| `ERR_MPC_DEPOSIT` | sign_for | `mpc_deposit` outside [1 yocto, 0.01 NEAR] |
| `ERR_HEX` | sign_for | bad hex |
| `ERR_EVM_TYPE`, `ERR_EVM_RLP`, `ERR_EVM_CHAIN_ID`, `ERR_EVM_INT_WIDTH`, `ERR_EVM_TO`, `ERR_EVM_DATA`, `ERR_EVM_ACCESS_LIST`, `ERR_EVM_TOO_LONG` | sign_for | EVM policy refusal → "Satchel only signs plain Sepolia ETH transfers." |
| `ERR_EVM_NONCE_GAP` | sign_for | nonce above the highest signed nonce + 1 (≤ 1 for the first EVM record), §5.9 (D-43); the message names the largest allowed nonce → `errors.nonceGap` |
| `ERR_BTC_INPUT_COUNT`, `ERR_BTC_PREIMAGE_LEN`, `ERR_BTC_VERSION`, `ERR_BTC_SIGHASH`, `ERR_BTC_SCRIPTCODE`, `ERR_BTC_LOCKTIME`, `ERR_BTC_SEQUENCE`, `ERR_BTC_MIXED_TX`, `ERR_BTC_PREVOUTS_INCOMPLETE`, `ERR_BTC_SEQUENCES_MISMATCH`, `ERR_BTC_OUTPUTS_MISMATCH`, `ERR_BTC_OUTPUTS_MALFORMED`, `ERR_BTC_DUPLICATE_INPUT` | sign_for | BTC policy refusal |
| `ERR_SOL_TOO_LONG`, `ERR_SOL_VERSION`, `ERR_SOL_HEADER`, `ERR_SOL_MALFORMED`, `ERR_SOL_INSTRUCTION`, `ERR_SOL_DURABLE_NONCE` | sign_for | SOL policy refusal |
| `ERR_QUIET_PERIOD` | list | signed < 250 blocks ago → `sell.err.quiet`; the "Before you list" row `sell.check.quiet` shows "You can list in {n} blocks (~{t})" beforehand (kb/80 R2; was `sell.blocked.pending`) |
| `ERR_ALREADY_LISTED` / `ERR_NOT_LISTED` | list / delist, buy | → E34 / `buy.err.delisted` (kb/80 R2) |
| `ERR_PRICE`, `ERR_CURRENCY` | list, buy, ft_on_transfer | price 0; USDC disabled; currency mismatch |
| `ERR_LISTING_CHANGED` | buy, ft_on_transfer | `listing_id`/`sig_count`/seller mismatch → the `buy.changed` interstitial (old → new listing; kb/80 R2). The UI re-reads `satchel(id)` before the call, so this is normally caught first |
| ~~`ERR_COOLDOWN`~~ | — | removed in rev 2: there is no post-listing cooldown |
| `ERR_SELF_BUY` | buy, ft_on_transfer | seller buying own listing |
| `ERR_WRONG_AMOUNT` | buy, ft_on_transfer | attached/amount ≠ price → `buy.refunded` "Not bought. Your {price} was refunded." (kb/80 R2) |
| `ERR_WRONG_TOKEN` | ft_on_transfer | predecessor isn't the configured USDC (direct-call attack, kb/51 §TL;DR 6) |
| `ERR_BAD_MSG` | ft_on_transfer | msg isn't exactly one of `{"buy":{…}}`, `{"offer":{…}}`, `{"deposit":"…"}`: an unknown or duplicate field, a missing field, a second key, `null` or `{}` (strict since Q-04, C4-C6.md §1.2) |
| `ERR_NOTHING_OWED` | withdraw_proceeds | nothing to withdraw |
| near-contract-standards strings | nft_transfer (after the wrapper's checks) | "Requires attached deposit of exactly 1 yoctoNEAR", "Current and next owner must differ", "Token not found", and "Approval extension is disabled" (non-owner sender; unreachable behind the wrapper) — **not** "Unauthorized" (R-16) |
| MPC strings (in the MPC receipt, not ours) | — | `Request has timed out.` → E9; `Provided gas is lower than required…` → E7; `Pending-request queue is full…` → E10 (kb/10 §`sign`) |

### 5.16 Keyless birth — deploy runbook (outline; full checklist in `plan/implementation-plan.md` §6)

**Why keyless** (D-02, D-28; review R-03/R-04):
- A key on the contract account could call the MPC as the predecessor and sign without a record (kb/70 §Threat o).
- The rev-1 plan (create → deploy → six separate mints → delete key) had two flaws:
  - a ≈ 30-minute keyed window, whose proof used the wrong FastNEAR filter (`is_signer` misses NEP-366 delegated signing);
  - a mint race: anyone could mint a pre-funded id between the deploy and the persona mints.
- One atomic transaction from `<team>.testnet` with **no AddKey** removes both.

Once `CreateAccount` has run, the rest of the receipt acts with the new account's permissions, so `DeployContract` is allowed (the factory pattern). `FunctionCall`s keep `predecessor = <team>.testnet`. That is why `new` is not `#[private]` (§5.6).

If any action fails, the whole receipt reverts and **no account is left behind**. A failed birth can simply be fixed and re-sent. A *successful* birth with a wrong argument is permanent, so the identical batch is rehearsed on rc first.

**Batch** (signer `<team>.testnet`, receiver `<acct>` = `rc.<team>.testnet` on Day 9 or `satchel.<team>.testnet` on Day 10):

| # | Action | Args | Gas / deposit |
|---|---|---|---|
| 1 | CreateAccount | — | — |
| 2 | Transfer | **10 NEAR (rc) / 20 NEAR (final)** (D-34 as revised after review S-02; the `tools/deploy/keyless-birth.ts` defaults, `--transfer` overrides) | — |
| 3 | DeployContract | `target/near/satchel/satchel.wasm`, the reproducible artifact with SHA-256 **H** | — |
| 4 | FunctionCall `new` | `{"mpc":"v1.signer-prod.testnet","usdc":"3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af","base_uri":"https://<app-host>/api/card/"}` | 30 Tgas, 0 NEAR |
| 5–11 | FunctionCall `nft_mint` ×7 | `{"receiver_id":"alice.<team>.testnet"}`, minting ids 1–7 (every pre-funded id, including retake tokens #6/#7) | 20 Tgas, 0.02 NEAR each |

Gas: **prepay 200 Tgas**. Measured 2026-10-21: an identical 11-action keyless batch with a 316 KB NFT wasm, init and 7 mints burnt **78.2 Tgas** and reached FINAL in 4.5 s. The per-tx limit is 1 PGas. The sender must also hold the Transfer, all deposits and the gas hold (prepaid gas × gas price × 10) up front, or the tx is rejected before execution with `NotEnoughBalance`. [VERIFIED, `research/spikes/keyless-birth/RESULTS.md`]

**Keyless birth works on testnet, and it is atomic.** [VERIFIED 2026-10-21, `research/spikes/keyless-birth/RESULTS.md`]
- Test 2: an 11-action batch with no AddKey succeeded (tx `2AMrb8J8…`). The new account has 0 keys and its code hash equals the wasm SHA-256.
- Test 3: the same batch with a failing 7th mint reverted *everything*. The account does not exist afterwards, and only ≈ 0.0075 NEAR of gas was spent; the Transfer and deposits were refunded.
- FastNEAR `is_any_signer` → `txs_count: 0`, and the unfiltered history holds only the birth tx.

**Build it with the near-api-js tool, not near-cli-rs.** In near-cli-rs 0.30.1, `add-action deploy-contract use-file … with-init-call …|without-init-call` accepts only `skip` afterwards, so **no action can follow DeployContract**. Chaining `function-call` actions after `without-init-call` fails with `unrecognized subcommand 'add-action'` (tested 2026-10-21).

**Primary tool:** `tools/deploy/keyless-birth.ts`, written on/after Nov 1 (SAT-084).
- It calls near-api-js 7.3.1 with `createTransaction(sender, pk, receiver, nonce, [actions.createAccount(), actions.transfer(…), actions.deployContract(wasm), actions.functionCall('new', …), …actions.functionCall('nft_mint', …) ×7], blockHash)`, then signs and `send_tx` with `wait_until: FINAL`.
- It prints the action list and SHA-256 **H**, and requires a typed "yes" before sending.
- The verified shape is `research/spikes/keyless-birth/batch11.mjs`. That file is evidence only: re-implement from this description, never copy spike code.

**CLI-compatible alternative** (verified as test 1): 4 actions, `create-account` → `transfer` → `deploy-contract use-file … with-init-call new …` → `skip`. This works only if `new` mints the demo ids itself (an init argument such as `genesis_owners: Vec<AccountId>`). It is just as atomic and race-free, but it adds a second mint code path, so v1 keeps separate `nft_mint` actions through the tool.
```bash
# verified 4-action form (example contract; Satchel would need genesis mints inside `new`):
near transaction construct-transaction <team>.testnet receiver-id <acct> \
  add-action create-account add-action transfer '20 NEAR' \
  add-action deploy-contract use-file target/near/satchel/satchel.wasm \
    with-init-call new json-args '{…}' prepaid-gas '100 Tgas' attached-deposit '0 NEAR' \
  skip network-config testnet-fastnear sign-with-legacy-keychain send
```

**Runbook:**

| Step | When | Who / approval | Action | Check |
|---|---|---|---|---|
| 0 | Day 5 | S1 (H-20 b) | Sandbox test of the batch via the near-workspaces batch API (INV-31); dry-construct the CLI batch with `sign-later` + `print-transaction` | INV-31 green; printed tx shows the action list with no AddKey |
| 1 | Day 9 | S1 (H-20 a/b) | Tag `contract-v1.0.0-rc1`, push to the private repo; `cargo near build reproducible-wasm` twice | identical SHA-256 **H** (`shasum -a 256` on macOS, `sha256sum` on Linux; R-39); sandbox suite + `check-wasm-imports.sh` on that artifact (SAT-081) |
| 2 | Day 9 | S1 (H-20 b) | **rc birth** (batch with Transfer 10 NEAR); USDC `storage_deposit` for rc from `<team>.testnet` | proofs 1–6 below on rc (proof 6 once rc has records); `near contract verify --use-contract-source-code-path ./ deployed-at rc.<team>.testnet network-config testnet-fastnear now` → "…are the same" (R-11) |
| 3 | Day 9 | S1 + S2 | rc #1/#2 were funded in Phase 0 (wallet path) or by the Day-5 fan-out (fallback, D-33); top up from dev Satchels if needed. Run the e2e flows and the clean-history scenario (SAT-085, R-09) against rc with `NEXT_PUBLIC_CONTRACT_ROLE=rc` (strict gate) | all green |
| 4 | Day 10 | S1 + **H (explicit "yes", H-15)** | MPC `version` = 3.17.0 and `config` gas = 15 (A-01). If the contract is unchanged since rc1, tag **`contract-v1.0.0`** on the same commit (R-29); the artifact is still **H** | tag pushed |
| 5 | Day 10 | S1 + **H** | **Final birth** (batch with Transfer 20 NEAR); record the tx hash and block **A** | proofs 1–6 |
| 6 | Day 10 | S1 (H-20 b) | USDC `storage_deposit {"account_id":"satchel.<team>.testnet","registration_only":true}` 0.00125 NEAR, signed by `<team>.testnet` | `storage_balance_of` ≠ null |
| 7 | Day 10 | S1 | Write the proof outputs to `docs/evidence/birth.json`; switch the app (SAT-091) | — |
| 8 | Day 13 (repo public) | S1 | `near contract verify deployed-at satchel.<team>.testnet network-config testnet-fastnear now`; optional NearBlocks "Verify and Publish" | "…are the same" |

**Proofs for judges** (README "Verify on-chain"; FastNEAR tx API is the canonical history source, D-10):
1. **The birth tx.** `curl -s -X POST https://tx.test.fastnear.com/v0/transactions -H 'content-type: application/json' -d '{"tx_hashes":["<birth hash>"]}'` lists CreateAccount, Transfer, DeployContract and FunctionCall ×8, with **no AddKey**.
2. **The account exists and has no keys.** Check both, because an empty key list alone also means "no such account" (kb/00 §Gotchas 10): `near account view-account-summary satchel.<team>.testnet network-config testnet-fastnear now` → "Account is locked (no access keys)" plus SHA-256 **H**; or the kb/00 curl pair → `access keys = 0`, `code sha256 = H`.
3. **It never signed anything, including delegated actions.** `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"satchel.<team>.testnet","is_any_signer":true}'` → `"account_txs":[]`, `txs_count: 0` [VERIFIED 2026-10-21 on a keyless spike account; an account that never had a key cannot sign delegated actions either].
4. **There was no earlier incarnation of the id.** The same endpoint with `{"account_id":"satchel.<team>.testnet","desc":false,"limit":1}` returns the birth tx at block **A** as the oldest entry.
5. **The code is the published code.** `cargo near build reproducible-wasm` at tag `contract-v1.0.0` → SHA-256 = **H** = the on-chain hash. Once the repo is public, `near contract verify deployed-at …` also works.
6. **The records start after birth.** The first `sig_records(id, 0, 1)` height is > **A**.

**Option (a), documented fallback** (use it only if the keyless batch is rejected in the sandbox on Day 5 or on rc on Day 9, and the near-api-js tool doesn't help):
1. Create the account with a key.
2. Send one tx **signed by the satchel key** containing DeployContract, FunctionCall `new` and FunctionCall `nft_mint` ×7 (ids 1–7, so nothing can be minted first).
3. Run `delete-keys` for every key (beware the CLI's false error, kb/22 §TL;DR 6).
4. Proof: `is_any_signer` lists **exactly** those two txs, and the unfiltered history starts at the creation tx.
5. The README discloses the window: "the account held a key for N minutes and signed only those two txs".

---

### 5.17 Sprint additions: new methods, views, events, errors and storage keys (sprint 2026-10-29)

Full signatures, JSON shapes and preconditions live in the three spec files; this is the index into them. Nothing in
§5.6/§5.7/§5.13/§5.14/§5.15 above that isn't listed here changed: `sign_for`'s signature, guard order and
record-before-MPC rule are unchanged except as noted in §5.9 and §5.17.

| Feature | New methods | New/changed views | New events | New error codes | New storage keys |
|---|---|---|---|---|---|
| **C1** history digest | — | `history_digest(token_id) -> Option<HistoryDigestView>` (SHA-256 over borsh-encoded immutable fields; measured 300 Tgas ceiling ≈ 3,000 small records or ≈ 2,000 1-KiB message records, §14 A-22) | — | — | — |
| **C2** USDC on EVM | — | `sig_records` detail gains `erc20{token,to,amount}` on a transfer (§5.9, §13) | `sign_requested.details[i]` gains `erc20` on a transfer | `ERR_EVM_DATA`, `ERR_EVM_TOKEN`, `ERR_EVM_VALUE` (reused/extended, §5.9) | — |
| **C3** 4 EVM testnets, per-chain nonces | — | `config()` gains `evm_chain_ids` (now 4), `erc20_tokens`; `max_evm_nonce(token_id, chain_id) -> Option<u64>` | — | `ERR_EVM_NONCE_GAP` now per chain (message unchanged in spirit) | `EvmNonces` (variant 17, last; after `StorageCredit`) |
| **C7** message signing | — | `sig_records` gains `evm_message`/`sol_message` detail tags; `config()` gains `max_message_bytes` | `sign_requested` for a message carries `kind` instead of `chain_id`/`nonce` | `ERR_MSG_EMPTY`, `ERR_MSG_TOO_LONG`, `ERR_MSG_ENCODING` | — |
| **C5** allowances | `set_allowance`, `revoke_allowance` | `allowances_of(token_id)`, `allowance(token_id, delegate)` | `allowance_set`, `allowance_revoked`, `allowances_cleared`, `allowance_spent` | `ERR_ALLOWANCE_DELEGATE`, `_CAPS`, `_EXPIRY`, `_LIMIT`, `_NOT_FOUND`, `_EXPIRED`, `_KIND`, `_ASSET`, `_EXCEEDED`, `_RATE`, `_BTC_ONE_INPUT` (AUDIT-01) | `Allowances` (variant 8, right after `Proceeds`) |
| **C6** inside assets | `deposit_near`, `withdraw_near`, `withdraw_ft`, `on_inside_withdraw` (private), `prepay_storage`, `withdraw_storage_credit` | `inside_of(token_id)`, `storage_credit_of(account_id)`, `market_config()`, `market_totals()` | `inside_deposit`, `inside_withdraw`, `inside_withdraw_resolved`, `storage_credit_withdrawn` | `ERR_AMOUNT`, `ERR_INSIDE_BALANCE`, `ERR_STORAGE_CREDIT` (reuses `ERR_TOKEN_NOT_FOUND`, `ERR_NOT_OWNER`, `ERR_DEPOSIT`, `ERR_LISTED`, `ERR_WRONG_TOKEN`, and `ERR_BAD_RECEIVER` for a `withdraw_near` / `withdraw_ft` receiver or a `prepay_storage` account that is the contract, the MPC or USDC, Q-03) | `Inside`, `InsideFt`, `StorageCredit` |
| **C4** offers | `make_offer`, `cancel_offer`, `accept_offer` | `offer(offer_id)`, `offers_for(token_id,…)`, `offers_by(account_id,…)` | `offer_made`, `offer_cancelled`, `offer_accepted` | `ERR_NO_OFFER`, `ERR_NOT_OFFERER`, `ERR_OFFER_EXPIRED`, `ERR_OFFER_EXPIRY`, `ERR_OFFER_STALE`, `ERR_TOO_MANY_OFFERS` (reuses `ERR_SELF_BUY`, `ERR_BAD_RECEIVER`, `ERR_QUIET_PERIOD`) | `Offers`, `OffersByToken`, `OffersByTokenLen`, `OffersByAccount`, `OffersByAccountLen` |
| **M-01 fix** (sprint review) solvency guard | — | `market_totals()` gains `proceeds_near` (Σ NEAR proceeds) and `escrow_near` (inside + NEAR offers + storage credit + NEAR proceeds) | — | `ERR_INSOLVENT` (`nft_transfer`, `buy`, `ft_on_transfer` buy, `accept_offer`) | — (one `u128` added to `MarketTotals` inside the existing `market` field) |

`ft_on_transfer` now dispatches three `msg` shapes (`buy` unchanged, plus `deposit` and `offer`, C4/C6 §1.2) instead
of one; `ERR_BAD_MSG`'s sentence names all three. Since Q-04 (2026-10-31) the parse is strict
(`deny_unknown_fields` on `FtMsg` and `OfferMsg`): an unknown field is `ERR_BAD_MSG` and the FT refunds 100 %. `StorageKey` order after this sprint, appended in merge order:
`…, Proceeds (7), Allowances (8), Inside (9), InsideFt (10), Offers (11), OffersByToken (12), OffersByTokenLen (13),
OffersByAccount (14), OffersByAccountLen (15), StorageCredit (16), EvmNonces (17)`. Numbers are the borsh variant
indices, i.e. the on-chain key prefixes; this is the order in `contracts/satchel/src/lib.rs` (verified 2026-10-29). `lib.rs` gains one post-transfer hook, `on_owner_change(token_id, reason)`,
called after every ownership change (`nft_transfer`, `buy`/`ft_on_transfer`, `accept_offer`); it clears allowances
(C5) and is the single place C4/C6 and C5 interact. `Contract` gains two fields: `allowances` (C5, opened on demand,
not a struct field — see C5.md §5) and `market: Market` (C4/C6, one field, C4-C6.md §8), so `new` is otherwise
unchanged. The `market` field changes the root layout, so a dev account deployed before C4/C6 (or before the M-01 fix,
which adds `MarketTotals.proceeds_near`) can't take this wasm in place: use a fresh `devN` (review I-08).

**M-01 solvency guard** (sprint review M-01; `docs/specs/C4-C6.md` §2.4). Since C4/C6 the contract balance also holds
user escrow, while NEP-171 transfers (exactly 1 yocto), buys (exactly the price) and accepts (exactly 1 yocto) still
leave a new holder's per-owner set (+150–250 B, the S-02 class) to the contract. `ensure_solvent(s0)` runs **last** in
`nft_transfer`, `execute_sale` (NEAR and USDC buy) and `accept_offer`, after the payout transfer is deducted: if the
call grew storage and `balance − storage_usage × byte_cost < escrow_near`, it panics `ERR_INSOLVENT` (the receipt rolls
back; a USDC buy is refunded 100 %). Calls that free storage never trip it. The contract's own NEAR (birth funding,
freed stake) stays the buffer for S-02 storage, never escrow; anyone refills it with a plain transfer. A caller-pays
design was rejected: wallets attach exactly 1 yocto to `nft_transfer` (NEP-171), and `buy` is bound to the exact price.

---

## 6. Invariants (deduplicated from kb/70 §Invariants and adapted to v1; each is a named test)

Test files live in `tests/tests/*.rs` (sandbox, near-workspaces 0.23.0 + mock signer) and `contracts/satchel/src/**/tests` (unit). TS tests (vitest) live in `apps/web` and `tools`. The mock signer records `(predecessor, path, payload_v2, domain_id, prepaid_gas, attached_deposit)`. It has modes `reply`, `never` (yield, then `fast_forward(250)`), `garbage` (non-JSON success value) and `panic` (kb/21 §Mock signer).
- kb/70's INV-04 and INV-20 (delegates) are dropped with S-10 (D-13).
- INV-10 (nonce-gap rule) was dropped by D-21 and is **restored** by D-43 (security review S-04): see the INV-10 row below and §5.9.
- INV-03 and INV-05 are restated for "no approvals / no transfer_call" (D-07).
- The IDs are kept stable so they can be cross-referenced with kb/70. INV-23 to INV-33 are new.

**Acceptance criteria S-13 to S-15** (new in v1; S-1 to S-12 are plan B3 as restated in this spec; R-36):

| ID | Criterion | Verified by |
|---|---|---|
| **S-13** Keyless and verifiable | `satchel.<team>.testnet` was born keyless. The four §5.16 proofs pass: birth tx without AddKey; `view_account` exists with no access keys; `is_any_signer` history empty; unfiltered history starts at the birth block. Its code hash equals the reproducible build at tag `contract-v1.0.0`, and `near contract verify` reports "the same" | SAT-035 (dev rehearsal), SAT-082 (rc), SAT-090 (final), SAT-120 (verify after public) |
| **S-14** Judge path | An AI fetch tool (e.g. WebFetch), not only `curl`, sees owner, all addresses, balances snapshot, status, `sig_count` and lock facts in the server HTML of `/s/1`, `/contract` and `/market`. `/api/satchels/1` and `/api/contract` return JSON. Every README command returns its stated output from a clean machine, re-checked daily Nov 14–19 by `tools/monitor.sh` | SAT-210, SAT-215 (WebFetch), SAT-251, SAT-252, SAT-102, SAT-103 |
| **S-15** Signing robustness | SigningProgress reaches the right state from chain state alone, across reloads, wallet timeouts and lost tx hashes. `signed_not_sent` offers "Broadcast again". A retry reuses the EVM nonce or BTC input set, so at most one signature per intent can ever be spent. The BTC builder never produces a txid referenced by an existing record | SAT-221, SAT-242, SAT-232 (INV-32), SAT-224 |

| ID | Property | Test (file::name) | S-criterion |
|---|---|---|---|
| INV-01 | Non-owner `sign_for` → `ERR_NOT_OWNER`; mock receives nothing; `sig_count` unchanged | `sign.rs::non_owner_rejected` | S-3 |
| INV-02 | After each ownership change (`nft_transfer`, `buy`, `ft_on_transfer`), the previous owner's `sign_for` fails and the new owner's succeeds | `transfer.rs::transfer_moves_control`, `sale.rs::buy_moves_control`, `usdc.rs::ft_buy_moves_control` | S-4 |
| INV-03 | NEP-178 is absent: `nft_token(id).approved_account_ids` is null/absent; `nft_approve` → MethodNotFound; a third party's `nft_transfer` → `ERR_NOT_OWNER` (the wrapper's check; behind it the standard would say "Approval extension is disabled", R-16) | `transfer.rs::no_approvals_surface` | S-5 (restated) |
| INV-05 | `nft_transfer_call` always fails `ERR_TRANSFER_CALL_DISABLED` and changes nothing | `transfer.rs::transfer_call_disabled` | — |
| INV-06 | The mock always sees `predecessor == contract`, `path == "satchel/{id}/{chain}"`, `domain_id` 0 for btc/evm and 1 for sol, deposit == `mpc_deposit` (default 1 yocto) | `sign.rs::mpc_request_shape_{evm,btc,sol}` | S-2 |
| INV-07 | The mock's payload equals `keccak256(tx)` (EVM), `sha256(sha256(preimage_i))` (BTC) and the message bytes (SOL), for every accepted vector in `vectors/*.json` | `sign.rs::payload_is_hash_of_preimage` + unit `parse::*::accepted_vectors` | S-3 |
| INV-08 | Each `sign_requested` event's preimages hash to its `payloads`, which equal what the mock received; `first_seq` == `sig_count` before the call | `sign.rs::event_matches_mpc_request` | S-9 |
| INV-09 | Every refusal vector is rejected with its error code, and a refused call changes nothing (no record, no event, no MPC call) | unit `parse::*::refusal_vectors` + `sign.rs::refusals_change_nothing` | — |
| INV-10 | **EVM nonce-gap rule** (restored, D-43; review S-04). `sign_for` refuses an EVM request with `ERR_EVM_NONCE_GAP` unless `nonce ≤ max_evm_nonce + 1`, or `nonce ≤ 1` when the token has no EVM record yet. The check runs after every stateless classifier rule and before any state change, so a refusal writes nothing. `max_evm_nonce` covers every EVM record whatever its status and survives transfers and sales. Code (`parse/evm.rs`): `check_nonce(nonce, max_signed)` errs when `nonce > max_allowed_nonce(max_signed)`; `sign.rs` then sets `max_evm_nonce = max(m, nonce)` | unit `security_tests::s04_far_future_evm_nonce_is_refused`, `fix_s04_nonce_gap_rule`, `fix_s04_first_evm_record_charges_the_nonce_slot`; sandbox `security.rs::fix_s04_nonce_gap_rule`; 10 `nonce_gap_*` vectors in `vectors/evm.json` (`state.evm_max_nonce`); TS `packages/core/test/policy.test.ts` | S-3 |
| INV-11 | `sig_count` grows by exactly n per accepted call and never shrinks; no method deletes a record or rewrites its safety fields (`detail`, `payload`, `height`, `requester`); records survive transfers and sales | `sign.rs::log_append_only`, `transfer.rs::records_survive_transfer` | S-9 |
| INV-12 | With the mock in `never`, `panic` or `garbage` mode the record persists. Status becomes `failed` (timeout via `fast_forward(250)`, panic) or `unparsed` (garbage); `on_signed` never panics; `sign_for` keeps working; `list` succeeds after the quiet period. Nothing gets stuck | `sign.rs::timeout_never_sticks` (**mandatory**), `sign.rs::garbage_response`, `sign.rs::mpc_panics` | S-6 |
| INV-13 | `list` fails `ERR_QUIET_PERIOD` while `h < last_sign_height + 250`, and succeeds at exactly `last_sign_height + 250`. While listed: `sign_for` → `ERR_FROZEN`; `nft_transfer` → `ERR_LISTED`; `list` → `ERR_ALREADY_LISTED` | `sale.rs::quiet_period_and_freeze` | S-6 (restated) |
| INV-14 | `buy` **succeeds immediately after `list`**, with no fast-forward (no cooldown). It fails on a wrong `listing_id` or `expected_sig_count` (`ERR_LISTING_CHANGED`), a wrong currency (`ERR_CURRENCY`), `attached ≠ price` (`ERR_WRONG_AMOUNT`) and self-buy (`ERR_SELF_BUY`). In each failure case state is unchanged and the deposit refunded. After delist + relist the old `listing_id` fails | `sale.rs::buy_guards`, `sale.rs::buy_right_after_list` | S-6, S-7 |
| INV-15 | A successful `buy` sets `owner == buyer` and `listing == None`, drops the token from `listings`, pays the seller exactly `price` (balance delta) and leaves the records untouched | `sale.rs::buy_happy_path` | S-7 |
| INV-16 | `ft_on_transfer` refunds the full amount and changes nothing in these cases (R-27): the predecessor ≠ `usdc` (direct call); the amount ≠ price; the msg is malformed; the token isn't listed; the listing changed; the listing is **NEAR-priced** (`ERR_CURRENCY`); the sender is the seller (`ERR_SELF_BUY`). On success it returns `"0"` unused, so the buyer's `ft_transfer_call` tx returns the full price as used | `usdc.rs::ft_guards`, `usdc.rs::direct_call_attack`, `usdc.rs::near_listing_refunds`, `usdc.rs::ft_self_buy` | S-8 |
| INV-17 | `sign_for`, `list`, `delist`, `withdraw_proceeds` with 0 deposit fail (function-call keys cannot attach deposits, kb/10 §TL;DR 12). `nft_transfer`, `delist` and `withdraw_proceeds` require **exactly** 1 yocto: any other deposit (e.g. 2 yocto, 0.1 NEAR) fails `ERR_DEPOSIT` and nothing is kept (review S-03) | `sign.rs::zero_deposit_rejected`, `sale.rs::zero_deposit_rejected`, `security.rs::fix_s03_exactly_one_yocto`, unit `fix_s03_delist_and_withdraw_require_exactly_one_yocto` | — |
| INV-18 | Storage is charged **exactly** (R-26): for every `sign_for`, `attached − refund == Δstorage_usage × storage_byte_cost + n × mpc_deposit`. The free-balance check alone could pass while storage is under-charged, because the MPC refunds excess deposit and the contract earns gas rewards. Same exactness for `nft_mint` and `list` (with n = 0) | `storage.rs::sign_for_charges_exactly`, `storage.rs::excess_refunded` | S-1 |
| INV-19 | With `SIGN_ATTACH_GAS(n)`, the mock observes `prepaid_gas ≥ 15 Tgas` per sign; `sign_for` with prepaid < `30 + 18·n` Tgas fails `ERR_GAS` before any state change | `gas.rs::floor_and_forwarding_{1,2,4,10}` | — |
| INV-21 | Token ids are `"1","2",…`, sequential, never reissued; no burn method exists | `nft.rs::ids_sequential_no_burn` | S-1 |
| INV-22 | Static check: the release wasm imports no `promise_batch_action_add_key*`, `promise_batch_action_deploy_contract*` or `promise_batch_action_delete_account` | `tools/check-wasm-imports.sh` in CI | S-13 |
| INV-23 | BTC: preimages of one call share the tx fields; `sha256d(outpoints) == hashPrevouts`, `sha256d(sequences) == hashSequence`, `sha256d(outputs) == hashOutputs`; one record per input with display-order txid | unit `parse::btc::*` + `sign.rs::btc_records_per_input` | S-9 |
| INV-24 | BTC fan-out: the mock receives n separate `sign` receipts (never a multi-action receipt); with k of n failing, `on_signed` sets per-index statuses and returns `null` at those indices | `sign.rs::btc_fanout_partial_failure` | S-3 |
| INV-25 | Payout failure: a NEAR sale to a deleted seller, or a USDC sale to an unregistered seller, still completes; `proceeds_of(seller)` shows the amount; `withdraw_proceeds` pays it once the seller can receive. The re-credit needs no contract-paid storage (the slot is reserved by `list`), so it lands even when the contract's free balance is ≈ 0 (S-01). `on_payout` with ≠ 1 promise results credits nothing (S-13) | `sale.rs::payout_failure_recredit`, `usdc.rs::unregistered_seller_recredit`, `security.rs::s01_failed_payout_is_never_orphaned_when_contract_balance_is_low`, unit `fix_s01_list_reserves_the_proceeds_slot_and_recredits_grow_no_storage`, `fix_s13_on_payout_needs_exactly_one_promise_result` | S-7, S-8 |
| INV-26 | `mpc_deposit` outside [1 yocto, 0.01 NEAR] → `ERR_MPC_DEPOSIT`; inside, the mock sees exactly that deposit per call | `sign.rs::mpc_deposit_bounds` | — |
| INV-27 | `config()` equals the compiled constants (quiet period `cooldown_blocks` = 250, chain ids, gas formula, accounts) | `views.rs::config_matches_constants` | — |
| INV-28 | `nft_transfer` while a sign is in flight succeeds (by design, D-08); the record remains and `on_signed` still resolves it after the transfer | `transfer.rs::transfer_during_inflight_sign` | — |
| INV-29 | `on_signed` overwrites only status/signature: storage usage is identical before and after it runs | `storage.rs::callback_no_growth` | — |
| INV-30 | `nft_mint` and `nft_transfer` to the contract itself, the MPC account or the configured USDC contract fail `ERR_BAD_RECEIVER` and change nothing (R-18, S-06, S-09); since Q-03 the same for `withdraw_near` / `withdraw_ft` receivers and `prepay_storage(account_id)` (unit `q03_caller_chosen_receivers_refuse_the_contract_mpc_and_usdc`, sandbox `round2.rs::q03_*`); with `usdc: None` that id is an ordinary receiver. NEP-181 `nft_tokens` / `nft_tokens_for_owner` return at most 50 tokens, and 50 when `limit` is missing (S-05) | `transfer.rs::bad_receivers`, `security.rs::fix_s06_s09_receiver_guard`, `security.rs::fix_s05_nep181_views_are_paged`, unit `fix_s06_s09_receiver_guard_in_mint_and_transfer`, `fix_s09_usdc_is_ordinary_when_usdc_is_disabled`, `fix_s05_nep181_paging_still_works_below_the_cap` | S-4 |
| INV-31 | **Keyless birth** (sandbox, near-workspaces batch API). One tx from a parent with CreateAccount + Transfer + DeployContract + `new` + `nft_mint` ×7 and no AddKey yields: `view_access_key_list == []`; tokens 1–7 owned by the receiver; a second `new` fails. A batch with a failing action leaves **no account** (R-04) | `release.rs::keyless_birth_batch`, `release.rs::failed_birth_leaves_nothing` | S-13 |
| INV-32 | (TS) The BTC builder never returns a tx whose txid appears among the txids referenced by the sending token's records, or by the receiving Satchel's records when paying another Satchel. On a collision it perturbs (fee +1 sat, or nSequence `fffffffd`↔`fffffffe`) and re-checks; output order is randomized by default (R-05) | `apps/web/src/lib/chains/btc/builder.test.ts::avoids_logged_txids` | S-15 |
| INV-33 | (TS) Gate mode: with `CONTRACT_ROLE=dev`, lock or code-hash failures yield a visible warning while every other check still gates Buy; with `rc`/`final` they yield `unsafe` (R-06) | `apps/web/src/lib/clean-history/gate.test.ts` (as built: `packages/core/test/gate.test.ts`) | S-9 |

---

### 6.1 Sprint invariants (sprint 2026-10-29; full test lists live in the spec files)

| ID | Property | Ref |
|---|---|---|
| INV-34 | A delegate's `sign_for` is authorized only by a live, unexpired allowance from the **current** owner; message requests (C7) and non-USDC EVM calldata are refused for delegates with `ERR_ALLOWANCE_KIND` whatever the classifier accepts for an owner; a delegate's BTC request has exactly one input (`ERR_ALLOWANCE_BTC_ONE_INPUT`, AUDIT-01), so its stated fee is its real fee; a debit never exceeds the rolling-24h cap for its asset (checked u128; overflow refuses, never wraps) | `docs/specs/C5.md` §2–§4 |
| INV-35 | Every ownership change (`nft_transfer`, `buy`/`ft_on_transfer`, `accept_offer`) clears **all** allowances of the token in the same receipt via `on_owner_change`, atomically with C4/C6's own transfer effects | C5.md §4 "Reset rule"; C4-C6.md §8 |
| INV-36 (= **I-M1**…**I-M8** of C4/C6, listed in full in that spec) | NEAR/FT solvency (`market_totals()` matches the sums of inside balances, open offers, storage credit and NEAR proceeds, bounded by the contract's real balances; enforced on-chain by `ensure_solvent` on every path whose storage the contract pays, M-01), debit-first withdrawals, exactly-once offer escrow, no callback-storage growth, offer bindings to `(sig_count, inside_epoch)`, and inside balances following the token through every ownership path | `docs/specs/C4-C6.md` §7 |
| INV-37 | A message signature (`evm_message`/`sol_message`, C7) is never a valid encoding of a transaction, a 7702 authorization, an EIP-712 digest or a Solana transaction message on any of the three chains, so it can never move funds or satisfy a token/NFT authorization by itself ("never a transaction") | `docs/specs/C1-C2-C3-C7.md` §3.4 |
| INV-38 | The EVM nonce-gap rule (INV-10) holds independently **per `chain_id`**: a poison nonce on one chain never blocks signing on another | `docs/specs/C1-C2-C3-C7.md` §3.1 rule 11, §3.2 |

---

## 7. Clean-history protocol

### 7.1 What is logged (on-chain, at request time, append-only)

- **State, per signature (`SigRecord`, §5.3):**
  - chain, `request_id`, `input_index`, height, timestamp, requester, payload hash
  - EVM `chain_id` + `nonce` + the full unsigned tx
  - BTC outpoint `txid:vout` + amount
  - SOL `recent_blockhash` + lamports
  - status and signature (UX)
- **State, per token:** `sig_count` (completeness anchor: the checker must read seq `0..sig_count`) and `last_sign_height`.
- **Event `sign_requested`:** every preimage, the BTC outputs and the payloads. Together with the signature from state (or from the MPC receipt), **anyone can rebuild and broadcast any logged signature** (kb/70 §P1 Re-broadcast), which is what makes "Settle"/"Broadcast now" possible from any device.
- **Product rule:** signing counts as sending. The record is "issued" from the moment `sign_for` succeeds, whatever the MPC later does (kb/70 F16).

### 7.2 When a record is dead (it can never move funds again)

| Chain | Item status rule (evaluate in this order) | Queries | Ref |
|---|---|---|---|
| EVM | `spent` if `eth_getTransactionCount(addr, tag = toHex(blockNumber − 3)) > nonce`; `settling` if only the `latest` count is `> nonce`; else `unused` | `eth_chainId == 11155111` guard, then two counts per address (`latest`, `latest − 3`) on **two** providers that must agree. O(1) per address, however many records exist | kb/70 §P2; kb/31 §Nonces |
| BTC (per distinct txid) | **One** `GET /tx/:txid/outspends` per distinct txid referenced by the records, deduplicated (R-20):<br>• **404** ⇒ every outpoint of that txid is **`unfunded`**;<br>• `vout ≥ array length` ⇒ `unfunded`;<br>• `spent:false` ⇒ `unused`;<br>• spent but unconfirmed ⇒ `settling` (full-RBF can replace it, kb/70 F26);<br>• confirmed with `tip − block_height + 1 ≥ K` ⇒ `spent`.<br>Tip comes from one `GET /blocks/tip/height` | mempool.space testnet4 + mempool.emzy.de testnet4 (both serve `/outspends`), which must agree; a third Esplora instance if one is found (A-07). Genesis guard `GET /block-height/0 == 00000000da84…f043`. Never trust `/outspend/:v` alone: it says `spent:false` for unknown txids | kb/30 §1, §7, §TL;DR 12 |
| BTC (foreign prevout, per input; review S-07) | When an input would be `unused` or `settling`, read the prevout's `scriptpubkey` with one `GET /tx/:txid` per such txid. If it is none of P2WPKH(pkh) `0014{pkh}`, P2SH-P2WPKH(pkh) and P2WSH(`76a914{pkh}88ac`), where pkh = hash160(the token's derived BTC pubkey), the input is **`foreign`**: the coin exists but is not at this Satchel's address, so the signature can never move the coins being bought. A provider that cannot answer `/tx` (or answers an unreadable shape) leaves the verdict as it was (fail closed). Both providers must agree, as for `/outspends` | the same two Esplora providers | contract-review S-07 |
| BTC (per request) | The contract enforced completeness + SIGHASH_ALL, so: if **any** input of the request is `spent` ⇒ every record of that request is `spent` ("tx conflict"); else if any is `unused` ⇒ `unused`; else if any is `unknown` ⇒ `unknown`; else if any is `settling` ⇒ `settling`; else if any is `foreign` ⇒ `foreign`; else `unfunded` | — | kb/30 §7 ("any input spent ⇒ dead") |
| SOL | `expired` if the record is **≥ 120 s old** and **at least one** provider reports `isBlockhashValid(recent_blockhash, {commitment: "processed"}) == false`. Dead by construction otherwise (durable nonces refused, quiet period ≥ 138 s), so one provider suffices (R-19). Else `unused`. `expired` is permanent and cached. Optional: `getSignatureStatuses([sig], {searchTransactionHistory: true})` shows "landed" | devnet RPC (a second one if available, A-06), one query per distinct blockhash | kb/32 §TL;DR 3; kb/70 §P2 |
| any | `unknown` when providers **disagree**, all of them error, or the chain is unsupported. If one of two BTC/EVM providers is **down** (errors, not disagreement), the testnet policy H-25 applies: the verdict comes from the remaining provider and is labelled "1 of 2 sources" | — | kb/70 §P3; R-19 |

**EVM, per chain (C3; sprint 2026-10-29).** The checker groups EVM transaction records by `detail.evm.chain_id`
and runs the EVM row above **separately for each chain**, on that chain's own two providers (§8.1 of
`docs/specs/C1-C2-C3-C7.md` lists the RPCs). `eth_getCode(address) == "0x"` (the account-level check below) is
checked on Sepolia always and on every other chain that has records. A supported chain id with no configured
providers, or with both down, gives `unknown`; a `chain_id` outside the four of §2 of that spec gives `unknown` /
`chain_unsupported`. USDC transfer records (C2) follow the same nonce rule as a native transfer; the item report
additionally carries `erc20 {token, to, amount}`.

**Message records, item status `message` (C7; sprint 2026-10-29).** A record whose detail is `evm_message` or
`sol_message` gets a new item status, **`message`** (reason `message_signature`), which is **never blocking**: the
aggregate in §7.3 is `clean` when every item is `spent`, `expired`, `unfunded`, `foreign` **or** `message` (INV-37:
a message can never move the coins a buyer is checking). The item report carries `message_kind` and the decoded
`message_text`, so the Buy tab can list it ("Signed a message: '…'. Messages can't move coins."). A record whose
payload doesn't match its message (`keccak256(eip191(m))` / `sha256(offchain(m))`) is `unknown` / `record_inconsistent`
(fail closed; can't happen with a correct NEAR source). A pre-C7 checker treats these details as unparseable and
returns `unknown` — old app builds fail closed, they never show a false `clean`.

**Account-level checks** (defense in depth against standing authorizations, kb/70 §TL;DR 6):
- EVM: `eth_getCode(addr) == "0x"` (the EIP-7702 marker is `0xef0100…`, kb/70 F20).
- SOL: the account is absent, or its owner is `11111111111111111111111111111111` with empty data.
- Failing either makes the token **`unsafe`** in every gate mode.

**Contract-level checks** (their effect depends on the gate mode, §7.3):
- `view_account(contract)` succeeds **and** `view_access_key_list(contract).keys == []`. An empty key list alone proves nothing, because unknown accounts return `[]` too (kb/00 §Gotchas 10).
- `code_hash` == the published reproducible hash (`NEXT_PUBLIC_EXPECTED_CODE_HASH`).
- The MPC `derived_public_key(path, predecessor = contract, domain)` matches the addresses shown (kb/70 F19).

### 7.3 Statuses, gate modes and the Buy gate

| Item status | UI label (kb/80 copy) | Blocks Buy? |
|---|---|---|
| `spent` | Settled ("Nonce {n} used", "Spent in {txid}", "All {n} inputs spent") | no |
| `expired` | Expired ("Blockhash expired. It can't be used.") | no |
| `unfunded` | **Unfunded** ("Spends coins that don't exist. If they ever appear at this address, the previous owner could move them; they're excluded from what you buy.") | **no** (D-04) |
| `foreign` | **Foreign** ("Points at a coin this Satchel can't spend. It can't move the coins you're buying.", copy key `clean.item.foreignBody`) | **no** (review S-07) |
| `message` **(sprint 2026-10-29, C7)** | Message ("Signed a message: '{text}'. Messages can't move coins.") | **no** (INV-37) |
| `settling` | Settling ("Waiting for {k} more confirmation(s)") | yes |
| `unused` | Unused ("Nonce {n} not used yet" / "{txid}:{vout} unspent" / "Blockhash still valid") | yes |
| `unknown` | Can't verify | yes |

**Gate modes** (`NEXT_PUBLIC_CONTRACT_ROLE`; R-06). rc is born keyless with the final wasm, so it runs the real gate, code-hash check included.

| Role | Lock or code-hash failure | Every other check | Banner (none since E-55) |
|---|---|---|---|
| `dev` | visible warning "DEV CONTRACT: lock and code checks skipped" | gates Buy | "DEV CONTRACT" |
| `rc` | `unsafe` (Buy disabled) | gates Buy | "RELEASE CANDIDATE: testnet rehearsal" |
| `final` | `unsafe` (Buy disabled) | gates Buy | none |

| Aggregate | Condition | Buy |
|---|---|---|
| `empty` | `sig_count == 0` and accounts ok | enabled |
| `unsafe` | any account check fails; or (roles `rc`/`final`) the contract has keys, doesn't exist, or its code hash mismatches | **disabled** |
| `unknown` | any item `unknown` | disabled |
| `blocked` | any item `unused` | disabled |
| `settling` | any item `settling` | disabled |
| `clean` | every item `spent`, `expired`, `unfunded`, `foreign` **or `message` (sprint 2026-10-29, C7)** | enabled; `buy` is called with `(listing_id, expected_sig_count = sig_count read in step 1)`. Shown as "clean (1 of 2 sources)" when policy H-25 applied |

**"Verified balance"** (what the buyer pays for):
- BTC: confirmed UTXOs at policy depth, **excluding any UTXO whose outpoint is referenced by a non-dead record** ("encumbered", shown separately).
- EVM and SOL: balances at the policy tag.
- Unconfirmed deposits never count, because they can be double-spent (kb/70 §Threat s).
- **Amounts shown for BTC records come from the chain** (the UTXO set or the prevout). The `amount_sats` stored in a record is copied from the seller's preimage and never verified, so it is labelled "claimed" (R-23).

### 7.4 Confirmation policy (testnet; human confirms the defaults, H-12)

| Chain | Testnet v1 | Mainnet (Phase 3) | Why |
|---|---|---|---|
| EVM Sepolia | `latest − 3` blocks (≈ 36 s) | `finalized` | Sepolia `finalized` lags ≈ 18 min (kb/70 F20) |
| BTC testnet4 | K = 1 (**disclosed weakness**: a two-block difficulty-1 fork can reorg it, T11; R-17) | K = 6 | testnet4 real blocks: median gap 2 h, max 21 h (kb/30 §TL;DR 7); anyone can mine difficulty-1 blocks (kb/30 §Gotchas) |
| SOL devnet | age ≥ 120 s + one provider says the blockhash is invalid | same | blockhash life ≈ 36 s measured (kb/32 §Timing); durable nonces refused |

The quiet period (250 blocks ≈ 140 s) means every SOL record is already older than 120 s at listing time.

### 7.5 Where the checker runs, providers, limits

`apps/web/src/lib/clean-history/` is isomorphic (browser and Node; **owner S2**, SAT-072). As built, this module lives in `packages/core/src/clean-history/` (`@satchel/core`). It runs in three places:
1. **In the buyer's browser**, on the Buy tab: every 10 s, and again synchronously right before the Buy button sends the tx.
2. **On the server**, in `GET /api/clean-history/[id]` and in the blocking SSR of `/s/[id]/sale` and `/market` (cached 15 s). This is a hint only, so AI judges can read the verdict in HTML.
3. **In `tools/e2e/clean-history.ts`**, the scripted rc scenario (SAT-085, R-09).

Only the browser result enables Buy (kb/70 §Threat u).

| Need | Primary | Second | Notes |
|---|---|---|---|
| NEAR `sig_records`, `satchel`, account, keys, code hash | FastNEAR RPC `rpc.testnet.fastnear.com` (server: `Authorization: Bearer FASTNEAR_API_KEY`) | dRPC `near-testnet.drpc.org` (must agree; views are fine within its ≈ 2 s cut) | finality `final`; lags 1–3 s after a tx (kb/10 §Gotchas) |
| MPC `derived_public_key` | same | same | the `predecessor` arg is mandatory in views (kb/10 §TL;DR 12) |
| BTC outspends / tip / UTXOs | `mempool.space/testnet4/api` | `mempool.emzy.de/testnet4/api` (no `/address/*`, so UTXOs come from the primary only); third instance [ASSUMED, A-07] | browser: simple GETs only (preflight 404s, kb/30 §TL;DR 6); **never** `testnet4.mempool.space` (mainnet) |
| EVM nonce / code | `ethereum-sepolia-rpc.publicnode.com` | `rpc.sepolia.ethpandaops.io` (0xrpc, tenderly tertiary; `sepolia.drpc.org` dropped 2026-10-27: free plan no longer serves Sepolia) | viem `fallback` does not fall through on deterministic errors (kb/31 §viem client) |
| SOL blockhash / account | `api.devnet.solana.com` | optional (A-06) | one provider suffices with the age rule (R-19) |

**Limits** (R-20; the rev-1 200-record cap is removed):
- Calls per check = 2 NEAR views + 2 EVM counts per provider + (1 + distinct BTC txids) per BTC provider + one `GET /tx/:txid` per provider for each distinct txid that still has an `unused`/`settling` input (the S-07 foreign check) + distinct young SOL blockhashes.
- A soft cap of **100 distinct BTC txids** per run applies. Beyond it the BTC items are `unknown` ("too many coins to verify in the browser; ask the seller to consolidate").
- Statuses that are **finally** dead (EVM below `latest − 3`, BTC at depth ≥ K, SOL expired) are cached permanently in `localStorage` and in the server cache. Everything else is re-queried (kb/70 §P3).

### 7.6 Seller guidance ("How to settle", shown in the Sell tab's pre-list check)

| Chain | Settle action | Time |
|---|---|---|
| EVM | **Broadcast now**: rebuild from the record's `unsigned_tx` + signature, **only if** `record.nonce == pending nonce count`. Otherwise show "Can't be broadcast yet: nonce {n} waits for nonce {count}", because a future-nonce tx would sit in the queue and be dropped after ≈ 3 h (kb/31 §Nonces). The alternative is to send any tx from the Satchel that consumes nonce {n}. Every nonce up to the maximum must be used, which may take several txs (kb/70 §P6) | ≈ 36 s (3 confirmations) |
| BTC | **Broadcast now**: rebuild from the event's preimages + outputs + signatures + derived pubkey. Or sweep the logged inputs to the Satchel's own address in one tx (built by the collision-checked builder, §8.2), then wait for 1 confirmation | minutes to hours on testnet4: settle **before** listing |
| SOL | Nothing; wait | ≈ 2 min |

Demo token #4 is deliberately un-settleable (R-13):
- Its only record is an EVM tx with **nonce = current + 1**. It can never be mined while nonce `current` is unused, and only the Satchel key (via `sign_for` by the owner) could use that nonce. The record therefore stays `unused` forever, even though anyone can "Broadcast now".
- Its owner must never send from #4. The README explains this.

### 7.7 The badge's exact promise and the README disclosure

**Badge (Hallmark "CLEAN HISTORY") tooltip:** "Every signature this Satchel has issued is recorded on-chain. Your browser just checked each one against Bitcoin testnet4, Solana devnet and the four Ethereum testnets: none can still move the coins you are buying." (Wording updated 2026-11-03 for C3's three L2 testnets, which the check also reads; D-51.)

**README disclosure (final text; fill in the placeholders on Day 10):**

> **Clean history: what it checks and what it trusts.**
>
> **What signs.** A Satchel's keys can sign only through `sign_for` on `satchel.<team>.testnet`.
> - That account was **born without a key**. One transaction (`<birth tx>`, block `<A>`) created it, deployed the published code, initialized it and minted Satchels #1–#7. The transaction contains no AddKey action.
> - It still has no access keys (`near account view-account-summary satchel.<team>.testnet network-config testnet-fastnear now` shows "Account is locked (no access keys)").
> - It has never signed a transaction, including delegated ones (`curl … tx.test.fastnear.com/v0/account '{"account_id":"satchel.<team>.testnet","is_any_signer":true}'` returns nothing).
> - Its history starts at the birth transaction.
> - It runs the published code: SHA-256 `<H>`, reproducible with `cargo near build reproducible-wasm` at tag `contract-v1.0.0`. Compare with `shasum -a 256` on macOS or `sha256sum` on Linux.
>
> **What gets recorded.** Before NEAR's MPC network signs anything, `sign_for` records on-chain exactly what is being signed:
> - the Ethereum chain and nonce;
> - the Bitcoin coin (outpoint) being spent;
> - the Solana blockhash;
> - the full text of a signed message.
>
> It accepts only plain ETH and USDC transfers on four Ethereum testnets, standard Bitcoin spends, plain SOL transfers and plain-text messages (EIP-191 and Solana off-chain). It refuses everything else: raw hashes, EIP-712 permits, EIP-7702 authorizations, any other contract call, other chains, Bitcoin sighash types other than ALL, and Solana durable nonces.
>
> **What "Clean history" means.** Your browser read every record and found that none can still move funds:
> - Ethereum: the nonce was used (3 confirmations on Sepolia).
> - Bitcoin: the coin was spent in a confirmed transaction, or the coin never existed (such coins are excluded from the balance you buy).
> - Solana: the blockhash expired.
>
> It also checked that the Ethereum address has no delegated code and that the Solana account is a plain wallet.
>
> **What it trusts.**
> - The contract does **not** enforce this check (it cannot see other chains); the app disables Buy until it passes.
> - It trusts NEAR's MPC network: a threshold of its nodes could sign anything, and on testnet the MPC contract account itself has full-access keys.
> - It trusts the data providers it queries (two per chain for Bitcoin and Ethereum; the UI says when only one answered) and the confirmation depth used.
>
> **What it does not cover.**
> - Other chains or addresses, and tokens other than USDC.
> - Signatures made after you buy.
> - Testnet4 reorgs: one confirmation on testnet4 can be undone by anyone mining two difficulty-1 blocks.
> - Coins that another wallet later sends to an outpoint an old signature already spends: the app marks them "encumbered". Satchel's own sends cannot create such outpoints, because the app refuses to build any transaction whose id an old record already references.

---

## 8. Frontend architecture (`apps/web`, Next.js 16.4.2)

### 8.1 Routes, rendering mode and what an AI judge sees

AI judges see only server HTML: client-rendered pages come back as an empty shell and X posts return 402 (kb/00 §TL;DR 10). Under `cacheComponents`, an uncached RPC read outside `<Suspense>` fails `next build`. The build error offers two ways out: "[stream] Provide a placeholder with `<Suspense fallback={...}>`" or "[block] Set `export const instant = false` to allow a blocking route" (kb/41 §Next 16 changes; spike/web §3).

**Judge facts are never streamed** (R-07). With Suspense, the resolved data arrives at the end of the document inside hidden React segments (`<div hidden id="S:…">` plus a `$RC` script), while the visible slot holds the fallback. Readability-style extractors drop `hidden` nodes, so an AI fetch tool may see only the skeleton. The spike checked only `curl`, which sees both (erratum E-40).

Rules for the judge routes `/s/[id]`, `/s/[id]/sale`, `/contract` and `/market`:
1. **Blocking render.** The route exports `instant = false` [ASSUMED semantics, A-18]. Every read goes through a `"use cache"` function with `cacheLife({revalidate: 15})` (60 s for `/contract`). There is **no** `<Suspense>` boundary above the facts block.
2. **Prerendered demo ids.** `generateStaticParams()` returns `"1"`…`"7"`, so the demo tokens are in the build output and only revalidate afterwards.
3. **Bounded upstreams.** Each upstream has a 1.5 s timeout. A failed read renders the last cached value with "read {t} ago" (or "unavailable"), so the page never hangs.
4. **Fallback** if (1) does not render blocking on Day 2: keep (2), and render the facts of other ids from the cached `/api/satchels/[id]` snapshot outside Suspense.
5. **Acceptance** (SAT-210, SAT-215, SAT-252): an AI fetch tool (WebFetch), not only `curl`, shows owner, full addresses, status, `sig_count` and lock facts on `/s/1`, `/contract` and `/market`. It is checked on a preview deploy on Days 2–3 and again on Day 12. `tools/monitor.sh` repeats it daily Nov 14–19 as a no-JS fetch plus a check that no fact sits inside a `hidden` element.

| Route | Purpose | Phase | Render | In the server HTML (no JS) |
|---|---|---|---|---|
| `/` | Landing (featured Satchel #1, How it works, proof strip); "My Satchels" when connected | P1 | SSR landing; owned list in a client island (`nft_tokens_for_owner`, at most 50 per page, §5.14) | H1, the featured card's facts, links |
| `/s/[id]` | Wallet tab (default) | P1 | **blocking SSR** facts (ids 1–7 prerendered) + client refresh (TanStack Query, 15 s) | `<title>`, meta description, H1 "This NFT is a wallet.", owner, status, BTC/EVM(/SOL) **full** addresses, balance snapshot ("read {t} ago"), `sig_count`, last signature + explorer link, lock facts, a `<dl>` Facts block (kb/80 §Judge-first view) |
| `/s/[id]/activity` | Timeline | P1 | SSR first page + client | NEAR events + chain txs with explorer links |
| `/s/[id]/send?chain=btc\|evm\|sol` | Send | P1 (BTC, ETH, and SOL since D-46) | client (full page; mobile layout looks like a sheet) | guard text only |
| `/s/[id]/transfer` | Gift / transfer + handoff | P1 | client | — |
| `/s/[id]/receive?chain=` | Fund: QR, full address, faucet links (+ a client-only "Incoming" island, kb/80 R2) | P1 | SSR | addresses |
| `/s/[id]/sale` | Sell (owner) / Buy (visitor) | P2 | blocking SSR listing + cached clean-history verdict (a hint); the client checker gates Buy | listing, price, `listing_id`, `sig_count`, clean-history aggregate + items |
| `/market` | Listed Satchels | P2 | blocking SSR + client | listings with verdicts |
| `/mint` | Mint | P1 | client | — |
| `/contract` | Keyless and verification facts | P1 | blocking SSR (cached 60 s) | contract id, role, SHA-256 code hash vs expected, "Account is locked (no access keys)", birth tx + block A, signer-tx count (0), oldest tx = birth, MPC version, `config()`, copy-paste verify commands (§5.16 proofs) |
| `app/opengraph-image.png` (+ `twitter-image.png`) | Site-wide link preview = the brand's `og-image.png` (1200 × 630); the per-Satchel generated card is dropped (D-36, B-09) | P1 | static file convention | — |
| `/api/*` | §9 | — | route handlers | JSON / SVG |
| ~~`/s/[id]/access`~~ | Delegates | **cut** (D-13) | — | — |

Tabs are links, with `aria-current` rather than an ARIA tablist (kb/80 §IA). Send, Transfer and Receive (and the Sell and Mint flows) are **real routes in v1**, **presented** as a bottom sheet below 768 px and a centred 480 px dialog from 768 px over the Satchel page that the route renders itself. There are no intercepting routes; the routes deep-link from the README and avoid modal resume bugs (kb/80 R3; D-26 as amended by D-36; H-19 closed). Flow routes are not judge routes, and no judge fact lives only in a flow's inert background.

### 8.2 Module layout

```
apps/web/src/
  app/                       routes above; app/layout.tsx is a Server Component that renders <Providers> (client)
  components/                SatchelCard, ChainRow, AddressDisplay, ReviewCard, SigningProgress, Timeline, HandoffAnimation,
                             FreezeBanner, CleanHistory, ProofChip, StatusPill, FlowShell, NavShell, … (kb/80 R3 §Components)
  lib/config.ts              env parsing (zod), NETWORK, SATCHEL_CONTRACT, CONTRACT_ROLE, MPC, USDC, EXPECTED_CODE_HASH, provider lists
  lib/near/constants.ts      gas/deposit formulas mirrored from §5.5 (+ a test that compares them with config())
  lib/near/rpc.ts            FailoverRpcProvider([FastNEAR, dRPC]) with retries 2 / wait 250 / backoff 2; server variant adds the API key
  lib/near/wallet.tsx        WalletProvider: ONE NearConnector singleton (network 'testnet', footerBranding null, no features filter)
  lib/near/contract.ts       typed views (config, satchel, sig_records, listings, proceeds_of, nft_*) and call builders (args, gas, deposit)
  lib/near/track-tx.ts       long-poll `tx` EXECUTED_OPTIMISTIC; classify 408/UNKNOWN/429/5xx; rotate providers (kb/40 §Tested tracker)
  lib/near/history.ts        FastNEAR tx API (/v0/account, /v0/transactions ≤ 20): Activity, /contract proofs, BTC rebuild by height
  lib/near/outcome.ts        decode SuccessValue (array of MPC JSON); fallback: scan receipts_outcome of v1.signer-prod.testnet,
                             assigning each signature to the payload it verifies against
  lib/derive/                own derivation (noble/scure + viem publicKeyToAddress); roots for testnet+mainnet; vectors test (§12.1);
                             address → token index for ids 1..nft_total_supply (lets the BTC builder recognise Satchel recipients)
  lib/chains/evm/            viem client (4-endpoint fallback, rank on, 4 s timeouts); build unsigned type-2 tx; attach (yParity = recovery_id);
                             verify recoverTransactionAddress; broadcast; receipt polling; Blockscout history
  lib/chains/btc/            mempool client (primary + emzy fallback, text/plain POST, genesis guard); largest-first selection;
                             vsize/fee/dust; PSBT (bitcoinjs-lib 7); BIP143 preimages + outputs serializer; attach; strict low-S verify; broadcast;
                             txid collision check + random output order (R-05, INV-32)
  lib/chains/sol/            (on by default, D-46) Connection(devnet); legacy transfer message; rent/fee rules; attach + ed25519 verify; expiry handling
  lib/signing/               pending-intent store (localStorage `satchel:pending:v1`, useSyncExternalStore), contract watcher,
                             state machine (§8.6), resume-on-load, retry policy (§8.7)
  lib/clean-history/         isomorphic checker (§7; owner S2, SAT-072): provider agreement + "1 of 2 sources" policy, gate modes
                             by CONTRACT_ROLE, aggregate, cache of final verdicts
  lib/card/                  the brand card's per-token leather hue (fnv1a32 offset −12…+12°, kb/81 R3) shared by CSS and the /api/card SVG
  lib/theme.ts               theme override storage (`satchel:theme:v1`) and the inline head-script source (§8.10)
  lib/format.ts, lib/copy.ts formatting rules and the copy deck (kb/80 §Copy deck), keyed for the design lead
  instrumentation-client.ts  only if a dependency needs globalThis.Buffer (kb/41 §Polyfills)
```

Rules:
- **chainsig.js is not a dependency** (D-03). Derivation is ≈ 29 KB gzip instead of 2 MB (kb/11 §Browser/bundler).
- Chain libraries load lazily, per route, through dynamic `import()` in the Send flow.
- The signing store lives at module level, outside React effects, because Next 16 `<Activity>` cleans up the effects of hidden routes (kb/41 §Next 16 changes).
- **BTC builder collision rule** (R-05; threat T12). During Review, before any signature is requested, compute the candidate txid.
  - Check it against every txid referenced by the sending token's records, and by the recipient token's records when the recipient address belongs to a Satchel (`lib/derive` index).
  - On a match, perturb and re-check: fee +1 sat (up to 3 tries), then flip nSequence `fffffffd` ↔ `fffffffe`. Both stay inside the contract's policy (§5.9). Output order is randomized by default.
  - If no candidate is free, refuse with "Can't build a safe transaction. Try a different amount."
  - Why: segwit txids exclude witnesses and the builder is otherwise deterministic, so a previous owner could pre-sign a spend of a predicted change outpoint. That outpoint shows as `unfunded` (non-blocking) at sale time.

### 8.3 Provider configuration (one file: `lib/config.ts`; the server and the browser use the same lists)

| Purpose | Primary | Fallbacks | Rules |
|---|---|---|---|
| NEAR views | `https://rpc.testnet.fastnear.com` (server: `Authorization: Bearer $FASTNEAR_API_KEY`) | `https://near-testnet.drpc.org` | **never** `rpc.testnet.near.org` (deprecated, 429, +3 s; kb/41 §RPC providers); CI greps for it |
| NEAR tx tracking | FastNEAR `tx` long-poll (holds 10–30 s, then 408 with the pending status) | dRPC (`tx`, `EXPERIMENTAL_tx_status`; cuts requests at ≈ 2 s; no `broadcast_tx_commit`, no `tx_status`) | treat 408 / UNKNOWN_TRANSACTION / 429 / 5xx / "Failed to fetch" as "ask again" (kb/40 §TL;DR 7) |
| NEAR history, events and **tx proofs** | `https://tx.test.fastnear.com` `/v0/account`, `/v0/transactions` (≤ 20 hashes) | — (Activity degrades to on-chain views) | keyless today; key on the server (kb/50 §TL;DR 2). **The canonical proof for every NEAR tx** in the README and on `/contract` (D-10, R-08). Never cite plain RPC `tx` for a tx older than a day: non-archival nodes keep ≈ 32–40 h (kb/50 §TL;DR 4, §Gotchas 8), and the archival endpoint answered 429 from a shared IP (kb/00 §Testnet RPC endpoints) |
| BTC testnet4 | `https://mempool.space/testnet4/api` | `https://mempool.emzy.de/testnet4/api` (no `/address/*`) | browser: simple requests only; `POST /tx` body = raw hex string (text/plain); one `/tx/:txid/outspends` per distinct txid (404 ⇒ unknown txid), never `/outspend/:v` alone (kb/30 §TL;DR 6, 12). No third testnet4 Esplora is known: Blockstream has none and `testnet4.mempool.space` is mainnet (kb/30 §TL;DR 6; A-07) |
| EVM Sepolia | publicnode → drpc → ethpandaops → 0xrpc (viem `fallback`, `rank: {interval: 30_000, sampleCount: 5, timeout: 2_000}`, `retryCount: 1`, 4 s timeouts) | — | never viem's default thirdweb URL, tenderly public or 1rpc as primary (kb/31 §TL;DR) |
| EVM history | Blockscout API v2 (keyless, CORS `*`) | — | Etherscan v2 needs a key: not used |
| SOL devnet | `https://api.devnet.solana.com` | [ASSUMED] second RPC (A-06); not required by the checker (age rule, §7.2) | `getSignaturesForAddress` method limit 10 per window: cache it (kb/50 §Gotchas 9) |
| ~~Prices~~ | **cut in rev 2** (frees S2 buffer; review §6.4 #3); **reopened by UX-1** (E-47): 1Click `/v0/tokens` → CoinGecko if its default stands on Oct 31 | — | v1 shows no USD except, under E-47, the labelled card total |

Explorer links:
- NEAR: `https://testnet.nearblocks.io/txns/<hash>` as a **link only**. The proof next to it is the FastNEAR `/v0/transactions` command, and `docs/evidence/*.json` holds the offline copy (D-10, R-08).
- BTC: `https://mempool.space/testnet4/tx/<txid>`
- EVM: `https://sepolia.etherscan.io/tx/<hash>`
- SOL: `https://explorer.solana.com/tx/<sig>?cluster=devnet`

### 8.4 Environment variables (`.env.example` lists every key; no values are committed)

| Var | Scope | Example / note |
|---|---|---|
| `NEXT_PUBLIC_NETWORK` | public | `testnet` |
| `NEXT_PUBLIC_SATCHEL_CONTRACT` | public | `devN.<team>.testnet` until Day 9, `rc.<team>.testnet` for the Day-9 rehearsal build, then `satchel.<team>.testnet` from Day 10 (redeploy the frontend) |
| `NEXT_PUBLIC_CONTRACT_ROLE` | public | `dev` \| `rc` \| `final`: selects the gate mode (§7.3, T5; R-06; no banner since E-55). Replaces rev 1's `IS_FINAL_CONTRACT` |
| `NEXT_PUBLIC_MPC_CONTRACT` | public | `v1.signer-prod.testnet` |
| `NEXT_PUBLIC_USDC_CONTRACT` | public | `3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af` |
| `NEXT_PUBLIC_EXPECTED_CODE_HASH` | public | SHA-256 hex **H** of the reproducible wasm; required when the role is `rc` (Day 9) or `final` (Day 10) |
| `NEXT_PUBLIC_APP_URL` | public | `https://<app-host>` (must equal the contract's `base_uri` host) |
| `NEXT_PUBLIC_NEAR_RPCS`, `NEXT_PUBLIC_SEPOLIA_RPCS`, `NEXT_PUBLIC_BTC_APIS`, `NEXT_PUBLIC_SOL_RPCS` | public | comma lists, defaulting to §8.3 |
| `FASTNEAR_API_KEY` | **server only** | dashboard.fastnear.com (H-06); never `NEXT_PUBLIC_*` (kb/41 §RPC config) |
| ~~`ONECLICK_API_KEY`~~, ~~`COINGECKO_DEMO_KEY`~~ | — | removed in rev 2 with the 1Click clip (D-19) and the prices route |

### 8.5 Wallet integration

- Use `@hot-labs/near-connect@0.11.4` with `new NearConnector({ network: 'testnet', footerBranding: null })`. Never copy the docs' `features` block: it yields 0 wallets (kb/40 §TL;DR 3).
- Testnet wallets are Meteor, Intear, Ledger, Nightly, Ethereum wallets and NEAR CLI. HOT and MyNearWallet are **not** available on testnet (kb/40 §TL;DR 2). README and UI name Meteor and Intear.
- `wallet.signAndSendTransaction({ receiverId, actions: [{ type: 'FunctionCall', params: { methodName, args, gas, deposit } }] })`. Gas and deposit are decimal strings from `lib/near/constants.ts`.
- Call it **synchronously inside the click handler**. Nonces, fees, UTXOs and the Solana blockhash are prepared while the Review card is shown, so popups aren't blocked (kb/40 §Gotchas 15).
- **Never trust the resolved value.** Wallets resolve at NONE, at EXECUTED_OPTIMISTIC, or reject after 60 s (Intear) while the tx keeps running (kb/40 §TL;DR 4). Every stage comes from chain state (§8.6).
- Do not use `near-connect-hooks`' `callFunction`, because `getTransactionLastResult` is unsafe for partial outcomes (kb/40 §TL;DR 1).
- **The wallet set is live, not pinned** (R-34). near-connect fetches its wallet manifest and executors from GitHub at runtime (kb/40 §A), so pinning 0.11.4 doesn't freeze Meteor or Intear. Day 1: read the 0.11.4 source for a manifest override; if it exists, serve a reviewed snapshot from the app [ASSUMED, A-19]. Either way, re-test both wallets on Day 12 (SAT-113), and `tools/monitor.sh` diffs the live manifest daily Nov 14–19.

### 8.6 `SigningProgress` state machine (send flow; list/buy/transfer use a 3-step subset)

Persist the intent **before** opening the wallet: `localStorage["satchel:pending:v1"]` holds `PendingIntent[]`:
```ts
type PendingIntent = {
  id: string; tokenId: string; chain: 'btc'|'evm'|'sol'; createdAt: number; contract: string;
  sigCountBefore: number; heightBefore: number;                 // s0, h0 read just before the wallet call
  unsigned: { evmTx?: `0x${string}`; btc?: { psbtHex: string; preimages: string[]; outputs: string; inputs: string[] /* txid:vout */ };
              sol?: { message: string; lastValidBlockHeight: number } };
  payloadHashes: string[];                                      // what the contract will record (record.payload)
  evmNonce?: number;                                            // reused on retry (§8.7)
  nearTxHash?: string; seqs?: number[]; signatures?: unknown[]; chainTxId?: string;
  stage: SigningStage; error?: string;
};
```

| Stage | Enter when | Exits / events | Data source | Copy (kb/80 keys; timings updated per D-16) |
|---|---|---|---|---|
| `preparing` | user taps **Send** on Review | intent persisted → `awaiting_wallet`; prepare error → `failed`. The BTC candidate was already built and collision-checked during Review (§8.2) | chain RPCs and the token's records (fetched during Review) | `sign.step.prepare` |
| `awaiting_wallet` | wallet call started | **watcher** sees a record with our payload at `seq ≥ s0` → `signing`; wallet resolves with a hash → `signing`; wallet rejects with `/reject\|cancel\|denied\|closed/i` **and** no record within 10 s → `cancelled`; Intear "Failed to send transaction 1: Timeout" is **not** a rejection, keep watching (kb/40 §Client flow 5) | contract watcher: `sig_records(token, s0, 20)` every 2 s; `trackTx` once a hash is known | `sign.step.wallet`; 60 s → `sign.wallet.slow` |
| `signing` | a record exists or the hash is known | every record `signed` (signature in the record) **or** tx outcome holds all signatures → `signed`; any record `failed` → `timed_out`; tx `Failure` with a contract panic → `failed` (map `ERR_*`); no terminal state by `h0 + 250` blocks → `unknown` | watcher + `trackTx` (whichever is first) | timer from submit: 0–15 s "Usually about 10 seconds."; ≥ 20 s "Taking longer than usual."; ≥ 60 s "Still working. The network allows up to about 2 minutes."; ≥ 150 s "Still waiting for the network. We'll keep checking." |
| `signed` | all signatures in hand | local verify OK → `broadcasting`; verify fails → `failed` (E22) | — | — |
| `broadcasting` | verified | OK → `sent`; error → `signed_not_sent`; SOL `getBlockHeight() > lastValidBlockHeight` → `expired` | chain broadcast (EVM: compute `keccak256(signed)` first and store it; "already known"/"nonce too low" after a timeout = check by hash, kb/31 §viem client) | `sign.step.broadcast` |
| `sent` | chain tx id known | confirmations → `confirmed` | BTC `/tx/:id/status` every 30–60 s; EVM receipt every 3 s; SOL status every 1 s | `sent.note.*` (**BTC copy fixed**: "In mempool. Testnet4 confirmations are irregular: minutes to hours.") + `sign.closeok` "You can close this tab. Activity keeps tracking it." (kb/80 R2) |
| `confirmed` | 1 confirmation | — | — | `sent.confirmed` |
| `cancelled` | wallet rejected, no record | **Try again** → `preparing` | — | `sign.cancelled` |
| `timed_out` | record `failed` | **Try again** → `preparing` with the **same nonce / same inputs** (§8.7) | — | `sign.timeout`: "The signer network did not return a signature. Nothing was sent." + `sign.timeout.cond` "If a signature still turns up, Clean history lists it as Unused until it can't be used." + the per-chain retry note (kb/80 R2). (Unlike the plan's copy, don't claim "no signature exists": F16) |
| `signed_not_sent` | broadcast failed, or a reload found signatures with no chain tx | **Broadcast again** → `broadcasting` (same signed tx, no new signature) | — | `sign.notsent` + `.explain`; EVM nonce gap `sign.notsent.gap` (kb/80 R2) |
| `expired` (SOL) | blockhash expired before broadcast | **Try again** rebuilds with a new blockhash | — | `sign.sol.expired` |
| `unknown` | 250 blocks without a terminal state | **Check again**; links to NearBlocks + RPC | — | `sign.unknown` (E12); never labelled "failed" |
| `failed` | mapped error | per the error map | — | kb/80 §Error map |

**UI presentation (kb/80 R3).** The stages above are unchanged; this is how the UI shows them:
- `preparing` and `awaiting_wallet` render **in place on the Review button** ("Preparing…" → "Approve in your wallet…").
- The 4-row tracker (Approved in your wallet → Signing → Broadcast → Confirmed) appears at `signing`, and at `sent` it becomes the receipt.
- The copy thresholds use the keys `sign.mpc.0` / `.20` / `.60` / `.150`.
- `signed_not_sent` is a calm Needs-attention card (the brand's danger icon and title, no red fill; E-46), shown on the tracker, the Wallet tab, Activity, the owner's Clean history row, the Send page and the pending pill.
- List, buy, transfer and mint use the 3-step subset; transfer and buy end in the handoff.

**Resume on load.** For every non-terminal intent:
- `awaiting_wallet` / `signing`: run the watcher (by `s0` + payload) and `trackTx` if a hash is known.
- `signed` / `signed_not_sent`: offer "Broadcast now". For EVM, only when the record's nonce equals the pending nonce count; otherwise show the nonce-gap note (§7.6).
- `sent`: keep polling.
- A record that is `signed` but has no matching chain tx (EVM nonce not consumed; BTC inputs unspent) is surfaced as "Signed, not sent" even on another device. EVM rebuilds from the record's `unsigned_tx`; BTC rebuilds from the `sign_requested` event, found by height through FastNEAR `/v0/account` with `from_tx_block_height = height, to_tx_block_height = height + 1` (kb/50 §FastNEAR Transactions API).

### 8.7 Retry and replacement rules (at most one spendable signature per intent)

| Situation | Rule | Why |
|---|---|---|
| Retry after `timed_out` / `unknown` / `signed_not_sent` | EVM: **reuse the nonce** of the earlier intent (fees may go up ≥ 10 % if the first may be in the mempool). BTC: **reuse the same input set** (the new tx may change outputs and fee). SOL: rebuild only once the old blockhash is invalid | A timed-out request may still have a public signature (kb/70 F16). Same nonce / same inputs means at most one of the txs can ever confirm |
| New send while an earlier intent of the same token and chain is not `sent`/`confirmed` | Block it with "You have an unsent signed transaction. Broadcast it or replace it." A replacement follows the same nonce/input rule | Avoids two independent spendable signatures |
| New send after the earlier tx is seen in the mempool or chain | Normal: EVM nonce = `getTransactionCount(pending)`; BTC selection excludes inputs spent in the mempool | Both are intended |
| EVM speed-up / cancel | Same nonce, both fee caps ≥ 110 % (geth `PriceBump 10`) | kb/31 §Nonces |
| BTC candidate txid equals a txid referenced by a record (this token's, or the recipient Satchel's) | Perturb (fee +1 sat up to 3 times, then nSequence `fffffffd`↔`fffffffe`); output order is always randomized | Otherwise an old pre-signed spend of the predicted outpoint goes live (R-05, T12) |

### 8.8 Judge and demo access (D-12)

- **P0:** blocking server-rendered `/s/1`, `/contract`, `/market` (WebFetch-checked, §8.1); `GET /api/satchels/1` and `/api/contract` JSON; README "do X → see Y" commands with curl and near CLI fallbacks.
- **P0:** NEAR tx proofs use FastNEAR `POST /v0/transactions` (full receipts and logs, keyless). They work long after non-archival RPC has forgotten the tx (R-08).
- **P0:** recorded evidence in the repo for offline AI judges (kb/00 §Rec P1-11): `docs/evidence/*.json` holds the FastNEAR outcome of every proof tx (birth, signatures, transfer, sales), the `view-account-summary` and `near contract verify` outputs, and CI logs.
- **P0:** `tools/monitor.sh` (read-only, no keys) re-runs every README command, the no-JS page checks and the near-connect manifest diff daily Nov 14–19 (SAT-103, SAT-121). Results go to the human. Nothing in the repo changes after the 2026-11-14T23:59Z freeze.
- **P1:** the near-connect **"NEAR CLI" wallet** path, documented for technical judges. It needs no extra code: the UI shows the CLI command (kb/40 §G).
- **Not built:** server-side demo signer; broadcast relay (D-12). The on-chain signatures plus "Broadcast now" cover the stranded-signature case without a worker.

### 8.9 Formatting and UX numbers that changed with measurements (kb/80 R2 and R3 apply them)

| Item | Value | Ref |
|---|---|---|
| MPC sign latency | contract-initiated p50 6.7 s, p90 7.4 s, max 12.8 s (n = 38); direct-call FINAL median 8.7 s, max 16.5 s; timeout ≈ 115–120 s | kb/10 §Latency; kb/40 §TL;DR 5 |
| Testnet block time | 0.554–0.573 s ⇒ 250 blocks ≈ 2 min 20 s; show "{n} blocks (~{t})" from the 100-block average | kb/50 §Chain timing |
| BTC fee | `max(2, halfHourFee)` sat/vB; vsize = ceil((4·(10 + 41·in + 31·out) + 2 + 108·in)/4) (1 in, 2 out = 141 vB ⇒ ≈ 282 sats at 2 sat/vB); P2WPKH change < 294 sats goes to the fee | kb/30 §6 |
| BTC dust per recipient type | P2WPKH 294, P2TR 330, P2SH 540, P2PKH 546 sats | kb/30 §TL;DR 10 |
| EVM fee | show "< 0.000001 ETH" when tiny; gas 21000 for EOAs (`estimateGas` fails for an unfunded sender) | kb/31 §Fee display |
| SOL | fee 5000 lamports; **rent minimum 650,240 lamports** (0.00065024 SOL) for a new recipient and for any non-zero remainder; blockhash lives ≈ 36 s | kb/32 §TL;DR |
| SOL blockhash timing | fetch on Review and refresh every 10 s; use a hash ≤ 10 s old at the click; on expiry go to `expired` | kb/32 §Gotchas 1; D-09 |
| NEAR fee line | "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account"; "needs ≈ 0.1–0.3 NEAR free while signing (refunded)" | §5.4 |

### 8.10 Fonts, theme and brand assets (kb/81 R3, kb/80 R3; D-36)

| Item | Rule |
|---|---|
| Fonts | `next/font/google`, self-hosted at build time: `Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--font-bricolage', display: 'swap' })` for balances and titles, `Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' })` for text, `Spline_Sans_Mono({ subsets: ['latin'], variable: '--font-spline-mono', display: 'swap' })` for addresses and hashes only. The option shapes match the next 16.4.2 typings. Plus **Satchel Symbols**, a 16 KB Bricolage subset carrying `≈` (U+2248), served from `public/fonts/` with `unicode-range`, because no Google subset has that glyph. Never the Google Fonts `<link>` in `brand/web/head-snippet.html` |
| Theme | Night (default) and Day tokens in CSS through `light-dark()` + `color-scheme` (kb/81 R3 CSS block). P1 renders `<html data-theme="night">` from the server, so everyone sees Night. P2 removes it: Day then follows `prefers-color-scheme: light`, and an inline `<head>` script applies a stored override (`localStorage["satchel:theme:v1"]` = `night` \| `day`) before first paint and rewrites `theme-color`. `<html suppressHydrationWarning>`. The server never knows the override, and no judge fact depends on the theme |
| Metadata | Port `brand/web/head-snippet.html` to the Metadata API: `metadata.icons`, `manifest`, `openGraph` and `twitter` (the site-wide `app/opengraph-image.png` = `brand/web/og-image.png`), `viewport.themeColor` per `prefers-color-scheme` (`#17100c` / `#f7f5f1`). Per-page `<title>` "{page} · Satchel" plus the meta description (kb/80 R3 §Copy deck) |
| Icons | Lucide (`lucide-react`), `strokeWidth={1.75}`; chain marks are local SVGs; the logo is never drawn as an icon |

---

## 9. Backend (Next.js route handlers on Vercel; **no database, no worker**)

| Route | Method | Input | Output | Cache | Notes |
|---|---|---|---|---|---|
| `/api/satchels/[id]` | GET | token id (decimal) | `{token_id, contract, role, owner, status, listing, sig_count, last_sign_height, listable_at, addresses{btc,evm,sol}, balances{btc{confirmed_sats,unconfirmed_sats}, evm{wei}, sol{lamports}}, as_of, links, quiet_period_blocks, height, errors[]}` | `"use cache"` + `cacheLife({revalidate:15})` | 1.5 s timeout per upstream; partial results allowed; also feeds the blocking `/s/[id]` render |
| `/api/contract` | GET | — | `{account_id, role, code_hash_hex, expected_code_hash, access_keys, locked, birth_tx, birth_block, birth_actions[], any_signer_tx_count, oldest_tx, mpc_version, config}` | 60 s | backs `/contract` and the README curl. The proof fields come from FastNEAR `/v0/transactions` and `/v0/account` (§5.16 proofs 1–4) |
| `/api/card/[id].svg` | GET | id | the brand card SVG (800×504, kb/80 R3 §SatchelCard: band with name and status, `{n} signatures`, chain marks, the token's leather; no stitch) with the **status pill and `sig_count` read from contract state** (R-22) | `s-maxage=60, stale-while-revalidate` | NFT `media` via `base_uri`. No balances (D-23 rev 2). This is the honest "dynamic" claim: the image tracks the NFT's on-chain wallet state |
| `/api/clean-history/[id]` | GET | id | kb/70 §P3 response shape + `encumbered_utxos` | 15 s | hint only; the browser re-checks before Buy |
| ~~`/api/prices`~~, ~~`/api/oneclick/*`~~ | — | — | — | — | **cut in rev 2**: prices (no USD in v1) and the 1Click mainnet clip (D-19). `/api/prices` returns, 60 s cache, if UX-1's reopened default stands (E-47) |

Secrets: `FASTNEAR_API_KEY` is set only as a Vercel env var. Nothing is committed. Before the repo goes public, scan its history with gitleaks (kb/00 §Rec P0-7).

**Why no database** (D-11): every fact the UI must trust is on-chain (ownership, listing, records). Balances and history are live, keyless and CORS-enabled (kb/50 §TL;DR 1, 6). A block-following indexer is rate-limited below chain speed (neardata 30 blocks/min vs ≈ 105 produced). Vercel Hobby cron runs once a day (kb/50 §TL;DR 4, 8).

---

## 10. Pinned versions (exact; commit lockfiles on Nov 1; do **not** adopt the 2026-10-19 RCs mid-event)

| Layer | Package | Version | Ref |
|---|---|---|---|
| Rust toolchain | rustc (dev/test) | **1.93.0** via `rust-toolchain.toml` | kb/20 §TL;DR 1 |
| | rustc (reproducible image) | 1.99.1 inside `sourcescan/cargo-near:0.22.0-rust-1.99.1@sha256:c9655eaf…b5bb` | kb/22 §Verified facts |
| | cargo-near | **0.22.0** (installer `releases/download/cargo-near-v0.22.0/cargo-near-installer.sh`) | kb/21 §CI |
| | near-cli-rs | **0.30.1** (not 0.31.0-rc) | kb/20 §Deltas |
| Crates | near-sdk / near-contract-standards | **=5.29.1** | kb/20 §TL;DR 1 |
| | near-sdk-env (transitive) | **0.1.6** (lockfile; 0.1.7 needs rustc 1.95) | kb/10 §Gotchas |
| | near-workspaces | **=0.23.0** (+ `unstable`); sandbox nearcore 2.13.4; also run against `2.14.0-rc.5` before release | kb/21 §TL;DR 1 |
| | hex | 0.4.x [ASSUMED patch] | — |
| | tokio / anyhow / serde_json (tests) | 1 / 1 / 1 (lockfile) | kb/21 §Layout |
| Node | node | **22.22.2** (`.nvmrc`, `engines`; near-api-js needs ≥ 22.22.2) | kb/41 §Gotchas 12 |
| | package manager | pnpm via corepack, pinned in `packageManager` on Nov 1 [ASSUMED version] | — |
| Web | next / eslint-config-next | **16.4.2** | kb/41 §TL;DR |
| | react / react-dom | **19.3.1** | kb/41 §Versions |
| | typescript | **5.9.3** (not 7.x) | kb/41 §Versions |
| | tailwindcss / @tailwindcss/turbopack | **4.3.3** | kb/41 §TL;DR |
| | shadcn (CLI) | **4.22.1**; choose `--base base` (Base UI default) or `radix` on Day 1 | kb/41 §Gotchas 11 |
| | motion | **14.5.0** | kb/80 §Motion spec |
| | lucide-react | 1.61.0 was latest on 2026-10-21; pin the exact version on Nov 1 [ASSUMED] | kb/81 R3 §Iconography |
| Fonts | Bricolage Grotesque · Instrument Sans · Spline Sans Mono | through `next/font/google` (bundled with next 16.4.2; families, the `opsz` axis and subsets checked in its typings) + the Satchel Symbols subset (woff2, OFL) | kb/81 R3 §Typography; §8.10 |
| | @tanstack/react-query | **5.104.5** | kb/41 §TL;DR |
| | zod | **4.6.7** | kb/41 §TL;DR |
| | eslint | 9.x (scaffold) | kb/41 §Versions |
| NEAR | near-api-js | **7.3.1** | kb/40 §TL;DR 1 |
| | @hot-labs/near-connect | **0.11.4** | kb/40 §TL;DR 1 |
| Chains | viem | **2.57.7** | kb/31 §Primary sources |
| | bitcoinjs-lib | **7.0.4** (not 6.x; not chainsig's adapter) | kb/30 §TL;DR 9 |
| | @bitcoinerlab/secp256k1 | **2.0.0** (only for `initEccLib`, so `tb1p` recipients work) | spike/btc §Layout |
| | @noble/curves / @noble/hashes | **2.4.0** / **2.4.0** (`prehash: false` for 32-byte digests!) | kb/10 §Local verification |
| | @scure/base | latest 2.x on Nov 1 [ASSUMED] | kb/11 §Snippet A |
| | @solana/web3.js | **1.99.0** (not 3.x); the Solana UI is on by default (D-46) | kb/32 §TL;DR |
| | buffer | 6.0.3 (only if needed) | kb/41 §Polyfills |
| Test | @playwright/test | **1.64.1** | kb/41 §TL;DR |
| | vitest | latest on Nov 1 [ASSUMED] | — |
| **Not used** | chainsig.js, near-connect-hooks `callFunction`, @near-wallet-selector/*, Prisma/Drizzle/Neon, near-workspaces (JS), @defuse-protocol/one-click-sdk-typescript (1Click cut), `@fast-auth-near/*` (the plan lists it; v1 uses wallets only) | — | D-03, D-11, D-19, D-29 |

---

## 11. Repository layout for Nov 1 and bootstrap commands

> **As built (checked against `git ls-files` on 2026-11-04).** The tree below is the Phase-0 plan. The repo itself is
> `github.com/razvanstatescu/satchel` (private, created 2026-10-29, so the "on/after 2026-11-01" note is stale), and
> it differs from the plan as follows:
> - **Added:** `packages/core/` (`@satchel/core`: derivation, per-chain builders, the TS policy mirror of §5.9, and
>   the clean-history checker that §7.5 places in `apps/web/src/lib/clean-history/`); `tools/lib/`, `tools/test/`
>   (unit tests for the scripts) and `tools/fuzz/` (parser fuzz corpus, `docs/security/fuzzing.md`);
>   `vectors/{history,msg,allowance}.json` (sprint); `docs/specs/` (C1–C7), `docs/handoff/`, `docs/security/`,
>   `docs/testing/`, `docs/design/`; and the planning and research folders `kb/`, `plan/`, `brand/`, `marketing/`
>   and `research/` (Phase-0 spikes, kept as evidence and never imported, so the `.gitignore` rule for `research/`
>   below was not applied).
> - **Renamed or split:** `tools/e2e/sale.ts` became `sale-near.ts` and `sale-usdc.ts`; the sprint added
>   `allowance.ts`, `market.ts`, `message.ts`, `history.ts` and others. Signing without funds is `tools/e2e/{evm,btc,sol}.ts
>   --sign-only`; there is no `tools/smoke/`.
> - **Not present:** `SECURITY.md` (the security model is in the README and `docs/security/`); `docs/evidence/` (planned
>   for the proof JSON of §5.16 step 7 and §8.8, not yet created); `apps/web/public/fonts/`; `tools/smoke/`.

```
satchel/                              (new private GitHub repo created on/after 2026-11-01T00:00Z; never import research/)
├─ README.md  LICENSE  SECURITY.md (written in SAT-110)
├─ .gitignore  .env.example  .nvmrc  rust-toolchain.toml  Cargo.toml  Cargo.lock
├─ package.json  pnpm-workspace.yaml  pnpm-lock.yaml
├─ contracts/{satchel,mock-signer,mock-ft}/
├─ tests/                              near-workspaces integration crate (incl. release.rs: keyless birth, INV-31)
├─ vectors/{evm,btc,sol}.json          shared Rust/TS vectors (SAT-011; generated by tools/vectors, reviewed, committed)
├─ vectors/derive.json                 derivation vectors (SAT-204)
├─ apps/web/                           Next.js 16.4.2 app (AGENTS.md from the scaffold is kept)
│  ├─ src/app/{favicon.ico, icon.svg, apple-icon.png, opengraph-image.png, twitter-image.png, manifest.ts}   from brand/web
│  └─ public/{brand/*.svg, icon-192.png, icon-512.png, icon-maskable-512.png, fonts/satchel-symbols.woff2}   from brand/logo, brand/web
│                                      (Phase-0 design assets copied from `brand/`, never from research/; H-24 names them)
├─ tools/
│  ├─ vectors/gen.ts                   builds accepted + refusal vectors with viem / bitcoinjs-lib 7 / web3.js 1.99
│  ├─ e2e/{evm,btc,sol,sale}.ts        testnet e2e: send_tx INCLUDED + trackTx, then broadcast (keys from ~/.near-credentials, never committed)
│  │                                   btc.ts / evm.ts --fanout split one large balance across Satchel addresses (R-14)
│  ├─ smoke/{evm-unsigned,verify-evm}.ts   the Day-1 G1 smoke (SAT-007)
│  ├─ e2e/clean-history.ts             the scripted rc scenario (SAT-085, R-09)
│  ├─ check-wasm-imports.sh            INV-22 (CI build and the reproducible artifact)
│  ├─ judge-snippets.sh                every README command with its expected output (SAT-102)
│  ├─ monitor.sh                       read-only daily re-run Nov 14–19: judge-snippets + no-JS page checks + manifest diff (SAT-103)
│  └─ deploy/keyless-birth.md          the §5.16 runbook as a checklist; deploy/keyless-birth.ts = near-api-js fallback (SAT-084)
├─ docs/evidence/                      FastNEAR /v0/transactions JSON for every proof tx, CLI outputs, verify output, screenshots
└─ .github/workflows/ci.yml
```

There is no `ARCHITECTURE.md`. The README's "How it works" section and SECURITY.md carry that content, re-written for the repo (review §3 #21).

`.gitignore` must cover:
- `target/`, `node_modules/`, `.next/`, `.vercel/`, `.env*` (but keep `!.env.example`)
- `*.key`, `**/.near-credentials/**`, `payload.json` (submission payload, kb/00 §Gotchas 5)
- `research/` (spikes stay out of the product repo, research/README.md)

Bootstrap (S1/S2, Day 1). This machine's global Rust default is an old nightly, so always go through the toolchain file or `+1.93.0` (kb/20 §Gotchas):
```bash
rustup toolchain install 1.93.0 --profile minimal --target wasm32-unknown-unknown --component rustfmt,clippy
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/cargo-near/releases/download/cargo-near-v0.22.0/cargo-near-installer.sh | sh
cargo near --version                       # 0.22.0
near --version                             # 0.30.1
# contract crate: hand-write the Cargo.toml in §5.2 (or `cargo +1.93.0 near new contracts/satchel` and strip the template)
cargo generate-lockfile && cargo tree -i near-sdk-env      # must show 0.1.6; else: cargo update near-sdk-env --precise 0.1.6
cargo near build non-reproducible-wasm --locked --manifest-path contracts/satchel/Cargo.toml
# web
CI=1 npx -y create-next-app@16.4.2 apps/web --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git --no-agent-feedback --yes
#   then: tsconfig "target": "ES2022" and rm -rf apps/web/.next (BigInt literals; kb/41 §Gotchas 1); pin every version in §10 with --save-exact
near config add-connection --network-name testnet --connection-name testnet-drpc --rpc-url https://near-testnet.drpc.org/ \
  --wallet-url https://testnet.mynearwallet.com/ --explorer-transaction-url https://testnet.nearblocks.io/txns/   # kb/22 §One-time CLI setup
```

---

## 12. Testing strategy

### 12.1 Unit tests (fast, offline, < 1 min once dependencies are fetched; runnable by an offline AI judge)

| Suite | Runner | What | Oracle |
|---|---|---|---|
| Rust parsers | `cargo test -p satchel --lib` | every accepted and refusal vector in `vectors/{evm,btc,sol}.json`; field extraction; error codes | KB-cited constants must reproduce: e.g. the 48-byte Sepolia tx `02ee83aa36a7…80c0` → keccak `bc657845…c377` (kb/31 §Real MPC-signed tx); the 52-byte ETH transfer `02f283aa36a707…` → `8cb1b816…f6a1a9` (kb/70 F1); `sha256d(preimage) == bitcoinjs hashForWitnessV0` (kb/70 F4) |
| TS derivation | vitest | `evmAddress / btcP2wpkhAddress / solAddress` for `satchel.example.testnet` + `satchel/1/*`, `satchel/42/evm` | kb/11 §Derivation cross-check table (`0x53f9…1C2A`, `tb1qaanv…y8sd`, `DvZu…bqGB`, `0x3C44…B6d1`) |
| TS derivation (network) | vitest, tagged `@network`, CI non-blocking | the live `derived_public_key` view for 3 paths matches the local derivation | kb/11 §Rec P0 |
| TS builders | vitest | EVM / BTC / SOL builders reproduce the vector bytes; BTC preimage(PSBT) == `hashForWitnessV0`; outputs serializer == hashOutputs preimage; **collision check** `builder.test.ts::avoids_logged_txids` (a candidate whose txid is in the records is perturbed; seeded output order; INV-32) | `vectors/*.json` |
| TS checker | vitest with recorded fixtures | every status and aggregate rule in §7; `/outspends` 404 ⇒ `unfunded`; provider disagreement → `unknown`; one provider down → "1 of 2 sources"; SOL age rule; gate modes `gate.test.ts` (INV-33); the Esplora "unknown txid ⇒ spent:false" trap | kb/30 §7 live verdicts (DEAD / LIVE / NOT_CREATED / BAD_VOUT) |
| Card hue | vitest | offset, Night body and swatch hex for ids 1–8 and 42 | kb/81 R3 §Per-token leather hue test vectors |

### 12.2 Shared vectors (`tools/vectors/gen.ts` → `vectors/*.json`)

Regenerated after Nov 1 with product tooling. The spike's `research/spikes/sec/vectors.json` is reference evidence only and is not copied. Each vector is `{name, kind, hex, expect: {ok, error?, hash?, fields?}}`.

| Set | Accepted | Refused (must name the error) |
|---|---|---|
| EVM | ETH transfer (nonce 0 and 7), large values, max-width ints, `to` = contract address | legacy EIP-155, pre-155, type-1, type-4, `0x05‖rlp(auth)` with chain 0, `0x19 0x45`, `0x19 0x01`, chainId 1 / 84532, calldata (`approve`), creation, access list, trailing byte, non-canonical int, over-wide int, raw 32-byte hash |
| BTC | 1-, 2- and 4-input sets with outputs (incl. `tb1p` recipient output) | sighash NONE/SINGLE/ACP/0x41, wrong length, wrong scriptCode, locktime ≠ 0, sequence < 0xfffffffd, mixed tx, incomplete prevouts, sequence mismatch, outputs mismatch, malformed outputs, duplicate input, 11 inputs, version 1 |
| SOL | legacy transfer (to new and existing account), self-transfer | v0, durable nonce (ix0 `04000000`), two instructions, ComputeBudget, Assign, SPL Approve, two signers, `\xff` off-chain message, trailing byte, 1233 bytes, 32-byte hash |

### 12.3 Sandbox integration (near-workspaces 0.23.0 + mock signer; ≈ 20 s per run)

- Send yielding calls with `transact_async()` and poll `status()` until the callback's `sign_resolved` log is present (kb/21 §TL;DR 4; §Gotchas: `Ready` can arrive early).
- **Mandatory timeout test:** `worker.fast_forward(250)` (≈ 2.4 s) proves records persist, statuses become `failed`, and nothing gets stuck (INV-12).
- Use realistic block windows, because one `transact()` spans about 4 sandbox blocks (kb/21 §TL;DR 9). Never shrink `COOLDOWN_BLOCKS` for tests: move time with `fast_forward`.
- The mock FT uses 6 decimals and registers the Satchel contract in the test setup (kb/51 §Rec P0).
- **Keyless birth** (`release.rs`, SAT-036, INV-31): a parent account sends the 11-action batch. The new account exists with an empty key list, `config()` is right and ids 1–7 belong to the persona. `failed_birth_leaves_nothing`: the same batch with a bad `new` argument leaves no account behind.
- Run the full suite once against `sandbox_with_version("2.14.0-rc.5")` (testnet's nearcore). Run it again, together with `check-wasm-imports.sh`, against the **reproducible** wasm: on dev in SAT-035 (Day 4) and on the release artifact in SAT-081 (Day 9) (R-11, R-35).
- Intel Macs have no sandbox binary. Use Linux CI or Apple Silicon (kb/21 §TL;DR 6).

### 12.4 Testnet e2e (`tools/e2e`, on demand; humans approve via the standing Day-1 approval)

- Submit with `send_tx` `wait_until: INCLUDED`, then long-poll `trackTx` (kb/21 §Deltas). Never `transact()`-style blocking sends; the near CLI's sync send can falsely report "Internal server error" after 30 s (kb/22 §TL;DR 6).
- Flows: mint; EVM sign + broadcast + receipt; BTC 2-input sign + broadcast (mempool acceptance); transfer; list → buy NEAR at once (no cooldown); buy USDC with Circle faucet tokens.
- **USDC failure path** (SAT-073, R-10): a buy with a wrong `listing_id` must return `SuccessValue "0"` to the buyer's `ft_transfer_call` and leave the buyer's balance unchanged. A direct `ft_on_transfer` call must fail `ERR_WRONG_TOKEN`. If either fails, the final contract is born with `usdc: None` (H-26).
- **Clean-history scenario** (`tools/e2e/clean-history.ts`, SAT-085, R-09; run on rc with `CONTRACT_ROLE=rc`, so the strict gate applies):
  1. Sign an EVM tx without broadcasting it, then list. The checker returns `blocked` and Buy is disabled.
  2. Delist, broadcast, wait for 3 confirmations, relist. The checker returns `clean`.
  3. A buy with a stale `expected_sig_count` fails `ERR_LISTING_CHANGED`; the buy with the current pair succeeds.
  4. Separately, one BTC record reaches `spent` at K = 1.
- The timeout path can't be forced on the real MPC; it is covered in the sandbox.
- Runs on Day 1 (smoke), Days 3–5 (gates), Day 9 (rc) and Day 10 (final, after birth).
- It is **not** a nightly CI job: that would need signing keys in GitHub secrets, which an AI agent can't add without approval and which isn't worth the risk.

### 12.5 Playwright smoke (hosted URL)

`@playwright/test@1.64.1` against the Vercel URL, no wallet:
- `/s/1` server HTML (fetched with JS disabled) contains the owner, three full addresses, `sig_count`, "Contract keys: none" and the code hash, and none of them sits inside a `hidden` element (§8.1).
- `/api/satchels/1` returns valid JSON.
- `/contract` shows "keyless since birth" and the code hash.
- `/market` renders its listings server-side.

It runs after every production deploy (workflow_dispatch). An agent repeats the check with an AI fetch tool (WebFetch) on Days 2–3 and on Day 12 (SAT-215). `tools/monitor.sh` repeats the no-JS checks daily Nov 14–19.

### 12.6 CI (`.github/workflows/ci.yml`, ubuntu-latest)

| Job | Steps |
|---|---|
| `contracts` | checkout → install Rust 1.93.0 + wasm32 → install cargo-near 0.22.0 → cache `~/.cargo` + `target/` (includes the 29–35 MB sandbox binary, kb/21 §TL;DR 6) → `cargo near build non-reproducible-wasm --locked` for satchel, mock-signer and mock-ft → `cargo test -p satchel --lib` → `cargo test -p satchel-tests` → `tools/check-wasm-imports.sh` → print the wasm size |
| `web` | Node 22.22.2 → pnpm install --frozen-lockfile → typecheck → eslint → vitest (non-network) → `next build` → `grep -R "rpc.testnet.near.org"` must find nothing |
| `smoke` (manual / scheduled) | Playwright against `NEXT_PUBLIC_APP_URL` |

A public CI run and its badge become the cheap "tests pass" proof for judges once the repo is public (kb/21 §Open questions).

---

## 13. Known errata in KB docs (which value wins)

| # | Doc / location | Says | Winner (this spec) | Evidence |
|---|---|---|---|---|
| E-01 | kb/70 §P2 SOL row ("about 60–90 s"); kb/80 §TL;DR, `expired` state ("151 blocks (60–90 s)"), `sell.settle.sol` ("about 90 seconds") | Solana blockhash lifetime 60–90 s | **≈ 36 s** (150 blocks × 0.237 s on devnet; ≈ 32 s on mainnet). Settle copy: "about 2 minutes" (age margin) | kb/32 §Timing; spike/chains §6 |
| E-02 | kb/80 AmountInput, `val.sol.rent`, E25 | SOL new-account minimum 0.00089088 SOL (890,880 lamports) | **650,240 lamports (0.00065024 SOL)**, read live via `getMinimumBalanceForRentExemption(0)` | kb/32 §Fees and rent |
| E-03 | kb/80 AmountInput / `val.amount` | BTC minimum 546 sats for any recipient | dust depends on the recipient type: P2WPKH 294, P2TR 330, P2SH 540, P2PKH 546 | kb/30 §TL;DR 10 |
| E-04 | kb/80 role matrix, sale state machine, E5; kb/21 §Rec; kb/20 §TL;DR 9 | `pending_signs` counter, `ERR_PENDING_SIGNS`, "list fails while pending" | no counter; quiet period `ERR_QUIET_PERIOD` at `last_sign_height + 250`; "Signing" pill derived from records | D-01, D-05 |
| E-05 | kb/70 §TL;DR 4, §Notes (h), §Gotchas 11 | no callback at all; `sign_for` returns the MPC promise | keep a UX-only, panic-free callback; safety still lives in `sign_for` | D-01 |
| E-06 | kb/70 §TL;DR 4/7, §P6, INV-12/13; kb/21 §Rec; kb/51 S-8 sketch; plan S-6 (210); plan B2 (200) | cooldown 200 or 210 | **250** for the quiet period before `list`, read from `config()`. There is **no** post-listing cooldown (rev 2, E-37) | kb/10 §Rec 6; D-05 |
| E-07 | kb/80 `sign.mpc.30` ("Usually under a minute" at 30 s) and the plan's B4 | latency copy | new thresholds 15/20/60/150 s (§8.6) | kb/10 §Rec 9; D-16 |
| E-08 | kb/80 SigningProgress "Signing 2 of 3 inputs", `sign.mpc.inputs` | per-input progress | fan-out signs every input in the same block, so show "Signing 3 inputs" with one timer | kb/30 §Deltas |
| E-09 | kb/80 §Clean-history aggregate ("Incomplete"), D14 | "Incomplete" status for partial BTC sets | no "Incomplete" (kb/70); add **Unfunded** (non-blocking), Settling, Unsafe | D-04; kb/70 §P6 |
| E-10 | kb/70 §P2 BTC row and §Gotchas 3 | a missing prevout tx (404) means **live** | **unfunded**, non-blocking; the coins are excluded and marked encumbered if they appear later | D-04; kb/30 §7 |
| E-11 | kb/80 ReviewCard "NEAR fee ~0.005 NEAR [ASSUMED]"; plan B5 "≈ 0.005 NEAR per sign" | per-sign NEAR cost | ≈ 0.0012 NEAR gas + ≈ 0.0025–0.0028 NEAR record storage; temporary hold ≈ 0.1 NEAR per 100 Tgas | kb/10 §TL;DR 6; §5.4 |
| E-12 | kb/80 §Data sources "Addresses: chainsig.js derivation"; kb/11 §Rec (pin chainsig 1.1.16) | chainsig.js in the app | own derivation module; chainsig.js not used | D-03 |
| E-13 | kb/80 "Clean-history status /api/clean-history/:id (worker)"; plan B5 indexer + Postgres | worker + DB | no worker, no DB; route handler cache + browser checker | D-11 |
| E-14 | kb/80 `awaiting_wallet` note "one tx, N `sign_for` actions"; kb/40 §Rec "several FunctionCall actions" | BTC batching via N actions | **one** `sign_for` call with N preimages, fanned out with `.and()` (verified); never multiple `sign` actions per receipt | kb/30 §TL;DR 3–4 |
| E-15 | kb/10 §Rec 2 (attach 50 Tgas), kb/40 §Rec (100 Tgas), kb/20 §TL;DR 12 (50–100), kb/30 §Rec (40 + 20·n) | caller gas | `min(300, 60 + 20·n)` Tgas; contract floor `30 + 18·n` | D-06 |
| E-16 | kb/10 §Rec 3 ("forward `env::attached_deposit()` to MPC"); kb/40 §TL;DR 8b (`assert_one_yocto`) | deposit model | `attached ≥ measured storage + n × mpc_deposit` (default 1 yocto), refund the excess; still > 0, so function-call keys are blocked | D-06 |
| E-17 | kb/40 §TL;DR 8a (`get_sign_request(token_id, payload_hash)`); kb/50 views (`satchel_state`, `sig_log`, `get_listings`); kb/41 (`satchel_info`) | view names | `satchel`, `sig_records`, `listings`, `proceeds_of`, `config`; the client matches records by payload | §5.14 |
| E-18 | kb/70 §Reference `SignRequest::Btc { bip143_preimage_hex }` (one input per call); kb/20 sketch `chain: String, payload_hex` | request shape | `Btc { preimages: Vec, outputs }`; `Evm { unsigned_tx }`; `Sol { message }` | §5.3 |
| E-19 | kb/70 `Currency { Near, Ft(AccountId) }`; ft msg `{"token_id","listing_id","expected_sig_count"}` vs kb/51 `{"buy","listing_id","expected_sig_count"}` | currency + msg | `Currency { Near, Usdc }`; msg `{"buy":{"token_id","listing_id","expected_sig_count"}}` | §5.3 |
| E-20 | kb/20 §Rec P1, kb/70 §(i) | support `nft_transfer_call` with an in-flight lock + 20 Tgas resolve; keep NEP-178 | `nft_transfer_call` disabled; no NEP-178 in v1 | D-07 |
| E-21 | kb/70 TL;DR 2, §Reference (`nonce ≤ evm_max_nonce[chain_id].map_or(0, \|m\| m + 1)`) and INV-10 (`ERR_NONCE_GAP`); this spec's rev 2 ("dropped in v1", D-21) | EVM nonce-gap rule | **Kept in v1** (D-43 reverses D-21; security review S-04: a far-future poison nonce travels with the token). It differs from kb/70 in three details: (1) one `TokenState.max_evm_nonce: Option<u64>` instead of a per-chain map, because Sepolia is the only chain id; (2) the first EVM record may use nonce **0 or 1** (kb/70: 0 only), so demo #4's "nonce = current + 1" record stays possible; (3) the code is **`ERR_EVM_NONCE_GAP`**. The check runs after the stateless classifier and before any state change (§5.9, INV-10). A dev state reset on a kept account can leave chain nonces above `max + 1`: use a new `devN` account instead | D-43; §5.9 |
| E-22 | kb/22 §Final release runbook step 3 ("smoke test BEFORE locking" on the final account); kb/10 §Rec / plan (develop on final id) | where to smoke-test | rehearse the identical keyless-birth batch on `rc.<team>.testnet` (Day 9). The final account is born keyless in one tx (create, fund, deploy, init, mint ids 1–7) and never has a key (§5.16) | D-02, D-28; kb/70 §Gotchas 18 |
| E-23 | kb/00 §TL;DR 12 and gotcha 12 ("NearBlocks tx pages may show nothing") vs kb/50 §TL;DR 3 (tx pages render fresh txs; v1 API frozen; v3 current) | NearBlocks testnet | kb/50 wins for **pages**, which are used as links only. Never use the v1 API. The proof is FastNEAR `/v0/transactions` (E-41); re-check Nov 1 | D-10 |
| E-24 | kb/00 §Judge-runnable (expects "0 full access keys and 0 function-call-only access keys") | lock output text | the real CLI text for a locked account is **"Access keys: Account is locked (no access keys)"** | kb/22 §TL;DR 1 |
| E-25 | kb/80 `sent.note.btc` ("Testnet4 blocks arrive about every 20 minutes") | BTC confirmation time | difficulty-1 blocks come every ≈ 20 min, but 85 % of txs wait for real blocks (median gap 2 h, max 21 h): "confirmations are irregular, minutes to hours" | kb/30 §TL;DR 7 |
| E-26 | kb/80 E9 ("height > start + 210"), SigningProgress timeout "+200+10" | timeout detection | use the record status (`failed`) or the tx outcome; fall back to `unknown` at `h0 + 250` | §8.6 |
| E-27 | kb/80 §Error map E5, E27 (`ERR_PENDING_SIGNS`, `ERR_OVER_CAP`) | codes | removed (no counter, no delegates); see §5.15 | — |
| E-28 | kb/41 §Judge and demo access (demo signer P1); kb/80 D9 (relay "strongly recommended") | demo signer / relay | not built in v1; on-chain signatures + "Broadcast now" | D-12 |
| E-29 | kb/30 §Gotchas ("cap at 13 inputs") | max inputs | 10 | §5.5 |
| E-30 | kb/32 §Rec ("fetch the blockhash only after the user confirms… immediately before opening the wallet popup") | SOL blockhash timing | prefetch on Review and refresh every 10 s, because an async fetch inside the click handler can trigger the popup blocker (kb/40 §Gotchas 15) | D-09 |
| E-31 | kb/70 §Classification SOL (legacy **or v0**; ComputeBudget allowed) | SOL policy | legacy only; exactly one System Transfer | D-22 |
| E-32 | kb/40 vs kb/80 storage keys (`satchel:pending` vs `satchel:inflight:{tokenId}`) | localStorage key | `satchel:pending:v1` (array) | §8.6 |
| E-33 | kb/22 §Final release runbook init args `{"mpc":…,"usdc":"<usdc>.testnet"}` | init args | `{"mpc":"v1.signer-prod.testnet","usdc":"3e2210e1…b8af","base_uri":"https://<app-host>/api/card/"}` | §5.16 |
| E-34 | kb/10 §Rec 11 / kb/21 mock "fail_on_timeout" text | timeout string | `"Request has timed out."` exactly | kb/10 §`sign` |
| E-35 | kb/20 TL;DR / kb/10 Gotchas: "near-sdk-env 0.1.7 needs rustc 1.95 (released 2026-10-19)" | ambiguous date | **near-sdk-env 0.1.7** was published 2026-10-19 (MSRV 1.95) | spike/btc §17 |
| E-36 | kb/80 §Transfer review ("Approvals are cleared."; "P2 adds '{n} delegate will be removed'") | transfer review copy | v1 has neither approvals nor delegates. Drop both lines and use "Only the new owner will be able to sign. The signature history stays with the Satchel." | D-07, D-13; R-37 |
| E-37 | kb/80: status vocabulary "Listed (cooling down)", role-matrix rows "Listed · cooling down" / "For sale", FreezeBanner countdown (`cooldownBlocks`), sale flow "list → cooling down → buy", copy `sell.*` ("Buyers can buy after a {n}-block cooldown"), `freeze.owner` / `.buyer` / `.done`, `buy.err.*` ("The cooldown isn't over yet"), E28 `ERR_COOLDOWN`, storyboard "Speed-ramp the ~2 min cooldown". kb/70 INV-14 (buy fails before the cooldown). Plan S-6 ("buy from `listed_at + 210`") | post-listing buy cooldown | **none** (rev 2). `buy` is allowed as soon as a listing exists. It is bound to `(listing_id, expected_sig_count)` and gated by clean history. Pills: Active · Signing · For sale · Sold. FreezeBanner keeps only "Signing paused while listed". The quiet period before `list` stays | D-05 rev 2; §5.7 |
| E-38 | kb/22 §TL;DR 1–3 and §Final release runbook (create the final account with a key, deploy, then `delete-keys` = "lock"; "develop on the final account id with its key kept") | how the final account becomes keyless | **keyless birth**: one tx from `<team>.testnet` (CreateAccount · Transfer · DeployContract · `new` · `nft_mint` ×7) and no AddKey, ever. `delete-keys` appears only in fallback option (a) | D-02 rev 2; §5.16 |
| E-39 | kb/40 ("200 blocks ≈ 120 s (0.57–0.60 s)") vs kb/10 (0.555–0.569 s per block ⇒ 111–114 s) | MPC yield timeout duration | **115–119 s measured** end to end (§8.9). Copy: "up to about 2 minutes" | kb/10 §Latency; review §3 #23 |
| E-40 | kb/41 §Reading NFT state ("a no-JS fetcher, such as an AI judge using HTTP GET, sees server-rendered data") and §Judge and demo access row (a) ("verified: PPR streams them into the same response") | judge pages through PPR streaming | Streamed data sits in hidden segments at the end of the document, and AI fetch tools may drop them. Judge routes render **blocking** (`instant = false`) with ids 1–7 prerendered, and acceptance uses WebFetch, not only curl | §8.1; R-07 |
| E-41 | kb/00 §TL;DR 12, §Gotchas 12 and Deltas #13 ("give RPC-based proofs too"; "use `test.rpc.fastnear.com` or `near-testnet.drpc.org`") | source of NEAR tx proofs | Non-archival RPC forgets a tx after ≈ 32–40 h (kb/50 §TL;DR 4, §Gotchas 8), which is before judging (Nov 16–18). Tx proofs use FastNEAR `POST /v0/transactions`. RPC stays for **state** views (`view_account`, keys, `call_function`), which don't expire | D-10; R-08 |
| E-42 | kb/80 rev 1 and kb/81 rev 1 (whole documents) | the rev 1 UX spec and tokens | **kb/80 R2 and kb/81 R2 (2026-10-21, reference-driven) supersede rev 1.** References are in kb/82. R2 applies E-01…E-41 wherever they touch the UI. E-01…E-37 quote rev 1 strings; the verbatim rev 1 docs are kept in `research/spikes/ux-refs/rev1-snapshot/` | kb/80 R2 §Changelog; kb/81 R2 §Changelog |
| E-43 | kb/80 rev 1 §SatchelCard (balance glass plate; "Show addresses" 3D flip); kb/81 rev 1 §Metal (brushed-silver gradient CTA) | numbers and a flip on the card; metallic buttons | kb/80 R2: an **identity-only face** with no balances and no flip in v1; balances live in the ChainRows. The card SVG is unchanged (status + `sig_count`, D-23). kb/81 R2: a **near-white CTA pill**; metal (`--stamp-*`) only on the hallmark stamp and the success tile | kb/80 R2 R2-D05, R2-D06 |
| E-44 | kb/80 rev 1: Drawer/Dialog modal routes, the `sell.delist.confirm` AlertDialog, the `sign.relay` / `sign.closed` relay copy, "Pay with (USDC \| NEAR)", the Access tab, `clean.ok` ("{k} of {n} settled"), "Blocked: unused signature" as a hard block on listing | rev 1 flows and copy | kb/80 R2:<br>• full pages (D-26; a desktop right drawer only if H-19 picks modals);<br>• Delist is confirmed by the wallet alone;<br>• no relay copy (D-12);<br>• the listing fixes the currency (D-14);<br>• no Access tab (D-13);<br>• verdict copy per aggregate (§7.3);<br>• the pre-list past-signatures row is **advisory** (only the quiet period and USDC registration block `list`), so demo #4 can be listed (D-32) | kb/80 R2 U2-01, U2-27, U2-29, U2-30, U2-35, R2-D16 |
| E-45 | kb/80 R2 and kb/81 R2 visual language (graphite neutrals, the near-white CTA pill, seeded alloys, the alloy glow, frost, materialise, the hallmark stamp, Archivo + JetBrains Mono, mono-caps labels, tinted banners and tags); this spec's §8.1 OG row, §8.2 `lib/card`, §9 "seeded card SVG (856×540)", §12.1 card-seed vectors | R2 visual tokens and treatments | **kb/81 R3 and kb/80 R3 (brand consolidated, 2026-10-21) supersede R2's visual tokens.** Visual identity comes from `brand/` (`tokens.json` v2 verbatim plus marked derived tokens; contrast verified in both themes). R2's structure and behaviour stay. The generated per-Satchel OG image gives way to the brand's site-wide `og-image.png`. R2 is kept verbatim in `research/spikes/ux-refs/r2-snapshot/` | D-36; kb/81 R3 §Changelog; kb/80 R3 §Changelog |
| E-46 | §5.10 pill label "For sale" and E-37 "Pills: Active · Signing · For sale · Sold"; §7.3 banner text "DEV CONTRACT…" / "RELEASE CANDIDATE…"; §7.7 "Badge (Hallmark "CLEAN HISTORY")"; §8.6 "warning-tone" `signed_not_sent` card (kb/80 R2) | status vocabulary, letter case, tone | Pills **Active · Signing · Listed · Sold**, plus **Needs attention** (owner view, client-side: a `signed_not_sent` intent, or a signed record with no chain tx). The contract state is unchanged: `listing` set means signing is paused. Banner and badge strings render in sentence case with the same words ("Dev contract: lock and code checks skipped", "Release candidate: testnet rehearsal", the "Clean history" ProofChip); the §7.7 tooltip text stays verbatim. `signed_not_sent` uses the brand's danger tone with calm copy, never a red fill | brand state table; D-36 B-05, B-10 |
| E-47 | §4 T7 ("no USD values in v1"), §8.3 and §9 (prices route cut), D-20 ("prices already cut") | fiat display | **Conditional (UX-1 reopened, D-36):** if the design lead's default stands on Oct 31, the Satchel card shows one fiat number, "≈ $X · at mainnet prices", and `/api/prices` returns (1Click `/v0/tokens` → CoinGecko, 60 s cache, a 1.5 s SSR bound; kb/50 §Price route). No other fiat anywhere; without prices the card shows "{n} chains". If UX-1 goes native-only, T7, §8.3 and §9 stand as written | D-36; checklist §6 UX-1 |
| E-48 | kb/31 and `EVM_TRANSFER_GAS` usage: a native transfer always uses gas 21,000 | Sepolia's 2026 fork (state-gas accounting) charges **204,600 gas when the transfer creates the recipient account**, so a 21,000 limit fails "out of gas". The nonce is used and the value stays (dev1 #1 → a fresh address, 2026-10-29, `0x8571dc5b…`) | Builders use `estimateTransferGas` (`eth_estimateGas`, never below 21,000; fallbacks 250k for an empty recipient, 100k for a contract). The contract accepts any gas limit, so no contract change. The retry with the next nonce succeeded (`0x4744f9d9…`, gas 207,391) | live Sepolia, 2026-10-29 |
| E-49 **(sprint 2026-10-29)** | §5.5 `EVM_CHAIN_ID` single value `11155111`; §5.9's EVM table `chain_id == 11155111`; README/`judge-snippets.sh` `evm_chain_ids = [11155111]`; this document's repeated "EVM Sepolia only" | EVM chain allowlist | **C3: four testnets**, `EVM_CHAIN_IDS = [11155111, 84532, 421614, 11155420]`, frozen at birth. Sepolia keeps `TokenState.max_evm_nonce`; the other three use a new per-chain map (§5.9, §5.17) | `docs/specs/C1-C2-C3-C7.md` §2–§3.2 |
| E-50 **(sprint 2026-10-29)** | §5.4 "the fix-pass wasm is 290,504 B ≈ 2.9 NEAR" | contract code stake | **≈ 422,000 B ≈ 4.2 NEAR** after C1/C2/C3/C7/C5/C4/C6 [ASSUMED pending the Day-9 reproducible build]; still well inside the 20 NEAR (final) / 10 NEAR (rc) birth funding | §5.4; §5.17 |
| E-51 **(sprint 2026-10-29)** | Appendix A rows "ERC-20 `transfer`" and "Delegates (S-10)", listed as Phase-3 designs kept out of v1 | scope | **Both shipped in this sprint**: ERC-20 (USDC only, on any of the four EVM chains) as **C2**, and delegated signing as **C5** (a capped, rolling-24h allowance per asset, not the daily-cap sketch in that appendix row). The appendix rows are historical: they describe designs considered and then built differently; the `docs/specs/C5.md` and `C1-C2-C3-C7.md` interfaces win | `docs/specs/C5.md`; `docs/specs/C1-C2-C3-C7.md` §2–§3; Appendix A (superseded) |
| E-52 **(sprint 2026-10-29)** | §5.4 `StorageKey` enum list (`OwnerById … Proceeds`), "the variant order is the on-chain prefix … and must never be reordered after the final deploy" | storage key order | Still true of the original eight; this sprint **appends** ten more after `Proceeds` in merge order: `Allowances` (C5, prefix 8), `Inside, InsideFt, Offers, OffersByToken, OffersByTokenLen, OffersByAccount, OffersByAccountLen` (C4/C6, 9–15), `StorageCredit` (C6, 16) and `EvmNonces` (C3, 17), as in `lib.rs`. This order must be frozen before the Day-9 reproducible build | §5.17; `docs/specs/C4-C6.md` §8 |
| E-53 **(sprint 2026-10-29, M-01)** | §5.4 "Keep ≥ 5 NEAR liquid (`balance − storage_usage × 1e19`)" and the monitor's check [4] on that free balance; `docs/security/contract-review.md` S-02 "Mitigated (operations)"; C4/C6 I-M1 as a test-only property | the contract's buffer for S-02 storage, and whether escrow can pay it | **Escrow never pays storage.** The buffer is the *spare* NEAR, `free − market_totals().escrow_near`; the monitor alerts on that (`tools/lib/free-balance.py`, < 3 NEAR FAIL, < 5 WARN; unreadable escrow can't PASS). On-chain, `ensure_solvent` refuses with `ERR_INSOLVENT` any `nft_transfer`, buy or `accept_offer` that grows storage beyond the spare NEAR, so I-M1 holds at rest after every call (§5.17) | review M-01 (`docs/security/sprint-review.md`); sandbox `market.rs::m01_*`, `review.rs::m01_contract_paid_storage_never_consumes_escrow` |
| E-54 **(2026-10-31, Q-03 / Q-04)** | §5.15 `ERR_BAD_RECEIVER` "nft_mint, nft_transfer"; `docs/specs/C4-C6.md` §2.2 rule 8 "`receiver_id ≠ this contract`"; §5.15 `ERR_BAD_MSG` "msg isn't `{"buy":{…}}`"; serde's default of ignoring unknown msg fields | which receivers a withdrawal refuses; how strictly `ft_on_transfer` parses its msg | **Q-03:** `withdraw_near`, `withdraw_ft` and `prepay_storage(account_id)` use `ensure_receiver` (contract, MPC, configured USDC), like `nft_transfer`; NEAR sent to the MPC or USDC used to be delivered and lost. **Q-04:** `FtMsg` and `OfferMsg` deny unknown fields, so `{"buy":{…,"receiver_id":…}}` is refused and refunded instead of silently giving the NFT to the sender. Both approved by Razvan before the Nov 9 freeze; same error codes, no state change, wasm 1,360 B smaller | `docs/testing/contract.md` §7.4, §7.7; `tests/tests/round2.rs::q03_*`, `q04_*`; unit `market_tests::q03_*`, `q04_*`, `prop_ft_msg_any_extra_key_is_refused` |
| E-55 **(2026-11-03, D-52)** | §4 T5 (dev builds show a "DEV CONTRACT" banner); §7.3 gate modes, the Banner column; §8.4 `NEXT_PUBLIC_CONTRACT_ROLE` ("selects the gate mode and banner"); E-46's banner strings; kb/80's RoleStrip | a role banner in the global chrome | **No role banner on any page.** The role strip is gone (dev's "Dev contract: lock and code checks skipped", rc's "Release candidate: testnet rehearsal"). `NEXT_PUBLIC_CONTRACT_ROLE` still selects the gate mode. The role shows on `/contract` (the Role fact; the "Development contract" title on dev) and, on dev, in the buyer's Clean history checklist as the warning row "Dev contract: lock and code checks skipped" (`copy.clean.checks.dev`). The landing's Trust band follows the role too: dev shows its twin, and rc reads like final | `plan/decisions.md` D-52; `apps/web/src/components/NavShell.tsx` `Strips`; `apps/web/test/unit/shell.test.ts` |

---

## 14. `[ASSUMED]` register and re-checks

| Item | Assumption | Re-check (when / how) | If wrong |
|---|---|---|---|
| A-01 | MPC still 3.17.0; `sign` args unchanged; gas floor 15; deposit 1 yocto | Nov 1, Nov 10 (before the final birth), Nov 13: `version`, `config` views; diff `crates/contract/src/api/sign.rs` if the version changed (kb/10 §Rec 12) | adjust before the birth; after it, disclose |
| A-02 | `sign_for` entry burn ≤ 10 Tgas for n = 10, so the floor `30 + 18·n` holds | Day 4: measure n = 1, 2, 4, 10 in sandbox and testnet (SAT-031) | change both formulas before the freeze |
| A-03 | Record sizes ≈ 250–280 B ⇒ the 0.005 NEAR × n attach suffices | Day 2 sandbox measurement (SAT-012) | adjust `SIGN_ATTACH_DEPOSIT` (frontend constant only) |
| A-04 | Wallets accept 260 Tgas and 0.05 NEAR deposits on one FunctionCall | Phase 0 P0-R5 (human, Meteor and Intear) and Days 3–4 SAT-224 (G2) | lower `MAX_BTC_INPUTS` to what works |
| A-05 | Circle testnet USDC's `ft_resolve_transfer` refunds 100 % when `ft_on_transfer` panics, and behaves like near-contract-standards otherwise | Phase 0 P0-R4 (refund path with the pay spike's receiver; needs the human's OK) and Day 8 SAT-073 (failing buy + direct call; R-10) | the final contract is born with `usdc: None` (H-26). USDC appears only as sandbox evidence, disclosed (D-27, R-38) |
| A-06 | A second keyless Solana devnet RPC exists | Nov 1 probe; else a free Helius/QuickNode devnet key (human) | the checker doesn't need it (age rule, R-19); sends use one RPC, disclosed |
| A-07 | mempool.emzy.de stays up as the second BTC provider. A third testnet4 Esplora is **not known**: Blockstream has no testnet4 API and `testnet4.mempool.space` is mainnet (kb/30 §TL;DR 6) | Nov 1 search; Day 9; daily in `monitor.sh` | one provider down ⇒ "clean (1 of 2 sources)" if H-25 allows it on testnet, otherwise `unknown`. Disagreement always ⇒ `unknown` |
| A-08 | FastNEAR tx API stays keyless and current, and keeps the Oct–Nov txs through Nov 19 | Nov 1; daily in `monitor.sh`; key server-side | Activity degrades to on-chain views; the README points at `docs/evidence/*.json` |
| A-09 | Vercel Hobby can deploy the repo (GitHub org private repos may need Pro) and the default Node satisfies ≥ 22.22.2 | Day 1 first deploy | personal-account repo, Vercel CLI `--prebuilt`, or Pro |
| A-10 | `contract_metadata(standard(...))` attribute syntax works with cargo-near's NEP-330 build info | Day 4 (SAT-035, first reproducible build) | omit the standards list (cosmetic) |
| A-11 | `serde_json::Value` in a view/callback return type compiles with ABI generation | Day 1 | return `String` (raw JSON) instead |
| A-12 | `@scure/base`, vitest, QR library, pnpm versions | Day 1: pin the exact latest | — |
| A-13 | A late MPC `respond` after a timeout can still land a public signature (inferred from source, not observed) | — (the design assumes it can) | none needed |
| A-14 | NearBlocks testnet tx pages render November txs | Nov 1, Day 12 | nothing: they are links only (D-10) |
| ~~A-15~~ | 1Click unauthenticated +25 bps | — | n/a: the 1Click clip is cut (D-19) |
| A-16 | A testnet4-capable wallet (e.g. Sparrow) can hold a team reserve | by Oct 24 (H-23) | from Nov 1, claim large UTXOs into dev1 #1 and fan out with `tools/e2e/btc.ts --fanout` (R-14) |
| A-17 | **VERIFIED 2026-10-21** (`research/spikes/keyless-birth/RESULTS.md`). The protocol accepts the 11-action keyless batch: tx `2AMrb8J8…`, 78.2 Tgas, 0 keys, code hash equals the wasm. A failing action reverts everything, including CreateAccount (tx `DdXHj1EQ…`). **near-cli-rs 0.30.1 cannot build it** (only `skip` may follow DeployContract), so the near-api-js tool is the primary path; the CLI's 4-action `with-init-call` form also works if `new` mints | Day 5 sandbox regression test (SAT-036, INV-31); Day 9 rc birth (SAT-082) with the real Satchel wasm | CLI 4-action form with genesis mints in `new`; then option (a) (§5.16), disclosing the window |
| A-18 | `export const instant = false` renders a route blocking, with no streamed fallback, under `cacheComponents`. This is known only from the build-error text (spike/web §3) | Day 2 (SAT-210) on a preview deploy, with WebFetch (SAT-215) | prerender ids 1–7; render other ids from the cached snapshot outside Suspense (§8.1 rule 4) |
| A-19 | near-connect 0.11.4 accepts a self-hosted wallet manifest | Day 1 (read the source) | no snapshot: `monitor.sh` diffs the live manifest daily and the README names the tested wallets and date |
| A-20 | FastNEAR `is_any_signer` also covers NEP-366 delegated signers (by name; kb/50 lists `is_delegated_signer` as a separate flag) and its index has no gap before a birth. **Partly verified 2026-10-21** on `lock1.satchel-spk-sdk-e9ea1a.testnet`: `{"desc":false}` lists its creation tx `6iehbD…` first; `is_any_signer` (like `is_signer`) returns exactly its deploy `AovRm6…` and delete-keys `8yEpkL…` txs. **On the keyless spike `kb1.satchel-spk-chain-e9ea1a.testnet`:** `is_any_signer` → `txs_count: 0`, and the unfiltered history = the birth tx only (`is_receiver: true`, every signer flag false). For a keyless account the delegated-signing question is moot: it never had a key that could sign a DelegateAction | Day 9 on rc: expect `[]` and oldest = the rc birth | show `is_signer` and `is_delegated_signer` separately. The keyless argument still stands on the birth tx plus INV-22 |
| A-21 **(sprint 2026-10-29)** | `wrap.testnet` (wNEAR) is trusted as a deposit asset the same way the configured USDC is trusted for sales: a malicious upgrade of either FT could fake deposits of its own token into a Satchel, but could never touch NEAR or the other allowlisted token | Checked read-only on 2026-10-29 (`ft_metadata`, storage 0.00125 NEAR); re-check before the Day-10 birth that `wrap.testnet` is still the canonical testnet wNEAR and still a standard NEP-141 | if it changed behavior, drop it from the FT allowlist (compiled in, so this needs a new contract) and disclose |
| A-22 **(sprint 2026-10-29)** | `history_digest(token_id)` stays within the 300 Tgas view-call limit up to roughly **2,500 records** (≈ 0.1 Tgas/record); a Satchel that signs far more than that in-event can't be digested in one view call | **Measured 2026-10-29** (security review L-03, `tests/tests/review.rs::sr05_history_digest_gas_ceiling`, wasm `bd5d8e01…`): ≈ 0.092 Tgas per small record (3,000 fit, 4,000 don't) and ≈ 0.133 Tgas per 1,024-byte message record (2,000 fit, 2,500 don't). Re-run on the Day-9 reproducible build | cross-contract callers page `sig_records` and hash client-side instead (the view is a convenience, not the only way to verify history, C1-C2-C3-C7.md §5.1) |
| A-23 **(sprint 2026-10-29)** | The EVM chain allowlist (`EVM_CHAIN_IDS`, 4 testnets) and the ERC-20 token allowlist (USDC per chain, `erc20_tokens`) are correct and frozen at birth; both are compiled in and verified read-only on 2026-10-29 (`symbol()`/`decimals()` on two RPCs per chain) | Re-verify all four `symbol`/`decimals` reads on Day 9 immediately before the reproducible build is tagged | a wrong address ships permanently (new contract to fix); disclose which addresses were checked and when |
| A-24 **(sprint 2026-10-29)** | A signed `evm_message` / `sol_message` has an off-chain meaning decided entirely outside the contract (a log-in, a proof of address control, a dapp account) — the contract and the clean-history checker have no opinion on it beyond "it can never move the coins you're buying" (INV-37) | None needed on-chain; the UI must keep showing the full decoded text and the "messages can't move coins" caveat so a buyer isn't misled about what a `message` item means | if a buyer-facing flow ever treats a message as proof of anything stronger, revisit the disclosure copy (`docs/specs/C1-C2-C3-C7.md` §3.4) |
| A-25 **(sprint 2026-10-29)** | A malicious or careless delegate (C5) can grief a token's history by signing and never broadcasting, leaving `unused` records that block a sale until the owner settles them; the nonce-gap rule, the 32-debit rolling window and SOL's ≈36 s expiry bound the damage, and every record is rebuildable from the event log (§7.6) | Covered by `docs/specs/C5.md` §7 "Griefing a token's history"; re-confirm during the Day-9 sandbox pass that a worst-case delegate (max caps, max rate) can't produce an unsettleable token the way demo #4 is deliberately unsettleable (§7.6) | owners should grant allowances only to accounts they trust that much; the UI says so (C5.md §7) |

---

## Appendix A — Phase 3 designs kept out of v1 (so nobody re-litigates them mid-event)

> **(sprint 2026-10-29).** The "Delegates (S-10)" and "ERC-20 `transfer`" rows below are superseded: both shipped
> this sprint, as **C5** (allowances, a rolling-24h capped budget per asset — not quite the daily-cap sketch here)
> and **C2** (USDC-only ERC-20 transfers on EVM), §5.17 and E-51. The rows stay for history.

| Feature | Design if re-enabled | Ref |
|---|---|---|
| `nft_transfer_call` | Hand-written transfer_call. Set `transfer_call_since = Some(height)`, which blocks `sign_for` / `list`. Hand-written resolve with ≥ 20 Tgas static, weight 0, unable to panic; it bumps state and clears any listing on revert. Last-resort release after 100,000 blocks | kb/70 §(i); kb/20 §TL;DR 7–8; spike/sdk §4 |
| NEP-178 approvals | Clear on every owner change through an internal path, never a public owner-checked method | kb/01 §Gotchas 3 |
| Delegates (S-10) | `(token, epoch, account) → {chain, daily_cap, window_day, spent, expires_at_ms}`; charge the cap at request time from parsed amounts (EVM `value + gas·maxFee`, SOL lamports + fees); BTC delegates need the outputs (now available) to compute outflow | kb/70 §(m); kb/30 §Rec P1 |
| ERC-20 `transfer` | Allowlisted token + selector `a9059cbb`, 68-byte calldata | kb/70 §Enforcement matrix |
| On-chain proof of death | MPC `verify_foreign_transaction` (mainnet BTC, SOL, L2s; not Ethereum) | kb/70 F18 |
| Timelocked upgrades | DAO upgrade ≥ 7 days with a "pending upgrade" banner and frozen listings | kb/70 §(j) |
| Post-listing buy cooldown | Removed in rev 2. It would make `buy` fail before `listed_at + 250`. It would matter only if the quiet period were removed, because the quiet period already exceeds the MPC yield window | D-05 |
| Heirloom timelock (plan B2 stretch) | An inactivity-triggered owner change that respects the freeze, clears listings and passes INV-02. Not designed in v1 | D-29; R-40 |
| 1Click "pay from any chain" (S-12) | Quote → deposit → SUCCESS → USDC `ft_transfer_call` with the same `buy` msg. Needs a mainnet deployment and human funds | D-19 |
