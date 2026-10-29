# Satchel — hypermotion demo video: script v2 (rebalanced: the wallet first, then the tech)

Audience: NEAR HACKATHON judges (crypto-native founders and VCs) watching on X (Premium account: no 2:20 cap), often
muted at first. Target ≈ 130 s (keep it under 2:30). 1920×1080, 30 fps. Night theme only.
Balance: about half the film is the user-facing product (what it is, mint, fund, spend, transfer, who it's for),
the other half the unique tech (the catch with handing over a used wallet, and how Satchel makes it safe).
Wording: mainnet-style everywhere on screen (`alice.near`, `satchel.satchelhq.near`, `bc1q…`, plain chain names;
never "testnet", "Sepolia", "devnet", "faucet"). No fiat amounts. Prices in USDC.
Never claim: trustless, "safe to buy in N blocks", on-chain enforcement of the clean-history check (the buyer's
browser runs it; Buy stays disabled until it passes; the buy is bound to the record count), features not built
(inheritance/timelocks, delegates, ERC-20/SPL tokens).

## Voiceover (one narrator, one file per line; ids are stable; ✱ = new or changed in v2)

| id | line | scene |
|---|---|---|
| L01 | A Bitcoin wallet. | S01 |
| L02 | An Ethereum wallet. | S01 |
| L03 | A Solana wallet. | S01 |
| L04 | It's all one NFT. | S01 |
| L20 ✱ | Mint a Satchel, and it comes with its own Bitcoin, Ethereum and Solana addresses. | W1 |
| L21 ✱ | Fund it from any wallet or exchange. Native coins, straight to its addresses. | W2 |
| L22 ✱ | Then spend it like any wallet. | W3 |
| L23 ✱ | Approve in your NEAR wallet, and NEAR Chain Signatures signs a native Bitcoin, Ethereum or Solana transaction. | W3 |
| L07 ✱ | There's no seed phrase to copy. The contract signs only for whoever owns the NFT. | S04 |
| L05 ✱ | Transfer the NFT, and the whole wallet goes with it. No bridge. No wrapped tokens. | S02 |
| L24 ✱ | Sell a whole position in one trade. | U1 |
| L25 ✱ | Gift a funded wallet. | U1 |
| L26 ✱ | Hand a treasury to the next team. | U1 |
| L08 | But a signature made before the sale… | S05 |
| L09 | …can still be used after it. | S05 |
| L10 | Sign it. Sell it. Broadcast it later. The coins are gone. | S05 |
| L11 | So how does a buyer know it's clean? | S05 |
| L12 ✱ | Satchel signs only plain transfers it can read, and records each one before NEAR's signer network signs it. | S07 |
| L13 | List it, and signing pauses. The history stops growing. | S07 |
| L14 | Then the buyer's browser checks every record against each chain. | S07 |
| L15 | Nonce used. Coin spent. Blockhash expired. | S07 |
| L16 | If one old signature could still move coins, Buy stays disabled. | S07 |
| L17 ✱ | And the contract has no admin key. Not even ours. | S07 |
| L18 | If it's clean, one transaction, bound to that exact history, pays the seller. | S08 |
| L19 ✱ | Satchel. One NFT. A wallet on every chain, safe to hand over. | S09 |

Dropped from v1: L06 ("Selling a wallet used to mean selling a seed phrase…"); its idea now lives in L07 and S04's
opening seed-phrase visual.

## Scene order and beats (targets; final timing comes from the VO, snapped to the 120 BPM grid)

**ACT 1 · WHAT IT IS**
- **S01 Hook (≈0:00–0:08)** — unchanged: three wallet panels whip past with Satchel #1's real addresses; stitches sew
  them onto one card; "This NFT is a wallet."

**ACT 2 · THE WALLET (the user-facing product)**
- **W1 Mint (≈6 s, L20)** — from S01's card: a stitched mint preview ("New Satchel", the stitch = yours) → "Minting on
  NEAR" → the card becomes "Satchel #8" and its three addresses derive and type out (bc1q… / 0x… / Solana base58), each
  with its chain mark. Small chips: "Standard NEAR NFT · any NEAR wallet". Product copy: "Mint a Satchel",
  "Satchel #8 is yours.". Text: "Mint one. Three addresses."
- **W2 Fund (≈6 s, L21)** — the Receive view: a QR + "This Satchel's Bitcoin address" + Copy; deposits land from
  outside (an exchange/wallet icon, never a real brand): BTC, ETH, SOL rows go "+0.0123 BTC · in mempool" → "Received",
  the card's chips count up. Text: "Fund it from anywhere."
- **W3 Spend (≈10 s, L22–L23)** — the Send flow, fast and real: amount "0.0100 BTC" → the review (OutcomeCard: From
  Satchel #1 −0.01000282 BTC · To bc1q… +0.0100 BTC · network fee) → "Send 0.0100 BTC" → a NEUTRAL "Your NEAR wallet"
  approval sheet (no real wallet brand) → the SigningProgress tracker: Approved in your wallet ✓ → Signing with NEAR's
  signer network (pulsing frozen step, timer 0:06) → Broadcast to Bitcoin ✓ → "Sent 0.0100 BTC · in mempool".
  Then a 1-second triple flash of the same header for "Send 0.0500 ETH" and "Send 1.25 SOL" so "any chain" lands.
  Text: "Spend on any chain."
- **S04 No seed phrase · only the owner signs (≈7 s, L07)** — opens on S03's seed-phrase paper with copies
  multiplying (≈2 s, "There's no seed phrase to copy"), burns away, then the owner/mallory diagram: alice.near's
  request is signed, mallory.near's bounces ("Not the owner"). Text: "No seed phrase." → "Only the owner signs."
- **S02 Transfer (≈6 s, L05)** — the card hands over alice.near → bob.near; the stitch moves to bob. Text:
  "Transfer the NFT." → "The wallet goes with it." → "No bridge." "No wrapped tokens."

**ACT 3 · WHO IT'S FOR**
- **U1 Use cases (≈12 s, L24–L26)** — three vignettes, each ≈3.5 s, a photo plate + a big line + a small data overlay
  (the Satchel card doing that job):
  1. "Sell a position." — OTC: one Satchel holding "0.40 BTC · 2.00 ETH" listed for "25,000 USDC" → "One trade."
  2. "Gift a wallet." — a funded Satchel handed to "sam.near"; the stitch sews onto sam's card.
  3. "Hand over a treasury." — "Team treasury" Satchel → "ops-lead.near".
  End on a quick triptych of the three.

**ACT 4 · THE CATCH**
- **S05 The hole (≈16 s, L08–L11)** — unchanged: "But…" (brass flood), the signed slip goes into the seller's pocket,
  the sale, "Sign it. Sell it. Broadcast it later.", the coins drain, "Is it clean?"

**ACT 5 · HOW SATCHEL MAKES IT SAFE (the unique tech)**
- **S06 Turn (4 s, no VO)** — unchanged: the logo builds; the music drops as the wordmark lands.
- **S07 Solution (≈36 s)**
  - a (L12) ✱: a request that isn't a plain transfer bounces first — "Raw hash · refused", "Token approval · refused"
    (danger, quick) — then a plain transfer passes and the ledger writes the record FIRST, then "Signed by NEAR's
    signer network". Text: "Plain transfers only." → "Recorded before it's signed."
  - b (L13): Listed → "Signing paused while listed", the signature count locks.
  - c (L14–L15): the real sale page (mainnet capture) → the Clean History panel; rows resolve on "Nonce used. Coin
    spent. Blockhash expired."; "Clean. No past signature can move these coins."; Buy lights.
  - d (L16): Satchel #4 "Blocked: 1 unused signature", Buy disabled.
  - e (L17) ✱: headline "No admin key. Not even ours." over the empty brass hooks; facts "satchel.satchelhq.near ·
    Access keys: 0 · Born in one transaction · AddKey actions: 0" beside the real contract page.
- **S08 Handoff (≈10 s, L18)** — unchanged: Buy for 5.00 USDC → "One transaction." → the card slides to carol.near,
  the stitch sews on, "Satchel #3 is yours."

**CLOSE**
- **S09 End card (≈10 s, L19 ✱)** — the lockup, "An NFT that is a wallet on every chain.", "Built on NEAR Chain
  Signatures · NEAR HACKATHON 2026".

## Art direction (unchanged)
Photographic, tactile, crafted: dark tanned leather, brass, saddle stitching, aged paper; one warm key light from the
upper left; deep shadows; shallow depth of field; fine grain; palette locked to the brand. No text, logos or faces in
images. Never neon, cyberpunk, glowing coins, lasers, matrix rain, or glows on the logo.

## Sound
- Music: one track from a composition plan matching the v2 scene timings: Hook (punchy) → the wallet act (bright,
  confident groove that builds) → use cases (lifted, warmest point) → the catch (sudden dark turn, tension,
  near-silence + one sub hit) → the logo (riser → DROP as the wordmark lands) → the solution (driving, warm) → the
  handoff (lift, hit as the stitch lands) → outro (resolve, clean ending).
- SFX: the shared library (`video/src/data/sfx.json`), placed per scene.
- Mix: VO on top, music ducked ≈13 dB under VO, master −14 LUFS / −1 dBTP (`tools/render-master.sh`).
