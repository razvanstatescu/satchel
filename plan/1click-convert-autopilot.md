# 1Click inside Satchel: Convert and Autopilot (research and implementation plan, 2026-11-04)

> **Status:** proposal for Razvan. Nothing is implemented. Decisions needed are listed in §9 (proposed H-27 to H-34).
> **Scope:** the two ideas Razvan picked from the 1Click synergy research on 2026-11-04:
> - **#1 Convert**: swap coins *inside* a Satchel.
> - **#5 Autopilot**: a C5 delegate that runs recurring 1Click swaps (DCA) within the owner's caps.
>
> For each, the plan covers a 100% testnet flow (only the 1Click service is replaced by an API-identical emulator) and a
> mainnet path that is built now and switched on later.
>
> **Inputs:**
> - Our code: contract `sign.rs`, `allowance.rs`, `parse/{btc,evm,sol}.rs`; core `chains/*`, `policy/*`; web
>   `lib/signing/*`, `lib/config.ts`, `lib/onboarding-kv.ts`; `tools/e2e/allowance.ts`.
> - Specs and KB: `docs/specs/C1-C2-C3-C7.md`, `docs/specs/C5.md`, kb/51.
> - The live 1Click OpenAPI and docs, the 1Click TS SDK 0.1.26 source, and live keyless dry quotes.
> - The live HACKATHON.md and the track prompt examples.

## 0. Verdict in one screen

- **Both features need no contract change.** A 1Click swap is "send X to the quote's deposit address". Every send a
  Satchel needs is already a kind `sign_for` accepts, and a C5 delegate may sign it:
  - BTC to any output script;
  - plain ETH on four EVM chains;
  - a USDC `transfer` to the allowlisted Circle token;
  - a plain SOL System transfer.

  So both features are **app, server and tools work**, and they can ship after the Nov 9 freeze, until Nov 13.
- **Testnet: the only thing we cannot use is 1Click itself** (no testnet, ever: Q-007, docs FAQ). We replace it with
  an **emulator that speaks the 1Click v0 API byte for byte**:
  - The same endpoints, schema, statuses and quote-signature scheme.
  - Prices, fees, time estimates and minimum-amount errors come from **live mainnet `dry: true` quotes**.
  - Settlement is real: actual testnet transactions on the real destination chains, from our own liquidity wallets.

  Everything else is real and runs unchanged on testnet: wallet, `sign_for`, caps, MPC, transaction building,
  broadcast, deposit detection, payout, refunds, records and the browser audit. Mainnet differs only by a base URL, an
  API key and a verification key.
- **What the contract guarantees, and what it doesn't.**
  - The contract caps **how much** a delegate can move per rolling 24 h. It cannot see **where a swap pays out**: that
    is inside the 1Click quote, off-chain.
  - What we can do is **detect**: any browser can audit every delegated send. The chain gives the record, the record
    gives the deposit address, and the public `GET /v0/status?depositAddress=` gives back the original quote, with its
    `recipient` and `refundTo`. A send is fine when both are this Satchel's own addresses.
  - Enforcing the destination on-chain needs a v2 contract (§5.3). It is not possible for this frozen one.
- **Biggest implications:**
  1. We would run a hosted, custodial testnet service with hot keys (the emulator treasury and the Autopilot delegate
     key).
  2. Testnet liquidity: tBTC is scarce, and Circle USDC comes at 20 per 2 h per chain.
  3. Testnet4 block times.
  4. Quote deadlines combined with *public* MPC signatures (§8.4).
  5. **1Click's quote signatures do not verify today** with the SDK's published key (§1, F-9), so they can't be a
     security control until 1Click answers.
- **Fit:** Autopilot is almost literally the official `defi` prompt example: a cross-chain DCA on 1Click, whose
  stretch goal is "a NEAR contract … uses Chain Signatures to control a derived BTC address directly". Satchel
  already is that stretch goal.
- **Effort:** about 9–10 dev-days in 9 work packages, parallel across lanes from Nov 5 to Nov 12, plus human
  funding steps. Cut lines are in §6.3.

## 1. What we verified

| # | Fact | Evidence |
|---|---|---|
| F-1 | `sign_for` accepts every send a 1Click deposit needs:<br>• BTC: the outputs may use any script ≤ 520 B, 1–16 outputs.<br>• EVM: empty data, or exactly `transfer(to,amount)` on the chain's Circle USDC; `to` may be any address.<br>• SOL: exactly one System Transfer. | `parse/btc.rs` (rule 7), `parse/evm.rs` L150–154, `parse/sol.rs` L95–100 |
| F-2 | Delegates may sign Evm, Btc and Sol requests, never messages. | `allowance.rs` `authorize_signer` |
| F-3 | Delegate debits:<br>• EVM native: `value + gas_limit × max_fee`.<br>• USDC: the token amount **plus** the native gas debit, so two caps and two spend entries per run.<br>• BTC: Σ outputs not paying our own P2WPKH, plus the fee; delegates are limited to **exactly one input** (AUDIT-01).<br>• SOL: lamports + 5,000. | `allowance.rs` `evm_debits`, `btc_debit`, `request_debits` |
| F-4 | Allowance limits:<br>• rolling 24 h window;<br>• ≤ 4 delegates, ≤ 8 caps;<br>• **≤ 32 spend entries per allowance per 24 h** (summed across caps), so at most 16 USDC runs or 32 native runs a day;<br>• optional expiry;<br>• cleared on every ownership change;<br>• signing paused while listed (`ERR_FROZEN`). | `allowance.rs` L22–26, L240, L269; `sign.rs` step 2 |
| F-5 | `sign_for` is payable: it charges 0.005 NEAR × n with the excess refunded, and the delegate pays storage for its records and spend entries. Function-call keys can't attach deposits, so **the delegate account needs a full-access key**. | `sign.rs` doc comment, C5 §2 rule 3 |
| F-6 | Records carry no memo. Swap context (quote, deposit address) must live off-chain. The deposit address is *in* every record (EVM `to` or the ERC-20 recipient, BTC outputs, SOL destination), so the swap can be traced from public data. | `sign.rs` `SigRecord` |
| F-7 | `GET /v0/status?depositAddress=` needs no auth, sends CORS `*`, and returns `quoteResponse` (the full original `quoteRequest`, including `recipient`, `refundTo` and `signature`), plus `status` and `swapDetails` with origin and destination tx hashes. | vendored and live OpenAPI `GetExecutionStatusResponse`; kb/51 |
| F-8 | Since 2026-10-27 every 1Click swap is confidential. The API is unchanged, but `nearTxHashes` shows only shield and unshield transactions. | docs changelog 2026-10-27 |
| F-9 | **The quote signature does not verify.** The scheme is ed25519 over `base58(sha256(stable-JSON({...request, ...quote, timestamp})))` under the manager key `ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc` (SDK 0.1.26, the latest). A **live dry quote fails** `verifyQuoteSignature()` untampered. All 256 combinations of the optional fields (`confidentiality`, `insured`, `depositMode`, `appFees`, `quoteWaitingTimeMs`, `timeEstimate`, `refundFee`, `withdrawFee`) also fail. The key or the field set probably changed with the confidential rollout. | scratchpad `scripts/vq*.mjs` (2026-11-04) |
| F-10 | Routes we need exist on mainnet: native BTC, SOL, ETH/USDC on Ethereum, Base, Arbitrum and OP (215 tokens, 38 chains). Keyless dry quotes:<br>• 0.001 BTC → SOL: ~800 s.<br>• Base ETH → BTC: ~480 s.<br>• 50 USDC → BTC: ~490 s.<br>• OP USDC → Base USDC: ~37 s.<br>OP (and 8 other chains) has a temporary **$1,000 minimum** on chain-to-chain swaps. | live `/v0/tokens` and dry quotes |
| F-11 | Fees: keyless quotes are injected with `appFees` of 20 bps (1 bp on USDC→USDC). A partner key gives 20 bps, or 1 bp on stablecoin routes. Our own `appFees` are possible (≤ 500 bps total). | live quotes; docs `fees.md` |
| F-12 | Live risks: ~5 BTC stuck since Aug 10; a WBTC→BTC swap stuck in PROCESSING for 20+ days (issue filed Nov 2); the Oct 1 exploit. Docs don't say what happens to deposits after `deadline` ("funds may be lost"). | ecosystem research; `near/intents` issues #399, #358 |
| F-13 | Hosting today is Vercel Hobby (cron is daily only, `plan/decisions.md` relay note), plus Upstash Redis (onboarding survey). The wallet is `@hot-labs/near-connect`, which supports NEP-413 `signMessage`. | decisions L479; `lib/onboarding-kv.ts`; kb/40 |
| F-14 | Official hints: `defi`'s prompt example is a cross-chain DCA vault on 1Click (handle REFUNDED and FAILED in the UI), with the Chain Signatures stretch goal. Q-007: no Intents testnet; use mainnet tiny amounts or `dry: true`. | HACKATHON.md (re-fetched 2026-11-04), `near-hackathon-prompt-examples/tracks/01-defi.md` |

## 2. How the features work

### 2.1 Convert (#1): swap inside the Satchel

The owner picks "from" (e.g. 0.002 BTC) and "to" (e.g. SOL). The swap goes out from the Satchel's BTC address and
lands at the **same Satchel's** SOL address. If it fails, it refunds to the Satchel's BTC address. Value never leaves
the bundle.

```
Owner (browser)                     Satchel web (server)                1Click (mainnet) / Emulator (testnet)    Chains
1 Convert: from, to, amount ──────▶ POST /api/oneclick/quote {dry} ───▶ /v0/quote dry ⇒ amountOut, fees, time
2 Confirm ────────────────────────▶ POST /api/oneclick/quote {real} ──▶ /v0/quote ⇒ depositAddress, deadline, signature
3 core.checkConvertQuote: recipient == own(to) · refundTo == own(from) · assets/amount echo ours · deadline margin ·
  depositAddress valid for the chain and not ours · no memo · (signature, once F-9 is solved)
4 store quote: localStorage intent.swap + POST /api/oneclick/record (Redis: depositAddress → quote; cross-device)
5 build unsigned transfer to depositAddress (amountIn) ─▶ existing pipeline: wallet → sign_for → MPC → verify
6 before broadcast: now < deadline − margin? else re-quote and RETRY with the same nonce/inputs (new address)
7 broadcast ───────────────────────────────────────────────────────────────────────────────────────────────▶ origin chain
8 POST /v0/deposit/submit {txHash, depositAddress} ───────────────────▶ KNOWN_DEPOSIT_TX → PROCESSING
9 poll /v0/status every 5 s ──────────────────────────────────────────▶ SUCCESS (payout tx on the destination chain)
                                                                        | REFUNDED (refund tx to the Satchel) | FAILED
10 Activity: one "Converted 0.002 BTC → 1.1 SOL" row pairs the outgoing record with the incoming payout
```

Details that matter:
- **Swap type:** `EXACT_INPUT`: "spend exactly this". **Max** uses the existing EmptyFlow fee logic: BTC sweeps,
  and EVM native is the balance minus the gas reserve. Quote at `slippageTolerance` 100 bps by default, and refuse
  `depositMode: MEMO` (our chains never need it).
- **Deadline:** 1Click doesn't document a maximum. Use 2 h for EVM and SOL origins and 24 h for BTC origins
  (confirmations), and re-check before broadcasting.
- **USDC origins need ETH for gas on that chain** (the same rule as Send). SOL-side USDC is not supported: the contract
  signs no SPL transfers.
- **Holdings:** amounts in flight show as "In transit to {network}", so the value overview (D-50) doesn't silently
  drop them.
- **Buyers:** clean-history *verdicts* are unchanged (a broadcast, confirmed send can't move coins again). The checker
  adds an informational line per swap, computed in the buyer's browser from F-6 and F-7:
  - "Swap via NEAR Intents: delivered to this Satchel ✓";
  - "refunded to this Satchel ✓";
  - "paid outside this Satchel" (just a send, which the owner may do).

  If a swap is still in flight at listing time, Buy shows "{amount} {coin} still arriving". The contract allows
  listing then; the app warns the seller.

### 2.2 Autopilot (#5): recurring swaps by a capped delegate

The owner says, for example: "every day, turn 10 USDC on Base into BTC, for 30 days, at most 1% price impact". The
owner grants a C5 allowance to the Autopilot delegate, sized from the plan. The agent runs each swap as a normal
delegated `sign_for` with `recipient` and `refundTo` set to the Satchel's own addresses.

**Setup (owner, browser, two signatures):**
1. **Plan form**
   - Inputs: from asset, to asset, amount per run, interval (≥ 1 h), max price impact (bps), end date or number of
     runs.
   - The app computes the caps:
     - Erc20(84532, USDC) = amount × runs per 24 h;
     - Evm(84532) = runs per 24 h × gas_limit × max_fee × 1.3;
     - expiry = plan end.
   - It refuses a plan above F-4's 32 spend entries per 24 h, or one that can't fit.
2. **`set_allowance`** (existing AllowanceFlow, 1 yocto, owner's wallet) for the delegate `autopilot.satchelhq.testnet`.
3. **NEP-413 `signMessage`** over `{"satchel_autopilot_plan": {token_id, plan, created_at}}` with a 32-byte nonce.
   - `POST /api/autopilot/plans` then checks four things:
     - the signature;
     - that the key belongs to the owner (`view_access_key_list` via FastNEAR);
     - that `nft_token(token_id).owner_id` is that account;
     - that `allowance(token_id, autopilot)` exists with enough caps.
   - It stores the plan in Redis.
   - Pause and resume are signed the same way. **The real kill switch stays on-chain: `revoke_allowance`.**

**Each run (server agent, one state machine per run, stored in Redis, advanced by a tick):**

```
DUE → PRECHECK  owner unchanged · not listed · allowance live · core.checkDelegatedSign(remaining caps) OK
    → QUOTE     dry quote vs /v0/tokens reference: price impact ≤ plan max, else SKIPPED(price)
                real quote (recipient = own(to), refundTo = own(from)) → core.checkConvertQuote
    → BUILD     unsigned tx: EVM next nonce (chain + pending runs); BTC: ONE UTXO ≥ amount + fee (F-3); SOL: fresh blockhash
    → SIGN      sign_for as delegate (async submit, store the NEAR tx hash; never trust the RPC promise: CLAUDE.md)
    → WAIT_SIG  poll records/tx; MPC timeout → re-sign the same unsigned tx (same nonce/inputs)
    → BROADCAST deadline check (else re-quote, same nonce) → origin chain
    → SUBMIT    /v0/deposit/submit
    → TRACK     /v0/status until SUCCESS | REFUNDED | FAILED;  > 3 × timeEstimate ⇒ flag "slow" (F-12)
    → DONE
Stops: ERR_FROZEN → plan PAUSED (listed) · ERR_NOT_OWNER / allowance gone → plan ENDED (sold or given)
       ERR_ALLOWANCE_EXCEEDED / _RATE → run SKIPPED · ERR_ALLOWANCE_EXPIRED → ENDED
```

The browser audit (§2.1) runs on the owner's Autopilot panel for every delegated record. "Every run delivered to this
Satchel ✓" is computed **without trusting our server**: records come from the contract and quotes from 1Click (or the
emulator) directly.

**Self-hosting:** `tools/agent/autopilot.ts` runs the same core machine with your own delegate account from
`~/.near-credentials`. That is "bring your own agent", and it's useful for the AI screening (Q-017).

## 3. The trust model, stated plainly

| Actor | Can do | Bounded by | Detected by |
|---|---|---|---|
| The owner | anything, as today | — | clean history (unchanged) |
| The Autopilot delegate (our server key) | send up to the remaining caps per rolling 24 h, **to any address** (not only 1Click) | the contract (F-3, F-4); expiry; reset on sale; paused while listed | the browser audit flags "paid outside this Satchel"; the owner revokes |
| 1Click (mainnet) | take the deposit and not deliver, or deliver late (F-12) | nothing on-chain; refund policy; deadline | status polling and a "slow" flag; saved quote + `correlationId` for support |
| The emulator (testnet) | the same as 1Click, and it is *our* service | — | the same; it is testnet only |

**The blast radius of a compromised Autopilot key** is the sum of the remaining 24-h caps across every Satchel that
granted it. Keep caps tight by construction: the setup computes them from the plan, with 30% gas headroom only.

## 4. Testnet emulation: the 1Click emulator

### 4.1 Principle
Replace **only** the 1Click service. The app, the agent and the tests talk to `ONECLICK_BASE`, and only that changes
between networks:

| | testnet | mainnet |
|---|---|---|
| `ONECLICK_BASE` | `https://usesatchel.xyz/api/intents-emu` (or `http://localhost:8787` locally) | `https://1click.chaindefuser.com` |
| `ONECLICK_API_KEY` | — | the partner key (H) |
| `ONECLICK_QUOTE_PUBKEY` | the emulator's ed25519 key | 1Click's manager key (once F-9 is solved) |

**Asset ids stay the mainnet ids.** The emulator maps each one to a testnet asset, so app code has no network branch:

| 1Click asset id (mainnet) | Testnet asset the emulator settles |
|---|---|
| `nep141:btc.omft.near` | BTC testnet4 (P2WPKH tb1q) |
| `nep141:eth.omft.near` / `nep141:eth-0xa0b86991…eb48.omft.near` | Sepolia ETH / Circle USDC `0x1c7d4b19…7238` |
| `nep141:base.omft.near` / `nep141:base-0x833589fc…2913.omft.near` | Base Sepolia ETH / USDC `0x036cbd53…dcf7e` |
| `nep141:arb.omft.near` / `nep141:arb-0xaf88d065…5831.omft.near` | Arbitrum Sepolia ETH / USDC `0x75faf114…aa4d` |
| OP ETH / USDC (`nep245:v2_1.omni.hot.tg:10_…`) | OP Sepolia ETH / USDC `0x5fd84259…30d7` |
| `nep141:sol.omft.near` | Solana devnet SOL |

The USDC addresses are the contract's `ERC20_TOKENS`, so the emulator and the contract can't disagree. `/v0/tokens`
returns exactly these, with live mainnet prices.

### 4.2 Behaviour, endpoint by endpoint

- **`GET /v0/tokens`:** the table above, with `price` and `priceUpdatedAt` taken from live 1Click `/v0/tokens`
  (60 s cache).
- **`POST /v0/quote`**
  - **Pricing.** It forwards the same request to **real 1Click with `dry: true`**:
    - same asset ids and amount (1:1 units);
    - addresses mapped to mainnet format: tb1… → bc1… (same witness program, re-encoded); EVM and SOL addresses are
      unchanged.

    It returns real `amountOut`, `minAmountOut`, `timeEstimate`, `refundFee`, `withdrawFee`, and **real errors**
    (e.g. a minimum amount, "Failed to get quote", the OP $1,000 rule). Testnet balances (≈ 0.0005–0.002 tBTC,
    0.05 ETH, a few USDC or SOL) map to $40–$150 notional, which is above most minimums.
  - **Fallback.** If 1Click is unreachable, it uses `/v0/tokens` prices − 20 bps, and marks the response header
    `x-emu-pricing: fallback`.
  - **Non-dry quotes** also allocate a fresh **deposit address** from an HD seed (env `EMU_SEED`), index from Redis
    `INCR`:
    - BTC: `m/84'/1'/0'/0/i`, P2WPKH;
    - EVM: `m/44'/60'/0'/0/i` (one address serves all four chains);
    - SOL: SLIP-10 `m/44'/501'/i'/0'`.
  - Deadline handling and `timeWhenInactive` = deadline − 10 min, as on mainnet.
  - The response is signed with the emulator's ed25519 key, using exactly the SDK's `hashQuote` scheme.
- **`GET /v0/status`** (**lazy progression**: every status call advances the state, idempotently, under a Redis lock):

  | Condition | Status |
  |---|---|
  | No deposit seen | `PENDING_DEPOSIT` |
  | Deposit seen unconfirmed (mempool / pending) | `KNOWN_DEPOSIT_TX` |
  | Confirmed per policy and ≥ `minAmountIn` | `PROCESSING` |
  | Payout broadcast | still `PROCESSING` |
  | Payout seen (confirmed for EVM/SOL; mempool-accepted for BTC unless `EMU_BTC_DEST_CONF=1`) | `SUCCESS` |
  | Deposit < `minAmountIn` | `INCOMPLETE_DEPOSIT` until the deadline, then a refund of the deposit − `refundFee`, then `REFUNDED` |
  | A deposit after the deadline | `REFUNDED` (documented as a deviation: mainnet says "may be lost") |

  - **Execution-time re-quote.** On `PROCESSING` the emulator re-runs the live dry quote. If its `amountOut` <
    `minAmountOut`, it refunds (`REFUNDED`, `refundReason: "slippage"`). Otherwise it pays the new `amountOut`. This
    gives real slippage behaviour.
  - **`swapDetails`:** real testnet `originChainTxHashes` and `destinationChainTxHashes` with explorer URLs (the
    mempool.space testnet4, Etherscan and Solscan devnet patterns), and `nearTxHashes: []`. The confidential era shows
    almost nothing there anyway (F-8).
- **`POST /v0/deposit/submit`:** records the hash and triggers detection immediately.

**Detection:**
- BTC: mempool.space testnet4 `address/{a}/txs`.
- EVM native: `eth_getBalance`, plus the submitted hash.
- USDC: `eth_getLogs` for the `Transfer(to = deposit)` topic.
- SOL: `getSignaturesForAddress` + `getTransaction`.
- Reuse the provider lists and fallbacks in `lib/config.ts` and core.

**Settlement:**
- **Payouts** come from a treasury wallet per chain (HD index 0), never from the deposit addresses. Deposits pile up
  at their addresses; a weekly `tools/emu/sweep.ts` sweeps them to the treasury.
- **Refunds** also come from the treasury, which avoids needing gas at USDC deposit addresses.
- **EVM gas:** `estimateTransferGas` (204,600 on Sepolia when the recipient is new).

**Confirmation policy (env, defaults in brackets):**
- BTC deposits need 1 conf [1]. Testnet4 can take hours, so for a recorded demo set `EMU_BTC_MIN_CONF=0`; the UI then
  labels it "accepted unconfirmed (testnet emulator)".
- EVM 1 [1]. SOL `confirmed`.

**Fault injection** (dev and e2e only; refused on the hosted deployment unless `EMU_SCENARIOS=on`). The quote field
`referral: "emu:<scenario>"` selects:
- `refund`, `fail`, `incomplete`, `stuck` (PROCESSING forever);
- `slow:<s>`, `slippage`;
- `quote_error:<msg>`, `short_deadline`.

That covers every UI error path without a real failure.

**Abuse limits** (a hosted emulator is effectively a cross-testnet exchange, and tBTC is scarce):
1. `recipient` and `refundTo` must both be addresses **derived for an existing Satchel token**. Core `derive` is
   deterministic, and the emulator checks against the contract's `nft_tokens`. This also mirrors Convert's own rule.
2. A per-token notional cap per 24 h (default $200) and a per-quote maximum.
3. A treasury floor per asset: below it, quotes to that asset fail with "Failed to get quote" (the real error string).
4. An IP rate limit (Upstash).

**Hosting and state:**
- A framework-free package `packages/oneclick-emu` (handlers + a `Store` interface: in-memory or Upstash).
- Mounted in `apps/web` as `src/app/api/intents-emu/v0/[...path]/route.ts` (Node runtime; each request finishes in
  < 10 s, so it fits Hobby).
- Runnable locally with `pnpm --filter @satchel/oneclick-emu dev` (node:http, port 8787) for the README "reproduce"
  path.
- CORS `*`, like 1Click, so the browser audit hits it directly.

### 4.3 Fidelity: what is identical, emulated, or missing

| Identical on testnet (real) | Emulated (behaviourally faithful) | Not emulated |
|---|---|---|
| wallet, `sign_for` (owner and delegate), cap enforcement and every `ERR_ALLOWANCE_*` | execution by our treasury instead of solvers | intents.near accounts, `INTENTS` and `CONFIDENTIAL_INTENTS` deposit types, ANY_INPUT, orders |
| MPC signing, including real testnet timeouts and retries | slippage (execution-time re-quote) | partner fee accounting, `appFees` payout |
| tx building and broadcast on testnet4, four EVM testnets and devnet | `nearTxHashes` (empty; mainnet shows shield txs only) | real 1Click incidents and stuck swaps (only via `stuck` and `slow` faults) |
| deposit detection from real chain data; payout and refund as real txs | timing: testnet4 blocks and our polling ≠ mainnet's 37–800 s | mainnet minimum-liquidity effects beyond what dry quotes return |
| the API surface, statuses, schema, quote-signature *code path* | — | 1Click's own deposit-address formats (ours are standard P2WPKH, EOA and ed25519) |
| amounts, fees, time estimates and minimum errors from **live mainnet dry quotes** | — | KYC or geo-blocking (none reported) |
| records, clean history, the browser audit | — | — |

**So:** every byte our code produces or consumes on testnet has the same shape as on mainnet. The differences are
*who* executes the swap leg, how fast, and the Intents-internal features we deliberately don't use.

## 5. Mainnet readiness: built now, switched on later

### 5.1 Built now, behind config (no extra cost)
- The same `packages/core/src/oneclick` client, with the real base URL and the `X-API-Key` header **server-side only**
  (the routes proxy; the key never reaches the browser; an invalid key gives a 401, so only send it when set: kb/51).
- `NEXT_PUBLIC_NETWORK=mainnet` switches:
  - the base URL;
  - the verification key;
  - removal of the "emulated" labels;
  - the Shield status link (`partners.near-intents.org/shield/status`);
  - "hide Convert when `/v0/tokens` or a dry quote fails".
- **A contract-conformance test** runs the same suite against both backends:
  - schema validation against the OpenAPI;
  - `/v0/tokens` has every mapped asset id;
  - a dry quote for each pair parses.

  Against real 1Click it is **dry only** (keyless, read-only). It is a manual or nightly CI job, not a PR gate,
  because of the network.

### 5.2 Needed before real mainnet use (later, human-gated)
1. **A mainnet contract build.** It's a new deployment; this one is frozen and testnet. A cargo feature `mainnet`:
   - `EVM_CHAIN_IDS = [1, 8453, 42161, 10]`;
   - `ERC20_TOKENS` = Circle USDC:
     - Ethereum `0xa0b8…eb48`;
     - Base `0x8335…2913`;
     - Arbitrum `0xaf88…5831`;
     - OP `0x0b2c…ff85` (verify before use);
   - `mpc = v1.signer`;
   - NEAR USDC `17208628…33a1`.

   The plan's rule stands: no locked mainnet contract before an audit.
2. **Core network switch:**
   - BTC `network: 'mainnet'` (bc1, `mempool.space/api`), mainnet fee policy;
   - SOL mainnet-beta RPC;
   - paid EVM RPCs;
   - mainnet gas rules (the 204,600-gas rule is Sepolia's).
3. **A partner key** (H): removes the 20–25 bps keyless surcharge, gives per-key rate limits (keyless is 1,200 per
   minute *per IP*, shared by every Vercel user), and opens the partner channel to ask about F-9.
4. **Ops:**
   - an alert when a swap passes 3 × `timeEstimate`;
   - keep every quote + signature + `correlationId` (Redis, 90 days) for disputes;
   - a support page.
5. **Business:** optional `appFees` (e.g. 10–25 bps on Autopilot runs) to cover the agent's NEAR gas and storage.
6. **The F-9 answer from 1Click** before quote signatures are used as a control.

### 5.3 v2 contract idea (mainnet, not this hackathon): a swap-bound allowance
A cap flagged `swap_only`. The delegate's `sign_for` would carry the 1Click quote, and the contract would check:
- `env::ed25519_verify` with a pinned 1Click key;
- quote `recipient` and `refundTo` ∈ this token's own addresses;
- the tx destination == `depositAddress`;
- the amount == `amountIn`.

That would turn "detect" into "prevent". **Blockers:**
- F-9;
- key rotation (a locked contract can't change a pinned key, so it needs a key set or an expiry);
- canonical JSON hashing on-chain (gas);
- 1Click's terms.

Worth raising with 1Click: a compact signed binding `(depositAddress, recipient, refundTo, deadline)` would make this
cheap.

## 6. Implementation plan

### 6.1 Work packages
Lanes: **S1** = contract and core and tools; **S2** = web; **H** = human. Every package ships with unit tests and an
end-to-end test (CLAUDE.md rule 1).

| WP | Lane | What | Files | Tests | Est. |
|---|---|---|---|---|---|
| WP1 | S1 | **Core `oneclick` module**<br>• hand-written v0 types for the subset we use (no SDK dependency: it pulls in axios);<br>• the asset registry (§4.1);<br>• `buildConvertQuoteRequest`;<br>• `checkConvertQuote`;<br>• `hashQuote` / `verifyQuote` (our own stable-stringify, with vectors);<br>• `depositAddressOf(record)` per chain;<br>• `auditSwap(record, status, ownAddresses)` → `delivered_to_self` \| `refunded_to_self` \| `external` \| `pending` \| `unknown`;<br>• a `fetch` client (base URL, key, timeouts) | `packages/core/src/oneclick/*`, `vectors/oneclick/*` | vitest: registry ↔ contract `ERC20_TOKENS` parity; tb1↔bc1 mapping; check rules (every refusal); signature vectors (emulator key + SDK algorithm); audit per chain | 1.0 d |
| WP2 | S1 | **Emulator** (§4)<br>• handlers, Store (memory / Upstash), HD derivation, pricing proxy + fallback;<br>• detection and settlement adapters (reusing core builders), the state machine;<br>• scenarios, abuse limits, CORS;<br>• `dev` server;<br>• `tools/emu/{fund,sweep,status}.ts` | `packages/oneclick-emu/*`, `apps/web/src/app/api/intents-emu/v0/[...path]/route.ts` | vitest: the state machine against fake chains (every status path and scenario, idempotency under concurrent polls); a schema conformance test; testnet e2e `tools/e2e/emu.ts` (real deposits and payouts on Base Sepolia and devnet; BTC with `EMU_BTC_MIN_CONF=0`) | 2.0 d |
| WP3 | S2 | **Proxy routes**: `/api/oneclick/{tokens,quote,status,submit,record}`, picking the backend by network<br>• key server-only, 1.5 s / 8 s timeouts;<br>• error mapping to copy keys;<br>• `record` stores the quote by deposit address (Redis) | `apps/web/src/app/api/oneclick/*`, `lib/oneclick-server.ts` | vitest route tests with a fake backend; curl | 0.5 d |
| WP4 | S2 | **Convert UI**<br>• `ConvertFlow` (FlowShell): pickers from holdings, dry-quote preview (debounced), review with min-received / time / fees / "Powered by NEAR Intents", plus the testnet note "swaps are emulated on testnet, priced from live NEAR Intents quotes";<br>• `PendingIntent.swap` and a swap watcher after `sent`;<br>• the deadline guard before broadcast;<br>• Activity pairing, "In transit" in Holdings;<br>• an entry from the Satchel actions;<br>• buyer-side audit lines in the Clean history checklist;<br>• copy `convert.*` per brand/ and kb/80 | `components/client/ConvertFlow.tsx`, `lib/signing/{types,machine,watcher}.ts`, `lib/holdings.ts`, `useCleanCheck.ts`, `lib/copy*` | unit: machine transitions with `swap`, deadline guard, holdings in transit; Playwright against the in-process emulator: happy path, REFUNDED, FAILED, INCOMPLETE, quote_error, slow; SSR judge pages unaffected | 1.5 d |
| WP5 | S1 | **Autopilot backend**<br>• plan schema;<br>• NEP-413 verification (owner key check via FastNEAR);<br>• `core/autopilot/machine.ts` (pure, like `signing/machine.ts`);<br>• a NEAR signer for the delegate (async submit, poll by hash);<br>• `/api/autopilot/{plans,tick,runs}`;<br>• a scheduler: QStash every 5 min → `tick` (HMAC-verified), with a GitHub Actions fallback;<br>• per-run Redis locks;<br>• create `autopilot.satchelhq.testnet` (allowed by D-48) | `packages/core/src/autopilot/*`, `apps/web/src/app/api/autopilot/*`, `lib/autopilot-server.ts` | vitest: every machine path (each `ERR_*` stop, MPC timeout → re-sign the same nonce, deadline → re-quote the same nonce, BTC one-UTXO selection, the price-impact skip); `tools/e2e/autopilot.ts`: 3 real runs on testnet (Base Sepolia USDC → devnet SOL), then listing pauses the plan, transfer ends it, revoke ends it | 2.0 d |
| WP6 | S2 | **Autopilot UI**<br>• the setup wizard: plan → computed caps preview → `set_allowance` (reuse AllowanceFlow) → NEP-413 sign;<br>• the panel: next run, the runs list with **browser-side audit** badges, pause/resume, "Stop for good" = revoke;<br>• the BTC "prepare coins" helper (an owner tx splitting into run-sized UTXOs, because delegates sign one input) | `components/client/Autopilot*.tsx` | Playwright: setup, a run appears, audit ✓, an `external` record shows a red flag (fixture), revoke | 1.0 d |
| WP7 | S1 | **CLI agent and e2e**: `tools/agent/autopilot.ts` (self-hosted, own delegate key); `tools/e2e/convert.ts` (owner Convert on testnet, every origin chain) | `tools/agent/*`, `tools/e2e/convert.ts` | runs against the hosted and local emulators; `--sign-only` mode | 0.5 d |
| WP8 | S1+S2 | **Docs and honesty**: kb/52 (facts F-1…F-14, emulator spec), a kb/90 section, README "Swaps (NEAR Intents 1Click)" with the testnet-emulation disclosure and reproduce commands, D-53 in decisions, landing copy within the D-52 boundary (H-34) | `kb/52-*.md`, README, `plan/decisions.md` | a link check; the claims audit | 0.5 d |
| WP9 | S1 | **Mainnet readiness**: the `mainnet` env schema, the network switch in core (BTC network param audit), the conformance job against real 1Click (dry), the `mainnet` cargo-feature spec for the contract (document only, no build into the frozen wasm) | `lib/config.ts`, `packages/core`, `docs/specs/mainnet-profile.md` | conformance (dry, manual); a unit test of the config switch | 0.5 d |

**Total ≈ 9.5 dev-days.** H work runs in parallel (§6.2).

### 6.2 Schedule
This must fit around G8 (Nov 9 freeze and rc, Nov 10 birth), where S1 is busy. Both features are app-only, so nothing
here touches the frozen wasm, except the optional erc191 guard (H-28), which is due **Nov 9**.

| Day | S1 (core, emulator, agent) | S2 (web) | H (Razvan) |
|---|---|---|---|
| Wed Nov 5 | WP1 core oneclick | WP3 routes (against a WP1 fake) | **Go/no-go H-27; H-28 erc191 decision**; start funding (H-31) |
| Thu Nov 6 | WP2 emulator (state machine, pricing, EVM + SOL) | WP4 ConvertFlow skeleton + machine `swap` | Upstash QStash signup (H-30); faucet runs |
| Fri Nov 7 | WP2 BTC detection and settlement + e2e on testnet | WP4 complete + Playwright | tBTC to the treasury |
| Sat Nov 8 | WP5 Autopilot backend | WP6 Autopilot UI | — |
| Sun Nov 9 | freeze and rc (existing plan); WP5 e2e if there's buffer | WP6 + buyer audit lines | rc rehearsal (existing) |
| Mon Nov 10 | birth (existing); WP7 | regression (existing) | H-15 birth (existing) |
| Tue Nov 11 | WP9, WP8 | Playwright all scenarios; copy | review the copy (H-34) |
| Wed Nov 12 | staging run on the final contract: Convert BTC→SOL, SOL→Base USDC, Base USDC→BTC; Autopilot 3 runs + pause on listing + end on Give; save hashes as evidence | demo recording support | record the demo |
| Thu Nov 13 | buffer | buffer | **submit by 18:00 UTC** |

### 6.3 Cut lines (in this order if time runs out)
1. The BTC "prepare coins" helper (Autopilot from BTC sources). Autopilot runs from EVM and SOL only.
2. Hosted Autopilot (WP5's scheduler, plans API and NEP-413). Ship the **CLI agent** (WP7) + the UI panel in
   read-only audit mode. It's still a real delegate doing real capped swaps.
3. Buyer-side audit lines (keep them on the owner panel).
4. Convert "Max" and EmptyFlow "as one coin".

Never cut: the deadline guard (§8.4), the recipient and refund checks, the testnet-emulation disclosure, or the
emulator's abuse limits.

## 7. Test strategy (summary)
- **Unit (vitest, offline):**
  - core oneclick (registry, check, signature vectors, audit);
  - the emulator state machine with fake chains (every status and scenario; concurrent polls; restarts);
  - the Autopilot machine (every stop code, retry with the same nonce);
  - signing machine and holdings changes;
  - config switch.
- **Conformance:** one suite, two backends (emulator, real 1Click dry). It proves the emulator is API-identical.
- **Playwright:** Convert (6 scenarios) and Autopilot (setup, run, audit, flag, revoke) against the in-process emulator
  with fixture chains. These are deterministic and are what the AI screening can re-run (Q-017).
- **Testnet e2e (real chains and MPC):** `tools/e2e/{emu,convert,autopilot}.ts`, with hashes saved to evidence for the
  README. They respect the CPU budget and run one at a time.
- **No contract tests change:** the contract is untouched. The existing C5 sandbox suite already covers every delegate
  path Autopilot uses.

## 8. Implications and risks
1. **We run custodial infrastructure.** The emulator holds hot treasury keys on four EVM testnets, testnet4 and
   devnet; the Autopilot holds a full-access key for its NEAR account (F-5).
   - Testnet only, but real secrets: Vercel server env, never the repo (rule 5).
   - Rotate after the hackathon. Keep the Autopilot balance small (≈ 5 NEAR testnet).
2. **Testnet liquidity is the binding constraint.**
   - tBTC is scarce: the treasury needs ≈ 0.01 tBTC for demos, and every "→ BTC" swap spends it.
   - Circle USDC is 20 per 2 h per chain.
   - The abuse limits (§4.2) stop the emulator becoming a free tBTC bridge. Start funding Nov 5.
3. **Testnet4 timing.** BTC deposits can wait hours for a block. For the recorded demo:
   - prefer EVM or SOL origins with BTC as the destination (the payout is broadcast at once); or
   - use `EMU_BTC_MIN_CONF=0`, labelled on screen.
4. **Public signatures × deposit deadlines (important for both features).** MPC signatures are public on NEAR. Anyone
   can broadcast a signed-but-unsent swap tx, and on mainnet a deposit after `deadline` "may be lost".
   - Rule: **never leave a swap tx signed and unsent.** If the deadline is near, re-quote and RETRY with the same
     nonce or inputs; the existing kb/90 §8.7 retry semantics give exactly this replacement guarantee.
   - The buyer-facing checker already treats such a tx as live, so the clean-history verdict stays correct.
5. **The contract bounds amounts, not destinations** (§3). We must say so in the UI ("Autopilot can move up to your
   daily limits; every run is checked in your browser") and in the README. Prevention needs v2 (§5.3).
6. **F-9 (quote signatures).** Until 1Click confirms the scheme or key, our checks rest on comparing the quote echo
   with our own request, plus re-reading `/v0/status`. A man-in-the-middle between our server and 1Click could swap
   the deposit address, so TLS is our transport trust. Ask 1Click (H-33).
7. **Clean history.** Verdicts are unchanged; new informational lines only. Selling during an in-flight swap is allowed
   and benefits the buyer: the payout or refund lands in the Satchel. "In transit" keeps the value overview honest.
8. **The C5 constraints shape the product:**
   - ≤ 16 USDC runs or 32 native runs per 24 h;
   - one BTC input per delegated tx;
   - an EVM gas cap with headroom;
   - plans pause while listed and end on sale or Give: a feature ("Autopilot never outlives your ownership").
9. **Vercel Hobby:** a daily cron only, so the Autopilot tick needs QStash (Upstash, the same vendor as our Redis) or
   GitHub Actions (5-min minimum, often delayed). Every handler must finish in < 10 s, so both machines are stepwise,
   never waiting inline.
10. **Honesty and judging.**
    - The app and README must say "on testnet, the NEAR Intents leg is emulated by Satchel and priced from live
      mainnet NEAR Intents quotes; mainnet uses 1Click directly through the same code". This is Q-007-aligned.
    - The landing may present Convert and Autopilot as product features within D-52's boundary (H-34).
    - The emulator must run locally for reproducibility.
11. **The erc191 / intents.near finding** (from the first research pass) is independent but due by the Nov 9 freeze.
    Neither feature uses Intents balances: we always use `ORIGIN_CHAIN` / `DESTINATION_CHAIN`, never `INTENTS`.
    Delegates can't sign messages anyway.
12. **Scope risk.** About 9.5 dev-days landing on the busiest days (freeze, birth, staging). The cut lines (§6.3) keep
    Convert + a CLI Autopilot shippable even if the hosted Autopilot slips.

## 9. Decisions needed (proposed H-27…H-34)
| # | Decision | Recommended default | By |
|---|---|---|---|
| H-27 | Go/no-go: Convert + Autopilot in scope for the submission | **Go**, with the §6.3 cut lines | Nov 5 |
| H-28 | erc191 / intents.near guard: (a) contract refuses `personal_sign` messages that contain `verifying_contract` or `intents.near`; (b) the checker flags them; (c) both | **(c)** if S1 can fit it in the Nov 9 freeze, else (b) | Nov 9 |
| H-29 | Run a hosted testnet emulator holding hot testnet keys in Vercel env | Yes, testnet only, with the abuse limits | Nov 5 |
| H-30 | Autopilot scheduler: Upstash QStash (new account) or GitHub Actions cron | QStash | Nov 6 |
| H-31 | Funding: ≈ 0.01 tBTC, ≈ 0.2 ETH on each of four EVM testnets, 100+ Circle USDC across chains, 10 devnet SOL to the treasury; ≈ 5 testnet NEAR to `autopilot.` | as listed | Nov 7 |
| H-32 | Tracks: add `defi` (and/or `agents`) on the strength of Autopilot | add **`defi`** (the prompt example matches); `agents` optional | Nov 12 |
| H-33 | Request the 1Click partner key now (mainnet-ready, plus the F-9 question) | yes | Nov 6 |
| H-34 | Landing and README: present Convert and Autopilot as product features (D-52 boundary), with the testnet disclosure in the app and README | yes | Nov 11 |

## 10. Sources
- Code:
  - `contracts/satchel/src/{sign.rs,allowance.rs,parse/btc.rs,parse/evm.rs,parse/sol.rs}`
  - `apps/web/src/lib/{signing/*,config.ts,onboarding-kv.ts}`
  - `tools/e2e/allowance.ts`
  - `docs/specs/{C1-C2-C3-C7.md,C5.md}`
  - kb/40, kb/51
- 1Click:
  - OpenAPI https://1click.chaindefuser.com/docs/v0/openapi.yaml (live = vendored + `qtc`/`prl` chain enums)
  - docs https://docs.near-intents.org (`swap-types.md`, `fees.md`, `verify-quote-signature.md`, `faqs.md`, changelog 2026-10-27 and 2026-09-09, verifier `signing-intents.md`)
  - SDK `@defuse-protocol/one-click-sdk-typescript@0.1.26` `dist/index.js` (`quote-signature.ts`)
- Live calls, 2026-11-04: `/v0/tokens`, dry quotes, signature verification attempts. The scripts are in the session
  scratchpad, not the repo.
- Hackathon: https://nearhackathon.com/HACKATHON.md (re-fetched 2026-11-04; changed since the baseline: X-post tags
  and per-track prompt examples) and https://github.com/nearai/near-hackathon-prompt-examples (`01-defi.md`,
  `10-nfts.md`, `13-open.md`).
- Ecosystem: Ledger, Brave and Unstoppable deposit-address integrations; MPP `nearintents` charge; stuck-swap reports
  (`near/intents` #399 and #358; TokensFund). See the first research pass in this session.
