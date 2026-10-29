# Scene builder brief (shared by every scene agent)

You build scenes of Satchel's ≈100 s hypermotion hackathon video in Remotion 4.0.537 (React 19, TypeScript), 1920×1080,
30 fps. Story, VO and scene beats: `marketing/script/SCRIPT.md` (read it fully). Product truth: `README.md` at the repo
root. Brand: `brand/README.md`, `brand/design-system.md`. Motion techniques: `marketing/notes/hypermotion-cookbook.md`
(being written now; check for it at the start and again halfway through, and use it). Remotion rules:
`/Users/razvanstatescu/.claude/skills/remotion-best-practices/rules/*.md` (animations, timing, sequencing,
text-animations, transitions, light-leaks, 3d, images, measuring-text).

## The project (marketing/video)
- `src/Main.tsx` puts each scene inside a `<Sequence>` at its timeline span, then a shared finish (vignette + film grain)
  and the audio layer (VO + ducked music). Your scene renders inside its own Sequence: `useCurrentFrame()` is LOCAL
  (0 = scene start). Each scene is also its own composition (`S01` … `S09`) with the matching audio slice.
- `src/lib/timeline.ts`: `getScene("S05")` → `{duration, lines, line(id), word(lineId, n), wordAt(lineId, prefix)}`,
  all in seconds relative to the scene start. **Choreograph against VO times, never hard-coded seconds** (the timeline is
  a placeholder now; the real one, built from the generated voice, replaces `src/data/timeline.json` soon and your
  scene must re-time itself). Beats: 120 BPM (`BEAT` = 0.5 s); scenes start on 2 s bars.
- `src/lib/time.ts`: `FPS`, `s(sec)`, `tween(frame, startSec, endSec, from, to, easing)`, `springAt(frame, fps, startSec, SPRING.x)`,
  `EASE.expoOut/expoIn/expoInOut/quintOut/standard/whip`, `SPRING.lift/handoff/slam/snap/soft`.
- `src/lib/Sfx.tsx`: `<Sfx name="whoosh-fast" at={sec} align="peak" gainDb={-3} />`. Place sounds at your visual events
  (relative to your scene). Names (library being generated into `src/data/sfx.json`; unknown names render nothing):
  whoosh-fast, whoosh-deep, swish-short, whip-pan, impact-deep, impact-brass, impact-soft, ui-tick, ui-click,
  type-tick-run, stitch-run, stitch-single, leather-creak, paper-slide, pocket-slip, riser-4s, downlifter, sub-drop,
  freeze-shimmer, success-brass, error-low, counter-roll, scanner-sweep, glitch-short, heartbeat-tension, lock-clunk.
  Whooshes: `align="peak"` on the cut frame. Don't over-score: 1–3 sounds per second at most, and leave the VO clear.
- `src/brand/tokens.ts`: colours `C`, fonts `F`, `display(wght, opsz, wdth)` for Bricolage's variable axes
  (wght 200–800, opsz 12–96, wdth 75–100: animate them!), `CHAIN`, `ADDR` (Satchel #1's real addresses).
- `src/brand/Logo.tsx`: `<Mark size tile strap stitch />`, `<Lockup height tile strap stitch word />` (0..1 build props).
- `src/components/SatchelCard.tsx`: `<SatchelCard tokenId width status chips stitch name total sub />` (faithful port
  of the product card; `stitch` 0..1 sews the ownership stitch in), plus `BandPill`, `CardChip`, `ChainDot`, `StitchRect`.
- `src/components/Atmosphere.tsx`: `Ground` (Night ground + optional texture plate), `Vignette`, `Grain`.
- Images: `public/images/*` with a catalog in `src/data/images.json` (being generated: leather-ground, leather-ground-2,
  stitch-macro, stitch-macro-straight, brass-plate, paper-plate, pocket-slip, handshake, ledger, key-hooks-empty,
  slip-cutout (transparent), fan-of-copies, leather-strap-macro). Check the catalog; if a plate isn't there yet, build
  the scene so it looks good without it (code fallback) and switch to the plate when it appears.
- Real product screenshots: `public/ui/**` indexed in `marketing/notes/ui-capture.md` (desktop @2x, components @3x,
  flows). Use them for "this is the real app" moments (in a browser frame, 3D-tilted, parallax), never as the only hero.
  Product component sources to port from (read-only): `apps/web/src/components/` (ui.tsx, Clean.tsx, ChainRow.tsx,
  AddressDisplay.tsx, client/Handoff.tsx, client/SigningProgress.tsx, client/SaleTab.tsx) and `apps/web/src/lib/copy.ts`
  (use real product copy).

## Ownership (no conflicts)
- Edit ONLY your scene folders (`src/scenes/SXX/`) plus any shared folder you're explicitly assigned. Put helpers you
  need inside your scene folder. Never edit `src/brand/*`, `src/lib/*`, `src/components/*` (unless assigned),
  `src/Main.tsx`, `src/Root.tsx`, `src/AudioLayer.tsx` or `src/data/*`. If you need a change there, describe it in your
  final report. Never run `npm install` (if you truly need a package, report it).
- Never touch anything outside `marketing/`. No git. Never publish or upload anything.

## Craft rules (the bar is a premium launch film, not a slideshow)
- Hypermotion: fast, decisive moves (expo easings, springs with tiny overshoot), whip transitions with motion blur,
  scale slams, masked line reveals, variable-font weight/width morphs, parallax depth, 3D tilts (CSS perspective),
  camera drift (`@remotion/noise`), hard cuts on beats, then stillness so text can be read. Every scene has ONE idea and
  one hero move. Contrast fast and still.
- Readability: every text card is on screen ≥ 0.8 s + 0.25 s/word after it has landed; large sizes (display text
  110–260 px; nothing important under 28 px); sentence case; high contrast (ink on ground). Muted viewers must get
  the story from the text alone.
- Brand: Night palette only. Brass = the brand (used sparingly, once per frame as a fill). Chain colours only as small
  accents. State colours: success = clean/settled, frozen = paused/signing, danger = the threat. The saddle stitch means
  "you own this": use it only for ownership. Logo: never recolour, rotate, slant, glow, bevel or shadow it, never on a
  brass ground. No neon, lasers, spinning coins, matrix rain, cheesy glitch.
- Accuracy: copy must match SCRIPT.md and product facts. No fiat amounts. Mainnet-style wording on screen (see v2 changes).
- Performance: `@remotion/motion-blur` `CameraMotionBlur` is expensive (samples × cost); use it only on short whip
  windows (≤ 0.4 s) with samples ≤ 8, or fake blur with `filter: blur()` on the moving axis. Avoid huge `filter` stacks
  on full-frame layers every frame.
- Cookbook traps: `CameraMotionBlur` only blurs motion computed INSIDE its children (it re-renders them at sub-frame
  times); built-in transitions crossZoom/zoomBlur/linearBlur (and others flagged in the cookbook) need an experimental
  Chrome flag: don't use them; fade, slide, wipe, flip, clockWipe, iris and custom presentations are fine. `LightLeak`
  is deprecated (WebGL): only use it if you test-render it. Keep text ≥ 56 px for anything people must read on a phone.
  The stitch "sews itself" device belongs only to ownership moments.
- Use `<Img>` from remotion for images and `staticFile()` for public paths. Deterministic only: no Math.random (use
  `random(seed)` from remotion), no Date.

## Verify your own work (you can't watch video, so look at frames)
- `cd marketing/video && npx tsc --noEmit` must pass.
- Render stills at key moments and LOOK at them (Read the PNG): `npx remotion still S05 out/sXX/f120.png --frame=120`.
  Check at least: the first frame, each text card fully landed, each transition midpoint (motion blur reads as motion),
  the last frame. Fix anything clumsy: text collisions, overflow, dead empty frames, off-brand colour, jaggy edges.
- For motion feel, render a strip: several stills 2–3 frames apart through each hero move.
- Optionally render a low-res check: `npx remotion render S05 out/sXX/check.mp4 --scale=0.5`.
- Keep your test outputs in `marketing/video/out/<your scene ids>/`.

## Final report (≤ 250 words)
What you built per scene (the hero move), sound cues placed, which images/screenshots you used, anything you need
changed in shared files, and known weaknesses.

---

## v2 changes (read this first if you worked on v1)
- **Script v2** (`script/SCRIPT.md`) rebalances the film: the wallet first (mint W1, fund W2, spend W3, no seed phrase /
  owner-only S04, transfer S02, use cases U1), then the catch (S05), the logo (S06), the tech (S07), the handoff (S08),
  the end card (S09). Order = `scenes` in `src/data/timeline.json`. ≈132 s.
- `timeline.json` is a **v2 placeholder** (estimated durations for new or changed lines, `file: null`, so they're silent).
  The audio pipeline replaces it with the real voice soon; your scene must re-time from `getScene()`. Lines now carry a
  `scene` field. **S03 is no longer a timeline scene** (`getScene("S03")` throws); its visuals open S04.
- **Mainnet wording on screen**: `alice.near`, `bob.near`, `carol.near`, `mallory.near`, `satchel.satchelhq.near`, Bitcoin
  addresses `bc1q…` (Satchel #1: `ADDR.btc`), chain names without network suffixes ("Bitcoin", not "Bitcoin testnet4").
  Never "testnet", "Sepolia", "devnet", "faucet". Prices in USDC. Use the mainnet screenshots
  (`ui/desktop/contract-mainnet@2x.png`, `ui/flows/buy-s3-1-clean-mainnet@2x.png`); other captures in `public/ui/` show
  testnet text, so don't use them unless you crop that text out.
- Product UI kit for everyone: `src/components/product/` (import from `index.ts`): StatusPill, ItemPill, ChainMark,
  ChainDot, Avatar, Chip, Banner, FreezeBanner, CleanHistoryPanel/Row/Verdict, GateLine, CheckLine, BuyButton, BuyBlock,
  Swatch, SigningStep, BrowserFrame. Read its file headers. Don't edit it (owner: builder C); copy into your folder if
  you need a variant.
