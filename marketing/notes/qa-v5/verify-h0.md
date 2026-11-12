# QA v5 verify · H0, the cold open (v6, 0:00–0:07)

Render: `marketing/video/out/proto/h0v6/h0-v6-1080.mp4` (210 f, 30 fps, 01:38:05). `fN` = H0 frame N (t = N / 30); H0
f210 is H1 f0. Evidence: `marketing/video/out/qa-v5/verify/h0/`, and the paths below are relative to it:
- `f960/`: every frame at 960 px;
- `full/`: every frame at 1080p;
- `sheets/`: 12-frame contact sheets;
- `strips/`: evidence (the `E*` files are the high and medium rows);
- `join/`: the frames of `out/proto/h0v6/join/main-195-239.mp4`.

**Method.**
- **Picture.** I read all 210 frames in the sheets and used full-res crops for every caption, card text, frame edge and
  the turn. Every readable card was compared with `plates.json` `exactText`.
- **Chorus.** Placement comes from `Sound.tsx` and `audio-v6.md`. For each fragment I measured where its speech falls
  frame by frame. There is no speech-to-text on this machine, so the words are the cue sheet's Scribe transcripts.
- **Flashes.**
  - I ran `flashcheck.py` as asked.
  - My own screen uses relative luminance from decoded sRGB and a 0.1-hysteresis zigzag. It covers the whole frame,
    every 320×180 window (25 % of a 10° field at 1080p) and every 10-px cell inside any 640×360 field.
- **Black and silence.** I measured Y, U and V per frame with `signalstats`. I checked the samples of the mp4's AAC and
  of the PCM stems (`out/proto/h0v6/stems/`, which sum exactly to `join/h0.wav`).
- **Loudness.** I ran `ebur128` on the mp4 and on `stems/main-0-299.wav`. I also measured K-weighted 100 ms and 400 ms
  windows per stem, and compared the speech band (300–3400 Hz) frame by frame.
- **Clicks and sync.** I compared second-difference spikes with the local level, and aligned each stem with its source
  file by cross-correlation.
- **Newer render.** `out/satchel-2-v5-h0.mp4` (01:52, the pipeline render after the last `Turn.tsx` edit at 01:40) has
  identical audio and matching frames:
  - f0–59 and f180–201 are bit-identical;
  - f202–209 are at least 76 dB;
  - the rest are 39–53 dB (GL and grain noise).

  Everything below applies to it too.

**Result.** Issues: **high 1 · med 6 · low 13.**
- **High.** The one high is photosensitivity: bar 3's white news slams flicker at the WCAG limit, and over it locally.
  The project's flash screen can't see it because of a counting bug.
- **Medium.**
  - The poster frame's caption sits on the SEAL post's name.
  - Three slams lose their outlet or date.
  - A "North Korea $2 Billion" headline leads the tunnel.
  - The Devcon line's last word is masked by the chorus.
  - Every MP3 cue plays 25 ms late, so the dead stop at f180 has no ramp.

## 1. Issues

| # | t / frame | category | sev | what you see | suggested fix | evidence |
|---|---|---|---|---|---|---|
| 1 | 4.40–5.50 / f132–f165 (bar 3) | Flashes (WCAG 2.3.1) | **high** | Four light news bands slam in: Cointelegraph f135, CoinDesk f143, Decrypt f150 and Scam Sniffer f165. Dark tunnel or X-post frames sit 2–9 frames between them, and white tunnel cards and glitch slices add more swings. **The whole frame and the centre band (1200×360) both have exactly 6 opposing changes ≥ 0.1 in one second: 3 flashes, with no margin.** Locally it is over the limit. 408 of 1,271 positions of a 320×180 window reach 8–11 changes in a second (4–5.5 flashes); the worst are (840,720) f141–170 and (1160,330) f114–143. Per 10-px cell, 78 % of one 640×360 field flashes ≥ 4 times in f133–162. In the left-centre the luminance is a square wave: 0.01 → 0.52 (f135) → 0.01 (f141) → 0.35 (f143) → 0.00 (f148) → 0.42 (f150) → 0.06 (f156) → 0.56 (f165). | Break the light/dark rhythm. Dim the light bands (a grade counts as distortion, not re-wording), for example to ≤ ~0.3 relative luminance. And/or make one of f143 or f150 a dark card (e.g. Decrypt in the tunnel only, with the dark ss-35m post as the slam), so no area flips more than twice a second. Don't drop to black between two light bands. Re-screen with a fixed checker (#2), then run PEAT or Harding on the master before posting. | `strips/E1_flash_bar3.png` |
| 2 | whole clip | QA tooling | **med** | `flashcheck.py` prints `flashes [(55, 98), (174, 205)]` and then `max flashes in any 1 s window: 0 -> PASS`. It only counts a flash when both its transitions fall in one 30-frame window, so it drops any pair that spans more than 1 s. It also averages the whole frame, so the local flashing in #1 is invisible to it. `build.md` and `out/render-v5b.log` (the 01:52 film render) both cite this PASS. | Count transitions (zigzag legs ≥ 0.1, darker side < 0.8) by their end frame in every 30-frame window, and fail above 6. Add a local grid of 320×180 windows. Keep the "screen only" label: PEAT or Harding is the sign-off. | the output quoted here; `strips/E1_flash_bar3.png` |
| 3 | 0.00–0.47 / f0, f2–f14 | Legibility | **med** | On the poster frame and for 0.5 s, "Seed phrases get copied." sits on the SEAL post's name line. "Security Alliance" and its badge ghost through between the caption's letters, and the avatar is half covered; only "@_SEAL_Org · Follow" reads. From f16 the punch-in moves the post below the caption. | In `stripCam`, change the wall's camera y from `SEAL_AT.y + 50` to about `SEAL_AT.y − 60`. That moves the post ~110 px lower on screen (its bottom stays inside the frame), so its account line clears the caption band (y 84–190) from f0. Re-check f0, since it is the thumbnail. | `strips/E2_poster_caption_f000.png` |
| 4 | 4.50–5.17 / f135–f155, and the tunnel | Attribution | **med** | The light pages slam as bands cut to their headline. Cointelegraph (f135–140) shows its date but no outlet. Decrypt (f150–155) shows neither. CoinDesk's Drift headline (f143–147, and its tunnel copy) shows neither, so "CoinDesk" and its date never appear anywhere in H0. SCRIPT-v5 §2 says "the outlet or account and the date are visible on every card", and sources.md says "show the outlet". | Add an "outlet · date" chip on band slams, drawn like the Devcon credit and outside the pass: "Cointelegraph · Aug 3, 2025", "CoinDesk · Apr 2, 2026", "Decrypt · Jan 24, 2022". Or widen the Cointelegraph and Decrypt regions to their masthead and date line. Drift needs the chip, because its dek ("weeks") must stay out. | `strips/E3_attribution_bands.png` |
| 5 | 3.27–3.47 / f98–104 (and f124–125, f173) · 2.40–2.63 / f72–79 (and f169) | Scope / balance | **med** | **Chainalysis:** the first and largest card after the dive is "North Korea Drives Record $2 Billion Crypto Theft Year…", fully readable for 7 frames under "Signatures drain wallets.". That figure is state hacking, mostly Bybit's $1.5B exchange theft, so the cut implies a signing product answers it. sources.md "Don't overclaim" allows exchange multisig hacks only as proof that signers can't read what they sign. The research picked T4-03 for its personal-wallet line (158,000 incidents, `t4-03-chainalysis-158k-incidents.png`), not for this headline. **NBC:** "Hackers steal $1.5 billion from exchange Bybit in biggest-ever crypto heist" shows at the right edge behind the talk. That is exchange-hack framing; the spec wants Bybit "framed as signing". | Swap the Chainalysis headline for the 158k plate in `WALL` and `TUNNEL`, or drop it. Drop `nbc-bybit` from `TUNNEL`, so Ben Zhou's post is the one Bybit item, and it is about signing. | `strips/E7_scope_chainalysis_nbc.png` |
| 6 | 5.50–5.70 / f165–170 | Audio: the voice on top | **med** | The Devcon line's last word ("check", about f165–170 by its envelope) sits only −9 to +4 dB above everything else in the speech band. Six chorus fragments overlap there: F08, F06, F05, F11 and F04 (each ducked −10 dB), plus F10, which enters on f165. The rest of the line holds a K-weighted margin of 7–14 LU over the music, chorus and sfx together, and "Blind" (f62–66) is +27 to +38 dB in the speech band. | Start F10 on f172 (still on its own slam, f165–179). Stop each bar-3 fragment at the next card's slam, so no more than 2 overlap. Or duck the chorus to about −16 dB over f160–174. | `strips/E4_check_masked_f140_179.png` |
| 7 | 6.00 / f180 (and every MP3 cue) | Audio: the stop | **med** | Every MP3 cue (M0, chorus, sfx) plays **25.06 ms late**: 1,203 samples, which is the files' encoder delay (`start_time 0.025057`). Remotion doesn't trim it. The Devcon voice (AAC in MP4) is on time. So M0's own 6 ms end ramp and the suck-in's 4 ms fade both fall after the cues stop at f180, and the mix is cut at full level: 1 ms peaks of −7 to −12 dBFS up to the last millisecond, last sample 0.108, then zero. The riser's top 25 ms and the suck-in's "loudest point" never play. build.md's "f180 holds only the 4–6 ms end ramps" isn't what the render has. The hits also land about 0.75 f late, which isn't visible. | Give H0's audio assets WAV files (or M4A with the priming signalled), so the cues start on time and the designed ramps land before f180. The same 25 ms lag applies to every MP3 in the body. Re-measure the stop afterwards. | `strips/E5_stop_f180_waveform.png` |
| 8 | 2.00 / f60–61 · 4.00 / f120–121 | Legibility | low | The caption swaps blink. The new caption is at opacity 0 on the bar line (f60, f120) and 50 % on the next frame, after the old one was at full on f59 and f119. This is the one-frame blank that v5 removed elsewhere; the slam's glitch hides most of it. | Show captions 2 and 3 at full on their first frame (the hit covers the pop), or hold the outgoing caption until the new one is up. | `sheets/s060.jpg`, `sheets/s120.jpg` |
| 9 | 1.17–1.47 / f35–44 | Framing | low | For the whole G1 hold, a white strip of the Chainalysis page (a wall item) sits on the bottom-left edge: about 575×40 px, "…nalysis  Products  Industries", luma 133–152. | Move the `WALL` chainalysis item (1900, 740) lower or further right, out of the strip camera's view. | `strips/g1_bottom_sliver_f040.png` |
| 10 | various | Pacing | low | The clean, readable frames per slam are: G5 3 (f53–55), signature request 4 (f106–109), Ben Zhou 4 (f114–117), Scam Sniffer 458 days 5 (f121–125), permit 4 (f129–132), Cointelegraph 5, Drift 4, Decrypt 5 and $32.43M 3 (f160–162). The 458-day post is the clearest proof of "Signed once. Used later." and gets 0.17 s. | Hold `ss-458d` for 10–12 frames (move G4 to f132 and tighten the later slams). Give G5 and ss-32m at least 5 clean frames. | `sheets/s048.jpg`, `sheets/s120.jpg`, `sheets/s156.jpg` |
| 11 | 0.00–2.10 / f0–63 | Chorus placement | low | F01, "Seed phrases in LastPass", runs f0–63, but the SEAL post leaves at f30, so "in LastPass" plays over the whip, the photo and the G5 slam. "Pass" is clean at f49–52. Its second half is under the G5 glitch and ping (f53–56, 0 to +3 dB) and its tail under the f58 whip. It stays intelligible. | Optional: move the f52 glitch and ping 2–3 frames later, or 3 dB down. | n/a |
| 12 | 5.50–6.00 / f165–179 | Chorus accuracy and doc | low | On their own cards, the bar-3 fragments are ducked under the voice. They only surface together at f171–179, over the $494M card, cut inside their numbers. F05 stops 33 % into "A victim lost $908,551", F11 31 % into "…$270 million…" and F06 57 % into "…458 days ago". I placed these by the cue-sheet text and each file's speech envelope. The cuts truncate the lines rather than re-word them, but the numbers that start to play don't belong to the card on screen. F10 is cut on "Wallet d—", not on "drain—" as `Sound.tsx` and build.md say. | Stop each fragment at its next card's slam (a `stop` per cue), so the pile-up is F10 plus at most one other. Fix the "drain—" note. | `strips/E4_check_masked_f140_179.png` |
| 13 | 3.77– / f113– | Chorus accuracy | low | F08 says "masked" where Ben Zhou's post on screen says "musked". This was deliberate (audio-v6), but it isn't verbatim. | Keep it and record it in `audio-v6.md` as the one corrected word, or drop F08, which is ducked anyway. | n/a |
| 14 | 6.93 / f208 | The turn | low | On the iris's last frame the hole's left edge is still in frame: about 55 px of black and 33 px of ink down the full height, with the rounded top-left corner. It vanishes on f209; build.md says "its edge leaves the frame on f208". The hole grows about the card, which sits right of centre. | Change `IRIS[2]` from 2.0 to about 2.3, or bias the f208 hole toward the frame centre. | `strips/f208_left_edge.png` |
| 15 | 6.00–6.87 / f180–206 | Silence in the mp4 | low | The PCM mix is exact zero from f180.00 to f206.22 (874 ms). The mp4's AAC is exact zero only from f181.1 to f205.4 (811 ms). After the cut there are 16 ms of codec ringing (4 ms peaks of −34, −44, −40 and −43 dBFS), and the pre-echo before f206 stays at or below −106 dBFS. The stop masks both, so neither is audible. | Nothing needed; the ramps from #7 will also shorten the ringing. The master's AAC will behave the same way. | n/a |
| 16 | f122, f128, f173, f174 | Audio | low | The chorus duck ramps are per-frame gain steps. The chorus stem has a discontinuity exactly on each of those frame boundaries, 14–32 times the local level. In the mix only f128 stands out (11 times, about −36 dBFS), and it isn't audible. | If anything, use longer ramps (5–6 f). | n/a |
| 17 | bars 1–3 | Mix and pacing | low | The barrage doesn't build into the cut. The loudest 100 ms is bar 1's shutter and whip (−10.5 LUFS at f39); just before the stop it is −11.9 (f177). The 400 ms maxima per bar are −14.3, −15.1 and −14.7, with an LRA of 1.0 LU. The reveal is clearly the loudest at 400 ms (−11.2), but only 0.3 LU above the shutter at 100 ms. | Take 2–3 dB off `shutter-snap` and the f33 `whip-fast`, and add 1–2 dB into f165–179 (the suck-in and the riser). | n/a |
| 18 | f60–97 | Licensing | low | SCRIPT-v5 credits the Devcon clip as "unaltered". The audio is, but the picture is cropped and graded, has scanlines and RGB split, is warped on the slam and is zoomed through in the dive. CC BY 4.0 asks you to say what was changed. | In the README and the post, write "audio unaltered; picture cropped and stylised". | `strips/devcon_f075.png` |
| 19 | docs and evidence | Docs | low | **SCRIPT-v5 §2** gives the black as f180–206, "0.87 s". The picture is black for f180–201 (0.73 s), and the card falls in silently from f202; only the silence lasts 0.87 s. **build.md** claims the flash PASS (#2), "f180 holds only the 4–6 ms end ramps" (#7) and "edge leaves the frame on f208" (#14). **The join evidence** in `out/proto/h0v6/join/` (01:32) shows an earlier turn: the card fades in on f203 there, but is fully on at f202 in the shipped render (PSNR 3.5 and 9.7 dB on f202–203). | Correct those lines, and regenerate the join folder from the final render. | `strips/E6_render_vs_joinclip_f202_203.png` |
| 20 | 6.73–6.97 / f202–209 | The turn (taste) | low | The card is cropped by the bottom edge on its first frames (f202–206, contact included). The tile-shaped hole lives for only 3 frames (f206–208) and reveals an empty ground; H1's BTC arrives on f209. At speed it reads as "the lights came on" more than "a sticker-shaped window tore open". | Give the iris 4–5 frames with an ease-out, have BTC (or a charm) visible inside the hole by f207–208, and keep the card's first frame wholly in frame. | `strips/reveal_f202_207.png`, `strips/turn_f201_212.png` |

## 2. The turn: is it a wow?

**It lands, cleanly; it isn't yet spectacular.**
- **What works.**
  - Six seconds of noise end on a dead stop. Then come 22 frames of true black (Y 16, U/V 128) and 874 ms of exact
    digital silence in the PCM.
  - The first coral of the film is the card (no near-coral pixel anywhere in f0–201).
  - The slap lands on the loudest hit: −11.2 LUFS momentary, against −14.3 for the barrage at most.
  - The motion runs straight into H1. Our card hands over to `HookShot` without a jump, BTC enters on f209, and the
    audio join (`h0.wav` + `body-0-89.wav` = `main-0-299.wav`) matches to the sample.
  - The contrast does the work, and it's on-brand: the motion kit's slap, a tile-shaped hole and an ink edge.
- **What holds it back** (#20 and #14).
  - The sticker-shaped burst is on screen for only 3 frames and opens onto an empty ground, so the eye gets "black → white"
    rather than "a world bursts out".
  - The card's first frames are cropped at the bottom.
  - On f208 a black bar is left on the left edge.
- **Two cheap upgrades** would make it a wow: 4–5 iris frames, and H1's first element visible in the hole.
- **The black-to-bright reveal is within the flash rule:** black → card (+0.41 on f202) → a dip as the card shrinks
  (−0.14) → the Day world (+0.57). That is 1.5 flashes in its second.

## 3. Measurements

| What | Result |
|---|---|
| Black, f180–201 | Y 16–16 on every pixel; U and V 128 (f180–182 reach 129 at most) |
| Silence, PCM (`join/h0.wav`) | Exact zero from 6.0000 s (f180.00) to 6.8741 s (f206.22): 874 ms |
| Silence, mp4 AAC | Exact zero from f181.1 to f205.4 (811 ms). Ringing after the cut: −34 dBFS for 4 ms, ≤ −68 dBFS after 16 ms. Pre-echo: ≤ −106 dBFS |
| Loudness, H0 mp4 | −16.9 LUFS integrated, LRA 1.0 LU, true peak −2.1 dBTP |
| Momentary max (400 ms) | Bar 1 −14.3 · bar 2 −15.1 · bar 3 −14.7 · the reveal −11.2 (Main, with the tail) · H1 after the join −11.7 LUFS |
| Short-term max (3 s) | Bar 2 −16.5 · bar 3 −16.8 LUFS (bar 1 is shorter than the window) |
| 100 ms max | Bar 1 −10.5 (f39) · bar 2 −12.5 (f63) · bar 3 −11.9 (f177) · the reveal −10.2 (f207) |
| The voice over everything else (K-weighted, 400 ms) | 7–14 LU through the line. Lower at the edges: 3.6 in the window ending f69 (it includes the f58–60 hits before the first word), 4.4 at f171. Speech band: "Blind" +27 to +38 dB; "check" −9 to +4 dB |
| The voice itself | Played whole (f60.0–172.8), on time (0.00 ms against its source), at a constant gain of +5.5 dB (+4.9 to +5.5 per 100 ms; the residual is resampler-level) |
| Lag against source | Music, chorus and sfx (MP3): +25.06 ms. Voice (AAC in MP4): 0.00 ms |
| Flashes, `flashcheck.py` | Reports flashes (55, 98) and (174, 205), then "0 in any 1 s window: PASS" (the bug in #2) |
| Flashes, my screen | Whole frame: 6 transitions in 1 s at most (f132–161). Centre 1200×360: 6. 320×180 windows: up to 11. Per cell: 78 % of a 10° field at ≥ 4 flashes (f133–162) |
| Caption holds at full opacity | 1: 2.00 s (needs 1.80) · 2: 1.93 s (needs 1.55) · 3: 1.93 s (needs 1.80) |

## 4. Looks good, don't touch

- **The text is the real text.** Every readable card matches its plate word for word and number for number: SEAL,
  Krebs, MetaMask, Solana Status, Cointelegraph ×2, CoinDesk, Decrypt, Finzer, Ben Zhou, NBC, Wintermute, Scam Sniffer
  ×3 plus the report card, and Chainalysis.
  - The plates are shown as captured; the only additions are the amber underlines under their own key phrases.
  - The X posts' times are the UTC times from the capture.
- **The generic cards stay generic.** G2 (signature request), G4 (permit) and G5 (verify your recovery phrase) carry
  no brand, name, outlet or $ amount.
- **G1 is safe.** On both the paper and the phone screen only "garden", "honey" and "rocket" read; words 4–12 are
  blurred beyond recovery (f37–59; full-res crops at f40, f48 and f57).
- **Privacy.**
  - No victim address: the Scam Sniffer media are hidden.
  - No QR code anywhere, including the Devcon slide.
  - The X reply lines are self-replies (@dfinzer, @SolanaStatus).
  - The only faces are public figures: Ben Zhou, Devin Finzer, Brian Krebs's masthead and the Devcon speaker.
- **Balance.**
  - No Ledger screenshot; the talk is the one Ledger item.
  - OpenSea 2 (Decrypt, Finzer); Trust Wallet 1 (The Hacker News); MetaMask 1.
  - Bybit 2, one of them framed as signing (#5 covers the other).
  - None of the excluded themes appears, and the "fake hardware cryptowallet" item is a counterfeit seeded with known
    phrases, not lost hardware.
  - The captions state problems only.
- **Captions.**
  - Each is held well over the minimum.
  - Captions never go through the pass: they stay still through the cold hit (f1), the whip, the slams and the
    suck-in (f173–179).
  - The scrim keeps them readable on every card.
- **The talk.** It slams on at f60–62, and "Blind" lands clean on f62. The credit chip is up f63–93, the slide reads
  ("Blind Signing … Unreadable → Unpredictable → Unsafe to sign"), and the dive aims at the speaker, not the white
  slide.
- **The turn.** The black is true black and the PCM silence is digital. The first coral pixel is the card on f202.
  The card hands over to H1 without a jump (f208 → f209 → H1 f0; the left-edge bar on f208 is #14), and the audio
  across the join matches to the sample.
- **Headroom.** The true peak is −2.1 dBTP and nothing clips.

## Re-check (v7)

Master: `marketing/out/satchel-2-v5.mp4` (02:44; 4,097 f, 136.57 s).
- **H0 is master f0–211.** These frames are bit-identical to `video/out/satchel-2-v5-h0.mp4` and within GL noise of
  `video/out/proto/h0v7/h0-v7-1080.mp4` (≥ 40 dB).
- **H1 f0 is master f212.**

Evidence: `marketing/video/out/qa-v5/verify/h0v7/`, and the paths below are relative to it:
- `f960/` and `full/`: master f0–259;
- `sheets/`;
- `strips/`;
- `h1/`: master f212–305, which is H1 f0–93.

**Method.** The same checks as above, run on the master.
- **Frames.** I read every frame from f0 to f259, and the turn and the join (f200–216) frame by frame at full
  resolution.
- **Flashes.** I ran my local screen on f0–259 (it includes the join) and the rewritten `flashcheck.py` on the H0 part.
- **Audio.** I decoded it from the master's AAC, and used the pre-master files in `video/out/proto/h0v7/`.
- **H1.** I compared H1 with two older renders: the 01:32 Main clip (H1 f0–29) and the 00:50 film (H1 f50–89).

**Result.**
- **Of the 20 items:** 17 fixed, 1 partly fixed (#19, docs), and 2 unchanged but inaudible (#15, #16).
- **New issues:** high 0 · med 0 · low 5 (N1–N5).
- **The join into H1 at f212 is clean** in both picture and sound.
- **H1 is unchanged from f5 on:** f5–29 and f50–89 match the old renders at 42–43 dB, with ≤ 0.01 % of pixels off by
  more than 40 levels, which is encode and anti-aliasing noise. f0–4 differ by design.

### Status of the v6 items

| # | status | what the master shows | evidence |
|---|---|---|---|
| 1 | **fixed** | Bar 3 is now a flat 0.1–0.25 plateau: graded pages on one panel, with no dark gaps. On the whole frame, at most 2 transitions in any second (1 flash; v6 had 6). The centre band has at most 3 (1.5). Of the 320×180 window positions, 1,259 of 1,271 have ≤ 5 transitions; the other 12 (6–7) are all the bar-1 spot in N1. The turn has 1.5 flashes in its second. | `strips/R1_flash_v6_vs_v7.png` |
| 2 | **fixed** | The rewritten `flashcheck.py` counts zigzag transitions by their end frame, scans local windows and has a red rule. On the master's H0 it reproduces the builder's PASS: whole frame 2, local 4, red 4 transitions. Coverage gap: N2. | its output, `proto/h0v7/flash.json` |
| 3 | **fixed** | f0, the poster frame: "Security Alliance ✓ @_SEAL_Org · Follow" and the avatar sit fully below the caption. | `strips/f000_poster_top.png` |
| 4 | **fixed** | Cointelegraph lands whole (masthead, byline, "Published Aug 3, 2025") f146–148, then punches in. CoinDesk shows its masthead f154–158 plus the chip "CoinDesk · Apr 2, 2026" f156–160, and its dek stays out. Decrypt lands whole (logo, "Jan 24, 2022") f161–167. Scam Sniffer keeps its site header. | `sheets/b150.jpg`, `strips/caption_vs_account_v7.png` |
| 5 | **fixed** | Neither Chainalysis nor NBC is in `plates.ts` or on any frame. Bybit appears once, as Ben Zhou's signers post (f113–119). | `sheets/b090.jpg`–`b165.jpg` |
| 6 | **fixed** | No chorus after f65.0; "Blind" starts on f66. In the speech band the voice's active frames have a median margin of 25 dB. "blank" (about f165–168) is +20 to +32 dB, and "check" (about f170–174) is +3 to +14 dB over the suck-in, the stutter and M0's stabs. build.md's "17 dB over check" window also counts "blank". | stems (see N3b on their age) |
| 7 | **fixed** | Every H0 cue now plays a WAV: music, chorus and sfx land 0.00 ms from their sources, the voice 0.02 ms. The pre-master stop is ramped: 1 ms peaks of −16, −18, −22, −27, −38 dBFS, then exact zero at f180. | — |
| 8 | **fixed** | Captions 2 and 3 are at full ink on f60 and f120 (same pixel count as the following frames). | — |
| 9 | **fixed** | The Chainalysis wall item is gone; the bottom-left edge stays at luma 0–4 through f35–44. | `sheets/b030.jpg` |
| 10 | **fixed** | Clean frames per slam: G5 7, signature request 7, Ben Zhou 6, 458 days 11 (f121–131), permit 6, $32.43M 6, Cointelegraph 8, CoinDesk 7, Decrypt 7, $494M 8. | sheets |
| 11, 12 | **fixed** | Only F01 plays (f0–65), whole and alone; it ends before the voice. | — |
| 13 | **fixed** | F08 is no longer used, and audio-v6.md records the corrected word. | — |
| 14 | **fixed** | The hole now centres on the frame as it grows. On f208 black is left only in the four corners, on f209 only thin ink slivers in the extreme corners, and nothing from f210. There is no one-sided bar. | `strips/corners_f208_209.png` |
| 15 | unchanged (inaudible) | In the PCM, f180–204 is exact zero. In the master's AAC the exact-zero run is f182.4–f204.9 (751 ms): the first ~12 ms after the cut ring at −18 to −39 dBFS (3 ms of that is the limiter delay in N4), and the level is ≤ −59 dBFS after 20 ms. The dead stop masks it. | — |
| 16 | unchanged (inaudible) | The chorus duck is gone. The voice duck now steps the music on frame lines f63 and f64 (second difference about −26 and −32 dBFS); the mix masks it. | — |
| 17 | **fixed** | In the master (100 ms / 400 ms maxima): bar 1 −8.7 / −12.0, bar 2 −8.8 / −11.3, bar 3 −8.8 / −11.0, **into the stop −7.8** (f177) / −12.8, the reveal −8.8 / **−9.9**. The barrage now builds into the cut, and the reveal is H0's loudest 400 ms (see N5). | — |
| 18 | **fixed** | SCRIPT-v5 and build.md now say "audio unaltered; picture cropped and stylised". | — |
| 19 | partly | The black is now "about 0.7 s" in SCRIPT-v5 (it is f180–200), and the turn evidence was regenerated. Three new doc mismatches are in N3. | — |
| 20 | **fixed** | The card appears centred and whole on f201 (about 7–92 % of the frame height) and falls onto its rest pose. On contact (f205) its name, value and charms all read, and the burst runs f205–209 with an ink edge, a white shockwave ring and a shake. BTC enters on f211. | `strips/turn_v7_f200_212.png`, `strips/turn_v7_f205_206.png` |

### New issues (v7)

| # | t / frame | category | sev | what you see | suggested fix | evidence |
|---|---|---|---|---|---|---|
| N1 | 1.03–2.00 / f31–60 | Flashes (local) | low | One residual spot by my strict screen, at the bottom centre. 7 positions of a 320×180 window (x 520–760, y 900–1080) reach 7 transitions in one second (3.5 flashes), and 5 more nearby (x 280–800, y 780–1080) reach 6; all of these seconds start between f33 and f49. The transitions are mostly 0.10–0.14, with a peak of only 0.37 relative luminance: the whip streak (f33), G5's white "Verify" button slamming in with a glitch (f49), a bump in the dive (f57) and the talk's slam (f60). With the builder's 341×256 windows it is 4 (2 flashes). Borderline, and low in amplitude. | Grade G5's "Verify" button down (or drop its slam glitch); PEAT or Harding on the master settles it. | `strips/R1_flash_v6_vs_v7.png` (red band) |
| N2 | — | QA tooling | low | `flashcheck.py`'s 341×256 windows with a half-window stride never reach the bottom 56 px or the right 49 px of the frame, and they straddle small spots: it reports 4 where a 320×180 grid at an 80/90 px stride finds 7 (N1). | Add a row and a column of windows flush with the bottom and right edges, and use a quarter-window stride. | — |
| N3 | docs | Docs and evidence | low | **(a)** build.md says the master's decoded AAC peaks reach +1.4 dBFS at the reveal and +0.2 dBFS in H1's first frames. The master measures −1.03 and −1.73 dBFS (film maximum −0.96 dBFS, true peak −0.9 dBTP), so nothing goes over. **(b)** "The join, audio … bit-identical": `join/h0.wav` + `join/body-0-99.wav` (02:39–02:40) differ from `stems/main-0-311.wav` (02:41) by up to 0.10, because the H0 mix changed in between (bar 1 about −1 dB, the rest about +0.4 dB). The master matches `main-0-311.wav`, so the stems and join WAVs are from the earlier mix. The master's own join is clean: no step at f212, −9.4 → −9.0 dB RMS. **(c)** SCRIPT-v5 says the card slams down "centred". It appears centred on f201, but it lands (f205) about 175 px right of and 155 px above centre, in H1's rest pose. | Correct the three lines; re-render the stems and join WAVs from the final mix if they are kept as evidence. | — |
| N4 | whole film | Mastering | low | `render-master.sh` runs `alimiter … attack=3` without latency compensation, so the whole mastered audio is 144 samples (3 ms) late. That is harmless for sync (0.09 f), but it moves H0's ramped stop 3 ms into f180. | Add `latency=1` to the `alimiter` options. | — |
| N5 | 5.90 / f177 · 6.83 / f205 | Mix | low | The reveal is the loudest 400 ms of H0 (−9.9 LUFS), but at 100 ms it is 1 dB under the barrage's last hit (−8.8 against −7.8 at f177). H1's first big moment, 2 s later, is −7.6 / −9.6. After 0.7 s of silence the boom still lands hard; this only matters if "the loudest hit" is meant literally. | 1 dB off the suck-in or stutter peak (cheaper than raising the boom into the limiter). | — |

### The turn, for a first-time viewer: a wow?

**Yes.** It now plays as one clear beat.
- **The setup.** Six seconds of escalating material (dense now rather than strobing) stop dead on the barrage's loudest
  hit. Then come 0.7 s of true black (Y 16 on every pixel) and true silence. That is long enough to make you lean in,
  short enough not to feel broken.
- **The landing.**
  - The first coral pixel of the film arrives on f201: a big, whole, centred card. Its name, "≈ $8,000.00" and the charm
    row read on every frame.
  - It drops onto its spot and lands on the intro's biggest boom.
  - The black tears open around it like a die-cut sticker (ink edge, a white shockwave ring, a shake) and floods to the
    bright Day world in five frames.
  - The film is already moving when the burst clears: the camera settles and BTC drops in on f211.
- **The hand-off.** It is invisible: no jump, no swap, and the ring-out runs straight under H1.
- **What keeps it short of perfect** (none needs fixing before posting):
  - The card lands high and right (H1's pose), so on the contact frame the tile-shaped hole is clipped by the top edge
    and reads as an arch for one frame.
  - The hole shows an empty ground until BTC arrives.
  - The boom is 1 dB under the barrage's last hit at 100 ms (N5).

**H1 on its own still reads right.** Its f0 now opens with the card at rest instead of a few px raised mid-slide. The
camera's settle and BTC's fall carry the motion from the first frame. Side by side, the change is barely visible
(`strips/h1_before_after.png`), and everything from f5 is unchanged.
