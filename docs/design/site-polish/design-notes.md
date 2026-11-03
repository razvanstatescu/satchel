# Site polish round: design notes for the builders (landing designer, 2026-11-03)

**Prototype (a working file, not kept; the built landing is the reference):** `design/polish.html`, the server HTML of `/` from :3210 (role dev, fixture) with its scripts stripped
and the new scenes swapped in, so every class, token and font is the shipped one.
- **Serve it:** `python3 -m http.server 3612 --directory design`, then open `/polish.html`.
- **URL options:** `?theme=night` · `?motion=static` (the server frame = no JS = reduced motion) · `?code=<ms>` (seek the
  code loop and hold) · `?offer=<ms>` (seek the offer's enter moment and hold). No option: the code loop plays, with a
  working Pause, and the offer slip slides in when its tile is 60 % in view.
- **What to port:** `assets/polish.css` is the CSS delta, written as landing.css code (raw tokens, `.lp-*`), in sections
  §P1–§P5. `assets/polish.js` holds a plain-JS port of the code loop's timeline (`codeTracks`) and the offer moment
  (`offerTracks`): port those two functions; the rest of the file is prototype plumbing.
- **Tooling (working files):** `build/build.py` assembles the page (its helpers mirror `Lbl`, `ArtIcon`, `Coin`, `ArtPill`);
  `build/strip.py` stitches frame strips. Copy is copy.md's, verbatim, and rulings P3, P4 and P6 are applied.

---------------------------------------------------------------------------------------------------------------------
## 0. In brief
1. **"What else it does" becomes a bento on its own periwinkle band** (§1): five tiles, each a flat panel with a well
   holding one piece of Satchel's own UI, then the title, its "?" and the line. Option C from 1024 (Make an offer 4 +
   Give by link 2, then 2 + 2 + 2), two columns from 640 (the lead tile across), one column below. One new derived
   token, `--band`. The offer slip slides in once on enter.
2. **Trust, dev, gets the code card** (§2): a simplified `sign_for` on a sunken field, split layout from 1024 like rc and
   final. A 10 s loop walks its four steps, with the hero's player pattern under it (four step bars and a visible Pause).
   The rest frame (server, no JS, reduced motion) is step 3, "Written here, before anything is signed".
3. **Uses:** a subtle attribute-drawn chip "+ USDC and L2s" with the app's USDC coin under row 1 (§3).
4. **Mainnet framing:** the cards read "≈ $8,000.00" alone, with the total and the pill centred on one row (§4); the hero
   note, the final note, the landing footer's testnet row and the role strip go; Questions takes its own top padding
   after the band (§5).
5. **Heights:** 1280 6,178 → about 6,840 (cap 6,500 → **7,000**, P8); 390 8,645 → about 9,975 for role final (cap 9,000
   → **10,100**, P8). Details in §7.

---------------------------------------------------------------------------------------------------------------------
## 1. "What else it does" as a bento (`#more`)

### 1.1 The band
- **A new derived token** (globals.css, on `:root, [data-scheme]` with the others; kb/81 R4 gets the row):
  `--band: light-dark(#e3e6f6, #29214b)`.
  - **Day** `#E3E6F6`: `--charm-evm` (#A3ABE0) at 30 % on white, a soft periwinkle from the charm family. Not lemon
    (locked), not coral (the finale).
  - **Night** `#29214B`: the same value as `--surface-sunken`, which separates better from the Night ground than a tint.
  - **Contrast** (computed): ink on the band 13.87 (Day) / 13.44 (Night); ink-muted 5.46 / 7.18; the band against the
    page ground 1.15 / 1.28 (surface-sunken would be 1.10 in Day, which read faint next to the ground:
    `shots/iter2/band-s-1280-day.png` vs `band-p-1280-day.png`). Add the two pairs to `contrast.test.ts`.
  - If the team rules out a new token, the fallback is `bg-surface-sunken` with no other change (`shots/iter2/band-s-*`).
- **The section:** `<section id="more" className={cx(SECTION_Y, "lp-band")}>`: full bleed, `border-block: 1px solid
  var(--line)` (Clean's recipe), the band fill, the brand's section rhythm (56 → 88 → 104).
- **Questions after it** now needs its own top padding: `QuestionsSection` `FLOW` → `SECTION_Y`.

### 1.2 The grid (`polish.css` §P5; replaces more.css)
| Width | Columns | Spans | Gap | Well height |
|---|---|---|---|---|
| < 480 | 1 | – | 12 | 176; **the lead well 220** (P12, §1.5) |
| 480–639 | 1 | – | 12 | 176; the lead well 196 |
| 640–1023 | 2 | Make an offer `1 / -1`, the rest 1 | 16 | 196 |
| ≥ 1024 | 6 | Make an offer 4, every other tile 2 | 20 | 204 |

- The lead tile is item 1, so auto-placement keeps reading order = DOM order: no `order`, no explicit row placement.
- `ul.lp-bento` margin-top 28, 40 from 768. Measured `#more`: 916 at 1280, 906 at 1024, 1,172 at 768, 1,100 at 640,
  1,544 at 480–639, **1,568 at 360–479 (390 included)**, 1,590 at 320.
- The lead well's two phone heights hang off `.lp-tile[data-more="1"] .lp-tile__art`, inside `max-width: 479px` and
  `480–639px` media queries, so from 640 every well shares the table's height again.
- Two columns start at 640, not 768: from 640 every small tile is ≥ 296 wide, and its 248 px slip fits; a single column
  at 640–767 made wide, empty tiles.

### 1.3 The tile
- `li.lp-tile`: `--surface`, 1 px `--line`, radius 26, padding 6 (8 from 640).
- `div.lp-tile__art`: the well, `--band`, radius 18 (26 − 8), `overflow: hidden`, `aria-hidden="true"`, the art centred.
- `div.lp-tile__text` (padding 12 12 10; 14 12 12 from 640):
  - `div.lp-tile__head`: `h3.lp-tile__title` (Funnel 700 19/24, 20/26 from 768, −0.01em, ink), then the "?" link;
  - `p.lp-tile__body` (Onest 400 15/22, ink-muted).
- **The "?"** (`a.lp-tile__help`): more.css's `lp-more__help` recipe, renamed. A 44 × 44 target pulled back with
  margins −10 −14 −10 −10, a 16 px `CircleQuestionMark` in ink-muted (ink on hover). The focus ring hugs the icon. It
  sits after the h3, so the heading's name stays the title. "Take it all out" has none.
- Copy is copy.md §5 verbatim (48 visible words). I didn't take the optional hero-tile line: the lead tile reads well
  with its one line, and it keeps 2 words of headroom under the 50 cap.

### 1.4 Markup: `MoreSection.tsx` (server)
```tsx
import Link from "next/link";
import { CircleQuestionMark } from "lucide-react";
import { ArtIcon } from "@/components/landing/art";
import { CONTAINER, H2, HEAD, SECTION_Y } from "@/components/landing/layout";
import { MORE_ART } from "@/components/landing/more-art";
import "@/components/landing/more.css";
import { cx } from "@/components/ui";
import { copy } from "@/lib/copy";

export function MoreSection() {
  const m = copy.landing.more;
  return (
    <section id="more" aria-labelledby="more-title" className={cx(SECTION_Y, "lp-band")}>
      <div className={CONTAINER}>
        <div className={HEAD}>
          <h2 id="more-title" className={H2}>{m.h2}</h2>
        </div>
        <ul className="lp-bento" data-testid="more-features">
          {m.items.map((item, i) => {
            const Art = MORE_ART[i]!;
            return (
              <li key={item.title} className="lp-tile" data-more={i + 1}>
                <Art />
                <div className="lp-tile__text">
                  <div className="lp-tile__head">
                    <h3 className="lp-tile__title">{item.title}</h3>
                    {"help" in item && item.help ? (
                      <Link href={`/questions#${item.help.anchor}`} aria-label={item.help.label} className="lp-tile__help">
                        <ArtIcon icon={CircleQuestionMark} />
                      </Link>
                    ) : null}
                  </div>
                  <p className="lp-tile__body">{item.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
```

### 1.5 The art: a new `src/components/landing/more-art.tsx` (server; every label an attribute)
App strings wherever the app has them. The new ones go in the deck as `L.more.art` (copy.md §5's table):
```ts
// L.more
art: {
  offer: `1,900${NBSP}NEAR`,            // a bid under the 2,000 NEAR par (R1: NEAR only)
  claimPath: "/claim#",                 // buildClaimUrl's path; no domain
  secret: "•••• •••• ••••",             // the claim secret, masked
  sameAddress: "One address on all four",
  networks: ["Ethereum", "Base", "Arbitrum", "Optimism"],
},
```
```tsx
import { Check, CircleCheck, Copy, Handshake, Link as LinkIcon, Undo2, UserRound, UserRoundPlus } from "lucide-react";
import { Sparkle } from "@/components/brand";
import { CoinIcon } from "@/components/brand/CoinIcon";
import { amountParts, ArtCard, ArtIcon, ArtOverview, ArtPill, Coin, Lbl } from "@/components/landing/art";
import { copy } from "@/lib/copy";

const A = () => copy.landing.more.art;

/** 1 · Make an offer: the card, Active (not for sale), and the buyer's offer slip. Below 480 px the slip sits on the
 * card's lower right, under its total and pill (the hero's pose), so the card is always whole (P12). From 480 they
 * sit side by side, tied by a dashed string. Same markup at every width: CSS only (§1.5.1). */
export function OfferArt() {
  const d = copy.landing.desk;
  const o = copy.offers;
  const [num, tick] = amountParts(A().offer);
  return (
    <div className="lp-tile__art lp-offer" aria-hidden="true" data-enter="offer">
      <ArtCard name={d.name} className="lp-offer__card">
        <ArtOverview mix={d.mix} usd={d.usd} state={<span className="lp-card__state"><ArtPill tone="success" icon={Check} l={copy.pill.active} /></span>} />
      </ArtCard>
      <div className="lp-slip lp-offer__slip" data-k="offer-slip">
        <p className="lp-slip__head"><ArtIcon icon={Handshake} /><Lbl l={o.amount} /></p>
        <p className="lp-offer__amt"><Lbl l={num} className="lp-offer__num" /><Lbl l={tick} className="lp-offer__unit" /></p>
        <Lbl l={`${o.expiry} ${o.expiry7}`} className="lp-slip__meta lp-offer__exp" />
        <p className="lp-offer__check" data-k="offer-check">
          <span className="lp-offer__tick" data-k="offer-tick"><ArtIcon icon={CircleCheck} /></span>
          <Lbl l={d.clean} />
        </p>
      </div>
    </div>
  );
}

/** 2 · Give by link: the claim-link slip (path, masked secret, Copy link) and a lemon "Claimed" sticker. */
export function ClaimArt() {
  return (
    <div className="lp-tile__art lp-claim" aria-hidden="true">
      <div className="lp-claim__stack">
        <div className="lp-slip lp-claim__slip">
          <p className="lp-slip__head"><ArtIcon icon={LinkIcon} /><Lbl l={copy.giveLink.linkLabel} /></p>
          <p className="lp-claim__field"><Lbl l={A().claimPath} className="lp-claim__path" /><Lbl l={A().secret} className="lp-claim__secret" /></p>
          <span className="lp-claim__copy"><ArtIcon icon={Copy} /><Lbl l={copy.giveLink.copy} /></span>
        </div>
        <span className="lp-claim__done"><ArtIcon icon={CircleCheck} /><Lbl l={copy.claim.claimedTitle} /></span>
      </div>
    </div>
  );
}

/** 3 · Let someone spend: the owner's Who can spend row: someone (an icon, never a name), their daily cap as a meter
 * (what's left today: 40 %), the cap line and Revoke. Sending only (R8). */
export function AllowArt() {
  const a = copy.allowance;
  return (
    <div className="lp-tile__art lp-allow" aria-hidden="true">
      <div className="lp-slip lp-allow__slip">
        <p className="lp-slip__head"><ArtIcon icon={UserRoundPlus} /><Lbl l={a.manage.title} /></p>
        <div className="lp-allow__row">
          <span className="lp-allow__who"><ArtIcon icon={UserRound} /></span>
          <Lbl l={a.add.capsTitle} className="lp-allow__caps" />
          <span className="lp-allow__revoke"><ArtIcon icon={Undo2} /><Lbl l={a.manage.revoke} /></span>
        </div>
        <span className="lp-allow__meter"><span className="lp-allow__left" /></span>
        <p className="lp-allow__line"><Coin chain="evm" /><Lbl l={a.capRow("ETH", "0.20", "0.50")} /></p>
      </div>
    </div>
  );
}

/** 4 · USDC and L2s: ETH and USDC at one address, on four networks (text chips with an ETH-family dot; no logos). */
export function NetsArt() {
  return (
    <div className="lp-tile__art lp-nets" aria-hidden="true">
      <div className="lp-slip lp-nets__slip">
        <p className="lp-nets__head">
          <span className="lp-nets__coins"><Coin chain="evm" /><span className="lp-coin"><CoinIcon coin="USDC" size={28} /></span></span>
          <span className="lp-nets__words"><Lbl l="ETH" className="lp-nets__tick" /><Lbl l="USDC" className="lp-nets__tick" /></span>
        </p>
        <Lbl l={A().sameAddress} className="lp-slip__meta lp-nets__meta" />
        <ul className="lp-nets__list">
          {A().networks.map((n) => <li key={n} className="lp-net"><Lbl l={n} /></li>)}
        </ul>
      </div>
    </div>
  );
}

/** 5 · Take it all out: the take-out's done state as a slip (each coin sent) and a sparkle: a celebration. */
export function OutArt() {
  const e = copy.empty;
  return (
    <div className="lp-tile__art lp-out" aria-hidden="true">
      <div className="lp-out__stack">
        <div className="lp-slip lp-out__slip">
          <p className="lp-slip__head lp-slip__head--success"><ArtIcon icon={CircleCheck} /><Lbl l={e.allDoneTitle} /></p>
          <ul className="lp-slip__rows lp-out__rows">
            {([["btc", "Bitcoin"], ["evm", "Ethereum"], ["sol", "Solana"]] as const).map(([c, n]) => (
              <li key={c} className="lp-slip__row lp-out__row"><Coin chain={c} /><Lbl l={e.chainDone(n)} /><span className="lp-slip__state"><ArtIcon icon={Check} /></span></li>
            ))}
          </ul>
        </div>
        <span className="lp-out__spark"><Sparkle size={26} /></span>
      </div>
    </div>
  );
}

export const MORE_ART = [OfferArt, ClaimArt, AllowArt, NetsArt, OutArt] as const;
```
#### 1.5.1 The lead tile at each width (P12: the card's total and pill are never cropped; `polish.css` §P5, "1 · Make an offer")
| Width | Composition | Card | Slip | Well |
|---|---|---|---|---|
| < 360 | the slip on the card's lower right | 200 (total 18 px, mini tier) | 148, margin 74 0 0 −84, rotate −2° | 220 |
| 360–479 | the same pose | 204 (18 px) | 152, margin 74 0 0 −80, rotate −2° | 220 |
| 480–639 | side by side, a 28 px dashed tie | 208 (19 px) | 176, rotate 2.5° | 196 |
| 640–1023 | side by side, a 40 px tie | 232 | 196 | 196 |
| ≥ 1024 | side by side, a 48 px tie | 268 | 208 | 204 |

- **Below 480** (`.lp-offer { align-items: flex-start; padding-top: 10px }`, group centred):
  - the slip's top clears the card's head row, which ends 69 px below the card's top (measured); the −2° turn tips
    the slip's top-left corner down, away from the pill;
  - it covers only the ETH chip and the bar's end, a layered look like the hero's slip on its card;
  - the slip drops "Expires in 7 days" (`.lp-offer__exp { display: none }`), its amount steps to Funnel 20/24, and its
    padding to 10 12;
  - the tie is hidden (`.lp-offer__slip::before { display: none }`; the slip touches the card).
- **Measured** at 320, 360, 375, 390, 412, 430 and 479: the total never truncates (`scrollWidth ≤ clientWidth`); the
  group sits ≥ 3 px inside the well on both sides and 5 px above its bottom (after the 4 px drop); the slip clears the
  head row by 2–3 px at its bounding box, more at the pill. The narrowest card that keeps "≈ $8,000.00" and the Active
  pill on one row is 200 px.
- The enter moment (§1.6) is unchanged: its `rotate` adds to each width's static turn.
- Shots: `shots/bento-{320,360,390,430,480,600}-day.png`, `shots/bento-390-night.png`; the lead tile at each width,
  side by side: `shots/iter6/lead-check-320-600.png`.

- `CoinIcon` without a `badge` renders no SVG `<text>`, so the text layer stays empty. Its `@/lib/holdings` import is
  type-only (erased); landing-no-data scans only the landing's own files.
- `Sparkle` comes from `@/components/brand`, as the hero and How scenes import it.
- The Satchel name "Satchel" is `desk.name` (no number); nothing reads data.
- **Night:** the slips, the card and the meter take `--sticker-line` (#8A82AE) and the black drop, like the catch desks.
  The sky avatar and the lemon "Claimed" are badges and keep the constant ink outline. Checked:
  `shots/bento-{390,1280}-night.png`.

### 1.6 Motion: one once-on-enter moment (`enter.ts`)
Add after `trust` and before `finale`:
```ts
{
  // What else it does, Make an offer: the buyer's offer slip slides in and settles, then its check sticks on: an offer
  // waits for the same check as Buy
  name: "offer",
  trigger: '[data-enter="offer"]',
  T: 900,
  tracks: (q) => {
    const slip = q("offer-slip");
    const check = q("offer-check");
    return [
      { el: slip, prop: "opacity", frames: [[0, 0, EASE.out], [160, 1]] },
      { el: slip, prop: "translate", frames: [[0, "28px 10px", EASE.out], [460, "0 0"]] },
      { el: slip, prop: "rotate", frames: [[0, "7deg", EASE.out], [460, "0deg"]] }, // on top of its static 2.5° transform
      { el: check, prop: "opacity", frames: [[0, 0], [520, 0, EASE.out], [680, 1]] },
      { el: check, prop: "translate", frames: [[0, "0 6px"], [520, "0 6px", EASE.out], [700, "0 0"]] },
      ...stickOnTracks(q("offer-tick"), 560, { from: 1.5, turn: 0 }),
    ];
  },
},
```
- Transform and opacity only; it ends on the static CSS. On screen at mount: as drawn. Reduced motion, no JS: static.
- Keys: `offer-slip`, `offer-check` (the row) and `offer-tick` (its icon, stuck on alone).
- Frames: `shots/offer-enter-strip-1280-day.png` (0–900 ms).

---------------------------------------------------------------------------------------------------------------------
## 2. Trust, dev: the code card and its loop

### 2.1 Layout (`TrustSection.tsx`)
- Every role gets the split: `<div className={cx(CONTAINER, SPLIT)}>`. The art is `v.variant === "locked" ?
  <ContractFacts /> : <CodeCard />`. From 1024 the card sits right, as rc and final do; below, it stacks under the text
  (after Under the hood), like rc and final.
- **The field:** `--surface-sunken`, radius 36 (28 below 480), padding 48 40 16 (32 16 12 below 768; 24 12 12 below
  480). Never lemon: lemon means locked (R2).
- **The card:** the slip recipe (2 px `--sticker-line`, the 4 px hard drop, radius 20), at most 392 wide.
  - **Head:** `FileCode`, "sign.rs" in Geist Mono 13/18, and a muted "Simplified" chip right (P6).
  - **Code:** 6 lines, Geist Mono 450 13/24 (12 px below 480, 11 px below 360, where the line numbers hide).
    - Every line is ≤ 34 characters; the 320 px card keeps 38 px of slack.
    - Tones: `--frozen` keywords (`fn`, `let`), ink 600 function names, ink identifiers, ink-muted punctuation, and
      `--line-strong` line numbers.
    - On the rail's sunken band: frozen 4.76, ink 14.5, ink-muted 5.7 (Day).
  - **The rail:** an absolute 24 px band behind the active line: `--surface-sunken`, plus a 3 px `--brand-line` left
    edge (coral strokes "progress"). It moves with `translate` only.
  - **Ticks:** a success `Check` at the end of each line the rail has left.
  - **Caption row:** four layers in one grid cell (`lp-stack lp-stack--block`): a muted icon plus ink 600 13/18. The
    cell is always as tall as its longest layer, so it never resizes.
- **Under the card:** the hero's player pattern: four 6 px step bars (`--surface` track, `--ink-muted` fill), then
  Pause, 44 px.
  - Pause is visible only while the loop is live (`[data-live]`); its place is always kept.
  - It sits outside the `aria-hidden` card, named by `copy.landing.hero.anim.pause` with `aria-pressed`, as the hero's
    is.
- Shots: `shots/trust-dev-{390,1280}-{day,night}.png`, live with Pause `shots/trust-dev-1280-day-live.png`.

### 2.2 The excerpt (attribute-drawn; deck key `L.lock.dev.code`, so the copy test scans it)
```ts
// L.lock.dev
code: {
  file: "sign.rs",
  tag: "Simplified", // P6: it's an illustration, not the source
  // one [tone, text] per token: k keyword · f function · i identifier · p punctuation · s spaces
  lines: [
    [["k", "fn"], ["s", " "], ["f", "sign_for"], ["p", "("], ["i", "satchel"], ["p", ", "], ["i", "request"], ["p", ") {"]],
    [["s", "  "], ["k", "let"], ["s", " "], ["i", "signer"], ["p", " = "], ["f", "authorize"], ["p", "("], ["i", "caller"], ["p", ")?;"]],
    [["s", "  "], ["k", "let"], ["s", " "], ["i", "parsed"], ["p", " = "], ["f", "classify"], ["p", "("], ["i", "request"], ["p", ")?;"]],
    [["s", "  "], ["f", "record"], ["p", "("], ["i", "satchel"], ["p", ", "], ["i", "parsed"], ["p", ", "], ["i", "signer"], ["p", ");"]],
    [["s", "  "], ["f", "sign_network::sign"], ["p", "("], ["i", "parsed"], ["p", ")"]],
    [["p", "}"]],
  ],
  // one per step (lines 2–5), copy.md §3; the first is the more exact R8 form, which fits one line from 1280
  caps: [
    "Owner, or someone they let spend within daily caps",
    "Refuses raw hashes, unreadable requests",
    "Written here, before anything is signed",
    "NEAR's signer network, called last",
  ],
},
```
- **It traces to sign.rs `sign_for`:**
  - `authorize_signer` (the owner, or someone with a live allowance; it debits their caps);
  - `parse::classify` (a refusal panics before any state change);
  - the `sig_log.insert` loop, before
  - `promise::call(&self.mpc, "sign", …)`.
- `sign_network::sign` avoids "MPC".
- No account ids or addresses, no comment with "delegate", and none of the final slip's values ("None since birth",
  "Born without a key").
- **Caption icons:** `UserRoundCheck`, `ScanSearch`, `ScrollText`, `PenLine`.

### 2.3 Markup (`CodeCard`, in TrustSection.tsx or its own file)
```tsx
const CAP_ICONS = [UserRoundCheck, ScanSearch, ScrollText, PenLine] as const;

/** Trust, dev: a simplified sign_for whose rail walks its four steps (code/timeline.ts). The card is aria-hidden art;
 * Pause sits outside it. The server frame is step 3 (REST_STEP): no JS and reduced motion show exactly this. */
function CodeCard() {
  const c = copy.landing.lock.dev.code;
  return (
    <div className="lp-codefield" data-code="">
      <div className="lp-slip lp-code" aria-hidden="true">
        <p className="lp-code__head">
          <ArtIcon icon={FileCode} />
          <Lbl l={c.file} className="lp-code__file" />
          <Lbl l={c.tag} className="lp-code__tag" />
        </p>
        <div className="lp-code__body">
          <span className="lp-code__rail" data-k="code-rail" />
          <ol className="lp-code__lines">
            {c.lines.map((line, i) => (
              <li key={i} className="lp-code__line" data-line={i + 1}>
                <Lbl l={String(i + 1)} className="lp-code__n" />
                <span className="lp-code__src">
                  {line.map(([t, s], j) => <Lbl key={j} l={s} className={`lp-tok lp-tok--${t}`} />)}
                </span>
                {i >= 1 && i <= 3 ? (
                  <span className="lp-code__tick" data-k={`code-tick-${i}`} data-off={i >= REST_STEP ? "" : undefined}>
                    <ArtIcon icon={Check} />
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        <p className="lp-code__caps lp-stack lp-stack--block">
          {c.caps.map((t, i) => (
            <span key={t} className="lp-code__cap" data-k={`code-cap-${i + 1}`} data-off={i + 1 === REST_STEP ? undefined : ""}>
              <ArtIcon icon={CAP_ICONS[i]!} />
              <Lbl l={t} />
            </span>
          ))}
        </p>
      </div>
      <div className="lp-code__bar">
        <ol className="lp-code__steps" aria-hidden="true">
          {([1, 2, 3, 4] as const).map((n) => (
            <li key={n} className="lp-code__step" data-done={n < REST_STEP ? "" : undefined} data-cur={n === REST_STEP ? "" : undefined}>
              <b data-k={`code-bar-${n}`} />
            </li>
          ))}
        </ol>
        <button type="button" className="lp-code__pause" data-code-pause="" aria-pressed="false" aria-label={copy.landing.hero.anim.pause}>
          <ArtIcon icon={Pause} className="lp-i-pause" />
          <ArtIcon icon={Play} className="lp-i-play" />
        </button>
      </div>
    </div>
  );
}
```
- Keep `data-trust-art` on rc and final's facts only: the dev field is `data-code`.
- The space tokens draw as spaces because `.lp-code__line` is `white-space: pre`.

### 2.4 The loop's timeline: a new `src/components/landing/code/timeline.ts` (data only, unit-tested by seeking)
| Constant | Value | Why |
|---|---|---|
| `T` | 10,000 ms | Calm: each step holds 2.4 s, long enough to read its caption. Over 5 s, so it has a visible Pause (motion-spec §0.8) |
| `START_AT` | 6,000 ms | The server frame (step 3 held). The engine mounts here, so hydration changes nothing; the first move comes 1.2 s later |
| `STEPS` | [0, 2,400, 4,800, 7,200] | Step k's start: the rail lands on line k+1, its caption rolls in |
| `MOVE` | 260 ms, `EASE.inOut` | The rail's move between lines |
| `SEAM` | 9,600 → 10,000 | The ticks fade, the rail glides from line 5 back to line 2, the caption rolls to step 1, the bars empty |
| `LINE` | 24 px | One line (fixed at every width), the rail's unit |
| `REST_STEP` | 3 | The record step |

**Keys (12):** `code-rail`, `code-tick-1..3`, `code-cap-1..4`, `code-bar-1..4`.

| ms | Key | Property | Frames |
|---|---|---|---|
| 0–10,000 | `code-rail` | translate | 0 24px → (2,400–2,660) 0 48px → (4,800–5,060) 0 72px → (7,200–7,460) 0 96px → (9,600–10,000) 0 24px |
| 2,460 / 4,860 / 7,260 | `code-tick-1/2/3` | opacity, scale, rotate | stick on (`stickOnTracks`, from 1.5, turn 0) |
| 9,600–9,800 | `code-tick-*` | opacity | 1 → 0 (`EASE.in`); scale resets to 1.5 at 9,801 (`resetTrack`) |
| 2,400 / 4,800 / 7,200 / 9,600 | `code-cap-n` → `code-cap-n+1` | opacity, translate | `rollTracks` (1→2, 2→3, 3→4, 4→1) |
| step start → next step (or the seam) | `code-bar-n` | scale | `0 1` → `1 1`, linear, origin left |
| 9,600–9,900 | `code-bar-*` | scale | `1 1` → `0 1` (`EASE.inOut`) |

```ts
import { rollTracks, stickOnTracks, type Track } from "@/lib/motion/play";
import { EASE, resetTrack } from "@/components/landing/motion/tracks";

export const T = 10_000;
export const START_AT = 6_000;
export const STEPS = [0, 2_400, 4_800, 7_200] as const;
export const MOVE = 260;
export const SEAM = 9_600;
export const LINE = 24;
export const REST_STEP = 3;
type N3 = 1 | 2 | 3;
type N4 = 1 | 2 | 3 | 4;
export type CodeKey = "code-rail" | `code-tick-${N3}` | `code-cap-${N4}` | `code-bar-${N4}`;
export const CODE_KEYS: readonly CodeKey[] = [
  "code-rail",
  ...([1, 2, 3] as const).map((k) => `code-tick-${k}` as const),
  ...([1, 2, 3, 4] as const).flatMap((n) => [`code-cap-${n}`, `code-bar-${n}`] as const),
];

export function codeTracks<E>(q: (k: CodeKey) => E | null | undefined): Track<E>[] {
  const tr: Track<E>[] = [];
  const y = (n: number) => `0 ${n * LINE}px`; // n lines below line 1
  tr.push({
    el: q("code-rail"),
    prop: "translate",
    frames: [[0, y(1)], [STEPS[1], y(1), EASE.inOut], [STEPS[1] + MOVE, y(2)], [STEPS[2], y(2), EASE.inOut], [STEPS[2] + MOVE, y(3)],
      [STEPS[3], y(3), EASE.inOut], [STEPS[3] + MOVE, y(4)], [SEAM, y(4), EASE.inOut], [T, y(1)]],
  });
  ([1, 2, 3] as const).forEach((k) => {
    const el = q(`code-tick-${k}`);
    tr.push(...stickOnTracks(el, STEPS[k] + 60, { from: 1.5, turn: 0 }));
    tr.push({ el, prop: "opacity", frames: [[SEAM, 1, EASE.in], [SEAM + 200, 0], [T, 0]] });
    tr.push(resetTrack(el, "scale", SEAM + 200, "1", "1.5", T));
  });
  ([1, 2, 3, 4] as const).forEach((n, i) => {
    const t1 = i < 3 ? STEPS[i + 1] : SEAM;
    tr.push({ el: q(`code-bar-${n}`), prop: "scale", frames: [[0, "0 1"], [STEPS[i], "0 1", "linear"], [t1, "1 1"], [SEAM, "1 1", EASE.inOut], [SEAM + 300, "0 1"], [T, "0 1"]] });
    tr.push(...rollTracks(q(`code-cap-${n}`), q(`code-cap-${((n % 4) + 1) as 1 | 2 | 3 | 4}`), i < 3 ? STEPS[i + 1] : SEAM));
  });
  return tr;
}
```
- **The rest frame is the static CSS** (`polish.css` §P4), equal to the timeline at `START_AT`:
  - the rail at `translate: 0 72px` (line 4);
  - ticks 1 and 2 shown, tick 3 `data-off` (opacity 0);
  - caption 3 shown, the others `data-off`;
  - bars 1 and 2 full (`[data-done]`), bar 3 at `scale: 0.5 1` (`[data-cur]`), bar 4 empty.
  - Checked in the prototype: the `?code=6000` frame and `?motion=static` match (`shots/frames/code-06000.png`).
- **The seam is seamless:** every track's value at `T` equals its value at 0.
- **Frame strips:** `shots/code-loop-strip-1280-day.png` and `code-loop-strip-390-night.png` (0 → 9,999 ms).

### 2.5 The engine: `src/components/landing/code/engine.ts`, registered in `LandingMotion`
- `mountCode(field)` is `hero/engine.ts` without the hero-only parts: no `travel`, no acts or steps list, no resize
  rebuild (the lines are a fixed 24 px).
  - It plays only with `readMotionMode() === "full"`.
  - It mounts at `START_AT` and runs one WAAPI clock (`mergeTracks` + `toKeyframes`, `iterations: Infinity`,
    `fill: "both"`).
  - It sets `data-live` on the field (Pause shows) and pauses on Pause (`aria-pressed`), below 20 % visible, on a
    hidden tab and in an inert tree.
  - It follows `subscribeMotionMode` live, and `destroy()` restores the server frame.
  - It returns `{ play, pause, seek, time, destroy }`.
- A later refactor could make one `mountLoop` for the hero and the code. Not needed now.
- **LandingMotion:** `const code = mountCode(document.querySelector<HTMLElement>("[data-code]"))`. Expose it as
  `__satchelMotion.landing.code` in dev, and destroy it in the cleanup. On rc and final there is no `[data-code]`, so it
  is a no-op.

---------------------------------------------------------------------------------------------------------------------
## 3. Uses: the hint (P3, U1) (`UsesSection.tsx`, `polish.css` §P3)
- **Deck:** `L.uses.hint = "+ USDC and L2s"`, outside `items` (copy.md §4).
- **Row 1 only, after the body `<p>`:**
  ```tsx
  {i === 0 ? (
    <span className="lp-hint" aria-hidden="true">
      <span className="lp-coin"><CoinIcon coin="USDC" size={14} /></span>
      <Lbl l={u.hint} />
    </span>
  ) : null}
  ```
- **The look:** the card's "+N" chip voice in a pill.
  - `--surface-sunken` fill, ink-muted 600 13/18, padding 2 10 2 5;
  - the app's USDC coin face at 14 px (sky disc, ink outline, no badge);
  - `grid-column: 2` under the body, `justify-self: start`, 6 px above.
  - Uses stays at 50 words, and its height grows 32 px.
- **Why the coin:** it reads as "more coins" at a glance and stays subtle. A flat dot read as a status light, and the
  plain chip lost the coin cue: `shots/iter4/hint-abc.png`.

---------------------------------------------------------------------------------------------------------------------
## 4. The card: mainnet framing (`art.tsx`, `landing.css`; `polish.css` §P1)
- **`ArtOverview`:** delete `<Lbl l={o.atPrices} className="lp-card__prices" />`. Keep the `.lp-card__est` wrapper: it is
  the hero loop's `est` hook, and `appearTracks(est, H.est, 240, 8)` now raises the total alone. No timeline change.
- **`.lp-card__head { align-items: center }`** (was `flex-start`): the total and the pill share one centred row at
  every tier.
  - lg: total 32/36 against a 28 px pill (centred, no longer 4 px high);
  - md: 24/28 against 28;
  - sm: 19/23 against 22;
  - mini: no pill.
- The compact rule stays: below 300 px of card, the hero's pill is icon-only, because the two still can't share a row
  at that width.
- **Delete** `.lp-card__prices` and its lines in the 352, 250 and 199 container blocks.
- **The body keeps the app's `justify-content: space-between`:** the total top-left, the bar and chips at the bottom,
  like a payment card. The 16 px the label used goes to that gap. I kept the app's type sizes, so the site and the app
  stay one card.
- **App follow-up:** `SatchelCard`'s head row is `items-start`. In mainnet mode (`IS_TESTNET` false) it should be
  `items-center` too, one class.
- Checked: the hero card at 213–400 px, What at 255–360 and the 196 px mini desks.
  - Shots: `shots/iter4/{what-1280-day,stage-320-day,stage-360-day,desks-1280-day}.png`, `shots/hero-*`.

---------------------------------------------------------------------------------------------------------------------
## 5. The other changes
| Where | Change |
|---|---|
| `HeroSection.tsx` | Remove `<p data-hero-note>` and the now-unused `Icon`/`Info` imports. The stage moves up 42 px: its top is at 755 at 390 × 844 (the card's band shows on the first screen) and 542 at 1280 × 900 |
| `FinaleSection.tsx` | Remove the note `<p>` and its imports; the body is copy.md's. The section ends on its buttons (−47 px at 390) |
| `NavShell.tsx` `Footer` | When `landing`, drop the testnet `<p>` and right-align the row: `cx("mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-5", landing ? "justify-end" : "justify-between")`. The app footer is unchanged |
| `NavShell.tsx` `Strips` | Only the fixture row (copy.md §6) |
| `QuestionsSection.tsx` | `FLOW` → `SECTION_Y` (it follows a band now): +104 px at 1280, +56 at 390 |
| `WhatSection` copy | "bc1q…" (P4) |

---------------------------------------------------------------------------------------------------------------------
## 6. Files to touch
| File | Change |
|---|---|
| `src/app/globals.css` | `--band` (§1.1) |
| `kb/81-design-tokens.md` | the `band` row and its contrast |
| `src/lib/copy/landing.ts` | copy.md, plus `more.art`, `uses.hint` and `lock.dev.code` (§1.5, §3, §2.2) |
| `src/components/landing/MoreSection.tsx` | §1.4 |
| `src/components/landing/more-art.tsx` (new) | §1.5 |
| `src/components/landing/more.css` | replace it with `polish.css` §P5 (the band, the bento, the tiles, the five arts) |
| `src/components/landing/TrustSection.tsx` | the split for every role, `CodeCard`, the rc note gone (copy.md §6) |
| `src/components/landing/code/timeline.ts`, `code/engine.ts` (new) | §2.4, §2.5 |
| `src/components/landing/LandingMotion.tsx` | `mountCode` |
| `src/components/landing/motion/enter.ts` | the `offer` moment (§1.6) |
| `src/components/landing/UsesSection.tsx` | the hint (§3) |
| `src/components/landing/art.tsx` | no prices label (§4) |
| `src/components/landing/landing.css` | §P1 (`.lp-card__head`), §P3 (`.lp-hint`), §P4 (the code card); delete `.lp-card__prices` |
| `HeroSection.tsx`, `FinaleSection.tsx`, `QuestionsSection.tsx`, `NavShell.tsx` | §5 |

---------------------------------------------------------------------------------------------------------------------
## 7. Tests to change
**Measured page heights** (prototype, role dev with the fixture strip, `?motion=static`):

| Width | Page | `#more` | `#trust` (dev) | `#questions` |
|---|---|---|---|---|
| 1280 | 6,824 (was 6,178) | 916 (326) | 620 (626) | 874 (770) |
| 1024 | 6,780 | 906 | 658 | |
| 768 | 8,824 | 1,172 | 995 | |
| 390 | 10,045 (was 8,645) | 1,568 (436) | 955 (614) | 698 (642) |
| 320 | 10,607 | 1,590 | 1,061 | |

e2e runs role final, whose Trust is unchanged (rc and final keep the lemon facts: about 632 at 1280 and 884 at 390). So
role final measures **about 6,840 at 1280 and 9,975 at 390** (the P12 lead well added 44 px at 390).

**e2e:**
- `landing.spec`:
  - heights `[1280, 900, 7_000]` and `[390, 844, 10_100]` (P8), and the test's title. `#clean ≤ 900` is unchanged.
  - P12, at 320, 360, 390 and 430: `#more .lp-offer .lp-card__total` is never cut (`scrollWidth <= clientWidth`), and the
    card's head row lies inside the well and outside the slip's box.
  - "illustrations are aria-hidden": also every `#more .lp-tile__art` (`aria-hidden="true"`, `textContent === ""`) and
    `data-l="+ USDC and L2s"`.
  - Night: `#more` background `rgb(41, 33, 75)`, and in Day `rgb(227, 230, 246)`. A tile is `--surface`, and a tile's
    slip outline is `rgb(138, 130, 174)` in Night.
  - No-JS: every `#more h3` and `.lp-tile__body` is visible, and `[data-k="offer-slip"]` has opacity 1.
  - Words: More 48 (≤ 50). The cap above Questions holds (P5: 380).
  - Targets: the four "?" links stay 44 px (the existing loop covers them).
- `responsive.spec`: the 390 budget → 10,100 (and its doc comment). The no-sideways-scroll checks pass as they are:
  320–1440, Day and Night, are checked in the prototype.
- `landing-static`: `ART_LABELS` gains the art-only strings: "Your offer", "Expires in 7 days", "The claim link",
  "Copy link", "Claimed", "Who can spend", "0.20 of 0.50 ETH left today", "One address on all four", "Everything's
  out", "Bitcoin sent", "+ USDC and L2s".
  - **Not** "Clean history" (a nav link), "Daily caps" (the tile line), the network names (the tile line) or "Active".
- `landing-catch` (the once-on-enter moments): the `offer` moment, if it lists ENTER names; after it plays,
  `[data-k="offer-slip"]` rests on its static frame (opacity 1, no animations left).
- `theme-a11y`: no change. axe on `/` covers the band, the tiles and the code card's Pause in Day and Night: tile text is
  ink and ink-muted on surface, the H2 is 13.87 on the band, and Pause is outside the aria-hidden box.
- CLS: no change. Everything that moves is transform or opacity, the captions share one grid cell, and Pause toggles
  `visibility`.
- e2e can't see the code card (role final): the unit tests below cover it.

**unit:**
- `trust-band.test`, the dev test:
  - replace `not.toContain("data-trust-art")` with the code card: `data-code`, a `lp-code` box with
    `aria-hidden="true"` and `text(card) === ""`;
  - its labels include `c.file`, `c.tag` ("Simplified") and the four captions;
  - none of `L.slip`'s values; no `/delegate|\bMPC\b|approval|trustless|\.testnet|0x[0-9a-f]{4,}/i`;
  - each line's joined token labels ≤ 34 characters;
  - exactly one `<button`, outside the hidden box, with `aria-label` = `copy.landing.hero.anim.pause` and
    `aria-pressed="false"`.
  - rc and final: still `ContractFacts`, and no `data-code`.
- **New `code-loop.test`**, modelled on `hero-loop.test`:
  - the moved set equals `CODE_KEYS`;
  - transform and opacity only;
  - every track's value at 0 equals its value at `T`;
  - the frame at `START_AT` equals the static CSS: rail `0 72px`, ticks [1, 1, 0], captions [0, 0, 1, 0], bars
    [`1 1`, `1 1`, `0.5 1`, `0 1`];
  - nothing changes between 6,000 and 7,199;
  - the rail visits lines 2 → 3 → 4 → 5 in order;
  - `T > 5,000`, so `CodeCard` renders a Pause.
- `catch-story.test`: ENTER names gain `"offer"` between `"trust"` and `"finale"`.
- `hero-loop.test`, `config-copy-theme`, `faq`, `lock-facts`, `shell`: copy.md §8. Also: config-copy-theme's generic
  list gets `L.uses.hint`, `L.more.art` and `L.lock.dev.code` (every token and caption), and its ban scan covers them.
  All pass today: I linted them.
- `landing-no-data`: optionally list `more-art.tsx`, `code/timeline.ts` and `code/engine.ts` among the walked files.
  Their imports are lucide, `art`, `@/components/brand`, `@/lib/copy` and `@/lib/motion/*`.
- `contrast.test`: the two `--band` pairs (§1.1).

---------------------------------------------------------------------------------------------------------------------
## 8. Shots (working files, not kept)
- **Final, at 390 and 1280, Day and Night:**
  - `bento-*`, `trust-dev-*`, `uses-*`, `hero-*` (first screen) and `footer-*`;
  - `trust-dev-1280-day-live.png` (Pause showing);
  - full pages `full-1280-day.png`, `full-1280-night.png` and `full-390-day.png` (plus `-small` previews).
- **Loops:**
  - `code-loop-strip-1280-day.png`, `code-loop-strip-390-night.png`;
  - `offer-enter-strip-1280-day.png`;
  - the raw frames are in `frames/`.
- **Iterations:**
  - `before/`: today's page;
  - `iter1`: the first bento and code card;
  - `iter2`: the band options, the offer layout;
  - `iter3`: the band token, compact phone tiles, the tie, the lemon sticker;
  - `iter4`: the step bars, edge widths 320–1440, the card rebalance, the hint options;
  - `iter5`: 2× detail.
