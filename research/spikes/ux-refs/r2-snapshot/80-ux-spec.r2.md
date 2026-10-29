# Satchel UX spec: routes, states, components, copy, motion (Revision 2)
> Owner: ux · Checked: 2026-10-21 · **Revision 2 (reference-driven), supersedes rev 1** · Confidence: medium-high.
> - **High confidence:** structure, copy, tokens and motion values. They are computed, sourced or backed by a cited reference.
> - **Inherited:** flows that depend on contract or chain behaviour follow `90-technical-spec.md` and carry its [ASSUMED] items.

How R2 relates to the other docs:
- **Behaviour:** `90-technical-spec.md` is the source of truth. Where this doc disagrees with it, kb/90 wins.
- **Tokens and contrast:** `81-design-tokens.md` R2.
- **References:** `82-design-references.md` holds the north-star apps, the 2–4 best references per screen, the conventions, the anti-patterns and the Figma moodboard. Every Mobbin link here also appears in the research files.
- **Rev 1** is kept verbatim at `research/spikes/ux-refs/rev1-snapshot/80-ux-spec.rev1.md`, because kb/90 §13 E-01…E-37 quote rev 1 strings.

Phase tags:
- **P1** = Days 1–6 (MVP, G5 on Nov 6).
- **P2** = Days 7–11.
- **polish** = only if time; it is cut first, after the plan's cut order.
- **R2+n h** = scope added by R2, with an estimate (§Scope and phasing).

Research IDs: `WC-` wallet-core · `NM-` nft-market · `TS-` trust-signing · `VL-` visual-language (`research/spikes/ux-refs/`).

## Changelog (rev 1 → R2)
| # | Area | Rev 1 → R2 | Research | Key references |
|---|---|---|---|---|
| U2-01 | IA | Send, Transfer and Receive were Drawer/Dialog modal routes. They become **full pages** (D-26). On mobile they look like a sheet: a flow bar plus a pinned action bar. On desktop: a 480 px column, a back link and a progress hairline. If H-19 picks modals: a desktop right drawer | WC-C1, WC-C18 | [Family web send flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4), [OpenSea web send](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9) |
| U2-02 | IA | `/s/[id]/access` is removed (D-13). `/contract` is added (kb/90 §8.1) | constraint | kb/90 §8.1 |
| U2-03 | Status | Active · Signing · Listed (cooling down) · For sale · Sold becomes **Active · Signing · For sale · Sold** (E-37) | NM-7, TS-T18 | [StockX vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c) |
| U2-04 | Satchel page | New order, OpenSea-style: MetaChips + ⋯ → H1 → card → owner ActionRow → owner pill → stats strip (desktop) → NavTabs | NM-1, NM-6, VL-C20, VL-C23 | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Mercury inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1) |
| U2-05 | SatchelCard | The balance glass plate and the 3D "Show addresses" flip become an **identity-only face**: serial and alloy top-left, StatusPill top-right, owner chip bottom-left, chain marks bottom-right. **No flip in v1** | NM-2, NM-4, VL-C11, VL-C12 | [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179), [Revolut details flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) |
| U2-06 | SatchelCard | State becomes material: **frost** while listed, greyscale + `SOLD` for the seller, **materialise** on mint, and a **HallmarkStamp** struck on the card's edge when the browser verdict is clean | VL-C14, VL-C15, NM-2 | [Revolut frost](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Apple adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57), [Commons stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5) |
| U2-07 | SatchelCard | Sizes `lg`/`md`/`sm`, plus `xs` 48×30 (alloy only) and an inline swatch for text mentions | VL-C11, WC §1.8 | [Apple Wallet settings list](https://mobbin.com/screens/d42ad951-70bf-4a3f-a5fd-94e0771bc74f), [Family wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec) |
| U2-08 | Identity | An **alloy glow** (≤ 14 %) behind the card. The alloy also colours the NavTab indicator, a selected chip's outline and the swatches. It never fills a button | VL-C5, NM-28 | [Revolut tint](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Phantom hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) |
| U2-09 | Home | The 1-column grid on mobile becomes a **stack from 2 Satchels** (56 px identity bands). Desktop: a grid with captions and a ⋯ menu. Empty: one sentence and one pill | WC-C2, WC-C3, NM-19, VL-C16 | [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6), [Family wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec), [Coinbase Wallet empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) |
| U2-10 | Landing | Hero: the live card #1 under the glow, a `label` eyebrow and a `display-xl` H1. Then the new "Every Satchel has its own finish" section, a How it works stepper, a proof grid, and a footer with footnotes | VL-C17…C22, NM-18 | [Phantom hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9), [Slash arc](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2), [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479) |
| U2-11 | Wallet tab | A two-line ChainRow; the full grouped address at `lg`; a FundCard when every chain is zero; Send disabled with a reason | WC-C4, WC-C5 | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Rainbow receive card](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a), [Wise USD balance](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b) |
| U2-12 | Facts | The Facts `<dl>` becomes a hairline grid (desktop) or mono rows (mobile). Adds MetaChips, a stats strip and a ⋯ menu | NM-3, NM-6, VL-C20 | [Glow collectible detail](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e), [Rainbow menu](https://mobbin.com/screens/a81b1003-2279-4463-ae14-eca55cdfe9d8) |
| U2-13 | Verify | The "Verify these addresses" disclosure becomes "Stats for nerds", with the derivation inputs inside it (closes rev 1 Open question 6) | TS-T7 | [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) |
| U2-14 | Receive | A one-line spec becomes a full page:<br>• ChainSelect;<br>• an alloy-framed 240 px QR plate;<br>• the grouped address with emphasised ends;<br>• **Copy address** (CTA) and Share (Web Share only);<br>• icon info rows, including the time to confirm;<br>• the faucet link;<br>• a live **Incoming** block | WC-C7, WC-T6 | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a), [Kraken web](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868), [Binance web](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1) |
| U2-15 | Send form | One stacked screen: ChainSelect with balances → `amount-hero` input (no keypad) → "Available" + **Max** → To → fee line → a pinned **Review** | WC-C8 | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Family](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984), [Uniswap](https://mobbin.com/screens/04498eb3-2576-4233-95ca-feac307135df) |
| U2-16 | Recipient | **Paste** inside the field; a resolved row; Satchel recognition; Error / Warning / Info tiers; a warning-tier checkbox on Review | WC-C9 | [Glow](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df), [Family Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1), [Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef) |
| U2-17 | Review | The "You send / Recipient gets" pair becomes:<br>• the h1 "Send {amount}";<br>• an **OutcomeCard** (From = amount + fee ↓ To = the full address);<br>• fee rows that name the payer;<br>• Satchel after;<br>• the NEAR fee line (kb/90 §8.9);<br>• a Time row;<br>• one finality line.<br>The CTA turns into "Approve in your wallet…" in place | WC-C10, TS-T9, TS-T10 | [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11), [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636), [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258), [Uniswap confirm in wallet](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) |
| U2-18 | Signing | A five-step list with 30/90 s notes becomes a **Wise-style 4-row tracker**:<br>• approved → signing → broadcast → confirmed;<br>• past tense and clock times on done rows;<br>• a timer on the active row, with the kb/90 thresholds 15/20/60/150 s;<br>• evidence on the step where it appears;<br>• a Details disclosure, **Minimize**, and a credit line | WC-C11, TS-T11, TS-T12 | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec), [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f), [Emergent](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) |
| U2-19 | Sent | The tracker becomes the **receipt**: "You can close this tab." plus **Done** / View activity. An info ring shows until the tx is confirmed; an exit toast confirms | WC-C12 | [Coinbase Wallet confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de), [Solflare success](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [MoonPay](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de) |
| U2-20 | Failures | Every failure card runs title → what moved → conditional line → evidence → one action. "Signed, not sent" is a warning card shown in six places. Never "no signature exists" | WC-C13, TS-T13, TS-T14 | [Glow failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218), [Zomato](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700), [Phantom funds in transit](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) |
| U2-21 | Background | The sticky mini-bar becomes a **PendingPill** (mobile top, tense flip) and a **PendingCard** (desktop, bottom-right) | WC-C6, TS-T12 | [Phantom pill](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac), [Uniswap pending](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978), [WRITER](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc) |
| U2-22 | Error map | Presentation rule: field errors inline, flow errors on the failing row, no system alerts and no blocking modals for recoverable errors | WC-C14 | [Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef); anti-pattern [Binance web](https://mobbin.com/flows/6da2eab5-3db8-4a19-9e44-bf8a4c4fcb65) |
| U2-23 | Activity | A pinned **IN PROGRESS** group (with an inline **Broadcast now**); rows that read as sentences; tags only when not final; one row per sign request; inline detail; Show older; a NearBlocks footer | WC-C15…C17, NM-22 | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Family](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b), [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3) |
| U2-24 | Transfer | The card is the hero, with a "To" stub. Two-sided consequence rows (E-36 copy). R-18 receiver errors. The D-08 soft guard warns but does not block. A recipient card says "owns {n} Satchels". "Approvals are cleared" and the delegate line are deleted | NM-21, TS-T16 | [Posh](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a), [Revolut Business](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd), [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) |
| U2-25 | Handoff | End frame: the card under the recipient's avatar, a `TRANSFERRED` tag, overlapping avatars and a receipt. The success glyph is a chamfered tile. No confetti | NM-21, TS-T17 | [Family collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [GoHenry](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) |
| U2-26 | Sell | The Ready and Blocked states become one form:<br>• the **"Before you list"** checklist: the quiet period as a sentence + thin track, past signatures (advisory, with How to settle), USDC registration;<br>• price, with a currency segmented control;<br>• rows ending in a bold **You receive**;<br>• "While it's listed";<br>• **List for {price}** | NM-8, NM-9, TS-T8 | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273), [StockX ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0), [American Airlines](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb) |
| U2-27 | Listed | The cooling-down state is removed. The **ListedPanel** reads `LISTED FOR … · LISTING #id` with **Delist**. The FreezeBanner shows on every tab, with no countdown. The Delist AlertDialog is removed: the wallet is the confirmation | NM-7, NM-10, TS-T18 | [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb), [OpenSea cancel listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) |
| U2-28 | Sold | A sentence hero, a receipt and a **Withdraw** fallback. The card turns greyscale with `SOLD` | NM-11 | [Cash App "You sold"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75), [Revolut order executed](https://mobbin.com/screens/26da4623-eb14-46ff-91fc-9b70e147a2a4) |
| U2-29 | Buy | **Removed:** the "Pay with (USDC \| NEAR)" toggle (the listing fixes the currency) and the countdown. **Added:**<br>• a BUY FOR block with `LISTING #id`;<br>• YOU GET as the verified balance;<br>• a **GateLine** above Buy, and an in-button re-check;<br>• the listing-changed interstitial;<br>• the sticky buy bar on mobile;<br>• a "How buying works" strip | NM-12, NM-13, TS-T3, TS-T15 | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710), [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7), [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) |
| U2-30 | CleanHistory | A summary + rows becomes:<br>• a **Verdict** with one sentence per aggregate;<br>• **Checks** (contract, account);<br>• **Signatures**, grouped "Needs attention" / "Can't move coins";<br>• a **Sources** disclosure.<br>Also: a two-phase verdict, a trust chip and `1 OF 2 SOURCES` | TS-T1, TS-T2, TS-T4, TS-T5, NM-14 | [Polestar](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9), [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [CRED](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f), [Better Stack](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) |
| U2-31 | Hallmark | A badge + tooltip becomes **word + time + link** to the report. The tooltip is kb/90 §7.7 verbatim. On touch it is a link (a sheet is P2). The HallmarkStamp sits on the card's edge | NM-15, TS-T6 | [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d) |
| U2-32 | Market | MarketCard: a hairline card with a serial meta row, the `md` card, a PRICE \| BTC \| ETH stat row and a verdict footer that shows the SSR hint's age. Buyable listings first, blocked last. "Buyable in" is gone | NM-17 | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [OpenSea grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297) |
| U2-33 | Mint | The guard screen and the cross-fade become one **MintBar**, with the same layout when not connected. Adds a "What you get" checklist, a CTA that narrates the wallet and the **materialise** reveal | NM-20, VL-C15 | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec), [Portrait](https://mobbin.com/screens/e6439f66-3611-4297-b816-ac2f8c174410) |
| U2-34 | System | `banner.rpc-down` becomes one line with the duration and Retry. A RoleStrip appears for `dev` and `rc`. A provider outage shows only as `1 OF 2 SOURCES` or as an `unknown` verdict | TS-T19 | [incident.io](https://mobbin.com/screens/1de9fe66-840e-4a34-9f3c-2df7bc36438b), [Dialpad](https://mobbin.com/screens/6f48b680-0e25-4201-bfef-5b979d0a7029) |
| U2-35 | Copy | New keys per area (§Copy deck). **Deleted:**<br>• `sign.relay`, `access.*`, `oneclick.*`;<br>• `freeze.owner` / `.buyer` / `.done`, `sell.delist.confirm`;<br>• every cooldown string and "Pay with";<br>• the approval and delegate lines, every USD string.<br>`clean.ok` is replaced by the verdict copy | WC-C19, NM-23, TS-T2, TS-T14, TS-T18 | — |
| U2-36 | Motion | **Removed:** the card flip. **Added:** frost in/out, the hallmark stamp (520/32/1), materialise (600 ms), the tag stamp, the connector fill, the CTA morph, the tense flip, and a stack lift (P2). The handoff end frame is refined | VL-C25, NM-30, TS-K5 | [Apple adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57), [Apple Wallet lifted](https://mobbin.com/screens/02e940a1-bcd1-4eaa-b064-a7c66fe0c1de) |
| U2-37 | Tokens | CTA near-white pill, hairlines, `label`, `amount-hero`, ticker, Tag, 8 % banners, layout tokens (kb/81 R2) | VL-C1…C10, WC-T1…T6, NM-25…29, TS-K1…K5 | kb/81 R2 changelog |
| U2-38 | References | The "Mobbin was unavailable" web-research table becomes a summary that points to kb/82. The Revolut row is corrected: an in-place reveal, not a 3D flip. Rabby, LI.FI, Tokenbound and OpenSea Learn stay, as **copy references** | WC-C20, NM-24, TS-T20, VL-C26 | kb/82 |
| U2-39 | Constraint alignment | Data sources, types and state machines follow kb/90 §5.10, §7.3 and §8.6–8.9. Gone: `pending_signs`, `satchel_state`/`sig_log`, the worker, chainsig.js, the relay and prices | constraint | kb/90 §13 E-04, E-12, E-13, E-28 |
| U2-40 | Video | The beats fit ≤ 2:15 (D-17). The cooldown speed-ramp and the 1Click clip are removed. A frost → hallmark → buy → handoff beat is added | constraint, VL | — |

## R2 design decisions (where the researchers disagreed)
| # | Question | Positions | R2 decision | Why | Evidence |
|---|---|---|---|---|---|
| R2-D01 | Home on mobile | WC-C2: a stack from 2 Satchels, 76 px bands with balances. NM-19: a stack from 3, full cards for 1–2. VL-C16: the stack as polish, the grid as default | **A stack from 2 Satchels.** 56 px identity bands (serial + StatusPill); the newest card in full; no expand animation in P1. One Satchel = a full card. A grid of `md` from 640 px | Bands without balances keep "no numbers on metal" (R2-D05), and 56 px meets the 44 px target. It is CSS only (R2+0.75 h). Alice owns #1–#7, so the demo shows the alloy family | [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) |
| R2-D02 | Holdings: tiles or rows? | NM-3: a 2-up HoldingsTile under the card. WC-C4, VL-C13: ChainRows are the holdings | **ChainRows are the holdings:** the first content on the Wallet tab (on desktop, in the right column) | Tiles don't scale to 3 chains (SOL in P2), and they would duplicate rows that already carry the address, Copy, QR and explorer that judges need | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) |
| R2-D03 | Desktop action placement | NM §2.1: right column under the stats strip (OpenSea). WC §2.11, VL-C23, TS §2.1: the left sticky panel | **The left sticky panel:** card → owner ActionRow. For a visitor on a listed Satchel: price → GateLine → **Buy** | Keeps the object and its controls together while long tabs scroll (Mercury). The price and gate sit with Buy, which is OpenSea's real point. Design-lead override: UX-18 | [Mercury inspector](https://mobbin.com/screens/1f8f1adb-bd25-49ca-8b57-eeb682fd62d1), [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) |
| R2-D04 | Mobile actions: round buttons or a sticky bar? | VL §2.2: a round owner action row under the card. NM-5: a role-aware sticky bottom bar | **Owner:** a round **ActionRow** under the card (Send · Fund · Transfer · Sell or Delist), not sticky. **Visitor on a listed Satchel:** StickyBuyBar. **Flows:** PinnedActionBar | The owner's verbs are wallet actions attached to the object. The buy is the one purchase action the industry pins | [Revolut card](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764), [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) |
| R2-D05 | What is on the card face? | NM-2: owner + minted engraving on scrim. VL-C11: an owner chip on glass. D-23: the SVG shows status + `sig_count` | **In-app:** top-left serial + alloy name (scrim), top-right StatusPill (glass), bottom-left owner chip (glass), bottom-right chain marks. No balances, no minted date. **SVG:** the same plate, with `{n} SIGNATURES` engraved bottom-left instead of the owner | The owner chip carries the handoff "key". The minted date lives in the stats strip. The SVG shows exactly what D-23 and R-22 promise. Numbers on the face are decision UX-15 | [Revolut details flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764), [Blackbird](https://mobbin.com/screens/16bc9d96-d4f5-4c14-8d64-23314b632277) |
| R2-D06 | CTA | kb/81 rev 1 and WC: brushed silver on every primary. VL-C1: a polished silver pill. The brief: a near-white pill | **A near-white pill** (`--cta` → `--cta-2`, L span 0.056), for commit actions, one per view. Metal moves to objects (the card, the HallmarkStamp) | No credible product in the sample uses a metallic control; metal reads as an object | [Revolut](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c); anti-pattern [Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) |
| R2-D07 | The face for data labels | WC-T2 `micro` and VL `label`: JetBrains Mono caps. NM-25: Archivo caps 600 | **One role, `label`:** JetBrains Mono 500, 12/16, +0.04em, UPPER | Mono caps is the crypto-native data register. It keeps Archivo-expanded `engrave` for metal only, so the two caps voices never blur | [OpenSea chips](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Linear](https://mobbin.com/sites/sections/11fa0cf7-8a9c-41f1-b38f-66918fac01f4) |
| R2-D08 | `amount-hero` size | WC-T1: 44/48 → 56/60, with step-downs. VL: 40/44 → 48/52 | **44/48 → 56/60,** stepping down to 36/40 and 28/32. Ticker at `max(12px, 0.36em)` | The input is the most demanding case: 10 digits plus a ticker fit 358 px at 44 px. 0.36 em reproduces Solflare's ratio, and one rule covers VL's "dim the unit" | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151) |
| R2-D09 | Expired and Settling colours | TS-K2: Expired success, Settling info. NM §2.7: Expired neutral, Settling warning. The brief: settling is info | **Expired = success** (dead for good). **Settling = info** (in flight; time resolves it). **Unfunded = neutral `--fg-2`** | Settled and expired both mean "can never move funds". Settling belongs with "in mempool". Unfunded carries a caveat, so green would over-promise | [CRED tags](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f); anti-pattern [World App](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81) |
| R2-D10 | The card while listed | VL-C14: frost (proposed for the removed cooling-down state). TS Open question 4: keep it vivid, it's the product on sale | **Frost while listed, at every size,** as the "sealed" material: the hue is kept, ≤ 30 % desaturation, ≤ 6 % texture. The StatusPill and FreezeBanner carry the meaning. P2, cuttable | Listing freezes signing, and that freeze is the buyer's safety property. Frost shows it on the object (Revolut, Neo); the hallmark adds the positive signal. The alternative stays open as UX-19 | [Revolut frost](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb) |
| R2-D11 | The hallmark on touch | TS-T6: a bottom sheet. NM-15: a pointer to the report | **A link to the report's "How Satchel checks this" block,** which is server-rendered. Desktop also shows the §7.7 tooltip. The Pinterest-style sheet is P2 | No overlay to build, and the promise text is in the HTML for judges | [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [Pinterest](https://mobbin.com/screens/46522884-5524-44d4-b4e3-d1f864ad2875) |
| R2-D12 | Tracker rows | WC-C11: 4 rows, "Preparing" in the CTA, "Sent" as the header. TS-T11: 5 rows, including Prepared and Sent | **4 rows:** Approved in your wallet → Signing → Broadcast → Confirmed. `preparing` and `awaiting_wallet` render on the Review CTA (TS-T10). The header flips from "Sending" to "Sent" | The tracker starts when the watcher sees the record, so the first ✓ is "the wallet said yes". One fewer row keeps the active row in view at 390 | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) |
| R2-D13 | Where background progress sits | WC-C6, TS-T12: a pill under the TopBar on mobile, a card bottom-right on desktop. VL-C27: a floating glass pill above the bottom edge | **Mobile:** the PendingPill, top-centre under the TopBar. **Desktop:** the PendingCard, bottom-right | The bottom of the mobile screen belongs to the PinnedActionBar and the StickyBuyBar | [Phantom pill](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac), [WRITER](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc) |
| R2-D14 | Where toasts sit | VL Open question 8: top on mobile, bottom on desktop. WC §2.8: top-centre on desktop, above the pinned button on mobile | **Mobile:** above the pinned bar. **Desktop:** top-centre under the TopBar | A transient toast never shares a position with the persistent progress indicator | [Base web toast](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab), [Phantom "Sent"](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921) |
| R2-D15 | Delist confirmation | rev 1: an AlertDialog. NM-10: one sheet. The brief: no dialog-only flows | **No dialog and no sheet.** A consequence line sits next to **Delist**; the wallet approval is the confirmation; the button narrates | Delisting is reversible, so one confirmation is enough | [OpenSea canceling a listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) |
| R2-D16 | Does the pre-list check block List? | NM §2.5, TS-T8: List is disabled until every row is ✓. D-32: demo #4 must be listed while its history is blocked | **Two tiers.** Required rows gate List: the quiet period (`ERR_QUIET_PERIOD`) and USDC registration for a USDC listing. "Past signatures" is **advisory**: it shows ✕ and How to settle, and List stays enabled with "Buyers can't buy while it can still move coins." | The buyer gate protects buyers, and the seller must still be able to list #4 for the honest "blocked" demo. Decision UX-27 | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273) |
| R2-D17 | Landing hero | NM-18: a fan of the seven demo cards. VL-C17/C18: the live card #1, then a finishes section | **Hero = the live card #1** under the glow, with its real holdings line. The arc or wall of #1–#8 is the second section | Judges read the facts at first paint, and a fan hides #1's data. The arc can double as the OG/README image in P2. Decision UX-21 | [Coinbase Wallet site](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b), [Slash arc](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2) |
| R2-D18 | Review hero | WC-C10: the hero is what the recipient gets. TS-T9: a sentence headline. VL: `amount-hero` on top | **The h1 is "Send 0.0100 BTC":** a `label` "SEND" over the amount in `amount-hero`. Then the OutcomeCard: From −0.01000282 (including the fee) ↓ To +0.0100 | One heading carries both the sentence and the number. The From row shows the total leaving, which rev 1's pair hid | [Cash App withdraw](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122), [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) |
| R2-D19 | Activity row detail | WC-C17: a sheet on mobile, a page or side panel on desktop | **Inline expansion of the row,** the same pattern as CleanHistory rows. No sheet and no new route | One expandable-row pattern, SSR-friendly, with no overlay | [Phantom detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44), [Uber checkup](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549) |
| R2-D20 | Merging Activity rows | WC-C16 [ASSUMED]: one row per user action. SAT-241: NEAR events only | **P1:** one row per `sign_requested` request ("Sent 0.0100 ETH to 0x53f9…", parsed from the event's structured payload), plus transfer, list, delist and sale rows. "Received" deposit rows need chain histories, so they are **cut by default** (R2+1.5 h if wanted) | The structured payload already names the recipient and amount, so sends need no chain history | [Family activity](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b) |
| R2-D21 | Stats strip contents | NM: SIGNATURES · STATUS · LISTED FOR / LAST SALE · MINTED. VL: OWNER · STATUS · SIGNATURES · CHAINS · MINTED | **STATUS · SIGNATURES · LISTED FOR** (only when listed) **· MINTED** | OWNER is in the owner pill, CHAINS is on the card and in the rows, and LAST SALE needs another event read | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c) |
| R2-D22 | Transfer soft guard | NM §2.9: Transfer anyway / Wait buttons. TS-T16: an inline warning; the CTA stays enabled | **An inline warning with the D-08 copy.** The CTA stays enabled; no extra buttons | D-08 says the user can proceed, so no extra step is needed | D-08; [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) |
| R2-D23 | The verdict eyebrow | TS-K4: an `engrave` eyebrow | **A `label` eyebrow `CLEAN HISTORY`.** `engrave` appears only inside the HallmarkStamp | Keeps the stamped voice for metal, and the one-engrave-line rule | [CRED verification](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b) |
| R2-D24 | Warning-tier acknowledgement | WC Open question 4: a checkbox on Review only for the warning tier, never, or for every first-time address | **The warning tier only** | Nearly every testnet send goes to a first-time address. Gating all of them is friction without signal | [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) |
| R2-D25 | Clock times on done steps | TS Open question 8: absolute times break the relative-time rule | **Allowed inside flows** (tracker, receipt). Relative everywhere else, with UTC in `title` | Crypto users look up exact times, as Wise and Topper show | [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) |
| R2-D26 | "First send here" chip | TS-T9 [ASSUMED, S2]: P1 or P2. WC: P2 | **P2, advisory, cut by default** (R2+1 h) | It needs recipient parsing over all records in the browser | [Fuse review](https://mobbin.com/screens/24550378-619c-4a21-b382-d56e464a96ff) |
| R2-D27 | Modals, if H-19 says yes | rev 1: a centred Dialog. WC-C18: a right drawer | **A desktop right drawer** (≈ 430 px) that keeps the sticky card visible. Mobile stays a full page | The user always sees which Satchel is sending | [OpenSea web send](https://mobbin.com/flows/869d4492-aff4-49fe-b712-fb24af2cf2d9) |
| R2-D28 | A success eyebrow `KEYS HANDED OVER` | NM Open question 9 | **No.** The sentence comes first, and the handoff motion is the moment | Keeps one celebration and the engrave budget | [Cash App "You sold"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75) |
| R2-D29 | The Receive QR frame | WC Open question 3: the alloy frame (recommended) or `--surface-2` | **The alloy frame with a white plate;** text in the frame sits on glass | It is the identity moment of the demo's "fund" beat. Decision UX-22 | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Solflare dark receive](https://mobbin.com/screens/cab7112b-0cdb-4135-a50e-072424e0ab69) |
| R2-D30 | The glyph for "sent, not confirmed" | WC Open question 8: an info ring, a paper plane or three animated dots | **A static `--info` ring** with the words "In mempool" | An animation that runs for hours on testnet4 would claim activity the app can't see | [Coinbase Wallet confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) |

## TL;DR
- **Judge-first.** `/s/1` renders blocking on the server (kb/90 §8.1).
  - Above the fold at 390 px: the H1 "This NFT is a wallet.", the identity-only card under its alloy glow, the owner pill, and the first ChainRow with its explorer link.
  - Below: the Facts grid (full addresses as visible text), How it works and Verify.
  - No judge fact lives only in a tooltip, a collapsed disclosure, an `aria-label` or a `hidden` node.
- **Full-page flows** (D-26). Send, Transfer and Receive are pages. On mobile they look like sheets (flow bar + pinned action bar); on desktop they use a 480 px column.
- **Four statuses: Active · Signing · For sale · Sold** (E-37). There is no cooldown anywhere. The only wait is the 250-block quiet period before listing, shown as a calm sentence in "Before you list".
- **The object carries its state as material.**
  - Frost while it is listed (signing frozen).
  - A hallmark your browser strikes on its edge when the history checks clean.
  - Greyscale once sold, and a "materialise" reveal at mint.
  - No numbers on the metal.
- **Signing reads like a Wise transfer.**
  - The Review button becomes "Approve in your wallet…", then a 4-row tracker with past-tense clock times. That tracker becomes the receipt.
  - The copy changes at 20, 60 and 150 s (kb/90 §8.6).
  - With no relay, the page says "Keep this tab open until it says Sent." until broadcast.
- **Failures say exactly what moved.** "Signed, not sent" is a normal, recoverable state with **Broadcast again**, shown wherever the user looks.
- **Clean history reads like a car's health check:**
  - one verdict sentence;
  - the contract and account checks;
  - the signatures, grouped by whether they can still move coins;
  - the sources and the check time.

  Buy sits under a GateLine that repeats the verdict, and no override exists.
- **Measured numbers** (kb/90 §8.9):
  - MPC p50 6.7 s ("usually about 10 seconds");
  - BTC fee ≈ 282 sats at 2 sat/vB;
  - testnet4 "minutes to hours" to confirm;
  - 250 blocks ≈ 2 min 20 s;
  - SOL blockhash ≈ 36 s;
  - NEAR fee "≈ 0.004 NEAR (gas + permanent signature record)".
- **No USD anywhere** (kb/90 T7; the prices route is cut).

## IA & routes (aligned with kb/90 §8.1)
| Route | Purpose | Phase | Render (kb/90 §8.1) | Who sees what | The server HTML must contain |
|---|---|---|---|---|---|
| `/` | Landing (not connected); **My Satchels** (connected) | P1 | SSR landing; the owned list is a client island | Everyone | H1, the featured card's facts, links |
| `/s/[id]` | Satchel page, **Wallet** tab (default) | P1 | **Blocking SSR** (ids 1–7 prerendered) + 15 s client refresh | Everyone; actions depend on role | `<title>`, meta description, H1, owner, status, **full** addresses, balances with "read {t} ago", `sig_count`, the last signature with its link, lock facts, the Facts `<dl>` |
| `/s/[id]/activity` | **Activity** tab | P1 | SSR first page + client | Everyone | NEAR events with explorer links; a "Show older" link |
| `/s/[id]/sale` | **Sell** (owner) / **Buy** (visitor, listed) | P2 | Blocking SSR of the listing + the cached verdict *hint*. The browser checker gates Buy | Owner; visitors while listed (otherwise "isn't for sale") | listing, price, `listing_id`, `sig_count`, the verdict hint and its items |
| `/s/[id]/send?chain=btc\|evm\|sol` | Send | P1 (BTC, ETH) · SOL P2 (cut-1) | Client, full page | Owner | Guard text |
| `/s/[id]/transfer` | Transfer (gift), ending in the handoff | P1 | Client, full page | Owner | — |
| `/s/[id]/receive?chain=` | **Fund this Satchel** | P1 | SSR + an Incoming client island | Everyone (anyone may fund) | The addresses |
| `/market` | Listed Satchels | P2 | Blocking SSR + client | Everyone | Listings with their verdict hints and the hints' age |
| `/mint` | Mint a Satchel | P1 | Client | Connected accounts | — |
| `/contract` | Keyless and verification facts | P1 | Blocking SSR (cached 60 s) | Everyone | Contract id, role, code hash vs expected, "Account is locked (no access keys)", birth tx + block, signer-tx count, oldest tx, MPC version, `config()`, verify commands |
| `/s/[id]/opengraph-image` | Share card | P2 (cut-2) | File convention, revalidate 300 s | Crawlers | — |
| `/api/card/[id].svg` | NFT `media` | P1 static art; status + `sig_count` in SAT-292 (cut-2) | Route handler | Wallets | — |
| ~~`/s/[id]/access`~~ | Delegates | **cut** (D-13) | — | — | — |

Implementation notes:
- **Tabs are links.** `app/s/[id]/layout.tsx` renders the header, card and NavTabs, and each tab is its own `page.tsx`. Use `aria-current="page"`, not an ARIA tablist. Labels: Wallet · Activity · Sell (owner) or Buy (visitor, listed). The third tab is hidden from visitors when the Satchel isn't listed, but the route still answers.
- **Flows are full pages** (D-26).
  - On mobile a flow page hides the global TopBar and shows the **flow bar**: ✕ or **Minimize**, a centred title and a 2 px step hairline. The **PinnedActionBar** sits at the bottom.
  - On desktop the TopBar stays, and the flow renders in a 480 px column with "← Satchel #{id}" and the hairline.
  - The in-flight intent lives in `localStorage["satchel:pending:v1"]` (kb/90 §8.6), so leaving or reloading resumes.
  - If H-19 adopts modals: a desktop right drawer only (R2-D27).
- **Global chrome:**
  - TopBar: the ◆ SATCHEL wordmark (`engrave`), a `TESTNET` MetaChip, nav (My Satchels via the wordmark · Market (P2) · Mint) and the WalletButton. There is no bottom nav.
  - A **RoleStrip** under the TopBar for the `dev` and `rc` roles.
  - **PendingPill** (mobile) or **PendingCard** (desktop) while an intent is open.
  - A footer on every page, with the help link in the same place (WCAG 3.2.6).

## Screens & states

### Role × status matrix (what each viewer can do; kb/90 §5.10)
| Status (pill) | Derived from (kb/90 §5.14 `satchel(id)`) | Owner | Connected visitor | Not connected |
|---|---|---|---|---|
| **Active** | `listing == None` | Send · Fund · Transfer · Sell. "Before you list" shows the quiet period: "You can list in {n} blocks (~{t})" | Fund | Fund · Connect wallet |
| **Signing** (overlay on Active) | a `pending` record younger than 250 blocks, or a local in-flight intent | Send: a new one replaces the same nonce or inputs (kb/90 §8.7). Fund. Transfer stays allowed, with the D-08 soft guard on Review. Sell shows the quiet period | Fund; the pill says Signing | same |
| **For sale** | `listing` is set | **Delist** (primary) · Fund. Send and Transfer are disabled with "Signing is paused while listed." | **Buy**, enabled only when the browser verdict is `clean` or `empty` | **Connect wallet to buy** |
| **Sold** (flow end state, not stored) | a `sold` event | Seller: the Sold receipt | Buyer: the reverse handoff, then the owner view | — |

The quiet period comes from `config().cooldown_blocks` (250) and `satchel(id).listable_at`; the UI never hard-codes it. There is no post-listing wait of any kind (D-05 rev 2).

### Judge-first view: `/s/1` with no wallet (P1)
| Need | R2 design | References |
|---|---|---|
| "This NFT is a wallet" in 3 s | From the top:<br>1. MetaChips `TOKEN #1` `NEP-171` `NEAR TESTNET` `PATINA` with ⋯.<br>2. The `display` H1 "This NFT is a wallet." and the sub "Whoever owns Satchel #1 controls the coins at the Bitcoin and Ethereum addresses below."<br>3. The `lg` card under the alloy glow.<br>4. The OwnerPill "Owned by alice.testnet · 4 signatures".<br>5. NavTabs.<br>6. The BTC ChainRow with **mempool.space ↗**, above the fold (budget below).<br>All of it is in the blocking server HTML | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179) |
| AI judges (HTML readers) | `<title>`: "Satchel #1 — an NFT that controls Bitcoin and Ethereum addresses".<br>Meta description: "Satchel #1 is an NFT on NEAR testnet. It controls Bitcoin testnet4 address {btc} and Ethereum Sepolia address {evm} through NEAR Chain Signatures. Transfer the NFT and the new owner controls the funds."<br>The **FactsGrid** `<dl>`:<br>• CONTRACT (NearBlocks ↗) · TOKEN · OWNER · STATUS;<br>• SIGNATURES (count, with the last one ↗);<br>• BITCOIN TESTNET4 and ETHEREUM SEPOLIA, each with its **full address as visible text** and its balance;<br>• CONTRACT KEYS "none since birth ↗" (→ `/contract`);<br>• the data-source line.<br>No Suspense boundary sits above it (kb/90 §8.1) | [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Glow collectible detail](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e) |
| How it works | Three steps: a vertical stepper on mobile, three hairline columns with mono `01/02/03` on desktop. It is a real sequence, so the numbering is honest. Copy is in `how.*` | [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479), [Beside](https://mobbin.com/sites/sections/2cfd3169-f61f-4ca5-bd2a-67627febbc84) |
| Proof | **ProofGrid** cells:<br>• "Last send 0.0100 BTC · {t} · mempool.space ↗";<br>• "Last transfer alice.testnet → bob.testnet ↗";<br>• "Contract locked · no access keys ↗" | [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f) |
| Verify | **VerifyDisclosure**, "Stats for nerds", collapsed:<br>• the contract ↗;<br>• "Keys: none since birth" (birth tx ↗);<br>• "Code hash: matches the published build";<br>• per chain, the path `satchel/1/btc`, the derived address and an explorer ↗;<br>• the guarantee sentence;<br>• a copyable verify command (→ `/contract`).<br>It only adds detail: every judge fact is also visible outside it | [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea) |
| USD | None (kb/90 T7) | — |
| OG image (P2, cut-2) | A `--bg` field with a 12 % alloy glow. Left: the card at 560×353, rotated −4°, identity-only face. Right: `SATCHEL #1` (static Archivo wdth 125), "An NFT that is a wallet." (display 56, static wdth 100), the holdings **as text next to the card** ("0.0123 BTC · 0.0500 ETH", amount 32), "Testnet · owned by alice.testnet" and the URL. Alt: "Satchel #1 card holding 0.0123 BTC and 0.0500 ETH on testnet". Revalidate 300 s | [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) |

**Fold budget** at 390 × 844 in iOS Safari (about 660 px visible); re-measure on Day 2 (SAT-210):

| Element | Height (px) | Running total |
|---|---:|---:|
| TopBar | 56 | 56 |
| gap + MetaChips row | 12 + 22 | 90 |
| gap + H1 (2 lines, 32/36) | 12 + 72 | 174 |
| gap + sub (2 lines, 15/22) | 8 + 44 | 226 |
| gap + card `lg` 358×226 | 16 + 226 | 468 |
| gap + OwnerPill | 12 + 28 | 508 |
| gap + NavTabs | 8 + 44 | 560 |
| BTC ChainRow (72) | 72 | **632**: the row and its explorer link are visible |
| ETH ChainRow | 72 | 704 (below the fold) |

The owner view has no sub (−52) but adds the ActionRow (+76), so it lands at about the same point.

### Home `/` (P1)
| State | Condition | Shows | References |
|---|---|---|---|
| Landing | not connected | 1. **Hero:** the `label` eyebrow `NEAR CHAIN SIGNATURES · TESTNET`; the `display-xl` H1 "An NFT that is a wallet."; the sub; the CTA pill **See Satchel #1** and a secondary pill **Connect wallet**; the note "Testnet only. Coins here have no value."; the live card #1 `lg` under the glow with "Holds 0.0123 BTC · 0.0500 ETH · read 12 s ago".<br>2. **"Every Satchel has its own finish"** (P1 polish): seeded `sm` cards #1–#8 in an arc on desktop, a 2-column wall on mobile, each labelled with serial and alloy.<br>3. HowItWorks.<br>4. ProofGrid.<br>5. FAQ (P2).<br>6. Footer.<br>Every word is in the server HTML at first paint; motion touches only the glow and the card tilt | [Phantom hero](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9), [Slash arc](https://mobbin.com/sites/sections/eeb76425-0115-4de1-b56f-e6908ac898a2), [Coinbase Wallet site](https://mobbin.com/sites/sections/89fcfaf4-f0f3-4556-b301-8781beecf69b) |
| Loading | connected, fetching `nft_tokens_for_owner` | Static card-shaped skeletons: `--surface-2` on `--surface-1`, no pulse | [Locals](https://mobbin.com/screens/03fd9087-3149-4a8b-af6a-9dd82c88b01a) |
| Empty | owns 0 | A blank-plate illustration (a Gunmetal silhouette engraved "№ ————" with a dashed hairline edge), "You don't own a Satchel yet", one line, one CTA **Mint a Satchel**, and a text link "See Satchel #1" | [Coinbase Wallet empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946), [Believe](https://mobbin.com/screens/72fdd6b1-4b9d-4f5a-95b8-250ce7afa680) |
| One Satchel | owns 1 | The full card `lg` with its holdings line under it. The header reads "My Satchels" + **Mint** | — |
| Stack (mobile, below 640) | owns 2 or more | Cards in ascending serial order, top to bottom. Each earlier card collapses to a **56 px band** showing its own top row (serial + StatusPill); the newest card shows in full. Each band is a link to `/s/[id]` with the name "Satchel #3, Electrum, For sale". **No expand animation in P1**; P2 polish adds a lift (260/26/1) before navigating | [Apple Wallet stack](https://mobbin.com/screens/5b49ae4b-f03b-4e28-b662-eb5cf9cc83f6) |
| Grid (640 and up) | owns 1 or more | `md` cards: 2 columns from `sm`, 3 from `lg`. The caption under each reads "Satchel #3 · Electrum", the status, and the holdings line. On desktop a ⋯ menu offers Send · Fund · Copy addresses · View activity. A `NEW` tag shows for 24 h after a mint, buy or receive (P2) | [Family wallets](https://mobbin.com/screens/89c805b1-cf8b-46aa-b514-8a52339c60ec), [Family web row menu](https://mobbin.com/screens/0d16504e-cac4-4855-8290-415f3c1f110e), [OKX "New"](https://mobbin.com/screens/871cff2c-23a3-4349-967d-63ed7ca98ec7) |
| Error | RPC failed after retries | InlineAlert (E11) with **Try again** | — |

### Satchel page layout `/s/[id]` (P1)
**Order on mobile (390):**
1. TopBar, plus the RoleStrip (dev/rc) and the PendingPill (while an intent is open).
2. MetaChips row + ⋯ (overflow: Copy token ID (value previewed) · Contract facts → `/contract` · View on NearBlocks ↗ · Copy link · Share on X ↗).
3. H1. Visitor: `display` "This NFT is a wallet." + the sub. Owner: `h1` "Satchel #1", no sub.
4. **SatchelCard `lg`** under `--alloy-glow`, in its current material state (frost while listed).
5. Owner only: the **ActionRow**: Send · Fund · Transfer · Sell, which becomes **Delist** while listed.
6. **OwnerPill:** "Owned by alice.testnet · 4 signatures" (owner: "Owned by you · 4 signatures").
7. **FreezeBanner** while listed (on every tab). **SignedNotSentCard** for the owner while an intent is signed but not sent.
8. NavTabs: Wallet · Activity · Sell or Buy.
9. The tab content.
10. Visitor on a listed Satchel: the **StickyBuyBar**.

**Desktop (≥ 1024):**
- *Left 5 columns, sticky (top 88 px):* the card `lg` 440 under the glow → the owner's ActionRow, or for a visitor on a listed Satchel the BuyBlock (`BUY FOR` price → GateLine → **Buy**), with the HallmarkStamp on the card.
- *Right 7 columns:* MetaChips + ⋯ → H1 (+ sub) → OwnerPill → **StatsStrip** `STATUS · SIGNATURES · LISTED FOR · MINTED` → FreezeBanner → NavTabs → content.

| State | Condition | Shows |
|---|---|---|
| SSR default | the token exists | The order above, blocking-rendered |
| Not found | `nft_token` is null or the id isn't an integer | HTTP 404 with an Empty: "Satchel #{id} doesn't exist" / **Mint a Satchel** · **Go to My Satchels** |
| RPC down at SSR | NEAR RPC failed | Addresses still render (derived offline) with the last cached snapshot, "read {t} ago". `banner.rpc-down` as one line |
| Ownership changed while open | the 15 s poll sees a new `owner_id` | Banner `page.owner-changed`. A flow already signing continues; if it reaches the contract it fails `ERR_NOT_OWNER` (E3) |
| Pending signature (this browser) | an in-flight intent in `satchel:pending:v1` | PendingPill / PendingCard: "Sending 0.0100 BTC · 0:42". Tapping it reopens the tracker |
| Pending signature (elsewhere) | a `pending` record < 250 blocks old, no local intent | The pill says **Signing**, plus the info line `page.pending-elsewhere` |
| Signed, not sent | a record is `signed` and no chain tx matches (kb/90 §8.6 resume) | The **SignedNotSentCard** at the top of the Wallet tab, with **Broadcast again** (or the EVM nonce-gap note) |
| Listed | `listing` is set | Frost on the card, the For sale pill, FreezeBanner, ListedPanel (owner) or BuyBlock (visitor) |

### Wallet tab (P1; SOL row P2)
| Element state | Shows | References |
|---|---|---|
| Row loading | The chain label and address render immediately (they are derived); the balance is a 64×16 static skeleton | — |
| Row loaded | **ChainRow:**<br>• line 1: a 32 px chain icon, the network label (`h3`), the balance on the right (`amount` + ticker);<br>• line 2: the address (`mono` 13, truncated below `lg`, **full and grouped at `lg`**), **Copy** (✓ for 2 s), **QR**, and an explorer link on the right ("mempool.space ↗").<br>Flat rows on `--bg` with `--hairline` dividers | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Cash App copied](https://mobbin.com/screens/46f6bd70-201f-4ed1-b6f6-97716e8422a5) |
| One chain at zero | "0 BTC" with a **Fund** text button | — |
| **Every chain at zero** | A **FundCard** above the rows: "Fund this Satchel", the `wallet.fundcard` line, **Copy Bitcoin address** (CTA), a QR icon button and "Get testnet BTC ↗" | [Rainbow receive card](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a) |
| Incoming | "+0.0010 BTC incoming · unconfirmed" in `--info`. BTC from mempool stats; EVM and SOL from a balance delta | — |
| Stale (older than 60 s) or error | "Balance unavailable" + **Retry**; the address stays usable | — |
| Footer | `wallet.fresh` "Read from each chain {relative}." · **Fund this Satchel** (secondary pill; visitors) · FactsGrid · VerifyDisclosure · HowItWorks (visitors) | [Family "Owned by You"](https://mobbin.com/screens/2073dff0-7950-4c6a-8677-2c84e1667e9c) |

**ActionRow** (owner, mobile and desktop): four 48 px round buttons (Send ↑ · Fund ↓ · Transfer ⇄ · Sell ◇). A disabled button stays visible and gets a reason line under the row ([Wise](https://mobbin.com/screens/44daafcf-9304-46ce-8110-9323e4f5252b)):
- every chain at zero → Send disabled: "This Satchel has no BTC or ETH yet.";
- listed → Send and Transfer disabled: "Signing is paused while listed.", and Sell becomes **Delist**.

### Activity tab (P1)
| State | Shows | References |
|---|---|---|
| Loading | 4 static skeleton rows | — |
| Empty | "No activity yet" / "Sends, transfers and sales show up here. Deposits show on each chain's explorer." / **Fund this Satchel** | — |
| Loaded | An **IN PROGRESS** group pinned on top (client: local intents, Signing, In mempool, **Signed, not sent** with an inline **Broadcast now**). Then day groups (`label` headers `TODAY` · `NOV 10`) of TimelineRows, newest first. SSR renders the first page of NEAR events (FastNEAR tx API) | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Coinbase Wallet](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) |
| Row expanded | Inline detail: Date · Status · Network · Type · Amount · Fee · From/To (with Copy). Sends add the final tracker. **Named** explorer links: "View on mempool.space ↗", "View on Etherscan ↗", "View on NearBlocks ↗" | [Phantom detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44), [Wise complete](https://mobbin.com/screens/0e8e2a40-5a7b-4cc3-bcb2-f85932d08095) |
| Paging | The SSR page ends with a **Show older** link (`?before=`), so a no-JS judge can page. The footer reads "Missing something? See every event on NearBlocks ↗" | [Trust Wallet footer](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) |
| Partial | "NEAR history is unavailable right now. Check NearBlocks ↗" | — |
| Error | Alert with **Try again** | — |

### Receive / Fund `/s/[id]/receive` (P1)
| Element | Spec | References |
|---|---|---|
| Shell | A FlowPage titled "Fund Satchel #{id}". On mobile: ✕ and a pinned bar; on desktop: the 480 px column with a back link | [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a) |
| Chain switch | **ChainSelect** at the top (Bitcoin · Ethereum; Solana in P2), preselected from `?chain=`. With 2–3 fixed chains, visible segments beat a dropdown | — |
| QR card | An **alloy-framed** card (the token's seeded gradient, UX-22) holding a **QrPlate**: white, 240 px on mobile and 220 on desktop, ECC M, quiet zone ≥ 4 modules, the plain address, no logo. Under the plate, on glass: `BITCOIN TESTNET4 ADDRESS` (`label`) and the **full grouped address**, with the first two groups and the last group emphasised | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247) |
| Actions | **Copy address** (the CTA pill, pinned on mobile; toast "Bitcoin address copied"). **Share** (secondary), shown only where `navigator.share` exists | [Cash App](https://mobbin.com/screens/ffe644e0-472b-46c7-bfee-7e397b1ebf4a) |
| Info rows | Icon-led, `small` in `--fg-2`:<br>• ⚠ `fund.only.*` (this network only);<br>• ◷ `fund.time.*` (time to confirm);<br>• ⓘ "Anyone can fund a Satchel. Only its owner can send from it.";<br>• "Get testnet BTC ↗" | [Coinbase web](https://mobbin.com/screens/97dc93ce-f553-4425-9c11-6d68300c40cf), [Kraken web](https://mobbin.com/screens/55bf0aa1-ff50-4cff-aaf2-8debd869b868) |
| **Incoming** (client island, R2+0.5 h) | `INCOMING` (`label`), then a sequence: "◌ Waiting for a deposit…" → "+0.0010 BTC · in mempool" → "✓ Received 0.0010 BTC". BTC uses mempool `mempool_stats` then `chain_stats`; EVM and SOL use the 15 s balance poll. It never carries a judge fact | [Binance web](https://mobbin.com/screens/e2cf729b-0570-42b3-a7b2-001031f31da1) |

The addresses are derived, so there is no loading state for them; the SSR page carries them.

### Send `/s/[id]/send` (P1)
| Step / state | Shows | References |
|---|---|---|
| Guard: not connected | "Connect the owner's wallet" + **Connect wallet** | — |
| Guard: not owner | "You don't own Satchel #{id}" / "You're connected as {account}. Only {owner} can send from it." | — |
| Guard: listed | "Signing is paused" / "Satchel #{id} is listed for sale. Delist it to send." + **Go to Sell** | — |
| Guard: zero balance | "This Satchel has no {TICKER} yet." + **Fund this Satchel** | — |
| Guard: an unsent intent exists (kb/90 §8.7) | Shows *that* intent's tracker in its `signed_not_sent` state, with the InlineAlert "You have an unsent signed transaction. Broadcast it or replace it." and **Broadcast** · **Replace**. Replace keeps the same nonce or inputs | [Phantom funds in transit](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165) |
| **Form** (33 %) | **ChainSelect** (segments with balances: "₿ BTC 0.0123 │ Ξ ETH 0.0500") → **AmountInput** (`amount-hero`, centred, ticker suffix, `inputmode="decimal"`, no keypad) → "Available 0.0123 BTC" + **Max** directly under it ("Max leaves room for the network fee." once used) → **RecipientInput** → fee line "Network fee ~282 sats · paid by this Satchel" (or "Estimating fee…" / **Retry**) → pinned **Review**, disabled until valid | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Family](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984), [Uniswap](https://mobbin.com/screens/04498eb3-2576-4233-95ca-feac307135df) |
| **Review** (66 %) | The **ReviewCard** (component below). The BTC candidate is built and its txid collision-checked while Review is shown (kb/90 §8.2). The pinned CTA reads **Send 0.0100 BTC**, with the helper under it: "Your wallet will ask you to approve a request to satchel.<team>.testnet." | [Coinbase Wallet review](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636), [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11) |
| Approve (in place) | The Review stays, with its inputs locked. The CTA becomes "Preparing…" (`preparing`), then "◌ Approve in your wallet…" (`awaiting_wallet`), with "Check the Meteor or Intear window." under it. At 60 s: `sign.wallet.slow` | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Chime](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c) |
| **Tracker** (100 %) | **SigningProgress**, from the moment the watcher sees the record (`signing`). The flow bar shows **Minimize** rather than ✕ | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec) |
| Sent / Confirmed | The tracker after broadcast: the header "Sent 0.0100 BTC · to tb1q…y8sd"; rows 1–3 ✓ with times and links; row 4 pending with the per-chain note; "You can close this tab."; **Done** (CTA) and View activity. The exit toast reads "Sent 0.0100 BTC · in mempool" | [Coinbase Wallet confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) |
| Errors | Error map; flow errors render on the failing row | [Glow failed](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218) |

### Transfer `/s/[id]/transfer` (P1)
| Step / state | Shows | References |
|---|---|---|
| Guards | Not owner (E3). Listed: `xfer.blocked.listed` "Delist Satchel #{id} before transferring it." (`ERR_LISTED`) | — |
| **Recipient** (50 %) | **AccountInput** "To (NEAR account)", with a `view_account` existence check (debounced 400 ms). Once found, a RecipientCard appears: AccountAvatar · "bob.testnet" · "Account found · owns {n} Satchels" (NEP-181 `nft_supply_for_owner`).<br>Blocked, inline under the field:<br>• a missing account;<br>• self;<br>• the Satchel contract (`xfer.err.contract`);<br>• the MPC account (`xfer.err.mpc`), R-18.<br>An implicit 64-hex account is accepted with a note. The pinned CTA is **Review** | [Uniswap transfer](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112) |
| **Review** (100 %) | The card `md` as the hero, with an attached stub "To bob.testnet ✓ Account found". Then three consequence rows:<br>• (bob's avatar) "bob.testnet will control everything in this Satchel: 0.0123 BTC · 0.0500 ETH. Its addresses go with it, so anything sent to them later is bob.testnet's too.";<br>• (your avatar) "Only the new owner will be able to sign. You won't be able to send from it.";<br>• (⟲) "The signature history stays with the Satchel." (E-36).<br>Below: the **D-08 soft guard** when an intent is in flight (a warning banner that doesn't disable the CTA), then "This can't be undone. Only bob.testnet can transfer it back.", then **Transfer to bob.testnet** | [Posh](https://mobbin.com/screens/9742a4eb-ff59-4987-913f-8517cae6dc5a), [Revolut Business](https://mobbin.com/flows/65406c32-d2b9-41b6-b705-9ea200050edd), [WhatsApp](https://mobbin.com/screens/27d7395c-b7ae-404f-a414-4782c16b3b6b), [Webflow](https://mobbin.com/screens/8938ea06-2743-400e-b73e-03dec7280ff5) |
| In flight | The card rises into the lifted pose. The CTA reads "Approve in your wallet…", then "Transferring…". A 3-step subset shows under it: Approved → Transferring on NEAR → Done | — |
| Success | The **HandoffAnimation** (≈ 1.3 s, only after the final outcome). End frame:<br>• the card lands under bob's avatar with a `TRANSFERRED` tag;<br>• the two avatars overlap;<br>• the sentence "bob.testnet now controls 0.0123 BTC and 0.0500 ETH.";<br>• a receipt: From alice.testnet · To bob.testnet · NEAR transaction 7Gh…k2 ⧉ ↗ · 14:02 UTC;<br>• **View Satchel #1** · **Done**;<br>• toast "Transferred Satchel #1 to bob.testnet" | [Family collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [GoHenry](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) |
| Errors | Rejected → back on Review with "You cancelled in your wallet. Nothing changed." · `ERR_LISTED` · `ERR_BAD_RECEIVER` · `ERR_NOT_OWNER` · RPC | — |

### Sale tab, owner "Sell" (P2)
| State | Shows | References |
|---|---|---|
| **Before you list** (Active) | **ListChecklist** (component below):<br>• *required:* the quiet period, and USDC registration when the currency is USDC;<br>• *advisory:* past signatures.<br>Then **ListingForm**:<br>• `PRICE`, a currency segmented control (USDC \| NEAR; NEAR only if `usdc: None`, H-26) and an `amount-xl` input;<br>• the helper "Buyer gets 0.0123 BTC and 0.0500 ETH.";<br>• rows: Price · "Satchel fee: none" · "Listing deposit 0.01 NEAR · unused part refunded" · a bold **You receive 250.00 USDC** · "Paid to alice.testnet in the same transaction as the sale.";<br>• `WHILE IT'S LISTED` consequences;<br>• the pinned **List for 250.00 USDC**, disabled until the required rows pass | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273), [StockX ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0), [Wealthfront](https://mobbin.com/screens/21e99178-866a-43dc-aeab-f35d770ac38b) |
| Listing | The CTA narrates: "Approve in your wallet…", then "Listing…". A wallet rejection shows inline under it: "You cancelled in your wallet. Nothing changed." **Try again** | — |
| **Listed** | Frost forms on the card (400 ms); the pill reads **For sale**; toast "Listed for 250.00 USDC. Signing paused." The **ListedPanel** reads `LISTED FOR 250.00 USDC · LISTING #7` (`label`) with **Delist** (secondary pill) and `sell.delist.note`. The FreezeBanner (owner) shows on every tab. The helper `sell.reprice` reads "To change the price, delist and list again." **There is no countdown** | [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [StockX vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c) |
| Delisting | **No dialog.** The wallet approval is the confirmation, and the CTA narrates "Approve in your wallet…" → "Delisting…". Frost clears (600 ms); toast "Delisted. Signing resumed." | [OpenSea canceling a listing](https://mobbin.com/flows/17c58841-1ab0-4b13-aec9-09519bcadcbe) |
| **Sold** (seller) | The card turns greyscale with a `SOLD` tag. The sentence hero reads "You sold Satchel #3 to carol.testnet for 250.00 USDC." / "250.00 USDC arrived in your NEAR account." Receipt rows: Price · Buyer · Paid · Transaction ↗. If the `payout` event says `ok:false`: "250.00 USDC is waiting for you." + **Withdraw** (`withdraw_proceeds`) | [Cash App "You sold"](https://mobbin.com/screens/e1e2b66c-8096-4838-88b1-08ae12634e75), [Revolut order executed](https://mobbin.com/screens/26da4623-eb14-46ff-91fc-9b70e147a2a4) |
| Errors | `ERR_QUIET_PERIOD` → `sell.err.quiet` · `ERR_ALREADY_LISTED` · RPC | — |

### Sale tab, visitor "Buy" (P2)
| State | Shows | References |
|---|---|---|
| Not listed | "Satchel #{id} isn't for sale." The tab is hidden in the nav; the route still answers | — |
| SSR (no JS) | The BuyBlock (`BUY FOR 250.00 USDC` · `LISTING #7 · listed 4 min ago by alice.testnet`), YOU GET, and the CleanHistory **server hint** in muted type: "Server check 12 s ago: clean" and "Waiting for your browser's check". **Buy** disabled. AI judges read the verdict here (kb/90 §7.5) | [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) |
| Checking | Rows render from `sig_records` at once and each resolves on its own (rows say "Checking…"). The verdict reads "Checking 4 past signatures…". The GateLine reads "◌ Checking history…" and Buy is disabled | [CRED verification](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b), [ANZ Plus](https://mobbin.com/screens/f97469ad-a1bc-4b5a-a577-60a0adfec06a) |
| Clean / empty | The verdict sentence. The **HallmarkStamp** is struck on the card's edge (P2 polish). The GateLine reads "✓ Clean history · checked 8 s ago". **Buy for 250.00 USDC** is enabled | [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7) |
| Settling / blocked / unknown / unsafe | The verdict sentence and a danger-, warning- or info-tint banner at the top of the Buy panel, with the specific item and **See the signature**. Buy is disabled, and the reason is linked by `aria-describedby`. **No override.** Unsafe disables Buy with no recovery copy aimed at the buyer | [Coinbase web banner](https://mobbin.com/screens/7fa8f944-702b-4488-8de9-e0423e91c7a7), [Chime](https://mobbin.com/screens/55c01b3a-e6a4-4f34-be27-e94ca0091a21) |
| Payment line | "Paid in USDC." (fixed by the listing, D-14; there is **no currency toggle**). Connected: "You have 312.40 USDC." Short: "You have 120.00 USDC. You need 250.00 USDC." + "Get testnet USDC ↗" | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) |
| How buying works | A 3-glyph strip: "You pay → One transaction moves Satchel #3 to you and pays alice.testnet → You control the coins" | [eBay](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61) |
| Not connected | The CTA reads **Connect wallet to buy** and stays enabled; it opens the wallet selector | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) |
| Buying | The button changes in place: "Re-checking history…" (the synchronous browser re-check, kb/90 §7.5), then "Approve in your wallet…", then "Completing purchase…". If the verdict changes during the re-check, the CTA disables and the new verdict is announced | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5) |
| **Listing changed** | Before the call, the client re-reads `satchel(id)`. If `listing.id` or `sig_count` differs, it shows an inline interstitial in place of the BuyBlock: "This listing changed. Listing #7 at 250.00 USDC was replaced by listing #8 at 240.00 USDC. Clean history runs again." **Review new listing** · Cancel. Delisted: "alice.testnet delisted Satchel #3." A late `ERR_LISTING_CHANGED` maps to the same copy | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) |
| Refunded (USDC) | The used amount is `"0"` (kb/90 §5.12): "Not bought. Your 250.00 USDC was refunded." | — |
| **Success** | The reverse handoff (seller → you). Frost clears for the new owner. The end frame: the card large, "Satchel #3 is yours.", "You now control 0.0123 BTC and 0.0500 ETH.", a receipt (Price · Seller · Listing #7 · Transaction 8Fx…2k ⧉ ↗), **Open your Satchel**; toast "You bought Satchel #3"; Home shows `NEW` (P2) | [Apple Wallet "Done"](https://mobbin.com/screens/f6094101-de0a-445d-bb32-19b0f938bdc3), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) |
| Mobile | The **StickyBuyBar** shows "250.00 USDC" + **Buy**, with the GateLine as its footnote ("Clean history · checked 8 s ago", or the reason). The in-panel Buy button is hidden below `lg`, so there is never a second one | [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) |
| Desktop | The BuyBlock and GateLine in the left sticky panel; YOU GET, the CleanHistory report, Payment, How buying works and the disclosure on the right | — |

### Market `/market` (P2)
| State | Shows | References |
|---|---|---|
| Loading | 6 static MarketCard skeletons | — |
| Empty | "Nothing is listed right now." + **Mint a Satchel** | [Coinbase Wallet empty](https://mobbin.com/screens/5d85b022-d2d5-48a4-80e8-63a186f58946) |
| Loaded | The toolbar reads "{n} listed" with Sort (Newest · Price); filter chips (Buyable now · Has BTC · Has ETH) are polish (cut-4). The grid has 1 column on mobile, 2 from `sm`, 3 from `lg` and 4 from `xl`, with **buyable listings first and blocked ones last, with their reason** (demo #4 is the honest blocked example). Footer verdicts come from the SSR **hint**, labelled with its real age; only the Buy tab's browser check enables Buy | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243), [OpenSea grid](https://mobbin.com/screens/d1e7273b-e80a-488c-a523-78080458e297) |
| Error | "Couldn't load listings." + **Try again** | — |

### Mint `/mint` (P1)
| State | Shows | References |
|---|---|---|
| Ready / not connected | The Gunmetal placeholder card is the hero. Under it, the **MintBar**: `YOU GET` Bitcoin + Ethereum addresses │ `DEPOSIT` 0.02 NEAR · unused part refunded │ **Mint a Satchel**. When not connected, the same layout shows **Connect wallet to mint**. A "What you get" checklist follows: "Its own Bitcoin testnet4 address" · "Its own Ethereum Sepolia address" · "A finish set by its number" · "Only its owner can move the coins" | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec), [Portrait](https://mobbin.com/screens/e6439f66-3611-4297-b816-ac2f8c174410) |
| Minting | The CTA narrates: "Approve in your wallet…", then "Minting…". The placeholder shows the token's seeded grain at rest | [Uniswap buying an NFT](https://mobbin.com/flows/2925d9fc-3c0d-456e-92ad-2117d93299fc) |
| Success | **Materialise:** the grain resolves into the alloy over 600 ms, and the serial engraving comes in. Then "Satchel #8 is yours." (`display`) and "Minted in 8Fx…2k ↗". **Fund this Satchel** (CTA) · **Open Satchel #8**. Toast "Minted Satchel #8"; Home shows `NEW` (P2) | [Apple Wallet adding a card](https://mobbin.com/flows/f64a6b33-1eae-4b9b-bcf1-943e24690d57) |
| Errors | Not enough NEAR (E6) · "You cancelled in your wallet. Nothing was minted." · RPC | — |

### Contract facts `/contract` (P1)
A blocking SSR page (kb/90 §8.1). Its layout and copy depend on the contract role:

| Role | Shows |
|---|---|
| `rc` / `final` | `h1` "Born without a key" + the sub "satchel.<team>.testnet was created, deployed, initialized and minted in one transaction with no AddKey. Only `sign_for` can get signatures for its Satchels."<br>A FactsGrid:<br>• CONTRACT · ROLE;<br>• ACCESS KEYS: "Account is locked (no access keys)";<br>• BIRTH TX (↗ + block A);<br>• SIGNER TXS 0 · OLDEST TX = the birth;<br>• CODE HASH (SHA-256) vs EXPECTED (match ✓);<br>• MPC VERSION · CONFIG.<br>Then a "Verify it yourself" block of copy-paste commands (mono, each with Copy). Proofs come from FastNEAR (kb/90 §5.16) |
| `dev` | The RoleStrip, and the `h1` "Development contract". It says plainly that this account has keys and that the lock and code-hash checks are skipped |

References: [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Glow facts](https://mobbin.com/screens/c8df7d33-1540-4ad3-bb4a-e3b17b3c210e), [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea).

### Wireframes

Phone frames are 390 px with 46-column ASCII; desktop frames are ≥ 1024 px. Notes after a frame name the token or component. All frames follow kb/81 R2 tokens; ASCII can't show material, so frost, glow and the stamp are labelled.

**W1. `/s/1`, visitor, no wallet (the judge view, 390)**

```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]          Connect wallet │ TopBar 56: wordmark (engrave) + MetaChip
├──────────────────────────────────────────────┤
│ [TOKEN #1][NEP-171][NEAR TESTNET][PATINA] ⋯  │ MetaChips (label 12) + overflow menu
│ This NFT is a wallet.                        │ display 32/36, wdth 100
│ Whoever owns Satchel #1 controls the coins   │ body 15/22 --fg-2 (visitors only)
│ at the Bitcoin and Ethereum addresses below. │
│        ░░░░░ alloy glow ≤ 14 % ░░░░░         │ --alloy-glow behind the card (decorative)
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0001              ( ● Active ) │ │ card lg 358×226, identity only: no numbers on metal
│ │ PATINA                                   │ │
│ │                                          │ │
│ │ ( ◉ alice.testnet )               ₿  Ξ   │ │
│ ╰──────────────────────────────────────────╯ │
│ ◉ Owned by alice.testnet · 4 signatures      │ OwnerPill
│  Wallet    Activity                          │ NavTabs = links (aria-current)
│  ━━━━━━                                      │ 2 px indicator in the alloy accent
│ ₿ Bitcoin testnet4               0.0123 BTC  │ ChainRow 72: h3 label · amount + ticker
│   tb1qaa…y8sd   [⧉] [▦]     mempool.space ↗  │ ≈ 632 px: still above the fold
│ Ξ Ethereum Sepolia               0.0500 ETH  │
│   0x53f9…1C2A   [⧉] [▦]         Etherscan ↗  │
│ Read from each chain 12 s ago.               │ caption
│ [            Fund this Satchel            ]  │ secondary pill (--surface-3)
│ · · · · · · · · · · fold · · · · · · · · · · │
│ FACTS                                        │ label eyebrow; <dl> rows on mobile
│ OWNER            alice.testnet               │
│ BITCOIN TESTNET4                             │ the full address as visible text
│ tb1q aanv 9x7k m2rd 4hzc 0a8f 7xum d8z6 3kqe │
│ y8sd 4w            0.0123 BTC · mempool ↗    │
│ CONTRACT KEYS    none since birth ↗          │ → /contract
│ HOW IT WORKS                                 │ stepper; a real sequence
│ ① Mint a Satchel                             │
│ ② Only the owner can sign                    │
│ ③ Transfer the NFT, transfer the wallet      │
│ ▸ Verify these addresses (stats for nerds)   │ collapsed; extra detail only
└──────────────────────────────────────────────┘
```

Facts, How it works and Verify sit below the fold. Every fact is in the blocking server HTML. Full addresses appear as text in the Facts block, not only in an `aria-label`.

**W2. `/s/[id]`, owner, while a send is signing (390)**

```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]               (◉ alice) │ TopBar
│        ╭ ◌ Sending 0.0100 BTC · 0:42 ╮       │ PendingPill 36 (tap → tracker; static spinner
│        ╰─────────────────────────────╯       │ under reduced motion)
├──────────────────────────────────────────────┤
│ [TOKEN #1][NEP-171][NEAR TESTNET][PATINA] ⋯  │
│ Satchel #1                                   │ h1 (owner view: no visitor sub)
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0001             ( ◌ Signing ) │ │ StatusPill: spinner + Signing, on glass
│ │ PATINA                                   │ │
│ │                                          │ │
│ │ ( ◉ alice.testnet )               ₿  Ξ   │ │
│ ╰──────────────────────────────────────────╯ │
│     (↑)       (↓)        (⇄)        (◇)      │ ActionRow: 48 px round, --surface-3, 20 px icon
│     Send      Fund     Transfer     Sell     │ labels small --fg-2; at most 4
│ ◉ Owned by you · 5 signatures                │ OwnerPill
│  Wallet    Activity    Sell                  │
│  ━━━━━━                                      │
│ ₿ Bitcoin testnet4               0.0023 BTC  │
│   tb1qaa…y8sd   [⧉] [▦]     mempool.space ↗  │
│ Ξ Ethereum Sepolia               0.0500 ETH  │
│   0x53f9…1C2A   [⧉] [▦]         Etherscan ↗  │
└──────────────────────────────────────────────┘
```

The PendingPill sits under the TopBar, and the StatusPill reads Signing. The ActionRow attaches the owner's verbs to the object.

**W3. Home `/`, My Satchels, mobile stack (390)**

```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]               (◉ alice) │
├──────────────────────────────────────────────┤
│ My Satchels                         [ Mint ] │ h1 + secondary pill
│ 6 Satchels                                   │ small --fg-2
│ ╭──────────────────────────────────────────╮ │ band 56 = the card's own top row,
│ │ SATCHEL № 0001              ( ● Active ) │ │ a link: "Satchel #1, Patina, Active"
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0003            ( ⌗ For sale ) │ │ frost shows on the band
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0004            ( ⌗ For sale ) │ │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0005            ( ⌗ For sale ) │ │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0006              ( ● Active ) │ │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0007              ( ● Active ) │ │ the newest card shows in full
│ │ TITANIUM                                 │ │
│ │                                          │ │
│ │ ( ◉ alice.testnet )               ₿  Ξ   │ │
│ ╰──────────────────────────────────────────╯ │
│ Holds 0.0010 BTC · 0.0200 ETH                │ holdings line under the full card
└──────────────────────────────────────────────┘
```

On desktop (≥ 640) this becomes a grid of `md` cards with captions and a ⋯ menu (UX-17).

**W4. Fund `/s/[id]/receive` (390)**

```
┌──────────────────────────────────────────────┐
│ ✕               Fund Satchel #1              │ flow bar 56 (page styled like a sheet)
│ ( ₿ Bitcoin │ Ξ Ethereum )                   │ ChainSelect 44 (?chain= preselects)
│ ╭── alloy-framed card (token #1 gradient) ─╮ │ identity moment (Gemini web)
│ │    ┌──────── white QR plate ─────────┐   │ │ 240 px, quiet zone ≥ 4 modules,
│ │    │                                 │   │ │ ECC M, no logo, plain address
│ │    │               ▦▦▦               │   │ │
│ │    │                                 │   │ │
│ │    └─────────────────────────────────┘   │ │
│ │  BITCOIN TESTNET4 ADDRESS                │ │ label on glass
│ │  tb1q aanv 9x7k m2rd 4hzc 0a8f 7xum d8z6 │ │ first two + last group --fg 600;
│ │  3kqe y8sd 4w                            │ │ middle groups --fg-2 450
│ ╰──────────────────────────────────────────╯ │
│ ⚠ Send only Bitcoin testnet4 coins to this   │ icon rows, small --fg-2
│   address.                                   │
│ ◷ Testnet4 confirmations are irregular:      │ time to confirm (Kraken web)
│   minutes to hours.                          │
│ ⓘ Anyone can fund a Satchel. Only its owner  │
│   can send from it.                          │
│ Get testnet BTC ↗                            │
│ INCOMING                                     │ client island (Binance web "Recent deposits")
│ ◌ Waiting for a deposit…                     │ → "+0.0010 BTC · in mempool" → "✓ Received"
│ [      Copy address      ]  [   Share    ]   │ pinned: CTA + Share (Web Share API only)
└──────────────────────────────────────────────┘
```

Desktop: the same content in the 480 px column, with the QR at 220 px.

**W5. Send: the form (390)**

```
┌──────────────────────────────────────────────┐
│ ✕            Send from Satchel #1            │ flow bar
│ ━━━━━━━━━━━━━━━                              │ 2 px step hairline: 33 %
│ ( ₿ BTC 0.0123   │   Ξ ETH 0.0500 )          │ ChainSelect 44: balances in the segments
│                                              │
│               0.0100 BTC                     │ amount-hero 44/48, centred; ticker 0.36 em --fg-2
│       Available 0.0123 BTC   [ Max ]         │ small + chip (Max = real button)
│ TO                                           │ label
│ ┌──────────────────────────────────────────┐ │ resolved row (radius 12)
│ │ ₿ tb1q 9x7k m2rd 4hzc 0a8f 7xum    [ ✕ ] │ │ full grouped address, ends emphasised
│ │   d8z6 3kqe y8sd 4w                      │ │
│ │   ✓ Bitcoin testnet4 address             │ │ or "Satchel #4 · Cobalt" + alloy swatch
│ └──────────────────────────────────────────┘ │
│ ⓘ tb1… addresses look the same on testnet3,  │ Info tier: a static note
│   testnet4 and signet.                       │
│ Network fee ~282 sats · paid by this Satchel │ fee line (Uniswap gas line)
│                                              │
│ [                 Review                  ]  │ PinnedActionBar: 48 px CTA pill
└──────────────────────────────────────────────┘
```

Desktop: the 480 px column with "← Satchel #1" and the progress hairline; no keypad anywhere.

**W6. Send: Review as the exact outcome (390)**

```
┌──────────────────────────────────────────────┐
│ ←                Review send                 │ flow bar; step hairline 66 %
│                     SEND                     │ label
│                  0.0100 BTC                  │ h1 "Send 0.0100 BTC", amount-hero
│      to tb1q9x7k…y8sd · Bitcoin testnet4     │ small --fg-2
│ ┌──────────────────────────────────────────┐ │ OutcomeCard (tile 16, --surface-1)
│ │ ▧ Satchel #1 · Patina                    │ │ FROM, with the alloy swatch
│ │   −0.01000282 BTC           amount + fee │ │ the total leaving
│ │   ↓                                      │ │
│ │ ₿ To                         +0.0100 BTC │ │ TO = what arrives
│ │   tb1q 9x7k m2rd 4hzc 0a8f 7xum d8z6     │ │ full grouped address
│ │   3kqe y8sd 4w                           │ │
│ │   ✓ Bitcoin testnet4 address             │ │
│ └──────────────────────────────────────────┘ │
│ NETWORK FEE (EST.)    ~282 sats              │ <dl>: label / value
│                       paid by this Satchel   │
│ SATCHEL #1 AFTER      0.0023 BTC             │
│ NEAR FEE              ≈ 0.004 NEAR ⓘ         │ tooltip: "needs ≈ 0.1–0.3 NEAR free while
│                       paid by your NEAR acct │ signing (refunded)"
│ TIME                  Signing: usually ~10 s │
│                       Confirmation: minutes  │
│                       to hours on testnet4   │
│ Uses 3 coins from this Satchel, so it needs  │ BTC only, n > 1
│ 3 signatures.                                │
│ ☐ I checked this address                     │ warning tier only (real checkbox)
│ Bitcoin transfers are final. Check the       │ one finality line, --fg-2
│ address above.                               │
│ [            Send 0.0100 BTC              ]  │ CTA → "Preparing…" → "◌ Approve in your
│ Your wallet will ask you to approve a        │ wallet…" (in place; inputs locked)
│ request to satchel.<team>.testnet.           │
└──────────────────────────────────────────────┘
```

**W7. Send: the tracker that becomes the receipt (390)**

W7a: signing.

```
┌──────────────────────────────────────────────┐
│ ↙ Minimize            Sending 0.0100 BTC     │ header; Minimize, not ✕, while non-terminal
│ Usually about 10 seconds.                    │ ETA line: changes at 20 / 60 / 150 s
│ ✓ Approved in your wallet         14:02:11   │ done: past tense + clock time (UTC in title)
│ │                                            │
│ ◉ Signing with NEAR's signer network  0:07   │ active: bold, tinted, timer (aria-hidden)
│ │ Signing 3 inputs                           │ BTC only (E-08: one timer)
│ │ NEAR transaction 7Gh…k2 ↗                  │ evidence on the step where it appears
│ ○ Broadcast to Bitcoin testnet4              │ future: muted, hollow
│ ○ Confirmed                                  │
│ Keep this tab open until it says Sent.       │ --fg-2, calm (no relay, D-12)
│ SIGNATURES BY NEAR CHAIN SIGNATURES          │ credit (label)
│ ▸ Details                                    │ the ReviewCard, read-only
└──────────────────────────────────────────────┘
```

W7b: after broadcast. The same component is now the receipt.

```
┌──────────────────────────────────────────────┐
│ ✕                     Sent 0.0100 BTC        │ header flips at sent
│ to tb1q9x7k…y8sd                             │
│ ✓ Approved in your wallet         14:02:11   │
│ ✓ Signed by NEAR's signer network 14:02:19   │ + NearBlocks ↗
│ ✓ Broadcast to Bitcoin testnet4   14:02:21   │ + tx a1…9f ⧉ ↗
│ ◌ Confirmed                                  │ --info ring (static): never a ✓ before final
│   In mempool. Testnet4 confirmations are     │
│   irregular: minutes to hours.               │
│ You can close this tab. Activity keeps       │ shown from broadcast on
│ tracking it.                                 │
│ [                  Done                   ]  │ CTA
│ [              View activity              ]  │ secondary
└──────────────────────────────────────────────┘
```

W7c: a broadcast failure. The tracker keeps its rows, and the failing row hosts the SignedNotSentCard.

```
┌──────────────────────────────────────────────┐
│ ✓ Approved in your wallet         14:02:11   │
│ ✓ Signed by NEAR's signer network 14:02:19   │
│ ✕ Broadcast to Ethereum Sepolia              │ the failing row (rows above stay)
│ ┌ ⚠ Signed, not sent ──────────────────────┐ │ SignedNotSentCard: warning 8 %, not danger
│ │ Sepolia RPC isn't responding. Nothing    │ │ reason + what moved
│ │ has left Satchel #1 yet.                 │ │
│ │ The signed transaction is saved. Until   │ │ sign.notsent.explain
│ │ it's broadcast or replaced, it counts as │ │
│ │ an unused signature in this Satchel's    │ │
│ │ history.                                 │ │
│ │ [ Broadcast again ]           Details ▾  │ │ nonce 7 · 0.0100 ETH to 0x53f9…1C2A
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**W8. Activity with the IN PROGRESS group (390)**

```
┌──────────────────────────────────────────────┐
│  Wallet    Activity    Sell                  │
│            ━━━━━━━━                          │
│ IN PROGRESS                                  │ pinned group (Kraken)
│ [₿↗] Sending to tb1q…y8sd       −0.0100 BTC  │
│      Bitcoin testnet4 · 0:42     [SIGNING]   │ Tag only when not final (Mercury)
│ [Ξ!] Signed, not sent       [Broadcast now]  │ inline action (Revolut pending card)
│      Ethereum Sepolia · 14:02                │
│ TODAY                                        │ label day header
│ [₿↗] Sent to tb1q…y8sd          −0.0100 BTC  │ U+2212 for outgoing
│      Bitcoin testnet4 · 14:02  [IN MEMPOOL]  │
│ [◆⇄] Transferred to bob.testnet              │
│      NEAR testnet · 13:40                    │
│ [Ξ↗] Sent to Satchel #4 ▧       −0.0100 ETH  │ the counterparty's alloy swatch
│      Ethereum Sepolia · 10:15                │
│ [Ξ✕] Not signed: to 0x53f9…1C2A  0.0100 ETH  │ struck through + Tag
│      Ethereum Sepolia · 09:40     [FAILED]   │
│ NOV 10                                       │
│ [◆✦] Minted by alice.testnet                 │
│      NEAR testnet · 09:58                    │
│ Show older                                   │ ?before= link (SSR paging, no JS)
│ Missing something? See every event on        │
│ NearBlocks ↗                                 │
└──────────────────────────────────────────────┘
```

**W9. Sell: "Before you list" (owner, Active, inside the quiet period; 390)**

```
┌──────────────────────────────────────────────┐
│ Sell Satchel #3                              │ h1
│ BEFORE YOU LIST                              │ label; ListChecklist
│ ◷ Quiet period                               │ REQUIRED (contract: ERR_QUIET_PERIOD)
│   You can list in 143 blocks (~1 min 20 s)   │ countdown inside a sentence (AA)
│   ▰▰▰▰▰▰▰▰▱▱▱▱▱▱   107 of 250 blocks         │ thin track, role=progressbar
│ ✓ Past signatures                            │ ADVISORY: ✕ → How to settle ▾ (List stays
│   All 4 can no longer move coins             │ enabled; demo #4, D-32)
│ ! USDC payouts aren't set up                 │ REQUIRED for a USDC listing only
│   [ Register · 0.00125 NEAR ]                │ (StockX "Payout Method")
│ PRICE                                        │
│ ( USDC │ NEAR )                              │ currency: the listing fixes it (D-14)
│ [ 250.00                            USDC ]   │ amount-xl input
│ Buyer gets 0.0123 BTC and 0.0500 ETH.        │ helper
│ Price                          250.00 USDC   │ <dl> rows
│ Satchel fee                           none   │
│ Listing deposit 0.01 NEAR · unused refunded  │
│ You receive                    250.00 USDC   │ the one bold number (PayPal)
│ Paid to alice.testnet in the same            │
│ transaction as the sale.                     │
│ WHILE IT'S LISTED                            │ consequences (Wealthfront)
│ · You can't send from Satchel #3 or          │
│   transfer it.                               │
│ · Anyone can buy it at exactly 250.00 USDC,  │
│   right away.                                │
│ · The buyer gets everything in it.           │
│ · You can delist at any time.                │
│ [         List for 250.00 USDC            ]  │ pinned; disabled until the required rows pass
└──────────────────────────────────────────────┘
```

**W10. Listed (owner): frost, ActionRow, FreezeBanner, ListedPanel (390)**

```
┌──────────────────────────────────────────────┐
│ [TOKEN #3][NEP-171][NEAR TESTNET][ELECTRUM]⋯ │
│ Satchel #3                                   │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0003            ( ⌗ For sale ) │ │ frost layer under glass (P2)
│ │ ELECTRUM                                 │ │
│ │        ❄ · · frost · · ❄                 │ │
│ │ ( ◉ alice.testnet )               ₿  Ξ   │ │
│ ╰──────────────────────────────────────────╯ │
│     (↑)       (↓)        (⇄)        (◇)      │ Send/Transfer disabled; ◇ = Delist (primary)
│     Send      Fund     Transfer   Delist     │
│ Signing is paused while listed.              │ reason line
│ ┌ ❄ Signing paused while listed ───────────┐ │ FreezeBanner (frozen 8 %), every tab
│ │ No coins can leave Satchel #3 until you  │ │
│ │ delist it or it sells. Anyone can still  │ │ what still works (Lloyds)
│ │ fund it.                      [ Delist ] │ │ no countdown (E-37)
│ └──────────────────────────────────────────┘ │
│  Wallet    Activity    Sell                  │
│                        ━━━━                  │
│ LISTED FOR 250.00 USDC · LISTING #7          │ ListedPanel (label), OpenSea owner line
│ [ Delist ]                                   │ secondary pill; the wallet is the confirmation
│ Delisting is instant: buyers can't buy it    │
│ anymore, and sending and transfers resume.   │
│ To change the price, delist and list again.  │
└──────────────────────────────────────────────┘
```

**W11. Buy (visitor, listed, browser verdict clean; 390)**

```
┌──────────────────────────────────────────────┐
│ [TOKEN #3][NEP-171][NEAR TESTNET][ELECTRUM]⋯ │
│ This NFT is a wallet.                        │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0003            ( ⌗ For sale ) │ │
│ │ ELECTRUM                                 │ │
│ │        ❄ · · frost · · ❄                 │ │
│ │ ( ◉ alice.testnet )               ₿  Ξ   │ │
│ ╰──────────────────────────────────────────╯ │
│               ⬡ CLEAN HISTORY · 14:02 UTC ⬡  │ HallmarkStamp, struck on the card's edge
│ ┌ ❄ Signing paused while listed ───────────┐ │ buyer copy
│ │ The seller can't sign anything new, so   │ │
│ │ the history below is final for this      │ │
│ │ listing.                                 │ │
│ └──────────────────────────────────────────┘ │
│  Wallet    Activity    Buy                   │
│                        ━━━                   │
│ BUY FOR                                      │ label
│ 250.00 USDC                                  │ amount-xl
│ LISTING #7 · listed 4 min ago by alice       │ label --fg-muted
│ YOU GET                                      │
│ 0.0123 BTC · 0.0500 ETH                      │ verified balance
│ ◇ VERIFIED BALANCE · read 8 s ago            │ hallmark: word + time + link
│ CLEAN HISTORY                                │ label eyebrow
│ ✓ Clean. No past signature can move these    │ h2 verdict; role=status
│   coins.                                     │
│   4 settled · checked 8 s ago                │
│   Runs in your browser. Satchel's server     │ trust chip (CRED)
│   isn't trusted for this.                    │
│ CHECKS                                       │
│ ✓ Contract keys: none since birth            │
│ ✓ Code: matches the published build          │
│ ✓ Ethereum address: no delegated code        │
│ CAN'T MOVE COINS (4)                         │ grouped; needs-attention first
│ Ξ Ethereum · nonce 0              [SETTLED]  │
│   Would send 0.0100 ETH to 0x53f9…1C2A       │
│   Nonce 0 used by 0x8b…41 · 3 confirmations↗ │
│ Show all 4                                   │
│ ▸ Sources  ▸ How Satchel checks this         │
│ PAYMENT  Paid in USDC. You have 312.40 USDC. │ fixed by the listing: no toggle
│ HOW BUYING WORKS  You pay → one transaction  │
│ moves Satchel #3 to you and pays alice →     │
│ you control the coins                        │
├──────────────────────────────────────────────┤
│ 250.00 USDC                       [ Buy ]    │ StickyBuyBar (mobile)
│ ✓ Clean history · checked 8 s ago            │ GateLine (aria-describedby on Buy)
└──────────────────────────────────────────────┘
```

**Blocked variant (demo #4).**
- No stamp.
- A danger-tint banner at the top of the Buy panel: "1 past signature could still move coins" / "Nonce 4 isn't used yet. Until it is, whoever holds that signature can send 0.0100 ETH out of this Satchel." / **See the signature**.
- The StickyBuyBar footnote reads "Blocked: 1 unused signature", and **Buy** is disabled. There is no override.

**W12. Transfer, then the handoff storyboard (F1–F4)**

```
┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌──────────────────────────────┐
│ F1 Review                    │  │ F2 In flight (lifted)        │  │ F3 Handoff (≈ 1.3 s)         │  │ F4 Done (end frame)          │
│ Transfer Satchel #1          │  │                              │  │                              │  │      (◉bob)(◉you)            │
│ ╭──────────────────────────╮ │  │     ╭──────────────╮         │  │ (◉ You) ───────▶ (◉ bob)     │  │     ╭──────────────╮         │
│ │ № 0001         ( ● )     │ │  │     │ card ↑12 px  │ rot 6°  │  │         ╭card╮ → slides      │  │     │ № 0001  ₿ Ξ  │         │
│ │ (◉ alice)        ₿ Ξ     │ │  │     ╰──────────────╯         │  │                              │  │     ╰──────────────╯         │
│ ╰──────────────────────────╯ │  │                              │  │ key rotates 180°;            │  │      [TRANSFERRED]           │
│ │ To bob.testnet ✓ found   │ │  │ (◉ You)          (◉ bob)     │  │ colour rose → blue           │  │ bob.testnet now controls     │
│ (◉bob) bob.testnet will      │  │                              │  │ (owner colours)              │  │ 0.0123 BTC and 0.0500 ETH.   │
│   control everything:        │  │ ◌ Approve in your wallet…    │  │                              │  │ FROM   alice.testnet         │
│   0.0123 BTC · 0.0500 ETH    │  │   then "Transferring…"       │  │ runs only after the tx       │  │ TO     bob.testnet           │
│ (◉you) You won't be able     │  │                              │  │ succeeds: never              │  │ NEAR   7Gh…k2 ⧉ ↗            │
│   to send from it.           │  │ ✓ Approved                   │  │ optimistic                   │  │ TIME   14:02 UTC             │
│ (⟲) Its history stays.       │  │ ◉ Transferring on NEAR       │  │                              │  │ [View Satchel #1]            │
│ This can't be undone.        │  │ ○ Done                       │  │ reduced motion: 200 ms       │  │ [Done]                       │
│ [Transfer to bob.testnet]    │  │                              │  │ cross-fade + text            │  │ focus → the sentence         │
└──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘  └──────────────────────────────┘
```

On desktop the "You" and recipient avatars sit left and right of the 480 px column, giving a 520 px slide distance.

**W13. Market: MarketCards and the desktop grid**

```
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│ SATCHEL № 0003 · ELECTRUM [FOR SALE] │  │ SATCHEL № 0004 · ROSE GOLD [FOR SALE]│
│ ╭──────────────────────────────────╮ │  │ ╭──────────────────────────────────╮ │
│ │  card md 280×177 (frost layer)   │ │  │ │  card md 280×177 (frost layer)   │ │
│ │  identity only                   │ │  │ │  identity only                   │ │
│ ╰──────────────────────────────────╯ │  │ ╰──────────────────────────────────╯ │
│ PRICE          BTC          ETH      │  │ PRICE          BTC          ETH      │
│ 250.00 USDC    0.0123       0.0500   │  │ 1.00 NEAR      —            0.0100   │
│ ──────────────────────────────────── │  │ ──────────────────────────────────── │
│ ◇ Clean history · checked 12 s ago › │  │ ✕ Blocked: 1 unused signature     ›  │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
```

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]                                  My Satchels   Market   Mint   (◉ carol)│
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Market                                                                                       │
│ 3 listed                                                          Sort: Newest ▾             │
│ ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐     │
│ │ № 0003 · ELECTRUM        │  │ № 0005 · ANODIZED        │  │ № 0004 · ROSE GOLD       │     │
│ │ ╭──────────────────────╮ │  │ ╭──────────────────────╮ │  │ ╭──────────────────────╮ │     │
│ │ │ card md (frost)      │ │  │ │ card md (frost)      │ │  │ │ card md (frost)      │ │     │
│ │ ╰──────────────────────╯ │  │ ╰──────────────────────╯ │  │ ╰──────────────────────╯ │     │
│ │ PRICE     BTC     ETH    │  │ PRICE     BTC     ETH    │  │ PRICE     BTC     ETH    │     │
│ │ 250 USDC  0.0123  0.0500 │  │ 1.00 NEAR 0.0010  0.0100 │  │ 1.00 NEAR —       0.0100 │     │
│ │ ──────────────────────── │  │ ──────────────────────── │  │ ──────────────────────── │     │
│ │ ◇ Clean · 12 s ago     › │  │ ◇ Clean · 12 s ago     › │  │ ✕ Blocked: 1 unused    › │     │
│ └──────────────────────────┘  └──────────────────────────┘  └──────────────────────────┘     │
│   buyable first ─────────────────────────────────────────▶  blocked last, with its reason    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

**W14. Mint: ready, then materialise and success (390)**

```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]               (◉ alice) │
├──────────────────────────────────────────────┤
│ Mint a Satchel                               │ h1
│ ╭──────────────────────────────────────────╮ │ Gunmetal placeholder (seeded grain
│ │ SATCHEL № ————                           │ │ at rest while minting)
│ │ GUNMETAL                                 │ │
│ │                                          │ │
│ │                                    ₿  Ξ  │ │
│ ╰──────────────────────────────────────────╯ │
│ ┌──────────────────────────────────────────┐ │ MintBar (Base claim bar)
│ │ YOU GET     Bitcoin + Ethereum addresses │ │ label / small
│ │ DEPOSIT     0.02 NEAR · unused refunded  │ │
│ │ [            Mint a Satchel            ] │ │ CTA; not connected: "Connect wallet
│ └──────────────────────────────────────────┘ │ to mint" (same layout)
│ ✓ Its own Bitcoin testnet4 address           │ "What you get" (Portrait)
│ ✓ Its own Ethereum Sepolia address           │
│ ✓ A finish set by its number                 │
│ ✓ Only its owner can move the coins          │
│ · · · after the tx succeeds · · · · · · · ·  │
│ grain ░▒▓ resolves into the alloy (600 ms)   │ materialise (Apple Wallet adding a card)
│ Satchel #8 is yours.                         │ display
│ Minted in 8Fx…2k ↗                           │
│ [           Fund this Satchel             ]  │ CTA
│ [            Open Satchel #8              ]  │ secondary
└──────────────────────────────────────────────┘
```

**W15. Landing `/` (not connected; 390)**

```
┌──────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]          Connect wallet │
├──────────────────────────────────────────────┤
│ NEAR CHAIN SIGNATURES · TESTNET              │ label eyebrow
│ An NFT that                                  │ display-xl 40/44 (64/68 at ≥ 1024)
│ is a wallet.                                 │
│ Each Satchel controls its own Bitcoin and    │ body --fg-2
│ Ethereum addresses. Transfer the NFT and     │
│ you hand over the wallet.                    │
│ [    See Satchel #1    ] [ Connect wallet ]  │ CTA pill + secondary pill (Phantom pair)
│ Testnet only. Coins here have no value.      │ persistent note (Slash)
│        ░░░░░ alloy glow (#1 Patina) ░░░░░    │
│ ╭──────────────────────────────────────────╮ │
│ │ SATCHEL № 0001              ( ● Active ) │ │
│ │ PATINA                                   │ │
│ │                                          │ │
│ │ ( ◉ alice.testnet )               ₿  Ξ   │ │
│ ╰──────────────────────────────────────────╯ │
│ Holds 0.0123 BTC · 0.0500 ETH · read 12 s    │ real data in the SSR HTML
│ ago                                          │
│ · · · · · · · · · · fold · · · · · · · · · · │
│ Every Satchel has its own finish             │ h2; 2-column wall of #1–#8 (sm cards)
│ [№1 Patina]   [№2 Anodized] [№3 Electrum]    │ desktop: an arc (Slash), CSS transforms
│ [№4 Rose G.]  [№5 Anodized] [№6 Cobalt]      │
│ HOW IT WORKS · PROOF · (P2) FAQ · FOOTER     │
└──────────────────────────────────────────────┘
```

Desktop: the hero splits into H1 + CTAs on the left and the lit card #1 on the right, under the glow (Phantom composition); the finishes section becomes an arc of #1–#8 (Slash).

**WD1. Desktop `/s/[id]`, owner (≥ 1024; 12 columns, max 1200, 48 px gap)**

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]                               My Satchels   Market   Mint   (◉ alice.testnet) │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ░░░░ alloy glow ░░░░                        [TOKEN #1] [NEP-171] [NEAR TESTNET] [PATINA]   ⋯      │
│  ╭──────────────────────────────────╮        Satchel #1                                            │
│  │ SATCHEL № 0001      ( ● Active ) │        ◉ Owned by you · 4 signatures                         │
│  │ PATINA                           │        ┌────────┬────────────┬────────┐                      │
│  │                                  │        │ STATUS │ SIGNATURES │ MINTED │                      │
│  │      card lg 440 × 277           │        │ Active │ 4          │ Nov 10 │                      │
│  │ ( ◉ alice.testnet )       ₿  Ξ   │        └────────┴────────────┴────────┘                      │
│  ╰──────────────────────────────────╯         Wallet    Activity    Sell                           │
│     (↑)      (↓)       (⇄)      (◇)           ━━━━━━                                               │
│     Send     Fund    Transfer   Sell         ₿ Bitcoin testnet4                  0.0123 BTC        │
│  (sticky panel, top 88 px; 5 columns)          tb1q aanv 9x7k … y8sd 4w  ⧉ ▦  mempool.space ↗      │
│                                              Ξ Ethereum Sepolia                  0.0500 ETH        │
│                                                0x53f9 a1b2 … 9c3e 1C2A   ⧉ ▦  Etherscan ↗          │
│                                              Read from each chain 12 s ago.                        │
│                                              FACTS: 2-column hairline grid (Public)                │
│                                              ▸ Verify these addresses                              │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**WD2. Desktop `/s/[id]/sale`, visitor on a listed Satchel**

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ SATCHEL  [TESTNET]                               My Satchels   Market   Mint   (◉ carol.testnet) │
├────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ╭──────────────────────────────────╮        [TOKEN #3] [NEP-171] [NEAR TESTNET] [ELECTRUM] ⋯      │
│  │ SATCHEL № 0003    ( ⌗ For sale ) │        This NFT is a wallet.                                 │
│  │ ELECTRUM                         │        ◉ Owned by alice.testnet · 4 signatures               │
│  │     ❄ · · frost · · ❄            │        ┌──────────┬────────────┬─────────────┬────────┐      │
│  │ ( ◉ alice.testnet )       ₿  Ξ   │        │ STATUS   │ SIGNATURES │ LISTED FOR  │ MINTED │      │
│  ╰──────────────────────────────────╯        │ For sale │ 4          │ 250.00 USDC │ Nov 10 │      │
│            ⬡ CLEAN HISTORY · 14:02 ⬡         └──────────┴────────────┴─────────────┴────────┘      │
│  BUY FOR                                     ❄ Signing paused while listed. The seller can't       │
│  250.00 USDC                                   sign anything new, so the history is final.         │
│  LISTING #7 · listed 4 min ago                Wallet    Activity    Buy                            │
│  ✓ Clean history · checked 8 s ago                                  ━━━                            │
│  [      Buy for 250.00 USDC      ]           YOU GET 0.0123 BTC · 0.0500 ETH                       │
│  The contract doesn't run this check;        ◇ VERIFIED BALANCE · read 8 s ago                     │
│  this app does.                              CLEAN HISTORY: verdict → checks → signatures          │
│  (sticky left panel)                         → sources → How Satchel checks this                   │
│                                              PAYMENT · HOW BUYING WORKS · disclosure               │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The left panel is sticky: the card, BUY FOR, GateLine and Buy stay visible while the report scrolls on the right (R2-D03).

### Demo video beats (≤ 2:15, D-17; designed to survive jump cuts)
| Beat | Screen | Must be visible | Edit note |
|---|---|---|---|
| 0:00–0:12 Hook | `/s/1` judge view | The H1, the identity-only card under the alloy glow, the BTC row with mempool.space ↗ | none |
| –0:35 Mint and fund | `/mint` → **materialise** → `/s/[id]/receive` | The grain resolving into the alloy; the QR plate in its alloy frame; the Incoming block flipping to "in mempool" | Speed-ramp the faucet wait |
| –1:00 Send ETH | Send: Review → "Approve in your wallet…" → tracker → receipt | The OutcomeCard; the running timer on the active row; "Sent" with Etherscan ↗ | Jump-cut the MPC wait, but keep the timer on screen before and after the cut |
| –1:30 Transfer, then Bob sends BTC | Transfer review → handoff (≈ 1.3 s) → Bob's browser sends BTC | "bob.testnet now controls…", the receipt, then "In mempool" with the info ring | Split screen with two browsers. Never wait for a BTC confirmation |
| –2:00 List, frost, hallmark, buy | Before you list (#3, EVM-only) → List → **frost** → carol's Buy tab → rows resolve → **hallmark strike** → Buy → reverse handoff → frost clears | The quiet-period sentence; the FreezeBanner; "Clean. No past signature can move these coins."; "Satchel #3 is yours." | No cooldown and no speed-ramp (D-05 rev 2). Cut to #4's blocked verdict for 2 s if time allows |
| –2:15 Repo | README | "do X → see Y" | none |

## Components
Primitive names are library-neutral. shadcn 4.22.1 `init -d` gives `base-nova` on `@base-ui/react`, and `--base radix|base` chooses between them; decide on Day 1 (kb/41). If the web lane picks Radix, map Toast to Sonner. Every primitive gets the kb/81 R2 override list (pill buttons, no `shadow-sm` cards, underline tabs, static skeletons, a compact toast), so the result never reads as stock shadcn.

### Inventory
| Component | Kind | Built on | Phase | Used in | vs rev 1 |
|---|---|---|---|---|---|
| TopBar, WalletButton, `TESTNET` MetaChip | custom | Button, Menu, Avatar | P1 | global | restyled |
| RoleStrip | custom | Alert | P1 | global (`dev`/`rc`) | **new** |
| SystemBanner (`banner.rpc-down`, offline) | custom | Alert | P1 | global | one-line |
| Footer | custom | — | P1 | global | three columns + footnotes |
| **FlowPage** (flow bar, step hairline, PinnedActionBar; desktop 480 column + back link) | custom | — | P1 | send, transfer, receive | **new**, replaces the responsive modal |
| PinnedActionBar · StickyBuyBar | custom | Button | P1 / P2 | flows / Buy | **new** |
| NavTabs | custom | Link, `aria-current` | P1 | `/s/[id]/*` | alloy indicator |
| MetaChips + OverflowMenu | custom | Menu | P1 (menu: polish) | `/s/[id]` | **new** |
| OwnerPill | custom | Avatar | P1 | `/s/[id]` | **new** (was the ownership line) |
| StatsStrip | custom | `<dl>` | P1 | `/s/[id]` desktop | **new** |
| **SatchelCard** (+ FrostLayer, HallmarkStamp) | custom | Aspect Ratio, Motion | P1 (frost P2, stamp P2 polish) | everywhere | **changed** |
| ActionRow | custom | Button | P1 | `/s/[id]` owner | **new** (was ActionBar) |
| StatusPill · Tag · MetaChip | custom | — | P1 | everywhere | Tag and MetaChip **new** |
| ChainChip / chain badge | custom | — | P1 (badge P2) | rows, review | kept |
| **ChainRow** | custom | Item | P1 | Wallet tab | **changed** |
| FundCard | custom | — | P1 | Wallet tab (all zero) | **new** |
| **AddressDisplay** + CopyButton + QrButton | custom | Button, Tooltip, Toast | P1 | rows, review, receive, facts | end emphasis |
| QrPlate · IncomingBlock | custom | QR library (A-12) | P1 | receive | **new** |
| ChainSelect | custom | Toggle Group | P1 | send, receive | balances in segments |
| **AmountInput** | custom | Field, Input | P1 | send, sell | `amount-hero` |
| **RecipientInput** · AccountInput + RecipientCard | custom | Field | P1 | send · transfer | resolved row, tiers |
| **ReviewCard** (OutcomeCard + rows) | custom | `<dl>` | P1 | send (pattern for transfer and buy) | **changed** |
| **SigningProgress** (tracker → receipt) | custom | `<ol>` | P1 | send; 3-step subset for list, buy, transfer, mint | **changed** |
| PendingPill / PendingCard | custom | — | P1 | global | **new** (was the mini-bar) |
| **SignedNotSentCard** · FailureCard | custom | Alert | P1 | flows, Wallet tab, Activity, Clean history | **new** |
| **Timeline** + TimelineRow | custom | `<ol>`, disclosure | P1 | Activity | **changed** |
| **HandoffAnimation** + Receipt | custom | Motion, Avatar | P1 | transfer, buy | end frame |
| AccountAvatar | custom | — | P1 | owner chip, handoff | kept |
| HowItWorks · FactsGrid · ProofGrid · VerifyDisclosure | custom | `<dl>`, `<details>` | P1 | landing, `/s/[id]`, `/contract` | restyled |
| FinishesArc / FinishesWall | custom | SatchelCard `sm` | P1 polish | landing | **new** |
| EmptyState · InlineAlert · Toast · Skeleton | shadcn | Empty, Alert, Toast | P1 | all | kb/81 overrides |
| **FreezeBanner** | custom | Alert | P2 | `/s/[id]` (every tab) | no countdown |
| ListChecklist · ListingForm · ListedPanel | custom | Field, Toggle Group | P2 | sale (owner) | **changed** |
| BuyBlock · **GateLine** · ListingChanged | custom | — | P2 | sale (visitor) | **new** |
| **CleanHistory** + CleanHistoryRow + Sources | custom | `<ul>`, disclosure | P2 | sale | **changed** |
| **Hallmark** (link chip) | custom | Tooltip | P2 | buy, market | word + time + link |
| MarketCard · MarketToolbar | custom | SatchelCard `md` | P2 | `/market` | **changed** |
| MintBar | custom | — | P1 | `/mint` | **new** |
| ~~Responsive modal (Dialog/Drawer)~~ · ~~Confirm (AlertDialog)~~ | — | — | — | — | removed (D-26, R2-D15) |
| ~~DelegateRow + CapMeter~~ · ~~OneClickStepper~~ | — | — | — | — | cut (D-13, D-19) |

### Shared types (kb/90 names)
```ts
type Chain = 'btc' | 'evm' | 'sol';
type SatchelStatus = 'active' | 'signing' | 'for_sale';                 // 'sold' is a flow end state (kb/90 §5.10)
type ItemStatus = 'spent' | 'expired' | 'unfunded' | 'settling' | 'unused' | 'unknown';   // kb/90 §7.3; the UI adds 'checking'
type Aggregate = 'checking' | 'empty' | 'clean' | 'settling' | 'blocked' | 'unknown' | 'unsafe';
type ChainBalance = { chain: Chain; base: bigint; decimals: number; display: string; incomingBase?: bigint; asOf: number; error?: boolean };
type Viewer = { kind: 'owner' | 'visitor' | 'anonymous'; accountId?: string };   // no delegate kind (D-13)
```

### SatchelCard
| Aspect | Spec | Reference |
|---|---|---|
| Props | `tokenId: string; size: 'lg'\|'md'\|'sm'\|'xs'; status: SatchelStatus; ownerId?: string; listed?: boolean; verdict?: Aggregate; sold?: boolean; isNew?: boolean; pose?: 'rest'\|'lifted'; loading?: boolean`. **Removed in R2:** `balances`, `fiat`, `face`, `onFaceChange` | — |
| Geometry | 1.586:1 (ISO ID-1); radius 3.72 % of width.<br>• `lg` 358 (mobile) or 440 (desktop);<br>• `md` 280;<br>• `sm` 160 (serial and chain marks only);<br>• `xs` 48×30 (alloy only, for rows);<br>• `swatch` 24×15 (inline in text) | [Apple Wallet settings list](https://mobbin.com/screens/d42ad951-70bf-4a3f-a5fd-94e0771bc74f) |
| **Face (identity only)** | • **Top-left:** `SATCHEL № 0001` (`engrave` serial 15/20 at `lg`, 12/16 smaller) on the scrim, with `PATINA` (engrave 12, scrim, `aria-hidden`) under it.<br>• **Top-right:** StatusPill on glass.<br>• **Bottom-left:** the owner chip on glass (AccountAvatar 20 + account in `small`); the handoff key lives here.<br>• **Bottom-right:** chain marks ₿ Ξ (◎ in P2) in `--chain-*-fg` on glass.<br>• **Centre:** material only.<br>**No balances, no addresses, no flip button.** | [Apple Card](https://mobbin.com/screens/23c06c82-2da7-4f30-9458-3e7c7e95b179), [Revolut details flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764) |
| Material | The seeded alloy gradient (table below), the 16 % specular, a fine brushed texture plus grain, and `--shadow-card`. The glow (`--alloy-glow`) sits behind it on `/` and `/s/[id]` only | [Altitude](https://mobbin.com/sites/sections/3a506c90-d418-404c-96ac-c3d55ff58c68), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c) |
| States | • loading: a static plate;<br>• default;<br>• Signing: a spinner pill;<br>• **listed → FrostLayer** (in 400 ms; out 600 ms on delist or after the sale);<br>• **HallmarkStamp**;<br>• lifted (handoff);<br>• **sold:** greyscale + a `SOLD` tag in the top-right, seller's view only;<br>• `NEW` tag (P2);<br>• reduced motion | [Revolut frost](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Mercury frozen](https://mobbin.com/screens/c1f80da4-f2a4-4d95-9928-966f7204a168), [OpenSea canceled](https://mobbin.com/screens/28b27959-e7b9-420c-b66a-4eba63243edf) |
| **HallmarkStamp** | • **Shape:** a chamfered `--stamp-*` plate, about 120×44 at `lg` (96×36 at `md`), struck across the card's **lower-right edge**, half on and half off. It reads as applied by your browser, not as part of the NFT art.<br>• **Text:** `◇ CLEAN HISTORY` (`engrave` 12) over `14:02 UTC` (`label`).<br>• **Behaviour:** a link to `#clean-history`. It appears only after the browser verdict is `clean` or `empty` and is removed if the verdict changes. Never in SSR, the SVG or the OG image.<br>• **Strike:** spring 520/32/1 (99 % at 141 ms).<br>• **Phase:** P2 polish; the fallback is the Hallmark chip only | [Commons stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5), [Solflare tile](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b), [Believe seal](https://mobbin.com/screens/72fdd6b1-4b9d-4f5a-95b8-250ce7afa680) |
| NFT SVG parity (D-23, R-22) | `/api/card/[id].svg` draws the same plate:<br>• top-left: serial + alloy;<br>• top-right: the status pill from contract state;<br>• **bottom-left: `{n} SIGNATURES`** (engrave on scrim) in place of the owner chip;<br>• bottom-right: chain marks;<br>• no balances;<br>• frost when listed (P2, inside SAT-292, cuttable) | [Blackbird](https://mobbin.com/screens/16bc9d96-d4f5-4c14-8d64-23314b632277) |
| Data | Seed: pure from `tokenId`. Owner: `nft_token`. Status: `satchel(id)` + records (kb/90 §5.10). Verdict: the browser checker | — |
| A11y | `<figure aria-labelledby>` with a visually hidden summary: "Satchel #1, Patina. Holds 0.0123 BTC and 0.0500 ETH. Status: active. Owner alice.testnet." The summary keeps the balances even though the face doesn't. Gradient, frost and texture layers are `aria-hidden`; the stamp is a real link. Tilt only on `(hover: hover) and (pointer: fine)`, never under reduced motion | — |

**Deterministic gradient seeding (same output in CSS, SVG and OG).** Unchanged from rev 1. The reference implementation for test vectors is `research/spikes/ux/card_seed.mjs`; re-implement it from this table.

| Step | Rule |
|---|---|
| 1 Seed | `seed = fnv1a32(utf8("satchel:" + tokenId))`. FNV-1a 32-bit: offset `0x811c9dc5`, prime `0x01000193`, `Math.imul`, `>>> 0`. The token id is the only input, so colours survive a `satchel-v2` redeploy |
| 2 PRNG | `rng = mulberry32(seed)`. The **draw order is part of the spec**: alloy, h1 jitter, Δ sign, Δ size, angle, sheenAt, highlightX, grain |
| 3 Alloy | `ALLOYS[floor(rng()*8)]`, each as name / base hue h / chroma C / jitter: Titanium 250/0.020/10 · Gunmetal 265/0.012/10 · Cobalt 262/0.120/10 · Anodized 302/0.110/12 · Rose Gold 22/0.075/8 · Electrum 86/0.080/8 · Patina 182/0.075/10 · Copper 50/0.100/8 |
| 4 Hues | `h1 = (h + (rng()*2−1)*jitter) mod 360`. `Δ = (rng()<0.5 ? −1 : 1) * (14 + rng()*16)`. `h2 = h1+Δ`. `hMid = h1 + Δ/2`. Never average wrapped hues: a first draft did, and it turned Rose Gold #8 teal |
| 5 Geometry | `angle = round(115 + rng()*50)` deg; `sheenAt = round(42 + rng()*18)` %; `highlightX = round(15 + rng()*70)` %; `grain = floor(rng()*1000)` (SVG feTurbulence seed; also the seed of the **materialise** grain) |
| 6 Stops (OKLCH, then sRGB hex) | 0 %: (0.26, 0.8C, h1) · 28 %: (0.42, C, hMid) · sheenAt %: (0.66, 0.6C, h2) · 76 %: (0.40, C, hMid) · 100 %: (0.24, 0.8C, h1). Out-of-gamut colours: bisect C down until in sRGB. Emit **hex**, so Satori and SVG need no OKLCH support |
| 7 Layers | CSS: `linear-gradient({angle}deg, s0 0%, s1 28%, s2 {sheenAt}%, s3 76%, s4 100%)`, then `radial-gradient(ellipse at {highlightX}% -10%, rgb(255 255 255/.16), transparent 60%)`, then a brushed texture `repeating-linear-gradient({angle+90}deg, rgb(255 255 255/.035) 0 1px, transparent 1px 3px)`, then `--shadow-card`. Listed: add the FrostLayer **under** glass and scrim (kb/81 R2) |
| 8 SVG parity | viewBox 856×540 (ID-1 ×10), `rx=31.8`. Use `gradientUnits="userSpaceOnUse"` with the CSS angle: line length `L = \|W·sinθ\| + \|H·cosθ\|`, endpoints `center ± (L/2)·(sinθ, −cosθ)`. Brushed texture: `feTurbulence type="fractalNoise" baseFrequency="0.9 0.02" seed={grain}` at 6 % opacity |
| 9 Identity accent | `oklch(0.80, min(1.2C+0.02, 0.14), h1)`: text-safe at 8.75:1 or better on `--surface-2`. It also feeds `--alloy` (glow, NavTab indicator, swatch) |

Test vectors **[VERIFIED]** (stops listed as 0 / 28 / sheen / 76 / 100):

| id | alloy | angle / sheenAt / hlX | stops | accent |
|---|---|---|---|---|
| 1 | Patina | 131 / 44 / 82 | `#002B27 #0C5A4B #799B8C #015545 #002622` | `#5CD5C7` |
| 2 | Anodized | 147 / 57 / 29 | `#2F1544 #503F83 #888FBB #4B397D #2A0F3F` | `#D4A7FF` |
| 3 | Electrum | 117 / 49 / 48 | `#302100 #65460F #A68D73 #604107 #2A1D00` | `#E1B760` |
| 4 | Rose Gold | 115 / 55 / 21 | `#3C1617 #703C34 #AC897E #6A372F #371112` | `#FDA19F` |
| 5 | Anodized | 142 / 52 / 78 | `#27184A #5B3B7D #A286AE #553577 #231344` | `#C1B0FF` |
| 6 | Cobalt | 126 / 54 / 18 | `#101E52 #0D4D8C #6799B9 #044886 #0C194C` | `#A2BCFF` |
| 7 | Titanium | 131 / 50 / 51 | `#1E252C #474D58 #90929A #424853 #1A2027` | `#A9C0DA` |
| 8 | Rose Gold | 133 / 56 / 35 | `#3C1619 #6F3B47 #AA8793 #693541 #371115` | `#FCA0A4` |
| 42 | Rose Gold | 131 / 50 / 17 | `#3C1616 #703D2F #AA8B7A #6A382A #371112` | `#FDA19E` |

Over ids 1–100,000 the alloys are evenly spread (12,232 to 12,672 each). **Satchel #1 comes out Patina (verdigris teal).** To change the demo token's look, change the salt string and regenerate the vectors. Don't special-case ids (UX-3).

### ChainRow · AddressDisplay · FundCard · ChainChip
| Component | Anatomy and props | States | A11y | Reference |
|---|---|---|---|---|
| **ChainRow** (the holdings; R2-D02) | `chain, networkLabel, balance, address, explorerUrl`.<br>• Line 1: a 32 px icon, the label (`h3`), and the balance on the right (`amount` + ticker).<br>• Line 2: AddressDisplay (truncated below `lg`, **grouped and full at `lg`**), Copy, QR, and the explorer link on the right.<br>• Flat on `--bg` with `--hairline` dividers, 72 px.<br>**Balance tiles are not adopted** (R2-D02) | loading amount · loaded · zero (Fund) · incoming · stale/error (Retry) | `Item` whose heading is the network label. The explorer link names the site and adds an sr-only "(opens in new tab)" | [Phantom rows](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Base home](https://mobbin.com/screens/638c39ce-9851-406d-8e42-4499884c49e4) |
| **AddressDisplay** | `address, chain, mode: 'truncated'\|'full'\|'grouped', copy?, qr?`.<br>• Truncated: the prefix + 4 … 4 (`tb1qaanv…y8sd`, `0x53f9…1C2A`).<br>• Grouped: 4-character groups with 0.35em gaps. **The first two groups and the last group in `--fg` 600, the middle groups in `--fg-2` 450**. Copying yields the raw string | default · copied (✓ for 2 s + toast) · QR open | Name: "This Satchel's Bitcoin testnet4 address {full}". Copy announces through the toast plus an sr-only status. The QR is `role="img"` with the full address | [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247), [Kraken](https://mobbin.com/screens/2ffd82a1-2182-444a-9585-600d4f53fa6a), [Cash App copied](https://mobbin.com/screens/46f6bd70-201f-4ed1-b6f6-97716e8422a5) |
| **FundCard** | A title, the `wallet.fundcard` line, **Copy {Chain} address** (CTA), a QR icon button and the faucet link | shown only when every chain is zero | A region named "Fund this Satchel" | [Rainbow receive card](https://mobbin.com/screens/2678db3f-1e59-4894-9560-10800e772a5a) |
| ChainChip / badge | A glyph + the ticker; a 14 px chain badge on 40 px icons (P2 SOL) | default · loading · zero · stale · error ("—") | The ticker text is always present | [Base home](https://mobbin.com/screens/638c39ce-9851-406d-8e42-4499884c49e4) |

### AmountInput · RecipientInput · AccountInput
| Component | Behaviour | A11y | Reference |
|---|---|---|---|
| **AmountInput** | • **Display:** `amount-hero`, centred, with a ticker suffix; `inputmode="decimal"`, and "," normalised to "."; **no custom keypad**.<br>• **Never wraps:** 44 px for up to 8 characters, 36 px for 9–11, 28 px for 12 or more.<br>• **Below it:** "Available {balance}" + **Max**; after Max, the note "Max leaves room for the network fee."<br>• **Validation:** positive · no more than max sendable · no more decimals than the chain allows · BTC dust per recipient type (P2WPKH 294, P2TR 330, P2SH 540, P2PKH 546 sats; E-03) · SOL new account ≥ 650,240 lamports (E-02).<br>• **Max:** BTC Σ UTXOs − fee (no change output); EVM balance − 21000 × maxFeePerGas; SOL balance − 5000 lamports, leaving 0 or at least the rent minimum | Label "Amount in BTC"; the error links via `aria-describedby`; Max is a real button "Use maximum: 0.0122 BTC" | [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151), [Family](https://mobbin.com/screens/d0871e4a-aa14-4a97-b0ec-3d17fd1a2984), [Cash App](https://mobbin.com/screens/b82c3268-4da8-48c0-ba4c-5b2d6027b332) |
| **RecipientInput** | • **Field:** "To", with a per-chain placeholder and a trailing **Paste** that calls `navigator.clipboard.readText()` on click. Validate on blur and on paste, not per keystroke.<br>• **Resolved row:** when valid, the input collapses into the chain icon, the full grouped address (two lines of mono), "✓ {network} address" and a clear ✕ that returns focus to the input.<br>• **Satchel recognition** via the `lib/derive` address → token index (kb/90 §8.2): another Satchel shows "Satchel #4 · Cobalt" with its swatch; this Satchel shows the `val.self` error.<br>• **Tiers:** below. The value survives retries | Polite status "Bitcoin testnet4 address accepted". Errors appear inline with a fix (WCAG 3.3.3) | [Glow](https://mobbin.com/screens/cde0563a-fb0d-40c4-83d1-6a0ee43791df), [Family Matching](https://mobbin.com/screens/e3fe7e0b-10cb-42e8-89d1-5117c792a3f1), [Brave](https://mobbin.com/screens/97cb6189-2078-4d6b-b591-0a2ecd89f4ef) |
| AccountInput + RecipientCard | NEAR account format, with a `view_account` existence check (debounced 400 ms).<br>• **Rejected:** self, missing accounts, the Satchel contract and the MPC account (R-18).<br>• An implicit 64-hex account is accepted with a note.<br>• RecipientCard: "Account found · owns {n} Satchels" | Status text in `aria-live="polite"` | [Uniswap transfer](https://mobbin.com/flows/e0f61b46-6290-4a24-bc69-69e826490112) |

Recipient validation (rev 1 rules + R2 tiers + kb/90 E-02/E-03):

| Chain | Accept | **Error** (blocks Review) | **Warning** (Review requires "I checked this address") | **Info** (static note) |
|---|---|---|---|---|
| BTC testnet4 | `tb1q…` (42 or 62 chars), `tb1p…` (62), `m…`/`n…`, `2…`. Validate with the **same call that builds the output script** (`address.toOutputScript(addr, networks.testnet)`) | `val.btc.mainnet` (`bc1…`/`1…`/`3…`) · `val.btc.regtest` · `val.btc.typo` · `val.self` | — | `val.btc.network` |
| EVM Sepolia | `0x` + 40 hex; mixed case must pass EIP-55 (`isAddress(a,{strict:false})` + `getAddress(a) === a`) | `val.evm.format` · `val.evm.typo` · `val.evm.zero` · `val.self` | `val.evm.nochecksum` · `val.evm.contract` (`eth_getCode`) | — |
| Solana devnet (P2) | base58 decoding to 32 bytes | `val.sol.format` · `val.sol.rent` (new account below 650,240 lamports) · `val.self` | `val.sol.pda` | — |
| Another Satchel's address | — | not an error: it resolves to "Satchel #{n} · {Alloy}" | — | — |

### ReviewCard (the exact outcome)
| Part | Spec | Source | Reference |
|---|---|---|---|
| Headline (`h1`) | `label` "SEND" over `amount-hero` "0.0100 BTC" (what the recipient gets); sub "to tb1q9x7k…4w · Bitcoin testnet4" | form | [Cash App withdraw](https://mobbin.com/screens/3604f666-86b7-40e4-b624-e3f8733dd122) |
| OutcomeCard · From | Alloy swatch, "Satchel #1 · Patina", "−0.01000282 BTC", "amount + fee" (U+2212) | computed | [World App](https://mobbin.com/screens/b1c9e68c-5190-41de-a034-f5e8cb06fd11), [Family confirm](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3) |
| OutcomeCard · To | Chain icon, "To", "+0.0100 BTC", the **full grouped address**, then "✓ Bitcoin testnet4 address" or "Satchel #4 · Cobalt" | form | [Binance](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) |
| NETWORK FEE (EST.) | BTC in sats: `max(2, halfHourFee)` sat/vB, so 1 in / 2 out ≈ 141 vB ≈ **282 sats**. ETH: "< 0.000001 ETH" when tiny. SOL: 0.000005 SOL. Then "paid by this Satchel" | mempool fees, viem, a constant | [Binance "Fee Paid By"](https://mobbin.com/screens/5f99db5f-92dd-4d01-b841-b1dbc6fd7258) |
| SATCHEL #1 AFTER | balance − amount − fee | computed | [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) |
| NEAR FEE | "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account" (kb/90 §8.9 verbatim); tooltip "Needs ≈ 0.1–0.3 NEAR free while signing (refunded)." | constants | — |
| TIME | "Signing: usually about 10 seconds", then "Confirmation: minutes to hours on testnet4" / "about 12 seconds" (ETH) / "a few seconds" (SOL) | kb/90 §8.9 | [Coinbase "Send time"](https://mobbin.com/screens/696427e3-11c5-4909-b314-aa09b816c539), [Family](https://mobbin.com/screens/efb3f375-645d-4d97-98cb-ab22e886f3e3) |
| BTC inputs note | "Uses {n} coins from this Satchel, so it needs {n} signatures." (only when n > 1) | UTXO selection | — |
| Warning-tier ack | `<input type=checkbox>` "I checked this address"; the CTA's description names it; warning tier only | validation | [Family web flow](https://mobbin.com/flows/eace7009-67af-4343-a927-bf9a89e212c4) |
| Finality line | "Bitcoin transfers are final. Check the address above." in `--fg-2`, directly above the CTA | — | [Coinbase Wallet](https://mobbin.com/screens/75af10f2-45e5-4e92-bea0-de82734bf636) |
| CTA | **Send 0.0100 BTC** (accessible name "Send 0.0100 BTC to tb1q9x7k…4w", WCAG 2.5.3). Pressed: "Preparing…" → "◌ Approve in your wallet…" + hint; inputs lock; the label swaps in 120 ms with no width animation | — | [Uniswap](https://mobbin.com/screens/a619a575-5745-4ad8-978c-b25aaaa9bfc5), [Chime](https://mobbin.com/screens/36840e42-67f7-4ef2-9663-d1d1b174324c) |
| Helper | "Your wallet will ask you to approve a request to satchel.<team>.testnet." P2: a "What your wallet will show" disclosure (method `sign_for`, deposit ≈ 0.005 NEAR) | — | — |

A11y: a `<dl>`. A blocking warning disables the CTA and links to it with `aria-describedby`. The same ReviewCard, read-only, is the tracker's "Details". Variants:
- **Transfer review:** the card hero + stub + rows (§Screens).
- **List:** inline in the form; it is reversible, so there is no separate review.
- **Buy:** "You pay −250.00 USDC ↓ You get Satchel #3, controlling 0.0123 BTC · 0.0500 ETH (verified balance)" ([OKX convert](https://mobbin.com/screens/97e8f3b8-9c5e-4834-895c-b744fbc64933)).

### SigningProgress (a tracker that becomes the receipt)
| Aspect | Spec | Reference |
|---|---|---|
| Props | `flow: 'send'\|'list'\|'buy'\|'transfer'\|'mint'; chain?; stage (kb/90 §8.6); startedAt; inputs?: number; nearTxHash?; chainTxId?; explorerUrl?; error?: MappedError`. **No `relay`** | — |
| Header | `h1` "Sending 0.0100 BTC", which becomes "Sent 0.0100 BTC" at `sent` (+ "to tb1q…y8sd"). The ETA line sits under it. **Minimize** (↙) at the top-left while non-terminal; ✕ once terminal | [Wise](https://mobbin.com/screens/dbd8e658-3f48-42f6-85d1-f9845a925cec), [Base44 minimize](https://mobbin.com/screens/4a18bfd3-4480-4beb-8b5f-8227ee274532) |
| Rows (send) | 1. "Approved in your wallet" (done on entry).<br>2. "Signing with NEAR's signer network" → "Signed by NEAR's signer network" + NearBlocks ↗.<br>3. "Broadcasting to {network}" → "Broadcast to {network}" + tx id ⧉ ↗.<br>4. "Waiting for 1 confirmation" → "Confirmed" | [Topper](https://mobbin.com/screens/cb2b7c34-808d-4778-89c0-f74d8ec60c2f) |
| Row states | • **future:** muted, hollow dot;<br>• **active:** bold, `--info` tint, a pulsing filled ring, the elapsed `m:ss` timer right-aligned (tabular, `aria-hidden`);<br>• **done:** ✓ (240 ms `pathLength`), past tense, a clock time `14:02:11` (`<time>`, UTC in `title`), evidence;<br>• **failed:** ✕ in `--danger`, with the FailureCard inline under the row | [Emergent](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) |
| ETA line (kb/90 §8.6, D-16) | 0 s: "Usually about 10 seconds." (kept until 20 s) · ≥ 20 s: "Taking longer than usual." · ≥ 60 s: "Still working. The network allows up to about 2 minutes." · ≥ 150 s: "Still waiting for the network. We'll keep checking." | [Binance web "no more than 30 seconds"](https://mobbin.com/screens/7fa354e5-f5d4-4a32-bd19-64a89c4ea8aa) |
| BTC inputs | "Signing {n} inputs" on the active row, with one timer (E-08) | — |
| Footer | • Before broadcast: `sign.keepopen` "Keep this tab open until it says Sent."<br>• From broadcast on: `sign.closeok` "You can close this tab. Activity keeps tracking it."<br>• The credit `SIGNATURES BY NEAR CHAIN SIGNATURES` (`label`).<br>• `▸ Details` (the ReviewCard, read-only) | [PandaDoc](https://mobbin.com/screens/6e7783c1-2ce2-4ba2-832d-bab89ec45f67), [MoonPay](https://mobbin.com/screens/f5692db8-3524-4280-a7d7-cc85875837de), [SoundCloud](https://mobbin.com/screens/cdaf74c3-e039-4276-ae2c-82025124ff20) |
| Subset (list, buy, transfer, mint) | Three rows: Approve in your wallet → {Listing \| Buying \| Transferring \| Minting} on NEAR → Done. For transfer and buy, the HandoffAnimation replaces "Done" | — |
| Sent / confirmed | Row 4 shows the **static `--info` ring** with `sent.note.{chain}` while unconfirmed. At `confirmed` it shows ✓ "Confirmed" and the chamfered success tile. Buttons: **Done** (CTA) and View activity | [Coinbase Wallet confirmation](https://mobbin.com/screens/5da71d79-d0f1-4927-b195-cd0624b796de) |
| A11y | `<ol>` with `aria-current="step"`. One app-wide `role="status"` region announces step changes, the ETA changes at 20/60/150 s and the result, never the timer. Errors use `role="alert"` and move focus to the failure title; success moves focus to the "Sent" heading. Minimize keeps signing (module-level store) and shows the `sign.minimized` toast | — |

### PendingPill · PendingCard
| Aspect | Spec | Reference |
|---|---|---|
| Mobile | A 36 px pill centred under the TopBar (`--surface-3`, `--fg` 13/18). States:<br>• "◌ Sending 0.0100 BTC · 0:42";<br>• "✓ Sent 0.0100 BTC" (160 ms cross-fade; hides after 5 s);<br>• "⚠ Signed, not sent · Broadcast now" (stays).<br>Tap or Enter reopens the tracker | [Phantom pill](https://mobbin.com/screens/6915b149-3288-4218-97c4-562ad17da7ac), [Uniswap](https://mobbin.com/screens/e8e4f1df-8b3a-44f2-8a1e-e02f9bba6978) |
| Desktop | A 320 px card at the bottom-right: title, step, timer, **View** | [WRITER](https://mobbin.com/screens/269c7d1c-02b9-4d4a-92fb-75ed3817bbbc) |
| A11y | A button with the full text. Changes are announced through the one status region. Its height joins `scroll-padding-top` | — |

### SignedNotSentCard · FailureCard
| Aspect | Spec | Reference |
|---|---|---|
| Structure (every failure) | 1. Title: what failed.<br>2. What moved and what didn't.<br>3. A conditional line for unknowns.<br>4. An evidence link.<br>5. One primary action | [Glow](https://mobbin.com/screens/dc7af07d-0e08-4954-a986-d9d9ff567218), [Zomato](https://mobbin.com/screens/2225c0f4-21e4-4ebb-a71f-1cf8aa070700), [GoPay](https://mobbin.com/screens/bfe3c74e-626b-45e9-809c-e67594c1a7d6) |
| **SignedNotSentCard** | A warning banner (8 % `--warning`; **never danger**):<br>• ⚠ "Signed, not sent";<br>• "{reason} Nothing has left Satchel #{id} yet.";<br>• `sign.notsent.explain`;<br>• **Broadcast again** (CTA) and Details ▾ (nonce or inputs · amount · to).<br>For an EVM nonce gap, the button is replaced by `sign.notsent.gap` | [Phantom funds in transit](https://mobbin.com/screens/646789e3-6a66-42d5-ae09-33688e7ba165), [Kraken in progress](https://mobbin.com/screens/ae576518-621e-4104-a64e-759c78fe4f95), [Posh](https://mobbin.com/screens/18b1e043-8db3-414c-b2c9-11a7d91402af) |
| Where it shows | 1. The tracker's failing row.<br>2. The top of the Wallet tab (owner).<br>3. Activity's IN PROGRESS group, with an inline **Broadcast now**.<br>4. The owner's CleanHistory row ("UNUSED · Broadcast now").<br>5. The Send page's new-send block.<br>6. The PendingPill | [Revolut pending card](https://mobbin.com/screens/5be4e584-20cf-45a5-aade-d505997121b7) |
| Rebuild source | The local intent; otherwise the record's `unsigned_tx` (EVM) or the `sign_requested` event (BTC), per kb/90 §8.6 resume | — |

### Timeline (Activity)
| Aspect | Spec | Reference |
|---|---|---|
| Groups | IN PROGRESS (pinned, client), then day groups (`label`: TODAY · YESTERDAY · NOV 10), newest first | [Kraken](https://mobbin.com/screens/6a9677cc-fe0e-42c4-8f7e-d152a4712b9d), [Coinbase Wallet](https://mobbin.com/screens/e7e068c7-5391-491c-b6a3-3d6f251f69b5) |
| Row | • **Icon:** 40 px chain icon, or the ◆ Satchel mark for NEAR events, with a 14 px action badge (↗ sent · ↙ received · ⇄ transferred · ✦ minted · ⌗ listed · ✕ failed).<br>• **Title:** verb + counterparty ("Sent to tb1q…y8sd", "Sent to Satchel #4 ▧").<br>• **Sub:** network · time.<br>• **Amount:** signed, on the right (U+2212 out; `--success` only for incoming).<br>• **Tag only when not final:** SIGNING · IN MEMPOOL · NOT SENT · FAILED · UNUSED.<br>• **Failed amounts:** `<del>` + sr-only "Failed:" | [Family](https://mobbin.com/screens/23d8d444-370b-41d4-900c-988b3e92118b), [Mercury](https://mobbin.com/screens/82e8f14d-9bf6-4956-bb4d-8d9306d167d3) |
| One row per request | One `sign_requested` event = one "Sent" row; the event's structured payload names the recipient and amount. A standalone "Signature issued · {Chain}" row appears only when no chain tx matches: that is the Unused case | — |
| Detail | Inline expansion: Date · Status · Network · Type · Amount · Fee · From/To (Copy) · NEAR transaction · **named** explorer links · the final tracker for sends | [Phantom detail](https://mobbin.com/screens/ed26d7c0-2041-4d73-8d36-aba8cb981e44) |
| Paging and footer | SSR first page + **Show older** (`?before=`); "Missing something? See every event on NearBlocks ↗" | [Trust Wallet](https://mobbin.com/screens/33ccda7e-9c7c-43b1-946d-35f8c894749f) |
| A11y | `<ol>` under day `<h3>`s; relative time with absolute UTC in `title` and `<time datetime>`; expansion is a button with `aria-expanded` | — |

### CleanHistory (verdict → checks → grouped signatures → sources and freshness)
| Part | Spec | Reference |
|---|---|---|
| Props | `aggregate: Aggregate; checkedAt; sources: {chain, provider, ok}[]; oneOfTwo: boolean; role: 'dev'\|'rc'\|'final'; checks: {name, result, ok}[]; items: {seq, chain, key, wouldPay, amountSource: 'chain'\|'claimed', evidence, evidenceUrl, status: ItemStatus\|'checking', signedAt, requester}[]; viewer: 'buyer'\|'owner'; hint?: {aggregate, at}` | — |
| **Verdict** | • The eyebrow `CLEAN HISTORY` (`label`).<br>• The verdict sentence with a status glyph (`h2` at 390, `h1` at ≥ 1024).<br>• Meta: "Checked in your browser {t} ago · {n} signatures · Sources ▾".<br>• A trust chip: "Runs in your browser. Satchel's server isn't trusted for this."<br>• A `1 OF 2 SOURCES` tag when H-25 applied | [Polestar](https://mobbin.com/screens/c0029cca-3635-4457-88b9-aebb38affec9), [Chime](https://mobbin.com/screens/11d18401-3658-454a-8275-b1352bc0d139), [CRED verification](https://mobbin.com/screens/a206bc2a-be00-4d8b-aae8-536d97a3330b) |
| **Checks** | Name + result rows:<br>• "Contract keys: none since birth (block {A})";<br>• "Code: matches the published build";<br>• "Ethereum address: no delegated code";<br>• "Solana account: plain wallet" (P2).<br>`dev` role: a warning row "DEV CONTRACT: lock and code checks skipped" | [Base44](https://mobbin.com/screens/998517e6-54d5-46d0-9caf-76480e38f897), [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549) |
| **Signatures** | Grouped: **Needs attention ({n})** (Unused, Settling, Can't verify) first, then **Can't move coins ({n})** (Settled, Expired, Unfunded). Three rows, then "Show all {n}" | [1Password grouped](https://mobbin.com/screens/f0dc40a5-1e3c-4698-b108-7f55eed340aa) |
| CleanHistoryRow (≈ 72 px) | • **Title:** "{Chain} · nonce 3" / "{Chain} · coin 7d…e2:1" / "{Chain} · blockhash 9f…".<br>• **Line 2, what it would pay:** "Would send 0.0100 ETH to 0x53f9…1C2A". BTC amounts come from the chain; otherwise they get "(claimed)" (R-23).<br>• **Line 3, evidence:** "Nonce 3 used by 0x8b…41 · 3 confirmations ↗".<br>• **Tag** on the right.<br>• **Expand:** signed at block and time (UTC) · requested by · sources · amount source.<br>• **Owner view:** **Broadcast now**, or the nonce-gap note, on Unused rows | [Uber](https://mobbin.com/screens/9d14d9b5-335d-45c8-b6a9-652245989549), [Tesla](https://mobbin.com/screens/a1ea4590-a32c-4634-94b0-5dd3e669e2af), [Trust Wallet nonce](https://mobbin.com/screens/ad69eb60-6926-4ad8-b26d-7a63407e2c35) |
| Unfunded row | Neutral `--fg-2` with ⓘ; the kb/90 §7.3 copy verbatim | — |
| **Sources** | Per chain, e.g. "Bitcoin: mempool.space ✓ · mempool.emzy.de ✓", plus the one-source note. **Disagreement shows as `unknown`, never as "1 of 2"** | [Better Stack](https://mobbin.com/screens/04a637bb-f2c3-4309-a47e-d912a00e7adc) |
| Checking and the two phases | • **SSR:** the server hint in muted type ("Server check {t} ago: clean") + "Waiting for your browser's check".<br>• **Client:** rows render from `sig_records` and resolve one by one as real results land (no fake stagger; 160 ms swap).<br>• A silent re-check every 10 s; only verdict changes are announced | [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6), [ANZ Plus](https://mobbin.com/screens/f97469ad-a1bc-4b5a-a577-60a0adfec06a) |
| How Satchel checks this | The kb/90 §7.7 badge promise **verbatim**, then "What it doesn't cover" (the kb/90 §4 list) and "README disclosure ↗". In the server HTML; it is the touch target of the Hallmark | [Portrait](https://mobbin.com/screens/e850a968-e00d-423f-b8ad-63183c2680ea), [eBay](https://mobbin.com/screens/00045a1b-52a7-484e-8e4b-00c6ecdc1d61) |
| A11y | The header is `role="status"` and announces verdict changes only. Rows are a `<ul>`; every status is a word; "Show all" is a disclosure button. The anchor `#clean-history` is the hallmarks' target | — |

### Hallmark · GateLine · FreezeBanner
| Component | Spec | Reference |
|---|---|---|
| **Hallmark** (chip) | A chamfered 1 px `--stamp-lo` outline with `label` text and a time: `◇ CLEAN HISTORY · checked 12 s ago` / `◇ VERIFIED BALANCE · read 8 s ago`.<br>• It is a **link** to its report section (`#clean-history`, `#you-get`).<br>• Desktop tooltip (hover and focus, dismissible with Esc, WCAG 1.4.13): §7.7 verbatim, or the verified-balance definition.<br>• **Never bare**: no word without a time.<br>• At most two per view | [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468), [Grailed](https://mobbin.com/screens/8ba1c2e2-e865-4353-8431-25fb5c827f2d), [Faire](https://mobbin.com/screens/ec87cac6-9e39-45f1-ac0c-c285dfba70c2) |
| **GateLine** | One line that repeats the verdict, directly above Buy (desktop) or as the StickyBuyBar footnote (mobile):<br>• "✓ Clean history · checked 8 s ago";<br>• "◌ Checking history…" / "◌ Waiting for your browser's check";<br>• "◷ Settling: 1 signature";<br>• "✕ Blocked: 1 unused signature";<br>• "? Can't verify 1 signature";<br>• "⛔ Unsafe: {reason}".<br>Buy's `aria-describedby` points to it | [GitLab](https://mobbin.com/screens/5e12f9b6-2f62-4363-ab08-130d054da0b7), [Lovable](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) |
| **FreezeBanner** | Two modes:<br>• **Owner:** ❄ "Signing paused while listed" / "No coins can leave Satchel #{id} until you delist it or it sells. Anyone can still fund it." / **Delist**.<br>• **Buyer:** ❄ "Signing paused while listed" / "The seller can't sign anything new, so the history below is final for this listing."<br>An 8 % `--state-frozen` banner with a 32 % border, on every Satchel tab while listed. **Never** a countdown, a progress bar, "Safe to buy in…" or "Buyable in…" (E-37). It is a `role="region"` named by its title, with no live updates | [Neo](https://mobbin.com/screens/fe341538-82f2-4cf5-a435-39c4767d54bb), [Lloyds](https://mobbin.com/screens/5c38f411-da4d-4d7b-b940-c35d348fbb21), [StockX vacation mode](https://mobbin.com/flows/4f2c77c8-2f3b-4093-be8d-f8718ac79e2c) |

### HandoffAnimation + Receipt
| Aspect | Spec | Reference |
|---|---|---|
| Props / states | `from, to, tokenId, balances, direction: 'give'\|'receive'` · idle · lifted (awaiting the tx) · moving · landed · reduced | — |
| Choreography | ≈ 1.3 s (Motion spec). It runs **only after the final success** | — |
| End frame (R2) | • The card settles under the recipient's avatar.<br>• A `TRANSFERRED` tag stamps in (160 ms).<br>• The two avatars overlap.<br>• The key takes the recipient's colour.<br>• **The sentence is the hero**, then the Receipt | [Family collectible](https://mobbin.com/flows/7312721c-ebfd-45db-ba67-80800e1e7e52), [Gojek](https://mobbin.com/screens/73608edd-f3b1-4675-84e7-f98610f418b9), [GoHenry](https://mobbin.com/screens/e1ca6ae4-c7fd-4df4-9fc2-843b65ff21ef) |
| Receipt | Key/value rows without rules: From · To · NEAR transaction ⧉ ↗ · Time (UTC). A buy adds Price · Seller · Listing #{id}. The same component serves Sent, Sold and Minted | [Wealthsimple](https://mobbin.com/screens/03537080-3a52-4b30-90f4-482c89dd47f8), [Solflare](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) |
| A11y | A polite live region: "Transfer complete. bob.testnet now controls 0.0123 BTC and 0.0500 ETH." Focus moves to the sentence. Under reduced motion: a 200 ms cross-fade with the same text | — |

### Status pills, tags, chips
| Component | Use | Spec | Reference |
|---|---|---|---|
| **StatusPill** | The Satchel's own state | Round, 24 px, padding 0 10 px, Archivo 12/16 600 in sentence case, a leading glyph, a 14 % tint. On the card it sits on glass | [Revolut "Virtual" pill](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Kraken Pro "Healthy"](https://mobbin.com/screens/87cf22f4-48fa-474b-9ac1-ffe8eba368b1) |
| **Tag** | Facts about items | Radius 4, 20 px, `label` 12/16 600 in caps, a 14 % tint, text in the tint colour:<br>• clean history: SETTLED · EXPIRED · UNFUNDED · SETTLING · UNUSED · CAN'T VERIFY · UNSAFE;<br>• Activity: SIGNING · IN MEMPOOL · NOT SENT · FAILED;<br>• other: TRANSFERRED · SOLD · NEW · 1 OF 2 SOURCES | [CRED](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f), [Fanatics](https://mobbin.com/screens/a5bdb78d-ce91-4563-afff-d11410cd1fc7), [American Airlines](https://mobbin.com/screens/ac125762-9da7-4dda-b694-8304e323c2bb) |
| **MetaChip** | Identifiers | 22 px, radius 6, a 1 px `--hairline-strong` outline, `label` in `--fg-2`: TOKEN #1 · NEP-171 · NEAR TESTNET · PATINA; also the TopBar TESTNET | [OpenSea chips](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) |
| Hallmark | Verification pointers | Above | [Airtasker](https://mobbin.com/screens/020508dc-1558-4a51-9ff0-ac606bf21468) |

### Sale, market and mint components (brief)
| Component | Spec | Reference |
|---|---|---|
| ListChecklist | Rows of icon + name + one-line result + an action:<br>• **required:** quiet period, USDC registration;<br>• **advisory:** past signatures, which expands to the Unused rows with **Broadcast now** or the nonce-gap note.<br>The quiet-period row has a thin `role="progressbar"` track (`aria-valuetext="107 of 250 blocks, about 1 minute 20 seconds left"`) | [incident.io](https://mobbin.com/screens/fafdfd29-02f9-4d8c-9b10-968732a53273), [Uber web](https://mobbin.com/screens/bcdfcebe-bae1-49be-ad03-6ebb4aafa322) |
| ListingForm | Currency segmented control → `amount-xl` → the "Buyer gets" helper → `<dl>` rows ending in a bold **You receive** → `WHILE IT'S LISTED` → **List for {price}** | [StockX ask](https://mobbin.com/flows/6f82d6d0-062c-4cdd-b04e-6f443fdbbac4), [PayPal](https://mobbin.com/screens/8feefab4-1137-4908-a2e0-c7abf5fae0f0) |
| ListedPanel | `LISTED FOR {price} · LISTING #{id}` (`label`) + **Delist** (secondary) + the note + "To change the price, delist and list again." | [OpenSea owner](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) |
| BuyBlock | `BUY FOR` / price (`amount-xl`) / `LISTING #{id} · listed {t} ago by {seller}` / GateLine / **Buy for {price}** (desktop); the StickyBuyBar on mobile | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [Crypto.com](https://mobbin.com/screens/562bbd94-69a4-4341-9316-a659a7f18a71) |
| ListingChanged | An inline interstitial in place of the BuyBlock: old → new listing, **Review new listing** · Cancel | [OpenSea buy](https://mobbin.com/flows/6bc78c50-a830-4798-8ba2-6325fbfdc710) |
| MarketCard | A `--hairline-strong` border with radius 12:<br>• a meta row: serial · alloy + a `FOR SALE` tag;<br>• the card `md` (frost);<br>• a PRICE · BTC · ETH stat row (`label` over `amount`);<br>• a hairline;<br>• the verdict footer (the hint, with its age) linking to `/s/[id]/sale` | [GOAT](https://mobbin.com/screens/41b34ef9-6ace-4461-bd75-a466f109b243) |
| MintBar | `YOU GET` · `DEPOSIT` · CTA in one bar; the same layout when not connected | [Base claim](https://mobbin.com/screens/13710827-c465-43f2-8e57-1b290526a9ec) |

### Controls (brief)
| Control | Spec | Reference |
|---|---|---|
| ChainSelect | A pill track in `--surface-2`; the active segment in `--surface-4` + `--fg`. 44 px on mobile, 36 on desktop. Segments read "₿ BTC 0.0123". Radiogroup semantics with arrow keys | [Phantom tabs](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca), [Fey](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) |
| NavTabs | Underline links. Active: `--fg` + a 2 px alloy indicator. Inactive: `--fg-2`. `aria-current="page"` | [OpenSea visitor](https://mobbin.com/screens/abac9c80-04ac-437f-b97d-50288159ad7c), [Coinbase web](https://mobbin.com/screens/b6cc1e50-d9d1-4fde-8bde-be39ee423912) |
| Buttons | CTA pill / secondary / tertiary / round action / destructive (kb/81 R2) | [Revolut](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [DICE](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322) |
| Toast | A compact `--surface-3` pill, 16 px icon, five words or fewer, one at a time. Mobile: above the pinned bar. Desktop: top-centre. The Base UI Toast `title` carries the message | [Phantom "Sent"](https://mobbin.com/screens/9da3bf28-bdef-4c74-a690-b074342ea921), [Base web](https://mobbin.com/screens/308eca8a-5791-434f-9e6b-4bb807b5e9ab) |
| Empty / Skeleton | A blank-plate illustration + one sentence + one CTA. Static skeletons. Waits longer than 2 s name their steps | [Coinbase Wallet empty](https://mobbin.com/screens/1fc3c65f-b166-44c7-a230-f2c4ea18d729), [Origin](https://mobbin.com/screens/0a3297f4-b800-471a-a2bc-8236974a31ac); anti-pattern [Garmin](https://mobbin.com/screens/a7c20d58-3803-40b3-a953-837f7546b6db) |

## State machines

### Data sources (aligned with kb/90; replaces rev 1's table)
| Data | Source (kb/90) | Refresh |
|---|---|---|
| Owner | `nft_token(token_id)` (NEP-171) | SSR; 15 s on the page; after every tx |
| Owned tokens; tokens of a recipient | `nft_tokens_for_owner`, `nft_supply_for_owner` (NEP-181) | on connect; after mint, transfer and buy; Transfer's RecipientCard |
| Satchel state: `sig_count`, `last_sign_height`, `listable_at`, `listing{id, price, currency, listed_at, sig_count}` | view `satchel(id)` (§5.14) | 5 s while Signing or listed; 15 s otherwise; **re-read synchronously right before Buy** |
| Quiet-period length | `config().cooldown_blocks` (250) | once |
| Height and block time | RPC `block` (finality `final`), average of the last 100 blocks (0.554–0.573 s) | 1 s while the quiet-period row is visible |
| Signature records | `sig_records(id, from_seq, limit ≤ 50)` | Sale tab; the contract watcher every 2 s while signing (kb/90 §8.6) |
| NEAR events (Activity) | FastNEAR tx API `/v0/account`, `/v0/transactions` | SSR first page; 15 s |
| Clean history | browser checker `lib/clean-history` (§7); server **hint** `GET /api/clean-history/[id]` (15 s cache) | every 10 s on the Buy tab, plus synchronously right before Buy |
| Addresses | own derivation `lib/derive` (noble; no chainsig.js) | never (SSR) |
| BTC balance, UTXOs, fees, status, broadcast | mempool.space testnet4 (+ mempool.emzy.de for `/outspends`) | 15 s; tx status every 30–60 s |
| ETH balance, nonce, fees, receipt, broadcast | Sepolia through viem (4-endpoint fallback) | 15 s; receipt every 3 s |
| SOL (P2) | devnet RPC | 15 s; status 1 s; blockhash refreshed every 10 s on Review |
| Signing progress | contract watcher (`sig_records` at seq ≥ s0, matched by payload) + `trackTx` long-poll (FastNEAR, dRPC failover) | 2 s / long-poll |
| NEAR account exists | `view_account` | debounced 400 ms |
| Buyer USDC balance; seller USDC registration | `ft_balance_of`, `storage_balance_of` | on the Sale tab |
| ~~Prices, 1Click, worker, indexer, `satchel_state`, `sig_log`~~ | cut or renamed (kb/90 §13 E-12, E-13, E-17; D-19, D-20) | — |

### SigningProgress (send): R2 presentation of kb/90 §8.6
The intent is persisted **before** the wallet opens: `localStorage["satchel:pending:v1"]` (`PendingIntent`, kb/90 §8.6). Stages and exits are kb/90's; this table adds what the UI shows.

| Stage (kb/90 §8.6) | Enter when | UI (R2) | Copy keys | Exits |
|---|---|---|---|---|
| `idle` | Review shown | ReviewCard; CTA **Send {amount}** | `send.review.*` | CONFIRM → `preparing` |
| `preparing` | Send tapped | The CTA reads "Preparing…" in place; inputs lock | `sign.step.prepare` | intent persisted → `awaiting_wallet`; error → `failed` |
| `awaiting_wallet` | the wallet call started | CTA "◌ Approve in your wallet…" + `send.review.wallet-hint`; at 60 s, `sign.wallet.slow` | `sign.step.wallet` | record seen at seq ≥ s0, or a hash → `signing`. Rejected with **no record within 10 s** → `cancelled`. Intear "Failed to send transaction 1: Timeout" is **not** a rejection: keep watching |
| `signing` | a record exists or the hash is known | **The tracker appears.** Row 1 ✓ "Approved in your wallet" with its clock time; row 2 active with the timer and the ETA line; BTC "Signing {n} inputs"; the PendingPill/Card | `sign.step.mpc`, `sign.mpc.0` / `.20` / `.60` / `.150`, `sign.mpc.inputs` | all records `signed` → `signed`. Any record `failed` → `timed_out`. A contract panic → `failed`. No terminal state by `h0 + 250` → `unknown` |
| `signed` | every signature in hand | Row 2 ✓ "Signed by NEAR's signer network" + NearBlocks ↗ | — | local verify OK → `broadcasting`; verify fails → `failed` (E22) |
| `broadcasting` | verified | Row 3 active | `sign.step.broadcast` | OK → `sent`; error → `signed_not_sent`; SOL `lastValidBlockHeight` passed → `expired` |
| `sent` | chain tx id known | The header flips to "Sent {amount}". Row 3 ✓ + tx ⧉ ↗. Row 4 shows the `--info` ring and `sent.note.{chain}`. `sign.closeok`, **Done** / View activity, and the exit toast | `sign.done`, `sent.note.*`, `sign.closeok`, `toast.sent` | confirmations → `confirmed` |
| `confirmed` | 1 confirmation | Row 4 ✓ "Confirmed" + the chamfered success tile | `sent.confirmed` | — |
| `cancelled` | wallet rejected, no record | Back on Review; the message is inline under the CTA; the form is kept (WCAG 3.3.7) | `sign.cancelled` | **Try again** → `preparing` |
| `timed_out` | record `failed` | Row 2 ✕ + FailureCard. **Try again reuses the nonce or inputs** (kb/90 §8.7) | `sign.timeout`, `.cond`, `.retry.{chain}` | **Try again** → `preparing` |
| `signed_not_sent` | broadcast failed, or a reload found a signature with no chain tx | Row 3 ✕ + SignedNotSentCard. Also shown on the Wallet tab, in Activity, in CleanHistory (owner), on Send and in the PendingPill | `sign.notsent`, `.explain`, `.gap` | **Broadcast again** → `broadcasting` (same signed tx, no new signature) |
| `expired` (SOL) | the blockhash expired before broadcast | Row 3 ✕ + FailureCard | `sign.sol.expired` | **Try again** rebuilds with a new blockhash |
| `unknown` | 250 blocks with no terminal state | Row 2 "?" + FailureCard. **Never labelled "failed"** | `sign.unknown` (E12) | **Check again**; NearBlocks ↗ |
| `failed` | a mapped error | The failing row ✕ + its Error-map entry | E-map | per entry |
| *resume* | page load finds a non-terminal intent | Reopen at the stored stage (kb/90 §8.6 resume). A signed record with no chain tx shows the SignedNotSentCard **on any device** | — | — |

Rules (kb/90 §8.7):
- A new send while an earlier intent for the same token and chain isn't `sent` or `confirmed` shows the Send page's unsent-intent guard.
- **Minimize is not cancel.** The store lives at module level, so in-app navigation keeps signing. Closing or reloading the tab leaves a signed intent that needs **Broadcast now**.

### Clean history (kb/90 §7.3): item → tag; aggregate → verdict → Buy
| Item status | Tag · colour | Evidence line (copy) | Blocks Buy |
|---|---|---|---|
| `spent` | SETTLED · success | "Nonce {n} used by {tx} · {k} confirmations" / "Spent in {txid}" / "All {n} inputs spent" | no |
| `expired` | EXPIRED · success | "Blockhash expired. It can't be used." | no |
| `unfunded` | UNFUNDED · neutral | "Spends coins that don't exist. If they ever appear at this address, the previous owner could move them; they're excluded from what you buy." (kb/90 verbatim) | **no** (D-04) |
| `settling` | SETTLING · info | "Spent in {txid}. Waiting for {k} more confirmation." | yes |
| `unused` | UNUSED · danger | "Nonce {n} not used yet" / "{txid}:{vout} unspent" / "Blockhash still valid" | yes |
| `unknown` | CAN'T VERIFY · warning | "Providers disagree" / "No provider answered" / "Too many coins to verify in the browser; ask the seller to consolidate." | yes |
| (UI) `checking` | — · `--fg-muted` | "Checking…" | yes, until it resolves |

| Aggregate (kb/90 §7.3) | Condition | Verdict key | GateLine | Buy |
|---|---|---|---|---|
| `checking` | any item checking | `clean.verdict.checking` | "◌ Checking history…" | disabled |
| `empty` | `sig_count == 0` and the accounts are OK | `clean.verdict.empty` | "✓ Clean history · checked {t} ago" | **enabled** |
| `clean` | every item `spent`, `expired` or `unfunded` | `clean.verdict.clean` (+ the `1 OF 2 SOURCES` tag under H-25) | "✓ Clean history · checked {t} ago" | **enabled**; `buy(listing_id, expected_sig_count = sig_count read in step 1)` |
| `settling` | any item settling | `clean.verdict.settling` | "◷ Settling: {n} signature" | disabled |
| `blocked` | any item unused | `clean.verdict.blocked` | "✕ Blocked: {n} unused signature" | disabled, **no override** |
| `unknown` | any item unknown | `clean.verdict.unknown` + **Check again** | "? Can't verify {n} signature" | disabled |
| `unsafe` | an account check fails; or, for roles `rc`/`final`, the contract has keys, doesn't exist or its code hash mismatches | `clean.verdict.unsafe.*` | "⛔ Unsafe: {reason}" | disabled, **no override** |

Gate modes (`NEXT_PUBLIC_CONTRACT_ROLE`, kb/90 §7.3):
- `dev`: the RoleStrip shows `role.dev`, and lock/code-hash failures become the warning row in Checks.
- `rc`: the RoleStrip shows `role.rc`, and the gate is strict.
- `final`: no strip, strict gate.

### Sale flow (kb/90 §5.10, §5.12): list → for sale → buy. No cooldown.
| State | Contract (`satchel(id)`) | Owner UI | Buyer UI | Transition | Guard / error |
|---|---|---|---|---|---|
| Active, quiet period | `listing == None`, height < `listable_at` | "Before you list": quiet-period row ◷ + track; **List disabled** | "isn't for sale" | height reaches `listable_at` | `ERR_QUIET_PERIOD` (E33) |
| Active, listable | `listing == None` | Checklist (required rows ✓; advisory rows may show ✕) + ListingForm | — | `list(price, currency)` → Listing… | `ERR_ALREADY_LISTED`, `ERR_PRICE`, `ERR_CURRENCY` |
| Listing… | tx in flight | The CTA narrates | — | success → For sale | rejection shown inline |
| **For sale** | `listing` set | Frost + ListedPanel + FreezeBanner (owner) | Frost + BuyBlock + CleanHistory + FreezeBanner (buyer). **Buy only if `clean`/`empty`, from the first block** | `delist` → Active. `buy(token_id, listing_id, expected_sig_count)` (NEAR, attached == price) or `usdc.ft_transfer_call(…, msg {"buy":{token_id, listing_id, expected_sig_count}})` → Buying… | `sign_for` → `ERR_FROZEN` (E4); `nft_transfer` → `ERR_LISTED` (E34) |
| Buying… | buyer tx in flight | — | In-button: "Re-checking history…" → "Approve in your wallet…" → "Completing purchase…" | success → Sold. `ERR_LISTING_CHANGED` → the interstitial. USDC `SuccessValue "0"` → refunded | `ERR_NOT_LISTED`, `ERR_WRONG_AMOUNT`, `ERR_SELF_BUY`, `ERR_CURRENCY` |
| Sold | owner = buyer, listing cleared | Seller: Sold receipt (+ **Withdraw** if `payout ok:false`) | Reverse handoff; frost clears | — | — |
| Delisted | `delist` succeeded | Toast; frost clears; the ActionRow re-enables | The listing disappears | — | — |

### Transfer (P1)
1. **`recipient`**: the account is valid and exists, and is not self, the contract or the MPC account.
2. **`review`**: the D-08 soft guard shows if an intent is in flight.
3. CONFIRM → **`awaiting_wallet`**: the card is lifted.
4. SUBMITTED → **`processing`** (trackTx).
5. SUCCESS → **`handoff`** (≈ 1.3 s) → **`done`** (receipt).

Failures:
- REJECTED → `review` with `xfer.cancelled`.
- `ERR_LISTED` → `xfer.blocked.listed`.
- `ERR_BAD_RECEIVER` → `xfer.err.contract` / `.mpc`.
- `ERR_NOT_OWNER` → E3.
- RPC → retry.

The handoff never runs optimistically.

### Mint (P1)
1. **`ready`** (the same layout whether connected or not).
2. CONFIRM → **`awaiting_wallet`** → **`minting`** (trackTx; grain at rest).
3. SUCCESS → **`materialise`** (600 ms) → **`done`**.

Failures: REJECTED → `ready` with `mint.cancelled`; deposit too small → E6; RPC → retry.

## Copy deck
Rules:
- **Words.** Use BTC/ETH/SOL, address and signature freely. Never show yoctoNEAR, Tgas, payload, domain_id or the derivation path, except inside VerifyDisclosure and `/contract`.
- **Tone.** Sentence case, active voice. No apologies and no "Oops".
- **One verb per action across the flow:**
  - Send → Sent;
  - Transfer → Transferred;
  - List → Listed; Delist → Delisted;
  - Buy → "Satchel #{id} is yours." / "You now control…";
  - Mint → Minted;
  - **Fund** (never Receive or Deposit; use the ↓ glyph).
- **Names.** "Satchel #1" in text; `№ 0001` is the engraving. Every `{n}` string uses ICU plurals.
- **Chains.** Until S-11 ships, P1 strings name only Bitcoin and Ethereum. The one exception is the verbatim kb/90 §7.7 badge promise (Open question 6).
- **Failures say exactly what moved**, in this order: title → what moved and what didn't → a conditional line where the app can't know → evidence → one action.
- **Never say "no signature exists"** (kb/70 F16, D-16), and never "no signature was created". "Nothing was signed" is allowed only where no record can exist:
  - `sign.cancelled`, which requires no record within 10 s;
  - errors raised before `sign_for` writes a record: popup blocked, `ERR_FROZEN`, `ERR_GAS`, policy refusals, the BTC builder refusal.

  Once a record exists, say "Nothing was sent" and add the conditional line. Never call `unknown` "failed".
- **No relay copy** (D-12): never "Satchel broadcasts it for you", never "You can close this page" before broadcast, never "Closing won't cancel".
- **Also forbidden:**
  - cooldown copy of any kind (E-37);
  - USD (T7);
  - approvals or delegates (D-07, D-13);
  - "Pay with" (D-14).
- **One file.** Keep the strings in `lib/copy.ts`, keyed as below, so the design lead can edit them without touching components.

### Formatting
| Thing | Rule | Example |
|---|---|---|
| BTC | Up to 8 decimals, minimum 4, trailing zeros trimmed; fees in sats | `0.0123 BTC`, `~282 sats` |
| ETH | Up to 6 decimals; below that, `< 0.000001 ETH` | `0.0500 ETH` |
| SOL | Up to 6 decimals | `1.2000 SOL`, `0.000005 SOL` |
| NEAR | Up to 4 decimals; below that, `< 0.0001 NEAR` | `≈ 0.004 NEAR` |
| USDC | 2 decimals | `250.00 USDC` |
| Rounding | Balances round **down**; Max uses exact base units | — |
| Signs and spacing | `−` (U+2212) for outgoing, `+` for incoming; a thin space U+2009 before the ticker | `−0.0100 BTC` |
| Time | Relative ("12 s ago") with absolute UTC in `title` and `<time>`. **Inside flows** (tracker, receipt), clock times `14:02:11` (R2-D25) | — |
| Blocks | "{n} blocks (~{t})" from the measured 100-block average | `143 blocks (~1 min 20 s)` |
| Accounts | Full if 24 characters or fewer; otherwise middle-truncate | `satchel-buyer.testnet` |
| Network labels | Bitcoin testnet4 · Ethereum Sepolia · Solana devnet · NEAR testnet | — |
| Fiat | **None in v1** | — |

### Strings
**Global**

| Key | String |
|---|---|
| `app.badge` / `.tip` | TESTNET / "Satchel runs on NEAR testnet, Bitcoin testnet4 and Ethereum Sepolia. Coins here have no value." (P2: "…, Ethereum Sepolia and Solana devnet") |
| `nav.*` | My Satchels · Market · Mint · Connect wallet · Connecting… · Copy account ID · View on NearBlocks · Disconnect |
| `role.dev` / `role.rc` | "DEV CONTRACT: lock and code checks skipped" / "RELEASE CANDIDATE: testnet rehearsal" |
| `banner.rpc-down` | "NEAR testnet isn't responding · {duration} · Showing data from {time}" + **Retry** |
| `banner.offline` | "You're offline. Showing the last data loaded." |
| `footer.*` | Product: My Satchels · Market · Mint. Verify: Contract facts · NearBlocks ↗ · Repo ↗ · README ↗. Hackathon: NEAR Hackathon ↗ · Demo video ↗. Bottom row: `footer.testnet` "Testnet only. Coins here have no value." · `footer.note.clean` "¹ Clean history is checked in your browser by reading each chain. The contract doesn't enforce it." |
| `toast.*` | "Bitcoin address copied" · "Ethereum address copied" · "Account ID copied" · "Transaction ID copied" · "Token ID copied" · "Link copied" · `toast.sent` "Sent {amount} · in mempool" (BTC) / "Sent {amount}" |

**Landing and Home**

| Key | String |
|---|---|
| `home.hero` | Eyebrow "NEAR CHAIN SIGNATURES · TESTNET". H1 "An NFT that is a wallet." Sub "Each Satchel controls its own Bitcoin and Ethereum addresses. Transfer the NFT and you hand over the wallet." (P2: "Bitcoin, Ethereum and Solana"). **See Satchel #1** · **Connect wallet**. Holdings "Holds {balances} · read {t} ago". Note "Testnet only. Coins here have no value." |
| `home.finishes` | "Every Satchel has its own finish" / "The finish is set by the Satchel's number, so it looks the same here, in wallets and in share images." |
| `how.1..3` | 1 **Mint a Satchel**: "The NFT gets its own Bitcoin and Ethereum addresses. They're derived from the NFT, so they never change." 2 **Only the owner can sign**: "To move coins, the owner asks the Satchel contract. It checks who owns the NFT, then asks NEAR's signer network for a signature." 3 **Transfer the NFT, transfer the wallet**: "Gift or sell it, and the new owner controls every coin inside. No bridge, no wrapped tokens, no seed phrase." |
| `proof.*` | "Last send {amount} · {t} · {explorer} ↗" · "Last transfer {from} → {to} ↗" · "Contract locked · no access keys ↗" · "Signatures issued {n} · last {t} ↗" |
| `home.empty` | "You don't own a Satchel yet" / "Mint one to get Bitcoin and Ethereum addresses that belong to the NFT." / **Mint a Satchel** · "See Satchel #1" |
| `home.list` | "My Satchels" · "{n} Satchels" · **Mint** · band name "Satchel #{id}, {alloy}, {status}" · menu Send · Fund · Copy addresses · View activity · `home.new` NEW |

**Satchel page**

| Key | String |
|---|---|
| `page.chips` | TOKEN #{id} · NEP-171 · NEAR TESTNET · {ALLOY} |
| `page.menu.*` | "Copy token ID ({id})" · "Contract facts" · "View on NearBlocks ↗" · "Copy link" · "Share on X ↗" |
| `page.visitor.h1` / `.sub` | "This NFT is a wallet." / "Whoever owns Satchel #{id} controls the coins at the Bitcoin and Ethereum addresses below." |
| `page.owner.h1` | "Satchel #{id}" |
| `page.owner-pill` | "Owned by {owner}" · "Owned by you" · " · {n} signatures" |
| `page.stats.*` | STATUS · SIGNATURES · LISTED FOR · MINTED |
| `page.tabs` | Wallet · Activity · Sell (owner) / Buy (visitor, listed) |
| `page.actions` | Send · Fund · Transfer · Sell · Delist · reasons "This Satchel has no BTC or ETH yet." / "Signing is paused while listed." |
| `page.notfound` | "Satchel #{id} doesn't exist" / "No Satchel has this number yet." / **Mint a Satchel** · **Go to My Satchels** |
| `page.owner-changed` | "Satchel #{id} now belongs to {owner}. You can't send from it anymore." |
| `page.pending.*` | "Sending {amount} · {m:ss}" · "Sent {amount}" · "Signed, not sent · Broadcast now" · `page.pending-elsewhere` "A signature is in progress for this Satchel." |
| `wallet.row.*` | "Bitcoin testnet4" · "Copy" → "Copied" · aria "Copy Bitcoin address" · "Show QR code for Bitcoin address" · "mempool.space" / "Etherscan" / "Solana Explorer" · "+{amount} incoming · unconfirmed" · "Balance unavailable" **Retry** · "0 {TICKER}" **Fund** |
| `wallet.fresh` | "Read from each chain {relative}." |
| `wallet.fundcard` | "Fund this Satchel" / "Anyone can send testnet coins to its addresses. Only its owner can send them out." / **Copy Bitcoin address** · "Get testnet BTC ↗" |
| `facts.*` | CONTRACT · TOKEN · OWNER · STATUS · SIGNATURES · LAST SIGNATURE · BITCOIN TESTNET4 · ETHEREUM SEPOLIA · CONTRACT KEYS "none since birth ↗" · source "Read from NEAR testnet and each chain {relative}." |
| `verify.*` | "Verify these addresses" · rows "Contract {contract} ↗" · "Keys: none since birth" · "Code hash: matches the published build" · "Path satchel/{id}/{chain}" · guarantee "Anyone can re-derive these addresses. Only the current owner can get signatures for them." · "Verify it yourself ↗" (→ `/contract`) |

**Fund**

| Key | String |
|---|---|
| `fund.title` | "Fund Satchel #{id}" |
| `fund.label` | "{NETWORK} ADDRESS" |
| `fund.only.*` | "Send only Bitcoin testnet4 coins to this address." / "Send only Sepolia ETH to this address." / "Send only Solana devnet SOL to this address." |
| `fund.time.*` | "Testnet4 confirmations are irregular: minutes to hours." / "About 12 seconds to confirm." / "A few seconds to confirm." |
| `fund.anyone` | "Anyone can fund a Satchel. Only its owner can send from it." |
| `fund.faucet.*` | "Get testnet BTC ↗" / "Get Sepolia ETH ↗" / "Get devnet SOL ↗" |
| `fund.copy` / `.share` | **Copy address** / **Share** |
| `fund.incoming.*` | "INCOMING" · "Waiting for a deposit…" · "+{amount} · in mempool" · "+{amount} · confirming" · "Received {amount}" |

**Send**

| Key | String |
|---|---|
| `send.title` | "Send from Satchel #{id}" |
| `send.form.*` | "Chain" · "Amount" · "Max" · "Available {amount}" · `max-note` "Max leaves room for the network fee." · "To" · placeholders "tb1… address" / "0x… address" / "Solana address" · "Paste" · **Review** · "Estimating fee…" · "Couldn't estimate the fee." **Retry** · fee line "Network fee ~{fee} · paid by this Satchel" |
| `send.recipient.*` | "✓ {Network} address" · "Satchel #{id} · {Alloy}" · announce "{Network} address accepted" · clear "Clear address" |
| `send.guard.*` | "Connect the owner's wallet" / "Only the owner of Satchel #{id} can send from it." · "You don't own Satchel #{id}" / "You're connected as {account}. Only {owner} can send from it." · "Signing is paused" / "Satchel #{id} is listed for sale. Delist it to send." · "This Satchel has no {TICKER} yet." · `send.guard.unsent` "You have an unsent signed transaction. Broadcast it or replace it." **Broadcast** · **Replace** |
| `send.review.*` | Title "Review send" · label "SEND" · sub "to {addr} · {network}" · `from` "From" · "amount + fee" · `to` "To" · "NETWORK FEE (EST.)" · "paid by this Satchel" · `after` "SATCHEL #{id} AFTER" · "NEAR FEE" · `near` "≈ 0.004 NEAR (gas + permanent signature record) · paid by your NEAR account" · `near.tip` "Needs ≈ 0.1–0.3 NEAR free while signing (refunded)." · `time` "TIME" · `time.sign` "Signing: usually about 10 seconds" · `time.btc` "Confirmation: minutes to hours on testnet4" · `time.evm` "Confirmation: about 12 seconds" · `time.sol` "Confirmation: a few seconds" · `inputs` "Uses {n} coins from this Satchel, so it needs {n} signatures." · `ack` "I checked this address" · `final.btc` "Bitcoin transfers are final. Check the address above." / `final.evm` "Ethereum transfers are final. Check the address above." / `final.sol` "Solana transfers are final. Check the address above." · **Send {amount}** · `wallet-hint` "Check the Meteor or Intear window." · helper "Your wallet will ask you to approve a request to {contract}." |

**Signing**

| Key | String |
|---|---|
| `sign.title` / `sign.done` | "Sending {amount}" / "Sent {amount}" + "to {addr}" · **Done** · **View activity** |
| `sign.step.prepare` / `.wallet` | CTA labels "Preparing…" / "Approve in your wallet…" |
| `sign.step.*` (future → active → done) | wallet: — → — → "Approved in your wallet" · mpc: "Sign with NEAR's signer network" → "Signing with NEAR's signer network" → "Signed by NEAR's signer network" · broadcast: "Broadcast to {network}" → "Broadcasting to {network}" → "Broadcast to {network}" · confirm: "Confirmation" → "Waiting for 1 confirmation" → "Confirmed" |
| `sign.wallet.slow` | "Waiting for your wallet. Check its window." |
| `sign.mpc.0` / `.20` / `.60` / `.150` | "Usually about 10 seconds." / "Taking longer than usual." / "Still working. The network allows up to about 2 minutes." / "Still waiting for the network. We'll keep checking." (kb/90 §8.6) |
| `sign.mpc.inputs` | "Signing {n} inputs" |
| `sign.credit` | "SIGNATURES BY NEAR CHAIN SIGNATURES" |
| `sign.keepopen` / `sign.closeok` | "Keep this tab open until it says Sent." / "You can close this tab. Activity keeps tracking it." |
| `sign.minimized` (toast) | "Still signing. Keep this tab open until it says Sent." |
| `sent.note.btc` / `.evm` / `.sol` | "In mempool. Testnet4 confirmations are irregular: minutes to hours." (E-25) / "Waiting for 1 confirmation (about 12 seconds)." / "Confirming…" |
| `sent.confirmed` | "Confirmed" |
| `sign.cancelled` | "You cancelled in your wallet. Nothing was signed." **Try again** · **Close** |
| `sign.timeout` | Title "Not signed" / "The signer network did not return a signature. Nothing was sent." · `.cond` "If a signature still turns up, Clean history lists it as Unused until it can't be used." · `.retry.evm` "Try again reuses nonce {n}, so only one of them can ever go through." · `.retry.btc` "Try again reuses the same coins, so only one of them can ever go through." · `.retry.sol` "Try again waits until the old blockhash expires." · **Try again** |
| `sign.notsent` | Title "Signed, not sent" / "{reason} Nothing has left Satchel #{id} yet." · `.explain` "The signed transaction is saved. Until it's broadcast or replaced, it counts as an unused signature in this Satchel's history." · `.gap` "Can't be broadcast yet: nonce {n} waits for nonce {count}." · **Broadcast again** · inline **Broadcast now** |
| `sign.sol.expired` | Title "Expired" / "The Solana transaction expired while it was being signed. Nothing was sent, and that signature can't be used anymore." **Try again** |
| `sign.unknown` (E12) | Title "Still waiting for NEAR" / "NEAR hasn't confirmed transaction {hash} yet. This app hasn't broadcast anything." **Check again** · "NearBlocks ↗" |

**Activity**

| Key | String |
|---|---|
| `act.group.inprogress` · `act.day.*` | "IN PROGRESS" · "TODAY" · "YESTERDAY" · "{MON D}" |
| `act.row.*` | "Sending to {addr}" · "Sent to {addr \| Satchel #n}" · "Signed, not sent" · "Not signed: to {addr}" · "Signature issued · {Chain}" · "Transferred to {account}" · "Received from {account}" (a Satchel arriving) · "Minted by {account}" · "Listed for {price}" · "Delisted" · "Sold to {account} for {price}" · "Bought from {account} for {price}" |
| `act.tag.*` | SIGNING · IN MEMPOOL · NOT SENT · FAILED · UNUSED (only when not final) |
| `act.detail.*` | Date · Status · Network · Type · Amount · Fee · From · To · NEAR transaction · "View on mempool.space ↗" / "View on Etherscan ↗" / "View on NearBlocks ↗" |
| `act.empty` | "No activity yet" / "Sends, transfers and sales show up here. Deposits show on each chain's explorer." / **Fund this Satchel** |
| `act.more` / `act.footer` / `act.partial` | "Show older" / "Missing something? See every event on NearBlocks ↗" / "NEAR history is unavailable right now. Check NearBlocks ↗" |

**Transfer**

| Key | String |
|---|---|
| `xfer.title` / `.review.title` | "Transfer Satchel #{id}" / "Review transfer" |
| `xfer.to.*` | "To (NEAR account)" · placeholder "name.testnet" · "Checking account…" · `found` "Account found · owns {n} Satchels" · "Implicit account. Make sure its owner has the key." |
| `xfer.err.*` | `missing` "No account named {x} on NEAR testnet." · `self` "That's your account." · `contract` "That's the Satchel contract. A Satchel sent there can never be used again." · `mpc` "That's NEAR's signer network. A Satchel sent there can never be used again." |
| `xfer.review.rows` | them "{account} will control everything in this Satchel: {balances}. Its addresses go with it, so anything sent to them later is {account}'s too." · you "Only the new owner will be able to sign. You won't be able to send from it." · history "The signature history stays with the Satchel." (E-36) |
| `xfer.soft.signing` (D-08) | "A signature from {t} ago is still in progress. If you transfer now, it stays valid for anyone holding it." |
| `xfer.final` | "This can't be undone. Only {account} can transfer it back." |
| CTA / in flight | **Transfer to {account}** · "Approve in your wallet…" · "Transferring…" |
| `xfer.done` | "{account} now controls {balances}." · receipt From · To · NEAR transaction · Time · **View Satchel #{id}** · **Done** · toast "Transferred Satchel #{id} to {account}" |
| `xfer.blocked.listed` / `xfer.cancelled` | "Delist Satchel #{id} before transferring it." / "You cancelled in your wallet. Nothing changed." |

**Sell**

| Key | String |
|---|---|
| `sell.title` / `sell.check.title` | "Sell Satchel #{id}" / "BEFORE YOU LIST" |
| `sell.check.quiet` | Name "Quiet period" · "You can list in {n} blocks (~{t})" · done "No signature in the last {N} blocks" · never signed "No signatures yet" |
| `sell.check.history` | Name "Past signatures" · ok "All {n} can no longer move coins" · blocked "{n} could still move coins" + **How to settle** · settling "{n} is still settling" · unknown "Can't verify {n} right now" + **Check again** · `.warn` (under the CTA, advisory) "Buyers can't buy while it can still move coins. Settle it first, or list anyway." |
| `sell.check.usdc` | "Registered for USDC payouts" / "USDC payouts aren't set up" + **Register · 0.00125 NEAR** |
| `sell.settle.*` (kb/90 §7.6) | EVM: **Broadcast now** "uses nonce {n}." / gap "Can't be broadcast yet: nonce {n} waits for nonce {count}. Send from this Satchel until every nonce up to {max} is used." · BTC: **Broadcast now**, or "Send these coins to this Satchel's own address." · SOL: "Nothing to do. It expires in about 2 minutes." (E-01) |
| `sell.form.*` | "PRICE" · USDC · NEAR · `buyer-gets` "Buyer gets {balances}." · rows "Price" · "Satchel fee" "none" · "Listing deposit" "0.01 NEAR · unused part refunded" · **You receive** · `paid` "Paid to {account} in the same transaction as the sale." |
| `sell.while` | "WHILE IT'S LISTED" · "You can't send from Satchel #{id} or transfer it." · "Anyone can buy it at exactly {price}, right away." · "The buyer gets everything in it." · "You can delist at any time." |
| CTA / in flight | **List for {price}** · "Approve in your wallet…" · "Listing…" |
| `sell.listed` (toast) / panel | "Listed for {price}. Signing paused." / "LISTED FOR {price} · LISTING #{id}" · **Delist** |
| `sell.delist.note` / `sell.reprice` | "Delisting is instant: buyers can't buy it anymore, and sending and transfers resume." / "To change the price, delist and list again." |
| Delisting / `sell.delisted` | "Approve in your wallet…" · "Delisting…" / toast "Delisted. Signing resumed." |
| `sell.sold` | "You sold Satchel #{id} to {buyer} for {price}." / "{price} arrived in your NEAR account." · receipt Price · Buyer · Paid · Transaction ↗ · `.escrow` "{price} is waiting for you." **Withdraw** |
| `sell.err.quiet` / `sell.cancelled` | "Not listed. You can list in {n} blocks (~{t})." / "You cancelled in your wallet. Nothing changed." |

**Freeze**

| Key | String |
|---|---|
| `freeze.title` | "Signing paused while listed" |
| `freeze.owner.body` | "No coins can leave Satchel #{id} until you delist it or it sells. Anyone can still fund it." **Delist** |
| `freeze.buyer.body` | "The seller can't sign anything new, so the history below is final for this listing." |

**Buy**

| Key | String |
|---|---|
| `buy.block.*` | "BUY FOR" · `listing` "LISTING #{id} · listed {t} ago by {seller}" |
| `buy.youget.*` | "YOU GET" · `excluded` "{amount} excluded: an earlier signature can still spend it." · `unconfirmed` "Unconfirmed deposits never count." |
| `buy.paidin` | "Paid in {currency}." · "You have {balance}." · `short` "You have {balance}. You need {price}." + "Get testnet USDC ↗" |
| `buy.how` | "HOW BUYING WORKS" · "You pay" → "One transaction moves Satchel #{id} to you and pays {seller}" → "You control the coins" |
| `buy.gate.*` (GateLine) | "Clean history · checked {t} ago" · "Checking history…" · "Waiting for your browser's check" · "Settling: {n} signature" · "Blocked: {n} unused signature" · "Can't verify {n} signature" · "Unsafe: {reason}" |
| CTA / in flight | **Buy for {price}** · **Connect wallet to buy** · "Re-checking history…" · "Approve in your wallet…" · "Completing purchase…" |
| `buy.changed` | "This listing changed. Listing #{old} at {oldPrice} was replaced by listing #{new} at {newPrice}. Clean history runs again." **Review new listing** · **Cancel** |
| `buy.err.delisted` | "{seller} delisted Satchel #{id}." |
| `buy.refunded` | "Not bought. Your {price} was refunded." |
| `buy.done` | "Satchel #{id} is yours." / "You now control {balances}." · receipt Price · Seller · Listing #{id} · Transaction ↗ · **Open your Satchel** · toast "You bought Satchel #{id}" |
| `buy.blocked.banner` | "{n} past signature could still move coins" / "{item reason}. Until it is, whoever holds that signature can send {amount} out of this Satchel." · **See the signature** · "Why this blocks buying" |

**Clean history and hallmarks**

| Key | String |
|---|---|
| `clean.eyebrow` / `.meta` | "CLEAN HISTORY" / "Checked in your browser {t} ago · {n} signatures · Sources" |
| `clean.verdict.checking` | "Checking {n} past signatures…" / "Reading Bitcoin testnet4 and Ethereum Sepolia from your browser." |
| `clean.verdict.empty` | "This Satchel has never signed anything." / "No signature from a previous owner can move these coins." |
| `clean.verdict.clean` | "Clean. No past signature can move these coins." / "{k} settled · {e} expired · {u} unfunded · checked {t} ago" (zero counts omitted) |
| `clean.verdict.settling` | "{n} signature is still settling." / "Spent in {txid}. Waiting for {k} more confirmation." |
| `clean.verdict.blocked` | "{n} past signature could still move coins." / "{item}. The seller has to settle it first." |
| `clean.verdict.unknown` | "Can't verify {n} signature right now." / "{cause}. Buying stays paused until it's checked." **Check again** |
| `clean.verdict.unsafe.*` | "Unsafe: this Ethereum address has delegated code." · "Unsafe: the contract has access keys." · "Unsafe: the contract code doesn't match the published build." · "Unsafe: the Solana account isn't a plain wallet." |
| `clean.checks.*` | "Contract keys: none since birth (block {A})" · "Code: matches the published build" · "Ethereum address: no delegated code" · "Solana account: plain wallet" · dev "DEV CONTRACT: lock and code checks skipped" |
| `clean.group.*` | "Needs attention ({n})" · "Can't move coins ({n})" · "Show all {n}" |
| `clean.item.*` | Titles "{Chain} · nonce {n}" / "{Chain} · coin {txid}:{vout}" / "{Chain} · blockhash {short}" · `wouldpay` "Would send {amount} to {addr}" (+ " (claimed)") · evidence lines (state table above) · tags SETTLED · EXPIRED · UNFUNDED · SETTLING · UNUSED · CAN'T VERIFY |
| `clean.sources.*` | "{Chain}: {provider} ✓ · {provider} ✓" · `one` "{provider} didn't answer. This verdict uses {other} only. Allowed on testnet." · tag "1 OF 2 SOURCES" |
| `clean.trust` / `.hint` | "Runs in your browser. Satchel's server isn't trusted for this." / "Server check {t} ago: {verdict}" + "Waiting for your browser's check" |
| `clean.how` | "How Satchel checks this" → kb/90 §7.7 badge promise verbatim → "What it doesn't cover" (kb/90 §4 list) → "README disclosure ↗" |
| `clean.disclosure` | "The contract doesn't run this check; this app does, by reading each chain. Buy stays disabled until it passes." |
| `hallmark.clean` | "CLEAN HISTORY · checked {t} ago" · tooltip = kb/90 §7.7 **verbatim**: "Every signature this Satchel has issued is recorded on-chain. Your browser just checked each one against Bitcoin testnet4, Ethereum Sepolia and Solana devnet: none can still move the coins you are buying." |
| `hallmark.balance` | "VERIFIED BALANCE · read {t} ago" · tooltip "Read live from each chain for the addresses derived from this NFT. Coins an earlier signature can still spend are excluded. Unconfirmed deposits never count." |
| `hallmark.stamp.aria` | "Clean history verified by your browser at {time}. Go to the report." |

**Market, Mint and Contract**

| Key | String |
|---|---|
| `market.*` | "Market" · "{n} listed" · "Sort" Newest · Price · chips (polish) Buyable now · Has BTC · Has ETH · card PRICE · BTC · ETH · footer "Clean history · checked {t} ago" / "Blocked: {n} unused signature" / "Checking…" / "Server check {t} ago" · `empty` "Nothing is listed right now." **Mint a Satchel** · `error` "Couldn't load listings." **Try again** |
| `mint.*` | "Mint a Satchel" · bar "YOU GET" "Bitcoin + Ethereum addresses" · "DEPOSIT" "0.02 NEAR · unused part refunded" · **Mint a Satchel** / **Connect wallet to mint** · `get` "Its own Bitcoin testnet4 address" · "Its own Ethereum Sepolia address" · "A finish set by its number" · "Only its owner can move the coins" · "Approve in your wallet…" · "Minting…" · `done` "Satchel #{id} is yours." / "Minted in {tx} ↗" · **Fund this Satchel** · **Open Satchel #{id}** · toast "Minted Satchel #{id}" · `cancelled` "You cancelled in your wallet. Nothing was minted." |
| `contract.*` | rc/final: "Born without a key" / "{contract} was created, deployed, initialized and minted in one transaction with no AddKey. Only sign_for can get signatures for its Satchels." · facts ACCESS KEYS "Account is locked (no access keys)" · BIRTH TX · SIGNER TXS · OLDEST TX · CODE HASH · EXPECTED · MPC VERSION · CONFIG · "Verify it yourself" · dev: "Development contract" / "This account has keys. Lock and code checks are skipped on dev." |

**Retired in R2:**
- `sign.relay`; `sign.closed` (replaced by `sign.minimized`);
- `access.*`, `access.delegate-banner`, `access.over-cap` (D-13);
- `oneclick.*` (D-19);
- `freeze.owner` / `.buyer` / `.done` (the countdown strings, E-37), and `buy.err` "The cooldown isn't over yet…";
- `sell` "Buyers can buy after a {n}-block cooldown" and "Your price is below the mainnet-price value…" (prices cut);
- `sell.delist.confirm` (R2-D15) and `sell.blocked.pending` / `.unused` (replaced by `sell.check.*`);
- `buy` "Pay with" and "Available in {t}";
- `xfer` "Approvals are cleared." and "{n} delegate will be removed." (E-36);
- `clean.ok` and `clean.none` (replaced by `clean.verdict.*`);
- `market` "Buyable in {t}";
- every "≈ $X at mainnet prices" string.

### Error map (failure → detection → message → action)
Presentation rule (WC-C14):
- **Field errors** sit inline under the field.
- **Flow errors** replace the active tracker row's helper and keep every input.
- **System problems** (RPC, offline) use the one-line SystemBanner.
- **Never** a system `alert()` or a blocking modal for a recoverable error.

Every message follows the failure-card structure.

| # | Failure | Detect | Message | Actions |
|---|---|---|---|---|
| E1 | Wallet rejected or closed | rejection `/reject\|cancel\|denied\|closed/i` **and** no record within 10 s | `sign.cancelled` (flow-specific variants: `xfer.cancelled`, `sell.cancelled`, `mint.cancelled`) | Try again · Close |
| E2 | Wallet popup blocked | `window.open` returns null [ASSUMED] | "Your browser blocked the wallet window. Allow pop-ups for this site and try again." Nothing was signed | Try again |
| E3 | Not owner | `ERR_NOT_OWNER` | "Only the owner of Satchel #{id} can sign. It may have changed hands in another tab. Nothing was sent." | Refresh |
| E4 | Frozen | `ERR_FROZEN` | "Signing is paused while Satchel #{id} is listed. Delist it to send. Nothing was signed." | Go to Sell |
| ~~E5~~ | ~~Pending signatures~~ | removed (E-04, E-27) | — | — |
| E6 | Not enough NEAR | RPC `NotEnoughBalance` / `LackBalanceForState` | "Your NEAR account doesn't have enough NEAR for this. It needs about {needed} free (unused NEAR is refunded). Nothing changed." (signing needs ≈ 0.1–0.3 NEAR free; mint 0.02; list 0.01) | Get testnet NEAR ↗ |
| E7 | Gas too low (bug) | `ERR_GAS` (before any record) / MPC "Provided gas is lower than required…" (after the record) | `ERR_GAS`: "This request didn't include enough gas. Nothing was signed." MPC: "The signer network rejected this request for gas. Nothing was sent. Clean history lists it as Unused until its nonce or coins are used; Try again reuses them." | Try again · report |
| E8 | MPC rejected parameters (bug) | MPC `InsufficientDeposit` / `MalformedPayload` / `DomainNotFound` (after the record) | "The signer network rejected this request. Nothing was sent. Clean history lists it as Unused until its nonce or coins are used." | Report |
| E9 | MPC timeout | record `failed`, or the tx outcome "Request has timed out." (E-26) | `sign.timeout` + `.cond` + `.retry.{chain}` | Try again (same nonce or inputs) |
| E10 | Same request already queued | MPC "Pending-request queue is full…" | "This exact transaction is already being signed. Wait for it to finish." | — |
| E11 | NEAR RPC failure | fetch error / 5xx ×3 | Page: `banner.rpc-down`. In a flow: "Can't reach NEAR testnet. Nothing has been broadcast. Retrying…" | auto-retry · Try again |
| E12 | Tx outcome unknown | no terminal state by `h0 + 250` | `sign.unknown` | Check again · NearBlocks ↗ |
| E13 | EVM insufficient funds | "insufficient funds for gas * price + value" | "This Satchel doesn't have enough Sepolia ETH for the amount plus the fee. Nothing was sent." | Edit amount · Fund |
| E14 | EVM nonce too low | "nonce too low" | "Another transaction from this Satchel already used this nonce. Refresh and try again." | Try again |
| E15 | EVM replacement underpriced | "replacement transaction underpriced" | "A pending transaction from this Satchel uses this nonce. Wait for it to confirm, then try again." | — |
| E16 | EVM fee too low | "max fee per gas less than block base fee" | "The network fee rose while signing. Sign again with a new fee. Nothing was sent." | Try again (same nonce) |
| E17 | EVM already known | "already known" | treated as success → `sent` | — |
| E18 | BTC fee too low | "min relay fee not met" / "mempool min fee not met" | "The fee is below what testnet4 nodes accept right now. Sign again with a higher fee. Nothing was sent." | Try again (same inputs) |
| E19 | BTC inputs spent | "bad-txns-inputs-missingorspent" | "Some of this Satchel's coins were already spent. Nothing was sent. Refresh and try again." | Try again |
| E20 | BTC mempool conflict | "txn-mempool-conflict" | "A pending transaction already spends these coins. Wait for it to confirm." | — |
| E21 | BTC dust | "dust" | "Bitcoin won't relay {n} sats to this kind of address. The minimum is {dust} sats." (E-03) | Edit amount |
| E22 | Bad signature (bug) | local verify fails / "non-mandatory-script-verify-flag" / "invalid sender" | "The signature didn't match this transaction. Nothing was sent." | Report |
| E23 | Broadcast API down | mempool.space or RPC 429/5xx at broadcast | `sign.notsent` with the reason "{provider} isn't responding." | Broadcast again |
| E24 | SOL blockhash expired | "Blockhash not found" / block height exceeded | `sign.sol.expired` | Try again |
| E25 | SOL rent | "insufficient funds for rent" | "This would leave an account below Solana's minimum balance (0.00065024 SOL). Send more, or send everything." (E-02) | Edit amount |
| E26 | SOL no balance | "Attempt to debit an account but found no record of a prior credit" | "This Satchel's Solana address has no SOL yet. Fund it first." | Fund |
| ~~E27~~ | ~~Delegate over cap~~ | cut (D-13) | — | — |
| E28 | Buy races | `ERR_LISTING_CHANGED` / `ERR_NOT_LISTED` (no cooldown, E-37) | `buy.changed` / `buy.err.delisted`. Nothing was bought | Review new listing |
| ~~E29~~ | ~~Price API down~~ | prices cut | — | — |
| E30 | Upstream (clean-history hint, FastNEAR) down | `/api/*` 5xx | Activity: `act.partial`. CleanHistory SSR: "Server check unavailable. Your browser's check still runs." | Try again |
| E31 | Receiver refused | `ERR_BAD_RECEIVER` | `xfer.err.contract` / `xfer.err.mpc` (inline; caught before the wallet) | Edit account |
| E32 | Transfer while listed | `ERR_LISTED` | `xfer.blocked.listed` | Go to Sell |
| E33 | List inside the quiet period | `ERR_QUIET_PERIOD` | `sell.err.quiet` | — (the row counts down) |
| E34 | Already listed / not listed | `ERR_ALREADY_LISTED` / `ERR_NOT_LISTED` on delist | "Satchel #{id} is already listed." / "Satchel #{id} isn't listed anymore." | Refresh |
| E35 | USDC amount mismatch | `ERR_WRONG_AMOUNT` → `SuccessValue "0"` | `buy.refunded` | Try again |
| E36 | Self-buy | `ERR_SELF_BUY` | "You can't buy your own listing. Delist it instead." | — |
| E37 | Currency mismatch | `ERR_CURRENCY` | "This listing is priced in {currency}. Pay in {currency}." (shouldn't happen: the UI uses the listing's currency) | Refresh |
| E38 | Nothing to withdraw | `ERR_NOTHING_OWED` | "Nothing is waiting for you." | — |
| E39 | Policy refusal (bug) | `ERR_EVM_*` / `ERR_BTC_*` / `ERR_SOL_*` | "Satchel only signs plain {Chain} transfers. Nothing was signed." | Report |
| E40 | Solana disabled at the freeze | `ERR_CHAIN_UNSUPPORTED` | "Solana signing isn't enabled on this contract." | — |
| E41 | No safe BTC transaction | builder collision check exhausted (kb/90 §8.2) | "Can't build a safe transaction. Try a different amount. Nothing was signed." | Edit amount |

## Motion spec
Global setup:
- `<MotionConfig reducedMotion="user">` at the root. It "automatically disable[s] transform and layout animations, while preserving the animation of other values like opacity and backgroundColor" **[SOURCED](https://motion.dev/docs/react-accessibility)**.
- Choreographies also branch on `useReducedMotion()` to get their shorter variants.
- Only `transform`, `opacity` and `filter` (frost) are animated, plus colour where noted. Use `will-change: transform` only during the handoff.

Every spring below was measured with motion@14.5.0's own `spring()` generator: `research/spikes/ux-refs/calc/springs_r2.mjs`, which reproduces rev 1's `research/spikes/ux/spring_timings.mjs`. Stiffness, damping or mass override duration and bounce **[SOURCED](https://motion.dev/docs/react-transitions)**.

**Rules R2 adds:**
- No 3D flip.
- Material states (frost, materialise, the stamp) are the brand's motion.
- Success is always a **sentence restating the outcome**, revealed after the object settles, never confetti.
- Entrance motion never gates content: every word is in the first paint (VL anti-pattern 1).

| Interaction | Animates | Transition | Measured **[VERIFIED]** | Reduced motion |
|---|---|---|---|---|
| Handoff · lift | y 0 → −12 px, scale 1 → 1.04, rotate 0 → 6°, shadow → `--shadow-card-lifted` | spring 260/22/1 | 99 % @ 192 ms; overshoot 5.00 % | none |
| **Handoff · slide** | x from the You slot to the recipient slot (240 px on mobile, 520 px on desktop) | spring 120/18/1.2 (ζ 0.75) | 95 % @ 313 · 99 % @ 352 · **±1 % @ 659 ms** · overshoot 2.84 % · rest 885 (mobile) / 914 (desktop) | 200 ms cross-fade of the owner labels |
| Handoff · key | rotate 0 → 180° | spring 180/20/1 | 99 % @ 260 · ±1 % @ 492 · overshoot 2.98 % · rest 658 | instant swap |
| Handoff · owner colour | key and ring colour, avatar A → B | tween 320 ms `--ease-standard` | — | tween 200 ms (colour is allowed) |
| **Handoff · land (R2)** | the card settles under the recipient's avatar (y 0 → 12, rotate → 0°, scale → 1) | spring 260/22/1 | 99 % @ 192 · ±1 % @ 405 · overshoot 5.33 % | none |
| **Tag stamp (R2)**: `TRANSFERRED`, `SOLD`, `NEW` | opacity 0 → 1, scale 0.96 → 1 | tween 160 ms (`--duration-base`) | — | opacity only |
| Handoff · sentence + receipt | opacity 0 → 1, y 8 → 0; holdings stagger 60 ms, receipt rows 40 ms | tween 240 ms | — | opacity 200 ms |
| ~~Card flip~~ | **removed:** no flip in v1 (R2-D05; VL-C12) | — | — | — |
| Card tilt (fine pointer only; decorative, no Mobbin evidence) | rotateX/rotateY up to ±8°; the highlight follows | `useSpring(mv, {stiffness:300, damping:30, mass:0.5})` (ζ 1.22) | 95 % @ 261 ms, no overshoot | off |
| **Frost in (R2)** | the FrostLayer: opacity 0 → 1 and the gradient's `saturate(1 → 0.7)` | tween 400 ms (`--duration-frost-in`) | — | instant |
| **Frost out (R2)** | reverse, on delist or for the new owner after a sale | tween 600 ms (`--duration-frost-out`) | — | instant |
| **Hallmark strike (R2)** | HallmarkStamp scale 1.12 → 1 + opacity 0 → 1 | spring 520/32/1 (ζ 0.70) | 95 % @ 128 · **99 % @ 141 ms** · ±1 % @ 288 · overshoot 4.53 % · rest 344. (420/26 rejected: 7.59 % overshoot) | opacity 160 ms |
| **Materialise (R2, mint)** | the seeded grain (feTurbulence `seed={grain}`) at full opacity resolves into the alloy: grain 1 → 0.06 while the gradient fades in; the serial engraving fades in at 70 % | tween 600 ms (`--duration-materialise`) | — | the grain shows while "Minting…", then an instant swap |
| Success sentence (all flows) | opacity 0 → 1, y 8 → 0, after the object settles | tween 240 ms | — | opacity |
| Tracker step done | check icon `pathLength` 0 → 1 | tween 240 ms | — | instant |
| **Tracker connector (R2)** | the connector line fills to the active node | tween 200 ms (`--duration-reveal`) | — | static |
| Tracker active ring | opacity 0.4 ↔ 1 | 1.6 s ease-in-out loop; stops on any end state | — | static ring |
| **Row resolve (R2, CleanHistory)** | the status word swaps from "Checking…" to the tag | tween 160 ms, as each real result lands (stagger ≤ 40 ms, never faked) | — | instant |
| **CTA morph (R2)** | "Send 0.0100 BTC" → "Preparing…" → "Approve in your wallet…": a label cross-fade with **no width animation** | tween 120 ms (`--duration-fast`) | — | instant |
| **Pill tense flip (R2)** | "Sending…" → "Sent…" | cross-fade 160 ms | — | instant |
| Amount value change | old: opacity → 0, y → −4; new: from y 4 | tween 160 ms; `AnimatePresence mode="popLayout"` | — | opacity only |
| Incoming funds | one glow pulse (accent ring 0 → 6 px → 0) | tween 600 ms, once | — | the "+ incoming" text only |
| Pill or chip width change | `layout` | spring 500/40/1 | 99 % @ 226 ms · overshoot 0.16 % | instant |
| **Quiet-period track (R2; moved from the FreezeBanner)** | width per block | linear, duration = average block time (≈ 570 ms) | — | instant steps |
| Stack lift (P2 polish) | a tapped band rises before navigation, y 0 → −168 | spring 260/26/1 (ζ 0.81) | 99 % @ 248 · ±1 % @ 389 · overshoot 1.38 %. No-bounce alternative 300/32: 99 % @ 317, 0.03 % | none (navigate) |
| Stack fan-out (P2 polish) | y 0 → 56 per card | spring 400/36/1 (ζ 0.90) | 99 % @ 257 · ±1 % @ 256 · 0.10 % | none |
| Menus, P2 sheets, toasts | primitive defaults (CSS) | do not re-implement with Motion | — | primitive handles it |
| Route and tab changes | none | — | — | — |

Handoff choreography (from the moment the tx succeeds; the reverse handoff for Buy mirrors it):

| t (ms) | Event |
|---|---|
| 0 | Lift. In practice it already happened while "Approve in your wallet…" was open; the card waits in the lifted pose |
| 150 | The slide starts; the "You" label fades to 50 % |
| 600 | The key rotates 180°, and the owner colour tweens from the sender's avatar hue to the recipient's (alice `#E68AB0` → bob `#5EB4EF`) |
| 800 | **Land:** the card settles under the recipient's avatar; the tilt returns to 0° |
| 900 | The `TRANSFERRED` tag stamps in (160 ms) |
| 950 | The sentence reveals, holdings staggered |
| 1100 | Receipt rows (From · To · NEAR transaction · Time) |
| ≈ 1300 | Focus moves to the sentence and the live region announces it. Total under 1.5 s, so the video doesn't drag |

## Design tokens (summary; the source of truth is `81-design-tokens.md` R2)
- **Surfaces.** Graphite from `--bg #0A0B0D` to `--surface-4 #2A2F37`, with `--hairline` (8 %) and `--hairline-strong` (12 %) dividers.
- **Commit actions** are a **near-white pill** (`--cta #F1F4F7 → --cta-2 #DCE2E8`, `--on-cta` ≥ 13.43:1). Metal (`--stamp-*`) is used only on the HallmarkStamp and the success tile.
- **The alloy accent** drives a ≤ 14 % glow, the NavTab indicator, selected-chip outlines and swatches: never buttons.
- **Status:** 8 % banners, 14 % tags. Unfunded is neutral, Settling and In mempool are info.
- **Card.** Glass `rgb(8 9 11/.72)` for any text and scrim `/.48` for white only. The frost layer stays under both (≥ 5.41:1).
- **Type:** Archivo at wdth 100 (`display-xl`, `display`, `h1`–`caption`, `amount-hero`, `amount-xl`, `amount`) and wdth 125 (`engrave`, metal only), plus JetBrains Mono (`mono`, `label`; ligatures off).
- **Radii:** pills for buttons, tag 4, chip 6, input and panel 12, tile and QR 16, sheet 24, card 3.72 % of width. Layout: a 480 px flow column, a pinned action bar, the 36 px pending pill.

## Accessibility checklist (WCAG 2.2 AA) [SOURCED](https://www.w3.org/TR/WCAG22/)
| SC | Requirement in Satchel | Test |
|---|---|---|
| 1.1.1 Non-text content | The card `<figure>` has a text summary that includes the balances. The QR has `role="img"` and the full address. Chain icons are `aria-hidden` next to ticker text. Frost, glow and texture are decorative | screen reader pass |
| 1.3.1 Info and relationships | Landmarks (header, nav, main, footer); one H1 per page; Facts, ReviewCard and the stats strip are `<dl>`; the Timeline is an `<ol>` under day headings; CleanHistory is a `<ul>`; the tracker is an `<ol>` with `aria-current="step"` | axe + manual |
| 1.4.1 Use of colour | Every status, tier and verdict is written as a word. Frost, stamp and glow never carry meaning alone. Links are underlined; failed amounts are struck through **and** say "Failed" | grayscale screenshot |
| 1.4.3 / 1.4.11 Contrast | Every pair is computed in kb/81 R2: text ≥ 4.5 (worst 4.93, a danger tag on `--surface-3`); non-text ≥ 3. Text on the card uses glass or scrim. Focus rings use an offset on the CTA pill | re-run `contrast_r2.mjs` if tokens change |
| 1.4.10 Reflow | At 320 px: no horizontal scroll; grouped addresses wrap (`overflow-wrap:anywhere`); the stack bands keep 44 px targets | 320 px viewport |
| 1.4.12 Text spacing | No fixed heights on chips, pills, tags or rows | bookmarklet |
| 1.4.13 Content on hover or focus | Tooltips (hallmarks, the NEAR fee) are dismissible with Esc, hoverable and persistent. On touch, the hallmark is a link, not a tooltip | keyboard + mouse |
| 2.1.1 / 2.1.2 Keyboard, no trap | Every action is reachable. There is no flip and there are no drawers. The ⋯ menu is a menu button that returns focus to its trigger. Tilt is decorative | keyboard-only run of all flows |
| 2.2.1 Timing adjustable | No user time limits. The quiet period is a system wait shown as text plus a track. There is no buy cooldown | — |
| 2.2.2 Pause, stop, hide | The signing pulse and the quiet-period track are essential progress, and both are static under reduced motion. No auto-advancing carousels; the finishes arc is static | — |
| 2.3.1 Three flashes | The incoming glow runs once, under 3 Hz. The stamp strike is a single motion | — |
| 2.4.2 Page titled | "Satchel #1 · Activity — Satchel" pattern; flows: "Send from Satchel #1 — Satchel" | — |
| 2.4.3 Focus order | **Send:** ChainSelect (arrow keys) → Amount → Max → To → Paste → (Clear) → Review → [Review] ack checkbox → Send. **Transfer:** account → Review → Transfer. **Buy:** Buy (GateLine described). **Sell:** checklist actions → currency → price → List | keyboard |
| 2.4.7 Focus visible | A 2 px `--ring` outline + a 2 px offset in `--bg` on every interactive element | — |
| 2.4.11 Focus not obscured | `scroll-padding-top` 72 px (+36 px while the PendingPill is visible); `scroll-padding-bottom` 96 px + the safe area while a pinned or sticky bar is present | tab through long pages |
| 2.5.3 Label in name | The visible label is contained in the accessible name ("Send 0.0100 BTC" → "Send 0.0100 BTC to tb1q…4w"). Icon-only buttons say what they act on ("Copy Bitcoin address") | — |
| 2.5.7 Dragging | No drag-only action: no slide-to-confirm, no swipe-to-dismiss sheets | — |
| 2.5.8 Target size | Every target is ≥ 24×24 px; primary mobile targets ≥ 44×44; stack bands 56 px; round actions 48 px | overlay check |
| 3.2.6 Consistent help | "How it works" in the footer of every page | — |
| 3.3.1–3.3.3 Errors | Field messages link via `aria-describedby`, each with a fix ("Use a tb1… address"). Error, Warning and Info tiers are visually and semantically distinct | — |
| 3.3.4 Error prevention (financial) | Send, Transfer and Buy have a review naming the amount and recipient (a buy names the price and the Satchel). List is reversible (Delist) and its form summarises everything. The wallet approval is a second confirmation | — |
| 3.3.7 Redundant entry | Amount and recipient survive retries, timeouts and cancellations | — |
| 3.3.8 Accessible authentication | Wallet connect has no cognitive test inside Satchel's UI | — |
| 4.1.2 Name, role, value | Toggle groups (radiogroup), `aria-current` on NavTabs and on the tracker step, `aria-expanded` on disclosures and expandable rows, `role="progressbar"` on the quiet-period track | — |
| 4.1.3 Status messages | One app-wide `role="status"` region for signing (step changes, the 20/60/150 s lines, results), plus the CleanHistory verdict (changes only) and copy confirmations. Errors use `role="alert"`. Base UI Toast announces only `title`/`description`, so the message goes in `title` **[SOURCED](https://base-ui.com/react/components/toast)** | NVDA + VoiceOver |
| Reduced motion | `MotionConfig reducedMotion="user"` + the variants above. The handoff becomes a cross-fade with text; frost and the stamp appear without motion | macOS "Reduce motion" |

## Reference patterns (summary)
The Mobbin reference library, with the north-star apps, 2–4 references per screen, conventions, anti-patterns and the 40-screen Figma moodboard, is **`82-design-references.md`**. Each R2 decision above cites its references.

These non-Mobbin sources stay as **copy references** only, for wording Mobbin can't show:

| Source | Still used for | Link |
|---|---|---|
| Rabby locale strings | "Pending: Broadcast failed" → the `signed_not_sent` naming. "Found forbidden risk that can't be ignored" → no override on a blocked Buy | [messages.json](https://github.com/RabbyHub/Rabby/blob/develop/_raw/locales/en/messages.json) |
| LI.FI widget strings | The tone of "This may take a few minutes." for long waits. Its "Closing won't cancel your deposit" line is **not used**: there is no relay (D-12) | [en.json](https://github.com/lifinance/widget/blob/main/packages/widget/src/i18n/en.json) |
| Tokenbound | An address pill with a copy check; the buyer warning about existing approvals → the tone of the Clean-history banner | [docs](https://docs.tokenbound.org/iframe) |
| OpenSea Learn (ERC-6551) | "Selling the parent NFT hands control … to the new owner." → the transfer review copy | [OpenSea Learn](https://opensea.io/learn/token/what-is-erc-6551) |
| Phantom help centre | "Invalid format"; "Not Enough SOL … reduce the amount slightly" → per-chain validation; Max leaves room for the fee | [send](https://help.phantom.com/hc/en-us/articles/5530158379539-Send-crypto-in-Phantom), [fees](https://help.phantom.com/hc/en-us/articles/30698882147859-Not-enough-SOL-ETH-or-other-tokens-to-pay-network-fees) |
| Rainbow source | An accent hashed from the address, with contrast correction → the seeded alloy and AccountAvatar | [useAccountAccentColor.ts](https://github.com/rainbow-me/rainbow/blob/develop/src/hooks/useAccountAccentColor.ts) |
| Coinbase Wallet previews | "How their balance is expected to change" → "Satchel #1 after" | [The Block](https://www.theblock.co/post/206684/coinbase-wallet-shows-transaction-previews-to-protect-against-nft-scams) |

**Correction:** rev 1's Revolut row (a 3D card rotate, sourced from a third-party shot) is withdrawn. Mobbin shows Revolut's real "Show details" as an in-place reveal on the same face ([Revolut details flow](https://mobbin.com/flows/5e46acec-8775-4a8f-8dab-1d8059aa8764)), and v1 has no reveal at all (VL-C26).

## Scope and phasing (R2 changes vs the plan's S2 hours)
S2 carries only 1 h of buffer (implementation plan §2). R2 is therefore split into four groups:
- **cost-neutral restyles** of tasks that already exist;
- **savings**;
- **R2 additions**, each with an estimate and a funding source;
- **cut by default**.

| # | Change | Task | Phase | Δ hours | Funding / cut position |
|---|---|---|---|---:|---|
| S-01 | No card back face, flip button or flip motion; no `inert` face | SAT-212, SAT-300 | P1 | **−1.0** | saving |
| S-02 | No balance glass plate on the card at any size; no stale-balance chip states | SAT-212 | P1 | **−0.5** | saving |
| S-03 | No Delist AlertDialog | SAT-260 | P2 | **−0.25** | saving |
| S-04 | Tokens: CTA pill, hairlines, `label`, `amount-hero`, ticker, Tag, MetaChip, banners | SAT-201 | P1 | +0.5 | core |
| S-05 | Review restructure (OutcomeCard, payer rows, Time) + the warning checkbox | SAT-223 / 234 | P1 | +0.25 | core |
| S-06 | Tracker: 4 rows, clock times, evidence, Details, Minimize, credit | SAT-222 | P1 | +0.5 | core |
| S-07 | RecipientInput resolved row + Satchel recognition (the index exists, kb/90 §8.2) | SAT-223 / 234 | P1 | +0.5 | core |
| S-08 | PendingPill (restyle of the rev 1 mini-bar) + desktop PendingCard | SAT-222 | P1 | +0.25 | core |
| S-09 | Activity: IN PROGRESS group + inline Broadcast now + inline row detail | SAT-241 / 242 | P1 | +0.5 | core |
| S-10 | MetaChips, OwnerPill, StatsStrip, FactsGrid restyle | SAT-210 | P1 | +0.5 | core |
| S-11 | Transfer: card hero + stub + two-sided rows + RecipientCard "owns n" + receipt end frame | SAT-240 | P1 | +0.5 | core |
| S-12 | Sell checklist structure + GateLine + CleanHistory grouping and Sources | SAT-260 / 271 / 272 | P2 | +0.75 | core |
| | **Core net** (S-01…S-12) | | | **+2.5** (P1 +2.0, P2 +0.5) | P1: the Day-6 S2 buffer (1 h) + 1 h of S1's Day-6 buffer (4 h, pairing). P2: S1's Day-10/11 pairing buffer |
| A-01 | Receive: alloy QR frame, info rows, Share | SAT-235 | P1 | +0.5 | P1 addition |
| A-02 | Receive: the live **Incoming** block (reuses the 15 s poll) | SAT-235 | P1 | +0.5 | P1 addition (the "fund" video beat) |
| A-03 | StickyBuyBar (mobile) + the listing-changed interstitial | SAT-270 | P2 | +1.0 | P2 addition |
| A-04 | Home mobile stack (CSS only, no animation) | SAT-243 | P1 polish | +0.75 | polish 1 |
| A-05 | Mint materialise (fallback: rev 1's 400 ms cross-fade) | SAT-214 | P1 polish | +0.75 | polish 2 |
| A-06 | Frost layer while listed (CSS) | SAT-261 | P2 | +1.0 | polish 3 |
| A-07 | HallmarkStamp strike on the Buy card (fallback: the Hallmark chip) | SAT-271 | P2 polish | +0.75 | polish 4 |
| A-08 | Landing "finishes" wall/arc | SAT-243 | P1 polish | +0.5 | polish 5 |
| A-09 | ⋯ overflow menu (Copy token ID, NearBlocks, Copy link, Share on X) | SAT-210 | P1 polish | +0.5 | polish 6 |
| A-10 | Frost in the NFT SVG | SAT-292 | P2 | +0.25 | goes with cut-2 (dynamic card) |
| | **Additions** (A-01…A-10) | | | **+6.5** | P1 additions (1.0 h): another 1 h of S1's Day-6 buffer (pairing). P2 (1.0 h): S1's Day-10/11 pairing buffer (5 h, the plan's first reserve). Polish (4.5 h): Days 10–11, only if time remains after DP8, in the order above |
| C-01 | `NEW` tag for 24 h | — | P2 polish | +0.5 | cut by default |
| C-02 | Market filter chips | SAT-262 | polish | +0.5 | cut-4 (market polish) |
| C-03 | FAQ section | — | P2 | +0.5 | cut by default |
| C-04 | Landing Clean-history bento | — | P2 | +1.0 | cut by default |
| C-05 | Activity "Received" rows from chain histories | SAT-241 | P2 | +1.5 | cut by default (SAT-241 is NEAR events only) |
| C-06 | "First send here" chip | — | P2 | +1.0 | cut by default (R2-D26) |
| C-07 | "What your wallet will show" disclosure | — | P2 | +0.25 | cut by default |
| C-08 | Stack lift / fan-out animation | SAT-243 | polish | +0.5 | cut by default |
| C-09 | Modal right drawer, if H-19 = modals | — | — | +3.0 | not recommended (R2-D27) |
| C-10 | Hallmark touch sheet (Pinterest) | — | P2 | +0.5 | cut by default (R2-D11) |

**Net effect if every non-cut row ships:** **+9.0 h** of S2 work:
- P1 +3.0 h (core +2.0, Receive +1.0);
- P2 +1.5 h (core +0.5, Buy +1.0);
- polish +4.5 h (A-04…A-10).

The P1 and P2 hours need the pairing reserves named above, and the plan owner should confirm them. The 4.5 h of polish sit after the plan's existing cut order, so they are the first thing to drop at DP3/DP8. The R2 cut order appends to the plan's (D-20): Solana UI → OG image / dynamic card (incl. A-10) → USDC buy UI → market polish (incl. C-02) → **R2 polish A-09 → A-08 → A-07 → A-06 → A-05 → A-04**. A-01 and A-02 stay with Receive (P1). A-03 stays with Buy (P2).

## Deltas vs plan
| # | Plan / rev 1 said | R2 | Why | Scope |
|---|---|---|---|---|
| D1 | IA has no transfer screen | `/s/[id]/transfer` (kept from rev 1) | Transfer = control is P1 and the core demo moment | in plan (SAT-240) |
| D2 | "Fund this Satchel" with no flow | `/s/[id]/receive`, now a full page with an Incoming block | Judges and buyers fund | SAT-235 + A-01/A-02 |
| D3 | Tabs Wallet / Activity / Sell / Access | Wallet · Activity · Sell/Buy as URL segments; **no Access tab** (D-13) | Deep links and SSR for judges | — |
| D4 | Pills "Active / Frozen / Listed" | **Active · Signing · For sale · Sold** (E-37); frost shows the freeze on the object | One contract state for listed; Signing derived from records | — |
| D5–D6 | Cooldown 200/210; "Safe to buy in 143 blocks" | **No post-listing cooldown** (D-05 rev 2). The 250-block quiet period appears only before listing, as a sentence ("You can list in {n} blocks (~{t})") | kb/90 §5.7 | — |
| D7 | BTC fee "~0.00002" | ≈ 282 sats at `max(2, halfHourFee)` (kb/90 §8.9) | measured | copy |
| D8 | Signing ends in "pending/confirmed polling" | BTC ends "In mempool. Testnet4 confirmations are irregular: minutes to hours." (E-25) | measured | demo: never wait for BTC |
| D9 | No signed-but-not-sent state; rev 1 recommended a relay | `signed_not_sent` + **Broadcast again**, shown in 6 places; **no relay** (D-12): "Keep this tab open until it says Sent." | kb/90 §8.6, D-16 | SAT-242 |
| D10 | SOL with no expiry | `expired` state; blockhash ≈ 36 s (E-01) | measured | P2 / cut-1 |
| D11 | The card shows "large total USD" | Native only; **no USD anywhere** (T7); **no numbers on the card face** at all | testnet value; identity-only face | — |
| D12 | "Sonner toasts", "sheet on mobile" | Library-neutral primitives; **full pages** (D-26); toasts per R2-D14 | — | — |
| D13 | Clean-history blocked copy "Ask the seller to cancel it" | A pre-list "Before you list" checklist with How to settle (kb/90 §7.6). Past signatures are advisory, so demo #4 can still list | the seller can't fix it while frozen | SAT-272 |
| D14 | Statuses spent / unspent / unknown (+ rev 1 "Incomplete") | kb/90 §7.3: Settled · Expired · **Unfunded** · Settling · Unused · Can't verify · Unsafe (E-09) | — | — |
| D15 | Clean history is off-chain | `clean.disclosure` + `footer.note.clean` + "How Satchel checks this" (§7.7 verbatim) | the trust assumption is visible in the product | copy |
| ~~D16~~ | Access tab / delegates | cut (D-13) | — | −1.5 days (plan) |
| D17 | Views not specified | kb/90 §5.14 names: `config`, `satchel`, `sig_records`, `listings`, `proceeds_of` (E-17) | — | — |
| D18 | No judge-specific design | Blocking SSR `/s/1`, `/contract`, `/market`; a Facts grid with full addresses as text; Verify "stats for nerds" | AI judges read HTML (kb/90 §8.1) | SAT-210, SAT-251 |
| D19 | Transfer to any account | Blocks missing accounts, self, the contract and the MPC account (R-18) | stranded NFTs | SAT-240 |
| D20 | The handoff runs on transfer | Only after the final success; reversed for Buy; a refined end frame | never claim control moved before it did | — |
| D21 | Derivation path hidden | Shown only inside the collapsed VerifyDisclosure and on `/contract` | verifiability vs plain copy | — |
| D22 | Market badge "Verified balance" | The Hallmark, defined as word + time + link; excludes encumbered coins | — | — |
| D23 | Dynamic SVG card | Static seeded art in P1; status + `sig_count` in SAT-292 (D-23 rev 2); no balances; frost optional (A-10) | — | cut-2 |
| D24 | Video 2:45 | ≤ 2:15 (D-17); no cooldown speed-ramp; a frost → hallmark → buy beat | X non-Premium limit | — |
| R2-1 | Brushed-silver CTA (kb/81 rev 1) | A near-white pill; metal only on objects | the industry register | tokens |
| R2-2 | Card balances + flip | An identity-only face; ChainRows hold the numbers | identical to the NFT art; less to build | −1.5 h |

## Open questions / decisions for the design lead
All decisions, with defaults and the **Oct 31** deadline, are in **`plan/phase0-checklist.md` §6** (UX-1 … UX-30). R2 closes UX-1, -2, -4, -6, -7, -8, -9, -10, -11, -12 and -14 with reference-backed answers.

The new open items:
- UX-15: numbers on the card face.
- UX-16: page tint on/off.
- UX-17: Home stack vs grid.
- UX-18: desktop action placement.
- UX-19: frost while listed.
- UX-20: the hallmark strike.
- UX-21: landing hero.
- UX-22: QR frame.
- UX-23: toast and progress placement.
- UX-24: warning-tier acknowledgement.
- UX-25: clock times in flows.
- UX-26: card texture.
- UX-27: an advisory past-signatures row.
- UX-28: mobile sticky bars.
- UX-29: a serif landing H1.
- UX-30: the signer credit line.

Cross-team questions (owner):
- **S1 (contract):** none new. R2 uses only kb/90 views, errors and events.
- **S2 (web):**
  - Confirm `font-variant-ligatures: none` removes JetBrains Mono's `calt` ligatures (Day 1).
  - Confirm the Tailwind 4.3.3 `--text-*` modifiers and `@utility`.
  - Confirm that the Incoming island and the PendingPill never wrap judge facts in a Suspense boundary.
- **Release:** kb/90 §7.7's badge promise names "Solana devnet". If DP7 cuts the Solana UI and no SOL record exists, keep it verbatim or trim it? This is the spec owner's call; R2 keeps it verbatim.
