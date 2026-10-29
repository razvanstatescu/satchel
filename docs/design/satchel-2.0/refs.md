# Satchel 2.0 references: friendly, sticker, premium

> Inspiration research for the 2.0 rebuild of `apps/web` (landing and app). By the inspiration researcher, 2026-10-26.
> **Sources:**
> - Mobbin, about 45 searches across iOS and web screens, flows and site sections; every cited image was read.
> - 13 live sites captured with Playwright at 1440 and 390 (`refs-shots/`). Two of them, Duolingo and Gumroad, had their button CSS measured as well.
> - Web articles.
>
> **Link rule:** every Mobbin link is the exact `mobbin_url` a tool returned in this session. A screen I saw only inside a flow is cited by its flow link. "(live)" means a screenshot in `refs-shots/`.
> **Filters applied to every row:**
> - Native amounts only, no fiat (D-37).
> - Coral is one fill per screen, always with ink text.
> - The ink outline and hard shadow appear only on the Satchel card, primary buttons and illustrations.
> - Funnel Display for balances and titles, Onest for UI, Geist Mono for addresses.
> - Day by default; Night follows the OS.
> - Lucide icons at stroke 2.
> - The honesty list applies: never "trustless"; the buyer's browser runs the check; gifts aren't checked; no unbuilt features.
> - The copy test bans "Safe to buy", "approval", "cooldown", typed glyphs and all-caps.

## 0. Five patterns to adopt (details in the sections)
1. **The card is the object, and the numbers sit under it.**
   - One sticker card is the hero, and native balances go in rows under it.
   - The action row has one coral primary; the other actions are flat tiles.
   - Sources: Kit, Apple Wallet, Wise (§2).
2. **The lip that collapses.**
   - Duolingo's measured press: a hard `0 4px 0` shadow, with `translateY(4px)` on `:active`.
   - It goes on primary buttons only, which is exactly the brand's spec (§10).
3. **Money moves in visible steps.**
   - Family's send keeps one surface that grows.
   - The review carries a time chip and one finality line.
   - Progress is a Wise-style tracker that becomes the receipt.
   - Pending rows pin to the top of Activity (§3, §8).
4. **Trust told calmly, with real UI as proof.**
   - Family's calm character with a short checklist.
   - Phantom's claim cards that each carry a real screen fragment.
   - Honest words only (§1).
5. **Delight where it is rare** (Family's "delight-impact curve").
   - The swing, the confetti-level moments and the character cameos are reserved for first mint, the hand-off and a sale.
   - Copying, navigating and everyday sends stay calm (§10).

## 1. Landing / marketing site
### 1a. Hero
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Family: hero](https://mobbin.com/sites/sections/b36c6af6-3c75-4a17-8fb6-fec0631d2a20); mobile (live `family-m-hero.jpg`) | A centred two-line H1 between two character clusters, with one dark pill and one soft pill. At 390 px the clusters collapse into **one row of four small stickers above the H1** | Desktop: the Satchel card on one side and the chain-charm bar on the other. Mobile: the charm bar is the single sticker row above the H1. At most two clusters, never Family's 30 objects. Keep the card straight; the brand bans rotating the S, and the card carries the charm |
| [Phantom: the mascot inside the headline](https://mobbin.com/sites/sections/71259123-3051-49c8-afc1-6a3afaa222f9) | A word-sized character sits in the H1; nothing else competes | Optional: the charm S (no face) inline in one section heading, with `alt=""` so the H1 text stays whole for AI judges. One inline sticker per page |
| [Slush: sticker objects round the type](https://mobbin.com/sites/sections/e91ff3ca-be3f-49e0-9881-0d9b9a5aff94) (live `slush-d-hero.jpg`) | Ink-outlined sticker objects (a coin with a face, a wallet, a rocket) pinned to the corners of the type, and outlined pill CTAs | The closest existing language to Sticker S. Take the outline weight and the coin with a face (our chain charms). Leave the 3D tube, the condensed italic caps and the pill nav |
| [Duolingo: one tilted object](https://mobbin.com/sites/sections/bfa7a8f3-0f21-4307-8d6f-bc142b05923c) | A single product object with a visible lip beside the H1, and two stacked buttons | The card alone with its `0 4px 0` shadow. On mobile, a coral primary and a white secondary stacked under the H1, with "Testnet only. Coins here have no value." under them |

### 1b. Value props: one idea per section
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| Duolingo feature rows (live `_crops/duolingo-overview.jpg`) | Alternating illustration and text rows, each with a two-word heading and two sentences | Razvan's "one idea per section": Give it, Sell it, Check it, each with one charm illustration. Sentence case, not Duolingo's lowercase |
| [Slush: outlined tiles](https://mobbin.com/sites/sections/8e81ac95-eab4-4cc5-ba76-dd3636aaa6f9) (live `_crops/slush-b.jpg`) | Square tiles on flat colour fields, each with one sticker illustration and a label | Tiles stay a flat `surface` with a `line` border; only the illustration inside gets the outline and shadow. Sky and lemon appear only as illustration grounds, as on the In-context welcome panel |
| [Gumroad: sticker labels band](https://mobbin.com/sites/sections/eeb20aaf-c2fb-4204-83d0-0f8f1f7538db) | Outlined die-cut stickers scattered on one colour field, beside a plain text column | A "What's inside" band: the BTC and ETH charms as stickers on sky, and a plain text column |
| Family bento (live `_crops/family-bento.jpg`) | Six small tiles, each a **real UI fragment** with a one-word title: a "Backing Up" pill, a Submitted, Pending, Completed tracker, "Urgent ~19 Secs" | Show real Satchel fragments: the ProofChip, the "Paused for sale" pill, a SigningProgress row. Real UI is more convincing than a metaphor |

### 1c. How it works, trust, FAQ, footer
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Zipline: 01, 02, 03](https://mobbin.com/sites/sections/7b0ca7a7-caf2-42a6-b315-53b86c8cd190) | Three equal tall tiles, with a number and one line under each | Mint, then Fill, then Give or sell. Numbers in Funnel Display, in ink |
| [Going: a character and three steps](https://mobbin.com/sites/sections/53455b96-db26-4393-adbb-b9ddaab9078b) | A character cameo at the section edge, numbered circles and one CTA | The charm bar hangs into the section from its top edge |
| Family: "Relentless protection. Restful ease." (live `_crops/family-security.jpg`) | **The best friendly-trust section found.** A calm character with closed eyes, a two-line heading, two plain sentences and five ticked claims | "Check before you buy":<br>- a calm chain charm;<br>- two sentences saying the buyer's browser runs the check;<br>- ticks: "Every signing request is on record", "Your browser checks it", "Addresses stay the same when it changes hands", "Paused while it's for sale", "Testnet only" |
| Phantom: "Your security" cards (live `_crops/phantom-security.jpg`) | Three claim cards, each one sentence plus one real UI snippet (its scam-warning sheet) | Three cards with real fragments: a clean verdict, a blocked "Needs attention" listing, the history list |
| [Slush: non-custodial tile](https://mobbin.com/sites/sections/05891498-2de8-40de-9302-8b035d67fd10) | One bold claim tile beside one outlined lock sticker | The claim tile can be the section's one coral fill, beside an outlined charm |
| [Family: FAQ](https://mobbin.com/sites/sections/5aadc354-e221-414a-8724-32eab58fe48b) | The safety question comes first and is open; plus icons and hairlines | First question: "Can I check a Satchel before I buy it?" (not "safe to buy": the copy test bans it). Use native `<details>`, which works without JS and in the server HTML |
| [Cash App: questions](https://mobbin.com/sites/sections/13a1b5d5-0446-4220-b05d-d7a94c61ad8f) | Questions at about 22 px, full-width rules, one open | Onest 20/26 at 700; the Lucide `plus` rotates 45° to close |
| [Family: closing band and footer](https://mobbin.com/sites/sections/5ece9cbd-3ed7-4798-8212-63382292ccc6) | A one-line pitch, one link and a character vignette, then a quiet three-column footer | Closing band with the charm bar and "Mint a Satchel". Footer: the lockup, three link columns and the testnet note |
| [Gumroad: colour band, then a black footer](https://mobbin.com/sites/sections/d2142838-e430-45ad-aaaa-fef64678023e) | A full-bleed brand-colour CTA band just above the footer | The landing's last coral: a coral band with the charm S and an ink-outlined white button. Use the charm S, not the tiled mark: the brand bans the mark on coral |

Avoid:
- [Family's hero before its animation](https://mobbin.com/sites/sections/cb4721ce-71c2-43bf-9fcb-235be20e04aa): a blank first paint.
- The 2026 trading-first heroes of Phantom and Rainbow (live `phantom-d-hero.jpg`, `rainbow-d-hero.jpg`).

## 2. Wallet home and asset detail (`/s/[id]`, My Satchels)
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Kit: a card with a character](https://mobbin.com/screens/fad9f1bc-8710-44ef-a252-1fba0c34e297) | **The best card-as-object hero found:**<br>- the card is the hero;<br>- the mascot peeks from its corner;<br>- the balance sits under the card;<br>- three action tiles, **only one filled** (the yellow "Transfer") | The Satchel card: coral band, the charm in the corner, and the total in balance-hero as native amounts or "2 chains". Action row: Send is coral with the sticker treatment; Receive, Give and Sell are flat tiles with a 2 px `line-strong` border |
| [Family: action tray](https://mobbin.com/screens/3207083b-4a32-4990-bc79-a9cb7bf85bdf) | A "+" opens a tray of four large verbs, each with a one-line explanation | The mobile "More" tray, for example:<br>- "Give this Satchel: the new holder gets everything inside";<br>- "List for sale: paused while it's for sale" |
| [Wise: balance detail](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b) | The native amount and its code are the hero ("0.00 USD"); round labelled actions; an unavailable action is greyed in place | Per-chain detail: "0.0412 BTC" in balance-hero with the ticker in `ink-muted`. While the Satchel is for sale, Send is disabled and shows why |
| [Apple Wallet: adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) | Cards stack as objects; the card is the success hero | My Satchels as a stack of mini cards showing their coral bands; a newly minted card is the success hero |
| [Kit: choosing a card](https://mobbin.com/screens/bdeb53bd-a1c7-48ea-8488-79070c6fbcc8) | A die-cut sticker sits on the card face | Don't copy the extra stickers: our card face carries only the charm S |
| [Glow: a wallet with a face](https://mobbin.com/screens/16a08a80-539a-480a-969b-351217aeaa6f) | A character avatar above the name, and a mono address chip | Keep the address chip (Geist Mono, middle-truncated, with copy). Not the face: the brand bans a face on the S |

Translation:
- Under the card, each row is an 8 px chain dot or a 24 px charm, the chain name, the native amount in tabular figures, and a quick Receive.
- No fiat line. The brand's own In-context board shows "≈ $2,903.00"; drop it.
- At `bp-lg`: card, actions and facts in the left column; tabs (Inside, Activity, History) in the right column.

## 3. Send flow
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Family iOS: sending tokens](https://mobbin.com/flows/d2b72271-206c-4d4c-99e3-6f2a4cb38a71) | The steps run To, then a resolved "Matching" row, then the amount, then confirm, on one surface that grows | The same order inside `container-flow` (480) |
| [Family: amount](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984) | A recipient pill on top, a huge amount, and an asset row with "Use Max" | The amount in balance-hero 48/52 (38 below 480) with its ticker. The asset row holds the charm, the available native balance and a "Max" chip. **Delete the "= $0 ⇅" fiat toggle** |
| [Solflare: native-first amount](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151) | A large native amount with the ticker as a suffix | Our amount layout, without the fiat sub-line |
| [Glow: the fee before review](https://mobbin.com/screens/bb93fdb9-f5a2-4ae5-bacc-010487e985b4) | Available-balance and network-fee rows sit under the amount, in the asset itself | "Network fee ~0.00002 BTC" under the amount |
| [Family: confirm](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3) | The title names the recipient ("Confirm transaction to 0xb249…9768"); rows; a fee and **time chip**; **one finality line** above the button | Title "Send 0.01 BTC to tb1q9h…x4d7". Rows:<br>- From: the mini card;<br>- To: mono, with copy;<br>- Network fee;<br>- Time: "Signing usually takes about 10 s".<br>Then the finality line and a coral "Send Bitcoin" |
| [Family web: sending crypto](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) | On the web:<br>- a progress hairline under the header;<br>- a centred column;<br>- a review with Estimated Time;<br>- a first-time-address checkbox;<br>- a "Transaction Sent" card with Done | The desktop version of our flow. The progress line is ink, not coral |
| [Base web: send dialog](https://mobbin.com/flows/faff0b12-7b2f-41e1-89aa-bface1f08d4c) | An amount above the balance turns red, with the available balance underlined; "Processing. Do not close this window" | The amount in `danger`, with an icon and "More than this Satchel holds". Keep the keep-this-tab-open line while signing |
| [Uniswap: transfer](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112) | A "New address" sheet before a first send, and a "Network cost" explainer sheet | A first-time-address acknowledgement, and the fee explainer as a sheet |
| [Wise: tracker](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) | Done steps in the past tense with a time, the current step bold, future steps muted | SigningProgress as a four-row `<ol>` that becomes the receipt. The current row shows the `frozen` colour, a spinner icon and a word |
| [Plum: tracker with copy](https://mobbin.com/screens/2f132d15-b48c-442c-ad83-33e78e104a53) | Each step carries one plain sentence; the next step says what will happen | "Usually about 10 s. The network allows up to about 2 minutes." |
| [Mercury: sent](https://mobbin.com/screens/01d023a4-8964-49f9-800c-3ebd333e3247) | A statement as the H1, a time expectation, the row with a Pending chip, then Done and "Make another payment" | "Sent" with the native amount; a "Pending" chip until the network confirms |
| [Coinbase Wallet: "est. about 30 minutes"](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) | No success tick before confirmation; honest Bitcoin timing | For Bitcoin, say that testnet blocks can be far apart |
| [Taco Bell: "Whoops"](https://mobbin.com/screens/b22de163-6e2e-4cfc-99eb-cc34c3c5021c) | A small character, a friendly heading, and **the money fact** ("No charge was made") | The charm S, a heading, then what's known about the funds and the signature, then "Try again". Never claim "no signature exists" after a timeout (honesty list) |
| [GoPay: "Oof"](https://mobbin.com/screens/bfe3c74e-626b-45e9-809c-e67594c1a7d6) | A bottom sheet with a friendly line, a reassurance and two buttons | Show the failure as a sheet over the review, so the form stays filled |
| [OpenSea web: send](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9) | The error replaces the progress in place, with Retry and Close | The SigningProgress row turns `danger` and offers Retry |

## 4. Receive / fund
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Glow](https://mobbin.com/screens/f752cb3f-a0e8-4b95-94f4-08ccfef9d10c) | The QR in a rounded tile, the wallet name, the full mono address on two lines, Copy and Share pills, one chain line | Our structure. The QR tile is white in both themes, with the chain charm in its centre (error correction H) |
| [Solflare](https://mobbin.com/screens/cab7112b-0cdb-4135-a50e-072424e0ab69) | The name and a short address inside the QR card; Copy and Share split the bottom | Bottom: a coral "Copy address" and a white "Share". Share uses `navigator.share`, falling back to copy |
| [Coinbase Wallet](https://mobbin.com/screens/67ea184a-82aa-4783-85d5-0ba7144d44ce) | An address field with inline Copy, and a time line under it | "Only send Bitcoin testnet4 to this address.", then "Testnet only. Coins here have no value." |
| [Family](https://mobbin.com/screens/27452070-2975-4895-9946-8fd126694303) | Three round labelled actions under the QR | An alternative to the split bar |
| [Base: copied toast](https://mobbin.com/screens/f59bdad5-e979-49fa-9222-a94c161a4144) | A toast over the screen | Prefer a label morph instead: "Copy address" becomes "Copied" with a check icon, plus `aria-live="polite"` |

- **Avoid** [Public's wall of warnings](https://mobbin.com/screens/f1d60453-f208-4d5b-8244-4a2c7d117fa7): one chain line is enough.
- The chain switch is a Bitcoin / Ethereum segmented control with charms (Solana stays behind `SOL_UI_ENABLED`).
- The selected segment uses a 2 px ink outline, not coral, so that Copy keeps the one coral fill.

## 5. Give a Satchel, and the hand-off moment
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Uber Eats: "Sam Lee will see this"](https://mobbin.com/screens/f2c3ebd5-1191-4e37-8457-a4b795612bdf) | **A preview from the recipient's point of view** | "bob.near will see this": the card as it lands in Bob's list, with the lemon "New" sticker |
| [Posh: confirm details](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a) | The ticket object is the hero; two rows (Send, To); a friendly CTA | The card on top; rows Give and To; a coral "Give Satchel #7" |
| [Revolut Business: transfer ownership](https://mobbin.com/screens/8208b43c-055b-459c-845e-50f8a96a7f54) | The consequences as two lines with icons | "bob.near becomes the holder and gets everything inside." and "You won't be able to send from it any more." |
| [Satispay: recap](https://mobbin.com/screens/cf5fba7b-cbc0-4e61-ae0c-5ca73489e0b6) | A gift illustration, rows with Edit, a coral-red button with a terms line under it | The closest colour precedent. Add a quiet line: "A gift isn't checked like a sale, so Bob is trusting you." |
| [Family: sending a collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52) | **The object travels** into the conversation and lands as a "Sent" bubble | The hand-off: the card swings, slides into the recipient chip, and the chip gets the "New" sticker; the receipt follows |
| [Uber Eats: tap to unwrap](https://mobbin.com/flows/f816fd84-3077-4203-a651-639094b8c04a) | The gift arrives wrapped for the receiver | Optional for Incoming: "alice.near gave you a Satchel", with the card swinging in once |
| [Family: collectible detail](https://mobbin.com/flows/65232b19-1dd2-451d-8a66-9e957a6398c7) | An "Owned by You" pill under the art | "Held by alice.near" on `/s/[id]` |

**A conflict to fix.** The In-context board's Night Give sheet shows "Clean history: no unused signatures". The honesty list says gifts aren't checked. Replace that line with the native contents and the trust line above.

## 6. Marketplace
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Reddit: collectible grid](https://mobbin.com/screens/94fa6176-af50-41e3-bb9f-d88228047838) | The card is the art; a price chip in the corner; a "Sold out" overlay | A grid of mini Satchel cards with a native price chip (`surface-sunken`, tabular) and a status chip. Proposal: below 240 px wide, use a 2 px outline and a `0 3px 0` shadow, with a 2 px lift on hover |
| [OpenSea: item](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) | Chips, the owner, a stats strip and one action panel | Keep the kb/82 order: chips, H1, holder, stats, actions, tabs |
| [Uniswap: item with activity](https://mobbin.com/screens/1162e517-ecdf-48dd-a1bc-e559b9f6ba79) | A price card with one primary action; an activity table with coloured event icons | The price in balance-hero, native; a History tab showing events as an icon plus a word |
| [Reddit: item modal](https://mobbin.com/screens/c5c3a7d7-14a6-4f7d-90bf-4031bb60c464) | Art on the left, details on the right, and the price with Buy in a footer bar with terms | The desktop item layout; the terms line becomes the testnet note |
| [Binance: contract checks](https://mobbin.com/screens/afaf262e-b80e-40e9-93e4-8b7c78603fc9) | **A checklist of passed checks**, each with a one-line explanation, and the action under them | The clean-history verdict: one sentence, then check rows (success icon, word, evidence link), directly above a coral "Buy" |
| [Zing: "Stop this payment if"](https://mobbin.com/screens/f8afac35-6a4d-46cf-85b4-c3fcec7a0b1a) | A danger list and an explicit "I know the risks" | A blocked listing (#4): a "Needs attention" list of reasons. Buy stays disabled with no override |
| [Vestiaire: price](https://mobbin.com/screens/e6eb7f04-0266-483a-b177-33b2f3e84ff1) | The price and "You earn" side by side, with a verdict strip | Listing: the price (native; the listing fixes the currency) and "You get"; then a strip saying "Paused while it's for sale" |
| [OKX: sell](https://mobbin.com/screens/7a22aa38-d636-47b9-ac43-1975d5898a3a) | A thumbnail, a price field, then "Listing price" and "You'll earn" rows | The structure of the sale sheet |
| [StubHub: listed](https://mobbin.com/screens/5e319325-333b-4e68-a294-2db87064c56b) | "Your tickets are listed" with a timeline of ticked steps | Quiet period, then Listed, Sold and Paid. The 250-block quiet period comes **before** listing; there is no wait to buy |
| [Glow: bought receipt](https://mobbin.com/screens/4ca1b5f7-d509-47b1-8d1e-79f134a0616b) | Seller and buyer stacked with a chevron between, an item row, the proceeds and a mono signature | SoldReceipt: alice.near then bob.near (an icon between them, not a typed arrow), the mini card, the native price and the tx hash in Geist Mono |
| [Kraken: sold](https://mobbin.com/screens/754e289f-9a43-496c-958e-a3eac32bde16) | An asset icon, the native amount, rows, and a reference ID with copy | The receipt rows |

## 7. Mint / create
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Glow: creating a collectible](https://mobbin.com/flows/cbb0d761-28ed-49c4-a54a-66c897595776) | A card-shaped preview fills the top; afterwards a green "Minted …" toast appears on home | The preview is the exact card, "Satchel #8". The toast reads "Satchel #8 is yours", on `brand-soft` |
| [Blackbird: benefits](https://mobbin.com/screens/74811fd5-cdcd-4eed-ab2f-ac2e728453c8) | **A "you get" checklist**: a check, a bold line and one plain sentence | Items:<br>- a Bitcoin testnet4 address;<br>- an Ethereum Sepolia address;<br>- a history anyone can check;<br>- give it, or list it for sale.<br>No Solana row while the flag is off |
| [Lugg: setting up](https://mobbin.com/screens/4fb52722-7aac-4b76-b0c0-aee951e174f2) | A checklist that ticks one item at a time under an illustration | Minting progress ticks through its steps in plain words. Leave out Lugg's jokes |
| [OKX: claiming an NFT](https://mobbin.com/flows/b4f68238-e7f3-47de-8ed6-7b200b4ab28b) | The new item lands in the grid with a "New" badge | A lemon "New" sticker on the new card in My Satchels |
| [Headway: first trophy](https://mobbin.com/screens/f6e48ba3-89ef-41be-ac9f-b7b17bb8bc31) | A one-time celebration dialog with an illustration | First mint only: the charm bar swings once. Never repeat it for later actions |

## 8. Activity, empty states, errors, toasts, connect wallet
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Family: activity](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b) | Day groups; an icon with a status badge; "Sent to Alex's Wallet"; the amount on the right; a "Fee Only" chip | Each row:<br>- a 24 px charm with a state badge (check, snowflake or warning);<br>- a verb-first title, "Sent 0.01 BTC";<br>- "To tb1q…x4d7" in mono.<br>Chips only on rows that aren't final |
| [Phantom: recent activity](https://mobbin.com/flows/3316db6f-f0a1-4c33-b8a3-c6e3facb6ca5) | A "Pending" group pinned at the top, and a failed row with a red X | An "In progress" group at the top; "Needs attention" rows in `danger` |
| [Glow: activity](https://mobbin.com/screens/a975c3a0-6339-43fc-8b0f-c991fd46c107) | Mono signatures grouped by month; a failed row with a warning icon and a reason | The History tab: hashes in Geist Mono, and a reason on every failure |
| [Octopus Energy: empty](https://mobbin.com/screens/8171cd8e-1e00-43b8-887a-9d8a55f79204) | A character on a dark violet ground and one short line | The Night empty-state reference: the charm bar, "Nothing inside yet" and a coral "Receive Bitcoin" |
| [Kit: a character peek](https://mobbin.com/screens/88fd13e4-bfc0-4a13-b4d7-d33829ab5241) | The character peeks from behind the card and pops a "!" bubble | For Incoming and attention moments: a chain charm peeks from behind the card, once |
| [Meetup: empty](https://mobbin.com/screens/2a0f499b-355f-4dc0-a999-fd559fdfbefd) | A small sticker and "It's quiet here for now." | Empty activity: the charm S and "No activity yet" |
| [TradingView: empty](https://mobbin.com/screens/c18aef68-3a68-4768-a39c-1955eb0d6f7b) | A line character and one CTA | Empty market: the charm S and a secondary "Mint a Satchel" |
| [Cash App: payment failed](https://mobbin.com/screens/a8dd3bc5-6b42-48d0-8046-145abb45b193) | The plain error: an icon, a heading, the reason, Done | For errors that aren't flows. Not-found shows the charm S, "This page isn't here" and a link home |
| [Neo Financial: toast](https://mobbin.com/screens/9660cc8c-3525-4e7e-89a9-9aa87d752522) | A one-line toast with a check | `brand-soft` with a check and "Sent" (the tokens define `brand-soft` as "the toast behind Sent"); no sticker shadow |
| [Up: toast](https://mobbin.com/screens/dafc6ed2-c552-4f27-9eb2-a7729bb44ddc) | A bottom toast with a title and a detail | Bottom of the screen on mobile, bottom-right on desktop; 5 s; `aria-live` only for user actions |
| [Portrait: connect](https://mobbin.com/screens/fe79e77e-0975-48c1-9bf5-8b7ba904e9c4) | A small centred card: logo, one line, wallet rows with a "Recent" chip, "Other wallets" | A branded "Connect a NEAR wallet" sheet, which becomes a dialog at `bp-md` |
| [Coinbase: connect](https://mobbin.com/screens/0028e86d-943f-4bfd-8be6-ce4f873921ce) | A title, a plain reassurance, rows, and "Don't have a wallet? Create one" | A reassurance in honest words, and "New to NEAR? Create a testnet account" |

**An implementation note for the connect modal (checked in the installed `@hot-labs/near-connect` 0.11.4):**
- The library draws its own modal: dark `#0d0d0d`, a system font, mounted on `body` under a random class.
- Only `footerBranding` can be themed.
- Its types expose `availableWallets` (the manifest gives each wallet's name, icon and description) and `connect({ walletId })`.
- So a Satchel-styled picker that calls `connect({ walletId })` looks possible. Check that this call really skips the library's picker before building one.

## 9. Navigation and Night mode
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| [Duolingo web: side nav](https://mobbin.com/screens/063b737c-c4d3-4788-b91d-b137f93ebb9c) | Rows of icon plus label; the selected row has a tinted fill and a 2 px border; a right rail of cards | The side nav at `bp-lg`. The selected row is `brand-soft` with a 2 px ink outline, which keeps the coral fill for the page's primary action |
| [Base web: home](https://mobbin.com/flows/faff0b12-7b2f-41e1-89aa-bface1f08d4c) | Four nav items, an account chip pinned to the bottom, a centred content column | The account chip at the bottom, with Disconnect in its menu and the testnet note under it |
| [Kit: mobile top bar](https://mobbin.com/screens/fad9f1bc-8710-44ef-a252-1fba0c34e297) | A round ink menu button and a context title with a switcher | A 44 px round menu button; a "Satchel #7" switcher using a Lucide `chevron-down` |
| [Mercury: menu sheet](https://mobbin.com/screens/8a986097-dd99-4bcc-bc2f-d6a3b3b66776) | Grouped rows, with the account switch at the bottom | Rows for My Satchels, Market, Mint and Contract; then the theme control; then the account and Disconnect |
| [Profound: theme toggle](https://mobbin.com/screens/065209b0-8f6b-4c38-a0a7-56aa8cc0bfc9) | A three-icon segmented control | System, Day and Night with monitor, sun and moon icons, plus visible labels |
| [Duolingo: dark mode](https://mobbin.com/screens/e52bc77d-9401-408c-bb79-f6cde9508597) | A deep violet ground. Bubbles keep a **light** outline and a lip, and the primary button is white with a lip | Our Night reference; see the finding below |

**Night finding (contrast measured).** The board's Night card puts an ink `#1D1340` outline on surface `#1C1538` (1.00:1) and a black shadow on ground `#120C26` (1.11:1). In Night the sticker effect disappears; only the coral band survives (6.2:1). Duolingo keeps its outlines visible in dark. Two options for the design lead:
- Night stickers take `line-strong` `#8A82AE` as the 3 px outline (4.85:1 on surface) and keep the black shadow.
- Or they add a thin light die-cut keyline, the way Arc's logo does (live `arc-d-hero.jpg`).

## 10. Motion
| Ref | Borrow | Satchel 2.0 |
|---|---|---|
| Duolingo button (live, measured `duolingo-press.jpg`) | The visible face is a `::before` with `box-shadow: 0 4px 0 <darker shade>`; `:active` applies `translateY(4px)` | Primary: `box-shadow: 0 4px 0 var(--ink)`. On `:active`: `translateY(4px)` and shadow 0, over 100 ms ease-out. The focus ring sits outside the lip |
| [Family values (Benji Taylor)](https://benji.org/family-values) | Trays that grow, a text morph ("Continue" becomes "Confirm"), and the delight-impact curve | Morph "Give" into "Giving" and then "Given" (no typed ellipsis). The rarer the moment, the more delight |
| [Family card morph (60fps.design)](https://60fps.design/shots/family-wallet-card-morph-to-screen-transition) | The card scales up into the sheet header with a spring | A mini card in My Satchels grows into the `/s/[id]` hero, using the View Transitions API or a `motion` layout animation |
| [animate.css swing](https://raw.githubusercontent.com/animate-css/animate.css/main/source/attention_seekers/swing.css) | `transform-origin: top center`, with keyframes at 15°, −10°, 5°, −5° and 0 | The hand-off swing: 10°, −6°, 3°, then 0 over 600 ms, with the origin at the charm. Then `translateX` toward the recipient chip. Under reduced motion, a cross-fade |
| Emil Kowalski's animation standards (his `skills` repo) | UI motion under 300 ms; ease-out `cubic-bezier(0.23, 1, 0.32, 1)`; drawers `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets and dialogs use those curves; animate only transform and opacity |
| Kit's character peek (§8) and the Slush hero stickers (live) | Characters move only at moments that matter; hero stickers float gently | Charms move once, on an event, never in an idle loop. Any landing loop longer than 5 s needs a pause control (guardrail 2) |

## 11. Anti-patterns (seen in the research)
1. **Too many stickers.**
   - Family's hero has about 30 objects. Slush mixes five sticker colours, 3D renders and condensed italic caps in every section.
   - Rule: at most one illustration cluster per viewport, and sticker treatment only on the card, primary buttons and illustrations.
2. **A childish tone with money.**
   - Lugg's "Strong muscles / Smiles all around"; Duolingo's all-caps buttons.
   - Taco Bell's "Whoops" works only because it states the money fact next to it.
   - No jokes in error, review or finality copy.
3. **Emoji in copy.**
   - Blinkit's "Nothing here yet 👀", Uber Eats' 🎉, Blackbird's "Gift this pass 🎁".
   - The copy test bans glyphs; the charms do this job.
4. **Low-contrast pastel text.**
   - Phantom's lavender-on-lavender sub-copy (live), Glow's white text on pink buttons, Family's light-grey 14 px body.
   - Lemon and sky are never text; white on coral is banned (3.05:1).
5. **Fiat-first balances.**
   - Phantom, Base, Family, Coinbase and Kit all lead with $.
   - So does the brand's own board ("$4,812.40", "about $4,812" on the Give sheet).
   - Satchel shows native amounts only.
6. **Trading-first heroes.**
   - Phantom 2026 ("Your home for trading…"), Rainbow ("trade Nvidia"), Zerion's laurels and charts (live).
   - Satchel's story is giving and checking.
7. **Slide-to-send** (Base, Glow, Mercury).
   - Awkward with a keyboard and on the web; use the press button.
8. **Blank or animation-gated first paint** (Family's hero before its animation).
   - Judges read server HTML.
9. **3D renders and glass** (the Slush tube, Phantom's glossy cards, Kraken's 3D error art).
   - "Stickers, not glass."
10. **Real chain logos inside a QR or a charm** (Coinbase's ₿ in the QR).
    - Use our charms, never real logos inside them.
11. **Pill navigation that wraps** into three rows over the hero at 390 px (Slush mobile, live `slush-m-hero.jpg`).
12. **Brand-board copy that breaks the product facts.**
    - "Every chain inside", "Safe to buy in about 2 minutes", "Usually under a minute".
    - "Clean history" shown on a gift.

## 12. Screenshots (`refs-shots/`, Playwright, 2026-10-26)
- Heroes and full pages at 1440 (`-d-`) and 390 (`-m-`):
  - `family-*`, `phantom-*`, `slush-*` and `gumroad-*` at both widths;
  - `rainbow-d-*`, `glow-d-*`, `zerion-d-*`, `arc-d-*`, `duolingo-d-*` and `base-d-*` at 1440 only.
- The measured press state: `duolingo-press.jpg`.
- `_crops/`:
  - Family: `family-security`, `family-bento`, `family-details`, `family-faq-footer`;
  - Phantom: `phantom-security`;
  - Slush: `slush-a` to `slush-d`;
  - overviews: `*-overview`;
  - the brand sheet: `brand-overview`.
