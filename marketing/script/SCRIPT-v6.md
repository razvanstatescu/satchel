# Satchel 2.0 film, "Hand it over": script v6 (the bridge)

Base: v5 (`marketing/out/satchel-2-v5.mp4`, `SCRIPT-v5.md`). Everything in v5 still holds except the turn from the
cold open into H1. The body is unchanged: no claim, scene or voice line moves inside it.

Length: H0 8.73 s (262 frames) + body 129.5 s = **138.2 s (2:18)**. v5 was 2:17 and v4 2:13.

## 1. Why v6
Razvan, after v5 (2026-11-11): the move from the intro to "Stick it on." was too abrupt in what is on screen and what
the voice says. The intro sets out several of the industry's problems, then the film jumps to Satchel's tagline with
nothing linking the two. He asked for a smoother way into the Satchel part. The picture of the turn (the black, the
slam, the Day world bursting open) stays as it is.

## 2. The change: one line on the black
| H0 frames | Picture | Sound |
|---|---|---|
| 0–179 | the barrage, unchanged | unchanged |
| 180–194 | black | digital silence (0.5 s); the music and the suck-in stop on f180, as in v5 |
| 195–250 | the title **"That's why we built Satchel."**, centred, in the intro captions' type (white Funnel Display 800, 100 px) | Sarah: "That's why we built Satchel." (speech f195–245), dry, at the body's voice level |
| 251–254 | the card falls in through clean black (the title is gone) | silence |
| 255 | contact: the reveal, unchanged from v5 | reveal boom and slap |
| 262 | H1 frame 0 | the body |

The opening now runs:
1. Captions: "Seed phrases get copied." → "Signatures drain wallets." → "Signed once. Used later."
2. Devcon voice: "Blind signing is simply equivalent to signing a blank check."
3. Sarah, on the black: **"That's why we built Satchel."**
4. The slam, then H1: "Stick it on. Hand it over." → "Native Bitcoin, Ethereum and Solana, in one NFT."

**Why this line**
- It turns all three problems toward Satchel in one sentence.
- It names the product just before the card lands.
- It claims only why the team built Satchel, not that Satchel ends wallet drains. The film answers each caption later:
  V09 the seed phrase, V20 readable signatures, V15–V24 old signatures.
- It previews no later line. A question such as "What if a wallet kept a record of every signature?" would give away
  C1's catch and T0's "Satchel keeps the receipts".

**Why on the black**
- The black is where the film turns, and the line fills it.
- The barrage and the reveal Razvan approved stay as they are. The slam still comes out of darkness and silence, and
  the name is heard just before the card is seen.
- The title carries the line for viewers watching with the sound off.

**Why Sarah**
- Her first words now open the Satchel part, and she stays the film's only narrator.
- v5's rule "no narrator in H0" (from `notes/intro-research/creative.md`) is retired. It kept her voice back for
  "Stick it on.", and that is what made the turn feel abrupt.

**The take**
- Made with `tools/audio-v3/intro-bridge.mjs`: 4 takes in Sarah's voice on eleven_v4, with the body's settings. The
  intro's captions were given as previous text and "Stick it on. Hand it over." as next text.
- All 4 passed Scribe.
- Take 0 ships because its pitch falls on "Satchel", which closes the statement the way V17 says the name. Takes 1–3
  rose at the end.
- Files: `video/public/v2/vo/V00.mp3`, and `video/public/v2/intro/audio/wav/V00.wav`, which is the one H0 plays.

**Other lines that would fit the same slot.** Each is a one-line swap that needs only a new take and an H0 render:
- "What if a wallet had no seed phrase to copy?" P4's "There's no seed phrase to copy." answers it word for word.
- "There's a calmer way to hold crypto." This leads into V04's "holds".

## 3. Build
- **`src2/scenes/H0/timing.ts`.** Adds `BRIDGE`, sets `SLAP_START` to 251 and `CONTACT` to 255, and sets `H0_FRAMES`
  to `CONTACT + 7` (262).
  - The reveal (`Turn.tsx`) and its ring-out into the body (`Sound.tsx`, `H0Tail`) are timed from `CONTACT` and
    `H0_FRAMES`. Moving both by the same amount left the body's sound, and therefore its render, unchanged.
- **`Sound.tsx`.** The bridge cue plays through the black's silence (`inBlack`) at a net 0 dB, which is how
  `AudioLayer` plays every V line.
- **`index.tsx`.** Adds `Bridge`, the title, drawn under the reveal.
- **Render.**
  1. Copy v5's body part to `video/out/satchel-2-v6-body.mp4`. Nothing outside `src2/scenes/H0` had changed since that
     render.
  2. Run `ONLY_H0=1 ENTRY=src2/index.ts NAME=satchel-2 tools/render-master.sh v6`.

## 4. Checks on the v6 master
- **Length and loudness.** 4,147 frames (262 + 3,885); −14.0 LUFS and −0.97 dBTP.
- **Scribe on the first 13 s.** "seed phrases in LastPass. Blind signing is simply equivalent to signing a blank
  check. That's why we built Satchel. Stick it on. Hand it over. Native Bitcoin"
- **Timing.**
  - Digital silence from 6.07 s; the voice runs 6.50–8.16 s (f195–245).
  - The title is on screen for f195–250. The boom starts at 8.505 s, on contact (f255).
- **Level.** The line sits among the body's lines (RMS on one channel):

  | Line | Where measured | RMS |
  |---|---|---|
  | the bridge | H0 part | −17.5 dBFS |
  | V01 | body part | −19.7 dBFS |
  | V02 | body part | −16.7 dBFS |
  | V03 | body part | −16.0 dBFS |
- **The join.** It matches v5's join: lag 0, gain −0.06 dB, and a residual 31.6 dB below the signal (codec noise).
- **Flash screen.** PASS: the whole frame peaks at 1.0 flash/s, local windows at 2.0 and red at 2.0. 0 of 88 windows
  are over WCAG.
