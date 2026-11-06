/**
 * Copy deck for the marketing (SEO) pages: the article template, /learn and /clean-history. Imported directly
 * (`import { marketing } from "@/lib/copy/marketing"`); it is not merged into `copy`, so the shared deck stays small.
 *
 * Rules (docs/design/seo/product-inventory.md §3, the claims register; test/unit/marketing.test.ts enforces the bans):
 * sentence case; no fiat; testnet-explicit (these pages describe the deployment, CR-4); never "safe to buy",
 * "guaranteed", "trustless", "audited"; never "every chain"; "NEAR's signer network", not "MPC"; "quiet period", never
 * "cooldown"; prices in NEAR only; nothing about the repo while it is private. Inline links use `[text](/path)` and are
 * rendered by `<Rich>`. Sentences stay short (6 to 20 words): the evidence says that's what gets cited.
 */

export interface FaqEntry {
  q: string;
  a: string;
}

export interface TableCopy {
  caption: string;
  head: readonly string[];
  rows: readonly (readonly string[])[];
}

export const marketing = {
  home: {
    /** The first sentence of the landing's hero text (6 to 20 words): it names the product and its category. */
    definition: "Satchel is an NFT on NEAR that is a wallet.",
  },

  template: {
    breadcrumbLabel: "Breadcrumb",
    home: "Home",
    learn: "Learn",
    guide: "Guide",
    /** "Updated November 6, 2026" (the date is formatted from the registry's ISO date). */
    updated: (date: string) => `Updated ${date}`,
    /** Near the CTA on pages with practical intent, on top of the header badge. */
    testnetNote: "Satchel runs on NEAR testnet today. Try it with test coins; nothing here has real value.",
    related: "Related guides",
    faq: "Questions and answers",
    cta: {
      title: "Try it yourself",
      body: "Open a Satchel and read its record, or browse the Satchels for sale.",
      primary: "Look inside a Satchel",
      secondary: "See Satchels for sale",
    },
  },

  learn: {
    metaTitle: "Learn: short guides to Satchel",
    description: "Short guides to the ideas behind Satchel: clean history, selling and giving a wallet, and how an NFT controls Bitcoin, Ethereum and Solana addresses.",
    h1: "Learn how Satchel works",
    intro: "Satchel is an NFT on NEAR that is a wallet. These short guides explain the ideas behind it, one question at a time.",
    guidesHeading: "Guides",
    empty: "More guides are on the way.",
    read: "Read the guide",
    moreHeading: "Go further",
    more: [
      { href: "/questions", label: "Questions", body: "Every answer about keys, chains, selling, giving and fees, grouped in one place." },
      { href: "/contract", label: "Contract facts", body: "The contract account, its access keys, the code it runs and commands to check them." },
    ],
  },

  /** Meta descriptions (120 to 160 characters where the page's facts allow; checked by test/unit/marketing.test.ts). */
  meta: {
    questions: "Every honest answer about how Satchel works: keys, chains, clean history, selling, giving and fees. Grouped by topic, written for testnet.",
    market: {
      title: "Satchels for sale on NEAR",
      ogTitle: "Satchels for sale on NEAR: wallets checked before you buy",
      description: "Satchels for sale on NEAR testnet: NFTs that are wallets. Your browser checks each one's history before you can buy. This market lists only Satchels.",
    },
    contract: {
      keyless: "Satchel's contract account on NEAR testnet: born without a key, the code hash it runs, and copy-paste commands to verify both.",
      dev: "Satchel's contract account on NEAR testnet: the development contract this site runs, its access keys, its code hash and commands to check them.",
    },
    satchels: "The Satchels your NEAR testnet wallet owns: what's inside each one, and money waiting for you. Connect a wallet to see yours.",
    /** The object page: both addresses in full (the judge test reads them), so there is no room for a third. */
    satchel: (id: string, btc: string, evm: string) => `Satchel #${id} on NEAR testnet. Bitcoin testnet4 ${btc}, Ethereum Sepolia ${evm}.`,
    activity: (id: string) => `The record of Satchel #${id}: every signature it has made and every hand-off, newest first, read from NEAR testnet.`,
    transactions: (id: string) => `Coins in and out of Satchel #${id} on the Bitcoin, Ethereum and Solana test networks, newest first. Testnet coins have no value.`,
    sale: (id: string, listed: boolean) =>
      listed
        ? `Satchel #${id} is for sale on NEAR testnet. See its price and its clean history: your browser checks every past signature before you can buy.`
        : `Satchel #${id} isn't for sale right now. Its sale page shows the listing, the price and the clean-history check once the owner lists it.`,
  },

  footer: {
    group: "Learn",
    hub: "All guides",
    llms: "llms.txt",
  },

  cleanHistory: {
    /** The first thing on the page: a definition that names the product (6 to 20 words per sentence). */
    answer:
      "Clean history is the check a buyer's browser runs before buying a Satchel. It confirms that no signature the Satchel made before the sale can still move its coins.",
    sections: {
      problem: {
        h2: "The problem: a signature outlives the sale",
        body: [
          "A Satchel is an NFT on NEAR that controls its own Bitcoin, Ethereum and Solana addresses. Its owner asks the contract to sign a transaction, and NEAR's signer network makes the signature.",
          "A signature is only bytes. Whoever holds it can broadcast it later. Say a seller signs a transaction that sends every coin to their own address, keeps it, and lists the Satchel for sale. The buyer pays. The seller then broadcasts the old transaction, and the coins are gone.",
          "The NFT changed hands correctly, and the coins left anyway. Clean history exists to rule that out before the buyer pays.",
        ],
      },
      record: {
        h2: "What the contract writes down",
        body: [
          "Before NEAR's signer network signs anything, the Satchel contract records exactly what it is about to sign. That is the Ethereum network and nonce, the Bitcoin coin being spent, the Solana blockhash, or the full text of a message.",
          "It signs only plain ETH and USDC transfers, standard Bitcoin spends, plain SOL transfers and plain-text messages. It refuses raw hashes and every other kind of request. A request that timed out stays on the record too, because a timed-out request can still produce a valid signature.",
          "Together these records are the Satchel's history. You can read them on the [Activity tab of any Satchel](/s/1/activity).",
        ],
      },
      checks: {
        h2: "How the buyer's browser checks each signature",
        lead: "The browser reads every record and asks one question on the chain it belongs to: can this signature still move the coins?",
        table: {
          caption: "What the buyer's browser checks for each kind of record",
          head: ["Record", "What it names", "The check passes when"],
          rows: [
            ["Ethereum transaction", "The network and the nonce", "The nonce has been used. Two data providers must agree."],
            ["Bitcoin transaction", "The coin (outpoint) it spends", "That coin was spent in a confirmed transaction. Two data providers must agree."],
            ["Solana transaction", "A recent blockhash", "The blockhash has expired, so the network will no longer accept the transaction."],
            ["Signed message", "The text that was signed", "Always. A message can't move coins, so it never blocks a sale."],
          ],
        } satisfies TableCopy,
        after: [
          "The browser also checks that the Ethereum address has no delegated code and that the Solana account is a plain wallet. Each record gets a status such as Used, Expired, Unused or Can't verify.",
          "Buy turns on only when no old signature can move the coins. The check runs again right before the purchase.",
        ],
      },
      quiet: {
        h2: "The quiet period",
        body: [
          "A Satchel can be listed for sale only after 250 blocks, about 2 min 20 s, with no new signature. This is the quiet period. It makes sure the history a buyer reads is not still changing.",
          "While a Satchel is for sale it is paused: it can't sign, and only a purchase or an accepted offer can move it. So the history stays fixed while the buyer checks it.",
          "There is no wait after listing. Anyone can buy a listed Satchel right away.",
        ],
      },
      who: {
        h2: "Who runs the check",
        body: [
          "The buyer's browser runs the check, not the contract. A NEAR contract can't see Bitcoin, Ethereum or Solana, so it can't enforce the result. The Buy button stays off until the browser's own check passes.",
          "The sale page also shows the server's check as a hint, labelled as the server's. It is there for readers without JavaScript. Only the browser's result turns Buy on.",
          "Gifts skip this check. Giving a Satchel doesn't wait for it, so give only to someone you trust.",
        ],
      },
      limits: {
        h2: "What clean history does not cover",
        lead: "Clean history is a check on past signatures. It is not a guarantee, and Satchel is new and hasn't been audited.",
        items: [
          "Signatures made after you buy. Those are yours to control.",
          "Tokens other than USDC, and any chain or address Satchel doesn't support.",
          "NEAR's signer network. You still trust it, and enough colluding nodes could sign anything.",
          "Bitcoin testnet4 reorgs. Confirmation depth on testnet is shallow, and the page says so.",
          "Data providers. For Bitcoin and Ethereum two must agree, and the page says when only one answered.",
        ],
      },
      see: {
        h2: "See it on a Satchel",
        body: [
          "Open the sale page of a listed Satchel from the [Market](/market). The record lists each signature with its status, and two panels explain how Satchel checks it and what it doesn't cover.",
          "[Satchel #4](/s/4/sale) is the demo built to fail. Its only record is an Ethereum transaction signed with a future nonce and never sent. It could still move the coins one day, so it stays Unused and Buy stays off.",
          "For more, read the [questions](/questions) and the [contract facts](/contract).",
        ],
      },
    },
    faq: [
      {
        q: "What is clean history?",
        a: "Clean history is the buyer's browser check that no signature a Satchel made earlier can still move its coins. It reads every record on NEAR and checks each one on its own chain.",
      },
      {
        q: "Is clean history a guarantee?",
        a: "No. It checks the signatures that already exist. It doesn't cover signatures made after you buy, NEAR's signer network or Bitcoin testnet4 reorgs, and Satchel hasn't been audited.",
      },
      {
        q: "Who runs the check?",
        a: "Your browser does. The contract can't see other chains, so it can't enforce the check. Buy stays off until your browser's own check passes.",
      },
      {
        q: "Why is Buy turned off on a Satchel?",
        a: "Some record may still be able to move the coins, or the browser couldn't verify it. The sale page names the record and its status, such as Unused or Can't verify.",
      },
      {
        q: "Does a gift get the same check?",
        a: "No. Gifts skip the buyer's check. Giving a Satchel doesn't wait for it, so give only to someone you trust.",
      },
      {
        q: "Why must a Satchel be quiet before it is listed?",
        a: "A Satchel can be listed only after 250 blocks, about 2 min 20 s, without signing. That keeps the history a buyer reads from changing underneath them.",
      },
    ] satisfies FaqEntry[],
  },
} as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

/** "2026-11-06" → "November 6, 2026" (UTC, so the server and the browser agree). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}
