/**
 * Copy deck, commerce (package C after F1): sell, freeze, buy, clean, market. Merged into `copy` by src/lib/copy.ts;
 * import from "@/lib/copy", never from here. The clean-history copy names the buyer's browser, never the contract, as
 * the checker (risky claim 2); `clean.disclosure`, `clean.trust` and `clean.notCoveredList` stay word for word.
 */

import { plural as n } from "@/lib/format";

export const commerce = {
  sell: {
    title: (id: string) => `Sell Satchel #${id}`,
    /** NEW (proto app-sale `sell-*`): the Sell sheet's line under its title. */
    holds: (b: string) => `Holds ${b}`,
    checkTitle: "Before you list",
    tab: { notListed: "Not for sale.", ready: "Ready to list", list: "List for sale…" },
    quiet: {
      name: "Quiet period",
      wait: (blocks: string) => `You can list in ${blocks}`,
      /** NEW: the same line as List's reason under the disabled button. */
      waitWhy: (blocks: string) => `You can list in ${blocks}.`,
      done: (count: number) => `No signature in the last ${count} blocks`,
      never: "No signatures yet",
      /** NEW (app-screens §5.2). */
      why: "A Satchel can be listed after 250 blocks (about 2 min 20 s) without a signature. Then anyone can buy it right away.",
    },
    history: {
      name: "Past signatures",
      ok: (count: number) => `All ${count} can no longer move coins`,
      blocked: (count: number) => `${count} could still move coins.`,
      howToSettle: "How to clear it",
      settling: (count: number) => `${count} is still confirming`,
      unknown: (count: number) => `Can't verify ${count} right now`,
      /** NEW: while the owner's browser runs the check. */
      checking: "Checking in your browser…",
      warn: "Buyers can't buy while it can still move coins. Clear it first, or list anyway.",
    },
    usdc: {
      /** NEW (app-screens §5.3): the checklist row, shown only when USDC is picked. */
      name: "USDC payouts",
      ok: "Registered for USDC payouts",
      missing: "Not set up on your account yet",
      register: "Register · 0.00125 NEAR",
      registerAria: "Register for USDC payouts, 0.00125 NEAR",
      registering: "Registering…",
      /** NEW (app-screens §5.3): List's reason while USDC is picked and not registered. */
      first: "Register for USDC payouts first, or pick NEAR.",
    },
    form: {
      price: "Price",
      /** NEW: the currency control's name and List's reason before a price is typed. */
      currency: "Currency",
      priceIn: (ticker: string) => `Price in ${ticker}`,
      // priceWhy is gone (less-labels): a disabled List button with an empty price says enough; its accessible
      // description for empty price is `priceWhyA11y`, screen-reader only.
      priceWhyA11y: "Enter a price to list it.",
      invalid: "Enter a price like 2 or 2.5.",
      buyerGets: (b: string) => `Buyer gets ${b}.`,
      fee: "Satchel fee",
      feeNone: "none",
      deposit: "Listing deposit",
      depositValue: "0.01 NEAR",
      depositNote: "unused part refunded",
      receive: "You receive",
    },
    /** less-labels: the four "While it's for sale" rows became one line and a link to /questions#q-paused. */
    while: "While it's for sale, you can't send from it or give it away.",
    /** NEW (app-screens §5.2): the owner's view of the buyer's check. */
    buyersSee: "What buyers see",
    buyersSeeNote: "A buyer's browser runs this same check before Buy turns on.",
    cta: (price: string) => `List for ${price}`,
    listing: "Listing…",
    /** The announcement after listing; the toast is `listedShort` (five words or fewer, app-screens §1.4). */
    listedToast: (price: string) => `Listed for ${price}. Sending and giving are paused.`,
    listedShort: (price: string) => `Listed for ${price}`,
    panel: (price: string, id: number) => `For sale at ${price} · Listing #${id}`,
    delistNote: "Stopping is instant: nobody can buy it after that, and you can send and give again.",
    reprice: "To change the price, stop selling and list it again.",
    delisting: "Stopping sale…",
    /** The announcement; the toast is `delistedShort` (app-screens §1.4: undo-2 "Stopped selling"). */
    delisted: "Stopped selling. You can send and give again.",
    delistedShort: "Stopped selling",
    errQuiet: (blocks: string) => `Not listed. You can list in ${blocks}.`,
    cancelled: "You cancelled in your wallet. Nothing changed.",
    /** kb/80 R3 `sell.sold` (the seller's receipt) and `.escrow` (a failed payout credited to proceeds, spec §5.12). */
    sold: {
      title: (id: string, buyer: string, price: string) => `You sold Satchel #${id} to ${buyer} for ${price}.`,
      arrived: (price: string) => `${price} arrived in your NEAR account.`,
      paying: (price: string) => `${price} is on its way to your NEAR account.`,
      receipt: { price: "Price", buyer: "Buyer", paid: "Paid", tx: "Transaction", listing: "Listing" },
      paid: { paid: "In the same transaction as the sale", escrow: "Waiting for you (the payout didn't go through)", withdrawn: "Withdrawn from escrow", pending: "Paying out…" },
      live: (id: string, buyer: string, price: string) => `Sold. ${buyer} now owns Satchel #${id}. You received ${price}.`,
    },
    escrow: {
      title: "Waiting for you",
      waiting: (amount: string) => `${amount} is waiting for you.`,
      why: "The payout didn't reach your account when the Satchel sold, so the contract is holding it for you. Only you can withdraw it.",
      withdraw: "Withdraw",
      withdrawAria: (amount: string) => `Withdraw ${amount}`,
      withdrawing: "Withdrawing…",
      /** The announcement; the toast is `doneShort`. */
      done: (amount: string) => `${amount} sent to your NEAR account.`,
      doneShort: (amount: string) => `${amount} withdrawn`,
      again: (amount: string) => `The payout didn't go through again. ${amount} is still waiting for you.`,
      usdcFirst: "USDC payouts need a one-time registration on your account first.",
      /** The same words as the Sell sheet's inline Register (it fits the banner at 390; was "Register for USDC (0.00125 NEAR)"). */
      register: "Register · 0.00125 NEAR",
      registering: "Registering…",
    },
  },
  freeze: {
    title: "Paused while it's for sale",
    buyer: "The seller can't sign anything new, so the history below is final for this listing.",
    delist: "Stop selling",
  },
  buy: {
    /** NEW (app-screens §3.2): the offer block's eyebrow. */
    forSale: "For sale",
    /** NEW (proto app-sale): the Buy tab's offer eyebrow, and the receipt's labels after a purchase. */
    priceLabel: "Price",
    listingLabel: "Listing",
    listing: (id: number, t: string, seller: string) => `Listing #${id} · listed ${t} by ${seller}`,
    /** NEW: the listing line when the listing's time can't be read (no current block height). */
    listingNoTime: (id: number, seller: string) => `Listing #${id} · listed by ${seller}`,
    /** NEW (app-screens §5.1): the server hint row of the offer's facts, in the server HTML only. */
    hintLabel: "Server check",
    hintValue: (t: string, word: string) => `${t}: ${word}`,
    youGet: "You get",
    /** NEW: when the browser check found coins an earlier signature can still spend (they're in the amounts above). */
    encumbered: (count: number) => `This includes ${n(count, "coin", "coins")} an earlier signature can still spend.`,
    /** NEW (app-screens §5.1): under the You get rows, before `unconfirmed`. */
    addressesToo: "Its addresses come with it.",
    unconfirmed: "Unconfirmed deposits never count.",
    paidIn: (c: string) => `Paid in ${c}.`,
    getUsdc: "Get testnet USDC",
    how: {
      title: "How buying works",
      steps: (id: string, seller: string) => ["You pay", `One transaction moves Satchel #${id} to you and pays ${seller}`, "You get everything inside"],
    },
    /** NEW (app-screens §3.2): under Buy on the Wallet tab. */
    checkNote: "Your browser checks its history before you buy.",
    gate: {
      clean: (t: string) => `Clean history · checked ${t}`,
      checking: "Checking history…",
      waiting: "Waiting for your browser's check",
      settling: (count: number) => `Confirming: ${n(count, "signature", "signatures")}`,
      blocked: (count: number) => `Blocked: ${n(count, "unused signature", "unused signatures")}`,
      unknown: (count: number) => `Can't verify ${n(count, "signature", "signatures")}`,
      unsafe: (reason: string) => `Unsafe: ${reason}`,
    },
    cta: (price: string) => `Buy for ${price}`,
    connect: "Connect NEAR wallet",
    recheck: "Re-checking history…",
    buying: "Buying…",
    /** NEW: under "Approve in your wallet…" (the same words as Send's). */
    walletHint: "Check the Meteor or Intear window.",
    /** NEW (app-screens §1.4): your own cancel is a neutral note, not an error. */
    cancelled: "You cancelled in your wallet. Nothing was bought.",
    /** NEW: the re-check or the listing read right before Buy failed (nothing was sent to the wallet). */
    recheckFailed: "Your browser couldn't check its history again. Nothing was bought. Try again.",
    readFailed: "Couldn't read the listing again. Nothing was bought. Try again.",
    changed: (o: number, op: string, nw: number, np: string) => `This listing changed. Listing #${o} at ${op} was replaced by listing #${nw} at ${np}. Clean history runs again.`,
    reviewNew: "Review new listing",
    cancel: "Cancel",
    delisted: (seller: string, id: string) => `${seller} stopped selling Satchel #${id}.`,
    /** NEW (proto app-sale `buy-refunded`): the banner's title and body. */
    refundedTitle: "Not bought",
    refundedBody: (p: string) => `Your ${p} was refunded.`,
    done: (id: string) => `Satchel #${id} is yours.`,
    doneBody: (b: string) => `You now control ${b}.`,
    open: "Open your Satchel",
    /** NEW: the receipt under the buyer's hand-off. */
    receipt: { price: "Price", seller: "Seller", listing: "Listing", tx: "Transaction" },
    toast: (id: string) => `You bought Satchel #${id}`,
    notForSale: (id: string) => `Satchel #${id} isn't for sale.`,
    /** NEW (proto app-sale `not-for-sale`). */
    notForSaleBody: "Its owner hasn't listed it. You can still look inside, or find one that's for sale.",
    seeForSale: "See Satchels for sale",
    lookInside: "Look inside",
    seeSignature: "See the signature",
  },
  clean: {
    eyebrow: "Clean history",
    /** The verdict's freshness line: only ever for the BROWSER's result, never for the server's hint (inventory 5.1.6a). */
    checked: (t: string) => `Checked in your browser ${t}`,
    checksAgain: "It checks again every 10 s.",
    justNow: "just now",
    verdict: {
      checking: (count: number) => [count ? `Checking ${n(count, "past signature", "past signatures")}…` : "Checking its history…", "Reading Bitcoin testnet4 and Ethereum Sepolia from your browser."],
      empty: ["This Satchel has never signed anything.", "No signature from a previous owner can move these coins."],
      clean: (sub: string) => ["Clean. No past signature can move these coins.", sub],
      settling: (count: number, sub: string) => [`${n(count, "signature is", "signatures are")} still confirming.`, sub],
      /** NEW: the confirming verdict's second line, after the evidence ("Spent in 399b…ce3b"). */
      settlingSub: (evidence: string) => `${evidence}. Buy turns on once it confirms.`,
      blocked: (count: number, item: string) => [`${n(count, "past signature", "past signatures")} could still move coins.`, `${item}. The seller has to clear it first.`],
      unknown: (count: number, cause: string) => [`Can't verify ${n(count, "signature", "signatures")} right now.`, `${cause}. Buying stays paused until it's checked.`],
      unsafe: {
        delegated: "Unsafe: this Ethereum address has delegated code.",
        keys: "Unsafe: the contract has access keys.",
        code: "Unsafe: the contract code doesn't match the published build.",
        sol: "Unsafe: the Solana account isn't a plain wallet.",
      },
    },
    /** NEW (app-screens §5.1): the signature strip's label, e.g. "1 of 1 can't move coins". */
    stripLabel: (dead: number, total: number) => `${dead} of ${total} can't move coins`,
    /** NEW (proto app-sale): the strip's other labels, its list name and the overflow marker past 12. */
    strip: {
      label: "Past signatures",
      unused: (count: number, total: number) => `${count} of ${total} could still move coins`,
      settling: (count: number) => `${count} confirming`,
      unknown: (count: number) => `${count} can't be checked yet`,
      checking: (at: number, total: number) => `Checking ${at} of ${total}`,
      more: (count: number) => `+${count}`,
      moreLabel: (count: number) => `${count} more`,
    },
    /** NEW (proto app-sale `buy-unknown`): runs the browser check again. */
    checkAgain: "Check again",
    checks: {
      keys: (block: number | null) => (block ? `Contract keys: none since birth (block ${String(block).replace(/\B(?=(\d{3})+(?!\d))/g, ",")})` : "Contract keys: none since birth"),
      code: "Code: matches the published build",
      evm: "Ethereum address: no delegated code",
      dev: "Dev contract: lock and code checks skipped",
    },
    group: {
      attention: (count: number) => `Needs attention (${count})`,
      dead: (count: number) => `Can't move coins (${count})`,
      /** NEW: the one group while the browser's rows are being revealed. */
      checking: (count: number) => `Checking (${count})`,
    },
    item: {
      settled: "Used",
      expired: "Expired",
      unfunded: "Unfunded",
      foreign: "Not its coin",
      settling: "Confirming",
      unused: "Unused",
      unknown: "Can't verify",
      checking: "Checking…",
      wouldPay: (amount: string, addr: string, claimed: boolean) => `Would send ${amount} to ${addr}${claimed ? " (claimed)" : ""}`,
      unfundedBody: "Spends coins that don't exist. If they ever appear at this address, the previous owner could move them; they're excluded from what you buy.",
      /** kb/90 §7.2 `foreign` (review S-07): the record's coin exists but isn't at this Satchel's address. */
      foreignBody: "Points at a coin this Satchel can't spend. It can't move the coins you're buying.",
    },
    /** NEW (app-screens §5.1): the record's heading and lead on the buy page and What buyers see. */
    recordTitle: "The record",
    recordLead: "Every signature this Satchel has made, each checked on its own chain.",
    trust: "Runs in your browser. Satchel's server isn't trusted for this.",
    hint: (t: string, v: string) => `Server check ${t}: ${v}`,
    hintWaiting: "Waiting for your browser's check",
    /**
     * NEW (app-screens §5.1): the verdict body while only the server's hint is known (the server HTML, before the
     * buyer's browser has checked). Never "checked in your browser": the server did this one.
     */
    hintBody: {
      clean: (t: string) => `The server checked ${t} and found it clean. Buy turns on only after your browser checks it too.`,
      empty: (t: string) => `The server checked ${t}: it has never signed anything. Buy turns on only after your browser checks it too.`,
      settling: (t: string) => `The server checked ${t}: a signature is still confirming. Only your browser's check can turn Buy on.`,
      blocked: (t: string) => `The server checked ${t}: a past signature could still move coins. Only your browser's check can turn Buy on.`,
      unknown: (t: string) => `The server checked ${t} but couldn't verify every signature. Only your browser's check can turn Buy on.`,
      unsafe: (t: string) => `The server checked ${t} and found it unsafe. Only your browser's check can turn Buy on.`,
      checking: (t: string) => `The server started a check ${t}. Only your browser's check can turn Buy on.`,
    },
    /** NEW: the verdict body before any check, when the server had no hint to show. */
    waitingBody: "Buy turns on only after your browser checks its history.",
    /** NEW (app-screens §9): the server hint's word per aggregate, as in "Server check 2 min ago: clean". */
    hintWord: { checking: "checking", empty: "never signed", clean: "clean", settling: "confirming", blocked: "needs attention", unknown: "can't verify", unsafe: "unsafe" },
    oneOfTwo: "1 of 2 sources",
    /** NEW: the record's sources line ("Sources: Bitcoin from mempool.space and mempool.emzy.de; Ethereum from …."). */
    sources: (list: string) => `Sources: ${list}.`,
    sourceChain: (chain: string, providers: string) => `${chain} from ${providers}`,
    noAnswer: (provider: string) => `${provider} (no answer)`,
    how: "How Satchel checks this",
    /**
     * NEW: the disclosure's first paragraph unless the browser found it clean (then it is the badge's exact promise,
     * `proof.cleanTip`, kb/90 §7.7). Says how the check works without promising its result.
     */
    howBody:
      "Every signature this Satchel makes is recorded on NEAR before it's signed. Your browser checks each one on its own chain: a used nonce, a spent coin or an expired blockhash can never move coins again.",
    notCovered: "What it doesn't cover",
    notCoveredList: [
      "Chains, tokens and accounts other than the three derived addresses: Bitcoin testnet4, Solana devnet, and ETH and USDC on Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia and OP Sepolia.",
      "What a site makes of a signed message: a message can't move coins, but a site may treat it as a login.",
      "Any signature made after the purchase.",
      "The honesty of NEAR's signer network.",
      "Testnet4 reorgs: one confirmation can be undone by anyone mining two difficulty-1 blocks.",
      "Coins another wallet later sends to an outpoint an old signature already spends (marked encumbered).",
    ],
    disclosure: "The contract doesn't run this check; this app does, by reading each chain. Buy stays disabled until it passes.",
  },
  market: {
    title: "Market",
    count: (c: number) => `${c} for sale`,
    /** NEW (app-screens §9): under the h1. */
    lead: (c: number) => `${c} for sale. Your browser checks each one's history before you can buy.`,
    empty: "Nothing's for sale right now.",
    /** NEW (app-screens §9): the empty state's body, above Mint a Satchel. */
    emptyBody: "Mint your own, fill it with testnet coins, and list it when you're ready.",
    mint: "Mint a Satchel",
    error: "Couldn't load listings.",
    tryAgain: "Try again",
    /** NEW (app-screens §9): each card's meta line. */
    meta: (id: number, sigs: number) => `Listing #${id} · ${n(sigs, "signature", "signatures")}`,
    /** C4 (docs/specs/C4-C6.md §3): Satchels nobody's selling, but anyone can still offer on. */
    unlisted: {
      title: "Unlisted Satchels",
      lead: "Not for sale, but anyone can still make an offer.",
    },
  },
} as const;
