# Satchel design tokens: dark metallic (Revision 2)
> Owner: ux · Checked: 2026-10-21 · **Revision 2 (reference-driven), supersedes rev 1** · Confidence: high for colour and contrast (computed); medium for typefaces and motion feel (the design lead's call).

This doc is the companion to `80-ux-spec.md` R2 and `82-design-references.md`. The other sources are:
- **Contrast.** Every ratio is WCAG 2.x relative luminance with sRGB alpha compositing, computed by the throwaway script `research/spikes/ux-refs/calc/contrast_r2.mjs`. That script imports the rev 1 helpers in `research/spikes/ux/` read-only. It reproduces rev 1's table exactly, so old and new numbers are comparable.
- **Springs.** Measured by `research/spikes/ux-refs/calc/springs_r2.mjs` with motion@14.5.0.
- **Rev 1.** A verbatim snapshot is kept at `research/spikes/ux-refs/rev1-snapshot/81-design-tokens.rev1.md`.

**[VERIFIED]** means "computed, numbers shown". Research IDs: `WC-` wallet-core, `NM-` nft-market, `TS-` trust-signing, `VL-` visual-language (`research/spikes/ux-refs/`).

## Changelog (rev 1 → R2)

| # | Change | Research / references | [VERIFIED] numbers |
|---|---|---|---|
| K2-01 | **CTA.** The brushed-silver gradient button becomes a **near-white pill**: `--cta` `#F1F4F7` → `--cta-2` `#DCE2E8` (OKLCH L 0.966 → 0.910, against rev 1's 0.944 → 0.779). Hover `#F7F9FB` → `#E6EAEF`; pressed is flat `#CFD6DE` with an inset shadow. Every button is a pill | VL-C1, VL-C2; [Revolut "Continue"](https://mobbin.com/screens/88351246-3dda-49c8-bc7b-47dbd91174a0), [DICE](https://mobbin.com/screens/bd01c9cf-6f8f-4fa3-a921-c392196ec322), [Slash](https://mobbin.com/sites/sections/b44c4394-b90c-44c2-aeb1-d1adad927c1c); anti-pattern [Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) | `--on-cta`: 17.84 / 15.08 at rest, 18.66 / 16.30 on hover, 13.43 pressed |
| K2-02 | `--metal-hi/mid/lo` are renamed **`--stamp-hi/mid/lo`** and scoped to objects: the HallmarkStamp, the success tile and the ◆ wordmark glyph. They are never used on a control | VL principle "metal belongs to the object"; [Commons stamp](https://mobbin.com/screens/f9ef6acb-0ce5-416c-aab2-ff38656ac5b5), [Solflare tile](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b) | `--on-stamp`: 16.75 / 12.51 / 9.80 |
| K2-03 | **Hairlines** `--hairline` (white at 8 %) and `--hairline-strong` (12 %). `--line` is kept for emphasis only; `--line-subtle` is retired (it becomes an alias of `--hairline`) | VL-C3; [Public](https://mobbin.com/sites/sections/a68d588f-1d33-489d-9e65-920c5df68e2f), [Fey](https://mobbin.com/screens/ba4a167d-2b95-49dd-b8d9-fd8ddbeb90dd) | 1.19–1.29 and 1.33–1.46 against their surface (decorative) |
| K2-04 | **Elevation rule:** in-page surfaces get depth from fill plus the inset top highlight. Outer shadows only on the card and overlays | VL-C4; [Phantom](https://mobbin.com/screens/575c3602-b594-4946-951d-8386d1fb8aca) | — |
| K2-05 | **Alloy glow** `--alloy-glow`, capped at 14 % alpha, behind the card. An optional **page tint** `--alloy-tint` is off by default; combined coverage stays ≤ 0.14 | VL-C5, NM-28; [Revolut tint](https://mobbin.com/flows/3f84a3d2-cfed-4448-9696-c8c404f051f1), [Phantom glow](https://mobbin.com/sites/sections/0881026c-ca19-43b2-937a-39f37cbb10b9) | `--fg-muted` ≥ **5.30** at 0.14 over ids 1–100,000; it fails at 0.24 (4.13) |
| K2-06 | **Typography roles.** `display` moves to wdth 100; new `display-xl`; new `amount-hero` with two step-downs; new mono-caps **`label`** at 12 px (it absorbs WC's `micro` and NM's Archivo label); a ticker rule; `amount` becomes 16/22 600; ligatures off in mono; `engrave` scoped to metal | VL-C6, WC-T1, WC-T2, NM-25; [OpenSea](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0), [Solflare](https://mobbin.com/screens/a557048d-05ba-47b3-80a2-d57a31874151) | `label` (`--fg-muted`) ≥ 5.35 on `--bg`…`--surface-3` |
| K2-07 | **Banner tints:** status colour at 8 % over the host surface, border at 32 % (decorative) | TS-K1 | text ≥ **4.98** (`--fg-muted` on frozen over `--surface-2`) |
| K2-08 | **Item-status colour map:** Settled and Expired → success; **Unfunded → neutral `--fg-2`**; **Settling → `--info`**; Unused → danger; Can't verify → warning; Unsafe → danger + a solid icon; In mempool → info, never success | TS-K2, WC-T4; anti-pattern [World App](https://mobbin.com/screens/e4bb22ae-adf1-46d5-b3aa-2aaddb65aa81) | Tag table below |
| K2-09 | **Three chip kinds:** the round StatusPill (the Satchel's own state), the **Tag** (radius 4, mono caps, 14 % tint; item facts) and the outlined **MetaChip** (identifiers) | NM-26, VL §2.10; [CRED](https://mobbin.com/screens/355d3ffb-11c1-43a8-a2dc-84fce0a53b2f), [OpenSea chips](https://mobbin.com/screens/22a15d9d-16bb-453d-8a6e-ebf7bd8f40e0) | tags ≥ 4.93 on every surface |
| K2-10 | **QR plate** token: white, radius 16, quiet zone ≥ 4 modules, ECC M, no logo | WC-T6; [Gemini web](https://mobbin.com/screens/db8d232a-1088-4f23-ab4b-a70769543247) | modules 19.69:1 |
| K2-11 | **Radii:** pills for every button; tag 4; chip 6; input 12; panel 12; tile 16; QR 16; sheet 24; a shared **chamfer** for stamps | VL-C2, TS-K3 | — |
| K2-12 | **Layout:** `--flow-width: 480px`, the pinned action bar, the pending pill, the sticky buy bar, the 56 px stack band, scroll padding | WC-T5, NM-5 | — |
| K2-13 | **Frost layer** for a listed Satchel (signing frozen). It always sits under glass and scrim | VL-C10, VL-C14 | glass ≥ 5.41 (`--chain-sol-fg`); scrim `--fg` 6.03 |
| K2-14 | **Motion:** new durations (reveal 200, frost-in 400, frost-out 600, materialise 600). Springs re-measured | VL-C8, TS-K5, NM-30 | stamp spring reaches 99 % at 141 ms, 4.53 % overshoot |
| K2-15 | **Destructive** = `--danger` text on a 14 % tint. `--danger-solid` is kept but unused in v1 | VL-C7; [Revolut settings](https://mobbin.com/flows/c260e756-09e3-4e41-ae17-34df9676a5d5) | 6.03 / 5.51 |
| K2-16 | **shadcn override list:** so the result doesn't read as stock shadcn | VL-C9, VL §4.10 | — |

## TL;DR
- **Dark only.** Graphite neutrals with a cool tint (hue ≈ 260). **Commit actions are a near-white pill.** Metal is the material of **objects**: the seeded alloy card and the silver hallmark stamp. Identity colour comes from each Satchel's alloy. It is used for a ≤ 14 % glow, the tab indicator and swatches, never for buttons.
- **Every text colour passes AA (4.5:1) on `--bg`…`--surface-3`.** The worst case is `--fg-muted` on `--surface-3` at 5.35:1. On `--surface-4` (pressed and selected only) it is 4.62:1. Banners (8 % tints) keep every text colour ≥ 4.98:1, tags (14 % tints) ≥ 4.93:1, and the alloy glow at its cap ≥ 5.30:1 **[VERIFIED]**.
- **Card text rule (unchanged):** glass `rgb(8 9 11 / 0.72)` takes any text colour; the scrim `rgb(8 9 11 / 0.48)` takes white only. The R2 frost layer sits under both and keeps glass ≥ 5.41:1 and scrim 6.03:1 **[VERIFIED]**.
- **Type:** Archivo (wdth 62–125) at **width 100 for everything except `engrave`**, which is wdth 125 and used only for marks stamped on metal. JetBrains Mono for addresses and for the new mono-caps `label` voice. There are two caps voices: *stamped* and *machine*.

## Principles
1. **Metal is the material of objects.** The card's alloy and the hallmark stamp are metal. Controls are near-white or graphite. There is no chrome on buttons ([Zomato Gold](https://mobbin.com/screens/185dfbc5-c9ec-4441-94f9-d2034104981b) is the counter-example).
2. **One signature element.** The alloy card, plus the hallmark your browser strikes on it when the history checks clean. Everything else stays quiet: hairlines, fills, no decorative gradients.
3. **Numbers are instruments.** Tabular, slashed-zero figures, right-aligned in rows. The **unit** is dimmed, never the digits.
4. **No text on raw gradient.** Text on the card sits on glass or scrim. Frost sits under both.
5. **Two caps voices.** `engrave` (Archivo wdth 125) for things stamped on metal; `label` (JetBrains Mono caps) for machine data.
6. **Depth by fill on mobile, hairlines on desktop.** Outer shadows only on the card and overlays.
7. **Colour is information.** Hue appears only for chain identity, status and the token's alloy.

## Colour

### Neutrals (graphite)
| Token | Value | OKLCH | Use |
|---|---|---|---|
| `--bg` | `#0A0B0D` | 0.149 0.005 264.5 | Page background |
| `--surface-1` | `#111317` | 0.186 0.009 264.3 | Panels, flat rows, tab content |
| `--surface-2` | `#181B20` | 0.221 0.011 260.7 | Popovers, menus, the few P2 sheets; ChainSelect track |
| `--surface-3` | `#20242A` | 0.259 0.013 258.4 | Inputs, secondary pills, round action buttons, hovered rows |
| `--surface-4` | `#2A2F37` | 0.304 0.016 259.8 | Pressed and selected only (`--fg-muted` 4.62:1 here) |
| `--hairline` **(R2)** | `rgb(255 255 255 / 0.08)` | — | Dividers, desktop panel outlines, list separators (decorative, 1.19–1.29:1) |
| `--hairline-strong` **(R2)** | `rgb(255 255 255 / 0.12)` | — | MetaChip outline, MarketCard border, QR frame edge (decorative, 1.33–1.46:1) |
| `--line` | `#3A4049` | 0.369 0.017 258.4 | Emphasised outlines only (1.49–1.88:1, decorative) |
| ~~`--line-subtle`~~ | alias of `--hairline` | — | retired in R2 |
| `--line-input` | `#69717D` | 0.546 0.021 258.4 | Input borders and toggle outlines (non-text, ≥ 3.16:1) |

### Text
| Token | Hex | OKLCH | Use |
|---|---|---|---|
| `--fg` | `#F3F5F8` | 0.969 0.005 258.3 | Primary text, amounts, the emphasised address groups |
| `--fg-2` | `#B4BBC5` | 0.790 0.016 257.2 | Secondary text, tickers, the middle address groups, Unfunded |
| `--fg-muted` | `#8F98A5` | 0.677 0.022 257.5 | `label`, timestamps, placeholders, failed (struck-through) amounts |
| `--fg-disabled` | `#5D6570` | 0.504 0.020 256.3 | Disabled only (WCAG-exempt; 2.64:1 on `--surface-3`) |
| `--link` | `#8CC8FF` | 0.812 0.100 247.0 | Links and explorer links (always underlined) |

### CTA: the near-white commit pill (R2, replaces "Metal (primary action)")
| Token | Hex | OKLCH L | `--on-cta` contrast **[VERIFIED]** | Use |
|---|---|---|---:|---|
| `--cta` | `#F1F4F7` | 0.966 | 17.84 | Top stop (or the flat fill) |
| `--cta-2` | `#DCE2E8` | 0.910 | 15.08 | Bottom stop |
| `--cta-hover` / `--cta-hover-2` | `#F7F9FB` / `#E6EAEF` | 0.981 / 0.935 | 18.66 / 16.30 | Hover |
| `--cta-pressed` | `#CFD6DE` | 0.873 | 13.43 | Pressed: flat fill + `inset 0 1px 2px rgb(0 0 0 / .25)` |
| `--on-cta` | `#0A0B0D` | 0.149 | — | Text and icons on the pill |

Rules:
- **Fill.** `background: linear-gradient(180deg, var(--cta), var(--cta-2))`. The lightness span is 0.056, against rev 1's 0.165, so it reads as a light pill and not chrome. A flat `--cta` fill is also acceptable.
- **Shape and sizes.** Pill radius always. 48 px tall for the mobile primary, 40 px default on desktop, 32 px compact.
- **One CTA pill per view**, for that view's primary action. Commit actions always use it: Send {amount}, Transfer to {account}, List for {price}, Buy for {price}, Mint, Broadcast again.
- **Disabled.** `--surface-3` with `--fg-disabled`. Never a dimmed pill.
- **Focus.** The ring is only 1.61:1 against the pill, so focus is always `ring-2 ring-offset-2` with `--bg` as the offset colour (11.08:1 against the page).

Other button kinds **[VERIFIED]**:
- **Secondary:** a `--surface-3` pill with `--fg` (14.27:1); hover `--surface-4` (12.32:1).
- **Tertiary:** a text button in `--fg-2` that turns `--fg` on hover; links are underlined `--link`.
- **Round action:** a 48 px circle in `--surface-3` with a 20 px `--fg` icon and a `small` label in `--fg-2` under it (owner ActionRow, at most 4).
- **Destructive:** `--danger` text on a 14 % `--danger` tint (6.03 / 5.51:1 over `--surface-1` / `--surface-2`). No v1 action needs it: Delist is reversible, so it is a secondary pill.

### Stamp metal (objects only; R2 rename of `--metal-*`)
| Token | Hex | OKLCH L | Use | `--on-stamp` `#0A0B0D` **[VERIFIED]** |
|---|---|---|---|---:|
| `--stamp-hi` | `#E9EDF2` | 0.944 | Top of the stamp plate | 16.75 |
| `--stamp-mid` | `#C7CFD8` | 0.851 | Middle stop | 12.51 |
| `--stamp-lo` | `#AEB8C4` | 0.779 | Bottom stop; the 1 px stamp edge and chamfer outline | 9.80 |

The HallmarkStamp plate and the success tile use `linear-gradient(180deg, var(--stamp-hi) 0%, var(--stamp-mid) 55%, var(--stamp-lo) 100%)` with `--shadow-stamp`. The ◆ wordmark glyph uses `--stamp-mid`. A control may never use these.

### Status (UI feedback)
| Token | Hex | OKLCH | Use (R2 rules) |
|---|---|---|---|
| `--success` | `#4ADE9B` | 0.806 0.158 159.6 | **Final good states only:** Settled, Expired, Confirmed, Received, Transferred, the Active dot. A ✓ is never shown on a non-final state |
| `--warning` | `#F6C453` | 0.844 0.140 84.8 | Can't verify, the Signed-not-sent card, the DEV CONTRACT strip, a warning-tier recipient, `1 OF 2 SOURCES` |
| `--danger` | `#FF7A7A` | 0.735 0.163 21.9 | Unused, Unsafe (with a solid icon), field errors, a failed tracker row |
| `--danger-solid` | `#CF3B40` | 0.574 0.185 23.5 | Kept for a future irreversible confirm; unused in v1 (white on it 4.82:1) |
| `--info` | `#7DB8FF` | 0.771 0.120 253.7 | Signing, **Settling**, **In mempool**, Pending, the RELEASE CANDIDATE strip, the "sent, unconfirmed" ring |
| `--fg-2` as neutral | `#B4BBC5` | — | **Unfunded** (with an info glyph), Sold, New |

**Item status → tag (CleanHistory rows, Activity chips).** The colour always comes with the written word (WCAG 1.4.1):

| Item status (kb/90 §7.3) | Tag text | Colour | Glyph | Blocks Buy |
|---|---|---|---|---|
| `spent` | SETTLED | `--success` | ✓ | no |
| `expired` | EXPIRED | `--success` | ✓ with a clock | no |
| `unfunded` | UNFUNDED | `--fg-2` | ⓘ | no (D-04) |
| `settling` | SETTLING | `--info` | ◷ | yes |
| `unused` | UNUSED | `--danger` | ! | yes |
| `unknown` | CAN'T VERIFY | `--warning` | ? | yes |
| aggregate `unsafe` | UNSAFE | `--danger` | solid ⛔ icon | yes, with no override |

Activity tags appear only on non-final rows: SIGNING (info), IN MEMPOOL (info), NOT SENT (warning), FAILED (danger), UNUSED (danger). Other tags:
- `TRANSFERRED` (success), shown in the handoff end frame;
- `SOLD` (`--fg-2`), on the seller's greyscale card;
- `NEW` (`--fg-2`, P2);
- `1 OF 2 SOURCES` (warning).

**Banner surfaces (R2).** A banner's fill is the status colour at **8 %** over its host surface, and its border is the same colour at **32 %**:
- The border is **decorative** (1.75–2.29:1), so the icon and the words carry the meaning.
- Text may be `--fg`, `--fg-2`, `--fg-muted`, `--link` or the status colour itself.
- Banners in use: FreezeBanner (frozen), SignedNotSentCard (warning), the blocked verdict (danger), RoleStrip (warning/info) and `banner.rpc-down` (warning).
- Never use a solid red fill.

### Satchel status (StatusPill: round, sentence case, the Satchel's own state)
| Status (kb/90 §5.10) | Text/icon | Pill fill | Glyph |
|---|---|---|---|
| Active | `--success` | 14 % tint | filled dot |
| Signing (overlay on Active) | `--info` | 14 % tint | spinner (static under reduced motion) |
| For sale | `--state-listed` `#E8C77A` | 14 % tint | tag glyph |
| Sold (flow end state only) | `--fg-2` | 14 % tint | check |

- **"Listed · cooling down" is gone** (E-37).
- `--state-frozen` `#9AD8FF` is now the **freeze colour**: the FreezeBanner glyph, its 8 % fill and border, and the frost layer's cool cast.
- On the card the pill sits on glass. The status is always written as text.

### Chain accents (unchanged)
| Chain | Brand (fills, icons on `--bg`…`--surface-3`) | Text and icons on the card (`-fg`) | Soft fill |
|---|---|---|---|
| Bitcoin testnet4 | `--chain-btc` `#F7931A` | `--chain-btc-fg` `#FFA94D` | `-fg` at 14 % |
| Ethereum Sepolia | `--chain-eth` `#627EEA` | `--chain-eth-fg` `#9AABF5` | `-fg` at 14 % |
| Solana devnet | `--chain-sol` `#9945FF`, `--chain-sol-2` `#14F195` | `--chain-sol-fg` `#C09BFF` | `-fg` at 14 % |

Rules:
- Brand colours are never text.
- Icons on the card always use the `-fg` tints. On glass the brand colours measure BTC 5.39, ETH 3.36 and **SOL 2.74 (fails 3:1)**.
- A 14 px chain badge sits at the bottom-right of a 40 px asset icon wherever a token could be ambiguous (P2 SOL), following [Base home](https://mobbin.com/screens/638c39ce-9851-406d-8e42-4499884c49e4).

### Card glass, scrim and frost (the "scrim under text on gradients" rule)
| Token / layer | Value | Allowed content | Worst-case contrast over ids 1–100,000 **[VERIFIED]** |
|---|---|---|---|
| `--card-glass` | `rgb(8 9 11 / 0.72)` + `backdrop-filter: blur(8px)` | Any text colour: StatusPill, owner chip, chain marks | Worst pixel `#93AB99` (Patina, id 6110):<br>• `--fg` 11.33, `--fg-2` 6.40;<br>• `--chain-btc-fg` 6.50, `--chain-eth-fg` 5.61, `--chain-sol-fg` 5.53;<br>• `--success` 7.20, `--state-frozen` 8.04, `--state-listed` 7.59, `--warning` 7.63, `--info` 6.00;<br>• `--danger` 4.90 |
| `--card-scrim` | `rgb(8 9 11 / 0.48)` | `--fg` (white) only: the serial, the alloy name, the SVG's `{n} SIGNATURES` engraving | `--fg` 6.33 (`--fg-2` 3.57 fails) |
| **Frost (R2, listed)** | Each stop mixed 30 % toward an equal-luminance grey (≈ `saturate(0.7)` in linearRGB); the 16 % specular kept; a ≤ 6 % white crystalline texture on top. **Always under glass and scrim** | — | Worst pixel `#9FAEA2` (id 6110):<br>• glass: `--fg` 11.09, `--fg-2` 6.26, `--chain-btc-fg` 6.37, `--chain-eth-fg` 5.49, `--chain-sol-fg` **5.41**, `--success` 7.05, `--warning` 7.46, `--info` 5.87, `--state-frozen` 7.87, `--state-listed` 7.43, `--danger` 4.80;<br>• scrim: `--fg` **6.03** |
| Sold (100 % greyscale, seller's view) | equal-luminance grey + 16 % specular | — | glass ≥ 5.49 (`--chain-sol-fg`); scrim `--fg` 6.31 |

Rules:
- **No `--danger` text on the card.** It passes (4.80 under frost) with too thin a margin, and the card has no danger state anyway.
- **Re-run the sweep** (`contrast_r2.mjs frost`) once the real frost texture is drawn, or if the alloy table or the highlight alpha changes.
- **Method.** For each id the sweep composites the specular highlight over every stop and keeps the brightest pixel. Blur is ignored, so the result is conservative.

### QR plate (R2)
| Token | Value | Rule |
|---|---|---|
| `--qr-plate` | `#FFFFFF`, radius `--radius-qr` (16) | Quiet zone ≥ 4 modules (≥ 16 px at 240 px). ECC level M. Dark modules only, no logo. The plain address only, with no URI amount |
| `--qr-ink` | `#0A0B0D` | Module contrast 19.69:1 **[VERIFIED]** |
| Frame | The token's alloy gradient (default; design-lead option UX-22) or `--surface-2` | Text in the frame follows the glass/scrim rule; the frame edge is `--hairline-strong` |

### Seeded identity colours
| Identity | Formula | Contrast **[VERIFIED]** |
|---|---|---|
| Satchel accent `--alloy` (per token) | `oklch(0.80, min(C×1.2+0.02, 0.14), h1)` from the token's alloy, gamut-clamped. The server sets it per page (`style="--alloy:#5CD5C7"`) | 253 distinct accents over ids 1–100,000. As text or indicator: ≥ 9.98 on `--bg`, 9.42 on `--surface-1`, 8.75 on `--surface-2` |
| **`--alloy-glow` (R2)** | `radial-gradient(ellipse 70% 55% at 50% 35%, color-mix(in srgb, var(--alloy) 14%, transparent), transparent 70%)` behind the card on `/` and `/s/[id]`. **Peak alpha ≤ 0.14** | See the glow table: `--fg-muted` ≥ 5.30 at the cap |
| **`--alloy-tint` (R2, off by default)** | A full-bleed top wash: `linear-gradient(180deg, color-mix(in srgb, var(--alloy) 6%, transparent), transparent 60vh)`. With the tint on, the glow peak drops to 8 %, so combined coverage is 1 − 0.92 × 0.94 = 0.135 ≤ 0.14 | Same bound |
| Account avatar (NEAR account) | hue = `fnv1a32(accountId) % 360`; fill `oklch(0.74 0.12 hue)`; initial in `#0A0B0D` | Initial ≥ 8.03:1 for every hue |

The alloy is used for exactly four things:
1. the glow (and tint);
2. the 2 px NavTab indicator;
3. a selected chip's outline;
4. the Satchel **swatch** (the `xs` card or an inline mini-card) wherever a Satchel is named: Review "From", Activity "Sent to Satchel #4", Transfer, Home.

It never fills a button (resolves rev 1 Open question 3; VL-C5, WC Open question 10, NM Open question 12).

Examples: `alice.testnet` gets hue 354 (`#E68AB0`, rose) and `bob.testnet` hue 241 (`#5EB4EF`, blue). These are the owner colours that the handoff key animates between.

### shadcn/ui variable mapping and overrides
Set `<html class="dark">`. Tokens live on `:root` because there is no light theme.

| shadcn var | Satchel token (R2) |
|---|---|
| `--background` / `--foreground` | `--bg` / `--fg` |
| `--card` / `--card-foreground` | `--surface-1` / `--fg` |
| `--popover` / `--popover-foreground` | `--surface-2` / `--fg` |
| `--primary` / `--primary-foreground` | **`--cta` / `--on-cta`** (the Button adds the 2-stop fill) |
| `--secondary` / `--secondary-foreground` | `--surface-3` / `--fg` |
| `--muted` / `--muted-foreground` | `--surface-2` / `--fg-muted` |
| `--accent` / `--accent-foreground` | `--surface-3` / `--fg` (shadcn uses "accent" for hover fills) |
| `--destructive` | `--danger` (used as text on a 14 % tint, not as a fill) |
| `--border` / `--input` / `--ring` | **`--hairline`** / `--line-input` / `--ring` (`#8CC8FF`) |

Overrides, so the result never reads as stock shadcn (VL-C9, VL §4.10):

| Primitive | Default look | Satchel R2 |
|---|---|---|
| Button | `rounded-md`, flat primary | Pill; CTA 2-stop near-white; secondary `--surface-3`; destructive is tint + text |
| Card | border + `shadow-sm` | No border and no shadow on mobile (fill only); a `--hairline` outline on desktop; outer shadow only on SatchelCard |
| Tabs | pill-in-a-box | Underline **links** (`aria-current`) with the 2 px alloy indicator |
| Badge | generic | StatusPill (round) · Tag (radius 4, mono caps) · MetaChip (outlined) |
| Skeleton | `bg-muted animate-pulse` | Static `--surface-2` shapes on `--surface-1`, radii matching the content; an optional 1.6 s sheen of 6 % white, off under reduced motion |
| Toast | default card | A compact `--surface-3` pill: 16 px status icon, `--fg` 13/18 500, a title of five words or fewer, one toast at a time |
| Dialog / Drawer | flow containers | **Not used for flows in v1** (full pages, D-26). Used only for the ⋯ menu, tooltips and the P2 sheets |

## Contrast tables [VERIFIED]
Text needs 4.5:1; non-text needs 3:1 (WCAG 1.4.11). Output of `node research/spikes/ux-refs/calc/contrast_r2.mjs base`; the bg…surface-3 values are identical to rev 1.

| Foreground | --bg | --surface-1 | --surface-2 | --surface-3 | --surface-4 | Min (bg…s3) | Need | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `--fg` #F3F5F8 | 18.03 | 17.03 | 15.81 | 14.27 | 12.32 | 14.27 | 4.5 | pass |
| `--fg-2` #B4BBC5 | 10.18 | 9.61 | 8.92 | 8.06 | 6.96 | 8.06 | 4.5 | pass |
| `--fg-muted` #8F98A5 | 6.75 | 6.38 | 5.92 | 5.35 | 4.62 | 5.35 | 4.5 | pass |
| `--link` #8CC8FF | 11.08 | 10.47 | 9.72 | 8.77 | 7.58 | 8.77 | 4.5 | pass |
| `--success` #4ADE9B | 11.45 | 10.81 | 10.04 | 9.07 | 7.83 | 9.07 | 4.5 | pass |
| `--warning` #F6C453 | 12.13 | 11.46 | 10.64 | 9.60 | 8.29 | 9.60 | 4.5 | pass |
| `--danger` #FF7A7A | 7.80 | 7.36 | 6.84 | 6.17 | 5.33 | 6.17 | 4.5 | pass |
| `--info` #7DB8FF | 9.54 | 9.01 | 8.36 | 7.55 | 6.52 | 7.55 | 4.5 | pass |
| `--state-frozen` #9AD8FF | 12.79 | 12.08 | 11.21 | 10.12 | 8.74 | 10.12 | 4.5 | pass |
| `--state-listed` #E8C77A | 12.08 | 11.41 | 10.59 | 9.56 | 8.26 | 9.56 | 4.5 | pass |
| `--chain-btc-fg` #FFA94D | 10.35 | 9.77 | 9.07 | 8.19 | 7.07 | 8.19 | 4.5 | pass |
| `--chain-eth-fg` #9AABF5 | 8.92 | 8.43 | 7.82 | 7.06 | 6.10 | 7.06 | 4.5 | pass |
| `--chain-sol-fg` #C09BFF | 8.79 | 8.30 | 7.71 | 6.96 | 6.01 | 6.96 | 4.5 | pass |
| `--chain-btc` #F7931A (non-text) | 8.57 | 8.10 | 7.52 | 6.79 | — | 6.79 | 3 | pass |
| `--chain-eth` #627EEA (non-text) | 5.34 | 5.04 | 4.68 | 4.22 | — | 4.22 | 3 | pass |
| `--chain-sol` #9945FF (non-text) | 4.36 | 4.12 | 3.82 | 3.45 | — | 3.45 | 3 | pass |
| `--chain-sol-2` #14F195 (non-text) | 13.17 | 12.44 | 11.55 | 10.43 | — | 10.43 | 3 | pass |
| `--ring` #8CC8FF (non-text) | 11.08 | 10.47 | 9.72 | 8.77 | — | 8.77 | 3 | pass |
| `--line-input` #69717D (non-text) | 3.99 | 3.77 | 3.50 | 3.16 | — | 3.16 | 3 | pass |

**Tags and pills** (text = the tint colour on a 14 % fill of that colour over the host surface; R2 adds `--bg` and `--surface-3`):

| Text | over --bg | over --surface-1 | over --surface-2 | over --surface-3 | Min |
|---|---:|---:|---:|---:|---:|
| `--success` | 8.94 | 8.25 | 7.49 | 6.66 | 6.66 |
| `--warning` | 9.38 | 8.57 | 7.77 | 6.98 | 6.98 |
| `--danger` | 6.49 | 6.03 | 5.51 | 4.93 | **4.93** |
| `--info` | 7.67 | 7.03 | 6.38 | 5.68 | 5.68 |
| `--fg-2` (neutral) | 8.04 | 7.35 | 6.74 | 6.00 | 6.00 |
| `--state-frozen` | 9.74 | 8.88 | 8.12 | 7.21 | 7.21 |
| `--state-listed` | 9.36 | 8.54 | 7.75 | 6.89 | 6.89 |
| `--chain-btc-fg` | 8.26 | 7.56 | 6.88 | 6.13 | 6.13 |
| `--chain-eth-fg` | 7.26 | 6.65 | 6.04 | 5.39 | 5.39 |
| `--chain-sol-fg` | 7.16 | 6.55 | 5.96 | 5.33 | 5.33 |

**Banners** (fill = status at 8 % over the surface; text-to-fill ratios; border at 32 % against the surface is decorative):

| Surface | Status | Fill | `--fg` | `--fg-2` | `--fg-muted` | `--link` | status text | border 32 % |
|---|---|---|---:|---:|---:|---:|---:|---:|
| `--bg` | success | `#0F1C18` | 16.03 | 9.05 | 6.00 | 9.85 | 10.18 | 2.10 |
| `--bg` | warning | `#1D1A13` | 15.90 | 8.98 | 5.96 | 9.77 | 10.70 | 2.15 |
| `--bg` | danger | `#1E1416` | 16.48 | 9.30 | 6.17 | 10.13 | 7.13 | 1.75 |
| `--bg` | info | `#131920` | 16.19 | 9.14 | 6.06 | 9.95 | 8.57 | 1.92 |
| `--bg` | neutral (`--fg-2`) | `#18191C` | 16.09 | 9.09 | 6.03 | 9.89 | 9.09 | 1.98 |
| `--bg` | frozen | `#161B20` | 15.87 | 8.96 | 5.94 | 9.76 | 11.26 | 2.23 |
| `--surface-1` | success | `#162322` | 14.82 | 8.37 | 5.55 | 9.11 | 9.41 | 2.14 |
| `--surface-1` | warning | `#23211C` | 14.72 | 8.31 | 5.52 | 9.05 | 9.91 | 2.22 |
| `--surface-1` | danger | `#241B1F` | 15.36 | 8.67 | 5.75 | 9.44 | 6.65 | 1.78 |
| `--surface-1` | info | `#1A202A` | 14.98 | 8.45 | 5.61 | 9.21 | 7.92 | 1.99 |
| `--surface-1` | neutral | `#1E2025` | 14.92 | 8.42 | 5.59 | 9.17 | 8.42 | 2.05 |
| `--surface-1` | frozen | `#1C232A` | 14.53 | 8.20 | 5.44 | 8.93 | 10.31 | 2.28 |
| `--surface-2` | success | `#1C2B2A` | 13.46 | 7.60 | 5.04 | 8.28 | 8.55 | 2.15 |
| `--surface-2` | warning | `#2A2924` | 13.34 | 7.53 | 5.00 | 8.20 | 8.98 | 2.22 |
| `--surface-2` | danger | `#2A2327` | 14.05 | 7.93 | 5.26 | 8.64 | 6.08 | 1.79 |
| `--surface-2` | info | `#202832` | 13.63 | 7.69 | 5.10 | 8.38 | 7.21 | 1.99 |
| `--surface-2` | neutral | `#24282D` | 13.57 | 7.66 | 5.09 | 8.35 | 7.66 | 2.07 |
| `--surface-2` | frozen | `#222A32` | 13.30 | 7.51 | **4.98** | 8.18 | 9.44 | 2.29 |

At a 10 % fill, `--fg-muted` on `--surface-2` drops to 4.73–5.08 (frozen 4.73). **8 % is the rule.** Banners normally sit on `--bg` (page banners) or `--surface-1` (in-panel).

**Alloy glow** (accent at alpha *a* over `--bg`; worst case over every accent of ids 1–100,000):

| Alpha | Brightest glow pixel | `--fg` | `--fg-2` | `--fg-muted` | `--link` | `--danger` | `--info` | `--chain-sol-fg` | Result |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| 0.10 | `#1A1D25` | 15.43 | 8.71 | 5.78 | 9.48 | 6.67 | 8.16 | 7.52 | pass |
| 0.12 | `#1E2126` | 14.78 | 8.35 | 5.54 | 9.09 | 6.39 | 7.82 | 7.21 | pass |
| **0.14 (cap)** | `#20252A` | 14.14 | 7.98 | **5.30** | 8.70 | 6.12 | 7.48 | 6.90 | pass |
| 0.18 | `#272C32` | 12.88 | 7.27 | 4.83 | 7.92 | 5.57 | 6.82 | 6.28 | pass, thin |
| 0.24 | `#213B36` | 11.03 | 6.23 | **4.13** | 6.78 | 4.77 | 5.83 | 5.38 | **fails** (`--fg-muted`) |

The glow sits on `--bg`. Opaque surfaces above it are unaffected. Recompute if the glow is ever placed on a surface other than `--bg`.

**CTA, hairlines and other pairs:**

| Pair | Ratio | Note |
|---|---:|---|
| `--on-cta` on `--cta` / `--cta-2` / hover / hover-2 / pressed | 17.84 / 15.08 / 18.66 / 16.30 / 13.43 | rev 1 brushed silver: 16.75 / 12.51 / 9.80 |
| CTA bottom stop vs `--bg` (pill edge) | 15.08 | non-text, ≥ 3 |
| `--ring` vs `--cta` | 1.61 | so focus uses `ring-offset-2` with `--bg` (11.08:1) |
| Hairline 6 / **8** / 10 / **12** % vs bg · s1 · s2 · s3 · s4 | 1.13–1.20 / **1.19–1.29** / 1.26–1.37 / **1.33–1.46** | decorative; rev 1 `--line` was 1.49–1.88 |
| QR module `#0A0B0D` on `#FFFFFF` | 19.69 | scanning margin |
| `label` = `--fg-muted` (12 px) | ≥ 5.35 (4.62 on `--surface-4`) | `label` is never placed on `--surface-4` |
| Address groups: ends `--fg` / middle `--fg-2` | ≥ 14.27 / ≥ 8.06 | — |
| Ticker `--fg-2` | ≥ 8.06 | — |
| Failed amount `--fg-muted` with `line-through` + the word "Failed" | ≥ 5.35 | colour is not the only signal |
| Info ring glyph (non-text) | ≥ 7.55 | — |
| White on `--danger-solid` | 4.82 | unused in v1 |

## Typography
Fonts verified by parsing GSUB and fvar in google/fonts `main` on 2026-10-21 **[VERIFIED]**. The faces are unchanged from rev 1; their roles changed.

| Face | Axes | `tnum` | `zero` | Notes |
|---|---|---|---|---|
| **Archivo** (variable) | wght 100–900, **wdth 62–125** | yes | yes | UI and display at wdth 100; `engrave` at wdth 125 |
| **JetBrains Mono** (variable) | wght 100–800 | n/a (mono) | yes | Addresses, hashes and the `label` voice. **Ligatures off** |
| Rejected: Geist / Geist Mono | wght only | — | no | The create-next-app default: it looks templated |

Loading: `next/font/google` with `Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo' })` and `JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono' })` **[ASSUMED API shape; check against kb/41]**. `engrave` uses `font-stretch: 125%`. For the OG image (Satori renders variable fonts at their default instance), ship a **static Archivo instance at wdth 125 / wght 650** for engrave text and **wdth 100 / wght 650** for display text.

**The type scale** (mobile → ≥ 1024; Archivo unless noted):

| Role (token) | Face, width, weight | Size / line height | Tracking | Case | Numerals | Use |
|---|---|---|---|---|---|---|
| `display-xl` **(new)** | wdth 100, 650 | 40/44 → 64/68 | −0.025em | Sentence | — | Landing H1 only |
| `display` **(changed)** | **wdth 100**, 650 | 32/36 → 48/52 | −0.02em | Sentence | — | Judge H1 "This NFT is a wallet.", success sentences ("Satchel #3 is yours.") |
| `h1` | wdth 100, 650 | 24/30 → 28/34 | −0.005em | Sentence | — | Owner H1 "Satchel #1", flow titles, the desktop verdict |
| `h2` | 100, 600 | 20/26 | 0 | Sentence | — | Verdict sentence at 390, section titles |
| `h3` | 100, 600 | 16/22 | 0 | Sentence | — | Row titles (network label, CleanHistory row title) |
| `body` | 100, 400 | 15/22 → 16/24 | 0 | Sentence | — | Copy |
| `small` | 100, 450 | 13/18 | 0 | Sentence | — | Sub-lines, helpers, action labels |
| `caption` (minimum size) | 100, 500 | 12/16 | +0.01em | Sentence | — | Captions |
| `engrave` **(scoped)** | **wdth 125**, 650 | 12/16 (card serial 15/20 at `lg`) | +0.08em | UPPER | lining | **Only marks stamped on metal:** the ◆ SATCHEL wordmark, the card serial `SATCHEL № 0001`, the alloy name on the card, HallmarkStamp text |
| `label` **(new; absorbs `micro`)** | **JetBrains Mono 500** | 12/16 | +0.04em | UPPER | `"zero" 1` | Machine data: field labels (`TO`, `NETWORK FEE`), stats strip, day headers (`TODAY`), MetaChips, Tags, eyebrows (`CLEAN HISTORY`, `NEAR CHAIN SIGNATURES · TESTNET`), the mint bar, `BUY FOR`, `LISTED FOR`, the QR caption, `INCOMING` |
| `amount-hero` **(new)** | wdth 100, 600 | **44/48 → 56/60**; steps down to 36/40, then 28/32, instead of wrapping | −0.02em | — | `tabular-nums slashed-zero` | Send amount input, Review hero, Sent/Bought amounts |
| `amount-xl` | 100, 600 | 28/32 → 32/36 | −0.01em | — | `tabular-nums slashed-zero` | `BUY FOR` price, Sell price input |
| `amount` **(changed)** | 100, **600** | **16/22** | 0 | — | `tabular-nums slashed-zero` | ChainRow balances, review rows, market stats |
| `ticker` **(new rule)** | 100, 500, `--fg-2` | `max(12px, 0.36em)` inside `amount-hero` and `amount-xl`. Inside `amount` rows it keeps the row size (colour only) | +0.02em | UPPER | — | BTC · ETH · SOL · NEAR · USDC · sats, preceded by a thin space U+2009 |
| `mono` | JetBrains Mono 450 | 13/18 (full address 14/22) | +0.02em | as-is | `"zero" 1` | Addresses, hashes, tx ids. **`font-variant-ligatures: none`** |

Rules:
- **Size floor.** Nothing is smaller than 12 px. Rev 1's sub-12 `TESTNET` engraving on the card is gone: the face shows the alloy name at 12 px instead.
- **Expanded width** appears only in `engrave`. The display roles are normal width, like [Linear's hero](https://mobbin.com/sites/sections/038755ae-4b0f-4e25-a7df-dca35d71d6bc). No premium hero in the sample uses a wide face (VL §2.8). Outside the card and the wordmark there is at most one `engrave` line per view.
- **Full addresses** render in 4-character groups with 0.35em gaps, using spans so that copying yields the raw string.
  - Emphasis: the **first two groups and the last group** in `--fg` 600, the middle groups in `--fg-2` 450.
  - The first group alone is the shared prefix (`tb1q`, `0x53`), so emphasising only it would not help anyone check (WC-T3, adapted).
- **Signs and spacing.** U+2212 for outgoing amounts and U+2009 before the ticker.
- **Ligatures.** `font-variant-ligatures: none` disables contextual alternates (`calt`), which JetBrains Mono uses for its code ligatures **[ASSUMED per the font; check on Day 1 by rendering `0x--> != =>`]**.
- **Optional serif display** for the landing H1 only (VL Open question 2). Not adopted; see UX-29 in `plan/phase0-checklist.md` §6.

## Radii
| Token | Value | Use |
|---|---|---|
| `--radius` | 12px | Base (shadcn); `--radius-sm` / `-md` / `-lg` / `-xl` = 8 / 10 / 12 / 16 for primitives |
| `--radius-pill` | 9999px | **Every button**, StatusPill, ChainSelect track and segments, toast |
| `--radius-tag` **(R2)** | 4px | Tag |
| `--radius-chip` **(R2)** | 6px | MetaChip |
| `--radius-input` | 12px | Inputs, RecipientInput's resolved row |
| `--radius-panel` | 12px | Desktop panels, MarketCard |
| `--radius-tile` | 16px | Mobile grouped surfaces (FundCard, SignedNotSentCard, OutcomeCard) |
| `--radius-qr` | 16px | QR plate |
| `--radius-sheet` **(R2)** | 24px | Top corners of the few P2 sheets; the ⋯ menu uses 12 |
| **Card** | **0.0372 × card width** | ISO/IEC 7810 ID-1: 3.18 ÷ 85.60 mm = 3.72 % [SOURCED](https://en.wikipedia.org/wiki/ISO/IEC_7810). That gives 16 px at 440, 13 at 358, 10 at 280, 6 at 160 and 2 at 48 (`xs`) |
| **Chamfer motif (R2)** | 45° corner cut of max(4 px, 12 % of the shorter edge) | HallmarkStamp, the success tile, the Hallmark chip's outline (TS-K3; [Solflare tile](https://mobbin.com/screens/10886625-f794-483a-886f-449004a2947b)) |

## Shadows and elevation (dark UI)
| Token | Value | Use (R2 rule) |
|---|---|---|
| `--shadow-raise-1` | `inset 0 1px 0 rgb(255 255 255 / 0.04), 0 1px 2px rgb(0 0 0 / 0.40)` | **In-page surfaces use the inset part only** (fill + top highlight) |
| `--shadow-raise-2` | `inset 0 1px 0 rgb(255 255 255 / 0.05), 0 8px 24px -8px rgb(0 0 0 / 0.60)` | Menus and popovers |
| `--shadow-overlay` | `0 24px 64px -12px rgb(0 0 0 / 0.70)` | P2 sheets, PendingCard (desktop) |
| `--shadow-card` | `inset 0 1px 0 rgb(255 255 255 / 0.20), inset 0 -1px 0 rgb(0 0 0 / 0.35), 0 18px 40px -16px rgb(0 0 0 / 0.75)` | SatchelCard |
| `--shadow-card-lifted` | `inset 0 1px 0 rgb(255 255 255 / 0.24), inset 0 -1px 0 rgb(0 0 0 / 0.35), 0 36px 72px -20px rgb(0 0 0 / 0.80)` | Card in the handoff lift |
| `--shadow-cta` **(R2; was `--shadow-metal`)** | `inset 0 1px 0 rgb(255 255 255 / 0.50), inset 0 -1px 0 rgb(0 0 0 / 0.12), 0 1px 2px rgb(0 0 0 / 0.50)` | CTA pill; the top highlight drops from 0.65 to 0.50 (VL-C1) |
| `--shadow-cta-pressed` **(R2)** | `inset 0 1px 2px rgb(0 0 0 / 0.25)` | Pressed CTA |
| `--shadow-stamp` **(R2)** | `inset 0 1px 0 rgb(255 255 255 / 0.65), inset 0 -1px 0 rgb(0 0 0 / 0.20), 0 2px 6px -2px rgb(0 0 0 / 0.60)` | HallmarkStamp and success tile (the rev 1 metal highlight lives on here) |

## Spacing, layout, breakpoints, layers
| Item | Value |
|---|---|
| Spacing scale | Tailwind default (`--spacing: 0.25rem`) |
| Page gutter | 16 px below 640; 24 px from 640; max content width 1200 px |
| Breakpoints | `sm` 640 · `md` 768 · `lg` 1024 (two-column Satchel page) · `xl` 1280 |
| Desktop Satchel grid | 12 columns, 48 px gap. Left 5 columns are a sticky panel (top 88 px); right 7 columns hold the content |
| **Flow column (R2)** | `--flow-width: 480px` for full-page Send, Fund and Transfer at ≥ 640. A "← Satchel #{id}" back link plus a 2 px progress hairline (`--fg` at 40 %) under the TopBar: Form 33 % → Review 66 % → Tracker 100 % |
| Top bar | 56 px (mobile) / 64 px (desktop), sticky. On mobile, flow pages swap it for a 56 px **flow bar**: ✕ or Minimize, a centred title, the step hairline |
| **Pinned action bar (R2, mobile flows)** | 16 px gutters; a 48 px pill; `padding-bottom: max(16px, env(safe-area-inset-bottom))`; a 24 px `--bg` fade above it; layer 40. Viewport meta `interactive-widget=resizes-content`, so the bar rides above the keyboard in Chromium (WC §2.4) |
| **Sticky buy bar (R2, mobile, a visitor on a listed Satchel)** | Same metrics. Price (`amount`) on the left, a Buy pill on the right, the GateLine footnote under them (`small`) |
| **PendingPill (R2, mobile)** | 36 px, centred under the TopBar, sticky, layer 40. Its height is added to `scroll-padding-top` while it is visible |
| **PendingCard (R2, desktop)** | 320 px wide, 24 px from the bottom-right corner, `--surface-2` + `--shadow-overlay`, layer 40 |
| Home stack band (R2) | 56 px per collapsed card (≥ 44 px target) |
| ChainSelect | 44 px on mobile, 36 px on desktop |
| Touch targets | ≥ 44×44 px for primary controls on mobile; ≥ 24×24 px for every target, with spacing (WCAG 2.5.8) |
| Scroll padding | top: 72 px (+36 with the PendingPill); bottom: 96 px when a pinned or sticky bar is present, plus the safe area (WCAG 2.4.11) |
| Z layers | content 0 · sticky bars and pills 40 · menus and sheets 50 · toast 60 |

## Motion tokens
CSS tweens are listed here. Springs (all re-measured with motion@14.5.0) are in `80-ux-spec.md` R2 › Motion spec.

| Token | Value | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Enter and change |
| `--ease-exit` | `cubic-bezier(0.3, 0, 1, 1)` | Exit |
| `--duration-fast` | 120ms | Hover, press, the CTA label morph |
| `--duration-base` | 160ms | Chips, value swaps, row-resolve swaps, the pill's tense flip, the Tag "stamp" |
| `--duration-reveal` **(R2)** | 200ms | Tracker connector fill, in-place reveals, reduced-motion cross-fades |
| `--duration-slow` | 240ms | Message reveals, check `pathLength` |
| `--duration-slower` | 320ms | Owner colour change on handoff |
| `--duration-frost-in` **(R2)** | 400ms | Frost forms when a listing lands |
| `--duration-frost-out` **(R2)** | 600ms | Frost clears on delist, or for the new owner after a sale |
| `--duration-materialise` **(R2)** | 600ms | Mint: grain resolves into the alloy |

**Spring presets** (Motion `{type:"spring", stiffness, damping, mass}`; measured with motion@14.5.0 by `research/spikes/ux-refs/calc/springs_r2.mjs` **[VERIFIED]**; usage in kb/80 R2 › Motion spec):

| Preset | k / c / m (ζ) | 99 % | ±1 % settle | Overshoot | Use |
|---|---|---:|---:|---:|---|
| `spring-stamp` **(R2)** | 520 / 32 / 1 (0.70) | 141 ms | 288 ms | 4.53 % | HallmarkStamp strike (scale 1.12 → 1) |
| `spring-lift` | 260 / 22 / 1 (0.68) | 192 ms | 246 ms (rotate) / 405 ms (land, y) | 5.00 % / 5.33 % | Handoff lift, settle, **land (R2)** |
| `spring-slide` | 120 / 18 / 1.2 (0.75) | 352 ms | 659 ms | 2.84 % | Handoff slide (240 / 520 px) |
| `spring-key` | 180 / 20 / 1 (0.75) | 260 ms | 492 ms | 2.98 % | Handoff key rotate 180° |
| `spring-layout` | 500 / 40 / 1 (0.89) | 226 ms | 225 ms | 0.16 % | Pill and chip width (`layout`) |
| `spring-tilt` | 300 / 30 / 0.5 (1.22) | 335 ms | 334 ms | 0 % | Fine-pointer card tilt (`useSpring`) |
| `spring-stack` **(R2, P2 polish)** | 260 / 26 / 1 (0.81) | 248 ms | 389 ms | 1.38 % | Home stack lift (y 0 → −168) |
| `spring-fan` **(R2, P2 polish)** | 400 / 36 / 1 (0.90) | 257 ms | 256 ms | 0.10 % | Stack fan-out per card |

Removed: `spring-flip` (`visualDuration 0.5, bounce 0.15`), because v1 has no card flip.

## CSS spec block (Tailwind v4)
A spec, to be re-typed in the product repo on or after Nov 1 (SAT-201). It follows Tailwind v4's `@theme` / `@theme inline` model **[SOURCED](https://tailwindcss.com/docs/theme)**: tokens that reference other variables go in `@theme inline`. The `--text-*--line-height` / `--letter-spacing` / `--font-weight` modifiers and `@utility` are Tailwind v4 features **[ASSUMED for 4.3.3; check on Day 1]**.

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  /* graphite */
  --bg: #0A0B0D; --surface-1: #111317; --surface-2: #181B20; --surface-3: #20242A; --surface-4: #2A2F37;
  --hairline: rgb(255 255 255 / 0.08); --hairline-strong: rgb(255 255 255 / 0.12);
  --line: #3A4049; --line-subtle: var(--hairline); /* retired alias */ --line-input: #69717D;
  --fg: #F3F5F8; --fg-2: #B4BBC5; --fg-muted: #8F98A5; --fg-disabled: #5D6570; --link: #8CC8FF;
  /* commit pill (R2) */
  --cta: #F1F4F7; --cta-2: #DCE2E8; --cta-hover: #F7F9FB; --cta-hover-2: #E6EAEF; --cta-pressed: #CFD6DE; --on-cta: #0A0B0D;
  /* stamp metal: objects only (HallmarkStamp, success tile, wordmark glyph) */
  --stamp-hi: #E9EDF2; --stamp-mid: #C7CFD8; --stamp-lo: #AEB8C4; --on-stamp: #0A0B0D;
  /* status */
  --success: #4ADE9B; --warning: #F6C453; --danger: #FF7A7A; --danger-solid: #CF3B40; --info: #7DB8FF;
  --state-frozen: #9AD8FF; --state-listed: #E8C77A;
  /* chains */
  --chain-btc: #F7931A; --chain-btc-fg: #FFA94D;
  --chain-eth: #627EEA; --chain-eth-fg: #9AABF5;
  --chain-sol: #9945FF; --chain-sol-2: #14F195; --chain-sol-fg: #C09BFF;
  /* card */
  --card-glass: rgb(8 9 11 / 0.72); --card-scrim: rgb(8 9 11 / 0.48);
  --qr-plate: #FFFFFF; --qr-ink: #0A0B0D;
  /* alloy: the server writes the page's token accent, e.g. <main style="--alloy:#5CD5C7"> (seed, kb/80 §SatchelCard step 9) */
  --alloy: #A9C0DA; /* fallback: Titanium accent (token 7) */
  --alloy-glow: radial-gradient(ellipse 70% 55% at 50% 35%, color-mix(in srgb, var(--alloy) 14%, transparent), transparent 70%);
  --alloy-tint: none; /* opt-in (UX-16): linear-gradient(180deg, color-mix(in srgb, var(--alloy) 6%, transparent), transparent 60vh) with the glow peak at 8% */
  /* status tints (banners 8%, tags and pills 14%) */
  --banner-alpha: 8%; --tint-alpha: 14%;
  /* layout */
  --flow-width: 480px; --topbar-h: 56px; --pill-h: 36px; --actionbar-h: 80px; --stack-band: 56px;
  /* shadcn aliases */
  --background: var(--bg); --foreground: var(--fg);
  --card: var(--surface-1); --card-foreground: var(--fg);
  --popover: var(--surface-2); --popover-foreground: var(--fg);
  --primary: var(--cta); --primary-foreground: var(--on-cta);
  --secondary: var(--surface-3); --secondary-foreground: var(--fg);
  --muted: var(--surface-2); --muted-foreground: var(--fg-muted);
  --accent: var(--surface-3); --accent-foreground: var(--fg);
  --destructive: var(--danger);
  --border: var(--hairline); --input: var(--line-input); --ring: #8CC8FF;
  --radius: 0.75rem;
}
@media (min-width: 1024px) { :root { --topbar-h: 64px; } }

@theme inline {
  --color-background: var(--background); --color-foreground: var(--foreground);
  --color-card: var(--card); --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover); --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary); --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary); --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted); --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent); --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive); --color-border: var(--border); --color-input: var(--input); --color-ring: var(--ring);
  --color-surface-1: var(--surface-1); --color-surface-2: var(--surface-2); --color-surface-3: var(--surface-3); --color-surface-4: var(--surface-4);
  --color-hairline: var(--hairline); --color-hairline-strong: var(--hairline-strong);
  --color-fg-2: var(--fg-2); --color-fg-muted: var(--fg-muted); --color-fg-disabled: var(--fg-disabled); --color-link: var(--link);
  --color-cta: var(--cta); --color-on-cta: var(--on-cta);
  --color-stamp-hi: var(--stamp-hi); --color-stamp-mid: var(--stamp-mid); --color-stamp-lo: var(--stamp-lo);
  --color-success: var(--success); --color-warning: var(--warning); --color-danger: var(--danger); --color-info: var(--info);
  --color-frozen: var(--state-frozen); --color-listed: var(--state-listed);
  --color-btc: var(--chain-btc); --color-btc-fg: var(--chain-btc-fg);
  --color-eth: var(--chain-eth); --color-eth-fg: var(--chain-eth-fg);
  --color-sol: var(--chain-sol); --color-sol-2: var(--chain-sol-2); --color-sol-fg: var(--chain-sol-fg);
  --color-alloy: var(--alloy);
  --font-sans: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-archivo), ui-sans-serif, sans-serif;
  --font-mono: var(--font-jbmono), ui-monospace, monospace;
  --radius-sm: calc(var(--radius) - 4px); --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius); --radius-xl: calc(var(--radius) + 4px);
}

@theme {
  --radius-tag: 4px; --radius-chip: 6px; --radius-input: 12px; --radius-panel: 12px;
  --radius-tile: 16px; --radius-qr: 16px; --radius-sheet: 24px;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1); --ease-exit: cubic-bezier(0.3, 0, 1, 1);
  /* type roles (mobile; add the -lg role at lg:) */
  --text-display-xl: 2.5rem; --text-display-xl--line-height: 2.75rem; --text-display-xl--letter-spacing: -0.025em; --text-display-xl--font-weight: 650;
  --text-display-xl-lg: 4rem; --text-display-xl-lg--line-height: 4.25rem; --text-display-xl-lg--letter-spacing: -0.025em; --text-display-xl-lg--font-weight: 650;
  --text-display: 2rem; --text-display--line-height: 2.25rem; --text-display--letter-spacing: -0.02em; --text-display--font-weight: 650;
  --text-display-lg: 3rem; --text-display-lg--line-height: 3.25rem; --text-display-lg--letter-spacing: -0.02em; --text-display-lg--font-weight: 650;
  --text-amount-hero: 2.75rem; --text-amount-hero--line-height: 3rem; --text-amount-hero--letter-spacing: -0.02em; --text-amount-hero--font-weight: 600;
  --text-amount-hero-lg: 3.5rem; --text-amount-hero-lg--line-height: 3.75rem; --text-amount-hero-lg--letter-spacing: -0.02em; --text-amount-hero-lg--font-weight: 600;
  --text-amount-hero-s1: 2.25rem; --text-amount-hero-s1--line-height: 2.5rem;   /* step-down 1 */
  --text-amount-hero-s2: 1.75rem; --text-amount-hero-s2--line-height: 2rem;     /* step-down 2 */
  --text-amount-xl: 1.75rem; --text-amount-xl--line-height: 2rem; --text-amount-xl--letter-spacing: -0.01em; --text-amount-xl--font-weight: 600;
  --text-amount-xl-lg: 2rem; --text-amount-xl-lg--line-height: 2.25rem;
  --text-amount: 1rem; --text-amount--line-height: 1.375rem; --text-amount--font-weight: 600;
  --text-label: 0.75rem; --text-label--line-height: 1rem; --text-label--letter-spacing: 0.04em; --text-label--font-weight: 500;
  --text-engrave: 0.75rem; --text-engrave--line-height: 1rem; --text-engrave--letter-spacing: 0.08em; --text-engrave--font-weight: 650;
  --text-serial: 0.9375rem; --text-serial--line-height: 1.25rem; --text-serial--letter-spacing: 0.08em; --text-serial--font-weight: 650;
}

@utility t-engrave { font-family: var(--font-archivo); font-stretch: 125%; text-transform: uppercase; font-variant-numeric: lining-nums; }
@utility t-label   { font-family: var(--font-jbmono); text-transform: uppercase; color: var(--fg-muted); font-feature-settings: "zero" 1; font-variant-ligatures: none; }
@utility t-mono    { font-family: var(--font-jbmono); letter-spacing: 0.02em; font-feature-settings: "zero" 1; font-variant-ligatures: none; }
@utility t-num     { font-variant-numeric: tabular-nums slashed-zero; }
@utility t-ticker  { font-size: max(12px, 0.36em); font-weight: 500; letter-spacing: 0.02em; color: var(--fg-2); }
@utility cta-fill  { background: linear-gradient(180deg, var(--cta), var(--cta-2)); color: var(--on-cta); box-shadow: var(--shadow-cta); }
@utility glow      { background-image: var(--alloy-tint), var(--alloy-glow); }
@utility banner-tint { background: color-mix(in srgb, currentColor var(--banner-alpha), transparent); border: 1px solid color-mix(in srgb, currentColor 32%, transparent); }
@utility tag-tint  { background: color-mix(in srgb, currentColor var(--tint-alpha), transparent); border-radius: var(--radius-tag); }
```
`banner-tint` and `tag-tint` assume that `color` is set to the status colour on the element. Body text inside a banner sets its own colour (`--fg`, `--fg-2`).

## Figma variable naming (for the design lead)
- **Collections:**
  - `primitive` (raw hex);
  - `semantic` (surface, text, hairline, cta, stamp, status, banner, tag);
  - `chain`;
  - `state`;
  - `card` (glass, scrim, frost, qr);
  - **`alloy`**, with **one mode per test-vector token**: `#1 Patina`, `#2 Anodized`, `#3 Electrum`, `#4 Rose Gold`, `#5 Anodized`, `#6 Cobalt`, `#7 Titanium`, `#8 Rose Gold`, `#42 Rose Gold`. Each mode holds `stop/0…4`, `accent`, `angle`, `sheen-at` and `highlight-x` from kb/80 §SatchelCard. Switching a card instance's mode re-skins it exactly as the product will.
- **Names** map 1:1 to the CSS with a slash for the dash:
  - `surface/1` = `--surface-1`;
  - `cta/top` = `--cta`, `cta/bottom` = `--cta-2`, `cta/pressed`, `on/cta`;
  - `hairline/default`, `hairline/strong`;
  - `stamp/hi|mid|lo`;
  - `status/success`;
  - `banner/success` (success at 8 % alpha), `tag/success` (14 %);
  - `chain/btc-fg`.
- **Text styles:** `display-xl`, `display`, `h1`, `h2`, `h3`, `body`, `small`, `caption`, `engrave`, `engrave/serial`, `label`, `amount-hero`, `amount-hero/step-1`, `amount-hero/step-2`, `amount-xl`, `amount`, `ticker`, `mono`, `mono/full-address`. Each has a `/lg` variant where the size changes at ≥ 1024.
- **Effect styles:** `shadow/raise-1`, `shadow/raise-2`, `shadow/overlay`, `shadow/card`, `shadow/card-lifted`, `shadow/cta`, `shadow/cta-pressed`, `shadow/stamp`.
- **Components:** use the kb/80 R2 component names (SatchelCard, ChainRow, ReviewCard, SigningProgress, …) with variant properties that mirror their props: `size`, `status`, `listed`, `verdict`, `pose`. That keeps Code Connect trivial.

## Deltas vs plan
1. The plan says only "dark and metallic". R2 defines it:
   - graphite neutrals;
   - a **near-white commit pill**;
   - metal reserved for objects (the alloy card and the silver hallmark stamp);
   - per-token alloy identity and no single bright accent. A single acid accent on near-black is a generic look.
2. "Scrim under text on gradients" is a measurable rule: 72 % glass for any text, 48 % scrim for white only. The R2 frost layer stays under both.
3. Chain brand colours cannot be text, and Solana purple can't be an icon on the card; the `-fg` tints are required.
4. The card corner radius comes from the ID-1 spec (3.72 % of width).
5. **R2:** the brushed-silver CTA in rev 1 was not industry-credible. No premium product in the sample uses a metallic control (VL §2.9). The metal moves to the hallmark stamp.

## Open questions / decisions for the design lead
All are in `plan/phase0-checklist.md` §6 with defaults and the Oct 31 deadline:
- typeface roles (UX-2, closed);
- CTA style (UX-10, closed: near-white pill);
- destructive style (UX-11, closed: tint + text);
- page tint on/off (UX-16);
- the Receive QR frame (UX-22);
- card texture: brushed + grain vs a seeded halftone (UX-26);
- a serif landing H1 (UX-29).
