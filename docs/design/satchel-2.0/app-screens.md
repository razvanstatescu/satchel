# Satchel 2.0: app screens and flows (product designer, 2026-10-26)

Every app screen and state, for the W3 builders (packages S, X, C and H in `build-plan.md`). Read it with `context.md`,
`rulings.md`, `design-system-impl.md`, `design-spec.md` (the concept and the shell) and `voice-copy.md` (the strings).

**Prototypes:** `proto/app-*.html`. Each has a State switcher; use `?state=…&theme=night`. Screen CSS is in
`proto/app.css`, the new shared pieces in `proto/APP-COMPONENTS.md`, and the screenshots in `proto/shots/app-*.png`.

**Conventions:** copy keys are `copy.ts` keys with `voice-copy.md` §2 applied, and **NEW** marks a string that doesn't
exist yet. Fixture data throughout (#1 is alice's; #3 and #5 are for sale and clean; #4 is blocked; #8 is newly minted),
with the real derived addresses.

## 0. What changes, and why (the brief's eight problems)
| # | Today | 2.0 |
|---|---|---|
| 1 | Every `/s/[id]` tab re-renders a ~600 px header. A buyer finds Buy ~1,000 px down at 390 | **An object page with sub-tabs.** The full hero (card and actions) shows only on the Wallet tab. Below 1024, Activity and Sale get a **compact header** (a 40×25 card thumb, "Satchel #3" as the h1, the state pill) above the tabs. From 1024, one **object column** (the card plus the page's main block) sits left on every tab. On Buy at 390, the price block and the verdict fill the first 400 px, and a **pinned buy bar** carries the gate line and **Buy for {price}** |
| 2 | Status shows 3–4×, signatures 3×, each address 3×, freshness 3×, the price 4×, and there are three Delist controls | **Each fact once** (§1.3). Addresses appear only in the Inside rows (full and grouped). There is one freshness line and one Stop selling per page. The OwnerPill, StatsStrip, FreezeBanner and meta-chip row are gone |
| 3 | My Satchels is a grid bolted onto the marketing landing | **New route `/satchels`** (allowed by R4): My Satchels, money waiting for you, and an empty state with one Mint. `/` stays purely marketing (D-42). The landing header shows **Connect NEAR wallet** when signed out and **My Satchels** (→ `/satchels`) plus the avatar when connected |
| 4 | The card hero reads "2 chains / Balances below" on every card | **A charm ledger** (`proto/CARD-HERO.md`, accepted): one line per chain with its charm, the native amount and the ticker |
| 5 | The stitch meant "you own this" | The lemon **Yours** sticker after the name, tilted −4° (R1 #3). It doesn't appear on the My Satchels grid, where every card is yours |
| 6 | Failed trackers still say "Sending… keep this tab open". Cancels are red. Guards are lone banners in a "1 of 3" sheet. Every toast has the same icon | Terminal states **replace the tracker heading** with the outcome and drop "keep this tab open". Your own wallet cancel is **neutral** (ink and `undo-2`). A guard is a **centred state** in a sheet sized to its content, with no step counter. Toasts carry their state icon and sit **above any pinned bar** |
| 7 | Sell's USDC registration has no action. Zero rows' "Fund" link never renders. Mint always closes to `/` | The currency defaults to **NEAR**; picking USDC shows an inline **Register** row. Zero rows get **Add coins**. Mint closes to **the page it was opened from** (`?from=`). Give's Done goes to `/satchels` and View goes to the Satchel |
| 8 | Send's chain picker clips at 390. Addresses break mid-group. The hand-off moves 58 px and the names collide. Targets are 24 px | The chain picker shows **charm + ticker only** (the balance moves under the amount). Addresses wrap only **between** 4-character groups. The hand-off card is 208 px below 480, so it travels 112 px at 360 and 142 px at 390 (200 px in the dialog), and each name gets its own column. Every control is ≥ 44 px |

## 1. Shared rules for every app screen
### 1.1 Shell (`proto/shell.html` and `design-spec.md`, the lead's; my pages mirror it through `tools/app-sync.mjs`, which is not in the repo)
- **The top bar (below 1024):**
  - lockup, Testnet badge, then a Connect or account control and the Menu sheet button;
  - the account shows as its avatar (`account--icon`);
  - below 420 the Testnet badge steps aside while Connect or a pending pill shows (it stays in the menu sheet and the footer);
  - while a pending pill shows below 480, the lockup collapses to its tile.
- **The side nav (from 1024):** **My Satchels** (`/satchels`), **Market**, **Mint** and **Contract facts**, then the account (or
  Connect), the theme control and the testnet note. On `/s/[id]`, My Satchels is current only if you own that Satchel.
- **One connect label: "Connect NEAR wallet"** (`nav.connect`, `buy.connect`, `mint.connect` and the guards). Below 480 it reads
  "Connect" and keeps the full accessible name.
- The PendingIndicator, the role strip and the "Sample data" strip are shell-level (§11.6).
- Tab titles always end in "· Satchel", e.g. "Activity · Satchel #1 · Satchel".

### 1.2 Page templates
- **Object page** (`/s/[id]` and its tabs, `.obj`):
  - DOM order: head (h1 + tabs) → object column (card + main block) → tab content;
  - from 1024: a grid `minmax(320px,400px) | 1fr`, the column sticky at top 40;
  - on sub-tabs below 1024, the compact header replaces the card, and the owner's actions stay desktop-only.
- **Flow sheet** (Send, Give, Add coins, Sell and Mint), the FlowShell:
  - the sheet **fits its content** (max `100dvh − 16px`) but keeps a stable `min-height` across a flow's steps, so its top
    edge never jumps (MOTION-NOTES); guards are their own short sheet;
  - the step counter appears only on input steps ("Step 1 of 2 · Amount and recipient");
  - the primary is pinned in the sheet foot; a second action stacks **under** it.
- **List page** (`/satchels`, `/market`): a head row (h1, count, at most one action), then a card grid of 1 column, 2 from 768 and
  3 from 1280.

### 1.3 Each fact once (the `/s/[id]` map)
| Fact | Its one home | Deliberate summary |
|---|---|---|
| Holdings | the card's charm ledger | the Inside rows (the amount beside each address); Buy's "You get" |
| Addresses | **Inside** rows: full, grouped, `data-full-address` | the Verify disclosure (paths only, closed) |
| Status | the card pill | the Facts row `data-fact=status` (the judge's summary) |
| Owner | the Facts row (plus the Yours sticker for the owner) | — |
| Signature count | the Facts row (with the last signature) | Buy: the signature strip ("1 of 1 can't move coins") |
| Price | the offer block | the Buy button's label |
| Verdict (Buy) | the verdict block (the browser check) | the gate line above Buy (`aria-describedby`) |
| Freshness | one line under Inside (`facts.source`) | — |

**One `[data-judge-facts]` element wraps the whole `<article>` on `/s/[id]`.** So `judge.spec` still finds the owner, status,
signature count, keys, code hash and all three full addresses inside it, none of them hidden. While the SOL UI is off,
the Solana address is the last Facts row.

### 1.4 Feedback rules
- **Toasts:**
  - ≤ 5 words; the icon carries the state: `circle-check` for success, `loader-circle` while still working (frozen),
    `undo-2` for "Stopped selling" or "You cancelled";
  - never for errors that need reading;
  - they sit bottom-centre, offset by any pinned bar (APP-COMPONENTS proposal 1);
  - a flow that ends on its own success screen (Give, Buy, Mint) fires its toast only if the user leaves it first. The
    status region always announces.
- **Inline errors:** under the control, `danger` + `triangle-alert`, `role="alert"`. They always say what moved and what
  didn't (`errorCopy`).
- **Your own cancel is not an error.** `sign.cancelled`, `xfer.cancelled`, `sell.cancelled` and `mint.cancelled` render as a
  neutral note under the button, and the button returns to its idle label.
- **A disabled primary always shows its reason under it.** Examples: "Enter an amount and an Ethereum Sepolia address." (NEW
  `send.form.reviewWhy`) and "Tick I checked this address to send." (NEW `send.review.ackFirst`).

### 1.5 Server vs client (judge-first)
- **Blocking SSR, with no Suspense above any fact,** on `/s/[id]` (all tabs), `/market`, `/contract` and not-found.
- **Client-only:** the wallet, the owner upgrade (`useViewer`), intents, the browser clean check, live polls, `/satchels` data and
  flow steps after the first paint.
- **Skeletons** appear only for client-only data.

## 2. App home `/satchels` (NEW route) · `app-misc.html` states `satchels*`
**Purpose:** a connected owner's home: what I own, money waiting for me, and mint another. **Audience:** owners.
- **390:** h1 "My Satchels" + `home.list.count` "6 Satchels" + **Mint a Satchel** (secondary) → the escrow banner, if any →
  one column of `lg` cards (`a.card-link`). Under listed cards:
  - "For sale at 5.00 USDC" (NEW `home.list.forSale`);
  - **#4**, in danger: "For sale at 2 NEAR, but 1 signature could still move coins, so nobody can buy it yet." (NEW
    `home.list.blocked`).
- **1280:** the same head row, then 3 columns. There's no Yours sticker here (`data-owned` stays true).
- **Escrow** (the `EscrowPanel`, moved here from the landing): a `banner` with `landmark` reading "1 NEAR is waiting for you." + why + **Withdraw** (the
  page's primary). Unregistered USDC first shows **Register for USDC (0.00125 NEAR)**.
- **States:**
  - **loading:** 2 static card skeletons;
  - **error:** `home.error` + **Try again**;
  - **empty:** the charm S on sky, `home.empty.*`, **Mint a Satchel** (primary) and the link "Look inside Satchel #1";
  - **signed out:** the charms on a strap on sky; NEW `home.signedOut.title` "Your Satchels live in your NEAR wallet" and
    `.body` "Connect it to see the Satchels it owns."; **Connect NEAR wallet** (primary); the same link.
- **Server/client:** SSR renders the signed-out frame until the wallet state is known. There are no judge facts here.

## 3. The Satchel page `/s/[id]` (Wallet tab) · `app-satchel.html`
**Purpose:**
- the owner comes to **check what's inside and act on it**;
- a visitor or judge comes to **see that this NFT is a wallet** and verify it;
- a buyer comes to **see the offer**.

### 3.1 Owner: states `owner`, `owner-zero`, `owner-signing`, `owner-attention`, `owner-listed`, `sol-flag`
- **390, top to bottom:**
  - h1 `page.ownerH1` "Satchel #1";
  - the tabs **Wallet · Activity · Sell**;
  - the attention banner, if any;
  - the **card lg** (Yours sticker, ledger, pill);
  - the for-sale panel, if listed;
  - **actions** (`data-testid=action-row`): a 2×2 grid of 52 px buttons;
  - the reason line;
  - **Inside** (NEW `page.inside` "Inside");
  - the freshness line;
  - **Facts**;
  - **Verify these addresses** (closed).
- **1280:** the object column holds the attention banner, card, for-sale panel, actions and reason; the right column holds h1, tabs,
  Inside, Facts and Verify.
- **Actions:** **Send** (primary) · **Add coins** · **Give** · **Sell**.
  - **All zero:** Send is `aria-disabled` with the reason "Nothing to send yet. Add coins first."; **Add coins becomes the primary**.
  - **Listed:** Send and Give are disabled, and Sell becomes **Stop selling** (secondary, `undo-2`, `data-testid=delist`; the
    page's only one), with the reason `page.actions.paused`. There is no coral on the page.
  - **Needs attention:** **Broadcast again** in the banner is the primary, and Send turns secondary.
- **For-sale panel** (`id="freeze"`; the FreezeBanner and the ListedPanel merge into it):
  - title `tag` "For sale at 1 NEAR";
  - "Listing #5 · listed 22 min ago. Anyone can buy it right away.";
  - NEW `page.forSale.buyers` "Buyers see: Clean history, checked 8 s ago." (the owner's browser runs the same check;
    fixes inventory 6b);
  - "See the listing".
- **Attention banner:** `banner--danger` with `sign.notSent.title`, `.body` and `.explain`, plus **Broadcast again** and "Details". The
  nonce-gap variant shows `sign.notSent.gap` and no button.
- **Signing:** the card pill reads "Signing" (spinner), and the PendingIndicator ("Sending 0.0010 ETH · 0:14") links to the
  tracker. Nothing else repeats it.
- **Inside row** (`data-chain-row`, `data-balance`):
  - a 32 px charm, the network, the amount;
  - the **full grouped address** (`data-full-address`; first two groups and the last in ink 600);
  - tools: **Copy** (morphs to "Copied" for 1.5 s), **QR** (→ receive) and the named explorer link.
  - A zero row puts **Add coins** first. Unavailable shows `wallet.unavailable` + **Retry**.
- **Facts** (one `dl`):
  - Owner · Status · Signatures ("2 · last one Oct 20, 02:40 UTC (block 274,240,000)");
  - Token ("#1 · NEP-171 · NEAR testnet", which replaces the chip row) · Contract · Contract keys (→ `/contract`);
  - Code hash (in 8-character groups) "(matches the published build)";
  - **Solana devnet** with its full address and `facts.solNote` (with the SOL flag on, it becomes an Inside row instead).
- **Status and signatures follow the live snapshot,** like the card. This fixes the two sources of truth (inventory 5.1.3).

### 3.2 Visitor: states `visitor`, `visitor-listed`, `seller-sold`, `unavailable`
- **390:**
  - h1 `page.visitorH1` "This NFT is a wallet." + `page.visitorSub`;
  - the tabs **Wallet · Activity** (+ **Buy** while listed);
  - the card lg (no sticker);
  - **Inside**, with **Add coins** in its header (anyone can add coins);
  - the freshness line, **Facts**, **Verify** and **How it works** (`how.*`, visitors only).
- **1280:** the object column holds the card and a panel with `wallet.fundcard.title` "Add coins to this Satchel" + `.body`,
  **Add coins** and the link NEW `page.mintOwn` "Mint your own Satchel" (this fills the empty left column).
- **Listed** (`visitor-listed`):
  - the **offer block** (`.offer--overview`): the "For sale" eyebrow, the price (`text-balance-hero-sm`) and
    `buy.listing` "Listing #3 · listed 4 min ago by alice.satchelhq.testnet";
  - **Buy** (primary, `arrow-right`, → `/s/3/sale`);
  - NEW `buy.checkNote` "Your browser checks its history before you buy.";
  - **Below 1024, only its pinned bar shows:** "5.00 USDC / Listing #3" + **Buy**, with the note under it.
- **Seller after a sale:** the visitor layout, the card pill **Sold**, the third tab **Sold**, and a card note "You sold it to carol… See the
  receipt".
- **Unavailable:** rows show `wallet.unavailable` + **Retry**; the card shows "— BTC"; the addresses still render.
- **Server/client:** SSR renders the visitor view; the client upgrades the h1, the sticker and the actions.

## 4. Activity `/s/[id]/activity` · `app-activity.html`
**Purpose:** the record: every NEAR event and every signature, newest first. **Audience:** the owner, a judge, a buyer.
- **390:**
  - the compact header + tabs;
  - **In progress** (client): "Sending to 0x53f9…1c2a · Signing with NEAR's signer network · 0:14" (→ the tracker); a
    signed-not-sent row with **Broadcast now**;
  - the day groups (`act.today`, `act.yesterday`, or "Oct 19");
  - **Show older** (`act.more`, `?before=`, works without JS);
  - `act.footer`.
- **1280:** the object column (card + owner actions) beside the list.
- **Row** (`<details>`):
  - **lead:** a 32 px charm with a 20 px state badge (chain events), or the card thumb (NEAR events);
  - **title:** `act.row.*`;
  - **meta:** "Bitcoin testnet4 · 02:40 UTC";
  - **trail:** the amount, plus a pill only when the row isn't final (`Unused`, `Signing`, `In mempool`);
  - a **chevron** that turns when open.
  - **Expanded:** a receipt (Date · Status · Fee "282 sats" · To with the full address · Links: "View on NearBlocks", "View on
    mempool.space"). An unused signature shows "Would send 0.0020 ETH to 0x8b2f…f741 (nonce 1)".
- **States:**
  - **empty:** the charm S, `act.empty.*`, **Add coins** for the owner;
  - **partial:** a `banner` with `act.partial` + "Check NearBlocks";
  - **error:** a `banner` + **Try again**.
- **Server/client:** SSR renders the first page. The In progress group is a client island.

## 5. Sale `/s/[id]/sale` · `app-sale.html`
### 5.1 Buy (visitor, listed): states `buy-*`
**Purpose:** decide in 10 seconds what it costs, whether its history is clean and what I get, then Buy.
- **390:**
  - the compact header + tabs (**Buy**);
  - **the offer block** (`data-testid=buy-block`): its `dl` (`data-testid=listing-facts`, `data-judge-facts`) holds the price, "Listing #3
    · listed 4 min ago by alice.satchelhq.testnet" and, **in SSR only**, the hint row "Server check 2 min ago: clean"
    (`data-hint-aggregate`; it is removed once the browser check reports); then "Paid in USDC." + **Get testnet USDC**;
  - **the verdict** (`#clean-history`);
  - `.freeze-line`: **Paused while it's for sale.** + `freeze.buyer`;
  - **You get:** charm rows, then "Its addresses come with it. Unconfirmed deposits never count.";
  - **The record** (NEW `clean.recordTitle` "The record" and `.recordLead` "Every signature this Satchel has made, each checked
    on its own chain."): the checks, the grouped signature items, the sources and "How Satchel checks this";
  - **How buying works**;
  - **the pinned buy bar:** the gate line + **Buy for 5.00 USDC** (`data-testid=buy`, `aria-describedby` = the gate).
- **1280:** the object column holds the card and the offer block, with the gate and Buy inline (no pinned bar).
- **The verdict block:**
  - a 52 px state tile, the eyebrow "Clean history", the `clean.verdict.*` lines;
  - the **signature strip**: one marker per past signature (`check`, `triangle-alert`, `hourglass`, `loader-circle`, `circle-question-mark`; 12 markers max, then "+n"), with a label such as "1 of 1 can't move coins";
  - "Checked in your browser 8 s ago" and `clean.trust`; the `oneOfTwo` chip when only one provider answered.
- **States (the gate line, then the button):**
  - **hint (no JS):** `buy.gate.waiting`, disabled; the verdict reads "Waiting for your browser's check / The server checked 2 min ago
    and found it clean. Buy turns on only after your browser checks it too." (NEW `clean.hintBody`);
  - **checking:** disabled;
  - **clean / empty:** **enabled**;
  - **confirming / blocked (#4) / unknown (with Check again) / unsafe:** disabled. The blocked verdict links **See the signature**
    to the unused item;
  - **signed out:** the button reads **Connect NEAR wallet** and is enabled **only if** the verdict allows buying (fixes 6d). When it
    doesn't, the button stays "Buy for 2 NEAR", disabled;
  - **recheck** "Re-checking history…", **wallet** "Approve in your wallet…" + `walletHint`: both `aria-busy`;
  - **changed:** a `banner` with `buy.changed` / `buy.delisted` + **Review new listing** (primary) + **Cancel**, in place of the
    offer;
  - **refunded:** a `banner` with `buy.refunded`, and the button is back to idle;
  - **done** (`data-testid=buy-done`): the object grid gives way to one centred column:
    - the **reverse hand-off** (§7.3: alice is the seller, "You" is carol);
    - h1 `buy.done` "Satchel #3 is yours." (focused, announced) + `buy.doneBody`;
    - the receipt (Price · Seller · Listing · Transaction);
    - **Open your Satchel**.
- **Not for sale:** an `.empty` with `buy.notForSale` + **See Satchels for sale** + **Look inside**.

### 5.2 Owner's Sell tab: states `owner-waiting`, `owner-ready`, `owner-listed`
- **Not listed:**
  - a `.sale-panel` with "Not for sale.";
  - the quiet line `sell.quiet.wait` with a 250-block bar, or `sell.tab.ready`;
  - NEW `sell.quiet.why` "A Satchel can be listed after 250 blocks (about 2 min 20 s) without a signature. Then anyone can buy it
    right away.";
  - **List for sale…** (primary, `list-for-sale`).
- **For sale** (`listed-panel`): `sell.panel`, `sell.delistNote`, `sell.reprice` and **Stop selling** (secondary, `delist`; it narrates
  "Approve in your wallet…" → `sell.delisting`).
- **Every owner state** then shows **What buyers see** (NEW `sell.buyersSee` + "A buyer's browser runs this same check before Buy
  turns on."): the verdict and the record, from the owner's browser.

### 5.3 The Sell flow `?list=1` (a sheet over the Sell tab): states `sell-*`
- The title is `sell.title`; there is no step counter (one step).
- **Before you list:** checklist rows with a state icon each:
  - **Quiet period:** `circle-check`, or `hourglass` + the bar;
  - **Past signatures** (advisory): `sell.history.*` + "How to clear it";
  - **USDC payouts**, only when USDC is picked: "Not set up on your account yet" + **Register · 0.00125 NEAR**, which fixes the
    dead end.
- **Price:**
  - the `seg` **NEAR | USDC**, NEAR first and the default (the landing promise, H-26);
  - an `.amount` field (`data-testid=price`);
  - `sell.form.buyerGets`.
- **Rows:** Price · Satchel fee none · Listing deposit · **You receive** (bold) · `sell.form.paid`. Then **While it's for sale**: four
  icon rows (`sell.while.rows`).
- **Pinned:**
  - **List for 2 NEAR** (`list-cta`), disabled until the quiet period is over and the price is above 0 (and USDC is registered);
  - its reason sits under it: the quiet line, or "Register for USDC payouts first, or pick NEAR.";
  - the warning tier shows `sell.history.warn`;
  - wallet → `sell.listing`;
  - success closes the sheet to `/s/5`, with the toast "Listed for 2 NEAR";
  - a cancel is neutral.

### 5.4 Sold (the seller after a sale): states `sold-*`
- The compact header h1 "Satchel #3" with the pill Sold; the tabs (**Sold** `aria-current`).
- **The seller's hand-off end frame** in the object column (§7.3: "You" → carol, the card under carol with the Sold pill).
  The swing plays once per device per sale (a `localStorage` key); after that, this frame.
- The `sold-receipt` (`data-payout`):
  - **h2** `sell.sold.title`;
  - the payout line (`arrived` / `paying`);
  - the escrow banner when money is owed (**Withdraw**, or Register for USDC first);
  - the receipt `dl` (`sold-rows`, with `sold-paid`).

## 6. Send `/s/[id]/send?chain=` · `app-send.html`
**Purpose:** move native coins out, knowing exactly what happens and how long it takes. **Audience:** the owner.
- **Step 1 of 2 · Amount and recipient** (`send.title`):
  - `.chainpick` (charm + ticker; SOL only with `SOL_SEND_ENABLED`, marked as flagged);
  - `.amount--hero` (the ticker **right after** the number); `send.form.available` + **Max**;
  - **To** (mono, with an inline **Paste**) → the `.resolved` card (charm, full grouped address, "Ethereum Sepolia address", the
    warning tier, **Clear**);
  - the fee line;
  - **Review** pinned, with its reason while disabled. Errors sit under their field (mainnet BTC, more than it holds).
- **Step 2 of 2 · Review:**
  - the amount head "0.0010 ETH / to 0x53f9…1c2a · Ethereum Sepolia";
  - **From** (thumb, "Satchel #1", −0.001021 ETH, "amount + fee") and **To** (charm, +0.0010 ETH, the full address);
  - rows: Network fee · Satchel #1 after · NEAR fee ("≈ 0.004 NEAR per signature" when there are several inputs);
  - the **time chip**; the ack checkbox (44 px);
  - "About the NEAR fee" (`nearTip`, a disclosure rather than a tooltip);
  - pinned: the **finality line** (`send.review.final.*`) → **Send 0.0010 ETH** (`send`, aria `ctaAria`) → `helper`.
  - BTC adds "~282 sats" and `send.review.inputs`.
- **Approve:** inputs lock; the button reads "Approve in your wallet…" (busy) + `walletHint`. **Cancelled:** a neutral note, and Review stays.
- **The tracker** (no counter; ✕ becomes **Minimize**):
  - the heading `sign.title` + "to …";
  - the **ETA line**: 0–19 s `sign.mpc[0]` (shown at 0:15), 20 s `[20]`, 60 s `[60]`, 150 s `[150]`;
  - 4 rows, the signing row with an `m:ss` timer;
  - `sign.keepOpen` + `sign.credit`.
- **Sent / Confirmed:**
  - a success heading;
  - rows 1–3 with times and links; row 4 "Waiting for 1 confirmation · About 12 seconds" → "Confirmed";
  - `sign.closeOk`;
  - **Done** + **View activity**, stacked.
- **The outcome replaces the heading** (`.outcome`; no "keep this tab open"); the tracker stays under it as the record:
  - **Not signed** (`sign.timeout.*` + the retry line; **Try again** + Close);
  - **Signed, not sent** (**Broadcast again**; the nonce gap shows `gap` and only Close);
  - **Still waiting for NEAR** (**Check again** + NearBlocks; never "failed");
  - **Expired** (SOL);
  - **Not sent** (`errorCopy`).
- **Guards** (`.guard`: icon tile, heading, body, one action; the sheet fits it):
  - connect: `send.guard.connect*` + **Connect NEAR wallet**;
  - not owner: + Close;
  - listed: "Paused for sale" + **Go to the sale**;
  - zero: NEW "Nothing to send yet" + `send.guard.zero` + **Add coins**;
  - **unsent:** one card (`sign.notSent.title` + `send.guard.unsent` + the reason + Details) and NEW `send.guard.replaceNote` "Replace
    builds a new send with the same coins, so only one of the two can ever go through." (EVM: "…with nonce 1…"), then
    **Broadcast again** + **Replace**.
- **Minimized:** the toast "Still signing" (spinner); the pending pill (390) or the pending card (1280).

## 7. Give `/s/[id]/transfer` · `app-give.html`
**Purpose:** hand the whole wallet to a friend, sure of the account and of what goes with it.
- **Step 1 of 2 · Who gets it** (`xfer.title`):
  - the card md (what you're giving);
  - `xfer.to` + `xfer.placeholder`, with the help line NEW "The account must exist on NEAR testnet.";
  - a live status line: checking (spinner) · `xfer.err.*` · the `recipient-card` (avatar, account, `xfer.found`) · `xfer.implicit`;
  - **Review**.
- **Step 2 of 2 · Review gift** (`xfer.reviewTitle`):
  - the card wears a **gift tag** on a string (NEW `xfer.tag` "To bob.satchelhq.testnet");
  - three consequence rows (`xfer.rows.them` with the holdings, `.you`, `.history`);
  - the D-08 soft guard (`xfer.soft`, neutral);
  - `xfer.final` as the finality line → **Give it to bob.satchelhq.testnet** (`xfer-cta`; long accounts middle-truncate, with the full
    name in `aria-label`).
  - There is **no clean-history line** (gifts aren't checked).
- **In flight:** the card lifts; "Approve in your wallet…" → "Giving…"; the `xfer.steps` tracker.
- **Done** (`handoff`, only after `nft_token` confirms the new owner): see §7.3. Then the pill **Given**, `xfer.done` (focused,
  `handoff-sentence`) and the receipt. **Done** (→ `/satchels`) + **View Satchel #1**, stacked.
- **Errors and guards:** as in §6 (`xfer.cancelled` is neutral; `xfer.blockedListed` leads to the sale).

### 7.3 The hand-off stage (for the motion designer; `.hook`)
- **The ends:** two columns, From and To, each with a role line plus avatar and name (ellipsized, never colliding).
- **The strap:** an ink bar (`sticker-line` in Night).
- **The card:** 208 px wide below 480, 240 from 480. It hangs on a stem under the giver, swings 10° and slides along the strap.
  It lands under the receiver, and a dashed ghost marks where it was.
- **The buyer's version:** the reverse (the seller is on the left, "You" on the right), and the **Yours** sticker sticks on.
- **For the motion** (`motion-spec.md`, `MOTION-NOTES.md`):
  - `--swing-room: 12px` keeps the arrival swing inside the sheet;
  - the card's pill is a stack (Active → Given; Paused for sale → Bought or Sold);
  - the giver's Yours peels off (`data-peel`) and the buyer's sticks on (`data-stick`);
  - CTAs whose label changes stack every label in one cell (`.m-morph`), so they never resize;
  - sparkles (`assets/sparkle.svg`) appear only on these end frames and the first mint.
- **Reduced motion:** the end frame cross-fades in.

## 8. Add coins `/s/[id]/receive?chain=` · `app-receive.html`
**Purpose:** get this Satchel's address onto another wallet's screen, safely. **Audience:** anyone.
- **The sheet:**
  - `fund.title`;
  - the chain `seg` as **links** (`aria-current`): Bitcoin, Ethereum, + **Solana** (SOL flag);
  - **the QR card**: a coral band ("Satchel #1" + the charm S), the network line with its charm, the white plate (220 px, ECC M),
    `fund.label`, then the full grouped address (`data-full-address`);
  - icon notes (`fund.only`, `fund.time`, `fund.anyone`) and the faucet link;
  - **Incoming** (`aria-live`): "Waiting for coins…" + NEW "This updates by itself. You can close this sheet." → "+0.0010 BTC · in
    mempool" + NEW "It counts once it has 1 confirmation." → "Received 0.0010 BTC" + NEW "Satchel #1 now holds 0.00289718 BTC."
    (the coin sticks on).
- **Pinned:** **Copy address** (primary; it morphs to "Copied") + **Share** (only where `navigator.share` exists).
- **Server/client:** the address, the QR and the notes are SSR; Incoming is a client island.

## 9. Market `/market` · `app-market.html`
**Purpose:** find a Satchel to buy, and see honestly which ones can be bought now.
- **The head:** h1 "Market" + NEW `market.lead` "3 for sale. Your browser checks each one's history before you can buy."
- **Items** (`.mkt`, one link each, `data-market-item`):
  - the card md (the pill Paused for sale; Yours on your own);
  - the price · "Listing #3 · 1 signature";
  - the server hint line (`data-gate`; NEW `clean.hintWord`: "clean", "never signed", "confirming", "needs attention", "can't
    verify", "unsafe").
  - The accessible name is "Satchel #3, 5.00 USDC, server check 2 min ago: clean".
  - Buyable items come first and blocked ones last.
  - There are no filters at three listings; Sort (Newest | Price) is P2.
- **States:** empty (the charm S, `market.empty`, NEW "Mint your own, fill it with testnet coins, and list it when you're
  ready.", **Mint a Satchel**) · error (`market.error` + **Try again**). **Server:** blocking SSR.

## 10. Mint `/mint` · `app-mint.html`
**Purpose:** get a Satchel, and see exactly what you get and what it costs. The verb stays **Mint**.
- **Ready:**
  - the preview card md: "New Satchel", the **New** sticker, rows "Bitcoin address" and "Ethereum address" (`.card__label`), no pill;
  - **You get** (`mint.get`, four `circle-check` rows);
  - Deposit `mint.depositValue`;
  - **Mint a Satchel** (`mint-cta`), or **Connect NEAR wallet** + "Use a NEAR testnet wallet such as Meteor or Intear.".
- **Minting:** the `mint.steps` tracker.
- **Done:**
  - **first mint only,** the chain charms hang on a strap above the new card and swing once;
  - "Satchel #8", with Yours sticking on;
  - `mint.done` (`mint-done`) + `mint.mintedIn`;
  - **Add coins** + **Open Satchel #8**, stacked.
- **Errors:** a neutral `mint.cancelled` · E6 inline with "Get testnet NEAR".
- **Close:** returns to `?from=` (default `/satchels` when connected, `/` when not).

## 11. Contract, not found, account and feedback · `app-misc.html`
1. **`/contract`** (a judge page, SSR):
   - `contract.h1` + `contract.sub`;
   - the **Keyless since birth.** badge (`lock`, `keyless`);
   - the facts `dl`: the **Birth tx is now an explorer link**, and Expected carries a success "Matches" pill;
   - the Config disclosure;
   - **Verify it yourself**: each command says what it proves (NEW `contract.cmd.*`, e.g. "It has never signed a transaction") and has a labelled 44 px **Copy**;
   - the read line.
   - The dev variant adds `devH1` + `devSub` and shows the keys in danger.
2. **Not found** (one shell): the charm S, h1 `page.notfound.generic`, `.body`, **Mint a Satchel** + **Go to My Satchels**.
3. **The account control:**
   - Connect, then "Connecting…" (busy), then connected (the avatar in the top bar; the account pill in the side nav);
   - the menu (a sheet below 768, a popover from 768): the **full account ID**, Copy · View on NearBlocks · Theme · Disconnect.
   - In fixture mode the "fixture" word becomes the **Sample data** strip.
4. **The wallet picker** (R7, **only if the library allows it**): NEW `connect.*`:
   - "Connect a NEAR wallet" and "Satchel runs on NEAR testnet. Pick a wallet that holds a testnet account.";
   - wallet rows from `availableWallets` (with a Recent chip);
   - "New to NEAR? Create a testnet account".
5. **Toasts and banners:** see the `feedback` state (RPC down + Retry, offline, owner changed, the Sample data strip, and the pending
   pill states).

## 12. Tests and strings this design changes (for the orchestrator's decision log)
- **`judge.spec`:**
  - the card text pins "0.00189718 BTC" and "0.048979 ETH", instead of "2 chains" and "BTC 0.00189718";
  - `[data-stitch]` becomes `[data-yours]`;
  - `[data-judge-facts]` is still exactly one element per page.
- **`flows.spec`:**
  - `#freeze` now holds "For sale at 1 NEAR", and the "paused" words live in the action row's reason;
  - `owner-pill` is removed (assert `[data-yours]` and the Facts owner instead);
  - the handoff counts `[data-yours]`;
  - the Sell test fills NEAR (default), so it reads "List for 5 NEAR";
  - flows that end on a success screen no longer assert a toast while that screen is open.
- **Unit `config-copy-theme`:** `copy.nav.connect` becomes "Connect NEAR wallet"; check that "QR" (the tool label) is on the
  all-caps allowlist.
- **My Satchels moves to `/satchels`:** the `sale-sol.spec` escrow check visits `/satchels`. Mint's close target changes.
- **NEW strings, listed above:** `page.inside`, `page.forSale.buyers`, `page.mintOwn`, `buy.checkNote`, `clean.hintBody`,
  `clean.hintWord.*`, `clean.recordTitle/recordLead`, `sell.quiet.why`, `sell.buyersSee`, `send.form.reviewWhy`,
  `send.review.ackFirst`, `send.guard.replaceNote`, `xfer.tag`, `home.list.forSale/blocked`, `home.signedOut.*`, `market.lead`,
  `contract.keyless`, `contract.cmd.*`, `connect.*`, and the Incoming and Give help lines.

## 13. Open questions
1. **Tabs under the h1, above the card, on the Wallet tab** (one place on every tab), or below the actions as today? I
   recommend the top: Activity and Buy are then one tap away, and all three tabs share the same header.
2. **Running the clean check on the owner's pages** ("Buyers see…") costs a provider read per visit. I recommend running it only
   while the Satchel is listed, and on the Sell tab.
3. **"You have 12.40 USDC" under Buy** (kb/80's balance line) needs an FT or NEAR balance read. Build it only if it's cheap; the
   design works without it.
