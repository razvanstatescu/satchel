# Keyless birth runbook (kb/90 §5.16, plan/implementation-plan.md §6, SAT-082 / SAT-090)

One transaction from `satchelhq.testnet` creates the contract account, funds it, deploys the wasm, runs `new` and
mints ids 1–7 to `alice.satchelhq.testnet`. It has **no AddKey**, so the account never has a key. If any action
fails, the whole receipt reverts and no account is left behind. A *successful* birth with a wrong argument is
permanent, which is why rc is born first from the identical batch.

IDs: D-, H- and R-xx are in `plan/decisions.md`, SAT-xxx in `plan/implementation-plan.md` §3, INV-xx in kb/90 §6,
A-xx in kb/90 §14, S-02 in `docs/security/contract-review.md`.

Tool: `tools/deploy/keyless-birth.ts` (near-api-js 7.3.1). near-cli-rs 0.30.1 cannot add actions after
`deploy-contract`, so the CLI cannot build this batch. The sandbox test of the same batch is
`tests/tests/release.rs::{keyless_birth_batch, failed_birth_leaves_nothing}` (INV-31). The protocol path was verified
on testnet on 2026-10-21 (`research/spikes/keyless-birth/RESULTS.md`: 11 actions, 78.2 Tgas burnt, atomic on failure).

Approvals:
- **rc** (Day 9): standing approval H-20 (b).
- **final** (Day 10): the human's explicit "yes" (H-15) in the team channel, quoting the receiver and **H**. The tool
  also asks for a typed `yes` in a terminal. It refuses `--yes` and refuses piped stdin.

## 0. Preconditions (all must hold; tick each)

- [ ] `satchelhq.testnet` exists and its key is in `~/.near-credentials/testnet/satchelhq.testnet.json`.
  Check: `near account view-account-summary satchelhq.testnet network-config testnet-fastnear now`.
- [ ] The child does **not** exist: the tool's pre-check prints `PASS <child> does not exist yet`.
  For the final contract, also check that FastNEAR has no history for it:
  `curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"satchel.satchelhq.testnet"}'` → `"txs_count":0`.
- [ ] `alice.satchelhq.testnet` exists, because the mints go to it.
- [ ] Reproducible wasm built **twice** with an identical SHA-256 **H** (SAT-081):
  `cargo near build reproducible-wasm --manifest-path contracts/satchel/Cargo.toml`, then
  `shasum -a 256 target/near/satchel/satchel.wasm` (macOS) or `sha256sum target/near/satchel/satchel.wasm` (Linux).
- [ ] The sandbox suite and `tools/check-wasm-imports.sh` both pass on **that** artifact
  (`SATCHEL_WASM=… cargo test -p satchel-tests`).
- [ ] MPC `version` is one whose `sign` interface was checked live: `3.17.0` or `3.18.0` (the tool's pre-check, A-01;
  3.18.0 was checked with EVM and SOL sign-only runs on dev2 on 2026-11-05). For a newer version, run
  `tools/e2e/{evm,sol}.ts --sign-only` on dev2 first, then add it to `MPC_VERIFIED_VERSIONS`.
- [ ] App host is final (D-23, H-05). `base_uri` = `https://usesatchel.xyz/api/card/` unless H-05 changed;
  it is immutable after birth.
- [ ] H-26 is decided: either USDC init (default) or `--no-usdc`. rc and final must use the **same** init args.
- [ ] With USDC: the tool's pre-check prints `PASS USDC contract … is USDC with 6 decimals (ft_metadata)` (review
  R3-D-1). `usdc` is immutable and the contract prices USDC in 6-decimal base units. The tool also refuses any two of
  the child, `--mpc`, `--usdc` and `wrap.testnet` being the same account.
- [ ] The parent balance covers the Transfer, 7 × 0.02 NEAR and the 10× gas hold. The tool prints the requirement:
  about 10.31 NEAR for rc and 20.31 NEAR for final (the Transfer plus about 0.31 NEAR of mint deposits and gas hold).
- [ ] Final only: the tag `contract-v1.0.0` is on the rc1 commit (R-29) and **H** equals the rc's on-chain code hash.

## 1. Dry run and review (no key needed)

```bash
# rc (Day 9): --expected-sha256 is mandatory for rc too (rc and final run the same H)
pnpm --filter @satchel/tools deploy:keyless-birth \
  --child rc.satchelhq.testnet --base-uri https://usesatchel.xyz/api/card/ \
  --expected-sha256 <H>
# final (Day 10)
pnpm --filter @satchel/tools deploy:keyless-birth \
  --child satchel.satchelhq.testnet --base-uri https://usesatchel.xyz/api/card/ \
  --expected-sha256 <H>
```

Review the printout line by line:
- [ ] signer `satchelhq.testnet`, receiver = the child;
- [ ] 11 actions in this order: CreateAccount · Transfer · DeployContract · FunctionCall `new` · FunctionCall
  `nft_mint` ×7, with **no AddKey** (the tool asserts it as well);
- [ ] Transfer is 10 NEAR (rc) or 20 NEAR (final) (D-34, revised after security review S-02);
- [ ] DeployContract sha256 = **H**;
- [ ] `new` args = `{"mpc":"v1.signer-prod.testnet","usdc":"3e2210e1…b8af"|null,"base_uri":"https://<host>/api/card/"}`,
  byte-identical to rc's;
- [ ] 7 × `nft_mint {"receiver_id":"alice.satchelhq.testnet"}` at 20 Tgas and 0.02 NEAR each; 170 Tgas in total;
- [ ] every `wasm` and `pre` line is `PASS`, and the dry run exits 0. A `FAIL` makes the dry run exit 1 and `--send`
  refuse to sign. The `wasm` lines run even with `--offline`:
  - INV-22: `tools/check-wasm-imports.sh` finds no AddKey, DeployContract or DeleteAccount host import;
  - NEP-330: `build_info` is not null, `source_code_snapshot` names the full commit of `contract-v1.0.0-rc1`
    (override with `--expected-rev`), and `build_environment` ends with the `image_digest` pinned in
    `contracts/satchel/Cargo.toml`. A local `cargo near build non-reproducible-wasm` artifact has `build_info: null`
    and fails here on purpose;
- [ ] final only, the rc-twin pre-checks: `rc.satchelhq.testnet` runs H, has 0 access keys, and its `config` has the same
  `mpc_contract_id`, `usdc_contract_id`, `base_uri` and `cooldown_blocks` 250.

## 2. Send

```bash
pnpm --filter @satchel/tools deploy:keyless-birth --child <child> --base-uri <uri> --expected-sha256 <H> --send
```

- The tool fetches the nonce and block hash, prints the tx hash, then asks for `yes`. Only a typed `yes` signs.
- It submits with `send_tx` `wait_until: INCLUDED` and tracks the tx to `FINAL` by hash.
- On success it verifies the result: the account exists, it has 0 access keys, its code = **H**, ids 1–7 belong
  to alice, `config` has the init args, `cooldown_blocks` 250 and `next_token_id` 8, and `contract_source_metadata`
  names the release rev. It writes `docs/evidence/birth-<child>.json` and prints `record birth tx … · block A = …`.
  If any verify line is `FAIL` it still writes the evidence, then exits 1 (see §5).
- Record the tx hash and block **A** in the team channel.

## 3. Proofs (kb/90 §5.16 1–6; `docs/verify.md`)

The tool prints commands 1–4 with the hash filled in:
1. `POST /v0/transactions {"tx_hashes":["<hash>"]}` lists CreateAccount, Transfer, DeployContract and FunctionCall ×8.
   It has no AddKey.
2. `near account view-account-summary <child> network-config testnet-fastnear now` →
   `Local Contract (SHA-256 checksum hex)  <H>` and `Access keys  Account is locked (no access keys)`.
   Output checked on a keyless spike account, 2026-10-22.
3. `POST /v0/account {"account_id":"<child>","is_any_signer":true}` → `{"account_txs":[],"txs_count":0}`.
4. `POST /v0/account {"account_id":"<child>","desc":false,"limit":1}` → the birth tx at block **A** is the oldest entry.
5. `cargo near build reproducible-wasm` at tag `contract-v1.0.0` → SHA-256 = **H**. After the repo is public, also
   run `near contract verify deployed-at <child> network-config testnet-fastnear now`.
6. The first `sig_records(id, 0, 1).height` is greater than **A**. Check this once records exist.

`tools/judge-snippets.sh` runs proofs 1–4 automatically once `SATCHEL_BIRTH_TX` and `SATCHEL_EXPECTED_CODE_HASH` are set.
It runs the lock checks (S2, S3, S5) on `satchel.<team>.testnet` only. For rc, and for every proof in one command,
use `pnpm --filter @satchel/tools exec tsx deploy/verify-birth.ts --child <child> --expected-sha256 <H>`: proofs 1–4
and 6, config, NEP-330 and the two registrations, with PASS/FAIL per line, exiting 1 on any FAIL. The copy-paste
order for the whole release is `docs/handoff/release-runbook.md`.

## 4. After the birth

- [ ] USDC `storage_deposit {"account_id":"<child>","registration_only":true}` 0.00125 NEAR from `satchelhq.testnet`
  (skip if `--no-usdc`):
  `near contract call-function as-transaction 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af storage_deposit json-args '{"account_id":"<child>","registration_only":true}' prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' sign-as satchelhq.testnet network-config testnet-fastnear sign-with-legacy-keychain send`.
  `e2e:sale-usdc --register` prints and sends the same call.
- [ ] wNEAR `storage_deposit` on `wrap.testnet`, the same call with `wrap.testnet` as the receiver. **Without it, wNEAR
  deposits into a Satchel (C6) fail**, even though the app and contract are fine (`docs/specs/C4-C6.md` §2.3).
  dev2 was registered on 2026-10-29.
- [ ] Final: switch the app (`NEXT_PUBLIC_SATCHEL_CONTRACT`, `NEXT_PUBLIC_CONTRACT_ROLE=final`,
  `NEXT_PUBLIC_EXPECTED_CODE_HASH=<H>`), then start demo staging (SAT-091/092).

## 5. Failure handling

- **The tx failed:** nothing exists (the batch is atomic) and only gas was spent. Fix the cause, re-run the dry run,
  get a new "yes", send again.
- **The tx was rejected before execution** (`NotEnoughBalance`): top up the parent and retry.
- **The birth succeeded with a wrong argument:** this is permanent. Fall back to `satchel-v2.satchelhq.testnet` with new
  addresses and new funding (plan/implementation-plan.md §6 item 9). There is never a key on the account, so no trust window needs disclosing.
