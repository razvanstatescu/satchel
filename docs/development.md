# Run Satchel locally and test it

> Part of the Satchel docs. Start at the [README](../README.md); a guide for AI reviewers is in [`AGENTS.md`](../AGENTS.md).

Prerequisites, the dev server, every test suite and what it covers, and the testnet scripts.


Prerequisites: Node (version in `.nvmrc`) with pnpm (corepack), plus Rust with the wasm32 target and cargo-near for
the contracts (`rust-toolchain.toml` pins the toolchain). The sandbox suite needs Linux or Apple Silicon.

```sh
pnpm install --frozen-lockfile
pnpm --filter web dev                        # http://localhost:3000, fixture data (no chain reads) by default
NEXT_PUBLIC_DATA_MODE=live pnpm --filter web dev   # live testnet reads; see .env.example for every variable
```

Tests, all offline. Every suite must pass in full; what each one covers is in
[`docs/testing/README.md`](testing/README.md), which also keeps the dated results of each run:

| Command | What it covers |
|---|---|
| `cargo test -p satchel --lib` | Contract unit tests: every guard and refusal, the payload classifiers, the shared vectors in `vectors/*.json` and the parser fuzz properties. A few slow review proofs are `#[ignore]`d; run them with `-- --include-ignored` |
| `cargo test -p satchel-tests` | The sandbox suite: the real contract on a local NEAR node, with a mock MPC signer and a mock USDC. First build the three wasm files: `for c in satchel mock-signer mock-ft; do cargo near build non-reproducible-wasm --manifest-path contracts/$c/Cargo.toml; done` |
| `pnpm --filter @satchel/core test` | The shared TypeScript library: derivation, transaction builders, the TS mirror of the contract's rules, the clean-history checker, and a browser-bundle check |
| `pnpm --filter @satchel/tools test` | The testnet scripts' dry runs and a check that the shared vectors are up to date |
| `pnpm --filter web test` / `test:e2e` (fixture mode) | The app's unit tests, and Playwright user journeys with accessibility checks |
| `tools/check-wasm-imports.sh` | INV-22: the release wasm cannot add a key, deploy code or delete the account |

The end-to-end suite builds the app in fixture mode and starts it on port 3340. If that port is taken, pick another
with `E2E_PORT`. `CI=1` makes Playwright start a fresh server instead of reusing one already running on that port:

```sh
CI=1 pnpm --filter web test:e2e                  # port 3340
CI=1 E2E_PORT=3400 pnpm --filter web test:e2e    # another free port
```

CI: `.github/workflows/ci.yml` runs the contract build and tests, the web build and the unit tests.

Testnet scripts (`tools/e2e`, `tools/deploy`) default to a **dry run** that prints exactly what would be signed.
They sign only with `--send` and a typed `yes`, using keys from `~/.near-credentials` (never from the repo).

The images in this file are rendered by `apps/web/scripts/readme-assets.mjs` from the app and the brand files; see
[`docs/assets/readme/`](assets/readme/README.md).
