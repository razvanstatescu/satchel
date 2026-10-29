# RESULTS — web spikes (2026-10-21)

THROWAWAY Phase 0 spikes by the `web` agent. Never import any of this into the product. Account: `satchel-spk-web-e9ea1a.testnet`, key from the legacy keychain, never printed. The account started with 10 NEAR. About 35 signed txs reached the chain today (30 of the 32 rows in results.jsonl, the near.org NONE run, 3 demo-robust runs and 1 wallet test; one more may have come from the killed first matrix). The balance is now 9.97295 NEAR, so about 0.027 NEAR was spent.

Environment: macOS arm64, node 22.22.2, npm 10.9, Google Chrome (system) driven by `playwright-core@1.64.1` with `channel:'chrome'`.

## 1. `rpc-lifecycle/`: MPC sign over different RPC submission modes

Setup: `npm i near-api-js@7.3.1`. `lib.mjs` builds and signs the tx locally, so the hash is known before broadcast. `sign-modes.mjs <rpc> <mode> [mpc|yield] [pollRpc] [pollEveryMs]` submits with the chosen method while a concurrent poller calls `EXPERIMENTAL_tx_status(wait_until:NONE)`, normally on dRPC to save FastNEAR quota. Each run appends one JSON line to `results.jsonl`. `matrix.sh` (FastNEAR) and `matrix2.sh` (near.org, dRPC, long yields) drive the runs. `summ.py` and `results-md.py` print tables.

Commands run:
```
node sign-modes.mjs fastnear send_tx:NONE                     # first manual run
./matrix.sh  > matrix-run2.log    # FastNEAR x 8 modes (MPC); the near.org leg stopped by 429s
node sign-modes.mjs drpc send_tx:EXECUTED_OPTIMISTIC yield drpc 3000
node sign-modes.mjs fastnear send_tx:EXECUTED_OPTIMISTIC yield drpc 3000 ; node sign-modes.mjs fastnear broadcast_tx_commit yield drpc 3000
./matrix2.sh > matrix2.log        # near.org x5 (MPC), dRPC x8 (MPC), FastNEAR x2 + near.org x2 (yield)
```
MPC sign args (direct to `v1.signer-prod.testnet`, contract `version` = "3.17.0"): `{"request":{"payload_v2":{"Ecdsa":"<random 32-byte hex>"},"path":"satchel/web-spike/evm","domain_id":0}}` with 50 Tgas and 1 yocto attached. "Yield" target: `requests.near-examples.testnet.request({prompt})` (near-examples/yield-resume; nobody responds, so it times out after 200 blocks and returns `"Wait"`).

All runs (`python3 results-md.py`):

| # | UTC | RPC (submit) | Target | Mode | Submit HTTP | Submit ms | Submit answer | FINAL seen (ms) | Blocks tx→last receipt | Gas burnt (Tgas) | Result | tx |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 11:28:49 | fastnear | mpc | `send_tx:NONE` | 200 | 87 | NONE / None | 7902 |  |  | signature | `DL7375aA1anoxxsb2iVytE3M49biEf7Zegf3kwbWv9d3` |
| 2 | 11:29:31 | fastnear | mpc | `send_tx:INCLUDED` | 200 | 1167 | INCLUDED / Started | 10906 |  | 8.56 | signature | `27hGFSaKJmrv4fkJYs3Wm2A8JonBRpdeKqdgmt6C8ag9` |
| 3 | 11:29:45 | fastnear | mpc | `send_tx:INCLUDED_FINAL` | 200 | 1992 | INCLUDED_FINAL / Started | 10109 |  | 8.61 | signature | `Arf466RjixANyeJzriBVyhBuav8Gb6qKF1pEfPbBnQyc` |
| 4 | 11:29:52 | fastnear | mpc | `send_tx:NONE` | 200 | 80 | NONE / None | 9608 |  | 8.61 | signature | `2XbemiC5Wzz5jK3QtiS7q9sn6GFGpsCboPWyHBPbeWRW` |
| 5 | 11:30:11 | fastnear | mpc | `send_tx:NONE` | 200 | 50 | NONE / None | 7913 | 9 | 8.61 | signature | `HjiSv2MqvrWnxQGA8Fejedzh6jo1gu3o6Bc5fghr4GHu` |
| 6 | 11:30:22 | fastnear | mpc | `send_tx:INCLUDED` | 200 | 922 | INCLUDED / Started | 6848 | 8 | 8.61 | signature | `8f6AeFXKA4fo9u9zjQdyTbiz1NQYu1FKdxsreRzgtLDp` |
| 7 | 11:30:31 | fastnear | mpc | `send_tx:INCLUDED_FINAL` | 200 | 2248 | INCLUDED_FINAL / Started | 6799 | 8 | 8.61 | signature | `447XfB1iM2CqsY2efvAAtupJP2wZJ9TmVoRZ9P3QtoTC` |
| 8 | 11:30:41 | fastnear | mpc | `send_tx:EXECUTED_OPTIMISTIC` | 200 | 5030 | EXECUTED / SuccessValue | 7779 | 8 | 8.61 | signature | `69uLEisXLb32cNPmMemhJJYdbQsrpuRKhnLVjGrb8TEo` |
| 9 | 11:30:51 | fastnear | mpc | `send_tx:EXECUTED` | 200 | 4984 | EXECUTED / SuccessValue | 6778 | 7 | 8.61 | signature | `8FwMPVXoupaaCQTeapJYKn9jUuE58Peviua6KS4D8dav` |
| 10 | 11:31:01 | fastnear | mpc | `send_tx:FINAL` | 200 | 9068 | FINAL / SuccessValue | 9982 | 12 | 8.61 | signature | `Cvg9DVSHZ3jbmAUhTZRW1An7NC6ZyeMiHbowsd6DQcZt` |
| 11 | 11:31:14 | fastnear | mpc | `broadcast_tx_commit` | 200 | 14610 | EXECUTED / SuccessValue | 16497 | 27 | 8.61 | signature | `5ZVHAcrxsAbwtVTB4s88zNLYwoZ6UN8z5MkwhiHj9dzs` |
| 12 | 11:31:33 | fastnear | mpc | `broadcast_tx_async` | 200 | 60 | hash | 7963 | 9 | 8.56 | signature | `AHqAKjzZCzJkwZYxPsfzSsK6z3S5L2BexHEYckVuKWgC` |
| 13 | 11:36:11 | drpc | yield | `send_tx:EXECUTED_OPTIMISTIC` | 408 | 2044 | provider error (see log) | 125118 | 203 | 7.17 | "Wait" | `353dhc7WCeencDt44VaPidgetKXBs6LNVmtKumuLwYfy` |
| 14 | 11:39:21 | fastnear | yield | `send_tx:EXECUTED_OPTIMISTIC` | 408 | 30072 | HANDLER_ERROR TIMEOUT_ERROR | 123281 | 203 | 7.16 | "Wait" | `9DP2uvjd92qEaWFCQ2VAFk6ZjbJMLYDJ7suEjKbMrs7F` |
| 15 | 11:41:25 | fastnear | yield | `broadcast_tx_commit` | 408 | 10106 | HANDLER_ERROR TIMEOUT_ERROR PENDING:INCLUDED_FINAL | 126029 | 203 | 7.17 | "Wait" | `C7N7mMuRZSUX5MfHhn1hBVWKFhPYWvfTvNgVeongmKMd` |
| 16 | 11:49:21 | nearorg | mpc | `send_tx:INCLUDED` | 200 | 4273 | INCLUDED / Started | 10717 | 8 | 8.61 | signature | `6r6EagtevKDaMKHEpyBnLvyiPZDdxyQX77p17xHkNP2E` |
| 17 | 11:49:36 | nearorg | mpc | `send_tx:EXECUTED_OPTIMISTIC` | 200 | 8605 | EXECUTED / SuccessValue | 10661 | 8 | 8.61 | signature | `7t9aCMMnGCYtVxkTAhG7S1z93PryMhEASZXiAsmHgXQ9` |
| 18 | 11:49:50 | nearorg | mpc | `send_tx:FINAL` | 200 | 10077 | FINAL / SuccessValue | 10673 | 8 | 8.61 | signature | `81fcq8R946WxpC5Cw73pYidatgBWrREDYrvqB28fGUDJ` |
| 19 | 11:50:04 | nearorg | mpc | `broadcast_tx_commit` | 200 | 10355 | EXECUTED / SuccessValue | 12802 | 13 | 8.61 | signature | `B1FJHshaWXVQ4rZx63GMiuj2Uz3jZkdJ75MSEFqT75no` |
| 20 | 11:50:21 | nearorg | mpc | `broadcast_tx_async` | 200 | 3138 | hash | 12865 | 9 | 8.61 | signature | `h4qVVXy5wfw6YgHRtY659fqSs47JgfYiU2MNZhxg1yg` |
| 21 | 11:50:38 | drpc | mpc | `send_tx:NONE` | 200 | 62 | NONE / None | 8618 | 9 | 8.61 | signature | `ACYXpRszb6RkWtzWzjVMypTysL9vLScAd9dEzHEhtvHr` |
| 22 | 11:50:50 | drpc | mpc | `send_tx:INCLUDED` | 200 | 1427 | INCLUDED / Started | 10708 | 12 | 8.56 | signature | `6quYsQ8CNDjVWsVQDrn8L7s9FpnGzpXsMK8rqfDHVgXX` |
| 23 | 11:51:04 | drpc | mpc | `send_tx:INCLUDED_FINAL` | 408 | 2047 | provider error (see log) | 8634 | 10 | 8.61 | signature | `5b9HStk8zwQzmFQXv1yTDYQ4NC75pbnitiSq5VDQ2kmh` |
| 24 | 11:51:16 | drpc | mpc | `send_tx:EXECUTED_OPTIMISTIC` | 408 | 2065 | provider error (see log) | 8630 | 10 | 8.61 | signature | `7XaFNQE7dHuMdcZiqQj6L6ceniPp3DqAXP2G8dZB27SL` |
| 25 | 11:51:29 | drpc | mpc | `send_tx:EXECUTED` | 408 | 2047 | provider error (see log) | 8632 | 9 | 8.56 | signature | `3bep8KaPecBhbnEeqFzSgLDwDLmGGTaLNLep4hzs9tyH` |
| 26 | 11:51:41 | drpc | mpc | `send_tx:FINAL` | 408 | 2063 | provider error (see log) | 8680 | 9 | 8.61 | signature | `FwimoN2Ez7bxCRC3Zn6bA2PBcUfBX42qC4Ngwh763Pdq` |
| 27 | 11:51:54 | drpc | mpc | `broadcast_tx_commit` | 400 | 42 | provider error (see log) |  |  |  | never sent | `DMhPpc689TtJ3MxkUEeeakTQoYtiVaZznnqknLdhrafK` |
| 28 | 11:55:17 | drpc | mpc | `broadcast_tx_async` | 400 | 65 | provider error (see log) |  |  |  | never sent | `4tY9uNu2c5dDkXWkEPRi1CpYz2d4r5PB8nsS1vW5K2Mx` |
| 29 | 11:58:41 | fastnear | yield | `send_tx:FINAL` | 408 | 30077 | HANDLER_ERROR TIMEOUT_ERROR PENDING:INCLUDED_FINAL | 110746 | 203 | 7.16 | "Wait" | `HnrbgykBtuSmqrWa9gGw9aJakp29X7BVqgPegtke3sei` |
| 30 | 12:00:35 | fastnear | yield | `broadcast_tx_commit` | 408 | 30074 | HANDLER_ERROR TIMEOUT_ERROR PENDING:INCLUDED_FINAL | 119090 | 203 | 7.17 | "Wait" | `QPfNbfwn8AhYfCkk5xhjeaTCSxPx6PfFr6hZh5REikJ` |
| 31 | 12:02:38 | nearorg | yield | `send_tx:EXECUTED_OPTIMISTIC` | 408 | 33080 | HANDLER_ERROR TIMEOUT_ERROR PENDING:INCLUDED_FINAL | 123209 | 203 | 7.16 | "Wait" | `FtiJu1Ja7JimusnDDhLGA4eYL3kx2rWc1syp9mAnj2A3` |
| 32 | 12:04:45 | nearorg | yield | `broadcast_tx_commit` | 408 | 33198 | HANDLER_ERROR TIMEOUT_ERROR PENDING:INCLUDED_FINAL | 131595 | 203 | 7.17 | "Wait" | `E8weP5uSxwneM5koRn8sqzJmYwwri2fmyK3HU4uNp4pF` |


Notes on the table:
- "FINAL seen" comes from the poller at a 1–2 s cadence (4 s for yields), so it is about ±2 s.
- Rows 1–12 polled on the RPC under test (FastNEAR). Rows 13 onward polled through dRPC.
- One more run is missing from results.jsonl: near.org `send_tx:NONE`, tx `Dffdxe3R3AhcnR73b83a4XKS6Y7Zr77FJpvLRkKy11Mo`. Its submit returned `NONE` after 3091 ms, but its poller hit near.org 429s and the process was stopped. It is in `matrix-run2.log`, and `track-tx.mjs` later confirmed the signature.
- Rows 27–28 (dRPC `broadcast_tx_commit` / `broadcast_tx_async`) were never broadcast: dRPC answers `400 {"message":"method is not available","code":-32601}`. The poller then waited out its 200 s budget.

Aggregates (`python3` over results.jsonl):
```
MPC sign n= 23 FINAL seen (poll, s): min 6.8 median 8.7 max 16.5
blocks tx->last receipt: n=19 min 7 median 9 max 27
total gas burnt (Tgas): min 8.560 max 8.612
blocks tx->signature receipt: n=22 min 6 median 8 max 26
yield window: 201 blocks in 119.78 s -> 0.596 s/block;  long window: 3533 blocks in 2005.3 s -> 0.568 s/block
```
Live protocol config (dRPC, `EXPERIMENTAL_protocol_config`): `yield_timeout_length_in_blocks = 200`, protocol 87. Node version on FastNEAR, near.org and dRPC: `2.14.0-rc.5` (commit `b7b4737c`).

Representative raw answers:
```
FastNEAR send_tx EXECUTED_OPTIMISTIC on a 200-block yield, after 30072 ms, HTTP 408:
{"name":"HANDLER_ERROR","cause":{"info":{"cause":"PENDING","status":{"final_execution_status":"INCLUDED_FINAL","receipts_outcome":[{"block_hash":"7hVAcTyx…","id":"DRkxK7Cz…","outcome":{"executor_id":"requests.near-examples.testnet",…
dRPC (any blocking wait_until), after ~2045 ms, HTTP 408: {"message":"Request timeout on the free plan, please upgrade to paid plan","code":30}
dRPC broadcast_tx_commit / broadcast_tx_async / tx_status, HTTP 400: {"message":"method is not available","code":-32601}
near.org under load, HTTP 429, retry-after 20: {"jsonrpc": "2.0", "error": {"code": -429, "message": "WARNING! THIS ENDPOINT IS DEPRECATED! STOP USING IT NOW! Switch to https://fastnear.com or alternative RPC providers at https://docs.near.org/api/rpc/providers"}, "id": "1"}
FastNEAR free tier, HTTP 429, retry-after 0: {"jsonrpc": "2.0", "error": {"code": -429, "message": "Rate limits exceeded. For higher rate limits get a subscription at https://fastnear.com"}, "id": "1"}
Intear testnet RPC, HTTP 502: {"error":{"code":-32603,"message":"Internal error"},"id":null,"jsonrpc":"2.0","note":"Requests without an API key are being slowed down for one second. Get an API key at https://rainy.intea.rs for faster response times."}
```
Rate-limit timeline (curl `block` final, every ~5 s, shared team IP): 11:32 FastNEAR 429 after about 4 min of matrix load. 11:34 FastNEAR alternated 200 and 429. 11:39 back to 200. near.org gave 429 for the whole 11:32–11:35 window, then 200 with ~3.1–3.2 s latency per call at 11:48–11:49.

### Robust pattern (`track-tx.mjs`, `demo-robust.mjs`)

`trackTx()` long-polls `tx(wait_until:EXECUTED_OPTIMISTIC)`. It treats 408, UNKNOWN_TRANSACTION, 429, 5xx and network errors as "ask again", rotates providers, and decodes `result.status.SuccessValue`.

```
$ node track-tx.mjs AHqAKjzZCzJkwZYxPsfzSsK6z3S5L2BexHEYckVuKWgC satchel-spk-web-e9ea1a.testnet https://near-testnet.drpc.org
[0ms] submitted …   [107ms] executed {"final_execution_status":"FINAL"}   -> ok:true, value {scheme:"Secp256k1", big_r:{affine_point:"03f16302…acbf"}, s:{scalar:"6b008087…e295"}, recovery_id:1}

$ node demo-robust.mjs mpc            (tx JCHJ2Kw5RkeyXEk5VVrUkEvkEEeQiCXY3NStifm5mkwX)
[+181ms] hash known before broadcast  [+1466ms] send_tx INCLUDED @fastnear -> 200 INCLUDED  [+5794ms] executed EXECUTED -> signature (1 long-poll request)

$ node demo-robust.mjs yield --kill-after-ms 8000 ; sleep 5 ; node demo-robust.mjs --resume     (tx 2TkKx9pen6za85FxxgpDzcgEQKzpKkLEQe4TUpwxuDx6)
[+1672ms] send_tx INCLUDED -> 200   [+9673ms] simulated reload, exit
resume: [+10124ms] included INCLUDED_FINAL (first long-poll got 408 after 10 s)   [+108822ms] executed -> "Wait"   total since submit 123409 ms

$ node demo-robust.mjs yield          (tx 4FuXc7EV3nXHQqBm6xDEZVdrzFpjkQUVxrX6R6KF3ham)
[+1734ms] submitted  [+31793ms] included  [+120480ms] executed -> "Wait"; tracker RPC requests: 5
```
Full logs: `demo-robust-mpc.log`, `demo-robust-yield-resume.log`, `demo-robust-yield-count.log`.

## 2. `connect-probe/`: wallets near-connect shows per network

`npm i @hot-labs/near-connect@0.11.4`, then `node probe.mjs`:
```
mainnet default: manifest v1.1.0, registered=12, available=[hot-wallet, meteor-wallet, intear-wallet, ledger, mynearwallet, okx-wallet, near-mobile, trezu-wallet, nightly-wallet, hana-wallet, ethereum-wallets, near-cli]
testnet default: manifest v1.1.0, registered=12, available=[meteor-wallet, intear-wallet, ledger, nightly-wallet, ethereum-wallets, near-cli]
testnet + docs features block: manifest v1.1.0, registered=12, available=[]
testnet + {signAndSendTransaction:true}: manifest v1.1.0, registered=12, available=[meteor-wallet, intear-wallet, ledger, nightly-wallet, ethereum-wallets, near-cli]
testnet + fake walletConnect: manifest v1.1.0, registered=14, available=[meteor-wallet, intear-wallet, ledger, nightly-wallet, wallet-connect, unity-wallet, ethereum-wallets, near-cli]
```

## 3. `next-polyfill-probe/`: Next 16 + chain libs bundling and runtime

```
CI=1 npx -y create-next-app@16.4.2 next-polyfill-probe --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --no-agent-feedback --yes
npm install --save-exact chainsig.js@1.1.16 near-api-js@7.3.1 @hot-labs/near-connect@0.11.4 near-connect-hooks@1.1.6 viem@2.57.7 bitcoinjs-lib@7.0.4 @tanstack/react-query@5.104.5
# tsconfig target ES2017 -> ES2022 (BigInt literal TS2737 otherwise; needed rm -rf .next to take effect)
npx next build      # Turbopack, "✓ Compiled successfully in 7.1s"
npx next start -p 3917 ; node ../browser-runner/load-page.mjs http://localhost:3917/probe DONE
```
`/probe` output in headless Chrome: see kb/41 (EVM and BTC derive OK, chainsig BTC `prepareTransactionForSigning` OK, bitcoinjs v7 PSBT OK, near-api-js view OK, near-connect lists 6 testnet wallets, no console errors, `globalThis.Buffer` undefined). With `src/instrumentation-client.ts` setting `globalThis.Buffer`, it reports `Buffer global before: function`. `next dev -p 3918` gave the same result, with every line twice because of StrictMode.

Bundle weight (sum of the route's client chunks, gzip -6):
```
/probe: 6 chunks, 7925 KiB raw, 1933 KiB gzip   (with chainsig.js)
/probe2: 5 chunks, 702 KiB raw, 210 KiB gzip    (without chainsig.js)
largest chunk 7,942,484 B: 'chain-registry' x8539, 'osmosis' x648, 'xrpl' x211, 'aptos' x526, 'solana' x254
```
`npx -y shadcn@4.22.1 init -d -y`: Next.js and Tailwind v4 detected. It wrote components.json with style `base-nova`, plus `button.tsx` on `@base-ui/react`. The build still compiles.

Derived (probe only, predecessor `satchel-spk-web-e9ea1a.testnet`): `satchel/1/evm` → `0x7b7852f25612Aa7922d4EaBeEaFf8ed721a78cBB`; `satchel/1/btc` → `tb1qr5e3spjg0dnyje4v4fspjhtgzh8udyvyy6e987`, pubkey `026ecffe35…`.

`/provider-check` renders the WalletProvider pattern from kb/40 verbatim. Result: `ready account=none`, no errors.

Server rendering under `cacheComponents`:
- `/cached`: a `"use cache"` function with `cacheLife({revalidate:15})` calls near-api-js `callFunction` (MPC `version`). The build marks it `○ /cached 15s 1y`, and the page renders `mpc version 3.17.0`.
- `/s/[id]`: `PageProps<'/s/[id]'>` plus `<Suspense>` around a body that awaits `params` and a cached `viewAccount`. The build marks it `◐ (Partial Prerender)`. A no-JS `curl /s/satchel-spk-web-e9ea1a.testnet` gets the `loading` shell **and** the streamed `account … amount 9972951651263409199999974 DONE` in one response.
- The same page without `<Suspense>` (uncached `viewAccount` in the page body) fails `next build` with `Error: Route "/s/[id]": Next.js encountered uncached or runtime data during prerendering. … [block] Set export const instant = false to allow a blocking route`.

## 4. `browser-runner/wallet-cli-flow.mjs`: near-connect "NEAR CLI" wallet in real Chrome

The script: connect(near-cli), fill the account, choose keychain, "Sign via MPC", read the command from the sandboxed iframe, run it with `sign-with-legacy-keychain display`, `broadcast_tx_async`, paste the hash.
```
[+  2564ms] CLI command shown to user: near contract \ call-function \ as-transaction 'v1.signer-prod.testnet' 'sign' \ json-args '{"request":{"payload_v2":{"Ecdsa":"<64 hex>"},"path":"satchel/web-wallet-probe/evm","domain_id":0}}' \ prepaid-gas '50 Tgas' \ attached-deposit '0.000000000000000000000001 NEAR' \ sign-as 'satchel-spk-web-e9ea1a.testnet' \ network-config testnet \ sign-with-keychain
[+  2922ms] broadcast_tx_async -> B7Hi4WQCrcJhvKkfR75aDTb9VF2DCBHEJYTuy8nWDX9X
dApp: [+4075ms] RESOLVED tx=B7Hi4WQCrcJhvKkfR75aDTb9VF2DCBHEJYTuy8nWDX9X final_execution_status=INCLUDED_FINAL status="Started" receipts=2
```
The promise resolved with a partial outcome. `node rpc-lifecycle/track-tx.mjs B7Hi4WQ… satchel-spk-web-e9ea1a.testnet` then returned the signature (`big_r 039653de…`). Note: near-cli-rs prints the signed tx on **stderr**.

## 5. Source reading (no execution)

Clones are in `vendor/` (depth 1):
- `hot-dao/near-selector` @6766ea5
- `matiasbenary/near-connect-hooks` @ae7fdab
- `near/near-api-js` @2546c85
- `near/create-near-app` @ff0fedd
- `near/wallet-selector` @b532bcd
- `near/nearcore` @1441cd3 (sparse: chain/jsonrpc*, chain/client, core/chain-configs)
- `near-examples/yield-resume` @e92f04c
- `near/docs` @117e742 (sparse)
- `INTEARnear/wallet` @7e31411

Wallet executors fetched on 2026-10-21 into `executors/`: `meteor.js`, `intear.js`, `near-cli.js`, `hot.js`, `ledger.js`. `scratch-fck/` holds the `function-call-key-plugin@2.1.0` tarball.

## Reproduce

- `cd rpc-lifecycle && npm ci`, then `node sign-modes.mjs fastnear send_tx:INCLUDED`, `node demo-robust.mjs mpc` or `node track-tx.mjs <hash> <sender>`. These spend a little testnet NEAR from the web spike account.
- `cd next-polyfill-probe && npm ci && npx next build && npx next start -p 3917`, then `cd ../browser-runner && npm ci && node load-page.mjs http://localhost:3917/probe DONE`. `node_modules/` and `.next/` (1.1 GB) were deleted after the runs; `package-lock.json` is kept. The probe also contains the shadcn init output and the `/wallet`, `/provider-check`, `/cached` and `/s/[id]` routes.
- `node browser-runner/wallet-cli-flow.mjs` needs the probe server running and `near` (near-cli-rs) with the spike account in the legacy keychain.

## Side effects

- Running `near` (near-cli-rs 0.30.1) printed `Migrating config.toml from V4 to V5...` once for `~/Library/Application Support/near-cli/config.toml`. This is the CLI's own migration, and the file still lists testnet `rpc_url = "https://archival-rpc.testnet.fastnear.com/"`.
- No global tools were installed. All npm installs are local to the spike dirs. Playwright used the system Chrome; no browser was downloaded.
