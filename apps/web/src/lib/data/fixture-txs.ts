import type { ChainTx, TxPage } from "@/lib/chain-txs";
import { EXPLORERS, SOL_UI_ENABLED } from "@/lib/config";
import { FIXTURE_NOW } from "@/lib/data/fixtures";
import { satchelAddresses } from "@/lib/derive";
import { evmTxLink } from "@/lib/evm-networks";

/**
 * The Transactions tab in fixture mode (no network): a plausible history per token, built from the other fixture
 * Satchels' addresses as counterparties. Sample data only; the hashes link nowhere real.
 */

const H = 3600_000;
const hex = (seed: number, len: number) => Array.from({ length: len }, (_, i) => ((seed * 7919 + i * 104729) % 16).toString(16)).join("");

function tx(p: Omit<ChainTx, "id" | "url">): ChainTx {
  const url =
    p.network === "bitcoin"
      ? EXPLORERS.btcTx(p.hash)
      : p.network === "solana"
        ? EXPLORERS.solTx(p.hash)
        : p.network === "near"
          ? EXPLORERS.nearTx(p.hash)
          : evmTxLink({ sepolia: 11155111, base: 84532, arbitrum: 421614, optimism: 11155420 }[p.network], p.hash);
  return { ...p, id: `${p.network}:${p.hash}:${p.coin}`, url };
}

export function fixtureTxs(id: string): TxPage {
  const other = satchelAddresses(id === "2" ? "3" : "2");
  const faucet = satchelAddresses("7");
  const n = Number(id) || 1;
  const t = (hoursAgo: number) => FIXTURE_NOW - hoursAgo * H;
  const h = (k: number, len = 64) => hex(n * 100 + k, len);
  const evmHash = (k: number) => `0x${h(k)}`;
  const rows: ChainTx[] =
    id === "1"
      ? [
          tx({ network: "bitcoin", coin: "BTC", direction: "out", amount: "10282", counterparty: other.btc, hash: h(1), timestampMs: t(30), status: "confirmed", fee: "282" }),
          tx({ network: "bitcoin", coin: "BTC", direction: "in", amount: "200000", counterparty: faucet.btc, hash: h(2), timestampMs: t(96), status: "confirmed" }),
          tx({ network: "sepolia", coin: "ETH", direction: "out", amount: "1021000000000000", counterparty: other.evm, hash: evmHash(3), timestampMs: t(28), status: "confirmed", fee: "21000000000000" }),
          tx({ network: "sepolia", coin: "ETH", direction: "in", amount: "50000000000000000", counterparty: faucet.evm, hash: evmHash(4), timestampMs: t(100), status: "confirmed" }),
          tx({ network: "sepolia", coin: "USDC", direction: "in", amount: "25000000", counterparty: faucet.evm, hash: evmHash(5), timestampMs: t(50), status: "confirmed" }),
          tx({ network: "base", coin: "ETH", direction: "in", amount: "20000000000000000", counterparty: faucet.evm, hash: evmHash(6), timestampMs: t(20), status: "confirmed" }),
          tx({ network: "base", coin: "USDC", direction: "in", amount: "10000000", counterparty: other.evm, hash: evmHash(7), timestampMs: t(6), status: "confirmed" }),
          tx({ network: "optimism", coin: "ETH", direction: "in", amount: "5000000000000000", counterparty: faucet.evm, hash: evmHash(8), timestampMs: t(4), status: "confirmed" }),
          ...(SOL_UI_ENABLED ? [tx({ network: "solana", coin: "SOL", direction: "in", amount: "500000000", counterparty: faucet.sol, hash: h(9, 88), timestampMs: t(48), status: "confirmed" })] : []),
          tx({ network: "near", coin: "NEAR", direction: "in", amount: "500000000000000000000000", counterparty: "bob.satchelhq.testnet", hash: h(10, 44), timestampMs: t(2), status: "confirmed" }),
          tx({ network: "bitcoin", coin: "BTC", direction: "in", amount: "5000", counterparty: other.btc, hash: h(11), timestampMs: null, status: "pending" }),
        ]
      : [
          tx({ network: "bitcoin", coin: "BTC", direction: "in", amount: "50000", counterparty: faucet.btc, hash: h(1), timestampMs: t(72), status: "confirmed" }),
          tx({ network: "sepolia", coin: "ETH", direction: "in", amount: "20000000000000000", counterparty: faucet.evm, hash: evmHash(2), timestampMs: t(70), status: "confirmed" }),
        ];
  return {
    txs: [...rows].sort((a, b) => (b.timestampMs ?? Number.MAX_SAFE_INTEGER) - (a.timestampMs ?? Number.MAX_SAFE_INTEGER)),
    sources: (["bitcoin", "sepolia", "base", "optimism", ...(SOL_UI_ENABLED ? (["solana"] as const) : []), "near"] as const).map((key) => ({ key, ok: true })),
    as_of: FIXTURE_NOW,
  };
}
