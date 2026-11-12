# Intro SFX (scene H0, the cold-open barrage)

27 sound effects for the v5 cold open, made with `eleven_text_to_sound_v2` through `tools/sfx2` as its `intro` set.
- **Round 1** made 23, from the prompts in `tech.md` §8 and `creative.md` §8.
- **Round 2** added 4 for the cut to black and the reveal: `reveal-boom-1`, `reveal-boom-2`, `crt-off` and `suck-in`.

**Where they are**
- Audio: `video/public/v2/sfx/<name>.mp3` (44.1 kHz stereo, 192 kbps).
- Catalog: `video/src2/data/sfx.json`, as `v2/sfx/<name>.mp3` with `duration`, `peakSec` and `gainDb`, plus `prompt`,
  `source` and `note`.
- The 32 existing entries and their mp3 files are byte-identical to before; the intro keys are appended after them.

**Nothing here has been listened to.** Every judgement below comes from the waveform and spectrum. A human listen
before the intro locks is still needed, most of all for the composites.

## The library

| Name | Dur (s) | Peak (dBFS) | peakSec | gainDb | Source | What it is (hear-proxy) |
|---|---|---|---|---|---|---|
| barrage-cold-hit | 0.50 | −10.3 | 0.165 | +3.5 | take 1 | A static/zap burst (~3 kHz) over a sub thump; 30 Hz high-pass, cut short with a 60 ms fade |
| glitch-hit-1 | 0.20 | −6.4 | 0.035 | 0 | take 1 | A continuous harsh crackle, mostly above 8 kHz |
| glitch-hit-2 | 0.20 | −6.9 | 0.075 | +0.5 | take 1 | Choppy bit-crushed bursts, stuttering on and off |
| glitch-hit-3 | 0.20 | −6.7 | 0.065 | −2.5 | take 1 | An instant loud crackle that holds, 8–13 kHz |
| glitch-stutter | 0.43 | −6.7 | 0.365 | −7.5 | composite | One blip repeated 11×, gaps shrinking 70 → 18 ms until it fuses into a buzz |
| whip-fast | 0.30 | −6.6 | 0.085 | −2.5 | take 1 | An air whip that builds to its peak at 85 ms; the centroid falls 3 → 0.7 kHz, like a Doppler pass |
| zoom-punch | 0.27 | −6.5 | 0.015 | +0.5 | composite | A tight thud (~90–130 Hz, saturated) with a bright click on top |
| sub-drop | 1.20 | −6.8 | 0.795 | −9 | take 1 | A sub falling 65 → 22 Hz, faded over 0.8 s, lightly saturated so laptops hear it |
| notif-ping-1 | 0.34 | −6.9 | 0.085 | −4 | composite | Glassy "ding-ding", ~754 then ~1007 Hz (rising fourth), with 5–7 kHz shimmer |
| notif-ping-2 | 0.28 | −6.8 | 0.015 | −9.5 | composite | Wooden marimba "tick-tock", falling E6 → C6 |
| notif-ping-3 | 0.18 | −6.8 | 0.005 | −0.5 | take 1 | A round chat-app pop, ~1.3 kHz attack and a soft low body |
| notif-swarm | 3.00 | −6.8 | 2.575 | −8.5 | composite | 33 pings, chimes and buzzes, ever denser (3 → 24 a second) and louder (−14 → 0 dB), panned |
| phone-buzz | 0.54 | −6.6 | 0.425 | −14.5 | composite | Two 0.2 s phone buzzes (215 Hz plus desk rattle) with a 0.12 s gap |
| keyboard-burst | 0.98 | −7.0 | 0.465 | −3.5 | composite | Frantic clicky typing, about 15–20 strokes a second (two takes layered) |
| shutter-snap | 0.20 | −7.4 | 0.105 | 0 | take 1 | A camera click-clack: the shutter at 5 ms, then mechanism clicks at ~65, ~120 and ~165 ms |
| static-burst | 0.30 | −6.7 | 0.045 | −12 | take 2 | Harsh TV static (+8 dB above 3 kHz) that cuts off dead |
| news-murmur | 4.00 | −6.8 | 3.005 | −13 | take 1 | Overlapping broadcast voices, voice-band only (200 Hz–2 kHz); speech-to-text found **no words** |
| riser-digital | 2.00 | −6.4 | 1.995 | −13.5 | take 2 | Noise plus a glassy tone climbing ~2 → 6–11 kHz at full level; **the file ends on its top** |
| tape-stop | 0.49 | −6.8 | 0.015 | −2.5 | take 1 | Electronic noise whose pitch and brightness slump to a stop in ~0.45 s |
| sub-drone | 8.00 | −6.8 | 3.465 | −15 | composite | A dark C2 drone with harmonics to ~500 Hz; fades in over ~2.5 s, rises 2 semitones (65 → 73.5 Hz), stops dead at 8.0 s |
| paper-unstick-1 | 0.40 | −6.5 | 0.225 | −8 | take 1 | Tape ripping off a wall, accelerating to a peak at ~0.23 s |
| paper-unstick-2 | 0.40 | −6.1 | 0.185 | −9 | take 1 | A sticker tugged loose, sticky crackle at 9–13 kHz |
| paper-unstick-3 | 0.40 | −7.1 | 0.125 | −8 | take 1 | Taped paper pulled at a corner: a tearing rustle that settles into a low thump |
| reveal-boom-1 | 1.60 | −6.6 | 0.135 | −1.5 | take 2 | Punchy attack and 43 Hz boom (~0.45 s), opening into a bright ~9.6 kHz shimmer that rings out to 1.6 s; the punchier of the two |
| reveal-boom-2 | 1.60 | −6.6 | 0.085 | −0.5 | take 2 | Same shape, rounder: boom ~0.4 s, then a longer, slower shimmer (7–11.7 kHz) from 0.6 s |
| crt-off | 0.68 | −6.8 | 0.085 | +0.5 | take 1 | A brief ~13.9 kHz whine into a bright pop at ~80 ms, then a low 54–108 Hz collapse hum dying away |
| suck-in | 0.43 | −6.5 | 0.430 | −5.5 | take 1 | Reverse whoosh / inhale: swells from silence (centroid 2.7 → 11 kHz) and **stops dead on its loudest point** |

- **Peak** is the decoded mp3's sample peak. Every file is at −6.1 dBFS or below.
- **gainDb** is computed as for the library (mixDb from the specs minus the K-weighted momentary max). It is also capped
  so that peak + gainDb stays at or below −6 dBFS, the intro's pre-master ceiling.
- **The intro hits are loudness-matched only to each other** (barrage-cold-hit, the glitch hits, whip-fast,
  zoom-punch). That is why barrage-cold-hit sits at −10.3 dBFS.

## For the builder

- **riser-digital:** `peakSec` equals its duration. `align="peak"` therefore puts the end, its top, on the suck-out frame.
- **Whooshes and hits:** align `whip-fast` with `align="peak"` (85 ms); the hits and pings start on their transient at
  about 5 ms.
- **Pings:** pitch them with `rate` for the "two pitches" idea. The three flavours already differ in contour: ping 1
  rises, ping 2 falls, ping 3 is a single pop.
- **sub-drone and notif-swarm:** each carries its own build (the drone's fade-in, the swarm's rising density). Start
  them at the scene's beat and let them run.
- **The slap:** `sticker-slap` and `drum-hit-soft` come from the existing library unchanged. Per `tech.md`, don't boost
  the slap after the silence.
- **suck-in:** `peakSec` equals its end (0.43 s), so `align="peak"` lands the dead stop on the cut to black. Its first
  ~0.13 s is a near-silent swell by design.
- **crt-off:** starts on its whine. `align="peak"` puts the pop (85 ms) on a frame.
- **reveal-boom:** start it on the reveal frame; the attack is at about 5 ms and the shimmer rings to 1.6 s. Take 1 is
  punchier and brighter, take 2 rounder with a longer shimmer.
  - Take 1's raw generation had 260 samples above full scale (take 2: 48), so ElevenLabs may have clipped its boom.
  - If it sounds crunchy on the listen, use take 2.

## Takes, retakes and composites

- Every sound got one take. Ten were wrong against their prompt and got one retake each.
  - Kept from the retake: `static-burst` (then high-shelved) and `riser-digital`.
  - The other eight retakes failed the same way as their first take. The model returns one event where the prompt asks
    for a pattern: one note instead of two, one buzz instead of two, no speed-up. Or it gets the shape backwards: the
    swarm decays, the drone doesn't rise.
- Those eight are **composites** (`tools/sfx2/composite-intro.mjs`), built only from this set's generated takes and the
  library's single marimba note. They use no extra credits, and each one's reason is in its catalog `note`.
- **Fixed in processing instead of retaking:**
  - `barrage-cold-hit`: its 22–43 Hz sub was eating headroom, and it rang on too long.
  - `sub-drop`: the brief says it fades out; the take held its level.
  - `shutter-snap`: now starts on its first strong click.
- **Skipped as asked:** glass-crack. (crt-off was skipped in round 1 and made in round 2.)
- **Round 2:**
  - **reveal-boom:** both first takes were a pure 43–65 Hz boom with no shimmer. Each was retaken once, and the
    retakes are used as generated (30 Hz high-pass, light saturation, 0.3 s tail fade).
    - I first layered a punch and a click onto the retakes. Then I measured the band laptops play (above 250 Hz):
      the retakes' attack is already their loudest moment there, so the layers came out.
  - **crt-off:** take 1 with a 40 Hz high-pass, which removes a 22 Hz rumble and keeps the collapse hum.
  - **suck-in:** take 1, cut at 0.43 s, where it is still within 1 dB of its peak; it fades over its last 0.1 s
    otherwise.

## QA (what was checked on every file)

- **Start:**
  - Leading silence is trimmed so the transient lands at about 5 ms. Onset is ≤ 7.6 ms on every file except suck-in,
    a swell from silence that reaches −40 dB at 0.13 s.
  - Some sounds start soft by design, so their −20 dB transient comes later: the drone and swarm fade in, and the
    riser and suck-in swell from their low start.
  - static-burst's noise starts at 2.8 ms, inside the 5 ms lead. It is a full-level burst, accepted.
- **Peaks:** the decoded peak is ≤ −6 dBFS on every file.
- **Clicks at the cut points:** energy above 4 kHz in the first and last 3 ms against the 20 ms next to them. No edge
  shows a jump (worst: −6.8 dB at a start, −0.8 dB at an end). The first and last samples are ≤ −30 dB relative.
  - Deliberate hard stops (riser-digital, static-burst, sub-drone, suck-in) end with a 4 ms fade.
  - End-of-file clicks from ElevenLabs are stripped before processing.
- **Matches the prompt:** checked with `node tools/sfx2/inspect.mjs`, which prints the envelope, spectral centroid,
  dominant frequency, a pitch track (it verified the drone's 2-semitone rise) and band levels.
  - Retakes were judged on the same readings.
  - news-murmur was run through Scribe speech-to-text, which returned an empty transcript.
- **Nothing existing changed:** the 32 existing mp3s and catalog entries were checksummed before and after round 1.
  All 55 were checksummed before and after round 2. The round-2 sounds stay out of the intro 'hit' group so the
  earlier hits keep their levels.

## Credits

| Item | Credits |
|---|---|
| Round 1: balance before (shared account) | 15,518 remaining |
| Round 1: 23 first takes | 160 |
| Round 1: 10 retakes | 102 |
| Round 1: speech-to-text check (news-murmur) | 0 (no change on the counter) |
| **Round 1 total** | **262** of the 3,000 cap |
| Round 1: balance after | 15,255 remaining (the shared counter moved 263) |
| Round 2: balance before | 15,254 remaining |
| Round 2: 4 first takes (reveal-boom ×2, crt-off, suck-in) | 28 |
| Round 2: 2 retakes (reveal-boom ×2) | 20 |
| **Round 2 total** | **48** of the 600 cap |
| Round 2: balance after | 15,206 remaining |

The per-call ledger is in `tools/sfx2/gen-log.json` (entries with `"set": "intro"`).

## Re-running

```sh
node tools/sfx2/generate.mjs --set intro                    # missing first takes only
node tools/sfx2/composite-intro.mjs                         # rebuild the composites (deterministic)
node tools/sfx2/process.mjs --set intro                     # mp3s + merge the intro keys into sfx.json
node tools/sfx2/inspect.mjs --bands video/public/v2/sfx/notif-swarm.mp3
```

- The set's files are `specs-intro.mjs`, `choice-intro.json`, `regen-intro.json` and `qa-report-intro.json`; raw takes
  are in `_raw/intro/`.
- `process.mjs` without `--set` still builds the original library. Both sets now merge into the catalog instead of
  rewriting it, so neither run can delete the other's entries.
