# Satchel 2.0 film, "Hand it over": script v5 (cold open + motion polish)

Base: v4 (`marketing/out/satchel-2-v4.mp4`, `SCRIPT-v4.md`, `timeline-v4.md`). Everything v4 says about content,
numbers, wording and the v2 look still holds: v5 changes no claim and no voice line. It adds a cold open before H1,
fixes the animation and transition problems found in a frame-by-frame review, and trims still holds so the film grows
by only a few seconds.

Length: H0 7.07 s (212 frames) + body 129.5 s = **136.6 s (2:17)**; v4 was 2:13.

> **Superseded in one place by v6** (`SCRIPT-v6.md`). In v6 the narrator's first line, "That's why we built
> Satchel.", plays on the black before the reveal. Where this file says H0 has no narrator, or puts the contact on
> f205, v6 replaces it.

## 1. Why v5
- **The opening didn't show the problem.** The X demo-post advice is to open with the user's problem, readable with
  the sound off. v4 opens on the product ("Stick it on.").
- **Motion bugs.** Three reviewers went through v4 frame by frame (`script/QA-BRIEF-v5.md`, notes in
  `notes/qa-v5/`). They found 57 issues: 1 high, 25 medium and 31 low. All 17 scene cuts are clean, with no blank,
  wrong-scene or duplicate frames. The problems are inside the scenes:
  - every plain caption swap blinked for one frame;
  - captions sat on hands, cards or bands;
  - a duplicated card on P1's takeoff;
  - T0's 3-frame flip and its 4-frame Night flicker;
  - a double transition into C1;
  - a 12 px jump at the T6→T7 tab switch;
  - the "Yours" badge popping in without a slap;
  - beats crammed together in T5, T4's opening and P4.

**One on-screen copy change:** T7's payoff line used to read "You now control 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC."
It is now just the amounts, "0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC.", under "Satchel #7 is yours.". Two must-read lines
had been landing within 0.37 s of each other, and the amounts now get a full read.

## 2. H0, the cold open: the barrage (212 f = 7.07 s, 120 BPM)
Razvan's direction, after he saw both the effects prototype and the first build (a flat, card-by-card
storyboard on Night):
- the look of the prototype: black, a 3D wall and tunnel of cards, whips, zoom punches, motion blur, RGB split;
- voiceover, effects and music;
- the video clip whose voice carries over the next visuals;
- a turn into the film through a black screen, as a bigger wow.

Research: `notes/intro-research/creative.md` (genre, pacing, captions), `tech.md` (the effects stack, measured) and
`sources.md` (every source fact-checked). Material: `public/v2/intro/plates/plates.json`. Build: `build.md`.
Audio: `audio-v6.md`.

| Frames | Caption | Picture | Sound |
|---|---|---|---|
| 0–59 (bar 1) | "Seed phrases get copied." | real posts and headlines on black in 3D; a whip to a phone photographing a handwritten recovery list (generated, invalid checksum, 9 of 12 words blurred); a "Verify your recovery phrase" alert slam; a dive into the phone | the music bed (sub pulse, hats); one clear chorus line, "Seed phrases in LastPass" |
| 60–119 (bar 2) | "Signatures drain wallets." | the Devcon clip slams in (≈1.3 s), then the tunnel of signature and drainer headlines while his line carries on | the real voice: "Blind signing is simply equivalent to signing a blank check." on top of everything |
| 120–179 (bar 3) | "Signed once. Used later." | the tunnel accelerates and rolls: old approvals used later, old listings, durable nonces, the loss reports | chorus fragments on their own cards' slams; the music builds to a riser |
| 180–~200 | none | **black**: true black, about 0.7 s | the music's ramped hard stop, then digital silence |
| ~200–211 | none | **the wow**: the coral card falls out of the black and slams down, centred and uncropped, at its rest pose on the intro's loudest hit. Over f205–209 the Day world bursts open around it through a hole shaped like the logo tile (ink edge, hard shadow), with a shockwave ring and a shake. BTC drops in on f211 | `reveal-boom` |

At 7.07 s the film continues from H1 frame 0, with Sarah's first words: "Stick it on.". There is no narrator in
H0.

**The rules for H0**
- **Real material only.**
  - Real headlines and posts, never re-worded; crop, zoom and distortion are fine.
  - Never invent a post, headline or voice and present it as real.
  - The generated recovery-list photo and the generic UI cards (signature request, balance draining, permit) are
    unbranded illustrations.
- **Privacy.** Blur private individuals' names, handles, avatars and faces, plus victim addresses and QR codes. No
  real seed phrase anywhere.
- **Balance.**
  - At most 2 OpenSea items.
  - No Ledger screenshots; the Devcon clip is the one Ledger item.
  - Bybit appears at most twice, framed as signing rather than as an exchange hack.
- **No overclaim.** Leave out address poisoning, exchange insolvency, rug pulls, investment scams and lost hardware.
  Captions state problems, never cures. Every caption is answered later in the film:
  - "Seed phrases get copied." → V09 "There's no seed phrase to copy."
  - "Signatures drain wallets." → V20 "It only signs what it can read…"
  - "Signed once. Used later." → V15, T5 and T6.
- **Voices.**
  - The chorus is generic synthetic voices (never Sarah, no clones of real people) reading short verbatim fragments of
    the plates on screen.
  - The one real voice is the Devcon clip, played whole and unaltered.
- **A scoped exception to the motion bible.**
  - The black ground, distortion, glitch, blur and grade are used only on third-party material and only until the
    black.
  - Nothing of Satchel's warps, and the first coral pixel of the film is the card.
  - Sarah doesn't speak in H0; her first words are "Stick it on."
- **Photosensitivity.** No more than 3 flashes in any second (WCAG 2.3.1). The black-to-bright reveal is the intro's
  one big luminance change. `render-master.sh` screens every H0 render with `src2/scenes/H0/qa/flashcheck.py`. That
  check averages the whole frame, so run PEAT before posting.

**Credits (must also go in the README and the X post)**
- Voice and video: Charles Guillemet, "DeFi Can't Move Forward Without Clear Signing", Devcon SEA 2024 (Ethereum
  Foundation), CC BY. Clip 00:01:00.86–00:01:04.62. Its audio is unaltered; the picture is cropped and stylised (the
  licence asks us to say so).
- Headlines and posts: the outlet or account and the date are visible on every card. The full list is in
  `public/v2/intro/plates/plates.json`.

## 3. Body trims (−3.5 s of still holds; no line, beat or use case cut)

| Scene | v4 → v5 span (s) | Change |
|---|---|---|
| H2 | 3–12 → 3–11.5 | −0.5 still tail after V04 |
| P1 | 12–18 → 11.5–17 | −0.5 hold after V05 |
| P2 | 18–26 → 17–24.5 | −0.5 hold after V06 |
| P4 | 35–43 → 33.5–41 | −0.5 static after V09 |
| P5 | 43–52 → 41–49.5 | −0.5 hold after V10 |
| P6 | 52–59 → 49.5–56 | −0.5 of the in-sync finale (the music stop moves with the cut) |
| C1 | 59–72 → 56–68.5 | −0.5 of the dark pause after V16 (1.26 s is kept) |
| T3 | 88.5–96 → 85–92 | −0.5 still tail after V20 |
| T4 | 96–101 → 92–96.5 | −0.5 still tail after V21 |
| T5 | 101–110.5 → 96.5–107 | **+1.0** at the end: the third stamp, the verdict and the Buy wake were crammed; one bar keeps the score on bar lines |

H1, P3, T0, T1, T2, T6, T7 and E1 keep their lengths.
- T6 isn't trimmed: V24→V25 would come within 0.2 s.
- The treasury line (V13) stays: the use cases were a request.
- Markers (body clock): hookLand 2.5, musicStop 56, thud 63, subHit 64.5, flip 69.5, drop 72.5, blocked 107,
  landing 118.5, endPress 128, end 129.5.
- The score is re-edited on bar lines (`tools/audio-v3/arrangement.json`), and the timing table is in
  `timeline-v5.md`.

## 4. Build
- **Scenes.** `src2/scenes/H0/` is new.
- **H1.** The card is at rest from its first frame. In v4 it slid up into place; now H0's slap puts it there. Everything
  else in H1 is unchanged: frames 5–89 are pixel-identical.
- **Compositions.** `Main` is now the full film, a `<Series>` of H0 and then the v4 body (`Body`, unchanged inside;
  its AudioLayer still starts at the body's frame 0).
- **Render.** `ENTRY=src2/index.ts NAME=satchel-2 tools/render-master.sh v5`.
  - H0 renders with `--gl=angle`: its WebGL pass needs the GPU.
  - The body renders separately with the default renderer, because angle shifts its edge anti-aliasing.
  - The two parts are joined exactly. The reveal's boom rings into the body through `Body`'s `introTail` prop.
- **Fix notes.** The QA fixes per scene are listed in `notes/qa-v5/fixes-*.md`.
