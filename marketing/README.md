# Satchel videos

> **Not product code.** This folder holds the sources of the submission's demo video: script, Remotion scenes, audio
> and image generators, and research notes. The product is in `contracts/`, `packages/` and `apps/`; start at the
> root [`README.md`](../README.md). On-screen wording in the video is mainnet-style by design (see "Facts to keep
> true" below); the product runs on testnet only. Rendered videos go to `out/`, which is not committed; the
> published video is linked from the submission's X post.

## Current: Satchel 2.0 film "Hand it over" (brand 2.0, the sticker brand)
`out/satchel-2-v2.mp4`: 134 s (2:14), 1920×1080, 30 fps, H.264 + AAC 320 kbps, −14 LUFS / −1 dBTP. At 2:14 it fits X's 2:20
limit for accounts without Premium. Narrator: Sarah (ElevenLabs `eleven_v4`). Mainnet-style wording on screen. The Satchel card matches the app's 2.0 card
(charm ledger, "Yours" sticker; D-44), and Night stickers use #8A82AE outlines.

Structure: hook "Stick it on. Hand it over." (0:00) → one NFT, three chains (0:03) → mint (0:12) → add coins (0:18) →
send on all three (0:24) → no seed phrase (0:33) → give (0:38) → use cases: gift, OTC position, treasury (0:46) → the catch,
in Night (0:58) → "Satchel keeps the receipts" flip (1:12) → recorded first (1:16) → no admin key, not even ours (1:22) →
plain transfers only (1:28) → paused for sale (1:34) → the browser check with stamps (1:39) → blocked #4 (1:50) → the
one-transaction hand-off (1:56) → end card (2:06).

| Where | What |
|---|---|
| `brand-v2/` | The Satchel 2.0 brand pack (zip contents + the design system README/tokens + the brand canvas boards) |
| `script/SCRIPT-v3.md`, `script/SCENE-BRIEF-v3.md`, `script/timeline-v3.md` | Locked script + amendments, the builders' brief, the timed table |
| `notes/concepts-v2.md`, `notes/brand2-motion-bible.md` | The three treatments + production script ("Hand it over"); the motion language with exact numbers |
| `video/src2/` | The 2.0 film (Remotion): `brand/` (tokens, logo, charm rig), `motion/` (the bible's verified kit), `components/` (sticker UI, the card, `ui/` app screens), `illustration/` (hands, card back/flip, props), `scenes/` (H1…E1), `transitions.ts` (the two peels) |
| `tools/audio-v3/` | Voice (config: `VOICE`), timeline and music for the 2.0 film: `node tools/audio-v3/run.mjs` |
| `tools/sfx2/` | The 2.0 SFX library (32 effects) |

Render + master: `ENTRY=src2/index.ts NAME=satchel-2 tools/render-master.sh v3` → `out/satchel-2-v3.mp4`.
Preview a scene: `cd video && npx remotion studio src2/index.ts` (compositions `Main`, `H1`…`E1`, galleries under Dev).

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
