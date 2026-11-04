# Satchel 2.0 film, "Hand it over": script v4 (update of v2 after the feature sprint)

Base: the v2 film (`marketing/out/satchel-2-v2.mp4`, code `marketing/video/src2/`, script `SCRIPT-v3.md` +
`notes/concepts-v2.md` §4). **Keep the v2 design, style, motion and sound exactly**: this is an update, not a redesign.
The v3 "real-app UI" pass was rejected and reverted: never reintroduce its bottom sheets or restyled screens.
Target length ≈ 2:11 (v2 was 2:14). Sources of truth for facts: `docs/design/site-refresh/facts.md`, D-50…D-52 in
`plan/decisions.md`, the updated landing (`/`), and the app (`apps/web`, read-only).

## Why v4
1. **No longer true in v2:** V09 "The contract signs only for the holder." (allowances, C5); V20 + T3 caption "Plain
   transfers only." (messages and USDC transfers, C2/C7); the mint list's "Only its holder can send from it"; sale and
   offer prices in USDC (D-51: sale and offer currencies say NEAR only).
2. **Behind:** the Satchel card. The app and the landing now lead with the value overview (D-50/D-52): "≈ $8,000.00",
   the value bar, coin chips with shares, the pill.
3. **Missing features** (the landing's "What else it does"): Make an offer (even if it's not for sale), Give by link
   (to someone not on NEAR yet), Let someone spend (daily caps, until it changes hands), USDC and L2s (Ethereum, Base,
   Arbitrum and Optimism; one address on all four), Take it all out (every coin to your wallets); plus signing messages
   (recorded; a message can't move coins).

## Presentation rules (unchanged from v2, plus D-51/D-52)
- The film presents the product the way the landing does (D-52): mainnet-style names (`alice.near`, `bc1q…`,
  "Ethereum, Base, Arbitrum and Optimism"), no "testnet", "Sepolia", "devnet", "at mainnet prices" or Testnet notes.
- Dollar figures: only the card's overview "≈ $X" (never in sends, offers or prices). Prices and offers are in **NEAR**.
- Never: "every chain", "trustless", "MPC", "delegate", "approval", automatic refunds, a wait after listing. Someone the
  owner lets spend can **only send coins, within daily caps** (never sign messages, list, give, sell or take coins out).
  Messages: Ethereum and Solana addresses only (not Bitcoin); a message can never move coins.

## The card (shared `SatchelCard`, all scenes): the value card
Same sticker body as v2 (ink outline, hard drop, coral band with "Satchel #N", lemon "Yours" when owned, the white S).
The body is the app's overview, landing-style (no "at mainnet prices" line): "≈ $8,000.00" (Funnel Display 800) with
the state pill beside it, the value bar (segments in the coins' colours, sticker outline), then the legend "BTC 50%
· ETH 25% · SOL 15% · +1". Coin icons are the app's faced coins (USDC is sky with a small network badge). Mint
preview keeps its address rows. Night variant per D-44 (#8A82AE outlines, #000 drop).

## Numbers (fixed prices: BTC $80,000 · ETH $2,500 · SOL $100 · USDC $1 · NEAR $4; same as the landing sample)
| Moment | Satchel #7 holds | Card |
|---|---|---|
| Hook, Give, sale, hand-off (after the sends) | 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC | ≈ $8,000.00 · BTC 50% · ETH 25% · SOL 15% · +1 (USDC 10%) |
| P1 just minted | nothing | "Nothing inside yet" |
| P2 after filling | 0.06 BTC · 0.85 ETH · 13 SOL · 800 USDC (USDC arrives on Base) | ≈ $9,025.00 |
| P3 sends | 0.0100 BTC · 0.05 ETH · 1 SOL | back to ≈ $8,000.00 |
| Listing price (T4–T7) | 2,000 NEAR | — |
| C1 catch (unnamed Satchel) | slip "Send 0.80 ETH"; after the drain 0 ETH | ≈ $8,000.00 → ≈ $6,000.00 (ETH 0%) |
| T6 blocked #4 | 0.015 BTC · 0.40 ETH · 6.8 SOL | ≈ $2,880.00 · listed 720 NEAR |
| P6 OTC #30 | 1.20 BTC · 18 ETH · 300 SOL | ≈ $171,000.00 · offer "42,000 NEAR" |
History of #7: "3 signatures" (the three P3 sends), unchanged.

## Voiceover (✱ = new or changed in v4; unchanged lines keep their v2 audio files)
| id | line | scene |
|---|---|---|
| V01 | Stick it on. | H1 |
| V02 | Hand it over. | H1 |
| V03 | Native Bitcoin, Ethereum and Solana, in one NFT. | H2 |
| V04 | Whoever holds the Satchel holds everything inside. | H2 |
| V05 | Mint one on NEAR, and it gets its own Bitcoin, Ethereum and Solana addresses. | P1 |
| V06 ✱ | Fill it from any wallet or exchange. USDC too, on Ethereum, Base, Arbitrum or Optimism. | P2 |
| V07 | Then send from it, on all three chains. | P3 |
| V08 | Approve in your NEAR wallet, and NEAR Chain Signatures signs a native transaction. | P3 |
| V09 ✱ | There's no seed phrase to copy. Only the holder can send, or someone they allow, within daily limits. | P4 |
| V10 ✱ | Give it to a friend, even one who isn't on NEAR yet. Everything inside goes with it. No bridge. No wrapped tokens. | P5 |
| V11 | (cut: the gift is now P5) | — |
| V12 ✱ | Sell a whole position in one trade, or take an offer. | P6 |
| V13 | Hand a treasury to the next team. | P6 |
| V14 | But there's a catch. | C1 |
| V15 | A signature made before the sale can still be used after it. | C1 |
| V16 | So how does a buyer know it's clean? | C1 |
| V17 | Satchel keeps the receipts. | T0 |
| V18 | Every signature goes on the record, on NEAR, before NEAR's signer network makes it. | T1 |
| V19 | And there's no admin key. Not even ours. So it can't sign anything off the record. | T2 |
| V20 ✱ | It only signs what it can read, transfers and messages, so each one can be checked later. | T3 |
| V21 | List it, and signing pauses. The history stops growing. | T4 |
| V22 | Then the buyer's browser checks every record against each chain. | T5 |
| V23 | Nonce used. Coin spent. Blockhash expired. | T5 |
| V24 ✱ | If one old signature could still move coins, Buy and offers stay off. | T6 |
| V25 | When it's clean, one transaction, bound to that exact history, pays the seller, | T7 |
| V26 | and the buyer gets everything inside. | T7 |
| V27 | Satchel. Stick it on. Hand it over. | E1 |

## Scenes (targets; the timeline is rebuilt from the voice on the 120 BPM grid)
| id | target | what changes vs v2 (everything else stays) |
|---|---|---|
| H1 | 3.0 | Card → value card (≈ $8,000.00). |
| H2 | 8.5 | V04 starts ≈ 0.5 s earlier; value card. |
| P1 Mint | 6.0 | Mint list line → "Its owner decides who can move the coins" (app copy). Minted card "Nothing inside yet". |
| P2 Fill | 7.0 | New V06. After BTC/ETH/SOL coins are gulped as in v2, on "USDC too": a USDC coin (sky, faced, "B" Base badge) arrives at the ETH charm, and a small sticker "One address on all four · Ethereum · Base · Arbitrum · Optimism" (landing bento art) slaps beside the ETH tag; the card counts to ≈ $9,025.00. Captions: "Fill it up." → "USDC too. Four networks." |
| P3 Send | 8.5 | Numbers (0.0100 BTC · 0.05 ETH · 1 SOL; after: 0.0500 BTC). Card counts back to ≈ $8,000.00. Tighter by 0.5 s. |
| P4 | 8.0 | New V09. Keep the seed-note gag and the stranger bouncing ("Not allowed"). New beat on "someone they allow, within daily limits": a second hand (a teammate, new sleeve + tag `sam.near`) holding a small "Who can spend" sticker (landing bento: avatar, "Daily caps", bar "0.20 of 0.50 ETH left today", Revoke) taps Send and it passes (✓ "Sent 0.05 ETH", within the cap). Captions: "No seed phrase." → "Only you, or who you allow." |
| P5 Give | 9.0 | New V10. Keep the Give sheet press and THE SWING to bob. On "even one who isn't on NEAR yet": a "Give by link" sticker (landing bento: "The claim link · /claim#•••• · Copy link", lemon "Claimed" badge) slaps in beside the swing. Captions: "Everything inside goes too." → "Even by link." → "No bridge. No wrapped tokens." |
| P6 Use cases | 8.0 | Two vignettes on downbeats (the gift vignette is cut): (a) V12: OTC #30 ≈ $171,000.00 swings right while an offer sticker ("Your offer · 42,000 NEAR · Expires in 7 days · ✓ Clean history", landing bento art) slides left and is accepted (✓ "Accept"); replaces the USDC stack. Captions "One trade. Whole position." → "Or take an offer." (b) V13 treasury relay as v2. End on the two cards swinging in sync. |
| C1 | 12.5 | Tighter drain gap (−1.5 s). Night value card; slip "Send 0.80 ETH"; the drain rolls the total ≈ $8,000.00 → ≈ $6,000.00 and the ETH chip to 0%. |
| T0 | 4.0 | Retime only. |
| T1 | 6.0 | Retime only. |
| T2 | 6.5 | Retime only. |
| T3 | 6.5 | New V20. Caption → "Readable requests only." Requests: "Send 0.01 BTC → bc1q…" passes (outline); **"Sign a message: 'Log in to …'" passes** and gets an outline marked "Message"; "Raw hash 0x8cb1…", "Approve unlimited tokens", "Durable nonce" bounce as in v2. |
| T4 | 5.0 | Price tag "2,000 NEAR". |
| T5 | 10.5 | "Buy for 2,000 NEAR"; "Paid in NEAR"; You get adds 800 USDC. |
| T6 | 6.0 | New V24. #4 ≈ $2,880.00 · 720 NEAR; besides the greyed Buy, a greyed "Make an offer" with the same blocked reason. Caption "Blocked: 1 unused signature" (keep). |
| T7 | 10.0 | "Buy for 2,000 NEAR"; tag "2,000 NEAR · bound to 3 signatures"; "You now control 0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC." |
| E1 | 6.5 | Keep lockup + "Stick it on. Hand it over." Add a row of five sticker chips (slap in on half-beats): "Make an offer" · "Give by link" · "Let someone spend" · "USDC and L2s" · "Take it all out". Footer as v2. Silence in the last 0.5 s. |
Estimated total ≈ 131 s.
