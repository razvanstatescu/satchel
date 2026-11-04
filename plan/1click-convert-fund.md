# 1Click inside Satchel: Convert and Add coins from any coin (research and implementation plan, 2026-11-04)

> **Status:** proposal for Razvan. Nothing is implemented. Decisions needed are listed in §9 (proposed H-27 to H-34).
> This replaces the earlier draft that paired Convert with Autopilot (#5); Razvan meant #4.
>
> **Scope:** two ideas from the 1Click synergy research of 2026-11-04:
> - **#1 Convert:** the owner swaps coins *inside* a Satchel.
> - **#4 Add coins from any coin:** on the public `/fund/[id]` page, anyone tops up a Satchel by paying with any coin
>   on any chain, from their own wallet; the Satchel receives the coin it asked for.
>
> For each: a 100% testnet flow (only the 1Click service is replaced, by an API-identical emulator), and a mainnet path
> built now and switched on later.
>
> **Inputs:**
> - Our code: contract `sign.rs`, `parse/{btc,evm,sol}.rs`, `allowance.rs`; core `chains/*`, `derive/*`; web
>   `lib/fund.ts`, `/fund/[id]`, `FundPicker`, `ShareFundLink`, `Incoming`, `lib/signing/*`, `lib/config.ts`.
> - KB and specs: kb/40, kb/51, `docs/specs/C1-C2-C3-C7.md`.
> - 1Click: the live OpenAPI and docs, the TS SDK 0.1.26 source, and live keyless dry quotes.
> - The live HACKATHON.md and the track prompt examples.

## 0. Verdict in one screen

- **Neither feature needs a contract change.**
  - **Convert** is "send X to the quote's deposit address". `sign_for` already signs every such send: BTC to any
    script, plain ETH and USDC `transfer` on the four EVM chains, and a plain SOL transfer.
  - **Add coins** involves **no Satchel signature at all**. The payer signs with their own wallet, and the Satchel
    only receives.

  Both are app, server and tools work, so they can ship after the Nov 9 freeze, until Nov 13.
- **Add coins is the safest 1Click feature we could ship.**
  - Nothing a Satchel signs is involved, so clean history is untouched.
  - It extends a page that already exists and is already shared: Add coins, Request links, Give by link.
  - It answers the most common real need: "I want to put BTC in your Satchel, but I only have USDC on Base or NEAR in my
    wallet."
- **Testnet: the only missing piece is 1Click itself** (no testnet, ever: Q-007). We replace it with an **emulator that
  speaks the 1Click v0 API exactly**:
  - The same endpoints, schema, statuses and quote-signing scheme.
  - Prices, fees, time estimates and minimum-amount errors come from **live mainnet `dry: true` quotes**.
  - Settlement is real: testnet transactions on the real chains.

  Everything else is real on testnet:
  - the payer's own wallet transaction: the NEAR wallet, MetaMask on Sepolia, Base, Arbitrum and OP Sepolia, a manual
    send on testnet4 or devnet;
  - the owner's `sign_for` + MPC (Convert);
  - deposit detection, payouts, refunds, and the Satchel's balances.

  Mainnet differs by a base URL, an API key and a verification key, plus the ~30 mainnet-only chains (Tron, XRP, Doge,
  TON…) that simply appear in the list on mainnet.
- **A browser-side check that doesn't trust our server or the quote signature.**
  - The browser re-derives the Satchel's addresses itself (core `deriveSatchelAddresses`).
  - It reads the quote back from **1Click's public `GET /v0/status?depositAddress=`**: no key, CORS `*`, and it returns
    the original quote.
  - It shows Pay or Sign only if `recipient` (and, for Convert, `refundTo`) are the Satchel's own addresses.

  This matters because **1Click's quote signatures don't verify today** (F-9).
- **Biggest implications:**
  1. We would run a hosted, custodial testnet service with hot keys: the emulator's treasury.
  2. A public page that requests quotes needs rate limits and recipient checks.
  3. Testnet liquidity: tBTC is scarce, and Circle USDC is 20 per 2 h per chain.
  4. Testnet4 block times.
  5. Quote deadlines: a payer who sends late may lose funds on mainnet; for Convert, the MPC signature is public, so a
     signed swap must never sit unsent.
  6. The emulator must keep progressing when the payer closes the tab, so it needs a small scheduled tick.
- **Effort:** about 9.5 dev-days in 9 work packages, parallel across lanes, Nov 5–12, plus human funding steps. Cut
  lines are in §6.3.

## 1. What we verified

| # | Fact | Evidence |
|---|---|---|
| F-1 | `sign_for` accepts every send a 1Click deposit needs:<br>• BTC: outputs may use any script ≤ 520 B, 1–16 outputs.<br>• EVM: empty data, or exactly `transfer(to,amount)` on the chain's Circle USDC; any `to`.<br>• SOL: one System Transfer. | `parse/btc.rs` rule 7; `parse/evm.rs` L150–154; `parse/sol.rs` L95–100 |
| F-2 | A Satchel has addresses only on BTC, the four EVM testnets and SOL. NEAR-side coins live *inside* the contract (C6) and are deposited with `ft_transfer_call` msg `{"deposit":id}`. | `inside.rs` L53; `lib/fund.ts` |
| F-3 | 1Click withdrawals made with a `msg` (`ft_transfer_call`) have **no refund protection**, so "inside" coins are not a safe 1Click destination. | docs "Withdrawals" (msg → `ft_transfer_call` ❌ refund) |
| F-4 | `/fund/[id]` is public and server-rendered:<br>• coin picker → network picker → one address with QR, Copy, notes and the live Incoming line;<br>• `?coin=&network=` pre-fills it, but there's **no amount parameter** today;<br>• Share buttons use `fundUrl()`. | `lib/fund.ts`, `app/(app)/fund/[id]/page.tsx`, `FundPicker.tsx`, `ShareFundLink.tsx` |
| F-5 | The browser can re-derive any Satchel's BTC, EVM and SOL addresses with core `deriveSatchelAddresses(network, contractId, tokenId)`. `viem` 2.57.7 and `@solana/web3.js` 1.99.0 are already in core. The NEAR wallet (`@hot-labs/near-connect`) is already in the app and supports NEP-413. | `packages/core/src/derive`, core `package.json`, kb/40 |
| F-6 | `GET /v0/status?depositAddress=` needs no auth, sends CORS `*`, and returns `quoteResponse`: the original `quoteRequest`, including `recipient`, `refundTo` and `signature`, plus `status` and `swapDetails` with origin and destination tx hashes. | vendored and live OpenAPI `GetExecutionStatusResponse`; kb/51 |
| F-7 | Since 2026-10-27 every 1Click swap is confidential. The API is unchanged, but `nearTxHashes` only show shield and unshield transactions. | docs changelog |
| F-8 | Records carry no memo, so Convert's swap context lives off-chain. The deposit address is inside every record (EVM `to` or the ERC-20 recipient, BTC outputs, SOL destination), so anyone can trace it. | `sign.rs` `SigRecord` |
| F-9 | **Quote signatures don't verify.** The scheme is ed25519 over `base58(sha256(stable-JSON({...request, ...quote, timestamp})))` under the manager key `ed25519:reYaWhvwu8Jzo3WUM3zhn6VrhuMEF4eADL17qtRVifc` (SDK 0.1.26, latest). A **live dry quote fails** `verifyQuoteSignature()` untampered, and so do all 256 combinations of the optional fields. The key or the field set probably changed with the confidential rollout. | scratchpad `scripts/vq*.mjs` |
| F-10 | **Routes for Add coins, live dry quotes today:**<br>• NEAR USDC → **exactly 0.0005 BTC** (EXACT_OUTPUT): amountIn 41.29 USDC (min 40.87; the excess is refunded), ~465 s.<br>• wNEAR → 0.0005 BTC: 10.06 wNEAR, ~465 s.<br>• 20 USDC on Base → SOL (EXACT_INPUT): 0.2129 SOL, ~32 s, refundFee 0.0024 USDC.<br>**Coverage:** 215 tokens on 38 chains (abs … zec), including NEAR (wNEAR, USDC), BTC, SOL and ETH plus USDC on Ethereum, Base, Arbitrum and OP. | live `/v0/tokens` and `/v0/quote` dry |
| F-11 | **Convert routes:** 0.001 BTC → SOL ~800 s; Base ETH → BTC ~480 s; 50 USDC → BTC ~490 s; OP USDC → Base USDC ~37 s. OP (and 8 other chains) has a **temporary $1,000 minimum** on chain-to-chain swaps. | live dry quotes; changelog 2026-09-09 |
| F-12 | **Fees:** keyless quotes get injected `appFees` of 20 bps (1 bp on USDC→USDC). A partner key gives 20 bps, or 1 bp on stablecoin routes. Our own `appFees` are possible (≤ 500 bps total). | live; docs `fees.md` |
| F-13 | **Live risks:**<br>• ~5 BTC stuck since Aug 10, and a WBTC→BTC swap in PROCESSING for 20+ days (filed Nov 2); the Oct 1 exploit.<br>• A deposit after `deadline` "may be lost".<br>• `INCOMPLETE_DEPOSIT` top-ups aren't documented (kb/51 open question 6). | ecosystem research; `near/intents` #399 and #358 |
| F-14 | **NEAR-origin deposits** (`depositType: ORIGIN_CHAIN`, origin wNEAR or USDC on NEAR) quote fine dry, but the docs don't say what the deposit address looks like or whether the payer must `storage_deposit` it. **[CHECK]** with one $1 mainnet run (H-33). | live dry quotes; docs silent |
| F-15 | Hosting is Vercel Hobby (cron is daily only) plus Upstash Redis (the onboarding survey). | decisions L479; `lib/onboarding-kv.ts` |
| F-16 | **Hackathon fit:**<br>• Q-007: no Intents testnet; use mainnet tiny amounts or `dry: true`.<br>• `realworld` hints "STABLECOINS, NEAR INTENTS"; `open` hints "CHAIN ABSTRACTION".<br>• The X post must say "what NEAR enables concretely … such as cross-chain settlement". | HACKATHON.md (re-fetched 2026-11-04) |

## 2. How the features work

### 2.1 Add coins from any coin (#4)

**Who:** anyone with the link (`/fund/7`, or `/fund/7?coin=btc&network=bitcoin&amount=0.0005`). The payer needs no
NEAR account, no Satchel and no app login.

**What changes on the page:** under the existing destination (address, QR, Copy, Incoming), a new section reads "Don't
have {BTC on Bitcoin}? Pay with another coin".

**Two modes:**
- **Requested amount (EXACT_OUTPUT).** When the link carries `amount` (a new parameter; ShareFundLink gets an amount
  field), exactly that amount arrives in the Satchel. The payer sends `amountIn`, and any excess is refunded to them.
  This is what a request or gift link needs: "send me exactly 0.0005 BTC".
- **Payer's amount (EXACT_INPUT).** "I'll send 20 USDC on Base." Whatever that buys arrives in the Satchel.

```
Payer (browser, /fund/7)                 Satchel web (server)                 1Click (mainnet) / Emulator (testnet)   Chains
1 pick "pay with": coin + network (from /v0/tokens, minus the destination itself)
2 amount (or the link's) ─────────────▶ POST /api/oneclick/quote {dry} ───▶ /v0/quote dry ⇒ "Send ≈ 41.29 USDC · ~8 min · fee"
3 refund address: from the connected wallet, or typed and validated per chain (required by 1Click)
4 "Get payment address" ──────────────▶ POST /api/oneclick/quote {real}     server checks: recipient ∈ deriveSatchelAddresses(token)
                                         (rate limit per IP and per token)  ──▶ /v0/quote ⇒ depositAddress, amountIn, deadline
5 browser re-check (independent of our server): re-derive the Satchel address; GET <1Click>/v0/status?depositAddress=
  directly ⇒ quoteRequest.recipient == that address, destinationAsset/amount == ours. Only then show Pay.
6 pay, one of:
   NEAR wallet (already in the app): one tx to the token contract: [storage_deposit?] + ft_transfer, or near_deposit + ft_transfer on wNEAR
   EVM wallet (injected, EIP-1193 via viem): switch chain → native send or USDC transfer(depositAddress, amountIn)
   Manual: address + amount + QR (BIP-21 / EIP-681 / Solana Pay URI), deadline countdown, memo if the chain needs one (mainnet)
7 POST /api/oneclick/submit {txHash} (when we know the hash) ───────────▶ /v0/deposit/submit
8 poll /v0/status every 5 s: PENDING_DEPOSIT → KNOWN_DEPOSIT_TX → PROCESSING → SUCCESS (payout tx to the Satchel)
                                                           | INCOMPLETE_DEPOSIT | REFUNDED (to the payer) | FAILED
9 the existing Incoming line shows the arrival on the Satchel's network. The owner's Satchel page shows
  "On its way: 0.0005 BTC via NEAR Intents (≈ 8 min)" from the quote recorded by token (POST /api/oneclick/record).
```

**Rules:**
- **Destinations** are only the Satchel's chain addresses: BTC, ETH or USDC on the four EVM chains, SOL. **Never
  "inside" coins** (F-3). Never the same asset and network as the origin.
- **Server guard (public page):** a quote's `recipient` must be one of *this token's* derived addresses, for the
  destination network; we never relay a quote to an arbitrary address. Rate-limit per IP and per token (Upstash). On
  mainnet, `appFees` is optional (H-34).
- **Deadline:** 2 h for EVM, SOL and NEAR origins; 24 h for BTC origins. A **big countdown**; at deadline − 10 min the
  address is hidden and "Get a new address" appears. "Don't send after the deadline" appears next to the address
  (F-13).
- **EXACT_OUTPUT copy:** "Send {amountIn}. If you send more, the extra comes back to {refundTo}, minus a small fee."
  Add "If you send less, it's refunded at the deadline" (`INCOMPLETE_DEPOSIT`). Whether a top-up counts is unknown
  (F-13), so the emulator models "top-ups count until the deadline" and the copy doesn't promise it.
- **The server-rendered page stays as it is.** The native address, its QR and its facts render on the server (the
  judge-page rule). "Pay with another coin" is a client-side enhancement below it; on the server, a static line and a
  button.
- **Clean history:** no change. The Satchel signs nothing; funds simply arrive.
- **Free bonus:** a Satchel owner can fund *another* Satchel in a different coin with Convert's code, by making the
  recipient another token's address. Optional, in WP4.

### 2.2 Convert (#1): swap inside the Satchel

The owner picks "from" (e.g. 0.002 BTC) and "to" (e.g. SOL). The swap leaves from the Satchel's BTC address and lands
at the **same Satchel's** SOL address; a failure refunds to the Satchel's BTC address.

```
Owner (browser)                     Satchel web (server)                 1Click / Emulator                       Chains
1 Convert: from, to, amount ──────▶ POST /api/oneclick/quote {dry} ───▶ dry ⇒ amountOut, fees, time
2 Confirm ────────────────────────▶ POST /api/oneclick/quote {real} ──▶ depositAddress, deadline
3 core.checkConvertQuote: recipient == own(to) · refundTo == own(from) · assets/amount echo ours · deadline margin ·
  depositAddress valid for the chain and not ours · no memo; plus the same browser re-check as 2.1 step 5
4 store the quote: localStorage intent.swap + POST /api/oneclick/record
5 unsigned transfer to depositAddress (amountIn) ─▶ the existing pipeline: wallet → sign_for → MPC → verify
6 before broadcast: now < deadline − margin? else re-quote and RETRY with the same nonce/inputs (a new address replaces the old)
7 broadcast ─────────────────────────────────────────────────────────────────────────────────────────▶ origin chain
8 /v0/deposit/submit; poll /v0/status ─────────────────────────────▶ SUCCESS | REFUNDED (to the Satchel) | FAILED
9 Activity: one "Converted 0.002 BTC → 1.1 SOL" row pairs the outgoing record with the incoming payout
```

**Details:**
- **Amounts:** EXACT_INPUT with slippage 100 bps. "Max" reuses EmptyFlow's fee logic: a BTC sweep, or EVM native
  balance minus the gas reserve. Refuse `depositMode: MEMO`.
- **Gas and tokens:** USDC origins need ETH for gas on that chain (the same rule as Send). Solana USDC isn't
  supported: the contract signs no SPL.
- **Holdings and buyers:**
  - Holdings show the amount "In transit to {network}", so the value overview (D-50) stays honest.
  - Clean-history **verdicts don't change**. The buyer's checklist gains informational lines, computed in the browser
    from F-6 and F-8:
    - "Swap via NEAR Intents: delivered to this Satchel ✓";
    - "refunded to this Satchel ✓";
    - "paid outside this Satchel".
  - A swap still in flight at listing time is allowed by the contract; the app warns the seller, and Buy shows "still
    arriving".

## 3. Trust model
| Actor | Can do | Bounded by | Detected by |
|---|---|---|---|
| The payer (#4) | send any amount, or late | the deadline; refunds go to the payer's own address | status; the countdown |
| The owner (#1) | anything, as today | — | clean history (unchanged) |
| Our server (proxy) | relay a quote with a wrong deposit address or recipient | server guard + the **browser re-check straight against 1Click's public status** (F-6) | the browser refuses to show Pay or Sign |
| 1Click (mainnet) | take the deposit and not deliver, or deliver late (F-13) | refunds; nothing on-chain | status, a "slow" flag past 3 × `timeEstimate`, the saved quote + `correlationId` for support |
| The emulator (testnet) | the same as 1Click; it is *our* service, testnet only | abuse limits (§4.2) | the same |

## 4. Testnet emulation: the 1Click emulator

### 4.1 Principle
Replace **only** the 1Click service. The app talks to `ONECLICK_BASE`; the browser re-check talks to
`NEXT_PUBLIC_ONECLICK_STATUS_BASE`.

| Setting | testnet | mainnet |
|---|---|---|
| `ONECLICK_BASE` | `https://usesatchel.xyz/api/intents-emu` (locally `http://localhost:8787`) | `https://1click.chaindefuser.com` |
| `NEXT_PUBLIC_ONECLICK_STATUS_BASE` | the same emulator URL | `https://1click.chaindefuser.com` |
| `ONECLICK_API_KEY` | — | the partner key (H) |
| `ONECLICK_QUOTE_PUBKEY` | the emulator's ed25519 key | 1Click's manager key (once F-9 is solved) |

**Asset ids stay the mainnet ids**, so the app has no network branch. The emulator maps them:

| 1Click asset id (mainnet) | Testnet asset the emulator settles | Origin (#4) | Destination | Convert |
|---|---|---|---|---|
| `nep141:btc.omft.near` | BTC testnet4 (P2WPKH) | ✓ (manual) | ✓ | ✓ |
| `nep141:eth.omft.near` / `nep141:eth-0xa0b86991…eb48.omft.near` | Sepolia ETH / Circle USDC `0x1c7d4b19…7238` | ✓ (EVM wallet, manual) | ✓ | ✓ |
| `nep141:base.omft.near` / `nep141:base-0x833589fc…2913.omft.near` | Base Sepolia ETH / USDC `0x036cbd53…dcf7e` | ✓ | ✓ | ✓ |
| `nep141:arb.omft.near` / `nep141:arb-0xaf88d065…5831.omft.near` | Arbitrum Sepolia ETH / USDC `0x75faf114…aa4d` | ✓ | ✓ | ✓ |
| OP ETH / USDC (`nep245:v2_1.omni.hot.tg:10_…`) | OP Sepolia ETH / USDC `0x5fd84259…30d7` | ✓ | ✓ | ✓ |
| `nep141:sol.omft.near` | devnet SOL | ✓ (manual) | ✓ | ✓ |
| `nep141:sol-5ce3bf3a…0186.omft.near` (SOL USDC) | devnet Circle USDC SPL **[CHECK mint]** | ✓ (manual) | ✗ (the Satchel can't send SPL) | ✗ |
| `nep141:wrap.near` | `wrap.testnet` | ✓ (NEAR wallet) | ✗ (no NEAR address) | ✗ |
| `nep141:17208628…33a1` (NEAR USDC) | Circle testnet USDC `3e2210e1…b8af` | ✓ (NEAR wallet) | ✗ | ✗ |

- The EVM USDC addresses are the contract's `ERC20_TOKENS`, so the emulator and the contract can't disagree.
- `/v0/tokens` returns exactly these rows with live mainnet prices. On mainnet the same UI shows all 215 tokens, so
  Tron USDT, DOGE, XRP, TON, ZEC and the rest appear automatically (manual pay, with a memo where the quote returns one).

### 4.2 Behaviour, endpoint by endpoint

- **`GET /v0/tokens`:** the table above, with prices and `priceUpdatedAt` from live 1Click `/v0/tokens` (60 s cache).
- **`POST /v0/quote`**
  - **Pricing.** It forwards the same request to **real 1Click with `dry: true`**:
    - same asset ids and amount (1:1 units);
    - addresses mapped to mainnet format: tb1… → bc1… (same witness program); EVM, SOL and 64-hex NEAR implicit
      addresses are unchanged; named `.testnet` accounts become a fixed valid `.near` placeholder (1Click returns an
      opaque 400 for non-existent named recipients, kb/51).

    It returns the real `amountIn`, `minAmountIn`, `amountOut`, `minAmountOut`, `timeEstimate`, `refundFee` and
    `withdrawFee`, and the **real errors**: minimums, "Failed to get quote", the OP $1,000 rule. Typical testnet amounts
    are $40–$150 notional, above most minimums.
  - **Fallback:** if 1Click is unreachable, `/v0/tokens` prices − 20 bps, with the header `x-emu-pricing: fallback`.
  - **Non-dry quotes** also allocate a fresh **deposit address** from an HD seed (env `EMU_SEED`, Redis `INCR` index):
    - BTC: `m/84'/1'/0'/0/i`, P2WPKH;
    - EVM: `m/44'/60'/0'/0/i`;
    - SOL (native and SPL): SLIP-10 `m/44'/501'/i'/0'`;
    - NEAR: an ed25519 implicit account (64 hex) at SLIP-10 `m/44'/397'/i'`.

    Each quote also gets `deadline`, `timeWhenInactive` = deadline − 10 min, and an ed25519 signature using the SDK's
    exact `hashQuote` scheme.
- **`GET /v0/status`** advances the state lazily (idempotent, under a Redis lock):

  | Condition | Status |
  |---|---|
  | Nothing seen | `PENDING_DEPOSIT` |
  | Seen unconfirmed | `KNOWN_DEPOSIT_TX` |
  | Confirmed per policy, ≥ `minAmountIn` | `PROCESSING` |
  | Payout broadcast | still `PROCESSING` |
  | Payout seen | `SUCCESS` |
  | Under `minAmountIn` | `INCOMPLETE_DEPOSIT` (top-ups count) until the deadline, then a refund of the deposit − `refundFee`, then `REFUNDED` |
  | A deposit after the deadline | `REFUNDED` (a documented deviation: mainnet says "may be lost") |

  - **EXACT_OUTPUT overpayment:** the excess above `amountIn` is refunded to `refundTo` after SUCCESS (as on mainnet).
  - **Execution-time re-quote:** at `PROCESSING` the emulator re-runs the live dry quote. If out < `minAmountOut`, it
    refunds (`refundReason: "slippage"`); otherwise it pays the new out. This gives real slippage behaviour.
  - **`swapDetails`:** real testnet origin and destination tx hashes with explorer URLs; `nearTxHashes: []` (see F-7).
- **`POST /v0/deposit/submit`:** records the hash and detects immediately.

**A tick for tabs that close.** For #4 the payer may close the page right after paying, and lazy progression would then
stall. `POST /api/intents-emu/tick` (HMAC-protected) advances every open swap. It's called by a GitHub Actions
`schedule` every 5 min, with no new vendor, plus by any Satchel page view that has recorded pending swaps. Vercel Hobby
cron is daily only, so it can't do this job. Each tick does bounded work in < 10 s.

**Detection** (reusing core providers and fallbacks):
- BTC: mempool.space testnet4 `address/{a}/txs`.
- EVM native: `eth_getBalance` + the submitted hash.
- EVM USDC: `eth_getLogs` on `Transfer(to = deposit)`.
- SOL: `getSignaturesForAddress`.
- SPL: `getTokenAccountsByOwner`. The payer's wallet creates the ATA, as Phantom does.
- NEAR: FastNEAR `ft_balance_of` / the tx API, with dRPC as the fallback, never `rpc.testnet.near.org`.
- **NEAR deposit accounts must be USDC/wNEAR-registered** before a payer's `ft_transfer` can land. The emulator does a
  `storage_deposit` for each new deposit account, 0.00125 NEAR each. The payer UI also offers to add it in the same tx,
  which mirrors whatever F-14 turns out to be on mainnet.

**Settlement:**
- **Payouts and refunds** come from a treasury wallet per chain (HD index 0), never from the deposit addresses. A weekly
  `tools/emu/sweep.ts` sweeps the deposits back.
- **EVM gas:** `estimateTransferGas` (Sepolia charges 204,600 gas to a new recipient).
- **NEAR refunds:** `ft_transfer` from the treasury (registered).

**Confirmation policy (env):**
- BTC deposit: 1 conf. Testnet4 can take hours, so for a recorded demo use `EMU_BTC_MIN_CONF=0`; the UI then shows
  "accepted unconfirmed (testnet emulator)".
- EVM: 1 conf. SOL: `confirmed`. NEAR: final.

**Fault injection** (dev and e2e only; off on the hosted deployment unless `EMU_SCENARIOS=on`). The quote field
`referral: "emu:<scenario>"` selects:
- `refund`, `fail`, `incomplete`, `stuck`, `slow:<s>`, `slippage`;
- `quote_error:<msg>`, `short_deadline`, `overpay_refund`.

**Abuse limits.** A public page plus a free testnet exchange invites draining scarce tBTC.
1. `recipient` must be an address **derived for an existing Satchel token**: the emulator derives with core and checks
   `nft_tokens`. For Convert, `refundTo` must be one too.
2. A notional cap per token per 24 h (default $200), stricter for BTC destinations ($50), and a maximum per quote.
3. A treasury floor per asset; below it, the emulator returns the real "Failed to get quote".
4. An IP rate limit (Upstash). The hosted page also limits real-quote creation per IP.

**Hosting and state:**
- A framework-free package `packages/oneclick-emu`: handlers + a `Store` interface (memory or Upstash).
- Mounted as `apps/web/src/app/api/intents-emu/v0/[...path]/route.ts` (Node runtime, < 10 s per request).
- Local: `pnpm --filter @satchel/oneclick-emu dev` on :8787, for the README reproduce path.
- CORS `*`, as on 1Click, so the browser re-check works the same way.

### 4.3 Fidelity
| Identical on testnet (real) | Emulated (behaviourally faithful) | Not emulated |
|---|---|---|
| #4: the payer's wallet tx (NEAR wallet, EVM injected wallet, manual testnet4 or devnet send), the deadline countdown, refund to the payer's address | execution by our treasury instead of solvers | ~30 mainnet-only chains (Tron, XRP, Doge, TON, ZEC, Stellar…) and memo-mode deposits. The UI is data-driven and covered by fixtures only. |
| #1: the owner's `sign_for`, MPC (including testnet timeouts and retries), tx building and broadcast on every chain | slippage (execution-time re-quote); EXACT_OUTPUT excess refunds | intents.near accounts, `INTENTS` and `CONFIDENTIAL_INTENTS` deposits, ANY_INPUT, orders |
| deposit detection from chain data; payouts and refunds are real txs; the Satchel's balances and Incoming | `nearTxHashes` (empty) | partner fee accounting and `appFees` payout |
| the API surface, statuses, schema, quote-signature *code path*, the browser re-check | timing: testnet4 blocks and our 5-min tick ≠ mainnet's 32–800 s | real incidents and stuck swaps (only `stuck` and `slow` faults) |
| amounts, fees, time estimates and minimum errors from **live mainnet dry quotes** | NEAR deposit-account registration (F-14 unknown on mainnet) | 1Click's own deposit-address formats |

## 5. Mainnet readiness

### 5.1 Built now, behind config
- The same core client: the real base URL; `X-API-Key` server-side only, sent only when set (an invalid key gives a
  401, kb/51).
- `NEXT_PUBLIC_NETWORK=mainnet` switches:
  - the base URLs and the verification key;
  - removal of the "emulated" labels;
  - the full `/v0/tokens` list;
  - the Shield status link `partners.near-intents.org/shield/status`;
  - "hide Pay with another coin / Convert when `/v0/tokens` or a dry quote fails".
- **The memo UI:** show `depositMemo` (and refuse the manual path without it) for chains that need one. Fixture-tested.
- **A conformance suite against both backends:** schema validation against the OpenAPI, every mapped asset id present,
  a dry quote per pair parses. Against real 1Click it's **dry only**, run manually or nightly, not as a PR gate.

### 5.2 Needed before real use (later, human-gated)
1. **A mainnet Satchel deployment.** A cargo feature `mainnet`:
   - `EVM_CHAIN_IDS = [1, 8453, 42161, 10]`;
   - mainnet Circle USDC per chain (verify each);
   - `mpc = v1.signer`;
   - NEAR USDC `17208628…33a1`.

   The plan's rule holds: no locked mainnet contract before an audit. **Never fund testnet-MPC addresses with mainnet
   coins**: BTC and SOL payloads are network-agnostic, so it would technically work, but the coins would sit behind the
   testnet MPC.
2. **Core network switch:**
   - BTC `mainnet` (bc1, `mempool.space/api`);
   - SOL mainnet-beta;
   - paid EVM RPCs;
   - mainnet gas rules (the 204,600-gas rule is Sepolia-only).
3. **The partner key** (H-33): no keyless surcharge, per-key rate limits (keyless is 1,200 per minute *per IP*, shared
   across Vercel), and a channel for F-9 and F-14.
4. **Ops:**
   - an alert past 3 × `timeEstimate`;
   - keep quote + signature + `correlationId` for 90 days (Redis) for disputes;
   - a support page.
5. **Optional `appFees`** (H-34): e.g. 10–25 bps on Pay with another coin.
6. **One $1 mainnet NEAR-origin run** to settle F-14, and one `INCOMPLETE_DEPOSIT` top-up test (F-13).

## 6. Implementation plan

### 6.1 Work packages
Lanes: **S1** = core, emulator and tools; **S2** = web; **H** = human. Each package ships with unit tests and an
end-to-end test (CLAUDE.md rule 1). No contract change.

| WP | Lane | What | Files | Tests | Est. |
|---|---|---|---|---|---|
| WP1 | S1 | **Core `oneclick` module** (shared)<br>• v0 types for the subset we use (no SDK dependency: it pulls in axios);<br>• the asset registry (§4.1);<br>• `buildFundQuote` (EXACT_OUTPUT / EXACT_INPUT, recipient = a derived Satchel address);<br>• `buildConvertQuote`;<br>• `checkQuote` (echo, recipient, refund, deadline margin, address format per chain, memo rules);<br>• `recheckViaStatus` (the browser re-check);<br>• `hashQuote` / `verifyQuote` (our own stable stringify plus vectors);<br>• `depositAddressOf(record)`, `auditSwap()`;<br>• payment URIs (BIP-21, EIP-681, Solana Pay);<br>• a `fetch` client | `packages/core/src/oneclick/*`, `vectors/oneclick/*` | vitest: registry ↔ contract `ERC20_TOKENS` parity; tb1↔bc1; every `checkQuote` refusal; signature vectors; URIs; audit per chain | 1.0 d |
| WP2 | S1 | **Emulator** (§4)<br>• handlers, Store, HD derivation (BTC, EVM, SOL, NEAR implicit), the pricing proxy + fallback;<br>• detection (BTC, EVM native and USDC, SOL native and SPL, NEAR FTs) and settlement;<br>• the state machine (including INCOMPLETE top-ups and EXACT_OUTPUT excess refunds);<br>• scenarios, abuse limits, CORS, the tick;<br>• `tools/emu/{fund,sweep,status}.ts`;<br>• a GitHub Actions `schedule` → tick | `packages/oneclick-emu/*`, `apps/web/src/app/api/intents-emu/**`, `.github/workflows/emu-tick.yml` | vitest: the state machine against fake chains (every status and scenario, concurrent polls, a restart); conformance; testnet e2e `tools/e2e/emu.ts` (a real deposit and payout per origin family) | 2.5 d |
| WP3 | S2 | **Proxy routes** `/api/oneclick/{tokens,quote,status,submit,record}`<br>• the backend picked by network; the key server-only;<br>• **recipient guard** (derived addresses of the token);<br>• rate limits per IP and per token;<br>• 1.5 s / 8 s timeouts;<br>• error mapping to copy keys;<br>• `record` keeps the quote by token and deposit address | `apps/web/src/app/api/oneclick/*`, `lib/oneclick-server.ts` | vitest route tests (fake backend; a foreign recipient is refused; the limits); curl | 0.75 d |
| WP4 | S2 | **Add coins: "Pay with another coin"**<br>• the origin picker from `/v0/tokens`, grouped by chain;<br>• the amount mode (the link's `amount` → EXACT_OUTPUT, else EXACT_INPUT);<br>• a debounced dry quote;<br>• the refund address (from the wallet or typed and validated);<br>• "Get payment address" → the browser re-check → the pay panel: **NEAR wallet** (existing `near-connect`; storage + `ft_transfer` / `near_deposit` + `ft_transfer`), **EVM injected wallet** (viem `custom(window.ethereum)`, chain switch, native or USDC), **Manual** (QR + URI + countdown + memo);<br>• the status tracker;<br>• `fund.ts` `amount` parameter + an amount field in ShareFundLink;<br>• owner side: "On its way" on the Satchel page;<br>• copy `fund.anycoin.*` per brand/ and kb/80 | `components/client/FundAnyCoin.tsx`, `PayPanel.tsx`, `SwapStatus.tsx`, `lib/fund.ts`, `ShareFundLink.tsx`, `SatchelPage.tsx`, `lib/copy*` | unit: `parseFund` with amount, mode selection, URI builder, countdown; Playwright against the in-process emulator: NEAR-wallet pay (mock wallet), EVM pay (mock EIP-1193), manual pay; REFUNDED, INCOMPLETE, FAILED, expired deadline, quote_error, a memo fixture; the SSR fund page is unchanged without JS | 1.75 d |
| WP5 | S2 | **Convert UI**<br>• `ConvertFlow` (FlowShell): pickers from holdings, dry-quote preview, review (min received, time, fees, "Powered by NEAR Intents" + the testnet note);<br>• `PendingIntent.swap` + the swap watcher after `sent`;<br>• **the deadline guard before broadcast** (re-quote, same nonce/inputs);<br>• Activity pairing, "In transit" in Holdings;<br>• buyer audit lines in Clean history;<br>• reuses `SwapStatus` | `components/client/ConvertFlow.tsx`, `lib/signing/{types,machine,watcher}.ts`, `lib/holdings.ts`, `useCleanCheck.ts` | unit: machine transitions with `swap`, the deadline guard, in-transit holdings; Playwright: happy path, REFUNDED, FAILED, slow, quote_error, deadline re-quote | 1.5 d |
| WP6 | S1 | **Testnet payer bots and e2e**<br>• `tools/e2e/fund-anycoin.ts` pays from alice's NEAR account (wNEAR, NEAR USDC), from an EVM test key (Base Sepolia USDC, Sepolia ETH) and from devnet SOL into Satchel #N's BTC, ETH and SOL;<br>• `tools/e2e/convert.ts` for owner Convert on every origin chain;<br>• `--dry` and `--sign-only` modes | `tools/e2e/*` | real testnet runs; hashes saved as evidence | 0.75 d |
| WP7 | S1 | **Mainnet readiness:** the env schema and switch, the core BTC/SOL network parameter audit, the dry conformance job, `docs/specs/mainnet-profile.md` (contract feature, document only) | `lib/config.ts`, `packages/core`, docs | config-switch unit test; conformance (dry) | 0.5 d |
| WP8 | S1+S2 | **Docs and honesty:** kb/52 (F-1…F-16, the emulator spec); a kb/90 section; README "Pay with any coin and Convert (NEAR Intents 1Click)" with the testnet-emulation disclosure and reproduce commands; D-53; landing copy within D-52 (H-34) | kb, README, `plan/decisions.md` | link check; claims audit | 0.5 d |
| WP9 | S2 | **Polish and accessibility:** the countdown and live-status announcements (`aria-live`), phone layout of the pay panel, motion per kb/81 | the components above | Playwright a11y checks | 0.5 d |

**Total ≈ 9.75 dev-days.** H work runs in parallel (§6.2).

### 6.2 Schedule
This must fit around G8 (Nov 9 freeze and rc, Nov 10 birth), where S1 is busy. Both features are app-only. The only
contract-dated item is the separate erc191 decision (H-28, Nov 9).

| Day | S1 (core, emulator, tools) | S2 (web) | H (Razvan) |
|---|---|---|---|
| Wed Nov 5 | WP1 core | WP3 routes (against a WP1 fake) | **H-27 go/no-go; H-29 emulator OK**; start funding (H-31) |
| Thu Nov 6 | WP2 emulator: EVM, SOL, NEAR origins | WP4 Fund picker, quote, manual pay | request the partner key (H-33) |
| Fri Nov 7 | WP2: BTC, SPL, tick, e2e on testnet | WP4: NEAR-wallet and EVM pay, status, share amount | tBTC + faucet runs to the treasury |
| Sat Nov 8 | WP6 payer bots + evidence | WP5 Convert | — |
| Sun Nov 9 | freeze and rc (existing plan); WP6 buffer | WP5 + buyer audit lines | rc rehearsal; **H-28** |
| Mon Nov 10 | birth (existing); WP7 | regression (existing) | H-15 birth (existing) |
| Tue Nov 11 | WP8 | WP9; Playwright, every scenario | review the copy (H-34) |
| Wed Nov 12 | staging on the final contract: #4 paid from the NEAR wallet (USDC → exactly 0.0005 BTC), Base Sepolia USDC → SOL, devnet SOL → Sepolia ETH; #1 BTC → SOL, SOL → Base USDC; save the hashes | demo recording support | record the demo |
| Thu Nov 13 | buffer | buffer | **submit by 18:00 UTC** |

### 6.3 Cut lines (in this order)
1. SPL USDC as a payer origin (keep native SOL).
2. The EVM injected-wallet pay (keep the NEAR wallet + manual).
3. The buyer-side audit lines (keep Convert's own status and Activity).
4. Convert "Max" and the bonus "fund another Satchel in another coin".
5. If needed, all of Convert. **#4 alone is still a complete, signature-free feature.**

**Never cut:**
- the recipient guard and the browser re-check;
- Convert's deadline guard;
- the testnet-emulation disclosure;
- the emulator's abuse limits;
- the tick.

## 7. Test strategy
- **Unit (vitest, offline):**
  - core oneclick;
  - the emulator state machine with fake chains;
  - the signing machine with `swap`;
  - `fund.ts` amount parsing;
  - the config switch.
- **Conformance:** one suite, two backends (the emulator, and real 1Click dry). It shows the emulator is API-identical.
- **Playwright** against the in-process emulator with fixture chains, a mock NEAR wallet and a mock EIP-1193 provider:
  every #4 pay path and every status; every Convert scenario; the fund page without JS (the SSR facts). These are
  deterministic, so the AI screening can re-run them (Q-017).
- **Testnet e2e (real chains, wallets and MPC):** `tools/e2e/{emu,fund-anycoin,convert}.ts`, run one at a time (CPU
  budget), with hashes saved to the README evidence.
- **No contract tests change.**

## 8. Implications and risks
1. **We run custodial infrastructure.** The emulator holds hot treasury keys on testnet4, four EVM testnets, devnet and
   NEAR testnet. They are real secrets: Vercel server env only, never the repo (rule 5). Rotate after the hackathon.
2. **A public page creates quotes for strangers.** Rate limits and the recipient guard are mandatory. On mainnet the
   keyless per-IP limit is shared, so the partner key matters.
3. **Testnet liquidity is the binding constraint.**
   - tBTC: ≈ 0.01 needed for demos; every "→ BTC" swap spends it.
   - Circle USDC: 20 per 2 h per chain.
   - The abuse limits stop the emulator becoming a free tBTC bridge. Start funding Nov 5.
4. **Testnet4 timing:** BTC deposits can wait hours. For the demo, use non-BTC origins with BTC as the destination (the
   payout is broadcast at once), or `EMU_BTC_MIN_CONF=0` with a label.
5. **Deadlines:**
   - #4: a payer who sends after the deadline may lose funds on mainnet. Hence the countdown, hiding the address at
     deadline − 10 min, and long deadlines for BTC.
   - #1: MPC signatures are public, so **never leave a swap tx signed and unsent**. Re-quote and RETRY with the same
     nonce or inputs (kb/90 §8.7 replacement semantics). The buyer checker already treats such a tx as live.
6. **F-9 (quote signatures):** not a control until 1Click answers. The browser re-check against 1Click's public status
   endpoint gives us an independent binding of deposit address → recipient, without trusting our server.
7. **F-14 (NEAR-origin deposit registration)** is unknown on mainnet. The testnet path registers deposit accounts
   itself, and the payer UI can add a `storage_deposit` action. Settle it with a $1 run.
8. **Clean history:** #4 changes nothing. #1 adds informational lines only; verdicts are unchanged. Selling during an
   in-flight Convert is allowed and benefits the buyer.
9. **"Inside" coins can't be a destination** (F-3); say so on the page ("NEAR inside the Satchel: add it directly").
10. **The tick:** a payer who closes the tab must still get delivery, hence the scheduled tick. GitHub Actions
    schedules can be delayed by minutes, which is acceptable on testnet; the copy says "usually ~{timeEstimate}".
11. **Honesty and judging:**
    - The app and README say "on testnet, the NEAR Intents leg is emulated by Satchel and priced from live mainnet NEAR
      Intents quotes; mainnet uses 1Click directly through the same code". This is Q-007-aligned.
    - The landing may present "Pay with any coin" and "Convert" as product features within D-52 (H-34).
    - The emulator runs locally for reproducibility.
12. **Tracks:**
    - #4 strengthens `open` (chain abstraction) and the "NEAR's role" X-post line: "pay from NEAR or any chain, settle
      as native BTC".
    - `realworld` (stablecoins, Intents) is plausible.
    - `defi` is weaker without Autopilot.
13. **The erc191 / intents.near finding** (first research pass) is independent but due by the Nov 9 freeze. Neither
    feature uses Intents balances: always `ORIGIN_CHAIN` / `DESTINATION_CHAIN`, never `INTENTS`.
14. **Scope:** about 9.75 dev-days over the busiest days. The cut lines keep #4 shippable on its own.

## 9. Decisions needed (proposed H-27…H-34)
| # | Decision | Recommended default | By |
|---|---|---|---|
| H-27 | Go/no-go: #4 Pay with any coin + #1 Convert in scope | **Go**; #4 first, Convert second (§6.3) | Nov 5 |
| H-28 | erc191 / intents.near guard (from the first research pass): contract refusal, checker flag, or both | both if S1 fits it in the Nov 9 freeze, else the checker flag | Nov 9 |
| H-29 | Run a hosted testnet emulator with hot testnet keys in Vercel env, plus a GitHub Actions tick | yes, with the abuse limits | Nov 5 |
| H-30 | Payer wallets in scope: NEAR wallet + manual (minimum), plus the EVM injected wallet | all three; EVM cut second | Nov 6 |
| H-31 | Funding the treasury: ≈ 0.01 tBTC, ≈ 0.2 ETH on each of four EVM testnets, 100+ Circle USDC across chains, 10 devnet SOL, ≈ 10 testnet NEAR (registrations, refunds); payer test balances on alice/bob | as listed | Nov 7 |
| H-32 | Tracks: add `realworld`? | optional; keep `nfts` + `open` | Nov 12 |
| H-33 | Request the 1Click partner key now (mainnet-ready, plus the F-9 and F-14 questions); later, one $1 mainnet NEAR-origin run | yes / later | Nov 6 |
| H-34 | Landing and README present "Pay with any coin" and "Convert" (D-52 boundary); mainnet `appFees` level | yes; fee decided at mainnet time | Nov 11 |

## 10. Sources
- Code:
  - `contracts/satchel/src/{sign.rs,inside.rs,parse/btc.rs,parse/evm.rs,parse/sol.rs}`
  - `packages/core/src/derive`
  - `apps/web/src/lib/{fund.ts,signing/*,config.ts,onboarding-kv.ts}`
  - `apps/web/src/app/(app)/fund/[id]/page.tsx`
  - `apps/web/src/components/client/{FundPicker,ShareFundLink,Incoming}.tsx`
  - kb/40, kb/51, `docs/specs/C1-C2-C3-C7.md`
- 1Click:
  - OpenAPI https://1click.chaindefuser.com/docs/v0/openapi.yaml
  - docs https://docs.near-intents.org (`swap-types.md`, `fees.md`, `verify-quote-signature.md`, `faqs.md`, verifier withdrawals, changelog 2026-10-27 and 2026-09-09)
  - SDK `@defuse-protocol/one-click-sdk-typescript@0.1.26` (`quote-signature.ts`)
- Live calls, 2026-11-04: `/v0/tokens` (215 tokens, 38 chains); dry quotes (NEAR USDC and wNEAR → 0.0005 BTC; Base USDC
  → SOL; the F-11 Convert routes); signature verification attempts. The scripts are in the session scratchpad, not the
  repo.
- Hackathon: https://nearhackathon.com/HACKATHON.md (re-fetched 2026-11-04) and
  https://github.com/nearai/near-hackathon-prompt-examples.
- Ecosystem: Ledger, Brave and Unstoppable deposit-address integrations; MPP `nearintents` charge (an EXACT_OUTPUT
  checkout, the same pattern as #4); stuck-swap reports (`near/intents` #399 and #358).
