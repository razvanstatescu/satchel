# Satchel 2.0 film — "Hand it over" — locked script v3

Source of truth: `marketing/notes/concepts-v2.md` §4 (world bible §4.1, VO §4.2, scenes §4.3, the first 5 seconds frame by
frame §4.4, end card §4.5, music and sound §4.6, risks §4.7, fact check §4.8). This file locks it, with the director's
amendments below (they win over concepts-v2 where they differ). Brand: `marketing/brand-v2/` (DESIGN-SYSTEM-README.md,
tokens.json, logos, charms). Motion language: `marketing/notes/brand2-motion-bible.md`.

Film: 1920×1080, 30 fps, ≈2:12, Day ground (Night only for the catch C1), 120 BPM grid. Code: `marketing/video/src2/`.

## Director's amendments
- **A1 Price.** Satchel #7 is listed for **4,750.00 USDC** (not 250.00) everywhere: the T4 price tag, T5 "Buy for
  4,750.00 USDC", T7's bound tag and the coin flying to bob. (A 250 USDC price for 0.0412 BTC · 0.85 ETH · 12.4 SOL reads as
  absurd in a mainnet-styled film.)
- **A2 OTC vignette (P6b).** The heavy Satchel shows **1.20 BTC · 18 ETH · 300 SOL**; the money side is a USDC stack sticker
  with **no number**. Caption "One trade. Whole position."
- **A3 Charms never vocalise.** No giggles, cheers or character voices: they emote with motion and faces only; sounds are
  SFX (jingle, sparkle, marimba, pop).
- **A4 No custom card names.** Bands always read "Satchel #N". "Team treasury" is a label outside the card (a sticker tag or
  caption), never on the band. Treasury card: Satchel #21. Gift card: Satchel #12. Blocked: Satchel #4. Hero: Satchel #7.
- **A5 End card footer:** "Built on NEAR Chain Signatures · NEAR HACKATHON 2026" (no URL placeholder).
- **A6 Wording on screen is mainnet-style** (`alice.near`, `bob.near`, `carol.near`, `sam.near`, `satchel.satchelhq.near`,
  `bc1q…`, plain chain names). Never "testnet", "Sepolia", "devnet", "faucet". No fiat ($) anywhere. Never "every chain".
  App copy: "Give" (not Transfer), "Paused for sale", "Usually about 10 seconds", "Satchel #7 is yours.".
- **A7 Logo rules** (brand): never rotate or tilt the S/mark, never put it on coral, never drop its outline or shadow in the
  finished state, never give the S a face, wordmark always lowercase. Captions may tilt ±2°; the logo never does.

## Voiceover (ids stable; the pipeline re-times from the voiced files)
| id | line | scene |
|---|---|---|
| V01 | Stick it on. | H1 |
| V02 | Hand it over. | H1 |
| V03 | Native Bitcoin, Ethereum and Solana, in one NFT. | H2 |
| V04 | Whoever holds the Satchel holds everything inside. | H2 |
| V05 | Mint one on NEAR, and it gets its own Bitcoin, Ethereum and Solana addresses. | P1 |
| V06 | Fill it from any wallet or exchange, straight to its addresses. | P2 |
| V07 | Then send from it, on all three chains. | P3 |
| V08 | Approve in your NEAR wallet, and NEAR Chain Signatures signs a native transaction. | P3 |
| V09 | There's no seed phrase to copy. The contract signs only for the holder. | P4 |
| V10 | Give it to a friend, and everything inside goes with it. No bridge. No wrapped tokens. | P5 |
| V11 | Gift a funded wallet. | P6 |
| V12 | Sell a whole position in one trade. | P6 |
| V13 | Hand a treasury to the next team. | P6 |
| V14 | But there's a catch. | C1 |
| V15 | A signature made before the sale can still be used after it. | C1 |
| V16 | So how does a buyer know it's clean? | C1 |
| V17 | Satchel keeps the receipts. | T0 |
| V18 | Every signature goes on the record, on NEAR, before NEAR's signer network makes it. | T1 |
| V19 | And there's no admin key. Not even ours. So it can't sign anything off the record. | T2 |
| V20 | It only signs plain transfers it can read, so each one can be checked later. | T3 |
| V21 | List it, and signing pauses. The history stops growing. | T4 |
| V22 | Then the buyer's browser checks every record against each chain. | T5 |
| V23 | Nonce used. Coin spent. Blockhash expired. | T5 |
| V24 | If one old signature could still move coins, Buy stays off. | T6 |
| V25 | When it's clean, one transaction, bound to that exact history, pays the seller, | T7 |
| V26 | and the buyer gets everything inside. | T7 |
| V27 | Satchel. Stick it on. Hand it over. | E1 |

## Scenes (order; targets from concepts-v2 §4.3)
H1 0:00–0:03.4 · H2 –0:10 · P1 Mint –0:16 · P2 Fill –0:22 · P3 Send –0:32 · P4 No seed phrase –0:38 · P5 Give –0:46 ·
P6 Use cases –0:58 · C1 The catch (Night) –1:12 · T0 The flip –1:16 · T1 On the record –1:22 · T2 No admin key –1:28.5 ·
T3 Plain transfers only –1:34.5 · T4 Paused for sale –1:38.5 · T5 The check –1:49.5 · T6 Blocked –1:54.5 ·
T7 The hand-off –2:04.5 · E1 End card –2:12.5.

## Numbers (keep consistent)
Fill: 0.0513 BTC · 0.90 ETH · 13.65 SOL. Sends: 0.0100 BTC · 0.05 ETH · 1.25 SOL. After: 0.0412 BTC · 0.85 ETH · 12.4 SOL
(Give sheet, sale, T7 "You now control …"). #7's history = exactly the three P3 sends → "History · 3 signatures" from T0 to
T7. Price 4,750.00 USDC. Blocked #4: `ETH · nonce 12 · Unused`.
