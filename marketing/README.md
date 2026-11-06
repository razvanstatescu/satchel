# Satchel videos

> **Not product code.** This folder holds the sources of the submission's demo video: script, Remotion scenes, audio
> and image generators, and research notes. The product is in `contracts/`, `packages/` and `apps/`; start at the
> root [`README.md`](../README.md). On-screen wording in the video is mainnet-style by design (see "Facts to keep
> true" below); the product runs on testnet only. Rendered videos go to `out/`, which is not committed; the
> published video is linked from the submission's X post.

## Current: Satchel 2.0 film "Hand it over", v4 (2026-11-03)
`out/satchel-2-v4.mp4`: 133 s (2:13), 1920×1080, 30 fps, H.264 + AAC 320 kbps, −14 LUFS / −1 dBTP. Needs X Premium.
v4 updates v2 (`out/satchel-2-v2.mp4`, 2:14) after the feature sprint, keeping v2's design, motion and sound
(`script/SCRIPT-v4.md` says what changed and why): every claim checked against `docs/design/site-refresh/facts.md` and
D-50…D-52; the value card (≈ $8,000.00, value bar, coin shares, as on the landing); prices in NEAR; and the new
features: USDC and L2s (P2), Let someone spend (P4), Give by link (P5), Make an offer (P6, and "Buy and offers stay
off" in T6), messages ("Readable requests only.", T3), and an end-card row with all five landing features
(Make an offer · Give by link · Let someone spend · USDC and L2s · Take it all out). Narrator: Sarah (`eleven_v4`).
Mainnet-style wording on screen, like the landing (D-52).

Structure: hook (0:00) → one NFT (0:03) → mint (0:12) → fill, USDC too (0:18) → send on all three (0:26) → no seed
phrase, only you or who you allow (0:35) → give, even by link (0:43) → one trade or an offer; a treasury (0:52) → the
catch, in Night (0:59) → "Satchel keeps the receipts" (1:12) → recorded first (1:16) → no admin key (1:22) → readable
requests only (1:28) → paused for sale (1:36) → the browser check (1:41) → blocked #4 (1:50) → the hand-off (1:56) →
end card (2:06).

| Where | What |
|---|---|
| `brand-v2/` | The Satchel 2.0 brand pack (zip contents + the design system README/tokens + the brand canvas boards) |
| `script/SCRIPT-v3.md`, `script/SCENE-BRIEF-v3.md`, `script/timeline-v3.md` | Locked script + amendments, the builders' brief, the timed table |
| `notes/concepts-v2.md`, `notes/brand2-motion-bible.md` | The three treatments + production script ("Hand it over"); the motion language with exact numbers |
| `video/src2/` | The 2.0 film (Remotion): `brand/` (tokens, logo, charm rig), `motion/` (the bible's verified kit), `components/` (sticker UI, the card, `ui/` app screens), `illustration/` (hands, card back/flip, props), `scenes/` (H1…E1), `transitions.ts` (the two peels) |
| `tools/audio-v3/` | Voice (config: `VOICE`), timeline and music for the 2.0 film: `node tools/audio-v3/run.mjs` (v3 takes and score backed up in `_v3/`) |
| `tools/sfx2/` | The 2.0 SFX library (32 effects) |

Render + master: `ENTRY=src2/index.ts NAME=satchel-2 tools/render-master.sh v5` → `out/satchel-2-v5.mp4` (uses Remotion port 3490; set `PORT=` if busy).
The v2 source is in git history (`marketing/video/src2` at commit c74a089).
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
