# Glossary: Satchel terms and internal IDs

Code comments and docs cite short IDs such as `kb/90 §5.9`, `D-43`, `INV-09`, `C5` or `AUDIT-01`. This page says what
each prefix means and where it is defined, so you can follow any reference without reading the whole repo.

Start at [`README.md`](../README.md) for the product, and at [`docs/README.md`](README.md) for the map of the docs.

## Product terms

| Term | Meaning |
|---|---|
| **Satchel** | One NEP-171 token of the Satchel contract. It controls one Bitcoin, one EVM and one Solana address, derived by NEAR Chain Signatures from (contract id, path `satchel/{token_id}/{btc,evm,sol}`). Whoever owns the token can sign for those addresses. |
| **`sign_for`** | The only way a Satchel's keys sign. The owner (or a delegate within an allowance) sends a *structured* unsigned payload; the contract parses it, writes a record, then asks the MPC to sign. kb/90 §5.8, `contracts/satchel/src/sign.rs`. |
| **Structured payload** | The exact unsigned bytes to sign: an EVM type-2 transaction, Bitcoin BIP143 preimages plus outputs, a Solana legacy message, or a plain-text message. Never a raw 32-byte hash (that would be a blind signer). kb/90 §5.9. |
| **Classifier** | The contract code that parses a payload and accepts or refuses it (`contracts/satchel/src/parse/`). `packages/core/src/policy/` is its TypeScript mirror; both run the shared `vectors/*.json`. |
| **Record, `SigRecord`** | The on-chain entry written by `sign_for` **before** the MPC call: chain, nonce / outpoint / blockhash / message, requester, height. Append-only. kb/90 §7.1. |
| **`sig_count`** | The number of records a Satchel has. `buy`, `accept_offer` and listings are bound to it, so a sale fails if a new signature appeared. |
| **Clean history** | The buyer-side check that every record is dead (can never move funds again). It runs in the buyer's browser (`packages/core/src/clean-history/`); the app disables Buy until it passes. kb/90 §7. |
| **Verdicts** | Per-record results of the check: `spent` (EVM nonce used / BTC outpoint spent, confirmed), `expired` (Solana blockhash too old), `unfunded` (BTC outpoint never existed), `message` (a signed message: never blocks), `settling` (seen but not yet confirmed), `unused` (could still be broadcast: **blocks Buy**), `foreign` (a BTC input that was never the Satchel's own coin), `unknown` (providers did not answer or disagreed). Rules: kb/90 §7.2; types in `packages/core/src/clean-history/types.ts`. |
| **Listing, freeze, quiet period** | `list` needs 250 blocks (a couple of minutes, `cooldown_blocks`) with no new signature. While listed, signing and transfers are refused. kb/90 §5.10, §5.12. |
| **Keyless birth** | The final contract account is created, funded, deployed, initialised and minted in **one** transaction with no AddKey, so no one can ever change its code or sign as it. kb/90 §5.16, `tools/deploy/keyless-birth.md`. |
| **Proceeds** | A seller's payout that failed to send is credited to `proceeds_of` and withdrawn later. |
| **Allowance, delegate** (C5) | The owner lets another account call `sign_for` up to a cap per coin per rolling 24 h. Cleared on every ownership change. `docs/specs/C5.md`. |
| **Offer** (C4) | Escrowed NEAR or USDC offered for any Satchel, bound to its `sig_count`. `docs/specs/C4-C6.md`. |
| **Inside assets** (C6) | NEAR and allow-listed NEP-141 tokens held by a Satchel on NEAR itself; they move with the token. `docs/specs/C4-C6.md`. |
| **`history_digest`** (C1) | A SHA-256 over a Satchel's records, so a third party can bind to an exact history. `docs/specs/C1-C2-C3-C7.md`. |
| **MPC** | NEAR's Chain Signatures signer contract, `v1.signer-prod.testnet`. kb/10. |

## Accounts and environments

| Name | Meaning |
|---|---|
| `satchelhq.testnet` | The team account (`<team>` in older docs). Parent of every account below. |
| `satchel.satchelhq.testnet` | The **final** contract. Born keyless on Day 10 (Nov 10); until then it does not exist. |
| `rc.satchelhq.testnet` | The release-candidate rehearsal of the keyless birth (Day 9). |
| `dev1.…`, `dev2.…` (`devN`) | Development deployments. The hosted app at https://usesatchel.xyz reads `dev2.satchelhq.testnet` until the final contract exists. |
| `alice`, `bob`, `carol` (`.satchelhq.testnet`) | Demo personas that own and trade the demo Satchels. |
| Role `dev` / `rc` / `final` | `NEXT_PUBLIC_CONTRACT_ROLE`: which contract the app trusts. `rc` and `final` enforce the strict lock and code-hash checks; `dev` only warns. kb/90 §4 (T5). |
| Fixture mode / live mode | `NEXT_PUBLIC_DATA_MODE`. Fixture (the default) uses built-in data and a simulated chain, fully offline; live reads NEAR testnet and the three chains. |
| **H** | The SHA-256 of the final, reproducible contract wasm. Filled into the README after the keyless birth. |
| **Day N** | Day N of November 2026 (Day 10 = Nov 10). The hackathon window ends Nov 14, 23:59 UTC. |
| **K** | Bitcoin confirmation depth used by the checker (1 on testnet; 6 on a future mainnet). |

## ID prefixes

| ID | What it is | Defined in |
|---|---|---|
| `spec §N`, `kb/90 §N` | Section N of the technical specification, the source of truth | [`kb/90-technical-spec.md`](../kb/90-technical-spec.md) |
| `kb/NN §X` | Section X of KB doc NN; `§TL;DR 6` = item 6 of its TL;DR | [`kb/README.md`](../kb/README.md) (index) |
| **INV-NN** | A contract or protocol invariant; each one is a named test | kb/90 §6 (sprint ones in §6.1) |
| **I-M1, I-M2** | Accounting invariants of offers and inside assets | [`docs/specs/C4-C6.md`](specs/C4-C6.md) |
| **E-NN** | Erratum: a place where an older doc disagrees with the spec, and which value won | kb/90 §13 |
| **A-NN** (in kb/90) | An `[ASSUMED]` fact and when it is re-checked | kb/90 §14 |
| **T1–T*n*** | A trust assumption | kb/90 §4 |
| **D-NN** | A decision and its reasoning (ADR-lite) | [`plan/decisions.md`](../plan/decisions.md) |
| **H-NN** | A decision reserved for the human (approvals, money, publishing) | `plan/decisions.md`, "Needs human" table |
| **Q-NNN** (three digits) | An answer in the official hackathon FAQ (HACKATHON.md). Q-001 (code counts from Oct 19), Q-005 (disclose libraries and AI), Q-017 (Claude Code and Codex screen projects) are the ones cited most | [`research/spikes/hackathon/HACKATHON.snapshot.md`](../research/spikes/hackathon/HACKATHON.snapshot.md); summary in [`kb/00`](../kb/00-hackathon-rules.md) |
| **Q-03, Q-04** (two digits) | Open questions from the round-two contract test audit, both fixed | [`docs/testing/contract.md`](testing/contract.md) §7.4, §7.7 |
| **C1–C7** | Contract features of the Oct 29 sprint: C1 history digest, C2 USDC on EVM, C3 four EVM testnets, C4 offers, C5 allowances, C6 inside assets, C7 message signing | Ideas: [`plan/feature-ideas.md`](../plan/feature-ideas.md); specs: [`docs/specs/`](specs/); status: [`plan/progress/feature-sprint.md`](../plan/progress/feature-sprint.md) |
| **A1–A7** | App-only feature ideas. Shipped: A1 social card, A2 give by link, A3 empty the Satchel. A4 was shipped then removed; A5–A7 were not built | same as C1–C7 |
| **S-NN** | Finding of the first adversarial contract review (tests `s0N_*` in `security_tests.rs`) | [`docs/security/contract-review.md`](security/contract-review.md) |
| **F-NN** (fuzzing) | Finding of the parser fuzzing campaign | [`docs/security/fuzzing.md`](security/fuzzing.md) |
| **M-NN, L-NN, I-NN** (`[SR-NN]`) | Medium, Low and Info findings of the sprint security review; `SR-NN` is the reviewer's raw number | [`docs/security/sprint-review.md`](security/sprint-review.md) |
| **AUDIT-01…04** | Bugs found by the contract test audit, all fixed | [`docs/testing/contract.md`](testing/contract.md) |
| **R3-A/S/X/I/D/N-N** | Findings of the round-three contract review: A allowances, S signing and the checker, X access control and views, I interface, D deploy, N notes (tests `review3_*`). Not the Phase-0 R-NN | [`docs/security/review-round-3.md`](security/review-round-3.md) |
| **R-NN** | Finding of the independent review of the Phase-0 design | [`plan/review.md`](../plan/review.md) |
| **SAT-NNN** | A task in the implementation plan | [`plan/implementation-plan.md`](../plan/implementation-plan.md) |
| **G0–G12** | A gate (go / no-go checkpoint) of the implementation plan | `plan/implementation-plan.md` |
| **S1, S2, H** (lanes) | Plan lanes: S1 contract and release, S2 frontend and checker, H human-only actions | `plan/implementation-plan.md` |
| **P0-NN** | An item of the pre-build checklist | [`plan/phase0-checklist.md`](../plan/phase0-checklist.md) |
| **A-01 … G-05** (in the launch checklist) | Launch steps, grouped by section A–G. Not the same as kb/90's A-NN | [`plan/launch-checklist.md`](../plan/launch-checklist.md) |
| **UX-NN, U3-NN** | UX decisions and open items of the UX spec | [`kb/80-ux-spec.md`](../kb/80-ux-spec.md) |
| **R2, R3, R4** (of kb/80, kb/81) | Revisions of the UX spec and design tokens. R4 = Satchel 2.0 brand | `kb/README.md` |
