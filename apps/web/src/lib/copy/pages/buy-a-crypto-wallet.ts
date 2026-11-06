import type { FaqEntry, TableCopy } from "@/lib/copy/marketing";

/**
 * Copy for /buy-a-crypto-wallet (docs/design/seo/keyword-research.md #4). A protective safety explainer: it leads with
 * the scam patterns, never promises a balance, never says "free", and is testnet-explicit. The three outbound sources
 * are the ones the research cites. Links use `[label](/path-or-url)`.
 */
export const buyCopy = {
  answer:
    "Most crypto wallets for sale with a balance are scams, because the seller still knows the seed phrase. A real purchase needs a wallet the seller can't reach afterwards, and a way to check its past signatures. A Satchel is built for both.",
  scams: {
    h2: "Why wallets with a balance are a scam pattern",
    lead: "Searches for a wallet with a balance, or a seed phrase with a balance, lead to a handful of known traps. Security teams have written them up.",
    items: [
      "Leaked credentials. Scammers imitate an insider leak of a wallet's seed phrase or key, so you rush to take the coins. Kaspersky describes this in [Crypto trap for the greedy](https://www.kaspersky.com/blog/cryptowallet-seed-phrase-fake-leaks/51607/).",
      "Pre-filled seed phrases. A hardware wallet arrives with a recovery phrase already set. The seller knows it, so they can take whatever you add. PhishFort explains [the pre-filled seed phrase scam](https://phishfort.com/hardware-wallets-the-pre-filled-seed-phrase-scam/).",
      "Rotten seed phrases. A fake wallet site hands you a seed phrase the scammer already knows, then waits for you to add coins. MetaMask describes it in [Rotten seed phrases](https://medium.com/metamask/rotten-seed-phrases-a-new-scam-targeting-crypto-users-b414f9ef292e).",
      "Pay first. A common pattern asks for a fee, a deposit or a seed phrase before you see anything real.",
    ],
    after: [
      "One flaw runs through all of them: the seller still has the key. Nothing lets you check before you pay.",
      "If an offer says a wallet holds a balance, treat it as a scam until you can verify it yourself. A screenshot of a balance proves nothing.",
    ],
  },
  needs: {
    h2: "What a legitimate purchase needs",
    lead: "Buying a funded wallet from a stranger can work only if three things are true.",
    items: [
      "A key nobody else holds. The seller must not be able to sign after the sale.",
      "A way to check old signatures. A signature already made can move coins later, so you need to see every one and know none can.",
      "One step. You pay and receive the wallet in the same transaction, so neither side sends first.",
    ],
    after: "An ordinary seed-phrase wallet can't meet the first condition. That is why a wallet for sale with a balance is so often a trap.",
  },
  ask: {
    h2: "Five questions to ask before you pay anyone",
    items: [
      "Can the seller sign anything after the sale?",
      "Can I read every signature this wallet has made?",
      "Do I pay before or after I get the wallet?",
      "Am I being asked for a seed phrase, a fee, or to connect to a site I found in a message?",
      "Can I check the balance myself, on the chain, instead of trusting a picture?",
    ],
    after: "If you can't answer all five, walk away.",
  },
  compare: {
    h2: "Common offers compared",
    table: {
      caption: "What a buyer can verify in common wallet-for-sale offers",
      head: ["Offer", "Seller still has the key?", "Can you check before paying?", "Paid in one step?"],
      rows: [
        ["Seed phrase sent after payment", "Yes, any copy works", "No, only an address lookup", "No, you pay first"],
        ["Pre-filled hardware wallet", "Yes, the seller set the phrase", "No, the phrase is the secret", "No, you pay first"],
        ["Escrow service or broker", "Yes, if a seed phrase changes hands", "Only what the service shows", "No, several steps"],
        ["Satchel on its market", "No seed phrase exists for its addresses", "Yes, your browser checks every past signature", "Yes, one NEAR transaction"],
      ],
    } satisfies TableCopy,
  },
  satchel: {
    h2: "How a Satchel purchase meets the three conditions",
    lead: "A Satchel is an NFT on NEAR that is a wallet. Its sale page is built around the conditions above.",
    keyH3: "No seed phrase to copy",
    key: [
      "A Satchel has no seed phrase for its Bitcoin, Ethereum and Solana addresses. NEAR's signer network makes each signature, but only when the Satchel contract asks for the current owner.",
      "When the owner changes, the old owner stops being able to sign, and any spending allowance is cleared. Satchel never asks you for a seed phrase.",
    ],
    checkH3: "Your browser checks the record",
    check: [
      "Before signing, the contract writes down exactly what it will sign. Timed-out requests stay on the record too.",
      "On the sale page, your browser reads every record and checks each one on its own chain. Buy turns on only when no old signature can move the coins. The contract doesn't run this check, because it can't see other chains.",
      "[Satchel #4](/s/4/sale) is a demo built to fail: its one record can never be used, so Buy stays off. The [clean history](/clean-history) page explains each check.",
    ],
    oneH3: "One transaction settles it",
    one: [
      "A listed Satchel is paused: it can't sign, and only a purchase or an accepted offer can move it. You buy with one NEAR transaction that names the listing and the signature count your browser checked. If either changed, it fails and refunds you.",
      "Browse what's listed on the [market](/market). The same ideas from the seller's side are in [can you sell a crypto wallet](/sell-a-crypto-wallet). A gift skips this check, so read [how to give a crypto wallet](/transfer-a-crypto-wallet) before accepting one.",
    ],
  },
  limits: {
    h2: "What a Satchel purchase still can't promise",
    lead: "The check is a strong filter. It is not a guarantee, and Satchel is new.",
    items: [
      "Satchel runs on testnet today. Its coins have no value, and no balance here is real money.",
      "You still trust NEAR's signer network, which makes every signature. Satchel hasn't been audited.",
      "The check covers signatures made before the sale, not ones made after you buy.",
      "Prices on the market are in NEAR, and Satchel gives no tax or legal advice.",
    ],
  },
  faq: [
    {
      q: "Is buying a crypto wallet with a balance a scam?",
      a: "Very often, yes. The seller usually still knows the seed phrase and can take the coins back. Treat any offer of a wallet with a balance as a scam until you can verify it yourself.",
    },
    {
      q: "Can a funded crypto wallet be bought legitimately?",
      a: "Only if the seller can't sign afterwards and you can read every past signature. Few designs offer both. A Satchel does, on testnet today.",
    },
    {
      q: "What is the pre-filled seed phrase scam?",
      a: "A hardware wallet arrives with a recovery phrase already written on it. The seller knows the phrase, so they can take any coins you deposit. PhishFort describes how it works.",
    },
    {
      q: "How do I check a wallet's history before buying it?",
      a: "An address lookup shows sent transactions only. A Satchel's sale page lists every signature it made and checks each on its own chain before Buy turns on.",
    },
    {
      q: "Does Satchel give out or sell wallets with a balance?",
      a: "No. Owners list their own Satchels on the market. You can read what each holds, and your browser checks its record before you can buy.",
    },
  ] satisfies FaqEntry[],
} as const;
