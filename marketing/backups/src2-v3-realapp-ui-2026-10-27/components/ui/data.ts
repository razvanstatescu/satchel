import type { Chain } from "../../brand/tokens";

/**
 * Demo data for the Satchel 2.0 UI kit (SCRIPT-v3 "Numbers" + director's amendments A1, A4, A6).
 * Mainnet-style wording only: never "testnet", "Sepolia", "devnet"; no fiat anywhere; never "every chain".
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

/** SCRIPT-v3 numbers. Strings, so the exact precision of the script is kept. */
export const AMOUNTS = {
  fill: { btc: "0.0513", evm: "0.90", sol: "13.65" },
  send: { btc: "0.0100", evm: "0.05", sol: "1.25" },
  after: { btc: "0.0412", evm: "0.85", sol: "12.4" },
} as const satisfies Record<string, Record<Chain, string>>;

export type Balances = Record<Chain, string>;

/** The chain transaction each P3 send lands as (the tracker's "Broadcast to …" row and the history evidence agree). */
export const SEND_TX: Record<Chain, string> = { btc: "4f1c…9a2e", evm: "0x51c2…a7d2", sol: "3kPq…Wm8f" };

export const PRICE = "4,750.00 USDC";
export const NETWORK_FEE: Record<Chain, string> = { btc: "~282 sats", evm: "~0.00004 ETH", sol: "~0.000005 SOL" };
export const NEAR_FEE = "≈ 0.004 NEAR";

export const CHAINS: Chain[] = ["btc", "evm", "sol"];
export const TICKER: Record<Chain, string> = { btc: "BTC", evm: "ETH", sol: "SOL" };
export const CHAIN_NAME: Record<Chain, string> = { btc: "Bitcoin", evm: "Ethereum", sol: "Solana" };

/** "BTC 0.0412"-style holdings sentence: "0.0412 BTC · 0.85 ETH · 12.4 SOL". */
export const holdings = (b: Balances, sep = " · ") => CHAINS.map((c) => `${b[c]} ${TICKER[c]}`).join(sep);

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
  /**
   * The chain's answer as the film's stamp phrase ("Coin spent", "Nonce used", "Blockhash expired"). The app's own
   * pill words are "Used" / "Expired" (appPillWord below); the record label shows the chain name ("Ethereum · nonce 1").
   */
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
  { chain: "evm", label: "ETH · nonce 1", send: sendLine("evm"), settledWord: "Nonce used", evidence: "Nonce 1 used by 0x51c2…a7d2 · 3 confirmations", status: "settled" },
  { chain: "sol", label: "SOL · blockhash 9f…", send: sendLine("sol"), settledWord: "Blockhash expired", evidence: "Blockhash expired. It can't be used.", status: "settled" },
];

/**
 * Satchel #4 (the honest blocked example, README "Demo token #4"): its only record is an Ethereum transaction signed
 * with a future nonce and never sent. Holdings and price for #4 are NOT in the script: placeholders, override per scene.
 */
export const HISTORY_4: HistoryRecord[] = [
  {
    chain: "evm",
    label: "ETH · nonce 12",
    send: "Send 0.40 ETH to 0xc4e9…77a1",
    settledWord: "Nonce used",
    evidence: "Nonce 12 used",
    unusedEvidence: "Nonce 12 not used yet",
    status: "unused",
  },
];
export const SATCHEL4 = { id: "4", balances: { btc: "0.0150", evm: "0.40", sol: "6.8" } as Balances, price: "1,480.00 USDC" };

/** The record's label as the app prints it: the chain's name, not its ticker ("Ethereum · nonce 1"). */
export const appRecordLabel = (r: HistoryRecord) => `${CHAIN_NAME[r.chain]} · ${r.label.split(" · ").slice(1).join(" · ")}`;
/** The app's pill word for a record that can't move coins: "Expired" for a Solana blockhash, else "Used". */
export const appPillWord = (r: HistoryRecord) => (r.chain === "sol" ? "Expired" : "Used");
