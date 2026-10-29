# Satchel web app: inventory of what it does today (app auditor, 2026-10-26)

For the Satchel 2.0 rebuild: what the app does, so nothing is lost, and what to fix along the way.

**Sources.**
- The code in `apps/web/src/**` and `test/**`. The code wins over kb/80 wherever they differ, and the gaps against kb/80 are listed in §5.4.
- The served production build: fixture data, role `final`, `NEXT_PUBLIC_SOL_SEND=on` (the Playwright env).
- **Screenshots** (`<R>/audit/shots/`):
  - 52 page shots named `{page}__{390|1280}-{day|night}.png`;
  - 128 state shots in `shots/states/`, taken with the mock wallet.
- **Fixture artefacts** that production won't show:
  - the "Fixture data…" strip on every page;
  - the "fixture" word in the account pill;
  - the sim's broadcast error, which names "mempool.space" even for ETH;
  - after a sale, the server facts still show the old listing, because the sim lives in the tab;
  - minted #8 only exists in the browser.

**Counts:**
- 11 page routes (+ the `?list` and `?intent` variants), 4 API routes and 6 metadata assets;
- about 100 distinct UI states (§1–2);
- 11 flows (§2);
- 56 component files exporting 84 components and 4 hooks (§3);
- 10 e2e spec files (98 test declarations, more once their loops expand) and 21 unit files (about 227 cases) (§4).

---
## 1. Route map

Common to every `/s/[id]/*` route: the layout `(app)/s/[id]/layout.tsx` always renders the same page header:
1. the chips "Token #N · NEP-171 · NEAR testnet";
2. the H1: "This NFT is a wallet." + sub for visitors, "Satchel #N" for the owner;
3. the card;
4. the owner's ActionRow;
5. the OwnerPill;
6. PendingElsewhere;
7. the StatsStrip (desktop only);
8. the FreezeBanner;
9. the NavTabs (Wallet · Activity · Sell / Buy / Sold).

It is a blocking SSR read ("use cache", 15 s); ids 1–7 are prerendered and `instant=false`. From 1024 px there are two columns: the sticky card plus actions on the left (`minmax(320,400)`), the rest on the right.

Flows are real routes: they render the Wallet tab as an inert background, plus the FlowShell (a bottom sheet below 768 px, a 480 px dialog from 768).

| Route | Purpose · audience | Data shown | States | Actions | Must stay server HTML |
|---|---|---|---|---|---|
| `/` (`(landing)`) | Marketing landing (D-41/D-42, simulated, **reads no data**). The connected user's "home" (My Satchels sits above the hero). Visitor, judge, owner | Static copy only. Connected: `nft_tokens_for_owner` → snapshots; `proceeds_of` | Visitor: Hero (H1, lead, 2 pills, 10 s hero loop with Pause) → Use cases (3 tiles) → How it works (3 cards) → Clean history (dark band, scroll-driven 5-beat catch story; stacked frames on phones / reduced motion / no JS) → Trust band "No admin key" (+ dev / rc variants) + closed "Under the hood" `<details>` (6 rules, 5 links) → 7 closed Questions → Try it → LandingFooter. Connected: My Satchels loading (2 skeletons) / error / empty (glyph + Mint + "See Satchel #1") / grid, plus the escrow panel when proceeds are owed | Look inside a Satchel (→ /s/1, brass), See Satchels for sale, Mint, Connect NEAR wallet, the menu sheet, the theme | Every word, the H1, both endings of the catch, all 7 answers. No live reads (pinned by landing-static + landing-no-data) |
| `/mint` | The Mint flow over the landing. Connected accounts | Static | ready (stitched "New Satchel" preview, "What you get" list, MintBar: You get / Deposit) · not connected ("Connect wallet to mint") · wallet · minting (3-step list) · done ("Satchel #8 is yours.", "Minted in …") · errors (cancelled, E6 deposit, RPC) | Mint a Satchel → Fund this Satchel / Open Satchel #N; close → `/` | No (not a judge route) |
| `/s/[id]` Wallet tab | **The judge page** (/s/1). Everyone; the owner gets actions | Owner, status, `sig_count`, last signature, 3 full addresses, BTC/ETH (and SOL, Facts only) balances + read time, lock facts, code hash | Visitor · owner (stitch, ActionRow, "Owned by you") · listed (FreezeBanner; Send/Transfer disabled + reason; Delist brass) · all-zero (FundCard; Send disabled, "no BTC or ETH yet") · row zero (the "Fund" link is coded but **never renders**, §5.2) · balance unavailable · Signing (client pill) · signing elsewhere (PendingElsewhere line) · Needs attention (SignedNotSentCard at the top) · Sold (seller: Sold pill, no stitch) | Send, Fund, Transfer, Sell / Delist; Copy, QR (→ receive), explorer links, Fund this Satchel, Verify these addresses (`<details>`) | `<title>` "Satchel #1 · Satchel", meta description with both addresses, H1, card text, `[data-judge-facts]` dl (`data-fact` owner/status/keys/code-hash, `data-fact-sig-count`, `data-full-address` btc/evm/sol), nothing hidden, no Suspense |
| `/s/[id]/activity` | NEAR event history. Everyone | FastNEAR events: sent (amount, to, fee, chain tx), issued (Unused), transferred, minted, listed, delisted, sold | partial ("NEAR history is unavailable…") · empty ("No activity yet") · day groups (Oct 20…) of expandable `<details>` rows · client "In progress" group (Signing / In mempool / SignedNotSentCard) | Expand a row (Date, Fee, To, NearBlocks, explorer), "Missing something? See every event on NearBlocks" | First page of events (SSR) |
| `/s/[id]/receive?chain=btc\|evm` | Fund flow. Anyone (no wallet needed) | The derived address, a server-rendered QR (ECC M), per-chain notes, the faucet | btc / evm (links switch; SOL absent even with SOL send on) · Incoming: waiting → "+x · in mempool" → "Received x" (client) | Copy address (pinned, brass; **visible text reads only "Copy"**), Get testnet BTC / Sepolia ETH | The address (`data-full-address`, server QR); the sheet is visible without JS |
| `/s/[id]/send?chain=btc\|evm\|sol[&intent=]` | Send flow. Owner | Live balances; prepared tx (fee, after, inputs); intent store | Guards: not connected · not owner · listed · zero balance · unsent intent (Broadcast / Replace). Form (step 1/3) → Review (2/3) → tracker (3/3): the 14 signing stages (§2.4) | Chain select, Amount + Max, To + Paste/Clear, Review, ack checkbox, Send {amount}, Minimize, Broadcast again, Try again, Check again, Done, View activity | Title only (noindex); the flow is client |
| `/s/[id]/transfer` | Transfer ("give") flow. Owner | `view_account` + `nft_supply_for_owner` of the recipient | Guards: not connected · not owner · listed. Recipient (1/2): error / checking / not found / found card (+ implicit-account warning). Review (2/2): card + stub + 3 consequence rows + D-08 soft guard. wallet · processing (3-step) · done (Handoff + receipt) · errors (cancelled, ERR_LISTED, ERR_BAD_RECEIVER, ERR_NOT_OWNER, failed) | Review, Transfer to {account}, Done, View Satchel #N | No |
| `/s/[id]/sale[?list]` | Visitor: **Buy**. Owner: listing status + Sell flow (`?list`). Seller after a sale: **Sold** receipt | Listing (price, id, seller, `listed_at` block), `sig_count`, server clean hint, browser clean report, `proceeds_of`, USDC registration | SSR `listing-facts` dl (Price · Listing · Signatures · "Clean history (server hint)" raw enum + UTC). Visitor not listed ("isn't for sale"). Buy: checking / clean / empty / settling / blocked / unknown / unsafe, recheck, wallet, buying, changed, refunded, done (reverse handoff). Owner: not listed (quiet wait or "Ready to list") · Sell flow · listed panel (+ hint report). Seller: Sold receipt (paid / pending / escrow / withdrawn) + EscrowPanel | Buy for {price} / Connect wallet to buy, See the signature, Review new listing / Cancel, Get testnet USDC, List for sale…, List for {price}, Delist, Withdraw, Register for USDC | `listing-facts` + `data-hint-aggregate` (judge.spec); the hint report |
| `/market` | Listed Satchels. Everyone, judges | `getMarket()`: listings + snapshots + server hints | error ("Couldn't load listings.") · empty ("Nothing is listed right now." + Mint) · grid: buyable first, blocked last | Card → `/s/[id]/sale` | `[data-market-item]` order, `[data-gate]` per item |
| `/contract` | Keyless and verification facts. Judges | Account, role, access keys, birth tx + block, signer-tx count, oldest tx, code hash vs expected, MPC version, `config()` | rc/final ("Born without a key", "Keyless since birth.") · dev ("Development contract", keys) · values "unavailable" | 5 copyable verify commands (`near`, 3× `curl` FastNEAR, `cargo near build` + shasum), Config `<details>` (raw JSON) | All facts (`data-fact` keys/code-hash/expected), `data-testid=keyless` |
| `/s/999`, unknown URLs | Not found. Everyone | — | `/s/[id]` beyond 1–7: **soft 404** (HTTP 200 + noindex, streamed). Other URLs: hard 404 | Mint a Satchel, Go to My Satchels | H1 "This Satchel doesn't exist" (judge.spec). **Bug: renders a nested double shell** (see §5.1) |
| `/api/satchels/[id]` · `/api/contract` · `/api/clean-history/[id]` · `/api/card/{id}.svg` | JSON for the client poller and README curls; the server **hint**; the NFT media (band + status + "{n} signatures" + BTC/ETH/SOL chips; no balances or stitch; 3 embedded WOFF2 subsets) | — | 400 for a bad id, 404 for an unknown one; caches 15 / 60 / 15 / 60 s | — | Shapes pinned by judge.spec + card-svg.test |
| Metadata | `manifest.ts` (cream `#FFF9F0`), `icon.svg` (brass S), `favicon.ico`, `apple-icon.png`, `opengraph-image.png` + `twitter-image.png` (+ alt "Satchel: an NFT that is a wallet"), `public/icon-{192,512,maskable-512}.png`, `public/brand/*` (lockups, glyphs, mark), `public/fonts/satchel-symbols.woff2` | — | — | — | — |

**Global chrome.**
- **App (`NavShell`):**
  - a 56 px top bar below 1024 (lockup, Testnet chip from 480 px, account control, Menu → NavSheet);
  - a 224 px left nav from 1024 (My Satchels · Market · Mint, the account pill, the testnet note);
  - the RoleStrip (dev/rc), the fixture strip, and PendingIndicator (a pill below 1024, a card at the bottom right from 1024);
  - Footer: Product / Verify / Hackathon, the testnet note, the clean-history note and ThemeControl.
- **Landing (`LandingHeader`):** a separate header (pill nav of the anchors + Market from 1280, the Testnet chip, "Connect NEAR wallet") with its own LandingMenu sheet and its own LandingFooter.

**Tab titles today:**
- "Satchel #1 · Satchel", "Market · Satchel", "Contract · Satchel";
- but "Activity · Satchel #1", "Sale · Satchel #3", "Send Ethereum", "Fund Satchel #1" and "Transfer Satchel #1": no "· Satchel" under `/s/[id]/*`;
- "(n) Signing… · …" while a send runs in a background tab.

## 2. Flow map (exact states and error cases from the code)

**2.1 Connect / disconnect.**
- **Live:** one NearConnector (near-connect 0.11.4, testnet). **Fixture:** a mock wallet labelled "fixture"; `localStorage["satchel:mock-wallet"]`, and the sign-in default is alice.
- Labels: "Connect wallet" in the app (secondary, never brass in the chrome), "Connect NEAR wallet" on the landing ("Connect NEAR" below 640 px; the hidden word stays in the name), "Connecting…".
- Connected: an account pill (avatar letter + the account truncated). Its menu (`role=menu`) holds Copy account ID → toast "Account ID copied" · View on NearBlocks · Theme · Disconnect.
- Contextual connects: "Connect wallet to buy" and "Connect wallet to mint" (brass, they open the selector), and a brass "Connect wallet" inside the Send and Transfer guards.

**2.2 Mint** (`MintFlow`, `runCall` 3-step subset):
1. ready → CTA → `wallet` "Approve in your wallet…";
2. `minting` "Minting…" (step list: Approve in your wallet → Minting on NEAR → Minted);
3. the new id comes from the tx value, else the highest token of `nft_tokens_for_owner`;
4. done: the card becomes "Satchel #N" (Active, chips "BTC 0" / "ETH 0"), "Satchel #N is yours.", "Minted in {hash}", toast "Minted Satchel #N", Fund this Satchel (brass) · Open Satchel #N.

Errors: rejected → "You cancelled in your wallet. Nothing was minted."; mapped failures (E6 deposit…); no id → "Something went wrong. Nothing was sent." Not connected: the CTA signs in.

**2.3 Fund / receive.**
- Open from the ActionRow (Fund), a ChainRow's QR or Fund link, the FundCard, the Wallet tab's "Fund this Satchel", Mint done, or the zero-balance send guard.
- Chain switch (BTC | ETH; `replace` links) → the band-headed QR panel ("Satchel #N" + network pill), the full grouped address, three notes (this network only · confirmation time · "Anyone can fund a Satchel. Only its owner can send from it.") and the faucet link.
- The Incoming island is a client delta against the first balance seen (waiting / in mempool / received); its text is `aria-live`.
- Copy → check for 2 s + a toast ("Bitcoin address copied"). Close (✕, Esc, scrim) → `router.replace('/s/N')`.

**2.4 Send BTC / ETH / SOL** (`SendFlow` + `lib/signing/*`).

*Guards, in order:*
1. not connected → "Connect the owner's wallet" + Connect;
2. not owner → "You don't own Satchel #N / You're connected as X. Only Y can send from it.";
3. listed → "Signing is paused / … Delist it to send." + Go to Sell;
4. zero balance → "This Satchel has no {T} yet." + Fund;
5. an unsent intent on the same chain → a danger banner "You have an unsent signed transaction. Broadcast it or replace it." + that intent's SignedNotSentCard or tracker + **Replace** (re-prepares with the same nonce or inputs).

*Form (1 of 3):*
- ChainSelect (radiogroup; segments carry balances; SOL only with the flag; switching clears the form).
- Amount (`inputmode=decimal`, "," → "."): errors "Use at most N decimals." / "Enter an amount above zero." / "That's more than this Satchel can send."
- "Available x" + Max ("Max leaves room for the network fee.").
- To + Paste: validation debounced 150 ms; a resolved row shows the full grouped address + "{Network} address" + Clear.
- Tiers:
  - errors: BTC mainnet/regtest/typo, EVM format/zero/checksum typo, SOL format, self;
  - warnings: EVM no checksum, SOL PDA; both need "I checked this address" at Review.
- Review (aria-disabled until valid).

*Review (2 of 3):*
- Prepared while it shows (nonce, fee, UTXOs, s0, h0; BTC txid collision check).
- Shows: the headline amount, "to … · network", From (Satchel −amount+fee) / To (+amount, full address), Network fee (est.) "paid by this Satchel", "Satchel #N after", NEAR fee "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account", Time, "Uses n coins…" (BTC > 1 input), SOL "refreshed every few seconds", and the warning-tier checkbox.
- Pinned: the finality line, **Send {amount}** (aria-label "Send x to y"), the helper "Your wallet will ask you to approve a request to {contract}.".
- Prepare error → "Couldn't estimate the fee." + Retry (E41 for an unsafe build). SOL: the blockhash refreshes every 8 s; a click with a hash older than 10 s refreshes instead ("Refreshing network details…").

*Click:* the intent is persisted to `localStorage["satchel:pending:v1"]` **before** the wallet opens, then the wallet is called synchronously; the URL gets `&intent=`. The CTA reads "Preparing…", then "Approve in your wallet…" + "Check the Meteor or Intear window.".

*Tracker (3 of 3), driven by chain state:*
- Rows: Approved in your wallet → Signing with NEAR's signer network (pulsing dot, `m:ss` timer, "Signing n inputs") → Broadcast to {network} (tx id + explorer + clock time) → Waiting for 1 confirmation (hourglass + per-chain note) → Confirmed.
- ETA line: "Usually about 10 seconds." → 20 s "Taking longer than usual." → 60 s "Still working. The network allows up to about 2 minutes." → 150 s "Still waiting for the network. We'll keep checking.".
- Footer: "Keep this tab open until it says Sent." → "You can close this tab. Activity keeps tracking it." + "Signatures by NEAR Chain Signatures".
- ✕ becomes **Minimize** while non-terminal (toast "Still signing. Keep this tab open until it says Sent."). Done (brass) · View activity.

*The 14 stages* (`machine.ts`):
1. `idle`, `preparing`, `awaiting_wallet`;
2. `cancelled` (a rejection with no record within 10 s; the Intear "Timeout" isn't a rejection): back on Review, red "You cancelled in your wallet. Nothing was signed.", inputs kept;
3. `signing`;
4. `signed` → local verify → `broadcasting` (a verify failure is `failed` E22 "The signature didn't match this transaction. Nothing was sent.");
5. `sent`, `confirmed`;
6. `timed_out` (a failed record): "Not signed / The signer network did not return a signature. Nothing was sent." + the conditional line + "Try again reuses nonce N" / "the same coins" / "waits until the old blockhash expires";
7. `signed_not_sent` (the broadcast failed, or a reload found a signature with no chain tx): "Signed, not sent · {reason} Nothing has left Satchel #N yet." + "The signed transaction is saved…" + Details + **Broadcast again** (an EVM nonce gap shows "Can't be broadcast yet: nonce N waits for nonce M." instead);
8. `expired` (SOL): "Expired / The Solana transaction expired while it was being signed…" + Try again (a rebuild on the same intent);
9. `unknown` (h0 + 250 blocks): "Still waiting for NEAR / NEAR hasn't confirmed transaction {hash} yet. This app hasn't broadcast anything." + Check again + NearBlocks, never "failed";
10. `failed` (mapped error).

*Mapped failures* (`errorCopy`): ERR_NOT_OWNER (E3), ERR_FROZEN (E4), deposit (E6), gas (E7), MPC_REJECTED (E8), MPC_QUEUE (E10), ERR_EVM_NONCE_GAP, ERR_EVM/BTC/SOL/HEX (E39), ERR_CHAIN_UNSUPPORTED (E40), default "Something went wrong. Nothing was sent.".

*Everywhere outside the flow:*
- PendingPill/PendingCard: "Sending x · 0:42" → "Sent x" (hidden 5 s later) / "Signed, not sent · Broadcast now"; it links to `send?intent=`.
- The card pill reads Signing / Needs attention (owner only).
- The SignedNotSentCard sits at the top of the Wallet tab and in Activity's In progress group.
- Resume-on-load turns signed/broadcasting into "Signed, not sent" instead of broadcasting silently.

**2.5 Transfer / give** (`TransferFlow` + `Handoff`).
- *Recipient (1 of 2):* "To (NEAR account)". Pure validation, then `view_account` (debounced 400 ms) + `nft_supply_for_owner`.
  - Errors: format ("Use a NEAR account like name.testnet."), self, the Satchel contract ("…can never be used again."), the MPC account, "No account named X on NEAR testnet.".
  - Implicit 64-hex: a warning. Found: a RecipientCard "Account found · owns n Satchels".
- *Review (2 of 2):*
  - the stitched card + the "To X · Account found" stub;
  - the rows "X will control everything in this Satchel: {balances}. Its addresses go with it…", "Only the new owner will be able to sign…", "The signature history stays with the Satchel.";
  - the soft guard if a signature is in flight: "A signature from {t} ago is still in progress…";
  - "This can't be undone. Only X can transfer it back." + **Transfer to X**.
- *In flight:* the card lifts (translateY −12, scale 1.04, rotate 6°); the CTA reads "Approve in your wallet…" → "Transferring…"; a 3-step list.
- *Success:* only after `nft_token` confirms the new owner (never optimistic).
  - Handoff: the card slides to the recipient's side (spring), the stitch draws in, the "Transferred" pill and the hero sentence "X now controls {balances}." (focus + polite announce);
  - a receipt (From · To · NEAR transaction · Time UTC), toast "Transferred Satchel #N to X", Done / View Satchel #N;
  - reduced motion: a 200 ms cross-fade.
- *Errors:* cancelled ("You cancelled in your wallet. Nothing changed."), ERR_LISTED, ERR_BAD_RECEIVER, ERR_NOT_OWNER, an owner mismatch after success → "Something went wrong…".
- *Guards:* not connected / not owner / listed ("Delist Satchel #N before transferring it." + Go to Sell).

**2.6 List / sell (quiet period)** (`OwnerSale` + `SellFlow`).
- *Tab:* "Not listed." + "You can list in {n blocks ~t}" or "Ready to list" + **List for sale…** (→ `?list=1`).
- *Sell flow ("Sell Satchel #N"), "Before you list":*
  - Quiet period: "No signature in the last 250 blocks" / "No signatures yet" / "You can list in …" + a progressbar (n of 250 blocks);
  - USDC: "Registered for USDC payouts" / "USDC payouts aren't set up" (**no register action here**);
  - Past signatures: "All n can no longer move coins" / "n could still move coins" / "n is still settling" / "Can't verify n right now" (the browser check; advisory).
- *Form:*
  - currency USDC | NEAR (default USDC), Price (a bare large input), "Buyer gets {holdings}.";
  - rows: Price · Satchel fee none · Listing deposit 0.01 NEAR · **You receive**, then "Paid to X in the same transaction as the sale.";
  - "While it's listed" (4 bullets);
  - **List for {price}**, disabled until the quiet period passes, USDC is OK and the price is > 0; the warning "Buyers can't buy while it can still move coins. Settle it first, or list anyway.".
- *Outcome:* "Approve in your wallet…" → "Listing…" → toast "Listed for x. Signing paused." → `router.push(/sale)`.
- *Errors:* cancelled, ERR_QUIET_PERIOD → "Not listed. You can list in …", ERR_ALREADY_LISTED.
- *Listed panel:* "Listed for x · Listing #n", "Delisting is instant…", "To change the price, delist and list again.", Delist, plus the owner's hint report.

**2.7 Delist.** Three entry points, two code paths:
- the ActionRow's brass Delist (→ the Sale tab);
- the listed panel's Delist (tracked `runCall`: "Approve in your wallet…" → "Delisting…" → toast "Delisted. Signing resumed.");
- the FreezeBanner's text-button Delist (an **untracked** direct wallet call; any error → toast "You cancelled…", shown with a success icon).

**2.8 Buy (clean-history gate)** (`BuySection` + `useCleanCheck`).
1. The SSR shows the server hint + "Waiting for your browser's check"; the browser check runs on mount and every 10 s.
2. **GateLine** (`aria-describedby` of Buy): "Clean history · checked {t}" / "Checking history…" / "Waiting for your browser's check" / "Settling: n signature(s)" / "Blocked: n unused signature(s)" / "Can't verify n signature(s)" / "Unsafe: {reason}".
3. **Buy for {price}** is enabled only for clean or empty. When disconnected it reads "Connect wallet to buy" and stays enabled, **even when blocked**.
4. Click → "Re-checking history…" (a synchronous browser re-check; on a fail it announces and goes back to idle) → re-read `satchel(id)`. A different listing id or `sig_count` → **interstitial**: "This listing changed. Listing #o at p was replaced by listing #n at q. Clean history runs again." or "X delisted Satchel #N." + Review new listing (reload) / Cancel.
5. → "Approve in your wallet…" → "Buying…" → USDC `SuccessValue "0"` → "Not bought. Your x was refunded.", or success: the reverse Handoff ("Bought", "Satchel #N is yours.", "You now control …"), a receipt (Price, Seller, Listing, Transaction), Open your Satchel, toast "You bought Satchel #N".

- **Blocked banner:** "1 past signature could still move coins" + "{key}: {evidence}." + See the signature (→ `#clean-history`).
- **Report:**
  - the eyebrow, the verdict (+ a sub), meta "Checked in your browser {t} · n signatures", the trust line "Runs in your browser. Satchel's server isn't trusted for this.", the "1 of 2 sources" chip;
  - Checks (keys since birth (block), code matches, ETH no delegated code; dev warning);
  - groups "Needs attention (n)" / "Can't move coins (n)" (key, "Would send x to y", evidence link, item pill Settled / Expired / Unfunded / Foreign / Settling / Unused / Can't verify / Checking…);
  - sources per chain; `<details>` "How Satchel checks this" (badge promise, "What it doesn't cover" ×5, the disclosure).
- Then "You get" (holdings + "Unconfirmed deposits never count.") and "How buying works" (3 steps).

**2.9 Sold receipt and proceeds** (`SoldReceipt` + `EscrowPanel`).
- Shown to the account named as seller in the latest `sold` event: the tab reads **Sold**, the card shows the Sold pill without the stitch.
- "You sold Satchel #N to B for p." + "p arrived in your NEAR account." / "…is on its way…" (pending; re-polls 6× at 5 s).
- Rows: Price · Buyer · Paid ("In the same transaction as the sale" / "Waiting for you (the payout didn't go through)" / "Withdrawn from escrow" / "Paying out…") · Listing · Transaction.
- Escrow, where state (`proceeds_of`) wins over the event: "p is waiting for you." + why + **Withdraw** (USDC first: "Register for USDC (0.00125 NEAR)").
- After Withdraw it polls ≤ 6 s: "p sent to your NEAR account." (toast + announce) or "The payout didn't go through again. p is still waiting for you.".
- The escrow panel also shows on My Satchels.

**2.10 Theme.** Day · Night · System (a radiogroup with arrow keys) in the footer, the NavSheet and the account menu. `satchel:theme:v1`; the head script applies it before paint. Today: **Day whatever the OS** (D-42), and System follows the OS live. **2.11 Navigation:** the app NavSheet (below 1024) and the landing menu sheet (below 1280), which differ (§5).

## 3. Component inventory (`src/components/**`)

Kinds:
- **V** = visual, rebuild in 2.0;
- **L** = logic, keep (re-skin around it);
- **V+L** = rebuild the markup and keep the behaviour or contract named.

| Component (file) | Kind | Used by · keep this |
|---|---|---|
| `ui.tsx`: `Icon`, `ChainMark`, `ChainDot`, `StatusPill` (+band), `ItemPill`, `VERDICT`, `Chip`, `Banner`, `ExternalLink`, `Avatar`, `Swatch`, `STROKE` (1.75), `cx` | V (cx, L) | Everywhere. Keep the state → word + icon maps (never colour alone), ExternalLink's sr-only "(opens in a new tab)" and `data-status` / `data-item-status`. Brand 2.0: stroke 2; chain **charms** replace ChainMark |
| `SatchelCard.tsx`: `SatchelCard`, `Stitch` | V+L | Layout, ViewerCard, Market, MySatchels, Mint, Transfer, Handoff. Keep `<figure aria-labelledby>`, real text, `data-card`, `data-owned`, `[data-stitch]` (= "you own it"), `pose`, `headingLevel` |
| `SatchelWallet.tsx` | V | Wallet tab and every flow background (FundCard, ChainRows, freshness, FactsGrid, Verify, HowItWorks) |
| `ChainRow.tsx` | V | Wallet tab. Keep `data-chain-row`, `data-balance`, the named explorer link |
| `AddressDisplay.tsx` | V+L | Rows, review, receive. Keep: the DOM text is the raw address; truncated mode carries the full value in `aria-label`/`title` |
| `Facts.tsx`: `FactsGrid`, `VerifyDisclosure`, `HowItWorks`, `ContractFactsGrid`, `keysFact`, `codeFact`, `ProofGrid` (**dead**) | V+L | /s/[id], /contract. Keep the `data-judge-facts` / `data-fact` / `data-full-address` contract |
| `Clean.tsx`: `GateLine`, `gateText`, `CleanHistoryReport` (+`ItemGroup`, `verdictLines`) | V+L | Sale tab, Market. Keep `data-gate`, `#clean-history`, `role=status`, the hint vs browser split |
| `Timeline.tsx` | V | Activity (the row-title mapping, day groups, `data-activity`) |
| `NavShell.tsx`: `Lockup`, `RoleStrip`, `Footer`, `NavShell` | V | (app) layout, not-found, landing (RoleStrip). Keep the skip link, `nav[aria-label=Main]`, fixture and role strips |
| `Landing.tsx` | V | `/`, `/mint` (assembly; MySatchels above the hero) |
| `client/SatchelPage.tsx`: `useViewer`, `ViewerCard`, `PageHeading`, `OwnerPill`, `StatsStrip`, `FreezeBanner`, `NavTabs`, `ActionRow`, `SignedNotSentSlot`, `PendingElsewhere`, `QuietLine` (**dead**) | V+L | The /s/[id] layout + flows. **Keep `useViewer`** (owner, the status upgrade to Signing / Needs attention, the seller's sale) |
| `client/FlowShell.tsx` | V+L | Send, Transfer, Receive, Sell, Mint. Keep: SSR-visible, inert + aria-hidden background, focus to the title, Tab trap, Esc, `replace(closeHref)`, Minimize toast, `data-flow-shell`, `flow-close` |
| `client/SendFlow.tsx`: `SendFlow`, `FormStep`, `ReviewStep`, `SEND_CHAINS` | V+L | /send. Keep the guards' order, prepare-while-review, persist-then-call-sync, the retry listener, the SOL 8 s/10 s rules and all test ids |
| `client/SigningProgress.tsx`: `SigningProgress`, `SignedNotSentCard`, `retry`, Timeout/Expired/Unknown cards | V+L | Send, Wallet tab, Activity, the guard. Keep `data-stage`, `data-row`/`data-row-state`, the announce rules |
| `client/TransferFlow.tsx` · `client/Handoff.tsx` (`SPRING_*`) | V+L · V | /transfer, Buy done. Keep chain-confirmed success before the handoff; the motion is rebuilt (2.0: a 10° pendulum swing, 600 ms) |
| `client/SaleTab.tsx`: `SaleTab`, `BuySection`, `OwnerSale`, `SellFlow` | V+L | /sale. Keep the gate logic, the re-check, the listing re-read, refunded/changed and the "frozen" listing while buying |
| `client/SoldReceipt.tsx`: `SoldReceipt`, `useProceeds`, `EscrowPanel` | V+L | /sale (seller), MySatchels |
| `client/MySatchels.tsx` | V+L | `/` when connected (`data-testid=my-satchels`) |
| `client/MintFlow.tsx` | V+L | /mint |
| `client/AccountControl.tsx` · `ConnectButton.tsx` | V | Headers, nav, guards (`connect`, `account-pill`) |
| `client/NavLinks.tsx`: `NavLinks`, `NavSheetButton` · `client/LandingMenu.tsx` | V | The app nav + sheet; the landing sheet (inert + focus return) |
| `client/PendingIndicator.tsx` | V+L | Both shells. Keep `resumeOnLoad()` and the "(n) Signing…" title |
| `client/ThemeControl.tsx` | V+L | Footers, menus. Keep the external store and radiogroup semantics |
| `client/Toaster.tsx`: `toast`, `announce`, `Toaster` | V+L | Global. Keep **one** polite `status-region` |
| `client/CopyButton.tsx` · `client/Incoming.tsx` · `client/ActivityInProgress.tsx` | V+L | Rows/receive/contract · Receive · Activity |
| `client/Providers.tsx` · `client/useCleanCheck.ts` · `client/useSale.ts` | L | Root · Buy and Sell · the seller detection |
| `landing/*`: `Hero`, `UseCases`, `HowItWorksSection`, `CleanHistorySection`, `TrustBand`, `UnderTheHood` (+`SUMMARY_ROW`, `DisclosureChevron`), `Questions`, `FinalCta`, `LandingHeader` (+anchors, links), `LandingFooter`, `primitives` (`Section`, `SectionHead`, `Field`, `TestnetChip`, constants) | V | `/`. The content decisions (D-41/D-42, honesty) live in `copy.landing` + `lib/faq.ts` + `lib/lock-facts.ts` (L) |
| `landing/art/UseCaseArt`, `EmptyHooks` | V | Use cases, Trust band (leather art: replace with 2.0 illustration) |
| `landing/hero-loop/*` (HeroLoop, Mount, `engine.ts` WAAPI, css) · `landing/catch-story/*` (CatchStory, Mount, Desk, `engine.ts`, `states.ts`, css) | V+L | Hero, Clean history. Keep: poster in the SSR, labels as `data-l` attributes, Pause (WCAG 2.2.2), pause off-screen / hidden tab / inert, reduced-motion frames |

Logic in `lib/` that the UI depends on (keep; out of the rebuild's scope except copy, theme and card): `copy.ts` (deck + `errorCopy`), `format.ts`, `view.ts`, `validate.ts`, `theme.ts`, `motion-flag.ts`, `clock.ts`, `card.ts` (per-token leather hue), `card-svg.ts` + `card-fonts.generated.ts`, `faq.ts`, `lock-facts.ts`, `signing/*`, `near/*`, `data/*`, `chains/*`.

## 4. Test map (what a redesign changes)

**E2E** (`test/e2e`, fixture build, role final, SOL send on; `mobile` = Pixel 7 runs only `responsive.spec`):

| Spec | Pins (UI contract) | Verdict |
|---|---|---|
| `judge.spec` (7) | No streamed or hidden segments on /s/1. `<title>` "Satchel #1 · Satchel". Meta description with both addresses. H1 "This NFT is a wallet.". `[data-judge-facts]` → `[data-fact=owner\|status\|keys\|code-hash] dd` texts ("Active", "none since birth"), `[data-fact-sig-count]`, `[data-full-address=btc\|evm\|sol]`. `figure[data-card='1']` contains "Satchel #1", "Active", "2 chains", "BTC 0.00189718", `data-owned=false`, no `[data-stitch]`. /contract: H1 "Born without a key", `keyless` "Keyless since birth.", `[data-fact=keys\|code-hash\|expected]` ("Matches"). /market: 3 `[data-market-item]`, #4 last, `[data-gate]` blocked/clean. /s/4/sale: `listing-facts` + `data-hint-aggregate`. /s/999: H1 "This Satchel doesn't exist" + noindex. API shapes, `/api/card/3.svg` (+3 font faces) | **Must keep passing.** Only strings 2.0 deliberately changes ("2 chains", "Active", the H1) may move, with a decision |
| `flows.spec` (12) | Test ids: `send-flow` (dialog), `amount`, `to`, `recipient-resolved`, `review`, label "I checked this address", `review-amount` "0.0010 ETH", `send` "Send 0.0010 ETH", `review-card` texts, `signing-progress[data-stage]`, `[data-row][data-row-state]`, `eta`, `flow-close` aria-label "Minimize", `pending-card`, `broadcast-again`, `cancelled`, `to-error` "mainnet", `mint-flow` + `figure[data-card=preview][data-owned=true]`, `mint-cta`, `mint-done`, `transfer-flow`, `xfer-to\|error\|review\|cta`, `recipient-card`, `handoff` (+1 `[data-stitch]`), `handoff-sentence`, `buy-block`, `buy` (aria-disabled), `buy-done`, `#clean-history`, `sell-flow`, `list-checklist`, `list-cta`, `price`, `#freeze`, `action-row`, `owner-pill`. Many exact strings ("Nothing has left Satchel #1 yet.", "Try again reuses nonce 1", "Blocked: 1 unused signature", "Buy for 5.00 USDC") | **Behaviour must survive.** Keep the test ids; update strings only where the 2.0 voice changes them |
| `sale-sol.spec` (6) | `sold-receipt[data-payout]`, `sold-rows`, `sold-paid`, `escrow`, `withdraw-near`, `toast`, the heading "You sold Satchel #3 to … for 5.00 USDC.", link "Sold" `aria-current`, `data-chain-select=sol`, "Available 0.5000 SOL", `review-card[data-blockhash][data-fetched-at]`, `sol-expired`, `try-again`, the localStorage/sessionStorage shapes | **Behaviour must survive** (as for flows) |
| `theme-a11y.spec` (9 decl., ~24 runs) | Day before first paint **even on a dark OS**; ground `rgb(255,249,240)` / `rgb(23,16,12)`, theme-color `#FFF9F0`/`#17100c`; footer radios Day · Night · System; arrow keys; axe on 7 pages × 2 themes; reduced motion; hero paused; send dialog name "Send Ethereum", `#flow-title` focused, background inert, Esc → /s/1 | **Rewrite the theme half** (2.0: Night follows the OS; new grounds `#F6F5FB`/`#120C26`). Keep axe, the dialog and no-flash checks |
| `responsive.spec` (4) | /s/1 card above the fold at Pixel 7, "Open menu" → dialog "Menu", receive sheet x=0 + full address; landing header widths (Connect NEAR 44 px, chip from 480, mark below 360), menu sheet order + 44 px rows + inert; landing ≤ 8,500 px at 390; hero order; pills 56 px; hero loop no truncation | Keep the /s/1 part; **rewrite the landing parts** |
| `landing.spec` (18) · `landing-catch` (15) · `landing-hero` (10) · `landing-trust` (12) · `landing-static` (5) | v4 structure, copy and geometry: 8 sections in order, header 64 px pill nav, brass exactly twice, hero type rule, word budgets, heights (≤ 8,000 at 1280), no h-scroll 1440→320, CLS < 0.01; the catch story's sticky desk and beats; the hero loop's 10 s timeline + Pause; trust band, 6 rules, 7 FAQs; **no API or chain host requested from /**, no account, Satchel number or time in the text, the disclosure only in `#q-proves` | **Mostly rewritten with the new landing.** Keep the principles: server HTML, no data on /, pause control, reduced-motion and no-JS frames, 44 px targets, no h-scroll, CLS, the honest disclosure |

**Unit** (`test/unit`):
- **Logic, unaffected by the redesign** (must keep passing): `signing-machine` (17), `signing-runner` (12), `track-tx` (15), `contract-outcome-format` (14), `sale` (9), `sol-send` (13), `evm-nonce-gap` (3), `clean-history-fixtures` (10), `birth-actions` (15), `derive` (2), `faq` (19) and `lock-facts` (6) (copy logic: the Solana variants, the dev twin), `motion-flag` (11).
- **Brand-coupled, so they change with 2.0:**
  - `config-copy-theme` (24): the copy rules (ban "approval", "MPC", "yield", "cooldown", "Safe to buy", "$n", glyphs, all-caps outside the allowlist: **keep**); the D-41 H1; the **5 pill words**; v4 landing strings and word budgets; manifest = `GROUND.day`; the head script's "Day whatever the OS".
  - `contrast` (10): parses `globals.css` `:root`, `.scope-saddle`, `.scope-tile-*`, `.scope-night-band`; re-target it at the 2.0 tokens.
  - `card` (per-token leather hue vectors).
  - `card-svg` (5: snapshot + **pinned WOFF2 bytes** of Bricolage/Instrument; regenerate them with Funnel Display/Onest via `fonts:card`).
  - `hero-loop` (13), `catch-story` (12), `trust-band` (14): v4 markup.
  - `landing-no-data` (3): a static import scan of `components/landing/**`; keep the rule and retarget the paths.

## 5. UX problems worth fixing in the rebuild

### 5.1 Structural (layout, information architecture, behaviour)
1. **Every Satchel tab re-renders a ~600 px header** before its content:
   - chips, H1, sub, card, owner pill and freeze banner come first (`s1-activity__390-day`);
   - on Buy, the purchase sits around 1,000 px down at 390 (`states/buy-s3-checking__390-day`);
   - the visitor H1 "This NFT is a wallet." even heads the Buy tab;
   - there is no StickyBuyBar;
   - on a listed Satchel's Wallet tab at 390, a visitor sees no price and no Buy (the StatsStrip is desktop-only) (`s5__390-night`).
2. **Massive repetition** on one page:
   - the status 3–4× (band, StatsStrip, Facts, banner);
   - signatures 3× (OwnerPill, StatsStrip, Facts);
   - each address 3× (ChainRow, Facts, Verify);
   - "read at …" freshness 3×;
   - the price 4× on Buy (`states/buy-s3-clean__1280-day`);
   - a blocked verdict 4× (hint dl, GateLine, banner, report) (`s4-sale__1280-day`);
   - **three Delist controls** for the owner (`states/owner-s5-sale-listed-full__390-day`);
   - the theme control in 3 places.
3. **Two sources of truth.** The server `FactsGrid` and `listing-facts` never take the live snapshot. After a send, Facts says "Status Active · 2 signatures" while the card says "Needs attention" and the pill "3 signatures" (`states/needs-attention-s1-full__390-day`, `states/send-tracker-signing-pendingcard__1280-day`). After a purchase, the old listing dl still shows (`states/buy-s3-done-full__390-day`).
4. **There is no app home.**
   - A connected user's "My Satchels" is the marketing landing with a grid bolted on top (`states/home-mine__1280-day`; with no Satchels, two brass CTAs: `states/home-empty__390-day`).
   - The app nav's "My Satchels" (→ `/`) highlights on *any* `/s/*`, including someone else's Satchel.
   - The desktop left nav lacks Contract facts.
   - There are two headers, footers, menus and connect labels ("Connect wallet" vs "Connect NEAR wallet"), plus two type scales and two button systems (landing `btn-pill` 56 px vs app `btn`).
   - When connected at 1280, the landing pill nav wraps onto two lines.
5. **`/s/999` renders a nested double shell** (two navs, two strips, two footers). `not-found.tsx` wraps NavShell inside `(app)`'s NavShell (`s999__390-day`, `s999__1280-day`). Tab titles under `/s/[id]/*` lose "· Satchel".
6. **Honesty gaps:**
   - (a) the hint-mode report says "Checked in your browser at …" *and* "Waiting for your browser's check" (`Clean.tsx` uses `clean.meta` in hint mode);
   - (b) the owner's listed tab never runs the browser check, so it waits forever (`owner-s5-sale-listed-full`);
   - (c) "You get" lists raw balances. The computed `encumbered_utxos` and the copy `buy.excluded` are unused;
   - (d) a blocked listing still shows a brass, enabled "Connect wallet to buy" to visitors (`s4-sale__1280-day`);
   - (e) Market says "Clean history · checked at …" for what is a server hint;
   - (f) `snap.errors` and the RPC-down banner never surface.
7. **Card hero says nothing.** "2 chains / Balances below" is identical on every Satchel and wrong on desktop (the balances sit beside it); the real info hides in 12 px chips (`market__1280-day`, `states/home-mine__1280-day`).
8. **Failure and feedback states keep the wrong frame.**
   - Timed-out and not-sent trackers still read "Sending x… Keep this tab open until it says Sent." (`states/send-timed-out__390tall-day`, `states/send-signed-not-sent-tall__390-day`).
   - The unsent guard stacks two danger banners plus an unexplained "Replace" (`states/send-guard-unsent__390tall-day`).
   - A user's own wallet cancel is shown in danger red (`states/send-cancelled__390-day`).
   - Guards are a lone banner in a full-height sheet that still shows "1 of 3" (`s1-send-evm-guest__390-day`). The Transfer guard has no body text.
9. **Dead ends and gaps:**
   - The Sell flow's "USDC payouts aren't set up" has no Register action (`sell.usdc.register` unused). The list stays disabled, and the default currency is USDC although the landing says "paid in NEAR".
   - The owner's Sell tab is a thin "Not listed. Ready to list" (`states/owner-s1-sale-tab__390-day`).
   - Mint always closes to `/`. Both post-transfer buttons (Done, View Satchel) go to `/s/N`.
   - The FreezeBanner's Delist skips the tracked path.
   - Activity rows expand with no affordance, show absolute UTC stamps, and have no "Show older".
   - Receive shows no SOL while Send offers SOL.
10. **Menus and a11y inconsistency.**
    - The app NavSheet has no inert background, no focus trap and no focus return; its rows are 40 px (`states/menu-app-sheet__390-day`). The landing sheet does all of these (`states/menu-landing-sheet__390-day`).
    - The account menu is `role=menu` with no arrow keys, and at 390 shows only "a…" with no way to read the full account (`states/menu-account__390-night`).
    - App targets (Copy, QR, explorer, text buttons) are 24 px, while the landing enforces 44 px.

### 5.2 Visual (fixable within any structure)
- **Mobile overflow:** the Send ChainSelect with BTC · ETH · SOL + balances is clipped at 390, and the *selected* SOL segment is off-screen (`states/send-form-filled__390-day`, `states/send-sol-form__390tall-day`).
- **Addresses:**
  - `overflow-wrap:anywhere` breaks groups mid-group ("m2 / wf", "b / 2d5");
  - truncated addresses wrap onto two lines ("tb1qtf95… / cwy5") (`s1__390-day`, `s1__1280-day`);
  - Facts addresses orphan one character.
- **Handoff on phones:**
  - the card moves only about 58 px, so the signature moment is barely visible;
  - the from/to names collide ("…testnetbob.satchelhq.testnet");
  - the toast sits on the pinned CTAs (`states/transfer-handoff-end-tall__390-day`, `states/transfer-handoff-mid__390-day`).
- **Toasts:** a single success-check icon for every message (cancellations and "Still signing" included). They are parked 96 px from the bottom over the content and pinned bars (`states/toast-copied__390-day`, `states/sell-listed-toast__390-day`, `states/send-minimized-pending-pill__390-day`), and some exceed five words.
- **Buttons:**
  - the primary "Copy address" renders as "Copy" (CopyButton ignores `label` for visible text; `s1-receive-btc__390-day`);
  - the secondaries "View activity", "View Satchel #1" and "Open Satchel #8" wrap onto 2–3 lines beside a wide Done (`states/mint-done__390-day`).
- **Typos and formats:**
  - "1 signatures" on Market; the hint time printed twice per card (`market__1280-day`);
  - raw enums ("Role: final", "clean · 2026-10-26 …");
  - "listed at block 274282000" instead of a time;
  - zero shows as "BTC 0" on the minted card but "0.0000 BTC" elsewhere;
  - **bug:** ChainRow's per-row zero "Fund" link tests `startsWith("0 ")`, but `formatAmount` yields "0.0000 BTC" (with an NBSP), so the link never renders;
  - the birth tx on /contract isn't a link; the commands use 24 px icon-only copy buttons (`contract__1280-day`).
- **Forms:**
  - the Sell price input has no field affordance;
  - the amount's ticker floats far right of the number;
  - the disabled Send doesn't say that the ack checkbox is missing;
  - the checklist rows lack status icons (and a hidden Snowflake leftover) (`states/sell-flow-filled__390tall-day`).
- **Density:**
  - the 1280 left column is empty below the card for visitors (the spec put BuyBlock there);
  - the long Facts `<dl>` dominates /s/1;
  - flows leave half the sheet empty.
- **Old-brand tokens to retire:** body 15 px (2.0: 16), radii 8/14/22, stroke 1.75, the brass gradient, the leather per-token body, the cream ground, Bricolage, Instrument and Spline.

### 5.3 Brand 2.0 decisions these collide with (rule, then rebuild)
- Pill words: Active · Signing · Listed · Sold · Needs attention (unit-pinned) vs 2.0 "Sent", "Paused for sale", "Needs attention".
- "Transfer" vs "Give this Satchel".
- The stitch is the **only** "you own it" signal and is test-pinned (`data-owned`, `[data-stitch]`). 2.0 needs an equivalent.
- The handoff motion (lift + 6° + spring) vs the 10° pendulum.
- Theme default: Day always (D-42 + tests) vs Night following the OS.
- The per-token leather hue (`card.test`).
- The card SVG fonts (pinned bytes).

### 5.4 kb/80 features never built (decide: build or drop)
- the StickyBuyBar;
- the meta-chip ⋯ menu (copy token, link, X);
- Activity "Show older" paging and Today/Yesterday groups;
- the RPC-down and owner-changed banners;
- the 60 s "Waiting for your wallet" hint;
- the tracker's Details disclosure;
- the exit toast "Sent x · in mempool";
- Receive Share;
- the buyer's balance line ("You have / You need");
- encumbered-coin exclusion;
- ProofChip;
- the My Satchels stack and the per-card ⋯ menu;
- Market sort and filters;
- a Retry on an unavailable balance.

Dead code: `ProofGrid`, `QuietLine`, and about 25 unused copy keys (`banner.*`, `page.ownerChanged`, `sign.walletSlow`, `toast.sent`, `act.more/today/yesterday`, `buy.have/short/excluded`, `market.sort`…).

## 6. What works and must survive
1. **Judge-first HTML.**
   - Blocking SSR with no Suspense above the facts: `/s/1`, `/contract`, `/market` and `/s/[id]/sale` carry every fact as visible text, full addresses unbroken in the DOM, outside any hidden node or disclosure.
   - The card is a `<figure>` of real text; the title and meta description carry both addresses; the soft-404 has noindex.
   - The landing reads nothing live and stays generic.
2. **The signing state machine**:
   - the intent is persisted before the wallet opens, then the wallet is called synchronously;
   - progress is driven by chain state, never by the wallet promise;
   - a rejection needs 10 s with no record, and the Intear timeout isn't one;
   - h0 + 250 → "unknown", never "failed";
   - resume on reload; "Signed, not sent" with Broadcast again and the nonce-gap rule;
   - Try again reuses the nonce or inputs;
   - the SOL blockhash is ≤ 10 s old at the click;
   - Minimize ≠ cancel, with the pending pill or card and the background-tab title.
3. **The clean-history gate**:
   - only the browser check enables Buy;
   - a synchronous re-check plus a listing and `sig_count` re-read before the call, with the "This listing changed…" interstitial;
   - USDC refund detection; no override anywhere;
   - the hint is labelled as the server's; the blocked #4 stays an honest example;
   - the seller's proceeds: state over event, escrow on My Satchels too, USDC registration before Withdraw.
4. **Honest, specific copy**:
   - "Nothing was sent", "Nothing has left Satchel #N yet.", "Testnet only. Coins here have no value.";
   - no fiat and no cooldown; "Signing paused while listed";
   - "Its addresses go with it"; gifts unchecked;
   - "Runs in your browser. Satchel's server isn't trusted for this."; the what-it-doesn't-cover list;
   - `errorCopy` maps every contract and MPC code to what moved and what didn't;
   - the copy-rule unit test.
5. **Flows as real routes**:
   - deep links, visible without JS;
   - close replaces the URL;
   - inert background, focus trap and Esc;
   - recipient tiers (a mainnet BTC address refused, the EIP-55 warning + ack, self/contract/MPC refused, an existence check);
   - the handoff runs only after chain-confirmed success, with a reduced-motion cross-fade.
6. **Accessibility patterns:**
   - a theme head script with no flash;
   - one polite status region (`announce`), with alerts only for failures;
   - label-in-name (Max, Send);
   - `aria-current` tabs (links, not a tablist);
   - `aria-describedby` from Buy to the GateLine and from the disabled ActionRow to its reason;
   - icon + word for every state;
   - a skip link;
   - the hero loop's Pause, pausing off-screen, on a hidden tab and behind dialogs;
   - landing targets ≥ 44 px;
   - axe clean in Day and Night.
