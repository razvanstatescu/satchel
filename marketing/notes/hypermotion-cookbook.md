# Hypermotion cookbook for the Satchel video (Remotion 4.0.537)

Motion research notes, 2026-10-22. Companion to `notes/concepts.md` (story and treatments). Everything here assumes
**1920×1080 at 30 fps** and the helpers already in `video/src/lib/time.ts` (`s()`, `EASE`, `SPRING`, `tween`, `springAt`).

**How this was checked.**
- API names and props were read from the installed type definitions in `video/node_modules` (4.0.537). The local
  skill rules were also read: `animations`, `timing`, `transitions`, `text-animations`, `light-leaks`, `audio`,
  `audio-visualization`, `3d`, `fonts`, `sequencing`, `trimming`, `measuring-text` and `images`.
- Every snippet in Appendix A passes `tsc --noEmit` against those packages, with the project's `tsconfig`. They were
  typechecked but **not render-tested**: run `npx remotion still` on each before using it.
- Web sources: the `WebFetch` domain check failed for much of this session (remotion.dev worked only once). Sources
  marked *(search)* below come from search-result summaries, not pages I opened.

---

## 0. The 5 rules that matter most

1. **Hypermotion = fast moves, still reads.** Use hard acceleration into a cut and a long, soft landing
   (`EASE.expoIn` out of a shot, `EASE.expoOut` into the next). Text never moves while it is being read: it animates
   in, **stops**, and is read, then leaves.
2. **Pick 120 BPM.** At 30 fps a beat is exactly **15 frames** and a bar is **60 frames**. 128 BPM gives 14.0625
   frames per beat, so cuts drift. Other drift-free tempos are 112.5 (16 frames), 128.57 (14), 100 (18) and 90 (20).
   Always compute a cut from a *cumulative* beat count (`beat(n)` in Appendix A), never by adding rounded beat lengths.
3. **The motion carries the information or it goes.** Judges (and Colosseum's own guidance, see concepts.md) punish
   "flashy visuals with little substance". Each fast section ends on a still hold where one claim lands.
4. **Spend the expensive effects sparingly and render-test them first.** Real motion blur (`CameraMotionBlur`)
   renders its children *N* times. 12 of the 21 built-in transitions need an experimental Chrome flag and will not
   render by default (§6).
5. **Brand guardrails decide the palette.** Use weight, brass, leather and the stitch. Avoid neon, glitch-as-style,
   coin spins and node constellations. **Never rotate, glow, bevel or recolour the Strap S.**

---

## 1. What "hypermotion" is (and the references worth stealing from)

"Hypermotion" is not a formal school. In current usage (product reels, app-promo templates, AI ad "recipes") it means:
a **product-only highlight with aggressive camera moves, speed ramps and hard cuts**, built as a few separately
planned beats. Its standard vocabulary is whip, zoom-through, blur, flash, spin, punch-in, mask and type reveals, all
synced to music. The premium end of the style (Apple, Linear, Raycast, Vercel) is calm between the bursts: real UI,
big type, few elements at once, and every move timed to sound.

| # | Reference | What to steal |
|---|---|---|
| 1 | **Hyper motion ad recipe**, hermoso.ai: https://hermoso.ai/recipes/hyper-motion/ *(fetched)* | Definition: "a fast product-only highlight with aggressive camera moves, speed ramps, hard cuts, no people and no talking", in "4 beats, each one a separately planned shot". Plan each beat as its own shot. |
| 2 | **Raycast / Linear launch style**, notes in `diip3sh/orbit`: https://github.com/diip3sh/orbit/blob/main/code-native-motion-editor-idea.md *(fetched)*; videos https://www.youtube.com/watch?v=czz9Tbf8VaE (Raycast) and https://www.youtube.com/watch?v=sbwOQV5zY34 (Linear) *(not watched)* | "Aggressive UI crops, large typography, fast but controlled cuts, real product interface, camera punch-ins, dark backgrounds … transitions synced with sound." Type moves: character and word stagger, mask, blur and tracking reveals. Our UI recreations should be cropped tight and lit, not shown as whole screens. |
| 3 | **Linear Agent motion breakdown**, impractical.ai: https://impractical.ai/launch-videos/linear-agent *(search)* | "Sharp acceleration and long, smooth decelerations … strips away any superfluous bounce." That is our default curve pair: `expoIn` → `expoOut`, with no elastic easing. |
| 4 | **Vercel Ship openers**, basement.studio: https://basement.studio/post/behind-the-ship *(search)* | One visual concept for the whole film (2025: "liquid"), hand-timed rather than templated. For us the single concept is **stitch and brass**. |
| 5 | **Family wallet** (Benji Taylor): the card-morph-to-screen shot https://60fps.design/shots/family-wallet-card-morph-to-screen-transition *(search)* | "We fly instead of teleport": objects morph into the next screen, with no hard UI swaps. This is the source of our tile→card→screen match cuts. |
| 6 | **ManvsMachine × Apple, MacBook Air M2**: https://www.stashmedia.tv/manvsmachine-supercharges-the-new-macbook-air-m2-for-apple/ *(search)* | "Excitement from restraint": 45 s with only the product and a single feather. Our equivalent prop is one card and one thread. |
| 7 | **ManvsMachine, iMac Pro**: https://mvsm.com/project/imac-pro *(search)* | Hero object on black, monumental scale, slow camera with fast cuts. |
| 8 | **FutureDeluxe × Nothing Phone (3) Glyph Matrix**: https://www.stashmedia.tv/futuredeluxe-unlocks-the-glyph-matrix-for-nothing-phone-3/ *(search)* | One product detail (the dot matrix) becomes the whole graphic language. Ours is the saddle stitch. |
| 9 | **Teenage Engineering OP-1 Field film** (Behance, Dmitry Vikmes): https://www.behance.net/gallery/204298891/OP-1-Field-Teenage-Engineering *(search)* | Tactile, crafted-object product film: tight macro crops, material honesty and mechanical sound. Closest in spirit to "brass and leather". |
| 10 | **STYLEFRAME OP-1 spec spot**: https://www.stashmedia.tv/teenage-engineering-op-1-spec-spot-by-styleframe/ *(search)* | Light as the main actor: a single sheen moving across an object. This is our brass sheen sweep. |
| 11 | **Phantom identity motion** (Bakken & Bæck): https://phantom.com/learn/blog/introducing-phantom-s-new-brand-identity *(search)* | Crypto wallet motion done with personality rather than crypto clichés. |
| 12 | **Motion Studio** (HyperFrames + GSAP app-promo tool): https://github.com/jay23606/motion-studio *(fetched)* | The standard app-promo transition set: "crossfade, slide, whip, zoom, blur, flash, spin". Useful as the checklist of what viewers already expect. |
| 13 | **Remotion `CameraMotionBlur` docs**: https://www.remotion.dev/docs/motion-blur/camera-motion-blur *(fetched)* | Defaults `shutterAngle 180`, `samples 10`. The docs recommend 5–10 samples, say the effect is "destructive to colors", and require absolutely positioned children. |
| 14 | **Sound at cuts**, Zella: https://zellahq.com/blog/sound-design-at-cuts-whoosh-impact-riser/ *(fetched)* | Whoosh peaks on the cut and lasts about 400–500 ms for a 0.5 s move. Impact goes "exactly on the cut; even 50 ms early reads as sloppy". Riser sits in "the second ahead of your key claim". SFX sit about −6 dB under speech. |
| 15 | **Sweep timing**, Sonilo: https://sonilo.com/ai-music/whoosh-sound-effect-guide *(search)* | A whoosh is "as long as the move it covers and no longer". Its direction must match the picture. Line its peak up with the fastest frame. |
| 16 | **YouTube loudness**: https://audioforgepro.com/blog/youtube-lufs-normalization-guide *(search, consensus across several guides)* | −14 LUFS integrated, ≤ −1 dBTP true peak. Music starts about 18 dB under speech. |
| 17 | **Remotion skill rules** (local) and **`@remotion/*` 4.0.537 `.d.ts`** *(read)* | Ground truth for every API in this file. |

---

## 2. Global numbers

**Easing** (cubic-bezier values; all are already in `time.ts` except `cubicInOut`):

| Name | cubic-bezier | Use |
|---|---|---|
| `EASE.expoOut` | (0.16, 1, 0.3, 1) | Default landing: type, cards, punch-ins |
| `EASE.expoIn` | (0.7, 0, 0.84, 0) | Leaving a shot into a cut (whip out, zoom-through) |
| `EASE.expoInOut` | (0.87, 0, 0.13, 1) | Reveals that both start and stop on screen (mask wipes, morphs) |
| `EASE.quintOut` | (0.22, 1, 0.36, 1) | Slower settles (tracking, variable-font settle) |
| `EASE.standard` | (0.2, 0, 0, 1) | Camera drift, parallax, DOF (matches the product's `--ease-standard`) |
| `EASE.whip` | (0.9, 0, 0.1, 1) | Single-tween whip (out and in in one curve) |
| cubicInOut | (0.65, 0, 0.35, 1) | Gentle loops (sheen, stitch crawl) |

**Springs** (`time.ts`): `slam` {mass 0.9, damping 24, stiffness 320} for type and impacts with a tiny overshoot;
`snap` {0.6, 40, 500} for UI with no overshoot; `lift` {1, 22, 260}; `handoff` {1.2, 18, 120}, which is the product's
700 ms card move; `soft` {1, 20, 90}. The brass "weight" feel comes from mass ≥ 1.2. Avoid `damping < 12`, which
reads as cartoon bounce. Use `measureSpring({fps, config})` to read the settle time when a cut must wait for one.

**Durations at 30 fps:** micro (UI tick, flash) 2–3 f; snap 6–8 f (0.2–0.27 s); type in 12–18 f; whip/zoom-through
8–12 f total; card move 18–24 f (`handoff`); camera drift 2–4 s; hero hold ≥ 30 f.

---

## 3. Technique catalog (29)

Format: **look** · **when** · **numbers** · **Remotion** (snippet IDs refer to Appendix A) · **cost** (render cost
per frame: **L** = transform, opacity or clip; **M** = filter, blend or 3D; **H** = multi-render or WebGL).

### Camera and transitions

**T01 Whip pan with directional motion blur.** The frame snaps sideways and smears, and the next shot arrives
smearing from the other side. *When:* changing topic between problem beats, at most 3–4 times in the film. *Numbers:*
8 f total (4 out, 4 in) with the cut on the beat; travel 1.15 × width; `expoIn` out and `expoOut` in;
`shutterAngle` 270–300, `samples` 6–8. *Remotion:* `WhipPan` wraps **only the 8 transition frames** in a `<Sequence>`
with `<CameraMotionBlur>`. **Gotcha:** the transform must be computed by a component *inside* `CameraMotionBlur`
(it re-renders its children at sub-frame times). A transform computed in the parent gives identical samples and no
blur. The cheap alternative is `DirectionalBlurDefs`: an SVG `feGaussianBlur stdDeviation="X 0"` (horizontal only)
with X ≈ 0.35 × pixel speed per frame. *Cost:* **H** (×samples) for real blur, **M** for the SVG version.

**T02 Zoom-through / punch-in cut.** The camera pushes into the current shot, and the next shot lands slightly over
scale and settles, with a 2-frame flash on the cut. *When:* drilling from the card into the signature list, or from
the list into one record. *Numbers:* 10 f; outgoing scale 1.0 → 1.12; incoming 1.12 → 1.0; flash `#ebcb7a` at
0.15–0.2 for 2 f. *Remotion:* `pushCut()` from `@remotion/transitions/push-cut` (DOM-based; props `outgoingScale`,
`incomingStartScale`, `incomingEndScale`, `flashColor`, `flashOpacity`, `flashFrames`, `cutProgress` default 5/11),
inside `TransitionSeries` with `linearTiming({durationInFrames: 10, easing: EASE.expoInOut})`. For a true fly
*through* an element, scale the outgoing layer to 6–10× with `transformOrigin` on that element using `expoIn`, and cut
on the fastest frame. *Cost:* **L**.

**T03 Clip-path and mask reveals.** Content opens from a slit, a circle or a rounded inset. *When:* revealing UI
panels and the card. *Numbers:* 14–18 f, `expoOut` for insets and `expoInOut` for circles; round the corners to 22 px
(the card radius). *Remotion:* `InsetReveal`, `CircleReveal` (CSS `clipPath: inset(... round 22px)` /
`circle(r% at x% y%)`). *Cost:* **L**.

**T04 Split screen.** Three panels wipe up in turn. *When:* "one NFT, three native addresses" (BTC · ETH · SOL, each
with its 8 px chain dot). *Numbers:* stagger 4 f, 16 f each, `expoOut`, 12 px gutters on the ground colour.
*Remotion:* `TriSplit`. *Cost:* **L**.

**T12 Parallax layers.** Background, subject and foreground move at different speeds during a drift. *When:* slow
establishing shots and holds that must still feel alive. *Numbers:* camera travel 120–240 px over 2–4 s with
`EASE.standard`; depth factors 0.2 / 1 / 1.6. *Remotion:* `Parallax`. *Cost:* **L**.

**T13 Camera shake (impact).** A decaying jitter after a hit. *When:* only on the two or three heaviest impacts (the
threat, the reveal). *Numbers:* amplitude 10–14 px, decay τ = 5 f (gone by about 15 f), noise speed 0.35/f,
**translate only**. *Remotion:* `Shake`, using `noise2D(seed, x, y)` from `@remotion/noise` (signature
`(seed: string | number, x, y) => number`, range −1…1). *Cost:* **L**.

**T14 Speed ramp (time remap).** Fast, then slow motion on the key instant, then fast again. *When:* the threat beat,
when an old signature is broadcast after the sale (slow motion as it hits the chain). *Numbers:* 2× → 0.2× → 2×, with
4-frame shoulders. *Remotion:* `SpeedRamp` feeds a piecewise-**linear** remapped frame into `<Freeze frame={t}>`
(Freeze accepts any frame, so it works as a time remapper for frame-driven children). Do not put an easing on the
remap: an easing applies per segment and stalls the speed at every knot. For video clips use `<Video playbackRate>`
per segment instead. *Cost:* **L**.

**T29 Hit-stop.** The picture holds 2–3 frames on impact, then resumes. *When:* a signature record "stamps" in, or
the Buy button unlocks. *Numbers:* hold 2–3 f, with the impact SFX on the first held frame. *Remotion:* `HitStop`
(Freeze with `f < at ? f : max(at, f − hold)`). *Cost:* **L**.

**T26 Depth-of-field / rack focus.** The background softens while the subject stays sharp. *When:* pulling attention
from a busy UI to one row. *Numbers:* blur 0 → 8 px over 20 f, `EASE.standard`; scale the blurred layer 1.04 to hide
its edges. *Remotion:* `RackFocus`. *Cost:* **M**. CSS `blur()` above about 12 px on a full 1080p layer is slow in
headless Chrome. Freeze a static background into a pre-blurred still instead.

**T27 Match cut on shape.** A shape in shot A becomes a different object in shot B. *When:* 0:02, when the brass logo
tile becomes the Satchel card. Both use the same 22 % corner ratio and the brass gradient, so the cut is invisible.
*Numbers:* `handoff` spring; the brass retreats from full tile to the card's top band over 14 f. *Remotion:*
`TileToCard`. *Cost:* **L**.

**T28 Custom presentation: stitch wipe.** A diagonal seam crosses the frame, and a brass dashed line runs along it as
the next scene is revealed. *When:* **only** on transitions *into* an ownership moment (mint, the buyer receives),
because the stitch means "you own this". *Numbers:* 14–18 f, slant 0.22 × height, dash 18/15, stitch crawl
330 px over the transition. *Remotion:* `stitchWipe()` implements `TransitionPresentation<Props>`; the component gets
`presentationProgress`, `presentationDirection` and `passedProps`. *Cost:* **L**.

**T21 Light leak.** A warm film flare over a cut. *When:* once or twice: the reveal ("Meet Satchel") and the end card.
*Numbers:* 24–30 f overlay; `hueShift 0` (yellow → orange, which reads as brass); fixed `seed`. *Remotion:*
`<TransitionSeries.Overlay durationInFrames={30}><LightLeak seed={3} hueShift={0}/></…>`. **Note:** in 4.0.537
`LightLeak` is marked *deprecated* in favour of `lightLeak()` from `@remotion/effects/light-leak`. It still works.
It is WebGL, so test a render (try `--gl=angle` on macOS if frames come out blank). An overlay cannot sit next to a
transition in the same series. *Cost:* **H**.

### Type

**T05 Per-word slam.** Words hit one per beat, from scale 1.35 to 1 with a slight overshoot. *When:* the hook line
("Sell the NFT. / Sell the wallet."). *Numbers:* one word per beat (15 f) or half-beat (7–8 f); `SPRING.slam`; 2-frame
opacity ramp so it never pops; an impact SFX on each word. *Remotion:* `WordSlam`. *Cost:* **L**.

**T06 Per-letter cascade.** Letters rise into place behind a mask. *When:* short single words: "Satchel", "Clean".
*Numbers:* stagger 1–1.5 f per letter, 14 f each, `expoOut`; translateY 105 % → 0 inside `overflow: hidden`.
*Remotion:* `LetterCascade`. It moves letters, not their opacity, in line with the skill rule against per-character
opacity. *Cost:* **L**.

**T07 Line mask-up.** Each line slides up out of its own mask. *When:* **every** claim card. This is the workhorse:
it is legible, calm and premium. *Numbers:* 16 f per line, stagger 3 f, `expoOut`, translateY 110 % → 0.
*Remotion:* `LineMaskUp`. *Cost:* **L**.

**T08 Tracking expansion.** A tight headline relaxes open. *When:* titles that should breathe after a slam.
*Numbers:* letter-spacing −0.06em → −0.02em over 30–40 f, `quintOut`. *Remotion:* inside `VariableSettle`.
*Cost:* **L** (layout reflow, which is fine for one line).

**T09 Variable-font morph (wght, opsz, wdth).** The weight and optical size settle as the type lands. *When:* the
title card and big numbers. *Numbers:* wght 800 → 650, opsz 12 → 96 over 36 f. The bundled
`BricolageGrotesque-VF.ttf` has **opsz 12–96, wght 200–800 and wdth 75–100** (read from its `fvar` table), so a
**width squeeze** (wdth 75 → 100) is also available: a hypermotion "stretch" without distorting glyphs. *Remotion:*
`VariableSettle` uses `fontVariationSettings: "'wght' …, 'opsz' …"`. Once you set `font-variation-settings`, set
`wght` there as well: it overrides `font-weight`. Instrument Sans has wdth and wght axes; Spline Sans Mono has wght
only. *Cost:* **L**.

**T10 Counter / odometer roll.** Digits roll like a mechanical counter and land in turn. *When:* the clean-history
count ("12 signatures · 12 spent · 0 open"). It is mechanical, so it suits the brand; use no fiat. *Numbers:* 30 f per
digit, right-most digit first, 3 f stagger, `{damping: 200}`, two extra turns so a 0 still rolls, tabular figures.
*Remotion:* `Odometer`. *Cost:* **L**.

**T24 Type-as-mask.** The next scene is seen through a giant word, then the camera flies through a letter. *When:*
the turn from problem to solution: "Satchel" or "Clean". *Numbers:* 30 f; scale 1 → 1.15 (hold) → 40 with `expoIn`;
Bricolage at 800 weight and 360 px. *Remotion:* `TypeMask` (an SVG `<clipPath>` holding `<text>`, applied with CSS
`clipPath: url(#id)`). The font must be loaded first (it is, via `loadBrandFonts`). Aim the fly-through at a counter
(the inside of "a" or "e"). *Cost:* **L–M**.

**T15 RGB split / glitch (tasteful).** Two colour-offset copies flicker for 4 frames. *When:* **once**, on the threat
("an old signature still works"), tinted `danger` and `frozen`. Never use it as a style. *Numbers:* 4 f, ±9 px, screen
blend. *Remotion:* `SplitHit`. *Cost:* **L** (3 text layers).

### Graphic devices

**T16 Stroke draw-on.** A path draws itself. *When:* connectors (NFT → three addresses), underlines and check marks.
*Numbers:* 18–24 f, `expoInOut`. *Remotion:* `evolvePath(progress, d)` returns `{strokeDasharray, strokeDashoffset}`
(`@remotion/paths`). `DrawOn`. *Cost:* **L**.

**T17 The stitch sews itself.** A dashed brass stitch appears **one stitch at a time**, led by a needle point.
*When:* see §5. It is the film's signature device. *Numbers:* logo stitch 5 units, `12 10`, `#EBCB7A` at 0.85; UI stitch
1.5 px, `6 5`, brand at 45 % (tokens.json); about 28–30 f to sew the S. *Remotion:* `SewStitch`. The dash pattern sits
on the visible path and the reveal sits in an SVG `<mask>` (an `evolvePath` stroke), so the two dash arrays never
fight. Progress is quantised to whole stitch pitches. `getPointAtLength` places the needle. `StrapSAssemble` draws
the strap with `evolvePath`, then sews, and **ends exactly on `satchel-mark.svg`**. *Cost:* **L**.

**T18 Shape morph.** One outline morphs into another. *When:* status icons (warning → check) and the record "open" →
"spent". *Numbers:* 18 f, `expoInOut`. *Remotion:* `interpolatePath(value, a, b)`. Paths with similar command counts
morph best, so test with `normalizePath`. Never morph the S. *Cost:* **L**.

**T19 Light sweep / sheen across brass.** A soft highlight band slides across a brass surface. *When:* the Buy button
turning on at the end of the clean-history check, the card's brass band, and brass display type. **Never on the logo
tile:** a moving highlight on the mark is a glow or bevel, which the brand forbids. *Numbers:* 22 f, angle 105°, band
±14 %, `soft-light` blend, peak `rgba(255,244,214,0.55)`. *Remotion:* `BrassSheen` (overlay) and `BrassText`
(`background-clip: text` gradient). `@remotion/effects` ships a `shine()` effect (props `progress`, `angle`,
`haloSigma`, `coreSigma`, `haloIntensity`, `coreIntensity`) for `<Img effects>`, but it is not in `package.json` and
is GPU-based, so treat it as untested. *Cost:* **L–M**.

**T20 Film grain and vignette.** Subtle moving grain and darkened corners. *When:* the whole film, at 4–6 % opacity:
it is the "tanned leather" ground texture. *Numbers:* new grain every 2 f (15 fps reads as film); vignette from 55 %
to 100 % radius at 0.55 alpha in the ground's tone. *Remotion:* `Grain`, which uses one oversized noise PNG through
`<Img>` with a random offset per step (`random(seed)`). This is far cheaper than an SVG `feTurbulence` per frame. **Risk:**
grain eats bitrate, and X re-encodes uploads. Keep it ≤ 6 % and turn it **off under small text and addresses**.
*Cost:* **L–M**.

**T22 Audio-reactive pulse.** Elements breathe with the kick drum. *When:* idle holds (the card at rest, the chain
dots). Never the logo or reading text. *Numbers:* scale +2.5 % max from the average of the bottom 6 of 64 bins.
*Remotion:* `useWindowedAudioData({src, frame, fps, windowInSeconds})` and `visualizeAudio({fps, frame, audioData,
numberOfSamples, optimizeFor: "speed", dataOffsetInSeconds})` from `@remotion/media-utils`. Pass `frame` down rather
than calling `useCurrentFrame` in children (skill rule). `BassPulse`. *Cost:* **L** (analysis is cached).

**T23 Beat-synced cuts.** Every cut and hit lands on the grid. *Numbers:* `beat(n)` and `bar(n)` from cumulative
counts; at 120 BPM a cut lands every 15 f. Shift **visual hits 1 frame early** (perceived sync) but keep SFX
transients on the frame. *Remotion:* `beat`, `bar`. *Cost:* none.

**T25 Exploded UI layers.** The card separates in Z into its layers and shows "how it works". *When:* the mechanism
beat: (1) the NFT on NEAR, (2) the signature ledger, (3) three chain addresses, (4) the stitch, meaning "you own
this". *Numbers:* rotateX 52°, rotateZ −8°, 140 px between layers, `handoff` spring in and out. Keep the Strap S off
the tilted layers, or keep it unrotated in its own flat layer. *Remotion:* `Exploded` (CSS `perspective` and
`preserve-3d`). Three.js (`@remotion/three`) is not needed. *Cost:* **M**.

**T11 3D card fly-in.** The card flies up from deep space and settles flat. *When:* the reveal of the product.
*Numbers:* translateZ −1400 → 0, translateY 380 → 0, rotateX 58° → 0, rotateY −18° → 0, perspective 1800,
`SPRING.handoff` (about 0.7 s). Add `Trail` (`layers 4, lagInFrames 0.6, trailOpacity 0.35`) only if the card has no
text on it during the move. If the card carries the mark, the mark is rotated in 3D while it flies. Keep the mark
unreadable (small, moving) until the card lands, or add it after landing. The brand's own handoff tilts only 6°.
*Remotion:* `CardFlyIn`, `EchoCard`. *Cost:* **M** (**H** with Trail).

---

## 4. Pacing

**Grid (120 BPM, 30 fps):** beat = 15 f (0.5 s), bar = 60 f (2 s). An 8-bar section is 16 s.

| Section type | Shot length | Cuts per bar | Max run before a breath |
|---|---|---|---|
| Burst (montage, no reading) | 4–8 f (½–1 beat) | 4–8 | 2 bars (4 s) |
| Hypermotion standard (claims with one short line) | 15–30 f (1–2 beats) | 2–4 | 4 bars (8 s) |
| Explanation (UI with something to read) | 2–4 bars (4–8 s) | ¼–½ (one cut every 2–4 bars) | n/a |
| Hero hold (a claim lands) | 1–2 bars (2–4 s) | 0 | n/a |

**Readable on-screen time.** The clock starts when the text has **fully settled** and stops when its exit starts:

`hold_frames = fps × max(0.8 + 0.25 × words, chars / 15)`

The first term is the team's rule from concepts.md. The second keeps long words honest: subtitle norms are 15–20
characters per second, and we take 15 because judges skim and some read in a second language. Examples: "Sell the
wallet." (3 words, 16 characters) needs **47 f**; "Buy stays off until every signature is spent." (8 words, 46 characters)
needs **92 f**. A single slammed word can hold 10–12 f **only** if it repeats a word just read or heard in the VO.

**Breathing.** Use an energy curve of burst → hold → burst → hold, never two bursts back to back. After at most 8 s
of fast cutting, give at least 1 bar of stillness. The hold is where the claim lands, and the camera may only drift
there (≤ 2 % scale per second). Drop the music for ½–1 beat before the big reveal; silence is the strongest cut.

**Legibility for busy judges (and phones).**
- Use one idea and one focal point per shot. Each new element appears where the eye already is (the previous
  element's position) or is led there by motion.
- X shows a 1920-wide video about 390 pt wide on a phone (×0.2), so 48 px type becomes about 10 pt. Body copy must be
  **≥ 56–64 px**, headlines **≥ 120 px**, and addresses in mono ≥ 40 px, shown middle-truncated.
- Never blur, shake or speed-ramp text that must be read. Keep text inside the central 80 % (title-safe).
- X autoplays **muted**: every fact must be on screen (concepts.md rule 2). The VO adds rhythm, never new facts.

---

## 5. Sound design

**Palette and placement** (f = frames at 30 fps; "cut" = the first frame of the new shot):

| Layer | Placement rule | Length | Level (relative to VO) |
|---|---|---|---|
| Whoosh / swish | Start early so the **peak lands on the cut frame**; match the direction of the move | As long as the move: 8 f whip ≈ 250–350 ms; 0.5 s move ≈ 400–500 ms | −6 to −10 dB |
| Impact / hit | Transient **exactly on the landing frame** (the first frame the spring reaches 1, not when it settles); 50 ms early reads as sloppy | 0.3–1 s tail | −3 to −6 dB; peaks can sit higher in VO-free gaps |
| Riser | Fills the **1–2 bars before** a reveal, cuts dead on the reveal frame or one beat before it, leaving a silent beat | 2–4 s | builds to −6 dB |
| Downlifter | Starts on a big hit and carries the film into a calm section | 0.5–1.5 s | −10 dB |
| Reverse swell (reverse cymbal) | **Ends** on the cut; sucks into a type-mask or zoom-through | 0.5–1 s | −8 dB |
| Sub drop | On the reveal frame together with the impact; 40–60 Hz | 0.5–1.5 s | felt, not heard; check on headphones |
| UI tick / click | On the frame the UI state changes (the press frame, the toggle frame) | 30–80 ms | −12 dB |
| Glitch | Only on the single SplitHit (T15), aligned to its 4 frames | 130 ms | −10 dB |
| Mechanical / foley | Leather creak on card moves; a **buckle click** when the S locks in; a soft needle "tk" per few stitches, or a short sewing-machine burst, under SewStitch | per event | −10 to −14 dB |

**Mix targets.**
- VO is the anchor. Music under VO sits **18 dB below the speech** as a starting point (duck about 12 dB from the
  music-only level). Use a 6 f attack and a 12 f release. Music-only sections play at −6 dB on the bed.
- SFX sit about 6 dB under the VO: "felt more than heard; if a viewer consciously notices the whoosh, it is too loud".
- Master to **−14 LUFS integrated, ≤ −1 dBTP true peak**. Remotion sums tracks linearly and does no loudness
  processing, so do a two-pass `ffmpeg loudnorm=I=-14:TP=-1:LRA=11` (first pass with `print_format=json`, second
  pass with the measured values) on the final MP4, then re-mux.

**Remotion mechanics.** Use `<Audio>` from `@remotion/media` (props `volume` as a number or `(f) => number`,
`trimBefore`, `trimAfter`, `playbackRate`, `loop`, `toneFrequency`, which only applies at render time). Volume is
**linear**, so convert with `db(x) = 10^(x/20)`. `Whoosh` offsets a `<Sequence>` by the file's peak time so the peak
lands on the cut. `MusicBed` ducks with a volume callback over the VO ranges. Note that `f` counts from the audio's own
start, so mount the bed at frame 0. `@remotion/sfx` (not installed) exports remote WAV URLs (`whoosh`, `whip`,
`mouseClick`, `uiSwitch`, `shutterModern`, `ding`, …) on `remotion.media`. Most of the rest are memes. Use them as
placeholders only, download them into `public/`, and check the licence before the final mix.

---

## 6. Render cost and traps

| Trap | Why | Do this |
|---|---|---|
| `CameraMotionBlur` on a whole scene | Renders the children `samples` times on every frame and is "destructive to colors" | Wrap only the 8 whip frames, and only the moving layer; 6–8 samples |
| A transform computed outside the blur | All samples are identical, so there is no blur | Read `useCurrentFrame()` *inside* the wrapped component (see `WhipLayer`) |
| Shader transitions | `crossZoom`, `zoomBlur`, `linearBlur`, `blurSlide`, `dreamyZoom`, `filmBurn`, `dissolve`, `ripple`, `crosswarp`, `swap`, `zoomInOut` and `bookFlip` use HTML-in-canvas: "requires Chrome 149 or newer with Canvas Draw Element enabled at chrome://flags/#canvas-draw-element" | Use the DOM presentations: `fade`, `slide`, `wipe`, `flip`, `clockWipe`, `iris`, `pushCut`, `none`, plus custom ones (`stitchWipe`) |
| `LightLeak`, `@remotion/effects` | WebGL / GPU in headless Chrome | `npx remotion still` the frame first; try `--gl=angle` |
| Large CSS `blur()` and `feTurbulence` per frame | CPU-rasterised at 1080p | Blur ≤ 8–12 px; pre-render static blurred plates; grain from a PNG |
| `Trail` | ×`layers` renders | Only on short moves, `layers` ≤ 4 |
| `TransitionSeries` length | Transitions **shorten** the timeline (overlaps); overlays do not | Compute the total with `timing.getDurationInFrames({fps})` |
| CSS animations or Tailwind `animate-*` | Not frame-driven, so they flicker in renders | Everything goes through `useCurrentFrame()` |
| `background-image` assets | Not awaited by the renderer | Use `<Img>` and `staticFile()` |
| Duplicate SVG ids (`mask`, `clipPath`, gradients) | Two instances share a definition | Pass a unique `id` per instance (`SewStitch` takes one) |

---

## 7. Brand fit

**Suits "brass and leather, crafted object":** weighty springs (mass ≥ 1.2, no elastic), long `expoOut` landings,
line mask-up type, mechanical counters, tight macro crops of the card, one warm light leak, slow parallax drifts,
subtle grain, foley-led sound (leather, buckle, needle), hard cuts on the beat, and stillness.

**Avoid:** neon or cyan glows; chromatic aberration as a look; datamosh or VHS glitch; spinning gold coins; lasers;
Matrix rain; glowing blockchain cubes and node constellations; lens flares; elastic or bouncy easing; rainbow
gradients; fake "hacker" terminal typing beyond one real address; stock "rocket launch" whooshes. Also avoid these
brand breaks:
- rotating or slanting the S (no shake rotation, no 3D spin of the mark);
- any glow, bevel, shadow or sheen on the logo;
- the mark on a brass ground;
- recolouring the tile or the S;
- the stitch used decoratively, since it must always mean ownership;
- more than one brass fill per frame.

### Signature devices (Satchel's own)

1. **The Sewn Seam.** The saddle stitch sews itself one stitch at a time (`SewStitch`) wherever ownership is created
   or moves: around the minted card, along the connector from the NFT to its three addresses, and around the buyer's
   card in the handoff. The `stitchWipe` transition is the same device at scene scale. Sound: a needle tick per few
   stitches. Because the brand restricts the stitch to ownership, the device carries meaning on its own.
2. **Strap S assembly.** The leather strap draws its S curve, then the stitch sews along it, and the frame lands
   pixel-exact on `satchel-mark.svg` with a buckle-click impact (`StrapSAssemble`). Use it in the first 2 s and on
   the end card. Nothing rotates or glows, so it stays within the logo rules.
3. **Tile → card → screen.** The brass tile match-cuts into the Satchel card (same 22 % corners, with the brass
   retreating into the card's top band), and the card then morphs into the app screen in the Family-style "fly,
   don't teleport" manner (`TileToCard`).
4. **The ledger stamp and the brass unlock.** Each signature record stamps into the history like a struck brass plate
   (`WordSlam`-style slam, a 2–3 f hit-stop, a tiny shake, a metallic impact). In the clean-history check, each record
   flips to "spent" with an icon and a word, and the odometer runs to "0 open". Only then does the Buy button take the
   film's single brass fill, with one sheen sweep.

---

## 8. Top 12 for Satchel

Story map: **Hook 0–15 s** (the idea) → **Problem 15–40 s** (keys can't be sold; an old signature survives the sale) →
**Solution 40–80 s** (record before signing, structured payloads, paused while listed, keyless contract) → **Proof
80–100 s** (clean history check, Buy unlocks) → **End card**.

1. **T17 The stitch sews itself (Sewn Seam).** This is the one device no other wallet film can use, because in our
   brand the stitch *means* "you own this". It turns an abstract claim (whoever holds the NFT controls the wallet)
   into something seen. *Fits:* the hook (the card is sewn as it appears), the solution (the NFT is sewn to three
   addresses) and the handoff (the stitch re-sews around the buyer's card).
2. **Strap S assembly (T16 + T17).** Brand recognition inside 2 s without breaking a single logo rule, which follows
   the "front-load the brand" finding in concepts.md. *Fits:* 0:00–0:02 and the end card.
3. **T27 Tile → card match cut.** It bridges logo and product in one move and reads instantly as "the brand *is* this
   card". *Fits:* 0:02, the hook.
4. **T07 Line mask-up.** The workhorse for every claim. It is calm, premium and legible on phones, and it lets the
   rest of the film be loud without the text suffering. *Fits:* everywhere, with the readable-hold formula.
5. **T05 Per-word slam on the beat.** One high-energy type moment that says the idea in 4 words. *Fits:* the hook
   ("Sell the NFT. / Sell the wallet.").
6. **T04 Tri-split, three chains.** Three native addresses side by side, with chain dots, in under a second: the
   multichain claim made visible without a diagram. *Fits:* the end of the hook and the start of the solution.
7. **T14 Speed ramp and T29 hit-stop on the threat.** The problem has to be *felt*: a signature made before the sale
   is broadcast after it, slowed down as it lands, with a hit-stop and a single `SplitHit` in danger red. *Fits:* the
   problem beat. This is the film's only glitch.
8. **T25 Exploded layers.** It explains the mechanism (NFT → ledger → addresses) in one continuous move, without a
   cut to a diagram, and judges see the architecture. *Fits:* the solution, "record before signing".
9. **T01 Whip pan (blurred).** Supplies the hypermotion energy between problem beats; limit it to 3–4 uses and keep
   real blur inside 8-frame windows. *Fits:* the transitions in problem → solution.
10. **T10 Odometer for clean history.** A mechanical count suits a crafted object and turns the verification into
    something that visibly happens. *Fits:* proof ("12 signatures · 12 spent · 0 open").
11. **T19 Brass sheen on the Buy button.** The payoff, using the single brass fill per screen as the climax: the
    button lights only when history is clean. *Fits:* the end of proof.
12. **T02 Punch-in cuts with a sound pack (whoosh peak on the cut, impact on the landing).** The glue that makes
    everything feel expensive. Raycast's lesson is that timing and sound beat VFX. *Fits:* every UI drill-down, all
    film long.

---

## Appendix A: drop-in snippets (typechecked against 4.0.537)

Copy them into `video/src/fx/` (or similar). They import `EASE` and `SPRING` from `../lib/time`.

### motion.tsx: T01 whip (CameraMotionBlur + SVG directional blur), T02 Trail echo, T14 speed ramp, T29 hit-stop

```tsx
// ===== T01 whip pan =====
import React from "react";
import { AbsoluteFill, Freeze, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraMotionBlur, Trail } from "@remotion/motion-blur";
import { EASE } from "../lib/time";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Frames are read INSIDE the blurred subtree: CameraMotionBlur re-renders its children at
// sub-frame offsets, so a transform computed in a parent would be identical in every sample (no blur).
const WhipLayer: React.FC<{ from: React.ReactNode; to: React.ReactNode; dur: number }> = ({ from, to, dur }) => {
  const frame = useCurrentFrame(); // 0..dur-1, local to the <Sequence> below
  const { width } = useVideoConfig();
  const half = dur / 2;
  const xOut = interpolate(frame, [0, half], [0, -1.15 * width], { ...clamp, easing: EASE.expoIn });
  const xIn = interpolate(frame, [half, dur], [1.15 * width, 0], { ...clamp, easing: EASE.expoOut });
  return frame < half ? (
    <AbsoluteFill style={{ transform: `translateX(${xOut}px)` }}>{from}</AbsoluteFill>
  ) : (
    <AbsoluteFill style={{ transform: `translateX(${xIn}px)` }}>{to}</AbsoluteFill>
  );
};

/** Place so that the cut (the fastest frame) sits on the beat: cutAt is the composition frame of the cut. */
export const WhipPan: React.FC<{ from: React.ReactNode; to: React.ReactNode; cutAt: number; dur?: number }> = ({
  from,
  to,
  cutAt,
  dur = 8,
}) => (
  <Sequence from={cutAt - dur / 2} durationInFrames={dur}>
    <CameraMotionBlur shutterAngle={300} samples={8}>
      <WhipLayer from={from} to={to} dur={dur} />
    </CameraMotionBlur>
  </Sequence>
);

// Cheap alternative: a horizontal-only SVG blur, driven by velocity. One extra filter pass instead of 8 renders.
export const DirectionalBlurDefs: React.FC<{ id: string; amount: number }> = ({ id, amount }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="-20%" y="0" width="140%" height="100%">
      <feGaussianBlur stdDeviation={`${amount} 0`} />
    </filter>
  </svg>
);
// usage: <DirectionalBlurDefs id="whip" amount={speedPxPerFrame * 0.35} />
//        <AbsoluteFill style={{ filter: "url(#whip)", transform: `translateX(${x}px)` }}>…</AbsoluteFill>

// ===== T02 echo trail (Trail) =====
export const EchoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Trail layers={4} lagInFrames={0.6} trailOpacity={0.35}>
    {children /* the child animates itself with useCurrentFrame() */}
  </Trail>
);

// ===== T14 speed ramp (time remap) + T29 hit-stop =====
/** Plays `children` fast → slow-mo on the hero moment → fast. Piecewise-linear remap: slope = playback speed. */
export const SpeedRamp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  // slope = speed: 2x (0–12) → 0.5x shoulder (12–16) → ~0.2x hero (16–32) → 0.25x (32–36) → 2x (36–56).
  // Keep it piecewise-linear: an easing here applies per segment and stalls the speed to 0 at every knot.
  const t = interpolate(frame, [0, 12, 16, 32, 36, 56], [0, 24, 26, 29, 30, 70], {
    extrapolateRight: "extend",
  });
  return <Freeze frame={t}>{children}</Freeze>;
};

/** Hit-stop: hold the impact frame for `hold` frames, then resume where it left off (time shifts by `hold`). */
export const HitStop: React.FC<{ at: number; hold?: number; children: React.ReactNode }> = ({ at, hold = 3, children }) => {
  const f = useCurrentFrame();
  return <Freeze frame={f < at ? f : Math.max(at, f - hold)}>{children}</Freeze>;
};
```

### type.tsx: T05 word slam, T06 letter cascade, T07 line mask-up, T08/T09 tracking + variable-font settle, T10 odometer

```tsx
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, SPRING } from "../lib/time";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const DISPLAY = "Bricolage Grotesque";

// ===== T05 per-word slam =====
/** Each word lands on its own beat: scale 1.35 → 1 with a slam spring, 2-frame fade so it never "pops". */
export const WordSlam: React.FC<{ text: string; beat: number; start?: number }> = ({ text, beat, start = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: 132, fontWeight: 700, letterSpacing: "-0.03em", display: "flex", gap: "0.25em" }}>
      {text.split(" ").map((w, i) => {
        const at = start + i * beat;
        const p = spring({ frame: frame - at, fps, config: SPRING.slam });
        const opacity = interpolate(frame, [at, at + 2], [0, 1], clamp);
        return (
          <span key={i} style={{ display: "inline-block", opacity, transform: `scale(${interpolate(p, [0, 1], [1.35, 1])})` }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

// ===== T06 per-letter cascade (masked, no per-letter opacity) =====
export const LetterCascade: React.FC<{ text: string; stagger?: number }> = ({ text, stagger = 1.2 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: 120, fontWeight: 650, overflow: "hidden", lineHeight: 1.05, paddingBottom: "0.08em" }}>
      {[...text].map((ch, i) => {
        const y = interpolate(frame, [i * stagger, i * stagger + 14], [105, 0], { ...clamp, easing: EASE.expoOut });
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", transform: `translateY(${y}%)` }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ===== T07 line mask-up reveal =====
export const LineMaskUp: React.FC<{ lines: string[]; stagger?: number; dur?: number }> = ({ lines, stagger = 3, dur = 16 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: 88, fontWeight: 650, lineHeight: 1.08 }}>
      {lines.map((line, i) => {
        const y = interpolate(frame, [i * stagger, i * stagger + dur], [110, 0], { ...clamp, easing: EASE.expoOut });
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: "0.06em" }}>
            <div style={{ transform: `translateY(${y}%)` }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

// ===== T08 tracking expansion + T09 variable-font morph (wght + opsz) =====
/** "Settles" a headline: tight + heavy + small-opsz → open + display-opsz. Needs the variable TTF with opsz/wght axes. */
export const VariableSettle: React.FC<{ text: string; dur?: number }> = ({ text, dur = 36 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: EASE.quintOut });
  const wght = interpolate(p, [0, 1], [800, 650]);
  const opsz = interpolate(p, [0, 1], [12, 96]);
  const tracking = interpolate(p, [0, 1], [-0.06, -0.02]);
  return (
    <div
      style={{
        fontFamily: DISPLAY,
        fontSize: 160,
        fontVariationSettings: `'wght' ${wght.toFixed(1)}, 'opsz' ${opsz.toFixed(1)}`,
        letterSpacing: `${tracking}em`,
        fontKerning: "normal",
      }}
    >
      {text}
    </div>
  );
};

// ===== T10 counter roll (odometer) =====
const Digit: React.FC<{ value: number; progress: number }> = ({ value, progress }) => {
  // rolls through 2 extra full turns before landing, so a "0" still visibly rolls
  const turns = interpolate(progress, [0, 1], [0, 20 + value]);
  return (
    <span style={{ display: "inline-block", height: "1em", overflow: "hidden", lineHeight: 1 }}>
      <span style={{ display: "block", transform: `translateY(${-(turns % 10)}em)` }}>
        {Array.from({ length: 11 }, (_, d) => (
          <span key={d} style={{ display: "block", height: "1em" }}>
            {d % 10}
          </span>
        ))}
      </span>
    </span>
  );
};

export const Odometer: React.FC<{ value: number; delayPerDigit?: number }> = ({ value, delayPerDigit = 3 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const digits = String(value).split("").map(Number);
  return (
    <div style={{ fontFamily: DISPLAY, fontSize: 200, fontWeight: 700, fontVariantNumeric: "tabular-nums", display: "flex" }}>
      {digits.map((d, i) => (
        <Digit
          key={i}
          value={d}
          progress={spring({ frame: frame - (digits.length - 1 - i) * delayPerDigit, fps, config: { damping: 200 }, durationInFrames: 30 })}
        />
      ))}
    </div>
  );
};
```

### space.tsx: T03 reveals, T04 tri-split, T11 card fly-in, T25 exploded, T12 parallax, T13 shake, T26 rack focus, T20 grain

```tsx
import React from "react";
import { AbsoluteFill, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import { EASE, SPRING } from "../lib/time";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ===== T03 clip-path reveals =====
export const InsetReveal: React.FC<{ children: React.ReactNode; dur?: number }> = ({ children, dur = 14 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: EASE.expoOut });
  // opens from a horizontal slit, rounded like the card
  return <AbsoluteFill style={{ clipPath: `inset(${50 - 50 * p}% 0% ${50 - 50 * p}% 0% round 22px)` }}>{children}</AbsoluteFill>;
};
export const CircleReveal: React.FC<{ children: React.ReactNode; x: number; y: number; dur?: number }> = ({ children, x, y, dur = 18 }) => {
  const frame = useCurrentFrame();
  const r = interpolate(frame, [0, dur], [0, 150], { ...clamp, easing: EASE.expoInOut });
  return <AbsoluteFill style={{ clipPath: `circle(${r}% at ${x}% ${y}%)` }}>{children}</AbsoluteFill>;
};

// ===== T04 split screen (three chains) =====
export const TriSplit: React.FC<{ panels: React.ReactNode[]; stagger?: number }> = ({ panels, stagger = 4 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ flexDirection: "row", gap: 12 }}>
      {panels.map((panel, i) => {
        const p = interpolate(frame, [i * stagger, i * stagger + 16], [0, 1], { ...clamp, easing: EASE.expoOut });
        return (
          <div key={i} style={{ flex: 1, position: "relative", overflow: "hidden", clipPath: `inset(${100 - 100 * p}% 0 0 0)` }}>
            <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - p) * 12}%)` }}>{panel}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ===== T11 3D card fly-in =====
export const CardFlyIn: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: SPRING.handoff });
  return (
    <AbsoluteFill style={{ perspective: 1800, alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: 760,
          aspectRatio: "1.586",
          transformStyle: "preserve-3d",
          transform: [
            `translateZ(${interpolate(p, [0, 1], [-1400, 0])}px)`,
            `translateY(${interpolate(p, [0, 1], [380, 0])}px)`,
            `rotateX(${interpolate(p, [0, 1], [58, 0])}deg)`,
            `rotateY(${interpolate(p, [0, 1], [-18, 0])}deg)`,
          ].join(" "),
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

// ===== T25 exploded layers =====
export const Exploded: React.FC<{ layers: React.ReactNode[]; explode: number }> = ({ layers, explode }) => (
  <AbsoluteFill style={{ perspective: 2200, alignItems: "center", justifyContent: "center" }}>
    <div style={{ position: "relative", width: 760, aspectRatio: "1.586", transformStyle: "preserve-3d", transform: `rotateX(${52 * explode}deg) rotateZ(${-8 * explode}deg)` }}>
      {layers.map((layer, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, transform: `translateZ(${i * 140 * explode}px)` }}>
          {layer}
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

// ===== T12 parallax =====
export const Parallax: React.FC<{ layers: { node: React.ReactNode; depth: number }[]; dur: number }> = ({ layers, dur }) => {
  const frame = useCurrentFrame();
  const cam = interpolate(frame, [0, dur], [0, -240], { ...clamp, easing: EASE.standard }); // camera travel in px
  return (
    <AbsoluteFill>
      {layers.map(({ node, depth }, i) => (
        // depth 0 = far (barely moves), 1 = subject, >1 = foreground (moves faster than the camera)
        <AbsoluteFill key={i} style={{ transform: `translateX(${cam * depth}px)` }}>
          {node}
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};

// ===== T13 camera shake (impact, decaying) =====
export const Shake: React.FC<{ at: number; amp?: number; children: React.ReactNode }> = ({ at, amp = 14, children }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const env = t < 0 ? 0 : amp * Math.exp(-t / 5); // ~0.5 s to settle
  const x = noise2D("shake-x", t * 0.35, 0) * env;
  const y = noise2D("shake-y", 0, t * 0.35) * env;
  // translate only: never rotate a frame that shows the Strap S
  return <AbsoluteFill style={{ transform: `translate(${x}px, ${y}px)` }}>{children}</AbsoluteFill>;
};

// ===== T26 depth of field =====
export const RackFocus: React.FC<{ bg: React.ReactNode; fg: React.ReactNode; dur?: number }> = ({ bg, fg, dur = 20 }) => {
  const frame = useCurrentFrame();
  const blur = interpolate(frame, [0, dur], [0, 8], { ...clamp, easing: EASE.standard });
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ filter: `blur(${blur}px)`, transform: "scale(1.04)" /* hides blurred edges */ }}>{bg}</AbsoluteFill>
      <AbsoluteFill>{fg}</AbsoluteFill>
    </AbsoluteFill>
  );
};

// ===== T20 grain + vignette (cheap: one oversized pre-rendered noise image, jittered per frame) =====
// public/fx/grain.png: 2560x1440 grey noise, made once (e.g. `magick -size 2560x1440 xc:gray50 +noise Gaussian -colorspace gray grain.png`).
// Use <Img> (render waits for it), not CSS background-image (not awaited, can flash on the first frames of a render).
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.06 }) => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2); // new grain every 2 frames = 15 fps, reads as film rather than video noise
  const dx = Math.floor(random(`gx${step}`) * 640);
  const dy = Math.floor(random(`gy${step}`) * 360);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
      <Img
        src={staticFile("fx/grain.png")}
        style={{ position: "absolute", left: -dx, top: -dy, width: 2560, height: 1440, opacity, mixBlendMode: "overlay" }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(10,6,4,0.55) 100%)" }} />
    </AbsoluteFill>
  );
};
```

### stitch.tsx: T16 draw-on, T17 SewStitch + StrapSAssemble, T18 morph, T28 stitchWipe presentation

```tsx
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { evolvePath, getLength, getPointAtLength, interpolatePath } from "@remotion/paths";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { EASE } from "../lib/time";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The Strap S centreline, verbatim from brand/logo/satchel-mark.svg (viewBox 0 0 512 512).
export const STRAP_S =
  "M346 176 C346 134 306 112 256 112 C196 112 166 140 166 182 C166 226 206 242 256 256 C306 270 346 286 346 330 C346 372 316 400 256 400 C206 400 166 378 166 336";

// ===== T16 stroke draw-on =====
export const DrawOn: React.FC<{ d: string; dur?: number; width?: number; color?: string }> = ({ d, dur = 24, width = 4, color = "#d4ae55" }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: EASE.expoInOut });
  const { strokeDasharray, strokeDashoffset } = evolvePath(p, d);
  return <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />;
};

// ===== T17 the saddle stitch sews itself =====
/**
 * A dashed brass stitch that appears ONE STITCH AT A TIME along any path, led by a needle point.
 * The dash pattern lives on the visible path; the reveal lives on a mask, so the two dash arrays never fight.
 * Defaults = the logo stitch (5 units, "12 10", brand-bright @ 0.85). For UI-scale stitches use 1.5px "6 5" (tokens.json).
 */
export const SewStitch: React.FC<{
  d: string;
  id: string; // unique per instance (mask id)
  dur?: number;
  dash?: [number, number];
  width?: number;
  color?: string;
  opacity?: number;
  needle?: boolean;
  delay?: number;
}> = ({ d, id, dur = 30, dash = [12, 10], width = 5, color = "#ebcb7a", opacity = 0.85, needle = true, delay = 0 }) => {
  const frame = useCurrentFrame() - delay; // <Sequence> can't be used inside <svg>, so offset time by hand
  const len = getLength(d);
  const pitch = dash[0] + dash[1];
  const raw = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: EASE.standard });
  // quantise to whole stitches: the line is SEWN, not drawn
  const sewn = Math.min(len, Math.ceil((raw * len) / pitch) * pitch);
  const reveal = evolvePath(sewn / len, d);
  const tip = getPointAtLength(d, Math.max(0, Math.min(len, raw * len)));
  return (
    <g>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x={-10000} y={-10000} width={20000} height={20000}>
          <path d={d} fill="none" stroke="#fff" strokeWidth={width * 4} strokeDasharray={reveal.strokeDasharray} strokeDashoffset={reveal.strokeDashoffset} />
        </mask>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={width}
        strokeDasharray={dash.join(" ")}
        strokeLinecap="round"
        mask={`url(#${id})`}
      />
      {needle && tip && raw > 0 && raw < 1 ? <circle cx={tip.x} cy={tip.y} r={width * 0.9} fill={color} /> : null}
    </g>
  );
};

/** The Strap S assembles: leather strap draws on, then the stitch sews along it. Final frame == satchel-mark.svg. */
export const StrapSAssemble: React.FC<{ size?: number }> = ({ size = 360 }) => {
  const frame = useCurrentFrame();
  const strap = interpolate(frame, [0, 22], [0, 1], { ...clamp, easing: EASE.expoInOut });
  const s = evolvePath(strap, STRAP_S);
  return (
    <svg viewBox="0 0 512 512" width={size} height={size}>
      <defs>
        <linearGradient id="mb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EBCB7A" />
          <stop offset="0.55" stopColor="#D4AE55" />
          <stop offset="1" stopColor="#9A7428" />
        </linearGradient>
        <linearGradient id="ml" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6A4730" />
          <stop offset="1" stopColor="#432C1F" />
        </linearGradient>
      </defs>
      <rect width={512} height={512} rx={112} fill="url(#mb)" />
      <path d={STRAP_S} fill="none" stroke="url(#ml)" strokeWidth={76} strokeDasharray={s.strokeDasharray} strokeDashoffset={s.strokeDashoffset} />
      {/* the stitch starts sewing while the strap is still landing */}
      <SewStitch d={STRAP_S} id="strap-stitch" delay={14} dur={28} needle={false} />
    </svg>
  );
};

// ===== T18 shape morph =====
export const Morph: React.FC<{ a: string; b: string; dur?: number }> = ({ a, b, dur = 18 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], { ...clamp, easing: EASE.expoInOut });
  return <path d={interpolatePath(p, a, b)} fill="#d4ae55" />;
};

// ===== T28 custom presentation: the stitch wipe =====
type StitchWipeProps = { color?: string; slant?: number };

const StitchWipeComp: React.FC<TransitionPresentationComponentProps<StitchWipeProps>> = ({
  children,
  presentationDirection,
  presentationProgress,
  passedProps,
}) => {
  const { width, height } = useVideoConfig();
  const slant = (passedProps.slant ?? 0.22) * height;
  const x = interpolate(presentationProgress, [0, 1], [-0.05 * width, width + slant + 0.05 * width]);
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `polygon(0 0, ${x}px 0, ${x - slant}px ${height}px, 0 ${height}px)` }}>{children}</AbsoluteFill>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <line
          x1={x + 10}
          y1={0}
          x2={x - slant + 10}
          y2={height}
          stroke={passedProps.color ?? "#ebcb7a"}
          strokeWidth={4}
          strokeDasharray="18 15"
          strokeDashoffset={-presentationProgress * 330} /* the stitch runs along the seam as it travels */
          strokeLinecap="round"
        />
      </svg>
    </AbsoluteFill>
  );
};

export const stitchWipe = (props: StitchWipeProps = {}): TransitionPresentation<StitchWipeProps> => ({
  component: StitchWipeComp,
  props,
});
```

### fx.tsx: T19 brass sheen, T21 light leak + T02 pushCut, T22 bass pulse, T23 beat grid, sound helpers (Whoosh, MusicBed), T24 type mask

```tsx
import React from "react";
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { useWindowedAudioData, visualizeAudio } from "@remotion/media-utils";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { pushCut } from "@remotion/transitions/push-cut";
import { LightLeak } from "@remotion/light-leaks";
import { EASE } from "../lib/time";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ===== T19 brass sheen sweep (on brass UI and brass type, NOT on the logo tile) =====
export const BrassSheen: React.FC<{ children: React.ReactNode; at?: number; dur?: number; radius?: number }> = ({
  children,
  at = 0,
  dur = 22,
  radius = 22,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [-0.3, 1.3], { ...clamp, easing: EASE.expoInOut });
  return (
    <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", isolation: "isolate" }}>
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(105deg, transparent ${p * 100 - 14}%, rgba(255,244,214,0.55) ${p * 100}%, transparent ${p * 100 + 14}%)`,
          mixBlendMode: "soft-light",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
// Brass TYPE with a moving sheen: gradient clipped to the glyphs (background-clip: text).
export const BrassText: React.FC<{ text: string; at?: number }> = ({ text, at = 0 }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [at, at + 30], [120, -20], { ...clamp, easing: EASE.standard });
  return (
    <span
      style={{
        fontFamily: "Bricolage Grotesque",
        fontWeight: 700,
        fontSize: 140,
        backgroundImage: "linear-gradient(105deg, #9a7428 0%, #d4ae55 35%, #fff1c9 50%, #d4ae55 65%, #9a7428 100%)",
        backgroundSize: "250% 100%",
        backgroundPosition: `${x}% 0`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {text}
    </span>
  );
};

// ===== T21 light leak (warm brass, as an overlay on a cut) + T02 zoom-through via pushCut =====
export const CutsWithLeak: React.FC<{ a: React.ReactNode; b: React.ReactNode; c: React.ReactNode }> = ({ a, b, c }) => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={60}>{a}</TransitionSeries.Sequence>
    <TransitionSeries.Transition
      // a punch-in cut: outgoing pushes 1.04→, incoming lands 1.12→1.0, 2-frame brass flash on the cut
      presentation={pushCut({ outgoingScale: 1.12, incomingStartScale: 1.12, incomingEndScale: 1, flashColor: "#ebcb7a", flashOpacity: 0.18, flashFrames: 2 })}
      timing={linearTiming({ durationInFrames: 10, easing: EASE.expoInOut })}
    />
    <TransitionSeries.Sequence durationInFrames={90}>{b}</TransitionSeries.Sequence>
    <TransitionSeries.Overlay durationInFrames={30}>
      {/* LightLeak is deprecated in 4.0.537 in favour of lightLeak() from @remotion/effects, but still exported and WebGL-based. hueShift 0 = yellow→orange = brass */}
      <LightLeak seed={3} hueShift={0} />
    </TransitionSeries.Overlay>
    <TransitionSeries.Sequence durationInFrames={90}>{c}</TransitionSeries.Sequence>
  </TransitionSeries>
);
export const _springTimingExample = springTiming({ config: { damping: 200 }, durationInFrames: 18 });

// ===== T22 audio-reactive pulse (bass → tiny scale/brightness, never on the logo) =====
export const BassPulse: React.FC<{ src: string; children: React.ReactNode }> = ({ src, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({ src, frame, fps, windowInSeconds: 10 });
  if (!audioData) return <>{children}</>;
  const bins = visualizeAudio({ fps, frame, audioData, numberOfSamples: 64, optimizeFor: "speed", dataOffsetInSeconds });
  const bass = bins.slice(0, 6).reduce((a, v) => a + v, 0) / 6;
  return <div style={{ transform: `scale(${1 + Math.min(bass, 1) * 0.025})` }}>{children}</div>;
};

// ===== T23 beat grid =====
export const BPM = 120; // at 30 fps: 15 frames/beat, 60 frames/bar, exactly
export const beat = (n: number, fps = 30, bpm = BPM) => Math.round((n * 60 * fps) / bpm); // ALWAYS from a cumulative beat count
export const bar = (n: number, fps = 30, bpm = BPM) => beat(n * 4, fps, bpm);

// ===== Sound: SFX placed relative to a cut; dB → linear =====
export const db = (d: number) => Math.pow(10, d / 20);
export const Whoosh: React.FC<{ cutAt: number; file: string; peakAtSec: number; gainDb?: number }> = ({ cutAt, file, peakAtSec, gainDb = -12 }) => {
  const { fps } = useVideoConfig();
  // start early so the waveform's PEAK lands on the cut frame
  return (
    <Sequence from={cutAt - Math.round(peakAtSec * fps)} layout="none">
      <Audio src={staticFile(file)} volume={db(gainDb)} />
    </Sequence>
  );
};
/** Music bed ducked under VO: -18 dB under speech, 6-frame attack, 12-frame release. voRanges in composition frames. */
export const MusicBed: React.FC<{ file: string; voRanges: [number, number][] }> = ({ file, voRanges }) => (
  <Audio
    src={staticFile(file)}
    volume={(f) => {
      // the bed is mounted at frame 0, so f equals the composition frame here
      let duck = 0;
      for (const [s, e] of voRanges) {
        duck = Math.max(duck, interpolate(f, [s - 6, s, e, e + 12], [0, 1, 1, 0], clamp));
      }
      return db(interpolate(duck, [0, 1], [-6, -18]));
    }}
  />
);

// ===== T24 type-as-mask (the next scene seen through the word, then the camera flies through a letter) =====
export const TypeMask: React.FC<{ word: string; children: React.ReactNode; dur?: number }> = ({ word, children, dur = 30 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const scale = interpolate(frame, [0, dur * 0.4, dur], [1, 1.15, 40], { ...clamp, easing: EASE.expoIn });
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <clipPath id="type-mask" clipPathUnits="userSpaceOnUse">
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="Bricolage Grotesque"
            fontWeight={800}
            fontSize={360}
            letterSpacing={-12}
            transform={`translate(${width / 2} ${height / 2}) scale(${scale}) translate(${-width / 2} ${-height / 2})`}
          >
            {word}
          </text>
        </clipPath>
      </svg>
      <AbsoluteFill style={{ clipPath: "url(#type-mask)" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
```

### extra.tsx: T15 SplitHit, T27 TileToCard

```tsx
import React from "react";
import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE, SPRING } from "../lib/time";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ===== T15 RGB split, used ONCE (the "old signature still works" threat), 4 frames, danger-tinted =====
export const SplitHit: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  const on = t >= 0 && t < 4;
  const dx = on ? (random(`rgb${t}`) - 0.5) * 18 : 0;
  const style: React.CSSProperties = { position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "Bricolage Grotesque", fontWeight: 700, fontSize: 120 };
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      {on ? <div style={{ ...style, color: "#f37386", transform: `translateX(${dx}px)`, mixBlendMode: "screen" }}>{text}</div> : null}
      {on ? <div style={{ ...style, color: "#94bedf", transform: `translateX(${-dx}px)`, mixBlendMode: "screen" }}>{text}</div> : null}
      <div style={{ ...style, color: "#f3e9dc" }}>{text}</div>
    </AbsoluteFill>
  );
};

// ===== T27 match cut on shape: the logo tile becomes the Satchel card (same 22% corner ratio) =====
export const TileToCard: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: SPRING.handoff });
  const h = interpolate(p, [0, 1], [240, 480]);
  const w = interpolate(p, [0, 1], [240, 480 * 1.586]);
  const band = interpolate(frame, [10, 24], [100, 18], { ...clamp, easing: EASE.expoOut }); // brass fills the tile, then retreats to the card's top band
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: w, height: h, borderRadius: h * 0.22, overflow: "hidden", background: "#221812", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: `${band}%`, background: "linear-gradient(135deg, #ebcb7a, #d4ae55 55%, #9a7428)" }} />
        {children}
      </div>
    </AbsoluteFill>
  );
};
```
