# 40 · Frontend wallet connection and the long-running transaction lifecycle

> **Phase-0 research note (2026-10-21).** Kept as evidence and not maintained; where it disagrees with [kb/90](90-technical-spec.md), kb/90 wins (§13 Errata).
> "Plan" below means `near_hackathon.md`, the team's original plan, which is not in this repo. "Nov 1" dates are the Phase-0 schedule; implementation began 2026-10-21 (D-39).

> Owner: web · Checked: 2026-10-21 · Confidence: high for RPC behaviour and library APIs (measured on live testnet, read at pinned commits); medium for per-wallet timing (Intear/MNW/Ledger/NEAR-CLI from source, NEAR-CLI also driven in a real browser, Meteor closed-source)
> Primary sources: `hot-dao/near-selector` @ `6766ea5` (2026-10-14), which is `@hot-labs/near-connect`, plus the live manifest v1.1.0; `matiasbenary/near-connect-hooks` @ `ae7fdab` (= npm 1.1.6); `near/near-api-js` @ `2546c85` (= 7.3.1); `near/nearcore` master @ `1441cd3` and `b7b4737c` (2.14.0-rc.5, the build serving testnet RPC today); `near/mpc` @ `13f42bf` (contract 3.17.0 live on `v1.signer-prod.testnet`); `near/docs` @ `117e742` (2026-10-20); `INTEARnear/wallet` @ `7e31411`; `near/near-connect-ledger` main; `near/create-near-app` @ `ff0fedd` (9.0.2); `near/wallet-selector` @ `b532bcd`.
> Spike code and raw logs: `research/spikes/web/` (`RESULTS.md`). Every tx hash below is a testnet tx (`https://testnet.nearblocks.io/txns/<hash>`).

## TL;DR: what an implementer must know

1. **Use `@hot-labs/near-connect@0.11.4`** (HOT Labs, MIT, NEAR Docs' recommended connector), **plus `near-api-js@7.3.1`** for RPC, plus a small hand-written React provider. `near-connect-hooks@1.1.6` (npm maintainers gagdiez / maguila95, repo `matiasbenary/near-connect-hooks`; used by NEAR Docs and create-near-app) is fine for sign-in state, but do **not** use its `callFunction` for `sign_for`. `@near-wallet-selector/*` (10.1.4, last release 2025-12-04) is legacy: its own README now steers people to near-connect. **[VERIFIED]** npm + **[SOURCED]** READMEs
2. **On testnet, near-connect shows 6 wallets:** Meteor, Intear, Ledger, Nightly, Ethereum wallets, NEAR CLI. With a WalletConnect `projectId` it also shows WalletConnect and Unity. **HOT, MyNearWallet, OKX, NEAR Mobile, Trezu and Hana do not appear on testnet**, because the manifest lacks `features.testnet`. Team members, buyers and judges need a **Meteor or Intear** testnet wallet. **[VERIFIED]** (`connect-probe/probe.mjs` against the live manifest)
3. **Do not copy the `features` block from the NEAR Docs "Wallet Login" page.** `signTransaction: true` filters out every wallet and leaves an empty modal (0 wallets). **[VERIFIED]**
4. **`wallet.signAndSendTransaction()` resolves whenever the wallet decides to, and the outcome may be partial.**
   - The NEAR CLI and MyNearWallet connectors return `tx(wait_until:"NONE")` as soon as they have the hash. With an MPC sign in flight that is `status:"Started"` and has no `SuccessValue`.
   - Intear waits until `EXECUTED_OPTIMISTIC`, but **rejects after 60 s** while the tx keeps running. The dApp gets `Error("Failed to send transaction 1: Timeout")`.
   - Ledger broadcasts with `broadcast_tx_commit` to the deprecated `rpc.testnet.near.org`.
   - Contract panics come back as a *resolved* outcome with `status.Failure`.
   - There is no "hash available" callback.
   **[SOURCED]** for executors, **[VERIFIED]** for NEAR CLI in Chrome
5. **MPC latency today is short.** 23 direct `sign` calls to `v1.signer-prod.testnet` reached `FINAL` in **6.8–16.5 s, median 8.7 s**. That is 6–26 blocks (median 8) from tx inclusion to the signature receipt, with 8.56–8.61 Tgas burnt in total per sign. The worst case is the yield timeout: **200 blocks ≈ 120 s** (block time 0.57–0.60 s). **[VERIFIED]**
6. **No public RPC can hold a request open for a 2-minute receipt.**
   - FastNEAR returns `408 TIMEOUT_ERROR` after **10–30 s**, depending on which node answers (`send_tx` 30 s in 3/3 runs; `broadcast_tx_commit` 10 s once and 30 s once).
   - near.org (deprecated) takes 33 s, the same 30 s plus its ~3 s penalty on every call.
   - dRPC's free plan cuts every request at **~2 s**.
   - The FastNEAR 408 body carries the pending status: `error.cause.info = {cause:"PENDING", status:{final_execution_status:"INCLUDED_FINAL", …}}`.
   **[VERIFIED]**
7. **Robust pattern (tested):**
   - Know the tx hash and persist the intent *before* or *as* the tx is sent.
   - Long-poll `tx` with `wait_until:"EXECUTED_OPTIMISTIC"`. Treat 408 / `UNKNOWN_TRANSACTION` / 429 / 5xx / network errors as "ask again" and rotate providers.
   - Stop when `result.status` has `SuccessValue` or `Failure`.
   - Decode the result with `JSON.parse(utf8(base64(result.status.SuccessValue)))`, which gives `{scheme, big_r:{affine_point}, s:{scalar}, recovery_id}`.
   Code is below, as `track-tx.mjs`. It needed 5 RPC requests for a 120 s receipt chain, and a resume after a simulated reload worked. **[VERIFIED]**
8. **Ask the contract for two things that make the UI wallet-agnostic** (P0, owners sdk/sec):
   - (a) `sign_for` writes a `Pending` record keyed by `(token_id, payload_hash)` in its first receipt; `on_signed` turns it into `Signed{signature}` or `Failed`. A view `get_sign_request(token_id, payload_hash)` exposes it. The UI can then show progress and recover after a reload, a wallet error or a lost hash, using only data it computed itself.
   - (b) `sign_for` must `assert_one_yocto` (exactly 1 yoctoNEAR attached). Function-call access keys cannot attach deposits, so no dApp-held key (including `function-call-key-plugin` in near-connect-hooks) can ever request a signature. Only a full-access key, meaning a real wallet confirmation, can.
9. **Persist pending signs in `localStorage` and run the tracker outside React component lifecycles.** Next 16 Cache Components keeps hidden routes mounted in `<Activity>` but cleans up their effects, so a tracker inside a component stops when the user navigates away.
10. **near-api-js 7's `Account.signAndSendTransaction` defaults to `EXECUTED_OPTIMISTIC` and silently re-sends on every 408** (12 attempts, 0.5 s × 1.5 backoff). For scripts it effectively waits out an MPC yield. For UI code, prefer `send_tx` with `INCLUDED` plus the tracker. **[SOURCED]** and **[VERIFIED]** for the 408s

## Verified facts & measurements

### A. near-connect wallet availability (live manifest v1.1.0 from `raw.githubusercontent.com/hot-dao/near-selector/refs/heads/main/repository/manifest.json`)

`node connect-probe/probe.mjs` (near-connect 0.11.4 in Node, in-memory storage):
```
mainnet default: manifest v1.1.0, registered=12, available=[hot-wallet, meteor-wallet, intear-wallet, ledger, mynearwallet, okx-wallet, near-mobile, trezu-wallet, nightly-wallet, hana-wallet, ethereum-wallets, near-cli]
testnet default: manifest v1.1.0, registered=12, available=[meteor-wallet, intear-wallet, ledger, nightly-wallet, ethereum-wallets, near-cli]
testnet + docs features block: manifest v1.1.0, registered=12, available=[]
testnet + {signAndSendTransaction:true}: manifest v1.1.0, registered=12, available=[meteor-wallet, intear-wallet, ledger, nightly-wallet, ethereum-wallets, near-cli]
testnet + fake walletConnect: manifest v1.1.0, registered=14, available=[meteor-wallet, intear-wallet, ledger, nightly-wallet, wallet-connect, unity-wallet, ethereum-wallets, near-cli]
```
The same 6 testnet wallets appeared in headless Chrome from a Next 16 production build (see 41). The filter rule is `if (this.network === "testnet" && !wallet.manifest.features?.testnet) return false;` (`src/NearConnector.ts`). Wallets whose manifest has the `walletConnect` permission are dropped unless you pass a WalletConnect client.

### B. How each testnet-capable wallet executes and returns

| Wallet (manifest id) | Runtime | Who broadcasts, and how | When `signAndSendTransaction` resolves | Source |
|---|---|---|---|---|
| Meteor (`meteor-wallet`) | Sandboxed iframe running Meteor's executor (`Meteor-Wallet/meteor_wallet_sdk` `data-storage` branch). It talks to the extension, a popup at `wallet.meteorwallet.app`, or a mobile bridge. | The wallet | Returns a `FinalExecutionOutcome` (the action schema's output type). Internal wait and timeout are unknown. | **[ASSUMED]** (closed bundle) |
| Intear (`intear-wallet`) | Sandboxed iframe opens a popup at `wallet.intear.tech/send-transactions`, or a WebSocket "logout bridge" to the app | The wallet: `send_tx` `wait_until: Included`, then polls `tx` every 100 ms until `final_execution_status >= ExecutedOptimistic`, with a **60 s cap** | Resolves with `outcomes[0]` at EXECUTED_OPTIMISTIC. **After 60 s it rejects** even though the tx continues on chain. The wallet UI shows "Transaction failed to execute: Timeout", and the dApp receives `{"type":"error","message":"Failed to send transaction 1: Timeout"}` (`pages/send_transactions.rs` L1036–1056, `data/translations/en.json` L663), which near-connect turns into a rejected promise. A contract panic resolves successfully with `status.Failure`: *"it's the app's responsibility to find and handle errors in the outcomes"* | **[SOURCED]** `web/src/contexts/transaction_queue_context.rs` L746–749, `near-min-api/src/lib.rs` L560–567, `POSTMESSAGE_PROTOCOL.md` L183 |
| NEAR CLI (`near-cli`) | The sandboxed iframe shows a near-cli-rs command: `near contract call-function as-transaction …` for one FunctionCall, or `near transaction construct-transaction …` for batches, ending in `sign-with-keychain`. The user runs it, then pastes the hash or explorer URL. | The user's terminal | Right after the paste: `tx` with `wait_until:"NONE"`. **That is a partial outcome while the MPC is pending.** | **[SOURCED]** executor + **[VERIFIED]** §G |
| Ledger (`ledger`) | Sandboxed iframe using WebHID/USB/BLE (`near/near-connect-ledger`) | The executor: `broadcast_tx_commit` to **`https://rpc.testnet.near.org`** (deprecated) | After commit. On a long receipt it will see the RPC's 408. | **[SOURCED]** `ledger-executor.js` `rpcRequest()` |
| MyNearWallet (`mynearwallet`, **mainnet only** in manifest) | Popup at `app.mynearwallet.com/sign?transactions=…&callbackUrl=…`. The result comes back by `postMessage`, not by a full-page redirect. | The wallet | `txStatus(hash, "unused", "NONE")` immediately, so the outcome is partial | **[SOURCED]** `near-wallets/src/mnw.ts` L159–163 |
| Nightly, Ethereum wallets | Extension / NEP-518 0x accounts | | not examined | |

near-connect itself puts **no timeout** on executor calls (`src/SandboxedWallet/executor.ts`). If the wallet popup is blocked because there was no user gesture, the executor shows a second "Open wallet" button (`window.selector.ui.whenApprove`). **[SOURCED]**

### C. MPC `sign` request: the shape and what comes back **[VERIFIED]**

The live testnet contract is version `3.17.0` (`view version`). Its `config` returns `sign_call_gas_attachment_requirement_tera_gas: 15` and `return_signature_and_clean_state_on_success_call_tera_gas: 7`. The args shape, from `crates/near-mpc-crypto-types/src/sign.rs`, which also still accepts the legacy `payload` and `key_version`:
```json
{"request":{"payload_v2":{"Ecdsa":"<64 hex chars, 32 bytes, must be < secp256k1 n>"},"path":"satchel/1/evm","domain_id":0}}
```
Each call used deposit 1 yocto and 50 Tgas attached. The receipt chain was: `sign` (SuccessReceiptId, ~4.34 Tgas, one log), then `return_signature_and_clean_state_on_success` (~3.51 Tgas, SuccessValue), then two refunds. The decoded `result.status.SuccessValue`:
```json
{"scheme":"Secp256k1","big_r":{"affine_point":"02145832253c28e50421ce5524f2c67de54d2468c4925993b4e8b33c56c14b4f13"},"s":{"scalar":"6878376edae59d3512ce88baafc4e0a3f8d3e6cfe76b229ab2d4fc4ec19e5210"},"recovery_id":0}
```
(tx `DL7375aA1anoxxsb2iVytE3M49biEf7Zegf3kwbWv9d3`). Satchel's `sign_for` returns whatever `on_signed` returns, so keep `on_signed -> Option<SignatureResponse>` and the client decodes the same JSON, or `null`.

### D. Submission-mode matrix (direct MPC `sign`; ground truth from a parallel poller on dRPC) **[VERIFIED]**

"Submit returned" is the wall time of the submit call itself. "FINAL seen" is when the poller (1–2 s cadence) first saw `final_execution_status: FINAL`.

| RPC | Method / `wait_until` | Submit returned | What it returned | FINAL seen | tx |
|---|---|---|---|---|---|
| FastNEAR | `send_tx` NONE | 50–87 ms (n=3) | `{"final_execution_status":"NONE"}`, no outcome, **no validation** | 7.9–9.6 s | `HjiSv2Mq…` |
| FastNEAR | `send_tx` INCLUDED | 0.92–1.17 s (n=2) | `INCLUDED`, `status:"Started"`, 0 receipts | 6.8–10.9 s | `8f6AeFXK…` |
| FastNEAR | `send_tx` INCLUDED_FINAL | 1.99–2.25 s (n=2) | `INCLUDED_FINAL`, `Started` | 6.8–10.1 s | `447XfB1i…` |
| FastNEAR | `send_tx` EXECUTED_OPTIMISTIC | 5.03 s | `EXECUTED`, `SuccessValue` (signature) | 7.8 s | `69uLEisX…` |
| FastNEAR | `send_tx` EXECUTED | 4.98 s | `EXECUTED`, `SuccessValue` | 6.8 s | `8FwMPVXo…` |
| FastNEAR | `send_tx` FINAL | 9.07 s | `FINAL`, `SuccessValue` | 10.0 s | `Cvg9DVSH…` |
| FastNEAR | `broadcast_tx_commit` | 14.61 s | `EXECUTED`, `SuccessValue` | 16.5 s | `5ZVHAcrx…` |
| FastNEAR | `broadcast_tx_async` | 60 ms | hash string | 8.0 s | `AHqAKjzZ…` |
| near.org | `send_tx` NONE | 3.09 s | `NONE` | (poller rate-limited) | `Dffdxe3R…` |
| near.org | `send_tx` INCLUDED | 4.27 s | `INCLUDED`, `Started` | 10.7 s | `6r6Eagte…` |
| near.org | `send_tx` EXECUTED_OPTIMISTIC | 8.61 s | `EXECUTED`, `SuccessValue` | 10.7 s | `7t9aCMMn…` |
| near.org | `send_tx` FINAL | 10.08 s | `FINAL`, `SuccessValue` | 10.7 s | `81fcq8R9…` |
| near.org | `broadcast_tx_commit` | 10.36 s | `EXECUTED`, `SuccessValue` | 12.8 s | `B1FJHsha…` |
| near.org | `broadcast_tx_async` | 3.14 s | hash | 12.9 s | `h4qVVXy5…` |
| dRPC | `send_tx` NONE | 62 ms | `NONE` | 8.6 s | `ACYXpRsz…` |
| dRPC | `send_tx` INCLUDED | 1.43 s | `INCLUDED`, `Started` | 10.7 s | `6quYsQ8C…` |
| dRPC | `send_tx` INCLUDED_FINAL / EXECUTED_OPTIMISTIC / EXECUTED / FINAL | **2.05–2.07 s, HTTP 408** | `{"message":"Request timeout on the free plan, please upgrade to paid plan","code":30}`, but **the tx was still broadcast and succeeded** | 8.6–8.7 s | `5b9HStk8…`, `7XaFNQE7…`, `3bep8KaP…`, `FwimoN2E…` |
| dRPC | `broadcast_tx_commit` / `broadcast_tx_async` | 42–65 ms, **HTTP 400** | `{"message":"method is not available","code":-32601}`, so nothing was sent | — | `DMhPpc68…` (never on chain) |

### E. Long receipt (200-block yield), to see the timeouts the MPC worst case would hit **[VERIFIED]**

Target: `requests.near-examples.testnet` `request({prompt})`, the near-examples yield/resume demo. Nobody answers, so the yield times out after 200 blocks and the callback returns `"Wait"`. Protocol config: `yield_timeout_length_in_blocks = 200` (testnet, protocol 87).

| RPC | Method | Submit returned after | Response | FINAL seen | Blocks tx→last receipt | tx |
|---|---|---|---|---|---|---|
| dRPC | `send_tx` EXECUTED_OPTIMISTIC | 2.04 s | 408 `code:30` (free plan) | 125.1 s | 203 | `353dhc7W…` |
| FastNEAR | `send_tx` EXECUTED_OPTIMISTIC | **30.07 s** | 408 `TIMEOUT_ERROR`, `cause.info.cause="PENDING"`, `status.final_execution_status="INCLUDED_FINAL"` | 123.3 s | 203 | `9DP2uvjd…` |
| FastNEAR | `send_tx` FINAL | **30.08 s** | 408 `TIMEOUT_ERROR` PENDING:INCLUDED_FINAL | 110.7 s | 203 | `HnrbgykB…` |
| FastNEAR | `broadcast_tx_commit` | **10.11 s** | 408 `TIMEOUT_ERROR` PENDING:INCLUDED_FINAL | 126.0 s | 203 | `C7N7mMuR…` |
| FastNEAR | `broadcast_tx_commit` (repeat) | **30.07 s** | 408 `TIMEOUT_ERROR` PENDING:INCLUDED_FINAL | 119.1 s | 203 | `QPfNbfwn…` |
| near.org | `send_tx` EXECUTED_OPTIMISTIC | **33.08 s** | 408 `TIMEOUT_ERROR` PENDING:INCLUDED_FINAL (that is FastNEAR's 30 s plus near.org's ~3 s penalty) | 123.2 s | 203 | `FtiJu1Ja…` |
| near.org | `broadcast_tx_commit` | **33.20 s** | 408 `TIMEOUT_ERROR` PENDING:INCLUDED_FINAL | 131.6 s | 203 | `E8weP5uS…` |

So FastNEAR's hold is 10 s or 30 s depending on which node answers (nearcore's default `polling_timeout` is 10 s, `chain/jsonrpc/src/lib.rs` L146). Design for "the RPC may give up at any point after 2 s". Exact 408 body, abridged:
```json
{"jsonrpc":"2.0","error":{"name":"HANDLER_ERROR","cause":{"name":"TIMEOUT_ERROR","info":{"cause":"PENDING","status":{"final_execution_status":"INCLUDED_FINAL","receipts_outcome":[ … ],"status":"Started","transaction":{ … },"transaction_outcome":{ … }}}}, … },"id":…}
```
nearcore master's newer enum form is `{"Pending":{"status":…}}` (`chain/jsonrpc-primitives/src/types/transactions.rs` L74–86). Parse both.

### F. Robust pattern: measured end to end

`node rpc-lifecycle/demo-robust.mjs mpc` (MPC sign; tx `JCHJ2Kw5RkeyXEk5VVrUkEvkEEeQiCXY3NStifm5mkwX`):
```
[+   181ms] stage: preparing -> signed locally; hash known before broadcast: JCHJ2Kw5RkeyXEk5VVrUkEvkEEeQiCXY3NStifm5mkwX
[+  1466ms] send_tx INCLUDED @fastnear -> 200 INCLUDED
[+  1466ms] stage: submitted {"txHash":"JCHJ2Kw5…"}
[+  5794ms] stage: executed {"final_execution_status":"EXECUTED"}
[+  5795ms] result: {"ok":true,"value":{"scheme":"Secp256k1","big_r":{"affine_point":"0396ca92…37dc"},"s":{"scalar":"5a564838…4f8b"},"recovery_id":1}}
[+  5795ms] JSON paths: result.final_execution_status = EXECUTED | result.transaction.hash = JCHJ2Kw5… | result.status.SuccessValue (base64) = eyJzY2hlbWUiOiJTZWNwMjU2azEiLCJiaWdfciI6... | receipts_outcome.length = 3
```
A single long-poll request on FastNEAR returned the signature 4.3 s after inclusion.

`node demo-robust.mjs yield --kill-after-ms 8000`, then `node demo-robust.mjs --resume` (200-block yield; the process is killed at +9.7 s to simulate a page reload, and the pending hash survives in `pending-tx.json`; tx `2TkKx9pen6za85FxxgpDzcgEQKzpKkLEQe4TUpwxuDx6`):
```
[+  1672ms] send_tx INCLUDED @fastnear -> 200 INCLUDED
[+  9673ms] simulated page reload: process exits; pending tx stays in …/pending-tx.json
--- restart with --resume
[+     1ms] resuming persisted tx 2TkKx9pe… submitted at 2026-10-21T12:07:25.312Z
[+ 10124ms] stage: included {"final_execution_status":"INCLUDED_FINAL"}      <- first long-poll: 408 after the node's 10 s hold, carrying the pending status
[+108822ms] stage: executed {"final_execution_status":"EXECUTED"}
[+108822ms] result: {"ok":true,"value":"Wait"}                               <- the demo contract's timeout value
[+108822ms] total since original submit: 123409 ms
```
Request economy, measured in a second yield run (`4FuXc7EV…`): **5 tracker RPC requests over 120 s**, against roughly 120 for 1 s short-polling.

### G. near-connect "NEAR CLI" wallet driven in real Chrome (what the dApp actually receives)

`node browser-runner/wallet-cli-flow.mjs` (system Chrome, headless; Next 16 production build of `/wallet` with `new NearConnector({ network: 'testnet', footerBranding: null })`). It connects with `connect({ walletId: 'near-cli' })`, fills the account id in the sandboxed `about:srcdoc` iframe, picks "keychain" on the signing-method step, then clicks "Sign via MPC", which calls `wallet.signAndSendTransaction({ receiverId:'v1.signer-prod.testnet', actions:[{type:'FunctionCall', params:{methodName:'sign', …, gas:'50000000000000', deposit:'1'}}] })`. The iframe showed this command for the user to run:
```
near contract call-function as-transaction 'v1.signer-prod.testnet' 'sign' json-args '{"request":{"payload_v2":{"Ecdsa":"<64 hex>"},"path":"satchel/web-wallet-probe/evm","domain_id":0}}' prepaid-gas '50 Tgas' attached-deposit '0.000000000000000000000001 NEAR' sign-as 'satchel-spk-web-e9ea1a.testnet' network-config testnet sign-with-keychain
```
The script ran it with `sign-with-legacy-keychain display`, broadcast it with `broadcast_tx_async` and pasted the hash at once. What the dApp received:
```
[+0ms]    event wallet:signIn [{"accountId":"satchel-spk-web-e9ea1a.testnet","publicKey":""}]
[+0ms]    calling wallet.signAndSendTransaction (MPC sign, payload f68b4fb6...)
[+4075ms] RESOLVED tx=B7Hi4WQCrcJhvKkfR75aDTb9VF2DCBHEJYTuy8nWDX9X final_execution_status=INCLUDED_FINAL status="Started" receipts=2
```
So the promise **resolved with a partial outcome**: no `SuccessValue` and no signature. `trackTx('B7Hi4WQ…')` then returned the signature (`big_r.affine_point 039653de…`). Note also that `accounts[0].publicKey` is `""` for this wallet.

### H. What the official docs and templates recommend (2026-10-21) **[SOURCED]**

- **NEAR Docs "Wallet Login"** (`near/docs` @117e742, `web3-apps/tutorials/wallet-login.mdx`) recommends `npm install @hot-labs/near-connect near-api-js`, or `near-connect-hooks` for React (`NearProvider` and `useNearWallet()` with `signIn`, `signOut`, `viewFunction`, `callFunction`, `signAndSendTransactions`, `signNEP413Message`). Its connector example passes `features: { signMessage, signTransaction, signInWithoutAddKey, signAndSendTransaction, signAndSendTransactions }`, which gives the empty wallet list (§A). Its hooks `getBalance` example reads `balance.available`, but the hook returns `account.amount` (a bigint). Ethereum wallets are added through the `https://evm-on-near.dev/manifest.json` manifest.
- **`create-near-app@9.0.2`** (2026-01-08) Next template (`templates/frontend/next-app`) uses `next ^15`, `react ^18`, `near-connect-hooks ^1.0.2` and bootstrap. It puts `'use client'` on the root `layout.tsx` and wraps everything in `<NearProvider>` with the defaults (testnet, `test.rpc.fastnear.com`). It is dated next to Next 16 and React 19, so use it for patterns only.
- **`near-connect-hooks@1.1.6`** (277 lines): its `NearProvider` builds a `FailoverRpcProvider` from `config.providers[network]`, defaulting to `https://test.rpc.fastnear.com` and `https://free.rpc.fastnear.com`, and always registers `function-call-key-plugin` (its `^1.0.3` range resolves to 1.0.4; npm latest is 2.1.0). In both versions the plugin signs locally only when a function-call key was created at sign-in *and* the call is a zero-deposit FunctionCall to that contract. Otherwise it passes through to the wallet. `callFunction` returns `getTransactionLastResult(outcome)`, which is unsafe for partial outcomes.
- **`@near-wallet-selector`**: the README (`near/wallet-selector` @b532bcd, 2025-12-09) says: *"While Wallet Selector remains supported during the transition period, the NEAR Infra Committee / NEAR Foundation recommends exploring the new preferred connector — HOT Connect"*. The last npm release is 10.1.4 (2025-12-04).

## Reference: exact APIs, types, commands, tested snippets

### near-connect 0.11.4 API (from `src/NearConnector.ts`, `src/types/index.ts`)

```ts
import { NearConnector } from '@hot-labs/near-connect';            // CJS package; works in Next 16 client components
const connector = new NearConnector({
  network: 'testnet',                 // default 'mainnet'!
  // features: { signAndSendTransaction: true },  // filter; every true key must be true in the wallet manifest
  // walletConnect: SignClient.init({ projectId, metadata }),   // adds WalletConnect + Unity wallets
  footerBranding: null,              // or { icon?, heading, link, linkText }
  // manifest: '<url>' | { wallets, version },  excludedWallets: ['okx-wallet'],  autoConnect: true,
  // providers: { testnet: ['https://rpc.testnet.fastnear.com'] },  // passed to wallets that honour it (MNW)
  // cspNonce, logger: console, storage: <DataStorage>  (default LocalStorage)
});
await connector.whenManifestLoaded;
connector.availableWallets;                     // filtered by network + features
await connector.connect();                      // opens the selector modal; resolves NearWalletBase
await connector.connect({ walletId: 'intear-wallet' });          // skip the modal
await connector.connect({ signMessageParams: { message, recipient, nonce /* Uint8Array(32) */ } }); // sign-in + NEP-413
await connector.disconnect();
const { wallet, accounts } = await connector.getConnectedWallet(); // throws 'No wallet selected' if none (restore on load)
const wallet2 = await connector.wallet();       // throws 'No accounts found' if not signed in
connector.on('wallet:signIn', ({ wallet, accounts, source }) => {});     // accounts: { accountId, publicKey? }[]
connector.on('wallet:signInAndSignMessage', ({ accounts }) => {});       // accounts[i].signedMessage
connector.on('wallet:signOut', () => {});
connector.on('selector:walletsChanged', () => {});
```

`NearWalletBase`:
```ts
signIn(data?: { network?, addFunctionCallKey? }): Promise<Account[]>
signInAndSignMessage(data): Promise<AccountWithSignedMessage[]>
signOut(data?): Promise<void>
getAccounts(data?): Promise<Account[]>
signAndSendTransaction(p: { receiverId: string; actions: Array<Action | ConnectorAction>; signerId?; network? }): Promise<FinalExecutionOutcome>
signAndSendTransactions(p: { transactions: { receiverId, actions }[]; network? }): Promise<FinalExecutionOutcome[]>
signMessage(p: { message: string; recipient: string; nonce: Uint8Array; network?; signerId? }): Promise<{ accountId; publicKey; signature }>  // NEP-413, signature base64
signDelegateActions(p): Promise<{ signedDelegateActions: string[] }>   // borsh base64 SignedDelegate (NEP-366)
```
Action formats: either a near-api-js `Action` (`actions.functionCall(...)`; the README calls this "recommended") or the wallet-selector shape:
```ts
{ type: 'FunctionCall', params: { methodName: 'sign_for', args: { token_id: '1', chain: 'Evm', payload_hex }, gas: '100000000000000', deposit: '1' } }
// also: Transfer{deposit}, AddKey{publicKey, accessKey:{permission:'FullAccess'|{receiverId, allowance?, methodNames?}}}, DeleteKey, CreateAccount, DeployContract{code}, DeleteAccount, Stake, UseGlobalContract, DeployGlobalContract
```
`FinalExecutionOutcome` is `@near-js/types`' type: `transaction.hash`, `transaction_outcome.{id, block_hash}`, `receipts_outcome[]`, `status: {SuccessValue} | {Failure} | 'Started' | 'NotStarted'`, plus the extra RPC field `final_execution_status` when the wallet passes through the RPC answer.

**NEP-413 verification (server):** `import { verifyMessage } from 'near-api-js/nep413'`, then `await verifyMessage({ signerAccountId, signerPublicKey, payload: { message, recipient, nonce }, signature, provider })`. It throws unless the key is a FullAccess key of that account and the signature verifies. **[SOURCED]** `src/nep413/verify.ts`. Satchel does not need NEP-413 for the MVP. Use it only if a server route has to authenticate a user (for example delegate management).

### Wallet provider for Next 16 (pattern to rebuild on Nov 1)

```tsx
'use client';
// src/lib/near/wallet.tsx: ONE connector per tab (module singleton; StrictMode runs effects twice in dev)
import { NearConnector, type NearWalletBase } from '@hot-labs/near-connect';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

let connector: NearConnector | null = null;
export function getConnector() {
  if (typeof window === 'undefined') throw new Error('client only');
  return (connector ??= new NearConnector({ network: 'testnet', footerBranding: null }));
}
type Ctx = { accountId: string | null; wallet: NearWalletBase | null; signIn(): Promise<void>; signOut(): Promise<void>; ready: boolean };
const WalletCtx = createContext<Ctx | null>(null);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, set] = useState<{ accountId: string | null; wallet: NearWalletBase | null; ready: boolean }>({ accountId: null, wallet: null, ready: false });
  useEffect(() => {
    const c = getConnector();
    const onIn = async ({ wallet, accounts }: { wallet: NearWalletBase; accounts: { accountId: string }[] }) => set({ wallet, accountId: accounts[0]?.accountId ?? null, ready: true });
    const onOut = () => set({ wallet: null, accountId: null, ready: true });
    c.on('wallet:signIn', onIn); c.on('wallet:signOut', onOut);
    c.getConnectedWallet().then(({ wallet, accounts }) => set({ wallet, accountId: accounts[0].accountId, ready: true })).catch(() => set((s) => ({ ...s, ready: true })));
    return () => { c.off('wallet:signIn', onIn); c.off('wallet:signOut', onOut); };
  }, []);
  const value: Ctx = { ...state, signIn: async () => { await getConnector().connect(); }, signOut: async () => { await getConnector().disconnect(); } };
  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}
export const useWallet = () => { const v = useContext(WalletCtx); if (!v) throw new Error('WalletProvider missing'); return v; };
```
Mount `<WalletProvider>` inside a client `providers.tsx` that the root `layout.tsx` (a Server Component) renders. Do not put `'use client'` on `layout.tsx` itself, which is what create-near-app's Next template does. **[VERIFIED]** This exact file compiled under Next 16.4.2 with TS strict and rendered `ready account=none` in Chrome (`next-polyfill-probe/src/lib/wallet.tsx`, route `/provider-check`).

### near-api-js 7.3.1: scripts, demo route, reads (all used in the spikes)

```ts
import { Account, JsonRpcProvider, FailoverRpcProvider, KeyPairSigner, actions, teraToGas, createTransaction, encodeTransaction, baseEncode, baseDecode } from 'near-api-js';
const provider = new JsonRpcProvider({ url: 'https://rpc.testnet.fastnear.com' });
// view
const token = await provider.callFunction({ contractId: 'satchel.<team>.testnet', method: 'nft_token', args: { token_id: '1' } });
// local-key send (scripts / demo signer). Key from the legacy keychain JSON: { account_id, public_key, private_key }
const account = new Account(accountId, provider, privateKeyString /* 'ed25519:…' */);
const out = await account.signAndSendTransaction({
  receiverId: 'satchel.<team>.testnet',
  actions: [actions.functionCall('sign_for', { token_id: '1', chain: 'Evm', payload_hex }, teraToGas('100'), 1n)],
  waitUntil: 'INCLUDED',              // default EXECUTED_OPTIMISTIC: auto re-sends on 408 for minutes. INCLUDED + trackTx is clearer.
});
const txHash = out.transaction.hash;
// status
await provider.viewTransactionStatus({ txHash, accountId, waitUntil: 'NONE' });            // RPC 'tx'
await provider.viewTransactionStatusWithReceipts({ txHash, accountId, waitUntil: 'NONE' }); // RPC 'EXPERIMENTAL_tx_status'
// hash BEFORE sending (what lib.mjs does):
const signer = KeyPairSigner.fromSecretKey(privateKeyString);
const tx = createTransaction(accountId, await signer.getPublicKey(), receiverId, nonce, [action], baseDecode(finalBlockHash));
const { txHash: hashBytes, signedTransaction } = await signer.signTransaction(tx);
const hash = baseEncode(hashBytes), signedB64 = Buffer.from(encodeTransaction(signedTransaction)).toString('base64');
await provider.sendJsonRpc('send_tx', { signed_tx_base64: signedB64, wait_until: 'INCLUDED' });
```
Facts **[SOURCED]** @2546c85: `DEFAULT_WAIT_STATUS = 'EXECUTED_OPTIMISTIC'` (`src/accounts/account.ts` L36). `signAndSendTransaction` retries `InvalidNonceError` up to 10 times. `throwOnFailure` (default true) throws the parsed `status.Failure`. `JsonRpcProvider` retries HTTP 408/500/503 12× with 500 ms × 1.5 (`src/providers/fetch_json.ts`). Re-sending the identical signed tx is idempotent in nearcore (`send_tx_internal`: *"subsequent send of the same transaction will not cause any new side-effects"*).

Raw JSON-RPC (any provider):
```json
{"jsonrpc":"2.0","id":1,"method":"send_tx","params":{"signed_tx_base64":"<b64>","wait_until":"INCLUDED"}}
{"jsonrpc":"2.0","id":1,"method":"tx","params":{"tx_hash":"<base58>","sender_account_id":"<signer>","wait_until":"EXECUTED_OPTIMISTIC"}}
```
Result JSON paths: `result.final_execution_status` (`NONE|INCLUDED|EXECUTED_OPTIMISTIC|INCLUDED_FINAL|EXECUTED|FINAL`); `result.status.SuccessValue` (base64; `""` means the method returned nothing); `result.status.Failure.ActionError.kind.FunctionCallError.ExecutionError` (the panic string, for example `"Smart contract panicked: ERR_NOT_OWNER"`); `result.transaction.hash`; `result.transaction_outcome.{id,block_hash}`; `result.receipts_outcome[i].{id,block_hash,outcome.{executor_id,status,logs,gas_burnt}}`. NEP-297 events are in `receipts_outcome[i].outcome.logs` as `EVENT_JSON:{…}`.

### Tested tracker (`research/spikes/web/rpc-lifecycle/track-tx.mjs`; browser-safe: fetch, AbortController, atob, TextDecoder)

```js
const TERMINAL = new Set(['EXECUTED_OPTIMISTIC', 'EXECUTED', 'FINAL']);
function decodeSuccessValue(b64) {
  if (!b64) return null;
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const text = new TextDecoder().decode(bytes);
  try { return JSON.parse(text); } catch { return text; }
}
function classify(http, body) {
  if (body?.result) {
    const r = body.result, st = r.status;
    if (st && typeof st === 'object' && ('SuccessValue' in st || 'Failure' in st) && TERMINAL.has(r.final_execution_status)) return { kind: 'done', outcome: r };
    return { kind: 'pending', status: r.final_execution_status, outcome: r };
  }
  const e = body?.error, cause = e?.cause?.name;
  if (cause === 'TIMEOUT_ERROR' || http === 408) {
    const pending = e?.cause?.info?.status ?? e?.cause?.info?.Pending?.status;   // nearcore 2.14 / master shapes
    return { kind: 'pending', status: pending?.final_execution_status ?? 'UNKNOWN', outcome: pending };
  }
  if (cause === 'UNKNOWN_TRANSACTION') return { kind: 'unknown' };
  if (cause === 'INVALID_TRANSACTION') return { kind: 'fatal', error: e };
  return { kind: 'retry', error: e ?? { http } };          // 429, 5xx, network, dRPC -32601 …
}
export async function trackTx({ txHash, senderId, rpcUrls, onStage = () => {}, deadlineMs = 240_000, unknownGraceMs = 60_000, signal }) {
  const t0 = Date.now(); let i = 0, backoff = 500, last = '';
  const stage = (s, d) => { if (s !== last) { last = s; onStage({ stage: s, elapsedMs: Date.now() - t0, detail: d }); } };
  stage('submitted', { txHash });
  while (Date.now() - t0 < deadlineMs) {
    if (signal?.aborted) throw new Error('aborted');
    const url = rpcUrls[i % rpcUrls.length];
    let http = 0, body, selfAborted = false;
    const ctl = new AbortController(); const timer = setTimeout(() => { selfAborted = true; ctl.abort(); }, 35_000);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ jsonrpc: '2.0', id: 'track', method: 'tx', params: { tx_hash: txHash, sender_account_id: senderId, wait_until: 'EXECUTED_OPTIMISTIC' } }) });
      http = res.status; body = await res.json().catch(() => null);
    } catch { http = 0; } finally { clearTimeout(timer); }
    if (selfAborted) continue;
    const c = classify(http, body);
    if (c.kind === 'done') {
      stage('executed', { final_execution_status: c.outcome.final_execution_status });
      const st = c.outcome.status;
      return 'SuccessValue' in st ? { ok: true, value: decodeSuccessValue(st.SuccessValue), outcome: c.outcome } : { ok: false, failure: st.Failure, outcome: c.outcome };
    }
    if (c.kind === 'fatal') return { ok: false, fatal: c.error };
    if (c.kind === 'pending') { stage(c.status === 'NONE' || c.status === 'UNKNOWN' ? 'submitted' : 'included', { final_execution_status: c.status }); backoff = 500;
      if (http === 408 && body?.error?.code === 30) await sleep(1500); continue; }   // dRPC free plan: pace manually
    if (c.kind === 'unknown') { if (Date.now() - t0 > unknownGraceMs) return { ok: false, lost: true }; await sleep(1000); continue; }
    i++; await sleep(backoff); backoff = Math.min(backoff * 2, 5000);                 // rotate provider on errors
  }
  return { ok: false, deadline: true };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
```
Use `rpcUrls = ['https://rpc.testnet.fastnear.com', 'https://near-testnet.drpc.org']`. One long-poll costs one request per 10–30 s on FastNEAR, versus one request per second when short-polling. That matters under the free-tier limits.

### Client flow for `SigningProgress` (state machine)

```
idle ──Send──▶ preparing ──payloads ready──▶ awaiting_wallet ──▶ signing ──▶ signed ──▶ broadcasting ──▶ sent ──▶ confirmed
                  │                              │      ▲            │  (MPC done)       (chain RPC)      (explorer link)
                  │                              │      └ contract watcher sees Pending (wallet still open)
                  ▼                              ▼                   ▼
               error                 rejected | wallet_error   failed (Failure) | timed_out (on_signed Err, ~200 blocks) | lost (no record 60 s)
```
1. **preparing:** build the chain tx and its payload hash(es). For EVM, fetch nonce and fees while the review card renders, not on the Confirm click. The wallet popup needs the click's user activation; otherwise near-connect shows an extra "Open wallet" button. Then write `localStorage['satchel:pending']`, an array of entries like the one below, **before** calling the wallet:
   ```ts
   { id: uuid, tokenId, chain, payloadHashes: string[], unsignedTx: string /* serialized */, signerId,
     createdAt: number, txHash?: string, stage: 'awaiting_wallet' | 'signing' | 'signed' | 'sent' | …, signatures?: unknown[] }
   ```
2. **awaiting_wallet ("Approve in your wallet"):** `await wallet.signAndSendTransaction({ receiverId: SATCHEL, actions:[{type:'FunctionCall', params:{methodName:'sign_for', args, gas:'100000000000000', deposit:'1'}}] })`. In parallel, start the **contract watcher**: every 2 s, `callFunction('get_sign_request', {token_id, payload_hash})`. A record with `Pending` means the tx is on chain, so move to `signing` even though the wallet has not resolved yet (Intear and Meteor may keep their popup open until execution).
3. **signing ("Signing with NEAR's signer network"):** start the elapsed timer (copy cues at 30 s and 90 s, per plan B4). Done when any source finishes first:
   - (a) the wallet resolves with `status.SuccessValue`: decode it.
   - (b) the wallet resolves with a partial outcome: `trackTx(outcome.transaction.hash)`.
   - (c) the contract watcher reports `Signed{signature}`.
   Save `txHash` to the pending entry as soon as you know it.
4. **signed → broadcasting → sent → confirmed:** chain-specific (31/30/32 docs). Mark the entry `sent` with the chain tx id, and keep it until it is confirmed.
5. **Errors:**
   - Wallet rejection: messages seen in the executors include `"User rejected"`, `"User closed the window"`, `"User rejected the transaction"` and `"Popup blocked"`. Intear's post-broadcast timeout is `"Failed to send transaction 1: Timeout"`, which is not a rejection. Treat it as `cancelled` only if the contract watcher still shows no record after about 10 s.
   - Wallet error after broadcast (Intear 60 s, network): keep watching.
   - `status.Failure`: map the panic string (`ERR_NOT_OWNER`, `ERR_FROZEN`, …) to copy.
   - MPC timeout: `on_signed` gets `Err(PromiseError)` about 200 blocks (~120 s) after the request, then returns `null` or marks the record `Failed`. Show the plan's copy: "The signer network did not answer in time. Nothing was sent and no funds moved."
6. **Resume after reload:** on app start, read `satchel:pending`. For every non-terminal entry: if `txHash` is known, `trackTx`; otherwise use the contract watcher by payload hash. **If an entry is `signed` but not `sent`, offer "Broadcast now".** A signed-but-unbroadcast tx is exactly the "unspent signature" that the clean-history check flags (70-security). The signature is already public in the tx outcome anyway.
7. **Redirect fallback (P2):** if the page loads with `?transactionHashes=h1,h2` (or `errorCode`/`errorMessage`), attach the hashes to the newest pending entry, start `trackTx`, and strip the params with `history.replaceState`. No testnet wallet in near-connect redirects the whole page today (MNW uses popup + postMessage and is mainnet-only), but older or mobile flows can.

Run the trackers in a module-level store, not in component state. A small `pendingSigns` store with `subscribe()` / `useSyncExternalStore` works. Cache Components' `<Activity>` cleans up effects of hidden routes.

## Gotchas & failure modes

1. **`network` defaults to `'mainnet'`** in `NearConnector`. Always pass `'testnet'`.
2. **Testnet wallet set is small.** HOT and MyNearWallet are missing. Write the README so judges and buyers use Meteor (web wallet or extension) or Intear.
3. **Docs snippet `features: { signTransaction: true, … }` produces 0 wallets.**
4. **Partial outcomes:** `outcome.status` can be `"Started"`. `getTransactionLastResult(outcome)` (used by near-connect-hooks' `callFunction`) then gives `undefined` or a wrong value. Always check `final_execution_status` and `status` before trusting a wallet result.
5. **Failures are resolved, not rejected** (Intear explicitly). Check `'Failure' in outcome.status`.
6. **Wallet rejection ≠ tx not sent.** Intear rejects after 60 s while the tx is still running. Confirm through chain state before telling the user "nothing happened".
7. **`send_tx` with `wait_until:"NONE"` does not validate anything.** It returns `NONE` even for a bad nonce or bad signature (`chain/jsonrpc/src/lib.rs` L1200–1206 calls `send_tx_async` and returns). Use `INCLUDED` when you submit yourself.
8. **dRPC free plan:** any blocking call fails at about 2 s with HTTP 408 `code 30`, *but the tx is still broadcast*. Do not retry the submit as if it were a new tx. Re-send the *same* bytes (idempotent) or switch to tracking.
9. **near-api-js auto-retries 408** by re-sending the same signed tx up to 12 times. That is harmless (idempotent) but it hides progress and can block a script for minutes.
10. **`tx_status` (new name) is not available on dRPC** (`-32601`). Use `tx` (no receipts) or `EXPERIMENTAL_tx_status`.
11. **chainsig.js `ChainSignatureContract.sign()`** defaults to 300 Tgas and talks to near.org unless you pass `fallbackRpcUrls`. Satchel calls `sign_for` on its own contract anyway, never MPC `sign` directly from the browser.
12. **FastNEAR 429 can look like a CORS failure in the browser.** Treat `TypeError: Failed to fetch` as retryable.
13. **near-connect stores its session in `localStorage`** (key `selected-wallet`, plus per-wallet sandbox storage) and caches executors in IndexedDB `hot-connector`. Clearing site data logs the user out. iOS private mode IndexedDB failures are tolerated since 0.11.5, which is unreleased; 0.11.4 may fail to open a wallet there. **[SOURCED]** CHANGELOG
14. **CSP:** wallet executors run in `srcdoc` sandboxed iframes loaded from `raw.githubusercontent.com`, `wallet.intear.tech` and others. A strict CSP breaks them unless you pass `cspNonce` and allow those origins. Keep CSP off for the MVP.
15. **Popup blockers:** do async work before the click. If `signAndSendTransaction` runs after an `await`, the wallet popup may be blocked and near-connect asks for a second click.

## Recommendations for Satchel

- **P0** `@hot-labs/near-connect@0.11.4` + `near-api-js@7.3.1` + the hand-written `WalletProvider` above. `network:'testnet'`, `footerBranding:null`, no `features` filter (or only `{ signAndSendTransaction: true }`).
- **P0** Contract additions (tell sdk/sec/mpc on Nov 1):
  - `sign_for` is `#[payable]` and calls `assert_one_yocto()`.
  - It records `SigRecord{status: Pending}` for `(token_id, payload_hash)` in the first receipt.
  - `on_signed` stores `Signed{big_r, s, recovery_id}` or `Failed`, emits NEP-297 `signature_issued` / `signature_failed`, and returns `Option<SignatureResponse>`.
  - Add the view `get_sign_request(token_id, payload_hash) -> Option<SigRecordView>`.
  - Batch BTC inputs (`sign_for_many` or several FunctionCall actions in one tx) so N inputs need one wallet approval. The watcher then tracks N payload hashes ("Signing 2 of 3 inputs").
- **P0** `SigningProgress` built on the state machine above. The tracker (`trackTx`) uses providers `[FastNEAR, dRPC]` and a 240 s deadline. Persist in `localStorage['satchel:pending']` and resume on load.
- **P0** Gas: attach **100 Tgas** to `sign_for`. Direct `sign` burns about 8.6 Tgas total and the MPC requires at least 15 Tgas on its `sign` call. The unused prepaid gas is refunded. Final numbers are owned by `mpc` (10-mpc-signer.md).
- **P1** Map wallet-specific rejection strings into one "cancelled" state. Show "Still working…" past 60 s even if the wallet popup errors (Intear).
- **P1** Test matrix before the demo: Meteor web wallet and Intear, each with `sign_for` (EVM), `nft_transfer`, `buy`. Record whether each wallet's promise resolves before or after the signature.
- **P2** `?transactionHashes=` redirect handler. NEP-413 sign-in only if a server route needs auth.

## Deltas vs plan (near_hackathon.md)

| Plan | Finding | Recommended change |
|---|---|---|
| L38 and A-Versions: "`@hot-labs/near-connect` (0.8.2 per a secondary index)" | **0.11.4** (2026-05-11) is current. 0.9 added `signDelegateActions` and plugins, 0.10 `signInAndSignMessage`, 0.11 `signInWithFunctionCallKey` and `cspNonce`. The repo moved to `hot-dao/near-selector`. | Pin `0.11.4` |
| A-Versions: "near-connect-hooks" | 1.1.6 (used by NEAR Docs and create-near-app 9.0.2). It bundles `function-call-key-plugin` and defaults to `test.rpc.fastnear.com`. | Optional. Use our own provider for `sign_for`. |
| A-Versions: "near-api-js" | **7.3.1**, a single package (`@near-js/*` frozen at 2.5.1) | Pin `near-api-js@7.3.1` |
| B4 SigningProgress: "Approve in your wallet" → "Signing with NEAR's signer network" | With near-connect we **cannot** observe "approved" directly. Wallets resolve at different times (NONE vs EXECUTED_OPTIMISTIC vs a 60 s reject). | Drive stages from chain state (contract watcher plus tx tracker), not from the wallet promise. Keep the copy. |
| B4: "at 90 s 'Still working. The network allows up to about 2 minutes.'" | Confirmed: 200-block yield ≈ 120 s on testnet. Typical MPC today is 7–17 s (median 8.7 s, n=23). | Keep. The "Usually under a minute" cue at 30 s is accurate. |
| B4 timeout copy "Nothing was sent and no funds moved" | True only if the tracker or contract confirms `Failed`. A wallet-side timeout does not mean that. | Show the copy only on a chain-confirmed failure |
| B5: "Attach about 50 Tgas to `sign_for` (estimate)" | MPC requires ≥ 15 Tgas on `sign` (live config). A direct sign burns ~8.6 Tgas. | 100 Tgas attached is safe. `mpc` owns the final number. |
| B5 `#[payable] sign_for` | Needed for security and wallet routing: function-call keys can't attach deposits | Make it `assert_one_yocto` explicitly |
| B5 `on_signed … logs SignatureIssued` | Logs alone can't be queried cheaply from the browser | Also store the signature and status in `sig_log` and expose `get_sign_request` |
| B8 risk "MPC latency or 200-block timeout → Retry UX" | Retry must not re-sign blindly: the first request may still complete | Retry only after the record shows `Failed`. Show "Broadcast now" if a late signature arrives. |
| Not in plan | Testnet wallets are limited to Meteor, Intear, Ledger, Nightly, EVM wallets and NEAR CLI | README and judge instructions should name Meteor or Intear |

## Open questions / human actions

1. **Human (P0, Phase 0):** install **Meteor** (web wallet `https://wallet.meteorwallet.app` or the Chrome extension) and **Intear** (`https://wallet.intear.tech`) with testnet accounts, for at least the seller and buyer personas. Then run one `sign_for` via each wallet once the contract exists (Nov 1–3) and note when the wallet promise resolves. Meteor's behaviour could not be observed without a human-driven wallet.
2. **Open (sdk/sec):** accept the `get_sign_request` view and the `SigRecord` status lifecycle. Its storage cost is about 0.002 NEAR per record at 200 bytes, which the 1 yocto + storage deposit model must cover. Who pays: `sign_for` could require `≥ storage cost` instead of exactly 1 yocto. This needs a decision: `assert_one_yocto` vs `deposit ≥ X`. Either blocks function-call keys.
3. **Open (mpc):** confirm that the MPC-side retry or timeout behaviour does not deliver a signature after the yield timeout. If it can, the UI must handle a late `Signed` after showing `timed_out`.
4. **Open:** WalletConnect `projectId` (Reown) is needed only if we want the WalletConnect and Unity wallets on testnet. Probably skip it.
