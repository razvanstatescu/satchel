# H0 cold open: music bed (M0) and news-voice chorus (cue sheet, v6)

Audio for scene **H0**, the cold open before H1. There are two parts: a music bed (M0) in three lengths, and a chorus of
13 short news-voice fragments, each in a dry and a TV-speaker version. The builder places everything on frames: H0 is
local frames, at 30 fps and 120 BPM, so a beat is 15 f and a bar is 60 f.

The film's own score, VO and timeline were not touched. H1's glockenspiel pickup stays the first bright note of the film.

**Nothing here has been listened to.** Every judgement below comes from spectra, beat tracking and Scribe transcripts.
A human listen is needed before the intro locks.

## Files

| What | Path (relative to `video/public/`) |
|---|---|
| M0, 4 bars, the main version | `v2/intro/audio/m0.mp3` (a copy of `m0-4bar.mp3`) |
| M0, 4 bars | `v2/intro/audio/m0-4bar.mp3` |
| M0, 3.5 bars | `v2/intro/audio/m0-3p5bar.mp3` |
| M0, 3 bars | `v2/intro/audio/m0-3bar.mp3` |
| Chorus, dry | `v2/intro/audio/chorus/F01-dry.mp3` … `F13-dry.mp3` |
| Chorus, TV speaker | `v2/intro/audio/chorus/F01-tv.mp3` … `F13-tv.mp3` |

- **M0 format:** 44.1 kHz stereo mp3 at 320 kbps, with a sample peak of −3 dBFS.
- **Chorus format:** 44.1 kHz mono mp3 at 192 kbps.

## 1. M0, the music bed

- **Source.** One Eleven Music take: `music_v1`, seed 909, 20 s. The request was a dark modern trailer/glitch hybrid at
  120 BPM with a sub pulse, ticking hats, glitch percussion and tense stabs, and no melody.
- **Measured tempo.** 119.98 BPM. The beats sit at **0.027 s + k × 0.5 s**, so every musical downbeat lands about 1 frame
  after the bar line (f1, f61, f121, f181). That is under one frame, and the film's score has the same offset (0.024 s).
- **Key.** The pitch content is G, C and D, a dark G-minor/sus colour. H1 opens on a G major chord, so the reveal lands
  as the parallel major. The library's `sub-drone` (C2 rising to D2) also sits inside these notes.
- **How it was edited.** The take was cut on bar lines with `tools/audio-v3/arrange.py`. The edit lists are
  `tools/audio-v3/intro/m0-*.json`.
- **What the raw take gave.** It is one continuous pulse from 0 to 14.75 s, slowly adding weight. Synth stabs build
  over 12–14.75 s, peak stabs follow at 14.75–16.75 s, then it fades out early (by 17 s) and has no riser of its own.
- **What the edit adds:**
  - **Bar 1** is band-split down to the sub pulse plus the ticking hats (sub < 120 Hz, hats > 6 kHz), which makes it
    sparse.
  - **A riser** is synthesized: a saturated sine glide from 180 Hz to 2.4 kHz, plus noise whose filter opens from
    0.8 to 12 kHz. It climbs from −34 to −10 dBFS and tops out exactly at the stop.
  - **The hard stop** cuts everything dead on the last bar line, with a 6 ms ramp so it doesn't click. The file ends
    exactly there; the digital silence after it is the builder's.

### Bar maps

In each variant, "source" is the time in the raw take.

**`m0.mp3` / `m0-4bar.mp3`: 8.000 s = 240 f.** Hard stop at **8.000 s (f240)**.

| Bar | Frames | Source | What is in it |
|---|---|---|---|
| 1 | f0–59 | 0–2 s | Sparse: sub pulse on every beat, ticking 16th hats. Accents on f1 and f31 |
| 2 | f60–119 | 10–12 s | The full band enters: more weight and glitch percussion. Accents on f61 and f66, a hit on f110 |
| 3 | f120–179 | 12–14 s | Stabs building. The riser starts at 5.03 s (f151) |
| 4 | f180–239 | 14–16 s | The peak: stabs on f181, f222 and f233, the riser near its top. **HARD STOP at f240** |

**`m0-3p5bar.mp3`: 7.000 s = 210 f.** Hard stop at **7.000 s (f210)**, in the middle of the loud first half of the peak.

| Bar | Frames | Source | What is in it |
|---|---|---|---|
| 1 | f0–59 | 0–2 s | As in the 4-bar version |
| 2 | f60–119 | 10–12 s | As in the 4-bar version |
| 3 | f120–179 | 12–14 s | As in the 4-bar version. The riser starts at 4.03 s (f121) |
| 4 (first half) | f180–209 | 14–15 s | The peak; an accent on f181. **HARD STOP at f210** |

**`m0-3bar.mp3`: 6.000 s = 180 f.** Hard stop at **6.000 s (f180)**.

| Bar | Frames | Source | What is in it |
|---|---|---|---|
| 1 | f0–59 | 0–2 s | Sparse: sub pulse and hats |
| 2 | f60–119 | 12–14 s | Stabs building. The riser starts at 3.53 s (f106) |
| 3 | f120–179 | 14–16 s | The peak: stabs on f121 and f162. **HARD STOP at f180** |

### Level

| File | Integrated | Momentary max | Suggested `gainDb` (mixDb −20) |
|---|---|---|---|
| m0 / m0-4bar | −16.0 LUFS | −11.4 LUFS | **−8.6** |
| m0-3p5bar | −16.5 LUFS | −12.3 LUFS | **−7.7** |
| m0-3bar | −15.9 LUFS | −11.4 LUFS | **−8.6** |

- **How `gainDb` is computed.** As in `src2/data/sfx.json`: gainDb = mixDb − the K-weighted momentary max. With mixDb
  −20, the bed sits under the impacts (−16 to −22) and under the Devcon voice.
- **Under the Devcon line.** Duck the bed by 12 dB, as H0 already does with everything else.
- **Doubling.** M0 now carries its own riser. If `riser-digital` (the SFX) still goes on top, drop it about 6 dB or let
  M0's riser do the job. Both end on their top at the stop.

## 2. The news-voice chorus

- **Voices.** Four premade ElevenLabs library voices, never Sarah (the film's narrator) and not clones of public figures:
  - Daniel, "Steady Broadcaster" (British, male);
  - Matilda, "Knowledgable, Professional" (American, female);
  - Bill, "Wise, Mature, Balanced" (American, male);
  - Alice, "Clear, Engaging Educator" (British, female).
- **Model and settings.** `eleven_v4`, stability 0.5. Each fragment was voiced alone, with the unspoken context
  "Breaking news tonight." (`previous_text`) to get a broadcast read.
- **Wording.** Each fragment is a verbatim run of words from its plate (`plates.json` `exactText`). Words were only
  dropped, never added. Dollar figures are read as written.
- **The one corrected word.** F08's post (Ben Zhou, T2-09) spells "musked"; F08 reads it as "masked", as asked. That is
  the only word in the chorus that differs from its plate (QA v5 #13).
- **Trim.** Each file starts 10 ms before the voice and ends 60 ms after it. Place it with the file start on the card's
  slam frame.
- **TV variant.** A 4th-order band from 300 to 3400 Hz, with light tanh saturation. Below 250 Hz drops from 14–62 % of
  the energy to 1–6 %, and above 4 kHz is under 1 %.
- **These are news reads, and long.** Fragments run 2.0–4.6 s, and spelled-out numbers make them longer. Overlap them,
  pan them apart, or chop them on the grid, as in `tech.md` §8, and cut them dead at the suck-out.

| Id | Plate (card) | Voice | Dur (s) | Plate text | Scribe (dry / tv) | Mmax dry / tv (LUFS) | gainDb dry / tv |
|---|---|---|---|---|---|---|---|
| F01 | T1-01 SEAL | Daniel | 2.21 | seed phrases in LastPass | Seed phrases in LastPass / same | −17.7 / −17.8 | −8.3 / −8.2 |
| F02 | T1-01 SEAL | Matilda | 2.05 | your funds might be at risk | Your funds might be at risk / same | −18.7 / −17.4 | −7.3 / −8.6 |
| F03 | T1-04 Solana Status | Bill | 3.44 | private key information was inadvertently transmitted | Private key information was inadvertently transmitted / same | −21.8 / −23.3 | −4.2 / −2.7 |
| F04 | T2-12 Scam Sniffer ($32.43M) | Alice | 2.99 | after signing a "permit" phishing signature | After signing a permit fishing signature / same ¹ | −21.0 / −19.4 | −5.0 / −6.6 |
| F05 | T2-01 Scam Sniffer (458 days) | Daniel | 4.56 | A victim lost $908,551 | A victim lost $908,551 / same | −18.2 / −17.8 | −7.8 / −8.2 |
| F06 | T2-01 Scam Sniffer (458 days) | Matilda | 3.51 | a phishing approval signed 458 days ago | A phishing approval signed 458 days ago / same | −19.3 / −20.2 | −6.7 / −5.8 |
| F07 | T2-07 Devin Finzer | Bill | 4.02 | 32 users thus far have signed a malicious payload | 32 users thus far have signed a malicious payload / "Thirty-two users …" ² | −21.1 / −22.4 | −4.9 / −3.6 |
| F08 | T2-09 Ben Zhou | Alice | 2.58 | all the signers saw the musked UI (read "masked") | All the signers saw the masked UI / same | −20.0 / −19.0 | −6.0 / −7.0 |
| F09 | T2-10 NBC News | Daniel | 3.23 | Hackers steal $1.5 billion | Hackers steal $1.5 billion / same | −18.7 / −18.5 | −7.3 / −7.5 |
| F10 | T4-01h Scam Sniffer 2024 | Matilda | 4.08 | Wallet Drainers Drain $494 Million | Wallet drainers drain $494 million / same | −14.5 / −14.1 | −11.5 / −11.9 |
| F11 | T2-18 CoinDesk (Drift) | Bill | 3.99 | drain more than $270 million from Drift | Drain more than $270 million from Drift / "… two hundred and seventy million dollars …" ² | −21.0 / −23.8 | −5.0 / −2.2 |
| F12 | T1-07 The Hacker News | Alice | 3.70 | $7 Million Crypto Loss via Malicious Code | $7 million crypto loss via malicious code / same | −20.2 / −19.2 | −5.8 / −6.8 |
| F13 | T1-05 Kaspersky | Bill | 1.99 | new crypto-stealing Trojan | New crypto-stealing Trojan / same | −20.3 / −22.7 | −5.7 / −3.3 |

- **gainDb.** Computed for mixDb −26, the same level as the pings: above the wordless `news-murmur` (−30) and under
  the hits. When 2–3 fragments overlap, take another 3 dB off each.
- **¹ "phishing" and "fishing".** They are homophones, and Scribe cannot hear a spelling, so a take passes when Scribe
  writes either.
- **² Spelled-out numbers.** Scribe sometimes writes a number in words. The check counts "thirty-two" as 32 and
  "two hundred and seventy million dollars" as $270 million.
- **Every take passed** these checks on both the dry and the TV file.

### How H0 uses the chorus (build v7, 2026-11-11)

- **Only F01 plays:** "Seed phrases in LastPass", on the SEAL post, from H0 f0. It plays alone, whole, and as the
  intro's one clear line. It ends (f64) before the Devcon line's first word ("Blind", f66).
- **Every other fragment is left out.** The Devcon voice runs f64–176, and each other fragment would have sat under
  his words (QA v5 #6) or been cut inside a number at the black (QA v5 #12).
- **H0 plays WAV copies.** All of H0's cues play from `public/v2/intro/audio/wav/`, which are the MP3s decoded by
  ffmpeg, so their encoder delay is trimmed. The MP3s themselves play 25 ms late in Remotion (QA v5 #7).

## 3. Budget ledger (ElevenLabs, shared payg account)

| Step | Calls | Account balance after (credits left) |
|---|---|---|
| Start of the task | — | 15,226 |
| M0, one music generation (20 s) | 1 | 15,069 |
| Chorus, first pass | 20 TTS (747 characters) + 20 Scribe | 15,007 |
| Chorus, 3 re-voiced lines ³ | 3 TTS (121 characters) + 3 Scribe | — |
| End of the task | — | **14,830** |

- **Total:** about 396 credits by the account counter, against the 5,000 cap. Other sessions share the account, so part
  of that figure may not be ours.
- **TTS billing.** The cost headers on the 23 TTS calls add up to 193.
- **³ The re-voiced lines.** F04, F06 and F11 were voiced a second time by mistake while the checker was being
  re-tested. The new takes pass and are the ones shipped.

## 4. Re-run

```bash
node tools/audio-v3/intro-m0.mjs --analyze                           # bar-by-bar look at the raw take (no spend)
for v in m0-4bar m0-3p5bar m0-3bar; do python3 tools/audio-v3/arrange.py tools/audio-v3/intro/$v.json; done
cp video/public/v2/intro/audio/m0-4bar.mp3 video/public/v2/intro/audio/m0.mp3
node tools/audio-v3/intro-chorus.mjs --reselect                      # re-check saved transcripts, re-pick takes (no spend)
node tools/audio-v3/intro-chorus.mjs --only F05                      # re-voice one fragment (spends TTS + Scribe)
```

- **Working files.** Raw takes, every retake and the transcripts are in `tools/audio-v3/work/intro/`.
- **Keys.** They load only through `tools/lib/env.mjs`.
