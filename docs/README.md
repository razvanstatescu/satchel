# Satchel documentation map

Where every document lives and which one to read for a given question. The product overview and the try-it steps are in
the root [`README.md`](../README.md), the on-chain checks in [`verify.md`](verify.md); a guide for reviewing agents is in
[`AGENTS.md`](../AGENTS.md). Internal IDs (`kb/90 §5.9`, `D-43`, `INV-09`, `C5`, `AUDIT-01`, ...) are decoded in
[`GLOSSARY.md`](GLOSSARY.md).

## Which document answers what

| Question | Read |
|---|---|
| What is Satchel, and how do I try or verify it? | [`README.md`](../README.md) |
| How does it work, and what can it do? | [`how-it-works.md`](how-it-works.md) |
| Which NEAR features does it use, and how? | [`near.md`](near.md) |
| How does control pass on a sale, and what stops a seller keeping the coins? | [`selling.md`](selling.md) |
| How do I check the on-chain claims myself? | [`verify.md`](verify.md) |
| What does clean history trust, and what are the limits? | [`security-model.md`](security-model.md) |
| How do I run it and its tests? | [`development.md`](development.md) |
| How is it designed? (contract interface, invariants, clean-history protocol, app architecture) | [`kb/90-technical-spec.md`](../kb/90-technical-spec.md), the **source of truth** |
| How do offers, allowances, inside assets, USDC, more EVM chains, message signing and the history digest work? | [`specs/`](#specs-sprint-features) below; each one extends kb/90 |
| Why was something decided this way? | [`plan/decisions.md`](../plan/decisions.md) (D-xx) |
| Is it secure? What was found and fixed? | [`security/`](#security) below |
| How is it tested, and what does each suite cover? | [`testing/`](#testing) below |
| How does a given part of the code work, and what are its traps? | [`handoff/`](#handoff-engineering-notes) below |
| What does it look like, and why? | [`../brand/`](../brand/README.md), then [`design/`](#design) below |
| What did the research find before the design? | [`kb/README.md`](../kb/README.md) (kb/00 to kb/82) and [`research/`](../research/README.md) |

## specs/: sprint features

Interface specifications of the features added in the Oct 29 sprint. Each one extends kb/90 §5 (contract) and §7
(clean history) and wins over it where they differ.

| File | Features |
|---|---|
| [`specs/C1-C2-C3-C7.md`](specs/C1-C2-C3-C7.md) | C1 `history_digest`; C2 USDC transfers on EVM; C3 four EVM testnets (Sepolia, Base, Arbitrum, OP) with per-chain nonce state; C7 message signing (EIP-191, Solana off-chain) |
| [`specs/C4-C6.md`](specs/C4-C6.md) | C4 offers on any Satchel (NEAR or USDC escrow); C6 NEAR, USDC and wNEAR held inside a Satchel |
| [`specs/C5.md`](specs/C5.md) | C5 spending allowance: a delegate may sign up to a cap per coin per rolling 24 h |

## security/

| File | What it is |
|---|---|
| [`security/contract-review.md`](security/contract-review.md) | Adversarial review of the v1 contract (2026-10-23). No Critical or High findings; every finding (S-01…) is fixed or accepted, with its test |
| [`security/fuzzing.md`](security/fuzzing.md) | Fuzzing of the payload parsers that decide what the MPC signs: millions of generated inputs, no panics, no wrong accepts |
| [`security/sprint-review.md`](security/sprint-review.md) | Adversarial review of the sprint features C1–C7 (2026-10-29); findings M-/L-/I-xx and their status |
| [`security/seller-threat-model.md`](security/seller-threat-model.md) | Seller threat model (2026-11-09): every way a seller could try to keep the coins, the money inside or the buyer's payment, what stops each one and the test that proves it. Two app findings (G-1, G-2) fixed with tests |
| [`security/review-round-3.md`](security/review-round-3.md) | Round-three adversarial review of the whole contract (2026-11-04). No Critical or High findings in the contract; every R3-xx finding is fixed or mitigated (fix pass, same day); tests `review3_*` |

## testing/

| File | What it is |
|---|---|
| [`testing/README.md`](testing/README.md) | Overview: every suite, how to run it, and where its coverage map is |
| [`testing/contract.md`](testing/contract.md) | The Rust contract: unit and sandbox suites, a coverage matrix of every method and invariant, the bugs found (AUDIT-01…04) |
| [`testing/core-api.md`](testing/core-api.md) | `packages/core`, the web app's data layer and its API routes |
| [`testing/ui.md`](testing/ui.md) | The web app's Playwright user journeys (offline, fixture mode) |

## handoff/: engineering notes

Notes each workstream wrote for the next engineer: interfaces, decisions taken while building, traps, and how to run
things. They are dated records; the current test counts are in the root README.

| File | Covers |
|---|---|
| [`handoff/contract.md`](handoff/contract.md) | `contracts/satchel`: public interface, classifier check order, storage, gas |
| [`handoff/core.md`](handoff/core.md) | `packages/core`, the shared vectors and their schema |
| [`handoff/sandbox.md`](handoff/sandbox.md) | The sandbox suite (`tests/`), the mock signer and mock FT, the invariant-to-test map |
| [`handoff/web.md`](handoff/web.md) | `apps/web`: routes, data modes, wallet flows, what judges see in server HTML |
| [`handoff/release.md`](handoff/release.md) | Testnet scripts, the keyless-birth runbook, CI, README checks |

## design/

The UI is built to the Satchel 2.0 brand in [`../brand/`](../brand/README.md) and the tokens in
[`kb/81`](../kb/81-design-tokens.md); flows and screens are in [`kb/80`](../kb/80-ux-spec.md).

| Folder | What it is |
|---|---|
| [`design/satchel-2.0/`](design/satchel-2.0/README.md) | The specs for rebuilding the app in the 2.0 brand (Oct 26): screens, design system, motion, copy, QA and blind tests |
| [`design/site-refresh/`](design/site-refresh/README.md) | The landing page update after the feature sprint (Nov 3, D-51) |
| [`design/site-polish/`](design/site-polish/README.md) | The landing page presenting the mainnet product (Nov 3, D-52) |
| [`assets/readme/`](assets/readme/README.md) | The README's banner and app screens, and how to regenerate them |
