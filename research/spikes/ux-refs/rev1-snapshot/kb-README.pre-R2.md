# Satchel knowledge base (Phase 0, Oct 2026)

**Source of truth for v1: [`90-technical-spec.md`](90-technical-spec.md).** Where any other doc disagrees with it, the spec wins. Every known disagreement is listed in its **§13 Errata** table, together with the value that won.
Decisions and their rationale are in [`../plan/decisions.md`](../plan/decisions.md), which opens with the revision-2 changelog (the independent review `../plan/review.md`, R-01…R-41). The Nov 1–14 build plan is in [`../plan/implementation-plan.md`](../plan/implementation-plan.md), and what must happen before Nov 1 is in [`../plan/phase0-checklist.md`](../plan/phase0-checklist.md).
The docs 00–81 were written by nine research agents on 2026-10-21. Each one ends with "Deltas vs plan" and "Open questions". They are kept as evidence and are not edited after Phase 0. The raw spike data lives in `../research/spikes/*/RESULTS.md`. That code is throwaway: never copy it into the product.

Citation convention used in the plan documents: `kb/10 §TL;DR 6` = `10-mpc-signer.md`, section "TL;DR", item 6.

## Index

| Doc | What it answers | Read it when |
|---|---|---|
| [90-technical-spec.md](90-technical-spec.md) | **The v1 design:** contract interface, types, constants, classifiers, state machine, invariants, clean-history protocol, frontend and backend architecture, pinned versions, repo layout, testing, errata | First, and whenever you're unsure |
| [00-hackathon-rules.md](00-hackathon-rules.md) | Dates, the submission API contract, what AI and human judges can actually see, README/X/video rules, judge-runnable commands, the payload validator | Day 1 (rules check), Days 12–13 (README, submission) |
| [01-prior-art.md](01-prior-art.md) | `nft_key`, Lit PKPs, ERC-6551/Tokenbound, Ika, Metaplex Core; why "clean history" is Satchel's novelty; the empty testnet NFT-venue landscape | Writing the README "Prior art" / "How it differs" sections |
| [10-mpc-signer.md](10-mpc-signer.md) | MPC `sign` request/response, the 15 Tgas / 1 yocto rules, latency, timeout semantics, derivation math, how callbacks fail | Before touching `sign_for`, `on_signed` or `mpc.rs` |
| [11-chainsig-js-and-derivation.md](11-chainsig-js-and-derivation.md) | Offline derivation (noble), derivation test vectors, MPC-response → per-chain signature conversion, chainsig.js pitfalls (we don't use it) | Building `lib/derive` and `lib/near/outcome.ts` |
| [20-near-contract-stack.md](20-near-contract-stack.md) | near-sdk 5.29.1 idioms, NFT standard embedding, storage costs, events, the never-fail callback checklist, toolchain traps | Writing any contract code |
| [21-testing-sandbox.md](21-testing-sandbox.md) | near-workspaces 0.23.0, the mock-signer shape, yield/resume and `fast_forward` timeouts, test helpers, CI caching | Writing the sandbox tests and CI |
| [22-deploy-and-lock.md](22-deploy-and-lock.md) | Deploy, lock, reproducible builds, NEP-330 verification, storage staking, CLI false errors. v1 uses **keyless birth** instead of delete-keys (spec §5.16, E-38) | Day 4 (reproducible build + verify on dev); Days 9–10 release; README "Verify on-chain" |
| [30-bitcoin-testnet4.md](30-bitcoin-testnet4.md) | P2WPKH via MPC, BIP143 preimages, `.and()` fan-out, mempool.space API and CORS traps, fees and dust, BTC clean-history verdicts, faucets | BTC classifier (S1) and BTC send flow (S2) |
| [31-evm-sepolia.md](31-evm-sepolia.md) | The viem-only send recipe, `yParity = recovery_id`, RPC fallback list, nonces and replacement, the EIP-7702 risk, faucets | EVM classifier (S1) and EVM send flow (S2) |
| [32-solana-devnet.md](32-solana-devnet.md) | The Ed25519 message-signing path, **36 s blockhash life**, durable-nonce detection, rent (650,240 lamports), faucets | SOL classifier (S1) and SOL send flow (S2, Phase 2) |
| [40-frontend-wallet.md](40-frontend-wallet.md) | near-connect 0.11.4, which wallets exist on testnet, why wallet promises are unreliable, the tested long-poll tracker, the SigningProgress pattern | Before writing the wallet provider or the signing store |
| [41-web-stack.md](41-web-stack.md) | Next.js 16.4.2 specifics (Cache Components, SSR for judges, TS target), pinned web versions, RPC providers, polyfills, bundle sizes. Judge pages render blocking, not streamed (spec §8.1, E-40) | Day 1 scaffold; any SSR page |
| [50-data-and-indexing.md](50-data-and-indexing.md) | Why there is no DB or indexer; the FastNEAR tx API for events; per-chain balance/history endpoints; price sources | Activity tab, `/api/*` routes, the checker's data calls |
| [51-1click-and-usdc.md](51-1click-and-usdc.md) | Circle testnet USDC, `ft_transfer_call` runtime facts, the atomic `ft_on_transfer` design, the Oct 1 ghost-funds lesson, the 1Click API (the clip is cut in v1, D-19) | Sale contract code (S1); USDC buy UI (S2) |
| [70-security-and-clean-history.md](70-security-and-clean-history.md) | Threat model, why hash-only signing is unsound, classification rules, per-chain "dead" rules, the original invariant list | Before any security-relevant change; when writing SECURITY.md |
| [80-ux-spec.md](80-ux-spec.md) | Routes, screens, states, components, copy deck, error map, motion, accessibility, video beats | Every UI task (apply spec §8.9 and §13 corrections) |
| [81-design-tokens.md](81-design-tokens.md) | Colours, contrast tables, typography, radii, shadows, the Tailwind v4 CSS block | Day 1 tokens/layout; any visual work |

## Reading order for a new engineer

**Contract lane (S1), ≈ 2.5 h:**
1. spec §1–§7
2. 10 (TL;DR, `sign`, gotchas)
3. 20 (TL;DR, NFT embedding, never-fail callback)
4. 70 (TL;DR, threat model, classification)
5. 30 §3–§4 + §7
6. 31 §Unsigned EIP-1559 layout + §Security notes
7. 32 §Durable-nonce detector + §Contract-side policy
8. 21 (TL;DR, mock signer, helpers)
9. spec §5.16 (keyless birth), then 22 (TL;DR, reproducible build, verify)
10. 51 §S-8 design sketch + gotchas
11. spec §12–§14

**Frontend lane (S2), ≈ 2.5 h:**
1. spec §1–§3, §5.5, §5.14, §7, §8–§11
2. 41 (TL;DR, Next 16 changes, SSR pattern)
3. 40 (TL;DR, the tracker, the client flow)
4. 11 (snippets A–B)
5. 31 §viem recipe
6. 30 §1, §3, §5, §6
7. 80 (IA, screens, state machines, copy, error map)
8. 81
9. 50 (endpoints and snippets)
10. 32 §Send SOL (Phase 2)

**Release / PM (team lead), ≈ 1 h:**
1. 00 (TL;DR, checklists A–B, README skeleton)
2. spec §4 and §7.7
3. spec §5.16 (keyless-birth runbook), then 22 for background
4. `../plan/implementation-plan.md` §1, §5–§9
5. `../plan/phase0-checklist.md`

## Errata quick reference (full table: spec §13; revision 2 changes marked "rev 2")

- Solana blockhash life is **≈ 36 s**, not 60–90 s.
- New-account rent is **650,240 lamports**.
- **One 250-block quiet period before `list`; no post-listing buy cooldown** (rev 2). `buy` works as soon as a listing exists, bound to `(listing_id, expected_sig_count)` and gated by clean history. There is no `pending_signs` counter, no `ERR_COOLDOWN` and no "cooling down" pill.
- `sign_for` takes **structured payloads**. BTC takes one call with N preimages plus the serialized outputs; never several `sign` actions in one receipt.
- Gas: `min(300, 60 + 20·n)` Tgas attached; contract floor `30 + 18·n`.
- A missing BTC parent tx is **unfunded** (non-blocking), not live. The BTC builder never creates a txid that an old record references, and randomizes output order (rev 2).
- `nft_transfer_call` is disabled, and there are no NEP-178 approvals and no delegates in v1. A non-owner `nft_transfer` fails `ERR_NOT_OWNER` (behind it the standard says "Approval extension is disabled", not "Unauthorized"). The contract and MPC ids are refused as receivers, `ERR_BAD_RECEIVER` (rev 2).
- No chainsig.js, no database, no worker.
- **Keyless birth** (rev 2): `satchel.<team>.testnet` is created, funded, deployed, initialized and minted (ids 1–7) in **one tx from `<team>.testnet` with no AddKey** on Day 10, after an identical keyless rc birth on Day 9. It never has a key, so there is no trust window and no `delete-keys` step. Proofs: the birth tx's action list, an empty key list, an empty FastNEAR `is_any_signer` history, and an ascending history that starts at the birth.
- **NEAR tx proofs use the FastNEAR tx API** (`POST https://tx.test.fastnear.com/v0/transactions`) (rev 2). Non-archival RPC forgets a tx after ≈ 32–40 h, so never cite RPC `tx` for anything older than a day. NearBlocks pages are links only; its v1 API is frozen.
- **Judge pages render blocking** (`instant = false`, ids 1–7 prerendered) and are checked with an AI fetch tool, not only `curl` (rev 2). PPR streaming puts the data in hidden segments.
- The clean-history gate has three modes (`NEXT_PUBLIC_CONTRACT_ROLE`): dev = lock and code-hash checks as a warning; rc and final strict (rev 2).
- A locked (keyless) account prints "Account is locked (no access keys)". An empty key list alone also means "no such account".
- Never use `rpc.testnet.near.org`.
