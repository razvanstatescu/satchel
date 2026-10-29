# UX references: wallet core flows (area `ux-wallet`)
> Design-reference team · Checked: 2026-10-21 · Source: Mobbin through the `mcp__claude_ai_Mobbin__*` tools, 30 searches (28 screen searches, 2 flow searches; iOS and web).
> I read every pattern below off the returned screenshots. Links go to Mobbin pages. No image is stored in the repo.
> Input for the synthesizer, who merges it into `kb/80-ux-spec.md` and `kb/81-design-tokens.md`. This file changes nothing in `kb/`.

**Scope.** This file covers six areas:
- Home `/` (My Satchels).
- `/s/[id]` › Wallet tab (`ChainRow`, `AddressDisplay`, the pending indicator).
- `/s/[id]/receive`.
- `/s/[id]/send` (`ChainSelect`, `AmountInput`, `RecipientInput`, `ReviewCard`, `SigningProgress`, Sent, and the failure states including `signed_not_sent`).
- The Activity tab (`Timeline` and the row detail).
- The desktop layout of all of the above.

**Hard constraints honoured.** Where kb/90 and kb/80 disagree, kb/90 wins:
- Send and Receive are **full pages in v1**. On mobile the page is styled like a sheet. Modal routes are a design-lead option (H-19; kb/90 §8.1).
- **No USD anywhere** (kb/90 T7; prices were cut in rev 2). Every fiat-first reference below is adapted to a native-first amount.
- **Status pills:** Active · Signing · For sale · Sold (kb/90 §5.10, E-37).
- **SigningProgress** follows kb/90 §8.6–8.8 and E-07, E-08 and E-28:
  - the stages and the 15 / 20 / 60 / 150 s copy thresholds;
  - "Signing 3 inputs" with one timer;
  - `unknown` leads to **Check again**;
  - **no relay**, so recovery is "Broadcast now" / "Broadcast again".
- **BTC Sent copy:** "In mempool. Testnet4 confirmations are irregular: minutes to hours." (E-25).
- **Fee copy:** the NEAR fee line reads "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account", and the BTC fee is about 282 sats at 2 sat/vB (kb/90 §8.9).
- **Judge facts stay server-rendered.** The live islands proposed here (the incoming-deposit watcher and the pending pill) are client-only and never carry judge facts (kb/90 §8.1).

---

## 1. Summary: the 8 strongest patterns to adopt

1. **A native-first amount hero.**
   - Show one large number with a small ticker suffix. Put "Available {balance}" and a **Max** chip directly underneath, and one pinned primary button below that.
   - The best native-denominated example is [Solflare: amount](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151). [Family: send amount](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984) and [Cash App: send bitcoin](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332) use the same hierarchy.
   - Satchel drops their fiat line and keeps their hierarchy.
2. **Review as an exact outcome.**
   - Show a two-row "from → to" outcome card, label/value fee rows that say **who pays**, a **Time** row and a one-line irreversibility note. The button names the amount.
   - The sources are [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) (from/to card), [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) ("Network Fee Paid By"), [Coinbase](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539) ("Send time"), and [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) and [Family](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3) (irreversibility footer).
3. **A Wise-style tracker for SigningProgress that becomes the receipt.**
   - Finished steps are in the past tense with an absolute time. The current step is bold. Future steps are muted.
   - The sources are [Wise: in progress](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec), [Wise: complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095), [MoonPay](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de) and [Topper in Solflare](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f).
   - Use calm "keep this page open" copy until broadcast ([PandaDoc](https://mobbin.com/screens/6e7783c1-2ce2-4ba2-832d-bab89ec45f67)), then "You can close this page" ([MoonPay](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de)).
   - Give an honest BTC estimate the way [Coinbase Wallet](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) does ("est. about 30 minutes", then **Done**).
4. **Receive as one focused screen.** The order is:
   - a chain switch;
   - a large QR on a white plate inside an identity-coloured card ([Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247));
   - the full address in groups, with the first and last groups emphasised (Gemini web, [Kraken web](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868));
   - **Copy address** as the primary button;
   - icon-led info rows for "this network only" and the time to confirm ([Coinbase web](https://mobbin.com/screens/97dc93ce-f553-4425-9c11-6d68300c40cf), [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a));
   - a live "Incoming" block under the address ([Binance web: Recent Deposits](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1)).
5. **A recipient field that resolves, and validation in severity tiers.**
   - A pasted address collapses into a resolved row that shows the full address in mono ([Family: Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1), [Glow](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df)).
   - Red **errors** block. An example is "The receiving address is your own address" ([Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef)).
   - Amber **warnings** allow the send, but Review requires an acknowledgement checkbox ([Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4)).
   - When the recipient address belongs to another Satchel, name it.
6. **In-progress work is pinned and actionable.**
   - A header pill shows the pending item ([Uniswap: "Unwrap pending"](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978)).
   - An "In progress" group sits above the history ([Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Kraken web](https://mobbin.com/screens/bffa5cbf-0a7f-4a4d-9d86-58cbc4877bbb)).
   - The recovery action is inline ([Revolut: pending card with Remind / Cancel](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7)).
   - This is where `signed_not_sent` and **Broadcast now** live.
7. **Activity rows that read like sentences.**
   - Each row has an icon with an action badge, a verb and counterparty, a signed amount on the right (green only for incoming), and a status chip **only when the status isn't final**. A failed amount is struck through.
   - The sources are [Family](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b), [Coinbase Wallet](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) and [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3).
   - The detail view ends in a **named** explorer link ([Phantom: "View on Solscan"](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44)).
8. **Identity colour as each wallet's signature.**
   - Family colours each wallet tile ([Family: wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec)) and shows the destination wallet's colour in history ("Sent to Stash").
   - Apple Wallet stacks cards ([Apple Wallet](https://mobbin.com/screens/46812e0f-4c8d-40ce-8ad3-356b009761e0)).
   - For Satchel: show the alloy swatch or card wherever a Satchel appears (Home stack, "From Satchel #1" on Review, "Sent to Satchel #4" in Activity). Keep silver for every primary button (kb/81 Open question 3).

---

## 2. Per Satchel screen and component

### 2.1 Home `/`: My Satchels (changes kb/80 §Home `/`, §Wireframes "Desktop", §SatchelCard sizes)

**Best references**
- **[Family: Wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec)** (iOS).
  - Seen: a 2-column grid of square tiles. Each tile is filled with that wallet's identity colour (orange "Sam's", black "Stash" with a lock glyph). An avatar sits top-left, a "…" menu top-right, and the name and balance ("$18") bottom-left. The section header "Your Wallets" has "+" and import icons. A separate "Watching" section holds a watch-only wallet.
  - Why it's high quality: identity is colour plus name, never colour alone. The tiles are scannable, and add and import sit where the list lives.
- **[Apple Wallet: card stack](https://mobbin.com/screens/46812e0f-4c8d-40ce-8ad3-356b009761e0)** (iOS).
  - Seen: about 14 cards overlap, each showing only a ~36 pt top band. The band carries the issuer mark and, for stored-value cards, the balance ("Apple Cash $0.25"). A large "Wallet" title is left-aligned, and a "…" menu holds the secondary items.
  - Why: this is the canonical "cards as wallets" metaphor. It is dense without being a list, and each card's art does the identity work.
- **[Family web: wallets list](https://mobbin.com/screens/0e379621-140a-4dbb-9f5b-7e2b7a372dc8)** and **[Family web: row menu](https://mobbin.com/screens/0d16504e-cac4-4855-8290-415f3c1f110e)**.
  - Seen: a single bordered list card in a narrow centred column (about 450 px at desktop). Each row has an avatar, the name over a truncated address ("0x34E6…6255"), and on the right "$0.00" over "0.0 ETH".
  - The "…" menu holds Edit Wallet · Send · View Activity ↗ · Set as Default · Copy Address · Address QR Code · Remove · Export.
  - "+ New Wallet" sits below the list.
  - Why: a calm desktop shell, with the native amount as a second line and per-row actions behind an overflow menu.
- **[Solflare: wallet card hero](https://mobbin.com/screens/a3d0efac-4e63-409e-a55b-96ae6589e1ae)** (iOS, dark).
  - Seen: a textured dark card is the balance hero. It shows "MW Main Wallet" with copy and "⋮", an uppercase micro-label "BALANCE", and "$27.28" with lighter cents.
  - Five circular actions follow (Receive, Buy, Swap, Stake, Send), then the token list.
  - Why: this is the closest real analogue to a SatchelCard, a card-shaped wallet with a material texture and text on a calm plate.

Supporting:
- [Revolut Business: card rows with mini card thumbnails](https://mobbin.com/screens/8c24aa83-8c8a-4cfe-a4aa-d45f5f14be0c), the fallback list form.
- [Phantom: empty home "Welcome to Phantom"](https://mobbin.com/screens/60e4e522-950f-44d8-afde-059068ebe353). It has an illustration, one line ("Add cash or crypto to start trading") and a single full-width **Add Funds** button. A pill toast ("Funding submitted") appears at the top.

**Borrow**
- **Mobile (below 640 px): an Apple Wallet stack.**
  - One Satchel is shown as a full `lg` card (358 px).
  - With 2 or more, the cards overlap so each shows a **76 px band**. The last card shows in full.
  - Band content, in priority order:
    1. `SATCHEL № 0002` (engrave, on `--card-scrim`);
    2. the native summary in mono on `--card-glass` (`0.0123 BTC · 0.0500 ETH`);
    3. the status as a dot plus word.
  - Each band is a link to `/s/[id]`. There is no expand animation in v1: tapping navigates.
- **640 px and up: a Family-style grid of `md` cards.** Use 2 columns from `sm` and 3 from `lg`, as kb/80 already says. Put the native summary as a text line under each card, and on desktop give each card a "…" menu: Send · Fund · Copy addresses · View activity.
- **Empty state.** Follow the Phantom welcome structure: one visual (the Gunmetal mint placeholder card), one sentence, **one** primary button, **Mint a Satchel**, and a text link, **See Satchel #1**. The kb/80 `home.empty` copy stays.

**Satchel mapping:** this changes the kb/80 §Home `/` "List" row, which today reads "Grid of SatchelCard `md` (1 column below 640px…)". Accessibility of the stack:
- Each band link's accessible name is the card's sr-only summary ("Satchel #2. Holds 0.0123 BTC and 0.0500 ETH. Status: active.").
- The band height of 76 px meets the 44 px target size.
- DOM order matches visual order.
- No hidden part of a card is interactive.

### 2.2 Satchel page › Wallet tab: `ChainRow`, `AddressDisplay`, pending pill (changes kb/80 §Wallet tab, §ChainChip · ChainRow · AddressDisplay, §Satchel page layout)

**Best references**
- **[Phantom: token rows as cards](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca)** (iOS, dark).
  - Seen: each asset is its own rounded `surface` row. A 40 pt icon sits left, with the name (17 pt, medium) over the native amount ("0.00053 ETH", 15 pt, muted). The value and change are on the right.
  - Why: two lines per row with strict left/right alignment, readable at a glance on black.
- **[Cash App: Copy address sheet](https://mobbin.com/screens/70a0a9dd-ae5a-439b-8eb9-edeb81a696b3)**, and its **[copied state](https://mobbin.com/screens/46f6bd70-201f-4ed1-b6f6-97716e8422a5)**.
  - Seen: a sheet titled "Copy address" (≈ 28 pt bold) with a one-line purpose. Each row has a network icon, "Bitcoin address" and a truncated address ("bc1q0d…5pd7qf"). The trailing copy icon becomes a ✓ after copying.
  - A monospace footnote warns that other assets "will result in permanent loss of funds".
  - Why: the copy feedback lives in place on the row, and the warning is factual, not alarming.
- **[Rainbow: "Receive assets" card on an empty wallet](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a).**
  - Seen: when the wallet is empty, the home view shows a card titled "Receive assets" with the line "You can also long press your address above to copy it.", a tinted **Copy Address** button and a QR glyph.
  - Why: the empty state is itself the next action.
- **[Revolut: card details revealed in place](https://mobbin.com/screens/74f597f0-182b-4bd5-b5ed-497a7e6e4eb0).**
  - Seen: the card face shows "Card number" and "CVV" fields, each with its own copy icon. Below the card are a filled **Hide details** toggle and **Settings**. Copying shows the toast "Card number copied".
  - Why: the reveal is a labelled toggle under the card, not a hidden gesture, and every copy target is explicit.

Supporting:
- [Uniswap home](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978). It shows the address with a copy icon next to the wallet name, and an **"Unwrap pending" pill with a spinner, centred under the status bar**.
- [Wise: USD balance](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b). At zero balance the **Send** action stays visible but greyed.
- [Revolut: actionable pending card on home](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7), with inline **Remind** / **Cancel**.

**Borrow**
- **`ChainRow` anatomy** (kb/80 W1 is already close; this makes it concrete):
  - Line 1: a 32 px chain icon, the network label (`h3`), and on the right the balance (`amount`, tabular).
  - Line 2: the address (`mono` 13, truncated on mobile) with trailing **Copy** (the icon swaps to ✓ for 2 s, as in Cash App) and **QR** icon buttons (44 px targets on mobile), and on the right the explorer link text ("mempool.space ↗").
  - **Desktop (`lg`, 7-column content ≈ 680 px):** show the **full grouped address**. A 42-character `tb1q…` or `0x…` address at mono 13 is about 370 px, so it fits next to the balance and actions. That helps judges and defeats address poisoning.
- **All-zero state** (Rainbow).
  - When every chain is zero, show a **Fund this Satchel** card above the rows. It has a title, the `fund.*` one-liner, a metal **Copy Bitcoin address** button, a QR icon button, and "Get testnet BTC ↗".
  - If only one chain is zero, keep the kb/80 behaviour: "0 BTC" plus a **Fund** text button.
- **ActionBar** (Wise). **Send** stays visible and disabled, with a reason ("This Satchel has no BTC or ETH yet."), instead of disappearing.
- **The pending indicator becomes a pill** (Uniswap).
  - It is 36 px tall, centred under the TopBar, and reads "◌ Sending 0.0100 BTC · 0:42". Tapping it reopens the progress page. The spinner is static under reduced motion.
  - For `signed_not_sent` it becomes an **actionable card** at the top of the Wallet tab: "Signed, not sent" plus inline **Broadcast now**, as in Revolut's inline actions.
- **Card "Show addresses"** (Revolut; this is a cross-area note for the SatchelCard owner). Put a labelled toggle **below** the card ("Show addresses" / "Hide addresses", with `aria-pressed`), give a copy button to every address on the revealed face, and show the toast "Bitcoin address copied".

**Satchel mapping:**
- kb/80 §Wallet tab, rows "Row loaded" and "Zero": add the desktop full-address rule and the all-zero Fund card.
- kb/80 §Satchel page layout, row "Pending signature (this browser)": the mini-bar becomes the pill; `signed_not_sent` becomes the actionable card.
- kb/80 §ChainChip · ChainRow · AddressDisplay: the truncation rule (prefix + 4 … 4) is confirmed by every app seen. Family uses "0xb249····9768", Coinbase Wallet "bc1ql4…zah4wz". No change is needed there.

### 2.3 Receive / Fund `/s/[id]/receive` (changes kb/80 §Receive / Fund, `fund.*`, §Wireframes)

**Best references**
- **[Cash App: Receive USDC](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a)** (iOS).
  - Seen: ✕ / title / "?" at the top. A QR fills about 85 % of the width, with a chain mark in the centre, rounded finder patterns and dotted modules. The caption reads "Scan to pay $slmobbin in USDC", with a **network chip "Ethereum ⌄"** under it.
  - A **monospace** warning in small muted type reads: "Use this address for receiving USDC exclusively over the Ethereum payment network. Sending on an unsupported network will result in permanent loss of funds."
  - Two equal black pills, **Copy** and **Share**, are pinned at the bottom.
  - Why: one job per screen. The network is visible exactly where the risk is, and the warning tone is set by typography, not red.
- **[Gemini web: Receive BTC](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247)**.
  - Seen: a popover anchored to the action. The QR sits on a white rounded plate inside an **orange (chain-coloured) card**. Below, a black band shows the address in two lines with the **first characters ("bc1qq9") and the last ("9w2r") in bold** and the middle regular.
  - Why: a strong identity moment that stays scannable, plus anti-poisoning emphasis on exactly the characters people check.
- **[Kraken web: Deposit USDC](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868)**.
  - Seen: a dialog with the QR, the label "USDC deposit address", and the full address with its **ending repeated large ("0e79f0")**. Next come **Copy address** and "⋮".
  - Label/value rows follow: Network · Fee · Minimum deposit · **Required network confirmations 40** · **Processing time ~20 minutes**.
  - Then a callout, "Only deposit USDC from the Base network. Deposits of other assets or from other networks will be lost.", and **Done**.
  - Why: it sets the time expectation before the user leaves.
- **[Coinbase web: Receive ETH](https://mobbin.com/screens/97dc93ce-f553-4425-9c11-6d68300c40cf)**.
  - Seen: the dialog title is "Receive ETH · on the Base network". A brand-colour block holds the QR, then "Your address 0x4326…072129" with a copy button.
  - Three **icon-led info rows** follow:
    - "Extremely large deposits or high activity may cause delays";
    - "This address can only receive native ETH on the Base network…";
    - "Allow 24 sec for processing."
  - Why: each fact is one short line with its own glyph, so it reads quickly.

Supporting:
- [Solflare: dark receive](https://mobbin.com/screens/cab7112b-0cdb-4135-a50e-072424e0ab69): a white QR inside a dark card, "Main Wallet · CM28…kzrR", the caption "This address is for receiving Solana assets only.", and Copy | Share pinned.
- [Glow](https://mobbin.com/screens/f752cb3f-a0e8-4b95-94f4-08ccfef9d10c): the full address in muted mono, wrapped onto two lines.
- [Public: Receive BTC](https://mobbin.com/screens/f1d60453-f208-4d5b-8244-4a2c7d117fa7): "Show all" reveals the full address, and the guidance tells users to confirm the first and last 4 characters.
- [Binance web: deposit with "Recent Deposits"](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1), shown with the empty state "No recent deposit record."
- [Cash App: Select payment network](https://mobbin.com/screens/6500371c-ed3f-4434-aa50-ba4f76fb9eaa): each network row shows its own truncated address.

**Borrow and map** (the full page; on mobile it looks like a sheet):
```
┌──────────────────────────────────────┐
│ ✕   Fund Satchel #1                  │ 56 px top bar (sheet-styled page)
│ ( ₿ Bitcoin │ Ξ Ethereum )           │ ChainSelect (ToggleGroup) 44 px
│ ╭─ alloy-framed card ─────────────╮  │ identity moment (Gemini)
│ │  ┌──── white QR plate ───────┐  │  │ QR 240 px, quiet zone ≥ 4 modules
│ │  │            ▦              │  │  │ ECC M, no logo
│ │  └───────────────────────────┘  │  │
│ │  BITCOIN TESTNET4 ADDRESS       │  │ micro label (mono 12, UPPER)
│ │  tb1q 9x7k m2rd 4hzc … y8sd     │  │ full, grouped; first/last group --fg 600
│ ╰─────────────────────────────────╯  │
│ ⚠ Send only Bitcoin testnet4 coins   │ icon rows, small --fg-2 (Coinbase web)
│   to this address.                   │
│ ◷ Testnet4 confirmations are         │ time expectation per chain (Kraken web)
│   irregular: minutes to hours.       │
│ ⓘ Anyone can fund a Satchel. Only    │
│   its owner can send from it.        │
│ Get testnet BTC ↗                    │
│ INCOMING                             │ live block (Binance web "Recent deposits")
│ ◌ Waiting for a deposit…             │ → "+0.0010 BTC · in mempool" → "Received"
│ [  Copy address  ]  [ Share ]        │ pinned; Share only if navigator.share
└──────────────────────────────────────┘
```
- **Chain switch at the top, not a chip under the QR.** With 2–3 fixed chains, visible segments beat a dropdown. The `?chain=` route parameter preselects one.
- **QR on white** inside an alloy-framed card, or a neutral `--surface-2` card (Open question 3).
  - 240 px on mobile and 220 px on desktop. kb/80 says 200 px; Cash App and Solflare go larger, which scans better across a desk.
  - Plain address, no URI amount (as kb/80 says).
- **Full address** grouped in 4s. The first and last groups are in `--fg` weight 600 and the middle groups in `--fg-2` (Gemini web, Kraken web). Copying still yields the raw string (kb/81 §Typography rule).
- **Copy address** is the primary metal button. **Share** is secondary and appears only when the Web Share API exists.
- **Live "Incoming" block** (client island; the SSR page still carries the addresses). It uses data the app already polls every 15 s:
  - BTC from mempool.space `mempool_stats` (unconfirmed), then `chain_stats`;
  - EVM and SOL from balance deltas.
  - It gives the demo and the judges the "fund it and watch it arrive" moment without leaving the page.
- **Desktop:** the same content in a centred 480 px column. If H-19 modals are chosen, use a dialog like Coinbase or Kraken web.

### 2.4 Send › `ChainSelect` + `AmountInput` (changes kb/80 §Send "Form", §AmountInput · RecipientInput · AccountInput, W2)

**Best references**
- **[Solflare: amount](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151)** (iOS, dark).
  - Seen: the header "Send to [wallet] 2XbE…CCyr". A centred hero "0.036" at about 56 pt, with "SOL" as a ≈ 14 pt suffix on the baseline, and the fiat value muted below. A balance chip "≡ 0.2235 SOL" sits next to a **Max** chip, then the keypad and a full-width **Continue**.
  - Why: the only best-in-class example whose hero is **native-denominated**, which is Satchel's case because there is no USD.
- **[Family: send amount](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984)** (iOS, dark).
  - Seen: "Send" with ✕. A recipient chip "To 0xb249····9768" at the top. A huge "0" (≈ 64 pt). An asset row "Ethereum · 0.006714 ETH" with an inline **Use Max** pill. The keypad, and a pinned **Continue** that is disabled at zero.
  - Why: the context (to whom, from which asset) sits in compact rows while the number dominates.
- **[Uniswap: send](https://mobbin.com/screens/04498eb3-2576-4233-95ca-feac307135df)** (iOS).
  - Seen: two stacked cards joined by a ↓ connector. The amount card holds the "ETH" token chip, "0.004 ETH Max". The recipient card shows the avatar, the name and **"0 previous transfers"**. Below sits a gas line "⛽ $2.52" and then **Review transfer**.
  - Why: one screen holds the whole intent, and it signals a first-time recipient.
- **[Coinbase web: Transfer → Send dialog](https://mobbin.com/flows/dfdf09d3-5476-42be-8c56-6fdd9fa7866a)** (web flow).
  - Seen: a "Transfer" menu (Send crypto · Receive crypto · …) opens a ~520 px dialog. It shows "0SGD" huge with **Max**, then two picker rows joined by a vertical line: "Send · USDC · S$0.97 Available ›" and "To · Select network and recipient ›". Next come **Add note** and **Preview Send →**.
  - Why: the desktop version of the same hierarchy, with no keypad.

Supporting:
- [Cash App: "0.00008963 BTC available" as the subtitle](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332).
- [Fuse: MAX chip with the max value under it, and "To: Alex Smith · No previous sends"](https://mobbin.com/screens/45546772-8fc6-4bbd-b180-2f286c779062).
- [Phantom: 25 % / 50 % / 100 % chips](https://mobbin.com/screens/cd8b1b56-b8b9-4302-a3ee-33a364d4c5ef). Satchel doesn't need these; Max is enough.

**Borrow and map**
- **One screen, stacked: chain → amount → To → fee line → pinned Review.** kb/80's order stays (it is Uniswap's and Coinbase's). The chain must come first because it sets the units and the validation.
- **ChainSelect** segments show the chain and its balance ("₿ BTC 0.0123 │ Ξ ETH 0.0500"). A zero-balance chain stays selectable and leads to the existing guard copy.
- **Amount hero.** Use the new `amount-hero` token from kb/81 with a ticker suffix, centred (Solflare, Family, Cash App).
  - On the web, use a native `<input inputmode="decimal">`. **No custom keypad**, because desktop has a keyboard and a custom keypad is a large accessibility surface.
  - Normalise "," to ".". The input never wraps: step the size down 44 → 36 → 28 as the digits grow.
- **"Available 0.0123 BTC" plus a Max chip directly under the hero.** After Max is used, a helper reads "Max leaves room for the network fee." (`send.form.max-note`, new). kb/80's Max formulas are unchanged.
- **Fee line under the To card:** "Network fee ~282 sats · paid by this Satchel" (Uniswap's gas line), or "Estimating fee…" with **Retry** (kb/80).
- **Mobile keyboard.** Set `interactive-widget=resizes-content` in the viewport meta so the pinned **Review** rides above the keyboard in Chromium. On iOS Safari, keep `scroll-padding-bottom` (kb/81) so the focused field is never hidden.

### 2.5 Send › `RecipientInput` (changes kb/80 §AmountInput · RecipientInput · AccountInput, recipient-validation table, `val.*`)

**Best references**
- **[Glow: Choose Recipient](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df)** (iOS).
  - Seen: a context row "Sending · Solana (SOL)". The pasted address shows **in full, in mono, wrapped onto 2 lines**, with a clear ⓧ. An **amber** line reads "This is a valid address with no activity. Make sure you have the correct address."
  - **Paste** / **Scan** / **AirDrop** chips follow, and **Enter Amount** is pinned.
  - Why: the full address after paste, plus a warning tier that is visibly distinct from an error.
- **[Family: Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1)** (iOS, dark).
  - Seen: "To 0xB24910358fA5…" in a pill input with a clear button, a "Scan QR Code" row, and a "✓ Matching" section that offers the resolved recipient row ("0xb249····9768") to tap.
  - Why: the paste resolves into a recognisable object you confirm.
- **[Brave: own-address error](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef)** (iOS).
  - Seen: a red inline message directly under the To field, "The receiving address is your own address", while **Send** stays disabled.
  - Why: the error sits at the field, in words, and blocks (WCAG 3.3.1).
- **[Family web: Sending crypto flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4)** (web).
  - Seen: the review step shows a **checkbox**, "This is the first time you've interacted with this address. Please check the details carefully before interacting". **Verify & Send Transaction** stays disabled until it is ticked.
  - Why: an explicit, accessible acknowledgement for a risk tier.

Supporting:
- [Coinbase Wallet: recipient empty state "No recent addresses"](https://mobbin.com/screens/6fb963b7-bf1e-4a11-91c7-c33cd36350da).
- [Uniswap: "No results found. The address you typed either does not exist or is spelled incorrectly."](https://mobbin.com/screens/7c293c3f-56f4-49ec-ad62-4813b0ab244e).
- [Kraken: "Paste from clipboard" preview](https://mobbin.com/screens/e8d79af6-66e1-46d1-8273-d32eca69a5f6). This is iOS-only: a web page can't preview the clipboard without a permission prompt, so the **Paste** button must call `navigator.clipboard.readText()` on click.

**Borrow and map**
- **The field.** The label is "To". The placeholder comes from `send.form.*` ("tb1… address"). A trailing **Paste** text button sits inside the field (Solflare, Fuse, Trust Wallet). There is no QR scan on the web in v1, because camera permissions add cost.
- **The resolved row.** When the address is valid (on blur or paste, as kb/80 says), the input collapses into a row with the chain icon, the **full address grouped** (two lines in mono, ends emphasised), "✓ Bitcoin testnet4 address" and a clear ✕ that returns focus to the input. A polite status announces "Bitcoin testnet4 address accepted".
- **Satchel recognition** (from Family's "Matching" row and "Sent to Stash"). If `lib/derive`'s address-to-token index (kb/90 §8.2) maps the address to another Satchel, show "Satchel #4 · Cobalt" with the alloy swatch. If it maps to *this* Satchel, show the red `val.self` error.
- **Severity tiers.** This adds a column to kb/80's recipient-validation table.

| Tier | Colour | Effect | Keys |
|---|---|---|---|
| Error | `--danger` | blocks **Review** | `val.btc.mainnet` · `val.btc.regtest` · `val.btc.typo` · `val.evm.format` · `val.evm.typo` · `val.evm.zero` · `val.sol.format` · `val.sol.rent` · `val.self` |
| Warning | `--warning` | allowed; Review shows an **"I checked this address"** checkbox that gates the button (Family web) | `val.evm.nochecksum` · `val.evm.contract` · `val.sol.pda` |
| Info | `--fg-2` | static note, no gate | `val.btc.network` |

- **Optional (P2): "No previous sends from this Satchel"** (Uniswap, Fuse). It can be derived from Activity data the page already loads.

### 2.6 Send › `ReviewCard` (changes kb/80 §ReviewCard, W2, `send.review.*`)

**Best references**
- **[Coinbase Wallet: Send Bitcoin review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636)** (iOS, dark).
  - Seen, top to bottom:
    - a centred hero amount, and the BTC amount at its rate;
    - a **bordered group** with three rows: "Pay with · Bitcoin ›", "To · bc1ql4…zah4wz", "Network · Bitcoin";
    - plain rows "Network fee ⓘ", "Coinbase fee ⓘ", and **"Total cost"** in bold;
    - a blue info callout, "Please don't transfer to people you don't know…";
    - the line "Sending can't be reversed. Be sure you own or control the wallet address above.";
    - a pinned **Confirm** and "Secured by coinbase".
  - Why: grouping separates who and where from how much, and the total is explicit.
- **[World App: Confirm send](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11)** (iOS).
  - Seen: a card with two rows joined by a ↓: "Send · from you · 4.218007" and "Receive · to @alexsmith.8425 · 4.218007". A second card shows Wallet address / Network / Transaction fee "Free $0.00", then **Confirm send**.
  - Why: the exact outcome is visual, showing what leaves and what arrives.
- **[Binance: Send sheet](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258)** (iOS).
  - Seen: "−1 USDT" with a **minus sign** in the hero, then a **"Network Fee Paid By · BNB Chain · Gas Sponsor"** row. From and To are shown as **full addresses** with copy buttons and "My Wallet" tags, followed by a warning and Cancel | Confirm.
  - Why: this is the only reference that states **who pays the fee**, which is Satchel's two-payer reality (the Satchel pays chain fees, the NEAR account pays NEAR gas). Its full addresses defeat poisoning.
- **[Family: Confirm transaction to 0xb249····9768](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3)** (iOS, dark).
  - Seen: the recipient is in the title. Rows: "Total Value", "Send ETH", and **"From · [orange identity dot] Sam's"**. Then "Fee Estimate ⓘ" on the left and **"Urgent · ~15 Secs"** on the right, the footer "Review the above before confirming. Once made, your transaction is irreversible.", and a white **Confirm** pill.
  - Why: identity colour on "From", a time expectation next to the fee, and a calm irreversibility line.

Supporting:
- [Phantom: Review Send](https://mobbin.com/screens/29a970be-a332-44b3-9874-9955cfe3adc8): a huge left-aligned amount, then label-over-value rows "Recipient", "Payment · $0.20 fee", **"They Get"**.
- [Phantom: in-button "Loading ···"](https://mobbin.com/screens/ec1f9701-25c0-4b6a-b244-20cd47862d1a).
- [Coinbase: "Send time · less than a minute"](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539).
- [Glow: Preview label/value table](https://mobbin.com/screens/b7474066-c5b6-4888-8a0d-61875e1a3af0).
- [Base: Order preview](https://mobbin.com/screens/24a14768-bb8d-4e49-b276-14039d13b4fb), in the same language as Coinbase Wallet.

**Borrow and map** (390 px; the page is styled like a sheet):
```
┌──────────────────────────────────────┐
│ ←   Review send                      │
│                ₿                     │
│            0.0100 BTC                │ amount-hero = what the recipient gets
│ ┌──────────────────────────────────┐ │ outcome card (World App)
│ │ ▧ Satchel #1 · Patina            │ │ FROM, alloy swatch (Family "From")
│ │   −0.01000282 BTC  amount + fee  │ │ total leaving (Coinbase "Total cost")
│ │   ↓                              │ │
│ │ ₿ To                 +0.0100 BTC │ │ TO
│ │   tb1q 9x7k m2rd 4hzc 0a8f …     │ │ full address, grouped; ends emphasised
│ │   … 3kqe y8sd                    │ │
│ │   ✓ Bitcoin testnet4 address     │ │ (or "Satchel #4 · Cobalt")
│ └──────────────────────────────────┘ │
│ Network fee   ~282 sats              │ label/value rows
│               paid by this Satchel   │ (Binance "Fee Paid By")
│ Satchel #1 after   0.0023 BTC        │ (Coinbase Wallet preview)
│ NEAR fee      ≈ 0.004 NEAR           │ kb/90 §8.9 copy
│               paid by your NEAR acct │
│ Time          ~10 s to sign, then    │ (Coinbase "Send time")
│               minutes–hours to       │
│               confirm                │
│ ☐ I checked this address             │ only for warning-tier recipients
│ Sends can't be reversed. Check the   │ (Coinbase Wallet / Family)
│ address above.                       │
│ Your wallet will ask you to approve… │ kb/80 helper copy
│ [        Send 0.0100 BTC          ]  │ pinned metal; pressed → "Approve in your wallet…"
└──────────────────────────────────────┘
```
- **Hero = what the recipient gets.** The outcome card's From row carries **what leaves the Satchel (amount + fee)**, and its To row carries what arrives. This replaces kb/80's "You send −0.0100 / Recipient gets 0.0100" pair, which shows the same number twice and hides the total.
- **Fee rows name the payer:** "paid by this Satchel" for the chain fee, "paid by your NEAR account" for the NEAR fee. Add a "needs ≈ 0.1–0.3 NEAR free while signing (refunded)" tooltip from kb/90 §8.9.
- **Time row**, per chain:
  - BTC: "~10 s to sign, then minutes–hours to confirm";
  - ETH: "~10 s to sign, ~12 s to confirm";
  - SOL: "~10 s to sign, ~1 s to confirm".
- **BTC inputs note** stays (kb/80): "Uses 3 coins from this Satchel, so it needs 3 signatures."
- **Pressed state** (Phantom): the button shows a spinner and "Approve in your wallet…". kb/80's `preparing` step folds into this state, because kb/90 §8.2 builds the candidate during Review.
- **Accessibility** stays as kb/80 specifies: a `<dl>`, a button name that extends the label, and blocking warnings linked by `aria-describedby`. The checkbox is a real `<input type=checkbox>` and the button's description names it.

### 2.7 Send › `SigningProgress` (changes kb/80 §SigningProgress (component), §SigningProgress (send) state machine "UI" column, W2 right panel)

**Best references**
- **[Wise: transfer in progress](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec)** and **[Wise: transfer complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095)** (iOS).
  - Seen: a summary header with a round glyph, "+ 1 SGD" and the destination, then a segmented **Updates | Details** control. The vertical timeline:
    - finished steps get a ✓, a green small caption with the timestamp ("Tuesday, May 6 at 5:56 PM") above a plain sentence ("We received your SGD");
    - the **current step is bold with a filled dot and no timestamp** ("Your money's being processed");
    - future steps are muted with hollow dots.
  - The complete version has every step ✓ and ends with "Your transfer's complete · We sent 1 SGD to …" plus **Repeat this transfer**.
  - Why: the gold standard for long, multi-party waits. It is honest, the sentences are human, and the same component is the receipt.
- **[MoonPay: Your order](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de)** (iOS).
  - Seen: "$1.00 deposit · We are processing your deposit." over a Status | Details segmented control. A vertical stepper: "● Today at 21:44 · Pending · We are processing your deposit.", then "○ Processing", then "○ Updating balance". Footer: **"You can safely close this screen. We'll let you know when your order is complete."**
  - Why: it tells the user when leaving is safe.
- **[Topper (inside Solflare): Status](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f)**.
  - Seen: "✓ Placed · Apr 24 2:00:37 PM", "✓ Processed · Apr 24 2:01:22 PM", "○ Completing · Your funds are on the way!", with **right-aligned timestamps** and a connector line. A copyable order-ID row follows.
  - Why: exact times and a copyable ID, which is what a crypto user wants for later lookup.
- **[PandaDoc web: bulk import](https://mobbin.com/screens/6e7783c1-2ce2-4ba2-832d-bab89ec45f67)**.
  - Seen: "Imported 0 of 4 files", with calm grey helper text, "Keep this window open so your bulk import can continue uninterrupted.", and per-item spinners.
  - Why: the right tone for Satchel's no-relay "keep open" requirement. Contrast it with the alarm-red "Do not close this window…" in [mymind](https://mobbin.com/screens/63e9e0e2-7932-41f0-a35d-8a764b1cbd88).

Supporting:
- [Binance web: "This will take no more than 30 seconds."](https://mobbin.com/screens/7fa354e5-f5d4-4a32-bd19-64a89c4ea8aa), an explicit upper bound that backs kb/90's "up to about 2 minutes".
- [World App: the review stays visible and the button area becomes "Processing"](https://mobbin.com/screens/8aea1f96-77f8-4e0e-b82d-f0d1512cac44).

**Borrow and map** (the Send page body after **Send 0.0100 BTC**):
```
┌──────────────────────────────────────┐
│ ✕   Sending 0.0100 BTC               │ header → "Sent 0.0100 BTC" after broadcast
│ ✓ Approved in your wallet   14:02:11 │ done: past tense, time --fg-2 (Topper)
│ │                                    │
│ ◉ Signing with NEAR's signer    0:07 │ current: bold; timer mono tabular, right
│ │ network                            │
│ │ Usually about 10 seconds.          │ kb/90 §8.6 thresholds (15/20/60/150 s)
│ │ Signing 3 inputs                   │ BTC only (E-08)
│ ○ Broadcast to Bitcoin testnet4      │ future: muted
│ ○ Confirmed                          │
│ Keep this page open until it says    │ --fg-2, calm (PandaDoc)
│ Sent.                                │
│ ▸ Details                            │ collapsed ReviewCard (Wise "Details")
└──────────────────────────────────────┘
```
- **Four rows, not five.**
  1. "Approve in your wallet" (done: "Approved in your wallet");
  2. "Signing with NEAR's signer network" (done: "Signed", with **NearBlocks ↗**);
  3. "Broadcasting to {network}" (done: "Broadcast", with the tx id and copy);
  4. "Confirmed".
  - "Preparing" lives in the button's pressed state (§2.6). "Sent" becomes the **header** state ("Sent 0.0100 BTC") rather than a row.
- **Finished rows show an absolute time** in `<time>` (Topper, Wise). The active row shows the elapsed timer (`aria-hidden`, as kb/80 says) and the kb/90 threshold sentence.
- The list is an `<ol>` with `aria-current="step"` on the active row. The `role="status"` rules in kb/80 stay.
- **Copy for leaving the page.** Before broadcast: "Keep this page open until it says Sent." (`sign.keepopen`, no relay). From the broadcast step on: **"You can close this page."** (MoonPay), shown as `sign.closeok` (new). The old `sign.relay` copy is deleted, because kb/90 builds no relay.
- **Details disclosure.** The ReviewCard stays one tap away under the stepper (Wise's "Details"), so the user can re-check the address while waiting.
- **Motion.** Keep the kb/80 values (check `pathLength` 240 ms, active-ring pulse). Add the connector line filling to the active node with a 200 ms tween; under reduced motion it is static.

### 2.8 Send › Sent and receipt (changes kb/80 §Send "Done", `sign.done`, `sent.note.*`, `sent.confirmed`)

**Best references**
- **[Coinbase Wallet: Confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de)** (iOS, dark).
  - Seen: three animated blue dots (not a check), "You sent SGD 13.00", "0.00010375 BTC" in large blue, "To: bc1ql4…zah4wz", then **"est. about 30 minutes"** in small muted type above **Done** (primary) and **Show details** (secondary).
  - Why: the honest BTC model. It says the transfer was sent, shows that confirmation is in progress, and lets the user leave.
- **[Solflare: Success sheet](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b)**.
  - Seen: a ✓ tile and "Success", then two rows, **"Transaction ID ⧉"** and **"Explorer ↗"**, then "Save address" and "Close".
  - Why: the two things a crypto user needs next are rows, not buried links.
- **[Revolut: sent sheet](https://mobbin.com/screens/2a4195e0-605e-4215-9091-7b885783635e)**.
  - Seen: a compact sheet over the dimmed review, "✓ You sent $10.10 to …" with **"Arriving: Instantly"**.
  - Why: every success line carries an arrival expectation.

Supporting:
- [N26: top banner "Your money is on its way! The funds will be available in your account in a few seconds."](https://mobbin.com/screens/e5429e71-a857-487c-9c9b-f93041c38b9c).
- [Base web: top-centre pill toast "Swapped 0.00005 ETH for USDC"](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab).
- [Family web: "Transaction Sent" card with Wallet, Chain, Send and Total rows and **Done**](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4).

**Borrow and map**
- **Structure.** The Sent state is the §2.7 tracker in its post-broadcast form:
  - the header "Sent 0.0100 BTC" with "to tb1q…y8sd";
  - rows 1–3 marked ✓ with times and links;
  - row 4 "Confirmed" pending with the per-chain line (BTC: kb/90's "In mempool. Testnet4 confirmations are irregular: minutes to hours."; EVM: "Waiting for 1 confirmation (about 12 seconds).");
  - "You can close this page.";
  - **Done** (primary metal) and **View activity** (secondary).
- **Status glyph.** For BTC in the mempool, use an `--info` ring or paper-plane glyph. Only `confirmed` gets the `--success` ✓. [World App: "Send processing" with a green check](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81) mixes these two signals and is the counter-example.
- **Exit toast.** "Sent 0.0100 BTC · in mempool" sits top-centre on desktop (Base web) and above the pinned button on mobile. Use the Toast primitive's defaults, as kb/80 says.

### 2.9 Send › failure states: `signed_not_sent`, `timed_out`, `cancelled`, `unknown`, `failed` (changes kb/80 §SigningProgress (send) rows, §Error map presentation)

**Best references**
- **[Glow: Transaction Failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218)** (iOS).
  - Seen: a red-tinted glyph, "Transaction Failed", "This transaction didn't go through.", and a timestamp.
  - An info line states the **consequences**: "The transaction fee was still paid but no additional SOL, coins or NFTs were transferred."
  - Rows "Network Fee" and **"Signature 4y3Wv…f7vJF"**, then "View Raw Transaction ↗".
  - Why: the user learns exactly what did and didn't happen to their funds, which is Satchel's "Nothing was sent" principle.
- **[Posh: Pending Transfer](https://mobbin.com/screens/18b1e043-8db3-414c-b2c9-11a7d91402af)** (iOS).
  - Seen: the ticket card art with "Send · RSVP / To +1650…", then **"What does this mean?"** followed by a plain explanation ("…has not yet accepted your ticket. You can still cancel this transfer."), then **Back** | **Cancel Transfer**.
  - Why: an explanation block between the state and the action. It is also a card-shaped asset whose transfer is pending, which makes it a close cousin of a Satchel.
- **[Cash App: pending detail](https://mobbin.com/screens/75c64504-9371-456e-a07c-e5dc9fe59431)**.
  - Seen: "··· Pending · Waiting for … to accept this request", "# Transaction number" with copy, a **"What you can do"** section heading, and one pinned recovery action.
  - Why: the state, its explanation and its fix, in that order.
- **[OpenSea web: Send crypto, error](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9)** (web flow).
  - Seen: a dark side panel with a red ✕ "Error", the amount ("< 0.0001 ETH"), "RECIPIENT WALLET HTjzF4…sUjs", **Retry** (red-tinted) and **Close**.
  - Why: Retry keeps the context (amount and recipient), which matches WCAG 3.3.7 and kb/80's "form kept".

Supporting:
- [Revolut: actionable pending card with inline actions](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7).
- [Phantom: dismissible inline error banner "Position opening failed · Order below minimum value · OK"](https://mobbin.com/screens/29b2a97f-a706-4c8a-bd40-b74d2e669a94).

**Borrow and map**
| State (kb/90 §8.6) | Tracker shows | Explanation block ("What this means") | Actions |
|---|---|---|---|
| `signed_not_sent` | rows 1–2 ✓; row 3 ✕ "Broadcast failed: {reason}" | "The signature exists, but the transaction hasn't reached {network}. Until it's broadcast or replaced, it counts as an unused signature in this Satchel's history." | **Broadcast again** (primary) · "View signature on NearBlocks ↗". The same item appears as the actionable card on the Wallet tab (§2.2) and pinned in Activity with **Broadcast now** (§2.10) |
| `timed_out` | row 2 ✕ "Not signed" | kb/90 copy: "The signer network did not return a signature. Nothing was sent. Try again." | **Try again** (same nonce and inputs, kb/90 §8.7) · Close |
| `cancelled` | row 1 ✕ "Cancelled in your wallet" | `sign.cancelled`: "Nothing was signed." | **Try again** · Close; form kept (OpenSea Retry) |
| `unknown` | row 2 "?" "Still waiting for NEAR to confirm" | E12 copy | **Check again** · NearBlocks ↗ |
| `expired` (SOL) | row 3 ✕ | `sign.sol.expired` | **Try again** |
| `failed` | the failing row ✕ | the Error-map entry, consequence first (Glow) | per the Error map |

- **Presentation rule** for the kb/80 §Error map:
  - Field errors are inline under the field (Brave).
  - Flow errors replace the active row's helper and keep every input.
  - Never use a system `alert()` or a blocking modal for a recoverable error (see anti-patterns 5 and 6).
- **New-send block** (kb/90 §8.7). Opening Send while an unsent signed intent exists shows the tracker of *that* intent with "You have an unsent signed transaction. Broadcast it or replace it." It does not show an empty form.

### 2.10 Activity tab › `Timeline` and row detail (changes kb/80 §Activity tab, §FreezeBanner · CleanHistory · Timeline (Timeline row), `act.*`)

**Best references**
- **[Coinbase Wallet: Transactions](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5)** (iOS, dark).
  - Seen: small uppercase date headers ("TODAY", "MAY 07, 2025"). Each row has a BTC icon, "Sent" over "To bc1qfw…yec7" on the left, and "−$1.46" over "0.000014 BTC" on the right. Received rows show a green "+".
  - Why: the quietest, most legible dark history list in the set.
- **[Family: activity](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b)** (iOS).
  - Seen: "Today" / "This Week" groups.
  - Each **token icon carries a small action badge** (green ↓ received, blue ↗ sent, red revoke).
  - A muted verb line ("Received from 0x8c82····7ba1") sits over the bold asset name, with "+ 6.164 POL" in green on the right.
  - Rows **name wallets by identity**: "Sent to Alex's Wallet", and "Sent to Stash" with Stash's orange avatar.
  - A "Fee Only" tag marks rows that moved no value.
  - Why: rows read as sentences, and identity carries through.
- **[Kraken: Activity](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d)** (iOS) and **[Kraken web: Activity](https://mobbin.com/screens/bffa5cbf-0a7f-4a4d-9d86-58cbc4877bbb)**.
  - Seen: a **"Pending" group pinned above** the dated groups, holding "Deposited DOGE" with a light-blue "Pending" pill. The web version has a separate "Pending Transactions" card above "Transactions" and its filters.
  - Why: unfinished work never scrolls away.
- **[Mercury: transactions](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3)** (iOS).
  - Seen: status chips **only on non-final rows**: a grey "Pending" and a pink "Failed". The failed amount is **struck through** ("$0.00"). Completed rows carry no chip.
  - Why: a signal-to-noise discipline that the dense exchange apps lack.

Supporting:
- [Phantom: History](https://mobbin.com/screens/3e9a144f-5bb0-44ab-b961-5a290ff59c49): filter chips "All · Deposit · Trade · Transfer", a month header, and one-line meta "Transfer • Aug 26, 2026".
- **[Phantom: transaction detail sheet](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44)**: "From" plus the address in large type, Date / Status / Network / Type rows, a "Transfer Details" section, and a centred **"View on Solscan ↗"**.
- [Trust Wallet: "Can't find your transaction? Check explorer"](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f), shown at the end of the list.
- [Trust Wallet: "ETH Sent" detail](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35): Status "Pending" in amber, Confirmations "--", Nonce, and "View on block explorer".
- [Cash App: "Pending" heading on top; a failed row reads "Friday · Failed" with the amount struck through](https://mobbin.com/screens/e37f6a5b-2b8f-4aa5-a296-ee5a7401a844).
- [OpenSea web: Activity table](https://mobbin.com/screens/78b75442-2886-42bc-a536-f2ebf6b58960): NFT events (Listing, Mint, Send, Receive, Sale) in one list, each with an event glyph. The time cell links out ("6m ago ↗").
- [Base web: Activity](https://mobbin.com/screens/296dd83a-6f56-44dd-9c90-bdfd592401b7): "8 Transactions", the filters "All Coins ⌄" and "All Networks ⌄", and a two-line date column on the right.

**Borrow and map**
```
IN PROGRESS                                   (pinned group, Kraken)
[₿↗] Sending 0.0100 BTC              −0.0100 BTC
     Bitcoin testnet4 · Signing 0:42
[₿!] Signed, not sent              [Broadcast now]   (inline action, Revolut)
     Bitcoin testnet4 · 14:02
TODAY                                         (micro label, Coinbase Wallet)
[₿↗] Sent to tb1q…y8sd               −0.0100 BTC
     Bitcoin testnet4 · 14:02 · [In mempool]          (chip only when not final, Mercury)
[◆⇄] Transferred to bob.testnet
     NEAR testnet · 13:40
[Ξ↙] Received from 0x8b…41           +0.0500 ETH      (--success only for incoming)
     Ethereum Sepolia · 11:02
[Ξ↗] Sent to Satchel #4 ▧            −0.0100 ETH  Failed   (struck through + word)
     Ethereum Sepolia · 10:15
```
- **Row anatomy.**
  - A 40 px chain icon, or the Satchel mark for NEAR events, with a 14 px action badge: ↗ sent, ↙ received, ⇄ transferred, ◆ minted, ✎ signature.
  - The title is verb + counterparty. The sub line is network · time.
  - The signed amount sits on the right (U+2212 for outgoing; green only for incoming).
  - A chip appears only for Signing · In mempool · Pending · Failed · Unused.
  - Failed amounts are struck through and say "Failed": `<del>` plus sr-only "Failed:".
  - Counterparty Satchels show the alloy swatch (Family).
- **One row per user action.** Merge a `SignatureIssued` NEAR event and the chain tx it produced into one "Sent" row whose detail holds both links. Show a standalone "Signature issued" row only when no chain tx matches. That case is exactly the "Unused" status that Clean history cares about.
  - This needs the record-to-tx match the clean-history checker already computes [ASSUMED; confirm with web/sec].
- **The pinned "In progress" group** holds local intents (`satchel:pending:v1`), `signing`, `sent` (in mempool) and `signed_not_sent`, and the last one gets the inline **Broadcast now**. This replaces kb/80's "In-flight local items are pinned on top with a Signing status".
- **Row detail.** A sheet on mobile, a page or side panel on desktop. Use Phantom's detail rows: Date, Status, Network, Type, Amount, Fee, From/To with copy. Send rows add the §2.7 tracker in its final state. Explorer links are **named**: "View on mempool.space ↗", "View on Etherscan ↗", "View on NearBlocks ↗".
- **Partial data.** Keep kb/80's "Bitcoin history is unavailable right now." and add "Check mempool.space ↗" (Trust Wallet).
- **Paging.** The SSR first page ends in a **Show older** link (`?before=`), so judges without JS can page.
- **Desktop.** Base web's list inside the 7-column content column, with a count ("12 events") and a chain filter (All · Bitcoin · Ethereum · NEAR) as a ToggleGroup.

### 2.11 Desktop shell, 1024 px and up, for these screens (changes kb/80 §Wireframes "Desktop", §IA implementation notes)

**Best references**
- **[Base web: Home](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab).**
  - Seen: a left nav with the account chip at its foot, a centred content column (about 600 px at 1440), and a hero balance card. Four tinted action tiles follow (Trade · Send · Receive · Deposit), then a Coins / Collectibles / Orders tab bar and a table whose Balance column shows "$1.19" over "0.000652 ETH". A top-centre transaction toast sits above.
  - Why: restrained, with one column of truth.
- **[Coinbase web: My assets](https://mobbin.com/screens/fee6499f-1bb8-47b4-a971-607d22e0f20a).**
  - Seen: a persistent **right rail** with the trade panel and quick actions "Send crypto · Receive crypto · Deposit cash · Withdraw cash".
  - Why: a persistent action panel beside the content, the mirror of Satchel's sticky left card panel.
- **[Family web: Sending crypto flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4).**
  - Seen: Send is a **full page** with a back chevron, a centred title and a **thin teal progress hairline** under the header. A centred ~450 px column holds "To …" with a **Paste** pill and the search result. Then a token-picker modal, the review ("Review Transaction to 0x1cf2…9a56", rows ending in **"Estimated Time ~30s"**, the first-time checkbox), and the "Transaction Sent" card.
  - Why: exactly Satchel v1's full-page decision done well on desktop.
- **[OpenSea web: Send crypto](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9).**
  - Seen: a **right-side drawer** (about 430 px) over the dimmed page with **uppercase mono micro-labels** ("TOKEN SELECTED", "RECIPIENT WALLET", "REVIEW"). Amount + MAX, then a recipient field with a paste icon, then a live **REVIEW** box (amount at rate, Network, OpenSea Fee, Total), then **"Send 0.0000001 ETH"**.
  - Why: dark and crypto-native, and close to Satchel's brand register. The review summary lives in the form.

**Borrow and map**
- **Keep kb/80's 5 + 7 column split.** The left sticky panel (card, ownership line, ActionBar) plays the role of Coinbase's right rail.
- **Send and Fund full pages at `lg`.** Use a centred **480 px** column, a "← Satchel #1" back link, and a 2 px progress hairline under the TopBar (Family web): Form 33 % → Review 66 % → Tracker 100 %.
- **If H-19 modals are adopted**, prefer a **right-side drawer** (OpenSea) over kb/80's centred 480 px Dialog. The drawer keeps the left sticky SatchelCard visible, so the user always sees which Satchel is sending.
- **Uppercase mono micro-labels** (OpenSea, Solflare "BALANCE", Coinbase Wallet "TODAY"). Adopt them as kb/81 `micro`, for field labels and day headers. They give the "crypto-native" register without breaking kb/81's limit of one expanded `engrave` line per view.

---

## 3. Industry-standard conventions observed

| # | Convention | Seen in | Satchel status |
|---|---|---|---|
| 1 | One big amount per screen, centred, with a small ticker or currency suffix; everything else is secondary | Cash App, Solflare, Family, Coinbase Wallet, Base, Glow (Phantom left-aligns) | Add the `amount-hero` token; centre it (Open question 2) |
| 2 | "Available {balance}" plus **Max** directly under the amount | Solflare, Family ("Use Max"), Fuse, Uniswap, Binance, Coinbase web | kb/80 has Max; move it next to the hero |
| 3 | Mobile primary button is full width, pinned to the bottom, disabled until valid, and names the action ("Send 0.0100 BTC") | every iOS reference; OpenSea web names the amount | kb/80 already names the amount; add the pinned bar spec to kb/81 |
| 4 | Review = hero, then grouped who/where rows, then fee rows and a total, then an irreversibility line, then confirm | Coinbase Wallet, Base, Family, Phantom, Glow, World App, Trust Wallet, Binance | Restructure kb/80 ReviewCard (§2.6) |
| 5 | Addresses are truncated to prefix + 4 … 4–6 in lists, and shown in full on review or receive, sometimes with emphasised ends | Family "0xb249····9768"; Binance and OKX full on review; Gemini web and Kraken web emphasise the ends; Public "Show all" | kb/80 rule confirmed; add end emphasis |
| 6 | Receive = QR + address + Copy + Share + one-sentence network warning; the network is chosen first or shown as a chip next to the QR | Cash App, Solflare, Glow, Brave, PayPal, World App, Coinbase web, Kraken web | Add the layout spec (§2.3) |
| 7 | Copy feedback is an icon swap to ✓, or a toast "… copied" | Cash App (✓), Base iOS "Address copied to clipboard", Revolut "Card number copied" | kb/80 has both; keep |
| 8 | Long waits use a vertical stepper: done steps with timestamps, the current step bold, future steps muted; a "safe to close" or "keep open" line | Wise, MoonPay, Topper, Revolut Business tracker, PandaDoc | Restructure kb/80 SigningProgress (§2.7) |
| 9 | Unfinished items are pinned at the top of history | Kraken (iOS and web), Cash App | Add the "In progress" group |
| 10 | History rows: icon + action badge, verb + counterparty, signed amount on the right, green only for incoming; date-grouped | Family, Coinbase Wallet, Phantom, Glow, Base web, Trust Wallet | Specify Timeline row anatomy (§2.10) |
| 11 | Status words appear only for non-final states; failures are struck through | Mercury, Cash App | Add to kb/80 and kb/81 |
| 12 | Transaction detail = label/value list + a **named** explorer link at the bottom | Phantom ("View on Solscan"), Trust Wallet, Glow ("View Raw Transaction ↗"), Solflare | Add row detail (§2.10) |
| 13 | Each wallet has a stable identity colour or avatar that recurs in lists, review ("From") and history ("Sent to …") | Family, Rainbow, Apple Wallet card art, Solflare (initials avatar) | Satchel has alloys; carry the swatch into Review and Activity |
| 14 | Dark crypto UIs use uppercase micro-labels and de-emphasise secondary digits | OpenSea web, Solflare, Coinbase Wallet; Uniswap, Revolut and Solflare grey the cents | Add the `micro` token. De-emphasising digits is fiat-only: Satchel's trimmed native amounts don't need it |

One deliberate deviation: the industry verb is **Receive** or **Deposit** (every app seen). kb/80's copy rule uses **Fund** because anyone, not only the owner, may fund a Satchel. Keep "Fund" in labels, and use the industry ↓ glyph on the action so it is still recognised at a glance.

---

## 4. Anti-patterns (avoid)

1. **A fiat-first hero.**
   - Every crypto app above leads with "$". On testnet that reads as a false claim (kb/80 TL;DR; kb/90 T7).
   - Lead with the native amount. See [Cash App "$4"](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332) and [Phantom "$1"](https://mobbin.com/screens/29a970be-a332-44b3-9874-9955cfe3adc8): borrow their hierarchy, not their currency.
2. **18-decimal amounts and fees.** [Trust Wallet: confirm send](https://mobbin.com/screens/557c35d8-3669-4459-833c-e5bfdf82864a) shows "0.000263640044405508 ETH" and a fee of "0.000171725833146 ETH". Keep kb/80's rules (BTC fees in sats; "< 0.000001 ETH").
3. **Slide-to-confirm.**
   - Seen in [Solflare: Slide to approve](https://mobbin.com/screens/662009cf-ee36-4e6c-beae-ed706f64fba2) and [Base: Slide to Send](https://mobbin.com/screens/fbbbcfe5-d77d-44c1-a480-21a4e76bed87).
   - A drag-only action fails WCAG 2.5.7 and is not a web idiom. Use a button.
4. **A status word on every row.** [Crypto.com: "Processed" × 15](https://mobbin.com/screens/b8af4c01-88c6-4a4a-9c47-9a9281278fd5) buries the one row that matters. Show status only when it isn't final (Mercury).
5. **Generic failure dialogs that state no consequence or next step.**
   - [Crypto.com: system alert "Your transaction has failed. Please try again later…"](https://mobbin.com/screens/98002d85-b4da-4a32-a7b4-18bd9cf4a6d7).
   - [PayPal: "We're having trouble with this transaction."](https://mobbin.com/screens/37ec5e8d-89e2-4d64-bd82-ae9855d83d35).
   - [Snoonu: "Oops! Transaction cancelled"](https://mobbin.com/screens/3999a458-0206-408f-a3e9-d3669304e347), which also breaks kb/80's "no apologies, plain words" rule.
6. **A blocking modal for a field-level error.** [Binance web: "Sorry, payee cannot be found." over the form](https://mobbin.com/flows/6da2eab5-3db8-4a19-9e44-bf8a4c4fcb65).
7. **Alarm-red "Do not close this window"** ([mymind](https://mobbin.com/screens/63e9e0e2-7932-41f0-a35d-8a764b1cbd88)). Use the calm "keep open" helper, and make it resumable, which Satchel already is through `satchel:pending:v1`.
8. **A success check on something that isn't final.** [World App: "Send processing" under a green ✓](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81). BTC "In mempool" must not look like "Confirmed".
9. **Custom numeric keypads on the web.** They are standard on iOS (all the §2.4 references), but on the web they duplicate the system keyboard and are an accessibility liability. Use `inputmode="decimal"`.
10. **Exchange-style multi-step deposit wizards for a fixed set of chains.**
    - [OKX web](https://mobbin.com/screens/acd7d6d8-7320-4a8d-a8e5-b0446aa643e7) and [Binance web](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1) use "1 Select coin, 2 Select network, 3 Address".
    - Satchel has 2–3 fixed chains, so a segmented control is enough.
11. **Long lists of zero balances and promo clutter.** [OKX](https://mobbin.com/screens/ca029c67-f821-43a0-b80f-d912b2f8bc30) and [Binance](https://mobbin.com/screens/016f80e5-45e6-4508-b2d3-fba12707f352) list every token at 0; promos interrupt [Uniswap](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978) and [Solflare](https://mobbin.com/screens/a3d0efac-4e63-409e-a55b-96ae6589e1ae). Satchel shows only its own chains, and zero rows invite **Fund**.
12. **A truncated-only recipient on the final review.** [Trust Wallet](https://mobbin.com/screens/557c35d8-3669-4459-833c-e5bfdf82864a) shows only "0x19E0f…ed59e0b". That is the exact surface address poisoning targets. Show the full grouped address (as [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) does).
13. **Hiding Send at zero balance.** Users lose the affordance and don't learn why. Grey it out with a reason ([Wise](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b)).

---

## 5. Concrete change list for kb/80 and kb/81

| # | Doc § | Change | References |
|---|---|---|---|
| C1 | kb/80 §TL;DR bullet 2 and §IA implementation notes | Align with kb/90 §8.1. Send, Receive and Transfer are **full pages** in v1. On mobile the page is styled like a sheet (title + ✕ in a 56 px bar, pinned button). Modal routes become design-lead option H-19, with a right drawer preferred (C18) | [Family: send](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984), [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) |
| C2 | kb/80 §Home `/`, row "List" | Mobile: **card stack**. One Satchel is a full `lg` card; with 2 or more, each card shows a 76 px band (serial · native summary · status) linking to `/s/[id]`. From `sm` up: the existing grid of `md` cards plus a native summary line; on desktop add a "…" menu (Send · Fund · Copy addresses · View activity) | [Apple Wallet](https://mobbin.com/screens/46812e0f-4c8d-40ce-8ad3-356b009761e0), [Family: wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec), [Family web menu](https://mobbin.com/screens/0d16504e-cac4-4855-8290-415f3c1f110e) |
| C3 | kb/80 §Home `/`, row "Empty" | One visual (Gunmetal placeholder card), one sentence, one primary button (**Mint a Satchel**), plus a text link (**See Satchel #1**) | [Phantom: welcome](https://mobbin.com/screens/60e4e522-950f-44d8-afde-059068ebe353) |
| C4 | kb/80 §Wallet tab, rows "Row loaded" and "Zero"; §ChainChip · ChainRow · AddressDisplay | **ChainRow** is two lines: [icon · network / address · Copy (✓ for 2 s) · QR] on the left, [balance / explorer link] on the right. At `lg`, show the **full grouped address**. When **all** chains are zero, show a **Fund this Satchel** card (Copy address, QR, faucet) above the rows | [Phantom: rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Cash App: copy sheet](https://mobbin.com/screens/46f6bd70-201f-4ed1-b6f6-97716e8422a5), [Rainbow: receive card](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a) |
| C5 | kb/80 §Satchel page layout, ActionBar (and the role matrix "Active" row) | **Send** stays visible and is disabled with a reason when every balance is zero | [Wise](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b) |
| C6 | kb/80 §Satchel page layout, row "Pending signature (this browser)" | The sticky mini-bar becomes a **pill** under the TopBar ("◌ Sending 0.0100 BTC · 0:42" → reopens the tracker). `signed_not_sent` becomes an **actionable card** at the top of the Wallet tab with inline **Broadcast now** | [Uniswap: pending pill](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978), [Revolut: pending card](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7) |
| C7 | kb/80 §Receive / Fund (+ a new wireframe W5) | Replace the one-line spec with the §2.3 layout: ChainSelect on top, an alloy-framed card with a **240 px** white QR plate, the full grouped address with emphasised ends, **Copy address** (primary) and Share (only with Web Share), icon info rows (network-only, **time to confirm**, anyone can fund), the faucet link, and a live **Incoming** block | [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a), [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Kraken web](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868), [Coinbase web](https://mobbin.com/screens/97dc93ce-f553-4425-9c11-6d68300c40cf), [Binance web](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1) |
| C8 | kb/80 §Send, row "Form"; §AmountInput | A stacked single screen: ChainSelect (segments show balances), then the **amount hero** (`inputmode="decimal"`, no keypad, never wraps), "Available …" + **Max** under it, then the To card, then the fee line, then a pinned **Review**. Add the `send.form.max-note` helper | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Family](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984), [Uniswap](https://mobbin.com/screens/04498eb3-2576-4233-95ca-feac307135df), [Coinbase web flow](https://mobbin.com/flows/dfdf09d3-5476-42be-8c56-6fdd9fa7866a) |
| C9 | kb/80 §RecipientInput + the recipient-validation table | A **Paste** button inside the field. A valid address collapses into a **resolved row** (full grouped address + "✓ {network} address" + clear). **Satchel recognition** via `lib/derive`. Add a **Tier** column: Error blocks; Warning requires the Review checkbox; Info is a static note | [Glow](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df), [Family: Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1), [Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef), [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) |
| C10 | kb/80 §ReviewCard rows + W2 left panel | Hero = what the recipient gets. A **From → To outcome card** (alloy swatch; the From row shows amount + fee; the To row shows the full grouped address). Fee rows **name the payer**. Rows for **Satchel after**, **NEAR fee** (kb/90 §8.9 copy) and **Time** (per chain). The warning checkbox. "Sends can't be reversed. Check the address above." Pressed state "Approve in your wallet…". This replaces the "You send / Recipient gets" pair | [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11), [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636), [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258), [Family](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3), [Coinbase](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539), [Phantom: loading](https://mobbin.com/screens/ec1f9701-25c0-4b6a-b244-20cd47862d1a) |
| C11 | kb/80 §SigningProgress (component) + W2 right panel | A Wise-style `<ol>` tracker with **4 rows** (Approve → Sign → Broadcast → Confirmed). "Preparing" moves into the button's pressed state; "Sent" becomes the header. Done rows show past tense + `<time>` + links (NearBlocks, tx id with copy); the active row is bold + timer + the kb/90 threshold sentence; future rows are muted. Add a **Details** disclosure holding the ReviewCard, and switch the copy from keep-open to close-ok at broadcast | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec), [MoonPay](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de), [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f), [PandaDoc](https://mobbin.com/screens/6e7783c1-2ce2-4ba2-832d-bab89ec45f67) |
| C12 | kb/80 §Send, row "Done"; `sent.note.*` | The Sent state = the tracker after broadcast + "You can close this page." + **Done** / **View activity**. An `--info` glyph while unconfirmed; the `--success` ✓ only at `confirmed`. An exit toast "Sent {amount} · in mempool" | [Coinbase Wallet](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [Revolut](https://mobbin.com/screens/2a4195e0-605e-4215-9091-7b885783635e), [Base web toast](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab) |
| C13 | kb/80 §SigningProgress (send), "UI" column for `signed_not_sent`, `timed_out`, `cancelled`, `unknown`, `expired`, `failed` | Use the §2.9 table: the failing tracker row ✕, a **"What this means"** block (consequence first), then the actions. **Broadcast again** for `signed_not_sent`; **Check again** for `unknown` (kb/90 §8.6) | [Glow](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218), [Posh](https://mobbin.com/screens/18b1e043-8db3-414c-b2c9-11a7d91402af), [Cash App](https://mobbin.com/screens/75c64504-9371-456e-a07c-e5dc9fe59431), [OpenSea web flow](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9) |
| C14 | kb/80 §Error map (intro) | Add a presentation rule: field errors inline; flow errors replace the active row's helper and keep inputs; no system alerts or blocking modals for recoverable errors | [Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef); anti-patterns [Crypto.com](https://mobbin.com/screens/98002d85-b4da-4a32-a7b4-18bd9cf4a6d7), [Binance web flow](https://mobbin.com/flows/6da2eab5-3db8-4a19-9e44-bf8a4c4fcb65) |
| C15 | kb/80 §Activity tab, row "Loaded" | A pinned **"In progress"** group (local intents, Signing, In mempool, `signed_not_sent` with inline **Broadcast now**) above the day groups. A **Show older** link for SSR paging. A partial-data fallback "Check {explorer} ↗" | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Kraken web](https://mobbin.com/screens/bffa5cbf-0a7f-4a4d-9d86-58cbc4877bbb), [Trust Wallet](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) |
| C16 | kb/80 §Timeline (component row) | Row anatomy: icon + action badge; verb + counterparty; network · time; a signed amount (green only for incoming); a status chip only when not final; failed amounts struck through with the word; counterparty Satchel swatch; `micro` day headers. **One row per user action**: merge the signature event with its chain tx, and show a standalone "Signature issued" row only when unmatched [ASSUMED; web/sec] | [Family](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b), [Coinbase Wallet](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5), [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3), [OpenSea web](https://mobbin.com/screens/78b75442-2886-42bc-a536-f2ebf6b58960) |
| C17 | kb/80 §Activity tab (new row "Detail") | A tap opens the detail (a sheet on mobile, a side panel or page on desktop): Date · Status · Network · Type · Amount · Fee · From/To (copy), the final tracker for sends, and **named** explorer links | [Phantom: detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44), [Trust Wallet: ETH Sent](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35), [Wise: complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) |
| C18 | kb/80 §Wireframes "Desktop" paragraph | Send and Fund at `lg` use a centred **480 px** column, a "← Satchel #1" back link and a 2 px progress hairline. Under H-19, a **right drawer** rather than a centred Dialog, so the sticky card stays visible | [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4), [OpenSea web flow](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9), [Coinbase web](https://mobbin.com/screens/fee6499f-1bb8-47b4-a971-607d22e0f20a) |
| C19 | kb/80 §Copy deck › Strings | **New keys:** `send.form.max-note` "Max leaves room for the network fee." · `send.review.from` "From" / `.to` "To" / `.after` "Satchel #{id} after" / `.time` "Time" · `send.review.time.btc` "~10 s to sign, then minutes–hours to confirm" (`.evm` "…~12 s to confirm", `.sol` "…~1 s to confirm") · `send.review.ack` "I checked this address" · `send.review.irreversible` "Sends can't be reversed. Check the address above." · `sign.step.*.done` "Approved in your wallet" / "Signed" / "Broadcast" / "Confirmed" · `sign.closeok` "You can close this page." · `sign.notsent.explain` (§2.9 text) · `fund.time.btc` "Testnet4 confirmations are irregular: minutes to hours." · `fund.time.evm` "About 12 seconds to confirm." · `fund.time.sol` "About 1 second to confirm." · `fund.incoming.wait` "Waiting for a deposit…" / `.seen` "+{amount} · in mempool" / `.done` "Received {amount}" · `act.group.inprogress` "In progress" · `act.fallback` "Can't find a transaction? Check {explorer} ↗" · `act.more` "Show older". **Delete:** `sign.relay` (no relay in v1) | see §2.3–2.10 |
| C20 | kb/80 §Reference patterns | Replace the help-centre table ("Mobbin was unavailable") with a Mobbin-linked table built from §2 of this file. The Rabby, LI.FI and Tokenbound source-code rows may stay as secondary evidence | this file |
| T1 | kb/81 §Typography | Add **`amount-hero`**: Archivo wdth 100, wght 600, 44/48 on mobile → 56/60 at ≥ 1024, −0.02em, `tabular-nums slashed-zero`. The ticker suffix is 16/22, wght 500, `--fg-2`, baseline-aligned. Step down to 36/40, then 28/32, instead of wrapping | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Cash App](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332), [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) |
| T2 | kb/81 §Typography | Add **`micro`**: JetBrains Mono 500, 12/16, +0.06em, UPPER, `--fg-muted` (≥ 5.35:1 on every surface). Used for field labels ("TO", "NETWORK FEE"), Activity day headers ("TODAY"), the QR caption and "INCOMING". It keeps `engrave` within the one-line-per-view rule | [OpenSea web flow](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9), [Solflare home](https://mobbin.com/screens/a3d0efac-4e63-409e-a55b-96ae6589e1ae), [Coinbase Wallet](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) |
| T3 | kb/81 §Typography rules (full addresses) | In `grouped` mode, the **first and last group** use `--fg` 600 and the middle groups `--fg-2` 450 (≥ 8.06:1). Copying still yields the raw address | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Kraken web](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868) |
| T4 | kb/81 §Status (UI feedback) | Add usage rules. `--info` is for Signing, In mempool and Pending (ring or paper-plane glyph). The `--success` ✓ is only for Confirmed and Received. Failed amounts use `--fg-muted` + `line-through` + the word "Failed". Chips appear only for non-final states | [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3), [Coinbase Wallet](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de); anti-pattern [World App](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81) |
| T5 | kb/81 §Spacing, layout, breakpoints, layers | Add `--flow-width: 480px` for full-page flows at ≥ 640. Add the **pinned action bar** on mobile: 16 px gutters, a 48 px button, `padding-bottom: max(16px, env(safe-area-inset-bottom))`, and a 24 px `--bg` fade above. Add the **pending pill**: 36 px, sticky layer 40, and its height added to `scroll-padding-top` while visible (WCAG 2.4.11) | [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4), [Uniswap](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978) |
| T6 | kb/81 §Radii (new row "QR plate") and §Card glass | QR plate: `#FFFFFF`, radius 16 (`--radius-xl`), quiet zone ≥ 4 modules (≥ 16 px at 240 px), ECC M, dark modules only, no logo. The plate sits inside an alloy-gradient frame, or `--surface-2` (Open question 3). Text in the frame follows the glass/scrim rule | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Solflare](https://mobbin.com/screens/cab7112b-0cdb-4135-a50e-072424e0ab69), [World App](https://mobbin.com/screens/acbf2ab3-ecb1-4cba-aa5d-dc66c50e7ce5) |

---

## 6. Open questions for the design lead

1. **Home on mobile.** Choose between:
   - the Apple Wallet **stack** with 76 px bands (recommended: it is distinctive and shows the alloys);
   - Revolut-style **rows with `sm` card thumbnails**, which are denser and the cheapest to build;
   - kb/80's single-column grid of `md` cards.
2. **Amount hero alignment.** Centred (recommended; 6 of the 7 amount-hero references) or Phantom's left-aligned hero? Use the same choice on Send and Review.
3. **QR card frame on Receive.** The token's alloy gradient (a Gemini-style identity moment; recommended), or neutral `--surface-2` (Solflare)?
4. **Warning-tier acknowledgement.** Do the checkbox on Review (Family web) only for the warning tier (recommended), never, or for every first-time address? Nearly every Satchel send goes to a first-time address, so gating all of them adds friction to every send.
5. **H-19, if modals return.** A right drawer that keeps the sticky card visible (recommended, OpenSea), or a centred Dialog (Coinbase web, kb/80 today)?
6. **Activity merge.** Should one user action produce one row, with the signature event and the chain tx merged? This depends on the clean-history checker's record-to-tx match [ASSUMED; web/sec].
7. **Live "Incoming" block on Receive.** Is it P1? It reuses the 15 s balance poll, and it is the visible payoff of the demo's "fund" beat.
8. **Glyph for "Sent, not yet confirmed".** An `--info` ring, a paper plane, or Coinbase Wallet's animated three dots (static under reduced motion)?
9. **Share on Receive.** Show it only where `navigator.share` exists (recommended), or always with a copy-link fallback?
10. **Identity tint.** Keep silver primary buttons with the alloy only on the card, the swatches and the glow (recommended)? The alternative is Rainbow-style tinted actions ([Rainbow](https://mobbin.com/screens/d7c9913f-73b5-4684-b9ad-5e0adfdbe38d), [purple variant](https://mobbin.com/screens/5ff84636-17c3-49fe-8ed7-4f7138c61351)); this is kb/81 Open question 3.

---

## Appendix A. Mobbin AI usage notice (verbatim, as returned with the results)

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)

## Appendix B. Search log and coverage

Every call passed `output_destination: "doc"` and the shared `task_intent`. No call failed.

| # | Tool · platform | Query |
|---|---|---|
| 1 | screens · ios | Phantom wallet home screen |
| 2 | screens · ios | crypto wallet home screen with token balances list |
| 3 | screens · ios | wallet switcher list of multiple wallets with balances |
| 4 | screens · ios | stack of payment cards wallet screen |
| 5 | screens · web | crypto wallet portfolio dashboard with assets list |
| 6 | screens · ios | Rainbow wallet home screen |
| 7 | screens · ios | receive crypto screen with QR code and wallet address |
| 8 | screens · ios | Cash App Bitcoin deposit address screen |
| 9 | screens · ios | token detail screen with balance, send and receive buttons and recent activity |
| 10 | screens · ios | send crypto amount entry screen with numeric keypad and max button |
| 11 | screens · ios | send to recipient address input screen with paste and scan QR |
| 12 | screens · ios | invalid wallet address error message on send screen |
| 13 | screens · ios | Phantom send confirmation screen before sending |
| 14 | screens · ios | crypto send review screen with network fee and recipient address (excluding 4 of the orchestrator's pre-run ids) |
| 15 | flows · ios | send crypto to an external wallet address |
| 16 | screens · ios | crypto transaction submitted pending screen with view on explorer link |
| 17 | screens · ios | Wise transfer status tracking timeline |
| 18 | screens · ios | crypto sent successfully confirmation screen |
| 19 | screens · ios | crypto transaction failed screen with try again button |
| 20 | screens · web | bridge transfer in progress screen with estimated time remaining |
| 21 | screens · ios | crypto wallet activity transaction history list with pending and failed statuses |
| 22 | screens · ios | Phantom activity screen |
| 23 | screens · web | crypto wallet transaction history page |
| 24 | screens · web | Phantom web wallet portfolio page |
| 25 | flows · web | send crypto from wallet |
| 26 | screens · ios | pending transaction with speed up and cancel options |
| 27 | screens · web | receive crypto deposit address page with QR code |
| 28 | screens · ios | wallet home screen showing a pending transaction in progress |
| 29 | screens · ios | Zerion wallet home screen |
| 30 | screens · ios | Revolut card details screen showing card number and copy |

**Coverage notes**
- **Not indexed.** The targeted **Zerion** (#29) and **Phantom web** (#24) queries returned no screens from those apps; Mobbin returned other wallets. Rabby was not queried. Phantom iOS, Rainbow, Family (iOS and web), Coinbase Wallet, Cash App, Wise, Revolut, Apple Wallet, Uniswap, Kraken, OpenSea web and Mercury were all available.
- **No crypto speed-up or cancel screens surfaced** (#26). The `signed_not_sent` guidance therefore rests on pending-state patterns (Posh, Cash App, Revolut) plus kb/80's Rabby source strings.
- **Orchestrator pre-run screens.** I re-viewed two of the six: [Trust Wallet: confirm send](https://mobbin.com/screens/557c35d8-3669-4459-833c-e5bfdf82864a) and [Coinbase Wallet: send Bitcoin review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636).
  - I excluded the other four from my query and did not open them: [Binance: confirm order](https://mobbin.com/screens/db892afa-11bb-4141-a384-efaae242b8a2), [Base: order preview](https://mobbin.com/screens/dc5865e4-a92a-477a-a7b7-f819fae68166), [Fuse: review](https://mobbin.com/screens/24550378-619c-4a21-b382-d56e464a96ff) and [Kraken: send summary](https://mobbin.com/screens/91b03072-6b23-4981-8db6-59f370cb0465).
  - The orchestrator's summary of them (centred hero, grouped rows, irreversibility callout, pinned button) matches convention 4.
- **Discarded as generic or low-craft**, even though returned: Buddy, Satispay, Ubank, Starbucks, Shop, State Farm, Uber, Airwallex, talabat, Stake, Vivid, Copilot, Up, Tripadvisor, Lightyear, Origin, Employment Hero, Relume, Dropbox, AWS and Remote. Binance, OKX and Crypto.com dense lists are cited only for single details or as anti-patterns.
