# Design QA (W4, the design critic with commit rights), 2026-10-26

**Counts: 42 found · 25 fixed · 17 accepted (with reasons).** QA-POLISH #1 verified fixed (by S); #3 fixed here.
Typecheck and lint clean; unit **340/340** (339 + 1 new). Logic, test ids and `data-*` contracts unchanged.

**Evidence** (`<R>/build/shots/QA-D/`):
- `sweep/`: live vs prototype for 32 states × 390/1280 × Day/Night (`P-*` proto, `L-*` live, `pairs/`, `quads/`,
  `sheets/`); `audit.jsonl` is the in-page brand audit of every capture.
- `extra/`, `extra1280/`: 55 more states (send outcomes and guards, give errors and guards, buy variants, sell variants,
  sold, escrow, menus, mint variants). `resp/`: 18 routes × 7 widths. `motion/`: frame strips. `sweep2`–`sweep4`: after.
- Scripts (throwaway, scratchpad `qa-d/`): `sweep.mjs`, `extra.mjs`, `resp.mjs`, `motion.mjs`, `audit.js`, `anchors.mjs`.

## 1. Deviations found and fixed
| # | Where | Deviation | Fix |
|---|---|---|---|
| F1 | Landing hero | Blind test: "who it's for" 1/3, never named | NEW `landing.hero.who` "For anyone selling or gifting a wallet" (7 words: one line down to 320). It's a quiet eyebrow above the H1: a sunken pill, `text-body-sm` 600 `ink-muted`, `data-hero-who`. The H1 and the lead are untouched. Budgets: hero 53→60 (61 with SOL), above Questions 314→321 (cap 320→325). **Charms:** I considered labels on the hanging charms but didn't add them. The stage's card already pairs each coin face with BTC/ETH, so labels would only add clutter |
| F2 | `/satchels` empty and signed out | 24 px of extra space above the empty state (`py-6` plus the head's `mb-6`) | `pb-6`: now pixel-equal to the proto (only the Sample-data strip offsets it) |
| F3 | `/satchels` signed out | The charms used the brand pack's composition: 74 px coins, art 168×124. The proto's strap has 52 px coins, art 168×75 | `ChainCharms layout="strap"` (the proto's `.mint-charms`), via `EmptyState art="charms"` |
| F4 | Mint, first mint | Same charm composition at 144 px; the proto is a 168 px strap | The same strap. The swing still works: each coin is a top-level `<g>` |
| F5 | Activity footer | "Missing something?…" link is 16 px; the proto is 15 | 15/20 |
| F6 | Every external link | When a link wraps, its ↗ is stranded at the far right (Activity footer, record evidence, the receive faucet) | `ExternalLink`: the label and the arrow are one inline run |
| F7 | Activity rows, 320–1024 | The title truncates an already shortened address ("Sent to tb1qaa…"), and the end you recognise is lost | Two lines at most. NEW `KeepWhole` keeps "tb1qaanv…y8sd" unbroken, because Chrome breaks after "…". The text is unchanged |
| F8 | Clean history (QA-POLISH #3) | The blocked verdict repeats itself: "Ethereum · nonce 1: Nonce 1 not used yet." The record rows also repeat their key ("Ethereum · nonce 0" / "Nonce 0 used by …") | Verdict: "Ethereum · nonce 1 isn't used yet. The seller has to clear it first." Rows: "Used by 0x2a55…84e1 · 3 confirmations". BTC "Spent in …" didn't repeat; the Sell checklist has no evidence. `itemPhrase` and `rowEvidence` in Clean.tsx, with unit tests |
| F9 | Buy done, 1280 | The takeover opened 167 px down the page (Buy is pressed low on a long page), so half of the hand-off was off-screen | Scrolls to the top on mount |
| F10 | Sold (C's sentence column) | C put the sentence and the payout line under the stage in the object column, and the receipt in main. The proto puts the stage in the column and the sentence, payout, escrow and receipt under the tabs | `Handoff split` (stage = sticky column; the rest = main). The receipt now fades in with the sentence. Withdraw is **lg** on Sold and **md** on `/satchels`, as in each proto (`EscrowPanel size`) |
| F11 | Sale tab (Buy and Sell) | "You get", "The record", "How buying works" and "What buyers see" were bare 26 px h2s. The proto uses 44 px `.section-h` rows, like Inside and Facts on the Wallet tab | 44 px head rows. The section rhythm now matches the proto within 1–2 px (measured by text anchors) |
| F12 | Buy offer | "Price" eyebrow was 14 px (proto 15). "Get testnet USDC" was a 20 px target | 15 px; a 44 px row, as in the proto |
| F13 | Send amount | The hero amount's ticker was Onest 15/600; the proto is Funnel 800 22/26 | `AmountInput align="center"` |
| F14 | Send/Sell amount box | Only the input focused on tap, and it is 22 px wide while empty | The whole box focuses it. An aria-hidden empty label sits underneath, and only the input and the buttons take pointer events. Max still works |
| F15 | Send review | The time chip was shrink-wrapped; the proto's spans the full width | Full width |
| F16 | Object tabs | The Buy, Sell and Sold targets were 30–36 px wide | ≥ 44 px (the 3 px underline stays the label's width) |
| F17 | Link buttons, footer | "Max" was 34 px wide and the footer's "Mint" 29 px | `min-w-11` on link buttons and footer links |
| F18 | Top bar, 320–360 | Signed out at 360, Menu was squeezed to 40 px. At 320 the brand tile was 32 px wide | Icon buttons never shrink; gaps are 8 px below 380; the brand link is ≥ 44 |
| F19 | Compact header, 320 | "Satchel #3" was truncated to "Satchel #…" beside "Paused for sale" | The name never truncates. The gaps tighten, and the pill wraps if it must |
| F20 | Tabular figures | Missing on the amount CTAs (Send, Buy, List), the "For sale at…" lines, the NEAR fee, the receipt, Facts, detail and contract values, the would-pay lines, the tracker heading and the for-sale headings | `.morph` is tabular; `t-num` on those cells and headings |
| F21 | Hand-off ends | "You" was set in Geist Mono | Onest 600. Mono only for accounts |
| F22 | Freshness | "Server check 0 s ago", "Read from … 0 s ago", next to a gate that says "just now" | "just now" under 5 s everywhere (`checkedAgo`) |
| F23 | Empty states | The charm S was 96 everywhere. The proto uses 72 in tabs (Not for sale, Activity empty) and 80 on Market | `EmptyState artSize` |
| F24 | Seller's Wallet tab | "See the receipt" broke over two lines | `nowrap` |
| F25 | Receipts at 1024 | The Sold receipt (a 352 px column) used 2 columns and broke "carol.satchelhq.testne / t" mid-word | The receipt's 2 columns follow its own width (`@container`, ≥ 384 px), not the viewport |

## 2. Accepted, with reasons
| # | What | Why |
|---|---|---|
| A1 | **X's full-height sheets** (Send, Give < 768). The proto fits step 1 to its content | Accepted. MOTION-NOTES #5 wants a stable top edge, and the review step needs the full height at 390, so any stable min-height *is* the full height. Guards and Mint still fit their content |
| A2 | Withdraw and Stop selling are wider than in the proto | The `Morph` keeps the widest label ("Approve in your wallet…"), so CTAs never resize (motion-spec §3) |
| A3 | Market order: #5 before #3 (the proto shows #3 first) | `marketOrder` is logic. Buyable first and blocked last both hold |
| A4 | The account sheet has no Theme row and has a close button (the proto has a Theme row and no close) | DL-9: one ThemeControl per surface (the menu sheet or the side nav). The close button matches the menu sheet |
| A5 | Buy done ends read From/To and show the dashed ghost. The proto shows "Seller" under alice and the account under You, with no ghost | Consistent with Give and Sold, and with motion-spec §2 (the ghost is "the empty place it left") |
| A6 | Send step 1 has no fee line | The fee exists only once Review prepares the transaction (logic) |
| A7 | NEAR fee: "(gas + permanent signature record) · paid by your NEAR account" | Verbatim copy by rule (kb/90 §8.9). The proto paraphrased it |
| A8 | Activity: the unused signature lacks "(nonce 1)" and shows the generic note | The activity row model has no nonce (data) |
| A9 | The toast is centred on the viewport at 1280, not on the content column | The spec says bottom-centre |
| A10 | Names in the hand-off ends are ellipsized; the side nav's account pill is truncated | By design (§7.3). The full accounts are in the receipt and the account menu |
| A11 | Inline links under 44 px tall (record evidence, the Facts contract, receipt tx links) | Links in running text or values (the WCAG 2.5.8 inline exception), as in the proto |
| A12 | Prose amounts use proportional figures ("bob… now controls 0.00189718 BTC…", "You now control…") | Running text. The proto is the same |
| A13 | Copy: "Give a funded wallet" (the uses title); Activity's "Listed for 2 NEAR" | The first is an adjective, decided in voice-copy §3.3. The second is the allowed event |
| A14 | The receipt stamp reads "Oct 26, 15:52 UTC"; the proto reads "today, 09:16 UTC" | Formatting is logic. Both are honest UTC |
| A15 | Dev console on `/s/999`: "Encountered a script tag…" | Next's error document. QA-POLISH #6 is the test QA's |
| A16 | **Fixture only:** after a mint, "Open Satchel #8" lands on not-found | #8 exists only in the session's sim; the server doesn't know it. Live reads the chain. Data layer, not UI: flagged for the test QA |
| A17 | The Sample-data strip (34 px) offsets every app page | Fixture mode only |

## 3. Brand rules audit (every capture, Day and Night)
- **One coral action per viewport:** holds in every state. The card bands on grids are identity (R1 #11). The coral
  "Buy" in the catch strip's frame 5 is an illustration.
- **Text on coral, lemon and sky is `on-brand`:** 0 violations, and no white text on coral.
- **Stickers only on allowed elements:**
  - the cards;
  - primary and paper buttons;
  - badges and toasts;
  - illustration objects: the landing slips, cards and tags, and the empty-state sky panel.
- **Night outline:** #8A82AE on every themed sticker. Light fields, badges and the paper button keep the constant ink
  outline (DL-12, §6.7).
- **Lucide:** stroke 2 everywhere. Sizes are 14/16/20/24, except the proto's own 12 (activity badges), 18 (keyless,
  strip marks) and 28 (the verdict tile).
- **Charms:** coins with faces, never real logos. The S never rotates: the finale stamps on `translate` only, and the
  static tilts are on Yours, New, the slip, the tag and the give pose.
- **Funnel Display:** only on headings, amounts, card names, number discs and avatar initials.
- **Geist Mono:** only on addresses, hashes, accounts and the `/contract` commands. "You" was the one exception (F21).
- **Tabular figures:** on every amount control and value (F20). Prose is excepted (A12).

## 4. Copy audit (rendered text, aria labels, titles, `data-l`; both themes; all 87 states)
- **0 hits** for Transfer, Delist, Fund/funds (the verb or noun), Settled, Settling, Foreign, Fixture, holder, `$`,
  "every chain", cooldown and "Safe to buy".
- **Allowed:** "Listed for 2 NEAR" (the event), "Listing #n", the chain-level "transfer" in the catch story and hood
  rule 1, and "a funded wallet" (A13).
- **The copy modules** carry no retired words in their values. A grep of `copy/*.ts` turns them up only in key names
  (`delist`, `fund`, `settling`, `foreign`, `fixture`).

## 5. Motion review (frame strips in `motion/`, seeked through `__satchelMotion`)
- **Hero loop** (390 and 1280, 22 frames each): the stage's height and position never change (CLS 0), nothing draws
  outside the sky field, and the acts, captions and seam play as specified. Reduced motion and no JS show the act-3 frame
  with no Pause button.
- **Once-on-enter moments:**
  - What: the tags swing in;
  - How: mint drops in with New and the sparkles, and give settles from −8°;
  - the catch: beats 1–5;
  - Trust: the coins peek;
  - the finale: the S stamps with no rotation.

  All match the spec.
- **Give hand-off** (390 sheet, 1280 dialog): 0 sheet shifts, and the swing stays inside the sheet (the card spans
  149–357 of 390). Yours peels, the pill rolls Active → Given, the sparkles appear, and the sentence comes at 1200.
  Reduced motion: the 480 ms dip.
- **Buy hand-off:** correct, apart from the 1280 scroll position (F9).
- **Mint:** the card drops in, the coins stick on at 420 and 540, Yours at 720, the line at 900, and the charms swing on
  the first mint. Reduced motion: fades.
- **Sheet and dialog:** both open and close as specified (the dialog doesn't drift). Reduced motion: an opacity fade.
- **Toast:** rises above the pinned bars. **Press:** 4 px plus a 0 drop, with `data-pressed` held at least 100 ms. The
  reduced-motion fallbacks all show their end state.
- **Nothing jitters, clips or flashes.**

## 5b. Responsiveness (320, 360, 390, 768, 1024, 1280, 1440 × 18 routes and flows)
- **0** horizontal scroll and **0** elements wider than the viewport.
- **Clipped text:** fixed (F7, F19, F25); the rest is accepted (A10).
- **Targets:** every control is ≥ 44 after F14–F18, except inline links (A11).
- QA-POLISH #1: the How it works steps are top-aligned at 768 and stack at 1024 and 1280 (verified).

## 6. For the test QA: specs my fixes touch (rerun these)
- **`landing.spec`:**
  - the who-line is first in the hero's server HTML order;
  - `WORDS` hero 61 and above Questions 325;
  - the 390 hero order now includes `[data-hero-who]`.
- **`responsive.spec`:** the hero order (`[data-hero-who]`); the tab, Max, footer-link and top-bar targets at 320 and
  360; the compact header at 320.
- **`judge.spec`:** the /market hint regex now accepts "just now" (`Server check (.+ ago|just now): …`).
- **`flows.spec`:**
  - "sale gating" now pins "Ethereum · nonce 1 isn't used yet";
  - mint (the first-mint charms);
  - give and buy done (scroll to top);
  - the record rows' evidence text.
- **`sale-sol.spec`:**
  - the Sold receipt is restructured (`sold-receipt` > the split Handoff > `escrow`, `sold-rows`, `sold-paid`; the test
    ids are unchanged);
  - on a first view the receipt fades in with the sentence (Playwright waits for stability);
  - Withdraw is lg.
- **`theme-a11y.spec`:** the amount box's empty aria-hidden label. axe may list `form-field-multiple-labels` as "needs
  review" (not a violation; the accessible name is unchanged).
- **Unit** (already updated and green): `config-copy-theme` (the who-line and budgets), `hero-loop` (the hero order),
  `clean-view` (the blocked phrase, plus a new `itemPhrase`/`rowEvidence` test), `satchel-object` (KeepWhole markup).

## 7. Files changed
- **Copy:** `lib/copy/landing.ts` (`hero.who`).
- **Components:**
  - `landing/HeroSection.tsx`;
  - `ui.tsx` (link and icon button widths, `RouteTabs`, `ExternalLink`, `KeepWhole`, `EmptyState artSize`,
    `AmountInput`);
  - `brand/ChainCharm.tsx` (`layout="strap"`);
  - `NavShell.tsx`;
  - `Clean.tsx`, `Timeline.tsx`, `Facts.tsx`;
  - `client/{Handoff,SoldReceipt,SaleTab,SatchelPage,SendFlow,SigningProgress,MintFlow,MySatchels,ActivityInProgress}.tsx`.
- **Pages:** `app/(app)/{market/page,s/[id]/activity/ActivityView,contract/page}.tsx`.
- **CSS:** `globals.css` (`.morph` tabular).
- **Tests:** `test/unit/{config-copy-theme,hero-loop,clean-view,satchel-object}.test.ts`;
  `test/e2e/{landing,responsive,judge,flows}.spec.ts` (pins only).
