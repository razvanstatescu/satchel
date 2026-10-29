# Satchel — Blind First-Impression Test

Evaluator saw only the five named screenshots, once each, with no project context.

## 1. 5-second test

### Landing, desktop (`landing-first-1280.png`)

1. **What is this product?** A marketplace/app called "Satchel" for NFTs that double as crypto wallets — the NFT itself holds Bitcoin and Ethereum.
2. **Who is it for?** People who buy and sell these wallet-NFTs — crypto-literate buyers and sellers, not total beginners.
3. **What problem does it solve for them?** It stops a seller from secretly keeping a seed phrase or signature that would let them steal the coins back after selling the wallet.
4. **Why should they trust it, or what makes it safe?** The pitch is that "the buyer's browser checks no old signature can move them" — some kind of self-serve verification before purchase — but on a first look I can't tell exactly how that check works, just that it exists.
5. **What would you click first, and why?** The solid red "Look inside a Satchel" button — it's the biggest, highest-contrast element after the headline and reads like the obvious "start here."
6. **What's one thing that confused you?** The illustration — two smiling coin characters dangling from strings above a wallet card and a half-visible "3 past signatures" slip. In 5 seconds I couldn't tell what it depicted; it read almost like laundry on a line.

### Landing, phone (`landing-first-390.png`)

1. **What is this product?** Same reading as desktop: "Satchel," an NFT that is also a working crypto wallet (BTC/ETH shown on the card).
2. **Who is it for?** Same — people trading or handing over crypto-holding wallets, presumably already comfortable with crypto wallets.
3. **What problem does it solve for them?** Protecting a buyer from a seller who kept a way to move the coins after the sale.
4. **Why should they trust it, or what makes it safe?** Same claim about a browser-side check, but on mobile the illustration that seems to depict it is cropped off at the bottom of the screen, so the trust claim felt even more abstract than on desktop.
5. **What would you click first, and why?** "Look inside a Satchel" again — it's the only filled/solid-color button on the screen; everything else is outline or plain text.
6. **What's one thing that confused you?** "The buyer checks it first" — checks *what*, physically, and how? Nothing in this crop shows the mechanism.

## 2. Skim test (`landing-full-1280.png`)

Scrolling the full page clears up most of the 5-second confusion: this is an NFT (on NEAR) that holds its own Bitcoin and Ethereum addresses, can be funded/minted with coins, and transferring the NFT hands over control of those addresses. The core idea — a wallet can be resold, but a dishonest seller could keep a pre-signed transaction that drains it after the sale — is spelled out explicitly in a "without vs. with Satchel" step diagram, which was the clearest section on the page: it shows a seller holding a signed-but-unsent transfer, then shows Satchel recording every signature on NEAR and the buyer's own browser spotting any unused one before "Buy" lights up. The "No admin key, not even ours" panel (contract facts: no access keys, no admin methods, code hash matches) reinforces the safety angle well too. The weakest part is the hero illustration — the hanging smiley-face coins read as a cute mascot but don't actually communicate anything about wallets, signatures, or trust, so it costs attention without paying it back, and it leans more playful/childish than the rest of the page. Nothing felt gloomy or untrustworthy — the palette (cream background, coral-red accents, pale blue illustration panels) is bright and friendly, and by the bottom of the page (FAQ, contract-facts panel, footer with "Repo"/"README" links) it reads like a serious technical product again. The page is long with many distinct sections back to back (hero, two feature blocks, 3-step mint flow, signature-history diagram, no-admin-key, FAQ, closing CTA, footer), which felt a bit crowded/repetitive to skim in one pass even though no single section was bad on its own.

## 3. App page test

### `s1-first-390.png`
This is a single wallet's detail page ("Satchel #1") — a dashboard showing the NFT's status card (its BTC and ETH balances, "Active"), and below it a breakdown of the actual Bitcoin and Ethereum addresses it controls, each with its balance, full address string, and copy/QR/block-explorer actions, plus a button to add more coins. It reads as the "view/manage this wallet" screen for an owner (or anyone looking it up).

### `s3-sale-first-390.png`
This is a purchase page for a Satchel that's listed for sale — price (5.00 USDC), who listed it and when, and a prominent "Clean history" check.

- **Can I tell whether it's safe to buy?** Yes, fairly clearly: a green-shielded "Clean history — Clean. No past signature can move these coins" block says the check passed, notes it was "Checked in your browser just now," and explicitly states "Satchel's server isn't trusted for this" — plus a note that the listing is paused so the seller can't sign anything new while it's up for sale. That's a clear, specific safety claim.
- **Can I tell what I'd get?** Only partly from this screen. I can see the price (5 USDC) and that it's "Satchel #3," but this crop doesn't show the BTC/ETH amounts inside the wallet itself — that content is presumably under the "Wallet" tab visible above but not shown here. So the safety story is clear; the "what's inside" story would need one more tap.

## 4. Scores (12-point rubric, landing page)

| Criterion | Score | Why |
|---|---|---|
| What it is | 3/3 | Hero copy states it outright: "it's an NFT on NEAR holding Bitcoin and Ethereum." |
| Who it's for | 1/3 | Never named (no "for sellers," "for collectors," etc.); only inferable from the buyer/seller language used throughout. |
| The problem | 3/3 | Explicit in the hero ("Sellers can keep a copy of a wallet's seed phrase") and reinforced concretely by the signature-history diagram further down. |
| Why trust it | 2/3 | The claim is specific and repeated (browser-side check, no admin key, recorded signatures) and fully lands by the bottom of the page, but at a glance the mechanism isn't self-evident — a near-miss on 3. |

**Total: 9/12**
