# Orchestrator rulings (binding for every agent; newest at the bottom)

Read with `context.md`. These settle the open questions from wave 1. Anything marked **RAZVAN** is still open: design
it so either answer works, and the orchestrator will ask him at the prototype checkpoint.

## R1. Answers to `design-system-impl.md` §10
| # | Question | Ruling |
|---|---|---|
| 1 | Night sticker outline (#1D1340 is invisible on Night surfaces) | Keep it as in the canvas for now. Revisit at the Night review of the prototypes. Designers may show a `#706a9f` variant side by side |
| 2 | Selected tab = a 3 px `brand-line` underline; segmented = inverse | Confirmed |
| 3 | The lemon **"Yours"** sticker replaces the stitch as the "you own this" mark | Confirmed. The design lead may refine the placement |
| 4 | Status words follow `voice-copy.md`: "Paused for sale" and "Given" | Confirmed. This reverses kb/80 R3. The orchestrator updates kb/80 at the end |
| 5 | Landing H1 and OG tagline | **RAZVAN.** Candidates: A, the D-41 line; B, "Stick it on. Hand it over."; C, "Sell a wallet with everything inside. The buyer checks it first." (`voice-copy.md` §3.1). Prototypes use C, with A and B swappable |
| 6 | Per-token leather hue | Dropped from the UI. `packages/core` is untouched |
| 7 | NFT image chips | Follow `SOL_UI_ENABLED`, like the app |
| 8 | Theme key bump to `satchel:theme:v2` | Yes |
| 9 | C2PA metadata in the SVGs | Kept verbatim in `brand/` and `public/brand/`, and dropped from the inline components |
| 10 | `favicon.ico` without a 48 px frame | Regenerate 16/32/48 from `favicon.svg` if it's cheap; low priority |
| 11 | Many coral bands on grids | Bands are identity, not the coral budget. One coral *fill for action* per view |

## R2. Theme rule: **RAZVAN**
- **(a)** The brand 2.0 / architect mechanism: System by default, so Night on a dark OS, with a System · Day · Night
  override.
- **(b)** D-42: Day by default whatever the OS, with Night and System in the toggle.

Prototypes must look great in both themes. The orchestrator recommends (a) to Razvan, because he authored brand 2.0
after D-42.

## R3. Vocabulary
`voice-copy.md` §1.2 is adopted as is: Give, Handed over to, Paused for sale, Stop selling, Add coins, Mint, owner,
Used, Confirming, Not its coin, Sample data. Never use "Transfer" in UI copy for giving a Satchel.

## R4. Structure
- **Adding an app-home route for My Satchels is allowed** (proposed: `/satchels`). The landing `/` then becomes purely
  marketing and keeps D-42 (no data on `/`).
- Sub-pages of `/s/[id]` may get a compact header.
- The judge facts on `/s/1` and `/contract` stay complete in the server HTML (`judge.spec`). The visible text changes
  that tests pin are allowed only where this file or a design decision lists them.
- **No fiat, ever.** The card hero must be informative without fiat: native amounts or charms, not a bare
  "{n} chains". The design lead and the product designer decide together, and the design lead records it in
  `design-spec.md`.

## R5. Things nobody touches
- the contract;
- `packages/core`;
- `marketing/` (the video team);
- the data and chain logic (`src/lib/{near,chains,signing,data}`), unless the orchestrator says so;
- CLAUDE.md, which belongs to satchel-da; the orchestrator sends it the brand summary.

## R6. Night sticker outline (updates R1 #1, 2026-10-26 12:3x)
- **The problem:** the architect (F5) and the researcher both measured that the canvas's #1D1340 outline disappears on
  Night surfaces (1.00–1.16:1), and the black drop does too (1.11:1). In Night, only the coral band reads as a sticker.
- **The ruling:** in Night, stickers get a **visible** outline. The design lead picks between `line-strong` #8A82AE
  (4.85:1, the researcher's pick; Duolingo dark keeps light outlines on violet) and #706a9f (the architect's).
  - Show the canvas look and the chosen look side by side in one Night screenshot (`proto/shots/night-outline-compare.png`)
    so Razvan can see the trade-off.
  - Keep the hard drop in Night, but make it read: e.g. the drop in #000 plus the light outline, or a drop tinted from
    the ground.
  - Record the token in `tokens.css` as `--sticker-line` (Night) and note it in `design-spec.md`.

## R7. Connect wallet modal
`@hot-labs/near-connect` 0.11.4 draws its own dark modal; only `footerBranding` can be themed. The product designer may
design a Satchel-styled wallet picker (a sheet listing the wallets, built on `availableWallets` and
`connect({ walletId })`). It is **optional**: the builder must first prove that `connect({ walletId })` skips the
library's own picker. If it doesn't, keep the library modal and style only our "Connect" button and the
connected/account states. Fixture mode keeps the mock wallet either way.

## R8. Footer note (2026-10-26, orchestrator)
- The footer's bottom row uses `footer.testnet` ("Testnet only. Coins here have no value.") on **both** the landing and
  the app.
- `footer.noteClean` ("Clean history is checked in your browser… The contract doesn't enforce it.") leaves the footer.
  Razvan asked for that kind of line to go (v4 feedback). The honest disclosure still lives where a buyer needs it:
  `clean.disclosure` on the buy page's report, and the FAQ `q-proves`.
- Keep the key in `copy.ts` only if something else reads it; otherwise delete it, together with its unit-test pin.

## R9. Accepted from `design-spec.md` (the design lead's decision log, DL-1 to DL-15)
All are accepted, pending Razvan's answers on the H1, the theme rule, the hero layout and the Night outline:
- the charm-ledger card hero; the judge pin changes to "0.00189718 BTC";
- "Yours" replaces the stitch, and is not shown on My Satchels;
- no per-token hue;
- one shell, one footer, one button system, one ThemeControl per surface;
- "Connect NEAR wallet" everywhere;
- the `/satchels` app home;
- Night `--sticker-line` #8A82AE;
- flat illustration fields;
- the sparkle and the sad coin, used sparingly.

## R10. Motion (2026-10-26, orchestrator)
- **`motion-spec.md` is binding** for every animation. It supersedes `design-system-impl.md` §5 wherever they differ:
  - the press is 60 ms ease-out;
  - the swing is caused by the carry;
  - the loader stamps, never rotates the S.
- **WAAPI and CSS only.** New code doesn't import the `motion` package. Once nothing imports it, the QA phase removes
  it from `apps/web/package.json` (and updates the lockfile).
- Adopt the motion designer's requests in `proto/MOTION-NOTES.md`:
  - hide the "n of 4" count below 430 px;
  - centre dialogs without `translate(-50%,-50%)`;
  - the How card swings to rest;
  - add the motion layers.

## R11. App screens (2026-10-26, orchestrator), accepted from `app-screens.md`
Everything in `app-screens.md` is accepted, including its test and copy changes (§12):
- the compact header on sub-tabs;
- each fact once;
- `/satchels`;
- "Connect NEAR wallet";
- Sell defaults to NEAR, with an inline USDC Register;
- the feedback states.

The product designer's open questions:
1. **Tabs go under the h1.** Yes.
2. **The clean check runs on the owner's pages only while listed.** Yes, which fixes the inventory's honesty gap 6b.
3. **The "You have 12.40 USDC" line under Buy** is built only if the balance read is cheap (one view call, already
   available). Otherwise skip it.

Also adopt `proto/APP-COMPONENTS.md`:
- `.sheet__body > * { flex-shrink: 0 }`;
- the toast offset above pinned bars;
- the small-phone top bar.

## R12. RAZVAN'S DECISIONS (2026-10-26; recorded as D-44 in plan/decisions.md). These override R1 #5, R1 #8 and R2.
1. **H1:** **C**, "Sell a wallet with everything inside. The buyer checks it first.", two-tone. "Stick it on. Hand it
   over." is the final coral band's heading.
2. **Hero:** **A, "the shelf"** (`proto/landing.html`). Hero B is dropped.
3. **Theme:** **Day first, whatever the OS (D-42 kept).**
   - **Default:** Day. Without JS: Day.
   - **Night or System:** the stored choice sets it (System follows the OS).
   - **Storage key:** keep **`satchel:theme:v1`**. The semantics don't change, so there's no key bump, and R1 #8 is
     void.
   - **Mechanism:** keep today's `apps/web/src/lib/theme.ts` (verified on 2026-10-26). It already does exactly this:
     - the head script resolves the stored choice to `<html data-theme="day|night">` (never "system");
     - "system" follows the OS live through a listener;
     - with no JS there is no `data-theme`, so Day applies.
   - **Only change** the `GROUND` values, to `{ day: "#F6F5FB", night: "#120C26" }`.
   - **CSS:** `:root, [data-scheme] { …light-dark() tokens… }`, `:root { color-scheme: light }`,
     `:root[data-theme="night"] { color-scheme: dark }`, and `[data-scheme="day|night"]` islands re-declare the tokens
     (design-system-impl §1.1). Don't use the architect's "System is pure CSS" default.
   - **The head script** keeps setting `theme-color`: Day `#F6F5FB`, Night `#120C26`.
   - **Tests:** `theme-a11y.spec`'s "Day even on a dark OS" stays, with the new grounds.
   - **`viewport.themeColor`:** the Day ground. **Manifest:** the Day ground.
4. **Night sticker outline:** **#8A82AE** (`--sticker-line` in Night), with the #000 drop kept.
