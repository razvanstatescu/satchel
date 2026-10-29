# The Satchel card hero (no fiat): proposal and decision

R4: the card hero must be informative without fiat; native amounts or charms, not a bare "{n} chains". The product
designer proposes; the design lead decides and records it in `design-spec.md`.

## Proposal (product designer, 2026-10-26): "what's inside" as a charm ledger

The body of the in-app card (`SatchelCard`) shows **one line per chain, each led by its chain charm**: the coin with a
face, then the native amount in Funnel Display 800 (tabular), then the ticker in Onest 600 `ink-muted`.

```
┌──────────────────────────────────────────┐
│ Satchel #1  [Yours]                  (S) │  coral band, 28 %
├──────────────────────────────────────────┤
│ (BTC charm)  0.00189718 BTC              │  Funnel Display 800, t-num
│ (ETH charm)  0.048979 ETH                │
│                                          │
│ [check Active]                           │  status pill, bottom-left of the body
└──────────────────────────────────────────┘
```

**Why this one:**
- **It answers the wallet question, "what's inside?",** in the card itself, and differs on every Satchel. Today's "2 chains /
  Balances below" is identical on all of them (inventory §5.1.7).
- **The charms are the brand's own characters** ("chain charms are coins with faces"), and here they *mean* something:
  each one is a coin the Satchel holds. That is the brand's sticker language doing a job, not decoration.
- **It replaces the chips** (one place for the holdings), so the card has less on it, not more.
- **The rejected options:**
  - "{n} chains": the same on every card (R4);
  - "the largest holding": comparing BTC with ETH needs prices, and we have none;
  - the signature count as the app hero: testers read "3 signatures" as a multisig (the v4 re-test, `landing.desk.sigs`), and it
    hides what the owner holds. The count stays the hero of the **NFT image** (`/api/card`, architect §8), which is
    static and can't carry live balances honestly. That split is deliberate: the app card shows live holdings; the image
    shows the permanent record.

**Sizes** (verified in `app-satchel.html`, `app-market.html` and the flows at 360–1440 in Day and Night: "0.00189718 BTC"
fits the lg card at 358 px and the md card at 300 px, with no wrap. Container queries on the card, so they follow the
card's width, not the page's):

| Card | Rows | Amount (Funnel 800) | Ticker (Onest 600) | Charm | Pill |
|---|---|---|---|---|---|
| lg ≥ 352 px (`/s/[id]` hero) | 2 (BTC, ETH) | 32/36, -0.02em | 15/20 `ink-muted` | 28 | in the body, bottom-left |
| lg, SOL flag on | 3 | 26/30 | 14/18 | 24 | in the body, bottom-left |
| md 280–351 (grids, flows) | 2 | 24/28 | 13/18 | 22 | in the body, bottom-left |
| md, SOL flag on | 3 | 20/24 | 13/18 | 20 | moves to the meta row under the card |
| thumb 40 × 25 (rows) | none | none | none | none | none |

**States:**
- **Zero on one chain:** "0 BTC" in `ink-muted`; the charm stays. One zero format everywhere: an exact zero renders "0",
  and non-zero amounts keep `formatAmount`'s minimum of 4 decimals (today the card says "BTC 0" and the rows "0.0000 BTC").
- **All zero:** both rows show "0" muted. The card stays calm; the page's primary action becomes **Add coins**.
- **Unavailable:** "—" plus the ticker, muted, with `title`/`aria-label` "Balance unavailable". The pill is unchanged.
- **Mint preview:** the band reads "New Satchel" plus the lemon "New" sticker; each row shows its charm and "Bitcoin
  address" / "Ethereum address" in `text-label` (no amounts yet).
- **Owned:** the lemon **Yours** sticker after the name, tilted −4° (R1 #3). Visitors see none.
- **Sold** (seller's receipt) and **Given** (giver's view): no sticker, with the Sold / Given pill.

**Accessibility:** the `<figure>` text reads "Satchel #1, Yours. 0.00189718 BTC. 0.048979 ETH. Active." The charms are
`aria-hidden` (the ticker carries the chain). Chain colour is never text (F2).

**Test changes this implies (to list in the decision log):**
- `judge.spec` "the brand card is real text": drop `toContainText("2 chains")` and pin
  `0.00189718 BTC` and `0.048979 ETH` instead of `BTC 0.00189718`.
- `data-owned` stays; `[data-stitch]` becomes `[data-yours]` (the sticker) in `judge.spec` and `flows.spec`
  (the mint preview `figure[data-card=preview]` and the handoff `[data-stitch]` count).
- `copy.card.totalNone` and `copy.card.noteNone` are no longer read by the card. Keep `totalNone` for the market meta and
  the screen-reader summary, or delete it in the copy pass.

## Decision (design lead, 2026-10-26): **accepted, the charm ledger**, with four refinements
Recorded in `design-spec.md` (decision log). It is built in `components.css` (`.card__inside` / `.card__coin`); see
`shots/foundation.png`.
1. **Sizes follow the card's container, in three steps:**
   - **lg**, 352 px or wider: 32/36, ticker 15/20, charm 28; with the SOL flag on, 26/30 and charm 24.
   - **md**, 251–351 px: 24/28, ticker 13/18, charm 22; with the SOL flag on, 20/24 and charm 20.
   - **sm**, 250 px or narrower (the landing stage and 2-up phone grids): 19/23, ticker 12/16, charm 18.

   Your table stands. I added sm and kept the pill inside the body, bottom-left, in every size. If three rows plus a
   pill don't fit at md, move the pill under the card as you planned.
2. **The Yours sticker** is lemon, tilted −4° and placed after the name. It shows wherever the viewer owns the card,
   **except the My Satchels grid**, where every card is yours and the page title already says so (`data-owned` stays
   true there). Visitors never see it.
3. **No per-token identity beyond what's inside.** The band is always coral, and no per-token hue appears anywhere. Cards
   differ by the charms and the amounts they hold. That is the honest way to differ, and it reads on the Market grid.
4. **The landing's sample card** is generic (D-42): the band reads "Satchel" with no number, and the amounts are round
   samples (0.05 BTC, 0.80 ETH, as in `landing.hero.anim.alt`).

The NFT image (`/api/card`) keeps "{n} signatures" as its hero, as the architect specified (§8). The split is
deliberate: the app card shows live holdings, and the image shows the permanent record.
