# Screening rehearsal, 2026-11-09

> Part of the Satchel docs. Start at the [README](../../README.md); a guide for AI reviewers is in
> [`AGENTS.md`](../../AGENTS.md).

Two independent agents played the hackathon's AI screeners (Q-017) on fresh clones of `main` at `fa8e0f7`. Each had
only the repository, read-only internet and the published rules: no keys, no wallet, no notes from the team. One
checked reproducibility (install, build, every test suite, the reproducible build). The other checked features and
claims three ways: in the code, in a test, and live on testnet or the hosted app.

## What they found

**Reproducibility.** Every documented suite passed first time with the documented command: contract unit, mock
contracts, the sandbox suite, the shared library, the tools, web unit, typecheck, lint, the end-to-end suite with
accessibility checks, and the INV-22 wasm check. The recorded counts are in [`docs/testing/README.md`](../testing/README.md).

**Claims.** Address derivation, the record written before the signer network is called, delegate caps and offers
were confirmed in code, in tests and on testnet. The server's clean-history output matched what the agent read from
each chain itself.

**Problems, and what was done**

| Found | Done |
|---|---|
| `cargo near build reproducible-wasm` failed on every OS: 23 dangling gitlinks under `research/` broke cargo-near's clone of the repo | Gitlinks removed (`75b28c3`); the build now gets past the clone |
| The pinned build image is linux/amd64 only and crashes under emulation on Apple Silicon | CI job `reproducible` builds it on Linux x86_64 and publishes the SHA-256 and the wasm; [verify.md](../verify.md) step 6 says so |
| No live proof of the sale flow: no `list` or `buy` had ever run on the development contract | [`docs/evidence/`](../evidence/README.md): one testnet transaction per action, refusals included, checked by `tools/proofs.sh`; two Satchels left listed |
| Two balance checks in `tools/judge-snippets.sh` passed on empty addresses | They now report INFO, not PASS |
| `/contract` on the development contract labelled its commands with claims that are false there | Neutral labels on dev; the claims stay for the release and final contracts |
| Missing install steps (cargo-near, the Playwright browser, corepack); live dev mode pointed at a contract not yet born | Prerequisites block and the dev-contract variable in [development.md](../development.md) |
| Track wording: tokens are not sub-accounts; the card is drawn by the app | README "Built on NEAR" table reworded |

## What waits for the final contract (Nov 10)

The keyless lock, the birth transaction, the code hash H and the tag `contract-v1.0.0` exist only after the birth.
Until then the lock and birth checks skip, and the README's "Try it" addresses (the final contract's) differ from
what the hosted app shows (the development contract's). After the birth: fill every `[TBD]`, push the tag, compare
H with the CI `reproducible` job, regenerate the live proofs on the final contract, and run this rehearsal again.
