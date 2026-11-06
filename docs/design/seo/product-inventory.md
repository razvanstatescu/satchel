# Satchel product inventory for the marketing site (2026-11-06)

> **What this is:** the input for choosing SEO landing pages. It lists every feature and use case, what marketing copy
> may and must not say about each, and where each fact comes from. It reflects `main` at `dce6374`. Specs and code beat
> plans; `kb/90-technical-spec.md` and `docs/specs/*.md` beat everything else on product facts; `brand/` beats everything
> on visual identity.
>
> **Path legend.** **L** `apps/web/src/lib/copy/landing.ts` · **Q** `apps/web/src/lib/copy/questions.ts` · **F**
> `apps/web/src/lib/faq.ts` · **W** `apps/web/src` · **kb90** `kb/90-technical-spec.md` · **kb80** `kb/80-ux-spec.md` ·
> **dec** `plan/decisions.md` · **SR** `docs/design/site-refresh/` (facts.md, rulings.md R1–R9, claims-audit.md) ·
> **SP** `docs/design/site-polish/rulings.md` (P1–P13) · **VC** `docs/design/satchel-2.0/voice-copy.md` (§5 = the
> "risky claims") · **C5** `docs/specs/C5.md` · **C46** `docs/specs/C4-C6.md` · **C7S** `docs/specs/C1-C2-C3-C7.md`.

## 0. Things that change what can be said this week

| Fact | Effect on copy | Source |
|---|---|---|
| The hosted app runs the **development contract** `dev2.satchelhq.testnet` (role `dev`), which has keys and was redeployed in place. The final keyless contract `satchel.satchelhq.testnet` is born on **Nov 10**, and the birth needs Razvan's explicit "yes" (H-15) | "No admin key", "can't be upgraded" and "born without a key" are **false for the live site today**. Copy must follow `lockView(CONTRACT_ROLE)` (`W/lib/lock-facts.ts`), as the landing's Trust band and `q-testnet`/`q-keys` already do | SR R2; dec D-51; SR facts §1.9; AGENTS.md "Status" |
| **H-26 is open until Nov 8 EOD:** if Circle USDC fails the refund test, the final contract is born with `usdc: None`. That removes USDC sale prices, USDC offers and USDC held inside on NEAR. It does **not** affect USDC sends on the four Ethereum networks | On marketing pages, sale and offer currencies say **NEAR only**, and USDC inside on NEAR is not advertised. EVM USDC can be named freely | SR R1; dec D-51 "Rules kept", H-26 |
| **The repo is private** until Day 13 (Nov 13), and making it public needs Razvan's explicit "yes" (H-21) | Don't promote "open source", the repo link or `near contract verify` as live until then. The landing's hood link "The source code and README" 404s for visitors today | CLAUDE.md hard rule 1; L:321 comment; docs/verify.md step 6 |
| **D-52 product framing covers `/` only.** The landing names mainnet networks and keeps one testnet signal: the header badge and its tooltip (plus the phone menu sheet's line). App pages (`/questions`, flows, `/s/*`) stay testnet-explicit | Whether a new SEO page uses product framing (like `/`) or deployment framing (like `/questions`) is **not decided**. That's a ruling for Razvan before any copy is written (see §3.1) | dec D-52; SP P1, P2 |
| `[TBD]` values: the final code hash **H**, the birth tx hash and block A exist only from Nov 10 | Don't quote them. Don't hardcode the final account's lock facts on a static page | README "Try it"; docs/verify.md |

---

## 1. Feature list

Each feature has: what it is · who it's for · the benefit · how it works · the route · the source · its status and
caveats · its SEO potential (H/M/L: a rough guess at how much search demand there is for a page of its own).

### F1. Its own Bitcoin, Ethereum and Solana addresses, per NFT
- **What:** every Satchel NFT has its own native Bitcoin, Ethereum and Solana addresses.
- **For:** anyone who wants one object that holds coins on several chains.
- **Benefit:** real coins on their own chains, with no bridge and no wrapped token, and the addresses stay the same
  whoever owns the NFT.
- **How:** the addresses are NEAR Chain Signatures keys derived for the pair (contract account, path
  `satchel/{id}/{btc|evm|sol}`): secp256k1 for BTC and EVM, ed25519 for SOL. They depend only on the contract and the
  path, so they never change when the NFT changes hands. The app derives them offline, and the buyer's check compares
  them with the signer network's `derived_public_key`.
- **Route:** `/s/{id}` (Wallet tab, server-rendered with the full addresses), `/api/satchels/{id}`.
- **Source:** kb90 §1.1; docs/how-it-works.md "One contract owns every key"; docs/near.md "Chain Signatures"; L `what.body`.
- **Status and caveats:**
  - Bitcoin is P2WPKH only (`tb1q…`; `bc1q…` on the landing per SP P4). No Taproot.
  - Solana: legacy messages only.
  - The Solana UI is on by default; `NEXT_PUBLIC_SOL_UI=off` is the cut switch (D-46).
- **SEO:** H ("NFT wallet", "multichain NFT", "NFT with a Bitcoin address").

### F2. ETH and USDC on Ethereum, Base, Arbitrum and Optimism, at one address
- **What:** the one Ethereum address works on four EVM networks, for ETH and USDC.
- **For:** EVM users and stablecoin holders.
- **Benefit:** one address, four networks, plus a stablecoin.
- **How:** the contract's EVM allowlist is frozen at birth: chain ids 11155111, 84532, 421614 and 11155420 (the Sepolia
  testnets of Ethereum, Base, Arbitrum and OP). It signs only plain ETH transfers and the USDC `transfer(to, amount)`
  call with no ETH attached. A USDC send's fee is paid in that network's ETH. Each signature names its network.
- **Route:** `/s/{id}/send?chain=evm` (network picker), `/s/{id}/receive`.
- **Source:** C7S:24-38, :61-73; SR facts §1.3; L `more.items[3]`, `q-chains`.
- **Status and caveats:**
  - No other ERC-20 tokens and no other EVM chains.
  - Arbitrum Sepolia transfers aren't listed under Transactions yet (Q `q-txs-vs-activity`).
  - Copy says "Optimism", never "OP Mainnet" (D-52).
- **SEO:** M ("USDC NFT wallet", "Base Arbitrum Optimism wallet").

### F3. No seed phrase: a NEAR wallet controls it
- **What:** you control the Satchel's BTC, ETH and SOL from your NEAR wallet. There is no seed phrase to write down.
- **For:** people who don't want to manage keys for several chains.
- **Benefit:** no seed phrase to lose or leak, and no key a seller could keep a copy of.
- **How:** only the contract can ask NEAR's signer network to sign for a token's path, and it asks only for the
  current owner (or someone the owner lets spend). The owner approves `sign_for` in a Meteor or Intear testnet wallet
  (near-connect).
- **Route:** every flow; How it works step 2 on `/`.
- **Source:** docs/selling.md "How control passes"; L `hero.lead`, `how.steps[1]`, `q-keys`; VC §5 claim 1.
- **Caveats:**
  - "Has none" means no seed phrase. The key still exists, as threshold shares in NEAR's signer network, which you
    trust.
  - If the owner loses the NEAR wallet, the Satchel and its coins go with it. There is no admin and no recovery key
    (docs/security-model.md "If something fails").
- **SEO:** H ("wallet without seed phrase", "seedless bitcoin wallet").

### F4. Add coins (anyone can)
- **What:** anyone can send coins to a Satchel's addresses, or add NEAR, USDC or wNEAR inside it.
- **For:** owners funding their own Satchel, and anyone paying, gifting or tipping into one.
- **Benefit:** a shareable address that keeps working after the Satchel changes hands ("Same addresses. Payments keep
  coming").
- **How:** the addresses are derived, so no contract call is needed. The Add coins page shows each chain's address
  with Copy, a QR code and an explorer link. `/fund/{id}` is a shareable "Send coins to Satchel #N" page: pick the
  coin, then the network. Incoming deposits show as pending; "Unconfirmed deposits never count."
- **Route:** `/s/{id}/receive`, `/fund/{id}` (noindex).
- **Source:** docs/how-it-works.md table; W/lib/copy/multichain.ts `fundPage`; VC §1.2 ("Add coins", never
  "Receive"/"Deposit").
- **SEO:** L–M.

### F5. Send BTC, ETH, USDC or SOL
- **What:** send from the Satchel's addresses.
- **For:** owners, and accounts the owner lets spend (F13).
- **Benefit:** a Wise-like review of exactly what will be signed, then signing that usually takes about 10 seconds.
- **How:** the app builds the unsigned transaction (EVM type-2, BTC BIP143 preimages plus outputs, or a SOL message).
  The owner approves `sign_for`. The contract parses the transaction, records it, then asks the signer network. The
  browser attaches the signature, verifies it and broadcasts. A 4-row tracker becomes the receipt. "Signed, not sent"
  can be broadcast again. Fee estimates appear before you confirm (BTC in sats). EVM gas is estimated, never a fixed
  21,000. An optional address book (F24) helps.
- **Route:** `/s/{id}/send?chain=btc|evm|sol`.
- **Source:** docs/how-it-works.md "Sending"; kb90 §5.8, §8.6–8.7; kb80 "SigningProgress"; Q `q-undo`, `q-dust`.
- **Caveats:**
  - Sends can't be undone.
  - Bitcoin has a dust minimum, and a new Solana account needs at least 0.00065024 SOL.
  - Testnet4 confirmations can take minutes to hours.
  - The signer network sometimes times out under load. Nothing is lost, and a timed-out request still goes on the
    record.
- **SEO:** M.

### F6. Give it (the coins go with it)
- **What:** hand the NFT to another NEAR account, and everything inside goes with it.
- **For:** gifting a funded wallet, or moving it to your own other account.
- **Benefit:** one NEAR transaction hands over the coins on every chain, the inside balances and the addresses.
- **How:** `nft_transfer` (owner only, refused while listed). In the same receipt, the new owner becomes the only one
  who can sign, every allowance is cleared, the inside NEAR/USDC/wNEAR moves with the token, and the signature records
  stay with it. The card swings to the new owner (the brand's signature motion).
- **Route:** `/s/{id}/transfer` (UI verb "Give").
- **Source:** docs/selling.md "How control passes"; kb90 §5.11; Q `q-give`; dec D-08.
- **Caveats:**
  - **Gifts aren't checked:** no clean-history gate runs before a Give.
  - The receiver must already exist on NEAR. The contract refuses itself, the signer network and the USDC contract as
    receivers.
  - A soft guard warns if a signature is still in flight.
  - Only the receiver can undo a gift, by giving it back.
- **SEO:** M–H ("gift bitcoin", "gift crypto wallet").

### F7. Give by link (claim link)
- **What:** give a Satchel to someone who doesn't have a NEAR account yet.
- **For:** onboarding friends and family, and gifting to newcomers.
- **Benefit:** send it like cash in an envelope. Whoever opens the link claims it.
- **How:**
  - The giver's browser creates a fresh keypair. The app sends 0.02 NEAR to that new account for gas and gives the
    Satchel to it.
  - The secret lives only in the link's `#` part and is never sent to a server. Keeping a copy in the browser is
    optional and off by default.
  - The recipient opens `/claim#…`, connects a NEAR wallet, and the Satchel plus any leftover NEAR moves to them.
- **Route:** `/s/{id}/give-link`, `/claim` (both noindex).
- **Source:** W/lib/copy/wallet-ops.ts `giveLink`, `claim`; SR facts §1.5; Q `q-give-link`; L `more.items[1]`.
- **Caveats:**
  - It's a bearer secret: anyone with the link, the giver included, can claim it. It can't be cancelled, and a lost
    link can't be replaced.
  - The recipient still needs a NEAR wallet to claim.
  - Gifts aren't checked.
- **SEO:** M–H ("send crypto by link", "crypto gift link").

### F8. Sell it: list, buy, stop selling (the marketplace)
- **What:** list a Satchel at a fixed price, and buy one in one transaction.
- **For:** sellers of funded wallets or portfolios, and buyers who want a wallet together with its history.
- **Benefit:** one trade, and neither side sends first. The seller is paid in the same transaction that hands over
  the NFT.
- **How:**
  - `list` needs a 250-block quiet period (about 2 min 20 s) with no signature, plus a 0.01 NEAR deposit (the unused
    part is refunded). A USDC listing also needs a one-time 0.00125 NEAR payout registration.
  - While it's listed, signing, giving and taking coins out are paused ("Paused for sale").
  - Anyone can buy right away once the buyer's browser check passes (F10). There is no wait after listing.
  - `buy(token, listing_id, expected_sig_count)` fails if either has changed. The payout goes out in the same
    transaction; if it fails, it's credited to the seller's proceeds ("Waiting for you", Withdraw on `/satchels`).
  - "Stop selling" takes effect at once.
  - The Sell sheet runs a "Before you list" check of past signatures and shows "How to clear it".
  - `/market` lists every listing with a server-side verdict hint, plus "Unlisted Satchels".
- **Route:** `/market`, `/s/{id}/sale` (Buy or Sell), `/s/{id}/sale?list`, `/satchels` (proceeds).
- **Source:** kb90 §5.7, §5.12, §7.6; docs/selling.md; docs/how-it-works.md "Buying"; W/lib/copy/commerce.ts `sell`, `buy`.
- **Caveats:**
  - Currencies are NEAR, or USDC on NEAR (only if H-26 passes). On marketing pages, say **NEAR** (SR R1).
  - Third-party NEAR marketplaces can't list it: NEP-178 approvals are absent and `nft_transfer_call` always fails.
    They are on the README's "What's next".
  - There is no private or reserved listing: a listing is public at a fixed price.
- **SEO:** H ("sell a crypto wallet", "buy a funded wallet", "sell bitcoin wallet").

### F9. Offers (on any Satchel, listed or not)
- **What:** bid on any Satchel, even one that isn't for sale. The owner can accept.
- **For:** buyers who want a specific Satchel, and owners open to negotiation.
- **Benefit:** a negotiated trade with no middleman. Accepting hands the Satchel over and pays the owner in one
  transaction.
- **How:**
  - Before you offer, your browser runs the same clean-history check as Buy, and checks again just before sending.
  - The contract holds the offered NEAR (or USDC on NEAR) and binds the offer to the Satchel's signature count and its
    inside-balance epoch. Any new signature or take-out makes the offer unacceptable.
  - Accepting stops a sale if one is listed, moves the NFT, clears allowances and pays the full amount.
  - Offers expire after 1, 7 or 30 days in the app (the contract allows up to 90).
  - The offerer can cancel any time before acceptance, and anyone can cancel once the offer has expired. The money
    only ever goes back to the offerer.
- **Route:** `/s/{id}/offer`, `/market` ("Unlisted Satchels", "My offers", "Incoming offers").
- **Source:** C46; SR facts §1.2; SR R6; L `more.items[0]`, `hood.rules[5]`; Q `q-offers`; claims-audit W3 (fixed).
- **Caveats:**
  - Refunds are **not automatic**: someone has to cancel.
  - Each offer keeps about 0.003–0.005 NEAR as storage, which isn't returned.
  - At most 20 open offers per account.
- **SEO:** M ("make an offer on a wallet", "OTC crypto").

### F10. Clean history check (the headline feature)
- **What:** before Buy turns on, the buyer's browser checks every signature the Satchel has ever made and confirms
  none can still move the coins.
- **For:** buyers. It's also why sellers can sell at all.
- **Benefit:** it closes the hole in every "NFT that controls keys" design: a transaction signed before the sale and
  broadcast after it.
- **How:**
  - The browser reads `sig_records` and checks each one on its own chain:
    - EVM: the nonce has been used, read 3 blocks back on Sepolia (deeper on the L2s), on two providers that must agree,
      for each network separately;
    - BTC: the outpoint was spent in a confirmed transaction, on two Esplora providers;
    - SOL: the blockhash has expired (the record is at least 120 s old);
    - messages are listed but never block a sale.
  - It also checks that the EVM address has no delegated code (EIP-7702) and that the Solana account is a plain
    wallet.
  - A record's status is one of Used, Expired, Unfunded, Not its coin, Message, Confirming, Unused or Can't verify.
    The verdict is one of clean, empty, blocked, confirming, can't verify or unsafe.
  - Buy stays disabled unless the verdict is clean (or empty). There's no override, and the check runs again right
    before Buy.
  - The server renders a hint for judges and no-JS readers, but only the browser's result can turn Buy on.
  - Demo Satchel #4 is blocked on purpose (an EVM nonce = current + 1 that can never be used).
- **Route:** `/s/{id}/sale` (Buy tab: "The record", sources line, "How Satchel checks this", "What it doesn't cover"),
  `/market` (a verdict on each card), `/api/clean-history/{id}`.
- **Source:** kb90 §7 (§7.2–7.7); `packages/core/src/clean-history/`; docs/security-model.md; docs/selling.md threat
  model; W/lib/copy/commerce.ts `clean.*`.
- **Caveats:** see the claims register (§3.5). The contract does **not** enforce the check; the app does.
- **SEO:** H for a concept page ("is it safe to buy a crypto wallet", "pre-signed transaction risk", "wallet history
  check").

### F11. Every signature on the record, readable requests only
- **What:** the contract writes down exactly what it signs **before** NEAR's signer network signs it, and it signs
  only requests it can read.
- **For:** buyers, auditors, and security-minded owners.
- **Benefit:** a complete public history. No blind signing, and no "it timed out so it isn't recorded".
- **How:**
  - `sign_for` parses the exact bytes and hashes them itself (keccak256 for EVM, sha256d per BTC input, the raw
    message for SOL).
  - It writes the record and a `sign_requested` event in the same receipt as the signer-network call.
  - It accepts plain ETH and USDC transfers on the four networks, standard Bitcoin spends, plain SOL transfers and
    plain-text messages.
  - It refuses raw hashes, EIP-712 permits, EIP-7702 authorizations, any other contract call, other chains, sighash
    types other than ALL, and durable nonces.
  - `history_digest` gives one hash over all the records (C1).
- **Route:** `/s/{id}/activity`; on `/` it appears as hood rules 1–2 and clean beat 3.
- **Source:** kb90 §1.3–1.5, §5.8, §5.9, §7.1; docs/how-it-works.md; AGENTS.md claims table.
- **SEO:** M (technical audience: "chain signatures security", "blind signing").

### F12. Quiet period and pause while for sale
- **What:** a Satchel can be listed only after 250 blocks (about 2 min 20 s) with no signature. While it's for sale,
  it can't sign or be given.
- **For:** buyers.
- **Benefit:** the history a buyer checks can't change underneath them.
- **How:** `list` requires `height ≥ last_sign_height + 250`. While it's listed, `sign_for` panics `ERR_FROZEN` (for
  the owner and allowance holders alike), `nft_transfer` panics `ERR_LISTED`, and inside withdrawals are refused.
  Adding coins still works.
- **Route:** `/s/{id}/sale`; the "Paused for sale" pill everywhere.
- **Source:** kb90 §1.6, §5.7; Q `q-paused`, `q-why-blocked`; VC §5 claims 8, 11–13; brand/README corrections.
- **Caveats:** there is **no wait after listing**, and the quiet period is never called a cooldown.
- **SEO:** L (it belongs inside the clean-history page).

### F13. Let someone spend (spending allowance)
- **What:** the owner lets up to 4 other NEAR accounts send coins within daily caps.
- **For:** families, teams, assistants and bots, i.e. shared spending without sharing ownership.
- **Benefit:** someone else can spend within limits. You keep ownership and can revoke at any time.
- **How:**
  - Each account gets up to 8 caps (one per coin and network: BTC, SOL, and ETH or USDC on each EVM network) and at
    most 32 sends in any 24 hours.
  - The window rolls over 24 hours rather than resetting at midnight, and network fees count toward the caps.
  - Expiry is optional (24 h, 7 d, 30 d or none).
  - Access pauses while the Satchel is for sale and is cleared on every change of owner.
  - Their sends go on the same record ("Requested by"), so an unused one blocks a sale like the owner's would.
- **Route:** `/s/{id}/allowance` (panel "Who can spend", sheet "Let someone spend", "Revoke").
- **Source:** C5; SR facts §1.1; SR R7, R8; Q `q-allow-*`; L `more.items[2]`.
- **Caveats:**
  - They can **only send** from the chain addresses. They can't sign messages, take inside coins out, list, stop
    selling, give, sell or accept offers.
  - A BTC send by them spends one deposit at a time.
  - The OP-stack L1 data fee isn't counted toward the caps.
- **SEO:** M ("crypto allowance", "spending limit wallet", "shared crypto wallet").

### F14. Inside balances: NEAR, USDC and wNEAR held by the contract
- **What:** NEAR, wNEAR and USDC (on NEAR) can sit inside a Satchel, held by the contract on NEAR.
- **For:** owners and sellers bundling NEAR-side value.
- **Benefit:** NEAR-side value goes with the NFT too.
- **How:**
  - `deposit_near`, or `ft_on_transfer` from Circle testnet USDC or `wrap.testnet`.
  - Anyone can add. The first deposit keeps about 0.0009 NEAR as storage. A storage credit (0.01 NEAR prepay,
    withdrawable) covers FT deposits.
  - Only the owner can take coins out, never while listed, and every take-out invalidates open offers.
  - Inside balances move on every change of owner. They're outside the clean-history check by design, because the
    contract guards them itself.
- **Route:** `/s/{id}/coin/{key}` (noindex); the Wallet tab "Inside" filter.
- **Source:** C46; SR facts §1.3; Q `q-inside`, `q-storage-credit`, `q-withdraw-inside`; docs/near.md "Fungible tokens".
- **Caveats:**
  - USDC inside exists only if H-26 passes. On marketing pages, name "NEAR held inside" only (SR R1).
  - wNEAR is a wrapped token, so "no wrapped tokens" must stay scoped to the chain addresses.
- **SEO:** L.

### F15. Take it all out (empty the Satchel)
- **What:** send every coin to addresses you choose (one per chain) and pull the inside coins back to your NEAR account.
- **For:** owners exiting, or a buyer emptying what they just bought.
- **Benefit:** one guided flow instead of many separate sends.
- **How:**
  - One signature per coin, plus extra Bitcoin sends when there are more than 10 coins to sweep.
  - One Ethereum address takes all four networks, and on each network USDC goes first.
  - A failure on one coin never loses the others: you can retry it or skip it.
  - Inside take-outs cost only gas. Owner only, and hidden while listed.
- **Route:** `/s/{id}/empty`.
- **Source:** W/lib/copy/wallet-ops.ts `empty`; SR facts §1.5; L `more.items[4]`.
- **Caveats:**
  - It's not "one click" or "one transaction".
  - USDC on a network that has no ETH for the fee stays behind.
- **SEO:** L.

### F16. Sign a message (Ethereum and Solana)
- **What:** sign a plain-text message with the Satchel's Ethereum address (EIP-191 `personal_sign`) or its Solana
  address (the off-chain message format v0).
- **For:** owners who need to prove control or log in to a site.
- **Benefit:** the Satchel's addresses can sign like a normal wallet, without a seed phrase.
- **How:**
  - Paste the site's text and review it: hidden characters are shown as codes, and hex or hash-like bodies are
    flagged. Tick "I trust the site", then copy the signature.
  - The message must be 1–1024 bytes of UTF-8. The full text is recorded on NEAR and shown to every future buyer, and
    it never blocks a sale.
  - Owner only, and paused while listed.
- **Route:** `/s/{id}/sign` (noindex).
- **Source:** C7S §4; SR facts §1.4; Q `q-safety-message`.
- **Caveats:**
  - Bitcoin isn't supported (BIP-322 skipped).
  - There's no WalletConnect or dapp connection: it's copy and paste.
  - A long message keeps more NEAR as storage.
  - A site may treat the signature as a login or a promise.
- **SEO:** L.

### F17. Full history: Activity and Transactions
- **What:** every event in a Satchel's life, and every coin in and out.
- **For:** buyers doing due diligence, owners, and anyone curious.
- **Benefit:** a public record of who held it, sales, and every signature with what it signed.
- **How:**
  - `/s/{id}/activity` is built from NEP-297 events: minted, handed over, listed, sold (to whom, for how much), offers,
    allowances, and each signature with its content.
  - `/s/{id}/transactions` lists coins in and out per chain and inside.
  - On-chain views: `sig_records` and `history_digest`. Old NEAR history comes from the FastNEAR tx API.
- **Route:** `/s/{id}/activity` (in the sitemap), `/s/{id}/transactions` (indexable, but not in the sitemap's
  `TOKEN_TABS`).
- **Source:** docs/selling.md "Each Satchel's history"; Q `q-txs-vs-activity`.
- **Caveat:** Arbitrum Sepolia transfers aren't shown under Transactions.
- **SEO:** M (as proof content).

### F18. Value at a glance (overview)
- **What:** an estimated total, a value bar with each coin's share, and the top coin chips, on the card, the Wallet
  tab, market cards and the buyer's "You get".
- **For:** everyone.
- **Benefit:** a quick read of what a Satchel holds.
- **How:**
  - Prices come from 1Click `/v0/tokens`, with CoinGecko as the fallback (cached 60 s).
  - The app labels the total "≈ $X at mainnet prices". If no prices are available it shows "{n} coins on {m} networks"
    and no figure.
  - Fiat appears only in this overview.
- **Route:** `/s/{id}`, `/market`.
- **Source:** dec D-50 (superseded on `/` by D-52); SR facts §1.6.
- **Caveat:** testnet coins have no value. The landing art shows a fixed sample "≈ $8,000.00", unlabelled, as art only.
- **SEO:** L.

### F19. A standard NEP-171 NFT with a dynamic card
- **What:** a Satchel is an ordinary NEP-171 token (with NEP-177, NEP-181 and NEP-297), so NEAR wallets and explorers
  can show it. Its image is drawn live from contract state.
- **For:** NFT collectors and NEAR users.
- **Benefit:** it looks right in any NEAR wallet and shows its status and signature count.
- **How:**
  - The token's `media` is `https://usesatchel.xyz/api/card/{id}.svg`: an 800×504 sticker card with a state pill
    (Active, Signing or Paused for sale), "{n} signatures" and "recorded on NEAR testnet", with no balances and no
    owner.
  - Per-Satchel OG and Twitter images (`/s/{id}/opengraph-image`) carry native amounts and a Testnet badge.
- **Route:** `/api/card/{id}.svg`, `/s/{id}/opengraph-image`.
- **Source:** docs/near.md "DYNAMIC NFTS", "NFT standards"; W/lib/card-svg.ts; W/lib/og.ts.
- **Caveat:** NEP-178 approvals and `nft_transfer_call` are left out on purpose (D-07).
- **SEO:** M ("dynamic NFT", "NEP-171").

### F20. No admin key: a keyless, immutable contract
- **What:** the release contract is born in one transaction with no AddKey, so nobody can upgrade it, redeploy it or
  move its funds outside its rules.
- **For:** buyers and skeptics.
- **Benefit:** "Not even ours." Nobody can change the rules after you buy.
- **How:**
  - One transaction from `satchelhq.testnet` runs CreateAccount, Transfer, DeployContract, `new` and `nft_mint` ×7,
    with no AddKey.
  - On NEAR, an account with no access key can never sign.
  - The wasm imports no AddKey, DeployContract or DeleteAccount host functions (INV-22, checked in CI), and the
    contract has no admin or upgrade methods.
- **Route:** `/contract`, `/api/contract`.
- **Source:** docs/near.md "Accounts"; docs/security-model.md "What signs"; kb90 §5.16, T4; L `lock.*`.
- **Caveats:**
  - **This is true for rc and final only.** The live site's dev2 has keys (§0).
  - Immutable also means a bug can't be patched: a fix means a new contract with new addresses (T9).
- **SEO:** M ("immutable smart contract", "no admin key").

### F21. Verify it yourself
- **What:** every on-chain claim has a read-only command, and the judge pages render their facts on the server.
- **For:** skeptics, developers, judges and AI agents.
- **Benefit:** you don't have to trust the website.
- **How:**
  - `tools/judge-snippets.sh` runs 8 checks and compares the results. It needs bash, curl and python3. `--print`
    lists the commands without running them.
  - The checks cover: the owner of #1; no access keys plus the code hash; a birth transaction with no AddKey; the
    contract never having signed a transaction; history starting at the birth; the reproducible build; the `config()`
    constants and the signer network's version; and #1's balances.
  - `/s/{id}`, `/market` and `/contract` read the same with JavaScript off, and `/api/satchels/{id}` returns JSON.
- **Route:** `/contract` (verify commands), `/s/1`, the API routes.
- **Source:** docs/verify.md; README "Verify it yourself"; AGENTS.md.
- **Caveat:** until Nov 10 the final-contract checks skip. `SATCHEL_CONTRACT=dev2.satchelhq.testnet` runs them on dev,
  where the lock checks don't apply.
- **SEO:** M (developer audience).

### F22. Open source, with a reproducible build
- **What:** the contracts are MIT; everything else is AGPL-3.0-only. NEP-330 metadata names the repo, and
  `cargo near build reproducible-wasm` at tag `contract-v1.0.0` reproduces the deployed hash.
- **For:** developers and auditors.
- **Source:** dec D-53; README "License"; docs/near.md "Source you can verify".
- **Caveat:** **the repo is private until Day 13** (needs Razvan's yes, H-21), so `near contract verify` works only
  after that.
- **SEO:** L–M.

### F23. Mint
- **What:** mint a new Satchel with three fresh addresses.
- **How:**
  - A 0.02 NEAR deposit, with about 0.007 used and the rest refunded.
  - "You get": its own Bitcoin testnet4, Ethereum Sepolia and Solana devnet addresses; "Its owner decides who can move
    the coins"; "A public record of every signature it makes".
- **Route:** `/mint` (indexed).
- **Source:** W/lib/copy/shell.ts `mint`; kb90 §5.4.

### F24. Supporting app features
| Feature | What | Route | Source |
|---|---|---|---|
| My Satchels | Your Satchels, plus escrowed sale proceeds with Withdraw | `/satchels` | kb80 R4 note; W/lib/copy/shell.ts `home.list` |
| Market browsing | Listings with verdicts, plus "Unlisted Satchels" (anyone can offer) | `/market` | W/lib/copy/commerce.ts `market` |
| Address book | Saved recipient addresses, kept in the browser only | `/address-book` (noindex) | Q `q-address-book` |
| Onboarding | Three intro cards (hand it over, every signature on the record, let someone spend) and an optional survey ("Help us build Satchel"; no IP stored, no cookies) | modal | W/lib/copy/onboarding.ts; Q `q-feedback` |
| Questions | 35 grouped answers with search | `/questions` | F `FAQ_GROUPS` |
| Contract facts | Lock, code hash, birth tx, MPC version, `config()`, verify commands | `/contract` | kb80 "Contract facts" |
| Themes | Day by default whatever the OS; Night and System in the toggle | everywhere | brand/README (D-44) |
| No-JS and reduced motion | Every landing section reads complete without JavaScript; every loop has a Pause (WCAG 2.2.2) | `/` | W/components/Landing.tsx; SP P11 |

### F25. Costs (no Satchel fee today)
| Item | Fact | Source |
|---|---|---|
| Mint | 0.02 NEAR deposit, unused part refunded | L `q-cost`; SR facts §1.8 |
| List | 0.01 NEAR deposit, unused part refunded (USDC: one-time 0.00125 NEAR registration) | Q `q-usdc-payouts` |
| Each signature | About 0.004 NEAR (an estimate). About 0.1–0.3 NEAR is held during signing and refunded | Q `q-fees-near`; VC §5 claim 19 |
| Network fees | Taken from the Satchel's own coins | Q `q-fees-chain` |
| Give by link | +0.02 NEAR to the claim account | L `q-cost` |
| Offers, allowances, long messages | Keep a little NEAR for storage | L `q-cost` |
| Satchel's fee | **None** on sales or offers, today. The README's "What's next" lists "a small fee on sales, decided at the mainnet launch" | SR facts §1.8; README; VC §5 claim 20 |

---

## 2. Use cases

Strength: **Strong** (the product does it end to end today, on testnet) · **Supported with caveats** · **Partial** (part of
the job, or only by workaround) · **Not supported** (don't market it).

| # | Use case | The situation | Features | Strength today | What to say / what not to |
|---|---|---|---|---|---|
| U1 | **Sell a funded wallet in one trade** | You have BTC, ETH and SOL and want to sell the whole wallet without the buyer having to trust you | F8, F10, F12, F11, F6 | **Strong** (the core story) | "One trade, in NEAR. Neither side sends first." "The buyer's browser checks every past signature first." Not "Safe to buy", not "guaranteed" (§3.5) |
| U2 | **Buy a pre-funded wallet safely** | A buyer wants proof that the seller can't drain it after the sale | F10, F17, F12, F8 | **Strong** | Buy stays off until no old signature can move the coins. Scope it: signatures after purchase, the signer network and reorgs aren't covered |
| U3 | **A portfolio sold as one item** | BTC + ETH + SOL + USDC (+ NEAR inside), priced and moved together | F1, F2, F14, F8, F18 | **Strong** for the supported coins | "Sell BTC, ETH and SOL together", "+ USDC and L2s". Not "any token", "your NFTs" or "SPL tokens" |
| U4 | **Gift crypto to a friend** | Give a funded wallet as a present | F6, F4 | **Strong** (the friend needs a NEAR account) | "Give a funded wallet. To a friend." Gifts don't wait for the check. Not "in one tap", not "to anyone" |
| U5 | **Gift to someone new to crypto or NEAR** | The recipient has no NEAR account yet | F7 | **Supported with caveats** (a bearer link; claiming needs a NEAR wallet) | "Give by link. To someone not on NEAR yet." "Like cash in an envelope." Not "no wallet needed", not "cancel any time" |
| U6 | **OTC or negotiated trade without a middleman** | Two parties agree a price for a wallet off-market | F9, F8, F10 | **Supported with caveats** (the offer currency is NEAR, or USDC on NEAR only if H-26 passes; the counterparty uses a NEAR wallet; a listing is public, so a private deal goes through an offer) | "Make an offer, even if it's not for sale." "Accepting hands it over and pays the owner in one transaction." Say **"no middleman"** or "no third-party escrow". Not "no escrow": the contract holds the offer money. Not "refunded automatically" |
| U7 | **Hand over a project or business wallet** | A project changes hands, and payments must keep landing at the same addresses | F1, F4, F6, F8 | **Supported with caveats** (a Satchel has one NEAR owner; multisig or DAO ownership is untested) | "Hand over a project wallet. Same addresses. Payments keep coming." Not "treasury" or "DAO treasury" (VC §5 claim 15) |
| U8 | **A payment or donation address you might pass on** | A shop, creator or fundraiser receives coins at addresses that can later be handed over with everything in them | F4, F1, F6 | **Supported** (anyone can add coins; the addresses survive transfers) | "Anyone can add coins." "Its addresses go with it." Avoid "never change" (say "stay the same"; VC §5 claim 10) |
| U9 | **Let someone spend within limits** | A partner, teammate, assistant or bot spends from your wallet without owning it | F13 | **Supported with caveats** (sends only; up to 4 people; their signatures go on the record and can block a sale) | "Let someone spend. Daily caps, until it changes hands." Never imply they can give, sell, list, sign messages or take inside coins out |
| U10 | **A multichain wallet without a seed phrase** | Hold and send BTC, ETH and SOL from one NEAR wallet | F1, F3, F5, F2 | **Strong** on testnet | "Send without a seed phrase." "No bridge, no wrapped tokens." Disclose that you trust NEAR's signer network |
| U11 | **Bid on a wallet that isn't for sale** | You like a Satchel's contents or history | F9 | **Strong** | "Even if it's not for sale." |
| U12 | **Exit or sweep a wallet** | Empty a Satchel to your own wallets, e.g. right after buying | F15, F14 | **Supported with caveats** (one signature per coin; USDC with no ETH for the fee stays) | "Take it all out. Every coin to your wallets." Not "one click" |
| U13 | **Prove you control an address or log in** | A site asks for a signed message from the ETH or SOL address | F16 | **Partial** (copy and paste; no Bitcoin; no dapp connection; the message is public forever) | "Sign a message with its Ethereum or Solana address." Not "Sign in with Ethereum", not "connect to dapps" |
| U14 | **Collect or trade wallets as NFTs** | NFT collectors and NEAR users | F19, F8, F9, F17 | **Supported with caveats** (Satchel's own market only; third-party NEAR marketplaces can't list it yet) | "A standard NEP-171 NFT." Not "list it on any NFT marketplace" |
| U15 | **Developers and auditors studying chain-signature custody** | Learn from or audit a working NFT-as-wallet with a public log | F11, F20, F21, F22 | **Supported** (the repo goes public on Day 13 with Razvan's yes) | "Verify it yourself." "Every claim has a read-only command." Open-source wording only after the repo is public |
| U16 | **Pass on coins (inheritance or dead-man switch)** | Coins should move to an heir automatically | none: Give and give by link are manual | **Not supported.** The heirloom timelock is Phase 3 (D-29), and a lost NEAR wallet has no recovery (docs/security-model.md) | Don't market inheritance, recovery or automatic hand-over. At most, "give it to family while you can", with no "backup" claim (VC §5 claim 16) |
| U17 | **Buy with any coin (1Click cross-chain pay)** | Pay for a Satchel from another chain | none | **Not supported** (cut, D-19, H-16) | Don't mention it |
| U18 | **Sell on third-party marketplaces** | Paras-style listings | none | **Not supported** (README "What's next" #3) | Don't claim it |

The top use cases for their own pages are U1/U2 (one story told from both sides), U3, U4/U5, U6, U7/U8 and U9.

---

## 3. Claims register

Each rule quotes its source. "MAY" lines are approved wording, usually already shipped. "MUST NOT" lines are bans or
known-false wording.

### 3.1 Framing: testnet vs the mainnet product (D-52)
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-1 | On product-framed marketing pages, name **Bitcoin, Solana, and Ethereum, Base, Arbitrum and Optimism**; present the product "with every feature it will have on mainnet" | Name testnet4, devnet, Sepolia or "four Ethereum testnets" on `/`; write "OP Mainnet" ("keeps the word 'mainnet' out of the page text") | dec D-52 "What changed" |
| CR-2 | Keep exactly one testnet signal: the header **Testnet** badge and its tooltip ("Satchel runs on NEAR testnet, Bitcoin testnet4, Solana devnet and four Ethereum testnets. Coins here have no value."), plus the phone menu sheet's line | Remove the badge or its tooltip; drop the phone sheet line (below 420 px the badge is hidden) | dec D-52 decision 1; SP P2; W/lib/copy/shell.ts `badgeTip` |
| CR-3 | Describe the product | Say "Satchel is live on mainnet", say "the coins have value", give a launch date, or say "soon" ("The landing describes the product, never the deployment") | dec D-52 "The honesty boundary" |
| CR-4 | App pages, the README and `/questions` stay testnet-explicit ("Testnet only. Coins here have no value.") | Put mainnet names on app or deployment pages: "an Ethereum address is the same on mainnet, so a reader could send real ETH or USDC to a testnet Satchel and lose it" | dec D-52; SP P1 |
| CR-5 | Use simulated, generic samples: roles, round amounts, "Satchel" with no number | Show real Satchel addresses, accounts, transactions or live reads on marketing pages ("Simulated and generic. No live chain reads on `/`, no real accounts or transactions") | dec D-42; L header comment; `test/unit/landing-no-data.test.ts` |
| CR-6 | Open question: **whether new SEO pages get product framing.** D-52 rules on `/` only. Recommendation: product framing plus the header badge (as on `/`), no addresses, and "Look inside a Satchel" links into the app, which is testnet-explicit | Decide it in copy without Razvan's ruling | dec D-52 scope |

### 3.2 Chains, coins, "no bridges or wrapping"
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-7 | "Each Satchel has its own Bitcoin, Ethereum and Solana addresses, on their own chains: no bridge, no wrapped tokens." | Use "no wrapped tokens" next to inside wNEAR (it's wrapped NEAR): scope it to the chain addresses | L `what.body`; claims-audit §3 ("names no wNEAR, so 'no wrapped tokens' stays scoped") |
| CR-8 | Always name the three chains ("Bitcoin, Ethereum and Solana") | Say "every chain", "any chain", "all chains", "every L2" or "every EVM chain" (banned by the copy test) | brand/README corrections; D-45; `config-copy-theme.test.ts:61` |
| CR-9 | "ETH and USDC on Ethereum, Base, Arbitrum and Optimism." "The four Ethereum networks share one address." | Claim other ERC-20s, SPL tokens, NFTs inside, Taproot, or BTC message signing | C7S:24-38, :359-369; SR facts §1.3 |
| CR-10 | "The app can't move anything else at its addresses." | Say "Anything else at its addresses can't be moved" (too absolute: the contract can't tell testnet4 from signet, or devnet from other clusters) | claims-audit W1; L `q-chains` |
| CR-11 | "Real coins on their own chains" in the sense of native, not wrapped | Say "real Bitcoin" in a value sense ("Testnet only") | VC §5 claim 14; brand/README corrections |

### 3.3 Keys, custody and security (from docs/security-model.md)
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-12 | "A Satchel has none [no seed phrase]." "Send without a seed phrase." | Say "no keys exist" or "no keys to copy" (the key exists as threshold shares in the signer network) | VC §5 claim 1; L `hero.lead` |
| CR-13 | "No single party. NEAR's signer network makes each signature together, only when the Satchel contract asks, for the NFT's owner or someone they let spend within daily caps." | Say "trustless", "nobody else can ever sign", "unhackable", "bank-grade" or "fully secure" | L `q-keys`; VC §5 claim 5 |
| CR-14 | **Must disclose the trust:** "What you still trust: NEAR's signer network, which makes every signature. Satchel is new and hasn't been audited." "Enough colluding nodes could sign anything." | Leave out the signer-network trust wherever custody or security is claimed | L `lock.limits`, `q-keys`; docs/security-model.md "What it trusts"; kb90 T1 |
| CR-15 | "No. Satchel is new hackathon software." (on "Is it audited?") | Say "audited" or "production-ready"; imply mainnet readiness ("a mainnet version would need an audit") | L `q-testnet`; README "Security and limits" |
| CR-16 | "There is no admin and no recovery key, by design." | Say "your NEAR account is your backup", "recover your Satchel" or "account recovery" (no spec phrases it) | docs/security-model.md "If something fails"; VC §5 claim 16 |
| CR-17 | Use "NEAR's signer network" in copy | Say "MPC", "delegate", "approval", "yocto", "Tgas", "yield" or "cooldown" in user-facing copy (copy-test bans) | `config-copy-theme.test.ts:61`; SR R8 |
| CR-18 | Testnet-grade confirmation depth is a disclosed weakness (BTC K = 1) | Promise final settlement depth or reorg safety | docs/security-model.md "Limitations"; kb90 §7.4 |

### 3.4 No admin key and the locked contract
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-19 | On **rc and final only**: "No admin key. Not even ours." "Satchel's contract was born without a key and can't be upgraded. Nobody can add one or change its code, us included." | Show these lines while `CONTRACT_ROLE` is `dev` (the live site until the final birth); hardcode them on a static page | SR R2; L `lock.body`; W/lib/lock-facts.ts; dec D-51 |
| CR-20 | Dev twin: "This site's contract still has keys, so we can change its code. The release contract is born with no key and no admin or upgrade methods." | Say "Dev contract: lock and code checks skipped" on marketing (removed by D-52) | L `lock.dev.body`; dec D-52 |
| CR-21 | "Its contract can't be upgraded, so a bug can't be patched in place." | Present immutability without its cost (a fix means a new contract with new addresses) | L `q-testnet`; kb90 T9 |
| CR-22 | Quote the birth tx, code hash and lock proofs only from Nov 10, from `/contract` | Quote `[TBD]` values or dev2's hash as final | README "Try it"; docs/verify.md |

### 3.5 What "clean history" does and does not guarantee
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-23 | "Satchel records every signature on NEAR before it's made." "Each request is written on NEAR before NEAR's signer network sees it… Timed-out requests stay on the record." | Say the record is written after signing, or "only successful signatures" | L `clean.beats[2]`, `hood.rules[1]`; kb90 §1.4 |
| CR-24 | "The buyer's browser checks every past signature first." "Your browser, not the contract, checks each one on its own chain, and Buy stays off until none can still move the coins." | Say the contract or Satchel's server enforces or guarantees the check ("The contract does not enforce this check, because it cannot see other chains") | L `hero.lead`, `q-proves`; docs/security-model.md; VC §5 claim 18; dec D-42 |
| CR-25 | "Buy turns on only when no old signature can move the coins." ("only when" keeps it true: other checks gate Buy too) | Say "Safe to buy" (banned), "guaranteed safe", "risk-free", "100% clean", "no signature exists" (banned) or "proof the seller can't take the coins" | L `clean.beats[4]`; brand/README corrections; copy-test bans |
| CR-26 | Scope it: "It doesn't cover tokens other than USDC, signatures made after you buy, NEAR's signer network or Bitcoin reorgs." (Deployment framing says "testnet4 reorgs") | Claim it covers other chains, tokens or addresses, the inside NEAR/USDC/wNEAR (the contract guards those), encumbered outpoints, or what a site does with a signed message | L `q-proves`; docs/security-model.md "What it does not cover"; W/lib/copy/commerce.ts `notCoveredList` |
| CR-27 | "For Bitcoin and Ethereum two data providers must agree; the page says when only one answered." | Say "verified by multiple independent sources" for Solana (one provider plus the age rule) | L `hood.rules[3]`; kb90 §7.5 |
| CR-28 | "Signed messages are listed too; they can't move coins, so they never block a sale." | Imply messages are refused, or that they're harmless off-chain | L `hood.rules[3]`; Q `q-safety-message` |
| CR-29 | "The purchase names the listing and the signature count the browser checked. If either changed, it fails and refunds." | Imply the seller can sign between the check and the buy | L `hood.rules[5]`, `q-after` |
| CR-30 | "Gifts don't wait for the check." / "Gifts skip the buyer's check." | Put a clean-history promise on Give or give by link (the brand board's Give line was rejected) | L `uses.items[1]`; brand/README corrections; VC §5 claims 4, 17 |
| CR-31 | Label a dead EVM record "Used" (the nonce was used) | Say "this signature was sent" (a replacement can use the nonce instead) | VC §5 claim 9 |
| CR-32 | "No NFT-wallet design we know of provides it." (hedged) | Say unhedged "the first", "the only" or "nobody else" | README "The problem", "Prior art" |

### 3.6 Selling, buying and offers
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-33 | "One trade, in NEAR. Neither side sends first." "One transaction moves the Satchel to the buyer and pays the seller." | Say "instant payout, always" (a failed payout is credited to proceeds) | L `uses.items[0]`, `hero.anim.alt`; kb90 §5.12 |
| CR-34 | On marketing: prices and offers **in NEAR** | Advertise USDC prices or USDC offers, or USDC held inside on NEAR, until H-26 passes ("the landing must stay true without an edit") | SR R1; dec D-51 |
| CR-35 | "A Satchel can be listed only after 250 blocks (about 2 min 20 s) without signing." "Anyone can buy it right away." | Say "Safe to buy in about 2 minutes", say "cooldown", or imply a wait after listing | brand/README corrections; D-05 rev 2; VC §5 claim 8 |
| CR-36 | "While it's for sale, it can't sign, and only a purchase or an accepted offer can move it." "Paused while it's for sale." | Say "Frozen while listed or in cooldown"; omit the accepted-offer path | L `hood.rules[2]`; claims-audit (C4 fix) |
| CR-37 | "Make an offer. Even if it's not for sale." "An offer holds only for the history checked when it was made: if anything is signed or taken out, it can't be accepted." "Cancel any time before it's accepted; the money only ever goes back to you." | Say "refunded automatically" or "expired offers return your money" | L `more.items[0]`, `hood.rules[5]`; SR R6; SR facts §1.2 |
| CR-38 | "Satchel charges no fee." (today) | Say "free forever" or "never any fees" (a sales fee may be set at mainnet launch) | L `q-cost`; README "What's next" 4; VC §5 claim 20 |
| CR-39 | Satchel's own market | Say "list it on any NEAR or NFT marketplace" (approvals and `nft_transfer_call` are disabled) | docs/near.md "Left out on purpose"; README "What's next" 3 |

### 3.7 Gifts, allowances, inside coins, take-out, messages
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-40 | "Give it or sell it, and everything inside goes too." "The new owner gets everything inside." | Say "give it to anyone in one tap" (an account check, a review and a wallet approval; some receivers are refused) | L `meta.description`, `how.steps[2]`; brand/README corrections; VC §5 claim 2 |
| CR-41 | "Give by link. To someone not on NEAR yet." "Like cash in an envelope: whoever has the link can claim it." | Say "no wallet needed", "cancel the link" or "secure link" (it's a bearer secret, and the giver can also claim it) | L `more.items[1]`; W/lib/copy/wallet-ops.ts |
| CR-42 | "Let someone spend. Daily caps, until it changes hands." "Their signatures go on the same record, so add only someone you trust." | Imply they can sign messages, take inside coins out, list, stop selling, give, sell or accept offers; use "delegate" or "approval"; say "exact to the wei" | SR R7, R8; SR facts §1.1 |
| CR-43 | "NEAR held inside" (generic). "Only the owner can take them out, and never while it's for sale." | Suggest someone the owner lets spend can withdraw inside coins | SR R1, R4 |
| CR-44 | "Take it all out. Every coin to your wallets." | Say "one click" or "one transaction" | L `more.items[4]` comment; W/lib/copy/wallet-ops.ts `confirmNote` |
| CR-45 | "Sign a message with its Ethereum or Solana address." "Every message stays on the record." | Say "on all three chains", "connect to dapps", "WalletConnect" or "Sign in with Ethereum" | SR facts §1.4 |

### 3.8 Timing, money figures and wording mechanics
| # | MAY | MUST NOT | Source |
|---|---|---|---|
| CR-46 | "Signing usually takes about 10 seconds." "The network allows up to about 2 minutes." | Say "Usually under a minute", "instant signing" or drop "usually" | brand/README corrections; VC §1.1 rule 8; L `how.steps[1]` |
| CR-47 | Landing art only: a fixed round sample "≈ $8,000.00" (0.05 BTC + 0.80 ETH + 12 SOL + 800 USDC, at a price of 2,000 NEAR), drawn in `aria-hidden` art via `usdText()` | Put a dollar figure in the text layer; write a literal "$" followed by a digit in copy (copy-test ban); use live prices on marketing (D-42); call testnet coins worth money | SR R3, R9; dec D-50, D-52 |
| CR-48 | Scope words: "about", "usually", "the buyer's browser" | Say "always", "never fails", "guaranteed" | VC §1.1 rule 9 |
| CR-49 | Vocabulary: Give (never "Transfer" in UI copy), Paused for sale, Stop selling, Add coins (never Receive or Deposit), owner (never "holder"), coins (never "funds"), NEAR wallet, "Satchel" capitalized; the wordmark is always lowercase | Say "treasury" (use "project wallet"), "delist" or "fund" | VC §1.2; brand/README |
| CR-50 | Prior art, hedged, as in the README: "NEAR's `nft_key`… Lit PKPs and Ika dWallets make keys transferable, and ERC-6551 gives NFTs accounts on one EVM chain. Satchel combines native multichain keys with a standard NEP-171 token and adds the buyer-verifiable clean history." | Make unverified competitor claims; name any other hackathon project | README "Prior art"; dec D-41 (Emblem Vault and Tokenbound as comparables) |
| CR-51 | "Open source" (MIT contracts, AGPL-3.0 for the rest) **once the repo is public** | Promote the repo or call it open source before Razvan's Day-13 "yes" | dec D-53; CLAUDE.md rule 1; H-21 |

**The five rules that matter most:** CR-3/CR-2 (describe the product, never claim mainnet or value, and keep the
testnet badge), CR-24/CR-26 (the buyer's browser checks, not the contract, and the scope is limited), CR-19 ("no admin
key" only on rc and final), CR-34 (NEAR-only prices and offers until H-26), and CR-14 (always name what you still
trust: NEAR's signer network, unaudited).

---

## 4. What the current landing covers, and the gaps

The landing `/` is built from `W/components/Landing.tsx`. Its sections, in order:

| Section (id) | What it says | Features covered |
|---|---|---|
| Hero (`#top`) | Who: "For anyone selling or gifting a wallet". H1: "Sell a wallet with everything inside. The buyer checks it first." The lead: the seed-phrase pain, an NFT on NEAR holding BTC, ETH and SOL, and the buyer's check. CTAs: "Look inside a Satchel" (`/s/1`) and "See Satchels for sale" (`/market`). A 12 s hero loop in four acts (Coins inside → Seller lists it → Buyer checks first → Coins included) with Pause | U1, U2, F1, F3, F8, F10 |
| What it is (`#what`) | "One NFT. Its own addresses." No bridge, no wrapped tokens; the owner or someone they let spend; everything inside goes with it. Card with three address tags (`bc1q…`, `0x…`, `7xKX…`) | F1, F13 (one clause), F6 |
| Uses (`#uses`) | "Sending coins is easy. Handing over a wallet isn't." Three rows: Sell BTC, ETH and SOL together (+ USDC and L2s chip) · Give a funded wallet · Hand over a project wallet | U1/U3, U4, U7/U8 |
| How it works (`#how`) | "Mint it. Add coins. Hand it over." Three scenes: the mint card, the signing tracker (~10 s), the hand-off swing | F23, F4, F3/F5, F6 |
| The catch (`#clean`) | "A signature can outlive a sale". A five-frame strip: Without a record, then With Satchel | F10, F11 |
| Trust (`#trust`) | rc/final: "No admin key. Not even ours." + the Contract facts slip. dev: "Development contract" + a looping `sign_for` code card. "What you still trust…"; "See the contract facts" (`/contract`); **Under the hood** (closed): six rules plus five "Check it yourself" links (`/s/1`, `/s/1/activity`, `/market`, `/contract`, the repo) | F20, F11, F12, F10, F21, F22 (link only) |
| What else it does (`#more`) | A five-tile bento: Make an offer · Give by link · Let someone spend · USDC and L2s · Take it all out, each with a "?" link to `/questions` | F9, F7, F13, F2, F15 |
| Questions (`#questions`) | Seven: Why not just send the coins? · Who holds the keys? · What does the buyer's check cover? · Can the seller sign after I check? · Which chains and coins work? · What does it cost? · Is it audited? Plus "All questions" | F3, F10, F12, F2, F25, F20 |
| Finale (`#try-it`) | "Stick it on. Hand it over." Look around without a wallet; mint with a NEAR wallet | F23 |

**Missing or only hinted at (each is a candidate for its own page or section):**
- **Message signing (F16):** only one clause in hood rule 1 and rule 4. It has no feature tile.
- **Inside balances (F14):** one sentence in `q-chains` ("A Satchel can also hold NEAR inside"). USDC and wNEAR inside
  are held back by R1.
- **Full history, Activity and Transactions (F17):** only a hood link. "Read its full history" isn't sold as a benefit
  for due diligence.
- **Buyer due diligence as its own story (U2):** told only inside the sale story, never from the buyer's side as "how to
  check a wallet before you buy".
- **Add coins by anyone, and the fund link (F4, U8):** one line in How step 1 and the "payments keep coming" row. The
  shareable `/fund/{id}` page isn't mentioned.
- **Standard NEP-171 and the dynamic card (F19):** not mentioned at all ("shows in any NEAR wallet", "image drawn from
  contract state").
- **No seed phrase (F3):** a hero clause and How step 2 only. There's no "how custody works" explainer (Chain
  Signatures is never named as such on `/`).
- **Verify it yourself (F21):** hood links and `/contract`. The `judge-snippets.sh` command path isn't surfaced.
- **Open source (F22):** a hood link only, and it 404s until the repo is public.
- **Seller-side tools:** "Before you list" check, "How to clear it", "Stop selling" being instant, proceeds escrow on a
  failed payout. None of these appear.
- **Offers as OTC (U6):** one bento tile. There's no "no middleman" negotiated-trade story.
- **Gifting to newcomers (U5):** one bento tile, with no gifting narrative (occasions, the "cash in an envelope"
  warning).
- **Allowances (U9):** one tile. Who it's for (family, team, bot) is never named.
- **The value overview (F18):** in the art only.
- **Comparison with other approaches (prior art, CR-50):** absent from `/`.
- **The demo negative case (Satchel #4 "Blocked on purpose"):** absent (it belongs to the app and the README).

**Technical note for new pages:**
- `W/lib/seo.ts` `STATIC_PATHS` lists only `/`, `/market`, `/mint`, `/contract` and `/satchels`. New marketing pages
  must be added there. `/questions` is missing from it today.
- Flow routes stay `noindex`.
- Every marketing word must be in the server HTML: AI judges read only server-rendered HTML, with no Suspense fallback
  (CLAUDE.md).
- The landing's word budgets and bans are unit-tested (`test/unit/config-copy-theme.test.ts`, `faq.test.ts`,
  `landing-no-data.test.ts`, `seo.test.ts`). New pages should get the same guards.

---

## 5. Visuals a new page can reuse (to stay on brand)

**Brand rules for any art:**
- Coral `#FF5C4D` is the one action fill per screen, always with ink text.
- Stickers (a 3 px ink outline plus a hard drop) go only on what you own, press or celebrate.
- Chain charms never carry real chain logos, and the S never gets a face.
- Day comes first. Night stickers use a `#8A82AE` outline.
- Fonts: Funnel Display for titles and amounts; Onest for reading; Geist Mono only for code, addresses and file names
  (SP P9).
- No third-party logos: Base, Arbitrum, Optimism and USDC appear as text chips.
- No real names: avatars are icons or initials.
- Illustrations are `aria-hidden`, their labels drawn from `data-l` attributes so the text layer holds only copy.
- Every loop has a Pause, stops off-screen, and shows a static end frame under reduced motion.
- Source: brand/README.md; brand/design-system.md; kb/81 R4; landing.css.

| Asset | Where | What it gives you | Notes |
|---|---|---|---|
| `ArtCard`, `ArtOverview`, `ArtEmpty` | `W/components/landing/art.tsx` | The Satchel card illustration (coral band, charm S, the "≈ $X" total, value bar, coin chips, "+N") and the empty "Nothing inside yet" card | Takes `copy.landing.desk.mix`/`usd` (the fixed sample). Sized by container queries |
| `ArtPill`, `ArtBadge`, `Coin`, `Lbl`, `ArtIcon`, `Initial`, `amountParts` | `art.tsx` | State pills (success, frozen, danger), lemon "Yours" and "New" stickers, chain-charm coins, attribute labels, Lucide icons at brand stroke, avatar initials | Exported building blocks |
| `OfferArt`, `ClaimArt`, `AllowArt`, `NetsArt`, `OutArt` (`MORE_ART`) | `W/components/landing/more-art.tsx` | Ready art for offers, the claim link, Who can spend, ETH and USDC on four networks, and the take-out done state | Natural heroes for F9, F7, F13, F2 and F15 pages. They sit in `.lp-tile__art` wells on the `--band` token |
| `HeroStage` + `hero/engine.ts`, `hero/timeline.ts` | `W/components/landing/hero/` | The 12 s four-act sale loop, with step bars and Pause | The sale or clean-history story (U1) |
| Clean strip desks `DeskSigned`, `DeskDrained`, `DeskRecorded`, `DeskSpotted`, `DeskClean` | `W/components/landing/CleanSection.tsx` (local functions) | The "without a record / with Satchel" five frames | They need exporting before reuse. Best fit: the clean-history page |
| How scenes `MintScene`, `SignScene` (signing tracker), `GiveScene` (pin swing) | `W/components/landing/HowSection.tsx` (local) | Mint, signing and hand-off scenes on lemon, sunken and sky fields | They need exporting. Fit: gift, seedless and mint pages |
| `ContractFacts` slip, `CodeCard` (`code/engine.ts`, `timeline.ts`), `UnderTheHood` | `W/components/landing/TrustSection.tsx` | The lock slip (keys "None since birth", admin "None", code hash "Matches"); the looping simplified `sign_for` labelled "Simplified" (SP P6); the six rules and links | `ContractFacts` only when the role is rc or final (lemon means locked, SR R2). `UnderTheHood` is exported |
| `AddressTag` (card on strings with three address tags) | `W/components/landing/WhatSection.tsx` (local) | "The addresses hang from the NFT" | Fit: the multichain or addresses page |
| Uses sticker tiles (lemon tag, sky gift, white people) + the `.lp-hint` chip | `W/components/landing/UsesSection.tsx` | Use-case row icons | Day islands (they keep their colours in Night) |
| Layout tokens | `W/components/landing/layout.ts` (`CONTAINER`, `SECTION_Y`, `FLOW`, `SPLIT`, `HEAD`, `H2`, `LEAD`) | The landing grid and rhythm | Reuse them so pages match `/` |
| CSS | `W/components/landing/landing.css`, `more.css` (`lp-card`, `lp-slip`, `lp-pill`, `lp-badge`, `lp-coin`, `lp-chip`, `lp-bar`, `lp-tracker`, `lp-stage`, `lp-hang`, `lp-band`, `lp-bento`, `lp-tile`, `lp-addr`, `lp-pin`, `lp-spark`, `lp-owner`) | Every illustration style | `--band` token: Day `#E3E6F6`, Night `#29214B` (SP P7) |
| Motion | `W/components/landing/LandingMotion.tsx` (one client island), `motion/enter.ts` (once on enter, `data-enter`), `motion/charms.ts` (hanging-charm swing), `motion/tracks.ts`, `W/lib/motion/play` | Signature motions: the 10° pendulum swing, stick-on, appear | WAAPI and CSS only; reduced motion ends on the static frame |
| Brand components | `W/components/brand/` (`Mark`, `MarkSmall`, `Lockup`, `Charm`, `ChainCharm`, `ChainCharms`, `Sparkle`, `CoinIcon`, `ART`, `S_PATH`) | Logo, charm S, BTC/ETH/SOL charms with moods, coins for USDC, NEAR and wNEAR with network badges (B, A, OP, S, N), brand colours | Artwork colours are constant across themes |
| App components | `W/components/` (`SatchelCard`, `Overview`/`ValueBar`, `Clean`, `Timeline`, `Facts`, `AddressDisplay`, `AddressQr`, `ui.tsx` `StatusPill`/`Badge`/`Button`) | Real UI pieces | They show testnet labels ("at mainnet prices", via `IS_TESTNET`); prefer the landing `Art*` versions on product-framed pages |
| Dynamic NFT card | `/api/card/{id}.svg` (`W/lib/card-svg.ts`) | The real token image: 800×504, state pill, "{n} signatures", "recorded on NEAR testnet", chain chips | Reads live state and says "testnet", so it's a deployment artifact. Avoid it on product-framed pages (CR-5) |
| OG images | `W/app/opengraph-image.png`, `twitter-image.png` (1200×630, alt "Satchel: an NFT that is a wallet"); `/s/{id}/opengraph-image` (per Satchel, Testnet badge) | Link previews | Never ship `brand/web/og-image.png`: its tagline says "every chain" |
| Static brand files | `apps/web/public/brand/*.svg` (mark, small mark, lockups, wordmark, charm, coral charm, chain charms on a bar); `brand/canvas/*.png` (board renders, reference only) | Logo and illustration files | Logo rules: clear space a quarter of the tile, mark ≥ 16 px, lockup ≥ 120 px wide |
| README screenshots | `docs/assets/readme/` (`banner.png`, `satchel-page.png`, `send.png`, `buy-check.png`, `market.png`, `activity.png`) | Real app screens | They show testnet networks and real Satchel numbers. Fine for docs; on product-framed pages they conflict with CR-1 and CR-5 |
| Demo film | `marketing/` (Remotion, `src2/`, current cut satchel-2-v4) | Video | Keep its look; it needs a human listen before reuse |

**Voice for new pages** (brand/README, VC §1):
- Friendly and value-first, never gloomy.
- Verb first, one verb per action, hand-off language.
- Each claim keeps its scope word ("about", "usually", "the buyer's browser").
- Tagline: "An NFT that is a wallet." Brand line: "Stick it on. Hand it over." Landing H1: "Sell a wallet with
  everything inside. The buyer checks it first." (D-41, R12.1).
