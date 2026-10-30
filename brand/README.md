# brand/: Satchel 2.0, the "Sticker S" (the source of truth for visual identity)

Razvan (design lead) rebuilt the Satchel brand on 2026-10-26. The 1.0 identity (the Strap S, brass and leather) "read
as too serious for a wallet people collect, gift and trade". It is archived in `archive/v1/`.

- **Brand canvas:** https://claude.ai/artifact/8QR3vCXmQAnrHBMzFkfUaL. Its boards are Main ("Stick it on. Hand it
  over."), Directions, Logo system, Colour and type, In context, and Web icons. Renders of them are in `canvas/*.png`.
- **Design System "Satchel 2.0":** https://claude.ai/artifact/RazC4L6yh16jStycJutmsT (the README and `tokens.json`).
- **Brand pack:** `satchel-brand-v2.zip` at the repo root. `logo/`, `illustration/`, `explorations/` and `web/` here are
  verbatim copies of it.

## Precedence
| Topic | Source of truth |
|---|---|
| Visual identity: logo, colour, themes, type, radii, shadows, stickers, charms, iconography, breakpoints, interaction states, the signature motion | **this brand** (`design-system.md`, `tokens.json`) |
| Structure and behaviour: flows, component anatomy, states, copy structure | `kb/80-ux-spec.md`, restyled in these tokens |
| Product facts and hard constraints | `kb/90-technical-spec.md` and `plan/decisions.md`. They override sample copy in the brand (corrections below) |
| The web implementation (tokens to CSS and Tailwind, derived tokens, verified contrast, component specs) | `kb/81-design-tokens.md` Revision 4 |

## The concept
- **The mark:** a coral tile (`#FF5C4D`) with a chunky white S, an ink (`#1D1340`) outline and a hard ink shadow, like
  a sticker slapped on a laptop.
  - The wordmark is "satchel", always lowercase, in Funnel Display ExtraBold.
  - The **charm S** (the S without the tile) is for loading states, empty states and stickers.
- **The chain charms:** Bitcoin orange, Ethereum lavender and Solana violet, each a round coin with two dot eyes and a
  smile, hanging from one bar. They are Satchel's own characters:
  - never put real chain logos inside them;
  - never give the S a face.
- **"Coral to tap, ink to read, stickers to smile":**
  - coral is one action fill per screen, always with ink text, never white text;
  - lemon and sky are sticker accents only;
  - stickers (a 3 px ink outline plus a hard drop with no blur) go only on what you own, press or celebrate: the
    Satchel card, primary buttons, badges, illustrations. Everything else is flat.
- **Type:** Funnel Display (balances, titles), Onest (everything people read and tap; 16 px body and inputs), Geist
  Mono (addresses and hashes only).
- **The signature motion:** on hand-off the card swings like a charm (a 10° pendulum, 600 ms) and slides to the new
  owner. Reduced motion turns it into a cross-fade. Primary buttons press down 4 px into their shadow.
- **"You own this":** a lemon "Yours" sticker on the card. This replaces 1.0's saddle stitch.
- **Themes:** Day (ground `#F6F5FB`, cool and never cream) and Night (`#120C26`). The brand says "Day is the default;
  Night follows `prefers-color-scheme: dark`".
  - **Product override (D-44, 2026-10-26, Razvan):** the app opens in **Day whatever the OS**. Night and System stay in
    the theme control.
  - **Night stickers** use a `#8A82AE` outline, because the ink outline vanishes on Night surfaces.

## Files
| Path | What | Where it ships in `apps/web` |
|---|---|---|
| `logo/satchel-mark.svg` | The primary mark: coral tile, white S, ink outline and drop. 40 px and up | `public/brand/`, plus the inline `Mark` component |
| `logo/satchel-mark-small.svg` | The cut for 32 px and below (S 10 % larger, thicker outline) | `src/app/icon.svg` (= `web/favicon.svg`) |
| `logo/satchel-lockup-on-light.svg`, `logo/satchel-lockup-on-dark.svg` | Mark plus wordmark | The inline `Lockup` (the wordmark fill follows `--ink`); `public/brand/` |
| `logo/satchel-wordmark.svg` | "satchel", Funnel Display ExtraBold, outlined, lowercase | `public/brand/` |
| `logo/satchel-charm.svg`, `logo/satchel-charm-coral.svg` | The sticker S alone (white or coral fill) | The inline `Charm` (card corner, loading, empty states, 404) |
| `illustration/satchel-charms-chains.svg` | The three chain charms on a bar | Inline `ChainCharm` / `ChainCharms` (pickers, rows, empty wallets, landing) |
| `web/favicon.ico`, `web/favicon.svg`, `web/apple-touch-icon.png`, `web/icon-192.png`, `web/icon-512.png`, `web/icon-maskable-512.png` | Favicons and PWA icons | `src/app/favicon.ico`, `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icon-*.png` |
| `web/og-image.png` | 1200 × 630 link preview. **Do not ship:** its tagline says "every chain" (see corrections) | Replaced by a regenerated `src/app/opengraph-image.png` |
| `web/site.webmanifest`, `web/head-snippet.html`, `web/favicon-32.png` | Reference only | `src/app/manifest.ts` and the Metadata API instead. Fonts load via `next/font/google`, never the Google CSS link |
| `explorations/*.svg` | Dropped directions (buddy, coin, pouch) | Not shipped |
| `canvas/*.png` | Renders of the six canvas boards | Reference only |
| `tokens.json` | Design tokens v2.0 (Day and Night colours, type styles, spacing, radii, shadows, outline, layout, motion) | The Tailwind v4 `@theme` in `apps/web/src/app/globals.css` (kb/81 R4) |
| `design-system.md` | The Design System README, verbatim: logo rules, chain charms, content fundamentals, visual foundations, interaction and motion, iconography | Read before any UI work |
| `archive/v1/` | Brand 1.0 (Strap S, brass and leather, Bricolage Grotesque), superseded | Nothing |

**Logo rules** (from the design system):
- **Clear space:** a quarter of the tile height on every side.
- **Minimum sizes:** mark 16 px (the small cut at 32 px and below), lockup 120 px wide.
- **Never:**
  - fill the S with coral on a coral tile;
  - remove the ink outline or the shadow;
  - add a ring or a hook;
  - rotate the S;
  - set the wordmark in capitals;
  - place the mark on a coral ground. The charm S on the Satchel card's coral band is the brand's own composition.

## Corrections to the brand's sample copy
The product follows the right-hand column. Propose the fixes upstream in the design system when convenient.

| Brand text | Correct for Satchel | Evidence |
|---|---|---|
| "An NFT that is a wallet on every chain"; "The NFT that carries every chain." (`web/og-image.png`, `site.webmanifest`); "One NFT. Every chain inside." (In context) | Never "every chain": name the chains. The website and the app say **Bitcoin, Ethereum and Solana** (D-45, D-46). The Solana UI is on by default; `NEXT_PUBLIC_SOL_UI=off` is the cut switch. Tagline: "An NFT that is a wallet." | D-37, D-40, D-45, D-46, kb/90 §5.9 |
| "real Bitcoin, Ethereum and Solana" (Main board, README intro) | **Testnet only** (Bitcoin testnet4, Ethereum Sepolia, Solana devnet). "Testnet only. Coins here have no value." stays visible | kb/90 §4 T7 |
| Fiat totals "$4,812.40", "≈ $2,903.00", "about $4,812"; "fiat to 2" | Native amounts with tickers everywhere, **except** one labelled estimate per Satchel: "≈ $X" with "at mainnet prices" (2 decimals), in its overview only | D-50 (reverses D-37 UX-1) |
| "Safe to buy in about 2 minutes" | There is **no wait between listing and buying**. The only wait is the 250-block quiet period **before listing** | D-05 rev 2; kb/90 §8.9 |
| "Usually under a minute." | "Usually about 10 seconds." The network allows up to about 2 minutes | kb/90 §8.6, §8.9 |
| "Frozen while listed or in cooldown" | "Paused while it's for sale". There is no cooldown state | D-05 rev 2 |
| "The signer network didn't answer in time. Nothing was sent. Try again." | Keep the honest timeout copy: "The signer network did not return a signature. Nothing was sent." Then "If a signature still turns up, Clean history lists it as Unused until it can't be used." Never claim that no signature exists | kb/70 F16; kb/90 §8.6 |
| Give sheet "Clean history: no unused signatures" | **Gifts aren't checked.** The buyer's browser runs the clean-history check on a sale, never the contract | kb/70 Threat (a) |
| "give it to anyone in one tap" | A gift takes an account check, a review and a wallet approval, and the contract refuses some receivers | kb/90 §5.11 |
| "Network fee ~0.00002 BTC" | Bitcoin fees in sats: "Network fee ~282 sats" | kb/80; kb/90 §8.9 |
| Day coral buttons take "a 1px `brand-deep` border"; `brand-deep` is the pressed fill | The canvas sticker recipe: a 2 px ink outline plus the drop. Pressed is the 4 px move with the fill unchanged (`brand-deep` under ink is 3.87:1) | kb/81 R4 contrast |
| `danger` usage "…Revoke" | There are no approvals or revokes (unbuilt; "approval" is banned in copy) | kb/80 copy rules |
