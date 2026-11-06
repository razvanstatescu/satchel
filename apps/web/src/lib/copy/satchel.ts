/**
 * Copy deck, the Satchel object (package S after F1): page, wallet, fund, act, facts, verify, how, proof. Merged into
 * `copy` by src/lib/copy.ts; import from "@/lib/copy", never from here. Judge facts (`facts`, `verify`, `page.meta`,
 * `page.visitorH1/Sub`) stay word for word unless a ruling changes them.
 */

import { chainList } from "@/lib/copy/chains";
import { NBSP, plural as n } from "@/lib/format";

export const satchel = {
  how: [
    { title: "Mint a Satchel", body: `The NFT gets its own ${chainList()} addresses. They're derived from the NFT, so they stay the same when it changes hands.` },
    {
      // C5:125-129
      title: "The owner decides who signs",
      body: "To move coins, the owner, or someone they let spend within daily caps, asks the Satchel contract. It checks who owns the NFT, then asks NEAR's signer network for a signature.",
    },
    {
      title: "Give it or sell it",
      body: "The new owner gets everything inside. No bridge, no wrapped tokens, no seed phrase.",
    },
  ],
  proof: {
    // clean-view.test reads this key.
    cleanTip:
      "Every signature this Satchel has issued is recorded on-chain. Your browser just checked each one against Bitcoin testnet4, Solana devnet and the four Ethereum testnets: none can still move the coins you are buying.",
  },
  page: {
    visitorH1: "This NFT is a wallet.",
    visitorSub: (id: string) => `Whoever owns Satchel #${id} controls the coins at the ${chainList()} addresses below.`,
    ownerH1: (id: string) => `Satchel #${id}`,
    title: (id: string) => `Satchel #${id}`,
    meta: (id: string, btc: string, evm: string, sol?: string) =>
      `Satchel #${id} is an NFT on NEAR testnet. It controls Bitcoin testnet4 address ${btc}${sol ? `, Ethereum Sepolia address ${evm} and Solana devnet address ${sol}` : ` and Ethereum Sepolia address ${evm}`} through NEAR Chain Signatures. Give or sell the NFT and the new owner controls the coins.`,
    tabs: { label: "Satchel sections", wallet: "Wallet", activity: "Activity", transactions: "Transactions", sell: "Sell", buy: "Buy", sold: "Sold", sale: "Sale" },
    actions: {
      send: "Send",
      fund: "Add coins",
      transfer: "Give",
      sell: "Sell",
      delist: "Stop selling",
      noFunds: "Nothing to send yet. Add coins first.",
      paused: "Sending and giving are paused while it's for sale.",
    },
    /** NEW (app-screens §3.1): the Inside rows' heading (one row per chain, full grouped address). */
    inside: "Inside",
    /** The Inside list's accessible name. */
    holdings: "Holdings",
    /** The visitor's pinned buy bar below 1024: the line under the price. */
    offerListing: (listing: number) => `Listing #${listing}`,
    /** NEW (app-screens §3.1): the owner's for-sale panel (`id="freeze"`). */
    forSale: {
      title: (price: string) => `For sale at ${price}`,
      /** The panel's second line (app-screens §3.1): `t` is "22 min ago" in the browser, a UTC time in the server HTML. */
      meta: (listing: number, t: string) => `Listing #${listing} · listed ${t}. Anyone can buy it right away.`,
      buyers: (t: string) => `Buyers see: Clean history, checked ${t}.`,
      /** The owner's browser runs the buyers' check while it's for sale (R11 #2); one line per verdict. */
      checking: "Checking what buyers see…",
      buyersConfirming: (count: number) => `Buyers can buy once ${n(count, "signature confirms", "signatures confirm")}.`,
      buyersBlocked: (count: number) => `Buyers can't buy yet: ${n(count, "signature", "signatures")} could still move coins.`,
      buyersUnknown: (count: number) => `Buyers can't buy yet: ${n(count, "signature", "signatures")} can't be verified right now.`,
      see: "See the listing",
    },
    /** The seller's note under the card after a sale (app-screens §3.2). */
    sold: { note: (buyer: string) => `You sold it to ${buyer}.`, receipt: "See the receipt" },
    /** NEW (app-screens §3.2): the visitor's link under the Add coins panel (1024 and up). */
    mintOwn: "Mint your own Satchel",
    notfound: { title: (id: string) => `Satchel #${id} doesn't exist`, generic: "This Satchel doesn't exist", body: "No Satchel has this number yet.", mint: "Mint a Satchel", mine: "Go to My Satchels" },
    pending: {
      sending: (amount: string, t: string) => `Sending ${amount} · ${t}`,
      sent: (amount: string) => `Sent ${amount}`,
      notSent: "Signed, not sent · Broadcast now",
    },
  },
  wallet: {
    copy: "Copy",
    copied: "Copied",
    copyAria: (chain: string) => `Copy ${chain} address`,
    /** The Inside row's QR tool (its accessible name is `qrAria`). */
    qr: "QR",
    qrAria: (chain: string) => `Show QR code for ${chain} address`,
    /** Announced (the one status region) when an address is copied. */
    copiedAria: (chain: string) => `${chain} address copied`,
    incoming: (amount: string) => `+${amount} incoming · unconfirmed`,
    outgoing: (amount: string) => `−${amount} leaving · unconfirmed`,
    unavailable: "Balance unavailable",
    retry: "Retry",
    zero: (ticker: string) => `0${NBSP}${ticker}`,
    fund: "Add coins",
    fundcard: {
      title: "Add coins to this Satchel",
      body: "Anyone can send testnet coins to its addresses. Only its owner, or someone they let spend within daily caps, can send them out.",
    },
  },
  facts: {
    title: "Facts",
    contract: "Contract",
    token: "Token",
    owner: "Owner",
    status: "Status",
    signatures: "Signatures",
    contractKeys: "Contract keys",
    keysNone: "none since birth",
    keysSome: (count: number) => `${count} (development contract)`,
    keysUnknown: "unavailable",
    codeHash: "Code hash",
    codeMatches: "matches the published build",
    codeMismatch: "doesn't match the published build",
    codeUnchecked: "no published build to compare (dev)",
    source: (rel: string) => `Read from NEAR testnet and each chain ${rel}.`,
    /** `source`'s time in the server HTML (the browser rewrites it as "12 s ago"). */
    at: (t: string) => `at ${t}`,
    /** NEW (app-screens §3.1): the Token row, which replaces the chip row. */
    tokenValue: (id: string) => `#${id} · NEP-171 · NEAR testnet`,
    /** The Signatures row after the count: "· last one Oct 20, 02:40 UTC (block 274,240,000)". */
    last: (t: string, block: string) => `last one ${t} (block ${block})`,
    noneYet: "none yet",
    solNote: "Derived and signable by the contract; sending from the app comes later.",
    solNoteSend: "Derived and signable by the contract; the owner can send SOL from the app.",
  },
  verify: {
    title: "Verify these addresses",
    keys: "Keys: none since birth",
    code: "Code hash: matches the published build",
    path: (id: string, chain: string) => `Path satchel/${id}/${chain}`,
    /** After the path (mono): "derives the Bitcoin address above." The addresses themselves live in the Inside rows. */
    derives: (chain: string) => `derives the ${chain} address above.`,
    // C5:125-129
    guarantee: "Anyone can re-derive these addresses. Only the current owner, or someone they let spend within daily caps, can get signatures for them.",
    yourself: "Verify it yourself",
  },
  fund: {
    title: (id: string) => `Add coins to Satchel #${id}`,
    label: (network: string) => `This Satchel's ${network} address`,
    only: { btc: "Send only Bitcoin testnet4 coins to this address.", evm: "Send only Sepolia ETH to this address.", sol: "Send only Solana devnet SOL to this address." },
    time: { btc: "Testnet4 confirmations are irregular: minutes to hours.", evm: "About 12 seconds to confirm.", sol: "A few seconds to confirm." },
    // e2e flows.spec.ts:133 pins it.
    anyone: "Anyone can add coins. Only the owner, or someone they let spend within daily caps, can send them out.",
    faucet: { btc: "Get testnet BTC", evm: "Get Sepolia ETH", sol: "Get devnet SOL" },
    copy: "Copy address",
    share: "Share",
    /** The chain switch's name, and the QR plate's accessible name. */
    chain: "Chain",
    qr: (address: string) => `QR code for ${address}`,
    /** What a share sheet titles the address. */
    shareTitle: (id: string, network: string) => `Satchel #${id} · ${network} address`,
    incoming: {
      title: "Incoming",
      waiting: "Waiting for coins…",
      mempool: (a: string) => `+${a} · in mempool`,
      received: (a: string) => `Received ${a}`,
      /** NEW (app-screens §8): the help line under each Incoming state. */
      waitingHelp: "This updates by itself. You can close this sheet.",
      pendingHelp: "It counts once it has 1 confirmation.",
      receivedHelp: (id: string, total: string) => `Satchel #${id} now holds ${total}.`,
    },
  },
  act: {
    inProgress: "In progress",
    today: "Today",
    yesterday: "Yesterday",
    row: {
      sending: (to: string) => `Sending to ${to}`,
      sent: (to: string) => `Sent to ${to}`,
      notSent: "Signed, not sent",
      issued: (chain: string) => `Signature issued · ${chain}`,
      /** Neutral: live data maps a sale's nep171 transfer to this row too (voice-copy §1.2). */
      transferred: (to: string) => `Handed over to ${to}`,
      received: (from: string) => `Received from ${from}`,
      minted: (by: string) => `Minted by ${by}`,
      listed: (price: string) => `Listed for ${price}`,
      delisted: "Stopped selling",
      sold: (to: string, price: string) => `Sold to ${to} for ${price}`,
    },
    detail: {
      date: "Date",
      status: "Status",
      fee: "Fee",
      from: "From",
      to: "To",
      price: "Price",
      links: "Links",
      viewOn: (site: string) => `View on ${site}`,
      confirmed: "Confirmed",
      /** An issued signature's receipt (app-screens §4): what it would send, and why it still matters. */
      wouldSend: "Would send",
      wouldSendValue: (amount: string, to: string) => `${amount} to ${to}`,
      unusedNote: "Not used yet, so this signature could still move coins.",
      /** C5: a delegate's own signature names them, never the owner (docs/specs/C5.md §1.3 `requester`). */
      requestedBy: "Requested by",
    },
    /** The In progress group (client): the line under "Sending to …", per stage. */
    progress: {
      wallet: "Waiting for your wallet",
      signing: (t: string) => `Signing with NEAR's signer network · ${t}`,
      broadcasting: "Broadcasting…",
      mempool: "In mempool · waiting for 1 confirmation",
      notSent: (to: string) => `To ${to} · nothing has left yet`,
    },
    empty: { title: "No activity yet", body: "Sends, hand-offs and sales show up here. Incoming coins show on each chain's explorer." },
    more: "Show older",
    newest: "Back to the newest",
    /** A day group for events with no timestamp, and a row's time when only its block is known. */
    earlier: "Earlier",
    block: (height: string) => `Block ${height}`,
    footer: "Missing something? See every event on NearBlocks",
    /** The partial banner: its title, then the link. */
    partialTitle: "NEAR history is unavailable right now.",
    partialLink: "Check NearBlocks",
  },
} as const;
