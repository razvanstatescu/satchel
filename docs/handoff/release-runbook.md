# Release runbook: rc rehearsal and final keyless birth

The copy-paste order for launch checklist items D-02, D-03, E-01 and E-02 (`plan/launch-checklist.md` §D–E). The
reasons behind each step are in [`tools/deploy/keyless-birth.md`](../../tools/deploy/keyless-birth.md), and the IDs are
decoded in [`../GLOSSARY.md`](../GLOSSARY.md). Run every block from the repo root, on `main`.

**Who runs what.** Steps marked **[Razvan]** need you. Everything else an agent may run: testnet transactions from team
accounts are allowed (D-48, H-20 (b)). Two things have no shortcut:
- **Both births are sent from your own terminal.** `keyless-birth.ts --send` reads the typed `yes` from an interactive
  terminal only. It refuses `--yes` and piped stdin, and an agent's shell is not a terminal. The rc birth is covered by
  the standing approval, but you still type its `yes`.
- **The final birth also needs your explicit "yes" in the team channel (H-15)** before the send, quoting the receiver
  and **H**.

**Fixed values.** The contract is frozen at tag `contract-v1.0.0-rc1`, which points at commit
`843d35334f7fc7a88644fc39424bb137e7460094`. cargo-near writes that commit into the wasm's NEP-330 `build_info`, so **H**
belongs to this commit only. The rc, the final and the later `contract-v1.0.0` tag all use the CI reproducible wasm of
that commit. `base_uri` is `https://usesatchel.xyz/api/card/` and the MPC signer is `v1.signer-prod.testnet`. USDC is
Circle's testnet contract `3e2210e1…b8af`. The Transfer is 10 NEAR for rc and 20 NEAR for the final, and the 7 mints go
to `alice.satchelhq.testnet`.

## 0. Session setup (every terminal you use)

```bash
cd ~/Documents/Work/near/Satchel && git checkout main && git pull --rebase
export H=<the 64-hex SHA-256 from the CI job>     # step (a) checks it
export REV=843d35334f7fc7a88644fc39424bb137e7460094
export WASM="$PWD/target/near/satchel-ci/satchel.wasm"
export BASE_URI=https://usesatchel.xyz/api/card/
export SATCHEL_EXPECTED_CODE_HASH=$H                # the strict gate for the e2e scripts
kb() { pnpm --silent --filter @satchel/tools deploy:keyless-birth --wasm "$WASM" --base-uri "$BASE_URI" --expected-sha256 "$H" "$@"; }
vb() { pnpm --silent --filter @satchel/tools exec tsx deploy/verify-birth.ts --expected-sha256 "$H" "$@"; }
mkdir -p target/release-logs
```

`git rev-parse contract-v1.0.0-rc1^{commit}` must print `$REV`. The tools read the tag to check `build_info`. If the
tag is missing locally, run `git fetch --tags`, or pass `--expected-rev $REV` to `kb` and `vb`.

## (a) Check the CI wasm

1. **[Razvan]** On GitHub, open Actions → workflow `ci` → the run for commit `843d353` → job `reproducible`. Note the
   `sha256sum` line in the job summary: that is **H**. Download the artifact
   `satchel-reproducible-wasm-843d35334f7fc7a88644fc39424bb137e7460094` (a zip). Then click **Re-run job** once: the
   second run must print the same H (SAT-081 records H twice). Paste H and both run URLs in the team channel.
2. Unpack it and compare:
   ```bash
   mkdir -p target/near/satchel-ci
   unzip -o ~/Downloads/satchel-reproducible-wasm-843d35334f7fc7a88644fc39424bb137e7460094.zip -d target/near/satchel-ci
   shasum -a 256 "$WASM"
   ```
   Expect `$H  …/target/near/satchel-ci/satchel.wasm`, the same value in both CI runs.
3. INV-22 import check:
   ```bash
   bash tools/check-wasm-imports.sh --list "$WASM"; echo "exit $?"
   ```
   Expect the last two lines `INV-22 OK: …/satchel.wasm` and `exit 0`. The `promise actions:` line lists only
   `promise_batch_action_function_call_weight` and `promise_batch_action_transfer`.
4. NEP-330 binding (the birth tool checks it again in (b)):
   ```bash
   strings -n 8 "$WASM" | grep -o '"build_info":{[^}]*}'
   ```
   Expect `"source_code_snapshot":"git+https://github.com/razvanstatescu/satchel?rev=843d35334f7fc7a88644fc39424bb137e7460094"`
   and a `"build_environment"` ending in `@sha256:c9655eaf…b5bb` (the `image_digest` in `contracts/satchel/Cargo.toml`).
   A null `build_info` means the file is a local non-reproducible build: stop.
5. The sandbox suite on this exact artifact (heavy: first check that no other `cargo test`, `cargo near` or Playwright
   run is going, with `ps aux | grep -E "cargo (test|near)|playwright" | grep -v grep`):
   ```bash
   SATCHEL_WASM="$WASM" cargo test -p satchel-tests 2>&1 | tail -5
   ```
   Expect `test result: ok` for every test binary and no `FAILED`.

## (b) rc: dry run, then send

1. Dry run (an agent may run it; no key is used):
   ```bash
   kb --child rc.satchelhq.testnet > target/release-logs/rc-dry.txt 2>&1; echo "exit $?"; cat target/release-logs/rc-dry.txt
   ```
   Expect `exit 0`, and check these lines:
   - `H         $H`, and `DeployContract <size> bytes, sha256 $H`;
   - `wasm      PASS  INV-22 import check …` and `wasm      PASS  reproducible build_info names rev 843d3533…`;
   - `pre       PASS` on every line: rc does not exist yet; `satchelhq.testnet` exists and its balance is at least
     10.31 NEAR; MPC version 3.17.0 or 3.18.0; USDC exists and is USDC with 6 decimals; `alice.satchelhq.testnet` exists;
   - `actions   11`, in this order: `1. CreateAccount`, `2. Transfer 10 NEAR`, `3. DeployContract`, `4. FunctionCall new`,
     then `5.`–`11.` `FunctionCall nft_mint  gas 20 Tgas  deposit 0.02 NEAR` with args
     `{"receiver_id":"alice.satchelhq.testnet"}`. No AddKey anywhere;
   - `init      new {"mpc":"v1.signer-prod.testnet","usdc":"3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af","base_uri":"https://usesatchel.xyz/api/card/"}`;
   - `total     gas 170 Tgas, attached 10.14 NEAR`;
   - `DRY RUN: nothing was signed or sent.`
   Any `FAIL` makes the dry run exit 1, and `--send` would refuse. Fix the cause before going on.
2. **[Razvan, your terminal]** Send it. Run step 0 in that terminal first:
   ```bash
   kb --child rc.satchelhq.testnet --send
   ```
   The tool prints the batch again, then the nonce, the block and `tx hash <hash>`, then asks
   `Type "yes" to sign and send:`. Type `yes`. Expect:
   - `result    SUCCESS`;
   - every `verify` line `PASS`: rc exists; 0 access keys; code = H; ids 1–7 owned by alice; config
     mpc/usdc/base_uri/cooldown 250/next_token_id 8; `contract_source_metadata` names rev 843d3533…;
   - `evidence  …/docs/evidence/birth-rc.satchelhq.testnet.json`;
   - `record    birth tx <hash> · block A = <height>`.
   If any `verify` line says `FAIL`, the tool exits 1. A landed rc with a wrong argument costs only the rc: re-birth
   as `rc2.satchelhq.testnet` after the fix (`kb --child rc2.satchelhq.testnet …`).
3. Record and commit (an agent may do it):
   ```bash
   export RC_TX=$(python3 -c 'import json;print(json.load(open("docs/evidence/birth-rc.satchelhq.testnet.json"))["tx_hash"])')
   export RC_A=$(python3 -c 'import json;print(json.load(open("docs/evidence/birth-rc.satchelhq.testnet.json"))["block_height"])')
   echo "rc birth tx $RC_TX block A $RC_A"
   git add docs/evidence/birth-rc.satchelhq.testnet.json && git commit -m "rc keyless birth evidence" && git pull --rebase --autostash && git push
   ```

## (c) rc checks (D-02, D-03)

An agent runs all of these, in this order. Each one ends in a line you can compare.

1. **Registrations** at USDC and wrap.testnet, 0.00125 NEAR each, from `satchelhq.testnet`. Without the wrap.testnet one,
   wNEAR deposits into a Satchel fail (C6).
   ```bash
   for FT in 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af wrap.testnet; do
     near contract call-function as-transaction $FT storage_deposit json-args '{"account_id":"rc.satchelhq.testnet","registration_only":true}' \
       prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' sign-as satchelhq.testnet network-config testnet-fastnear sign-with-legacy-keychain send
   done
   ```
   Expect two successful transactions. `vb` checks the result in step 2.
2. **Proofs 1–4, config, NEP-330, registrations** (read-only):
   ```bash
   vb --child rc.satchelhq.testnet | tee target/release-logs/rc-verify-1.txt
   ```
   Expect `PASS` on every proof 1–4 line. Proof 1: the tx is `satchelhq.testnet → rc.satchelhq.testnet`, the 11 actions,
   no AddKey, DeployContract code sha256 = H, `new` = the init args, 7 × `nft_mint` to alice, 0 failed receipts.
   Proof 2: code = H and 0 access keys. Proof 3: `is_any_signer txs_count 0`. Proof 4: the oldest tx is the birth tx at
   block A. Then `config` and `contract_source_metadata` PASS, and `USDC storage_balance_of … {"total":"1250000000000000000000","available":"0"}`
   and the same line for wrap.testnet. Proof 6 lines are `INFO … has no signature record yet` at this point. The last
   line is `result    ALL PASS`.
3. **Proof 2 in the CLI form judges use:**
   ```bash
   near account view-account-summary rc.satchelhq.testnet network-config testnet-fastnear now
   ```
   Expect `Local Contract (SHA-256 checksum hex)  $H` and `Access keys  Account is locked (no access keys)`.
4. **The BTC record for scenario step 4** (start it now: testnet4 blocks can be hours apart). rc #1
   `tb1q5y8ttdym4snraa9ujay3stza7avyf9ltf40f5x` already holds 2 confirmed UTXOs. alice sweeps them back to rc #1:
   ```bash
   pnpm --filter @satchel/tools e2e:btc --role rc --token 1 | tee target/release-logs/rc-btc-dry.txt     # dry run
   pnpm --filter @satchel/tools e2e:btc --role rc --token 1 --send --yes | tee target/release-logs/rc-btc.txt
   ```
   Expect `leg 1/1: … → self (#1)` with 2 inputs, then `result SUCCESS` for `sign_for`, and a `broadcast
   https://mempool.space/testnet4/tx/<txid>` line. MPC under load times out often: if `sign_for` fails, run the same
   command again: the builder bumps the fee by 1 sat or flips nSequence to avoid a txid an earlier record holds
   (R-05). Then wait for 1 confirmation:
   `curl -s https://mempool.space/testnet4/api/tx/<txid>/status` → `"confirmed":true`.
5. **The clean-history scenario on rc #2** (owner alice, buyer carol; rc #2 `0x2f5b…1ce5` holds Sepolia ETH):
   ```bash
   pnpm --filter @satchel/tools e2e:clean-history --role rc --token 2 --btc-token 1 | tee target/release-logs/rc-ch-dry.txt
   pnpm --filter @satchel/tools e2e:clean-history --role rc --token 2 --send --yes | tee target/release-logs/rc-ch.txt
   ```
   Expect these `check` lines, all `PASS`, in order:
   `sign_for succeeded (signature exists, NOT broadcast)` · `list succeeded` · `step 1: aggregate blocked == blocked` ·
   `step 1: Buy disabled` · `delist succeeded` · a `broadcast https://sepolia.etherscan.io/tx/…` line ·
   `relist succeeded` · `step 2: aggregate clean == clean` · `step 2: Buy enabled` ·
   `stale buy failed with ERR_LISTING_CHANGED` · `buy with the current (listing_id, expected_sig_count) succeeded` ·
   `owner is now carol.satchelhq.testnet`. Step 1 waits out the 250-block quiet period before it lists. If a step
   fails on a testnet hiccup (MPC timeout, slow Sepolia), resume with the same command plus `--from-step 2` or
   `--from-step 3`. Never restart from step 1 while #2 is listed. The tool refuses to run with
   `--send` if `SATCHEL_EXPECTED_CODE_HASH` is unset.
6. **Scenario step 4** once the BTC sweep has 1 confirmation:
   ```bash
   pnpm --filter @satchel/tools e2e:clean-history --role rc --btc-token 1 --from-step 4 --send --yes | tee target/release-logs/rc-ch-4.txt
   ```
   Expect `check     PASS  a BTC item is spent`.
7. **Proof 6** now that #1 and #2 have records:
   ```bash
   vb --child rc.satchelhq.testnet | tee target/release-logs/rc-verify-2.txt
   ```
   Expect `proof 6: #1 first record at block … > A …` and the same for #2 as `PASS`, an owners line showing #2 with
   `carol.satchelhq.testnet`, and `result    ALL PASS`.
8. **The app against rc with the strict gate** (a local live build; Vercel is not needed). This is heavy: run it only
   when `ps aux | grep -E "next (build|start|dev)|playwright|cargo (test|near)" | grep -v grep` prints nothing. Port 3351
   (never 3100).
   ```bash
   cd apps/web
   export NEXT_PUBLIC_DATA_MODE=live NEXT_PUBLIC_CONTRACT_ROLE=rc NEXT_PUBLIC_SATCHEL_CONTRACT=rc.satchelhq.testnet \
     NEXT_PUBLIC_EXPECTED_CODE_HASH=$H NEXT_PUBLIC_APP_URL=http://127.0.0.1:3351
   pnpm exec next build > ../../target/release-logs/rc-web-build.log 2>&1 && (pnpm exec next start -p 3351 > ../../target/release-logs/rc-web.log 2>&1 &)
   until curl -sf http://127.0.0.1:3351/api/contract >/dev/null; do sleep 2; done
   curl -s http://127.0.0.1:3351/api/contract | python3 -c 'import json,sys;d=json.load(sys.stdin);print({k:d[k] for k in ("account_id","role","locked","access_keys","code_matches","any_signer_tx_count","birth_tx")});print("AddKey in birth:",any("AddKey" in a for a in d["birth_actions"]))'
   curl -s http://127.0.0.1:3351/api/clean-history/2 | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["role"],d["aggregate"],d["unsafe_reason"])'
   cd ../..
   SATCHEL_CONTRACT=rc.satchelhq.testnet SATCHEL_BIRTH_TX=$RC_TX SATCHEL_BIRTH_BLOCK=$RC_A SATCHEL_APP_URL=http://127.0.0.1:3351 \
     SATCHEL_WASM="$WASM" SATCHEL_BTC_ADDRESS=tb1q5y8ttdym4snraa9ujay3stza7avyf9ltf40f5x SATCHEL_EVM_ADDRESS=0x421ee6970e238e6fb0c08aa26e12bce686b1b7d7 \
     bash tools/judge-snippets.sh | tee target/release-logs/rc-snippets.txt | grep -E '^\[S|PASS|FAIL|SKIP|INFO'
   pkill -f "next start -p 3351"
   ```
   Expect:
   - `/api/contract`: `'account_id': 'rc.satchelhq.testnet', 'role': 'rc', 'locked': True, 'access_keys': 0,
     'code_matches': True, 'any_signer_tx_count': 0, 'birth_tx': '<RC_TX>'` and `AddKey in birth: False`;
   - `/api/clean-history/2`: `rc clean None`;
   - snippets: the header says `lock checks on`; S1–S10 and S13 `PASS`, S11 and S12 `INFO`, and no `FAIL` or `SKIP`.
     The lock and birth checks (S2–S6) run on rc too, given `SATCHEL_BIRTH_TX` and `SATCHEL_BIRTH_BLOCK` as above.
   This build leaves an rc build in `apps/web/.next`. The next fixture Playwright run rebuilds it. The same commands
   were run against dev2 with role `rc`. The build reads the exported values over `.env.production`, and
   the strict gate fails closed on a contract with a key: `/api/clean-history/2` answered `rc unsafe keys`.
9. **`near contract verify`** cannot run yet: it clones the `source_code_snapshot` repo, which stays private until
   Day 13. After **[Razvan]** makes the repo public, run it for both contracts (heavy, Docker; it needs x86_64 or
   working emulation):
   ```bash
   near contract verify deployed-at rc.satchelhq.testnet network-config testnet-fastnear now
   near contract verify deployed-at satchel.satchelhq.testnet network-config testnet-fastnear now
   ```
   Expect each one to report that the rebuilt code hash matches the deployed one. Until then proof 5 rests on step (a):
   the CI rebuild gives H twice, and the on-chain code is H.

## (d) Go / no-go for the final (DP6)

The final birth goes ahead only when every row is green. The deadline is Day 10 12:00 UTC (hard deadline Day 11
12:00 UTC).

| # | Check | Green when |
|---|---|---|
| 1 | (a) 1–2 | the same H from two CI runs, and `shasum` of the downloaded file = H |
| 2 | (a) 3–5 | `INV-22 OK`; `build_info` names rev 843d3533… and the pinned digest; the sandbox suite is ok on `$WASM` |
| 3 | (b) 2 | rc `result SUCCESS`, every `verify` line PASS, evidence committed |
| 4 | (c) 1–3 | registrations done; `vb` `ALL PASS`; the CLI says `Account is locked` with code H |
| 5 | (c) 5–7 | every clean-history `check` PASS, step 4 included; proof 6 PASS for #1 and #2 |
| 6 | (c) 8 | `/api/contract` and `/api/clean-history/2` as expected; snippets with no FAIL |
| 7 | MPC | `pre PASS  MPC … version 3.17.0 or 3.18.0` in the final dry run. A newer version needs `tools/e2e/{evm,sol}.ts --sign-only` on dev2 first (A-01) |

No-go: fix the cause. If the contract has to change, that means a new commit, a new tag `contract-v1.0.0-rc2`, a new H
and a new rc (`rc2.satchelhq.testnet`), then this runbook from (a) again. Never birth the final from a wasm that no rc
has run.

## (e) The final

1. Dry run (an agent may run it):
   ```bash
   kb --child satchel.satchelhq.testnet > target/release-logs/final-dry.txt 2>&1; echo "exit $?"; cat target/release-logs/final-dry.txt
   diff <(sed 's/rc\.satchelhq/X/g;s/satchel\.satchelhq/X/g' target/release-logs/rc-dry.txt) \
        <(sed 's/rc\.satchelhq/X/g;s/satchel\.satchelhq/X/g' target/release-logs/final-dry.txt)
   curl -s -X POST https://tx.test.fastnear.com/v0/account -H 'content-type: application/json' -d '{"account_id":"satchel.satchelhq.testnet"}'
   ```
   Expect `exit 0`, with the same lines as (b) 1 plus:
   - the banner `· FINAL CONTRACT (H-15: needs the human's explicit "yes")`;
   - `2. Transfer 20 NEAR`, `total     gas 170 Tgas, attached 20.14 NEAR`, and the parent balance at least 20.31 NEAR;
   - the rc-twin pre-checks, all `PASS`: `rc.satchelhq.testnet runs H`, `has 0 access keys (0)`, and
     `config has the same mpc, usdc, base_uri and cooldown 250`.
   The `diff` shows only the banner, the balance line, `Transfer 20 NEAR`, `attached 20.14 NEAR`, the nonce line and
   the added rc-twin lines. The `init` and `args` lines must not appear in the diff: the init args are byte-identical
   to the rc's. FastNEAR answers `{"account_txs":[],"txs_count":0}`: the name has no history.
2. **[Razvan] H-15: your explicit "yes".** Read `target/release-logs/final-dry.txt` line by line against
   `plan/launch-checklist.md` E-01: 11 actions, **no AddKey**, Transfer 20 NEAR, wasm = H, `base_uri` =
   `https://usesatchel.xyz/api/card/`, 7 mints to alice. Then post in the team channel:
   `yes: keyless birth of satchel.satchelhq.testnet with H=<H>`. No agent sends anything for the final before this
   message exists.
3. **[Razvan, your terminal]** Send. Run step 0 in that terminal first:
   ```bash
   kb --child satchel.satchelhq.testnet --send
   ```
   Run it without a pipe (no `| tee`), so the prompt talks to your terminal. Check that the printed batch is the one
   you approved, then type `yes`. Expect `result    SUCCESS`, every `verify`
   line `PASS`, `evidence  …/docs/evidence/birth-satchel.satchelhq.testnet.json` and
   `record    birth tx <hash> · block A = <height>`. If the tx failed, nothing exists: fix the cause, run the dry run
   again, and get a new "yes". If it landed with a `verify` FAIL, the result is permanent: follow
   `tools/deploy/keyless-birth.md` §5.
4. Record the birth tx and block A (an agent may do it):
   ```bash
   export FINAL_TX=$(python3 -c 'import json;print(json.load(open("docs/evidence/birth-satchel.satchelhq.testnet.json"))["tx_hash"])')
   export FINAL_A=$(python3 -c 'import json;print(json.load(open("docs/evidence/birth-satchel.satchelhq.testnet.json"))["block_height"])')
   echo "final birth tx $FINAL_TX block A $FINAL_A"     # post both in the team channel
   git add docs/evidence/birth-satchel.satchelhq.testnet.json && git commit -m "Final keyless birth evidence" && git pull --rebase --autostash && git push
   ```
5. Registrations, the same as (c) 1 with the final account:
   ```bash
   for FT in 3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af wrap.testnet; do
     near contract call-function as-transaction $FT storage_deposit json-args '{"account_id":"satchel.satchelhq.testnet","registration_only":true}' \
       prepaid-gas '30 Tgas' attached-deposit '0.00125 NEAR' sign-as satchelhq.testnet network-config testnet-fastnear sign-with-legacy-keychain send
   done
   ```
6. Verify:
   ```bash
   vb --child satchel.satchelhq.testnet | tee target/release-logs/final-verify.txt
   near account view-account-summary satchel.satchelhq.testnet network-config testnet-fastnear now
   SATCHEL_BIRTH_TX=$FINAL_TX SATCHEL_BIRTH_BLOCK=$FINAL_A SATCHEL_WASM="$WASM" bash tools/judge-snippets.sh | grep -E '^\[S|PASS|FAIL|SKIP|INFO'
   ```
   Expect `result    ALL PASS` (proof 6 INFO until demo staging signs), then `Account is locked (no access keys)`
   with code H. The snippets show S1–S9 and S13 `PASS`, including the lock checks S2, S3 and S5. S10 compares the
   hosted app, so it passes only after the production switch (E-03).
7. Tag the release on the rc1 commit (a normal push, never a force-push):
   ```bash
   git tag -a contract-v1.0.0 $REV -m "Satchel contract v1.0.0: deployed keyless at satchel.satchelhq.testnet, H=$H, birth tx $FINAL_TX"
   git rev-parse contract-v1.0.0^{commit}      # expect $REV
   git push origin contract-v1.0.0
   ```
8. Next: E-03, the production switch, in `apps/web/.env.production` and Vercel:
   `NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet`, `NEXT_PUBLIC_CONTRACT_ROLE=final`,
   `NEXT_PUBLIC_EXPECTED_CODE_HASH=$H`. Then demo staging (E-04).

## (f) Post-birth: fill, production switch, proofs, rehearsal (E-03, E-05, F-01, F-03, F-07)

Starts when (e) 1–7 are done: the birth evidence is committed, `vb` says `ALL PASS`, the tag is pushed. Same
terminal setup as step 0 (`$H`, `$WASM`, `$FINAL_TX`, `$FINAL_A`). No step here signs anything except (f) 6, the
proof set, which uses the persona keys (D-48) and never Satchel #4.

**How production deploys.** The Vercel project `satchel` (root `apps/web`) is linked to this repo: **every push to
`main` builds and promotes a production deploy** of https://usesatchel.xyz, in about a minute. The Vercel env holds
no `NEXT_PUBLIC_*` variable (only the Upstash KV ones), so the build takes the public settings from the committed
`apps/web/.env.production`. Pushing that file *is* the switch: never push the `--env` change before the birth is
verified. Server data is cached 15–60 s, so pages follow the chain within a minute.

1. **Fill: dry run, checked against the chain** (read-only):
   ```bash
   pnpm --silent --filter @satchel/tools fill-final --from-evidence --verify --env | tee target/release-logs/fill-dry.txt
   ```
   `--from-evidence` reads H, the birth tx and block A from `docs/evidence/birth-satchel.satchelhq.testnet.json`
   (or pass `--h $H --birth-tx $FINAL_TX --block $FINAL_A`). Expect:
   - `H        $H`, `birth tx $FINAL_TX`, `block A  $FINAL_A`;
   - under `-- on-chain (read-only)`, `PASS` on every line: exists, code_hash = H, no access keys, the tx API knows
     the tx, signer `satchelhq.testnet`, receiver the final, no AddKey, the birth shape (FunctionCall ×8), block = A,
     the history starts at the birth tx, never signed;
   - one `-- <file>` block per file with `-`/`+` lines: `README.md`, `docs/verify.md`, `docs/security-model.md`,
     `AGENTS.md`, `docs/GLOSSARY.md`, `docs/development.md`, `tools/judge-snippets.sh`, `tools/monitor.sh`,
     `apps/web/.env.production`;
   - `-- [TBD] left in judge-facing files after this fill: 0`, then `DRY RUN: nothing was written.`
   A `refusing to fill` error lists each placeholder or note that moved since fill-final was written: fix the
   matching entry in `EDITS` in `tools/deploy/fill-final.ts` (or the doc), never edit around it by hand.

   The `apps/web/.env.production` block must read exactly (only these lines change):
   ```
   -   11: # Until Day 9 the app runs on a dev contract (it keeps its key; D-48). dev2 (2026-10-29) carries every …
   -   12: # (C1–C7 + the M-01 fix); dev1 is the pre-sprint contract and can't be upgraded in place (the state …
   -   13: # Day 9: rc.satchelhq.testnet + ROLE=rc. Day 10: satchel.satchelhq.testnet + ROLE=final (launch checklist E-03).
   -   14: NEXT_PUBLIC_SATCHEL_CONTRACT=dev2.satchelhq.testnet
   -   15: NEXT_PUBLIC_CONTRACT_ROLE=dev
   +       (three comment lines on the release contract)
   +       NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet
   +       NEXT_PUBLIC_CONTRACT_ROLE=final
   -   19–22: the dev2 code-hash comment
   -   23: NEXT_PUBLIC_EXPECTED_CODE_HASH=3a73b492d4142db92e9fd733447df63499d0a74563b2091ac870f7ac8a2f2361
   +       (two comment lines on H)
   +       NEXT_PUBLIC_EXPECTED_CODE_HASH=<H>
   ```
   `NEXT_PUBLIC_DATA_MODE=live`, `NEXT_PUBLIC_NETWORK=testnet`, the MPC and USDC ids, `NEXT_PUBLIC_APP_URL=https://usesatchel.xyz`
   (it must stay equal to the contract's `base_uri` host), the SOL flags and the empty endpoint lists are unchanged, and
   `FASTNEAR_API_KEY=` stays empty. Nothing else is required: the app has no other hardcoded hash or birth value
   (it reads the birth tx and block from the chain).
2. **Optional, before the push: stage #4 (E-04).** `/learn`-style pages and the buy guide call [Satchel #4](/s/4/sale)
   "the demo built to fail" (one unbroadcast record, Buy off). Until #4 has that record and is listed, that sentence
   is not true on the final. Stage #4 first (its `evm.ts --sign-only` record, the 250-block quiet period, `list`) to
   avoid the window, or accept a window that lasts until staging. Everything else renders correctly on unstaged,
   unfunded Satchels: zero balances, no records, an empty market.
3. **Apply, re-render, test, push (= the production deploy).** Check first that no heavy run is going:
   `ps aux | grep -E "vitest|playwright|next (build|start)|cargo (test|near)" | grep -v grep` prints nothing.
   ```bash
   pnpm --silent --filter @satchel/tools fill-final --from-evidence --verify --env --write | tee target/release-logs/fill.txt
   pnpm --filter @satchel/tools e2e:proofs --render     # dev2's proof page drops its app links: the app reads the final now
   pnpm --filter @satchel/tools test 2>&1 | grep -E "Test Files|Tests "
   NEXT_PUBLIC_CONTRACT_ROLE=final NEXT_PUBLIC_SATCHEL_CONTRACT=satchel.satchelhq.testnet NEXT_PUBLIC_EXPECTED_CODE_HASH=$H \
     pnpm --filter web test 2>&1 | grep -E "Test Files|Tests "
   bash tools/judge-snippets.sh --print | grep -c '\[TBD: \(H\|birth\|block\|reproducible\)'    # expect 0
   git add README.md AGENTS.md docs/verify.md docs/security-model.md docs/GLOSSARY.md docs/development.md \
     tools/judge-snippets.sh tools/monitor.sh apps/web/.env.production docs/evidence/README.md
   git commit -m "Final contract: fill H, the birth tx and block A; production reads satchel.satchelhq.testnet (E-03)" \
     -- README.md AGENTS.md docs/verify.md docs/security-model.md docs/GLOSSARY.md docs/development.md \
     tools/judge-snippets.sh tools/monitor.sh apps/web/.env.production docs/evidence/README.md
   git pull --rebase --autostash && git push
   ```
   Expect `wrote 9 files`, both suites with every file passing (the fill-final tests on the real files skip once the
   placeholders are gone), and `0`.
4. **Watch the deploy, then check the live switch:**
   ```bash
   vercel ls satchel 2>/dev/null | sed -n '1,6p'          # newest row: Production, ● Ready (optional; needs the CLI login)
   until curl -s https://usesatchel.xyz/api/contract | grep -q '"account_id":"satchel.satchelhq.testnet"'; do sleep 15; done
   curl -s https://usesatchel.xyz/api/contract | python3 -c 'import json,sys;d=json.load(sys.stdin);print({k:d[k] for k in ("account_id","role","data_mode","locked","access_keys","code_matches","any_signer_tx_count","birth_tx","birth_block")});print("AddKey in birth:",any("AddKey" in a for a in d["birth_actions"]))'
   curl -s https://usesatchel.xyz/api/satchels/1 | python3 -c 'import json,sys;s=json.load(sys.stdin);print(s["contract"],s["owner"],s["addresses"]["btc"])'
   curl -s https://usesatchel.xyz/contract | grep -o 'Keyless since birth' | head -1
   ```
   Expect `'account_id': 'satchel.satchelhq.testnet', 'role': 'final', 'data_mode': 'live', 'locked': True,
   'access_keys': 0, 'code_matches': True, 'any_signer_tx_count': 0, 'birth_tx': '<FINAL_TX>', 'birth_block': <FINAL_A>`,
   `AddKey in birth: False`, then `satchel.satchelhq.testnet alice.satchelhq.testnet tb1qtf95jlrryxd2kfrs2ug03p4awlwwm2wfrjcwy5`
   and `Keyless since birth`. If the deploy fails or shows wrong facts: **[Razvan]** Vercel → Deployments → the
   previous one → Instant Rollback, then `git revert` the commit and push.
5. **Judge snippets against the final, no overrides** (the defaults are the final's values now):
   ```bash
   SATCHEL_WASM="$WASM" bash tools/judge-snippets.sh | tee target/release-logs/final-snippets.txt | grep -E '^\[S|PASS|FAIL|SKIP|INFO|summary'
   bash tools/monitor.sh --quick
   ```
   Expect the header `contract satchel.satchelhq.testnet · token 1 · lock checks on`; S1–S10 and S13 `PASS` (S3
   needs the near CLI; S13 `PASS   local wasm == H` needs `$WASM`, the CI artifact); S11 and S12 `INFO`; and
   `summary: <n> pass · 0 fail · 0 skip · 2 info`. S1 expects alice as #1's owner and S9 reads #1's live state, so run
   it again after demo staging. The monitor ends with no `FAIL`.
6. **Regenerate the live proofs on the final (E-05).** Run it when no demo-staging send from Satchel #1 is in flight:
   the proofs' chain sends come from #1 and share its EVM nonce. #1 needs Sepolia ETH for two sends plus gas, 1 USDC on
   Sepolia, two confirmed testnet4 coins of at least 50,000 sats in all, and some devnet SOL; alice, bob and carol
   need NEAR. The run waits out two 250-block quiet periods and the MPC retries, so give it time.
   ```bash
   pnpm --filter @satchel/tools e2e:proofs --contract satchel.satchelhq.testnet > target/release-logs/proofs-dry.txt 2>&1; echo "exit $?"
   grep -E '\(role final\)|^    history|predicted' target/release-logs/proofs-dry.txt
   grep -oE 'MPC path  satchel/[0-9]+/[a-z]+' target/release-logs/proofs-dry.txt | sort | uniq -c
   grep -c 'satchel/4/' target/release-logs/proofs-dry.txt
   pnpm --filter @satchel/tools e2e:proofs --contract satchel.satchelhq.testnet --send --yes 2>&1 | tee target/release-logs/proofs.txt
   ```
   Dry run: `exit 0`; `(role final)`; `history   with --send, the current set (dev2.satchelhq.testnet) is first kept as
   …/docs/evidence/history/dev2.satchelhq.testnet.json`; the fresh Satchels predicted from the contract's
   `next_token_id` (#8, #9, #10 when nothing else was minted: sale, btc, inside); MPC paths only `satchel/1/…` (the
   chain sends) and the fresh ids; `0` for `satchel/4/`. The tool refuses #4, the staged #2/#3/#5 as `--chain-token`
   and #1–#7 as `--tokens` roles. Send: one `proof <id> → <hash>` line per step and finally `wrote …/proofs.json: <n>
   proofs; skipped buy-usdc` (unless carol holds Circle testnet USDC on NEAR: **[Razvan]** optional, faucet.circle.com).
   If it stops on a testnet hiccup, resume with the ids it printed: `… --send --yes --merge --tokens
   sale=<id>,inside=<id>,btc=<id> --only <the ids not written yet>`.
   Then verify and commit:
   ```bash
   tools/proofs.sh | tail -3                                                            # every proof PASS, exit 0
   SATCHEL_PROOFS=docs/evidence/history/dev2.satchelhq.testnet.json tools/proofs.sh | tail -1   # the archived set still verifies
   grep -n 'dev2' docs/evidence/README.md                                               # only the history line
   pnpm --filter @satchel/tools exec vitest run test/proofs.test.ts 2>&1 | grep -E "Tests "
   git add docs/evidence/proofs.json docs/evidence/README.md docs/evidence/history/dev2.satchelhq.testnet.json
   git commit -m "Live proofs regenerated on the final contract; the dev2 set kept as history" \
     -- docs/evidence/proofs.json docs/evidence/README.md docs/evidence/history/dev2.satchelhq.testnet.json
   git pull --rebase --autostash && git push
   ```
   The evidence page then says the proofs were made on the release contract, links the still-listed fresh Satchels in
   the app, and lists the dev2 set under history.
7. **No `[TBD]` left (F-01):**
   ```bash
   git grep -nI "TBD" -- . ':!research' ':!plan' ':!marketing' ':!kb' ':!docs/handoff' ':!docs/design' ':!tools/test' \
     ':!tools/judge-snippets.sh' ':!tools/monitor.sh' ':!tools/deploy/fill-final.ts' ':!*.png' ':!*.mp3'
   grep -n ':-\[TBD: \(birth\|block\|reproducible\)' tools/judge-snippets.sh tools/monitor.sh
   grep -c "TBD" README.md
   git grep -nI -e "until the final contract is" -e "is born keyless on" -e "Until then the README" -- README.md AGENTS.md 'docs/*.md'
   ```
   Expect no output, no output, `0`, no output. The `[TBD: …]` strings still in the two scripts are their skip
   mechanism (an unset override, a development contract's lock), not placeholders.
8. **Fresh-clone rehearsal as a screening agent (F-07, Q-017).** Heavy: one step at a time, with the `ps` check
   before each suite. Follow only the README and `docs/development.md`, in a throwaway clone:
   ```bash
   D=$(mktemp -d)/satchel && git clone "$(git remote get-url origin)" "$D" && cd "$D"
   git log --oneline -1                                     # the commit you just pushed
   pnpm install --frozen-lockfile
   bash tools/judge-snippets.sh --print > /dev/null && echo print-ok
   tools/proofs.sh --self-test | tail -1
   cargo test -p satchel --lib 2>&1 | grep "test result"
   pnpm --filter @satchel/core test 2>&1 | grep -E "Tests "
   pnpm --filter @satchel/tools test 2>&1 | grep -E "Tests "
   pnpm --filter web test 2>&1 | grep -E "Tests "
   bash tools/judge-snippets.sh | grep summary
   tools/proofs.sh | tail -1
   cd - && rm -rf "$(dirname "$D")"
   ```
   Expect the commit, `print-ok`, `self-test: all pass`, `test result: ok`, every suite passing, the same snippets
   summary as step 5 and every proof PASS. Then run the README's "Try it" table by hand (curl `/api/satchels/1`,
   `/api/clean-history/1`, open `/contract`) and the [verify.md](../verify.md) steps 1–5 and 7: each output must match
   the text, with the filled values. Fix anything that does not reproduce in the docs, not in the clone.
