/**
 * Copy deck, /questions (less-labels): the long-form answers behind the help links this sweep added, plus the rest
 * of an honest FAQ. Merged into `copy` by src/lib/copy.ts as `copy.questions`; import from "@/lib/copy", never from
 * here. Same rules as the rest of the deck (test/unit/config-copy-theme.test.ts): sentence case, no fiat, no
 * plumbing words, straight apostrophes. The homepage's seven questions
 * (landing.ts `questions`) are NOT repeated here: `lib/faq.ts` reads them from there and merges both decks into one
 * page, so each question's text has exactly one source.
 *
 * Every answer must stay true for the current build (kb/90-technical-spec.md, docs/specs/*, plan/decisions.md): no
 * invented features, and only the real limits (testnet only, Solana devnet, Arbitrum Sepolia transactions not listed).
 */
export const questionsCopy = {
  "q-what-is": {
    q: "What exactly is a Satchel?",
    a: "An NFT on NEAR testnet that is a wallet. Each token has its own Bitcoin, Ethereum and Solana address, derived through NEAR's chain signatures, and only its current owner can ask the contract to sign from them. The app is how you see what's inside and send, give or sell it.",
  },
  "q-undo": {
    q: "Can I undo a send?",
    a: "No. A Bitcoin, Ethereum, Solana or USDC send can't be undone once it's signed, so check the address carefully on the review screen first. If a signature times out before it's sent, it's recorded as unused in this Satchel's history until it can no longer be used.",
  },
  "q-dust": {
    q: "Is there a minimum amount I can send?",
    a: "Yes, on two chains. Bitcoin refuses an output below a small dust threshold (a few hundred satoshis, depending on the recipient address type), and a new Solana account needs at least 0.00065024 SOL to exist. Ethereum and USDC have no minimum.",
  },
  "q-where-arrive": {
    q: "Where do coins I receive show up?",
    a: "Anyone can send to a Satchel's Bitcoin, Ethereum or Solana address, or add NEAR, USDC or wNEAR to it directly, and only its owner can take any of it back out. Unconfirmed deposits never count toward what it holds.",
  },
  "q-address-book": {
    q: "What's the address book for?",
    a: "A shortcut for addresses you send to often, with a name you'll recognise. It's kept in your browser only, never on a server, so it doesn't carry over to another device.",
  },
  "q-why-blocked": {
    q: "Why would a Satchel be blocked from selling?",
    a: "Clean history found a past signature that could still move its coins. The seller has to wait for it to confirm or clear before anyone can buy safely; a quiet period of 250 blocks (about 2 minutes 20 seconds) with no new signature also has to pass before it can be listed at all.",
  },
  "q-clean-sources": {
    q: "Where does the clean-history check get its data?",
    a: "Straight from each chain: public Bitcoin, Ethereum and Solana sources, read in your own browser, not from Satchel's server. The server runs the same check for the page you load first, but only your browser's result ever turns Buy on.",
  },
  "q-list": {
    q: "How do I list a Satchel for sale?",
    a: "Pick NEAR or USDC, set a price, and list it once its quiet period has passed and (for USDC) your account is registered for payouts. Listing takes a 0.01 NEAR deposit, with the unused part refunded, and anyone can then buy it instantly at that exact price.",
  },
  "q-paused": {
    q: "What happens while it's listed?",
    a: "Sending and giving it away are paused, and the owner can't sign anything new, so the history a buyer checks can't change underneath them. The owner can stop selling at any time to unlock it again.",
  },
  "q-offers": {
    q: "What's the difference between a listing and an offer?",
    a: "A listing is a fixed price anyone can accept instantly; an offer is a bid the owner chooses whether to accept, on a Satchel that's listed or not. Offers expire after 1, 7 or 30 days, and an open one is cancelled any time before it's accepted.",
  },
  "q-usdc-payouts": {
    q: "How do USDC sale payouts work?",
    a: "Your account needs a one-time registration (0.00125 NEAR) before you can list for USDC. If a payout can't reach your account when a sale closes, the contract holds it for you to withdraw instead of losing it.",
  },
  "q-withdrawals": {
    q: "Can I cancel a listing or an offer?",
    a: "Yes. Stop selling a listing at any time while it's live, and cancel an offer you made any time before the owner accepts it.",
  },
  "q-give": {
    q: "How do I give a Satchel away?",
    a: "In one NEAR transaction to an account that already exists on NEAR testnet. Everything inside goes with it, including its addresses, so coins sent there later belong to the new owner, and it can't be undone except by them giving it back to you.",
  },
  "q-give-link": {
    q: "What's give by link?",
    a: "A way to give a Satchel to someone without a NEAR account yet: it creates a fresh account for them and adds a little testnet NEAR so they can pay gas when they claim it. Treat the link like cash in an envelope — anyone who has it, including you after you share it, can claim everything inside, and there's no way to cancel it once it's out.",
  },
  "q-allow-what": {
    q: "What can someone I add be allowed to do?",
    a: "Only send coins, up to the daily caps you set per coin and network; network fees count toward those caps. It never covers signing messages or any other contract call, and it stops working the moment you give or sell the Satchel.",
  },
  "q-allow-caps": {
    q: "What are the caps and limits on access?",
    a: "Up to 8 caps per person (one per coin or network), each resetting every rolling 24 hours, and up to 4 people can hold access on one Satchel at a time. You can also set it to expire after 24 hours, 7 days or 30 days, or leave it open until you revoke it.",
  },
  "q-allow-btc": {
    q: "Why can someone with access send less Bitcoin than I can?",
    a: "With this kind of access, a Bitcoin send can only spend one of the Satchel's Bitcoin deposits at a time, so it's capped by the largest single deposit, fee included. As the owner, your own sends aren't limited this way.",
  },
  "q-allow-history": {
    q: "Why does it matter who I give access to?",
    a: "Their signatures become part of this Satchel's history, same as your own, and this access ends the moment you give or sell it. Add only someone you trust that much.",
  },
  "q-allow-revoke": {
    q: "How do I end someone's access?",
    a: "Revoke it any time from Who can spend. It also ends on its own once an expiry you set passes, or the instant you give or sell the Satchel to someone else.",
  },
  "q-inside": {
    q: "What can live inside a Satchel besides Bitcoin, Ethereum and Solana?",
    a: "NEAR, USDC and wNEAR can sit inside it directly, on top of its three chain addresses. Anyone can add to any of these; only the owner can take any of it back out, and never while it's listed.",
  },
  "q-storage-credit": {
    q: "What's storage credit?",
    a: "A small prepaid balance (0.01 NEAR) that covers the one-time cost of holding a USDC or wNEAR deposit, so that cost never comes out of the deposit itself. You can withdraw whatever part of it goes unused.",
  },
  "q-withdraw-inside": {
    q: "Can I take NEAR, USDC or wNEAR back out of a Satchel?",
    a: "Yes, only as its owner, and never while it's listed for sale. Take out some of it or all of it at once.",
  },
  "q-fees-near": {
    q: "Why does a signature cost NEAR?",
    a: "About 0.004 NEAR covers the gas and the permanent record of that signature in this Satchel's history, paid by your connected NEAR account rather than the Satchel's own coins. Signing also needs roughly 0.1–0.3 NEAR free in that account while it's in progress, which is refunded once it finishes.",
  },
  "q-fees-chain": {
    q: "What about the network fee on each chain?",
    a: "That one comes out of the Satchel's own coins, shown as an estimate before you confirm a send. It goes to that chain's own network, not to Satchel.",
  },
  "q-fees-mint-list": {
    q: "What does minting, listing or giving one away cost?",
    a: "Minting takes a 0.02 NEAR deposit and listing 0.01 NEAR, with the unused part refunded either way. Giving a Satchel away costs only NEAR gas, and Satchel takes no fee at all on a sale.",
  },
  "q-txs-vs-activity": {
    q: "What's the difference between Transactions and Activity?",
    a: "Transactions lists coins moving in and out of this Satchel: at its Bitcoin, Ethereum and Solana addresses, and its NEAR-side balances. Activity lists every signature its contract has ever made, which is what clean history checks. Arbitrum Sepolia transactions aren't listed yet; everything it signs still shows under Activity.",
  },
  "q-wallets": {
    q: "Which wallets does Satchel work with?",
    a: "Any NEAR testnet wallet, such as Meteor or Intear. Connect one to mint, send, give, list or sign from a Satchel you own.",
  },
  "q-safety-message": {
    q: "Is it safe to sign a message?",
    a: "A signed message can never move coins out of a Satchel, but a site may still treat it as a login or as a promise made by whoever owns the Satchel at the time. It's recorded in this Satchel's history for good, with its full text, and every future buyer can read it.",
  },
} as const;

export type QuestionId = keyof typeof questionsCopy;

/** /questions' own chrome: the title, lead, jump list and the search filter's labels. */
export const questionsPageCopy = {
  title: "Questions",
  meta: "Every honest answer about how Satchel works, grouped and in one place.",
  lead: "The short version is on the homepage. This is the long one: every honest answer about how a Satchel works, grouped by topic.",
  jumpLabel: "Jump to a group",
  searchLabel: "Search questions",
  searchPlaceholder: "Search questions…",
  searchClear: "Clear search",
  noMatches: "No question matches that search.",
  backToApp: "Back to the app",
} as const;
