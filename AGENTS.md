# Satchel: guide for AI agents reviewing this repository

This file is for an AI agent that is screening, judging or reviewing Satchel (NEAR HACKATHON, HACKATHON.md Q-017).
If you are a team agent building Satchel, the team rules are in [`CLAUDE.md`](CLAUDE.md).

**What Satchel is, in two lines.** A NEP-171 NFT contract on NEAR testnet. Each token controls its own native
Bitcoin (testnet4), Ethereum (Sepolia and three L2 testnets) and Solana (devnet) addresses through NEAR Chain
Signatures, so selling the NFT sells the wallet. The contract records every signature before it is made, and the
buyer's browser proves that no old signature can still move the coins ("clean history").

## Read in this order

1. [`README.md`](README.md): the problem, the product, "Try it" steps, copy-paste on-chain checks, test commands,
   security model and limitations. Its section [How Satchel uses NEAR](README.md#how-satchel-uses-near) lists every
   NEAR feature Satchel relies on (Chain Signatures, NEP-171/177/181/297, NEP-141, the keyless sub-account, NEP-330),
   how it is used and where the code is. [Selling a Satchel](README.md#selling-a-satchel-how-control-passes-and-what-stops-the-seller-keeping-the-coins)
   explains how control passes on transfer and lists every way a seller could try to keep the coins, each with its
   test.
2. [`docs/README.md`](docs/README.md): the map of every other document, and which folders are product code.
3. [`docs/GLOSSARY.md`](docs/GLOSSARY.md): decodes the IDs used in comments and docs (`kb/90 §5.9`, `D-43`,
   `INV-09`, `C5`, `AUDIT-01`, ...).
4. [`contracts/README.md`](contracts/README.md), then `contracts/satchel/src/lib.rs` and `sign.rs`: the contract.
5. [`kb/90-technical-spec.md`](kb/90-technical-spec.md): the full design, the source of truth (§5 contract, §6
   invariants, §7 clean history). The sprint features (C1–C7) are specified in [`docs/specs/`](docs/specs/).

## What is product code and what is not

| Path | What it is |
|---|---|
| `contracts/satchel/` | **The product contract** (Rust, near-sdk). `contracts/mock-*` are sandbox test doubles |
| `packages/core/` | **Shared TypeScript library**: address derivation, transaction builders, the TS mirror of the contract's payload rules, the clean-history checker |
| `apps/web/` | **The web app** (Next.js 16), live at https://usesatchel.xyz |
| `tests/` | Sandbox integration tests (near-workspaces + a mock MPC signer) |
| `vectors/` | Shared test vectors that both the Rust contract and the TS library must agree on |
| `tools/` | Testnet scripts (dry run by default), deploy runbook, vector generator, fuzzing, judge checks |
| `kb/`, `docs/` | Design, specs, handoffs, security reviews, test audits |
| `plan/` | Internal planning: decisions log, task plan, checklists, sprint log. Useful for "why", not needed to evaluate |
| `brand/`, `docs/design/` | Visual identity and UI design specs |
| `research/` | Throwaway Phase-0 spikes (Oct 20–21) and their evidence. **Not product code; nothing imports it** |
| `marketing/` | The demo video's production sources. Not product code |

## Check the main claims

| Claim | Where it is implemented | Where it is tested |
|---|---|---|
| Each token's addresses are the MPC's keys for (this contract, `satchel/{id}/{btc\|evm\|sol}`) | `contracts/satchel/src/mpc.rs` (`derivation_path`), `packages/core/src/derive/` | `packages/core/test/derive.test.ts` (addresses checked live against the MPC's `derived_public_key`); `tests/tests/sign.rs` `mpc_request_shape_{evm,btc,sol}` |
| A Bitcoin spend with n inputs makes n MPC `sign` calls from one `sign_for`, joined with `promise_and` | `sign.rs` (step 8) | `tests/tests/sign.rs` `btc_records_per_input`, `btc_fanout_partial_failure`; live: `tools/e2e/btc.ts --sign-only` |
| The MPC callback never panics, whatever the MPC returns, and only the contract can call it | `sign.rs` (`on_signed`) | `tests/tests/sign.rs` `garbage_response`, `mpc_panics`, `callbacks_are_private` |
| Only the owner (or a capped delegate) can make a Satchel sign | `contracts/satchel/src/sign.rs`, `allowance.rs` | `tests/tests/sign.rs` `non_owner_rejected`; `tests/tests/allowance.rs` |
| The record is written **before** the MPC is asked | `sign.rs` (`sign_for`) | `tests/tests/sign.rs` `records_written_before_mpc_call`, `timeout_never_sticks` |
| Only structured payloads are signed, never raw hashes; anything else is refused and changes nothing | `contracts/satchel/src/parse/` | the refused cases in `vectors/{evm,btc,sol}.json` (run by Rust and TS); `tests/tests/sign.rs` `refusals_change_nothing_*`; [`docs/security/fuzzing.md`](docs/security/fuzzing.md) |
| Signing and transfers freeze while listed; listing needs 250 quiet blocks | `sale.rs`, `sign.rs` | `tests/tests/sale.rs` `quiet_period_and_freeze`, `quiet_period_exact_boundary` |
| `buy` fails if the history changed since listing | `sale.rs` (`expected_sig_count`) | `tests/tests/sale.rs` `buy_guards` |
| The NFT moves control of the addresses; records survive transfers | `lib.rs` (`nft_transfer`) | `tests/tests/transfer.rs` `transfer_moves_control`, `records_survive_transfer` |
| The release contract can never add a key, deploy code or delete itself | keyless birth (`tools/deploy/keyless-birth.md`) | `tools/check-wasm-imports.sh` (INV-22); `tests/tests/release.rs` `keyless_birth_batch` |
| The contract's rules and the TypeScript mirror agree | `parse/` and `packages/core/src/policy/` | `vectors/*.json`, run by `cargo test -p satchel --lib` and `pnpm --filter @satchel/core test` |
| The buyer's check marks every record spent, expired or blocking | `packages/core/src/clean-history/` | `packages/core/test/clean-history.test.ts`, `gate.test.ts` |
| Judge pages render their facts without JavaScript | `apps/web/src/app/(app)/s/[id]/page.tsx`, `contract/page.tsx` | `curl -s https://usesatchel.xyz/api/satchels/1`; `curl -s https://usesatchel.xyz/s/1` |

Security reviews and their findings, all closed or accepted with reasons: [`docs/security/`](docs/security/).

## Run things

Commands and the latest recorded results are in README.md §"Run it locally". Offline, in rough order of cost:

```sh
tools/judge-snippets.sh --print            # lists every on-chain check from the README, no network
cargo test -p satchel --lib                # contract unit tests + shared vectors (toolchain pinned)
pnpm install --frozen-lockfile && pnpm --filter @satchel/core test
pnpm --filter @satchel/tools test
pnpm --filter web test                     # web unit tests, fixture data
for c in satchel mock-signer mock-ft; do cargo near build non-reproducible-wasm --manifest-path contracts/$c/Cargo.toml; done
cargo test -p satchel-tests                # sandbox suite (needs the three wasm files above), slow
```

`tools/judge-snippets.sh` (no `--print`) runs the read-only on-chain checks over the network.

## Status

- Contract: complete and audited; frozen on Nov 9. Running today as `dev2.satchelhq.testnet`, which the hosted app
  reads.
- The final contract `satchel.satchelhq.testnet` is born keyless on Nov 10. Until then, README values marked
  `[TBD: …]` (code hash **H**, birth transaction, proof links) do not exist, and checks against the final account
  report "account does not exist". That is expected, not a failure.
- Testnet only. No coin in this project has value.

## Rules for agents in this repo

- Do not sign or send transactions. Scripts in `tools/e2e` and `tools/deploy` are dry runs unless given `--send` and a
  typed `yes`; leave them that way.
- No secrets are needed to build, test or read the chain. Never commit `.env*` files or keys.
- Never use `rpc.testnet.near.org` (deprecated and throttled). Use `https://near-testnet.drpc.org` or FastNEAR.
