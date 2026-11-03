# Landing refresh: design notes for the builders (landing designer, 2026-11-03)

**Status:** final, all sections. §1, the strip, has not changed since the copy builder started on it, apart from the help link's
focus ring (§1.3).

**Prototype (a working file, not kept; the built landing is the reference):** `design/landing-refresh.html`. It was
the server HTML of `/` from :3210 (role final, fixture data), with
its scripts stripped and the refreshed scenes swapped in. So every class, token and font is the shipped one.
- **Serve it:** `python3 -m http.server 3612 --directory design`.
- **URL options:**
  - `?theme=night`;
  - `?motion=static` (the server frame, the same as no JS or reduced motion);
  - `?t=7900` (seek the hero loop and hold);
  - no option: the loop plays, with a working Pause.
- **What to port:**
  - `assets/refresh.css` is the CSS delta, written as `landing.css` code: raw tokens, `.lp-*`, the `lpcard` tiers;
  - `assets/hero-timeline.js` is a plain-JS port of `timeline.ts` with the new act 1. Port its blocks marked NEW;
  - `landing-current.html` is the untouched baseline.
- **Tooling:**
  - `build/build.py` assembles the page. The new scenes are the HTML the proposed components render;
  - `build/check-timeline.mjs` runs `hero-loop.test`'s invariants against the new timeline. It passes:
    `keys 37, tracks 79, fails 0`.
- **Shots:** `shots/`. See §8.

---------------------------------------------------------------------------------------------------------------------
## 0. What changes, in brief
1. **One card everywhere, the app's D-50 card**, drawn in the art system (attribute labels; no `SatchelCard`, no
   `@/lib/near`, no client island):
   - "≈ $8,000.00", with "at mainnet prices" under it;
   - the state pill top-right;
   - the value bar (BTC 50 · ETH 25 · SOL 15 · USDC 10);
   - the chips: "BTC 50% · ETH 25% · SOL 15% · +1" from 352 px of card, and "BTC 50% · ETH 25% · +2" below.
2. **Scenes:**
   - the hero, What and How step 3 get the card;
   - How step 1 gets the app's **empty** card;
   - the catch strip's desk 1 gets the card (mini);
   - the catch's desk 2 keeps a **ledger detail** (the buyer's holdings rows, 0.80 → 0.00 ETH), drawn as a slip, not a
     card.
3. **The hero loop:** the same 4 acts, 12 s, Pause, server frame, reduced motion and no-JS. Only act 1's coin block
   changes:
   - three chips stick on;
   - the bar fills share by share (`scale` x from the left);
   - "+N" appears;
   - the estimate rises in whole.

   That's 37 `data-k` keys (31 − 6 + 12). Every other track is unchanged, number for number.
4. **Phones:**
   - the hero's state pill is icon-only below 300 px of card, so "≈ $X" never truncates;
   - the 2,000 NEAR tag (R9) is tightened and moved left, so it clears the slip;
   - the shelf grows with the card above 390, so the slip clears the chips.
5. **The strip** "What else it does" (§1): five items, after Trust.
6. **Heights:**
   - 390: 8,450 → **8,915**, cap → **9,000**;
   - 1280: 5,833 → **6,184**, cap 6,500 holds.

---------------------------------------------------------------------------------------------------------------------
## 1. The strip "What else it does" (FINAL)

### 1.1 Decisions
- **Placement:** after Trust (and its Under the hood), before Questions.
  - The core story runs first: what it is → who it's for → how → the catch → no admin key.
  - Then the extras, as a short coda. The FAQ under it answers what the strip raises; its help links point there.
  - Placing it earlier would split a pair: How → Clean ("hand it over" → "but a signature can outlive a sale"), or
    Clean → Trust (the two safety sections).
  - Cost: the strip sits above Questions, so the visible-words cap becomes **380** (R9). copy.md §5 counts 374.
- **Pattern:** strip-refs pattern 1 (an icon, a title, one line).
  - No card chrome, no borders, no fill, no stickers, no coral (the strip has no action), no motion.
  - The icon sits in a flat sunken disc. It stays quieter than the Uses section's sticker tiles above it, so the page
    keeps one "big" list (Uses) and one "small" list (the strip).
- **Layout for five items:**
  - **phones (< 768):** one list of 5 rows. Each row is the disc on the left, then the title (with its "?") and the line
    under it. No orphan cell, and every title stays on one line down to 320;
  - **768–1279:** a 3 + 2 grid, stacked (the disc above the title);
  - **≥ 1280:** one row of five, stacked. It reads as a calm feature bar after the Trust split.
- **Help links** (copy.md §3): four items get the app's `HelpLink` look, a 16 px `CircleQuestionMark` in ink-muted
  (ink on hover).
  - Each has a 44 × 44 target, pulled back with negative margins so it never grows the title's line. landing.spec's
    "≥ 44 px targets" passes.
  - Each is named by `help.label`, an `aria-label`, so it adds 0 visible words.
  - It goes after the `h3`, not inside it, so the heading's name stays the title.
  - "Take it all out" has none.
- **Icons:** Lucide at stroke 2 in ink (brand iconography). Each is the app's own icon for the feature where one exists:

  | Item | Icon | Why |
  |---|---|---|
  | Make an offer | `Handshake` | the app's offer icon (Make an offer button, the sold pill) |
  | Give by link | `Link` | import it as `Link as LinkIcon` (next/link's `Link` is in the same file) |
  | Let someone spend | `UserRoundPlus` | "Add someone who can spend…" |
  | USDC and L2s | `Layers` | networks stacked on Ethereum |
  | Take it all out | `PackageOpen` | the app's Take-it-all-out guard icon (EmptyFlow) |

  - No chain charms here: the charms are the chains' characters, not feature icons.
  - No `CoinIcon` with a network badge: it renders an SVG `<text>`, which would put words in the text layer.

### 1.2 Markup: a new `src/components/landing/MoreSection.tsx` (server component)
```tsx
import Link from "next/link";
import { CircleQuestionMark, Handshake, Layers, Link as LinkIcon, PackageOpen, UserRoundPlus, type LucideIcon } from "lucide-react";
import { ArtIcon } from "@/components/landing/art";
import { CONTAINER, FLOW, H2, HEAD } from "@/components/landing/layout";
import { copy } from "@/lib/copy";

/** One icon per `landing.more.items` entry, in order (the app's own icon for each feature where it has one). */
const ICONS: readonly LucideIcon[] = [Handshake, LinkIcon, UserRoundPlus, Layers, PackageOpen];

export function MoreSection() {
  const m = copy.landing.more;
  return (
    <section id="more" aria-labelledby="more-title" className={FLOW}>
      <div className={CONTAINER}>
        <div className={HEAD}>
          <h2 id="more-title" className={H2}>{m.h2}</h2>
        </div>
        <ul className="lp-more" data-testid="more-features">
          {m.items.map((item, i) => (
            <li key={item.title} className="lp-more__item" data-more={i + 1}>
              <span className="lp-more__icon" aria-hidden="true">
                <ArtIcon icon={ICONS[i]} />
              </span>
              <div className="lp-more__head">
                <h3 className="lp-more__title">{item.title}</h3>
                {item.help ? (
                  <Link href={`/questions#${item.help.anchor}`} aria-label={item.help.label} className="lp-more__help">
                    <ArtIcon icon={CircleQuestionMark} />
                  </Link>
                ) : null}
              </div>
              <p className="lp-more__body">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```
- **`Landing.tsx`:** render `<MoreSection />` between `<TrustSection />` and `<QuestionsSection />`.
- **The copy** is copy.md §3 verbatim: `landing.more.{h2, items[5]{title, body, help?{anchor, label}}}`.
  - All four anchors exist in `allFaqGroups()`: `q-offers`, `q-give-link`, `q-allow-what`, `q-chains`.
  - Give the items a type where `help` is optional, so the fifth item type-checks.
- **No header anchor.** `LANDING_ANCHORS` stays #how, #clean, #questions, and unit/shell is unchanged.

### 1.3 CSS (copy `assets/refresh.css` §10 into landing.css as-is; the values, for review)
| | phones < 768 | 768–1279 | ≥ 1280 |
|---|---|---|---|
| `.lp-more` grid | 1 column, gap 22, margin-top 28 | 3 columns, gap 40 / 32, margin-top 44 | 5 columns, column gap 36 |
| item | `40px 1fr`: the disc spans 2 rows, column gap 14 | 1 column, stacked | as 768 |
| disc `.lp-more__icon` | 40 px, `--surface-sunken`, a 20 px icon in `--ink` | 48 px, a 22 px icon, 14 below it | as 768 |
| title `h3.lp-more__title` | Funnel 700 17/22, −0.01em, `--ink` | 18/24 | as 768 |
| help `.lp-more__help` | 44 × 44, margin −11 −14 −11 −10, a 16 px icon, `--ink-muted` (hover `--ink`), radius 999 | — | — |
| line `p.lp-more__body` | Onest 400 15/22, `--ink-muted`, margin-top 2 | — | — |
- `.lp-more__item` takes `align-content: start`, so the titles line up across a row when one line wraps (at 1280,
  "Daily caps, until it changes hands." and "Ethereum, Base, Arbitrum and OP Sepolia." take two lines).
- **Focus:** the ring hugs the icon, as the app's 20 px HelpLink does, not the 44 px target. A 44 px ring would cover
  the line below it:
  - `.lp-more__help:focus-visible { outline: none }`;
  - `.lp-more__help:focus-visible > svg { outline: 2px solid var(--focus); outline-offset: 2px; border-radius: 999px }`.
- **Night:** nothing extra. Every colour is a raw token: the disc is the Night sunken `#29214b`, and the icon and title
  are Night ink. Checked in `shots/sec-1280-more-night.png` and `shots/sec-390-more-night.png`.

### 1.4 Measured heights (prototype, `?motion=static`, the final copy for What, Uses and the strip)
| Width | `#more` | Page now | Page after | Proposed cap |
|---|---|---|---|---|
| 390 | 436 | 8,450 | **8,915** | **≤ 9,000** (was 8,500) |
| 1280 | 326 | 5,833 | **6,184** | ≤ 6,500 (unchanged) |
| 320 / 360 | 480 / 458 | 9,001 / 8,674 | 9,509 / 9,160 | no cap |
| 768 / 1024 | 482 / 438 | 7,546 / 5,783 | 8,054 / 6,232 | no cap |

- At 390 the page grows by 465: the strip's 436, plus 28 because What's new body (copy F1) takes one more line.
- At 1280 it grows by 351: the strip's 326, plus 25 because the What card goes from 320 to 360 wide (§4).
- The other caps hold:
  - `#clean` ≤ 900 at 1280 and ≤ 1,800 at 390 (unchanged, 655 and 1,632);
  - the stage top < 844 at 390 (796, unchanged).

### 1.5 Tests for the strip
- **e2e/landing:**
  - `SECTION_IDS` gets `"more"` between `"trust"` and `"questions"`;
  - `WORDS.aboveQuestions` becomes 380, and the section cap of 50 holds (49);
  - the heights test becomes `[390, 844, 9_000]`.
- **e2e/responsive:** page ≤ 9,000 at 390.
- **e2e/theme-a11y, or landing-catch's axe list:** add `#more` in Day and Night.
- **unit/landing-no-data:** its expected file list gains `MoreSection.tsx` (16 → 17). It imports only lucide,
  next/link, `art`, `layout` and `copy`.
- **unit/config-copy-theme:** the new `more` key budget is 49 (copy.md §5).
- **Optional unit test**, on `renderToStaticMarkup(<MoreSection/>)`:
  - one `h2#more-title`;
  - 5 `li[data-more]`, with the titles in copy order;
  - 4 help links to `/questions#q-…` with their `aria-label`s;
  - every icon `aria-hidden`.
- **Nothing in ENTER:** the strip doesn't move.

---------------------------------------------------------------------------------------------------------------------
## 2. The card as art (`art.tsx` + `landing.css`)

### 2.1 Which scene gets what, and why
| Scene | Now | Refreshed | Why |
|---|---|---|---|
| Hero (`HeroStage`) | ledger card: 0.05 BTC, 0.80 ETH; the pill in the foot | **the D-50 card**: estimate + pill top-right, bar, chips | It's the first thing anyone sees, and the site and the app must read as one product. The loop keeps its story (§3) |
| What it is | ledger card, md, Active | **the D-50 card**, Active, **360 wide** (was 320) | 360 is the app's lg tier: three chips (BTC · ETH · SOL) sit over the three address tags (Bitcoin · Ethereum · Solana), which says "its own addresses" without a word. On phones it's 100 % of the panel, the md tier (two chips and "+2") |
| How step 1 "Mint a Satchel" | ledger at 0 BTC / 0 ETH | **the app's empty card** ("Nothing inside yet", no bar, dimmed BTC · ETH · SOL chips without shares), still "New Satchel" with the New sticker | The review's ruling (copy.md §4.2). It's the real state of a fresh Satchel, and it sets up step 3 and the hero's act 1. All three home chips show at every width: with no shares they fit (the app hides the third below 352, see §7) |
| How step 3 "Give it or sell it" | ledger card, 196, on a pin at −8° | **the D-50 card, mini** (196: estimate, label, bar, two chips; no pill, as today) | It's the card the new owner gets: "everything inside" is the bar and the chips |
| The catch, desk 1 (the seller signs) | ledger card + the "Send 0.80 ETH" note | **the D-50 card, mini** (196) + the same note | The object being sold looks like the app's card. The note carries the native amount |
| The catch, desk 2 (drained) | a hand-built ledger card: 0.05 BTC, ETH 0.80 → 0.00, a sad coin | **keeps a ledger detail, as the buyer's holdings slip** (`lp-slip lp-hold`): "Satchel" with a wallet icon over two rows, 0.05 BTC and ETH 0.80 → 0.00 (sad), plus the stamp | See the reasons below |
| Uses, Trust, Finale | no card | unchanged | — |

Why desk 2 keeps a ledger detail:
- The beat is about an amount leaving ("drains the buyer's ETH"). A native 0.80 → 0.00 says that at a glance.
- On the D-50 card, a drained ETH just vanishes from the chips (the app drops zero coins from the overview). It would
  also need a second, moving dollar figure (≈ $6,000).
- The app's own detail views (the Wallet tab's holdings rows, the buyer's "You get") show native amounts in exactly this
  type: a Funnel amount with a muted ticker, and muted when it's zero.
- So the rule is: **a card always looks like the app's card; native amounts live in detail views.**
- **Churn:** it reuses every key and label that beat-2 and catch-story pin (`eth-amt-new` "0.00", `eth-amt-old` "0.80"
  `data-off`, `eth-coin(-new/-old)`, the sad mouth path, `stamp`). The catch-story desk tests pass unchanged.

### 2.2 The sample (R9; copy.md §4.1) and its labels, composed at render
- **The sample:** 0.05 BTC + 0.80 ETH + 12 SOL + 800 USDC = 8,000 at the app's fixture prices, with shares
  50 / 25 / 15 / 10.
- **Store numbers, never "$…" strings:** `desk.usd = 8000` and `desk.mix = [{ticker, share}…]` (copy.md §4.1).
- **Labels:**

  | Label | Composed as | Reads |
  |---|---|---|
  | total | `copy.overview.estimate(usdText(d.usd))` | ≈ $8,000.00 |
  | its label | `copy.overview.atPrices` | at mainnet prices |
  | a chip | ticker + `shareText(share)` | BTC 50% |
  | "+N" (two layers, toggled by width) | `copy.overview.plus(n - 3)` and `copy.overview.plus(n - 2)` | +1 / +2 |
  | empty | `copy.overview.empty` | Nothing inside yet |
  | price | `desk.price` | 2,000 NEAR |

- **Imports:** `usdText` and `shareText` come from `@/lib/format` after R9.4's move. Never import `@/lib/overview` (it
  imports `lib/holdings`, which imports `@/lib/near/contract`).
- **Ticker → art:**
  - BTC, ETH and SOL draw with `Coin` (ChainCharm), the same face as the app's `CoinIcon`;
  - USDC has no chip at these widths (it's in "+N"). Its bar segment is `--sky` (the app's `COIN_FILL.USDC = ART.sky`).

### 2.3 `art.tsx`: proposed components
- **`ArtCard`:** keep the band (name, badge, charm). The body becomes `<div class="lp-card__body">{children}</div>`
  (drop the `ul.lp-card__inside` wrapper and the `foot` prop, which nothing uses any more).
- **`ArtOverview({ mix, usd, state?, moving? })`:** `moving` adds the hero's `data-k`s. It renders:
  ```html
  <div class="lp-card__head">
    <span class="lp-card__est" data-k="est">                       <!-- data-k on the hero only -->
      <span class="lp-l lp-card__total" data-l="≈ $8,000.00"></span>
      <span class="lp-l lp-card__prices" data-l="at mainnet prices"></span>
    </span>
    {state}                                                         <!-- see below -->
  </div>
  <div class="lp-card__ov">
    <span class="lp-bar">                                           <!-- inline style = the share, as ValueBarTips does -->
      <span class="lp-bar__seg" data-coin="btc" style="flex-grow:0.5" data-k="seg-btc"></span>
      <span class="lp-bar__seg" data-coin="evm" style="flex-grow:0.25" data-k="seg-eth"></span>
      <span class="lp-bar__seg" data-coin="sol" style="flex-grow:0.15" data-k="seg-sol"></span>
      <span class="lp-bar__seg" data-coin="usdc" style="flex-grow:0.1" data-k="seg-usdc"></span>
    </span>
    <ul class="lp-chips">
      <li class="lp-chip"><span class="lp-coin" data-k="coin-btc">…</span><span class="lp-chip__words" data-k="tick-btc"><span class="lp-l lp-chip__tick" data-l="BTC"></span><span class="lp-l lp-chip__share" data-l="50%"></span></span></li>
      <li class="lp-chip">… eth (coin-eth, tick-eth) …</li>
      <li class="lp-chip lp-chip--3">… sol (coin-sol, tick-sol) …</li>
      <li class="lp-chips__more" data-k="more"><span class="lp-l lp-chips__more-lg" data-l="+1"></span><span class="lp-l lp-chips__more-md" data-l="+2"></span></li>
    </ul>
  </div>
  ```
  - **`state`:**
    - the hero: `<span class="lp-stack lp-stack--end lp-card__state">` holding `ArtPill frozen` `pill-paused`, then
      `ArtPill success` `pill-active` `data-off`;
    - What: `<span class="lp-card__state"><ArtPill tone="success" …/></span>`;
    - mini scenes: none.
- **`ArtEmpty()`** (How step 1): `<div class="lp-card__head"><Lbl l={copy.overview.empty} className="lp-card__empty"/></div>`
  plus `<ul class="lp-chips lp-chips--home">` with three `lp-chip`s (`Coin` + a ticker `Lbl`, no share).
- **`HoldRow`** (catch desk 2; or inline it in CleanSection): `li.lp-hold__row`: `Coin`, then `Lbl.lp-hold__amt`, then
  `Lbl.lp-hold__tick`. The ETH row keeps today's two stacks (`eth-coin` with the sad/happy coins; the amount stack
  `0.00` / `0.80`).
- **Retire** `CoinRow` from the scenes (nothing uses it after this). `amountParts` stays only if desk 2 still splits
  `d.btc` / `d.eth`.
- **Test-facing classes:** `lp-card__total`, `lp-chip`, `lp-bar__seg[data-coin]`, `lp-card__empty`, `lp-hold`.

### 2.4 CSS (`refresh.css` §1R, §1E, §5R–§7R) and what to delete
- **The tiers are the card's own width** (`@container lpcard`, the content box: the card's width − 6). They mirror
  SatchelCard number for number:

  | | lg ≥ 352 | md 251–351 | sm ≤ 250 | **mini < 200** (landing only) |
  |---|---|---|---|---|
  | total (Funnel 800, −0.02em, tabular) | 32/36 | 24/28 | 19/23 | 18/22 |
  | "at mainnet prices" (Onest 600, muted) | 13/16 | 12/16 | 11/16 | 10/13 |
  | state pill | md (13/18, 5 11 5 9) | md | sm (12/16, 3 8) | — |
  | bar (2 px sticker outline, sunken) | 10 | 10 | 8 | 7 |
  | chips: coin, text, gap | 24, 13/18, 10 | 20, 13/18, 10 | 16, 12, 8 | 14, 11/14, 7 |
  | chips shown | 3 + "+1" | 2 + "+2" | 2 + "+2" | 2 (no "+N", so two fit) |
  | body gap / padding | 8 / 16 20 18 (today's) | 8 / 12 16 14 | 4 / 8 12 10 | 3 / 7 10 9 |

- **The hero's compact rule (§4R):**
  ```css
  @container lpcard (max-width: 299px) {
    .lp-stage .lp-card__state .lp-pill { gap: 0; padding: 5px }
    .lp-stage .lp-card__state .lp-pill > .lp-l { display: none }
  }
  ```
  - **Below 300 px of card (every phone), the hero's pill is icon-only:** the snowflake, or the check after the
    hand-off.
  - **Measured:**
    - "≈ $8,000.00" + "Paused for sale" need ≥ 265 px of content (24 px total + md pill) or ≥ 237 (21 px + sm);
    - the 390 hero card has 223, and the 320 one 183. The app's own card truncates to "≈ $7…" in the same spot
      (current-state §3.6).
  - **It's a conscious, art-only exception** to "icon + word". The 2,000 NEAR tag and the caption ("Seller lists it")
    say "for sale" in the same frame, and from 768 the 400 px card shows the word.
  - **Alternatives rejected:**
    - shrink the total to 17 px (still cut at 360 and 320);
    - drop "at mainnet prices" (D-50);
    - move the pill into the band or the legend (no room, and not the app's layout);
    - hide the pill (act 2 and act 4 lose their roll).
- **What it is:** `.lp-what .lp-card { width: min(100%, 360px) }` (was 320).
- **The scene cards:** `.lp-desk .lp-card { width: 196px }` (was 176). `.lp-pose .lp-card` is already 196.
- **Delete from landing.css:**
  - `.lp-card__inside`, `.lp-card__coin`, `.lp-card__amt`, `.lp-card__tick`, `.lp-card__coin[data-zero] …`,
    `.lp-card__coin > .lp-stack`, `.lp-card__foot`, and their lines inside both `@container lpcard` blocks;
  - `.lp-card__foot .lp-pill` (max 250).
  - `.lp-amt-was` moves to `.lp-hold__row[data-zero] .lp-amt-was`.
- **Measured fit:** at 320, 360, 375, 390, 412, 430, 480, 600, 768, 1024, 1280 and 1440 (a throwaway Playwright pass
  over every `.lp-card`, all ok):
  - no card label leaves its card on the right or the bottom;
  - no total is cut;
  - no horizontal scroll.

  | Scene | Card widths |
  |---|---|
  | hero | 213 / 236 / 248 / 261 / 279 / 294 / 335, then 400 from 600 |
  | What | 255–358 on phones, 360 from 480 |
  | How step 1 | 220 |
  | How step 3, desk 1 | 196 |

---------------------------------------------------------------------------------------------------------------------
## 3. The hero (`hero/HeroStage.tsx`, `hero/timeline.ts`, `landing.css` §4)

### 3.1 HeroStage
- Replace the `ArtCard`'s children and foot with `<ArtOverview mix={d.mix} usd={d.usd} state={<pill stack/>} moving />`.
  Keep the band's `ArtBadge kind="yours" data-k="yours"`.
- The plate, the hanger, `data-k="card"`, the hang coins, the slip, the sparkles, the bar and Pause are unchanged.
- The tag reads `d.price` = "2,000 NEAR" (R9).
- The sr-only description is the new `anim.alt` (copy.md §4.3: "a Satchel holds BTC, ETH, SOL and USDC… 2,000 NEAR…").
  It names no dollar figure.
- The captions are unchanged (still exactly 10 words; "Coins inside" is what act 1 now shows).

### 3.2 Geometry: phones only (`refresh.css` §4R); the card's 1.586, its 28 px radius and the plate are untouched
- **The tag at 2,000 NEAR** (it's wider than 300 NEAR). Below 768:
  `.lp-stage__tag { left: 4px }` and `.lp-hangtag { gap: 5px; padding: 5px 10px 5px 7px; font-size: 14px }`, with an
  8 px hole (`::before`).
  - The string still meets the card's bottom edge (the tag's centre is about 60 px in).
  - Measured, the tag's right edge vs the slip's left edge (px): 156 vs 163 at 360, 156 vs 170 at 375, 156 vs 164 at
    390, 156 vs 173 at 412, 156 vs 181 at 430.
  - At 320 the slip already sits below the tag (today's rule).
- **The slip at 360–389:** `width: 54%` (was 60 %). Its rows still fit one line.
  - Below 360, today's 66 % is kept: re-assert it after the new rule, or scope the new rule as `(min-width: 360px)` as
    the prototype does.
- **The shelf grows with the card on phones wider than 390.** The new card fills its width, and the slip would cover
  the chips:
  ```css
  .lp-stage { container-type: inline-size }
  @media (max-width: 767px) { .lp-stage__scene { height: max(336px, calc(min(51.7cqi, 252px) + 172px)) } }
  @media (min-width: 480px) and (max-width: 767px) { .lp-stage__scene { height: calc(min(51.7cqi, 252px) + 214px) } }
  @media (max-width: 359px) { .lp-stage__scene { height: 352px } }  /* keep today's 320 rule */
  ```
  - 51.7cqi is the card's height (82 % of the scene / 1.586).
  - The resulting scene height: 390 unchanged (336), 412 +12, 430 +21, 480–767 the card's height + 214.
  - `travel()` is unaffected: it reads widths, the card's height and the padding.
- **768–1023:** `.lp-stage__slip { right: 8px }` (was 30), so at 768–827, where the scene is under 700, the slip stops
  short of the "+1".
- **≥ 1024:** unchanged. The slip covers the last few px of the bar, a layered look that's fine.

### 3.3 The loop: the exact new timeline (`timeline.ts`)
**`H` changes** (everything else in `H` is unchanged):
```ts
coins: [560, 920, 1_280],   // was [600, 1_050]: the BTC, ETH and SOL chips' coins, 360 ms apart
more: 1_640,                // NEW: "+N" appears ("+1" from 352 px of card, "+2" below)
fill: 80,                   // NEW: each share starts filling this long after its trigger…
fillDur: 320,               // NEW: …and fills in this long
est: 2_100,                 // NEW: the estimate rises in whole (no counting number)
```
**The keys, 37 (was 31):**
```ts
const COINS = ["btc", "eth", "sol"] as const;          // the chips' coins (was ["btc", "eth"])
const SEGS = ["btc", "eth", "sol", "usdc"] as const;   // the bar's shares
type HeroKey = "card" | "hanger" | "plate" | `coin-${Coin}` | `tick-${Coin}` | `seg-${Seg}` | "est" | "more"
  | "pill-active" | "pill-paused" | "tag" | "slip" | `sig-${N3}-used` | `sig-${N3}-checking` | "verdict"
  | "spark-1" | "spark-2" | "yours" | `cap-${N4}` | `bar-${N4}`;
// HERO_KEYS: card, hanger, plate, coin-/tick- × 3, seg- × 4, est, more, then as today
```
- **Retired:** `amt-btc`, `amt-eth`.
- **Kept, with the same meaning:** `coin-btc`, `coin-eth` (the coin sticks on) and `tick-btc`, `tick-eth` (the words
  beside the coin). `tick-*` now wraps "BTC" + "50%".
- **New:** `coin-sol`, `tick-sol`, `seg-btc|eth|sol|usdc`, `more`, `est`.
- **Value-bar segments are named `seg-*`, never `bar-*`:** the tests treat `bar-*` as the progress bars.
- **`HIDDEN_AT_REST` and `EMPTY_AT_REST` are unchanged.**
- **`carriedBy`:** `/^(hanger|plate|coin-|tick-|seg-|est$|more$|pill-|yours)/` → "card".

**The act-1 block** (it replaces the CoinRow `COINS.forEach` in `heroTracks`):
```ts
COINS.forEach((c, i) => {
  const t0 = H.coins[i];
  const turn = i % 2 ? 18 : -18;
  const coin = q(`coin-${c}`);
  tr.push(...stickOnTracks(coin, t0, { from: 1.7, turn }));
  tr.push(...hopTracks(coin, TOUCH + 300 + i * 150));
  tr.push(resetTrack(coin, "opacity", RESET, 1, 0, T), resetTrack(coin, "scale", RESET, "1", "1.7", T), resetTrack(coin, "rotate", RESET, "0deg", `${turn}deg`, T));
  const words = q(`tick-${c}`);
  tr.push(...appearTracks(words, t0 + 60, 220, 6));
  tr.push(resetTrack(words, "opacity", RESET, 1, 0, T), resetTrack(words, "translate", RESET, "0 0", "0 6px", T));
});
SEGS.forEach((c, i) => {
  const t0 = (i < COINS.length ? H.coins[i] : H.more) + H.fill;
  tr.push({ el: q(`seg-${c}`), prop: "scale", frames: [[0, "0 1"], [t0, "0 1", EASE.inOut], [t0 + H.fillDur, "1 1"], [RESET, "1 1"], [RESET + 1, "0 1"], [T, "0 1"]] });
});
const more = q("more");
tr.push(...appearTracks(more, H.more, 220, 6));
tr.push(resetTrack(more, "opacity", RESET, 1, 0, T), resetTrack(more, "translate", RESET, "0 0", "0 6px", T));
const est = q("est");
tr.push(...appearTracks(est, H.est, 240, 8));
tr.push(resetTrack(est, "opacity", RESET, 1, 0, T), resetTrack(est, "translate", RESET, "0 0", "0 8px", T));
```
**Act 1, frame by frame** (ms; every move is transform or opacity; the bar fills on `scale` x from `transform-origin:
0 50%`, which landing.css sets on `.lp-bar__seg`):

| ms | What moves |
|---|---|
| 0 → 380 | the card fades in, rising 8 px (unchanged). On show: the band, "Active" and the empty bar track |
| 560 → 880 | BTC coin sticks on (from 1.7×, −18° → +2.7° → 0) |
| 620 → 840 | "BTC 50%" fades up 6 px |
| 640 → 960 | the BTC share fills |
| 920 → 1,240 | ETH coin sticks on (+18°) |
| 980 → 1,200 | "ETH 25%" fades up |
| 1,000 → 1,320 | the ETH share fills |
| 1,280 → 1,600 | SOL coin sticks on (−18°; the chip shows from 352 px of card) |
| 1,340 → 1,560 | "SOL 15%" fades up |
| 1,360 → 1,680 | the SOL share fills |
| 1,640 → 1,860 | "+1" (or "+2") fades up |
| 1,720 → 2,040 | the USDC share fills |
| 2,100 → 2,340 | "≈ $8,000.00 / at mainnet prices" rises in 8 px, whole |
| 2,340 → 3,000 | still: the full card reads for 0.66 s before act 2 |

- **Act 4:** the three coins hop at 10,790, 10,940 and 11,090 (`TOUCH + 300 + i × 150`). The last ends at 11,410,
  before the seam fade at 11,500.
- **The seam (11,851):** everything above resets behind the invisible card:
  - coins → opacity 0, scale 1.7, ±18°;
  - words, "+N" and the estimate → opacity 0 and 6 or 8 px down;
  - the shares → `scale: 0 1`.
- **At rest, the server frame (7.9 s, act 3; no JS; reduced motion):**
  - every new key sits on its static CSS: opacity 1, identity transforms, shares at `1 1`;
  - so landing.css needs no new rest rules, only `.lp-bar__seg { transform-origin: 0 50% }`.
  - It shows: the band with Yours hidden (unchanged), "Paused for sale" (the icon alone on phones), the estimate, the
    full bar, the chips, the tag on its string, the slip with 3 × Used and Clean history, the sparkles. Nothing moves
    from 7.9 to 9.0 s.
- **Verification:**
  - `build/check-timeline.mjs` runs every invariant of `hero-loop.test`: the moved set equals `HERO_KEYS`, transform and
    opacity only, rest at 7.9 s and still until 8.9 s, a seamless seam, the captions, the hand-off numbers, travel 40.
    Result: **0 fails**, plus the act-1 order (coins, then shares, then the estimate);
  - in the browser, the server frame vs `seek(7900)` differs only in Pause (shown when live) and anti-aliasing on the
    tilted tag and slip (`shots/frames/diff-1280.png`). The card is pixel-identical.
- **`engine.ts` is unchanged:** the mount at START_AT, Pause, the 20 % visibility rule, the hidden tab, inert, the
  resize rebuild and the live reduced-motion switch.

### 3.4 What to read in the frame strips
- `shots/hero-loop-1280.png` and `shots/hero-loop-390.png` hold 30 frames, 400 ms apart.
- **0.4 s:** the card is empty and Active.
- **0.8–2.0 s:** the chips stick on and the bar fills.
- **2.4 s:** the estimate is in.
- **3.2–3.6 s:** the pill rolls and the 2,000 NEAR tag swings in.
- **5.6–7.6 s:** the check.
- **9.2–10.4 s:** the hand-off.
- **10.8 s:** Yours and Active; the coins hop.
- **11.6 s:** the seam.

---------------------------------------------------------------------------------------------------------------------
## 4. The other scenes
- **What it is** (`WhatSection.tsx`):
  - `<ArtCard name={d.name} className="lp-card--md"><ArtOverview mix={d.mix} usd={d.usd} state={<span className="lp-card__state"><ArtPill tone="success" icon={Check} l={copy.pill.active}/></span>} /></ArtCard>`;
  - the tags are unchanged (`addr-*`, the `what` moment);
  - the panel at 1280 grows from 486 to 511 (the card is 360).
- **How step 1** (`HowSection.tsx` MintScene):
  - `ArtCard name={copy.card.preview} badge={<ArtBadge kind="new" … data-k="mint-new"/>} className="lp-how-card" data-k="mint-card"`
    with `<ArtEmpty />`;
  - the `how-mint` moment's keys (`mint-card`, `mint-new`, `mint-spark-*`) are unchanged;
  - the sparkles are unchanged.
- **How step 3** (GiveScene):
  - `<ArtCard name={d.name} className="lp-card--sm"><ArtOverview mix={d.mix} usd={d.usd} /></ArtCard>` inside
    `.lp-pose[data-k="give-pose"]` (unchanged);
  - the `how-give` moment is unchanged.
- **The catch** (`CleanSection.tsx`):
  - **DeskSigned:** `<ArtCard name={d.name}><ArtOverview mix={d.mix} usd={d.usd} /></ArtCard>` plus the note
    (unchanged; `data-k="note"`);
  - **DeskDrained:** the Buyer chip (unchanged), then `<div class="lp-slip lp-hold">`:
    - a `p.lp-slip__head` with `ArtIcon Wallet` + `Lbl d.name`;
    - `ul.lp-hold__rows`, holding the BTC row (`Coin btc`, `Lbl "0.05"`, `Lbl "BTC"`) and the ETH row
      (`li[data-zero]`: today's `eth-coin` stack and today's amount stack, now `span.lp-hold__amt.lp-stack.lp-stack--start`,
      then `Lbl "ETH"`);
    - then the stamp (unchanged);
  - the `beat-1`…`beat-5` moments and `GAP` are unchanged;
  - desk heights are unchanged (`#clean` 655 at 1280 and 1,632 at 390).
- **Night:**
  - every new rule uses raw tokens;
  - the What card takes the Night surface with the #8A82AE outline, and the bar's outline and separators follow
    `--sticker-line` (`shots/sec-1280-what-night.png`);
  - the hero, How and the desks' cards stay Day islands, as today.

---------------------------------------------------------------------------------------------------------------------
## 5. Files to touch
| File | Change |
|---|---|
| `src/lib/format.ts`, `src/lib/overview.ts` | R9.4: move `usdText` and `shareText` to format, re-exported from overview |
| `src/lib/copy/landing.ts` | copy.md: `desk.{usd, mix, price}`, `anim.alt`, `more`, the fixes (copy) |
| `src/components/landing/art.tsx` | `ArtCard` body; new `ArtOverview`, `ArtEmpty`, `HoldRow`; retire `CoinRow` |
| `src/components/landing/hero/HeroStage.tsx` | the new card body; `d.price` |
| `src/components/landing/hero/timeline.ts` | §3.3: `H`, `COINS`, `SEGS`, `HeroKey`, `HERO_KEYS`, `carriedBy`, act 1; the doc comment's act 1 line |
| `src/components/landing/WhatSection.tsx`, `HowSection.tsx`, `CleanSection.tsx` | §4 |
| `src/components/landing/MoreSection.tsx` (new), `src/components/Landing.tsx` | §1.2 |
| `src/components/landing/landing.css` | port `refresh.css` (§1R, §1E, §4R, §5R, §6R/§7R, §10); delete the ledger rules (§2.4) |
| `engine.ts`, `enter.ts`, `tracks.ts`, `lib/motion/*` | **no change** |

---------------------------------------------------------------------------------------------------------------------
## 6. Tests to change
- **unit/hero-loop:**
  - its timeline asserts follow `HERO_KEYS` automatically;
  - update the stage's label list: drop `D.btc.split(NBSP)[0]`; add the estimate label, `copy.overview.atPrices`,
    "BTC", `shareText(0.5)`, `copy.overview.plus(1)` and `plus(2)`; keep `D.price`, now 2,000 NEAR;
  - `text(scene) === ""` still holds (checked on the prototype);
  - new asserts:
    - act 1's order and its end before 2,400 (see `check-timeline.mjs`);
    - `seg-*` rest at `"1 1"`;
    - the CSS `.lp-bar__seg` has `transform-origin: 0 50%`;
    - the `@container lpcard (max-width: 299px)` rule hides `.lp-stage .lp-card__state .lp-pill > .lp-l`.
- **e2e/landing-hero:**
  - unchanged: first paint = seek over `HERO_KEYS`, > 40 animations (79 merged tracks), −10° at 9,966, Yours and
    Active at 11,200;
  - add to the truncation step:
    - `.lp-card__total` is never cut (`scrollWidth <= clientWidth`);
    - no `.lp-card .lp-l` or `.lp-pill` bottom leaves the card (today only right edges are checked, so the old fit bug
      would pass);
  - optional: at rest at 390, 412 and 430, the chips' bottom sits above the slip's top.
- **e2e/responsive:**
  - page ≤ 9,000 at 390;
  - the loop truncation checks pass as they are (prototype-measured at 320–430).
- **e2e/landing:**
  - `SECTION_IDS` (+ `more`), `WORDS.aboveQuestions` 380, heights `[390, 844, 9_000]`;
  - the no-JS opacity list may add `est` and `seg-btc` = 1;
  - the Night islands (`[data-stage] .lp-card` white; the What card's #8A82AE outline) hold as they are.
- **e2e/landing-static:** add `copy.overview.atPrices`, `copy.overview.empty` and the estimate label to `ART_LABELS`
  (drawn, never in the text layer). `NOT_IN_TEXT` also catches `$` + digit.
- **unit/catch-story:**
  - the desk asserts pass unchanged (desk 2 keeps `0.00`, `0.80`, `eth-coin-old`, the sad mouth);
  - add `copy.overview.empty` to How's label list;
  - `ENTER` is unchanged (10 moments).
- **unit/landing-no-data:** + `MoreSection.tsx`. art.tsx's new `@/lib/format` import is allowed.
- **unit/config-copy-theme:** copy.md §6's list (`desk`, `anim.alt`, budgets, `more` 49).
- **e2e/theme-a11y:** the same runs. The new art labels are pseudo-elements in `aria-hidden` art; the strip's text uses
  token pairs that are AA.

---------------------------------------------------------------------------------------------------------------------
## 7. Outside this refresh (app follow-ups)
- **The app's own card** truncates "≈ $X" beside "Paused for sale" below about 300 px of card (/satchels on a 320
  phone; `audit/app/fit-card-3-261.png`). The landing's icon-only rule (§2.4) would fix it there too, as an app
  follow-up.
- **The app's empty card** hides its third home chip below 352 px (`i >= 2 && @max-[351px]/card:hidden`), although
  without shares all three fit. The landing shows three. It's a one-line app tweak, if wanted.
- **Considered and not built (lean):** the hero's act 1 could open on "Nothing inside yet" and roll it to the estimate.
  That's app-true and matches How step 1, but it costs a key and a roll. The empty top-left lasts 1.7 s and the chips
  carry the eye.

---------------------------------------------------------------------------------------------------------------------
## 8. Shots (working files, not kept)
- **Full pages, server frame:** `full-{1280,390}-{day,night}.png`.
- **Sections:** `sec-{1280,390}-{top,what,how,clean,more}-{day,night}.png`.
- **Before and after:** `compare-{1280,390}-{top,what,how,clean}.png`.
- **The hero at every width:** `hero-widths-phones.png` (320–430) and `hero-widths-tablet.png` (768, 1024). Single
  frames are in `widths/`.
- **The loop:**
  - `hero-loop-1280.png` and `hero-loop-390.png` (30 frames each);
  - the raw frames and the server-frame diff are in `frames/`.
- **The iterations:** `iter1/` (first pass: sample ≈ $8,800, six strip items, mint address rows); `iter2/` (R9 sample,
  five-item strip); `iter3/` (the tag, slip and shelf fixes at phone widths); `iter4/` (the strip at 320 and 360, the
  focus ring).
