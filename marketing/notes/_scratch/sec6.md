## 6. Sound personality

**Music.** Bright indie-pop with an electro-funk bounce, playful but premium, at **120 BPM** (15 f per beat,
frame-exact) in a major key. The locked palette (concepts-v2 §4.6) is handclaps, a plucked bass, glockenspiel and a
**whistled hook**. Add muted clean funk-guitar chops, marimba for the "success" colour, a warm Rhodes bed for the
premium layer, and tight, dry drums.
- **Premium, not childish:** short motifs, real-sounding instruments, a clean low end and a wide but tidy mix. No
  kazoo, slide whistle, ukulele-whistle cliché, cartoon library or lo-fi crackle.
- **Cue sheet** (the world bible's; times from `timeline-v3.md` markers):

| Cue | Time | What |
|---|---|---|
| M1 Hook | 0:00–0:10 | Three snaps (0.17 / 0.50 / 0.83 s, the snap-ons), a glockenspiel pickup, the jingle at the swing apex, the groove on the landing (2.6 s) |
| M2 Product | 0:10–0:46 | Builds every 8 bars; a 1-bar comic break at P4; a lift into the Give swing |
| M3 Use cases | 0:46–0:58 | The chorus; the three swings land on bar downbeats with the jingle |
| M4 Catch | 0:58–1:12 | Hard stop at `musicStop` 58.0 s (one muted pluck), the Night blind, a heartbeat pulse with a ticking hat, a thud at `thud` 66.0, a sub hit at `subHit` 68.0, near silence |
| M5 Flip | 1:12–1:16 | A 2-bar riser, a whoosh on `flip` 73.0, Day back, the **drop** at `drop` 76.0 |
| M6 Tech | 1:16–1:50 | A driving groove; accents for the outline drawing, the empty key slot, three bounces, the frost shimmer, the scan, **three stamps on the V23 phrases**, a bright chord on "Clean history" |
| M7 Blocked | 1:50–1:56 | Bass and tick only, a soft deflating "wah" on the banner; no horror sting |
| M8 Hand-off | 1:56–2:06.5 | A high-pass sweep, a snare roll, the **landing** at `landing` 122.0: a big slap, the jingle, the full band |
| M9 Outro | 2:06.5–2:14 | The whistled hook resolves, a final slap on the mark's press at `endPress` 132.0, ring-out, silence in the last 0.5 s |

- **Mix:** VO on top; music ducked about 13 dB under it (6 f attack, 12 f release; the `duck` spans in
  `timeline.json`); at most 1–3 SFX per second; master to −14 LUFS and ≤ −1 dBTP.

**SFX palette.** Use the 2.0 library through `<Sfx name … at … align …>`. Transients land **on the contact frame**;
swishes and whooshes use `align="peak"` so their loudest point sits on the fastest frame or the cut. Start around −6 dB
and balance by ear; the VO must stay clear.

| Moment | `name` | Sync |
|---|---|---|
| Sticker contact (slap-ins, captions, set-downs, the MarkBuild) | `sticker-slap` | the contact frame (f4 of a slap) |
| Peel (corner, frame, a sticker leaving) | `sticker-peel` | `align="peak"` on the detach |
| Snap-ons, pills, badges, smiles widening | `pop` (`pop-high` for SOL) | the contact frame |
| A big squash rebound (at most 3 in the film) | `boing-soft` | contact + 2 f |
| The swing's apex; charms arriving | `charm-jingle` | `align="peak"` on the apex |
| Set-down, bar stops | `chain-clink` | contact |
| The lift and slide of a hand-off | `swing-swish` | `align="peak"` mid-slide |
| Button press (Mint, Send, Give; Buy) | `button-thock` (`button-thock-deep` for Buy) | the press frame `at` |
| Counter steps, toggles | `tick-soft`, `bubble-tick-run` | each step, or under the count |
| Labels and accounts typing | `type-run` | the first character |
| The S writing itself, outlines drawing | `pen-scribble` | the start of the draw |
| Cards sliding, the slip into the pocket | `paper-slide`, `pocket-slip` | `align="peak"` |
| Stamps (T5) | `stamp-thunk` then `success-marimba` (+2 f) | the V23 phrase onsets |
| The empty key slot (T2) | `lock-click` | the fingers find nothing |
| Whips, the flip | `whoosh-zip`, `whoosh-soft` | `align="peak"` on the cut or the 90° frame |
| Leap, the sticky note falling | `swoop-up`, `swoop-down` | the take-off, the fall |
| Sparkle bursts (max 4) | `sparkle` | the burst start |
| Sent, Clean history | `success-marimba` | the state change |
| Coins landing, gulps | `coin-ding` | contact |
| Not the holder, bounced requests, Blocked | `error-boop` | the bounce or the banner |
| The seller's sneaky slip (C1) | `sneaky-pizz` | as the slip slides into the pocket |
| The catch's pulse | `tension-tick` | under C1 |
| Frost on (T4) | `freeze-chime` | the wipe start |
| The verdict and the frost melt | `magic-wand` | the verdict and the melt |
| Thud (C1), heavy accents | `drum-hit-soft` | on the marker |
| The riser into the flip | `riser-short` | ends on `flip` |

```tsx
// sfxUsage.tsx: sound on the contact frame with the project's helper (typechecked against video/src2/lib/Sfx.tsx).
// `at` is in seconds, scene-local; place it beside the moving element in your scene.
import React from "react";
import { Sfx } from "../../../../video/src2/lib/Sfx";
import { SLAP_CONTACT } from "./brand2/motion";

const FPS = 30;
export const SlapSounds: React.FC<{ slapStartSec: number }> = ({ slapStartSec }) => (
  <>
    <Sfx name="sticker-slap" at={slapStartSec + SLAP_CONTACT / FPS} />
    <Sfx name="charm-jingle" at={slapStartSec + 0.5} align="peak" gainDb={-4} />
  </>
);
```

**Voice.** Locked: **Sarah** (ElevenLabs `EXAVITQu4vr4xnSDxMaL`, `eleven_v4`). She is warm, smiling and adult,
reading at about 155 wpm. The world bible asks for a slight wry tilt on "Not even ours." and "Satchel keeps the
receipts."; never cutesy, and no character voices (the charms never speak, amendment A3).

The three profiles this brief asked for are the casting logic, kept for any re-records or cut-downs:
1. **The friendly maker** (this is Sarah): a warm mid-range voice, late 20s to 30s, conversational, 150–160 wpm. The
   energy lifts on the verbs ("give", "sell", "inside"), and the delivery is quietly delighted.
2. **The bright guide:** a crisper, higher-energy British or Australian voice, 160–170 wpm, with playful timing and a
   wink on the catch. Suits a faster social cut.
3. **The calm confidant:** a lower, warm baritone or alto, 140–150 wpm, reassuring. Suits a trust-led cut about clean
   history.

Direction for any of them:
- Short sentences, smiling vowels and no hype words.
- No crypto-bro register, no vocal fry, no kid voice.
- Pronunciation: ".near" is "dot near", "Satchel" is /ˈsætʃəl/, and say "Bitcoin, Ethereum and Solana" in full.
- If TTS: stability 0.45–0.55, similarity 0.75, style 0.25–0.35; generate 2–3 takes per line and pick one.

---

