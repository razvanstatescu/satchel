# UX references: the Satchel object, collection and marketplace

> Area `ux-nft` · Checked: 2026-10-21 (Phase 0) · Feeds `kb/80-ux-spec.md` and `kb/81-design-tokens.md`. A synthesizer merges this file; it edits neither doc.
> **Source:** Mobbin only, through the `claude_ai_Mobbin` tools. 30 searches: 21 screen searches, 8 flow searches and 1 website-section search (22 iOS, 7 web, 1 sections). The last search re-checked one ID. Every pattern below was read from the returned images, not from metadata. Links go to Mobbin pages; no images are stored in the repo.
> **Hard constraints beat references.** The rules below come from `kb/90` and `plan/decisions.md`. Where a reference conflicts with them, this file says so.
> - No post-listing buy cooldown. The only wait is a 250-block quiet period before `list` (D-05 rev 2, E-37).
> - No approvals and no `nft_transfer_call` (D-07).
> - The price is exact, and the buy is bound to `(listing_id, expected_sig_count)`. There are no offers, auctions, royalties or listing expiry (D-14).
> - Transfer copy follows E-36. The receiver guard is R-18. A transfer during signing gets a soft guard only (D-08).

## 1. Summary: the 8 patterns to adopt

1. **A fixed item-page stack.** The object comes first, then the title, owner, mono metadata chips and a labelled stats strip. Next comes a role-aware action panel, then the tabs. The owner sees the live listing and its undo in the same panel. Refs: [OpenSea: item page, visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [OpenSea: item page, owner with live listing](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Family: "Owned by You"](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c).
2. **No numbers on metal.** The card face carries identity only: serial, status, chain marks, and the owner and mint date as an engraving. Balances live in labelled tiles directly under the card. Refs: [Apple Wallet: Apple Card detail](https://mobbin.com/screens/4906fdaa-42f6-416f-be4d-dd75e5a61c6a), [Revolut: card details](https://mobbin.com/screens/97998372-fc15-4fde-82a3-c1afa10991b0), [Blackbird: membership card](https://mobbin.com/screens/16bc9d96-d4f5-4c14-8d64-23314b632277).
3. **"Listed" is a visible mode, not a hidden state.** It shows as a line in the action panel plus an owner banner on every tab: "For sale at 250.00 USDC. Sending and transfers are paused." Refs: [StockX: placing an ask (ends on "Your Current Ask Is…")](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [StockX: vacation mode banner](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c), [OpenSea: owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0).
4. **Selling runs in a fixed order:** readiness checklist, price, a bold "You receive", consequences, then one button. The quiet period is a checklist row, with the countdown inside a sentence. Refs: [Vestiaire: listing checklist](https://mobbin.com/flows/af2aced0-b3e0-4894-ad95-079d050b1de2), [StockX: place ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal: review and sell](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0), [Wealthfront: review your sale](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b), [American Airlines: "Boards in 17 minutes"](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb).
5. **Clean history is a report, and badges only point to it.** The verdict, count, check time and sources come first. Below them sits one expandable row per signature, each with evidence and a status word. Refs: [Uber: account checkup](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [Chime: security center](https://mobbin.com/screens/11d18401-3658-454a-8275-b1352bc0d139), [CRED: status tags](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f), [Grailed: "Authenticated"](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d), [Airtasker: "Verified on {date}"](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468).
6. **Checkout keeps the object and the verdict next to the button.** Wallet steps and errors show as inline rows. A listing that changed mid-checkout gets an old → new interstitial. Refs: [OpenSea: buy an item](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710), [Reddit: collectible checkout](https://mobbin.com/screens/c5c3a7d7-14a6-4f7d-90bf-4031bb60c464), [Crypto.com: sticky buy bar](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71), [Uniswap: buying an NFT](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc).
7. **A handoff ends with the object landing on its new owner.** One sentence states the outcome, with the explorer proof beside it. Refs: [Family: sending a collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek: overlapping avatars](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [Solflare: success with tx ID and explorer](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [Cash App: "You sold…"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75).
8. **Collections feel like a wallet; the market reads like a set of instruments.**
   - Home on mobile is an Apple Wallet stack.
   - Market cards are hairline cards with a 3-stat row and a verdict footer.
   - The landing page shows the alloy family as a fan.

   Refs: [Apple Wallet: stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6), [GOAT: grid](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [OpenSea: collection grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297), [Slash: fan of metal cards](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2).

---

## 2. Per Satchel screen and component

### 2.1 Satchel page `/s/[id]`: the NFT detail page as a wallet
kb/80 sections affected: §Satchel page layout, §Judge-first view, W1, the Desktop wireframe and §Role × status matrix.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [OpenSea: item page, visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) | Dark two-column overlay. Art on the left. On the right: H1 "Pudgy Penguin #102"; collection chip with a verified tick; "Owned by 0x2233…20a6"; boxed mono chips `ERC721` `ETHEREUM` `TOKEN #102`. A bordered stats strip follows (TOP OFFER / COLLECTION FLOOR / RARITY / LAST SALE), with small uppercase labels over bold values. Then "BUY FOR **$45.1K** · ENDING IN 4 WEEKS", a blue **Buy now** with a ghost **Make offer**, and tabs Details / Orders / Activity | The 2025 redesign has the clearest hierarchy in the category. Every number has a label, and the CTA sits directly under the price it acts on |
| [OpenSea: item page, owner with a live listing](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) | Same page for the owner. "Buy \| Sell" segmented control, **List 1 for sale** and **Send**, then a mono line "1 LISTED FOR $0.32 ($0.32) · ENDING IN 4W" with a red-tinted **Cancel**. Below: accordions for Traits, Price history, About and Blockchain details | The panel is role-aware. The live listing and its undo sit together, and nothing about the listing is hidden in another tab |
| [Family: object-first view](https://mobbin.com/screens/5dfda00f-9872-4c91-8f3f-99ce969be2d8) → [Family: "Owned by You"](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c) | The first view is the object alone: art, name and collection on a warm field, with a pull-up handle; neighbouring collectibles peek at the screen edges. Pulled up, it shows Last Sale and Floor Price (skeleton pills while loading), a centred pill "Owned by ● You", Description, and one pinned **Send**. Further down the same detail flow is an "ADDITIONAL INFO" list (Contract, Token ID, Chain, Token Standard, each with a leading icon). It ends with a data note: "We use publicly available data from the blockchain…" | Calm and object-first, with one primary verb. Loading is honest, and the data source is stated |
| [Glow: collectible detail](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e) | Key/value rows "Owner 4zdNG…zjxue" and "Mint Address 8c38n…hZ5zr", with mono values right-aligned. The collection is a tappable row card ("Critters Cult · 5,553 Items ›") | The cleanest mono facts list in the set: it scans like a spec sheet |
| [Rainbow: NFT detail, tinted](https://mobbin.com/screens/c7a739d6-f56b-4910-9577-ab3acf241bb6) + [Rainbow: overflow menu](https://mobbin.com/screens/a81b1003-2279-4463-ae14-eca55cdfe9d8) | The sheet background and the primary button take the artwork's own colour (dark green → pale green "View on OpenSea"). The "⋯" menu holds Save to Photos, "Copy Token ID" with the ID previewed, "View on Web · rainbow.me", "View on Etherscan" and "View on Marketplace…" | A tasteful per-object identity colour, and one consistent place for every verification link, each previewing its value |
| [Crypto.com: NFT detail with sticky buy bar](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) | Pinned bottom bar: "Price $1 USD" on the left, **Buy Now** on the right, and a one-line footnote under both | The standard mobile purchase affordance, with the disclosure kept next to the action. Its footnote also has a "10%%" typo, a reminder to QA money strings |

**What to borrow**
- **Anatomy order** (OpenSea, Family). From the top:
  1. Mono metadata chips.
  2. H1. Visitors see "This NFT is a wallet."; the owner sees "Satchel #1".
  3. Sub, for visitors only.
  4. Card and holdings tiles (§2.2).
  5. Owner pill.
  6. Stats strip (desktop) or chips (mobile).
  7. Role-aware action panel.
  8. NavTabs and tab content.
- **Mono chips** in place of the engraved eyebrow: `NEP-171` `NEAR TESTNET` `TOKEN #1` `PATINA`. They read as crypto-native, and give AI judges structured facts in plain HTML.
- **Owner pill** (Family): AccountAvatar plus "Owned by alice.testnet", or "Owned by you" for the owner.
- **Stats strip** (OpenSea), desktop only. It uses 12 px uppercase labels over bold tabular values: `SIGNATURES 4` (from `sig_count`) · `STATUS Active` · `LISTED FOR 250.00 USDC` (or `LAST SALE`) · `MINTED Nov 10`.
- **Overflow menu "⋯"** beside the H1 (Rainbow). It holds:
  - Copy token ID (value previewed);
  - Contract facts (links to `/contract`);
  - View on NearBlocks;
  - Copy link;
  - Share on X.
- **Facts `<dl>`** (Glow, Family) as key/value rows: icon, label in `--fg-2`, and the value in mono, right-aligned, with Copy. It ends with Family's data-source line, reusing `wallet.fresh`: "Read from each chain {relative}."
- **Mobile sticky action bar** (Crypto.com, Grailed, Family, and OKX's "Transfer | Sell" bar in [OKX: selling an NFT](https://mobbin.com/flows/ce8e4ab3-bb58-4275-bde4-92ef41ac6ae8)). This is an action bar, not navigation, so kb/80's "no bottom nav" stays true:

| Viewer · status | Bar content |
|---|---|
| Owner · Active / Signing | **Send** (metal) · **Fund** · **⋯** (Transfer, Sell) |
| Owner · For sale | "Listed for 250.00 USDC" · **Delist** |
| Visitor (connected or not) · For sale | "250.00 USDC" + **Buy**; footnote "Clean history · checked 8 s ago" |
| Visitor · not for sale | **Fund this Satchel** (secondary) |

- **Ambient tint** (Rainbow): a radial glow of the Satchel's identity accent behind the card at 10–12%, and the tab indicator in the accent. Keep silver CTAs (kb/81 Open question 3).
- **Optional craft detail.** Two references are worth borrowing from here:
  - [Fanatics Live: "THE 10"](https://mobbin.com/screens/a5bdb78d-ce91-4563-afff-d11410cd1fc7) frames its card with hairline rules and corner ticks on black, with gold type and a solid "UNCLAIMED" status tag under the title. On desktop, hairline display-case rules around the hero card fit "dark and metallic" without adding gradients.
  - [(Not Boring) Calculator: skin detail](https://mobbin.com/screens/a4b78eac-90b5-4508-9ec4-88271a557880) pairs a mono serial ("SKN×002") and a "RARE" pill with a one-line material story: "THE MATERIAL OF WORK…". That is a model for alloy captions (Open question 10).

**Satchel mapping, mobile 390 px** (replaces W1 above the fold):
```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]        [Connect wallet] │ 56 TopBar
│ [NEP-171] [TOKEN #1] [PATINA]             ⋯  │ mono chips (OpenSea) + overflow (Rainbow)
│ This NFT is a wallet.                        │ display 30/34
│ Satchel #1 controls the Bitcoin and Ethereum │ body 15/22, visitors only
│ addresses below. Whoever owns the NFT can    │
│ move the coins.                              │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0001                [● Active] │ │ card lg 358×226, no numbers (§2.2)
│ │              (Patina alloy)              │ │
│ │ ALICE.TESTNET · MINTED 11.10.26     ₿  Ξ │ │
│ ╰──────────────────────────────────────────╯ │
│ ┌ BITCOIN TESTNET4 ───┐ ┌ ETHEREUM SEPOLIA ┐ │ holdings tiles (Apple Card "Card Balance")
│ │ 0.0123 BTC          │ │ 0.0500 ETH       │ │ amount 28/32, ticker as a 15 px suffix
│ │ tb1qaa…y8sd    ↗    │ │ 0x53f9…1C2A   ↗  │ │ mono 13/18 + explorer link
│ └─────────────────────┘ └──────────────────┘ │ ≈ 600 px: above the fold (W1 reached ≈ 638)
│ Read from each chain 12 s ago.               │ caption
│ (◉ Owned by alice.testnet) · 4 signatures    │ owner pill (Family)
│  Wallet   Activity                           │ NavTabs
├──────────────────────────────────────────────┤
│ [          Fund this Satchel           ]     │ sticky action bar (role-aware)
└──────────────────────────────────────────────┘
```
If an amount can't fit a half-width tile (for example 8-decimal BTC), the tiles fall back to full-width rows, using the same component as ChainRow.

**Desktop (≥ 1024 px).**
- The left 5 columns stay sticky and hold the card `lg` with the holdings tiles under it, like Apple Card's tiles.
- The right 7 columns hold the chips and ⋯, the H1 and sub, the owner pill, the stats strip, the **action panel** and the NavTabs.
- Change from kb/80: the ActionBar moves from the sticky left panel into the right column, under the stats strip, as on OpenSea. The action then sits next to the status, price and listing text it depends on, and the reading order becomes title → facts → action. This is a design-lead decision (Open question 3).

### 2.2 SatchelCard and holdings tiles
kb/80 sections affected: §SatchelCard (Front, Back, States) and Motion "Card flip". kb/81 section affected: §Card glass and scrim.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [Apple Wallet: Apple Card detail](https://mobbin.com/screens/4906fdaa-42f6-416f-be4d-dd75e5a61c6a) | The card face is only material, the Apple logo and the network mark. A 2×2 tile grid sits below it: "Card Balance US$12.94 / US$11,337.06 Available", "Nothing to Pay" with a large check, and "Yearly Activity". Then "Latest Card Transactions"; a declined row shows the amount struck through, with "Declined – Expired Card" in red | The canonical "object above, numbers below" layout. Each tile pairs a label with a value, so numbers never sit on the material |
| [Revolut: card details revealed](https://mobbin.com/screens/97998372-fc15-4fde-82a3-c1afa10991b0) + [Revolut: copied toast](https://mobbin.com/screens/74f597f0-182b-4bd5-b5ed-497a7e6e4eb0) | "Show details" swaps the face content in place, with no flip: "Card number ••• ⧉", "Expiry date 02/30", "CVV ••• ⧉". A "Virtual" pill sits top-right. Round **Hide details** and **Settings** buttons sit under the card, and copying shows a toast "Card number copied" | Each value is copyable, and the toggle is a labelled button outside the card. There is no 3D trick to make accessible |
| [Blackbird: membership card](https://mobbin.com/screens/16bc9d96-d4f5-4c14-8d64-23314b632277) | NFT membership card with the owner name "SAM LEE" and "MINTED: 04.29.25" in small mono caps at the bottom left, and one big numeral "00 VISITS" at the bottom right. **Details** (outline) and **Visit** (filled) sit under the card | An NFT that hides crypto jargon. The engraving-style type makes the card personal, as a membership object should be |
| [Altitude: card hero](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68) | A black card with a fine dot-matrix mountain texture, the logo top-left and "VISA Signature Corporate" top-right | Texture, not text, carries the craft. This backs kb/81's brushed texture over extra gradients |

**What to borrow**
- **Face layout** (all sizes):
  - Serial `SATCHEL № 0001` top-left, engraved, on the scrim.
  - StatusPill top-right, on glass, in Revolut's "Virtual" position.
  - Owner and mint engraving bottom-left: `ALICE.TESTNET · MINTED 11.10.26`, mono caps 12 px, on the scrim (Blackbird).
  - Chain marks ₿ Ξ (◎ in P2) bottom-right in the `-fg` tints, in Apple Card's network-mark position.
  - **No balances on the face.** The `lg` card gets holdings tiles under it; the `md` card gets a 3-stat caption row (§2.8).
- Why this is worth the change:
  - The static P1 NFT media (`/api/card/[id].svg`), the OG image, the page and the market all show the **same artwork**, with no stale numbers in wallets. That settles kb/80 Open question 7 toward "no balances in the SVG".
  - The balances are no longer duplicated on the card plate and in the ChainRows.
  - Only the pill needs glass. The scrim (white text only, 6.33:1) covers the rest.
- **Address reveal.** Cut the 3D flip for P1, because the Wallet-tab rows already provide address, Copy, QR and explorer. If it comes back in P2, use Revolut's in-place swap: a labelled button under the card, truncated addresses with inline Copy, and a toast naming what was copied.
- **States.**
  - Sold, in the seller's history: greyscale plus a `SOLD` tag. Precedent: [OpenSea: listing canceled](https://mobbin.com/screens/28b27959-e7b9-420c-b66a-4eba63243edf) shows the art in greyscale.
  - New: a `NEW` tag for 24 h after a mint, buy or receive (OKX, §2.3).

### 2.3 Home `/`: landing, and the collection of owned Satchels
kb/80 section affected: §Home.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [Apple Wallet: card stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) | Large title "Wallet" with +, search and ⋯. Cards overlap so that each shows only its top strip (issuer logo left, product name right). Apple Cash shows its balance at the right of its strip | The definitive wallet metaphor: dense, still easy to tap, and identity is clear at a glance |
| [Apple Wallet: card lifted, "Done"](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3) | One card rises to the top while the rest collapse into a peek at the bottom. A blue circled check and "Done" sit under the card | Restraint: the card is the hero of every state, even success |
| [Family: collectibles grouped](https://mobbin.com/screens/3ce2270d-b9f9-40c0-abc8-a07ea424a963) in [Family: Collectibles flow](https://mobbin.com/flows/ee1f0070-51c5-40de-a818-6b681e740353) | Collection header rows with a count and chevron, large tiles, and a tap through to the object view, which pages horizontally between items | Generous, calm and object-first |
| [OKX: NFTs grid with "New"](https://mobbin.com/screens/871cff2c-23a3-4349-967d-63ed7ca98ec7) | A red "New" tag on the freshly received NFT, with "Recently received ▾" sort and grid/list toggles | Makes arrivals legible, which matters after a buy or gift |
| [Coinbase Wallet: NFTs empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) | Dark page, filters, and one large pill CTA "Find more NFTs to collect" | An empty state that is one decision, not an illustration |
| [Slash: fan of metal cards](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) · [Slash: silver pill CTA and legal note](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) · [Altitude: card variants](https://mobbin.com/sites/sections/57e26228-53f2-4a69-ab19-b1ce00d4a374) | Slash: serif H1 "Corporate cards built for *complete control*" over an arc of cards in silver, gold, red, black and titanium. Its second hero pairs a light pill CTA with a dark one, and pins a small dismissible note: "Slash is a financial technology company, not a bank…". Altitude: one row of card variants under the H1 and CTA | The material is the brand, which is Satchel's "alloy family" idea exactly. The legal note shows how to carry a disclaimer without shouting |

**Satchel mapping**
- **Landing (not connected).**
  - Above the fold: H1 "An NFT that is a wallet." over a fan of the seven demo Satchels, #1 Patina in front. The rest are Anodized, Electrum, Rose Gold, Anodized, Cobalt and Titanium, per the kb/80 test vectors.
  - CTAs: **See Satchel #1** (metal pill) and **Connect wallet** (ghost).
  - A persistent one-line note, as on Slash: "Testnet only. Coins here have no value."
  - The fan is static CSS transforms, so it is SSR-safe and reusable in the OG image. Under reduced motion it is a still.
- **My Satchels (connected).**
  - Mobile, 3 or more Satchels: a Wallet stack. Each strip is the card's own top row (serial + StatusPill), and a tap opens `/s/[id]`.
  - Mobile, 1 or 2 Satchels: full cards.
  - Desktop: a grid of `md` cards with a caption (serial · alloy, status, holdings line).
  - The `NEW` tag (OKX) shows for 24 h.
  - Accessibility: the stack is a `<ul>` of links named "Satchel #3, Electrum, For sale".
- **Empty:** "You don't own a Satchel yet", one metal CTA **Mint a Satchel**, and a text link "See Satchel #1". This follows Coinbase Wallet and [Family: "There's nothing here, yet"](https://mobbin.com/flows/123b684d-d3e3-4f94-aae5-24ea6f614503).

### 2.4 Mint `/mint`
kb/80 section affected: §Mint.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [Base: name claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) | The thing you get, a big pill with the name, is the hero. Under it, one claim bar: `CLAIM FOR − 1 year +` \| `AMOUNT 0.0001 ETH $0.18` \| **Connect wallet**. The caption reads "UNLOCK YOUR USERNAME FOR FREE! LEARN MORE" | The whole purchase fits in one line. Labels are micro-caps, and the CTA follows wallet state, so there is no separate guard page |
| [Portrait: claim modal](https://mobbin.com/screens/e6439f66-3611-4297-b816-ac2f8c174410) | "Claim 'alex-smith'. Your name is available. Here's what you'll unlock:" with three checked, concrete benefits. On the right: Network, Price with a currency select, terms, **Pay with 0.00272 ETH**, and "Logged in with 0xDEAF…f8B8 · Log out" | Concrete benefits, and the button names the amount |
| [Glow: creating a collectible](https://mobbin.com/flows/cbb0d761-28ed-49c4-a54a-66c897595776) | A placeholder card shape, Name, Traits and "Slide to Mint", then a quiet green top banner "Minted Coral palms" on the wallet home | A deliberate confirm and a quiet success |
| [Uniswap: buying an NFT (ends in "Complete!")](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) | The Pay button turns into "Proceed in wallet" with a spinner. A "Complete!" modal then shows the NFT large, "1 NFT 0.000 ETH" and **View on Etherscan** | Success shows the object plus on-chain proof |

**Satchel mapping**
- **Ready.** The gunmetal placeholder card is the hero. Under it, one bar:
  ```
  YOU GET Bitcoin + Ethereum addresses | DEPOSIT 0.02 NEAR · unused part refunded | [Mint a Satchel]
  ```
  The deposit is 0.02 NEAR, and the excess is refunded (kb/90 §5.7).
- **Not connected.** Same layout, but the bar's CTA reads **Connect wallet to mint**, as on Base. This replaces the separate guard screen.
- **"What you get" checklist** (Portrait): "Its own Bitcoin testnet4 address" · "Its own Ethereum Sepolia address" · "A finish set by its number" · "Only its owner can move the coins".
- **In flight.** The CTA narrates the wallet, as on Uniswap: "Approve in your wallet…", then "Minting…".
- **Success.**
  - The alloy is revealed in place: kb/80's 400 ms cross-fade, with the serial engraving in.
  - "Satchel #8 is yours." and "Minted in 8Fx…2k ↗".
  - **Fund this Satchel** (metal) and **Open Satchel #8**.
  - Toast "Minted Satchel #8"; Home shows `NEW`.
- **No slide-to-confirm on web.** Glow's slider is a native iOS idiom, and it fails keyboard users and WCAG 2.5.7.

### 2.5 Sale tab, owner "Sell": listing, live listing, delist, sold
kb/80 sections affected: §Sale tab owner and the copy keys `sell.*` and `freeze.*`. kb/90 sections: §5.7 `list`/`delist`, §5.12 and §7.6.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [Vestiaire Collective: listing an item](https://mobbin.com/flows/af2aced0-b3e0-4894-ad95-079d050b1de2) | The flow opens on "Sell with us: List → Sell → Ship → Get paid". Before review, a "1 step left" checklist (Details, Photos, Description, Address, Price, each with a green check) and "Review before submitting". The success screen shows "$300 (You earn: $291)" and "The buyer will also pay a $45 service fee." | A luxury resale app that makes readiness explicit and states both sides' money |
| [StockX: placing an ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4) | The input step: "Place Ask \| Sell Now" segmented control, a big "$ 300" input and the helper "You're about to be the Lowest Ask". Fee rows lead to a bold "Total (incl. taxes) $264.50", with "Payout Method: Not Active · EDIT" inline. Afterwards, the product page shows a tinted banner "Your Current Ask Is SGD 300 · Update ›" | Transparent payout, a prerequisite shown inline rather than as an error later, and a persistent banner for the live state |
| [StockX: selling](https://mobbin.com/flows/ce1936e2-0ea5-4dba-896f-cb684be15958) | The ask detail reads "Asking · Size 8 \| Condition New \| StockX Verified", then "Price Details" ending in a bold "Total Payout SGD 255.50", with **Update Ask** / **Sell Now** and a trash icon. The selling list has tabs Current / Pending / History | One place to see and manage the live ask |
| [OpenSea: listing an item](https://mobbin.com/flows/b7ae752a-e039-4519-be42-7053ee781067) · [OpenSea: Create listing](https://mobbin.com/screens/40ebeb13-de39-49c0-bf4f-fa0034720aca) | "Create listing" sheet: item row, "Total listing price", fee rows, and "Total est. proceeds 0.0001 ETH ($0.32)" with USD muted in parentheses. Then a read-only "Review listing" with the wallet step as a row, and the owner page showing the live listing line | Proceeds maths in one table, with the review and wallet step in the same surface |
| [Wealthfront: review your sale](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b) | "Funds should arrive Oct 26 - 27", then "By confirming, you understand that:" with three plain bullets, then the "Start sale" slider | Consequences in plain words right before the commit |
| [PayPal: review and sell](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0) | Rows ("You're selling", "Price", "Transaction fee ⓘ") ending in a bold "You'll receive $1.87" | The net amount is the one bold number |
| [StockX: vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c) | The dialog says exactly what stops: "You will be unable to update or place a new Ask while on vacation, but you can remove an Ask". A persistent red top banner reads "VACATION MODE IS ON" | A frozen mode that is always visible and says how to undo it, which is Satchel's "signing paused" |
| [OpenSea: canceling a listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) · [cancel sheet](https://mobbin.com/screens/f6a1eb62-b48e-4880-9d62-683da9aca845) · [canceled](https://mobbin.com/screens/28b27959-e7b9-420c-b66a-4eba63243edf) | One "Cancel listing" sheet: the listing row (price right), then an inline row "Approve order cancellation" with a spinner. Success shows the art in greyscale with "Listing successfully canceled". There is no separate "Are you sure?" | A reversible action gets one confirmation: the wallet itself |
| [American Airlines: live activity](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb) · [Grab: ETA with a track](https://mobbin.com/screens/1ac6149a-80a7-4ade-b9dd-1ce7aebdc073) | AA: "Your flight to Los Angeles · Boards in **17 minutes**", with the number in accent inside a sentence, plus a "DELAYED" tag. Grab: "Arriving 8:15 - 8:30 PM · On time" over a track with a moving marker | A wait shown as a calm sentence plus a track, not a red timer |

**Satchel mapping: Sell tab, owner, Active** (replaces kb/80's "Ready", "Blocked: pending" and "Blocked: unused signature")
```
Sell Satchel #3
READY TO LIST                                              ← checklist (Vestiaire, Uber rows)
 ✓ No signature in progress
 ◷ You can list in 143 blocks (~1 min 20 s)               ← countdown inside the sentence (AA)
   ▰▰▰▰▰▰▰▱▱▱▱▱   107 of 250 blocks                        ← thin track (Grab), role=progressbar
 ✓ Clean history: 4 of 4 signatures settled                ← pre-list check (kb/90 §7.6); ✕ → "How to settle"
 ! USDC payouts not set up · Register (0.00125 NEAR)       ← only when USDC is chosen (StockX "Payout Method")
PRICE
 ( USDC | NEAR )                                           ← segmented control (StockX)
 [ 250.00                                      USDC ]      ← amount-xl input
 Buyer gets 0.0123 BTC and 0.0500 ETH.                     ← helper line (StockX "You're about to be…")
 Price                                      250.00 USDC
 Satchel fee                                       none
 Deposit                0.01 NEAR · unused part refunded
 You receive                                250.00 USDC    ← bold (PayPal, StockX "Total Payout")
 Paid to alice.testnet in the same transaction as the sale.
WHILE IT'S LISTED                                          ← consequences (Wealthfront, StockX vacation dialog)
 · You can't send from Satchel #3 or transfer it.
 · Anyone can buy it at exactly 250.00 USDC, right away.
 · The buyer gets everything in it.
 · You can delist at any time.
[            List for 250.00 USDC            ]             ← disabled until every row is ✓
```
- **Remove (D-14):** the duration and expiry selector, "reserve for a buyer", floor quick-set buttons, fee toggles and "Lower price/Edit". To change the price, the owner delists and lists again, which gives a new `listing_id`. Say so in a helper on the listed state.
- **Single step.** Listing is reversible (delist), and the form already summarises everything, so no separate Review screen is needed. WCAG 3.3.4 is met by reversibility, and the button names the price.
- **In flight.** The CTA reads "Approve in your wallet…", then "Listing…". A wallet rejection shows an inline row, not a modal: "You cancelled in your wallet. Nothing changed. **Try again**". OpenSea renders this as "Rejected · Error · Retry" in [Make an item offer](https://mobbin.com/flows/bd4aa81c-fc3d-4230-ad6b-d95af90b83f8).
- **Listed (owner).**
  - The StatusPill reads **For sale**.
  - The action panel shows `LISTED FOR 250.00 USDC · LISTING #7` (mono caps) and **Delist**.
  - A banner on every Satchel tab (StockX) reads "For sale at 250.00 USDC. Sending and transfers are paused." with **Delist**.
  - No countdown (E-37).
- **Delist.** One sheet, as on OpenSea:
  1. Title "Delist Satchel #3", then the listing row (LISTING #7 · 250.00 USDC).
  2. "Buyers can't buy it anymore. Sending and transfers resume right away."
  3. **Delist**, then an inline wallet row.
  4. Toast "Delisted. Signing resumed."

  Drop kb/80's AlertDialog (`sell.delist.confirm`).
- **Sold (seller).** The sentence is the hero, as on [Cash App: "You sold…"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75):
  - "You sold Satchel #3 to carol.testnet for 250.00 USDC." and "250.00 USDC arrived in your NEAR account."
  - Receipt rows, as on [Revolut: order executed](https://mobbin.com/screens/26da4623-eb14-46ff-91fc-9b70e147a2a4): Price · Buyer · Paid · Transaction ↗.
  - If the `payout` event has `ok:false`, show "250.00 USDC is waiting for you." with **Withdraw** (`withdraw_proceeds`, kb/90 §5.7).
  - The seller's card turns greyscale with a `SOLD` tag.

### 2.6 Sale tab, visitor "Buy": price, verdict, buy, handoff
kb/80 sections affected: §Sale tab visitor and W3. kb/90 sections: §5.12, §7.3 and §7.5.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [OpenSea: buy an item](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) | Checkout sheet. The left side is the order summary: the item row with a "⚠ Price changed" tag and "Total 14.449 ETH / $45.2K". The right side is "PAYMENT": "MetaMask 0xDEAF…fB8B · Connected" and "Change payment method", with inline status rows ("⊖ Insufficient funds · Error · Retry"). A "Price has changed" dialog reads "changed from 14.473 ETH to 14.449 ETH — a −0.17% change. Are you sure you want to continue?" with **No, Go Back** / **Yes, I'm Sure** | Races are surfaced with the old and new values, and errors appear where they happen |
| [Reddit: collectible avatar checkout](https://mobbin.com/screens/c5c3a7d7-14a6-4f7d-90bf-4031bb60c464) ([full purchase flow](https://mobbin.com/flows/3c28c1bd-8515-47c4-bc21-fd4c8392af3b)) | The card stays on a gradient panel on the left for the whole purchase. The right side has "View on Explorer", "View on IPFS" and "IPFS Metadata" as quiet verification buttons, "$2.49 · 3401 of 5000 left", **Buy Now** and "By buying, you agree to our Previews Terms." | A mainstream NFT checkout that still exposes on-chain verification, and the object never leaves the screen |
| [Grailed: Authenticated + Purchase Protection](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d) | "Authenticated: This item has been authenticated by our in-house team or a trusted partner. Learn More." A "Purchase Protection" card has a "How You're Protected" disclosure; sticky **OFFER** / **BUY NOW** | Trust stated as who checked and how, plus a link |
| [eBay: Authenticity Guarantee](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61) | Four icon steps: Make a purchase → Seller ships to eBay → Experts authenticate → eBay ships to you | A process strip explains the guarantee without prose |
| [Uniswap: buying an NFT](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) | The button narrates the wallet ("Proceed in wallet" with a spinner). "Complete!" shows the NFT large with **View on Etherscan** | Status lives where the eye already is |

**Satchel mapping** (replaces W3; desktop puts this in the right column, mobile below the card)
```
BUY FOR                                                    label 12 caps
250.00 USDC                                                amount-xl  (optional "≈ $X at mainnet prices", kb/80 Open question 1)
LISTING #7 · listed 4 min ago by alice.testnet             mono 12 --fg-muted
YOU GET
 0.0123 BTC · 0.0500 ETH        ◇ VERIFIED BALANCE · read 8 s ago
 0.0010 BTC excluded: an earlier signature can still spend it   ← only when an encumbered UTXO exists (kb/90 §7.3)
CLEAN HISTORY                                              ← report, §2.7
PAYMENT
 Paid in USDC. You have 312.40 USDC.                       ← fixed by the listing; see below
HOW BUYING WORKS  You pay → one transaction moves Satchel #3 to you and pays alice.testnet → you control the coins   (eBay strip)
[            Buy for 250.00 USDC            ]
The contract doesn't run this check; this app does. How it's checked ›   (clean.disclosure)
```
- **Constraint fix.** Remove kb/80's "Pay with (USDC | NEAR)" toggle: the listing fixes the currency. `buy` accepts only a NEAR-priced listing, and `ft_on_transfer` refuses a NEAR-priced one with `ERR_CURRENCY` (kb/90 §5.7, D-14). The 1Click "Pay from any chain" path is cut (D-19).
- **Remove** the FreezeBanner countdown and "Available in {t}" (E-37). Buy is gated only by the browser clean-history check.
- **Mobile.** A sticky bar shows "250.00 USDC" and **Buy**, with the verdict footnote "Clean history · 4 of 4 settled · checked 8 s ago", as on Crypto.com. When Buy is disabled, the footnote becomes the reason ("Blocked: 1 unused signature") and is linked with `aria-describedby`.
- **Listing changed** (OpenSea). Re-read `satchel(id)` right before calling `buy`. If `listing.id` or `sig_count` changed, show the interstitial instead of a failed tx: "This listing changed. Listing #7 at 250.00 USDC was replaced by listing #8 at 240.00 USDC. Clean history runs again." with **Review new listing** / **Cancel**. If it was delisted: "alice.testnet delisted Satchel #3."
- **Insufficient funds.** An inline row in the payment block: "You have 120.00 USDC. You need 250.00 USDC." with "Get testnet USDC ↗".
- **Buying.** The button text changes in place: "Approve in your wallet…", then "Completing purchase…".
- **USDC refunded.** The tx's used amount was "0" (kb/90 §5.12), so show inline: "Not bought. Your 250.00 USDC was refunded."
- **Success.** The reverse handoff ends on: the card large, "Satchel #3 is yours.", "You now control 0.0123 BTC and 0.0500 ETH.", "Transaction 8Fx…2k ↗ ⧉" (Solflare, §2.9) and **Open your Satchel**. Home shows `NEW`.

### 2.7 CleanHistory report and Hallmark badges
kb/80 sections affected: §FreezeBanner · CleanHistory · Hallmark and the copy keys `clean.*` and `hallmark.*`. kb/90 sections: §7.3 and §7.7.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [Uber: account checkup](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549) | H1 "Account checkup" and a one-sentence intro. Each row has a green check icon, a bold item, an evidence line with the actual value ("+1 (650)…", "You have 1 passkey", "On") and an expand chevron | Every check shows its evidence, not just a tick. Calm list semantics |
| [Chime: Security Center](https://mobbin.com/screens/11d18401-3658-454a-8275-b1352bc0d139) | The aggregate comes first: a ring "100% · 2 of 2 Tasks" and "High security · You're in great shape! … Details". Then the checklist | Summary and count before detail |
| [CRED: vehicle checks](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f) | Each check (insurance, fastag, traffic challans, pollution check) carries an uppercase status tag (ACTIVE in green; ACTION PENDING and NEVER CHECKED in red) and a date. A dark panel has a mono "01/04" counter | Status as a word tag is scannable; premium dark craft |
| [Fuse: setup checks](https://mobbin.com/screens/3bcee124-038a-4643-b6a6-f63aeee63fec) | Device Key, 2FA Key and Recovery Key dim one by one as they complete, then "Your wallet is ready! You now have a safe place for your money." | A background check made legible as it runs |
| [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d) · [Airtasker: badges](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468) · [Faire: Top Shop](https://mobbin.com/screens/ec87cac6-9e39-45f1-ac0c-c285dfba70c2) | Grailed states who verified. Airtasker shows "Police Check · Verified on Wednesday, 3 May 2023". Faire's seal comes with its exact criteria ("…earned a 4.8+ rating over the last 12 months…") and Learn More | A badge earns trust only with its criteria and a time |

**Satchel mapping: CleanHistory report**
```
CLEAN HISTORY                                 CHECKED 8 S AGO · 2 OF 2 SOURCES
[CLEAN]  4 of 4 signatures can no longer move funds          ← verdict tag + sentence (Chime); role=status
 Ξ  Ethereum · nonce 3                               [SETTLED]  ↗   ← Uber row: item / evidence / tag
    Used by 0x8b…41 · 3 confirmations
 ₿  Bitcoin · coin 7d…e2:1                           [SETTLED]  ↗
    Spent in a1…9f · 1 confirmation
 ₿  Bitcoin · coin 3c…07:0                          [UNFUNDED]  ↗
    Spends a coin that doesn't exist. If it ever appears, it's excluded from what you buy.
 Ξ  Ethereum address has no delegated code                [OK]
 ◆  Contract has no keys and runs the published code      [OK]  ↗ /contract   (rc and final roles)
 Show all 6                                                     ← disclosure button
How Satchel checks this ›                                        ← kb/90 §7.7 disclosure text
```
- **Status words** (CRED-style tags; colour plus word, WCAG 1.4.1), per kb/90 §7.3:

| Tag | Colour | Blocks Buy? |
|---|---|---|
| `SETTLED` | success | no |
| `EXPIRED` | neutral | no |
| `UNFUNDED` | neutral | no (D-04) |
| `SETTLING` | warning | yes |
| `UNUSED` | danger | yes |
| `CAN'T VERIFY` | warning | yes |
| Aggregate `UNSAFE` | danger | yes |

  When policy H-25 applied, the header reads "1 OF 2 SOURCES".
- **Checking.** Rows tick only when their real result lands (Fuse). Never fake a stagger. The header reads "Checking 4 signatures…". Only the header announces (`role="status"`); the rows are a `<ul>`.
- **Hallmark** = a compressed pointer to the report: `◇ CLEAN HISTORY · checked 12 s ago`, linking to the report. The same applies to `◇ VERIFIED BALANCE · read 8 s ago`. A hallmark is never bare: it always carries the word, a time and a link (Airtasker, Grailed). Tooltip text comes from kb/90 §7.7.

### 2.8 Market `/market`
kb/80 sections affected: §Market and the MarketCard row of §Components › Inventory. kb/90: §8.1, blocking SSR.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [GOAT: Wants/Owns grid](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243) | Black page with hairline-bordered cards. Each card has a top meta row ("US M 7 · New", plus a small time chip), the product image, date and name. Under the name, a 3-column stat row (Best Price $238 \| Last Sold $289 \| Top Offer $33, grey labels over bold values), then a footer row "Your Offer $25" behind a hairline. Filter pills: Recently Added, Offers, Alerts, In Stock. Density toggle 2x/4x | The most instrument-like grid in the set: typographic, dense and dark, with every number labelled. It matches kb/81's "hairline, quiet graphite" principle |
| [OpenSea: collection grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297) | The header has mono chips and a stats row (FLOOR PRICE, 1D FLOOR %, TOP OFFER, 24H VOLUME…). Below: a status segmented control "All \| Listed \| Owned by you", active filter chips ("Listed ×", "Price: 1 - 100 ETH ×", "Clear") and "74 ITEMS". Each card: image, name + rarity chip, bold price, muted "Last sale" | Filter state is always visible, with a clear price hierarchy |
| [GOAT: filter chips](https://mobbin.com/screens/0702d092-cf96-405a-a8f3-57893597e546) · [GOAT: price presets](https://mobbin.com/screens/238c4a2f-a52a-4ee7-bcf5-a8b83956eda2) · [Uniswap: NFT explore](https://mobbin.com/screens/94c143d5-e346-4a74-8d44-9e0c25f35a62) | Selected chips invert to filled. Price presets come as buckets. Uniswap shows "Filter · 10 results", a sort control and removable chips with "Clear All" | Filtering that never hides its state |

**Satchel mapping: MarketCard and toolbar**
```
7 listed     [Buyable now] [Has BTC] [Has ETH]                  Sort: Newest ▾      ← one toolbar row, no sidebar
┌───────────────────────────────────┐   1 px --line, radius 12 (GOAT)
│ SATCHEL № 0003 · ELECTRUM [FOR SALE]│ engrave 12 + tag
│ ╭───────────────────────────────╮ │
│ │   card md 280×177, no numbers   │ │
│ ╰───────────────────────────────╯ │
│ PRICE         BTC         ETH       │ label 12 caps --fg-muted
│ 250.00 USDC   0.0123      0.0500    │ amount 15/20 tabular
│ ─────────────────────────────────── │ hairline --line-subtle
│ ◇ Clean history · checked 12 s ago › │ footer verdict (or ✕ Blocked: 1 unused signature / … Checking)
└───────────────────────────────────┘
```
- **Order:** buyable listings first, blocked listings last with their reason. Demo #4 is deliberately un-settleable (kb/90 §7.6), so it is the honest "Blocked" example in the video.
- **Remove** "Buyable in {t}" (E-37). Statuses are "Buyable now", "Blocked: {n} unused signature" and "Checking…".
- **SSR.** The footer verdict in server HTML is the cached hint (kb/90 §7.5), labelled with its real age. Only the Buy tab's browser check enables Buy.
- **Empty:** "Nothing is listed right now." plus a single **Mint a Satchel**.

### 2.9 Transfer `/s/[id]/transfer` and the handoff
kb/80 sections affected: §Transfer, W4 and §HandoffAnimation. kb/90: E-36, R-18 and D-08.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [Family: sending a collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52) | Inside a chat with "Alex.eth", the user picks the NFT from a Collectibles drawer (a check marks the selected art) and taps **Continue**. The NFT lands in the conversation as a large card bubble labelled "➤ Sent" with a check | The transfer shows as an object moving to a person, not as a hash. This is the closest real analogue to Satchel's handoff |
| [Uniswap: transfer to recipient](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112) | A recipient card ("alexsmithmobbin · 0 previous transfers"). A "New address" sheet: "You haven't transacted with this address before. Please confirm that the address is correct before continuing.", with the address split into chunks, then **Back** / **Confirm** | Identity and history at the moment of decision |
| [Gojek: money sent](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9) | A big check, "Money sent!", two overlapping avatars (sender and recipient), a dashed divider and "Amount sent" | From → to as one compact pair |
| [Solflare: send success](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) | Dark sheet with a check inside a chamfered square, "Success", and rows "Transaction ID ⧉" and "Explorer ↗" | Crypto-native proof inside the success state. The chamfered check echoes kb/80's assay-stamp hallmark |
| [Apple Wallet: "Done"](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3) · [Cash App: "You sold…"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75) · [Wise: "All sent"](https://mobbin.com/screens/e3c6bc82-2aa7-4cea-a6d6-619da43bf7d6) | Apple and Cash App: the object or the sentence is the whole screen. Wise: an expressive display word ("ALL SENT") with a friendly line ("Whoosh — we've let … know…") | The calibration is restraint, unless the brand voice is the point |

**Satchel mapping**
- **Recipient.**
  - AccountInput, then a recipient card: AccountAvatar, `bob.testnet` and "Account found · owns 0 Satchels" (NEP-181 `nft_supply_for_owner`; Uniswap's "0 previous transfers").
  - Blocked receivers:
    - a missing account (as today);
    - self;
    - the Satchel contract (R-18): "That's the Satchel contract. A Satchel sent there can never be used again.";
    - the MPC account (R-18): "That's NEAR's signer network. A Satchel sent there can never be used again."
- **Review** (E-36 copy):
  - Card `md` → arrow → recipient avatar.
  - "bob.testnet will control everything in this Satchel: 0.0123 BTC · 0.0500 ETH."
  - "Only the new owner will be able to sign. The signature history stays with the Satchel."
  - "This can't be undone. Only bob.testnet can transfer it back."
  - **Transfer to bob.testnet**.
  - Drop "Approvals are cleared." and the delegates line.
- **Signing in progress** (D-08: a soft guard, replacing kb/80's block): "A signature you requested is still in progress. If you transfer now, that transaction can still go out after bob.testnet owns this Satchel." with **Transfer anyway** / **Wait**.
- **Handoff end frame (F4).**
  - The card settles under bob's avatar with a `TRANSFERRED` tag, like Family's "Sent" label.
  - The two avatars overlap, as on Gojek, and the key takes bob's colour.
  - The sentence is the hero: "bob.testnet now controls 0.0123 BTC and 0.0500 ETH."
  - Proof row: "Transaction 4Hq…9z ⧉ ↗" (Solflare).
  - **View Satchel #1** and **Done**.
  - Optional engraved eyebrow `KEYS HANDED OVER`, a Wise-style brand moment (Open question 9). Keep the sentence first for screen readers.

### 2.10 Activity tab (the Satchel page tab; timeline detail is shared with the wallet researcher)
kb/80 sections affected: §Activity tab and §Timeline.

| Reference | What the screen shows (observed) | Why it is high quality |
|---|---|---|
| [OpenSea: activity with filter chips](https://mobbin.com/screens/421641ab-0589-4cbb-b91f-e8ae121d2208) | Chips All \| Sale \| Listing \| Item Offer \| Transfer \| Mint, over a table EVENT \| PRICE \| FROM \| TO \| TIME with ↗ on every row | One filterable ledger of the object's life |
| [Family: activity rows](https://mobbin.com/screens/23ed795a-80e2-4c77-8eaf-caa79d0fd60d) | Month groups. Each row has a small grey verb label ("Received from 0x8216…4fd7", "Approved for", "Minted") above a bold object, with a signed green amount or a status chip ("Fee Only", "N/A", "Unlimited") on the right | Two-line rows read like sentences |
| [Phantom: history](https://mobbin.com/screens/3e9a144f-5bb0-44ab-b961-5a290ff59c49) · [Trust Wallet: history footer](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) | Phantom: dark large title, filter chips and month groups. Trust Wallet: a footer "Can't find your transaction? Check explorer" | Best-in-class dark history, plus an honest escape hatch |

**Mapping**
- Chips: All · Signatures · Transfers · Sales · Deposits.
- Rows: the verb label ("Signature issued · Ethereum", "Transferred to", "Sold to") above a bold object. On the right, an amount or a tag. A signature row's tag (`SETTLED`/`UNUSED`) links to the same row in the Clean-history report.
- Footer: "Missing something? See every event on NearBlocks ↗".

---

## 3. Industry-standard conventions observed across apps
1. **Object first.** The media is followed by the title, the owner and then the numbers. Seen in OpenSea, Family, Rainbow, Glow and Uniswap.
2. **Web layout:** media on the left, info and action on the right. **Mobile layout:** one column with a pinned action bar. Seen in OpenSea web, Crypto.com, Grailed, OKX and Family.
3. **Labelled numbers.** A small grey or uppercase label sits above a bold tabular value. Seen in the OpenSea stats strip, GOAT stat rows, Base's claim bar and Apple Card tiles.
4. **Identifiers.** They are mono and middle-truncated, with Copy; the full value lives in a menu or a detail row. Seen in Glow, Family, Rainbow and Uniswap.
5. **Owner as an avatar pill.** It says "You" when the viewer owns the item. Seen in Family and OpenSea.
6. **Price block.** A label, a big number, then the secondary currency muted in parentheses. Seen in OpenSea ("BUY FOR $45.1K") and Uniswap.
7. **Seller money.** Line items lead to one bold net figure. Seen in StockX "Total Payout", PayPal "You'll receive", OpenSea "Total est. proceeds" and Vestiaire "You earn".
8. **Live listings stay visible.** The listing appears where the owner looks: a page line, and a banner for frozen modes. Seen in OpenSea and StockX.
9. **Wallet steps and errors stay inline.** They render in the same surface, and buttons narrate the wallet step. Seen in OpenSea ("Approve order cancellation", "Rejected · Retry") and Uniswap ("Proceed in wallet").
10. **Verification has four parts:** a word, its evidence, who checked and when, and a link. Seen in Uber, Grailed, Airtasker, Faire and eBay.
11. **Filters.** They are chips or segmented controls, with a result count, removable active chips and "Clear". Seen in OpenSea, GOAT, Uniswap and Phantom.
12. **Success.** The object, one sentence, a proof link and one primary action. Seen in Uniswap, Apple Wallet, Solflare, Cash App and Lloyds.
13. **Empty states:** one sentence and one CTA. Seen in Coinbase Wallet and Family.
14. **Copy feedback** is a short toast naming what was copied. Seen in Revolut ("Card number copied").
15. **Honest time ranges.** Seen in [Monzo: "It should arrive in 7 hours, but could take up to 3 working days."](https://mobbin.com/screens/874f2423-d24a-4385-ab24-7a114790cc15) and [Lloyds: "should be received within two hours"](https://mobbin.com/screens/2b966b9f-f6f5-461a-aa99-7c942a862619). This matches Satchel's "In mempool. Testnet4 confirmations are irregular: minutes to hours."

## 4. Anti-patterns to avoid
| Anti-pattern | Example | Why it hurts Satchel |
|---|---|---|
| Red urgency countdowns | [OpenSea iOS: listing ends "00 Hours 05 Minutes 36 Seconds"](https://mobbin.com/flows/7758d7b8-66ea-4ab6-8cd6-978446be2605); [Temu: "Pay now · ends in 59:08"](https://mobbin.com/screens/2ac4e73b-5110-47a0-bc26-8d49d5397b3e) | The quiet period is a safety gate, not a deadline. A red timer implies loss and pressure. Use AA's sentence plus a track |
| Badge soup and unverifiable claims | [Temu: store "Certification / Qualification Review / Quality Statement"](https://mobbin.com/screens/d1f4d565-0977-420d-bea0-372beb086857) | Clean history is the headline feature. A bare badge reads as marketing; show the time, sources and the report |
| Offers, edits and expiry on an exact-price, no-expiry listing | OpenSea "Make offer" ([visitor page](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c)); OKX "Lower price" ([selling flow](https://mobbin.com/flows/ce8e4ab3-bb58-4275-bde4-92ef41ac6ae8)); StockX "Ask Expiration" ([place ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4)) | D-14 has none of these. Inert controls teach the wrong model; say "delist and list again" instead |
| Approval steps | OpenSea's collection-approval step, as kb/80 §Reference patterns notes | D-07: no approvals. A two-step stepper with a fake approval would mislead |
| Fiat-first hero numbers | OpenSea "BUY FOR $45.1K" | Testnet coins have no value. Keep native amounts first and "≈ $X at mainnet prices" only (kb/80 D11) |
| Heavy filter sidebars for a tiny catalog | [Binance NFT: BAYC collection](https://mobbin.com/screens/dd1de53d-ce66-45f0-96a7-540257521228) | The market has around a dozen listings. A sidebar adds noise and build time |
| Habituating "Acknowledged" safety walls | [Binance: "Protect Your Assets On-Chain"](https://mobbin.com/flows/4d6db478-6145-4733-8bb5-eefd42483382) | Generic warnings get clicked through. Put the specific consequence in the review ("This can't be undone…") |
| Double confirmation for reversible actions | kb/80's own delist AlertDialog, followed by the wallet prompt; contrast [OpenSea: cancel listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) | The wallet prompt is the confirmation. Two in a row is friction |
| Illustration or confetti success screens | [Careem: transferred](https://mobbin.com/screens/f365fe09-0799-4cfd-87e2-fe4ac2f3a06a) | Off-brand for dark metallic. The card itself is the hero, and motion carries the emotion |
| Slide-to-confirm on web | [Glow](https://mobbin.com/flows/cbb0d761-28ed-49c4-a54a-66c897595776), [Wealthfront](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b) (both native iOS) | Fails keyboard users and needs a non-drag alternative (WCAG 2.5.7). Use a button that names the amount |
| Copy errors in money footnotes | [Crypto.com: "A 10%% royalty…"](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) | A typo next to a price undermines trust. QA every `{price}` string |

---

## 5. Concrete change list for kb/80 and kb/81
| # | Section | Change | References |
|---|---|---|---|
| 1 | kb/80 §Satchel page layout, W1, Desktop wireframe | New anatomy: mono chips + ⋯ → H1/sub → card → holdings tiles → owner pill → stats strip (desktop) → action panel → NavTabs. Add the mobile wireframe and fold budget from §2.1 (≈ 600 px to the bottom of the tiles). On desktop, the ActionBar moves to the right column under the stats strip | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Family](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c) |
| 2 | kb/80 §SatchelCard › Front, Props, States | "No numbers on metal". The face holds the serial (top-left), StatusPill (top-right), owner + minted engraving (bottom-left, mono caps 12 px, scrim) and chain marks (bottom-right). Remove the balances glass plate at every size. Add `SOLD` (greyscale) and `NEW` tag states | [Apple Card](https://mobbin.com/screens/4906fdaa-42f6-416f-be4d-dd75e5a61c6a), [Revolut](https://mobbin.com/screens/97998372-fc15-4fde-82a3-c1afa10991b0), [Blackbird](https://mobbin.com/screens/16bc9d96-d4f5-4c14-8d64-23314b632277), [OpenSea canceled](https://mobbin.com/screens/28b27959-e7b9-420c-b66a-4eba63243edf) |
| 3 | kb/80 §Components › Inventory; §Judge-first view | Add a **HoldingsTile** under the card: one tile per chain with the network label (12 caps), amount, truncated mono address and explorer link, plus the caption "Read from each chain {t} ago". In the judge view, "card with native balances" becomes "card + holdings tiles" | [Apple Card](https://mobbin.com/screens/4906fdaa-42f6-416f-be4d-dd75e5a61c6a), [Glow](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e) |
| 4 | kb/80 §SatchelCard › Back (flip); §Motion "Card flip" | Cut the flip in P1, since Wallet-tab rows cover addresses. If it is kept in P2, use an in-place reveal: a labelled button under the card, per-row Copy and a toast | [Revolut details](https://mobbin.com/screens/97998372-fc15-4fde-82a3-c1afa10991b0), [Revolut copied](https://mobbin.com/screens/74f597f0-182b-4bd5-b5ed-497a7e6e4eb0) |
| 5 | kb/80 §Satchel page (new row) + Inventory | Add a **StickyActionBar** below `lg`, filled per the role × status table in §2.1. It needs `scroll-padding-bottom` (kb/81 already has 96 px) | [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71), [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d), [OKX selling](https://mobbin.com/flows/ce8e4ab3-bb58-4275-bde4-92ef41ac6ae8) |
| 6 | kb/80 §Judge-first view (Facts) + new overflow menu | Facts become icon + label + mono value + Copy rows, ending with a data-source line. Add the "⋯" menu: Copy token ID (previewed), Contract facts → `/contract`, NearBlocks, Copy link, Share on X | [Glow](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e), [Family](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c), [Rainbow menu](https://mobbin.com/screens/a81b1003-2279-4463-ae14-eca55cdfe9d8) |
| 7 | kb/80 §Role × status matrix; §TL;DR "Status vocabulary" | Pills become Active · Signing · For sale · Sold (E-37). For sale, the owner gets the panel line `LISTED FOR {price} · LISTING #{id}` and an every-tab banner "For sale at {price}. Sending and transfers are paused." with **Delist** | [StockX ask flow](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [StockX vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c), [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) |
| 8 | kb/80 §Sale tab owner (Ready, Blocked rows) | Replace with the §2.5 layout: readiness checklist → price (currency segmented + helper "Buyer gets…") → rows ending in a bold **You receive** → "While it's listed" consequences → **List for {price}**. The quiet-period row reads "You can list in {n} blocks (~{t})" over a thin track, from `satchel(id).listable_at` | [Vestiaire](https://mobbin.com/flows/af2aced0-b3e0-4894-ad95-079d050b1de2), [StockX ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0), [Wealthfront](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b), [AA](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb), [Grab](https://mobbin.com/screens/1ac6149a-80a7-4ade-b9dd-1ce7aebdc073) |
| 9 | kb/80 §Sale tab owner (USDC) | An inline prerequisite row "USDC payouts not set up · Register (0.00125 NEAR)", shown only when USDC is selected (kb/90 §5.12) | [StockX "Payout Method: Not Active · EDIT"](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4) |
| 10 | kb/80 §Sale tab owner (Delist confirm); copy `sell.delist.confirm` | Replace the AlertDialog with one "Delist Satchel #{id}" sheet: the listing row, one consequence line, **Delist**, then an inline wallet row and the toast | [OpenSea cancel listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) |
| 11 | kb/80 §Sale tab owner (Sold); `sell.sold` | Sentence hero, receipt rows and a **Withdraw** fallback when `payout ok:false` | [Cash App](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75), [Revolut executed](https://mobbin.com/screens/26da4623-eb14-46ff-91fc-9b70e147a2a4) |
| 12 | kb/80 §Sale tab visitor, W3; copy `buy.*` | **Remove the "Pay with (USDC \| NEAR)" toggle**: the listing fixes the currency (D-14, `ERR_CURRENCY`). Show "Paid in {currency}. You have {balance}." Remove the FreezeBanner countdown and "Available in {t}" (E-37). Add the "BUY FOR" block, the `LISTING #{id}` line, the "How buying works" strip and the mobile sticky price + Buy bar with the verdict footnote | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [eBay steps](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61), [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71), [Reddit](https://mobbin.com/screens/c5c3a7d7-14a6-4f7d-90bf-4031bb60c464) |
| 13 | kb/80 §Sale tab visitor (Errors); Error map E28 | Add the `buy.changed` interstitial (old → new listing) after a pre-flight `satchel(id)` re-read; an inline insufficient-funds row; a Buy button that narrates the wallet; and a "USDC refunded" inline state | [OpenSea checkout](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710), [Uniswap buy](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) |
| 14 | kb/80 §CleanHistory | Report anatomy from §2.7: header `CHECKED {t} AGO · {k} OF 2 SOURCES`; verdict tag + sentence; rows (icon, item, evidence, tag, ↗, expand); account and contract rows; kb/90 §7.3 statuses including Unfunded and Unsafe; rows tick on real results; only the header announces | [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [Chime](https://mobbin.com/screens/11d18401-3658-454a-8275-b1352bc0d139), [CRED](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f), [Fuse](https://mobbin.com/screens/3bcee124-038a-4643-b6a6-f63aeee63fec) |
| 15 | kb/80 §Hallmark; `hallmark.*` | A hallmark is always word + time + link to its report, never bare. Tooltip text comes from kb/90 §7.7 | [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d), [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [Faire](https://mobbin.com/screens/ec87cac6-9e39-45f1-ac0c-c285dfba70c2) |
| 16 | kb/80 §Sale tab visitor (Success); §HandoffAnimation (receive) | End frame: the card large, "Satchel #{id} is yours.", the holdings sentence, the transaction link + Copy, and **Open your Satchel** | [Uniswap Complete!](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [Apple Wallet Done](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3) |
| 17 | kb/80 §Market; MarketCard; `market.*` | MarketCard anatomy from §2.8: meta row, card `md`, PRICE \| BTC \| ETH, hairline verdict footer. Toolbar: count + chips + sort, no sidebar. Buyable first, blocked last with the reason. Remove "Buyable in {t}". The SSR hint is labelled with its age | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [OpenSea grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297), [Uniswap explore](https://mobbin.com/screens/94c143d5-e346-4a74-8d44-9e0c25f35a62) |
| 18 | kb/80 §Home (Landing); `home.hero` | Hero: a fan of the seven demo alloys (#1 Patina in front), a metal pill **See Satchel #1** + ghost **Connect wallet**, and a one-line testnet note | [Slash fan](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2), [Slash CTA + note](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c), [Altitude variants](https://mobbin.com/sites/sections/57e26228-53f2-4a69-ab19-b1ce00d4a374) |
| 19 | kb/80 §Home (List, Empty) | Mobile Wallet stack for 3 or more Satchels (strip = serial + pill); full cards for 1–2; desktop grid with captions; a `NEW` tag for 24 h; empty = one sentence + one CTA | [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6), [OKX New](https://mobbin.com/screens/871cff2c-23a3-4349-967d-63ed7ca98ec7), [Coinbase Wallet empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) |
| 20 | kb/80 §Mint; `mint.*` | One mint bar (YOU GET \| DEPOSIT 0.02 NEAR \| CTA). The not-connected state keeps the same layout, with the CTA "Connect wallet to mint". Add the "What you get" checklist. The CTA narrates the wallet. Success is an in-place reveal + tx link + toast + `NEW` on Home | [Base](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec), [Portrait](https://mobbin.com/screens/e6439f66-3611-4297-b816-ac2f8c174410), [Glow](https://mobbin.com/flows/cbb0d761-28ed-49c4-a54a-66c897595776) |
| 21 | kb/80 §Transfer, W4; `xfer.*` | Recipient card "Account found · owns {n} Satchels". Blocked-receiver copy for the contract and MPC accounts (R-18). Review copy per E-36. A soft guard while Signing (D-08) replaces the block. F4 = `TRANSFERRED` tag, overlapping avatars and a tx proof row | [Uniswap transfer](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112), [Family send](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) |
| 22 | kb/80 §Activity tab, §Timeline | Filter chips, two-line rows, signature rows linked to their Clean-history row, and a NearBlocks footer | [OpenSea activity](https://mobbin.com/screens/421641ab-0589-4cbb-b91f-e8ae121d2208), [Family](https://mobbin.com/screens/23ed795a-80e2-4c77-8eaf-caa79d0fd60d), [Phantom](https://mobbin.com/screens/3e9a144f-5bb0-44ab-b961-5a290ff59c49), [Trust Wallet](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) |
| 23 | kb/80 §Copy deck | **Add:** `page.chips`, `page.owner-pill`, `page.stats.*`, `sell.ready.*`, `sell.rows`, `sell.consequences`, `sell.listed.banner`, `buy.paidin`, `buy.how`, `buy.changed`, `market.footer`, `xfer.blocked.contract` / `.mpc`, `xfer.soft.signing`, `act.footer`, `mint.bar`, `mint.get.*`. Strings are drafted in §2. **Retire:** `freeze.owner` / `.buyer` / `.done`, the cooldown entries in `buy.err.*` and `sell.*`, and `sell.delist.confirm` | §2.5–§2.10 of this file |
| 24 | kb/80 §Reference patterns | Replace the "Mobbin was unavailable" table with the Mobbin references in this file. Keep the source-code references (Rabby locale strings, LI.FI), which Mobbin can't supply | this file |
| 25 | kb/81 §Typography | Add a `label` role: Archivo wdth 100, weight 600, 12/16, +0.06em, UPPER, `--fg-muted`. Use it for stats strips, tile labels, the mint bar, "BUY FOR" and "LISTED FOR". It stays at the 12 px floor; OpenSea's labels are smaller, so don't copy them | [OpenSea](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [Base](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) |
| 26 | kb/81 §Status, §Radii | Add a **Tag**: 12/16, weight 600, caps, `--radius-tag: 4px`, 14% tint fill with text in the tint colour, so the existing tinted-pill contrast table applies. Use it for item statuses (SETTLED, UNUSED, BLOCKED, TRANSFERRED, SOLD, NEW). The round StatusPill stays reserved for the Satchel's own status | [CRED](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f), [Fanatics "UNCLAIMED"](https://mobbin.com/screens/a5bdb78d-ce91-4563-afff-d11410cd1fc7), [AA "DELAYED"](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb) |
| 27 | kb/81 §Card glass and scrim | With no numbers on the face, glass is used only under the StatusPill. The serial and the owner/minted engraving use the scrim (white only). Re-run the sweep only if the alloy table changes | [Apple Card](https://mobbin.com/screens/4906fdaa-42f6-416f-be4d-dd75e5a61c6a), [Revolut](https://mobbin.com/screens/97998372-fc15-4fde-82a3-c1afa10991b0) |
| 28 | kb/81 §Seeded identity colours, Open question 3 | Evidence for per-object tint. Recommended use: an ambient radial glow of the accent behind the card (10–12%), the tab indicator and the selected-chip outline. CTAs stay silver | [Rainbow tinted](https://mobbin.com/screens/c7a739d6-f56b-4910-9577-ab3acf241bb6) |
| 29 | kb/81 §Spacing/layout | Market cards: 1 px `--line` border, `--radius-lg`, internal dividers in `--line-subtle` (a hairline card, not a shadowed one) | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243) |
| 30 | kb/81 §Motion tokens; kb/80 §Motion spec | No new measured values; the new motions reuse existing tokens. Stack card lift uses the handoff "lift" spring (260/22/1). The tag "stamp" is opacity + scale 0.96→1 at `--duration-base`. The checklist tick reuses the 240 ms `pathLength`. A Home → `/s/[id]` shared-element card transition is P2 polish at most | [Apple Wallet lifted](https://mobbin.com/screens/02e940a1-bcd1-4eaa-b064-a7c66fe0c1de), [Family send](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52) |

## 6. Open questions for the design lead
1. **Numbers on the card face?** The recommendation is "no numbers on metal", with holdings tiles under the card (Apple Card, Revolut, Altitude, Slash). The counterexample is [Apple Wallet's Apple Cash strip](https://mobbin.com/screens/46812e0f-4c8d-40ce-8ad3-356b009761e0), which shows a balance on the face because it is a stored-value card, as a Satchel is. Pick one rule for every size.
2. **Address reveal:** cut the flip for P1 (recommended), use Revolut's in-place reveal in P2, or keep the 3D flip?
3. **Desktop action placement:** in the right column under the stats strip, as on OpenSea (recommended), or in kb/80's sticky left panel, which stays visible while long tabs scroll?
4. **Mobile sticky action bar:** adopt it? For the owner's primary actions, is the set Send + Fund + ⋯ right?
5. **Home on mobile:** a Wallet stack from 3 Satchels up (recommended; alice owns #1–#7 in the demo), or a plain one-column list?
6. **Landing hero:** a fan of the seven demo alloys (recommended), or the single featured #1? Should the fan double as the OG and README image?
7. **Market:** show blocked listings such as demo #4 last, with their reason (recommended for honesty), or hide them behind a "Show blocked" chip?
8. **Delist:** a single sheet with the wallet as the confirmation (OpenSea; recommended), or keep the AlertDialog?
9. **Success tone:** sentence-first (Cash App, Apple; recommended), or with an engraved display eyebrow such as `KEYS HANDED OVER` (Wise-style)?
10. **Alloy captions:** give each alloy a one-line material story, as [(Not Boring) skins](https://mobbin.com/screens/a4b78eac-90b5-4508-9ec4-88271a557880) do, for example "PATINA: verdigris on copper"? This ties into kb/80 Open question 3 (show the alloy name).
11. **Stats strip contents:** are SIGNATURES · STATUS · LISTED FOR / LAST SALE · MINTED right? LAST SALE needs an event read, so it could be dropped if that read is costly.
12. **Per-Satchel tint:** limited to the glow, tab indicator and chip outline (recommended), or also on the CTA, as Rainbow tints its primary button?

---

## Appendix A. Coverage and discards
- **Not on Mobbin**, judging by the results (queries naming these apps returned other apps): Magic Eden, Zora, Foundation and NBA Top Shot. Blur and Tensor weren't searched separately because of the search budget. Phantom's collectibles query returned no screens; Phantom shows up only for History.
- **Discarded as generic or off-brief** even though returned:
  - Generic e-commerce, creator and template galleries: Uvodo, Record Club, Literal, Skillshare, Patreon, Behance, Dribbble, Relevance AI, Base44 and Linktree. Also the Faire product page, as opposed to the Faire badge used above.
  - Vehicle and service apps: Best Buy, Walmart, Lloyds vehicle, eBay garage, State Farm and Lyft.
  - Other: Binance Pool inscribe, Shopee, Crate & Barrel, Careem (except as an anti-pattern), Zing, Shell, Stake, Greenlight, Origin, Trust Wallet NFTs, Base app home, NBA, DoorDash, the OKX AI-art mint and Orb Social.
  - Opal, Jomo, Forest, talabat and Tinder were relevant only as Live Activity timer anatomy, and are superseded by AA and Grab.
- **ID hygiene:** every link above was copied from a returned `mobbin_url`, or built from a returned flow or screen ID. The one ID that couldn't be re-verified, the Family "Collectible detail" flow, is not cited; its screens are cited instead.
- **Tool status:** no errors. One empty result ("Phantom collectibles tab…") was retried as an open query, which returned results.

## Appendix B. Mobbin notice (verbatim)
The following `ai_usage_notice` was attached to 11 of the 21 screen-search results, from the 14th search on. The text was identical each time.

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)
