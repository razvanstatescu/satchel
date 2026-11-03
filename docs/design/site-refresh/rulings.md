# Rulings for the site refresh (binding; newest at the bottom)

## R1. USDC on NEAR (H-26 is open until Nov 8)
- **Name EVM USDC freely:** USDC on Ethereum, Base, Arbitrum and OP Sepolia.
- **Sale and offer currencies on the landing say NEAR only** ("paid in NEAR", "an offer in NEAR"). Don't advertise
  USDC prices or USDC offers, and don't mention USDC *inside* on NEAR. If H-26 fails, the final contract has no NEAR-side
  USDC, and the landing must stay true without an edit.
- "NEAR inside" may be mentioned only if it adds value. Keep it generic: "NEAR held inside".

## R2. Testnet and lock claims follow the contract role
- "Can't be upgraded" and "no admin key" are true only for **rc and final**. The live site runs dev2 (role `dev`), which
  has keys.
- `q-testnet`'s "can't be upgraded" sentence gets a **dev twin**, as `q-keys` and the trust band already do
  (`CONTRACT_ROLE`, `lib/lock-facts.ts`).

## R3. The dollar figure in the landing art (D-50)
- **A fixed, round, simulated sample. Never live prices:** `/` reads no data (D-42).
- Show it with "≈" and "at mainnet prices", like the app.
- **Attribute-drawn** (`aria-hidden` art), never in the text layer.
- **Format it at render with the app's formatter** `usdText()` (`apps/web/src/lib/overview.ts`; moved to `lib/format.ts` by R9.4). The copy unit test bans "$"
  followed by a digit in copy strings, so store the number, not a "$…" string.
- The chips show **each coin's share in %** (like the app's card), so the bar, the chips and the total can never
  contradict native amounts.
- Pick plausible shares for a 0.05 BTC / 0.80 ETH / SOL sample. Or drop the native amounts from the card art and show
  only the total, bar and chips, as the app card does.

## R4. `/questions` answers in the app lane
- **Done on `main` (8d783e4)**, and the refresh branch includes it:
  - `q-what-is` says "only its current owner, or someone the owner lets spend within daily caps";
  - `q-where-arrive` was fixed the same way.
- **Never edit `copy/questions.ts`.**
- Inside balances (NEAR, USDC, wNEAR) are **owner-only**: allowances cover `sign_for` only. Landing copy must not
  suggest that a delegate can withdraw inside assets.

## R5. The header Testnet badge tooltip (`copy.app.badgeTip`, `src/lib/copy/shell.ts`)
- It misses Solana and the L2s. Fix it on our branch, kept short. For example: "Satchel runs on NEAR testnet and the
  test networks of Bitcoin, Ethereum (and its L2s) and Solana. Coins here have no value."
- The copywriter decides the exact wording.

## R6. Offers
- **Never say refunds are automatic.** An expired offer still has to be cancelled, and the money always goes back to
  the person who offered.
- Offers are tied to the signature count and to the inside balances. "If anything changes, the offer can't be
  accepted" is the safe line, per `facts.md`.

## R7. Allowances
- Call it what the app does: "Who can spend" / "someone who can spend".
- Facts: up to 4 accounts, daily caps, paused while listed, cleared when the Satchel changes owner, and their
  signatures go on the same record.
- **Never imply a delegate can sell, give or list the Satchel.** Check `facts.md` and the C5 spec for what delegates
  can't do.

## R8. What "someone the owner lets spend" can't do (confirmed against C5)
- **They can't:**
  - sign messages (delegates get `ERR_ALLOWANCE_KIND`; message signing is owner-only);
  - withdraw inside assets;
  - list or stop selling;
  - give or sell the Satchel.
- **They can only** send coins from the chain addresses, within daily caps.
- **Word ban:** the copy-rule test bans "delegate" in user-facing copy. Say "someone the owner lets spend" / "Who can
  spend".
- **Rewording app copy:** in `multichain.ts`, reword only the lines about sending coins from the chain addresses.
  Owner-only lines about messages, inside withdrawals and listing stay as they are.

## R9. Decisions on `copy.md` §8 (after the review)
1. **The price tag is 2,000 NEAR**, at par with the ≈ $8,000 sample at the app's fixture prices (NEAR = 4).
   - The sample: 0.05 BTC + 0.80 ETH + 12 SOL + 800 USDC, with shares of 50/25/15/10.
   - Update `desk.price`, `anim.alt` and `uses.tags[0]`, and give the hang tag its new width.
2. **The strip has five items** (copy.md §3, recommended). The designer decides the placement. The cap above Questions
   is 380 if the strip sits above Questions, else 330. The page-height caps come from the designer's measurements
   (≈ 9,300 at 390 and ≤ 6,500 at 1280 expected).
3. **F7 is accepted:** `q-testnet` gets an `aDev` twin, chosen in `faqItems` when the role is dev.
4. **`usdText` and `shareText` move to `src/lib/format.ts`** (pure) and are re-exported from `lib/overview.ts`, so
   existing callers don't change. The landing imports them from `lib/format` only.
5. **copy.md §7 (app strings) is accepted in full,** including:
   - the new guard keys for Sign a message and Take it all out, with their component edits;
   - the optional stale fixes: `clean.verdict.checking` and `proof.cleanTip`.
