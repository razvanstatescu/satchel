# Web UI testing

This is an audit of the web app's Playwright coverage (apps/web/test/e2e), done in fixture mode (the mock wallet +
the in-browser chain simulation, `apps/web/src/lib/data/sim.ts`) — no testnet transactions are signed by this suite,
so it runs fully offline.

## How to run

From the repo root, in this worktree:

```sh
cd apps/web
pnpm install --frozen-lockfile   # once, after a fresh clone/worktree

# the whole suite (desktop + mobile projects); takes ~5 minutes
CI=1 E2E_PORT=3333 pnpm exec playwright test --reporter=line

# a single spec file (fast iteration)
CI=1 E2E_PORT=3333 pnpm exec playwright test test/e2e/send-validation.spec.ts --reporter=line

# a few spec files together
CI=1 E2E_PORT=3333 pnpm exec playwright test send-validation popup-edge-cases mobile-and-night-gaps --reporter=line
```

Notes:
- `E2E_PORT` must be a free port; port 3100 is reserved on the dev machine, and other agents working on this repo may be
  using 3332/3333 concurrently — pick a free one (e.g. 3321–3329) if you're running alongside someone else.
- `CI=1` is required; it's what the Playwright config reads to use the fixture webServer instead of a dev proxy.
- Everything here runs with the mock wallet (`useMockWallet` in `test/e2e/helpers.ts`) and the in-browser simulation
  — no real NEAR/BTC/EVM/SOL network calls, no signing. This is why the suite is safe to run repeatedly and offline.
- Unit tests (not covered by this audit) live in `apps/web/test/unit` and run with `pnpm --filter web test:unit` (or
  whatever the repo's current script name is — check `apps/web/package.json`).

## e2e test counts

- **Before this audit**: 224 tests (`desktop` + `mobile` projects combined), 223 passed / 1 failed.
  - The one pre-existing failure is `responsive.spec.ts:54` ("mobile app shell: the top bar and the menu sheet"): a
    theme-toggle radio's measured height came back `43.99993896484375` px against a `>= 44` assertion — a sub-pixel
    rounding issue (not something this audit's changes touch), most likely a `rem`/`calc()` value that lands a hair
    under the 44px WCAG 2.5.5 target on this particular rendering. Flag for whoever owns `ThemeControl`'s CSS; it's
    not reproduced by any change in this audit and wasn't investigated further (out of scope: UI-only layout polish
    on a component this audit didn't touch for a feature reason).
- **After this audit**: 237 tests, 224 passed / 1 failed (same pre-existing failure above) — all 13 new tests pass.

## New specs added by this audit

- `test/e2e/send-validation.spec.ts` (5 tests): amount `0` and amount-above-balance are refused inline with Review
  disabled; the Max button fills the balance and enables Review; sending to the Satchel's own address is refused on
  EVM, BTC and SOL (the `self` tier in `lib/validate.ts`).
- `test/e2e/popup-edge-cases.spec.ts` (4 tests): clicking the scrim closes a popup and returns focus to its trigger
  (see Bug 1 below); the browser's back button closes a popup and forward reopens it, no inert/scroll-lock left
  behind; `/s/999/send` and `/s/1/coin/nope` (bad id / bad holding key on a flow route) fall back to the same
  soft-404 view as `/s/999` itself.
- `test/e2e/mobile-and-night-gaps.spec.ts` (4 tests): `/fund/1`, `/address-book`, `/s/1/transactions` and
  `/s/1/coin/btc` at 320px width (no horizontal overflow) and with axe in both Day and stored Night — these four
  pages were added to the app after `theme-a11y.spec.ts`'s axe sweep and `responsive.spec.ts`'s mobile sweep were
  last extended, so none of the four had ever been folded into either sweep.

## Bugs found and fixed

Both are small, UI-only, and come with a regression test in the specs above.

1. **Focus never returns to the trigger after closing a flow (WCAG 2.4.3).** `FlowShell.tsx` closes a flow three
   ways — Escape, the Close button, and the scrim click — and all three always left `document.activeElement` on
   `<body>`. A keyboard or screen-reader user who opened Send/Add coins/Give/etc. from a link lost their place every
   time they closed it. Fixed by recording `document.activeElement` when the flow's effect mounts and restoring it
   on unmount (skipping `<body>` and anything no longer in the document — e.g. a trigger that's gone because the
   underlying page changed too). Severity: medium (a11y regression present on every popup route, not a blocker to
   any flow completing). Repro before the fix: open `/s/2`, click "Add coins", press Escape or click the X or click
   the scrim — `document.activeElement` is always `<body>`, not the link.
2. **The Transactions chain filter overflowed the page at 320px.** The filter (All/Bitcoin/Ethereum/Solana/Inside)
   uses the shared `Segmented` component in its non-`block` form, which sizes itself `w-fit max-w-full` with no
   wrap and no scroll. At 320px its five labelled buttons don't fit, and since nothing clipped or scrolled the
   overflow, the whole page widened to 347px and gained horizontal scroll — the one layout rule every other page
   in the app is explicitly tested against (`responsive.spec.ts`, `landing.spec.ts`'s budget tests). Fixed by adding
   `overflow-x-auto` to the non-`block` track, which only engages once content actually doesn't fit, so it has no
   effect on any of `Segmented`'s other call sites (theme control, chain pickers) where the options already fit.
   Severity: low-medium (a real layout bug on the narrowest supported width, not a blocker).

## Coverage matrix (page / flow / state → spec)

Legend: ✅ covered before this audit · 🆕 added by this audit · ⚠️ gap noted, not closed (see "Remaining gaps").

| Page / flow | State | Spec |
|---|---|---|
| `/` landing | server HTML, sections, budgets, CLS, reduced motion, 390/360/320, axe Day+Night | ✅ `landing*.spec.ts`, `theme-a11y.spec.ts` |
| `/s/[id]` (Satchel page) | owner/visitor/signed-out, server-rendered judge facts, soft 404 (`/s/999`), og/twitter image | ✅ `judge.spec.ts`, `og-image.spec.ts`, `theme-a11y.spec.ts` |
| `/s/[id]` | bad holding key popup (`/s/1/coin/nope`), bad id on a flow route (`/s/999/send`) | 🆕 `popup-edge-cases.spec.ts` |
| `/s/[id]/send` | EVM/BTC happy path (Review → tracker → confirmed), reload-resume, broadcast-fail, MPC timeout, wallet reject, BTC invalid/mainnet address, visitor guard | ✅ `flows.spec.ts` |
| `/s/[id]/send` | USDC on a second EVM network, no-ETH-for-gas guard, network picker | ✅ `multichain.spec.ts` |
| `/s/[id]/send` | SOL: blockhash prefetch/refresh/expiry, stale-blockhash guard | ✅ `sale-sol.spec.ts` |
| `/s/[id]/send` | amount 0, amount above balance, Max button | 🆕 `send-validation.spec.ts` |
| `/s/[id]/send` | sending to the Satchel's own address (EVM/BTC/SOL) | 🆕 `send-validation.spec.ts` |
| `/s/[id]/send` | delegate (allowance) send within/over cap, a stranger with no access | ✅ `allowance.spec.ts` |
| `/s/[id]/send` | no coin held anywhere (guard), opens on first held coin, "Send instead" switch | ✅ `flows.spec.ts`, `nav-feedback.spec.ts` |
| `/s/[id]/receive` (Add coins sheet) | chain switch, QR, full address, Copy→Copied, notes, Incoming | ✅ `flows.spec.ts` |
| `/s/[id]/receive` | EVM network picker (Base Sepolia, USDC) | ✅ `multichain.spec.ts` |
| `/fund/[id]` (public Add coins) | server HTML with no destination until a coin is picked, coin→network→address, one-place coins skip the network step, held-inside coins, unknown pre-fills dropped, instant client picks, share links from address row/Inside header/coin sheet/Add coins | ✅ `fund.spec.ts` |
| `/fund/[id]` | 320px, axe Day+Night | 🆕 `mobile-and-night-gaps.spec.ts` |
| `/address-book` | add/rename/remove, duplicate-address refusal, chain-scoped pickers in Send, saving a counterparty from Transactions | ✅ `address-book.spec.ts` |
| `/address-book` | 320px, axe Day+Night | 🆕 `mobile-and-night-gaps.spec.ts` |
| `/s/[id]/transactions` | per-source loading, merge, retry on failure, chain filter + URL persistence | ✅ `transactions.spec.ts` |
| `/s/[id]/transactions` | 320px layout (found a real overflow bug, fixed), axe Day+Night | 🆕 `mobile-and-night-gaps.spec.ts` |
| `/s/[id]/coin/[key]` (coin popup) | Inside NEAR/USDC/wNEAR sheets with deposit prepay + owner withdraw, offer-adjacent states | ✅ `offers.spec.ts`, `theme-a11y.spec.ts` |
| `/s/[id]/coin/[key]` | a plain held coin (BTC) at 320px, axe Day+Night; bad key → soft 404 | 🆕 `mobile-and-night-gaps.spec.ts`, `popup-edge-cases.spec.ts` |
| `/s/[id]/allowance` | owner adds/revokes, 4-live-account cap, USDC + second-EVM-chain caps, server HTML fact, axe | ✅ `allowance.spec.ts` |
| `/s/[id]/empty` | sweeps every coin on every network, disabled while listed, address-form axe | ✅ `empty.spec.ts`, `theme-a11y.spec.ts` |
| `/s/[id]/give-link` | create, claim, already-claimed, bearer-token warning, server fact, axe | ✅ `give-link.spec.ts`, `theme-a11y.spec.ts` |
| `/claim` | missing fragment, invalid secret, already-claimed, axe | ✅ `give-link.spec.ts`, `theme-a11y.spec.ts` |
| `/s/[id]/transfer` | refuses the contract account and the MPC account, hands off to another account | ✅ `flows.spec.ts` |
| `/s/[id]/sign` | exact text + hidden characters, warning, signature + verify, record visibility (owner-only), clean-history interaction with Buy | ✅ `multichain.spec.ts` |
| `/s/[id]/offer` | visitor offer with clean-history gate, owner accept, cancel+refund, stale-offer refusal, USDC storage-credit prepay, `/market`'s unlisted-Satchel entry point | ✅ `offers.spec.ts` |
| `/s/[id]/sale` (list / buy / sold) | Before-you-list checklist, sale gating by clean-history verdict (clean/confirming/can't-verify/unsafe), signed-out Connect gating, Sold receipt, failed-payout Withdraw, a buyer never seeing someone else's Sold receipt | ✅ `flows.spec.ts`, `sale-sol.spec.ts`, `judge.spec.ts` |
| coin sheet: NEAR/USDC/wNEAR inside | anyone can deposit, owner-only withdraw, blocked while listed, storage-credit prepay and leftover-credit withdraw on `/satchels` | ✅ `offers.spec.ts` |
| `/satchels` (My Satchels) | cards + sale lines, empty state, signed-out state, storage-credit row | ✅ `flows.spec.ts`, `offers.spec.ts`, `theme-a11y.spec.ts` |
| `/mint` | preview, tracker, "yours" state, `Close` returns to `?from=`, owner-cancel neutral note, signed-out CTA | ✅ `flows.spec.ts` |
| `/market` | listed/unlisted sections, unlisted→offer entry point | ✅ `offers.spec.ts`, `judge.spec.ts` |
| `/contract` | server-rendered facts | ✅ `judge.spec.ts`, `landing-trust.spec.ts` |
| theme (Day/Night/System) | no-flash first paint, OS-follow, junk-storage fallback, toggle a11y/keyboard, one control per surface, soft-404 keeps stored Night | ✅ `theme-a11y.spec.ts` |
| accessibility sweep | every main page + several flow states, Day and Night, WCAG 2.0–2.2 A/AA | ✅ `theme-a11y.spec.ts` (now also the 4 pages added 🆕 above) |
| navigation feedback | same-Satchel tab, popup route, other page — skeleton while the server responds | ✅ `nav-feedback.spec.ts` |
| popups: reopen, nested (one popup opening another) | leaves nothing inert/scroll-locked | ✅ `nav-feedback.spec.ts` |
| popups: scrim click, browser back/forward, focus return to trigger | 🆕 `popup-edge-cases.spec.ts` (found Bug 1, fixed) |
| deep links with a bad id/key on a flow route | 🆕 `popup-edge-cases.spec.ts` |
| mobile shell (menu sheet, pinned Buy bar, focus trap) | ✅ `responsive.spec.ts` |
| mobile landing (390/375/360/320, hero loop, header) | ✅ `responsive.spec.ts`, `landing*.spec.ts` |
| robots.txt / sitemap.xml / `/api/*` JSON and media routes | ✅ `judge.spec.ts` |

## Round two

A second audit pass (same fixture-mode methodology), targeting what round one flagged as untested. Plan (filled in
as each item lands):

1. **Balances update after a send, no reload** — assert the Wallet tab's holding + card change after a fixture send
   confirms (`RefreshAfterSend` + `refreshSnapshot`), same tab, no `page.reload()`. New spec: `refresh-after-send.spec.ts`.
2. **A complete keyboard-only Send** — open from the Wallet tab via Tab/Enter, pick chain, amount, address (including
   the address-book dropdown by keyboard), Review, Send, Escape-close, focus returns to the opener. New spec:
   `keyboard-send.spec.ts`.
3. **Wallet rejection in flows not yet covered** — give-by-link, make offer, accept offer, allowance add + revoke,
   inside NEAR/FT deposit + withdraw, Take everything out (a rejected step → Skip → partial results). Investigated
   whether the "timeout" sim knob applies here first: it doesn't — `lib/near/mock-wallet.ts` (the fixture wallet
   behind every plain NEAR call: `set_allowance`, `make_offer`, `accept_offer`, `deposit_near`, `withdraw_*`, the
   give-link's fund+transfer) only honours the `reject` knob; `timeout`/`broadcast-fail`/`delay` are consumed
   downstream in the chain-signing runner (BTC/EVM/SOL `sign_for`) only, already exercised by `flows.spec.ts` and
   `allowance.spec.ts`'s BTC send. So "timeout" has no distinct state to assert for these NEAR-only flows; only
   `reject` is new coverage here, plus Empty's reject→Skip→partial (Empty's per-coin step IS a `sign_for`, so its
   skip path is the one place a rejected step composes with a multi-step plan). New spec: `reject-coverage.spec.ts`.
4. **A delegate's BTC send that no single coin can pay (AUDIT-01)** — Satchel #1's two fixture coins are 139,718 and
   50,000 sats; a delegate cap big enough to cover an amount neither coin can pay alone (e.g. 150,000 sats) must show
   the one-coin message naming the largest coin (139,718 sats) before the wallet opens; an amount that fits one coin
   succeeds. New spec: `delegate-btc-one-coin.spec.ts`.
5. **Dust/rent-floor amounts** — read `@satchel/core`'s BTC coin-selection (`packages/core/src/chains/btc/select.ts`):
   there IS a dust floor (294 sats for a p2wpkh recipient, `DUST.p2wpkh`), contrary to round one's note that none
   exists; it surfaces as a generic `SelectionError` message through `SendFlow`'s review-step error banner (not a
   copy-mapped `problem`, so the raw core message shows verbatim — flagged below). SOL's rent rule is reachable too
   via "leaves the Satchel below rent" (E25); the "new recipient below rent" rule (E26-adjacent) is NOT reachable in
   fixture mode because `lib/chains/send.ts`'s fixture `solReads().recipientExists` is hardcoded `true` — noted as a
   fixture-mode gap, not a product bug. New spec: `dust-amounts.spec.ts`.
6. **Address-book dropdown: Night + axe open, 320px, and search past 5 entries** — `AddressBook.tsx`'s `useBookMenu`
   only renders a search box once an entry list exceeds 5 (`mine.length > 5`); round one's dropdown test used only 2
   entries. New spec: `address-book-dropdown.spec.ts`.
7. Bonus, if time allows: anything else round one's "What remains untested" flagged that's cheap to close.

## Edge cases explored during this audit

| Edge case | Result |
|---|---|
| Send: amount `0` | was untested → 🆕 covered, inline error + disabled Review |
| Send: amount above balance | was untested → 🆕 covered |
| Send: Max button | was untested → 🆕 covered |
| Send: recipient is the Satchel's own address (EVM/BTC/SOL) | was untested → 🆕 covered; `lib/validate.ts` already had the `self` tier, just no e2e test |
| Send: dust amount | not explored — the contract/sim has no dust threshold distinct from "amount above zero but below a chain's min relay/rent"; BTC/SOL rent-style minimums exist in `lib/chains/send.ts` error paths (`no_balance`, SOL rent rule E25/E26 per `copy`) but a specific "dust" e2e wasn't added this round — see Remaining gaps |
| Send: per-network nonce isolation | ✅ already covered (`multichain.spec.ts`: "the intent keeps chain id and its own nonce") |
| USDC send with no ETH for gas | ✅ already covered (`multichain.spec.ts`) |
| Wallet reject/cancel in send, give, transfer, offer, mint | ✅ covered for send (`flows.spec.ts`) and mint (owner-cancel, `flows.spec.ts`); give/offer/allowance reject paths weren't separately re-verified this round — see Remaining gaps |
| MPC timeout in send | ✅ covered (`flows.spec.ts`) |
| Broadcast failure + retry in send | ✅ covered (`flows.spec.ts`) |
| Allowance send over/under cap | ✅ already covered (`allowance.spec.ts`) |
| Offer expiry/staleness | ✅ already covered (`offers.spec.ts`, "a stale offer…is refused") |
| Claim link invalid/used | ✅ already covered (`give-link.spec.ts`) |
| Deep link bad params (`/s/999/send`, `/s/1/coin/nope`) | was untested → 🆕 covered, both fall back to the soft-404 view |
| `/fund/1?coin=x` (unknown value) | ✅ already covered (`fund.spec.ts`: "unknown pre-fills are dropped, never guessed") |
| Browser back/forward around a popup | was untested → 🆕 covered |
| Popup opened from a popup | ✅ already covered (`nav-feedback.spec.ts`) |
| Escape / scrim close + focus return to trigger | Escape-closes was covered; focus-return was not, on **any** close method → 🆕 found Bug 1 (fixed) and covered for the scrim path; Escape/Close-button paths share the same fix and are exercised incidentally by existing specs, though not re-asserted for focus-return explicitly this round |
| Keyboard-only flows | partially covered (menu sheet, theme toggle, Tab-trap inside a flow dialog in `responsive.spec.ts`/`theme-a11y.spec.ts`); a full keyboard-only Send (tab to every field, Enter to submit) was not added — see Remaining gaps |
| Mobile widths (390, 320) for fund/address-book/transactions/coin popup | was untested → 🆕 covered; found and fixed Bug 2 (Transactions filter overflow at 320) |
| Night + axe on fund/address-book/transactions/coin sheet/empty review | fund/address-book/transactions/coin popup were untested → 🆕 covered; "empty review" (the amount/confirm step, as opposed to the address-entry step already in `theme-a11y.spec.ts`) was not separately added — see Remaining gaps |
| Reduced motion | ✅ already covered broadly (landing hero/catch, give hand-off, theme toggle) |
| Navigation feedback skeletons | ✅ already covered (`nav-feedback.spec.ts`) |
| Address book picker per chain in Empty/Give/Allowance | the Send picker is covered (`address-book.spec.ts`); Empty's and Allowance's own address-field pickers weren't separately re-verified against the address book this round — see Remaining gaps |
| Transactions filter + retry | ✅ already covered (`transactions.spec.ts`) |
| Balances refreshing after a send (fixture sim), no reload | Likely true in practice (the client reads live simulation state), but this audit did not add an explicit assertion of a Wallet-tab balance number changing post-send without a `page.reload()` — see Remaining gaps |
| No horizontal overflow at 320 | ✅ covered broadly for landing/app shell before this audit; now also for fund/address-book/transactions/coin popup (🆕), and Bug 2 above was found exactly by this check |

## What remains untested, and why

- **Real wallets** (browser extension / mobile wallet connect flows): this suite only drives the fixture mock wallet
  (`useMockWallet`). Real-wallet integration is explicitly out of scope for Playwright and would need a manual or a
  separate real-wallet test harness.
- **Live MPC latency/timeout variability**: the sim's `timeout`/`broadcast-fail`/`delay` knobs stand in for this.
  The real signer's ~1-in-4 timeout rate under load (per `CLAUDE.md`'s environment notes) can't be reproduced
  faithfully by a fixed-delay mock; the honest-copy and retry-on-same-nonce UI paths are tested, but real variance
  in timing/ordering across chains is not.
- **Real chain confirmations** (BTC testnet4 confirmation lag of hours, Solana devnet blockhash expiry under real
  network jitter, Sepolia gas estimation against a live, possibly congested network): the sim approximates these
  deterministically; this is appropriate for UI correctness but doesn't validate against real-world timing.
- **Dust-amount-specific UX**: not separately exercised this round (see table above). Worth a follow-up spec if the
  product wants an explicit "too small to be worth the fee" message distinct from the generic balance/rent errors
  already in `lib/chains/send.ts`.
- **A full keyboard-only completion of a flow** (tab through every field, operate every control, submit with
  Enter/Space, with no mouse at all): partially covered via dialog focus-trap and a couple of controls; a dedicated
  "keyboard-only Send from end to end" test was not added this round.
- **Explicit "Wallet tab balance changes after a confirmed send without a reload" assertion**: plausible from the
  architecture (client reads the live fixture simulation state) and implied by several flows already ending in a
  "confirmed" tracker state, but not independently asserted as a dollar-amount/number change on the Wallet tab.
- **Reject/cancel paths for give-by-link, offer, and allowance-add specifically** (as distinct from send and mint,
  which are covered): the wallet-reject knob (`useMockWallet(..., { reject: true })`) is exercised for send; this
  audit didn't extend it to every other wallet-signing flow.
