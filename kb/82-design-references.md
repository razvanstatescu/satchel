# Satchel design references: the R2 reference library (structure and behaviour; R3 note below)
> Owner: design (R2 synthesis) · Checked: 2026-10-21 (Phase 0) · Source: Mobbin, through the four research files in `research/spikes/ux-refs/` (118 searches, about 350 screens read from the returned images) · Companion to `80-ux-spec.md` R2 and `81-design-tokens.md` R2.
> **Link rule.** Every Mobbin link below was copied from a research file. No ID was invented or edited, and a script checks this (§7). Links go to Mobbin pages; no images are stored in the repo.
> **Research IDs.** `WC-` = `wallet-core.md` (C1–C20, T1–T6) · `NM-` = `nft-market.md` §5 (1–30) · `TS-` = `trust-signing.md` (T1–T20, K1–K5) · `VL-` = `visual-language.md` (C1–C27).

> **R3 (2026-10-21, brand consolidated): visual identity now comes from `brand/`** (logo, leather and brass colours, Night and Day themes, Bricolage Grotesque / Instrument Sans / Spline Sans Mono, the saddle stitch, iconography, motion principle), consolidated in `81-design-tokens.md` R3 and `80-ux-spec.md` R3. This library still governs **structure and behaviour**: flows, component anatomy and order, states, copy structure. Rows whose *visual treatment* the brand replaces are marked **R3 visual: superseded** (alloys and the alloy glow, frost, materialise, the hallmark strike and chamfered stamp, the near-white pill, mono-caps labels, the finishes wall, identity colours, tinted pills). Their structural lesson, where one exists, is noted beside the marker. R2 is kept verbatim at `research/spikes/ux-refs/r2-snapshot/82-design-references.r2.md`.

How to use this doc:
- **Section 1** names the apps whose bar Satchel aims for. Read it first.
- **Section 2** gives each screen or component the 2–4 best references, the exact element to borrow and where it lands in kb/80 R2. Supporting links follow some tables when a fifth screen adds one detail.
- **Section 3** lists the conventions that hold across apps, and **section 4** the anti-patterns.
- **Section 5** is the ordered Figma moodboard (40 screens).
- **Section 6** lists the apps Mobbin didn't have and the analog used instead.

Two adaptation rules apply everywhere:
1. **No USD.** Every fiat-first reference is adapted to a native-first amount (kb/90 T7).
2. **Hard constraints beat references.** The binding rules are kb/90 and `plan/decisions.md`:
   - no post-listing buy cooldown (D-05 rev 2);
   - no approvals and no `nft_transfer_call` (D-07);
   - the listing fixes the currency (D-14);
   - no relay (D-12);
   - no delegates (D-13);
   - full-page flows (D-26).

---

## 1. North-star set

| # | App | Sets the bar for | Must-see screens | What Satchel takes |
|---|---|---|---|---|
| 1 | **Apple Wallet / Apple Card** | **The card as an object.** The face carries identity only; numbers sit in tiles under the card; cards stack as wallets; the card is the hero even on success | [Apple Card detail](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) · [stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) · [adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) · ["Done" under the card](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3) | **R3 visual: superseded** for the face (the brand card shows the total and native chips) and materialise. Kept: the Home stack (as brass bands), the card as the success hero |
| 2 | **Revolut** | **State as a change of material.** Frost on a frozen card, the page tinted by the card, details revealed in place, a near-white commit pill, round labelled actions | [card detail flow (frost, tint)](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) · [card details flow (in-place reveal)](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) · ["Continue" pill](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0) | **R3 visual: superseded** (frost, the alloy glow, the near-white pill). Kept: the round owner ActionRow; no 3D flip |
| 3 | **Wise** | **Long waits told honestly.** The tracker becomes the receipt: done steps in the past tense with a time, the current step bold, future steps muted | [in progress](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) · [complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) | SigningProgress as a 4-row `<ol>` that turns into the receipt |
| 4 | **OpenSea (2025 item page)** | **Item-page hierarchy.** Mono metadata chips, a labelled stats strip, a role-aware action panel, the live listing next to its undo, greyscale when a listing ends | [item page, visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) · [owner with live listing](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) · [buy an item](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) | The `/s/[id]` order (chips, H1, owner, stats, actions, tabs); the ListedPanel; the listing-changed interstitial |
| 5 | **Family** | **Identity that travels.** A wallet's colour appears in lists, on Review ("From") and in history ("Sent to Stash"); a pasted address resolves into an object; first-time addresses get an acknowledgement | [wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec) · [Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1) · [activity](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b) · [web send flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) | The alloy swatch wherever a Satchel is named; RecipientInput's resolved row and Satchel recognition; the warning-tier checkbox |
| 6 | **Phantom** | **A dark surface system.** Depth comes from fill, there is one accent, a background-progress pill flips tense in place, and the detail view ends in a named explorer link | [token rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) · ["Buying…"](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac) → ["Bought"](https://mobbin.com/screens/566c7ed4-5c23-4d12-a642-ec969f823285) · [detail with "View on Solscan"](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44) | Mobile depth by fill; the PendingPill; "View on mempool.space ↗" links |
| 7 | **Coinbase Wallet and Cash App** | **The review as an exact outcome.** Grouped who/where rows, a time expectation, one line of finality, and honest BTC timing | [Send Bitcoin review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) · [Confirmation "est. about 30 minutes"](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) · [Cash App withdraw](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122) | ReviewCard's Time row and finality line; the Sent state with no success ✓ before confirmation |
| 8 | **Polestar and GitLab** | **Verdict-first reports.** A one-sentence verdict, results aligned like instruments, and the gated action inside the same widget as its checks | [Polestar car status](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9) · [GitLab merge widget](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) | The CleanHistory verdict block; the GateLine directly above Buy |
| 9 | **Mercury** | **Finance-grade calm.** Status words appear only on non-final rows, a freeze flips the primary action, and the column reads card → actions → facts | [transactions](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3) · [web card inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) · [web frozen](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168) | Chips only for non-final Activity rows; Delist as the primary action while listed; the desktop left panel order |
| 10 | **Slash and Public (sites)** | **The material is the brand, and proof is a grid.** Lit metal cards in darkness; claims in a hairline grid, each with its evidence; a disclosure note that doesn't shout | [Slash arc of cards](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) · [Slash pill pair + note](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) · [Public "Secure by design"](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) | **R3 visual: superseded** (the finishes wall, lit metal). Kept: the Facts and Proof grid; "Testnet only. Coins here have no value." |

**What Satchel adds that none of them has.** *(R3: the struck hallmark is superseded; the brand's version is the ProofChip, `shield-check` + "Clean history" + time + link, and the saddle stitch for ownership.)* R2's text: a hallmark that your browser strikes on the card's edge once it has proved the history clean:
- It combines the assay-stamp motif ([Commons stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5), [Solflare chamfered tile](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b)) with a verdict that carries its time and its evidence ([Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468)).
- It is the one place the brand spends its boldness (kb/80 R2 §HallmarkStamp).

---

## 2. Per screen and component

### 2.1 Landing hero `/` (not connected)
| Reference | Borrow exactly | Lands in (kb/80 R2) |
|---|---|---|
| [Phantom: dark hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) (site) | Centred normal-width H1, a light pill next to a dark-grey pill, and one radial glow rising from below. The glow is the only thing that moves | Landing hero. **R3 visual: superseded** (no glow; brass + outline pair, left-aligned). Kept: every word in the first paint |
| [Slash: silver pill CTA and legal note](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) (site) | One lit object in darkness, and a small, persistent disclosure note under the CTAs | `home.hero.note` "Testnet only. Coins here have no value." (**R3:** the silver pill is superseded by brass) |
| [Coinbase Wallet: site hero](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b) (site) | The real product with real numbers as the hero image | The live card #1 with "Holds … · read {t} ago" |

Avoid: [Family's hero](https://mobbin.com/sites/sections/cb4721ce-71c2-43bf-9fcb-235be20e04aa), which is blank until its animation runs. Every word of Satchel's hero is in the server HTML at first paint.

### 2.2 Landing: "Every Satchel has its own finish" (**R3 visual: superseded**: no alloys, so no finishes section)
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Slash: fan of metal cards](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) (site) | A receding arc of metal cards lit from above. The material is the brand | FinishesArc: seeded #1–#8 on desktop, CSS transforms only |
| [Altitude: card variants](https://mobbin.com/sites/sections/57e26228-53f2-4a69-ab19-b1ce00d4a374) (site) | A plain row of variants under the hero | The 2-column wall on mobile |

### 2.3 Landing: how it works, proof, FAQ, footer
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479) (site) | A vertical stepper with outlined indices and a 1 px connector, white titles and grey copy | HowItWorks on mobile. The three steps are a real sequence, so the indices are honest |
| [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84) (site) | A mono "HOW IT WORKS" eyebrow, mono `01/02/03`, hairline-divided columns | HowItWorks on desktop |
| [Public: "Secure by design"](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) (site) | A 3×2 hairline grid of claims: title, two lines, an evidence badge or "Learn more →" | FactsGrid and ProofGrid (`<dl>`): label → value → ↗ evidence |
| [Parker](https://mobbin.com/sites/sections/90aace03-4a60-4020-b57d-b7ad356f4051) (site) | Numbered footnote disclosures in the footer | `footer.note.clean` "¹ Clean history is checked in your browser…" |

Supporting: [Linear FAQ](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c) (two-tone heading, accordion with hairlines; P2) and [Attio footer](https://mobbin.com/sites/sections/3e95f139-74b0-4018-ae4f-5e49f21d584d) (↗ on external links).

### 2.4 Satchel page `/s/[id]`: an NFT detail page that is a wallet
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [OpenSea: item page, visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) | A row of boxed mono chips under the title; a bordered stats strip with small caps labels over bold values; the CTA directly under the number it acts on | MetaChips, StatsStrip (desktop), the page order. **R3:** sentence-case Instrument Sans chips and labels (mono caps superseded); the order is kept |
| [OpenSea: item page, owner with live listing](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) | A role-aware panel: "1 LISTED FOR …" in mono with **Cancel** beside it | ListedPanel `LISTED FOR 250.00 USDC · LISTING #7` + **Delist** |
| [Mercury web: card inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) | One narrow column: card → a text-button row → key/value facts | The desktop left sticky panel: card → actions or the buy block |
| [Family: "Owned by You"](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c) | A centred "Owned by ● You" pill, one primary verb, a data-source line | OwnerPill; `wallet.fresh` "Read from each chain {t} ago." |

Supporting: [Rainbow: overflow menu](https://mobbin.com/screens/a81b1003-2279-4463-ae14-eca55cdfe9d8) ("Copy Token ID" with the value previewed, then the explorer links) gives the ⋯ menu.

### 2.5 SatchelCard face
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Apple Wallet, Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) | Marks only on the face, over a soft radial gradient with a 1 px light rim. The balance lives in tiles below | **R3 visual: superseded** (the brand card shows the total and native chips). Kept: ChainRows under the card |
| [Revolut, card details flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) | Four-corner anatomy: name top-left, a translucent type pill top-right, a short identifier bottom-left, the network mark bottom-right. Details are revealed in place, with no flip | **R3 visual: superseded** by the brand band (name left, status pill right) and body. Kept: no flip |
| [Altitude: card hero](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68) (site) | A fine engraved texture carries the craft, not extra text | **R3 visual: superseded** (flat leather body + brass band; no texture) |
| [Blackbird: membership card](https://mobbin.com/screens/16bc9d96-d4f5-4c14-8d64-23314b632277) | Engraving-style mono caps at the bottom edge ("MINTED: 04.29.25") | **R3 visual: superseded:** the SVG shows "4 signatures" in Bricolage where the in-app total sits (D-23 kept) |

### 2.6 Card states as material: frost, sold, materialise (**R3 visual: superseded**: states are pills, icon + word; one motion moment. Kept from Mercury: while listed, Delist is the primary action)
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Revolut, card detail flow](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) | A frozen card gets an ice-crystal frost, and the page tint follows the card | FrostLayer while listed (signing frozen); `--alloy-glow` |
| [Mercury web: frozen](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168) | The face fades with "Frozen", and **Unfreeze** becomes the filled primary action | While listed, **Delist** is the owner's primary action |
| [Apple Wallet, adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) | A shimmering dot-noise field in card proportions resolves into the real card art | Mint "materialise": the seeded grain resolves into the alloy |
| [OpenSea: listing canceled](https://mobbin.com/screens/28b27959-e7b9-420c-b66a-4eba63243edf) | Greyscale art marks an ended state | SOLD in the seller's view: greyscale plus a `SOLD` tag |

### 2.7 Home `/`: My Satchels
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Apple Wallet: stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) | Cards overlap so that only each top strip shows (issuer left, product right); the last card shows in full | Mobile stack (polish A-04). **R3:** the bands are the cards' brass bands (name + status pill) |
| [Family: Wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec) | Tiles filled with each wallet's identity colour; name + avatar; add/import where the list lives | Desktop grid of `md` cards. **R3 visual: superseded** (no identity colours; the per-token leather hue is a quiet tint) |
| [Family web: row menu](https://mobbin.com/screens/0d16504e-cac4-4855-8290-415f3c1f110e) | A "…" menu per row: Send · View Activity · Copy Address · QR | The desktop card menu: Send · Fund · Copy addresses · View activity |
| [Coinbase Wallet: NFTs empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) | An empty state that is one decision and one pill | `home.empty` + **Mint a Satchel** |

Supporting: [Apple Wallet: card stack](https://mobbin.com/screens/46812e0f-4c8d-40ce-8ad3-356b009761e0) (about 14 cards at about 36 pt bands) shows how dense a stack can get.

### 2.8 Wallet tab: ChainRow, AddressDisplay, FundCard
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Phantom: token rows as cards](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) | Two-line rows with strict left/right alignment; a 40 pt icon; name over the native amount | ChainRow anatomy |
| [Cash App: Copy address sheet](https://mobbin.com/screens/70a0a9dd-ae5a-439b-8eb9-edeb81a696b3) + [copied state](https://mobbin.com/screens/46f6bd70-201f-4ed1-b6f6-97716e8422a5) | The trailing copy icon becomes ✓ in place; a factual mono footnote | CopyButton (✓ for 2 s) |
| [Rainbow: "Receive assets" card on an empty wallet](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a) | When the wallet is empty, the empty state is the next action | FundCard when every chain is zero |
| [Wise: USD balance](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b) | At zero balance, **Send** stays visible but greyed | ActionRow: Send disabled with a reason |

### 2.9 Receive / Fund `/s/[id]/receive`
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Gemini web: Receive BTC](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247) | A white QR plate inside a chain-coloured card; the first and last characters of the address in bold | AddressDisplay `grouped` with emphasised ends (kept). **R3 visual: superseded:** the alloy frame becomes a panel headed by the card's brass band |
| [Cash App: Receive USDC](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a) | One job per screen; the network shown exactly where the risk is; a mono warning; **Copy** + **Share** pinned | The page structure; Share only where the Web Share API exists |
| [Kraken web: Deposit USDC](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868) | Required confirmations and processing time stated before the user leaves | `fund.time.*` info rows |
| [Binance web: Recent Deposits](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1) | A live deposit block under the address | IncomingBlock (client island) |

Supporting: [Coinbase web: Receive ETH](https://mobbin.com/screens/97dc93ce-f553-4425-9c11-6d68300c40cf) (icon-led one-line facts).

### 2.10 Send: chain and amount
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Solflare: amount](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151) | A native-denominated hero ("0.036" with a small "SOL"), a balance chip and a **Max** chip | AmountInput, `amount-hero` + ticker |
| [Family: send amount](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984) | Context in compact rows while the number dominates; Continue disabled at zero | The form order; PinnedActionBar |
| [Uniswap: send](https://mobbin.com/screens/04498eb3-2576-4233-95ca-feac307135df) | The whole intent on one screen, with a gas line before **Review** | Fee line "Network fee ~282 sats · paid by this Satchel" |
| [Coinbase web: Transfer → Send dialog](https://mobbin.com/flows/dfdf09d3-5476-42be-8c56-6fdd9fa7866a) | The same hierarchy on desktop, with no keypad | The 480 px desktop flow column |

### 2.11 Send: recipient
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Glow: Choose Recipient](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df) | The pasted address shown in full, in mono, on two lines; an amber warning tier distinct from errors | RecipientInput's resolved row; the Warning tier |
| [Family: Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1) | The paste resolves into a recognisable row you confirm | Satchel recognition "Satchel #4 · Cobalt" |
| [Brave: own-address error](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef) | A red inline message at the field; Send stays disabled | The Error tier (`val.self`) |
| [Family web: Sending crypto flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) | A first-time-address checkbox that gates the button | `send.review.ack` (Warning tier only) |

### 2.12 Review: the exact outcome
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [World App: Confirm send](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) | Two rows joined by ↓: what leaves and what arrives | OutcomeCard: From (amount + fee) ↓ To |
| [Coinbase Wallet: Send Bitcoin review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) | A bordered who/where group, fee rows, then one irreversibility line | ReviewCard row order; `send.review.final.*` |
| [Binance: Send sheet](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) | A "Network Fee Paid By" row and full addresses | Fee rows that name the payer; full grouped To address |
| [Cash App: Withdraw to external wallet](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122) | A sentence headline, "Arrives in ~20m" inside the review, and "All bitcoin transfers are final." | The h1 "Send 0.0100 BTC"; the Time row; the finality line |

Supporting: [Base (web): "Asset changes (estimate)"](https://mobbin.com/screens/5c5a1976-d22a-451e-a95b-0a9812d92c0e) for the "(estimate)" label, and [Family: Confirm transaction](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3) for the identity dot on "From" and "~15 Secs" next to the fee.

### 2.13 "Approve in your wallet": the button becomes the status
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Uniswap (web): "Confirm in wallet"](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) | The review stays fully visible; the CTA becomes a disabled spinner button | Review CTA: "Preparing…" → "Approve in your wallet…" |
| [Chime: "Paying…"](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c) | The button doubles as calm progress | The CTA label morph (120 ms, no width animation) |
| [Phantom: in-button "Loading ···"](https://mobbin.com/screens/ec1f9701-25c0-4b6a-b244-20cd47862d1a) | An in-button spinner with a label | Same |

Avoid: [Acctual (web): Awaiting wallet confirmation](https://mobbin.com/screens/84637b5d-c5bd-4c74-80aa-c0823c620de6), whose red "Please do not close or refresh the browser" alarms the user during a normal wait.

### 2.14 SigningProgress: a tracker that becomes the receipt
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Wise: transfer in progress](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) | Done steps: ✓, a time and a plain sentence. The current step is bold with a filled dot. Future steps are muted with hollow dots | SigningProgress row states |
| [Wise: transfer complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) | The same component, all ✓, is the receipt | The Sent state and Activity row detail |
| [Topper in Solflare](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) | Right-aligned times to the second; a copyable order id | Clock times on done rows; tx id ⧉ |
| [Emergent: deploy list](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) (web) | The active row is tinted and carries its own elapsed timer, under "It takes around 5-7 mins" | The active row's timer and the kb/90 §8.6 threshold sentence |

### 2.15 Sent and receipts
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Coinbase Wallet: Confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) | "est. about 30 minutes" over **Done**, with no success check before the transfer is final | BTC Sent: an `--info` ring and "In mempool…" |
| [Solflare: Success sheet](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) | A chamfered check tile; "Transaction ID ⧉" and "Explorer ↗" as rows | Receipt rows (kept). **R3 visual: superseded:** no chamfered tile |
| [Wealthsimple: You sent](https://mobbin.com/screens/03537080-3a52-4b30-90f4-482c89dd47f8) | A sentence first, then a compact receipt card (From / To / Amount / time) | Receipt pattern (send, transfer, buy, sell) |
| [MoonPay: Your order](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de) | "You can safely close this screen", shown only once it is safe | `sign.closeok`, shown from broadcast on |

### 2.16 Failures and "Signed, not sent"
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Glow: Transaction Failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218) | An exact account of what moved and what didn't, with the evidence rows | FailureCard line 2, "what moved" |
| [Zomato: Payment failed](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700) | Conditional honesty where the system can't know ("If money was deducted…") | The `sign.timeout` conditional (never "no signature exists") |
| [Phantom: Deposit and withdrawal issues](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) | A stuck state framed as normal, with one self-serve recovery action | SignedNotSentCard + **Broadcast again** |
| [Posh: Pending Transfer](https://mobbin.com/screens/18b1e043-8db3-414c-b2c9-11a7d91402af) | A "What does this mean?" block between the state and the action | `sign.notsent.explain` |

### 2.17 Background progress: PendingPill (mobile) and PendingCard (desktop)
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Phantom: "Buying $1 of USDT"](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac) → ["Bought $1 of USDT"](https://mobbin.com/screens/566c7ed4-5c23-4d12-a642-ec969f823285) | A tiny persistent pill whose label flips tense in place | PendingPill "Sending 0.0100 BTC · 0:42" → "Sent 0.0100 BTC" |
| [Uniswap: "Unwrap pending"](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978) | The pending pill sits centred under the status bar | PendingPill position (mobile, top) |
| [WRITER: background toast](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc) (web) | A dark bottom-right card that sets an expectation without blocking | PendingCard (desktop, bottom-right) |
| [Base44: scan in progress](https://mobbin.com/screens/4a18bfd3-4480-4beb-8b5f-8227ee274532) (web) | A collapse control next to close: **Minimize** is not **Cancel** | **Minimize** in the flow bar while non-terminal |

### 2.18 Activity tab: Timeline
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Coinbase Wallet: Transactions](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) | Small uppercase day headers; "Sent" over "To bc1q…" | Day headers; row lines. **R3:** sentence case ("Today") |
| [Family: activity](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b) | An action badge on each icon; rows read as sentences; the counterparty's identity ("Sent to Stash") | TimelineRow; the counterparty alloy swatch |
| [Kraken: Activity](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d) | A "Pending" group pinned above the dated groups | The "IN PROGRESS" group |
| [Mercury: transactions](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3) | Chips only on non-final rows; a failed amount struck through | Tag only when not final; `<del>` + "Failed" |

Supporting: [Phantom: transaction detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44) (a **named** explorer link at the end) and [Trust Wallet: "Can't find your transaction? Check explorer"](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) (an honest footer).

### 2.19 Transfer review `/s/[id]/transfer`
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Posh: Confirm Details](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a) | The ticket itself is the hero, with a "Send / To" stub attached | Card `md` with a "To bob.testnet ✓" stub |
| [Revolut Business: Transfer ownership](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd) | "X will become the Owner / Y will become an Admin": both sides as two rows | `xfer.review.rows` (them / you / history) |
| [WhatsApp (web): Transfer ownership](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b) | The giver's loss stated plainly: "You won't be able to…" | "You won't be able to send from it." |
| [Webflow (web): Transfer site](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) | What goes with the transfer, and a CTA that names the recipient | **Transfer to bob.testnet** |

### 2.20 Handoff success
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [GoHenry: transferred](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) | It states the recipient's resulting state | "bob.testnet now controls 0.0123 BTC and 0.0500 ETH." |
| [Family: sending a collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52) | The object lands with the person, labelled "Sent" | The end frame: card under bob's avatar + a `TRANSFERRED` tag |
| [Gojek: money sent](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9) | Sender and recipient avatars overlap as one compact pair | The end-frame avatars |
| [Apple Wallet: card lifted, "Done"](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3) | The card stays the hero of the success state | Buy success: card large + "Satchel #3 is yours." |

### 2.21 Sell: "Before you list" and the listing form
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [incident.io: "Go live" checklist](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273) (web) | A pre-flight checklist right before a public action, with a fix action on each row | ListChecklist "Before you list" |
| [StockX: placing an ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4) | A prerequisite shown inline ("Payout Method: Not Active · EDIT"), a bold total payout, and a persistent "Your Current Ask" banner after listing | The USDC registration row; **You receive**; FreezeBanner |
| [PayPal: review and sell](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0) | The net amount is the one bold number | `sell.rows` ending in **You receive** |
| [American Airlines: "Boards in 17 minutes"](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb) | A wait as a calm sentence with the number inside it | "You can list in 143 blocks (~1 min 20 s)" |

Supporting:
- [Wealthfront: review your sale](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b): consequences right before the commit.
- [Grab: ETA with a track](https://mobbin.com/screens/1ac6149a-80a7-4ade-b9dd-1ce7aebdc073): the thin quiet-period track.
- [Uber: Account checkup (web)](https://mobbin.com/screens/bcdfcebe-bae1-49be-ad03-6ebb4aafa322): one check, one reason, one action.

### 2.22 Listed state, FreezeBanner and Delist
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Neo: card frozen](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb) | A scope sentence ("cannot be used for purchases of any kind"), the state on the object, undo one tap away | FreezeBanner (owner) |
| [Lloyds: Full freeze](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21) | "Still allows…": what still works | "Anyone can still fund it." |
| [StockX: vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c) | It says exactly what stops and how to undo it, in a persistent banner | FreezeBanner on every tab, with no countdown (E-37) |
| [OpenSea: canceling a listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) | One confirmation only: the wallet itself | Delist: no dialog; the wallet approval confirms |

### 2.23 Buy panel and the gate
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [GitLab: merge widget](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) (web) | The gate, its reasons and the button in one container | The GateLine directly above **Buy** |
| [OpenSea: buy an item](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) (web) | A "Price has changed" interstitial with old → new values; inline "Error · Retry" status rows | `buy.changed` interstitial; inline insufficient-funds row |
| [Crypto.com: sticky buy bar](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) | Price left, **Buy Now** right, a one-line footnote. Its "10%%" typo is a reminder to QA money strings | StickyBuyBar (mobile) with the verdict footnote |
| [Reddit: collectible checkout](https://mobbin.com/screens/c5c3a7d7-14a6-4f7d-90bf-4031bb60c464) | The object stays on screen for the whole purchase; quiet verification buttons | The card stays in the left panel; explorer links |

Supporting: [Uniswap: buying an NFT](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) (the button narrates the wallet; "Complete!" shows the object and its explorer link).

### 2.24 CleanHistory report
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Polestar: Car status](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9) | A huge two-line verdict, then hairline rows with the label left and the result right | Verdict block; Checks rows |
| [Uber: account checkup](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549) | Every check shows its actual evidence value, with an expand chevron | CleanHistoryRow: title / would-pay / evidence |
| [CRED: vehicle checks](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f) | Uppercase status tags with dates on a premium dark panel | Item pills. **R3 visual: superseded:** sentence-case pills, icon + word ("Settled", "Unused", "Settling") |
| [Better Stack: status page](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) (web) | One status row per source | Sources disclosure; the `1 OF 2 SOURCES` chip |

Supporting:
- [Base44: Scan Results](https://mobbin.com/screens/998517e6-54d5-46d0-9caf-76480e38f897): checks named by what they prove.
- [Lovable: Security Scan](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6): "Last scan…" freshness, and an action that needs a current scan.
- [1Password: list grouped by verdict](https://mobbin.com/screens/f0dc40a5-1e3c-4698-b108-7f55eed340aa): problems first.

### 2.25 Hallmark, Verified balance and Verify disclosure
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Airtasker: badges](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468) | "Verified on {date}": a badge bounded in time | A Hallmark is always word + time + link |
| [Grailed: "Authenticated"](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d) | Who checked, how, and "Learn More" | The Hallmark tooltip (kb/90 §7.7 verbatim) → the report |
| [Commons rating stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5) | A circular stamp with its "because" | **R3 visual: superseded** (no stamp or assay motif; B-07) |
| [Portrait: "Stats for nerds"](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) (web) | Proof one click away; a plain guarantee next to the raw ids | VerifyDisclosure, collapsed |

Supporting:
- [OKX "Locked assets"](https://mobbin.com/screens/a100a5dd-d63d-4f23-a58a-505b7ca1d6a4): the excluded or encumbered line.
- [eBay: Authenticity Guarantee](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61): the "How buying works" strip.
- [Pinterest: Verified merchant sheet](https://mobbin.com/screens/46522884-5524-44d4-b4e3-d1f864ad2875): the P2 touch sheet.

### 2.26 Market `/market`
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [GOAT: Wants/Owns grid](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243) | Hairline cards, a 3-column stat row (grey labels over bold values), a footer behind a hairline | MarketCard: PRICE · BTC · ETH + a verdict footer |
| [OpenSea: collection grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297) | Filter state always visible, an item count, a clear price hierarchy | MarketToolbar "{n} listed" + sort |
| [Uniswap: NFT explore](https://mobbin.com/screens/94c143d5-e346-4a74-8d44-9e0c25f35a62) | "Filter · 10 results", removable chips, "Clear All" | Filter chips (P2 polish) |

### 2.27 Mint `/mint`
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Base: name claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) | The thing you get is the hero; one claim bar with micro-caps labels; the CTA follows wallet state | MintBar `YOU GET · DEPOSIT · [Mint a Satchel]` |
| [Portrait: claim modal](https://mobbin.com/screens/e6439f66-3611-4297-b816-ac2f8c174410) (web) | Three checked, concrete benefits; the button names the amount | `mint.get.*` checklist |
| [Apple Wallet, adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) | Noise resolves into the card art, then "Adding Card ✓" | The materialise reveal |
| [Uniswap: buying an NFT](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) | The CTA narrates the wallet; success shows the object and its explorer link | "Satchel #8 is yours." + "Minted in {tx} ↗" |

### 2.28 System banners and contract-role strips
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [incident.io: status write-up](https://mobbin.com/screens/1de9fe66-840e-4a34-9f3c-2df7bc36438b) (web) | State, duration and a link in one row | `banner.rpc-down` |
| [Dialpad: app-level strip](https://mobbin.com/screens/6f48b680-0e25-4201-bfef-5b979d0a7029) (web) | A persistent strip for environment status that doesn't look like content | RoleStrip "DEV CONTRACT…" / "RELEASE CANDIDATE…" |
| [Neon: Import data](https://mobbin.com/screens/7062eab1-79fa-422a-b458-8e0efe3ab1cf) (web) | The error sits in the step that failed, with "remains untouched" | In-flow errors: "Nothing has been broadcast." |

### 2.29 Controls, type and density
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Revolut "Continue"](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0) | A flat near-white pill with black text on dark | **R3 visual: superseded:** the brass primary, `radius-md` |
| [DICE "REDEEM VOUCHER"](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322) | A light pill as the one commit action | One primary per view (kept as "brass once per screen"). **R3 visual: superseded:** pill shape and colour |
| [CRED: "SUMMARY ACROSS CARDS"](https://mobbin.com/screens/121f46b0-acdc-4bb6-8114-50625032a7b1) | Tracked small caps for labels; non-template dark fintech | **R3 visual: superseded:** sentence-case `label` (Instrument Sans) |
| [Fey web](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) | Hairline panels, right-aligned tabular numbers, tinted change pills | Right-aligned tabular numbers (kept). **R3 visual: superseded:** tints and hairline panels (depth by colour steps) |

Supporting:
- [OpenSea profile](https://mobbin.com/screens/4e4e5077-88bf-4446-8b3e-ce60f63498c0): outlined mono chips.
- [Kraken Pro web](https://mobbin.com/screens/87cf22f4-48fa-474b-9ac1-ffe8eba368b1): tinted "Healthy" pills, smaller units.
- [Revolut card settings](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5): destructive as red text on a neutral row.

### 2.30 Toasts, empty and loading states
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Phantom: "Sent $1.00"](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) | A compact dark pill with a status icon and five words or fewer | Toast style |
| [Base web: top-centre pill toast](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab) | Desktop toast at the top centre | Toast position (desktop) |
| [Believe: seal on the wallet card](https://mobbin.com/screens/72fdd6b1-4b9d-4f5a-95b8-250ce7afa680) | A dashed empty container and a rotated "SECURE" seal | **R3 visual: superseded** (a dashed edge would read as the stitch; the empty state uses the brand glyph) |
| [Origin: named loading steps](https://mobbin.com/screens/0a3297f4-b800-471a-a2bc-8236974a31ac) | Waits longer than 2 s name their steps | Long waits use the tracker pattern, never a bare spinner |

Avoid: [Garmin](https://mobbin.com/screens/a7c20d58-3803-40b3-a953-837f7546b6db), whose bright skeleton blocks shout louder than the content.

### 2.31 `/contract`: keyless and verification facts
| Reference | Borrow exactly | Lands in |
|---|---|---|
| [Public: "Secure by design"](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) (site) | Claims in a hairline grid, each with its evidence | FactsGrid: ACCESS KEYS · BIRTH TX · SIGNER TXS · CODE HASH |
| [Glow: collectible detail](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e) | Key/value rows with mono values right-aligned, like a spec sheet | The mobile layout of the same `<dl>` |
| [Portrait: "Stats for nerds"](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) (web) | Per-network links next to a plain promise | "Verify it yourself" commands, each with Copy |

---

## 3. Cross-cutting conventions (adopt)

| # | Convention | Seen in | Satchel rule (kb/80 R2 / kb/81 R2) |
|---|---|---|---|
| 1 | Object first: media, then title, owner, numbers | [OpenSea](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [Family](https://mobbin.com/screens/5dfda00f-9872-4c91-8f3f-99ce969be2d8), [Apple Card](https://mobbin.com/screens/4906fdaa-42f6-416f-be4d-dd75e5a61c6a) | The card comes before the numbers on every Satchel view |
| 2 | Identity-only card faces with an empty centre; four-corner anatomy | Apple Card, [Revolut](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764), [Altitude](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68) | **R3 visual: superseded** for the in-app card (total + native chips, B-04); the SVG still adds only `sig_count` (D-23) |
| 3 | One big native amount per screen, with a small, dimmed unit | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Kraken Pro](https://mobbin.com/screens/87cf22f4-48fa-474b-9ac1-ffe8eba368b1), [Cash App](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332) | `amount-hero` + ticker at max(12 px, 0.36 em), `--fg-2` |
| 4 | Labelled numbers: small caps label over a bold tabular value | [OpenSea stats](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [Base claim bar](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) | **R3:** `body-sm` sentence-case label over a tabular value (mono caps superseded) |
| 5 | Addresses truncated in lists, full and grouped on review and receive, with the ends emphasised | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Kraken](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a), [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) | AddressDisplay `grouped`: first two groups and last group in `--fg` 600 |
| 6 | The review has one shape: hero → from/to → fee + time → finality line → CTA naming the action | [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636), [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11), [Cash App](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122) | ReviewCard R2 |
| 7 | The pressed button becomes the waiting state | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Chime](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c) | `preparing` and `awaiting_wallet` render on the Review CTA |
| 8 | Long waits use a vertical stepper: past with a time, present bold, future muted, plus a stated expectation | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec), [Emergent](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba), [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) | SigningProgress R2 (kb/90 §8.6 thresholds) |
| 9 | Unfinished work is pinned, persistent and actionable | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Phantom pill](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac), [Revolut pending card](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7) | The IN PROGRESS group; PendingPill; SignedNotSentCard |
| 10 | Status words appear only when not final; failures are struck through | [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3), [Cash App](https://mobbin.com/screens/e37f6a5b-2b8f-4aa5-a296-ee5a7401a844) | Timeline Tags; `<del>` + "Failed" |
| 11 | A verification is a word, its evidence, who checked and when, and a link | [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d) | CleanHistory rows; the Hallmark is never bare |
| 12 | A freeze is a state on the object, says what's paused and what still works, and is undone in one tap | [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb), [Lloyds](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21), [Mercury](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168) | Frost + FreezeBanner + **Delist** |
| 13 | Ownership transfer names both parties and what goes with it; the CTA names the recipient | [Revolut Business](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd), [WhatsApp](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b), [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) | Transfer review rows (E-36 copy) |
| 14 | Success is the object, one sentence restating the outcome, a proof link and one action | [Apple Wallet](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3), [Cash App](https://mobbin.com/flows/05ec0cd3-c44f-46bb-b108-2dccf68de195), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) | Sent / transferred / bought / minted end frames |
| 15 | Primary buttons are light pills; metal belongs to objects | [Revolut](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [DICE](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c), [Linear](https://mobbin.com/sites/sections/1d6082b2-fd08-479c-9367-cccd1b14e62c) | **R3 visual: superseded:** a brass primary once per screen; no metal stamp |
| 16 | Depth comes from fills on mobile and hairlines on desktop; outer shadows only on objects and overlays | [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Fey](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) | **R3:** depth by `ground` → `surface` → `surface-raised`; `line` hairlines between rows; shadows only on the card and overlays |
| 17 | Honest time ranges rather than precise promises | [Monzo](https://mobbin.com/screens/874f2423-d24a-4385-ab24-7a114790cc15), [Lloyds](https://mobbin.com/screens/2b966b9f-f6f5-461a-aa99-7c942a862619), [Coinbase Wallet](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) | "Testnet4 confirmations are irregular: minutes to hours." |

**Deliberate deviation.** Every app says **Receive** or **Deposit**. Satchel keeps **Fund**, because anyone, not only the owner, may fund a Satchel, and puts the industry ↓ glyph on the action so it is still recognised at a glance (WC §3).

---

## 4. Anti-patterns (avoid)

| Anti-pattern | Example | Rule for Satchel |
|---|---|---|
| A success check on a state that isn't final | [World App: "Send processing" under a green ✓](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81) | "In mempool" uses an `--info` ring; ✓ only at confirmed / settled |
| Chromed or brushed gradients on controls | [Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) | Metal is for the card and the hallmark stamp, never buttons |
| A truncated-only recipient on the final review | [Trust Wallet: confirm send](https://mobbin.com/screens/557c35d8-3669-4459-833c-e5bfdf82864a) | The full grouped address on Review (anti-poisoning) |
| Alarm styling for a normal wait | [Acctual](https://mobbin.com/screens/84637b5d-c5bd-4c74-80aa-c0823c620de6), [mymind](https://mobbin.com/screens/63e9e0e2-7932-41f0-a35d-8a764b1cbd88) | `--fg-2` guidance; "Keep this tab open until it says Sent." is a fact, not a threat |
| A blank full-screen spinner | [UNIQLO](https://mobbin.com/screens/539dd47d-42d5-486e-8ffe-0c1fee1ef2b9), [StubHub](https://mobbin.com/screens/4e0d4893-dfd9-447e-a850-b2b2fe2c36da) | Always name the step and say how long is normal |
| Red urgency countdowns | [OpenSea iOS listing timer](https://mobbin.com/flows/7758d7b8-66ea-4ab6-8cd6-978446be2605), [Temu](https://mobbin.com/screens/2ac4e73b-5110-47a0-bc26-8d49d5397b3e) | The quiet period is a sentence plus a thin track; there is no countdown on the FreezeBanner (E-37) |
| "I understand the risks" overrides on a hard block | [OKX](https://mobbin.com/screens/d4d6ac31-b40e-479d-b27e-f78f9dc99ffd), [Zing](https://mobbin.com/screens/f8afac35-6a4d-46cf-85b4-c3fcec7a0b1a), [Base](https://mobbin.com/screens/dfd120e0-c3d6-431f-837d-a7f195df9fcb) | `blocked`, `settling`, `unknown` and `unsafe` disable Buy with no override |
| Scores and gamification for a binary safety property | [1Password score](https://mobbin.com/screens/bb785e76-767f-4cb8-a630-b24217469a23), [Careem](https://mobbin.com/screens/f365fe09-0799-4cfd-87e2-fe4ac2f3a06a) | No gauge, no percentage, no confetti. The handoff motion is the one celebration |
| Badge soup and unverifiable claims | [Temu](https://mobbin.com/screens/d1f4d565-0977-420d-bea0-372beb086857), [Yami](https://mobbin.com/screens/20ce45bb-0726-4b57-a930-5963fb651717) | At most two hallmarks, each with its time and a link |
| Vague or apologetic failures | [Snoonu](https://mobbin.com/screens/3999a458-0206-408f-a3e9-d3669304e347), [Crypto.com](https://mobbin.com/screens/98002d85-b4da-4a32-a7b4-18bd9cf4a6d7), [PayPal](https://mobbin.com/screens/37ec5e8d-89e2-4d64-bd82-ae9855d83d35) | Name what failed and what did or didn't move |
| A blocking modal for a field-level error | [Binance web](https://mobbin.com/flows/6da2eab5-3db8-4a19-9e44-bf8a4c4fcb65) | Errors inline at the field, or on the failing tracker row |
| Drag-only confirmation | [Glow](https://mobbin.com/screens/9bd21aac-3239-4a2f-920a-42689ae858e9), [Solflare](https://mobbin.com/screens/662009cf-ee36-4e6c-beae-ed706f64fba2), [Base](https://mobbin.com/screens/fbbbcfe5-d77d-44c1-a480-21a4e76bed87) | A button that names the amount (WCAG 2.5.7) |
| Raw payload hex as the approval content | [OKX Approve](https://mobbin.com/screens/29f3154a-7edd-4ac3-a5ba-d23eabe7740c) | Review shows the decoded outcome only; no payload, Tgas or yocto |
| Offers, edits and expiry on an exact-price listing | [OpenSea visitor "Make offer"](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [OKX "Lower price"](https://mobbin.com/flows/ce8e4ab3-bb58-4275-bde4-92ef41ac6ae8) | D-14: "To change the price, delist and list again." |
| Double confirmation for a reversible action | rev 1's delist AlertDialog vs [OpenSea: canceling a listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) | The wallet approval is the confirmation |
| Data printed on the card art | [Parker's hero](https://mobbin.com/sites/sections/6b6ee642-ed8b-4109-9d8e-49e28a83a4a1) | **R3:** the in-app brand card shows the total and native balances (B-04); the NFT SVG still shows no balances or addresses |
| Loud skeletons; template step markers; mascot hero objects | [Garmin](https://mobbin.com/screens/a7c20d58-3803-40b3-a953-837f7546b6db), [ClassPass](https://mobbin.com/sites/sections/193363c3-3373-49a5-a1d0-00ff01f07b4d), [MetaMask fox band](https://mobbin.com/sites/sections/23098664-e072-45fa-a177-8e5e1ee0792a) | Static quiet skeletons; outlined indices; the card is the only hero object |
| A fiat-first hero | [Cash App "$4"](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332), [Phantom "$1"](https://mobbin.com/screens/29a970be-a332-44b3-9874-9955cfe3adc8) | **R3 (UX-1 reopened):** one labelled total, "≈ $X · at mainnet prices", on the card only; never fiat-first elsewhere |
| Masking numbers by default on a public page | [Binance web](https://mobbin.com/screens/f9a19f01-d5fc-4979-913c-cf251306b604) | `/s/[id]` always shows balances to judges |
| Stock shadcn defaults (`shadow-sm` cards, `rounded-md` buttons, pulsing skeletons, pill-in-box tabs, default Badge and Toast) | VL §4 item 10 | The override list in kb/81 R2 §shadcn mapping |

---

## 5. Figma moodboard (40 screens, in board order)

Pull each into Figma at its native frame: 390 wide for iOS, the captured width for web and sites. Annotate each with its "Borrow" line from §2. Boards follow the product's story order.

| Board | # | Screen | Pull it for |
|---|---|---|---|
| **A · Material and identity** (**R3 visual: superseded**; use the brand canvas) | 1 | [Apple Wallet, Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) | Identity-only face; tiles under the object |
| | 2 | [Revolut, card detail flow](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1) | Frost and page tint |
| | 3 | [Altitude: card hero](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68) | Engraved texture over loud gradients |
| | 4 | [Slash: fan of metal cards](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) | The alloy family as a brand |
| | 5 | [Apple Wallet, adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) | Mint materialise |
| **B · The Satchel page** | 6 | [OpenSea: item page, visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) | Chips, stats strip, CTA placement |
| | 7 | [OpenSea: item page, owner with live listing](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) | ListedPanel with undo |
| | 8 | [Mercury web: card inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) | Left-panel order |
| | 9 | [Family: "Owned by You"](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c) | OwnerPill, data-source line |
| **C · Home** | 10 | [Apple Wallet: stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) | 56 px identity bands |
| **D · Receive** | 11 | [Gemini web: Receive BTC](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247) | QR plate in an identity frame; emphasised ends |
| | 12 | [Cash App: Receive USDC](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a) | One job; network at the risk |
| **E · Send and review** | 13 | [Solflare: amount](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151) | `amount-hero` + ticker + Max |
| | 14 | [Glow: Choose Recipient](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df) | Resolved row; warning tier |
| | 15 | [World App: Confirm send](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) | OutcomeCard |
| | 16 | [Coinbase Wallet: Send Bitcoin review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) | Row order; finality line |
| **F · Signing** | 17 | [Uniswap (web): "Confirm in wallet"](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) | CTA becomes the status |
| | 18 | [Wise: transfer in progress](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) | Tracker row states |
| | 19 | [Wise: transfer complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) | Tracker as receipt |
| | 20 | [Emergent: deploy list](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) | Active row with its own timer |
| | 21 | [Phantom: "Buying $1 of USDT"](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac) | PendingPill with tense flip |
| **G · Failure** | 22 | [Glow: Transaction Failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218) | "What moved" line |
| **H · Activity** | 23 | [Coinbase Wallet: Transactions](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) | Quiet dark list, caps day headers |
| | 24 | [Kraken: Activity](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d) | Pinned in-progress group |
| **I · Clean history** | 25 | [Polestar: Car status](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9) | Verdict sentence; instrument rows |
| | 26 | [CRED: vehicle checks](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f) | Status tags on dark |
| | 27 | [GitLab: merge widget](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) | Gate and button in one container |
| | 28 | [Better Stack: status page](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) | Per-source health |
| **J · Sell and listed** | 29 | [incident.io: "Go live" checklist](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273) | "Before you list" |
| | 30 | [StockX: placing an ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4) | Inline prerequisite; bold payout; live banner |
| | 31 | [Neo: card frozen](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb) | FreezeBanner scope sentence |
| **K · Buy and market** | 32 | [OpenSea: buy an item](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) | Listing-changed interstitial |
| | 33 | [Crypto.com: sticky buy bar](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) | StickyBuyBar |
| | 34 | [GOAT: Wants/Owns grid](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243) | MarketCard as an instrument |
| **L · Transfer and success** | 35 | [Posh: Confirm Details](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a) | Card hero + "To" stub |
| | 36 | [GoHenry: transferred](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) | Outcome sentence |
| | 37 | [Solflare: Success sheet](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) | Proof rows (the chamfered tile is superseded in R3) |
| **M · Landing** | 38 | [Phantom: dark hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) | Hero composition and glow |
| | 39 | [Public: "Secure by design"](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) | Facts and proof grid |
| **Z · Never do this** | 40 | [World App: "Send processing" under a green ✓](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81) | The one anti-pattern everyone must recognise |

The full anti-pattern board is in §4; add [Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) and [Trust Wallet: confirm send](https://mobbin.com/screens/557c35d8-3669-4459-833c-e5bfdf82864a) if the board has room.

**Figma frames to build first** (UX-13 in `plan/phase0-checklist.md` §6; **R3:** the brand canvas already holds the logo system, the colour and type boards, the card, header, activity rows, buttons, pills and the landing board):
1. SatchelCard `lg`/`md`/`xs` in Active, Signing, Listed, Needs attention and Sold, owned (stitched) and not, Night and Day.
2. `/s/1` at 390 and 1440.
3. Review → tracker → receipt.
4. Before you list.
5. Buy with the GateLine.
6. The handoff storyboard F1–F4.

The brass primary, StatusPill, Chip and type styles come from the kb/81 R3 variables (brand namespace).

---

## 6. Coverage: apps Mobbin didn't have, and the analog used

| Wanted | Status on Mobbin | Analog used instead |
|---|---|---|
| **Rabby** (sign review with simulation; "Pending: Broadcast failed") | Not indexed (TS search 4) | [Base (web): "Asset changes (estimate)"](https://mobbin.com/screens/5c5a1976-d22a-451e-a95b-0a9812d92c0e), [Uniswap "Confirm in wallet"](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Coinbase Wallet review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636). Rabby's locale strings stay as a **copy reference** (kb/80 R2 §Reference patterns) |
| **Ledger Live** (confirm on device) | Not indexed (TS 17) | [Uniswap "New address" sheet](https://mobbin.com/screens/97e9bb9e-11ec-4d6e-a93e-5827cfbe18c4), [Kraken chunked address](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a), [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) |
| **Zerion** (wallet home) | Not indexed (WC 29; VL) | [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Rainbow](https://mobbin.com/screens/d7c9913f-73b5-4684-b9ad-5e0adfdbe38d), [Family](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec) |
| **Phantom web** | Not indexed (WC 24; VL) | Phantom iOS, [Base web home](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab), [Coinbase web: My assets](https://mobbin.com/screens/fee6499f-1bb8-47b4-a971-607d22e0f20a) |
| **Magic Eden, Zora, Foundation, NBA Top Shot** | Not on Mobbin (queries returned other apps; NM Appendix A) | OpenSea (2025 web and iOS), [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [StockX](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [Reddit collectibles](https://mobbin.com/screens/c5c3a7d7-14a6-4f7d-90bf-4031bb60c464) |
| **Blur, Tensor** | Not searched (search budget) | GOAT's instrument-like grid |
| **Carfax / Carvana** (vehicle history) | Not indexed (TS 11) | [Polestar](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9), [Tesla service history](https://mobbin.com/screens/a1ea4590-a32c-4634-94b0-5dd3e669e2af) |
| **Google Security Checkup**, Apple Safety Check | 0 results / not found (TS 9) | [Uber account checkup](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [Base44 scan](https://mobbin.com/screens/998517e6-54d5-46d0-9caf-76480e38f897), [1Password "All good!"](https://mobbin.com/screens/e4134218-8c44-4892-b6b1-fae75e5ce32c) (copy only, not its score) |
| **Robinhood**, Raycast, Ledger (visual) | Not surfaced (VL) | Revolut, Public and Slash cover the premium register |
| **Amex, Ramp, Brex** | Not queried (VL) | Apple Card, Revolut, Mercury, Slash, Altitude |
| **Crypto speed-up / cancel screens** | None surfaced (WC 26) | Pending patterns ([Posh](https://mobbin.com/screens/18b1e043-8db3-414c-b2c9-11a7d91402af), [Cash App](https://mobbin.com/screens/75c64504-9371-456e-a07c-e5dc9fe59431), [Revolut](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7)) plus the Rabby strings |
| **Motion** (Mobbin shows stills) | — | Springs measured with motion@14.5.0 (kb/80 R2 §Motion spec; `research/spikes/ux-refs/calc/springs_r2.mjs`) |

Light-mode only: Rainbow, Family, Mercury and Apple Card appeared only in light mode in the returned images. They are used for structure, not colour (VL §Method).

---

## 7. Verification of this doc

- **Links.** Every `mobbin.com` link in kb/80 R2, kb/81 R2 and this file must appear in a research file. Run this from the repo root; it prints nothing when every link is known:
  ```
  grep -ho 'https://mobbin.com/[a-z/]*/[0-9a-f-]*' research/spikes/ux-refs/*.md | sort -u > /tmp/valid.txt
  grep -ho 'https://mobbin.com/[a-z/]*/[0-9a-f-]*' kb/80-ux-spec.md kb/81-design-tokens.md kb/82-design-references.md | sort -u | comm -23 - /tmp/valid.txt
  ```
- **Numbers.** Contrast and spring figures quoted in kb/81 R2 and kb/80 R2 come from `research/spikes/ux-refs/calc/contrast_r2.mjs` and `springs_r2.mjs`. These are throwaway scripts that import `research/spikes/ux/` helpers read-only.
