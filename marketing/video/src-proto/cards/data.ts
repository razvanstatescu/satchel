/**
 * FICTIONAL placeholder copy for the prototype only. Outlets, handles, amounts and domains are invented
 * (domains use the reserved .example TLD). The real intro uses real, sourced screenshots (see tech.md §Pitfalls).
 */
export type CardKind = "post" | "headline" | "blog" | "alert" | "sms";

export type CardData = {
  kind: CardKind;
  outlet: string; // masthead, display name or sender
  handle?: string;
  tag?: string; // section tag
  title: string; // headline, post text, alert title
  body?: string;
  meta?: string; // byline, time, read time
  stat?: string; // a big red number (drained amount)
};

export const CARDS: CardData[] = [
  {
    kind: "headline",
    outlet: "THE DAILY LEDGER",
    tag: "SECURITY",
    title: "Seed phrase leak empties 4,000 wallets overnight",
    body: "Investigators say a compromised backup tool exposed recovery phrases stored in plain text.",
    meta: "By Staff Reporter · Updated 6:42 AM",
  },
  {
    kind: "post",
    outlet: "Wallet Watch",
    handle: "@walletwatch · 2h",
    title: "PSA: a drainer just took $1.2M with ONE signature. If you signed anything on that mint page today, revoke approvals now.",
    stat: "−1,204,000 USDC",
    meta: "1.2K replies · 8.4K reposts · 21K likes",
  },
  {
    kind: "blog",
    outlet: "Chain Forensics Blog",
    tag: "INCIDENT REPORT",
    title: "Anatomy of a signature scam: how one “permit” drained a treasury",
    body: "permit(owner, spender, value: MAX_UINT256, deadline)",
    meta: "Security Research · 9 min read",
  },
  {
    kind: "alert",
    outlet: "Signature request",
    title: "Allow unlimited access to all your tokens?",
    body: "verify-wallet.example is requesting permission to spend: ALL TOKENS",
    meta: "Reject · Sign",
  },
  {
    kind: "headline",
    outlet: "CHAIN REPORT",
    tag: "MARKETS",
    title: "Fake airdrop site steals NFTs from 900 collectors",
    body: "The page asked users to “claim” by signing a message that was really a transfer.",
    meta: "Updated 11:05 PM",
  },
  {
    kind: "sms",
    outlet: "+1 (555) 010-0199",
    title: "ALERT: Your wallet has been compromised. Verify your 12-word recovery phrase within 30 min: secure-wallet-check.example",
    meta: "Text Message · Today 3:14 AM",
  },
  {
    kind: "post",
    outlet: "anon dev",
    handle: "@0xanon_dev · 41m",
    title: "i bought a wallet NFT from someone and the coins were gone 10 min later. the seller kept a copy of the keys. how was i supposed to know",
    meta: "312 replies · 1.9K reposts · 6.3K likes",
  },
  {
    kind: "headline",
    outlet: "THE BLOCK TIMES",
    tag: "SCAMS",
    title: "“I just signed a message”: blind signing strikes again",
    body: "Users approved what looked like a login. It was an unlimited approval.",
    meta: "By Crypto Desk · 2 hours ago",
  },
  {
    kind: "blog",
    outlet: "Wallet Safety Weekly",
    tag: "GUIDE",
    title: "Your recovery phrase was in a screenshot. Here is what happened next",
    body: "cloud-sync → photo library → infostealer → drained",
    meta: "Opinion · 6 min read",
  },
  {
    kind: "alert",
    outlet: "Transaction failed",
    title: "Insufficient funds: balance 0.00",
    body: "Your last 3 transactions were sent to 0x7a2f…c91e",
    meta: "View on explorer",
  },
  {
    kind: "headline",
    outlet: "TECH WIRE",
    tag: "BREAKING",
    title: "Address-poisoning scam copies the wrong address 1,000 times a day",
    meta: "Updated 9:30 AM",
  },
  {
    kind: "post",
    outlet: "Crypto Alerts",
    handle: "@cryptoalerts · 5m",
    title: "🚨 Drainer kit sold “as a service” now targets every major wallet. Do NOT sign blind.",
    stat: "−$68,000,000",
    meta: "4.1K replies · 22K reposts · 51K likes",
  },
];
