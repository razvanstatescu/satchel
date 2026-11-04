# Handoff: `release` (tools/e2e, tools/deploy, tools/*.sh, .github/workflows, README.md, .env.example)

> **Historical record** (2026-10-22). Many "today" statements below are no longer true:
> - the private git repo `github.com/razvanstatescu/satchel` exists since 2026-10-29, and agents push to it;
> - `satchelhq.testnet` and the personas `alice`, `bob`, `carol` exist since 2026-10-29 (D-48), and agents may sign
>   testnet transactions;
> - `dev1` and `dev2.satchelhq.testnet` are deployed, and the app is live at https://usesatchel.xyz (D-49) against dev2;
> - `LICENSE` (MIT) is in the repo.
>
> Still true: the final keyless birth of `satchel.satchelhq.testnet` (H-15) is planned for Nov 10 and has not happened,
> and the README still has `[TBD]` values for it. The tools test count grew after this (92 vitest tests on 2026-10-30).
> **Current truth:** `README.md` (judge-facing), `plan/launch-checklist.md` and `plan/human-actions-ready.md` for open
> steps, [`docs/testing/README.md`](../testing/README.md) for the latest measured test counts,
> `tools/deploy/keyless-birth.md` for the birth runbook. Shorthand: [docs/GLOSSARY.md](../GLOSSARY.md).

Status (2026-10-22): **all scripts written, unit-tested and run in dry-run / read-only mode. No transaction was
signed or sent, and nothing was broadcast.** At the time no git repo existed (D-39), so nothing was committed.

## 1. Files

| Path | What |
|---|---|
| `tools/lib/{config,near-rpc,run,tx,credentials,confirm,outcome,units}.ts` | Shared core. Config: team `satchelhq` (D-38), roles dev/rc/final, personas; every value can be overridden by flag or env. Then: the NEAR JSON-RPC (FastNEAR → dRPC failover; the near.org RPC is refused); `send_tx` `INCLUDED` plus a long-poll `tx` tracker; tx plans that are printed before signing; keys from `~/.near-credentials` (both layouts, the secret is never printed); the typed-"yes" gate |
| `tools/lib/visible-facts.py` | Checks that facts sit in the visible (not `hidden`) server HTML. Used by `monitor.sh` |
| `tools/e2e/{mint,evm,btc,sol,transfer,sale-near,sale-usdc,clean-history}.ts` | Spec §12.4 flows. `evm.ts`/`btc.ts --fanout` (R-14): `--preset funding` = plan §5.3 amounts, or `--targets "final#1-7 rc#1+2" --amount-each` |
| `tools/e2e/{common,plans,funding,checker}.ts` | Pure plan builders (gas/deposits from `@satchel/core/near` ATTACH), target parsing, the Node clean-history runner (2 NEAR, 2 Sepolia, mempool+emzy, devnet) |
| `tools/deploy/keyless-birth.ts` + `.md` | The 11-action birth (near-api-js 7.3.1) and its runbook checklist |
| `tools/judge-snippets.sh` | README commands with expected outputs: `--print`, `--offline` (wasm SHA-256 with both `sha256sum` and `shasum -a 256`), and live read-only by default |
| `tools/monitor.sh` | Daily read-only checks (plan §5.5): snippets, no-JS pages, JSON routes, liquid balance ≥ 5 NEAR, MPC version, near-connect manifest hash, endpoints, NearBlocks lag |
| `tools/test/*.test.ts`, `tools/vitest.config.ts` | 69 vitest tests |
| `.github/workflows/ci.yml` | `contracts` / `web` / `smoke` (spec §12.6); needs no secrets |
| `README.md` | Judge-facing draft; every value that does not exist yet is `[TBD: …]` |
| `.env.example` | Every spec §8.4 and apps/web variable, plus the tools and monitor variables; no values |

Edited outside my directories (minimal):
- `tools/package.json`: added `near-api-js 7.3.1`, `@scure/base`, `vitest 5.0.5`, `js-yaml`, plus the `e2e:*` and
  `deploy:*` scripts. `test` is now `vitest run && tsx vectors/gen.ts --check`, so core's vectors check still runs.
- `tools/tsconfig.json`: the include list now covers `lib`, `e2e`, `deploy` and `test`.
- `pnpm-lock.yaml`: updated by `pnpm install --offline`.

## 2. Results (real runs, 2026-10-22)

- `pnpm --filter @satchel/tools test`: **69 passed** (5 files), then the vectors freshness check (4 × ok).
  `tsc --noEmit`: clean.
  - The tests run the real send path against an in-memory RPC. They check that the signed tx decodes to the printed
    nonce, hash and signature, that `send_tx` used `INCLUDED`, that the tracker survives 408/TIMEOUT, and that a
    declined prompt signs nothing.
  - They check that the derived addresses equal `research/final-addresses.md` for 12 tokens.
  - They check that the birth batch decodes to 11 actions with no AddKey.
  - They spawn every script with `--offline`.
- Dry runs (read-only RPC): `evm`, `btc` (offline with `--utxo`, because dev1 #1 is unfunded), `sol`, `mint`,
  `transfer`, `sale-near`, `sale-usdc --refund-only`, `clean-history --role rc`, both fan-outs, and `keyless-birth`
  for rc. Each printed its plans followed by "DRY RUN: nothing was signed".
- `keyless-birth` on rc with the host wasm: H `bec41e44…8da584`, 11 actions, 170 Tgas prepaid, 5.14 NEAR attached.
  Pre-checks: rc does not exist (PASS); `satchelhq.testnet` does not exist (FAIL); `alice.satchelhq.testnet` does not
  exist (FAIL); MPC 3.17.0 (PASS); USDC exists (PASS).
- `judge-snippets.sh`, live against the **keyless spike account** `kb2.satchel-spk-chain-e9ea1a.testnet` (its tx
  `2AMrb8J8…`, H `97aecbe0…`): S1–S6, S8, S11 and S12 PASS. S7 and S9 FAIL, as expected, because the example NFT has
  no `config` or `satchel` method. Every README code block was also run against kb2 and printed the documented lines.
  Against `satchel.satchelhq.testnet` today: 4 pass · 3 fail (account does not exist) · 5 skip (TBD).
- `monitor.sh --quick`: endpoints 8/8 PASS; MPC 3.17.0; NearBlocks is 3.74 M blocks behind (WARN); contract balance
  FAIL (the account does not exist yet). Against a local `next start` of the existing fixture build, `/s/1`,
  `/contract` and `/market` show all their facts with JS off (PASS), and both `/api/*` routes return JSON (PASS).
- `actionlint 1.7.7` (Docker, with shellcheck): 0 findings. `shellcheck -S warning` on both scripts: 0 findings.

## 3. What each script needs before it can run for real

| Script | Needs |
|---|---|
| all `tools/e2e/*` | `satchelhq.testnet` and the personas created (**none exists on-chain today**); their keys in `~/.near-credentials/testnet/`; a deployed `dev1.` or `rc.satchelhq.testnet`; standing approval H-20 (b) |
| `evm.ts` | Sepolia ETH on the source Satchel (dev1 #1 0x3551…7db3 has 0) |
| `btc.ts` | ≥ 2 **confirmed** UTXOs on the source (dev1 #1 tb1qcg94…urc has 0) |
| `sol.ts` | Devnet SOL on the source (the human airdrops it; agents are banned from the faucet) |
| `sale-usdc.ts` | The contract registered at USDC (`--register` sends it from `satchelhq.testnet`); carol holding ≥ 5 USDC (Circle faucet) |
| `clean-history.ts` | rc born keyless; `SATCHEL_EXPECTED_CODE_HASH=<H>`; rc #2 with Sepolia ETH; for step 4, rc #1 with a confirmed BTC spend |
| `deploy/keyless-birth.ts` | The parent with ≥ 5.31 NEAR (rc) or ≥ 10.31 NEAR (final); alice existing; the reproducible wasm and its H; the final app host for `--base-uri`; for the final, the human's explicit "yes" (H-15) |
| `judge-snippets.sh` / `monitor.sh` | `SATCHEL_BIRTH_TX`, `SATCHEL_EXPECTED_CODE_HASH`, `SATCHEL_APP_URL` (and `SATCHEL_MANIFEST_SHA256` as the baseline; today's hash is `39bfb465…f5b1`) |
| CI `smoke` | The repository variables `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SATCHEL_CONTRACT`, `NEXT_PUBLIC_EXPECTED_CODE_HASH`, `SATCHEL_BIRTH_TX` |

## 4. Findings for others

- **human:** `satchelhq.testnet` is UNKNOWN_ACCOUNT on testnet (checked 2026-10-22), but a key for it exists in
  `~/.near-credentials/testnet/` (public key `ed25519:6WmrWh72…`). Create the account with that key soon: per
  `research/final-addresses.md`, nothing may be funded before it exists (R-02).
- **web:** with `CONTRACT_ROLE=dev` in fixture mode, `/contract` shows "This account has keys" in the dev banner and
  also "Access keys: Account is locked (no access keys)". The two contradict each other. Not a release blocker, since
  final builds use role `final`.
- **human / S1:** there is no `LICENSE` file (the README says MIT, as decided in D-38/H-03). Add it at repo creation.
- **README:** the README is a draft. Replace each `[TBD: …]` on Day 10–12. `/api/card/{id}.svg` is cited for the
  DYNAMIC NFTS hint; recheck it against the live route.

## 5. Deviations (safer choice)

- The e2e scripts ask for a typed `yes` before **every** tx. `--yes` skips the prompt for scripted runs under H-20 (b).
  `keyless-birth.ts` refuses `--yes` and refuses a non-TTY stdin.
- `sol.ts` confirms once and then refreshes a blockhash older than 10 s before signing, because devnet blockhashes
  last ≈ 36 s. The re-printed message differs only in `recent_blockhash`.
- The plan model cannot express AddKey, DeleteKey, DeleteAccount, Stake or global-contract actions, and
  `assertSafeActions` refuses CreateAccount and DeployContract outside the birth tool.
- `keyless-birth.ts` requires `--expected-sha256` for `satchel.<team>.testnet`. It also refuses a `base_uri` that is
  not `https://<host>/api/card/`.
- `trackTx` follows CLAUDE.md's async-plus-poll rule: the birth is sent with `send_tx INCLUDED` and tracked to
  `FINAL`, not sent with `wait_until: FINAL`.
- `runMain` calls `process.exit` when it finishes: viem's fallback ranking timer otherwise keeps `evm.ts` and
  `clean-history.ts` alive after they are done (found while running the dry runs).
