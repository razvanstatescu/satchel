<!--
Verbatim copy of the Satchel design system README (v2), the brand's source of truth.
Source: claude.ai Design System artifact https://claude.ai/artifact/Et6RrS5YMZafCRV7K25ANy (project/README.md),
version 1792610723-2429, last change 2026-10-21T16:20Z by Razvan via Claude chat ("v2: rebuilt around the strap S logo").
Copied 2026-10-21. Do not edit here: change the design system artifact, then re-copy.
Where product facts (kb/90, plan/decisions.md) disagree with sample copy below, see kb/81 R3 "Brand consolidation".
-->

# Satchel

An NFT that is a wallet on every chain. Each Satchel controls real Bitcoin, Ethereum and Solana addresses through NEAR Chain Signatures; whoever owns the NFT controls the funds. Satchel is a web app: it runs in the browser on desktop and phones and installs as a PWA. The identity comes from one detail of the object in the name, the leather strap: a stitched leather S on a brass tile. Brass is the brand, leather is the ground and the ink, and the saddle stitch means "you own this".

Version 2 rebuilds the system around the selected logo (the strap S on brass) and the web: semantic color names, two themes (Night default, Day for `prefers-color-scheme: light`), breakpoints, and a favicon, PWA and social image set.

## Logo

| File | Use |
| --- | --- |
| `satchel-mark.svg` | The primary mark: brass tile, leather S, brass stitch. App icon, avatar, anywhere 40px and up. |
| `satchel-mark-small.svg` | Small-size cut for 32px and below: flat brass, solid S at 92 units instead of 76, no stitch and no gradients, so it survives pixel rounding. Source of the favicon. |
| `satchel-lockup-on-dark.svg`, `satchel-lockup-on-light.svg` | Mark plus wordmark. App header, landing page, docs, partner pages. |
| `satchel-wordmark.svg` | "Satchel" in Bricolage Grotesque Bold, opsz 96, outlined. Use only next to the mark or where the mark already appears on screen. |
| `satchel-glyph-leather.svg`, `satchel-glyph-brass.svg` | The S alone, no tile. Leather on light grounds, brass on dark grounds. For loading states, watermarks and the stitched card motif; not a substitute for the mark. |

- **Lockup geometry:** the wordmark's cap height is half the tile height, its cap line centered on the tile; the gap between tile and wordmark is 0.23 of the tile height.
- **Clear space:** keep a quarter of the tile height clear on every side of the mark and the lockup.
- **Minimum sizes:** mark 16px (small cut below 33px), lockup 112px wide, wordmark alone 64px wide.
- **Do not:** recolor the tile or the S (they are always brass and leather), add glows, bevels or drop shadows, rotate or slant the S, put the mark on a brass background (it disappears), or set "Satchel" in a different face.

## Content fundamentals

The audience is crypto-native, so chain words are fine: Bitcoin, address, signature, confirmations. Plumbing words are not.

| Say | Never say |
| --- | --- |
| This Satchel's Bitcoin address | derivation path, `satchel/7/btc` |
| Signing with NEAR's signer network | MPC, yield/resume, domain_id |
| Network fee ~0.00002 BTC | Tgas, yoctoNEAR, payload |
| Signing paused while listed | freeze flag, `ERR_FROZEN` |
| Safe to buy in 143 blocks (~2 min) | cooldown_blocks |

- Sentence case everywhere: "Send Bitcoin", "Frozen", "Connect wallet".
- An action keeps its name through the flow: "Send" button, "Sending" progress, "Sent" toast.
- Errors say what happened and what to do: "The signer network did not answer in time. Nothing was sent and no funds moved. Try again."
- Waiting copy gives a time: "Usually under a minute", then at 90 s "Still working. The network allows up to about 2 minutes."
- Amounts: BTC to 8 decimals, ETH and SOL to 6, fiat to 2, tabular figures always.
- Browser tab titles: "Satchel #7 · Satchel" for a Satchel page, "Send Bitcoin · Satchel" during a flow, "(1) Signing… · Satchel" while a signature is pending in a background tab.

## Visual foundations

**Color.** Use the semantic tokens; they switch with the theme. `ground` is the page, `surface` raises a panel, `surface-raised` raises it again. Depth comes from these steps; only the Satchel card (`shadow-card`) and overlays (`shadow-overlay`) cast a shadow. `brand` is spent once per screen as a fill, always with `on-brand` text, the same leather ink as the logo's S, so a primary button reads as a small piece of the logo. In Day, brass buttons also take a 1px `brand-deep` border. `leather-light` and `leather-dark` exist only to rebuild the logo.

States are fixed and always shown as icon plus word, never color alone:

| State | Token | Icon | Word |
| --- | --- | --- | --- |
| Active | `success` | open lock | Active |
| Frozen | `frozen` | snowflake | Frozen |
| Listed | `brand` | tag | Listed |
| Error, unspent signature | `danger` | warning | Needs attention |

Chain colors (`chain-btc`, `chain-evm`, `chain-sol`) appear only as an 8px dot in chain chips and as the accent of that chain's balance row.

**Themes.** Night is the default and the identity. Day follows `prefers-color-scheme: light`, with a manual override in the account menu stored in `localStorage` and applied as `data-theme` on `<html>` before first paint (an inline script in `<head>`) to avoid a flash. Declare `color-scheme: dark light` so scrollbars and form controls match. The logo never changes between themes.

**Type.** Bricolage Grotesque (`--font-display`) for the wordmark, balances and titles; Instrument Sans (`--font-sans`) for everything people read and click; Spline Sans Mono (`--font-mono`) only for addresses and hashes, middle-truncated with the full value in `title` and `aria-label` and a copy button beside it. `font-variant-numeric: tabular-nums` on every amount. Load all three from Google Fonts with `display=swap` and preconnect (see the Web assets group's README for the tags).

**The Satchel card.** Ratio 1.586:1, `radius-card` (the same 22% corner ratio as the logo tile), `surface` body, a brass band at the top (`brand-bright` to `brand-deep`) that echoes the logo tile, the stitch (`stitch-width`, `stitch-dash`) inset 8px, the total in `balance-hero`, and three chain chips along the bottom. A per-token accent comes from the token id by shifting the leather hue ±12°, never from a new brand color.

**The stitch.** A dashed brand line inset inside a container means "you own this". Use it on the Satchel card, the mint preview and the receiving card in the transfer handoff. Nowhere else.

**Layout (web).** Mobile-first. Below `bp-md` (768px): one column, `space-4` gutters, the primary action pinned to the bottom of the viewport, flows open as bottom sheets. From `bp-md`: `space-6` gutters, sheets become centered dialogs. From `bp-lg` (1024px): left navigation (My Satchels, Market, Mint, Activity) and a 2-column card grid; from `bp-xl` (1280px): 3 columns. Task flows (Send, Sell, Mint, Connect) sit in a `container-flow` column (480px); the app shell maxes at `container-app` (1200px). Left-align content; center only the empty states.

**Interaction (web).** Every clickable element is a real `<button>` or `<a>`. Hover: `surface` to `surface-raised` on rows; primary buttons go to `brand-bright`. Pressed: primary to `brand-deep`. Focus: 2px solid `focus`, 2px offset, always visible on keyboard focus (`:focus-visible`). Disabled: 40% opacity plus `cursor: not-allowed`, and the reason in a tooltip. Touch targets 44px minimum.

**Motion.** One signature moment: the transfer handoff (card lifts, tilts 6°, slides to the recipient; 700 ms spring). Signing progress pulses the `frozen` step indicator. Everything else responds to the person's action. With `prefers-reduced-motion`, the handoff becomes a cross-fade plus text.

## Iconography

Line icons at 1.75px stroke on a 24px grid, rounded caps and joins, in `ink` or the state color (Lucide matches this weight). The logo is a full-color mark and is never drawn as a line icon.

## Assets

- **Logos:** the mark, small-size cut, both lockups, the wordmark and both glyphs.
- **Web:** favicon (SVG plus 32px PNG; ship `favicon.ico` 16/32/48 from the brand pack too), `apple-touch-icon.png` (180px, full-bleed square: iOS rounds it), PWA icons 192 and 512, a maskable 512 with the S inside the 80% safe zone, and the 1200 × 630 Open Graph image.
- **Explorations:** the first bag icon, kept for reference. Retired.
