# Satchel videos

> **Not product code.** This folder holds the sources of the submission's demo video: script, Remotion scenes, audio
> and image generators, and research notes. The product is in `contracts/`, `packages/` and `apps/`; start at the
> root [`README.md`](../README.md). On-screen wording in the video is mainnet-style by design (see "Facts to keep
> true" below); the product runs on testnet only. Rendered videos go to `out/`, which is not committed; the
> published video is linked from the submission's X post.

## Current: Satchel 2.0 film "Hand it over", v6 (2026-11-11)
`out/satchel-2-v6.mp4`: 138.2 s (2:18), 1920×1080, 30 fps, H.264 + AAC 320 kbps, −14 LUFS / −1 dBTP. Needs X Premium.

v6 is v5 with one change, the bridge (`script/SCRIPT-v6.md`). In the black between the cold open and the reveal,
Sarah says "That's why we built Satchel.", and the same words show as a title. The film now moves from the industry's
problems to Satchel with a sentence, not just a cut. The body is unchanged.

v5 builds on v4 (`out/satchel-2-v4.mp4`, 2:13). `script/SCRIPT-v5.md` says what changed and why. Every claim, voice line
and number stays as in v4 (`script/SCRIPT-v4.md`).

- **An 8.7-second cold open (H0).** It opens on the problem:
  - A fast 3D barrage of real headlines and posts on black, covering copied seed phrases, signatures that drain
    wallets, and signatures used long after they were made.
  - A real CC BY clip ("Blind signing is simply equivalent to signing a blank check.").
  - A news-voice chorus reading the headlines verbatim, plus music and effects.
  - Then a cut to black in silence, the narrator's first words on the black ("That's why we built Satchel.", added in
    v6), and the coral card slaps onto the black as the bright world bursts open into "Stick it on."
- **Motion fixes.** A frame-by-frame review found 57 animation and transition issues; all were fixed except a few
  minor ones left by choice (`notes/qa-v5/`). A second pass verified the fixes.
- **Trims.** 3.5 s of still holds came out of the body.

Narrator: Sarah (`eleven_v4`). Wording on screen is mainnet-style, like the landing (D-52).

Structure: the problem, cold open (0:00) → "That's why we built Satchel." (0:06) → hook (0:08) → one NFT (0:11) → mint
(0:20) → fill, USDC too (0:25) → send on all three (0:33) → no seed phrase, only you or who you allow (0:42) → give,
even by link (0:49) → one trade or an offer; a treasury (0:58) → the catch, in Night (1:04) → "Satchel keeps the
receipts" (1:17) → recorded first (1:21) → no admin key (1:27) → readable requests only (1:33) → paused for sale
(1:40) → the browser check (1:45) → blocked #4 (1:55) → the hand-off (2:01) → end card (2:11).

**Third-party material in the cold open** (credit these in the post too):
- The voice and video are from Charles Guillemet, "DeFi Can't Move Forward Without Clear Signing", Devcon SEA 2024
  (Ethereum Foundation), CC BY. The clip runs 00:01:00.86–00:01:04.62. Its audio is unaltered; the picture is cropped
  and stylised.
- Headlines and posts are shown briefly, unaltered, with their outlet or account and date visible, as commentary.
  The list is in `video/public/v2/intro/plates/plates.json`, with fact checks in `notes/intro-research/sources.md`.
- Private individuals' details and victims' addresses are blurred.
- The recovery-list photo is generated, and its words fail the BIP39 checksum.

| Where | What |
|---|---|
| `brand-v2/` | The Satchel 2.0 brand pack (zip contents + the design system README/tokens + the brand canvas boards) |
| `script/SCRIPT-v6.md` | v6: the bridge line between the cold open and the hook |
| `script/SCRIPT-v5.md`, `script/timeline-v5.md` | v5: the cold open, the fixes and the trims; the timed table (body clock) |
| `script/SCRIPT-v4.md`, `script/SCRIPT-v3.md`, `script/SCENE-BRIEF-v3.md` | The content script (claims, numbers, voice lines), its history, the builders' brief |
| `notes/intro-research/`, `notes/qa-v5/` | The cold open's research (genre, effects, sources, sound, build) and the v5 frame-by-frame reviews and fixes |
| `notes/concepts-v2.md`, `notes/brand2-motion-bible.md` | The three treatments + production script ("Hand it over"); the motion language with exact numbers |
| `video/src2/` | The 2.0 film (Remotion): `brand/` (tokens, logo, charm rig), `motion/` (the bible's verified kit), `components/` (sticker UI, the card, `ui/` app screens), `illustration/` (hands, card back/flip, props), `scenes/` (H0 cold open, H1…E1), `transitions.ts` (the peels and the Night blind) |
| `video/public/v2/intro/` | The cold open's material: `plates/` (processed captures + `plates.json`), `g1/` (the generated photo), `audio/` (music bed, chorus), `raw/` (unprocessed captures and clips) |
| `tools/audio-v3/` | Voice (config: `VOICE`), timeline and music for the 2.0 film: `node tools/audio-v3/run.mjs` (v3 takes and score backed up in `_v3/`); the cold open's chorus, music bed and bridge line: `intro-chorus.mjs`, `intro-m0.mjs`, `intro-bridge.mjs` |
| `tools/sfx2/` | The 2.0 SFX library (32 effects) |

Render + master: `ENTRY=src2/index.ts NAME=satchel-2 tools/render-master.sh v6` → `out/satchel-2-v6.mp4` (uses Remotion port 3490; set `PORT=` if busy).
- The cold open renders with `--gl=angle`, because its WebGL effects need the GPU.
- The body renders separately with the default renderer.
- The two parts are joined frame- and sample-exact.
- `SKIP_RENDER=1` re-joins and re-masters existing parts.
- `ONLY_H0=1` renders the cold open again and reuses the body part. Copy the previous tag's
  `video/out/<name>-<tag>-body.mp4` to the new tag first. This is valid only if nothing outside `src2/scenes/H0`
  changed since that body was rendered.
The v2 source is in git history (`marketing/video/src2` at commit c74a089).
Preview a scene: `cd video && npx remotion studio src2/index.ts` (compositions `Main` = cold open + body, `Body`, `H0`…`E1`, galleries under Dev).

---

## Previous: the brand 1.0 film (leather and brass)
`out/satchel-hypermotion-v5.mp4` (current, script v2): 134 s, 1920×1080, 30 fps, H.264 + AAC 320 kbps, −14 LUFS / −1 dBTP. Needs X Premium (over the 2:20 non-Premium limit).

Structure: hook (0:00) → the wallet: mint, fund, spend, no seed phrase, transfer (0:08) → use cases (0:44) → the catch (0:56) → logo (1:12) → the tech: plain transfers only, record first, signing paused while listed, browser clean-history check, blocked case, no admin key (1:16) → handoff (1:52) → end card (2:02).
Older cuts: v3 = script v1 with mainnet wording (104 s), v2 = script v1 with testnet wording.

| Folder | What |
|---|---|
| `script/SCRIPT.md` | Locked script: VO lines L01–L19, scenes S01–S09, art direction, sound plan |
| `script/SCENE-BRIEF.md`, `script/timeline.md` | Scene builders' brief; the timed scene/VO table |
| `notes/` | Research: `hypermotion-cookbook.md`, `concepts.md` (3 treatments), `tools.md` (verified API facts), `ui-capture.md` |
| `tools/` | Generators (Node, built-ins only). Keys come from `marketing/.env` via `tools/lib/env.mjs`, never printed |
| `video/` | Remotion 4.0.537 project (`npm install`, then `npx remotion studio`) |

## Regenerate
- **Voice + timeline + music:** `node tools/audio/run.mjs` (voice and model in `tools/audio/config.mjs`; currently Brian on `eleven_v4`). Scenes re-time themselves from `video/src/data/timeline.json`.
- **SFX:** `tools/sfx/` · **Images:** `tools/images/` (`gpt-image-2.5-flare` / `-sunburst`) · **App screenshots:** `tools/capture/capture.mjs` (fixture mode); `tools/capture/mainnet-capture.mjs` re-captures the two shots used in S07 with mainnet wording.

## Render + master
`tools/render-master.sh v4` renders `Main` and masters it (limiter + two-pass loudnorm, −14 LUFS / −1 dBTP) to `out/satchel-hypermotion-v4.mp4`.
Each scene is also its own composition (`S01`…`S09`) with its slice of the audio, for previews.

## Facts to keep true
On-screen wording is mainnet-style (`.near` accounts, `bc1q…`, plain chain names) by design decision, although the product ships on testnet first; no fiat values; Satchel #3 sells for 5.00 USDC; the browser (not the contract) runs the clean-history check;
the buy is bound to the record count; never "trustless". Block numbers, tx hashes and some row addresses in S07 are illustrative.
