# Blind first-impression test 3

After the site refresh (2026-11-03, D-51). The tester saw only five screenshots, with no project context:
`landing-first-1280.png`, `landing-first-390.png`, `landing-full-1280.png`, `s1-first-390.png`, `s3-sale-first-390.png`
(reduced motion, onboarding done). The questions are test 2's, plus Q7 on the card and two skim questions on the strip and
real money. Test 2 scored 11 / 12. The points lost here are for parts the refresh didn't change: jargon in the hero line,
the trust section's place, and the phone fold.

## 1. Five-second test

### Landing, desktop

1. **What is this product?** A marketplace/tool for buying, selling or gifting a crypto wallet as a single package — specifically "Satchel," described as "an NFT on NEAR holding Bitcoin, Ethereum and Solana."
2. **Who is it for?** Stated directly in the small pill above the headline: "For anyone selling or gifting a wallet."
3. **What problem does it solve?** It stops a wallet seller from keeping a backdoor into the wallet after selling it. The subhead says normal sellers "can keep a copy of a wallet's seed phrase," while "a Satchel has none," and a buyer's browser can check that no old authorization can still move the coins.
4. **Why trust it / what makes it safe?** At this stage, only a claim: "the buyer's browser checks no old signature can move them." No evidence is shown yet (the proof card is cut off at the bottom of the screen), and the only other nearby trust-relevant line is "Testnet only. Coins here have no value" — reassuring about risk, but it also signals this isn't live/real yet.
5. **What would you click first, and why?** "Look inside a Satchel" — the filled, high-contrast button with a forward arrow, first in reading order, sounds like a no-commitment way to explore before connecting a wallet or paying anything.
6. **What confused you?** "Satchel" works as both the company/product name and the generic name for each individual wallet-NFT ("a Satchel," "Satchel #1"), which takes a second read to untangle. "Testnet" next to the logo and "NEAR" in the subhead are unexplained jargon. It's also not clear whether the "$8,000" card shown below is a real, currently-listed item or a staged example.
7. **What does the card illustration show, and what do its numbers mean to you?** A sample wallet card named "Satchel" worth "≈$8,000.00 at mainnet prices," tagged "Paused for sale," with a coloured bar breaking its holdings into roughly BTC 50% / ETH 25% / SOL 15% (plus what looks like one more asset, cut off at the edge). Overlapping it, a second card titled "3 past signatures — Checked in the buyer's browser" lists "Signature 1 — Used." Read together, this looks like a preview of the safety check from Q4: before buying, you can apparently see both what's inside a Satchel and a log of everything it has ever signed.

### Landing, phone

1. **What is this product?** Same reading as desktop — a way to sell or gift a wallet that bundles BTC/ETH/SOL, with a buyer-side safety check.
2. **Who is it for?** Same pill, same answer: anyone selling or gifting a wallet.
3. **What problem does it solve?** Same text, same answer: sellers normally could keep a copy of the seed phrase; Satchel removes that risk.
4. **Why trust it / what makes it safe?** Weaker than on desktop: the proof illustration is almost entirely below the fold here (see Q7), so trust rests on the sentence alone, with no visible evidence on this screen.
5. **What would you click first, and why?** "Look inside a Satchel," the top (filled) button of the two stacked CTAs — same reasoning as desktop.
6. **What confused you?** The three smiling circle "charms" at the very top, hanging from a short bar under the nav, appear before any explanatory text — on first glance they could be mistaken for a loading animation, a rating widget, or decoration, since nothing has yet said they represent coins/chains. The "Connect" button (shortened from "Connect NEAR wallet") also loses the one word that told desktop users this is a NEAR-specific product.
7. **What does the card illustration show, and what do its numbers mean to you?** Almost nothing is readable yet. Only the very top sliver of the illustration band is visible — a white card's coral header reading "Satchel" with the logo mark. The price, percentages and "3 past signatures" panel that answer this on desktop are entirely off-screen here.

## 2. Skim test (full page)

Scrolling the whole page adds the mechanics the hero only hints at: how a Satchel is created and handed over (mint → fund → send, a 3-step strip), what's actually inside one (its own real per-chain addresses, "no bridge, no wrapped tokens"), a dramatized cautionary tale about a leaked signature draining a buyer's funds after a sale, a security section on the contract having no admin key, a short list of other things a Satchel can do beyond selling, an FAQ, and a closing CTA plus a footer with links to "verify" claims (contract facts, a live Satchel, README, repo). The clearest section is "No admin key. Not even ours.," which pairs a plain-English claim with a tidy "Contract facts" checklist (access keys, admin methods, code hash) that reads like something you could go verify yourself. The weakest is "A signature can outlive a sale": five small card mockups in a row, split into a "without" / "with Satchel" comparison, asking the reader to parse tiny text across several miniature screens to follow a fairly technical story — it's the densest, least skimmable block on the page. Tone throughout is friendly and a little playful (rounded smiley-face "charms," short punchy headings like "Mint it. Add coins. Hand it over." and "Stick it on. Hand it over."), which sits a bit oddly against the underlying subject matter — signatures, admin keys, code hashes — that the page is ultimately trying to explain. (Note: this image was downscaled for the full-length view, so a few small numerals in the step illustrations were not fully confirmable.)

Besides the headline use (selling a wallet to a stranger), the "What else it does" row says this product can also: take offers on a Satchel even when it isn't listed for sale; let an owner give one by link to someone who doesn't have a NEAR wallet yet; let an owner grant someone else daily-capped spending rights without handing over ownership; hold USDC and tokens on a few Ethereum L2s (Base, Arbitrum, OP Sepolia) alongside BTC/ETH/SOL; and let an owner withdraw everything out to their own separate wallet.

Is any money on this page real? No, as far as the screenshots show. The header carries a permanent "Testnet" badge, the disclaimer "Testnet only. Coins here have no value" repeats at least three times (hero, bottom banner, footer), and one FAQ question is literally "Why testnet only? Is it audited?" The dollar figures shown (e.g. "$8,000.00 at mainnet prices") are explicitly priced as a reference/notional value, not an actual balance anyone could cash out.

## 3. App page test

**s1-first-390.png** — "This NFT is a wallet." A detail page for one specific wallet-NFT, "Satchel #1," viewed by someone other than its owner. It states plainly who's in control ("Whoever owns Satchel #1 controls the coins...”), shows its current mixed-asset balance (≈$427.72 across ETH/BTC/SOL plus two more assets) and status ("Active"), and offers a non-owner two things to do: make an offer on it (even though it's not listed for sale) or add coins to it, plus a link to mint your own.

**s3-sale-first-390.png** — A purchase/listing page for "Satchel #3," which is for sale and currently "Paused for sale," with its "Buy" tab open. It shows the asking price (5.00 USDC), who listed it and when, and leads with a "Clean history" result.
- *Can you tell it's safe to buy?* Mostly yes, as a claim: it states plainly "Clean. No past signature can move these coins," "1 of 1 can't move coins," and — a nice touch — specifies the check "Checked in your browser just now" because "Satchel's server isn't trusted for this," which reads as a deliberate, verifiable mechanism rather than a marketing badge. It's also reassuring that the listing is "Paused," meaning (per the text) the seller can't sign anything new during the sale. But from this screenshot alone I can't verify the claim is true, I'm not shown what a failed/unclean check would look like for comparison, and there's no visible link on this page to the "contract facts" or "under the hood" explanation the landing page promised — so the trust is real in tone but unverified in this view.
- *Can you tell what you'd get?* Only the price, not the contents. This screen doesn't repeat the balance/asset breakdown that the Wallet tab shows for Satchel #1 (no total value, no BTC/ETH/SOL split for Satchel #3) — a buyer on this exact screen would have to tap over to the "Wallet" tab to confirm what 5.00 USDC actually buys before paying.

## 4. Scores (landing page only, strict: screenshots only)

| Row | Score | Why |
|---|---|---|
| What it is | 2/3 | The headline plus subhead do explain it ("an NFT on NEAR holding Bitcoin, Ethereum and Solana"), but only once the reader gets past "sell a wallet" and absorbs jargon (NFT, NEAR) that's never defined on the page. |
| Who it's for | 3/3 | Stated outright, above the headline, in plain language: "For anyone selling or gifting a wallet." |
| The problem | 2/3 | Clearly named mechanism ("sellers can keep a copy of a wallet's seed phrase") right in the subhead, but it only lands if the reader already knows what a seed phrase is and why retaining one is risky. |
| Why trust it | 2/3 | The page eventually makes a strong, concrete case (no admin key, a "Contract facts" checklist), but it's several sections down; the hero-level trust claim is just asserted with no visible proof on first view, and the page itself admits it "hasn't been audited." |
| **Total** | **9/12** | |

## 5. Top three fixes

1. **Define the jargon at first use.** "Seed phrase," "NFT," "NEAR," "signature" and "testnet" all appear before any of them are explained, and the whole problem statement (why a Satchel is safer) depends on already knowing what a seed phrase is. A one-line gloss or tooltip on first use would let the five-second test actually work for someone who isn't already crypto-fluent.
2. **Fix the hero's proof illustration.** The "$8,000 card + 3 past signatures" panel is the single best piece of evidence for the whole pitch, but it's almost entirely off-screen on the phone first view, and even on desktop it's unlabeled — a visitor can't tell if it's a real listing or a staged example. Make it fit (or summarize it) above the fold on mobile, and caption it clearly as a worked example.
3. **Move the strongest trust content up.** "No admin key. Not even ours." with its verifiable "Contract facts" checklist is the most convincing section on the page, but it sits well past the midpoint, behind several other sections. For a product whose entire premise is "trust us with your coins," a short trust signal belongs near the hero, not at the bottom of a long scroll.
