import type { Chain } from "../../brand/tokens";
import type { CardCoin } from "../Sticker";

/**
 * Demo data for the Satchel 2.0 UI kit (SCRIPT-v4 "Numbers" and presentation rules).
 * Mainnet-style wording only: never "testnet", "Sepolia", "devnet"; never "every chain". Dollar figures appear only in
 * the card's overview ("≈ $8,000.00", computed by SatchelCard); prices and offers are in NEAR.
 *
 * Every full address below is checksum-INVALID on purpose (verified offline: bech32 checksum fails, EIP-55 mixed case
 * fails, the Solana strings contain "l", which isn't base58), so a real wallet that scans a QR or reads a frame refuses
 * them. Their truncated forms match the script's P1 tags: bc1q9h…x4d7 · 0x8f2a…41c9 · 7xKX…gAsU.
 */

export const ACCOUNTS = {
  alice: "alice.near",
  bob: "bob.near",
  carol: "carol.near",
  contract: "satchel.satchelhq.near",
} as const;

/** Satchel #7's own addresses (the hero). */
export const ADDR7: Record<Chain, string> = {
  btc: "bc1q9hm03302fgvct7vxg6php46zwa3g8qcmwrx4d7",
  evm: "0x8f2a8a74d80b1b87E63f0c30CEaD36Ac64EC41c9",
  sol: "7xKX17ruafpZmGtSUfD5m6lHLAnQL8f9am4j2u2ogAsU",
};

/** Where P3's three sends go (the BTC one ends in …y8sd as in the script). */
export const SEND_TO: Record<Chain, string> = {
  btc: "bc1qw5nmem4h4606yrnydrpwupmgfhqfw4vndfy8sd",
  evm: "0x3b71c55c7dF9e64d4A9ff6d928241f5C73AAe0d4",
  sol: "Hq4NjeHQMP4SF4xZcQBXjBl5LQKVjeb2CQu1UXnAvR2c",
};

/** Per-chain amounts (strings keep the script's precision) plus the USDC Satchel #7 holds on Base. */
export type Balances = Record<Chain, string> & { usdc?: string };

/**
 * SCRIPT-v4 numbers. fill = after P2 (0.06 BTC · 0.85 ETH · 13 SOL · 800 USDC on Base, ≈ $9,025.00); send = the three
 * P3 sends; after = after the sends (0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC, ≈ $8,000.00). `afterSend` is the same
 * after-balance at the send screen's precision ("Satchel #7 after 0.0500 BTC").
 */
export const AMOUNTS = {
  fill: { btc: "0.06", evm: "0.85", sol: "13", usdc: "800" },
  send: { btc: "0.0100", evm: "0.05", sol: "1" },
  after: { btc: "0.05", evm: "0.80", sol: "12", usdc: "800" },
  afterSend: { btc: "0.0500", evm: "0.80", sol: "12" },
} as const satisfies Record<string, Balances>;

/** USDC sits on Base (one address on Ethereum, Base, Arbitrum and Optimism). */
export const USDC_NETWORK = "Base";

/** The chain transaction each P3 send lands as (the tracker's "Broadcast to …" row and the history evidence agree). */
export const SEND_TX: Record<Chain, string> = { btc: "4f1c…9a2e", evm: "0x51c2…a7d2", sol: "3kPq…Wm8f" };

/** Satchel #7's listing price (T4–T7). Prices and offers are in NEAR only (D-51). */
export const PRICE = "2,000 NEAR";
export const NETWORK_FEE: Record<Chain, string> = { btc: "~282 sats", evm: "~0.00004 ETH", sol: "~0.000005 SOL" };
export const NEAR_FEE = "≈ 0.004 NEAR";

export const CHAINS: Chain[] = ["btc", "evm", "sol"];
export const TICKER: Record<Chain, string> = { btc: "BTC", evm: "ETH", sol: "SOL" };
export const CHAIN_NAME: Record<Chain, string> = { btc: "Bitcoin", evm: "Ethereum", sol: "Solana" };

/** The holdings sentence: "0.05 BTC · 0.80 ETH · 12 SOL · 800 USDC" (USDC when the balances carry it). */
export const holdings = (b: Balances, sep = " · ") => [...CHAINS.map((c) => `${b[c]} ${TICKER[c]}`), ...(b.usdc ? [`${b.usdc} USDC`] : [])].join(sep);

/** Balances as the value card's coins (numbers; USDC on Base), e.g. <SatchelCard coins={coinsOf(AMOUNTS.after)} />. */
export function coinsOf(b: Balances): CardCoin[] {
  const n = (v: string) => Number.parseFloat(v.replace(/,/g, "")) || 0;
  return [
    { coin: "BTC", amount: n(b.btc) },
    { coin: "ETH", amount: n(b.evm) },
    { coin: "SOL", amount: n(b.sol) },
    ...(b.usdc ? [{ coin: "USDC" as const, amount: n(b.usdc), network: "base" as const }] : []),
  ];
}

/** Middle truncation as in the product: 6 + … + 4 for BTC/EVM ("bc1q9h…x4d7", "0x8f2a…41c9"), 4 + … + 4 for SOL. */
export function truncate(addr: string, chain?: Chain) {
  const head = chain === "sol" || (!chain && !addr.startsWith("bc1") && !addr.startsWith("0x")) ? 4 : 6;
  return `${addr.slice(0, head)}…${addr.slice(-4)}`;
}

/** Format a number for a count-up: fixed decimals per chain by default (BTC 4, ETH 2, SOL 2). */
export function fmtAmount(value: number, chain: Chain, decimals?: number) {
  const d = decimals ?? (chain === "btc" ? 4 : 2);
  return value.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

/** m:ss for the signing timer. */
export const mmss = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/* ───────────── clean history (the buyer's browser check) ───────────── */

export type RecordStatus = "pending" | "checking" | "settled" | "unused";

export interface HistoryRecord {
  chain: Chain;
  /** Mono record label, e.g. "ETH · nonce 1". */
  label: string;
  /** The status word once settled, e.g. "Nonce used". */
  settledWord: string;
  /** The evidence line under the label once checked. */
  evidence: string;
  /** The evidence line while it can still move coins (unused). */
  unusedEvidence?: string;
  /** What the signed transaction does, e.g. "Send 0.0100 BTC to bc1qw5…y8sd". */
  send: string;
  status: RecordStatus;
  /** 0..1 pop when the status lands (scale punch on the pill). */
  pop?: number;
}

function sendLine(c: Chain) {
  return `Send ${AMOUNTS.send[c]} ${TICKER[c]} to ${truncate(SEND_TO[c], c)}`;
}

/** Satchel #7's history = exactly the three P3 sends, in signing order. */
export const HISTORY_7: HistoryRecord[] = [
  { chain: "btc", label: "BTC · coin 7d…e2:1", send: sendLine("btc"), settledWord: "Coin spent", evidence: "Spent in 4f1c08d2…9a2e", status: "settled" },
  { chain: "evm", label: "ETH · nonce 1", send: sendLine("evm"), settledWord: "Nonce used", evidence: "Used by 0x51c2…a7d2 · 3 confirmations", status: "settled" },
  { chain: "sol", label: "SOL · blockhash 9f…", send: sendLine("sol"), settledWord: "Blockhash expired", evidence: "Expired. It can't be used.", status: "settled" },
];

/**
 * Satchel #4 (the honest blocked example, README "Demo token #4"): its only record is an Ethereum transaction signed
 * with a future nonce and never sent. SCRIPT-v4: 0.015 BTC · 0.40 ETH · 6.8 SOL (≈ $2,880.00), listed for 720 NEAR.
 */
export const HISTORY_4: HistoryRecord[] = [
  {
    chain: "evm",
    label: "ETH · nonce 12",
    send: "Send 0.40 ETH to 0xc4e9…77a1",
    settledWord: "Nonce used",
    evidence: "Nonce 12 used",
    unusedEvidence: "Nonce 12 not used yet. It could still move coins.",
    status: "unused",
  },
];
export const SATCHEL4 = { id: "4", balances: { btc: "0.015", evm: "0.40", sol: "6.8" } as Balances, price: "720 NEAR" };
