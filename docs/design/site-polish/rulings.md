# Rulings for the site polish round (binding; newest at the bottom)

Razvan's ask and answers are in `plan/decisions.md` D-52. These rulings settle the copy deck's open questions
(`copy.md` §11, R-a to R-e) and the design's (`design-notes.md`).

## P1. Two framings for the shared answers (R-a)
- `faqItems` takes a framing option:
  - `"product"`: the landing `/`, in mainnet terms (copy.md);
  - `"deployment"`: `/questions`, which keeps **today's text byte for byte** for every shared answer. That includes
    `q-keys`, `q-proves` and `q-chains` with their testnet names and the signer-network keys line, and `q-testnet`'s
    question "Why testnet only? Is it audited?" with its wallet line.
- Since `/questions` doesn't change, **its group title stays "Testnet and safety"**: don't retitle `FAQ_GROUPS`.
- `/questions` is an app page, and the app keeps its testnet notes (decision 1 covers the landing only). It
  must stay true for the deployment, because an Ethereum address is the same on mainnet.
- Tests: the faq tests pin both framings: the landing variants, and `/questions` equal to today's strings.
- **One exception (added after the build):** on the dev role, `q-keys` ends with the new dev line on both pages
  ("This site's development contract has keys, so we can change its code."). Today's line ended "…so its lock
  checks are skipped", the kind of note Razvan asked to remove. Every other shared answer on `/questions` is
  unchanged.

## P2. Phones keep the menu sheet's testnet line (R-b)
Below 420 px, when signed out, the header badge is hidden (`responsive.spec`). The menu sheet's testnet line is the
badge's stand-in on phones, so it stays.

## P3. The Uses hint is U1 (R-c)
An attribute-drawn chip, "+ USDC and L2s", on "Sell BTC, ETH and SOL together". It adds 0 visible words and echoes the
bento tile. The designer decides how it looks.

## P4. The What tag shows "bc1q…" (R-d)
The Bitcoin address tag in What it is changes from "tb1q…" to "bc1q…" (the mainnet prefix), as part of the product
framing.

## P5. Budgets (R-e)
- The e2e cap above Questions stays at 380.
- Add a unit guard for the dev role's band and page budget (copy.md §7).

## P6. The code card is labelled "Simplified"
The trust code card carries a small attribute-drawn "Simplified" label (for example in its header, next to the
filename), so a reader diffing it against `sign.rs` sees it's an illustration, not the source.

## P7. The `--band` token is approved (designer ruling 1)
- Day `#E3E6F6`: the ETH charm at 30 % on white. Night: the sunken tone `#29214B`.
- Add it to `globals.css`, give it a kb/81 row with its contrast, and add its pairs to the contrast test.

## P8. Page-height caps (designer ruling 2)
- 1280: 6,500 → **7,000**.
- 390: 9,000 → **10,100**.
- Keep the stacked phone bento, not a carousel: no other section on the page scrolls sideways.

## P9. Amount typography follows the brand (designer ruling 3)
- Amounts use Funnel or Onest tabular figures.
- Geist Mono is only for code, file names, addresses and the claim path.
- (The design brief's "Geist Mono for amounts" was wrong.)

## P10. No hero-tile line (designer ruling 4)
The bento stays at 48 words.

## P11. The code loop runs 10 s with a visible Pause (designer ruling 5)
- An indefinite loop needs a pause mechanism whatever its cycle (WCAG 2.2.2), so use the hero's player pattern: step
  bars plus Pause.
- It stops off-screen, on a hidden tab and when inert.
- The rest frame is step 3 ("Written here, before anything is signed") at 6 s.

## P12. On phones, the lead tile never crops the card's total
- At 390 the Make an offer well cuts the Satchel card on the left, so "≈ $8,000.00" reads as "0".
- Below 640 px the composition must keep the total and the pill whole: scale it, shift it, or show only the offer slip
  and a smaller card peek.
- The designer revises the prototype and notes §1.5; check 320, 360, 390, 430, 480 and 600.

## P13. App follow-up, out of scope
`SatchelCard`'s head row in mainnet mode (`items-center`) goes to the app lane as a note. It isn't built here.
