# Satchel 2.0

An NFT that is a wallet on every chain: each Satchel controls real Bitcoin, Ethereum and Solana addresses through NEAR Chain Signatures, and whoever holds the NFT holds what is inside. Version 2.0 replaces the dark leather identity, which read as too serious for a wallet people collect, gift and trade. The mark is a **sticker S**: a chunky white S with an ink outline and a hard ink shadow on a coral tile, like a sticker you slap on a laptop. Coral is the brand, ink outlines and hard sticker shadows give it character, and each chain becomes a charm with a face. (Version 2.0's first mark hung the S from a keyring; the ring was dropped because it crowded the tile and failed at small sizes. It is kept in Explorations.)

Researched against current wallet brands on Mobbin: Phantom owns lavender and a ghost, Uniswap pink, Coinbase, Base and Trust blue, MetaMask orange and lime, Solflare yellow, Glow a purple wallet with a face, Family flat sticker characters. Coral is the warm hue none of them hold, and a letter mark instead of a bag keeps clear of Backpack, an established multichain wallet. Built from that research and the product plan, not from shipped code: two themes (Day default, Night for dark mode), no component bundle yet, Google-hosted fonts.

## Logo

| File | Use |
| --- | --- |
| `satchel-mark.svg` | Primary mark: coral tile, white S with ink outline and a hard ink shadow 10 units down. 40px and up. |
| `satchel-mark-small.svg` | 32px and below: S 10% larger with a thicker outline (108 units). Favicon source. |
| `satchel-lockup-on-light.svg`, `satchel-lockup-on-dark.svg` | Mark plus "satchel" wordmark. App header, landing page, docs. |
| `satchel-wordmark.svg` | "satchel" in Funnel Display ExtraBold, outlined, always lowercase. |
| `satchel-charm.svg` | The sticker S alone, no tile. Loading states, empty states, stickers, merch. |

- **Lockup:** wordmark x-height is 0.45 of the tile height, centered on it; gap 0.22 of the tile.
- **Clear space:** a quarter of the tile height on every side. **Minimums:** mark 16px, lockup 120px wide.
- **Do not:** fill the S with coral on a coral tile, remove the ink outline or shadow, add a ring or hook, rotate the S, set the wordmark in capitals, or place the mark on a coral ground.

## Illustration: chain charms

`satchel-charms-chains.svg` hangs three charms from one bar: Bitcoin orange, Ethereum lavender, Solana violet, each a round coin with two dot eyes and a smile, 3px ink outline (`outline`), hard ink shadow (`shadow-sticker`). Use them for onboarding, empty wallets, chain pickers and the landing page. They are Satchel's own characters: never put real chain logos inside them, and never give the S a face (the logo stays a letter).

## Content fundamentals

Friendly, short, concrete. Chain words are fine for this crypto-native audience; plumbing words are not.

| Say | Never say |
| --- | --- |
| This Satchel's Bitcoin address | derivation path, `satchel/7/btc` |
| Signing with NEAR's signer network | MPC, yield/resume, domain_id |
| Network fee ~0.00002 BTC | Tgas, yoctoNEAR, payload |
| Paused while it's for sale | freeze flag, `ERR_FROZEN` |
| Safe to buy in about 2 minutes | cooldown_blocks |

- Sentence case, verbs first: "Send Bitcoin", "Give this Satchel", "List for sale".
- Hand-off language: you "give" or "sell" a Satchel, and the new holder "gets everything inside".
- Errors say what happened and what to do: "The signer network didn't answer in time. Nothing was sent. Try again."
- Waiting copy gives a time: "Usually under a minute."
- Amounts: BTC to 8 decimals, ETH and SOL to 6, fiat to 2, tabular figures.

## Visual foundations

**Color.** `ground` page, `surface` cards and sheets, `surface-sunken` inputs and chips. `brand` (coral) is one fill per screen: the primary button, the Satchel card band, the selected tab, always with `on-brand` ink text; white on coral fails contrast and is not used for text. Day coral buttons take a 1px `brand-deep` border. `lemon` and `sky` are sticker accents for illustration only. Chain colors appear as 8px dots and in the chain charms.

| State | Token | Icon | Word |
| --- | --- | --- | --- |
| Active, sent | `success` | check | Sent |
| For sale, signing | `frozen` | snowflake | Paused for sale |
| Error, unspent signature | `danger` | warning | Needs attention |

**Type.** Funnel Display (`--font-display`) for the wordmark, balances and titles; Onest (`--font-sans`) for everything people read and click; Geist Mono (`--font-mono`) for addresses and hashes only. 16px body; tabular figures on amounts.

**Shape and depth.** Stickers, not glass: 3px ink `outline` and a hard 4px `shadow-sticker` with no blur on the Satchel card, primary buttons and illustrations; plain surfaces stay flat. Generous radii: `radius-md` buttons, `radius-card` for the card and sheets. The Satchel card keeps its 1.586:1 ratio with a coral band at the top, the charm in the corner and the total in `balance-hero`.

**Layout (web).** Mobile-first at 390px; from `bp-md` sheets become dialogs, from `bp-lg` side navigation and a card grid. Flows in `container-flow` (480px). Primary action pinned to the bottom on phones.

**Interaction and motion.** Primary buttons press down 4px into their shadow (shadow to 0, translateY 4px). Hover lifts rows to `surface-sunken`. Focus: 2px `focus` ring, 2px offset. One signature motion: on hand-off the card swings like a charm (a 10° pendulum, 600ms) and slides to the new owner. `prefers-reduced-motion`: a cross-fade.

## Iconography

Line icons at 2px stroke, rounded caps and joins (Lucide at stroke 2), in `ink` or the state color. Logo and charms are illustrations, never icons in buttons.

## Assets

- **Logos:** mark, small cut, both lockups, wordmark, the sticker S alone.
- **Illustration:** the three chain charms.
- **Web:** favicon SVG (ship `favicon.ico` from the brand pack), Apple touch icon, PWA 512, maskable 512, 1200 × 630 link preview.
- **Explorations:** the retired keyring mark and three dropped directions.
