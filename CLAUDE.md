# Satchel — instructions for Claude

> **Reviewing or judging this project?** This file holds the build team's working rules. Start with
> [`AGENTS.md`](AGENTS.md) (reviewer guide: reading order, claims and where they are tested, commands), then
> [`README.md`](README.md). [`docs/GLOSSARY.md`](docs/GLOSSARY.md) decodes the IDs used below (D-xx, Q-xxx, H-xx, INV-xx).

Satchel is "an NFT that is a wallet". It is a NEP-171 contract on NEAR testnet whose tokens each control native
BTC (testnet4), EVM (Sepolia) and SOL (devnet) addresses through NEAR Chain Signatures (MPC signer
`v1.signer-prod.testnet`). It is being built for NEAR HACKATHON (dev window 2026-11-01T00:00Z → 2026-11-14T23:59:00Z;
the team targets submission by **Nov 13, 18:00 UTC**) in tracks `nfts` and `open`. Under the 2026-10-29 rules (D-47),
code counts from the announcement on **2026-10-19** (Q-001); Claude Code and Codex screen every project for reproducibility (Q-017); and the hosted demo stays
up to Nov 25 (Q-012). Re-read the live HACKATHON.md (`research/spikes/hackathon/check_rules.sh`) before submitting. The headline feature is a
buyer-verifiable **clean history** of every signature a Satchel has ever issued.

## Where things are
- `kb/90-technical-spec.md`: **source of truth** for the design (contract interface, invariants INV-xx, clean-history
  protocol, frontend/backend architecture, pinned versions §10, repo layout §11, testing §12, KB errata §13, open
  assumptions §14). `kb/README.md` indexes the other KB docs (00–81) and gives a reading order per lane.
- `plan/implementation-plan.md`: gates G0–G12, tasks SAT-xxx by day and lane (S1 contract, S2 frontend, H human),
  runbooks, cut lines, risks. `plan/decisions.md`: why (D-xx) and what the human must decide (H-xx).
  `plan/phase0-checklist.md`: pre-Nov-1 actions and the go/no-go table. `plan/review.md`: independent review.
- Design, in order of precedence:
  - `brand/`: **Satchel 2.0, the "Sticker S"** (D-44): a coral `#FF5C4D` tile with a white S, an ink `#1D1340` outline
    and a hard sticker shadow; chain charms with faces; Funnel Display, Onest and Geist Mono. **Day first, whatever
    the OS** (Night and System in the toggle); Night stickers are outlined `#8A82AE`. It is the **source of truth for
    visual identity**: read `brand/README.md` and `brand/design-system.md`. The tokens are in `kb/81` R4, and the 2.0
    specs and prototypes in `docs/design/satchel-2.0/`. Brand 1.0 (Strap S, brass and leather) is archived in
    `brand/archive/v1/`.
  - `kb/81-design-tokens.md` (R4): brand tokens plus derived tokens, with contrast verified.
  - `kb/80-ux-spec.md`: flows and components (see its R4 note: Give, Paused for sale, Stop selling, Add coins, `/satchels` home).
  - `kb/82-design-references.md`: Mobbin references for structure and behaviour.
  - Build UI to these, never to stock shadcn/ui defaults. Product facts (kb/90, plan/decisions.md) override brand
    sample copy; `brand/README.md` lists the corrections.
- `near_hackathon.md` (local only, gitignored, not in the repo): the original plan. Where it disagrees with the spec, the spec wins.
- Team account: `<team>` = **`satchelhq`** (D-38). Addresses are in `research/final-addresses.md`, and the open human steps are in
  `plan/human-actions-ready.md`. `satchelhq.testnet`, `dev1` (the contract is live), `alice`, `bob` and `carol` exist since
  2026-10-29 (D-48).
- `research/`: Phase 0 **throwaway** spikes and their `RESULTS.md` evidence. `research/accounts.md` lists the throwaway
  testnet accounts.

## Hard rules
1. **Implementation started 2026-10-21 by Razvan's decision (D-39)**, overriding the plan's "no product code before Nov 1"
   rule (inside the window per Q-001, D-47). The git repo exists: `github.com/razvanstatescu/satchel`, **private**, branch `main`, created by Razvan on
   2026-10-29. **Agents may push to the private repo without asking** (Razvan, 2026-10-29). Never force-push, and never make the repo public without his explicit "yes" (Day 13). Product code lives at the project root (`contracts/`, `tests/`,
   `packages/core`, `apps/web`, `tools/`, `vectors/`). Never copy or import `research/spikes` code. Implement from
   `kb/` instead. Every big chunk of work ships with unit tests and an end-to-end test (sandbox, local or testnet).
2. **HACKATHON.md AI-agent rules.** Never do any of the following without the human's explicit confirmation: send
   the submission; post on X or anywhere else; make the repo public, push or force-push; sign transactions, spend
   tokens or deploy to mainnet; commit secrets. Since 2026-10-29 (D-48) agents may create testnet accounts and sign
   testnet transactions without asking. Since 2026-10-29 agents may also push (not force-push) to the
   private repo. The final keyless birth (H-15), mainnet, force-pushes, making the repo public, the X post and the
   submission still need an explicit "yes". Stay inside their stated scope and caps. Everything outside them needs a fresh "yes".
3. **Never create `satchel.<team>.testnet` early.** The final contract account is *born keyless* on Day 10 (spec §5.16):
   one near-api-js transaction from `<team>.testnet` does CreateAccount, Transfer, DeployContract, `new` and
   `nft_mint` ×7, with **no AddKey**. That needs an explicit "yes" (H-15). Develop on `devN.<team>.testnet` and rehearse
   on `rc.` (Day 9).
4. Testnet only. The optional 1Click mainnet clip is human-run and needs its own approval; it is currently
   recommended to cut it.
5. Never commit keys or secrets. Keys live in env vars or `~/.near-credentials/`; never print them. The only `.env*`
   files in git are the templates (`.env.example`, `apps/web/.env.example`) and `apps/web/.env.production`, the hosted
   app's public settings: public values only, with `FASTNEAR_API_KEY` always left empty (it is set in Vercel).

## Environment gotchas (this machine)
- The global default Rust is an old 2023 nightly. Always pin `rust-toolchain.toml` (`channel = "1.93.0"`, target
  `wasm32-unknown-unknown`). Outside a pinned dir, use `cargo +1.93.0 near new`.
- near-sdk 5.29.1 with edition 2021 may resolve `near-sdk-env 0.1.7`, which needs rustc 1.95. Use edition 2024 or
  `cargo update near-sdk-env --precise 0.1.6`, and commit `Cargo.lock`. Don't adopt the Oct 19 5.30 RCs.
- Build contracts only with `cargo near build`, with `crate-type = ["cdylib"]`.
- **CPU budget.** Several agent sessions share this machine, so heavy runs must not overlap. Before starting
  `cargo near build`, `cargo test`, Playwright or a full `pnpm test`, check `ps` for another one already running and
  wait for it to finish. Run one package's suite rather than the whole workspace when that covers the change. Vitest is
  capped at `maxWorkers: 4` and the root `pnpm test` runs one package at a time; don't override either. Kill any
  `next start`/`next dev` server you started once you're done with it.
- **Never use `rpc.testnet.near.org`** (deprecated and throttled). Use FastNEAR (API key) with the dRPC fallback
  `https://near-testnet.drpc.org`. Submit transactions async and poll by hash; wallet promises are unreliable for
  long receipts.
- near CLI is `near` (near-cli-rs 0.30.1). Use `network-config testnet-fastnear` if the default RPC throttles. It
  **cannot** add actions after `deploy-contract`.
- `sepolia.drpc.org` no longer serves Sepolia on the free plan (2026-10-27). The NEAR `near-testnet.drpc.org` still works.
- History for README proofs comes from the FastNEAR tx API (`tx.test.fastnear.com`). Non-archival RPC forgets
  transactions after about 1.5 days, and NearBlocks testnet `/v1` is stale.

## Chain-signature facts that bite (evidence in kb/10, kb/30, kb/31, kb/32, kb/70)
- `sign_for` takes **structured unsigned payloads** (EVM type-2 tx, BTC BIP143 preimages + outputs, SOL message) and
  the contract hashes them itself. Never sign raw hashes: that is a blind signer, and clean history breaks.
- Write the signature record **inside `sign_for`**, before the MPC call. A timed-out request can still leak a valid
  signature. The callback is UX-only, must never panic, and must read the raw promise result.
- Never put two MPC `sign` calls as separate actions in one transaction (both time out). Fan out from the contract
  with `.and()`.
- MPC `sign` needs ≥ 15 Tgas and exactly 1 yocto per call; any excess deposit is refunded to the *contract*.
  Typical latency is about 7 s; the timeout is 200 blocks ≈ 115–120 s.
  Under load the testnet MPC times out often (≈ 1 in 4 requests on 2026-10-27; `research/spikes/smoke/RESULTS.md`).
  Retry an EVM send with the same nonce. `tools/e2e/{evm,btc,sol}.ts --sign-only` signs and verifies without funds.
- EVM yParity = `recovery_id` (never the `big_r` prefix). MPC `s` is already low-S.
- Never hardcode 21,000 gas for an EVM send. Since its 2026 fork, Sepolia charges **204,600 gas when a transfer
  creates the recipient account**, so use `estimateTransferGas` (`@satchel/core/chains/evm`). A failed out-of-gas tx
  still uses up its nonce.
- Solana devnet blockhashes live about **36 s**. Reject durable-nonce messages (`04000000`).
- Testnet4 blocks that carry transactions can be hours apart. Stage BTC funding and confirmations long before demos.
  `testnet4.mempool.space` is mainnet; use `mempool.space/testnet4`.
- Prove a lock with `view-account-summary` plus curl, not `near account list-keys` (an empty list also means
  "no such account").
- AI judges see only server-rendered HTML. Judge pages must render their facts without a Suspense fallback.
