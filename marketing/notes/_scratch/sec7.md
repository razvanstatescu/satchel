## 7. Do / don't

**Brand (look)**
- DO: Day ground #f6f5fb, flat (Night only in C1). Ink #1d1340 for text, outlines and hard shadows. One coral fill per
  frame: the card band or the one primary button. Ink text on coral. Sky and lemon as small accents. Chain colours as
  dots, charm fills and plain coin stickers only.
- DO: put a 3k ink outline and a 4k hard ink shadow (no blur) on stickers, cards, primary buttons, charms and
  illustrations. Plain surfaces stay flat. Use radii 12/18/28/pill × k, and give the card the tile's 22% corner ratio.
- DO: type.
  - Funnel Display 800 for captions (110–160 px, sentence case), titles and amounts.
  - Onest for UI and supers.
  - Geist Mono only for accounts, addresses, hashes and record labels.
  - Tabular figures on amounts.
- DO: 2px-stroke line icons (Lucide at stroke 2 × k) in ink or the state colour. A status is always an icon or dot
  plus a word: Sent, **Paused for sale**, Needs attention, Clean history, Blocked.
- DON'T: white or coral text; lemon or sky text; a second coral fill; coral floods; coral confetti; a cream or warm
  ground; colour grading.
- DON'T: rotate or tilt the S or the mark, put it on coral, drop its outline or shadow once built, give the S a face,
  add a ring or hook, recolour the tile, or capitalise the wordmark (amendment A7). Captions may tilt ±2°; the logo
  never does.
- DON'T: put real chain logos inside the charms, give them brows, limbs or teeth, let them speak (A3), or add charms
  for other chains.
- DON'T: use brand 1.0 (leather, brass, the stitch, the Strap S, Bricolage, Instrument Sans, Spline Sans Mono, grain,
  vignette, light leaks) or the retired explorations (buddy, pouch, coin, keyring S).
- DON'T: use blur (DOF, glass, `backdrop-filter`), glows, gradients, gloss, bevels, glossy 3D, lens flares, RGB split
  or glitch. Motion blur is allowed only as `CameraMotionBlur` on whips of ≤ 0.4 s (samples ≤ 6), never on readable
  text; prefer the 2-frame smear.

**Motion**
- DO: accelerate into contact; squash 5–7% and hold 2 f; rebound; let the shadow catch up 1 f late. Land contacts on
  the beat or on the VO word, with the SFX on the contact frame.
- DO: every hand-off uses the swing (§2.6): lean 10°, then 10 → −4.9 → +2.4 → −1.2 over the 600 ms slide; charms at
  1.5×, 2–3 f late, eyes closed; the jingle at the apex; the slap on contact.
- DO: give the charms their personalities (BTC slow, ETH curious, SOL quick; reaction order SOL, ETH, BTC).
- DO: keep the **flip** (T0, T7) as the film's only 3D move. Night arrives by the blind (C1) and leaves by the flip
  (T0). Peel the frame twice (H2→P1, T7→E1).
- DO: keep text still while it is read and keep characters calm while text is on screen. Ration delight: at most 4
  sparkle bursts, 1 confetti and 3 thumps.
- DON'T: use slow, floaty ease-outs for objects (the frost slide-off is the one deliberate glide), Remotion's default
  spring or brand 1.0's `SPRING` presets for stickers, elastic easing, expo-out pivots for hanging things,
  perspective on anything but the flip, or opacity cross-fades between scenes.
- DON'T: count amounts up like a score (only P2's fill tags count, as scripted), idle-bob during reading, rotate the
  card for a "no" (shake it sideways), or move the camera sideways in a shake.

**Copy and accuracy** (SCRIPT-v3 amendments and §4.7 win; product facts beat the brand pack's sample copy)
- DO: names and addresses.
  - Mainnet-style wording on screen (A6): `alice.near`, `bob.near`, `carol.near`, `sam.near`,
    `satchel.satchelhq.near`.
  - Addresses: `bc1q…` (Bitcoin), `0x…` (Ethereum), base58 (Solana), all middle-truncated.
  - Plain chain names: Bitcoin, Ethereum, Solana.
- DO: "native Bitcoin, Ethereum and Solana" or "three chains"; "send on all three chains".
- DO: app copy.
  - "Give" (never "Transfer"), "Send", "List for sale", "Buy for 4,750.00 USDC" (A1), "**Paused for sale**".
  - "Signing with NEAR's signer network · **Usually about 10 seconds**", "Satchel #7 is yours.".
  - "Clean history", "Blocked: 1 unused signature", "Not the holder".
- DO: card bands always read "Satchel #N" (A4): #7 hero, #12 gift, #21 treasury, #4 blocked. "Team treasury" is a
  label outside the card. The OTC vignette shows 1.20 BTC · 18 ETH · 300 SOL and an unnumbered USDC stack (A2).
- DO: keep the mechanism true (§4.8 of concepts-v2):
  - every signature is recorded on NEAR before NEAR's signer network makes it;
  - there is no admin key ("Not even ours");
  - it signs only plain transfers it can read;
  - listing pauses signing;
  - **the buyer's browser** checks every record, and **the app** keeps Buy off;
  - the buy is one transaction bound to that exact history and pays the seller.
- DO: use the script's numbers exactly (fill 0.0513 · 0.90 · 13.65; sends 0.0100 · 0.05 · 1.25; after 0.0412 · 0.85 ·
  12.4; #4 `ETH · nonce 12 · Unused`), in tabular figures. Block numbers and hashes are illustrative and must look
  real-format.
- DON'T: "testnet", "Sepolia", "devnet", "faucet", or `tb1q…` addresses on screen. Don't show the README's real
  testnet addresses.
- DON'T: "trustless"; "safe" (say "clean"); "real" (say "native"); "spend it like any wallet" (Satchel refuses contract
  calls and approvals).
- DON'T: "every chain", "all chains" or "any chain". That includes the brand samples "The NFT that carries every
  chain" and "One NFT. Every chain inside."
- DON'T: fiat (no "$" anywhere, not even inside UI shots).
- DON'T: a wait or countdown after listing.
- DON'T: "Safe to buy in about 2 minutes".
- DON'T: plumbing words (MPC, derivation path, payload, Tgas, yoctoNEAR, yield/resume, domain_id, cooldown_blocks,
  freeze flag, ERR_FROZEN). "NEAR Chain Signatures" and "NEAR's signer network" are fine.

**Remotion and render**
- DO: drive everything from `useCurrentFrame()`, and choreograph against VO times (`getScene(...).line()` and
  `.word()`), never hard-coded seconds. Only `random(seed)`, never `Math.random`.
- DO: use `<Img>` with `staticFile()`, premount `<Sequence>`s, and pass unique ids to any SVG `<mask>` or `<clipPath>`.
- DO: in `TransitionSeries`, draw effects in the *entering* wrapper (it renders on top), and remember that
  transitions shorten the timeline.
- DO: when clipping an element, pad the clip so its own outline and shadow survive (`Peel` does this). Skip
  zero-progress round-capped strokes. Animate font weight only on isolated words. Call `measureText` only once fonts
  are loaded. Put a swinging element's drop-shadow filter on a non-rotating wrapper.
- DO: render intermediate frames as PNG, or JPEG ≥ 95, and encode at CRF 16–18. Flat coral and ink edges show
  ringing and 4:2:0 bleed, so keep details ≥ 5 px.
- DON'T: CSS transitions or animations, Tailwind `animate-*`, CSS `background-image` assets, heavy full-frame filters
  on every frame, or the crossZoom, zoomBlur and linearBlur presentations (brief).

---

