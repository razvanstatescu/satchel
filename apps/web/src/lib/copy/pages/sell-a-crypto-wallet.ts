import type { FaqEntry, TableCopy } from "@/lib/copy/marketing";

/**
 * Copy for /sell-a-crypto-wallet (docs/design/seo/keyword-research.md #1). Product framing, like the landing (D-52): it
 * describes the product, never the deployment; prices in NEAR only, no tax advice, no "safe" promise, the buyer's browser (not the contract) runs the check. The marketing
 * copy bans (test/unit/marketing.test.ts) apply to every string here too. Links use `[label](/path)`.
 */
export const sellCopy = {
  answer:
    "You can't safely sell a normal crypto wallet: whoever had the seed phrase can keep a copy. A Satchel is an NFT on NEAR that is a wallet. You can sell it, because it has no seed phrase to copy and its record shows every signature it ever made.",
  seed: {
    h2: "Why a seed phrase can't be sold",
    body: [
      "A normal wallet is a secret: a seed phrase or a private key. Whoever knows it controls the coins. There is no owner field to change.",
      "So selling a wallet means telling the buyer the secret. You can't un-tell it. A copy may sit on paper, in a notes app or in a backup. The buyer has no way to know you kept none.",
      "The usual advice is to skip the sale. Make a new wallet and move the coins across. That sells coins, not a wallet, and the addresses change.",
    ],
  },
  hole: {
    h2: "The second hole: signatures already made",
    body: [
      "A seed phrase is not the only secret. A signature can move coins too. A signed transaction is just bytes, and anyone who holds it can broadcast it later.",
      "Say a seller signs a transaction that sends every coin to their own address, and never sends it. They sell the wallet. After the sale they broadcast it, and the coins are gone.",
      "This hole stays open even if keys can't be copied. Any honest sale has to rule it out. [Clean history](/clean-history) is Satchel's answer.",
    ],
  },
  needs: {
    h2: "What a safe sale needs",
    lead: "Three conditions close both holes.",
    items: [
      "No copy of the key. The seller must not be able to sign once the sale is done.",
      "A readable record. The buyer must see every signature the wallet ever made, including requests that timed out.",
      "One step. The buyer pays and receives the wallet in the same transaction, so neither side sends first.",
    ],
    after: "No ordinary wallet meets all three. We know of no other NFT-wallet design that provides the second.",
  },
  compare: {
    h2: "Ways to sell a wallet, compared",
    lead: "Here is how the common routes stack up against those conditions.",
    table: {
      caption: "Ways to sell a crypto wallet and what each leaves open",
      head: ["Route", "Seller keeps a copy?", "Buyer can check history?", "One transaction?", "Chains"],
      rows: [
        ["Share the seed phrase", "Yes, any copy still works", "No, only an address lookup", "No, someone sends first", "Depends on the wallet app"],
        ["Sell through an escrow service", "Yes, if the seed phrase changes hands", "Only what the service shows", "No, several steps", "Set by the service"],
        ["Sell a hardware wallet", "Not once the device is reset", "Not applicable: nothing inside", "Not applicable: coins stay out", "Set by the device"],
        [
          "Sell a Satchel",
          "No seed phrase exists for its addresses",
          "Yes, the buyer's browser checks every past signature",
          "Yes, one NEAR transaction pays and hands over",
          "Bitcoin, Ethereum and Solana",
        ],
      ],
    } satisfies TableCopy,
    after: "The first two rows are the common ones. Both leave the buyer trusting the seller.",
  },
  how: {
    h2: "How a Satchel sale works",
    lead: "Selling happens on Satchel's own [market](/market). Each step has a reason.",
    steps: [
      "The seller waits out the quiet period. A Satchel can be listed only after 250 blocks, about 2 min 20 s, without a new signature.",
      "The seller lists it at a fixed price in NEAR.",
      "While it's for sale, the Satchel is paused. It can't sign, and only a purchase or an accepted offer can move it.",
      "The buyer opens the sale page. Their browser reads every record and checks each signature on its own chain.",
      "Buy turns on only when no old signature can still move the coins.",
      "The buyer buys. One NEAR transaction moves the Satchel to the buyer and pays the seller.",
    ],
    after: [
      "The purchase names the listing and the signature count the browser checked. If either changed, it fails and refunds.",
      "The buyer's browser runs the check, not the contract. A NEAR contract can't see Bitcoin, Ethereum or Solana. Read what the check does and doesn't cover on the [clean history](/clean-history) page.",
    ],
  },
  gets: {
    h2: "What the seller gives up and gets",
    body: [
      "The seller is paid in NEAR in the same transaction. If the payout fails, the buyer still gets the Satchel and the money waits as proceeds on [your Satchels](/satchels) page.",
      "Everything inside goes to the buyer: the coins on every supported chain, the NEAR held inside, the addresses and the signature record. Any spending allowance the seller granted is cleared.",
      "Satchel charges no fee today. Giving a Satchel away works the same way without a price: see [how to give a crypto wallet](/transfer-a-crypto-wallet). Buyers can read the checklist in [buying a crypto wallet](/buy-a-crypto-wallet).",
    ],
  },
  limits: {
    h2: "What this does not solve",
    lead: "A Satchel sale removes two holes. It does not remove every risk from a sale.",
    items: [
      "The buyer still trusts NEAR's signer network, which makes every signature. Satchel is new and hasn't been audited.",
      "The check covers past signatures. It can't cover signatures made after you buy.",
      "Only Satchel's own market lists Satchels. Other NEAR marketplaces can't list one yet.",
      "Satchel gives no tax or legal advice. Rules on selling crypto differ by country, so check yours.",
    ],
  },
  faq: [
    {
      q: "Can you sell a crypto wallet?",
      a: "Not safely by sharing a seed phrase, because the seller can keep a copy. A Satchel is built to be sold: the buyer's browser checks its record first, and one transaction settles the trade.",
    },
    {
      q: "Can I sell my seed phrase?",
      a: "You can hand it over, but you can't take it back. The buyer can't know you kept no copy, and any copy can drain the wallet later.",
    },
    {
      q: "What happens to the coins when a Satchel is sold?",
      a: "They stay in the Satchel and go with it. The buyer gets the same Bitcoin, Ethereum and Solana addresses, the NEAR held inside and the full signature record.",
    },
    {
      q: "Can the seller empty the wallet right before I buy it?",
      a: "Not while it's for sale: a listed Satchel is paused and can't sign. Your browser also checks every past signature, and Buy stays off until none can move the coins.",
    },
    {
      q: "How is the seller paid?",
      a: "In NEAR, in the same transaction that hands the Satchel to the buyer. If the payout fails, the money waits as proceeds the seller can withdraw.",
    },
  ] satisfies FaqEntry[],
} as const;
