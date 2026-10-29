# Visual language, the SatchelCard and the judge-facing landing: Mobbin references
> Owner: ux-visual (design-reference team) · Checked: 2026-10-21 · Input to the kb/80 + kb/81 merge · Confidence: high for what the cited screens show (read from the returned images); medium for pixel sizes, which are read off downscaled previews and marked ≈ (scaled to a 390 pt phone or a 1440 px page); numbers marked **[VERIFIED]** were computed (method in §Method).

Every claim about an app links to the Mobbin screen, flow or section it comes from. "Maps to" names the kb/80 or kb/81 section that a finding changes. No images were downloaded.

## 1. Summary: the 8 strongest patterns to adopt

1. **The card face carries identity, not data.** Premium card faces use a four-corner layout and keep the centre for material only. Apple Card puts nothing but marks on its face and shows the balance in tiles below ([Apple Wallet, Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179)). Revolut shows a type pill and the last 4 digits ([Revolut, card details flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764)). Altitude and Slash put a wordmark and a network mark on pure material ([Altitude](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c)). **For Satchel:** take the balances and the flip button off the in-app card face. The face then matches the P1 static NFT art, so it is the same artwork everywhere. The balances sit directly under the card.
2. **A state is a change of material.** Revolut covers a frozen card in a frost texture and tints the page to match ([Revolut, card detail flow](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1)). Mercury fades a frozen card and labels it "Frozen" ([Mercury web](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168)). Apple Wallet fills the card slot with a field of dots that resolves into the card art ([Apple Wallet, adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57)). **For Satchel:** "Listed · cooling down" gets a frost layer, "For sale" clears it and stamps a hallmark, and Mint "materialises" from the token's own grain.
3. **Ambient colour comes from the object.** Revolut tints the page behind the card with the card's hue (same flow as above). Phantom's dark hero lifts its single accent into a radial glow ([Phantom](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9)). Rainbow's identity colour drives the actions ([Rainbow](https://mobbin.com/screens/5ff84636-17c3-49fe-8ed7-4f7138c61351)). **For Satchel:** put an alloy glow behind the card, capped at 14% alpha. At that cap `--fg-muted` is still at least 5.30:1 for every token id **[VERIFIED]**.
4. **Primary buttons are a near-white pill; the metal belongs to the card.** Revolut, DICE, Slash, Linear and Phantom all use a flat light pill on dark ([Revolut](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [DICE](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c), [Linear](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c)). The only metallic-gradient CTA found was a food-delivery membership upsell ([Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b)). **For Satchel:** flatten the silver from a lightness span of 0.165 to 0.056 and make it a pill. Use it only for "commit" buttons.
5. **Depth comes from fills on mobile and hairlines on desktop.** Phantom and Revolut use borderless raised tiles on black ([Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Revolut settings](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5)). Linear, Attio, OpenSea, Fey and Public use faint hairlines ([Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Fey](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd)). **For Satchel:** add a translucent `--hairline` (8% white, 1.19–1.28:1) to replace most uses of `--line`, which measures 1.65–1.88:1.
6. **Two caps voices: one stamped, one machine.** Small tracked caps show up on premium cards and fintech labels ([CRED](https://mobbin.com/screens/121f46b0-acdc-4bb6-8114-50625032a7b1), [Solflare](https://mobbin.com/screens/dfcba35c-fa88-4f56-a155-21020ed02d13)). Mono caps label data in crypto and dev-tool UIs ([OpenSea item](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Linear](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4)). **For Satchel:** keep Archivo-expanded `engrave` for things stamped on metal. Add a JetBrains Mono caps `label` for data. Move the `display` H1 back to normal width: none of the premium heroes reviewed uses an extended face.
7. **Proof is a grid of claims, each with its evidence.** Public's "Secure by design" section is a hairline grid of six claims, each with a badge or a "Learn more" link ([Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f)). OpenSea's item page has a mono-labelled stat bar ([OpenSea](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c)). **For Satchel:** this is the visual form of the Facts `<dl>` and the proof strip, plus a desktop stat bar under the H1.
8. **Success is a sentence that restates the outcome.** Cash App shows a check and "You sent $1 to {name}", then Done and Receipt pills ([Cash App](https://mobbin.com/flows/05ec0cd3-c44f-46bb-b108-2dccf68de195)). Apple Pay shows a check and "Done" under the card ([Apple Wallet](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3)). Phantom confirms with a compact "Sent $1.00" pill at the top ([Phantom](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921)). **For Satchel:** this confirms the kb/80 handoff copy ("bob.testnet now controls…") and specifies the toast.

## 2. Per screen and component

Columns: what the screen actually shows → what to borrow → why it clears the quality bar.

### 2.1 SatchelCard face: anatomy, material and the "card number"
| Reference | What it shows | Borrow | Why it's high quality |
|---|---|---|---|
| [Apple Wallet: Apple Card detail](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) | Card spans the full width with ≈16 pt margins. The face has only the Apple logo top-left and the Mastercard mark bottom-right, over a soft radial gradient with a 1 px light rim. No name or number: the card number sits behind a separate "123" card icon in the top bar. Below: a 2×2 tile bento ("Card Balance US$12.94" ≈28 pt bold with "US$11,337.06 Available" in grey; "Payment Due"; "Yearly Activity" mini-bars; a "Pay Early" pill inside a tile), then "Latest Card Transactions" | Identity-only face; the number lives off the face; balance tiles directly under the card | The clearest hierarchy in the sample: one object, then the numbers. Large, high-contrast numbers |
| [Revolut: showing card details](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) | Purple virtual card: "General" top-left, a translucent "Multi-use virtual" pill top-right, "•• 9832" bottom-left, Mastercard bottom-right. Below, three round buttons (Show details / Freeze / Settings) with labels. After a code check, the **same face** shows "Card number" (with copy), "Expiry date" and "CVV" (with copy). The button flips to a filled "Hide details". No 3D flip | Four-corner anatomy; a status-like pill top-right; a short identifier bottom-left; reveal in place | Proven at scale; every revealed field has its own copy affordance |
| [Altitude: single card](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68) · [Slash: gold card](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) | Altitude: a black card with a fine **dot-matrix (halftone) engraved mountain**, wordmark top-left, "VISA Signature Corporate" top-right. Slash: a gold card with grainy brushed metal and a hot specular bloom, wordmark top-left, VISA bottom-right | Material carries identity. A fine engraved texture (halftone or grain) reads as more premium than visible stripes | Photo-real material, very little text, strong restraint |
| [Mercury web: card inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) | Minimal face: chip outline, "•••• •••• •••• 9932", masked Exp/CVC, network logo, a small circular **guilloché emblem** bottom-right. A "▸ Show details" disclosure sits above the card | Masked identifier plus a disclosure; one small engraved emblem as the "security" detail | Calm, legible, finance-grade |

How premium apps show a "card number":

| Pattern | Seen in | Use for Satchel |
|---|---|---|
| Not on the face; a separate number view | [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) | — |
| Last 4 on the face; full details revealed in place, each with copy | [Revolut](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) | The serial `№ 0001` is the "last 4" and stays engraved top-left |
| Masked pattern plus "Show details"; number in a sheet with copy rows | [Mercury iOS](https://mobbin.com/screens/491a3626-9d82-43c5-a9e4-b396b66a81de), [Airwallex](https://mobbin.com/screens/5f6c8b6a-6d4d-45ed-acce-7befa64a7764) (mid-tier app; cited only for its engraved "VIRTUAL" caps label) | Addresses are public, so they need no masking. They live in full in the ChainRows with copy and QR, never printed on the face |

**Proposed in-app face (`lg`, 358×226), mapped to the card-industry corners:**
```
╭──────────────────────────────────────────────╮
│ SATCHEL № 0001                   [● Active]  │  TL: engrave 15/20 on --card-scrim (issuer-wordmark corner)
│ PATINA · TESTNET                             │      aria-hidden micro-engraving (like "Signature Corporate")
│                                              │  TR: StatusPill on --card-glass (Revolut "Virtual" pill corner)
│           material only: alloy gradient,     │
│           sheen, fine grain                  │  centre: nothing (Apple Card, Altitude, Slash)
│                                              │
│ [◉ alice.testnet]                 [₿ Ξ ◎]    │  BL: owner chip on glass (cardholder-name corner)
╰──────────────────────────────────────────────╯  BR: chain marks in --chain-*-fg on glass (network-mark corner)
```
Balances render directly under the card in the same `<figure>` (see 2.2), so the figure's text summary still says what it holds. The "balance plate" variant stays only where the card is seen alone: the OG image (kb/80 › OG) and the P2 dynamic SVG. **Maps to:** kb/80 › SatchelCard (Front, Back, States); kb/81 › Card glass and scrim (only small glass pills remain, so the contrast guarantee is unchanged).

### 2.2 Pairing the card with its balance and actions
| Reference | What it shows | Borrow |
|---|---|---|
| [Apple Card detail](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) | Card, then 2×2 tiles, then the transactions list | Numbers directly under the object, in a larger type than the card could fit |
| [Mercury web inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) | One narrow column: "Debit Card · $0.00 Spent today" with a progress bar, then the card, then a text-button row "Freeze · Transactions · More ⌄", then key-value rows (Daily spend limit ✎, Account link, Card type), then Billing address with copy | The column order for Satchel's desktop left panel: card → actions → facts |
| [Mercury iOS card](https://mobbin.com/screens/491a3626-9d82-43c5-a9e4-b396b66a81de) | Chip-buttons right under the card ("Number", "Apple Wallet", "Freeze") in a horizontal row | Actions attach to the card, not to a distant toolbar |
| [Revolut card](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) · [Rainbow home](https://mobbin.com/screens/d7c9913f-73b5-4684-b9ad-5e0adfdbe38d) · [Coinbase Wallet asset](https://mobbin.com/screens/35478b29-708e-438e-b580-19d5b2a09e9d) | 3–4 (Revolut, Rainbow) or 8 (Coinbase) equal-weight round icon buttons with 12–13 pt labels under the hero | Owner actions as equal-weight round buttons, at most 4 |

**For Satchel (mobile):** card, then the owner action row (Send · Fund · Transfer as 48 px circles: `--surface-3` fill, 20 px icon in `--fg`, `small` label in `--fg-2`), then the ChainRows, which become the holdings (balance + address + explorer). Visitors and judges get the ChainRows first, then **Fund this Satchel**. Silver appears only on the commit button inside a flow ("Send 0.0100 BTC", "Transfer to bob.testnet"). **Maps to:** kb/80 › Satchel page layout, Wallet tab, W1, Desktop.

### 2.3 Multiple cards: stack, carousel, thumbnails
| Reference | What it shows | Borrow |
|---|---|---|
| [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) | About 13 cards overlap, so only a ≈44–56 pt top strip of each shows. Each strip carries the issuer mark at left and sometimes a value at right ("Apple Cash $0.25"). Large-title "Wallet" with round glass buttons (+, search, more) | A stack where identity lives in the top strip: serial at left, StatusPill at right |
| [Apple Wallet: selected card](https://mobbin.com/screens/02e940a1-bcd1-4eaa-b064-a7c66fe0c1de) | The chosen card rises to mid-screen; the rest collapse into a 4-edge mini-stack at the bottom | Focus state for a stack |
| [Revolut home: Cards row](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) (screen 1) · [Apple Wallet settings list](https://mobbin.com/screens/d42ad951-70bf-4a3f-a5fd-94e0771bc74f) · [Phantom Cash sheet](https://mobbin.com/screens/23998a59-cff7-4166-9438-6741e841af50) | Mini card thumbnails (≈64×40 in Revolut; ≈44×28 in list rows) with a label and a "··2270" sub. Phantom puts an iridescent card thumbnail beside "Cash $2.59" | An `xs` thumbnail (alloy only, no text) for list rows: Activity, Market rows, account menu, Transfer review |
| [Revolut Metal picker](https://mobbin.com/screens/b1afe9c8-0913-42de-9640-399ff2780232) | Portrait card with neighbours peeking at both edges, a swatch row, "Metal plan required" caption, white pill CTA | A carousel with peeking neighbours if Market ever needs a mobile carousel (not recommended for P1) |

**Maps to:** kb/80 › Home `/` List: P2 polish adds an Apple-Wallet stack below 640 px; the grid stays the default. kb/80 › SatchelCard Sizes: add `xs` (48×30).

### 2.4 Card state as material: frozen/listed, for sale, mint
| Reference | What it shows | Borrow |
|---|---|---|
| [Revolut: card detail flow](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) | Normal: pink card over a **maroon page tint taken from the card**. Frozen: the card face shows an **ice-crystal frost texture**, the page tint turns slate-blue, and the primary round button becomes a filled blue "Unfreeze" with a snowflake | Frost as the "signing paused" material; page tint from the card |
| [Mercury web: frozen](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168) | Card face faded with "Frozen" at top-left; the list row gains a "Frozen" chip; "Unfreeze" becomes the filled primary pill | The state flips the primary action (Satchel: Delist for the owner) |
| [Apple Wallet: adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) | Dark "Card Details" step: the card slot is a **shimmering dot-noise field in card proportions**. Next step: "Adding Card ✓ · Your card has been added to Wallet." and the real card art (silver HSBC) replaces the noise | Mint reveal: the token's own grain materialises into its alloy |

Frost contrast check **[VERIFIED]**. The model mixes each stop 30% toward a grey of equal luminance, keeps the existing 16% specular, and adds a 6% white crystalline texture. The worst pixel across ids 1–100,000 is `#9FAEA2` (id 6110). On `--card-glass` every card text colour stays ≥ 5.41:1 (`--fg` 11.09, `--fg-2` 6.26, `--chain-sol-fg` 5.41, `--state-frozen` 7.87). White on `--card-scrim` is 6.03:1. Re-run `card_seed.mjs sweep` with the real frost layer once it is drawn. **Maps to:** kb/80 › SatchelCard States, Role × status matrix, Mint › Success, Motion spec; kb/81 › Card glass and scrim.

### 2.5 Reveal, flip and tilt
- Mobbin shows stills, so no tilt or 3D motion can be observed. Static evidence of "card as a 3D object": N26 floats a black card in perspective with a soft contact shadow ([N26](https://mobbin.com/screens/5625f7ff-340a-4902-a7b1-b030f27ba226)), and Slash lights an arc of metal cards from above ([Slash](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2)).
- Revolut's real "Show details" interaction is an **in-place reveal on the same face**, not a flip ([flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764)). kb/80 › Reference patterns attributes the flip to Revolut via a third-party shot. Correct that row.
- **For Satchel:** P1 drops the back face. The ChainRows already show full addresses with copy and QR, and no-JS judges see them. P2 polish is optional: "Show addresses" swaps the face's glass content in place (200 ms cross-fade + 4 px rise). Keep the fine-pointer tilt (±8°) as a decorative extra. **Maps to:** kb/80 › SatchelCard Back; Motion spec "Card flip" row.

### 2.6 Dark surface system: background, elevation, hairlines and accent
| Reference | What it shows | Borrow |
|---|---|---|
| [Phantom home](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) · [Phantom newer home](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) | True-black field. Raised tiles (≈ #1C1C1E, radius ≈16) with no borders or shadows. The newer build drops the per-row tiles: token rows sit flat on black. **One accent** (lavender) appears only on the active tab pill and the round "+" FAB. A floating search pill sits at the bottom | Depth by fill; a single accent used in at most two places |
| [Revolut card settings](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5) · [Revolut sheet](https://mobbin.com/screens/9e4d6fca-ab2a-49e6-8de0-6237d3bdce8a) | "Settings" large title. Grey section labels; each item is its own dark tile (radius ≈16) with a blue line icon, a white title and a grey sub. "Terminate card" is red text with a red icon. The sheet has a grabber, ≈24 pt radius and nested darker rows | Grouped tiles; destructive actions as red text on a neutral surface |
| [Revolut invest](https://mobbin.com/screens/120a13eb-491c-4172-8646-45dcca5a51c1) | Deep teal gradient field; translucent glass group card (radius ≈20); glass round actions | Glass for floating or grouped elements over a tinted field |
| [Public security grid](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) · [Fey web](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) · [Linear features](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4) | Near-black; structure from **very faint 1 px hairlines** (cell top borders, column dividers) rather than filled cards. Fey: chart and table in one bordered panel, tiny ticker logos, changes in tinted pills, a floating dock nav | Desktop panels use hairlines, not filled cards |

Accent usage across the sample: Phantom uses one brand accent sparingly. Rainbow drives its action buttons with the per-wallet identity colour ([Rainbow](https://mobbin.com/screens/5ff84636-17c3-49fe-8ed7-4f7138c61351)). Coinbase Wallet uses a blue→cyan gradient on primary actions ([Coinbase Wallet send](https://mobbin.com/screens/ab567bb4-0c5b-44f9-a76b-6f27f53617cb)). Revolut tints the page from the card. **For Satchel**, this resolves kb/81 Open question 3: silver for commit actions; the alloy accent for the glow behind the card, the 2 px NavTab indicator and the owner-avatar ring; no alloy-tinted buttons.

Computed **[VERIFIED]**:
- **Hairlines** of `rgb(255 255 255 / a)` composited on `--bg` / `--surface-1` / `--surface-2` / `--surface-3`:

  | Alpha | Ratio vs that surface |
  |---|---|
  | 6% | 1.13–1.19:1 |
  | 8% | 1.19–1.28:1 |
  | 10% | 1.26–1.36:1 |
  | 12% | 1.33–1.45:1 |

  For comparison, the current `--line` is 1.88 / 1.78 / 1.65:1 and `--line-subtle` is 1.37 / 1.29 / 1.20:1 on `--bg` / `--surface-1` / `--surface-2`.
- **Alloy glow:** the token accent at alpha `a` over `--bg`, worst case across ids 1–100,000:

  | Alpha | `--fg-muted` | `--fg-2` | `--link` | `--danger` |
  |---|---|---|---|---|
  | 0.10 | 5.78 | — | — | — |
  | 0.12 | 5.54 | — | — | — |
  | **0.14** | **5.30** | 7.98 | 8.70 | 6.12 |
  | 0.18 | 4.83 | — | — | — |
  | 0.24 | **4.13 (fails)** | — | — | — |

  Cap at 0.14, and recompute if the glow sits on a surface other than `--bg`.

**Maps to:** kb/81 › Neutrals, Shadows and elevation, Seeded identity colours, Open question 3.

### 2.7 Numbers: balance hero, units, decimals and rows
| Reference | What it shows | Borrow |
|---|---|---|
| [Phantom home](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) | "Account 2 ⌄" (grey) above "$2.07" (≈44 pt, bold, tight). Then "−$0.0222" in red and "−1.06%" in a **solid red pill**. Rows: icon 40, name 16/600, amount sub 14 grey; value 16 right-aligned with the change under it | Balance hero ≈2.7× body; secondary figures in a pill or a grey line |
| [Revolut invest](https://mobbin.com/screens/120a13eb-491c-4172-8646-45dcca5a51c1) · [Kraken Pro web](https://mobbin.com/screens/87cf22f4-48fa-474b-9ac1-ffe8eba368b1) · [Coinbase Wallet send](https://mobbin.com/screens/ab567bb4-0c5b-44f9-a76b-6f27f53617cb) | Revolut: "$2" large with ".71" smaller. Kraken: "11.65 USD" with the unit smaller. Coinbase: "1 USD" with "USD" in grey | **De-emphasise the unit**. Satchel's amounts are mostly decimals ("0.0123 BTC"), so shrink and dim the ticker, not the decimals |
| [Base home](https://mobbin.com/screens/638c39ce-9851-406d-8e42-4499884c49e4) · [Coinbase Wallet receipt](https://mobbin.com/screens/57d510d0-9948-4f98-a7f3-7f325d88fced) | Base: "$4.72" bold. Token icons carry a small **chain badge** bottom-right. Coinbase receipt: "SGD 13.00" grey above "0.00010375 BTC" large; key-value rows with no dividers; the full bc1 address wraps right-aligned; "Status ● Started" | Chain badge on asset icons; a key-value receipt without rules |
| [Public](https://mobbin.com/screens/7671322d-641f-4396-83a0-6748b0be9cfa) | Balance "$1.00" set in a **serif**; underline tabs; time-range chips; floating glass bottom nav | Evidence that a distinctive display face for the hero number is credible (see 2.8) |

**For Satchel:** add an `amount-hero` role (40/44 → 48/52) for single-amount moments: review total, success, Buy price. The ticker renders at 0.6 em (minimum 12 px), weight 500, `--fg-2`, after a thin space. Row amounts go to 16/22 at 600 to match the row name. Failed amounts are struck through with the word "Failed" ([Cash App activity](https://mobbin.com/flows/b76e4f79-e658-4f50-89da-e91b89d5fa05), [Apple Card declined rows](https://mobbin.com/screens/4c236223-264b-41bc-89ba-bee98aa99b49)). **Maps to:** kb/81 › Typography; kb/80 › Formatting, Timeline.

### 2.8 Typography and density: evaluation of Archivo + JetBrains Mono
What the sample does:
- **UI face:** a neutral, normal-width grotesque everywhere (Phantom, Coinbase, Revolut, Mercury, Linear, OpenSea): 600–700 for numbers and titles, 400–500 for body.
- **Display (landing H1):** two credible registers.
  - Normal-width sans, medium or semibold, with tight negative tracking: [Phantom dark](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9), [Linear](https://mobbin.com/sites/sections/038755ae-4b0f-4e25-a7df-dca35d71d6bc), [Coinbase Wallet](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b), [Family](https://mobbin.com/sites/sections/b36c6af6-3c75-4a17-8fb6-fec0631d2a20).
  - A high-contrast serif for a private-bank or editorial register: [Slash](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) (with italic emphasis), [Resend](https://mobbin.com/sites/sections/2adf9d3a-e8dd-44c5-b8fc-2414bd1dcd65), [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479).
  - **No hero in the sample uses an extended (wide) face.** Heavy condensed faces appear (Wise), but wide ones don't. My own judgement, not from Mobbin: wide display grotesques read as the 2021 NFT-landing look.
- **Tracked caps micro-labels:** [CRED](https://mobbin.com/screens/121f46b0-acdc-4bb6-8114-50625032a7b1) ("SUMMARY ACROSS CARDS", with a serif lowercase title and sharp-cornered buttons: a distinctive, non-template dark fintech), [Solflare](https://mobbin.com/screens/dfcba35c-fa88-4f56-a155-21020ed02d13) ("BALANCE"), and Airwallex's "VIRTUAL" engraved on the card.
- **Mono:** data labels, chips and indices: [OpenSea](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) ("ERC1155 · ETHEREUM · TOKEN #3 · 1 OWNER", "COLLECTION FLOOR"), [Linear](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4) ("1.0 Intake"), [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84) ("HOW IT WORKS", "01"), [Kastle](https://mobbin.com/sites/sections/a14eaef1-524c-4927-bc6f-ab54dd2aecff), [Save.design](https://mobbin.com/sites/sections/78a05e03-ea6b-469e-a1a0-a744d353fdb2) (mono FAQ questions). Grouped addresses in [Kraken](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a) ("0xb2 04b2 … 7f22 f48a").

**Verdict: keep Archivo + JetBrains Mono, and change the roles.**
- *Why keep it:*
  - Archivo at width 100 sits in the same neutral-grotesque register as the best UI faces in the sample.
  - Its width axis gives Satchel a stamped-metal caps voice that nobody else in the sample owns.
  - Tabular figures and slashed zero are already verified (kb/81).
  - JetBrains Mono covers the crypto-native mono convention.
- *What changes:*
  1. `display` drops from wdth 112 to wdth 100.
  2. `engrave` is scoped to things stamped on the metal: wordmark, card serial, alloy name, hallmark stamps.
  3. A new mono caps `label` covers data labels, indices, section eyebrows and MetaChips.
  4. A new `amount-hero` role, plus the unit rule.
  5. Turn ligatures off in the mono role, so hashes and addresses never form programming ligatures (JetBrains Mono ships them through `calt`; **[ASSUMED]**: check the ligature list).
- *Option:* a serif display for the landing H1 only (Slash/Resend register). It is more "private bank" and less "crypto-native" (Open question 2).

Density observed (≈ at 390 pt): page gutter 16; list rows 56–72 (Phantom ≈60, Apple Card ≈56); section gaps ≈28–32; tile radius ≈16; at most 4 round actions. Desktop data UIs (Fey, OpenSea) set 12–13 px labels and 13–15 px values. **Proposed scale** (mobile → ≥1024, Archivo unless noted):

| Role | Spec | Change |
|---|---|---|
| `display-xl` (landing H1) | wdth 100, 650, 40/44 → 64/68, −0.025em | **new** |
| `display` (judge H1, success titles) | wdth 100, 650, 32/36 → 48/52, −0.02em | was wdth 112, 30/34 → 44/48 |
| `h1` / `h2` / `h3` / `body` / `small` / `caption` | as kb/81 | — |
| `engrave` | wdth 125, 650, 12/16 (card serial 15/20), +0.08em, UPPER | scope only |
| `label` | JetBrains Mono 500, 12/16, +0.04em, UPPER, `--fg-muted`, `"zero" 1`, ligatures off | **new** |
| `amount-hero` | 100, 650, 40/44 → 48/52, −0.02em, `tabular-nums slashed-zero` | **new** |
| `amount-xl` | as kb/81 (28/32 → 32/36) | unit rule |
| `amount` | 100, 600, 16/22, tabular | was 550, 15/20 |
| unit (inside any amount) | 0.6 em (min 12 px), 500, `--fg-2`, thin space before | **new** |
| `mono` | as kb/81 + `font-variant-ligatures: none` | ligatures off |

**Maps to:** kb/81 › Typography; kb/80 › Design tokens summary.

### 2.9 Buttons: is a brushed-silver CTA credible?
| What premium dark apps use | Evidence |
|---|---|
| Solid white or near-white pill, black text (the dominant pattern) | [Revolut "Continue"](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [Revolut "Upgrade to Metal"](https://mobbin.com/screens/b1afe9c8-0913-42de-9640-399ff2780232), [Revolut sheet](https://mobbin.com/screens/9e4d6fca-ab2a-49e6-8de0-6237d3bdce8a), [DICE "REDEEM VOUCHER"](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322), [Linear "Sign up"](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c) |
| Light grey pill: **the closest thing to "silver"** found from a credible brand | [Slash "Contact Sales"](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) |
| Brand-accent pill (pale lavender) | [Phantom "Get started"](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) |
| Chromatic brand gradient pill | [Coinbase Wallet "Send"](https://mobbin.com/screens/ab567bb4-0c5b-44f9-a76b-6f27f53617cb) |
| Visible metallic gradient: **only** in a membership upsell, where it reads as promotional | [Zomato Gold "Join Gold"](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) |
| Secondary: dark-grey pill | [Slash "Open Account"](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c), [Coinbase Wallet "Receive"](https://mobbin.com/screens/ab567bb4-0c5b-44f9-a76b-6f27f53617cb), [Phantom "Contact us"](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) |
| Destructive: red text or icon on a neutral row, or a red tint; filled red is rare | [Revolut "Terminate card"](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5), [OpenSea "Cancel"](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Cash App confirm-cancel](https://mobbin.com/flows/4d61635b-5e87-4135-8d4a-9b385eba3b62) (red "!" icon, black "Yes") |

**Verdict: not as specified.** No credible product in the sample uses a visibly brushed or chromed button. Metal appears as an object (Revolut Metal, Slash, Altitude) and never as a control texture.

**Recommendation: a "polished" silver pill.** `linear-gradient(180deg, #F1F4F7, #DCE2E8)`, an OKLCH L span of 0.966 → 0.910 against the current 0.944 → 0.779. Hover `#F7F9FB → #E6EAEF`. Pressed: flat `#CFD6DE` + `inset 0 1px 2px rgb(0 0 0 / .25)`. `--on-metal` measures 17.84 / 15.08 (rest), 18.66 / 16.30 (hover) and 13.43 (pressed) **[VERIFIED]**.

Sizes and roles:
- All buttons are pills: 48 px primary on mobile, 40 px default on desktop, 32 px compact.
- Secondary: a `--surface-3` pill.
- Destructive (Delist, Revoke): `--danger` text on a 14% tint, 6.03 / 5.51:1 per kb/81. This closes kb/81 Open question 4.

**Maps to:** kb/81 › Metal, Radii, Status, Open question 4.

### 2.10 Chips, pills, tabs and segmented controls
| Component | References | Spec for Satchel |
|---|---|---|
| StatusPill | Tinted-fill chips: [Kraken "Healthy"](https://mobbin.com/screens/87cf22f4-48fa-474b-9ac1-ffe8eba368b1), [Gemini "Current account"](https://mobbin.com/screens/cc6a1261-a495-4977-8ca8-36d9a20b46db); on-card translucent pill: [Revolut "Virtual"](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) | Keep the kb/81 tint (14%). 24 px tall, 0 10 px padding, Archivo 12/16 600, leading glyph. On the card, the pill sits on glass |
| MetaChip (**new**) | Mono-caps outlined chips: [OpenSea item](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [OpenSea profile](https://mobbin.com/screens/4e4e5077-88bf-4446-8b3e-ce60f63498c0) | `label` type, 22 px, 1 px `--hairline-strong` outline, radius 6. Uses: `TOKEN #1` · `NEP-171` · `NEAR TESTNET` under the H1, and the TopBar `TESTNET` badge |
| ChainChip / chain badge | Chain filter chips with logo + name: [OpenSea profile](https://mobbin.com/screens/4e4e5077-88bf-4446-8b3e-ce60f63498c0); chain badge on the asset icon: [Base](https://mobbin.com/screens/638c39ce-9851-406d-8e42-4499884c49e4) | ChainChip = 20 px glyph + ticker. Add a 14 px chain badge at the bottom-right of 40 px asset icons wherever a token could be ambiguous (P2 SOL/USDC) |
| NavTabs (links) | Underline tabs: [OpenSea](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [Coinbase web](https://mobbin.com/screens/b6cc1e50-d9d1-4fde-8bde-be39ee423912), [Public](https://mobbin.com/screens/7671322d-641f-4396-83a0-6748b0be9cfa) | Active: `--fg` text plus a 2 px indicator in the **alloy accent** (≥ 9.98:1 on `--bg`, per kb/81). Inactive: `--fg-2`. No pill-in-box tabs (the shadcn default) |
| ChainSelect (ToggleGroup) | Pill segments: [Phantom top tabs](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Fey range pills](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) | Pill track in `--surface-2`; active segment `--surface-4` with `--fg`; 36 px; arrow-key navigation |
| Filter chips (Market, Activity P2) | [OpenSea activity](https://mobbin.com/screens/421641ab-0589-4cbb-b91f-e8ae121d2208) | Dark chips with icons; active = lighter fill; time shown as "7mo ago ↗" with an external-link arrow |

**Maps to:** kb/80 › Components (StatusPill, ChainChip, NavTabs, ChainSelect); kb/81 › Status.

### 2.11 Rows, review sheets, bottom sheets and toasts
| Component | References | Spec for Satchel |
|---|---|---|
| ChainRow | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Base rows](https://mobbin.com/screens/638c39ce-9851-406d-8e42-4499884c49e4) | Icon 40 · network label 16/22 600 · mono address 13/18 `--fg-muted` underneath · right: `amount` with the unit rule, explorer link below. Flat rows on `--bg` with `--hairline` dividers. No tile per row |
| ReviewCard / receipt | [Coinbase Wallet "Sent Bitcoin"](https://mobbin.com/screens/57d510d0-9948-4f98-a7f3-7f325d88fced) (amount on top, borderless key-value rows, full address wrapped), [Kraken confirmation](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a) (address grouped in 4s, tinted warning box), [Base order preview](https://mobbin.com/screens/dc5865e4-a92a-477a-a7b7-f819fae68166) (tinted info callout, "Sending can't be reversed…" sentence, "Secured by" line) | This confirms the kb/80 rule of a full address grouped in 4s. Put the amount in `amount-hero` at the top. Warnings are tinted callouts, not bordered boxes. The irreversibility sentence sits directly above the silver commit pill |
| Bottom sheet (mobile flow pages that look like sheets, kb/90 §8.1) | [Revolut sheet](https://mobbin.com/screens/9e4d6fca-ab2a-49e6-8de0-6237d3bdce8a), [Family inset review sheet](https://mobbin.com/screens/edb54bbf-2c2c-4e78-9d1f-8f0d89be858f) (floating with ≈12 pt side margins, every corner rounded), [Phantom full sheet](https://mobbin.com/screens/23998a59-cff7-4166-9438-6741e841af50) (round close and "…" buttons) | `--surface-2`, top radius **24** (kb/81 says 20), 36×5 grabber in `--fg-disabled`, 32 px round close button in `--surface-3` |
| Toast | [Phantom "Sent $1.00"](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) (compact dark pill with a green check, at the top), [Coinbase Wallet "Added to watchlist"](https://mobbin.com/screens/35478b29-708e-438e-b580-19d5b2a09e9d) (dark rounded rectangle, lower centre), [Mercury web](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) ("Your PIN has been updated." pill at bottom centre) | Pill in `--surface-3`, `--fg` 13/18 500, 16 px status icon, title of 5 words or fewer, one visible at a time. **Top centre under the TopBar on mobile; bottom centre on desktop** |
| Pending-sign mini-bar | Floating pills: [Phantom search pill](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Public glass nav](https://mobbin.com/screens/7671322d-641f-4396-83a0-6748b0be9cfa) | Render kb/80's sticky "Sending 0.0100 BTC · signing 0:42 · View" as a floating glass pill above the bottom edge, not a full-width bar (polish) |

**Maps to:** kb/80 › ChainRow, ReviewCard, Responsive modal, Toast, Satchel page "Pending signature"; kb/81 › Radii, Z layers.

### 2.12 Loading and empty states
| State | References | Spec for Satchel |
|---|---|---|
| Skeleton | No best-in-class dark skeleton surfaced. Anti-pattern: [Garmin](https://mobbin.com/screens/a7c20d58-3803-40b3-a953-837f7546b6db) (bright square blocks on black, louder than the content). Acceptable quiet version: [Locals](https://mobbin.com/screens/03fd9087-3149-4a8b-af6a-9dd82c88b01a) (low-contrast rounded bars). For long waits use named steps: [Origin](https://mobbin.com/screens/0a3297f4-b800-471a-a2bc-8236974a31ac) ("Loading balances / Fetching transactions / Updating…") | Static `--surface-2` shapes on `--surface-1` with radii matching the content; no pulse by default; an optional 1.6 s, 6%-white sheen that is off under reduced motion. Waits over 2 s use the SigningProgress pattern |
| Empty | [Coinbase Wallet](https://mobbin.com/screens/1fc3c65f-b166-44c7-a230-f2c4ea18d729): "$0.00" stays visible; "Add crypto to get started", one line of body, one pill. [Solflare](https://mobbin.com/screens/dfcba35c-fa88-4f56-a155-21020ed02d13): **engraved silver coins** as the illustration, plus a guilloché-textured wallet card. [Believe](https://mobbin.com/screens/72fdd6b1-4b9d-4f5a-95b8-250ce7afa680): dashed-outline empty container, plus a rotated "SECURE" **seal** on the wallet card | Home empty: the illustration is a **blank, unminted plate**: a Gunmetal silhouette with "№ ————" engraved and a dashed hairline edge. Then title, one line, one action (kb/80 copy). Believe's seal is a precedent for kb/80's assay-stamp Hallmark (Open question 4 there) |

**Maps to:** kb/80 › Home Loading/Empty, Activity Empty, Hallmark.

### 2.13 Motion and delight
Mobbin captures stills, so this section reads motion from the frames of each flow.
| Moment | Reference | Borrow for Satchel |
|---|---|---|
| Card provisioning | [Apple Wallet: adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) | **Mint "materialise":** the card silhouette fills with the token's seeded grain (the kb/80 `grain` seed already drives `feTurbulence`). The grain resolves into the alloy over 600 ms; then "Satchel #{id} is yours." Reduced motion: static grain, then an instant swap |
| Payment done | [Apple Pay "Done"](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3) | A circle-check stroke under the card (kb/80's 240 ms `pathLength` already fits) |
| Send success | [Cash App: paying a user](https://mobbin.com/flows/05ec0cd3-c44f-46bb-b108-2dccf68de195) | A left-aligned check, then a sentence headline (`display`), then Done plus a receipt link ("View on mempool.space ↗") |
| Freeze / unfreeze | [Revolut: card detail](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) | Frost in over 400 ms when listing succeeds; frost out over 600 ms when the cooldown ends, then the hallmark stamp |
| Confirmation toast | [Phantom](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) | Primitive default enter/exit (kb/80 already says not to re-implement) |

New springs, measured with motion@14.5.0's `spring()` **[VERIFIED]**:
| Interaction | Transition | 99% | ±1% | Overshoot |
|---|---|---|---|---|
| Hallmark stamp, scale 1.12 → 1 (+ opacity) | `{type:"spring", stiffness:520, damping:32, mass:1}` (ζ 0.70) | 141 ms | 288 ms | 4.53% |
| (rejected: 420/26, too springy) | ζ 0.63 | 140 ms | 311 ms | 7.59% |
| Stack: card rises out, y 0 → −168 px | `{stiffness:260, damping:26, mass:1}` (ζ 0.81) | 248 ms | 389 ms | 1.38% |
| (no-bounce alternative) | `{stiffness:300, damping:32}` (ζ 0.92) | 317 ms | 316 ms | 0.03% |
| Stack fan-out per card, y 0 → 56 px | `{stiffness:400, damping:36}` (ζ 0.90) | 257 ms | 256 ms | 0.10% |
| In-place reveal (P2) | tween 200 ms `--ease-standard`, opacity + y 4 → 0 | — | — | — |

**Maps to:** kb/80 › Motion spec (add rows; replace "Card flip"; replace "Mint reveal"); kb/81 › Motion tokens.

### 2.14 Landing `/` for first-time visitors
**Hero**

| Reference | What it shows | Borrow |
|---|---|---|
| [Phantom dark hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) | Floating pill nav, centred; a huge centred H1 in normal-width sans with **one word in the accent**; a pale-lavender pill plus a dark-grey pill; a **violet radial glow rising from below** | Composition, two-pill CTA pair, glow |
| [Slash card hero](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) · [Resend](https://mobbin.com/sites/sections/2adf9d3a-e8dd-44c5-b8fc-2414bd1dcd65) | One lit object in darkness (a gold card in a phone silhouette; a glossy black lens with a violet underglow), a serif H1, a light pill plus a dark pill. Slash adds a dismissible disclosure box ("…a financial technology company, not a bank") | **The card #1 itself is the hero object**, under the alloy glow. An honest disclosure line ("Testnet only…") |
| [Coinbase Wallet](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b) | "WALLET" eyebrow; H1; sub; bullets; one pill; **real product UI with real numbers** as the image | Show the real, live card and its rows, not a mock-up |

**Satchel hero (`/` and the top of `/s/1`):**
- `label` eyebrow (suggested: "NEAR CHAIN SIGNATURES · TESTNET").
- `display-xl` H1 from kb/80 `home.hero`.
- Sub in `--fg-2`.
- Silver pill **See Satchel #1** and a dark pill **Connect wallet**.
- The live card `lg` under `--alloy-glow`, with "Holds 0.0123 BTC · 0.0500 ETH · read 12 s ago" beneath it.
- Every word is in the server HTML at first paint. Motion only touches the glow and the card tilt (see the anti-pattern about Family).

**"Every Satchel has its own finish" (new section)**

[Slash: arc of metal cards](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) stands about 20 cards on edge in a receding arc, lit from above. [Altitude: card wall](https://mobbin.com/sites/sections/57e26228-53f2-4a69-ab19-b1ce00d4a374) shows two rows of six card variants.

For Satchel: render seeded cards #1–#8 in CSS: an arc on desktop, a 2-column wall on mobile. Each card shows its serial and alloy name. This makes the deterministic alloy system visible, and it costs almost nothing because the card component already exists.

**How it works**

| Reference | What it shows |
|---|---|
| [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479) | Hairline card; serif heading; a **vertical stepper** with outlined numbered circles joined by a 1 px connector; white step titles, grey copy |
| [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84) · [Linear](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4) | Mono "HOW IT WORKS" eyebrow, mono `01/02/03` indices, three columns split by hairlines, lots of space |

For Satchel: the Railway stepper on mobile and hairline columns on desktop, with `label` indices. Avoid filled number circles (anti-pattern).

**Proof and Facts**

[Public: "Secure by design"](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) shows six claims in a 3×2 grid. Each cell has a hairline top border, a white title, two grey lines, a small evidence badge (FINRA, FDIC/SIPC) or "Learn more →". [Wise trust](https://mobbin.com/sites/sections/0740a282-cb01-4c0f-9720-8d842a95359a) uses a 3D padlock and three icon claims.

For Satchel: the Facts `<dl>` and proof strip become a Public-style grid.
- Each cell: `label` (`<dt>`) → value (16/24 `--fg`) → evidence link (`--link`, underlined, ↗).
- Cells: "Contract locked · no access keys ↗", "Signatures issued 4 · last {t} ↗", "Bitcoin address derived from token #1 ↗", "Last transfer alice → bob ↗", and so on.

**Feature grid (P2)**

[FLORA](https://mobbin.com/sites/sections/27fbff58-42db-49e5-84c9-0a9ff1bcca07) uses one large screenshot cell plus three cells on soft gradients. [Attio](https://mobbin.com/sites/sections/9038df26-d13c-4c95-98d5-62ba4fd5fad3) uses hairline cards with wireframe-style UI drawings. [Family feature trio](https://mobbin.com/sites/sections/621e3667-37cb-488f-9f7b-f7ea0050dc2e) shows three real UI shots, each labelled with a coloured icon.

For Satchel: a bento with one large cell for **Clean history**, rendering the real CleanHistory component in its "Clean: 4 of 4" state, plus small cells for "Keyless contract" and "Native BTC/ETH, no bridge".

**FAQ**

[Linear](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c) puts a "FAQs" label on a hairline, a **two-tone heading** ("Questions" in white / "and answers" in grey) on the left, and an accordion on the right with chevrons on the left, hairlines, and underlined inline links. [Dovetail](https://mobbin.com/sites/sections/305c3f1c-1497-4d04-9803-7b977805d603) adds "Can't find the answer? Contact support".

For Satchel: native `<details>` so it works without JS. **Never put a judge fact only inside a collapsed answer.** Readers that drop hidden content may skip it (same reasoning as kb/90 §8.1 R-07; check with the WebFetch acceptance test).

**Footer**

[Attio](https://mobbin.com/sites/sections/3e95f139-74b0-4018-ae4f-5e49f21d584d) marks external links with ↗ and has a CTA column. [Mobbin](https://mobbin.com/sites/sections/d0037cf9-cb1d-4895-be9f-8d7b0f57bd6c) runs three quiet columns with "New" mini-badges. [Parker](https://mobbin.com/sites/sections/90aace03-4a60-4020-b57d-b7ad356f4051) prints **numbered footnote disclosures** and a giant faded wordmark. [Family](https://mobbin.com/sites/sections/5ece9cbd-3ed7-4798-8212-63382292ccc6) links its audit report from the footer.

For Satchel:
- Three columns: Product (My Satchels · Market · Mint), Verify (Contract ↗ · NearBlocks ↗ · Repo ↗ · README ↗), Hackathon (NEAR Hackathon ↗ · Demo video ↗).
- Bottom row: "Testnet only. Coins here have no value." and the footnotes, for example "¹ Clean history is checked off-chain by reading each chain; the contract doesn't enforce it." This mirrors kb/80 `clean.disclosure`.

**Maps to:** kb/80 › Home `/` (Landing), Judge-first view (How it works, Facts, Proof strip, Verify), IA › global chrome footer, copy keys `home.*`, `footer.*`.

### 2.15 `/s/1` judge view and the desktop layout
| Reference | What it shows | Borrow |
|---|---|---|
| [OpenSea item page](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) · [OpenSea, own item](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) | Left: media at ≈45% width on black. Right: title (≈22 px 600), collection plus "Owned by 0x2233…20a6", a **mono-caps chip row**, then a **bordered stat bar** (TOP OFFER · COLLECTION FLOOR · RARITY · LAST SALE, labels in mono caps, values in white). Then a price block ("BUY FOR $45.1K", ≈24 px, with a mono "ENDING IN 4 WEEKS"), a primary plus a secondary button, underline tabs "Details · Orders · Activity", and bordered accordions (Traits, Price history, About, Blockchain details) | The split for Satchel's desktop: card left, details right, MetaChips + stat bar under the H1 |
| [Mercury web inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) · [Gemini portfolio](https://mobbin.com/screens/cc6a1261-a495-4977-8ca8-36d9a20b46db) | Mercury: a single sticky column, card → actions → key-values. Gemini: a large dark chart card on the left, a right rail with an account card (selected outline) and round actions inside a tile | Order of the left sticky panel |
| [Fey web](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) · [Coinbase web portfolio](https://mobbin.com/screens/b6cc1e50-d9d1-4fde-8bde-be39ee423912) | Dense but calm dark data: hairline panels, right-aligned tabular numbers, tinted change pills, underline tabs, round icon buttons with tooltips | Density and tone for the right-hand content |

**Satchel desktop (≥1024)** keeps the kb/80 12-column grid.
- *Left (5 columns, sticky):* card `lg` under the glow → action pills → "Owned by … · Active".
- *Right (7 columns):*
  1. `engrave` eyebrow "SATCHEL #1 · PATINA", then the `display` H1 and sub.
  2. MetaChips: `TOKEN #1` `NEP-171` `NEAR TESTNET`.
  3. A **stat bar** in `label` / `amount`: OWNER · STATUS · SIGNATURES · CHAINS · MINTED. Everything in it is already in the server HTML per kb/90 §8.1.
  4. Underline NavTabs with the alloy indicator, then the tab content.

**Mobile judge view (W1)** keeps its order. The deltas are a cleaner card face, the alloy glow, ChainRows as the holdings, and the Facts grid.

**Maps to:** kb/80 › Judge-first view, W1, Desktop (≥1024px).

## 3. Industry-standard conventions observed
| Convention | Seen in | Satchel today | Action |
|---|---|---|---|
| ID-1 proportion (1.586) and a ≈3.5–4% corner radius for card objects | Apple Wallet, Revolut, Mercury, Altitude, Slash | Already in kb/81 (3.72%) | Keep |
| Four-corner card anatomy with an empty centre | Apple Card, Revolut, Altitude, Slash, Mercury | Card face crowded with a balance plate and a flip button | Change (C11) |
| Short identifier on the face, full details revealed with copy | Revolut, Mercury, Airwallex | Serial on the face; addresses on the back face | Keep the serial; addresses only in rows (C12) |
| Dark field of true black or near-black; elevation by lighter fill; no visible outer shadows | Phantom, Revolut, Fey, Slash, Resend, DICE | Graphite with surface steps, plus outer shadows on raised surfaces | Usage rule (C4) |
| One accent, used rarely; or an identity colour taken from the object | Phantom; Rainbow; Revolut | Alloy accent; Open question 3 unresolved | Resolve (C5) |
| Big bold balance, units or decimals de-emphasised, tabular figures in rows | Phantom, Revolut, Kraken, Coinbase, Base | Tabular; no unit rule | Add (C6) |
| Pill buttons; light pill as the primary on dark; dark-grey secondary | Revolut, DICE, Slash, Linear, Phantom, Coinbase, Cash App | 10 px radius, brushed gradient | Change (C1, C2) |
| Destructive actions as red text or tint; filled red is rare | Revolut, OpenSea, Cash App | Open question 4 | Resolve (C7) |
| Round, labelled, equal-weight wallet actions (at most 4) | Revolut, Rainbow, Coinbase Wallet, Solflare | ActionBar unspecified visually | Add (C13) |
| Review: big amount first, key-value rows, full or grouped address, warning callout, irreversibility line, commit button names the action | Coinbase Wallet, Kraken, Base | Already in kb/80 (Phantom pattern) | Keep; restyle (C24) |
| Success: check, then a sentence restating the outcome, then Done and a receipt link | Cash App, Apple Pay | Already in kb/80 copy | Keep; motion (C25) |
| Compact dark toast pill with an icon and ≤ 5 words | Phantom, Coinbase Wallet, Mercury | Unspecified visually | Add (C24) |
| Mono caps for data labels, chips and indices | OpenSea, Linear, Beside, Kastle | Mono only for addresses | Add `label` (C6) |
| Landing: dark hero with one lit object or the real UI, two pills, hairline grids, two-column FAQ, quiet footer with ↗ links and footnote disclosures | Phantom, Slash, Resend, Coinbase, Public, Linear, Attio, Parker | Partly specified | Add (C17–C22) |

## 4. Anti-patterns (avoid)
1. **A hero that only appears after an animation runs.** Mobbin's own capture of [Family's hero](https://mobbin.com/sites/sections/cb4721ce-71c2-43bf-9fcb-235be20e04aa) is blank except the nav. Screenshotters, link previews and the demo recorder would see the same. Satchel's H1, card and facts must be fully rendered at first paint; entrance motion may touch only decorative layers.
2. **Chromed or brushed gradients on controls.** [Zomato Gold's](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) gold-gradient button and gradient wordmark read as a promotion. Premium apps keep metal on the object.
3. **Data printed on the card.** [Parker's hero](https://mobbin.com/sites/sections/6b6ee642-ed8b-4109-9d8e-49e28a83a4a1) prints a full card number and expiry on the art; it reads as a mock-up. Never print an address on the Satchel face.
4. **Loud skeletons.** [Garmin](https://mobbin.com/screens/a7c20d58-3803-40b3-a953-837f7546b6db) uses bright square blocks on black that out-shout the content.
5. **Template step markers.** [ClassPass](https://mobbin.com/sites/sections/193363c3-3373-49a5-a1d0-00ff01f07b4d) uses filled blue number circles in a centred three-up, the stock "how it works" look.
6. **Mascot or kitsch hero objects for a "dark metallic" brand.** Family's characters ([hero](https://mobbin.com/sites/sections/b36c6af6-3c75-4a17-8fb6-fec0631d2a20)), [MetaMask's fox band](https://mobbin.com/sites/sections/23098664-e072-45fa-a177-8e5e1ee0792a) and [Gamma's 3D cubes](https://mobbin.com/sites/sections/de4360eb-b8bd-4d86-8bfc-b68fd5ea0327) all work against the "one signature object" principle.
7. **Drag-only confirmation.** [Glow's "Slide to Send"](https://mobbin.com/screens/9bd21aac-3239-4a2f-920a-42689ae858e9) needs a tap alternative (WCAG 2.5.7) and is awkward with a mouse. Satchel keeps a button.
8. **A second gradient competing with the card.** [Coinbase Wallet's](https://mobbin.com/screens/ab567bb4-0c5b-44f9-a76b-6f27f53617cb) blue→cyan CTA works because the gradient is their signature. Satchel's signature is the alloy card, so the buttons stay neutral.
9. **Masking numbers on a public page.** Binance's portfolio shows "******" ([Binance web](https://mobbin.com/screens/f9a19f01-d5fc-4979-913c-cf251306b604)). A hide-balances toggle is fine for owners, but never as the default on `/s/[id]`.
10. **Stock shadcn defaults that make the result look templated:**
    - bordered `Card` with `shadow-sm`;
    - `rounded-md` buttons;
    - `bg-muted animate-pulse` skeletons;
    - pill-in-a-box `Tabs`;
    - default `Badge`;
    - default toast styling;
    - Geist or Inter (already rejected in kb/81).

## 5. Concrete change list for kb/80 and kb/81
Priority tags follow kb/80 (P1 = MVP by Nov 6, P2 = by Nov 13, polish = only if time).

| # | Doc § | Change | References |
|---|---|---|---|
| C1 | 81 › Metal (primary action) | Replace the three-stop brushed gradient with a "polished" two-stop: `linear-gradient(180deg, #F1F4F7, #DCE2E8)`. Hover `#F7F9FB → #E6EAEF`. Pressed: flat `#CFD6DE` + `inset 0 1px 2px rgb(0 0 0/.25)`. Lower the `--shadow-metal` top highlight from 0.65 to 0.5. `--on-metal`: 13.43:1 or better in every state **[VERIFIED]**. Silver is for commit buttons only. P1 | [Revolut](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c), [DICE](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322); anti: [Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) |
| C2 | 81 › Radii | All buttons use `--radius-pill`, with heights 48 (mobile primary) / 40 / 32. Mobile tiles 16; desktop panels 12; sheet top corners **24** (was 20). Card radius unchanged. P1 | [Revolut sheet](https://mobbin.com/screens/9e4d6fca-ab2a-49e6-8de0-6237d3bdce8a), [Family sheet](https://mobbin.com/screens/edb54bbf-2c2c-4e78-9d1f-8f0d89be858f), [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Mercury](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168) |
| C3 | 81 › Neutrals | Add `--hairline: rgb(255 255 255/.08)` (1.19–1.28:1) and `--hairline-strong: rgb(255 255 255/.12)` (1.33–1.45:1) **[VERIFIED]** for dividers and desktop panel outlines. `--line` is kept only for selected or emphasised outlines; `--line-input` is unchanged. Mobile tiles have no outline. P1 | [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Linear](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c), [Fey](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd), [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) |
| C4 | 81 › Shadows and elevation | Usage rule: in-page surfaces get depth from fill plus the inset top highlight (`--shadow-raise-*` minus the outer shadow). Outer shadows are reserved for the card and for overlays. P1 | [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Revolut](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5) |
| C5 | 81 › Seeded identity colours + Open question 3 | Add `--alloy-glow` = a radial gradient of the seeded accent at **0.14 alpha at most** (emit the literal rgb from the server seed) behind the card on `/` and `/s/[id]`. At that cap, worst case over ids 1–100,000 is `--fg-muted` 5.30, `--fg-2` 7.98, `--danger` 6.12 **[VERIFIED]**; at 0.24 it fails (4.13). The accent is also used for the NavTab indicator and the avatar ring, never for button fills. P1 | [Revolut tint](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Phantom glow](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9), [Rainbow](https://mobbin.com/screens/5ff84636-17c3-49fe-8ed7-4f7138c61351) |
| C6 | 81 › Typography (+ CSS block, Figma text styles) | `display` → wdth 100, 650, 32/36 → 48/52, −0.02em. New `display-xl` 40/44 → 64/68. `engrave` scoped to wordmark, serial, alloy name and hallmarks. New `label` (JetBrains Mono 500 12/16 +0.04em UPPER). New `amount-hero` 40/44 → 48/52. `amount` → 16/22 600. Unit rule: 0.6 em, 500, `--fg-2`. `mono` + `font-variant-ligatures: none`. Decide by Nov 1. P1 | §2.8 links |
| C7 | 81 › Status + Open question 4 | Destructive = `--danger` text on a 14% tint (6.03 / 5.51:1, already computed). `--danger-solid` is unused unless an irreversible final confirm needs it. P1 | [Revolut](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5), [OpenSea](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Cash App](https://mobbin.com/flows/4d61635b-5e87-4135-8d4a-9b385eba3b62) |
| C8 | 81 › Motion tokens | Add `--duration-reveal` 200 ms, `--duration-frost-in` 400 ms, `--duration-frost-out` 600 ms, `--duration-materialise` 600 ms. P1/P2 | §2.13 |
| C9 | 81 › shadcn variable mapping | Add an "overrides" list: Button radius → pill; Card → no border or shadow on mobile and a hairline on desktop; Skeleton → static; Tabs → underline links; Badge → tint pill; Toast → compact pill. P1 | §4 item 10 |
| C10 | 81 › Card glass and scrim | Add a frost-layer row. Under the modelled frost every card text colour is 5.41:1 or better on glass, and white is 6.03:1 on scrim **[VERIFIED]**; re-run the sweep with the drawn layer. The frost always sits **under** the glass and scrim. P2 | [Revolut frozen](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) |
| C11 | 80 › SatchelCard (Front, Sizes, A11y) | Four-corner identity face (TL serial on scrim; TR StatusPill; BL owner; BR chain marks; aria-hidden "PATINA · TESTNET"). **No balances and no flip button on the in-app face**, so it matches the P1 static NFT art. The balance plate is kept for the OG image and the P2 SVG only. Add size `xs` 48×30 (alloy only). The `<figure>` summary still lists the balances. P1 | [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179), [Revolut](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764), [Altitude](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68), [Apple Wallet list](https://mobbin.com/screens/d42ad951-70bf-4a3f-a5fd-94e0771bc74f) |
| C12 | 80 › SatchelCard Back + Motion "Card flip" | P1: remove the back face; the ChainRows carry the addresses. P2 polish: an in-place "Show addresses" reveal (200 ms) in place of the rotateY flip. Fix the Revolut row in Reference patterns. P1 (scope cut) | [Revolut in-place reveal](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764), [Mercury "Show details"](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) |
| C13 | 80 › Satchel page layout, Wallet tab, W1 | Order: card → owner action row (48 px round buttons Send · Fund · Transfer) → ChainRows as the holdings → freshness caption → Facts. Visitors see ChainRows before Fund. P1 | [Mercury](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1), [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179), [Revolut](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) |
| C14 | 80 › SatchelCard States + Role × status | "Listed · cooling down" adds a frost layer (desaturate 30% plus a crystalline texture of 6% white or less, under the glass). "For sale" clears the frost and stamps a FOR SALE hallmark (spring 520/32/1). The owner's primary action flips to Delist. Text pills unchanged. P2 | [Revolut](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Mercury frozen](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168) |
| C15 | 80 › Mint › Success + Motion "Mint reveal" | Replace the Gunmetal → alloy cross-fade with "materialise": the seeded grain fills the silhouette and resolves into the alloy over 600 ms. Reduced motion: an instant swap. P1 polish (day 6) | [Apple Wallet: adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) |
| C16 | 80 › Home `/` List | Below 640 px, an optional Apple-Wallet stack: 56 px strips showing serial and StatusPill; rise spring 260/26/1 (99% at 248 ms) **[VERIFIED]**. The grid stays the default. Polish | [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6), [selected card](https://mobbin.com/screens/02e940a1-bcd1-4eaa-b064-a7c66fe0c1de) |
| C17 | 80 › Home Landing + Judge-first view | Hero: `label` eyebrow, `display-xl` H1, two pills, the live card #1 under the alloy glow, and a "Holds … · read {t} ago" line. Everything is static in server HTML; no content-gating entrance animation. P1 | [Phantom](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c), [Resend](https://mobbin.com/sites/sections/2adf9d3a-e8dd-44c5-b8fc-2414bd1dcd65), [Coinbase Wallet](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b); anti: [Family](https://mobbin.com/sites/sections/cb4721ce-71c2-43bf-9fcb-235be20e04aa) |
| C18 | 80 › Home Landing (new section) | "Every Satchel has its own finish": seeded cards #1–#8 in an arc (desktop) or a two-column wall (mobile), CSS only, labelled with serial and alloy. P1 polish | [Slash arc](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2), [Altitude wall](https://mobbin.com/sites/sections/57e26228-53f2-4a69-ab19-b1ce00d4a374) |
| C19 | 80 › Judge-first view › How it works | Vertical stepper with a 1 px connector and outlined indices on mobile; three hairline-divided columns with mono `01/02/03` on desktop; no filled circles. P1 | [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479), [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84), [Linear](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4) |
| C20 | 80 › Judge-first view › Facts + Proof strip | A Public-style fact grid (cells with a hairline top: `label` dt → value → ↗ evidence link), keeping `<dl>` semantics. On desktop, a stat bar under the H1 (OWNER · STATUS · SIGNATURES · CHAINS · MINTED) plus MetaChips. P1 | [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [OpenSea](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) |
| C21 | 80 › Home Landing (feature grid) | A bento with one large cell rendering the real CleanHistory component ("Clean: 4 of 4…") and two small cells (Keyless contract; Native BTC/ETH, no bridge). P2 | [FLORA](https://mobbin.com/sites/sections/27fbff58-42db-49e5-84c9-0a9ff1bcca07), [Family trio](https://mobbin.com/sites/sections/621e3667-37cb-488f-9f7b-f7ea0050dc2e), [Attio](https://mobbin.com/sites/sections/9038df26-d13c-4c95-98d5-62ba4fd5fad3) |
| C22 | 80 › IA global chrome (footer) + new FAQ | Footer: three columns (Product · Verify · Hackathon), ↗ on external links, a bottom row with `footer.testnet`, and numbered footnote disclosures (¹ clean history is off-chain). FAQ: two-column, two-tone heading, native `<details>`, no judge facts hidden inside it. Footer P1, FAQ P2 | [Attio](https://mobbin.com/sites/sections/3e95f139-74b0-4018-ae4f-5e49f21d584d), [Parker](https://mobbin.com/sites/sections/90aace03-4a60-4020-b57d-b7ad356f4051), [Linear FAQ](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c), [Dovetail](https://mobbin.com/sites/sections/305c3f1c-1497-4d04-9803-7b977805d603) |
| C23 | 80 › Desktop (≥1024px) | OpenSea-style split. Left sticky: card → action pills → owner/status (Mercury order). Right: eyebrow, H1, MetaChips, stat bar, underline NavTabs with the alloy indicator, content. P1 | [OpenSea](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Mercury](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1), [Gemini](https://mobbin.com/screens/cc6a1261-a495-4977-8ca8-36d9a20b46db) |
| C24 | 80 › Components (ChainSelect, NavTabs, StatusPill, ChainChip, ChainRow, ReviewCard, Timeline, Toast, Empty, Loading, + new MetaChip) | Visual specs from §2.10–2.12: pill segmented ChainSelect; underline NavTabs; MetaChip; chain badge; flat ChainRows with hairlines; ReviewCard with `amount-hero` and tinted warnings; strike-through failed amounts; toast pill (top on mobile, bottom on desktop); blank-plate empty state; static skeletons. P1 | §2.10–2.12 links |
| C25 | 80 › Motion spec | Add rows: frost in/out, hallmark stamp (520/32/1: 99% at 141 ms, 4.53% overshoot), stack rise and fan-out, in-place reveal, materialise **[VERIFIED]**. Remove "Card flip". Keep tilt, marked "no Mobbin evidence; decorative". P1/P2 | §2.13 |
| C26 | 80 › Reference patterns | Replace the web-research Revolut row (3D flip) with the Mobbin-observed in-place reveal and frost. Add Mobbin rows for Apple Card, Mercury, OpenSea, Public, Cash App and Slash, linking this file. Doc hygiene | §2 |
| C27 | 80 › Satchel page "Pending signature (this browser)" | Render the sticky mini-bar as a floating glass pill above the bottom edge. Polish | [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Public](https://mobbin.com/screens/7671322d-641f-4396-83a0-6748b0be9cfa) |

## 6. Open questions for the design lead
1. **Balances on the card face.** Recommended: an identity-only face in-app (C11). It matches Apple Card, Revolut and Mercury, and makes the in-app card identical to the P1 NFT art. The fallback is one glass plate in `lg` only, with `amount` 20 px rather than `amount-xl`, and no plate in `md` or `sm`. Which do you want in Figma?
2. **Display face.** Recommended: Archivo wdth 100 for the H1 (no extended display). The alternative is a high-contrast serif for the landing H1 only (the Slash/Resend/Public private-bank register), which trades away some crypto-native tone. Keeping wdth 112 is the third option.
3. **Primary CTA.** Recommended: the polished silver pill (C1). Options: a literal near-white pill (`--fg` #F3F5F8, the Revolut/DICE register) or the current brushed gradient. Should it be a pill or keep the 10 px radius?
4. **Frost for "Listed · cooling down" and a FOR SALE stamp for "For sale" (C14).** Approve the metaphor? It also sets the Hallmark style (stamp versus chamfered badge; Believe's [seal](https://mobbin.com/screens/72fdd6b1-4b9d-4f5a-95b8-250ce7afa680) is a precedent).
5. **Card texture.** The current spec is brushed stripes plus feTurbulence grain. Premium references lean towards a fine engraved halftone ([Altitude](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68), [Apple Cash](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57)), guilloché ([Solflare](https://mobbin.com/screens/dfcba35c-fa88-4f56-a155-21020ed02d13), [Mercury emblem](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1)) or grainy specular ([Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c)). Keep brushed for P1 and explore a seeded halftone in Figma?
6. **A third typographic voice.** Approve the mono caps `label` role next to `engrave` (rule: expanded caps for things stamped on metal, mono caps for machine data)?
7. **Mobile "My Satchels".** An Apple-Wallet stack (polish, C16) or keep the grid?
8. **Toast position.** Top on mobile (Phantom) and bottom on desktop (Mercury), or one position everywhere?

## Method and coverage
- **Tool use:** 29 Mobbin calls with `output_destination: "doc"` and the shared `task_intent`: 17 `search_screens` (iOS and web), 3 `search_flows` (iOS) and 9 `search_sections` (web). No call failed.
- **Not surfaced, so not cited:**
  - Robinhood: 3 queries (Gold card, dark home, credit card).
  - Zerion web, Ledger, Raycast and Phantom web: their queries returned other apps.
  - Amex, Ramp and Brex: not queried separately, because Apple Card, Revolut, Mercury, Slash and Altitude covered the premium card.
- **Discarded as below the quality bar** even though they were returned: Rocket Money, Up, Vivid, Ubank, Tesla, 7-Eleven, Acorns, Cleo, Greenlight, Setel, GoHenry, PayPal, Lloyds, Best Buy, Affirm, Neo, Stake, QuestMobile, Fidelity, Crypto.com, Yahoo Finance, Binance (except as an anti-pattern), Quicken, Cake Equity, Monarch, Fruitful, Current, Jeton, Titan, Escape Cafe, Grammarly, ClassPass (anti-pattern only), Givingli, Canva, Mural, Customer.io, Threads, Windsurf, Squarespace, KODE, Popcorn, Luma, Amplemarket, ToDesktop, Shopify Editions, Contra, MoonPay and Trust Wallet. Rainbow, Family, Mercury and Apple Card appeared only in light mode; I used them for structure, not colour.
- **Limits:** previews are low resolution, so sizes marked ≈ are estimates. Mobbin shows stills, so no motion timing comes from Mobbin. The springs above come from motion@14.5.0's generator, but the choice of "feel" is mine.
- **Calculations [VERIFIED]:** a throwaway script in my session scratchpad imported `research/spikes/ux/color.mjs`, `card_seed.mjs` and the spike's `motion@14.5.0` read-only.
  - Contrast is WCAG 2.x, with sRGB alpha compositing as browsers do it.
  - The glow is `over(accent, a, --bg)` for ids 1–100,000.
  - The frost model is described in §2.4.
  - The baseline reproduces kb/81 exactly (glass worst case `--fg` 11.33, `--chain-sol-fg` 5.53), so the numbers are comparable.
  - To reproduce, re-run the same formulas with these scripts; no files were added under `research/spikes/ux/`.

## Mobbin usage notice (verbatim, from the `ai_usage_notice` returned on several calls)

---

**Your Mobbin AI usage is high this month**

Usage is unlimited during beta. If your usage stays at this level, you may need to purchase more credits once limits take effect. [View usage and plan options](https://mobbin.com/settings/billing-and-usage)
