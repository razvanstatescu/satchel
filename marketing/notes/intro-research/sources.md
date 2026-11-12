# Cold-open sources: real headlines and posts (research, 2026-11-10)

Raw material for the ~8 s cold open: a fast barrage of real headlines and posts about the problems Satchel answers,
plus one optional voice line. Captures are in `marketing/video/public/v2/intro/raw/` (PNG at 2x). Every file, its
exact text, date, URL and blur list is in `raw/manifest.json`, and the voice clips are in `raw/video/`.
**The raw captures are not blurred.** Apply each item's blur list before anything goes into the film.

## Decisions (2026-11-11, coordinator) and what was built

- **Voice:** V2 (Devcon, CC BY) only. **Nothing from the FBI is used:** V1 and T2-11 are dropped.
- **Ledger:** V2 is the one Ledger item, so there are no Ledger screenshots: T1-08 and T1-09 are dropped (T1-10 too).
- **OpenSea:** at most two, T2-04 (Decrypt, old listings) and T2-07 (Finzer). T2-03, T2-05, T2-06 and T2-08 are unused.
- **Bybit:** at most two, T2-09 (Ben Zhou) and T2-10 (NBC, with the agency photo left out).
- **Skipped:** T3-02 (an allegation) and T1-10 (a private person).
- **Added:** Drift, T2-18 (CoinDesk) and T2-19 (The Hacker News), in theme 2 below.
- **Plates** for the intro builder: `marketing/video/public/v2/intro/plates/` (46 PNGs for 24 sources: T1-01 to
  T1-07, T1-11, T1-12, T2-01, T2-02, T2-04, T2-07, T2-09, T2-10, T2-12, T2-13, T2-15, T2-18, T2-19, T3-01, T3-03, T4-01,
  T4-03; plus `plates.json` and `plates-sheet.png`). Crops show the outlet or account, the headline or post text and
  the date, captured at 3x (at least 1600 px wide; the Scam Sniffer report card is its native 1024 px), blurs applied,
  words untouched. `plates.json` gives 1 to 3 key phrases per plate with pixel boxes measured from the page DOM. Lead photos and X post media are left out of the main
  plates (not ours to use); the `-full` X variants keep the media with addresses pixelated.
- **G1** (poster frame) is in `marketing/video/public/v2/intro/g1/`; see "G1" at the end of this file.

## How to read this

**Satchel answers** (what each item maps to):
- **A1 No seed phrase.** A Satchel's Bitcoin, Ethereum and Solana addresses have no seed phrase, so there is nothing to
  copy, photograph, back up or leak, and nothing left behind when you hand it over.
- **A2 Readable requests only.** It signs plain transfers and readable messages. It refuses raw hashes (blind
  signing), EIP-712 permits and Permit2, token approvals and any other contract call, EIP-7702 authorizations and
  Solana durable nonces.
- **A3 Every signature is recorded on NEAR before it is made.**
- **A4 Signing pauses while it is for sale.**
- **A5 The buyer's browser checks that no old signature can still move the coins** before Buy (or an offer) turns on.

**Fact-check marks:** **VERIFIED** = I read the claim or number in the primary source (the company's or agency's own
post, report or filing as quoted). **REPORTED** = from a credible outlet, not checked against a primary.
**UNVERIFIED** = not confirmed; don't put it on screen.

**Score** = visual punch in a fast barrage (5 = reads in half a second). **People**: organisations and public figures
can stay; private individuals' names, handles, avatars and faces get blurred. Emoji in posts are written as `[name]`
here; `manifest.json` has the exact characters.

## Top 12 for the barrage

| # | ID | What it shows | Answer |
|---|---|---|---|
| 1 | T2-01 | Scam Sniffer: "A victim lost $908,551 due to a phishing approval signed 458 days ago." | A2, A3, A5 |
| 2 | T2-04 | Decrypt: "OpenSea Exploit Sees Bored Ape Yacht Club NFT Sell For $1,700 in Ethereum" (old listings filled later) | A3, A4, A5 |
| 3 | T2-09 | Ben Zhou (Bybit CEO): "all the signers saw the musked UI which showed the correct address" | A2 |
| 4 | T2-10 | NBC News: "Hackers steal $1.5 billion from exchange Bybit in biggest-ever crypto heist" | A2 |
| 5 | T2-07 | Devin Finzer (OpenSea CEO): "32 users thus far have signed a malicious payload from an attacker" | A2 |
| 6 | T2-12 | Scam Sniffer: "someone lost 12,083 spWETH ($32.43M) after signing a "permit" phishing signature." | A2 |
| 7 | T1-01 | Security Alliance: seed phrases stored in LastPass before 2023 "might be at risk ... 15+ cases ... TODAY" | A1 |
| 8 | T1-02 | KrebsOnSecurity: "Feds Link $150M Cyberheist to 2022 LastPass Hacks" | A1 |
| 9 | T1-08 | Cointelegraph: "Ledger details LTE-enabled spy implants in wallets sold by CryptoBilis" | A1 |
| 10 | T3-01 | Cointelegraph: "Your keys, his coins — Cryptopia employee admits to stealing $172K in crypto" | A1 |
| 11 | T3-03 | Kaspersky: "Case study: fake hardware cryptowallet" (shipped with seed phrases the crooks knew) | A1, A5 |
| 12 | T4-01 | Scam Sniffer 2024 card: "$494M+ TOTAL LOSS ... 332K+ VICTIMS" | A2 |

Voice options: **V2** Devcon, "Blind signing is simply equivalent to signing a blank check." (CC BY) and **V1** FBI,
"That private key or seed phrase is all that is standing between you and someone trying to take your money." (public
domain, with a seal caveat).

One possible 8 s order (the editor's call): seed phrases leak (T1-01, T1-02, T1-08) → signatures drain (T2-12, T2-07,
T2-09, T2-10) → old signatures used later (T2-04, then hold on T2-01) → the number (T4-01) under the V2 line.

Balance: OpenSea appears in several items (T2-03 to T2-08); use two at most. Ledger appears in T1-08 to T1-11 and in
V2; use one Ledger item at most so the cut doesn't read as an attack on one wallet brand.

---

## Theme 1: Seed phrases leak, get copied, get stolen

### T1-01 · X post · Security Alliance (@_SEAL_Org) · 2024-12-16 · score 5 · top 7
- URL: https://x.com/_SEAL_Org/status/1868805837311074576
- Text: "[warning] Reminder that if you ever stored your private keys or seed phrases in LastPass prior to 2023, your funds
  might be at risk. We've seen 15+ cases of potential LastPass-related hacks TODAY / Move your assets before hackers
  move them for you. For more information, keep reading[thread]"
- Why: a seed phrase copied years ago still empties wallets today. A1.
- People: organisation. Blur: none.
- Fact check: VERIFIED as SEAL's own post. "15+ cases" is SEAL's count, not independently checked.
- Capture: `t1-x-seal-org-2024-12-16-lastpass-seed-phrases-at-risk-{light,dark}.png`

### T1-02 · News · KrebsOnSecurity · 2025-03-07 · score 4 · top 8
- URL: https://krebsonsecurity.com/2025/03/feds-link-150m-cyberheist-to-2022-lastpass-hacks/
- Headline: "Feds Link $150M Cyberheist to 2022 LastPass Hacks"
- Why: seed phrases kept in a password manager, stolen in 2022 breaches, used to drain wallets in 2024. A1.
- People: header photo of Brian Krebs (journalist, public). Blur: none. Site ad hidden at capture.
- Fact check: REPORTED. Krebs quotes a federal seizure filing: about $24 million seized from a $150 million theft on
  2024-01-30; researchers found each victim had stored a seed phrase in LastPass "Secure Notes". LastPass says it has
  seen no conclusive evidence of the link.
- Capture: `t1-news-krebsonsecurity-2025-03-07-lastpass-150m-cyberheist.png`

### T1-03 · X post · MetaMask (@MetaMask) · 2022-04-17 · score 4
- URL: https://x.com/MetaMask/status/1515727239391809536
- Text: "[lock] If you have enabled iCloud backup for app data, this will include your password-encrypted MetaMask vault.
  If your password isn't strong enough, and someone phishes your iCloud credentials, this can mean stolen funds.
  (Read on [pointing down]) 1/3"
- Why: wallet backups land in the cloud and get phished. A1.
- People: organisation. Blur: none.
- Fact check: VERIFIED (primary). The ~$650K loss that prompted it is REPORTED (Decrypt, The Block, AppleInsider).
- Capture: `t1-x-metamask-2022-04-17-icloud-backup-vault-phished-{light,dark}.png`

### T1-04 · X post · Solana Status (@SolanaStatus) · 2022-08-03 · score 4
- URL: https://x.com/SolanaStatus/status/1554921397717180416
- Text (post 2/3): "This exploit was isolated to one wallet on Solana, and hardware wallets used by Slope remain secure. / While the
  details of exactly how this occurred are still under investigation, but private key information was inadvertently
  transmitted to an application monitoring service.  2/3"
- Why: a wallet app sent private keys to a logging service; thousands of wallets were drained. A1.
- People: organisation. Blur: none.
- Fact check: VERIFIED (primary). Scale is REPORTED and varies: "almost 8,000 wallets" (The Block, 2022-08-03),
  $4M to $8M elsewhere.
- Capture: `t1-x-solanastatus-2022-08-03-slope-private-keys-sent-to-monitoring-light.png` (thread hidden)

### T1-05 · Press release · Kaspersky · 2025-02-05 · score 3
- URL: https://www.kaspersky.com/about/press-releases/kaspersky-discovers-new-crypto-stealing-trojan-in-appstore-and-google-play
- Headline: "Kaspersky discovers new crypto-stealing Trojan in AppStore and Google Play"
- Why: malware (SparkCat) reads screenshots of recovery phrases in phone galleries. A1.
- People: none. Blur: none.
- Fact check: VERIFIED: "the first known instance of optical recognition-based malware appearing in AppStore"; Google
  Play apps "downloaded over 242,000 times"; it steals "screenshots containing cryptocurrency wallet recovery phrases".
- Capture: `t1-pr-kaspersky-2025-02-sparkcat-app-store-trojan.png` (headline only; plain)

### T1-06 · X post · Trust Wallet (@TrustWallet) · 2025-12-26 · score 4
- URL: https://x.com/TrustWallet/status/2004475085168795941
- Text: "Update on the Trust Wallet Browser Extension (v2.68) incident: / We've confirmed that approximately $7M has been
  impacted and we will ensure all affected users are refunded. / Supporting affected users is our top priority, and
  we are actively finalizing the process to refund the" (truncated by the embed; quotes their first notice)
- Why: a poisoned extension update harvested seed phrases. A1.
- People: organisation. Blur: none. Brand: a wallet company.
- Fact check: VERIFIED ($7M is Trust Wallet's own figure). The seed-phrase theft is REPORTED (SlowMist via The Hacker
  News: "Once decrypted, the mnemonic phrase is sent to the attacker's server").
- Capture: `t1-x-trustwallet-2025-12-26-extension-7m-impacted-light.png`

### T1-07 · News · The Hacker News · 2025-12-26 · score 4
- URL: https://thehackernews.com/2025/12/trust-wallet-chrome-extension-bug.html
- Headline: "Trust Wallet Chrome Extension Breach Caused $7 Million Crypto Loss via Malicious Code"
- Why: same incident as a headline. A1.
- People: byline only. Blur: none. Site ads hidden at capture.
- Fact check: VERIFIED (see T1-06).
- Capture: `t1-news-thehackernews-2025-12-26-trust-wallet-7m.png`

### T1-08 · News · Cointelegraph · 2026-10-13 · score 4 · top 9
- URL: https://cointelegraph.com/news/ledger-cellular-implants-wallets-sold-cryptobilis
- Headline: "Ledger details LTE-enabled spy implants in wallets sold by CryptoBilis"
- Why: hardware wallets from a reseller had an implant that read the 24 words off the screen during setup, so someone
  else had the keys from day one. A1 (and theme 3: buying a wallet means trusting its past).
- People: journalist avatars. Blur: none. Brand: Ledger (the reseller was the problem).
- Fact check: VERIFIED that Ledger Donjon described the implant (decodes the 24 words shown during setup, sends them over
  LTE with an eSIM). Loss totals UNVERIFIED ("could exceed $86 million" per investigator Specter, $103 million per
  Yfarmx; Ledger hasn't confirmed a total). Show no dollar figure for this case.
- Capture: `t1-news-cointelegraph-2026-10-13-ledger-lte-spy-implants-cryptobilis.png`

### T1-09 · X post · Ledger (@Ledger) · 2026-10-13 · score 3
- URL: https://x.com/Ledger/status/2109896739985453358
- Text: "Update from Ledger Donjon on the CryptoBilis investigation [down button] / @DonjonLedger is investigating Ledger
  signers sold by CryptoBilis, a reseller in Southeast Asia, that contained an unauthorized hardware implant. Ledger
  confirmed this on October 10th for one affected user's signer." (truncated by the embed)
- Why: primary statement behind T1-08.
- People: organisation. Blur: none. Fact check: VERIFIED (primary).
- Capture: `t1-x-ledger-2026-10-13-cryptobilis-hardware-implant-light.png`

### T1-10 · X post · Jacob Canfield (@JacobCanfield) · 2025-04-28 · score 4
- URL: https://x.com/JacobCanfield/status/1916977850344694024
- Text: "Breaking: New scam meta launched. Now they're sending physical letters to the @Ledger addresses database leak
  requesting an 'upgrade' due to a security risk. / Be very cautious and warn any friends or family that you know is
  in crypto and is not that savvy." Two photos of a paper letter that asks the reader to scan a QR code and enter the
  "recovery phrase".
- Why: phishing for recovery phrases by post. Strong visual (a real letter). A1.
- People: an individual (crypto trader with a verified account; semi-public). **Blur his avatar, name and handle**
  unless you treat him as a public figure. **Blur the QR code** (it pointed to a live phishing site). He had already
  redacted the name and reference number on the letter.
- Fact check: VERIFIED: Ledger replied "You are correct, this is a scam."
  (https://x.com/Ledger/status/1917209656973213746, 2025-04-29); The Block reported it on 2025-04-30.
- Capture: `t1-x-jacobcanfield-2025-04-28-fake-letter-recovery-phrase-light.png`

### T1-11 · News · Cointelegraph · 2026-02-17 · score 3
- URL: https://cointelegraph.com/news/scammers-send-physical-letters-trezor-ledger-users-again
- Headline: "Crypto phishers are sending letters to Trezor, Ledger users again"
- Why: the same letter scam, still running in 2026, against two wallet brands' customers. A1.
- People: journalist avatars; illustration. Blur: none.
- Fact check: VERIFIED (the QR code leads to a fake site where users are tricked into "entering their wallet recovery
  phrases").
- Capture: `t1-news-cointelegraph-2026-02-17-phishers-letters-trezor-ledger.png`

### T1-12 · News · CoinDesk · 2026-01-16 · score 4
- URL: https://www.coindesk.com/business/2026/01/16/hacker-steals-usd282-milion-in-hardware-wallet-social-engineering-attack
- Headline: "Hacker steals $282 million crypto from a victim in social-engineering attack"
- Why: one person talked out of a hardware wallet's secret. A1.
- People: stock photo. Blur: none. Crop out the black (blocked) video-player box at the right.
- Fact check: REPORTED ($282M in BTC and LTC per investigator ZachXBT; theft on 2026-01-10). That the victim gave away
  the seed phrase is UNVERIFIED (other outlets say so; CoinDesk says only "social-engineering attack").
- Capture: `t1-news-coindesk-2026-01-16-282m-social-engineering.png`

### Not captured (theme 1)
- **BleepingComputer, 2026-10-12, "Ledger confirms spy chip implant behind wallet crypto thefts"**,
  https://www.bleepingcomputer.com/news/security/ledger-confirms-hardware-wallet-spy-implant-behind-crypto-thefts/ .
  Same case as T1-08. Behind a Cloudflare check, so skipped. Score 4.
- **The Block, 2025-04-30, "Ledger confirms physical scam letters requesting seed phrase in fake security upgrade"**,
  https://www.theblock.co/post/352479/ledger-confirms-physical-scam-letters-requesting-seed-phrase . Same case as T1-10.
  Blocked plain fetches; T1-10 and T1-11 cover it. Score 3.

---

## Theme 2: Signatures that drain wallets later (and signing what you can't read)

### T2-01 · X post · Scam Sniffer (@realScamSniffer) · 2025-08-02 · score 5 · top 1
- URL: https://x.com/realScamSniffer/status/1951528627985850508
- Text: "[siren] ALERT: A victim lost $908,551 due to a phishing approval signed 458 days ago. / [lock with key] REMINDER:
  Regularly review and revoke old approvals - your wallet security matters! [money bag]"
- Why: the film's central problem in one line, "a signature made before can still be used after". A2 (Satchel
  refuses approvals and permits), A3, A5.
- People: organisation. **Blur the victim's wallet address fragments** in the attached Etherscan screenshot
  (`0x6c0eB6ef...9Ffb8d8aF` and the longer `...9d7c7AF129aE9D1B5E3e9Ffb8d8aF`).
- Fact check: VERIFIED (primary post). Cointelegraph (T2-02) independently reports "$908,551 ... 458 days after
  unknowingly signing a malicious approval transaction" from on-chain data. Wording: it was an on-chain approval
  transaction, so caption it "approval", not "signature".
- Capture: `t2-x-realscamsniffer-2025-08-02-approval-signed-458-days-ago-908k-{light,dark}.png`

### T2-02 · News · Cointelegraph · 2025-08-03 · score 4
- URL: https://cointelegraph.com/news/crypto-victim-loses-908k-in-sophisticated-phishing-attack
- Headline: "Crypto victim loses $908K in sophisticated phishing attack" (subhead: "A victim lost $908,551 in a crypto
  phishing scam 15 months after signing a malicious approval transaction. ...")
- Why: same case, with a big "$908K" illustration. A2, A5.
- People: illustration; journalist avatars. Blur: none. Fact check: VERIFIED (see T2-01).
- Capture: `t2-news-cointelegraph-2025-08-delayed-phishing-908k.png`

### T2-03 · Blog · Elliptic · 2022-01-24 · score 5
- URL: https://www.elliptic.co/blog/bug-allows-nfts-worth-over-1-million-to-be-stolen
- Headline: "Hackers Exploit Bug to "Steal" $1 Million in NFTs from OpenSea Users"
- Key line: "Those old listings are now being used to purchase NFTs at prices chosen by the seller in the past."
- Why: the clearest real case of old signatures used after the owner moved on (signed listings are signatures). A3, A4,
  A5.
- People: the lead image is an OpenSea activity table. **Blur the marketplace usernames** (Vault327, jpegdegenl...,
  TBALLER, MAYC-A-Wi...).
- Fact check: VERIFIED (Elliptic's own analysis): "NFTs with a market value of $1.1 million have been purchased in this
  way"; Bored Ape #9991 bought for 0.77 ETH (~$1,800), resold 20 minutes later for 84.2 ETH (~$196,000).
- Capture: `t2-blog-elliptic-2022-01-24-opensea-bug-old-listings-1m.png`

### T2-04 · News · Decrypt · 2022-01-24 · score 5 · top 2
- URL: https://decrypt.co/91076/opensea-exploit-sees-bored-ape-yacht-club-nft-sell-1700
- Headline: "OpenSea Exploit Sees Bored Ape Yacht Club NFT Sell For $1,700 in Ethereum" / subhead: "A listing bug on OpenSea
  allowed one user to buy Bored Ape Yacht Club NFTs at old prices, far below the current floor price."
- Why: same incident; biggest, most legible headline. A3, A4, A5.
- People: journalist avatar. Lead image is Bored Ape #9991 ("Image: Yuga Labs"): third-party art, crop to the headline
  if rights are a concern. Blur: none.
- Fact check: VERIFIED via T2-03. OpenSea later refunded about 750 ETH (~$1.8M): REPORTED (Decrypt).
- Capture: `t2-news-decrypt-2022-01-24-opensea-exploit-bayc-sells-1700.png`

### T2-05 · News · The Record (Recorded Future News) · 2022-01-24 · score 4
- URL: https://therecord.media/hacker-abuses-opensea-to-buy-nfts-at-older-cheaper-prices
- Headline: "Hacker abuses OpenSea to buy NFTs at older, cheaper prices"
- Why: same incident from a security outlet. A3, A5.
- People: byline (Catalin Cimpanu, journalist). Blur: none. Crop away the right column of unrelated 2026 briefs.
- Fact check: VERIFIED via T2-03.
- Capture: `t2-news-therecord-2022-01-24-opensea-old-cheaper-prices.png`

### T2-06 · X post · PeckShield (@PeckShieldAlert) · 2022-01-24 · score 3
- URL: https://x.com/PeckShieldAlert/status/1485547426467364864
- Text: "It appears that @opensea has a front-end issue and the exploiter gained about 332 Ether"
- Why: first alert on the same incident.
- People: organisation. Blur (optional): the exploiter's address fragment in the link card (`0xb1a22c...`).
- Fact check: VERIFIED as PeckShield's claim; 332 ETH not checked on-chain.
- Capture: `t2-x-peckshieldalert-2022-01-24-opensea-old-listings-332-eth-light.png`

### T2-07 · X post · Devin Finzer (@dfinzer), OpenSea co-founder and CEO · 2022-02-20 · score 5 · top 5
- URL: https://x.com/dfinzer/status/1495245308812402688
- Text: "As far as we can tell, this is a phishing attack. We don't believe it's connected to the OpenSea website. It
  appears 32 users thus far have signed a malicious payload from an attacker, and some of their NFTs were stolen."
- Why: users signed something they couldn't read and lost their NFTs. A2.
- People: public figure (CEO); avatar is an NFT image. Blur: none.
- Fact check: VERIFIED (primary). OpenSea later said 17 users were affected (REPORTED, CoinDesk 2022-02-21); losses
  about $1.7M (T2-08).
- Capture: `t2-x-dfinzer-2022-02-20-opensea-32-users-signed-malicious-payload-{light,dark}.png` (thread hidden)

### T2-08 · News · Engadget · 2022-02-20 · score 4
- URL: https://www.engadget.com/opensea-phishing-attack-190402620.html
- Headline: "OpenSea users lose hundreds of NFTs in likely phishing attack" / subhead: "The damage is estimated at $1.7
  million."
- Why: same incident, mainstream tech outlet. A2.
- People: none. Lead photo is "JUSTIN TALLIS via Getty Images": crop to the headline block unless licensed. Blur: none.
- Fact check: REPORTED (Engadget citing Molly White's estimate, 641 ETH).
- Capture: `t2-news-engadget-2022-02-20-opensea-phishing-hundreds-of-nfts.png`

### T2-09 · X post · Ben Zhou (@benbybit), Bybit co-founder and CEO · 2025-02-21 · score 5 · top 3
- URL: https://x.com/benbybit/status/1892963530422505586
- Text (as shown; the embed truncates): "Bybit ETH multisig cold wallet just made a transfer to our warm wallet about 1 hr
  ago. It appears that this specific transaction was musked, all the signers saw the musked UI which showed the
  correct address and the URL was from @safe . However the signing message was to change" ("musked" is his spelling;
  keep it.)
- Why: every signer approved what they could not read. A2.
- People: public figure (CEO). Blur (optional): the transaction-hash fragment in the Etherscan card.
- Fact check: VERIFIED (primary); amount and attribution VERIFIED by the FBI (T2-11).
- Don't overclaim: Bybit was an exchange's multisig. Use it as "signers couldn't read what they signed", never as
  "Satchel would have stopped Bybit".
- Capture: `t2-x-benbybit-2025-02-21-bybit-signers-saw-masked-ui-{light,dark}.png`

### T2-10 · News · NBC News · 2025-02-21 · score 5 · top 4
- URL: https://www.nbcnews.com/tech/crypto/hackers-steal-15-billion-exchange-bybit-biggest-ever-crypto-heist-rcna193273
- Headline: "Hackers steal $1.5 billion from exchange Bybit in biggest-ever crypto heist"
- Why: mainstream scale for the blind-signing story. A2.
- People: lead photo of Ben Zhou (public figure; agency photo): crop to the headline block unless licensed. Blur: none.
- Fact check: VERIFIED ($1.5B per the FBI, T2-11).
- Capture: `t2-news-nbcnews-2025-02-21-bybit-biggest-ever-crypto-heist.png`

### T2-11 · Government · FBI / IC3 Public Service Announcement I-022625-PSA · 2025-02-26 · score 4 · DROPPED (no FBI material)
- URL: https://www.ic3.gov/PSA/2025/PSA250226
- Headline: "North Korea Responsible for $1.5 Billion Bybit Hack"
- Why: official confirmation of T2-09 and T2-10.
- People: none. FBI and IC3 seals: a US government work (no copyright), but 18 U.S.C. 701 and 709 bar uses of the FBI
  seal or name that suggest endorsement. Never pair it with Satchel branding that could read as approval; consider
  cropping the seals.
- Fact check: VERIFIED (primary).
- Capture: `t2-gov-ic3-fbi-2025-02-26-north-korea-1-5b-bybit-psa.png`

### T2-12 · X post · Scam Sniffer (@realScamSniffer) · 2024-09-28 · score 5 · top 6
- URL: https://x.com/realScamSniffer/status/1839923975184625832
- Text: "[siren] 43 mins ago, someone lost 12,083 spWETH ($32.43M) after signing a "permit" phishing signature.[money
  with wings]"
- Why: one gasless off-chain signature, $32M gone. A2 (Satchel refuses permits and Permit2).
- People: organisation. **Blur the victim and phishing address fragments** in the screenshot (e.g.
  `0xAA158208...F86A3eE57`).
- Fact check: VERIFIED (primary post); also reported by Cointelegraph and BeInCrypto. Not checked on-chain.
- Capture: `t2-x-realscamsniffer-2024-09-28-permit-signature-32m-{light,dark}.png`

### T2-13 · X post · Scam Sniffer · 2024-10-11 · score 4
- URL: https://x.com/realScamSniffer/status/1844590237521203610
- Text: "[siren] 5 hours ago, someone lost 15,079 fwDETH($35M) after signing a "permit" phishing signature.[money with
  wings]"
- Why: same pattern, bigger number. A2. People: organisation. **Blur address and hash fragments** in the screenshot.
- Fact check: VERIFIED (primary post).
- Capture: `t2-x-realscamsniffer-2024-10-11-permit-signature-35m-{light,dark}.png`

### T2-14 · X post · Scam Sniffer · 2025-12-08 · score 3
- URL: https://x.com/realScamSniffer/status/1998018496635207832
- Text: "[siren] Someone lost $440,358 in $USDC after signing a malicious "permit" signatures." (quotes their November
  2025 report: "$7.77M | 6,344 victims ... top hit at $1.22M (permit signature)")
- Why: still happening at the end of 2025. A2. People: organisation. **Blur address and hash fragments.** Busy card;
  crop to the top half.
- Fact check: VERIFIED (primary post); Decrypt covered it ("What a $440,000 Hack Shows About the Rising Threat of
  Ethereum 'Permit Scams'").
- Capture: `t2-x-realscamsniffer-2025-12-08-permit-signature-440k-usdc-light.png`

### T2-15 · X post · Wintermute (@wintermute_t) · 2025-05-30 · score 4
- URL: https://x.com/wintermute_t/status/1928501765865091400
- Text: "While EIP-7702 brings new convenience, it also introduces new risks / Our Research team found that over 97% of
  all EIP-7702 delegations were authorized to multiple contracts using the same exact code. These are sweepers, used to
  automatically drain incoming ETH from compromised" (truncated by the embed)
- Why: the new signature type was mostly used to drain wallets whose keys had already leaked. A1, A2 (Satchel refuses
  7702 authorizations).
- People: organisation. Blur (optional): contract address fragments in the Dune legend.
- Fact check: VERIFIED as Wintermute's claim. The Block (2025-06-01) reported "over 80%". The sweepers hit
  already-compromised keys: don't caption it "97% of users were robbed".
- Capture: `t2-x-wintermute-2025-05-30-eip7702-97pct-sweepers-{light,dark}.png`

### T2-16 · X post · Scam Sniffer · 2025-05-24 · score 3
- URL: https://x.com/realScamSniffer/status/1926296681198326254
- Text: "[siren] ALERT: An address upgraded to EIP-7702 lost $146,551 through malicious batched transactions in phishing
  attack."
- Why: the first EIP-7702 batch-signature phishing loss. A2. People: organisation. **Blur the victim address**
  (`0xc6d2...06dc`) and other fragments.
- Fact check: VERIFIED (primary post).
- Capture: `t2-x-realscamsniffer-2025-05-24-eip7702-batched-146k-light.png`

### T2-17 · News · Decrypt · 2024-07-19 · score 3
- URL: https://decrypt.co/240604/wazirx-loses-230-million-in-suspected-dprk-hack
- Headline: "WazirX Loses $230 Million in Suspected DPRK Hack"
- Why: another multisig whose signers approved what the screen didn't show. WazirX described "a discrepancy between the
  data displayed on Liminal's interface and the transaction's actual contents". A2.
- People: stock image. Blur: none.
- Fact check: REPORTED; the cause is disputed (Liminal blames compromised WazirX devices). Elliptic estimates ~$235M.
- Capture: `t2-news-decrypt-2024-07-19-wazirx-230m.png`

### T2-18 · News · CoinDesk · 2026-04-02 · score 5 (added 2026-11-11)
- URL: https://www.coindesk.com/tech/2026/04/02/how-a-solana-feature-designed-for-convenience-let-an-attacker-drain-usd270-million-from-drift
- Headline: "How a Solana feature designed for convenience let attackers drain more than $270 million from Drift"
- Subhead: "The exploit did not involve a bug in Drift's code. It used "durable nonces," a legitimate Solana transaction
  feature, to pre-sign administrative transfers weeks before executing them, bypassing the protocol's multisig
  security in minutes."
- By Shaurya Malwa; published Apr 2, 2026, 11:08 a.m. EDT (updated 11:35 a.m. EDT).
- Why: "Signed once. Used later." Drift's Security Council multisig signers pre-signed admin transfers that stayed
  valid through Solana durable nonces and were executed later. Satchel refuses durable-nonce messages, so its Solana
  signatures expire with their recent blockhash, and the buyer's check can prove it ("Blockhash expired").
- **The figure:** "$270 million" is CoinDesk's total of the assets drained from the protocol's vaults ("at least
  $270 million"; "roughly $270 million across dozens of tokens", citing researcher Vladimir S.).
- Fact check: VERIFIED in CoinDesk's own report, citing Drift's posts: four durable-nonce accounts were created on
  March 23 and the attacker executed on April 1. That is nine days, "more than a week", so prefer "days later" or "more
  than a week later" over "weeks later" in our own captions; the subhead's "weeks before" is CoinDesk's wording. Two of
  the multisig's signers were legitimate council members who "likely thought they were approving a routine
  transaction"; no keys needed to be compromised.
- People: journalist byline only. Blur: none. Lead image left out of the plate.
- Plate: `plates/t2-18-coindesk-drift-durable-nonce-270m.png`

### T2-19 · News · The Hacker News · 2026-04-03 · score 4 (added 2026-11-11)
- URL: https://thehackernews.com/2026/04/drift-loses-285-million-in-durable.html
- Headline: "Drift Loses $285 Million in Durable Nonce Social Engineering Attack Linked to DPRK"
- By Ravie Lakshmanan; Apr 03, 2026.
- Why: the same incident, with Drift's own number. Satchel: durable nonces refused.
- **The figure:** "$285 million" is Drift's own confirmed figure ("attackers drained about $285 million from the
  platform during a security incident that took place on April 1, 2026"). Elliptic's report puts it at $286M. The two
  headlines differ ($270M vs $285M): CoinDesk's is a researcher's sum of the drained tokens (published Apr 2), THN's is
  Drift's own figure (Apr 3), and the valuations differ. Don't put the two figures side by side.
- Fact check: VERIFIED (Drift statement as quoted: "multi-week preparation and staged execution, including the use of
  durable nonce accounts to pre-sign transactions that delayed execution"; "unauthorized or misrepresented
  transaction approvals obtained prior to execution"; no evidence of compromised seed phrases). The DPRK link is
  REPORTED as "indications" (Elliptic, TRM Labs), not confirmed.
- People: none. Blur: none. Lead image left out of the plate.
- Plate: `plates/t2-19-thehackernews-drift-285m-durable-nonce.png`

### Not captured (theme 2)
- **Radiant Capital post-mortem (Medium, late 2024)**, https://medium.com/@RadiantCapital/radiant-post-mortem-fecd6cd38081 .
  About $50M lost after hardware wallets blind-signed malicious transactions that looked valid on screen. REPORTED via
  secondary coverage only. Plain text page, score 2.

---

## Theme 3: Handing over or selling a wallet is unsafe

**Evidence is thin here.** I found no documented case of a wallet sale (OTC, airdrop-wallet or NFT-wallet) where the
seller emptied it afterwards with a key or signature kept from before, and no credible reporting on airdrop-wallet
sales, only generic warnings. An academic survey (arXiv 2508.07190) reportedly notes that a seller could empty an
ERC-6551 token-bound account just before a sale closes, but its abstract doesn't say so and I did not verify the body:
UNVERIFIED, not for the screen. The closest real cases: keys copied while someone had access and used later (T3-01),
one seed phrase known to two people (T3-02), wallets that came pre-seeded or implanted (T3-03, T1-08), and old
signatures filled after the owner moved on (T2-03 to T2-05). Together they make the point: whoever touched a wallet's
secret before you can still use it.

### T3-01 · News · Cointelegraph · 2021-07-05 · score 5 · top 10
- URL: https://cointelegraph.com/news/your-keys-his-coins-cryptopia-employee-admits-to-stealing-172k-in-crypto
- Headline: "Your keys, his coins — Cryptopia employee admits to stealing $172K in crypto"
- Why: a copied key outlives every handover. A1 (nothing to copy), and holding the NFT is holding the wallet.
- People: illustration; journalist avatars. The employee isn't named in the capture. Blur: none.
- Fact check: VERIFIED in Cointelegraph's report of his guilty plea: he "made his own copy of the information on a USB
  flash drive"; theft of "roughly $172,000" (other outlets: $170K to $177K).
- Capture: `t3-news-cointelegraph-2021-07-05-cryptopia-your-keys-his-coins.png`

### T3-02 · News · NBC 6 South Florida (NBC Miami) · 2026-05-27 · score 4
- URL: https://www.nbcmiami.com/news/local/miami-man-arrested-in-theft-of-1-9-million-in-bitcoin-from-former-employer-cops-say/3813867/
- Headline: "Miami man arrested in theft of $1.9M in Bitcoin from former employer, cops say"
- Key line: "The wallet contained a "seed phrase" and the only people who had it were the victim and Castro"
- Why: two people knew one seed phrase, and the loss went unnoticed for years. A1.
- People: **a private individual, named in the subhead. Blur the name.** It is an allegation from an arrest report (no
  conviction known): say "police say".
- Fact check: REPORTED (NBC 6, citing the arrest report).
- Capture: `t3-news-nbcmiami-2026-05-27-ex-employer-1-9m-bitcoin.png` (newsletter pop-up hidden)

### T3-03 · Blog · Kaspersky Daily · 2023-05-10 · score 4 · top 11
- URL: https://www.kaspersky.com/blog/fake-trezor-hardware-crypto-wallet/48155/
- Headline: "Case study: fake hardware cryptowallet" / subhead: "Full review of a fake cryptowallet incident. It looks
  and feels like a Trezor wallet, but puts all your crypto-investments into the hands of criminals."
- Why: a wallet bought second-hand already had a seed phrase the sellers knew. Buying a wallet means trusting its past.
  A1, A5.
- People: author avatar (Kaspersky employee). Blur: none. Brand note: a counterfeit, not a Trezor flaw.
- Fact check: VERIFIED: the firmware replaced "the randomly generated seed phrase ... with one of 20 pre-generated seed
  phrases saved in the hacked firmware"; Kaspersky's press release (2023-05-10, "Almost $30K stolen via fake hardware
  wallet, Kaspersky investigation shows") gives 1.33 BTC (~$29,585).
- Capture: `t3-blog-kaspersky-2023-05-10-fake-trezor-preset-seed.png` (cookie bar and promo strip hidden)

### Not captured (theme 3)
- **Help Net Security, 2018-01-09, "Hardware wallet security is no match for scammers' ingenuity"**
  (https://www.helpnetsecurity.com/2018/01/09/hardware-wallet-security/): an eBay-bought Ledger Nano shipped with a
  pre-filled recovery sheet, about $34K lost. Site behind a bot check; the underlying source is a private person's
  Reddit post. UNVERIFIED, don't use.

---

## Theme 4: Big numbers (primary sources only)

### T4-01 · Report · Scam Sniffer, annual report 2024 · 2025-01-03 · score 4 · top 12
- URL: https://drops.scamsniffer.io/scam-sniffer-2024-web3-phishing-attacks-wallet-drainers-drain-494-million/
- Headline: "Scam Sniffer 2024: Web3 Phishing Attacks – Wallet Drainers Drain $494 Million"
- Card text: "Crypto Phishing Report / Annual Report 2024 by ScamSniffer / $494M+ TOTAL LOSS (up 67%) / 332K+ VICTIMS (up
  3.7%) / $55.4M LARGEST SINGLE LOSS (up 130%) / 30 LARGE LOSS CASES (up 56%)"
- Why: malicious signatures took about half a billion dollars in one year. A2.
- Fact check: VERIFIED: "approximately $494 million in losses"; "332,000 addresses"; largest theft $55.48M in the text
  (the card rounds to $55.4M); Permit was 56.7% of large-case losses.
- Capture: `t4-report-scamsniffer-2025-01-03-drainers-494m-2024-figure.png` (the card) and `...-2024.png` (headline)

### T4-02 · Report · Scam Sniffer, annual report 2025 · 2026-01-03 · score 3
- URL: https://drops.scamsniffer.io/scam-sniffer-2025-crypto-phishing-losses-fall-83-to-84-million/
- Headline: "Scam Sniffer 2025: Crypto Phishing Losses Fall 83% to $84 Million"; chart "Year-over-Year Comparison /
  Signature Phishing Losses | 2023 - 2025" ($295M, $494M, $84M).
- Why: three years of signature phishing; 2025's largest single theft was one Permit signature. A2.
- Fact check: VERIFIED: "$83.85M across 106,106 victims"; "Largest single theft: $6.5M via Permit signature
  (September)"; "Permit/Permit2 signatures accounted for 38% of large-case losses". Losses fell in 2025, so don't use
  this headline to suggest growth.
- Capture: `t4-report-scamsniffer-2026-01-03-phishing-2025-84m-figure.png` (chart) and `...-84m.png` (headline)

### T4-03 · Report · Chainalysis blog · 2025-12-18 · score 4
- URL: https://www.chainalysis.com/blog/crypto-hacking-stolen-funds-2026/
- Headline: "North Korea Drives Record $2 Billion Crypto Theft Year, Pushing All-Time Total to $6.75 Billion"
- Key line (TL;DR): "Individual wallet compromises surged to 158,000 incidents affecting 80,000 unique victims in 2025,
  though total value stolen ($713M) decreased from 2024."
- Why: personal wallets are where thefts multiply. A1, A2.
- Fact check: VERIFIED: "over $3.4 billion in theft from January through early December 2025"; 158,000 incidents; at
  least 80,000 victims; $713M taken from individuals (down from $1.5B in 2024).
- Capture: `t4-report-chainalysis-2025-12-18-personal-wallet-158k-incidents.png` (crop to the 158,000 bullet) and
  `t4-report-chainalysis-2025-12-18-theft-3-4b-2025.png` (header)

### Not captured (theme 4)
- **FBI IC3, 2025 Annual Report (April 2026)**, https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf . VERIFIED in
  the PDF: cryptocurrency "181,565 complaints (21% increase from 2024); $11.366 billion in losses (22% increase from
  2024)"; "Cryptocurrency investment fraud was the highest source of financial losses to Americans in 2025 with $7.2
  billion reported in losses." **Caution:** most of this is investment fraud, which Satchel does not prevent. Use it
  only as "crypto is a target", never as "Satchel fixes $11 billion".
- **Chainalysis mid-year update (July 2025)**: "$2.17 billion" stolen in H1 2025; personal-wallet compromises 23.35% of
  stolen funds. REPORTED (The Block); primary not opened.
- **BleepingComputer, "Cryptocurrency wallet drainers stole $494 million in 2024"**: same figure as T4-01; behind a
  Cloudflare check. Use T4-01 (primary) instead.

---

## Video with voice (C)

Both clips are trimmed to the moment and sit in `raw/video/` (with poster frames). Only 640x360 was reachable without a
browser session: fine for a small inset or audio only; for full-screen use, download the source in a normal browser.

### V1 · FBI public-service video, 2021 · public domain (with a seal caveat) · score 4 · DROPPED (2026-11-11: nothing from the FBI is used)
- Source: "Cybersecurity Awareness Month: What is Cryptocurrency?", FBI Portland forensic accountant. YouTube (FBI's
  official channel, uploaded 2021-10-22): https://www.youtube.com/watch?v=NkZe5vRAHF8 . FBI page:
  https://www.fbi.gov/video-repository/portland-cyber-cryptocurrency-102121.mp4/view (behind a Cloudflare check here).
- Licence: a US federal government work, so no US copyright (17 U.S.C. 105). Caveat: the FBI and DOJ seals hang behind
  the speaker, and 18 U.S.C. 701 and 709 bar uses of the FBI seal or name that imply endorsement. Use the audio over the
  montage, or crop or blur the seal, and label it "FBI public-service video (2021)". The speaker is an FBI employee on
  duty; audio only also avoids likeness questions.
- Clip A, `video/fbi-2021-never-share-seed-phrase.mp4`, in 00:03:31.45, out 00:03:34.95 (3.5 s): "Never share your
  private key or seed phrase with anyone."
- Clip B, `video/fbi-2021-seed-phrase-all-that-stands.mp4`, in 00:03:35.10, out 00:03:40.75 (5.7 s): "That private key
  or seed phrase is all that is standing between you and someone trying to take your money."
- Transcript from the FBI's own captions; the cut points sit in pauses.
- Fits: theme 1. Satchel's reply: there is no seed phrase.

### V2 · Devcon SEA 2024 talk · CC BY · score 5
- Source: Charles Guillemet (Ledger CTO), "DeFi Can't Move Forward Without Clear Signing: Let Me Change Your Mind",
  Devcon SEA, November 2024. YouTube (Ethereum Foundation channel, uploaded 2024-11-15):
  https://www.youtube.com/watch?v=qGSGzHMqsSQ . Archive:
  https://archive.devcon.org/devcon-7/defi-cant-move-forward-without-clear-signing-let-me-change-your-mind
- Licence evidence: the YouTube licence field reads "Creative Commons Attribution license (reuse allowed)". The Ethereum
  Foundation's terms of use (https://ethereum.org/en/terms-of-use/) also put non-code material on its sites, including
  videos and devcon.org, under CC BY 4.0 unless marked otherwise. The archive page footer says "© 2026 — Ethereum
  Foundation. All Rights Reserved."; minor ambiguity, but the YouTube licence is explicit. Credit on screen or in the
  description: "Charles Guillemet, Devcon SEA 2024 (Ethereum Foundation), CC BY".
- Clip, `video/devcon7-2024-blind-signing-blank-check.mp4`, in 00:01:00.86, out 00:01:04.62 (3.8 s): "Blind signing is
  simply equivalent to signing a blank check."
- Longer, `video/devcon7-2024-blind-signing-blank-check-long.mp4`, in 00:00:58.55, out 00:01:04.62 (6.1 s): "This is
  what we called, uh, blind signing, and blind signing is simply equivalent to signing a blank check."
- Transcript from YouTube auto-captions with word timings; cuts checked against audio levels.
- Frame: a slide titled "Blind Signing" (phone, then a blank check) with the speaker inset and DC7 SEA branding.
- Fits: theme 2. Satchel's reply: readable requests only. Caveats: a public figure from a wallet company, so it counts
  as the cut's one Ledger item; don't imply endorsement.

### Needs permission (ideas only, not downloaded)
- TV news segments on the Bybit hack (NBC, CNBC, Bloomberg TV): copyrighted broadcasts.
- Interviews and livestreams by the people in T2-07 and T2-09: copyright of the publisher or speaker. Unverified leads,
  not researched further.

---

## Don't overclaim

Satchel does **not** fix these. Keep them out of the cold open, or say nothing that implies otherwise:
- **Address poisoning**: e.g. CoinDesk, 2024-05-03, "Exploiter Steals $68M Worth of Crypto Through Address Poisoning"
  (https://www.coindesk.com/business/2024/05/03/exploiter-steals-68m-worth-of-crypto-through-address-poisoning).
  Satchel signs a readable transfer to whatever address the owner typed.
- **Investment scams and pig-butchering** (most of the IC3 $11.4B): the owner sends coins willingly.
- **Phishing the owner's NEAR account**: whoever controls the NEAR account holding the NFT controls the Satchel. Say
  "no seed phrase for its Bitcoin, Ethereum and Solana addresses", never "no keys at all" or "unphishable".
- **Lost hardware or drives** (the landfill bitcoin stories), **exchange insolvency** (FTX), **rug pulls**, and
  **wrench attacks** (Chainalysis: over $30M taken by force in H1 2026, REPORTED by Decrypt).
- **Exchange multisig hacks** (Bybit, WazirX, Radiant): use them only as proof that signers can't read what they sign;
  Satchel is not a multisig product.

## Privacy and licensing summary
- **Blur before use:** victim wallet addresses in every Scam Sniffer screenshot (T2-01, T2-12, T2-13, T2-14, T2-16);
  OpenSea usernames in the Elliptic image (T2-03); the accused's name (T3-02); Jacob Canfield's avatar, name and handle
  plus the QR code on the letter (T1-10). Optional: exploiter or exchange addresses and hashes (T2-06, T2-09, T2-15).
- **No seed phrases** appear in any capture.
- **News screenshots** are third-party copyright. Short, attributed, unaltered headline shots are a common
  commentary/fair-use pattern, but this is a promotional film: keep each on screen briefly, show the outlet, and crop
  out agency photos (Getty in T2-08, the agency photo in T2-10, the Yuga Labs art in T2-04) unless licensed. A quick
  legal look is worth it before release.
- **FBI material** (T2-11, V1): public domain, but never imply FBI endorsement (seal and name rules).
- **CC BY** (V2): attribution required.

## Method and limits
- X posts were captured from the public embed (`platform.twitter.com/embed/Tweet.html?id=<ID>`), no login, light and
  dark where useful; times on the cards are UTC. The oEmbed endpoint now returns HTTP 402, so it wasn't used.
- Pages were captured at 1280 CSS px wide at 2x. Cookie, consent and newsletter dialogs were hidden or removed, ad slots
  hidden and ad and video-ad requests blocked. No words or numbers were changed.
- Skipped because of bot checks (not bypassed): bleepingcomputer.com (four articles), reuters.com,
  helpnetsecurity.com, and the fbi.gov video page.
- Scripts and scratch files are in the session scratchpad, not in the repo.

## G1: the seed-phrase photo (poster frame, creative.md §8)

- **Files** (`marketing/video/public/v2/intro/g1/`): `G1.png` (2560x1440, full resolution, all 12 words readable) and
  `G1-blurred.png` (9 of the 12 words blurred on both the paper and the phone screen; 1. garden, 2. honey and 3. rocket
  stay readable, the numbers 4 to 12 stay visible). `G1-blur-regions.json` lists the 18 blurred boxes (9 words, twice).
  The blur is a 10x downscale plus a Gaussian blur (r = 14) under a feathered mask, so the letters can't be read back.
- **Image:** generated with `gpt-image-2.6-flare`, quality high, 2560x1440, through `marketing/tools/lib/openai-image.mjs`
  (keys loaded only by `tools/lib/env.mjs`, never printed). 2 of the 6 allowed generations used; the first (`tries/G1-a1-flare.png`)
  is the one used, and the second (`tries/G1-b1-flare.png`, landscape phone) is a spare. The prompts and timings are in
  `g1/gen-log.jsonl`. Night-time desk lamp, a hand holding a phone with a generic camera viewfinder (white focus
  brackets, round shutter button), no brands, no logos, no faces. The model wrote all 12 words legibly and correctly,
  so no words need setting in code.
- **The words** (BIP39 English list, numbered as on the paper): 1. garden, 2. honey, 3. rocket, 4. velvet, 5. anchor,
  6. ladder, 7. orbit, 8. salmon, 9. tiger, 10. umbrella, 11. window, 12. copper.
- **Checksum proof** (`g1/G1-words-checksum-proof.json`, made with `@scure/bip39@1.6.0`): all 12 are in the 2048-word
  English list (indices 765, 873, 1499, 1936, 67, 995, 1247, 1523, 1807, 1889, 2011, 383). 12 words carry 128 bits of
  entropy and a 4-bit checksum, which must equal the first 4 bits of SHA-256(entropy). The words carry `1111` and the
  entropy `5fada6edf90086f8e6fdf3e1fd87ed97` requires `0101`, so the checksum is **invalid**, and `validateMnemonic`
  returns false. It is not a valid recovery phrase and can never open a wallet.
- **Note for the builder:** physically, the phone's camera faces away from the paper (the screen faces us); it reads as
  "photographing the list" at film speed.
