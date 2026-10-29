# Satchel 2.0: design spec (design lead, 2026-10-26)

**Sources.**
- `context.md` and `rulings.md` (both binding).
- `design-system-impl.md` (the architect; binding for tokens and components).
- `app-inventory.md`, `refs.md` and `voice-copy.md`.
- The brand boards and pack.

**Prototypes and evidence** (all in `proto/`):
- Pages:
  - `landing.html`: the landing with hero **A**, recommended;
  - `landing-hero-b.html`: hero B;
  - `shell.html`: the app shell;
  - `foundation.html`: every component in Day and Night side by side.
- Build files: `tokens.css`, `components.css`, `landing.css`; screenshots in `shots/`.
- Hand-offs:
  - the product designer details the app screens in `app-screens.md` and `proto/app-*.html`;
  - the motion designer builds the motion from `proto/LANDING-CONCEPT-READY.md` and `proto/motion-*.html`.

## 1. The concept
**Landing: "Show the object."** A Satchel is a thing you can hold, fill and hand over, so the landing never explains
it with metaphor art. One sample card, its coin charms (characters with faces) and its signature record appear at real
size, built from real product UI. Each section shows one thing that happens to that card:
1. it holds coins;
2. it has its own addresses;
3. it's made, filled and handed over;
4. its record gets checked;
5. its contract has no key.

The brand line is the page's spine:
- **"Stick it on":** coins stick onto the card, a price tag clips on when it's listed, and the lemon **Yours** sticks on
  when it changes hands.
- **"Hand it over":** the one signature motion, the card's charm swing.
- The page signs off on the brand cover itself: a coral band reading "Stick it on. Hand it over."

**App: "Every screen is something you do to the card."** The card is the home screen of each wallet, and every
other screen is a verb applied to it:
- **Send:** coins leave it.
- **Add coins:** coins arrive.
- **Give:** it swings to a friend.
- **Sell:** it gets a price and pauses.
- **Buy:** its record is checked, then it swings to you.

So the card, or a compact form of it, is in the first screen of every page and flow. Every state reads on the card
first: what's inside, Active, Paused for sale, Yours. In practice:
- Mint ends with a New card;
- Give ends with the swing;
- Buy ends with the Yours sticker landing on the card.

## 2. Principles (each one testable)
1. **One coral action per viewport.** Any 390×844 or 1280×900 screenshot shows at most one coral-filled control.
   Card bands, the finale band and illustration fills are identity, not action (R1 #11).
2. **The object first.** The first screen of every page and flow shows a Satchel card, its compact header (thumb, name
   and pill) or the mini card in the sheet.
3. **Real UI as illustration.** Every landing visual is built from product components (`.card`, `.pill`, `.slip` rows,
   the tracker) using copy keys, never stock art. Illustration labels render from attributes, not the text layer (§4.0).
4. **Native and honest.** No fiat, no "$", no "every chain". Amounts carry tickers; the copy test passes; the
   honesty list holds in prototype copy too.
5. **Stickers only for what you own, press or celebrate.** An outline plus a hard drop appears only on:
   - the card;
   - primary buttons;
   - badges, toasts and hang tags;
   - illustration objects.

   Everything else is a flat panel with a 1 px `line`. Illustration grounds (sky, lemon) are flat fields with no
   outline.
6. **Readable with no motion and no JS.** Every section's server HTML is a complete, meaningful frame. Reduced motion
   shows the same frame, and every loop over 5 s has a visible Pause.
7. **Both themes are first-class.** AA in Day and Night (the architect's verified pairs). Night stickers keep a visible
   edge (R6), and illustrations sit on light fields (`data-scheme="day"` islands), so ink outlines always read.
8. **44 px targets, a visible ring.** Every control is at least 44×44, focus is a 2 px ring with a 2 px offset, and
   there is one `h1` per page.

## 3. Layout system
### 3.1 Grids (mobile-first; breakpoints from the brand: 480 / 768 / 1024 / 1280)
| Width | Columns | Gutter (side) | Column gap | Content width | Notes |
|---|---|---|---|---|---|
| 390 | 4 | 16 | 16 | 358 | One column of content; splits stack text then art; flows are bottom sheets |
| 768 | 8 | 24 | 24 | 720 | Sheets become 480 dialogs; How steps go text beside scene; 2-up card grids |
| 1024 | 12 | 32 | 24 | 960 (landing), 704 (app, beside the 256 side nav) | Side nav appears; 2-column splits (1fr 1fr, gap 56–72) |
| 1280 | 12 | 40 (container 1200) | 24 (card grids 32) | 1200 (landing), 960 (app) | 3-up card grids; landing H1 at its largest |

`container-app` is 1200 for the shell and landing sections, `container-flow` 480 for sheets and dialogs, and
`container-prose` 640 for long text (answers, contract commands). The FAQ list is 820. Measure: body copy stays at or
under 66 characters per line (leads 33–40 rem).

### 3.2 Rhythm
- **Spacing scale** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 (brand space-1 to 12, plus landing steps).
- **Landing sections:** `--section-y` is 56 at 390, 88 from 768 and 104 from 1280.
  - Consecutive plain-ground sections share one gap (`.section--flow + .section--flow { padding-top: 0 }`).
  - Bands (the catch, the finale) carry their own top and bottom.
- **Heading to content:** 36 at 390, 52 from 768. Inside a head, the H2 to the lead is 14.
- **App pages:** the page head (h1 + one action) sits 24 from the content at 390 and 28 from 1024. Content padding is
  24/48 at 390 and 40/64 from 1024.

### 3.3 The app shell (`shell.html`)
- **Below 1024: the one top bar.** 64 tall, sticky, on `ground`, with a 1 px `line` once scrolled.
  - Left: the lockup (32 high, wordmark in `ink`) and the lemon **Testnet** badge, which carries a tooltip with
    `app.badgeTip`.
  - Right, signed in: the account avatar (44 target); signed out: **Connect NEAR wallet**, a secondary button that
    shows "Connect" below 480 and keeps the full accessible name.
  - Then the **Menu** icon button.
- **The menu sheet** (a bottom sheet; inert background, focus trap, focus return, Esc):
  - 56-tall rows with 24 icons: My Satchels, Market, Mint, Contract facts;
  - the ThemeControl;
  - the account line (avatar, name, Copy), then View on NearBlocks and Disconnect;
  - the testnet line.
- **From 1024: the side nav.** 256 wide, sticky and full height, with a 1 px `line` on its right.
  - Top: the lockup (34) and Testnet.
  - Items: My Satchels (`wallet`), Market (`store`), Mint (`sparkles`), Contract facts (`file-code`). The current item
    is `surface-sunken` and bold, with a 4×20 `brand-line` bar on the left edge.
  - Bottom: the account pill (its menu holds Copy account ID, NearBlocks and Disconnect), the ThemeControl, and "Testnet
    only. Coins here have no value."
  - On `/s/[id]`, My Satchels is current only if you own that Satchel.
- **The ThemeControl lives in one place per surface:**
  - app ≥ 1024: the side nav;
  - app < 1024: the menu sheet;
  - landing: the footer's bottom row.

  Today it appears in three places (the inventory's §5.1.2).
- **One footer:**
  - the brand column (lockup and "An NFT that is a wallet.");
  - Product: My Satchels, Market, Mint, How it works;
  - Verify: Contract facts, A live Satchel, README, Repo;
  - Hackathon: NEAR Hackathon.

  The bottom row shows the Testnet badge and a note. The landing note is `footer.testnet` with the theme control beside
  it; the app note is `footer.noteClean`. It has 2 columns at 390, 3 from 480 and 4 from 1024. In the app it sits in
  the content column.
- **One button system** (`components.css` §2), the same on the landing and in the app:
  - primary (the coral sticker), secondary, link, danger, icon;
  - for coral grounds only: **paper** (a white sticker, the primary on coral) and **ghost-on-brand**;
  - sizes md 44 and lg 52, plus xl 56 for the landing hero and finale only.

### 3.4 Page templates
| Template | Used by | Structure |
|---|---|---|
| **Object page** | `/s/[id]` + Activity, Sale | From 1024: `minmax(320,400) \| 1fr`, gap 32, and the object column (card, then the tab's main block) sticks. Below 1024, one column: page head (h1, tabs), the card, the content. Sub-tabs swap the card for the **compact header** (40×25 thumb, h1, pill). Details: `app-screens.md` §1.2 |
| **Flow page** | Send, Give, Add coins, Sell, Mint | The FlowShell: a bottom sheet below 768, a 480 dialog from 768, fitted to content. Head: title (30/34; confirms 20/26), step (input steps only), close. Body scrolls. The foot pins the primary, with a second action stacked under it at 390. The sheet shows the mini card or thumb first (principle 2) |
| **List page** | `/satchels`, `/market` | Head row: h1, count, one action. Grid of `md` cards in `a.card-link`: 1 column below 768, 2 from 768, 3 from 1280; gap 24 (32 from 1024). Under each card, one meta line (a price chip or the gate) |
| **Landing section** | `/` | One idea: a head (H2, optional lead), then one visual, then at most one CTA. Either a **split** (text and art 1fr 1fr from 1024, text first in the DOM so phones read the heading first, art left or right) or **centred** (head over a full-width visual). Bands (`.catch`, `.finale`) span the full width |

## 4. The landing, section by section (`landing.html`)
**What a first-time visitor gets:**
- **In 5 s:**
  - *what* it is: the H1's first sentence, plus a card showing 0.05 BTC and 0.80 ETH;
  - *who* it's for: people selling or handing over a wallet ("Sell a wallet…", then the lead);
  - *why* it's safe: the H1's second sentence, plus the check slip reading "Clean history: checked in the buyer's
    browser".
- **In 60 s**, one idea per scroll:
  1. native addresses;
  2. who uses it;
  3. the three verbs;
  4. the catch, and how the record fixes it;
  5. no admin key;
  6. answers.

**v4 versus 2.0.** The section list is the copywriter's order, but each section was re-decided:
- The hero's diagram desk with seller and buyer seats becomes a real-UI object (card, price tag, check slip).
- The scroll-pinned catch desk becomes a **five-frame strip** that reads at a glance and is itself the no-JS and
  reduced-motion state.
- The trust band gains a real "Contract facts" slip.
- The page ends on the brand cover.

**§4.0 Rules for every section.**
- **Illustration labels render from `data-l` attributes through CSS** (v4's rule), so the server text layer holds
  only copy and the word budget stays honest. The prototype writes them as text inside `aria-hidden` art for
  speed; builders convert them.
- Illustrations are `aria-hidden`. Each figure with meaning has a visually hidden description (`landing.hero.anim.alt`,
  `landing.clean.alt`).
- **Word budget above Questions: 314 of the 320 cap** (`voice-copy.md` §3.9). It doesn't change: the art labels sit
  outside the text layer.

### 4.1 Header (the one top bar, landing variant)
- **Purpose:** wayfinding, plus the one way into the app.
- **Copy:**
  - anchors: How it works, Clean history, Questions;
  - the Market link;
  - **Connect NEAR wallet** (`landing.nav.connect`, now also `nav.connect`).
- **Layout:**
  - **1280:** lockup, Testnet, then the four links (shown from 1024), then on the right Connect (secondary md).
  - **390:** lockup, Testnet, "Connect", Menu. The menu sheet holds the anchors, Market, Mint and Contract facts.
- **Signed in:** Connect becomes one **My Satchels** pill (avatar plus "My Satchels"; avatar only below 480), which goes
  to `/satchels`. The landing stays data-free (D-42): the pill comes from client wallet state only.

### 4.2 Hero (option A, "the shelf", recommended; B in §4.10)
- **Purpose:** the 5-second test.
- **Copy:**
  - The H1 is **C**, "Sell a wallet with everything inside. The buyer checks it first."; A and B can be swapped in with
    `?h1=a|b`.
  - **The H1 is two-tone:** the first sentence in `ink`, the second in `ink-muted` (5.6:1).
  - Lead: `landing.hero.lead`, 2.0.
  - CTAs: **Look inside a Satchel** (xl primary, the viewport's one coral, going to `/s/1`) and **See Satchels for
    sale** (xl secondary).
  - Note: `home.note` with `info`.
- **Layout:**
  - **1280:** centred copy with the H1 on two lines (62/64, one sentence per line, up to 1200 wide), the lead at 40 rem,
    the CTAs in a row. Then the **shelf**: a full-width flat sky field (radius 44) holding a 700-wide scene (318 tall).
    In it:
    - the lg card ("Satchel" with no number, 0.05 BTC, 0.80 ETH, Paused for sale);
    - the **300 NEAR** hang tag;
    - the **check slip**, tilted 2.5° and overlapping the card's lower right: "3 past signatures · Checked in the
      buyer's browser · Signature 1–3 Used · Clean history";
    - two lemon sparkles.

    The BTC and ETH coins hang on strings at the shelf's two ends (shown from 1100).
  - **390:** left-aligned. A small charm row above the H1 (two coins on a strap, the one illustration cluster in the
    first screen). Then the H1 (40/42, four lines), the lead, the CTAs stacked full width, the note. The shelf follows
    as a 318×336 scene with the same objects.
- **Interaction:** the CTAs, and Pause.
- **Motion hooks:** `figure.stage[data-stage][data-act]`, `data-el` on every object, `[data-pause]`. A four-act loop
  (inside → listed → checked → coins included, with the swing and Yours). Spec in `LANDING-CONCEPT-READY.md`.
- **No JS and SSR:** act 3, fully drawn (for sale, checked, clean). The four captions are an `ol` of real text; the
  visible caption is `aria-hidden`.
- **Reduced motion:** act 3, no loop, Pause hidden.

### 4.3 What it is (`#what`)
- **Purpose:** answers "real or wrapped, and who can move it?".
- **Copy:** NEW `landing.what.h2` "One NFT. Its own addresses." and `landing.what.body` (voice-copy §3.2, 41 words).
- **Layout:**
  - **1280:** a split with the art on the left. The art is a flat `surface` panel holding the md card, with two
    **address tags** hanging from its bottom edge on ink strings: the BTC charm with "Bitcoin address · tb1q…" and the
    ETH charm with "Ethereum address · 0x…".
  - **390:** head, then the art; the tags read "Bitcoin" and "Ethereum".
- **Visual:** the addresses are physically attached to the card, so "they go with it" without a word.
- **Motion hook:** the tags drop in and sway once (±4°). **Static** under reduced motion and without JS.

### 4.4 Use cases (`#uses`)
- **Purpose:** who it's for.
- **Copy:** `landing.uses.h2` and `lead` "One NFT, one step.", plus the 3 items (voice-copy §3.3).
- **Change:** the v4 hang tags (`landing.uses.tags`) are dropped as chips. Beside the titles they read as noise; delete
  the key or keep it for art.
- **Layout:**
  - **1280:** a split, the head on the left; on the right a ruled list of 3 rows, each a 64 sticker tile (lemon `tag`,
    sky `gift`, white `users-round`), an H3 (heading 20/26) and the body.
  - **390:** the head, then the rows (56 tiles).
- **Motion:** none, or a 2 px hover lift. Static.

### 4.5 How it works (`#how`)
- **Purpose:** the three verbs; "Stick it on. Hand it over." in practice.
- **Copy:** `landing.how.h2` "Mint it. Add coins. Hand it over." and the three steps (voice-copy §3.4).
- **Layout:** a centred H2, then three panels (flat, radius 28). Each panel has a 232 scene on top, then a number disc
  (inverse), an H3 and the body.
  - **1280:** 3 columns.
  - **768:** each panel turns into a row, the scene beside the text.
  - **390:** stacked; scenes 206 tall.
- **The scenes, all real UI:**
  1. on **lemon**, the New Satchel card with its New badge and lemon sparkles;
  2. on **sunken**, a mini signing tracker: Approved in your wallet, then Signing with "Usually about 10 seconds.", then
     Sent;
  3. on **sky**, the card hanging from a pin in its −8° swing pose, over a "New owner" chip.
- **Motion hooks:** step 1 sticks on; step 3 plays the swing once on enter. The drawn poses are the static state.

### 4.6 Clean history (`#clean`): the catch
- **Purpose:** the differentiator. Why a wallet sale is normally unsafe, and what Satchel does about it.
- **Copy:** `landing.clean.h2` and the five beats, unchanged, with the desk labels from `landing.clean.labels` and
  `landing.desk`.
  - **The 2.0 label changes:** "Settled" becomes "Used", and the pill set follows `copy.pill`.
  - **The browser-not-contract disclosure** stays only in `#q-proves` (D-42).
- **Layout:** a full-width `surface` band. The H2 sits on the left, then two chapters side by side from 1024
  (2 : 3):
  - **"Without a record"** (danger pill): frames 1–2;
  - **"With Satchel"** (success pill): frames 3–5.

  Each frame is a 224 desk (196 at 390) with its beat under it, numbered. The takeaway beat 5 is bold with a success
  disc. The frames are 2 per row from 640 and stacked at 390.
- **The frames:**
  1. the card, and a **Signed transfer** note "Send 0.80 ETH · Signed, not sent";
  2. a brand-soft desk: the Buyer chip, the card with **0.00 ETH** and a **sad** ETH coin, and a "Moved after the sale"
     stamp;
  3. the record slip "Recorded on NEAR", with Signature 3 highlighted;
  4. "1 unused signature" in danger, with Unused and a grey locked Buy;
  5. "Clean history", every row Used, and a **coral Buy**: the viewport's one coral, an illustration.
- **Motion:** light and scroll-driven; each frame plays its one change as it enters (`LANDING-CONCEPT-READY.md`). An
  autoplay sequence on lg is optional and must have Pause.
- **No JS and reduced motion:** the strip as drawn. The strip *is* the story.

### 4.7 Trust (`#trust`)
- **Purpose:** what you trust, said calmly (Family's pattern), with real UI as proof (Phantom's).
- **Copy:**
  - `landing.lock.h2`, `body` and `limits` (bold lead);
  - the **See the contract facts** secondary (lg);
  - the **Under the hood** `<details>`, with the summary, the 6 rules (voice-copy §3.6: rule 3's 2.0 body) and the 5
    "Check it yourself" links.
  - The `dev` and `rc` variants are unchanged.
- **Layout:** a split, text left and art right.
  - The art is a flat **lemon** field holding a **Contract facts** slip: Access keys "None since birth", Admin methods
    "None", Code hash "Matches", and the verdict "Born without a key". The BTC and ETH coins **peek** over the slip's
    top edge.
  - **390:** text, then the art.
- **Motion hook:** the coins peek up once. Static under reduced motion.

### 4.8 Questions (`#questions`)
- **Copy:** the seven `landing.questions`; `q-after` and `q-cost` take their 2.0 text (voice-copy §3.7). The first
  sentence of each answer is bold.
- **Layout:** centred, 820 max. Native `<details name="faq">` summaries in Funnel Display 20/26, at least 72 tall, with
  a `plus` that turns 45°. All answers are in the server HTML; no JS.

### 4.9 Final CTA (`#try-it`): the brand cover
- **Purpose:** the sign-off, and the brand line's home.
- **Copy:**
  - `landing.cta.h2` "Stick it on. Hand it over." (or "Try it on testnet" if the H1 is B);
  - `landing.cta.body`, 2.0;
  - **Look inside a Satchel** (xl **paper**: the primary on coral) and **Mint a Satchel** (xl ghost-on-brand);
  - `home.note`.
- **Layout:** a full-bleed coral band (`data-scheme="day"`, constant in both themes) with an ink H2 at
  clamp(48–104)/0.95.
  - **1280:** copy left; the **charm S** (330) right, as on the Main board.
  - **390:** the S at 132 above the H2, the buttons stacked.

  The S is the charm, never the tiled mark: the brand bans the mark on coral.
- **Motion hook:** the S sticks on once (scale and drop). It never rotates.

### 4.10 Hero option B, "the split" (`landing-hero-b.html`)
- **What differs:** the copy sits left (H1 66/64 on four lines, two-tone), and the same stage sits right in a sky field.
  - Everything, the whole story included, fits in the first 1280×900 screen.
  - There are no hanging coins at the shelf's ends.
  - At 390 it is identical to A.
- **Why A is recommended:**
  - The two-line H1 is a cleaner hierarchy: the line is read first, the object second.
  - The centred composition with characters at the edges is friendlier (the Family pattern).
  - The shelf gives the loop more room.
- **What B wins:** the full story above the fold on short laptops, and a shorter page (by about 300 px).

## 5. The app (hierarchy at the level the product designer details; `app-screens.md` owns the detail)
| Screen | First screen at 390, top to bottom | One primary | The object |
|---|---|---|---|
| `/satchels` (NEW app home) | h1 "My Satchels" + count + Mint (secondary); the escrow banner if owed; the cards | Withdraw when owed; else none (Mint in the empty state) | The `lg` cards (`md`, 3-up, at 1280); no Yours here |
| `/s/[id]` owner (Wallet tab) | h1 "Satchel #1" + tabs; the lg card with the Yours sticker; the 2×2 actions (Send primary · Add coins · Give · Sell) | **Send** (or **Add coins** when empty; **Stop selling** when listed is a secondary, never coral) | The card is the page |
| `/s/[id]` visitor | h1 "This NFT is a wallet." + sub; tabs; the card; the offer block if listed | **Buy for {price}** if listed (in the first 400 px at 390, with a pinned buy bar); else none | The card |
| Activity / Sale tabs | Compact header (thumb, h1, pill) + tabs, then content | Buy: the pinned bar | Thumb |
| Send · Give · Add coins · Sell · Mint | The sheet: title, step, mini card or thumb, then the step's content; the primary pinned | The sheet's one CTA | The mini card (Give ends on the swing; Mint on the New card) |
| `/market` | h1 "Market" + "{c} for sale"; 1 / 2 / 3-up cards, each with a price line and its gate | None (each card is a link) | The cards |
| `/contract` | h1 "Born without a key"; the facts as a flat `dl`; the commands with 44 copy buttons | None | A slip-style facts panel (the landing's) |
| Not found | The charm S on sky; "This Satchel doesn't exist"; Mint + My Satchels | Mint a Satchel | The charm S |

**Signature moments,** where delight is allowed (the delight curve in `refs.md` §0.5):
- the first mint (the New card sticks on);
- Give success (the swing; the Given pill);
- a sale settles (the swing; Yours for the buyer, Sold for the seller).

Everything else stays calm: a press, a sheet, a toast.

## 6. System decisions
1. **The owned signal: the lemon "Yours" sticker** (R1 #3 refined).
   - It sits after the name in the band, tilted −4° (`.badge--yours`, `data-yours`), and sticks on with the badge
     motion after a buy.
   - It shows wherever the viewer owns the card, except the My Satchels grid, where every card is yours.
   - `data-owned` stays. `[data-stitch]` becomes `[data-yours]` in the tests.
2. **Per-token identity: none beyond what's inside.**
   - The band is always coral (identity), and the per-token hue is gone (R1 #6).
   - Cards differ by the charms and native amounts they hold: honest, and legible on the Market grid. A price line sits
     under listed cards.
3. **The card hero: the charm ledger.** Decided with the product designer in `proto/CARD-HERO.md`:
   - one line per chain: charm, amount (Funnel 800, tabular), ticker;
   - sizes stepped by container: lg 32/36, md 24/28, sm 19/23;
   - SOL rows only with `SOL_UI_ENABLED`.

   "{n} chains" is retired from the card. The NFT image keeps "{n} signatures" (architect §8). The judge pin changes
   from "2 chains" / "BTC 0.00189718" to "0.00189718 BTC".
4. **One shell.**
   - One top bar, with a landing variant and an app variant.
   - The side nav from 1024.
   - One menu sheet pattern (inert, trapped, 56 rows).
   - One footer component.
   - One button system.
   - One ThemeControl per surface (§3.3).
5. **One connect label: "Connect NEAR wallet"**, everywhere (header, guards, Buy, Mint), with "Connect" visible below
   480. This changes the `nav.connect` unit pin.
6. **The app home `/satchels`** (R4). `/` stays marketing. The landing header shows "Connect NEAR wallet" signed out
   and the **My Satchels** pill signed in.
7. **R6, the Night sticker outline: `#8A82AE`** (= `line-strong`, 4.85:1) as `--sticker-line` in Night, with the
   #000 drop kept. `shots/night-outline-compare.png` shows the canvas (A), the choice (B), #706A9F (C) and a tinted
   drop (D).
   - Badges and illustration objects keep the constant ink outline (`on-brand`), because they sit on light fills.
8. **Coral on cards.**
   - Actions sit outside the card (a `figure` holds no controls); this solves the board's in-card coral Send.
   - On the coral finale, the primary is the **paper** button.
   - Night `ink` never goes on coral; `on-brand` does.
9. **Illustration grounds are flat** sky and lemon fields with no outline, and the objects on them are the stickers.
   This reads as premium rather than clip-art, and halves the borders. Light fields keep the ink-outlined charms
   legible in Night.
10. **Two delight assets, used sparingly:**
    - `assets/sparkle.svg` (lemon, ink outline; the brand's "sparkles"), for celebrations only;
    - `assets/chain-eth-sad.svg` (the same coin with its smile flipped), only in the catch story's loss frame.

    The S never gets a face, and the charms keep their brand faces everywhere else.

## 7. Decision log
| # | Decision | Why | Changes |
|---|---|---|---|
| DL-1 | Concepts: landing "Show the object"; app "every screen is something you do to the card" | Razvan's "value-first, simulated, explanatory"; the brand's sticker card is the one asset no other wallet has | — |
| DL-2 | Hero A "the shelf" in `landing.html`; B "the split" in `landing-hero-b.html`; identical stage hooks | A real choice of hierarchy (§4.10) | Motion fits either |
| DL-3 | The H1 renders two-tone, for any option | A cleaner hierarchy: the what, then the why | None in copy |
| DL-4 | Eight landing sections, in the copywriter's order, each re-decided (§4) | One idea per section; the 5 s / 60 s test | All landing specs (expected) |
| DL-5 | The catch is a five-frame strip, which is also its no-JS and reduced state; the motion is light and scroll-driven | Reads at a glance; no sticky pinning to break; honest without JS | `landing-catch` spec |
| DL-6 | The card hero is the charm ledger (CARD-HERO.md) | R4 | `judge.spec` card text |
| DL-7 | The Yours sticker replaces the stitch; not on My Satchels | R1 #3 | `[data-stitch]` → `[data-yours]` |
| DL-8 | No per-token identity; coral band always | R1 #6, legibility | `card.test` (UI only) |
| DL-9 | One shell, one footer, one button system, one ThemeControl per surface | The inventory's §5.1.4, §5.1.10 | `responsive.spec`, `theme-a11y` |
| DL-10 | One connect label: "Connect NEAR wallet" | One product voice | `nav.connect` pin |
| DL-11 | The app home `/satchels`; the landing header's My Satchels pill | R4 | New route |
| DL-12 | Night `--sticker-line` #8A82AE, #000 drop | R6 | `contrast.test` pairs |
| DL-13 | Illustration fields flat; illustrations in `data-scheme="day"` islands; labels from attributes | Premium, legible in Night, a clean text layer | — |
| DL-14 | Delight assets: sparkle, sad coin (sparingly); the S never rotates or gets a face | The delight curve; brand rules | — |
| DL-15 | Copy changes beyond voice-copy: the uses tags dropped; new art labels (`desk.checkedBy` "Checked in the buyer's browser", what-tag labels, the trust slip rows "Admin methods / None") | Needed by the real-UI art; all `aria-hidden` and attribute-drawn | `copy.ts` additions |

## 8. Open questions for Razvan (each with a recommendation)
1. **The landing H1.**
   - **A (D-41):** "A wallet you can sell, with a history the buyer can check."
   - **B:** "Stick it on. Hand it over."
   - **C:** "Sell a wallet with everything inside. The buyer checks it first."

   **I recommend C, two-tone.** It says what it is and why it's safe, and B lives in the finale. To compare, use
   `landing.html?h1=a`, `?h1=b` or `?h1=c`.
2. **The theme rule.**
   - **(a)** System by default, so Night on a dark OS (brand 2.0).
   - **(b)** Day whatever the OS (D-42).

   **I recommend (a).** Brand 2.0 came after D-42. The 2.0 Night keeps coral, lemon and sky islands, so it reads
   friendly, not gloomy (`shots/landing-1280-night.png`, `shell-*-night.png`). (b) is a one-line switch (`tokens.css`
   header).
3. **The hero layout.**
   - **A "the shelf":** centred, a two-line H1, the object below.
   - **B "the split":** copy left and the object right, all in one screen.

   **I recommend A.**
4. **The Night sticker outline** (R6 picked it; confirm the look).
   - **#8A82AE** (chosen): a visible, Duolingo-like light edge.
   - **#706A9F:** a quieter border.
   - **The canvas:** invisible; only the coral band reads.

   **I recommend #8A82AE** (`shots/night-outline-compare.png`).
