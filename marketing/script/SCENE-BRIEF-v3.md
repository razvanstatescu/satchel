# Scene builder brief — Satchel 2.0 film ("Hand it over")

You build scenes of Satchel's brand-2.0 launch film in Remotion 4.0.537 (React 19, TypeScript), 1920×1080, 30 fps,
≈2:12. Think like a top motion studio making a friendly-premium launch film (Family, Phantom, Duolingo-level craft), not a
slideshow. The brand was just replaced; this film is made from scratch in `marketing/video/src2/` (the old film in `src/`
is brand 1.0: don't reuse its look).

## Read first (in this order)
1. `marketing/script/SCRIPT-v3.md` — the locked script, VO lines V01–V27, scene order, **director's amendments** (they win),
   numbers.
2. `marketing/notes/concepts-v2.md` §4 — the world bible (§4.1: palette, type, the sticker look, the Satchel card, the
   charms and their personalities, the swing, hands and holders, props, transitions, UI), your scenes in §4.3 (exactly
   what we see), §4.4 (the first 5 seconds frame by frame), §4.5 (end card), §4.6 (music cues), §4.7 (accuracy traps).
3. `marketing/notes/brand2-motion-bible.md` — the motion language with exact numbers (slap, peel, press, swing, faces,
   type, transitions, sound). Follow it.
4. Brand: `marketing/brand-v2/DESIGN-SYSTEM-README.md` and `_overview-sheet.png`.
Remotion rules: `/Users/razvanstatescu/.claude/skills/remotion-best-practices/rules/*.md`.

## The project (`marketing/video`, entry `src2/index.ts`)
- `src2/Main.tsx` puts each scene in a `<Sequence>` at its timeline span (Day ground, no grain, no vignette) plus the
  audio layer. Your scene's `useCurrentFrame()` is LOCAL (0 = scene start). Each scene is also its own composition
  (`H1` … `E1`) with the matching slice of audio: `npx remotion still src2/index.ts P3 out/p3/f120.png --frame=120`.
- `src2/lib/timeline.ts`: `marker("drop")` gives an absolute marker time; `getScene("P3")` → `{duration, lines, line(id), word(id, n), wordAt(id, prefix)}` in seconds
  relative to the scene start; lines carry `scene`, multi-sentence lines `sentenceStarts`, V23 `phrases`. **Choreograph
  against VO times, never hard-coded seconds**: the REAL timeline is in (narrator Sarah, 134 s; table in
  `script/timeline-v3.md`): H1 0–3 · H2 3–12 · P1 12–18 · P2 18–24 · P3 24–33 · P4 33–38.5 · P5 38.5–46 · P6 46–58 ·
  C1 58–72 · T0 72–76 · T1 76–82 · T2 82–88.5 · T3 88.5–94.5 · T4 94.5–99.5 · T5 99.5–110 · T6 110–116 · T7 116–126.5 ·
  E1 126.5–134. Absolute markers in `TIMELINE.markers`: hookLand 2.5, musicStop 58, thud 66, subHit 68, flip 73, drop 76,
  blocked 110, landing 122, endPress 132 (convert to scene-relative by subtracting your scene start). 120 BPM: beat 0.5 s.
- `src2/lib/time.ts`: `FPS`, `s()`, `tween()`, `springAt()` (pass a SPRING2 preset), `EASE`. `src2/lib/Sfx.tsx`:
  `<Sfx name="sticker-slap" at={sec} align="peak" gainDb={-3} />` with the 2.0 library in `src2/data/sfx.json`:
  sticker-slap, sticker-peel, pop, pop-high, boing-soft, charm-jingle, chain-clink, swing-swish, button-thock,
  button-thock-deep, tick-soft, bubble-tick-run, type-run, pen-scribble, paper-slide, pocket-slip, stamp-thunk, lock-click,
  whoosh-soft, whoosh-zip, swoop-up, swoop-down, sparkle, success-marimba, coin-ding, error-boop, sneaky-pizz,
  tension-tick, freeze-chime, magic-wand, drum-hit-soft, riser-short. 1–3 sounds/s at most; the VO stays clear.
- Brand: `src2/brand/tokens.ts` (`C`, `NIGHT`, `F`, `display()`, `sans()`, `mono()`, `stickerBox()`, `R`, `CHAIN`),
  `src2/brand/Logo.tsx` (`Mark`, `StickerS`, `Lockup` with draw/drop/tile/word build props), `src2/brand/Charm.tsx`
  (charms, faces, `pendulum`, personality presets: being extended by the character illustrator).
- **Motion kit** `src2/motion/` (index.ts): the bible's verified code. Springs `SPRING2` (pop, rebound, quick, land, carry,
  fade, swing, handoff), `CHARM_SWING`/`CHARM_LAG` (personalities), `EASE2`, `beat()`, `slapAt`/`SlapIn` (14 f slap),
  `Peel`/`peelGeometry`, `HandOff`/`handoffAt`/`rideAngle` (the signature swing), `DrawOn`, `CheckMark`, `Parallax2D`,
  `PushIn`, transitions `tileIris`/`peelOff`/`inkSwipe`, `SparkBurst`/`Confetti`, `WordSlap`/`LineRise`/`Counter`/`TypeOn`,
  `pressAt`/`PrimaryButton`/`PillSwap`, `FlipCard`/`flipAt`, `NightBlind`, `CaptionSlap`, `bonkAngle`/`Stamp`,
  `FrostLaminate`, `gulpScale`, `flickAngle`, `headTilt`, `noWobbleX`, `MarkBuild`. Prefer these over hand-rolled
  timing; DON'T use `SPRING` from lib/time.ts (brand-1.0 values). Kit colours are `K` (`K.coral` = brand).
- Shared kits (built by teammates; read each file's header for props; import, never edit). The illustration and UI kits
  are still being finished as you start: build your choreography, camera and type first with simple placeholder shapes
  for illustrated assets, then check each kit's `index.ts` and swap in the real components; don't build your own hands,
  charms or props unless the kit still lacks them when you polish (then say so in your report).
  - `src2/components/Sticker.tsx`: `Sticker` (lift/press), `Button` (press), `Pill`, `Chip`, `ChainDot`, `Address`,
    `SatchelCard` (front).
  - `src2/illustration/characters/` (index.ts): sticker hands with sleeves and name tags, charm expressions, `CardBack`,
    `CardFlip`, `CardWithCharms`, `PhoneFrame`, `BrowserFrame`.
  - `src2/illustration/props/` (index.ts): SignedSlip, CoinSticker, PriceTag, FrostLaminate, Stamp, ContractPlaque,
    GiftBox, TradeDesk, UsdcStack, StickyNote, ExchangeSticker, WalletSticker, PocketJeans, RequestSticker, SignSlot,
    RecordOutline, ScanBeam, Badge, Sparkles, ToastSticker.
  - `src2/components/ui/` (index.ts): MintScreen, ReceiveScreen, SendScreen, WalletApproveSheet, SigningTracker,
    SatchelScreen, GiveSheet, ListSheet, SalePage + HistoryPanel.
  Galleries to look at: compositions `CharactersGallery`, `PropsGallery`, `UiGallery` (render stills of them first).
  If something you need is missing, build it inside your scene folder and mention it in your report.

## Ownership
Edit ONLY your scene folders `src2/scenes/<ID>/` (the stubs exist; replace `index.tsx`, add files beside it). Never edit
shared files (`src2/brand`, `src2/lib`, `src2/components`, `src2/illustration`, `src2/Main.tsx`, `src2/Root.tsx`,
`src2/scenes/registry.ts`, `src2/data`, anything in `src/`). Never run `npm install`. Nothing outside `marketing/`. No git.
Never publish anything.

## Craft and brand rules
- Stickers have weight: they slap, peel, press and swing; hard ink drop shadows move with the element (lifted = bigger
  drop, pressed = none). Springs with a little overshoot, then stillness so text can be read.
- Day ground everywhere except C1 (Night: ground #120c26, surface #1c1538, ink #f4f2ff); T0 brings Day back with the flip.
- Coral is ONE fill per frame (card band or the primary button). Lemon/sky are sticker accents only. Never white text on
  coral. States: success / frozen (snowflake, "Paused for sale") / danger.
- Logo: never rotate or tilt it, never on coral, never without its outline and shadow once built, never a face on the S,
  wordmark lowercase. Charms: faces yes, chain logos never, they never talk (motion + SFX only).
- Captions: Funnel Display 800, sentence case, 110–160 px, ink (or #f4f2ff on Night); must-read text ≥ 56 px; on screen
  ≥ 0.8 s + 0.25 s/word after landing. Only the hook and end captions get the white sticker treatment.
- Accuracy: mainnet-style names (`.near`, `bc1q…`), never "testnet", "Sepolia", "devnet"; no fiat; never "every chain";
  "Give", "Paused for sale", "Usually about 10 seconds"; "NEAR's signer network", never "MPC"; no "trustless"; no wait or
  countdown after listing; the buyer's browser runs the check, the app keeps Buy off, the buy is one transaction bound to
  the history.
- Performance: avoid heavy full-frame filters every frame; `CameraMotionBlur` only on ≤ 0.4 s whips (samples ≤ 6);
  built-in transitions crossZoom/zoomBlur/linearBlur are off-limits. Deterministic only (`random(seed)`, no Math.random).

## Continuity between scenes (talk through the timeline, not to each other)
H1→H2 is one continuous shot (bob holds #7). **Peels are central** (`src2/transitions.ts`, a TransitionSeries in
Main.tsx): H2→P1 and T7→E1 use the kit's `peelOff` (20 frames, from the bottom-right corner). The outgoing scene (H2, T7) is
extended by 20 frames past its span: hold your final pose there (no exit animation; `useCurrentFrame()` goes past
`getScene().duration`, so clamp). The incoming scene (P1, E1) is revealed under the peel during its own first 20 frames:
start it already composed (or begin its entrance from frame ≈14). H2→P1: the frame peels away. C1 starts with Night falling (blind-wipe from the
top); T0 flips #7 and Day sweeps back. T7→E1: the frame peels away. Elsewhere: slap-ins, whips with 2-frame smears, camera
punch-ins. Hero Satchel #7 looks identical everywhere (card front + charm bar).

## Verify (you can't watch video: look at frames)
`cd marketing/video && npx tsc --noEmit` must pass. Render stills at key moments and LOOK at them (Read the PNG):
the first and last frame, every caption landed, every transition midpoint, and dense strips (2–3 frames apart) through every
hero move (slaps, swings, flips). Fix clumsy frames: collisions, overflow, dead air, off-brand colour, jaggies. When the real
timeline lands (`src2/data/timeline.json` without a `placeholder` key), re-check your timing. Keep test outputs in
`marketing/video/out/<scene ids>/`.

## Final report (≤ 250 words)
What you built per scene (the hero move), sound cues, shared components used, anything missing from the kits, and known
weaknesses.

---

## v4 update (2026-11-03): read this first
The product gained features after v2, so the film gets an UPDATE, not a redesign: `script/SCRIPT-v4.md` lists exactly
what changes per scene, the new/changed VO lines (✱), the numbers and the presentation rules. **Keep the v2 design,
style, motion, pacing feel and sound.** The Oct 27 "v3 real-app UI" pass (bottom sheets, restyled screens) was
rejected and reverted: never reapply any of it.
- Timing: `src2/data/timeline.json` is rebuilt for v4 (≈ 131 s); `script/timeline-v4.md` has the table. Your scene
  must still re-time from `getScene()`; check your hard-coded seconds and frame constants against the new lengths.
- The shared `SatchelCard` becomes the value card (≈ $X, value bar, coin shares; computed from `coins`). Check every shot
  where the card appears for overlaps and for amounts that should change (numbers table in SCRIPT-v4).
- New shared art: `src2/components/ui/feature-cards.tsx` (`AllowanceCard`, `OfferCard`, `ClaimLinkCard`,
  `NetworksCard`), props `CoinSticker` usdc/near with network badges, a NEAR stack, `RequestSticker kind="message"`,
  `RecordOutline kind="message"`.
- Same ownership as before (only your scene folders). Same verification: tsc, dense stills, look at them.
- The app runs locally for reference at http://localhost:3215 (fixture data, read-only; don't start another server;
  mock wallet: localStorage `satchel:mock-wallet`, onboarding done: `satchel:onboarding:v1`). Current screenshots:
  /private/tmp/claude-501/-Users-razvanstatescu-Documents-Work-near-Satchel/c14df839-9fb7-4a09-952b-45a7895265a1/scratchpad/app-now/
  and the landing grid ../land-grid.png. The landing is the closest model for how the film presents features.
