# Satchel 2.0: the voice and the copy deck

Copywriter, 2026-10-26. Read with `context.md`. Inputs: the Design System README ("Content fundamentals"); the Main,
In context and Colour and type boards; all 713 keys of `apps/web/src/lib/copy.ts` (strings plus string functions,
counted with a script); the copy test and the e2e specs that pin text; `landing/content.md` "Risky claims checked"; the
v4 blind re-test (`landing-v4/retest.md`); kb/90 §1, §4, §5.4–5.12, §7, §8.6, §8.9; kb/80 §Copy deck; D-05, D-37,
D-40, D-41, D-42.

Product facts beat brand samples everywhere. Strings use `{name}` for function arguments. A no-break space goes before
every ticker, and apostrophes are straight, as in the deck today.

**Legend:** **T** = a unit or e2e test pins the string, so the test changes with it (§2.3). **NEW** = the key doesn't
exist yet. **keep** = unchanged; any key a namespace doesn't list as changed is keep.

## 1. The voice in practice

### 1.1 Ten rules, with examples from today's deck

| # | Rule | Before | After |
|---|---|---|---|
| 1 | Put the verb first, and use one verb per action: the button, the progress line, the toast and Activity all repeat it. | `xfer.cta` "Transfer to {account}" → "Transferring…" → "Transferred Satchel #{id} to {account}" | "Give it to {account}" → "Giving…" → "Gave Satchel #{id} to {account}" |
| 2 | Use hand-off language: you give or sell a Satchel, and the new owner gets everything inside. | `xfer.rows.them` "{account} will control everything in this Satchel: {balances}. Its addresses go with it, so anything sent to them later is {account}'s too." | "{account} gets everything inside: {balances}. Its addresses go too, so coins sent to them later are {account}'s." |
| 3 | A state is an icon plus one state word. Satchels are Active, Signing, Paused for sale, Sold or Needs attention; flows end in Sent, Given or Bought. | `pill.listed` "Listed" and `freeze.title` "Signing paused while listed" | "Paused for sale" and "Paused while it's for sale" |
| 4 | Say what the person can't do, not how the mechanism works. | `page.actions.paused` "Signing is paused while listed." | "Sending and giving are paused while it's for sale." |
| 5 | Prefer plain verbs to marketplace and dev jargon, but keep the chain words crypto-natives expect. | `page.actions.delist` "Delist", `page.actions.fund` "Fund", `app.fixture` "Fixture data: …" | "Stop selling", "Add coins", "Sample data: …". Keep Mint, signature, nonce, mempool, Broadcast, testnet4 and Sepolia |
| 6 | Be concrete, and give the next step in the same breath. | `page.actions.noFunds` "This Satchel has no BTC or ETH yet." | "Nothing to send yet. Add coins first." |
| 7 | Errors say what happened, what didn't move, then one action. Honest copy stays word for word. | `errors.E36` "You can't buy your own listing. Delist it instead." | "You can't buy your own Satchel. Stop selling it instead." Keep `sign.timeout.body` and `.cond` exactly as they are |
| 8 | Waiting copy gives the measured time, never a hopeful one. | Brand sample: "Usually under a minute." | Keep `sign.mpc[0]` "Usually about 10 seconds." … `[60]` "The network allows up to about 2 minutes." |
| 9 | Each claim carries its scope word: about, usually, testnet or the buyer's browser. | `landing.how.steps[1].body` "Approve in your NEAR wallet. It's usually signed in about 10 seconds." | "Approve in your NEAR wallet. Signing usually takes about 10 seconds." Keep `footer.noteClean` |
| 10 | Use one noun per thing. | `page.meta` "…Transfer the NFT and the new owner controls the funds." | "…Give or sell the NFT and the new owner controls the coins." |

Rule 10 in practice: **owner**, never "holder"; **coins**, never "funds"; the **NEAR wallet** is the one you connect and
a **Satchel** is the one you own; a **listing** is the offer ("Listing #4"); **"Satchel"** is capitalized in text (the
lowercase "satchel" exists only as the wordmark).

The mechanics the copy test enforces stay as they are: sentence case; icons carry the glyphs, so no glyph is typed into
a string; "…" on labels in progress; none of the banned words (cooldown, MPC, yield, approval, "Safe to buy", "$"
followed by a digit, delegate(s), "Pay with", "no signature exists").

### 1.2 Vocabulary map (each one decided)

| Today | 2.0 | Where | Why |
|---|---|---|---|
| Transfer (the NFT) | **Give** · Giving… · Given | Give flow `xfer.*`, the action row, the Handoff pill, toasts, errors | `nft_transfer` is owner-only and carries no payment (kb/90 §5.11). "Give" therefore stays accurate both for gifts and for a move to your own other account. A paid hand-off is always Sell or Buy. |
| Transfer (Activity row) | **Handed over to {to}** | `act.row.transferred` | Live Activity maps every nep171 `nft_transfer` event to this row, including the one a **sale** emits (`lib/data/server.ts` `getActivity`; kb/90 §5.7 `buy`). "Given" would call a sale a gift. Switch to "Given" only if the data layer drops sale transfers. |
| transfer (of coins) | **send** in UI copy | `send.review.final.*` | One meaning per word. "transfer" stays only in chain-level copy: hood rule 1 "Plain transfers only", the catch beat "A seller signs a transfer", `errors.E39`. |
| Listed (the state) | **Paused for sale** as the pill, the card band, the NFT image and the Facts status. "for sale" in sentences. "Paused while it's for sale" on the banner | pills, guards, errors, market | This is the brand's state word, and kb/90 §5.10 already names the state "For sale" (signing and transfers paused). The pair Active ↔ Paused answers the testers' "Active: as opposed to what?". The verb stays "List for sale", "Listed for {price}", and so does the noun "Listing #4". This reverses kb/80 R3's "For sale → Listed" retirement (§2.4). |
| Delist | **Stop selling** · Stopping sale… · Stopped selling | button, banner action, toasts, Activity, errors | A plain verb that pairs with the Sell tab. "Cancel listing" would collide with "You cancelled in your wallet". |
| Signing paused | **Sending and giving are paused while it's for sale**; the landing desk says "No new signatures" | action reason, toasts, desk | It names what the owner can't do (`ERR_FROZEN`, `ERR_LISTED`, kb/90 §5.7) and what the pause guarantees a buyer. |
| Fund | **Add coins**, never Receive or Deposit | action row, Receive page, fund card, after minting | Anyone can add coins, not only the owner: the reason kb/80 banned "Receive". "Coins" also signals native coins only. The route `/receive` and the `fund.*` keys stay. |
| Mint | **Mint** (keep) | nav, mint flow, landing | It's the NFT word crypto-natives expect, and the board writes "Mint a Satchel". "Make" is vague, and "Get a Satchel" reads as buying one on the market. |
| Owner / holder | **owner** (keep); the verb "holds" for the wallet idiom | Facts, guards, pills | One noun per role: Facts, NEP-171 and NearBlocks all say "owner". The board's "the new holder gets everything inside" becomes "{account} gets everything inside". |
| Settled · Settling · Foreign; the verb "settle" | **Used · Confirming · Not its coin**; the verb **clear** | clean-history items, gates, Sell checklist, landing desk | Used and Unused make a plain pair. v4 testers read "Settled" as "money moved", and the evidence lines already say "Nonce 4 used". "Confirming" names the wait. "Foreign" is opaque. Keep Unused, Expired, Unfunded and Can't verify. |
| Clean history | keep | everywhere | It's the feature name (README, D-41). The first mention on each screen says what it means: "No past signature can move these coins". |
| funds; deposit (incoming) | **coins** | `page.meta`, `fund.incoming.waiting`, `act.empty.body` | Native coins only. Keep "Unconfirmed deposits never count." (exact chain phrase, kb/90 §7.3) and "Deposit" for the NEAR storage deposits (0.02 to mint, 0.01 to list). |
| wallet | **NEAR wallet** for the one you connect | landing, flows | Testers saw two meanings. "Connect wallet" stays in the app header (T), and the landing keeps "Connect NEAR wallet". |
| Fixture data | **Sample data** | `app.fixture` | A developer's word. |
| Activity, Market, Contract facts, Quiet period, Broadcast, mempool, nonce, signature | keep | | Chain words the audience expects. The quiet period is never called a cooldown. |

## 2. Key-by-key change list for `copy.ts`

**87 of 713 keys change (12 %).**
- Three keys are **NEW**: `landing.what.h2`, `landing.what.body` and `contract.keyless`. `landing.hero.who` is optional.
- `home.h1` waits for Razvan (§3.1).
- No key is renamed and no function signature changes. `xfer`, `fund`, `delist` and `listed` keep their names, so components, fixtures and the error map don't move.

### 2.1 App namespaces

**app**: 1 change. Keep `name`, `badge` (T) and `badgeTip` (kb/90 §4 T7).

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `app.fixture` | Fixture data: these pages show sample state, not live chain reads. | Sample data: these pages don't read the chains live. | Drops the developer's word. Shown in fixture mode only |

**These namespaces keep every string:** **title**, **nav** (`nav.connect` T), **theme**, **role** (kb/90 §7.3 words),
**banner**, **footer** (`testnet` is T7; `noteClean` is risky claim 2), **toast** and **card** (`totalNone` T, D-37).

**pill**: 2 changes. Keep `active` (T; the judge's Facts status), `signing`, `sold`, `needs_attention` and `bought`.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `pill.listed` | Listed | Paused for sale | The brand's state word. kb/90 §5.10: listed means signing and transfers are paused. T (unit and judge card SVG) |
| `pill.transferred` | Transferred | Given | Only rendered by Handoff at the end of the Give flow |

**home**: 3 changes, plus the H1 decision. Keep `note` (T7), `howTitle`, `proofTitle`, `empty.title`, `empty.cta`, `list.*` and `error`.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `home.h1` | A wallet you can sell, with a history the buyer can check. | Razvan's call: recommend C in §3.1 | D-41; T |
| `home.lead` | Satchel is an NFT that is a wallet. Each one controls its own Bitcoin and Ethereum addresses; transfer the NFT and you hand over the wallet. | Satchel is an NFT that is a wallet. Each one has its own Bitcoin and Ethereum addresses on testnet. Give it or sell it, and everything inside goes too. | The site-wide meta description (`app/layout.tsx`), so search snippets now say testnet. kb/90 §1.1, T7 |
| `home.empty.body` | Mint one to get Bitcoin and Ethereum addresses that belong to the NFT. | Mint one and get Bitcoin and Ethereum addresses that go wherever the NFT goes. | kb/90 §1.1: the addresses survive transfers |
| `home.empty.link` | See Satchel #1 | Look inside Satchel #1 | Same verb as the landing CTA |

**how** (the three steps on `/s/[id]`): 2 changes. Keep `how[0]` and `how[1]`.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `how[2].title` | Transfer the NFT, transfer the wallet | Give it or sell it | Vocabulary |
| `how[2].body` | Gift or sell it, and the new owner controls every coin inside. No bridge, no wrapped tokens, no seed phrase. | The new owner gets everything inside. No bridge, no wrapped tokens, no seed phrase. | kb/90 §2: native coins only |

**proof**: 1 change, to a key nothing reads today. Keep the rest. `cleanTip` stays verbatim from kb/90 §7.7.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `proof.lastTransfer` | Last transfer {from} → {to} | Last hand-off: {from} to {to} | Neutral, since a sale is a hand-off too. No typed arrow |

**page**: 7 changes. Keep:
- `chips`, `menu.*`, `ownerH1`, `title` and `ownerPill` (T);
- `visitorH1` (T, kb/90 §8.1) and `visitorSub` (INV-01);
- `stats.status`, `stats.signatures` and `stats.minted`;
- `tabs.*` (D-40 "Sold"), `notfound.*` (T), `ownerChanged` and `pending.*`.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `page.meta` | …through NEAR Chain Signatures. Transfer the NFT and the new owner controls the funds. | …through NEAR Chain Signatures. Give or sell the NFT and the new owner controls the coins. | Judge meta (kb/90 §8.1). Only the last sentence changes; the addresses stay (T) |
| `page.stats.listedFor` | Listed for | Sale price | Reads right next to "—" when the Satchel isn't for sale |
| `page.actions.fund` | Fund | Add coins | Vocabulary |
| `page.actions.transfer` | Transfer | Give | Vocabulary |
| `page.actions.delist` | Delist | Stop selling | Vocabulary. The SaleTab button reads it too |
| `page.actions.noFunds` | This Satchel has no BTC or ETH yet. | Nothing to send yet. Add coins first. | Gives the next step, and has no chain list to keep in sync with the SOL flag |
| `page.actions.paused` | Signing is paused while listed. | Sending and giving are paused while it's for sale. | kb/90 §5.7–5.8 (`ERR_FROZEN`, `ERR_LISTED`). T: flows.spec |

**wallet**: 3 changes. Keep the rest, including `fundcard.body` "Anyone can send testnet coins to its addresses. Only its owner can send them out."

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `wallet.fund` | Fund | Add coins | Vocabulary |
| `wallet.fundcard.title` | Fund this Satchel | Add coins to this Satchel | Vocabulary |
| `wallet.fundThis` | Fund this Satchel | Add coins to this Satchel | Vocabulary |

**facts** and **verify** keep every string: these are judge facts. `verify.guarantee` is the approved custody line.

**fund** (the Receive page): 3 changes. Keep `label`, `time.*`, `faucet.*`, `copy`, `share` and `incoming.title/mempool/confirming/received`. Keep `only.*` too: "Send only Sepolia ETH to this address." is a safety line (kb/70 Threat d).

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `fund.title` | Fund Satchel #{id} | Add coins to Satchel #{id} | Vocabulary |
| `fund.anyone` | Anyone can fund a Satchel. Only its owner can send from it. | Anyone can add coins. Only the owner can send them out. | INV-01 |
| `fund.incoming.waiting` | Waiting for a deposit… | Waiting for coins… | Vocabulary |

**send**: 6 changes. Keep the other 74. That includes `review.near` and `review.nearTip`, verbatim from kb/90 §8.9, and `review.timeSign` "Signing: usually about 10 seconds".

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `send.sol.E26` | This Satchel's Solana address has no SOL yet. Fund it first. | This Satchel's Solana address has no SOL yet. Add SOL first. | Vocabulary |
| `send.guard.listedTitle` | Signing is paused | Paused for sale | The state word |
| `send.guard.listedBody` | Satchel #{id} is listed for sale. Delist it to send. | Satchel #{id} is for sale. Stop selling it to send. | Vocabulary |
| `send.review.final.btc` | Bitcoin transfers are final. Check the address above. | A Bitcoin send can't be undone. Check the address above. | "Transfer" now means giving a Satchel |
| `send.review.final.evm` | Ethereum transfers are final. Check the address above. | An Ethereum send can't be undone. Check the address above. | Same |
| `send.review.final.sol` | Solana transfers are final. Check the address above. | A Solana send can't be undone. Check the address above. | Same |

**sign** keeps every string. This is the honest copy, word for word:
- `sign.mpc.*` (T, kb/90 §8.6);
- `sign.timeout.*` (T, kb/70 F16);
- `sign.notSent.*`;
- `sign.unknown.*`, which never says "failed";
- `sign.cancelled`, whose "Nothing was signed" holds only where no record can exist;
- `sign.keepOpen`, which already uses the state word "Sent".

**act**: 3 changes. Keep `row.listed` "Listed for {price}" (the List verb), `row.sold`, `row.received`, `status.*`, `detail.*` and the rest.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `act.row.transferred` | Transferred to {to} | Handed over to {to} | Neutral, because a sale's nep171 transfer lands here too (§1.2) |
| `act.row.delisted` | Delisted | Stopped selling | Vocabulary |
| `act.empty.body` | Sends, transfers and sales show up here. Deposits show on each chain's explorer. | Sends, hand-offs and sales show up here. Incoming coins show on each chain's explorer. | Vocabulary |

**xfer** (the Give flow): 12 changes. Keep:
- `to`, `placeholder`, `checking`, `found` (T) and `implicit`;
- `err.*`, which is the receiver guard (kb/90 §5.11; T);
- `rows.you` and `rows.history` (T; history stays with the token, kb/90 §5.7);
- `done` "{account} now controls {balances}." (T), `receipt.*`, `view`, `cancelled` and `steps.approve`.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `xfer.title` | Transfer Satchel #{id} | Give Satchel #{id} | The board's sheet title |
| `xfer.reviewTitle` | Review transfer | Review gift | Mirrors "Review send" |
| `xfer.rows.them` | {account} will control everything in this Satchel: {balances}. Its addresses go with it, so anything sent to them later is {account}'s too. | {account} gets everything inside: {balances}. Its addresses go too, so coins sent to them later are {account}'s. | The brand phrase. kb/90 §1.1 |
| `xfer.soft` | A signature from {t} ago is still in progress. If you transfer now, it stays valid for anyone holding it. | A signature from {t} ago is still in progress. If you give it now, that signature still works after the hand-off. | The D-08 soft guard; kb/70 F16 |
| `xfer.final` | This can't be undone. Only {account} can transfer it back. | This can't be undone. Only {account} can give it back. | Vocabulary |
| `xfer.cta` | Transfer to {account} | Give it to {account} | The board's button |
| `xfer.transferring` | Transferring… | Giving… | One verb per action |
| `xfer.steps.doing` | Transferring on NEAR | Handing it over on NEAR | Same |
| `xfer.steps.done` | Transferred | Given | Same |
| `xfer.toast` | Transferred Satchel #{id} to {account} | Gave Satchel #{id} to {account} | Same |
| `xfer.blockedListed` | Delist Satchel #{id} before transferring it. | Stop selling Satchel #{id} before you give it. | `ERR_LISTED` maps here too |
| `xfer.live` | Transfer complete. {account} now controls {balances}. | Given. {account} now controls {balances}. | The aria-live line |

**sell**: 12 changes. Keep:
- `title`, `checkTitle` "Before you list", `tab.ready` and `tab.list` "List for sale…";
- `quiet.*`: "Quiet period" and "You can list in {n} blocks (~{t})";
- `history.name/ok/blocked/unknown`;
- `usdc.*` and `form.*` (`form.paid` is risky claim 7; `form.feeNone` is today's fact);
- `cta`, `listing`, `errQuiet` and `cancelled`;
- `sold.*` and `escrow.*` (T).

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `sell.tab.notListed` | Not listed. | Not for sale. | Vocabulary |
| `sell.history.howToSettle` | How to settle | How to clear it | The new verb |
| `sell.history.settling` | {count} is still settling | {count} is still confirming | kb/90 §7.2 `settling` |
| `sell.history.warn` | Buyers can't buy while it can still move coins. Settle it first, or list anyway. | Buyers can't buy while it can still move coins. Clear it first, or list anyway. | The new verb |
| `sell.while.title` | While it's listed | While it's for sale | Vocabulary |
| `sell.while.rows` | You can't send from Satchel #{id} or transfer it. · Anyone can buy it at exactly {price}, right away. · The buyer gets everything in it. · You can delist at any time. | You can't send from Satchel #{id} or give it away. · Anyone can buy it at exactly {price}, right away. · The buyer gets everything inside. · You can stop selling at any time. | Row 2 is unchanged: there's no wait after listing (D-05 rev 2, kb/90 §5.12) |
| `sell.listedToast` | Listed for {price}. Signing paused. | Listed for {price}. Sending and giving are paused. | List → Listing… → Listed |
| `sell.panel` | Listed for {price} · Listing #{id} | For sale at {price} · Listing #{id} | It describes the state, not the event |
| `sell.delistNote` | Delisting is instant: buyers can't buy it anymore, and sending and transfers resume. | Stopping is instant: nobody can buy it after that, and you can send and give again. | kb/90 §5.6: `delist` makes signing resume immediately |
| `sell.reprice` | To change the price, delist and list again. | To change the price, stop selling and list it again. | Vocabulary |
| `sell.delisting` | Delisting… | Stopping sale… | One verb per action |
| `sell.delisted` | Delisted. Signing resumed. | Stopped selling. You can send and give again. | Same |

**freeze**: 3 changes. Keep `buyer` "The seller can't sign anything new, so the history below is final for this listing."

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `freeze.title` | Signing paused while listed | Paused while it's for sale | The brand's phrase. T: flows.spec |
| `freeze.owner` | No coins can leave Satchel #{id} until you delist it or it sells. Anyone can still fund it. | No coins can leave Satchel #{id} until you stop selling it or it sells. Anyone can still add coins. | kb/90 §5.8 step 2 |
| `freeze.delist` | Delist | Stop selling | Vocabulary |

**buy**: 3 changes. Keep the rest: `done` (T), `notForSale` (T), `excluded`, `unconfirmed` (kb/90 §7.3), `changed` and `refunded`.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `buy.how.steps` | You pay · One transaction moves Satchel #{id} to you and pays {seller} · You control the coins | You pay · (unchanged) · You get everything inside | The brand phrase |
| `buy.gate.settling` | Settling: {n} signature(s) | Confirming: {n} signature(s) | Vocabulary |
| `buy.delisted` | {seller} delisted Satchel #{id}. | {seller} stopped selling Satchel #{id}. | Vocabulary |

**clean**: 5 changes. Keep the rest:
- `disclosure` (risky claim 2), `trust` and `notCoveredList` (kb/90 §4);
- `verdict.unknown` "Buying stays paused until it's checked." and the `unsafe` lines;
- `oneOfTwo` (H-25);
- `item.unused/expired/unfunded/unknown`, the item bodies and `group.*` ("Can't move coins ({n})").

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `clean.verdict.settling` | {n} signature is still settling. / {sub} | {n} signature is still confirming. / {sub} | kb/90 §7.3 |
| `clean.verdict.blocked` | … could still move coins. / {item}. The seller has to settle it first. | … could still move coins. / {item}. The seller has to clear it first. | The new verb |
| `clean.item.settled` | Settled | Used | Pairs with "Unused" (§1.2) |
| `clean.item.settling` | Settling | Confirming | Same |
| `clean.item.foreign` | Foreign | Not its coin | kb/90 §7.2 (review S-07) |

**market**: 2 changes. Keep `title`, `error`, `hint` and the unused sort keys.

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `market.count` | {c} listed | {c} for sale | Vocabulary |
| `market.empty` | Nothing is listed right now. | Nothing's for sale right now. | Vocabulary |

**mint**: 1 change. Keep the rest: "Mint" stays, `get` (T) and `depositValue` (kb/90 §5.5).

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `mint.fund` | Fund this Satchel | Add coins | Vocabulary |

**contract** keeps every string. It's the judge page and the one place technical words are allowed. One NEW key:

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| NEW `contract.keyless` | (hard-coded in `app/(app)/contract/page.tsx`) Keyless since birth. | Keyless since birth. | Moves it into the deck. T: judge.spec |

**errors**: 4 changes. Keep the rest: E3 (T), E39 (T), and E7mpc and E8 with "Clean history lists it as Unused…".

| Key | Now | 2.0 | Why · source |
|---|---|---|---|
| `errors.E4` | Signing is paused while Satchel #{id} is listed. Delist it to send. Nothing was signed. | Signing is paused while Satchel #{id} is for sale. Stop selling it to send. Nothing was signed. | `ERR_FROZEN` fires before any record exists (kb/90 §5.8 step 2), so "Nothing was signed" holds. T: unit |
| `errors.E34listed` | Satchel #{id} is already listed. | Satchel #{id} is already for sale. | Vocabulary |
| `errors.E34not` | Satchel #{id} isn't listed anymore. | Satchel #{id} isn't for sale anymore. | Vocabulary |
| `errors.E36` | You can't buy your own listing. Delist it instead. | You can't buy your own Satchel. Stop selling it instead. | Vocabulary |

**empty** and **a11y** keep every string. **landing** has 14 changes and two NEW keys; every string is in §3.

### 2.2 Outside `copy.ts`, and the keys nothing reads

- `lib/card-svg.ts` keeps its own words (`CARD_STATUS_WORDS`, `CARD_SUB`).
  - Change `listed: "Listed"` to "Paused for sale", or better, read `copy.pill` and `copy.card.svgSigs`/`svgSub`.
  - Regenerate the card font subset. `scripts/build-card-fonts.mjs` holds only the glyphs of "Satchel #0–9ActiveSigningListed", so P, u, f, o and r are missing. Check that "Paused for sale" fits the band.
- `lib/view.ts` `holdingsSentence` falls back to "everything in it". That still reads well in `xfer.done` and `buy.doneBody`, so keep it.
- **These keys are unread today** (grep, no dynamic lookups). Wire them or delete them, but don't let them drift:
  - `title.signing`, `banner.*`, `footer.readme` and `toast.txCopied/tokenCopied/linkCopied/sent`;
  - `card.svgSigs/svgSub`, which `card-svg.ts` duplicates;
  - `home.list.count/bandName`, `proof.*` except `cleanTip`, `page.menu.*` and `page.ownerChanged`;
  - `wallet.incoming/retry/zero`, `fund.share` and `fund.incoming.confirming`;
  - `send.form.amount`, `send.recipient.satchel`, `send.val.dust/btcNetwork` and `send.guard.broadcast/unsupported`;
  - `act.today/yesterday/more`, `act.row.notSent/notSigned/received`, `act.status.notSent/failed` and `act.detail.status/type/amount/from`;
  - `buy.excluded/have/short`, `market.sort/newest/price/tryAgain`, `errors.E2/E11/E37/getNear` and `empty.glyphAlt`.

### 2.3 Tests to update with the strings

- **Unit (`config-copy-theme.test.ts`):**
  - the pill `arrayContaining`: "Listed" → "Paused for sale";
  - `errorCopy("ERR_FROZEN")`: "paused while Satchel #3 is listed" → "…is for sale";
  - the landing pins: `hero.lead` (both variants), `anim.alt`, `desk.paused` and `desk.settled`, `uses.lead`, `uses.items[1]`, `how.steps` (both variants), `cta.body`, and the `q-after` regex, which becomes `^No\. A Satchel that's for sale can't sign anything new`;
  - the word budgets in §3.9;
  - `home.h1` only if Razvan changes D-41;
  - add `landing.what` to the "generic and simulated" list.
- **E2E:**
  - `flows.spec`: `#freeze` "Signing paused while listed" → "Paused while it's for sale"; the action row "Signing is paused while listed." → "Sending and giving are paused while it's for sale.";
  - `judge.spec`: the card SVG "Listed" → "Paused for sale";
  - the landing specs read copy keys, so they follow the deck. Add the What band to the anchor and section checks if it gets an anchor.

### 2.4 Spec text to update (the orchestrator decides)

kb/80 §Copy deck:
- **One verb per action** becomes Give → Giving… → Given; List for sale → Listing… → Listed (state: Paused for sale);
  Stop selling → Stopping sale… → Stopped selling; and **Add coins** (never Receive or Deposit).
- **The pill set** becomes Active · Signing · Paused for sale · Sold · Needs attention. This reverses R3's "For sale → Listed" retirement, which followed the old brand's pill set.
- **The clean-history labels** become Used · Confirming · Not its coin. They then differ from the label column of kb/90 §7.3.

## 3. The landing in the 2.0 voice (simulated and generic, D-42)

Every string below names no Satchel number, account or time and uses straight apostrophes (the test's "generic" rule).
Wherever it names chains it has a `sol` variant: ", Ethereum and Solana" adds one word.

### 3.1 Hero: three H1 candidates (`home.h1` + `landing.hero.lead(sol)`)

| Option | H1 | Supporting line (the pain in plain words) | Words: H1 + line + CTAs |
|---|---|---|---|
| A · keep D-41 | A wallet you can sell, with a history the buyer can check. | Sellers can keep a copy of a wallet's seed phrase. A Satchel has none: it's an NFT on NEAR holding Bitcoin and Ethereum, and the buyer's browser checks no old signature can move them. | 12 + 34 + 8 = 54 |
| B · the brand board | Stick it on. Hand it over. | Sellers can keep a copy of a wallet's seed phrase. A Satchel has none: it's an NFT on NEAR holding Bitcoin and Ethereum. Give it or sell it, and a buyer's browser checks no old signature can move them. | 6 + 39 + 8 = 53 |
| **C · new (recommended)** | **Sell a wallet with everything inside. The buyer checks it first.** | The same line as A. | 11 + 34 + 8 = 53 |

**CTAs, for every option, keep:** **Look inside a Satchel**, the screen's one coral fill (→ `/s/1`); **See Satchels
for sale** (→ `/market`); the header's "Connect NEAR wallet". Testers picked "Look inside" first because it shows "a
real example without connecting".

**Why C:**
- **It keeps D-41's positioning** (the outcome, plus the one thing only Satchel does) and says it in the 2.0 voice: a verb first, the brand's "everything inside", and two short sentences like the board's headline.
- **It drops "history"**, the word both v4 testers stumbled on ("a history of what?"). The line underneath then says exactly what the buyer's browser checks.
- **The line states the pain as a pain.** In the v4 final run, the stated pain raised "problem" from 1 to 2. It also closes the gap the testers named ("it never says that a Satchel has no keys to copy") with "A Satchel has none".
- **A is the safe keep.** The same line works under it.
- **B is the most on-brand, but its H1 says neither what Satchel is nor why.** At display size it would spend the hero on a slogan. Give B a home instead: the final CTA heading (§3.8), the OG image and the PWA splash.

**Who line** (optional, NEW `landing.hero.who`): "For selling BTC and ETH together, gifting a funded wallet or handing over a project wallet."
- In the v4 final run, the hero lost its last point on "who".
- I don't recommend the line: it adds 16 words to a 53-word hero, and the What and Use cases bands say it on the next scroll.

**Hero loop** (`landing.hero.anim`, `landing.desk`):
- **Keep** the 12 words of captions ("Bitcoin and Ethereum inside" · "Seller lists it" · "Buyer checks first" · "Coins included"), plus `pause`, `checking` and `paid`.
- **`anim.alt`:** "Illustration: a Satchel holds 0.05 BTC and 0.80 ETH. Its seller lists it for 300 NEAR, and signing pauses. The buyer's browser checks its 3 past signatures: none can move the coins, so Buy turns on. One transaction moves the Satchel to the buyer and pays the seller, and the coins go with it."
- **`desk.paused`** "Signing paused" → **"No new signatures"**: the pill above it now says "Paused for sale", and testers found "Signing paused" too brief. Check the width: v4's "Can't sign while listed" overflowed at 600–1440 px.
- **`desk.settled`** "Settled" → **"Used"**.
- Keep the other desk labels. The desk's pills now read Active → Paused for sale → Sold.

### 3.2 What it is (NEW `landing.what`, right after the hero): 41 words (42 with Solana)

- `h2`: **One NFT. Its own addresses.**
- `body(sol)`: **Each Satchel has its own Bitcoin and Ethereum addresses, on their own chains: no bridge, no wrapped tokens. Only the NFT's owner can send the coins, and when it changes hands, everything inside goes with it.**
- Why: it answers the testers' "real or wrapped, and who can move it?". Sources: kb/90 §1.1 and §2 (native coins);
  INV-01 and §5.8 step 1 (owner-only signing; the same claim as `verify.guarantee`).

### 3.3 Use cases (`landing.uses`): 50 words

- **`h2`: keep** "Sending coins is easy. Handing over a wallet isn't." The skim test remembered it.
- **`lead`:** "Seed phrases can be copied." → **"One NFT, one step."** The hero line now carries the seed-phrase pain.
- **`items`:**
  - keep "Sell BTC and ETH together" / "One trade, paid in NEAR. Neither side sends first.";
  - "Give a funded wallet" / **"To a friend's account. Gifts skip the buyer's check."** (was "One transfer. …");
  - keep "Hand over a project wallet" / "Same addresses. Payments keep coming.".
- **`tags`:** keep.
- Sources: kb/90 §5.12 and D-14 (one transaction; risky claim 7); H-26 (NEAR, not USDC); risky claim 13 (gifts aren't
  checked); risky claims 5 and 12.

### 3.4 How it works (`landing.how`): 47 words (48 with Solana)

- **`h2`:** "Whoever owns the NFT controls the coins" → **"Mint it. Add coins. Hand it over."** The What band now carries the ownership line. This keeps the board's rhythm with the product's verbs.
- **`steps(sol)`:**
  1. **Mint a Satchel**: "Anyone can add coins to its Bitcoin and Ethereum addresses." (was "Mint and fund" / "Get … addresses anyone can fund.")
  2. **Send without a seed phrase**: "Approve in your NEAR wallet. Signing usually takes about 10 seconds." (was "Spend without a seed phrase"; kb/90 §8.9: p50 6.7 s, max 12.8 s)
  3. **Give it or sell it**: "The new owner gets everything inside." (was "Hand it over" / "Sell or give the NFT, and the coins go with it.")

### 3.5 The catch and clean history (`landing.clean`): keep every string (50 words)

- Keep the `h2` "A signature can outlive a sale" and the five beats ("A seller signs a transfer and keeps it." … "Buy turns on only when no old signature can move the coins.").
- Keep `labels`, `alt` and `stepsLabel`.
- They're already 2.0: short and concrete, and they name the browser, not the contract (risky claim 2). Only the shared desk labels change (§3.1).

### 3.6 Trust (`landing.lock`, `landing.hood`): 49 words, keep

- **Keep `lock` as it is:** "No admin key. Not even ours." / "Satchel's contract was born without a key and can't be upgraded. Nobody can add one or change its code, us included." / "What you still trust: NEAR's signer network, which makes every signature. Satchel is new and hasn't been audited." / "See the contract facts". It holds only for rc and final; keep the `dev` twin.
- **`hood.rules` rule 3 body:** **"A Satchel can be listed only after 250 blocks (about 2 min 20 s) without signing. While it's for sale, it can't sign, and only a purchase can move it."** Sources: kb/90 §5.7, §5.11, INV-13.
- Keep the other five rules, the summary and the links.

### 3.7 Questions (`landing.questions`): keep all seven questions (39 words while closed)

- **`q-after`:** **"No. A Satchel that's for sale can't sign anything new, and your purchase names the listing and signature count your browser checked. If either changed, it fails and you're refunded."** (30 words; INV-13, INV-14, INV-16).
- **`q-cost`:** the last sentence becomes **"Giving one away costs only NEAR gas, and Satchel charges no fee on sales."** (46 words in all).
- Keep `q-send` (T), `q-keys`, `q-proves` (the D-42 disclosure, T), `q-chains` (four variants), `q-testnet` and `keysDev`.

### 3.8 Final CTA (`landing.cta`): 34 words

- **`h2`:** "Try it on testnet" → **"Stick it on. Hand it over."** This is the brand line's home as the page's sign-off, once the page has explained the product. Keep "Try it on testnet" if Razvan picks B for the H1.
- **`body`:** "You don't need a wallet to look around. To mint your own, connect a NEAR testnet wallet." → **"Look around without a wallet. To mint your own, connect a NEAR testnet wallet."**
- **Keep the buttons** "Look inside a Satchel" (coral) and "Mint a Satchel", and the note "Testnet only. Coins here have no value.".
- **`meta.description(sol)`:** **"An NFT on NEAR testnet with its own Bitcoin and Ethereum addresses. Give it or sell it, and everything inside goes too; a buyer's browser checks every past signature first."**
- **Keep** `meta.title` (T) and `ogAlt` (T: it must equal `opengraph-image.alt.txt`, so change both together if the 2.0 OG image carries another line).

### 3.9 Word budgets (visible words, as the test counts them)

| Hero (C/A/B) | Captions | What (NEW) | Uses | How | Catch | Trust | Hood (closed) | **Above Questions** | Questions (closed) | Final CTA |
|---|---|---|---|---|---|---|---|---|---|---|
| 53 / 54 / 53 | 12 | 41 | 50 | 47 | 50 | 49 | 12 | **314** (cap 320) | 39 | 34 |

## 4. Corrections of brand sample copy

| Brand sample (where) | Use instead | Source |
|---|---|---|
| "An NFT that is a wallet on every chain" (DS README); "One NFT. Every chain inside." (In context, welcome) | "An NFT that is a wallet." / "One NFT. Bitcoin and Ethereum inside." Add Solana only when `SOL_UI_ENABLED` | D-37, D-40, kb/90 §5.9. The manifest test bans "every chain" |
| "real Bitcoin, Ethereum and Solana" (README; Main sub) | "its own Bitcoin and Ethereum addresses", with "Testnet only. Coins here have no value." always visible. Never "real": it reads as real money | kb/90 §4 T7 |
| "$4,812.40", "≈ $2,903.00" rows, "about $4,812" (Colour and type, In context); "fiat to 2" (README) | No fiat anywhere. The card hero reads "{n} chains" with native chips, and the Give sheet lists native amounts | D-37 UX-1. The test bans "$" followed by a digit |
| "Safe to buy in about 2 minutes" (README, in the **Say** column) | Never. A Satchel is buyable as soon as it's listed. The only wait is the seller's quiet period **before** listing: "You can list in {n} blocks (~{t})", 250 blocks ≈ 2 min 20 s | D-05 rev 2; kb/90 §5.7, §8.9. The test bans it |
| "Usually under a minute." (README waiting copy) | "Usually about 10 seconds.", then the 20, 60 and 150 s lines, the last "up to about 2 minutes" | kb/90 §8.6, §8.9 |
| "Frozen while listed or in cooldown"; README state row "For sale, signing → Paused for sale" | "Paused while it's for sale", one state with no cooldown. The pill reads "Paused for sale" | D-05 rev 2. The test bans "cooldown" |
| "The signer network didn't answer in time. Nothing was sent. Try again." (README errors) | Keep the honest set: "The signer network did not return a signature. Nothing was sent." + "If a signature still turns up, Clean history lists it as Unused until it can't be used." + the per-chain retry line | kb/70 F16; kb/90 §8.6 |
| "Network fee ~0.00002 BTC" (README) | Bitcoin fees in sats: "Network fee ~282 sats" | kb/80 §Formatting; kb/90 §8.9 |
| "Mint a Satchel, fill it with Bitcoin, Ethereum and Solana, and give it to anyone in one tap." (welcome) | "Mint a Satchel, add Bitcoin and Ethereum, and give it to a friend's NEAR account." A gift takes an account check, a review and a wallet approval, and the contract refuses three receivers | kb/90 §5.11; D-40 |
| "Give it to bob.near" (Night Give sheet) | "Give it to {account}" with a testnet account (placeholder "name.testnet"). The landing names no accounts | T7; D-42 |
| "Clean history: no unused signatures" on the Give sheet | Leave it off: gifts aren't checked, and the Give flow doesn't run the checker. Keep "The signature history stays with the Satchel." | Risky claim 13; kb/70 Threat (a) |
| README state row "Active, sent → Sent" | "Sent" ends a send. The Satchel states are Active · Signing · Paused for sale · Sold · Needs attention, and flows end in Given or Bought | kb/90 §5.10 |
| "Whoever holds the Satchel holds everything inside." (Main) | Fine as the brand idea. In product copy, "owner" is the noun: "Only the NFT's owner can send the coins", "{account} gets everything inside" | INV-01 |
| "Total inside" over one big number (In context card) | The band carries the name and the charm, and the hero reads "{n} chains". Totals across chains need prices, and there are none | D-37 |
| SOL chips and rows on every sample ("SOL 12.4") | Only when `SOL_UI_ENABLED` (off today). The contract can still sign SOL; `q-chains` says so | D-40; kb/90 §5.9 |

## 5. Risky claims checked

1. **"A Satchel has no keys to copy."** Softened to "has none", meaning no seed phrase. The key exists as threshold shares in NEAR's signer network (v4 risky claim 15; kb/90 §4 T1).
2. **"Give it to anyone in one tap"** (the board). It became "a friend's account". A gift takes an account check, a review and a wallet approval. Receivers must exist, and the contract refuses itself, the signer network and USDC (kb/90 §5.11).
3. **"Given to {account}" on every Activity transfer row.** Rejected: live data maps a sale's internal transfer to the same row (`server.ts`), so the row says "Handed over to".
4. **The board's clean-history line on the Give sheet.** Not adopted. Gifts aren't checked (risky claim 13), and adding a check would be an unbuilt feature.
5. **"Only the NFT's owner can send the coins"** (What band). This is INV-01 and kb/90 §5.8 step 1, the same claim as the approved `verify.guarantee`. The Trust band right below names what you still trust. Not "nobody else can ever sign" (risky claim 14).
6. **"Signing takes about 10 seconds."** Kept as "usually about 10 seconds": p50 6.7 s, max 12.8 s, timeout ≈ 2 min (kb/90 §8.9; risky claim 16).
7. **"One step" / "Neither side sends first."** A gift is one `nft_transfer`. A sale is one `buy` whose payout is a detached receipt of the same transaction, escrowed if it fails (kb/90 §5.12, D-14; risky claim 7).
8. **"Anyone can buy it … right away."** True: no post-listing wait, and a clean browser check can buy in the next block (kb/90 §5.12; D-05 rev 2).
9. **"Used" for a dead EVM record.** A replacement transaction can use the nonce instead of the recorded one. The label therefore names the nonce or coin being used, as the evidence lines do ("Nonce {n} used", "Spent in {txid}"). It never says "this signature was sent".
10. **"Addresses go wherever the NFT goes."** They depend only on the contract id and the path, so they survive transfers (kb/90 §1.1). It doesn't claim they "never change" (risky claim 5: a new keygen or contract would change them).
11. **"Stopping is instant."** `delist` takes effect in its own transaction, and signing resumes immediately (kb/90 §5.6).
12. **"Sending and giving are paused while it's for sale."** `sign_for` panics with `ERR_FROZEN` and `nft_transfer` with `ERR_LISTED`. Adding coins still works, since anyone can pay the addresses (kb/90 §5.7–5.8).
13. **"While it's for sale … only a purchase can move it"** (hood rule 3). True while listed: `nft_transfer` is refused, and `buy` and `ft_on_transfer` are the only owner changes. The seller can stop selling, then give it (kb/90 §5.11).
14. **"Real Bitcoin and Ethereum."** Replaced by "on their own chains: no bridge, no wrapped tokens", plus the visible testnet note (kb/90 §2, T7).
15. **"Teams handing over a treasury"** (who line). Kept as "a project wallet": a Satchel has one NEAR owner, and multisig or DAO ownership is untested (risky claim 12).
16. **"Your NEAR account is your backup"**, which would answer the testers' "no seed phrase, so how do I back up?". Not added. It's true in substance: whoever controls the owning NEAR account controls its Satchels. But no spec phrases it, so leave it for a reviewed question.
17. **"Everything inside goes with it" for gifts.** True for control of the addresses. An unused old signature could still move coins after a gift, so "Gifts skip the buyer's check" and the D-08 soft guard stay.
18. **"The buyer checks it first"** (H1 C). It's the buyer's browser that checks; the line says so and never names the contract (risky claim 2).
19. **"About 0.004 NEAR per signature."** Still an estimate: the record size is `[ASSUMED]` until SAT-012 measures it, so the copy keeps "about".
20. **"No fee on sales."** Today's fact only (`sell.form.feeNone`); the README lists a possible future fee.
