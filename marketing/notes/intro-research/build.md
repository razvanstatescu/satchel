# H0, the cold open: build notes (v7)

The cold open (scene **H0**) that opens the film before H1 ("Stick it on.").

- **v6** took the barrage-test direction: a black ground, a wall and a z-tunnel of real screenshots, whips, zoom punches
  and full-frame slams through one GL pass, then a hard cut to black in digital silence and the reveal.
- **v7** fixes the adversarial review (`notes/qa-v5/verify-h0.md`: 1 high, 6 medium, 13 low) and redesigns the turn,
  using the one H1 change the coordinator authorised.

Built 2026-11-11 on Remotion 4.0.537.

| | |
|---|---|
| Length | **212 f = 7.07 s**. H0's f212 is H1's f0 |
| Code | `marketing/video/src2/scenes/H0/` |
| Film | Composition **`Main`** = `<Series>`: H0, then **`Body`** with `introTail` on |
| Scene alone | Composition **`H0`** (Scenes folder) |
| Film without the intro | Composition **`Body`** (`introTail` off by default) |
| H0 render | `marketing/video/out/proto/h0v7/h0-v7-1080.mp4` |
| Contact sheet | `marketing/video/out/proto/h0v7/h0-v7-contact.png`: every 6th frame, then f180 and f200–211 frame by frame |
| Film | `ENTRY=src2/index.ts NAME=satchel-2 PORT=3530 tools/render-master.sh v5` gives `marketing/out/satchel-2-v5.mp4` |

Render H0 alone:
```bash
npx remotion render src2/index.ts H0 out/h0.mp4 --gl=angle --concurrency=4 --port=3530
```

## What changed in v7 (review item → fix)

| # | Finding | Fix |
|---|---|---|
| 1 high | Bar 3's white news slams flickered at 3 flashes/s on the whole frame and 4–5.5 locally | Light pages are graded to brightness 0.6 everywhere (`LIGHT_GRADE`; white lands near 0.32 relative luminance). The slams run back to back from f105 with no gap: the dark posts first, then the graded pages, each on the same 1500 × 800 graded panel so their footprint never changes. There are no slice glitches on light pages and fewer in bar 3. The slam-in is 1.1 → 1 (it was 1.24). The phishing prompt dives straight into the talk with no bright frame between them. The photo is graded 0.8. The talk's slam-in is 1.05 and its dim is steady. The card falls in from 1.3 |
| 2 | `flashcheck.py` counted wrong and only looked at the frame average | Rewritten: relative luminance from sRGB; zigzag transitions (≥ 0.1, darker side < 0.8) counted by their end frame in every 1 s window; the whole frame plus a sliding grid of 341 × 256 windows (stride half a window); WCAG's saturated-red rule. It fails above 3 flashes and reports against a 2-flash target |
| 3 | The poster frame's caption sat on the SEAL post's name | The wall's camera starts 110 px higher (`WALL_CAM_Y`), so the post's account line sits below the caption from f0 |
| 4 | Three slams lost their outlet or date; CoinDesk never showed | Light pages land whole (masthead and date) for 3 frames, then punch in on their key phrase. CoinDesk shows its masthead and headline (its dek, which says "weeks", stays out), plus a chip "CoinDesk · Apr 2, 2026" drawn outside the pass |
| 5 | The Chainalysis "North Korea … $2 Billion" headline and NBC's Bybit heist were out of scope | Both are gone from the wall and the tunnel. Bybit appears once, as Ben Zhou's signers post |
| 6 | "check" was masked by six chorus fragments | No chorus plays under any of his words. F01 ("Seed phrases in LastPass") plays alone in bar 1 and ends before "Blind". The clip starts on f64 (its first frame is held on the slam f60–63), so "Blind" lands on f66 |
| 7 | Every MP3 cue played 25 ms late, so the stop at f180 cut at full level | Every H0 cue plays a WAV decoded from its MP3 (`public/v2/intro/audio/wav/`, encoder delay trimmed by ffmpeg) |
| 8 | The caption swaps blinked at f60 and f120 | Captions 2 and 3 are at full strength on their first frame |
| 9 | A white Chainalysis sliver sat under the photo | That wall item is gone |
| 10 | The 458-days post got 0.17 s | It is held 12 frames. The phishing prompt and $32.43M get at least 5 clean frames |
| 12 | Fragments were cut inside their numbers | Only F01 plays, whole |
| 13 | F08 reads "masked" where the post says "musked" | Kept, and documented in `audio-v6.md` as the one corrected word (F08 is no longer used in H0) |
| 14, 19, 20 | The turn: card cropped at contact, 3 frames of hole over an empty ground, a black bar on f208, stale join evidence | The turn is redesigned (below). The evidence is regenerated in `out/proto/h0v7/` |
| 17 | The barrage didn't build into the cut | Bar 1's shutter, whip and cold hit are lower. M0 swells +2.5 dB once the voice ends; the stutter and suck-in are higher |

## The turn (v7): the card slams at rest, the world bursts open

**H1 change (authorised by the coordinator, the one change to H1).** In `src2/scenes/H1/hook.tsx`, `slideAt()` returns
1. The card is at rest from H1 f0, and at every negative frame an intro renders.
- Nothing else changed: the camera's 1.12 → 1 settle, BTC's fall and the hands are untouched.
- Verified on the `H1` composition, f0–89 before and after the change: **f5–89 are pixel-identical (0 pixels
  differ)**. Only f0–4 differ, where the card no longer slides up (samples: `out/proto/h0v7/h1-change/`).

| Frames | What happens |
|---|---|
| 180–200 | **Black**, 0.70 s, in digital silence. M0's hard stop and the suck-in's dead stop land exactly on f180, with their own ramps |
| 201–204 | The coral card appears at the frame's centre (1.3×, fully opaque) and falls onto its rest pose. It is silent |
| **205** | **Contact** at the rest pose (H1 at g −7), uncropped (its top is ~40 px below the frame's edge). `reveal-boom` + `sticker-slap`, the loudest moment of the intro. The card squashes flat. The Day world bursts open around it: a hole hugging the card and its charm bar, with an ink outline and the black's hard ink shadow on its top edge. A pale shockwave ring runs ahead. The frame takes a 5 % impact punch and a 3-frame shake |
| 205–209 | The hole grows with an ease-out into a rounded rectangle with the logo tile's corner ratio. Its centre slides from the card to the frame's centre, so it reaches every edge at about the same time; its last black leaves through the corners. From f207 the card is H1's own, and H1's camera is easing out |
| 210–211 | H1's world alone (`HookShot` at g −2, −1). BTC enters the top edge on f211 |
| 212 → | H1 frame 0, unchanged except that the card is at rest; BTC falls to its ring |

The CRT alternative was not built.

## Verification (all re-runnable)

| Check | Result |
|---|---|
| `npx tsc --noEmit` (marketing/video) | passes |
| H0 at 1080p, `--gl=angle --concurrency=4` | 212 frames, about 10 s wall to render |
| **Flash screen** (`python3 -I src2/scenes/H0/qa/flashcheck.py <clip>`) | v6 render (`out/proto/h0v6/h0-v6-1080.mp4`): **FAIL**, local 4.5 flashes in a second, 36 of 70 windows over WCAG. v7: **PASS**. At most 1 flash/s on the whole frame, 2 in any 341 × 256 window (0 windows over the 2-flash target), red 0.5 on the whole frame, red 2 locally. Report: `out/proto/h0v7/flash.json` |
| Loudness, pre-master | H0 **−17.1 LUFS** integrated, true peak −1.8 dBTP, `H0_MASTER_DB` +2.4 |
| The voice on top | Speech-band (300–3400 Hz) median SNR of the voice over everything else: 26.6 dB ("Blind signing is simply equivalent") and 20.6 dB ("to signing a blank check"). Over "check" (f164–175): median 17.4 dB, minimum 5.2 dB (v6: −9 to +4) |
| No chorus under his words | F01's last sample above −50 dB is at f65.0. The clip starts on f64 with 60 ms of room tone, so "Blind" starts about f65.8. The chorus stem is silent from f65 |
| F01, the chorus's clear line | Median speech-band SNR 25 dB over the music and hits |
| The stop | The last 1 ms before f180 peaks at −41 dBFS; the last sample is 0.00005 (v6: 0.108). f180–204 is exactly 0 in the PCM |
| Cue timing | The reveal's first sample above 1 % of its peak is 0.19 ms after f205, and the cold hit 0.00 ms after f0 (v6: 25 ms late) |
| The build and the reveal (K-weighted maxima, 100 ms / 400 ms) | Bar 1 −12.1 / −15.4 · bar 2 −12.3 / −14.8 · bar 3 −11.7 / −14.3 · into the stop (f165–179) −10.7 / −15.8 · **the reveal −9.8 / −10.8** (the loudest at both window lengths) · H1 after the join −6.6 / −10.6 |
| The join, audio | H0 audio + `Body` (`introTail`) f0–99, concatenated, against `Main` f0–311: identical. (Correction from the H0 re-check: those two files came from different mixes, so this is not a proof. The master was measured directly: frame-continuous at the join, A/V error 3 ms, and the boom rings across the join with no gap.) |
| The join, picture | f211 is `HookShot` at g −1 with nothing over it. From f207 our card is H1's own, so there is no swap at the join. In the mastered film, the top of the card's coral band (y, px) runs f208 124 · f209 156 · f210 190 · f211 228 · **f212 266 (H1 f0)** · f213 300 · f214 322: H1's camera settle, continuous across the join. Frames: `out/proto/h0v7/join/` |
| The film (`render-master.sh v5`, `out/satchel-2-v5.mp4`) | Rendered and joined with the new parts. The flash screen on the H0 part passes. Pre-master −15.39 LUFS, mastered −14.03 LUFS. **Correction:** an earlier note here said the master's peaks reach +1.4 dBFS. That was wrong for this master. Measured on `out/satchel-2-v5.mp4`, the sample peak is −0.96 dBFS (−1.03 at the reveal) and the true peak is about −0.9 dBTP, the same as v4 |

Why the split render (H0 with `--gl=angle`, the body without) is unchanged from v6: angle changes the body's edge
anti-aliasing (PSNR 43–45 dB on H2, C1, T3 and E1 stills).

## Timeline (local frames; 120 BPM: a beat is 15 f, a bar 60 f)

| Frames | Picture (third-party, through the GL pass) | Ours, never distorted | Sound |
|---|---|---|---|
| 0–29 | **The wall**: the SEAL post read in close (below the caption from f0), with real screenshots around it. f0 is clean and the cold glitch peaks on f1. f15 punch-in on its key phrase, underlined f16–30 | **"Seed phrases get copied."** (f0–59) | M0 bar 1, cold hit, **F01 "Seed phrases in LastPass" f0–64 (alone)**, punch |
| 30–48 | **Whip** to **G1**, the photo of a seed phrase being photographed (graded 0.8). f45 punch-in on the phone | | whip, shutter f37, punch |
| 49–59 | **G5** "Verify your recovery phrase" slams in; f56–59 the camera dives through it | | glitch |
| 60–97 | **The Devcon talk** slams onto the glass (its first frame held f60–63; the clip runs from f64) and holds 1.3 s over the dimmed tunnel. f94–97 dive aimed at the speaker | **"Signatures drain wallets."** (f60–119); **"Devcon SEA 2024 · CC BY"** f63–93 | **the voice f64–176**: "Blind signing is simply equivalent to signing a blank check." Music and hits −8 dB under it |
| 98–119 | **The tunnel**. Back-to-back slams from f105: **G2** signature request ("Sign" goes down on f107), Ben Zhou f113 | | small glitches (ducked) |
| 120–167 | Scam Sniffer 458 days f120 (12 f), **G4** unlimited permit f132, Scam Sniffer $32.43M f139. Then the graded pages on one panel: Cointelegraph $908K f146, CoinDesk (Drift headline + date chip) f154, Decrypt $1,700 f161; each lands whole, then punches in | **"Signed once. Used later."** (f120–179); **"CoinDesk · Apr 2, 2026"** f156–160 | |
| 168–179 | The last slam, **"Wallet Drainers Drain $494 Million"**. f173–179: everything is sucked in toward the centre | | the voice ends f175; M0 swells +2.5 dB, stutter, **suck-in** to its dead stop on f180 |
| 180–211 | **The turn** (above) | | silence until f205, then the reveal |

## Material and balance

Only the source agent's processed plates are used (`public/v2/intro/plates/`, `plates.json`): blurs applied, no media
or agency images, words unchanged. Every card shows its outlet or account and its date while on screen.
- **Ledger:** no Ledger screenshots.
- **OpenSea:** 2 items (Decrypt, Finzer).
- **Trust Wallet:** 1 item (The Hacker News).
- **MetaMask:** 1 item.
- **Bybit:** once, as signing: Ben Zhou's post.
- **Drift:** once, as CoinDesk's headline.
- **No state-hacking or exchange-theft totals, and nothing from the FBI.**

| `plates.ts` id | Source | Date | Where |
|---|---|---|---|
| `seal` | Security Alliance (@_SEAL_Org) on X | 2024-12-16 | bar 1 hero, tunnel |
| `krebs` | KrebsOnSecurity, "Feds Link $150M Cyberheist to 2022 LastPass Hacks" | 2025-03-07 | wall, tunnel |
| `metamask` | MetaMask (@MetaMask) on X | 2022-04-17 | wall, tunnel |
| `slope` | Solana Status (@SolanaStatus) on X | 2022-08-03 | wall, tunnel |
| `sparkcat` | Kaspersky, "Kaspersky discovers new crypto-stealing Trojan in AppStore and Google Play" | 2025-02-05 | wall |
| `thn-trust` | The Hacker News, "Trust Wallet Chrome Extension Breach Caused $7 Million Crypto Loss via Malicious Code" | 2025-12-26 | wall |
| `cd-282m` | CoinDesk, "Hacker steals $282 million crypto from a victim in social-engineering attack" | 2026-01-16 | wall |
| `your-keys` | Cointelegraph, "Your keys, his coins — Cryptopia employee admits to stealing $172K in crypto" | 2021-07-05 | wall, tunnel |
| `fake-wallet` | Kaspersky Daily, "Case study: fake hardware cryptowallet" | 2023-05-10 | wall (glimpsed in the whip) |
| `ss-458d` | Scam Sniffer (@realScamSniffer) on X | 2025-08-02 | slam f120, tunnel |
| `ct-908k` | Cointelegraph, "Crypto victim loses $908K in sophisticated phishing attack" | 2025-08-03 | slam f146, tunnel |
| `decrypt` | Decrypt, "OpenSea Exploit Sees Bored Ape Yacht Club NFT Sell For $1,700 in Ethereum" | 2022-01-24 | slam f161, tunnel |
| `dfinzer` | Devin Finzer (@dfinzer), OpenSea co-founder and CEO, on X | 2022-02-20 | tunnel |
| `benbybit` | Ben Zhou (@benbybit), Bybit co-founder and CEO, on X (as signing) | 2025-02-21 | slam f113, tunnel |
| `ss-32m` | Scam Sniffer (@realScamSniffer) on X | 2024-09-28 | slam f139, tunnel |
| `ss-35m` | Scam Sniffer (@realScamSniffer) on X | 2024-10-11 | tunnel |
| `wintermute` | Wintermute (@wintermute_t) on X | 2025-05-30 | tunnel |
| `cd-drift` | CoinDesk, "How a Solana feature designed for convenience let attackers drain more than $270 million from Drift" (masthead and headline) | 2026-04-02 | slam f154 |
| `ss-494m`, `ss-report` | Scam Sniffer, "Scam Sniffer 2024: Web3 Phishing Attacks – Wallet Drainers Drain $494 Million" (headline and report card) | 2025-01-03 | last slam f168, tunnel |

The built shots:
- **G1**, the seed-phrase photo (`public/v2/intro/g1/G1-blurred.png`). It is AI-generated, its words fail the BIP39
  checksum, and 9 of the 12 are blurred.
- **G2, G4 and G5** (`Generic.tsx`): dark and unbranded. No names, no outlets, no amounts in $.
- **The talk** (`raw/video/devcon7-2024-blind-signing-blank-check.mp4`). Its audio plays whole and unaltered. Its
  picture is cropped and stylised: graded, scanlines and RGB split, the first frame held on the slam, a zoom through it.

## Credits for the README and the post

- **Talk:** Charles Guillemet, "DeFi Can't Move Forward Without Clear Signing: Let Me Change Your Mind", Devcon SEA
  2024 (Ethereum Foundation), CC BY 4.0, https://www.youtube.com/watch?v=qGSGzHMqsSQ.
  - Note the changes CC BY asks for: "audio unaltered; picture cropped and stylised".
  - The speaker and his employer do not endorse Satchel.
- **Screenshots:** Security Alliance, KrebsOnSecurity, MetaMask, Solana Status, Kaspersky, The Hacker News, CoinDesk,
  Cointelegraph, Scam Sniffer, Decrypt, Devin Finzer, Ben Zhou, Wintermute. Dates and links are in `sources.md`.
  - Shown briefly as news commentary.
  - Light pages are graded down; the words are unchanged.
  - No endorsement implied.
- **Seed-phrase photo:** AI-generated for the film.
- **News voice (F01), music bed M0 and sound effects:** generated with ElevenLabs (`audio-v6.md`, `sfx-intro.md`).

## Render pipeline (`tools/render-master.sh`)

When `ENTRY` is under `src2/`, the script:
1. renders `H0` with `--gl=angle`;
2. renders `Body` with the default GL and `--props='{"introTail":true}'`;
3. joins them. H0's length comes from its frame count, the video is stream-copied, the audio goes through the concat
   filter, and the A/V start is checked;
4. runs the flash screen, which now fails on local flashes too;
5. masters: limiter, then two-pass loudnorm to −14 LUFS / −1 dBTP.

## How to tweak

- **Timing:** `timing.ts`. It holds the bars, the black (`BLACK`), the fall and contact (`SLAP_START`, `CONTACT`;
  `CONTACT_G` is the H1 frame the card lands on), the voice start (`VOICE_AT`), the talk's on-glass window, and the
  captions.
- **Material:** `plates.ts`.
  - It holds `WALL`, `TUNNEL` and `SLAMS` (frame, length, card, `punch`, `focus`, `chip`, `dive`).
  - `light: true` grades a page (`LIGHT_GRADE`).
  - Keep slams back to back and dark-before-light: re-run the flash screen after any change.
- **Picture and pass:** `Barrage.tsx`. It holds the strip camera, the talk's pose, the tunnel's speed and roll, the
  slam panel, and `barrageLook()` (hits, intensity ramp, calm while the speaker is on screen, no slices on light pages).
- **The reveal:** `Turn.tsx`. It holds `FALL_FROM`, the squash and lift per frame, the punch and shake, `HALO`, `END`
  and `OPEN_FRAMES` (the hole's ease-out), and the ring.
- **Sound:** `Sound.tsx`, the `CUES` list (WAVs only).
  - Re-measure with:
    ```bash
    npx remotion render src2/index.ts H0 x.wav --codec=wav --gl=angle --port=3530
    ffmpeg -i x.wav -af ebur128=peak=true -f null -
    ```
  - Keep H0 near −17 LUFS through `H0_MASTER_DB`.
  - Keep any chorus out of the voice's span (f64–176).

## Known limits and open items

- **Nothing has been listened to.** The mix was set from stems and loudness and speech-band measurements.
- **Photosensitivity:** the flash screen is a screen, not a sign-off. Run PEAT or a Harding test on the master before
  posting.
- **The body alone (`Body` without the intro)** now opens on the card at rest instead of its slide-up.
- **Rights:** a quick legal look at news screenshots in a promotional film is still advised (`sources.md`).
- **The talk is 640 × 360,** upscaled about 2× on the glass.
