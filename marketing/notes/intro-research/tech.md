# Intro barrage: technique research and prototype

An ~8 s cold open for the launch film: real screenshots of X posts, news headlines and blog posts about drains,
leaked seed phrases and signature scams fly past with aggressive motion and a wave/glitch look, then the chaos turns
into the Day sticker world and hands over to H1 ("Stick it on."). Written 2026-11-10 against Remotion 4.0.537, React
19.3, Chrome headless shell 157.0.8080.0, on the team's M5 Pro (15 cores).

**Prototype:** `marketing/video/src-proto/` (entry `src-proto/index.ts`, typechecks with
`npx tsc --noEmit -p src-proto/tsconfig.json`). Nothing in `src2/` was edited; the prototype imports `src2` read-only
(`HookShot`, `CardWithCharms`, `peelGeometry`, `slapAt`, the brand fonts). All placeholder screenshots are
**fictional** (invented outlets and handles, `.example` domains) and must be replaced by real, sourced ones.
**Evidence:** `marketing/video/out/proto/` (stills, contact sheets, two test renders, raw benchmark numbers).

## 0. The answer in six lines

1. **Render with `--gl=angle`.** The default GL setting renders WebGL on SwiftShader (CPU). Measured: the GL and
   chained-SVG routes cost 11–20× more without the flag. With it, every technique below costs at most ~8 ms/frame
   over a plain image at 1080p (most ≤ 5).
2. **Build the chaos in plain DOM** (`<Img>` screenshots, CSS 3D, CSS slices, a camera transform) and run **one GPU
   pass over the composed frame**: `<FramePost look>` = `<HtmlInCanvas effects={[barrageFx(look)]}>`. One WebGL
   context for the whole intro.
3. **`barrageFx`** is one custom `createEffect` shader: wave, turbulence warp, RGB split, slices, scanlines with a
   rolling band, grain, vignette, whip blur, zoom blur, grade, flash. Every part takes an intensity 0..1
   (`fx/looks.ts`), and it is deterministic (an integer hash of pixel and frame-stepped seed).
4. **Motion is cheap DOM:** `Tunnel` (CSS 3D), `punchAt`/`whipAt` camera paths whose velocity drives the blur
   (`camMotion` → `motionLook`), `shake`, `burst`/`bursts` envelopes on the cut list.
5. **Turn idea 1 (slap, freeze, peel) is prototyped end to end** (`H-Barrage`) and lands on H1's real frame 0: the
   swap frame differs by PSNR 41.9 dB (invisible).
6. **The whole 6.2 s demo renders at 1080p in 6.1 s** wall time (bundle, frames and H.264 included).

---

## 1. What is in the prototype

| Composition | What it shows |
|---|---|
| `H-Barrage` (186 f) | The whole idea: 4 s barrage → turn idea 1 → 1 s of the real H1 (`HookShot`) |
| `A-Wave`, `A-Wave-Svg` | (a) wave displacement, GL and SVG |
| `B-WarpBurst`, `B-WarpBurst-Svg` | (b) turbulence warp burst on a hard cut every beat |
| `C-Rgb`, `C-Rgb-Svg` | (c) chromatic / RGB split |
| `D-Slices`, `D-Slices-Css` | (d) horizontal slice glitch, GL and CSS |
| `E-Screen`, `E-Screen-Css` | (e) scanlines, rolling band, grain, vignette, grade |
| `F-Tunnel`, `F-Tunnel-Dom` | (f) 12-card z-tunnel with and without the post pass |
| `G-PunchWhip`, `-Cmb`, `-Svg`, `-None` | (g) zoom punch + whip; GL blur vs `CameraMotionBlur` vs SVG blur vs none |
| `Bench-*` (18) | Cost benchmark: every route on identical content |
| `Plate`, `CardStill` | Exports the fictional cards as PNG (the screenshot stand-ins) |
| `GlInfo`, `Smoke` | Prints the WebGL renderer string; the first smoke test |

The effect demos are 60 frames. Their intensity ramps 0 → 1 over 50 frames (frames 20 / 40 / 59 = 0.4 / 0.8 / 1),
and the `intensity` prop overrides the ramp. The `route` prop switches between `post`, `svg`, `css`, `cmb` and `none`.

```bash
cd marketing/video          # check `ps` first: the CPU is shared
npx remotion studio src-proto/index.ts --port=3530
npx remotion still  src-proto/index.ts C-Rgb out/proto/x.png --frame=40 --gl=angle --port=3530
npx remotion render src-proto/index.ts H-Barrage out/proto/barrage.mp4 --gl=angle --concurrency=4 --port=3530 --scale=0.5
GL=angle node src-proto/scripts/stills.mjs out/proto/s A-Wave:40 'D-Slices:20:{"route":"css"}@d.png'  # one bundle, many stills
GL=angle CONC=4 FRAMES=90 node src-proto/scripts/bench.mjs Bench-img Bench-hic-dom-full            # cost benchmark
```

Evidence in `marketing/video/out/proto/`:
- `effects-sheet.png`: (a)–(g) after tuning, with labels drawn in the frame.
- `svg-sheet.png`: the SVG routes.
- `sheet-g33.png`: the whip's fastest frame: none / GL / `CameraMotionBlur` / SVG.
- `sheet-bench.png`: all 16 benchmark routes, to prove none of them renders blank.
- `sheet-barrage-1.png`, `sheet-barrage-2.png`, `sheet-slams.png`: key frames of `H-Barrage`.
- `sheet-video.png`: every third frame of the 1080p render.
- `swap-diff.png`, `glinfo.png`.
- Full-resolution frames: `final/` (the tuned effect demos), `barrage/` (`H-Barrage` key frames), `fidelity/`.
- `barrage-test-half.mp4` (`--scale=0.5`) and `barrage-test-1080.mp4`.
- `bench/results.jsonl` (raw numbers).

## 2. Measured cost

**Method.** 1920×1080, `renderFrames` to JPEG q80 (no encode), concurrency 4, 90 frames after a 4-frame warm-up. Every
frame is re-seeded, so nothing is cached. I checked with `top` before each run that no other render was going. The
numbers repeat across runs (the baseline measured 19.2 twice). "Wall" is wall time
divided by frames: what a render really costs. The in-tab time is capture-bound (67 or 83 ms, 4–5 display ticks), so
differences under ~3 ms/frame are noise.

| Route (ms per frame, wall) | `--gl=angle` | default GL |
|---|---:|---:|
| Plain `<Img>` (baseline) | 19.2 | 19.2 |
| Plain DOM wall of 7 cards | 20.4 | 23.0 |
| SVG turbulence warp | 21.2 | 42.6 |
| SVG RGB split | 19.1 | 29.4 |
| SVG wave + warp + split chained in one filter | 24.4 | **407.4** |
| SVG directional blur (σ 210 px) | 18.8 | 62.0 |
| CSS slices (≤ 16 band copies of an `<Img>`) | 20.0 | 25.7 |
| CSS screen overlay (gradients + canvas grain) | 23.4 | 66.3 |
| Raw WebGL canvas, full look incl. a 300 px whip blur | 23.5 | **465.2** |
| Raw WebGL canvas, light look | 23.6 | 60.8 |
| `<Img effects={[barrageFx(full)]}>` | 23.7 | 358.4 |
| `<Img effects>` with 5 built-ins (wave, turbulentDisplace, chromaticAberration, scanlines, noise) | 24.5 | 275.3 |
| `<HtmlInCanvas>` without effects (capture only) | 23.3 | 27.3 |
| `<HtmlInCanvas>` full look over the PNG plate | 22.6 | 336.6 |
| `<HtmlInCanvas>` full look over live DOM | 24.1 | 317.3 |
| `<HtmlInCanvas>` light look over live DOM | 22.6 | 54.3 |
| (f) Tunnel, DOM only | 20.4 | 33.2 |
| (f) Tunnel + full-frame post | 27.6 | 76.8 |
| (g) Punch + whip, GL motion blur | 23.7 | 62.3 (p90 792) |
| (g) Punch + whip, `CameraMotionBlur` 8 samples | 20.6 | 28.9 |
| (g) Punch + whip, SVG Gaussian | 19.8 | 19.4 |

- **End to end:** `H-Barrage` (barrage, turn and 1 s of H1, 186 f) renders in 6.1 s wall at 1080p with
  `--gl=angle --concurrency=4`, bundle and H.264 included; 5.8 s at `--scale=0.5`. An 8 s intro is ~10 s per render.
- **Why default GL is slow** (`glinfo.png`, the WebGL renderer string read inside the render):
  - default: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)), SwiftShader driver)`, i.e. the CPU.
  - `--gl=angle`: `ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Pro)`, i.e. the GPU.
- **Colour fidelity:**
  - `<Img effects={[barrageFx(all amounts 0)]}>` is bit-identical to a plain `<Img>` (PSNR ∞).
  - `HtmlInCanvas` capture against plain DOM: PSNR 49.9 dB, a mean shift of 0.08/255, and at most 21/255, only at
    glyph anti-aliasing.
  - The GL path shifts no colour.

## 3. Recommended stack per effect

All px values are at 1080p. The shader scales them by output height / 1080, so `--scale=0.5` previews look the same.
"i" is the intensity. Costs are with `--gl=angle`.

The GL parts (a)–(e) and (g) live in ONE pass. With every part on at once (wave, warp, split, slices, screen, a
300 px blur) it costs +4–5 ms/frame at 1080p (`Bench-gl-raw-full`, `Bench-hic-dom-full`), so no single part is a
budget item. The alternative routes were measured one by one (§2).

### (a) Wave displacement: `waveLook(i)` in `barrageFx`
- **What it does:**
  - A VHS line wave: a horizontal offset that varies along y (two sines plus a per-line jitter), up to 24 px, at
    2.2 → 5.5 cycles per frame height.
  - A soft vertical sway (After Effects Wave Warp), up to 14 px.
  - Up to +3 px of chroma bleed.
- **Look rule:** stay ≤ 0.4 (≈ 10 px) on text being read. A sway above ~15 px turns a card into a waving flag; that
  cheesy part was tuned out.
- **Alternatives:**
  - `SvgWave`: turbulence with `baseFrequency="0 f"`, scrolled down. It only wobbles the edges.
  - Built-in `wave({amplitude, wavelength, phase, direction})`: one sine, no line jitter.

### (b) Turbulence warp burst on a cut: `warpLook(i, frame)` × `burst(frame, cut, 7)`
- **What it does:** an fbm vector field (3 octaves of value noise), up to 150 px, feature size 420 → 260 px, plus a
  2.5% zoom blur. Evolution is the noise's z axis (`frame * 0.18`), so the boil is smooth.
- **The envelope is the look:** 1 on the cut frame, 0.42 two frames later, 0.12 by +5. The new shot arrives liquefied
  and snaps clean.
- **After Effects equivalent:** Turbulent Displace on an adjustment layer (Amount 100–150, Size 250–400, Complexity
  2–3, Evolution keyframed hard on each cut), Twitch-style.
- **Alternatives:**
  - Built-in `turbulentDisplace({amount, size, evolution, seed, complexity, pinning})`.
  - `SvgWarp`, which looks equivalent (`svg-sheet.png`).

### (c) Chromatic / RGB split: `rgbLook(i, frame)`
- **What it does:** 0 → 20 px (power 1.6, so i 0.5 = 6.6 px), lens-like (`rgbRadial` 0.55: the split grows toward the
  frame edges), its angle drifting ±0.15 rad.
- **Where else it comes from:** inside displaced slice bands it is ×2.5, and `motionLook` adds up to 10 px along the
  motion.
- **Look rule:**
  - Keep it ≤ 6 px on text being read.
  - 12–20 px only for 1–2 frame hits.
  - Use the radial split: a uniform split is what reads as a preset.
- **Alternatives:**
  - Built-in `chromaticAberration({amount, angle})`.
  - `SvgRgbSplit`: `feColorMatrix` isolates each channel, `feOffset` moves R and B, `feBlend` screens them back.

### (d) Horizontal slice glitch: `slicesLook(i)` (GL) or `<SliceGlitch>` (CSS)
- **GL:**
  - Bands: 6–23 coarse bands plus fine slivers (5× finer), redrawn per stepped seed.
  - Share displaced: 0.55·i of the coarse bands and 0.14·i of the slivers.
  - Shift: 30 → 260 px, snapped to a 6 px grid (digital, not liquid), with colour fringes inside the shifted bands.
- **CSS:** clip-path `inset()` bands, mostly thin slivers with one or two thick bands, 75% biased to one side per hit,
  and 12% inverted stripes (`mix-blend-mode: difference`). It renders the children once per displaced band, so use
  it on an `<Img>` or a single card only.
- **Look rule:** slices are events, never a state.
  - Hold 1–2 frames (`stepSeed(frame, hold)`).
  - One direction per hit.
  - At most 3 hits per beat.
- **After Effects equivalent:** slice/tear presets, Datamosh 2. True datamosh (smearing P-frame motion vectors) is
  not reproducible in Remotion; slices plus the whip blur read the same at this speed.

### (e) Scanlines + noise: `screenLook(i)` (GL) or `<ScreenOverlay>` (CSS)
- **GL:**
  - Scanline darkness 0.06 → 0.42 at a 4 px pitch.
  - A rolling tracking band (moves 16 px/frame; brightens and jitters the lines inside it).
  - Per-frame grain 0.04 → 0.38.
  - Vignette 0.15 → 0.55.
  - Desaturation 0.1 → 0.55 and a cool shadow tint.
- **Look rule:** this is the *world* of the chaos.
  - Keep it on, constant and low (0.3–0.5), for the whole barrage.
  - Switch it off at the turn: the clean sticker world is the contrast.
- **Built-ins:** `scanlines()`, `noise()`, `whiteNoise()`, `vignette()`.
- **CSS route:** cheap with angle. Its grain is a JS loop, which costs 66 ms/frame at default GL.

### (f) Z-tunnel / wall of screenshots: `<Tunnel>` + post zoom
- **Geometry:**
  - Plain CSS 3D, no `@remotion/three` (not installed and not needed).
  - 12 cards on a golden-angle helix: radius 380–760 px, ×1.3 horizontally and ×0.72 vertically.
  - Depth 4600 px, perspective 900 px. Every card uses the screen centre as its origin, so there is one vanishing
    point.
  - Cards wrap from the near plane back to the far end.
- **Readability:** a fog fade (opacity) at the far end, at most 30° / 18° of rotation, and an explicit `zIndex` by
  depth inside `isolation: isolate`.
- **Speed:** `integrate(frame, speed)`, so a speed ramp is just a different curve.
- **Post:** zoom blur = speed / 2600 (≤ 0.13) and `rgbRadial` 0.9, giving the warp-speed smear as it accelerates.
  Drop the zoom blur while a slam sits on the glass (`Barrage.tsx`) or the slam cannot be read.
- **Cost:** 20.4 ms/frame for the DOM, 27.6 with the post.

### (g) Zoom punch + whip with motion blur: `camera.ts` + `motionLook`
- **Punch:** `punchAt(f, at, amt)`: +13% in 2 frames, easing back to a held +6% by ~12 frames.
- **Whip:** `whipAt(f, at, dur, from, to)` on bezier (0.75, 0, 0.25, 1). 2300 px in 6 frames peaks at 1273 px/f.
- **Blur:**
  - `camMotion(path, f)` gives `{vx, vy, zoomRate}` by central differences of the same path, so the blur always
    matches the move.
  - `motionLook(vx, vy, zoomRate, 0.5)` turns that into a directional blur, up to 40 taps with per-pixel jitter (no
    banding), plus the zoom blur and a motion-aligned split.
- **Shake:** `shake(frame, seed, amp)` (noise2D, translate only) × `burst()`.
- **Compared at the fastest frame** (`sheet-g33.png`):
  - The GL smear is smooth, like a real camera.
  - `CameraMotionBlur` with 8 samples shows 8 stepped ghost copies of the text at this speed; it would need 30+ full
    re-renders.
  - The SVG Gaussian at σ 445 px is foggy.
  - So use the GL route for whips and keep `CameraMotionBlur` for slow drifts.

### Genre devices on top (cheap, partly in `Barrage.tsx`)
- **Headline slam (`Slam`):** scale 1.75 → 1.42 in 2 frames, −2° → −1°, held 3 frames, a glitch hit on its first
  frame only.
- **Hit-stop:** freeze the chaos frame (it is a pure function of `f`).
- **Speed ramp:** accelerate the tunnel into the turn.
- **Marker highlight on a key phrase** of a real screenshot (not prototyped): a box over the `<Img>`, scaleX 0 → 1 in
  4 frames, red or yellow, never coral.

## 4. Architecture for the builder

```tsx
// Chaos = a pure function of its frame (so it can freeze); one GPU pass over the composed frame.
const Intro = () => {
  const f = useCurrentFrame();
  const cf = Math.min(f, CONTACT - 1); // hit-stop on the turn's contact frame
  return (
    <AbsoluteFill>
      <FramePost width={1920} height={1080} look={f < CONTACT ? chaosLook(cf) : frozenLook(cf)}>
        <Chaos f={cf} /> {/* <Img> screenshots on a camera strip, <Tunnel>, <Slam> */}
      </FramePost>
      {/* turn layers: HookShot g=0 under the peel, the slapped card on top */}
    </AbsoluteFill>
  );
};
// chaosLook(f) = mergeLooks(f, stepSeed(f, 2), screenLook(…), waveLook(…), rgbLook(…), slicesLook(hit),
//                           warpLook(hit, f), motionLook(camMotion(...)))   with hit = bursts(f, CUTS, 5)
```

- **Screenshots:**
  - Put them in `public/intro/`. Same-origin files need no CORS inside `HtmlInCanvas`.
  - Crop them to the key line. Use sources at least 1600 px wide, so cards near the camera stay sharp.
- **Integration (keep `Main` untouched):** add a top-level composition that plays a `<Series>` of the intro (≈ 240 f)
  and then `<Main/>`.
  - Every voiced timing in `src2/data/timeline.json` keeps its frame.
  - `AudioLayer` still mounts at Main's own frame 0.
  - The intro's last frame must equal H1 g = 0: render `<HookShot g={0}/>` under the peel, as `Barrage.tsx` does.
- **Render (outside my write scope, so not done):**
  - Add `--gl=angle` to the `npx remotion render` line in `tools/render-master.sh`, or
    `Config.setChromiumOpenGlRenderer("angle")` to `remotion.config.ts`.
  - Remotion warns that `angle` can leak memory on long renders. Watch memory on the full film, or render the intro
    separately and concatenate it.
- **Shader transitions are usable now:** the cookbook's note that 12 built-in shader transitions need a Chrome flag
  is outdated for 4.0.537.
  - The renderer always passes `CanvasDrawElement` (`open-browser.js`), and `HtmlInCanvas` rendered in every test
    here.
  - `crossZoom`, `zoomBlur`, `ripple`, `filmBurn` and the others should now work; render-test before relying on one.

## 5. Exported components and props (copy from `src-proto/`)

| File | Exports |
|---|---|
| `fx/barrageShader.ts` | `type BarrageLook` (`time`, `seed`, `noiseSeed`, `wave`, `waveFreq`, `sway`, `swayLen`, `warp`, `warpSize`, `warpEvo`, `rgb`, `rgbAngle`, `rgbRadial`, `slices`, `sliceShift`, `scan`, `scanGap`, `roll`, `grain`, `vignette`, `blurX`, `blurY`, `zoom`, `centerX`, `centerY`, `desat`, `contrast`, `shadowTint`, `flash`, `flashColor`, `clampEdges`); `setupBarrage(gl)`, `uploadBarrage(s, src, flipY)`, `drawBarrage(s, w, h, look)`, `cleanupBarrage(s)`, `VS`, `FS` |
| `fx/barrageFx.ts` | `barrageFx(look)`: a Remotion effect for `<Img>`, `<HtmlInCanvas>`, `<CanvasImage>`, `<Video>` (`@remotion/media`), `<Solid>` |
| `fx/FramePost.tsx` | `<FramePost look width height>`: `HtmlInCanvas` + `barrageFx`; `look={null}` = clean |
| `fx/GlImage.tsx` | `<GlImage src width height look fit? background?>`: a raw WebGL2 canvas; uploads once and holds the frame until the first draw |
| `fx/looks.ts` | `waveLook(i)`, `warpLook(i, f)`, `rgbLook(i, f)`, `slicesLook(i)`, `screenLook(i)`, `motionLook(vx, vy, zoomRate, shutter?)`, `mergeLooks(time, seed, ...parts)` (amounts add up), `stepSeed(f, hold?, name?)`, `barrageLook(f, intensity, hit?)` (one master knob) |
| `fx/camera.ts` | `punchAt(f, at, amt?)`, `whipAt(f, at, dur, from, to)`, `WHIP_EASE`, `camMotion(path, f)`, `type Cam` |
| `fx/Tunnel.tsx` | `<Tunnel frame width height renderCard cardW cardH count? depth? near? perspective? radius? cardScale? speed? seed? phase?>`, `tunnelLayout()`, `tunnelSpeedRamp` |
| `fx/Slices.tsx` | `<SliceGlitch intensity frame width height seed? hold? maxShift? invert?>`, `sliceBands()` |
| `fx/ScreenOverlay.tsx` | `<ScreenOverlay intensity frame width height gap?>`, `<Grain frame amount width height scale? hold?>` |
| `fx/SvgFx.tsx` | `<SvgWave>`, `<SvgWarp>`, `<SvgRgbSplit angle?>` (`intensity frame k? seed?`), `<SvgDirBlur vx vy?>`, `<SvgCombo>`, `useFilterId(name)` |
| `lib/seed.ts` | `stepRand`, `stepRandS`, `intSeed`, `burst(f, at, decay?, attack?)`, `bursts(f, cuts, decay?)`, `shake(f, seed, amp, speed?, rotAmp?)`, `remap(f, knots)`, `integrate(f, speed)`, `clamp` |
| `demos/Barrage.tsx` | The reference choreography: timing constants, `chaosLook`, `frozenLook`, `SlapCard`, `PeelSheet`, `Slam`, `Strip` |

## 6. Pitfalls (each one was hit or measured here)

1. **No `--gl=angle`, no GPU:** WebGL effects (including `HtmlInCanvas` effects) run on SwiftShader, and SVG filter
   chains rasterise on the CPU. Studio looks fine (the system Chrome uses the GPU); the render then crawls.
2. **The WebGL context cap.**
   - Each effect-bearing component owns 1–2 WebGL2 contexts (`CanvasPool`), and each `GlImage` owns one.
   - Chrome keeps 16 and silently loses the oldest, and the render then fails with "WebGL context was lost".
   - Use one `FramePost` for the chaos. Mount at most ~8 per-card `<Img effects>` at a time, and unmount off-screen
     cards with `<Sequence>`.
3. **`<Img effects>` runs at the image's natural size** unless you pass numeric `width`/`height` or
   `effectsOutputSize`. A 2880×1800 screenshot is 2.5× the pixels of a full 1080p frame.
4. **delayRender:** a raw WebGL component must hold the frame until its *first draw*, not just until the image
   decodes (the draw happens in the next commit). `GlImage` does this. `CanvasImage`, `<Img effects>` and
   `HtmlInCanvas` hold until their effect chain finishes.
5. **Determinism:**
   - No `Math.random()` or clocks anywhere.
   - Seeds are stepped from the frame (`stepSeed`, `intSeed`); noise comes from `@remotion/noise` or the shader's
     integer hash (PCG, exact on any GPU).
   - Animate turbulence by `warpEvo` (smooth), not by its seed (jumps). Remotion's docs say the same for
     `turbulentDisplace`.
6. **Freeze-ability:** build the chaos as a pure function of a frame *prop* (no `useCurrentFrame()` inside), so the
   hit-stop is `Math.min(f, contact - 1)`.
7. **SVG filters:**
   - Give every instance a unique id (`useFilterId`: React's `useId` can return characters such as `:` or `«»`
     that break `url(#…)`, so it sanitises them).
   - Set `color-interpolation-filters="sRGB"`. The default `linearRGB` converts colours before the primitive, so an
     sRGB mid-grey displacement map is not neutral and blur halos shift (from the spec, not measured here).
   - Pad the filter region, or displaced pixels are clipped at the element box.
   - `feTurbulence` has no evolution: scroll it with `feOffset` or step its seed.
   - Chains can fall off the fast path: measured 407 ms/frame without angle.
8. **Depth sorting leaks:** a tunnel's `zIndex ≈ 100 000` painted over the headline slams until the tunnel got
   `isolation: isolate`.
9. **`CameraMotionBlur`:**
   - It renders its children `samples` times, so at whip speeds you see `samples` ghost copies.
   - The transform must be computed *inside* the blurred subtree.
   - Use the GL blur from `camMotion` for whips.
10. **Text legibility under distortion** (the genre lives or dies on the eye catching one phrase per beat):
    - Glitch peaks only on the cut frame and the next one.
    - A short headline needs ≥ 12 frames clean; the hero card ≥ 24.
    - On held text: RGB ≤ 6 px and wave ≤ 10 px.
    - Crop the screenshots to the key line and keep it ≥ 40 px tall on screen.
    - Desaturate the chaos (the grade does) so the coral payoff pops.
    - The freeze at the turn shows the chaos sharp for the first time: that is the reward for the eye.
11. **Colour:** the GL pass is colour-exact (measured), but the grade is intentional.
    - No coral in the chaos: red danger UI is fine, a coral flood is not.
    - The turn's ink dim is a `flash` toward `#1d1340`, not black, so the frozen chaos already sits in the brand's
      palette.
12. **Encoding:** grain and 4 px scanlines are the hardest content for H.264.
    - The film renders at `--crf=16`.
    - Check the final upload at 1080p on YouTube and lower the grain if it blocks.
    - Never use a scanline pitch below 4 px at 1080p (moiré after scaling).
13. **Photosensitivity (WCAG 2.3.1):**
    - The rule: no more than **3 flashes in any 1 s**. A general flash is a pair of opposing luminance changes of
      ≥ 10% where the darker frame is below 0.80. It counts when the area exceeds ~25% of a 10° field (≈ 341×256 px
      at 1024×768). Saturated red flashes count separately: careful with red alert cards.
    - Screen every render with `python3 -I src-proto/scripts/flashcheck.py out/x.mp4`. It reads per-frame luma with
      ffmpeg `signalstats` and counts opposing relative-luminance changes ≥ 0.1. It uses the frame average, so it is
      a screen, not a sign-off.
    - `H-Barrage` passes: at most 2 flashes in any 1 s window (the slams at f92 and f104, the whip, the dive).
14. **`HtmlInCanvas` is an unstable Chrome API** (Remotion's docs say so).
    - Pin `remotion` 4.0.537 and its Chrome 157.
    - Nesting needs Chrome 157.0.8080.0 or later, which we have.
    - The CSS/SVG routes are the fallback: with angle they cost the same and look ~80% as good (no radial split, no
      tap blur).
15. **Audio cannot be ramped:** `playbackRate` is constant per element. Bake tape-stops into files. Build stutters as
    several 2-frame `<Audio trimBefore>` sequences.
16. **Rights and truth:**
    - Use real, public posts and articles shown as news commentary.
    - Blur the handles and avatars of private individuals.
    - Never alter a quote or show a fabricated post as real (the placeholders here are fictional and must go).
    - Keep each source's date visible if it is part of the claim.

## 7. How motion designers build this genre, and the browser equivalent

The genre runs on four layers.
- **A cut grid:** hard cuts on the beat and its 8th notes, accelerating.
- **A "screen" world:** grade, scanlines and grain, always on, so mixing sources reads as one feed.
- **Hits:** 1–3-frame distortion spikes keyed to the cuts. In After Effects that is Turbulent Displace and Wave Warp
  on an adjustment layer with Evolution keyframed per cut, Twitch-style random punches, and RGB channel offsets.
- **Space:** z-depth walls and tunnels of screenshots, whip pans, zoom-throughs and slams, with heavy directional
  blur.
- **Spending the frame:** glitch packs spend 6–12 frames per transition with the SFX baked in. Headline montages slam
  each card with a shake and highlight the key phrase. The better ones hold one card still long enough to read
  before the next spike.

| After Effects / plugin | Here |
|---|---|
| Turbulent Displace (Evolution keyed on cuts) | `warpLook` × `burst` (or built-in `turbulentDisplace`) |
| Wave Warp, VHS line displacement | `waveLook` (line wave + sway) |
| Displacement Map with a noise layer | `SvgWarp` / `feDisplacementMap` |
| Shift Channels / RGB split presets | `rgbLook` (radial), `chromaticAberration` |
| Twitch (random per-beat blur / scale / slide) | `bursts(f, CUTS)` + `stepSeed` + `punchAt` |
| Datamosh 2, slice/tear presets | `slicesLook` / `<SliceGlitch>` (true P-frame datamosh: not feasible) |
| CC Scan Lines, noise, VHS overlays | `screenLook` / `<ScreenOverlay>` |
| Directional Blur / RSMB on whips | `motionLook` from `camMotion` |
| 3D camera + layers in z | `<Tunnel>` (CSS 3D) |
| Deep Glow | **off**: no glow in this film, the chaos gets a grade instead |

**Timing grammar** (120 BPM = 15 frames per beat, as in the film):
- Cuts and hits on the beat for the wall, on the 8th notes (7/8 f alternating) in the tunnel.
- A glitch peak lasts 1–2 frames and decays within 5.
- A readable hold: 12 frames for a short headline, 24 for the hero card.
- Speed ramp up into the turn, then the hard stop.
- At most 3 full-frame flashes per second.

## 8. Sound design for the barrage

The palette: digital and phone sounds, piling up and accelerating, no melody (the glockenspiel at H1 is the relief).

- **Structure:** a 3-frame suck-out (silence) right before the slap, the slap alone, then 8 frames of silence (the
  breath). The peel, then H1's pickup.
- **Whooshes:** peak on the fastest frame. Impacts land exactly on the cut.
- **Library:** generate with the team's `tools/sfx2` pipeline (paste these into `specs.mjs`; `DRY` is defined there
  as `'clean, dry, no music, no reverb tail'`). One-offs:
  `node tools/examples/sfx.mjs "<prompt>" --duration 0.5 --out x.mp3`.
- **API limits** (fetched): `eleven_text_to_sound_v2`, `duration_seconds` 0.5–30, `prompt_influence` 0–1 (default 0.3;
  raise it to 0.5–0.6 for tight one-shots), `loop` for beds.

```js
// intro barrage (chaos) ─ mixDb = K-weighted momentary max, as in the existing specs
{ name: 'barrage-cold-hit', dur: 0.6, gen: 0.8, group: 'hit', mixDb: -16,
  prompt: `A sudden harsh digital impact: a deep sub thump layered with a burst of bit-crushed static and a short electrical zap, hits instantly and stops dead, ${DRY}.` },
{ name: 'glitch-hit', dur: 0.2, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 30,   // make 3 takes; one per slice/warp hit
  prompt: `One short harsh digital glitch, a corrupted-data crackle with a bit-crushed buzz and a tiny electrical pop, starts instantly, ${DRY}.` },
{ name: 'glitch-stutter', dur: 0.5, mixDb: -24,
  prompt: `A fast digital stutter: one tiny electronic blip repeated about ten times and speeding up like a skipping CD, harsh and clean, ${DRY}.` },
{ name: 'notif-ping', dur: 0.35, gen: 0.5, mixDb: -26,                             // 3 takes: glassy, marimba tick, chat pop
  prompt: `One single modern smartphone notification sound, a short bright two-note glassy ping, ${DRY}.` },
{ name: 'notif-swarm', dur: 3.0, mixDb: -27,                                        // the doomscroll bed under the tunnel
  prompt: `Dozens of different smartphone notification pings, message chimes and vibration buzzes piling up and overlapping faster and faster, a chaotic swarm, no music, no voices.` },
{ name: 'phone-buzz', dur: 0.6, mixDb: -26,
  prompt: `A smartphone vibrating twice on a hard wooden desk, two short buzzy rattles, close-mic, ${DRY}.` },
{ name: 'keyboard-burst', dur: 1.0, mixDb: -28,
  prompt: `A frantic burst of fast mechanical keyboard typing, about twenty sharp clicky keystrokes in one second, close-mic, no voices, ${DRY}.` },
{ name: 'shutter-snap', dur: 0.2, gen: 0.5, mixDb: -24, fadeMs: 30,                 // on every headline slam ("screenshot")
  prompt: `A single crisp mechanical camera shutter click with a tiny mirror clack, close-mic, ${DRY}.` },
{ name: 'whip-fast', dur: 0.3, gen: 0.5, group: 'hit', mixDb: -22, fadeMs: 40,     // peak on the whip's fastest frame
  prompt: `A very fast aggressive whip-pan whoosh, a sharp swipe of air passing left to right in a quarter of a second, cinematic, ${DRY}.` },
{ name: 'zoom-punch', dur: 0.35, gen: 0.5, group: 'hit', mixDb: -21,
  prompt: `A short punchy cinematic hit: a tight low thud with a quick bright click on top, like a camera zoom impact, ${DRY}.` },
{ name: 'sub-drop', dur: 1.2, mixDb: -20,                                           // the dive into the tunnel
  prompt: `A deep cinematic sub bass drop, a low boom that falls in pitch and fades out over one second, ${DRY}.` },
{ name: 'riser-digital', dur: 2.0, gen: 2.5, mixDb: -24,                            // srcEnd at the top: it must END at the suck-out
  prompt: `A tense rising digital riser, filtered white noise and a thin glassy synth tone sweeping upward for two seconds, getting brighter and faster, stopping abruptly at the top, no drums, ${DRY}.` },
{ name: 'tape-stop', dur: 0.5, mixDb: -22,                                          // optional under the slap: the chaos dies
  prompt: `A tape-stop effect: chaotic electronic noise slowing down and falling in pitch to a dead stop in half a second, like a cassette player losing power, ${DRY}.` },
{ name: 'static-burst', dur: 0.3, gen: 0.5, mixDb: -26,
  prompt: `A short burst of harsh analog TV static, white-noise hiss with crackles, abruptly cut, ${DRY}.` },
{ name: 'news-murmur', dur: 4.0, mixDb: -30,                                        // fallback bed if the TTS fugue is not made
  prompt: `Several television news anchors talking over each other, indistinct overlapping broadcast voices with no clear words, small TV speaker sound, no music.` },
// turn ideas 2 and 3
{ name: 'crt-off', dur: 0.7, mixDb: -24,
  prompt: `An old CRT television switching off: a short high-pitched whine and a soft electric pop as the picture collapses, ${DRY}.` },
{ name: 'glass-crack', dur: 0.9, mixDb: -22,
  prompt: `A sheet of thin glass cracking and breaking into many small pieces that tinkle onto a table, sharp and bright, close-mic, ${DRY}.` },
```

**Already in the library** (`src2/data/sfx.json`), for the turn: `sticker-slap` (on contact), `sticker-peel` (align
its peak to the detach), `whoosh-zip`, `riser-short`, `swoop-down`.

**Placement in `H-Barrage`'s timing:**

| Frame | Sound |
|---|---|
| f0 | `barrage-cold-hit` |
| f15, f45 | `zoom-punch` |
| f30–36 | `whip-fast`, peak on f33 |
| f60–64 | `sub-drop` on the dive |
| Every 8th-note hit in the tunnel | `glitch-hit` |
| f92, f104 | `shutter-snap` + `glitch-stutter` on the slams |
| f64 → | `notif-swarm` bed |
| f100–120 | `riser-digital` |
| f121 | Suck-out (all audio cut) |
| f124 | `sticker-slap` (+ optional `tape-stop` at −10 dB under it) |
| f124–131 | Silence |
| f132–153 | `sticker-peel` |
| f154 | H1's own sounds and music |

**Voice (a news clip, or the "headline fugue"):**
- FRONTLINE's editor builds headline montages as "an audio fugue of headlines speaking out like a Greek chorus":
  layered news voices.
- Do it with 3–4 TTS voices that are not Sarah (her first line must stay distinct), reading 2–5-word fragments
  ("drained in seconds", "seed phrase leaked", "one signature", "the funds are gone").
- EQ them as a TV speaker (`highpass=f=300,lowpass=f=3400`), pan them apart, overlap and stutter-chop them on the
  8th-note grid. Cut them dead at the suck-out.
- A real news clip can go in as `@remotion/media` `<Video>`. It accepts `effects` (the same `barrageFx`) and
  `trimBefore`/`trimAfter`. Inside `FramePost` it simply becomes part of the frame.

**Mix:**
- Keep intro SFX peaks ≤ −6 dBFS before mastering; `render-master.sh` limits and loudnorms the whole film to −14 LUFS.
- The slap after silence will feel loud at its normal library level. Do not boost it.

## 9. Three ideas for the turn

**1. Slap, freeze, peel (recommended; prototyped in `H-Barrage`, f120–154).**
- **f120–124:** a coral Satchel card slaps onto the glass. It is the film's slap: 14 frames, from scale 1.28 and 28 px
  up, contact on frame 4 with a squash, the hard ink shadow catching up.
- **On contact:** the chaos **freezes** (hit-stop) and goes clean: no glitch, no blur, desaturated, pushed 38% toward
  ink. For the first time the scam headlines are sharp and readable. They are frozen, defeated.
- **f124–131:** 8 frames of the breath: silence, only the card's rebound moves.
- **f132–153:** the frozen chaos **peels off like a sticker sheet**, using the film's own `peelGeometry` (bottom-right
  corner, white back, 8 px ink outline, hard ink drop). It reveals H1 frozen at g = 0.
- **f154:** the slapped card is HookShot's card at g = 0 (same camera, box and lift), so the swap is invisible (PSNR
  41.9 dB) and H1 simply starts: the charms fall in, "Stick it on." lands.
- **Why it works:**
  - It uses the brand's two verbs (slap, peel).
  - "Stick it on." becomes literal.
  - One coral fill appears exactly when the chaos stops.
- **The builder's job:** a 3-frame audio suck-out before the slap, and choosing the card's position. The prototype
  matches H1 g = 0: centre x 960, top ≈ 368, width ≈ 806 px.

**2. Collapse to one clean frame (CRT off → Day on).**
- **The last 12 frames:** glitch intensity → 1 with 1-frame strobes (at most 3 flashes per second).
- **4 frames:** the frame collapses vertically to a 6 px bright line (scaleY 1 → 0.004, brightness up; or the
  built-in `tvSignalOff()`), then to a dot.
- **6 frames:** ink, in silence.
- **The dot is coral:** it opens with the film's `tileIris` (the logo-corner tile) straight into the Satchel card band
  of H1 g = 0.
- **Sound:** `crt-off` (whine + pop), silence, a `pop`, then the glockenspiel.
- **Why it works:** the most "editorial" option, and the cheapest to build. It reads as "switch the noise off".

**3. Shatter into stickers.**
- **The setup:** the hero headline fills the frame.
- **On the beat:** it cracks into 12–20 die-cut shards. They are deterministic Voronoi polygons via `clip-path` on
  copies of one `<Img>`. An **ink outline appears along each crack**, so the scam turns into sticker pieces.
- **The fall:** the shards drop with gravity and a little spin, each lifting on a hard ink shadow, revealing the Day
  ground.
- **The flip:** the centre shard flips over. It is the film's single 3D move: rotateY 180° on the `{1, 800, 34}`
  spring, at 2400 px perspective. Its back is the coral Satchel card, which slides into H1's g = 0 box.
- **Sound:** `glass-crack` (or a sticker-sheet tear), a papery flutter, `swing-swish` on the flip, `sticker-slap`.
- **Why it works:** the most spectacular, with a direct metaphor: the chaos becomes the brand's material. It is the
  most work and risks overlapping the T0 flip's novelty.

*(A fourth, narrative option: pull back to reveal the whole doomscroll was on a laptop lid covered in scam stickers; a
hand peels them off and slaps the Satchel sticker on.)*

## 10. References

1. Remotion Effects API: which components take `effects` (Solid, HtmlInCanvas, Video, Img, CanvasImage, AnimatedImage,
   Gif, Rive, shapes), `effectsOutputSize`, `createEffect`. https://www.remotion.dev/docs/effects/api *(fetched)*
2. Remotion `turbulentDisplace()`: params, "animate `evolution`, avoid animating `seed`", WebGL2/WebGPU.
   https://www.remotion.dev/docs/effects/turbulent-displace *(fetched)*
3. Remotion `chromaticAberration()`. https://www.remotion.dev/docs/effects/chromatic-aberration *(fetched)*
4. Remotion `<HtmlInCanvas>`: works out of the box in renders from 4.0.455; WebGL shaders need `--gl=angle`;
   unstable Chrome API; CORS rules. https://www.remotion.dev/docs/html-in-canvas *(fetched)*
5. Remotion GL options: `angle` for desktop WebGL, `swangle` without a GPU, angle's memory leak on long renders.
   https://www.remotion.dev/docs/gl-options *(fetched)*
6. Remotion + Three.js: "does not render with the default OpenGL renderer – set it to angle".
   https://www.remotion.dev/docs/three *(fetched)*
7. three.js `DigitalGlitch` shader (MIT): the classic RGB shift + band displacement + snow that `barrageFx` extends.
   https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/DigitalGlitch.js *(fetched)*
8. FRONTLINE editor Steve Audette on headline montages ("an audio fugue of headlines speaking out like a Greek
   chorus"). https://www.provideocoalition.com/art-of-the-cut-with-steve-audette-of-frontline/ *(fetched)*
9. After Effects glitch with Turbulent Displace on an adjustment layer and keyframed Evolution.
   https://pixflow.net/blog/how-to-create-a-stunning-glitch-effect-in-after-effects/ *(search result)*
10. Glitch transition packs: "intense RGB splitting, pixel displacement, and rhythmic frame tearing"; Datamosh 2 as
    the true datamosh tool.
    https://elements.envato.com/glitch-transitions-pack-VH5T9PV and https://aescripts.com/datamosh *(search results)*
11. A "news flash" hook template: "a rapid, glitchy sequence of flashing newspaper and media headlines".
    https://autoae.online/hooks/fast-paced-news-flash-animation-with-1-text-highlight-tucuicmc *(search result)*
12. WCAG 2.3.1 Three Flashes or Below Threshold.
    https://www.w3.org/WAI/WCAG21/Understanding/three-flashes-or-below-threshold.html *(fetched)*
13. ElevenLabs sound effects API.
    https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert *(fetched)*
14. Not opened (HTTP 403):
    - Codrops "CSS Glitch Effect", the clip-path slice technique.
      https://tympanus.net/codrops/2017/12/21/css-glitch-effect/
    - Codrops on `feTurbulence`.
      https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/
    - Adobe's Distort effects page (Turbulent Displace, Wave Warp).
