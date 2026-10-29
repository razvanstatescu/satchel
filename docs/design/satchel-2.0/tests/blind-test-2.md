# Blind first-impression test 2

Tester saw only five screenshots, no project context: `landing-first-1280.png`, `landing-first-390.png`,
`landing-full-1280.png`, `s1-first-390.png`, `s3-sale-first-390.png`.

## 1. Five-second test

### Landing, desktop (`landing-first-1280.png`)

1. **What is this product?** "Satchel" — an NFT that doubles as a crypto wallet, holding Bitcoin and Ethereum.
2. **Who is it for?** Anyone selling or gifting a crypto wallet (stated directly in the eyebrow tag).
3. **What problem does it solve?** It stops a seller from keeping a copy of the wallet's seed phrase and taking the
   coins back later — there's no seed phrase to copy in the first place.
4. **Why trust it / what makes it safe?** The pitch is that the buyer's own browser checks the wallet's signature
   history before they buy, rather than trusting the seller's word. The "Testnet only, coins have no value" note also
   signals this isn't live money yet.
5. **What would you click first, and why?** "Look inside a Satchel" — it's the filled orange button, visually
   dominant and listed before the secondary outline button.
6. **What confused you?** The hero graphic — two cards overlapping with "3 past signatures," "Paused for sale," and
   a half-visible checklist. It's busy and not self-explanatory without reading the surrounding copy.

### Landing, phone (`landing-first-390.png`)

1. **What is this product?** Same read as desktop: Satchel, an NFT wallet holding BTC/ETH.
2. **Who is it for?** Same — people selling or gifting a wallet.
3. **What problem does it solve?** Same seed-phrase/trust problem, same wording as desktop.
4. **Why trust it?** Same claim — no seed phrase exists, and the buyer's browser verifies signature history.
5. **What would you click first?** "Look inside a Satchel," for the same reason — it's the bold filled button,
   first in the stack.
6. **What confused you?** The two dangling smiley-face charms above the headline. On their own, before any text,
   they read as cute mascots/keychains rather than something tied to "wallet" — their meaning only clicks later.

## 2. Skim test (`landing-full-1280.png`)

Scrolling the full page fills in the mechanism the hero only hinted at: a labeled before/after diagram ("A signature
can outlive a sale") shows a seller pre-signing a transfer and draining the buyer's funds *after* the sale, versus
Satchel recording every signature on NEAR so the buyer's browser can refuse to let the "Buy" button activate until
history is clean — that's the clearest, most concrete section on the page. It also surfaces a real trust section
("No admin key. Not even ours.") with specific, checkable claims (no access keys, no admin methods, code hash
matches, not yet audited), which reads as unusually candid for a crypto product. The weakest parts are the "One NFT.
Its own addresses." block, which mostly restates the hero in flatter form, and the closed FAQ accordion, which adds
no information until clicked. Nothing felt gloomy or untrustworthy — the palette is light and warm, not crowded —
but the dangling smiley-charm illustrations tilt faintly childish/cute for a product that is ultimately about moving
real money, even if the copy around them stays serious and precise.

## 3. App page test

### `s1-first-390.png`

This is a single Satchel's own wallet page ("This NFT is a wallet.") — it shows the specific NFT's BTC and ETH
balances, an "Active" status, and the actual receive addresses for both chains with copy/QR/explorer links. Reads
as a per-token wallet dashboard, not the marketplace.

### `s3-sale-first-390.png`

This is the "Buy" tab for a specific listed Satchel (#3) — price (5.00 USDC), who listed it and when, and a
prominent "clean history" verification block.

- **Can you tell it's safe to buy?** Yes, fairly confidently: it states "Clean. No past signature can move these
  coins," with a green check, "1 of 1 can't move coins," and explicitly notes the check "runs in your browser"
  because "Satchel's server isn't trusted for this" — that's a specific, falsifiable safety claim, not just a badge.
- **Can you tell what you'd get?** Only partly. You know you'd get Satchel #3 for 5.00 USDC, but this particular
  screen (the Buy tab) doesn't show the BTC/ETH amounts inside it — that lives on the Wallet tab shown in the other
  screenshot, so on this screen alone the contents aren't visible.

## 4. Scores (landing page only, strict — screenshots only)

| Criterion | Score | Why |
|---|---|---|
| What it is | 3 / 3 | Stated plainly in the hero sentence ("it's an NFT on NEAR holding Bitcoin and Ethereum") and reinforced by the product name and visual card. No guessing required. |
| Who it's for | 3 / 3 | "For anyone selling or gifting a wallet" eyebrow tag, repeated in the headline and again as three explicit use cases ("Sell BTC and ETH together," "Give a funded wallet," "Hand over a project wallet"). |
| The problem | 2 / 3 | The hero names it in one dense sentence (seller keeps a seed phrase) and the page later makes it concrete with a labeled before/after diagram — but both rely on already knowing what a "seed phrase" or "signature" is to fully land; a complete novice gets the shape of the risk but not the full mechanics from the screenshots alone. |
| Why trust it | 3 / 3 | A dedicated section gives specific, checkable claims (no access keys, no admin methods, code hash matches, "born without a key") plus an honest "hasn't been audited" disclosure and an in-browser clean-history check — more than a badge or slogan. |

**Total: 11 / 12**
