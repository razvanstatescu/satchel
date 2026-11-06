# Satchel: search-demand research for landing pages

Date of collection: **2026-11-06**. Scope: which dedicated pages on usesatchel.xyz could rank in search or be cited by
AI answers, based on evidence collected on that date. Research only: nothing in the app was changed.

Evidence tags used below:
- **[G]**, **[B]**, **[D]**: the query (or a listed variant) appeared in Google, Bing or DuckDuckGo autocomplete.
  Google is the main signal; DuckDuckGo mostly repeats Bing.
- **[G-exp N]**: Google alphabet expansion (`<query> a` … `<query> z`) returned N unique suggestions. This is a
  measure of depth, and some suggestions are off-topic (noted where it matters).
- **[none]**: no engine suggested anything for the query or its close variants.
- **[SERP]**: what web search returned for the query (URLs listed).
- **Confidence**: High / Medium / Low, for the claim that the page can earn traffic or citations *and* that Satchel
  can honestly back it.

---

## 1. Method and its limits

**What worked**
- Google autocomplete (`suggestqueries.google.com`, `client=firefox`, `hl=en`): about 290 seed queries, plus
  alphabet expansions on 13 core terms.
- Bing (`api.bing.com/osjson.aspx`) and DuckDuckGo (`duckduckgo.com/ac`) autocomplete on the same seeds, as a cross-check.
  Both often fall back to loosely related generic queries ("how to buy a crypto wallet") when they have nothing
  specific. Those fallbacks are **not** counted as hits.
- Web search for SERP analysis: about 25 queries, each recorded with who ranks and what kind of content wins.

**What did not work**
- **Google Trends** returned HTTP 429 for both the API and the explore page, so there are **no volume numbers** in
  this document. No other free tool that gives volumes was reachable without a login or captcha. **Every ranking
  below uses autocomplete presence and depth as a proxy for demand.** If autocomplete suggests a query, enough people
  search it for Google to keep it. It says nothing about absolute volume, so "high" here means "many distinct
  autocompleted variants on more than one engine", not a monthly number.
- The SERP tool returns ranked links and a summary, not Google's "People also ask" box. The FAQ questions in §3 come
  from question-form autocomplete and from the question headings of pages that rank.
- Reddit could not be searched directly. Reddit evidence comes from third-party snapshots and articles that quote threads.

**Product constraints applied to every recommendation**
- Satchel runs on **NEAR testnet** (BTC testnet4, Sepolia plus the Base, Arbitrum and OP Sepolia testnets, Solana devnet).
  Any page whose query implies real money (selling, gifting or buying a wallet with funds, OTC, native BTC) must
  present the design and the testnet demo, and must not imply that real coins can be moved today. Each such row is
  marked **MAINNET FLAG**.
- Give by link: the recipient does **not** need a NEAR account when the link is made, but they **must connect a NEAR
  wallet to claim**. The link is a bearer secret: anyone holding it can claim, the giver included, and it cannot be
  cancelled (`docs/design/site-refresh/facts.md` §1.5).
- "No seed phrase" is true only for the Satchel's Bitcoin, Ethereum and Solana addresses. The owner still signs in with
  a NEAR wallet, which has its own key or passkey.
- "Keyless" in Satchel's docs means **the contract account has no access key**. In search it means MPC
  wallets from exchanges (Binance, Bybit, OKX, Bitget). The two must not be confused (see §5).

---

## 2. Ranked candidate pages

Ranking = demand evidence × fit with what Satchel really does × chance to rank or be cited × honesty of the claim.
The slugs are suggestions. Existing routes that must not be reused: `/`, `/questions`, `/market`, `/contract`,
`/mint`, `/satchels`, `/claim`, `/s/*`.

### Summary

| # | Slug | Primary query | Demand evidence | Competition | Confidence |
|---|---|---|---|---|---|
| 1 | `/sell-a-crypto-wallet` | can you sell a crypto wallet | [G][B][D], G-exp 73 (mostly cash-out intent) | Weak on the true intent | **High** demand, Medium intent fit |
| 2 | `/gift-crypto` | how to gift crypto to someone without a wallet | [G], G-exp 89, seasonal (Christmas) | Strong (finance publishers) | **High** demand, Medium winnability |
| 3 | `/erc-6551` | erc 6551 / token bound account | [G][B][D] exact, G-exp 5 on-topic | Medium (explainers) | **Medium-High** |
| 4 | `/buy-a-crypto-wallet` | crypto wallet with balance / crypto wallet for sale | [G][B][D], many variants | Weak (scam pages, a few security blogs) | **Medium** |
| 5 | `/transfer-a-crypto-wallet` | can i give my crypto wallet to someone else | [G] exact | Weak, fragmented | **Medium** |
| 6 | `/clean-history` | how to check a crypto wallet before buying (no exact demand) | [G] for neighbours only | Almost none | **Medium** (citation value, low search) |
| 7 | `/chain-signatures` | near chain signatures | [G] exact, G-exp 0 | NEAR docs dominate | **Medium** |
| 8 | `/nft-wallet` | nft that is a wallet / nft wallet meaning | Head term huge but wrong intent | Strong, wrong-intent | **Low-Medium** |
| 9 | `/crypto-escrow-alternative` | crypto escrow / p2p crypto escrow | [G][B][D], G-exp 43 | Strong | **Low-Medium** |
| 10 | `/native-bitcoin` | wrapped bitcoin vs bitcoin | [G] several | Strong | **Low-Medium** |
| 11 | `/mpc-wallet` | what is an mpc wallet / multisig vs mpc wallet | [G][B][D], G-exp 76 | Very strong (B2B vendors) | **Low** |
| 12 | (optimise `/market`) | near nft marketplace | [G] 6 variants | Stale SERP | **Medium** for metadata work, no new page |

### Detail

#### 1. `/sell-a-crypto-wallet`. Page type: explainer with a "how it works" section and a demo CTA. **MAINNET FLAG**
- **Primary query:** `can you sell a crypto wallet`
- **Secondary:** `sell my crypto wallet`, `sell your crypto wallet`, `how to sell crypto wallet`, `sell old crypto wallets`,
  `selling crypto wallet`, `how to sell crypto wallet to a trust`, `sell bitcoin wallet`
- **Intent:** mixed. Most of the `sell crypto wallet` expansions mean "cash out crypto *from* a wallet"
  (`sell crypto trust wallet`, `can you sell crypto on phantom wallet` ×10 brands). The exact question `can you sell
  a crypto wallet` and `sell my/your crypto wallet` / `sell old crypto wallets` match Satchel's intent: selling the
  wallet itself.
- **Evidence:** [G] `can you sell a crypto wallet` (exact, top suggestion for `can you sell a wallet`); [G-exp 73] for
  `sell crypto wallet`; [B][D] `crypto wallet for sale`.
  [SERP] for "can you sell a crypto wallet with the coins in it": Ledger Academy
  (https://www.ledger.com/academy/topics/ledgersolutions/a-complete-guide-to-selling-crypto-with-ledger-live), the Trust
  Wallet community (https://community.trustwallet.com/t/how-to-sell-a-crypto-in-trustwallet/170784), Ramp support, and
  an M&A page about selling a wallet *business* (https://www.acquiry.com/intelligence/sell-crypto-wallet-business/). The
  summary answer was literally "You generally can't sell a wallet with its coins as a package… Some people also share
  the recovery phrase".
- **Competition:** none on the real intent. Every result answers a different question (cashing out, hardware
  resale, business M&A).
- **Content gap:** nobody explains *why* a wallet can't be sold (the seller can keep a copy of the seed) or what a safe
  sale would need. Satchel's README makes exactly this argument ("A wallet's keys cannot be sold safely: whoever held the
  seed phrase can keep a copy").
- **Angle:** "Can you sell a crypto wallet? Not safely, unless the keys can't be copied." Answer the question in the
  first paragraph (no, not by sharing the seed), then explain the old-signature hole, then how a Satchel sale works:
  listing freezes signing, the buyer's browser checks every past signature, and the trade settles atomically. End with
  "try it on testnet".
- **Honesty notes:** say testnet up front. Don't promise real-money sales. Don't cover tax.
- **Confidence:** demand **High**, intent fit **Medium**: expect to win the exact question and the long tail, not
  the cash-out head terms.

#### 2. `/gift-crypto`. Page type: how-to guide with a comparison table and a demo of give by link. **MAINNET FLAG**
- **Primary query:** `how to gift crypto to someone without a wallet`
- **Secondary:** `how to gift bitcoin to someone without a wallet`, `how to gift a crypto wallet`, `how to gift a bitcoin
  wallet`, `how to gift crypto for christmas`, `how to gift bitcoin for christmas`, `how to gift crypto to a child`,
  `send crypto via link`, `send crypto with link`, `can i send bitcoin to someone without a wallet`
- **Intent:** how-to, high purchase intent, **seasonal**. The many `for christmas` variants mean the window is now
  through December.
- **Evidence:** [G-exp 89] for `how to gift crypto`, and every secondary above is a [G] suggestion. [G] `how to send
  crypto without a wallet`, `send crypto via link`. [B][D] `how to give bitcoin as a gift`, `bitcoin as a gift`.
  [SERP] Bankrate (https://www.bankrate.com/investing/how-to-gift-crypto/), Motley Fool, Experian, Nasdaq, Cointelegraph
  (https://cointelegraph.com/explained/the-easiest-and-safest-methods-for-gifting-crypto-at-christmas-in-2025), Tangem
  (https://tangem.com/tr/learning-hub/post/how-to-gift-crypto/), plus link-gift products: Pancake Gifts
  (https://blog.pancakeswap.finance/articles/Pancake-Gifts), Burner, Argent, Portkey, Robinhood.
- **Competition:** strong for the head terms (finance publishers with high domain authority). The long tail of
  "a crypto wallet" / "without a wallet" is answered only in passing.
- **Content gap:** the ranking guides list gift cards (platform risk), "set up a wallet for them" (the giver knows the
  seed; one source says plainly that it's not best practice to generate keys for someone else), and pre-loaded hardware
  wallets. None offers a **pre-funded, multi-chain wallet the giver can't keep a copy of**. Link-gift products cover one
  chain or one app's tokens; none sends BTC, ETH and SOL in one gift.
- **Angle:** "Give a whole wallet, by link." Compare the options in a table (gift card, set up a wallet, hardware
  wallet, a link from one app, a Satchel), with columns for "giver keeps a copy?", "needs a wallet first?" and "chains".
- **Honesty notes (must appear on the page):** testnet only today. The recipient connects a NEAR wallet to claim. The
  link works like cash in an envelope: whoever has it can claim, the giver included, until it is claimed. Gifts skip
  the buyer's check.
- **Confidence:** demand **High**, winnability **Medium** (the long tail and AI citations, not "gift crypto").

#### 3. `/erc-6551`. Page type: explainer and comparison ("ERC-6551 vs Satchel")
- **Primary query:** `erc 6551` (and `erc-6551`, `erc6551`)
- **Secondary:** `erc 6551 explained`, `erc 6551 wallet`, `erc 6551 nft`, `what is erc 6551`, `token bound account`,
  `token bound accounts`, `tokenbound`
- **Intent:** informational, from crypto-literate and developer readers.
- **Evidence:** [G][B][D] `erc 6551`, `erc-6551`. [G] `erc 6551 explained | wallet | nft | github | openzeppelin`,
  `what is erc 6551`. [G] `token bound account(s)` exists, but its expansions are all off-topic (Binance "account bound
  token", Kubernetes tokens), so the phrase is niche. [B] Chinese-language expansions of `erc6551` (代币/教程/是什么) show
  some demand in Asia. [none] for `erc 6551 bitcoin`, `erc 6551 solana`, `erc 6551 vs`, `erc 6551 security`.
  [SERP] RareSkills (https://rareskills.io/post/erc-6551), Reddio (https://blog.reddio.com/erc-6551-explained), Blockworks
  (https://blockworks.co/news/erc-6551-nft-wallet), eco.com, Supra, QuickNode tutorials, Tokenbound docs
  (https://docs.tokenbound.org/faq), Monad docs.
- **Competition:** medium. Plenty of explainers, mostly from 2023.
- **Content gap:**
  (a) ERC-6551 accounts live on **one EVM chain**. No ranking page covers an NFT that controls native **Bitcoin and
  Solana** too.
  (b) The **sale front-running problem**: a seller empties the token-bound account in the same block as the sale. The
  EIP discussion declares marketplace-level fraud out of scope (https://ethereum-magicians.org/t/erc-6551-non-fungible-token-bound-accounts/13030?page=2;
  academic write-up https://arxiv.org/pdf/2508.07190). Proposed fixes (nonce in the order, account locking) match
  Satchel's design: freeze while listed, and a buy bound to the checked record count.
- **Angle:** "ERC-6551 gives an NFT an Ethereum account. Satchel gives it Bitcoin, Ethereum and Solana addresses, and a
  history the buyer can check." Answer "what is ERC-6551" fairly in the first section (it is the term people search),
  then compare. Credit ERC-6551 as prior art, as the README already does.
- **Honesty notes:** Satchel is not ERC-6551 and is not on Ethereum. It is a NEAR NEP-171 contract. Don't claim
  compatibility with ERC-6551 tooling.
- **Confidence:** **Medium-High**. The demand is modest but real and searched by name. The comparison angle is
  unique, and AI engines answering "ERC-6551 for Bitcoin?" have nothing better to cite.

#### 4. `/buy-a-crypto-wallet`. Page type: safety explainer ("why wallets 'with balance' are scams, and what a safe purchase needs"). **MAINNET FLAG**
- **Primary query:** `crypto wallet with balance` / `crypto wallet for sale`
- **Secondary:** `buy crypto wallet with balance`, `buy bitcoin wallet with balance`, `verified crypto wallet for sale`,
  `old crypto wallets for sale`, `used crypto wallets for sale`, `old bitcoin wallet for sale`, `seed phrase with
  balance`, `free trust wallet seed phrase with balance`
- **Intent:** mostly people hoping for a bargain or free money, a large share of which is scam bait. A smaller share
  is people who really want to buy someone's funded wallet.
- **Evidence:** [G] `crypto wallet for sale` with expansions `verified …`, `old …`, `used …`, `stolen crypto wallets for
  sale` [G-exp 29]. [G] `wallet with balance` → `trust wallet with balance`, `bitcoin wallet with balance private key`,
  `crypto wallet with balance`, `eth wallet with balance`. [B][D] `seed phrase with balance`, `seed phrase generator with
  balance`, `free trust wallet seed phrase with balance`. All three engines carry this cluster.
  [SERP] Kaspersky "Crypto trap for the greedy" (https://www.kaspersky.com/blog/cryptowallet-seed-phrase-fake-leaks/51607/),
  MetaMask "Rotten seed phrases" (https://medium.com/metamask/rotten-seed-phrases-a-new-scam-targeting-crypto-users-b414f9ef292e),
  PhishFort pre-filled seed (https://phishfort.com/hardware-wallets-the-pre-filled-seed-phrase-scam/), Ryder
  (https://ryder.id/blogs/post/seed-phrase-generator-with-balance-is-a-scam-heres-whats-going-on-behind-that-search).
- **Competition:** low to medium. A few security blogs. Many results for the exact queries are the scam sites themselves.
- **Content gap:** the security blogs say "it's a scam" but never say what a *legitimate* purchase of a funded wallet
  would require (keys nobody else holds, proof no old signature can move the funds, an atomic swap). Satchel's
  clean-history check is that answer.
- **Angle:** "Every 'wallet with balance' for sale has the same flaw: the seller still has the key." List the scam
  patterns, with citations, then the three conditions for a safe purchase, then how a Satchel meets each one.
- **Risks:** the audience includes scam-seekers. The page must lead with safety, never use "free" or "with balance"
  as a promise, and say testnet clearly. Brand risk is moderate. Keep the tone protective.
- **Confidence:** **Medium**. The demand evidence is the strongest of any "buy" query, the SERP is weak, and the gap
  is real. The audience's intent is partly wrong, which caps conversion.

#### 5. `/transfer-a-crypto-wallet`. Page type: how-to ("hand over a wallet, keep the addresses")
- **Primary query:** `can i give my crypto wallet to someone else`
- **Secondary:** `how to transfer a crypto wallet to someone`, `transfer crypto wallet ownership`, `can you transfer a
  crypto wallet`, `how to hand over cryptocurrency`, `can we gift wallet to someone`
- **Intent:** informational. The people asking are handing over a wallet: to family, a co-founder, a project's new
  owner, or a trust.
- **Evidence:** [G] `can i give my crypto wallet to someone else` (exact, top suggestion under `can i give my wallet to
  someone`). [G] `how to sell crypto wallet to a trust`. [none] for `transfer wallet ownership`, `transfer ownership of
  wallet`, `ethereum wallet transfer ownership`, `multisig change owner`. Most `can you transfer a crypto wallet`
  suggestions mean moving coins between wallets.
  [SERP] fragmented: 1Password "How to hand over cryptocurrency" (https://1password.com/blog/how-to-hand-over-cryptocurrency),
  ApprovalMax, Ambire help, Manifold (contract ownership), Ika docs (https://docs.ika.xyz/sdk/ika-transaction/transferring-a-dwallet-share).
  The summary: "a crypto wallet has no 'owner' field".
- **Competition:** low.
- **Content gap:** no page explains handing over a wallet **while its addresses stay the same**, so payments keep
  arriving. For a project wallet this matters. Satchel's site copy already has "Hand over a project wallet. Same
  addresses. Payments keep coming."
- **Angle:** "Hand over a wallet without moving the coins." Cover the three ways people do it today (share the seed,
  move the funds, a custodian's tools) and the Satchel way: transfer the NFT, which clears allowances and moves control
  in the same transaction.
- **Confidence:** **Medium**. One strong exact question, a weak SERP, a clean product fit. This page could merge into
  #1 if the page count must stay small.

#### 6. `/clean-history`. Page type: concept explainer (the headline feature) and the reference page that AI answers cite
- **Primary query:** none with confirmed demand. The nearest real queries are `how to check a crypto wallet history`,
  `check wallet history crypto` and `verify crypto wallet`.
- **Secondary:** `replay attack crypto`, `replay attack bitcoin`, `ethereum nonce`, `erc 6551 front running`
- **Intent:** informational and security-minded.
- **Evidence:** [G] `how to verify a crypto wallet`, `how to check a crypto wallet history`, `check wallet history crypto`,
  but these mean "look up an address's transactions", not "is it safe to buy". [G] `replay attack crypto | bitcoin |
  ethereum`. [none] for `pre-signed transaction`, `presigned transaction bitcoin`, `signature reuse`, `check if
  bitcoin is spent`, `how to verify seller crypto`.
  [SERP] the only related material is the ERC-6551 front-running discussion (see #3) and an article calling ERC-6551's
  account model "a double-edged sword for security" (https://www.chainscorelabs.com/blog/nft-market-cycles-art-utility-and-culture/smart-contract-security-and-standards/why-erc-6551s-account-abstraction-is-a-double-edged-sword-for-security).
- **Competition:** almost none. The concept is new.
- **Content gap:** total. No page explains that a signature made before a sale can be broadcast after it, or how a
  buyer can rule that out.
- **Angle:** define the term ("clean history: proof that no signature made before you bought can still move the
  coins"), with the three per-chain checks (EVM nonce used, BTC outpoint spent, SOL blockhash expired) and the demo
  token #4 that is blocked on purpose. Link to it from #1, #3 and #4.
- **Confidence:** **Medium**. Search traffic will be near zero. The value is in owning the term, giving AI engines
  a page to cite, and linking from the pages that do get search traffic.

#### 7. `/chain-signatures`. Page type: case study ("Chain Signatures in practice: an NFT that signs on three chains")
- **Primary query:** `near chain signatures`
- **Secondary:** `chain signatures near`, `near chain abstraction`, `near protocol chain abstraction`, `chain abstraction
  wallet`, `chain abstraction meaning`, `what is chain abstraction in crypto`
- **Intent:** developers and people in the NEAR ecosystem, plus a general "what is chain abstraction" audience.
- **Evidence:** [G] `near chain signatures`, `chain signatures near`, `near chain abstraction`. [G-exp 0] for
  `near chain signatures`, so the demand is shallow. [G] `chain abstraction` [G-exp 23]: `meaning`, `in crypto`,
  `projects`, `wallet`, `sdk`, `protocol`. [none] for `chain signatures explained`, `what are chain signatures`.
  [SERP] docs.near.org dominates (https://docs.near.org/chain-abstraction/chain-signatures). For chain abstraction:
  Safe, MoonPay, the Trust Wallet glossary, Backpack Learn, The Block.
- **Competition:** Satchel can't outrank NEAR's docs for the head term.
- **Content gap:** the docs explain derivation paths and the MPC flow but show no product where *an NFT owns the
  derivation path*. One SERP summary said so in as many words ("the results don't say whether an NFT itself holds the
  derived addresses").
- **Angle:** a worked example: `satchel/{id}/{btc|evm|sol}` paths, a structured payload rather than a raw hash, the record
  written before the MPC call. Written for developers, it can earn links from the NEAR ecosystem and AI citations for
  "chain signatures example".
- **Confidence:** **Medium**. Low volume, and the audience is reachable mostly through links rather than search. It also helps judges.

#### 8. `/nft-wallet`. Page type: category definition ("An NFT that is a wallet, not a wallet for NFTs")
- **Primary query:** `nft wallet meaning` / `what is nft wallet`
- **Secondary:** `wallet nft`, `nft account`, `nft account meaning`, `nft as a wallet`, `nft that is a wallet`
- **Intent:** the head term `nft wallet` [G-exp 118] means "an app to store NFTs" (Coinbase, Phantom, Trust Wallet,
  MetaMask, "best nft wallet"). That is the wrong intent for Satchel. `nft wallet meaning` and `nft account meaning`
  are ambiguous, informational queries.
- **Evidence:** [G] `nft wallet meaning`, `what is nft wallet`, `nft account meaning`. [none] for `nft that is a wallet`,
  `nft that holds crypto`, `nft own wallet`, `can an nft hold crypto`, `nft with crypto inside`, `nft that owns other
  nfts`. [SERP] "what is an nft wallet": Bitget, ClearTax, Dapper, Freename, all about wallets *for* NFTs.
- **Competition:** strong, and with the wrong intent.
- **Content gap:** the phrase Satchel uses ("an NFT that is a wallet") has no search demand. People who want the
  concept search `erc 6551` or `token bound account` instead.
- **Angle:** keep it as a short definitional page to anchor the brand phrase, and link it to #3. Don't expect it to
  rank for `nft wallet`.
- **Confidence:** **Low-Medium**. Useful for brand and AI definition queries, weak for search.

#### 9. `/crypto-escrow-alternative`. Page type: comparison ("sell BTC, ETH and SOL in one trade, with no escrow agent"). **MAINNET FLAG**
- **Primary query:** `crypto escrow`
- **Secondary:** `p2p crypto escrow`, `crypto otc escrow`, `bitcoin escrow`, `how does crypto escrow work`, `is crypto
  escrow safe`, `crypto escrow scam`, `crypto escrow smart contracts`
- **Intent:** people looking for an escrow service for a P2P or OTC deal.
- **Evidence:** [G][B][D] `crypto escrow`, [G-exp 43]. [G] `bitcoin escrow | services | wallet`, `p2p crypto escrow`.
  [B][D] `crypto escrow smart contracts`. [SERP] Hodl Hodl, Bisq, RoboSats (via the Spark comparison,
  https://www.spark.money/tools/bitcoin-escrow-service-comparison), the Bitcoin Wiki on secure trading, Cointelegraph.
- **Competition:** strong and established. The intent is mostly fiat-for-BTC trading, which Satchel doesn't do (a
  Satchel sells for NEAR or USDC).
- **Content gap:** none of these sells a *bundle* of BTC, ETH and SOL in one atomic trade. That is narrow, though.
- **Angle:** "No escrow needed: the buyer pays and gets the wallet in the same transaction." Honest scope: NEAR or USDC
  payment, testnet.
- **Confidence:** **Low-Medium**. Real demand with a poor intent match. Build it later, if at all.

#### 10. `/native-bitcoin`. Page type: comparison explainer ("Native BTC vs wrapped BTC"). **MAINNET FLAG**
- **Primary query:** `wrapped bitcoin vs bitcoin`
- **Secondary:** `what is the difference between bitcoin and wrapped bitcoin`, `is wbtc safe`, `cbbtc vs wbtc`, `native
  bitcoin wallet`, `bitcoin native defi`
- **Evidence:** [G] for every term above. [none] for `bitcoin without bridge`, `use bitcoin without wrapping`, `wrapped
  bitcoin risks`, `nft that holds bitcoin`, `nft backed by bitcoin`. [SERP] Chainflip, dextools, Spark, archlending, Coin
  Metrics and the Aave governance forum (https://blog.chainflip.io/wrapped-bitcoin-vs-native-bitcoin-understanding-the-difference-risks).
- **Competition:** strong (DeFi protocols with their own stake in the answer).
- **Content gap:** "control native BTC from a smart contract without a custodian" is rarely explained in plain terms.
- **Confidence:** **Low-Medium**. Tangential to Satchel's main story. A section inside #3 or #7 may be enough.

#### 11. `/mpc-wallet`. Page type: explainer. **Not recommended now**
- **Primary query:** `what is an mpc wallet`. Secondary: `multisig vs mpc wallet`, `mpc wallet explained`, `mpc keyless
  wallet`, `mpc bitcoin wallet`.
- **Evidence:** [G][B][D], [G-exp 76], dominated by vendor names (Fireblocks, BitGo, Cobo, Zengo, Privy, Turnkey).
  [SERP] Safe, Cobo, Alchemy, Halborn, BitGo, Utila (https://safe.global/blog/mpc-wallet-vs-multisig-what-s-the-difference-).
- **Why low:** B2B intent, vendors with high domain authority, and Satchel's MPC is NEAR's network rather than a
  product feature to sell. An FAQ answer ("Is a Satchel an MPC wallet?") is enough.

#### 12. Optimise `/market` (no new page)
- **Queries:** `near nft marketplace`, `near protocol nft marketplace`, `near blockchain nft marketplace`, `near nft
  marketplace free`, `paras nft`, `mintbase nft`. All [G].
- **SERP:** stale. Articles from 2022–2025, LeewayHertz and Webisoft "how to build" pages, a DappRadar ranking with no data
  (https://dappradar.com/rankings/protocol/near/category/nft-marketplace-general). The search found no 2026 status for
  NEAR marketplaces.
- **Why no new page:** Satchel's market lists only Satchels, not art. A page targeting "NEAR NFT marketplace" would
  overstate it. Give `/market` a precise title and description instead ("Satchels for sale on NEAR: wallets checked
  before you buy") and let it pick up the long tail.
- **Confidence:** **Medium** that metadata work alone earns some impressions.

---

## 3. FAQ-worthy questions (with sources)

Questions people really type or that ranking pages headline. Put each answer in `/questions` or on the matching page,
in the server HTML.

| Question | Source | Best home |
|---|---|---|
| Can you sell a crypto wallet? | [G] exact | #1 |
| Can I give my crypto wallet to someone else? | [G] exact | #5 |
| How do I gift crypto (or bitcoin) to someone without a wallet? | [G] exact, both variants | #2 |
| How do I gift a crypto wallet / a bitcoin wallet? | [G] (`how to gift a crypto wallet`, `how to gift a bitcoin wallet`) | #2 |
| Can I send bitcoin to someone without a wallet? | [G] | #2 |
| Is buying a crypto wallet "with balance" a scam? | [G][B][D] cluster; Kaspersky, MetaMask, PhishFort pages | #4 |
| What is ERC-6551? / What is a token bound account? | [G] `what is erc 6551`, `erc 6551 explained`; RareSkills, Reddio | #3 |
| Can an NFT hold ETH or other tokens? | Answered on every ERC-6551 explainer (eco.com, Supra); no exact autocomplete | #3, #8 |
| What happens to the coins when the NFT is sold? | ERC-6551 explainers ("Transferring the NFT transfers control of the entire account") | #1, #8 |
| Can the seller empty the wallet right before I buy it? | EIP-6551 discussion (front-running case), arxiv 2508.07190 | #6, #3 |
| What are NEAR Chain Signatures? | [G] `near chain signatures`; docs.near.org | #7 |
| What is chain abstraction? | [G] `what is chain abstraction in crypto` | #7 |
| Is a Satchel an MPC wallet? / MPC vs multisig? | [G] `what is an mpc wallet`, `multisig vs mpc wallet` | FAQ only |
| Is a Satchel a "keyless wallet"? | [G] `keyless wallet meaning`, `keyless wallet vs seed phrase` | FAQ only (clarify the meaning) |
| Do I need a seed phrase? | [G] `wallet without seed phrase`, `no seed phrase wallet` | FAQ only (honest: none for BTC/ETH/SOL; NEAR wallet still needed) |
| Is it native bitcoin or wrapped? | [G] `wrapped bitcoin vs bitcoin`, `is wbtc safe` | FAQ, #10 |
| What happens to my crypto when I die? | [G][B][D] exact | **Don't answer as a product claim**; see §4 |
| Can someone steal my crypto with just my wallet address? | [G] (`can someone steal my crypto with just my wallet address`) | FAQ (answer: no. Addresses are public, and so are a Satchel's) |
| Is sending crypto as a gift taxable? | [G] `is sending crypto as a gift taxable` | Link out; Satchel shouldn't give tax advice |

---

## 4. Topics NOT to build pages for

| Topic / queries | Evidence | Why not |
|---|---|---|
| **Crypto inheritance** (`crypto inheritance planning`, `what happens to crypto when you die`, `bitcoin inheritance`, `crypto wallet inheritance`, `dead man's switch crypto`) | Strong: [G][B][D], G-exp 19, several exact questions; SERP Ledger, Casa, Vault12, estate lawyers | **Satchel can't honestly claim it.** There is no dead-man switch or beneficiary feature. An heir still needs the owner's NEAR account or a bearer claim link, which is exactly the problem inheritance services solve. At most, add one FAQ line ("a Satchel moves as one item, but you still need a plan for the NEAR account") |
| **Seedless / keyless wallet** (`seedless wallet`, `keyless wallet`, `wallet without seed phrase`) | Strong: [G] G-exp 49 (keyless), 13 (seedless). The meaning is owned by Binance/Bybit/OKX/Bitget MPC wallets and Tangem cards | **Wrong meaning and a misleading claim.** The owner still uses a NEAR wallet, and Satchel's "keyless" refers to the contract account. Ranking here would invite a "no seed phrase at all" reading |
| **NFT wallet (head term)** (`nft wallet`, `best nft wallet`, `nft wallet app`) | Huge: G-exp 118 | **Wrong intent** (apps for storing NFTs). Handled as a definitional page (#8) that does not target the head |
| **Bitcoin NFTs / Ordinals** (`bitcoin nft`, `bitcoin nft wallet`, `bitcoin ordinals`) | Strong: [G][B][D] | **Wrong intent.** Ordinals are inscriptions on Bitcoin. Satchel is an NFT on NEAR that controls a BTC address. A page would confuse both audiences |
| **"Sell crypto from my wallet / for cash"** (`sell crypto trust wallet`, `can you sell crypto on phantom wallet`…) | Very strong, but this is cash-out intent | **Wrong intent.** These people want an off-ramp |
| **Multi-chain wallet** (`multi chain wallet`, `multichain wallet`) | [G] with depth (tracker, explorer, scanner) | **Wrong intent** (wallet apps and trackers). Satchel is not a general wallet app |
| **Crypto gift cards / red packets** (`crypto gift card`, `crypto red packet code`) | Strong [G][B][D] | **Wrong intent** (retail cards, exchange promo codes) |
| **Aged / airdrop wallets for sale** (`buy aged wallet`, `wallet with history for sale`, `old wallet for airdrop`) | [none] on-topic; "aged wallet" means leather goods | **No demand**, and an ethically doubtful use (Sybil farming) |
| **Atomic swaps / trustless OTC** (`atomic swap bitcoin`, `trustless otc`) | `atomic swap` [G] is mostly about Monero; `trustless otc` [none] | **Wrong intent.** Satchel sells a wallet NFT for NEAR or USDC, not a cross-chain swap |
| **Account abstraction / smart wallets** (`what is account abstraction`, `smart contract wallet`) | [G] | **Can't win and wrong fit.** Ethereum ERC-4337 audience, vendor-owned SERP |
| **Signature-replay security** (`replay attack bitcoin`, `nonce reuse ecdsa`) | [G] (cryptography intent) | **Wrong intent** (crypto-engineering). Used only as a link target from #6 |
| **NEAR NFT marketplace as a new page** | [G] | Would overstate a Satchel-only market. Optimise `/market` instead (#12) |
| **Lit PKP / Ika dWallet comparisons** (`lit protocol pkp`, `ika dwallet`) | [G] exact only; no depth | Tiny demand; a line in #3 is enough |

---

## 5. Terminology: the words people actually use

| Concept | Words people search | Words with no demand | Copy guidance |
|---|---|---|---|
| An NFT that controls an account | **`erc 6551`** (strongest), `token bound account(s)`, `tokenbound` | `nft that is a wallet`, `nft that holds crypto`, `wallet as an nft`, `nft smart wallet`, `nft owns assets` | Keep "an NFT that is a wallet" as the brand line, but put **"ERC-6551"** and **"token bound account"** in headings and the first paragraph of the comparison page. Use "token bound account" (two words, lowercase) as the generic phrase |
| Handing over a wallet | `sell my crypto wallet`, `can you sell a crypto wallet`, `can i give my crypto wallet to someone else`, `hand over cryptocurrency` | `transfer wallet ownership`, `wallet ownership transfer`, `transferable wallet` | Use **"sell a crypto wallet"** and **"give your crypto wallet to someone"**. Avoid "ownership transfer" in headings |
| Gifting | `gift crypto`, `how to gift bitcoin`, **`… to someone without a wallet`**, `how to gift a crypto wallet`, `for christmas`, `to a child`, `send crypto via link` | `gift crypto link`, `crypto stocking stuffer`, `send nft as gift` | Use **"gift"** (not "give") in titles and **"without a wallet"** as the hook, then explain "they connect a NEAR wallet to claim" in the body. "By link" is a real search phrase (`send crypto via link`) |
| Buying a funded wallet | `crypto wallet for sale`, `crypto wallet with balance`, `seed phrase with balance`, `verified crypto wallet for sale` | `buy wallet with assets`, `sell wallet with assets` | Use these phrases only inside a warning framing ("wallets with balance for sale are scams because…") |
| The signing tech | `near chain signatures`, `chain abstraction`, `mpc wallet` | `chain signatures explained`, `threshold signature wallet`, `programmable key pair` | "Chain Signatures" (NEAR's capitalisation) for the NEAR audience. Explain it as "NEAR's signer network (MPC)" for general readers |
| No seed phrase | `wallet without seed phrase`, `seedless wallet`, `no seed phrase wallet` | `keyless crypto wallet` (only as the bare phrase) | Say "**no seed phrase for its Bitcoin, Ethereum and Solana addresses**", never "seedless wallet". Avoid "keyless wallet" in user copy: searchers read it as an exchange MPC wallet. For the contract, prefer "**no admin key**" / "nobody holds a key to the contract" |
| Wrapping | `wrapped bitcoin`, `wbtc`, `cbbtc`, `native bitcoin` | `bitcoin without bridge`, `without wrapping` | "Native bitcoin" is real search language. "No bridge, no wrapping" is fine in the body but won't rank by itself |
| Verifying before buying | `verify crypto wallet`, `check wallet history`, `wallet transaction history` (all mean address lookup) | `clean history`, `old signatures`, `pre-signed transaction`, `signature reuse` | "Clean history" is Satchel's own term, so define it on first use. Pair it with "**check the wallet's history before you buy**", which echoes the real phrase `check wallet history` |
| Escrow / OTC | `crypto escrow`, `p2p crypto escrow`, `bitcoin escrow`, `crypto otc` | `trustless otc`, `bundle crypto sale`, `sell btc eth sol` | If used: "no escrow needed" |

---

## Appendix: raw autocomplete evidence (trimmed)

Collected 2026-11-06. G = Google, B = Bing, D = DuckDuckGo. "—" = no suggestions. Generic fallbacks from Bing and
DuckDuckGo have been removed. Expansion lists keep on-topic items only.

**NFT-as-wallet / ERC-6551**
- `erc 6551`: G: erc 6551 · erc 6551 wallet · erc 6551 explained · erc 6551 github · erc 6551 openzeppelin · erc 6551 nft · erc 6551 是 什么 | B/D: erc 6551
- `erc6551`: B: erc6551代币 · erc6551优势 · erc6551合约 · erc6551实现 · erc6551教程 · erc6551标准 · erc6551是什么
- `what is erc 6551`: G: what is erc 6551
- `token bound account(s)`, `tokenbound`, `tokenbound account`: G: token bound account(s) · tokenbound (expansions all off-topic) | B/D: —
- `erc 6551 vs`, `erc 6551 bitcoin`, `erc 6551 solana`, `erc 6551 security`, `erc 6551 marketplace`, `erc 6551 projects`, `erc 6551 use cases`: —
- `nft that holds crypto`, `nft that is a wallet`, `nft that owns`, `nft own wallet`, `can an nft hold crypto`, `nft smart wallet`, `nft account abstraction`, `nft owns assets`, `nft that owns other nfts`, `nft with crypto inside`, `nft with eth inside`, `nft ownership transfer`: G: —
- `nft wallet meaning`: G: nft wallet meaning · what is nft wallet
- `nft account`: G: nft account · nft account meaning · nft account create · nft account full form
- `nft wallet` [G-exp 118]: dominated by apps (coinbase/phantom/trust/metamask/ledger/okx/bitget nft wallet), `best nft wallet app`, `nft wallet tracker/viewer/scanner`, `nft wallet meaning`, `wallet btc nft`

**Selling / buying a wallet**
- `can you sell a crypto wallet`: G: can you sell a crypto wallet · can you sell crypto on trust/phantom/tangem/exodus/coinbase/robinhood wallet · can you sell crypto from cold wallet
- `sell crypto wallet` [G-exp 73]: on-topic: sell my crypto wallet · sell your crypto wallet · sell old crypto wallets · how to sell crypto wallet · how to sell crypto wallet to a trust · sell bitcoin wallet. The rest is cash-out (`sell crypto from wallet`, `how to sell crypto on <brand> wallet` ×20+)
- `crypto wallet for sale` [G-exp 29]: crypto wallet for sale · verified crypto wallet for sale · old crypto wallets for sale · used crypto wallets for sale · stolen crypto wallets for sale · crypto cold/hardware/ledger/tangem wallet for sale | B/D: crypto wallet for sale
- `bitcoin wallet for sale`: G: lost bitcoin wallet for sale · old bitcoin wallet for sale · bitcoin cold wallet for sale | B/D: bitcoin wallet for sale
- `wallet with balance`: G: trust wallet with balance · bitcoin wallet with balance private key · crypto wallet with balance · wallet address with balance · eth wallet with balance · solana wallet with balance · wallet dat with balance · wallets with balance selling in iran
- `buy crypto wallet with balance`: G: buy crypto wallet with balance · buy bitcoin wallet with balance · ethereum wallet with balance
- `seed phrase with balance`: G: — | B/D: seed phrase with balance · seed phrase generator with balance · seed phrase generator with balance github · seed phrase balance checker · free trust wallet seed phrase with balance
- `can i give my wallet to someone`: G: **can i give my crypto wallet to someone else** · can i give someone my wallet address · can we gift wallet to someone
- `transfer wallet ownership`, `transfer ownership of wallet`, `how to transfer wallet ownership`, `transfer crypto wallet ownership`, `sell wallet with assets`, `sell private key`, `sell seed phrase`, `transfer seed phrase`, `ethereum wallet transfer ownership`, `multisig change owner`, `can you buy someone's crypto wallet`, `is buying a crypto wallet legal`: G: —
- `seed phrase scam`: G: seed phrase scam reddit

**Gifting**
- `how to gift crypto` [G-exp 89]: on-topic: how to gift crypto to someone · **how to gift crypto to someone without a wallet** · **how to gift a crypto wallet** · **how to gift a bitcoin wallet** · how to gift crypto for christmas · how to gift bitcoin for christmas · how to gift crypto to a child · how to gift bitcoin to a friend · how to gift crypto to spouse · how to give crypto as a gift · how to give away bitcoin · how to gift crypto on coinbase/robinhood · how to gift bitcoin on cash app
- `how to gift bitcoin`: G: how to gift bitcoin to someone without a wallet · how to gift bitcoin to a child · how to gift bitcoin for christmas | B/D: how to gift bitcoin
- `how to send crypto to someone without a wallet`: G: how to send crypto without a wallet · how to send bitcoin without a wallet · can i send bitcoin to someone without a wallet
- `send crypto via link`: G: send crypto via link | `send crypto by link`: G: send crypto payment link · send crypto with link
- `send crypto as a gift`: G: send crypto as a gift · send bitcoin as a gift · is sending crypto as a gift taxable · can i send crypto as a gift
- `gift crypto`: G: gift crypto to family members · gift crypto card · gift crypto tax · gift crypto app
- `crypto gifts for christmas`: G (from `crypto gift for christmas`) | B: bitcoin as a gift · how to give bitcoin as a gift · how to buy bitcoin as a gift
- `crypto wallet for kids`: G: crypto wallet for kids · bitcoin wallet for kids · best crypto wallet for kids | B: crypto wallets for minors
- `gift crypto link`, `crypto stocking stuffer`, `send nft as gift`: G: —

**Chain Signatures / MPC / chain abstraction**
- `near chain signatures`: G: near chain signatures [G-exp 0] | B/D: —
- `chain signatures`: G: chain signatures · chain signatures near
- `near chain abstraction`: G: near chain abstraction · near protocol chain abstraction
- `chain abstraction` [G-exp 23]: chain abstraction meaning · in crypto · projects · protocol · sdk · wallet · bitcoin chain abstraction · cross chain abstraction · near chain abstraction | B/D: chain abstraction
- `what is chain abstraction`: G: what is chain abstraction in crypto · in blockchain
- `mpc wallet` [G-exp 76]: mpc wallet meaning · providers · explained · security · open source · multisig vs mpc wallet · mpc keyless wallet · mpc bitcoin wallet · mpc wallet solana · vendor names (fireblocks, bitgo, cobo, zengo, privy, turnkey, dfns…) | B/D: mpc wallet · mpc wallet meaning
- `what is an mpc wallet`: G: what is an mpc wallet · what is an mpc crypto wallet · what does mpc wallet mean
- `chain signatures explained`, `what are chain signatures`, `near chain signatures tutorial`, `threshold signature wallet`, `near multichain`: —
- `near intents`: G/B/D: rich (explorer, swap, bridge, api), noted for NEAR ecosystem context only

**Keys / seed phrases**
- `keyless wallet` [G-exp 49]: keyless wallet binance · bybit · okx · bitget · ronin · aptos · keyless wallet meaning · keyless wallet vs seed phrase · is keyless wallet safe · mpc keyless wallet (plus car-key noise)
- `seedless wallet` [G-exp 13]: seedless crypto wallet · seedless bitcoin wallet · seedless cold/hardware wallet · tangem seedless wallet · best seedless wallet
- `wallet without seed phrase`: G: tangem wallet without seed phrase · cold wallet without seed phrase · crypto wallet without seed phrase · recover wallet without seed phrase
- `no seed phrase wallet`: G: tangem/trust/coinbase wallet no seed phrase

**Bitcoin**
- `bitcoin nft`: G/B/D: bitcoin nft marketplace · bitcoin nft wallet · bitcoin nfts ordinals (Ordinals intent)
- `native bitcoin`: G: native bitcoin wallet · native bitcoin network (mostly segwit noise)
- `wrapped bitcoin vs bitcoin`: G: wrapped bitcoin vs bitcoin · coinbase wrapped bitcoin vs bitcoin · what is the difference between bitcoin and wrapped bitcoin
- `is wbtc safe`: G: is wbtc safe · is wbtc safe reddit | `cbbtc vs wbtc`: G: cbbtc vs wbtc
- `bitcoin in an nft`, `nft that holds bitcoin`, `nft backed by bitcoin`, `bitcoin without bridge`, `use bitcoin without wrapping`, `wrapped bitcoin risks`, `erc 6551 bitcoin`: G: —

**Inheritance (not recommended, see §4)**
- `crypto inheritance` [G-exp 19]: planning · strategies · tax · service · protocol · crypto wallet inheritance · fidelity crypto inheritance · crypto com inheritance
- `what happens to crypto when you die`: G/B/D: exact, plus uk · bitcoin · crypto wallet variants
- `what happens to bitcoin when owner dies`: G: what happens to bitcoin if the owner dies | B/D: bitcoin transfer on death
- `dead man switch crypto`: G: dead man's switch crypto · dead man switch bitcoin

**Escrow / OTC**
- `crypto escrow` [G-exp 43]: service · wallet · account · companies · platform · reddit · app · meaning · scam · contract · p2p · otc · how does crypto escrow work · is crypto escrow safe | B/D: crypto escrow trading · crypto escrow smart contracts
- `bitcoin escrow`: G: services · companies · account · wallet | B/D: bitcoin escrow service
- `p2p crypto escrow`: G: p2p crypto escrow · bitcoin p2p escrow
- `trustless otc`, `trustless swap`, `sell btc eth sol`, `bundle crypto sale`, `sell multiple cryptos at once`: —

**NEAR NFT market**
- `near nft marketplace`: G: near nft marketplace · free · paras · near protocol nft marketplace · near chain nft marketplace · near blockchain nft marketplace
- `paras nft`: G/B/D: paras nft · paras nft marketplace · paras nft near | `mintbase`: G/B/D: mintbase · mintbase nft
- `near protocol nft`: G: near protocol nft marketplace | B/D: near protocol nft projects

**Verification / signatures**
- `how to verify a crypto wallet`: G: how to verify a crypto wallet (address) · how to check a crypto wallet history · how to verify a bitcoin wallet
- `check wallet history`: G: check wallet history crypto · check bitcoin/eth/solana wallet history
- `replay attack crypto`: G: replay attack cryptography · crypto · blockchain · bitcoin · ethereum
- `pre-signed transaction`, `presigned transaction bitcoin`, `signature reuse`, `check if bitcoin is spent`, `utxo spent check`, `how to verify seller crypto`: —

**Question forms**
- `can someone steal my crypto with my`: G: … with my wallet address · … with just my wallet address · can someone steal my bitcoin if they have my wallet address
- `can an nft`: G: can an nft be copied · be deleted · be a physical object (no "hold crypto" variant)
