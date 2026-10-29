import type { AllowanceRecord, ConfigView, ListingView, NftToken, SatchelView, SigRecordView } from "@/lib/near/types";

/**
 * Fixture mode (NEXT_PUBLIC_DATA_MODE=fixture): realistic views for the demo state of kb/90 + D-32, so every page renders
 * and can be tested before the contract exists. Shapes are exactly kb/90 §5.14. EVM `unsigned_tx` values are real
 * Sepolia type-2 RLP and `payload` = keccak256(unsigned_tx) (generated with viem); signatures, txids and NEAR hashes are
 * placeholders. Every page shows a "Fixture data" strip in this mode.
 */

export const FIXTURE_CONTRACT = "satchel.satchelhq.testnet";
export const ALICE = "alice.satchelhq.testnet";
export const BOB = "bob.satchelhq.testnet";
export const CAROL = "carol.satchelhq.testnet";

/** C5's demo delegate (fixtures.ts only): kept separate from BOB/CAROL so existing "a stranger can't send" tests of
 * those two personas on other tokens stay strangers everywhere. */
export const DANA = "dana.satchelhq.testnet";

export const FIXTURE_NOW = Date.UTC(2026, 9, 20, 12, 0, 0); // the frozen "now" of the fixture world
export const FIXTURE_HEIGHT = 274_300_000;
const BLOCK_MS = 560;
const hAgo = (blocks: number) => FIXTURE_HEIGHT - blocks;
const tAt = (height: number) => FIXTURE_NOW - (FIXTURE_HEIGHT - height) * BLOCK_MS;

export const BIRTH_HEIGHT = hAgo(160_000);
export const FIXTURE_CODE_HASH = "c1b4f8e97fade5c74ab3d91c7fa3db579b20b28fe42b3fa13a769f135435d692";

export const NEAR_TX = {
  birth: "GUEiMpKrm2DDLHdEw1Cz5263WRC8ma4YVZ931BfJircw",
  t1evm: "AnqYZ4YBinBthaURepc3FHZvRiJVdwSW2bVodH8QVwLB",
  t1btc: "CWvZ71xZuwVVjr3Ltg1pGo7AfFJ41bbSFuC4DSFXC3b4",
  t2xfer: "Hpm7hDnPeFMJEHH4g8dTD9cysQGJ9Bm7WCDa6P75s7KP",
  t2btc: "8sQhhX6vfFfzoVd42Qbm42XdS9QH6yYD1w3LojAWSvHH",
  t2usdc: "5Ft8uJ3cQk2WmZpL9vRbN4xYhG6sD7aE1oTqC8wVnK2M",
  t2base: "3HkP9sWd6fQx2LmT7vRcN5yBg8jZa4uE1oYqC2wVnM8K",
  t2msg: "7JqR4tYe2gSx9MnU5vPcL3zBh6kWa8uD1oXqF2wVmN4H",
  t3evm: "2mUVXXpsenonfVoJjK57HgJZTYw2Qx94inRuCm2Lva4h",
  t3list: "6vfGivrQ1ANLvaDrmTeBFA3qwWZCCz4jMi4NSp3JXJVp",
  t4evm: "DmmynatTNfTePHtCehhwfZn5VdK8ceuK2diFWQ6RoPJz",
  t4list: "Bjyn7FSFCgezzYpjEx8xMH62gXLHBSxdwszKq1pn9o8q",
  t5btc: "BQ3DrNJVtNvNqL6aRCwdX5VQhA2ZPRw4qS8bBm72HFV9",
  t5list: "9vpH8s5t7nc7rzQSfx1vdJAUbBdoSN7GgVSuXD76ii8H",
  mint: "GTyaG5jfZipLPzZxWHjRps9ptYUCLUu5aWuT9DTqgEY2",
} as const;

const EVM = {
  t1: {
    unsigned_tx: "02f183aa36a7808459682f0084b2d05e00825208948b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f74187038d7ea4c6800080c0",
    payload: "d0e549763e2f30d48adf1ff20ecb033cac332271af7412c2782a2c80c3e21896",
    r: "9f1d7917d68cc082a68e7d954fb545e8a7f44eaec5db9007c763093673dc3d82",
    s: "210ab7959d1cd775e106a2d7089638b3364b8192499b69c814d13d09df5e0481",
    chainTx: "0xb68db29fd3e08d61af157c9afab3772c16641719feb8fc28095f1b832cd10e2c",
    to: "0x8b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f741",
    valueWei: "1000000000000000",
  },
  t3: {
    unsigned_tx: "02f183aa36a7808459682f0084b2d05e008252089453f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a8711c37937e0800080c0",
    payload: "0ba2f0731c1963955e2ecabfe0dcba7a0066223fca9e85d735b75b390622cf56",
    r: "89041c59872542b9cd7f60b20a5dabc21d50f86aaa3cc4d1e6ae4a9a7f5ff949",
    s: "1c0e46de075791d9b6c4fccc075772e579e7f267c0325b1d763b25e3f04ef4c9",
    chainTx: "0x2a550b40dceebc0ec490f66fc7302d8cc172535395cd43d46ff3fd5a5ad284e1",
    to: "0x53f9a1c2b3d4e5f60718293a4b5c6d7e8f901c2a",
    valueWei: "5000000000000000",
  },
  t4: {
    unsigned_tx: "02f183aa36a7018459682f0084b2d05e00825208948b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f74187071afd498d000080c0",
    payload: "baff1c4333e58d914073f59e1cb449af069b2dbefd4d057d7505d7bb1a9378d3",
    r: "7f6f463c80d31989a41938862195ac12dfc880112533fd8455a53cbf508c338f",
    s: "59614d5d454021b834428f9990227d99ba31d193a84375ec0cf12243b79714e9",
    to: "0x8b2fa5e1d7c4b1e9a3f0c6d2e4b7a1c9d3e5f741",
    valueWei: "2000000000000000",
  },
} as const;

const BTC = {
  t1: { txid: "ee4d22536b6d2275567b96497ac475bf2bf024e630c973ab6abcfba8379641d5", payload: "0f164d7dd48f13e1298569fb71e22b64ef63f331971cf951345612f95a11d1d1", r: "90ecbb37a7c99168171e7433748a540b86963c35cecbc9fcc67fddfe4ef39ccb", s: "153e23f3c348792b91862504ba0cefadc4416d38bf7ad104e91531d60cbbd23f", spend: "6be65f5e8e78aebc6c2946600d83cf14a3042bc35e4d1d382abca955fc88c165", amount: "100000", sent: "10000", to: "tb1qaanvpz7r4c5u9yqd8m3yfk8yh2k7c5gzky8sd" },
  t2: { txid: "ff2ff9620cfbc80944893680cca73b7e1e427dd034328dc35819a209f17cf714", payload: "2d010415f06c9c5ee8f514b9b642d470da1c5cb8f44c1f6bcab62a118abbdf49", r: "029c5e6bdfcda60aee85f3beb91a545d8b202714f926a8358de0e2961e323615", s: "61f9ee51bf799634f1d8465ca9c5a55eee0a2279ff83083d519c697d373461da", spend: "9e56b84e64dd3ff9781bf92fa1968915e62233265b412a712297885e3193f9b0", amount: "50000", sent: "20000", to: "tb1q9x7kz5d3fq2m7h4ylpcw8gsxu6tn0rja4w" },
  t5: { txid: "e1d4004bb7584655d4ac8cbe64ca89918ed8cf6c9df9c00c9a12d9211abc9ded", payload: "28a79d3583f55043cc23985b741c8908b30dc98fd40c602faa4e52cd33459c9e", r: "49c7ed99c4474c2f1347410b4b5fe1cba2fdf7f9c06fc7826a23ce5a3b0ab312", s: "3b2c5c47da345fe2eb3ccb051db7f174c8da85a1cc9d9d2d9815566dcedd9a6b", spend: "399b093f3b131880e3b0ce6f36e0a4caf7c9f117651846d0085488ee83f3ce3b", amount: "50000", sent: "30000", to: "tb1qaanvpz7r4c5u9yqd8m3yfk8yh2k7c5gzky8sd" },
} as const;

/**
 * C2 / C3 / C7 records of #2 (generated with @satchel/core: real type-2 RLP, payload = keccak256(unsigned_tx); the
 * message payload = keccak256(EIP-191 bytes)). Signatures are placeholders.
 */
const RECIPIENT2 = "0x61739f33adbb7f76c1b5b222e4119085257528be";
const C2 = {
  usdc: {
    unsigned_tx:
      "02f87083aa36a780843b9aca008459682f00830130b0941c7d4b196cb0c7b01d743fbc6116a902379c723880b844a9059cbb00000000000000000000000061739f33adbb7f76c1b5b222e4119085257528be000000000000000000000000000000000000000000000000000000000016e360c0",
    payload: "4694b152d5e9cdfd9c05fbd7a33abdcae849afcc2e0e191abd6ae7a8d08fcf9e",
    token: "1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    amount: "1500000",
    chainTx: "0x5d0c1f8e2a7b9c3d4e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5",
  },
  base: {
    unsigned_tx: "02f183014a3480843b9aca008459682f008252089461739f33adbb7f76c1b5b222e4119085257528be870aa87bee53800080c0",
    payload: "7f1f7fa2fde2cf7195a786b812b768fefef1373b8c3119cdef8c80c981b439bf",
    valueWei: "3000000000000000",
    chainTx: "0x9a8b7c6d5e4f30211203f4e5d6c7b8a9908f7e6d5c4b3a291807f6e5d4c3b2a1",
  },
  msg: {
    text: "Sign in to example.xyz as the owner of Satchel #2. Nonce: 7f3a91",
    hex: "5369676e20696e20746f206578616d706c652e78797a20617320746865206f776e6572206f66205361746368656c2023322e204e6f6e63653a20376633613931",
    payload: "5132a023d7379be16a8e4c49d7bd506028ae0cc1af5edb8e87c607147270b566",
  },
} as const;

export const FIXTURE_BTC = BTC;
export const FIXTURE_EVM = EVM;
export const FIXTURE_C2 = { ...C2, recipient: RECIPIENT2 };

const paths = (id: string) => ({ btc: `satchel/${id}/btc`, evm: `satchel/${id}/evm`, sol: `satchel/${id}/sol` });

function rec(p: Partial<SigRecordView> & Pick<SigRecordView, "seq" | "chain" | "height" | "payload" | "detail">, requester = ALICE): SigRecordView {
  return {
    request_id: p.seq,
    input_index: 0,
    timestamp_ms: tAt(p.height),
    requester,
    status: "signed",
    signature: null,
    ...p,
  };
}

const H1_EVM = hAgo(90_000);
const H1_BTC = hAgo(60_000);
const H2_XFER = hAgo(40_000);
const H2_BTC = hAgo(30_000);
const H2_USDC = hAgo(26_000);
const H2_BASE = hAgo(25_000);
const H2_MSG = hAgo(24_000);
const H3_EVM = hAgo(20_000);
const H3_LIST = hAgo(18_000);
const H4_EVM = hAgo(12_000);
const H4_LIST = hAgo(11_000);
const H5_BTC = hAgo(9_000);
const H5_LIST = hAgo(7_500);

export const FIXTURE_RECORDS: Record<string, SigRecordView[]> = {
  "1": [
    rec({ seq: 0, chain: "evm", height: H1_EVM, payload: EVM.t1.payload, signature: { r: EVM.t1.r, s: EVM.t1.s, recovery_id: 1 }, detail: { evm: { chain_id: 11155111, nonce: 0, unsigned_tx: EVM.t1.unsigned_tx } } }),
    rec({ seq: 1, chain: "btc", height: H1_BTC, payload: BTC.t1.payload, signature: { r: BTC.t1.r, s: BTC.t1.s, recovery_id: 0 }, detail: { btc: { txid: BTC.t1.txid, vout: 1, amount_sats: BTC.t1.amount } } }),
  ],
  "2": [
    rec({ seq: 0, chain: "btc", height: H2_BTC, payload: BTC.t2.payload, signature: { r: BTC.t2.r, s: BTC.t2.s, recovery_id: 1 }, detail: { btc: { txid: BTC.t2.txid, vout: 0, amount_sats: BTC.t2.amount } } }, BOB),
    // C2: a USDC transfer on Sepolia (nonce 0)
    rec(
      {
        seq: 1,
        chain: "evm",
        height: H2_USDC,
        payload: C2.usdc.payload,
        signature: { r: BTC.t2.s, s: BTC.t2.r, recovery_id: 0 },
        detail: { evm: { chain_id: 11155111, nonce: 0, unsigned_tx: C2.usdc.unsigned_tx, erc20: { token: C2.usdc.token, to: RECIPIENT2.slice(2), amount: C2.usdc.amount } } },
      },
      BOB,
    ),
    // C3: a native send on Base Sepolia (its own nonce 0: the nonce rule is per chain)
    rec({ seq: 2, chain: "evm", height: H2_BASE, payload: C2.base.payload, signature: { r: EVM.t1.s, s: EVM.t1.r, recovery_id: 1 }, detail: { evm: { chain_id: 84532, nonce: 0, unsigned_tx: C2.base.unsigned_tx } } }, BOB),
    // C7: an EIP-191 message (never blocks Buy)
    rec({ seq: 3, chain: "evm", height: H2_MSG, payload: C2.msg.payload, signature: { r: EVM.t3.s, s: EVM.t3.r, recovery_id: 0 }, detail: { evm_message: { message: C2.msg.hex } } }, BOB),
  ],
  "3": [rec({ seq: 0, chain: "evm", height: H3_EVM, payload: EVM.t3.payload, signature: { r: EVM.t3.r, s: EVM.t3.s, recovery_id: 0 }, detail: { evm: { chain_id: 11155111, nonce: 0, unsigned_tx: EVM.t3.unsigned_tx } } })],
  "4": [rec({ seq: 0, chain: "evm", height: H4_EVM, payload: EVM.t4.payload, signature: { r: EVM.t4.r, s: EVM.t4.s, recovery_id: 1 }, detail: { evm: { chain_id: 11155111, nonce: 1, unsigned_tx: EVM.t4.unsigned_tx } } })],
  "5": [rec({ seq: 0, chain: "btc", height: H5_BTC, payload: BTC.t5.payload, signature: { r: BTC.t5.r, s: BTC.t5.s, recovery_id: 0 }, detail: { btc: { txid: BTC.t5.txid, vout: 0, amount_sats: BTC.t5.amount } } })],
  "6": [],
  "7": [],
};

interface TokenFixture {
  owner: string;
  last_sign_height: number;
  listing: SatchelView["listing"];
  mintedAt: number;
}

export const FIXTURE_TOKENS: Record<string, TokenFixture> = {
  "1": { owner: ALICE, last_sign_height: H1_BTC, listing: null, mintedAt: BIRTH_HEIGHT },
  "2": { owner: BOB, last_sign_height: H2_MSG, listing: null, mintedAt: BIRTH_HEIGHT },
  "3": { owner: ALICE, last_sign_height: H3_EVM, listing: { id: 3, seller: ALICE, price: "5000000", currency: "usdc", listed_at: H3_LIST, sig_count: 1 }, mintedAt: BIRTH_HEIGHT },
  "4": { owner: ALICE, last_sign_height: H4_EVM, listing: { id: 4, seller: ALICE, price: "2000000000000000000000000", currency: "near", listed_at: H4_LIST, sig_count: 1 }, mintedAt: BIRTH_HEIGHT },
  "5": { owner: ALICE, last_sign_height: H5_BTC, listing: { id: 5, seller: ALICE, price: "1000000000000000000000000", currency: "near", listed_at: H5_LIST, sig_count: 1 }, mintedAt: BIRTH_HEIGHT },
  "6": { owner: ALICE, last_sign_height: 0, listing: null, mintedAt: BIRTH_HEIGHT },
  "7": { owner: ALICE, last_sign_height: 0, listing: null, mintedAt: BIRTH_HEIGHT },
};

export const FIXTURE_IDS = Object.keys(FIXTURE_TOKENS);

/**
 * C5 (docs/specs/C5.md): the demo delegation on Satchel #1 (ALICE owns it) — DANA can sign BTC and ETH up to a daily
 * cap, nothing spent yet, no expiry. `sim.ts` merges this with the in-browser mutations (set/revoke/spend) into the
 * same `AllowanceView` shape the real `allowance`/`allowances_of` views return.
 */
export const FIXTURE_ALLOWANCES: Record<string, AllowanceRecord[]> = {
  "1": [
    {
      delegate: DANA,
      owner: ALICE,
      set_at_ms: tAt(hAgo(5_000)),
      expires_at_ms: null,
      caps: [
        { asset: "btc", limit: "50000", spends: [] },
        { asset: { evm: { chain_id: 11155111 } }, limit: "20000000000000000", spends: [] },
      ],
    },
  ],
};

export function fixtureSatchel(id: string, cooldown = 250): SatchelView | null {
  const t = FIXTURE_TOKENS[id];
  if (!t) return null;
  const sigs = FIXTURE_RECORDS[id] ?? [];
  return {
    token_id: id,
    owner_id: t.owner,
    sig_count: sigs.length,
    last_sign_height: t.last_sign_height,
    listable_at: t.last_sign_height === 0 ? 0 : t.last_sign_height + cooldown,
    listing: t.listing,
    paths: paths(id),
  };
}

export function fixtureToken(id: string): NftToken | null {
  const t = FIXTURE_TOKENS[id];
  if (!t) return null;
  return { token_id: id, owner_id: t.owner, metadata: { title: `Satchel #${id}`, media: `${id}.svg`, issued_at: String(tAt(t.mintedAt)) }, approved_account_ids: null };
}

export const FIXTURE_CONFIG: ConfigView = {
  version: "1.0.0",
  mpc_contract_id: "v1.signer-prod.testnet",
  usdc_contract_id: "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af",
  cooldown_blocks: 250,
  evm_chain_ids: [11155111, 84532, 421614, 11155420],
  erc20_tokens: [
    { chain_id: 11155111, token: "1c7d4b196cb0c7b01d743fbc6116a902379c7238" },
    { chain_id: 84532, token: "036cbd53842c5426634e7929541ec2318f3dcf7e" },
    { chain_id: 421614, token: "75faf114eafb1bdbe2f0316df893fd58ce46aa4d" },
    { chain_id: 11155420, token: "5fd84259d66cd46123540766be93dfe6d43130d7" },
  ],
  max_message_bytes: 1024,
  max_btc_inputs: 10,
  mpc_sign_gas_tgas: 15,
  on_signed_gas_tgas: { base: 10, per_request: 2 },
  min_sign_prepaid_tgas: { base: 30, per_request: 18 },
  max_mpc_deposit: "10000000000000000000000",
  storage_byte_cost: "10000000000000000000",
  base_uri: "https://usesatchel.xyz/api/card/",
  next_token_id: 8,
  next_listing_id: 6,
};

export function fixtureListings(): ListingView[] {
  return FIXTURE_IDS.filter((id) => FIXTURE_TOKENS[id].listing).map((id) => ({ token_id: id, listing: FIXTURE_TOKENS[id].listing! }));
}

/** Balances in base units (sats, wei, lamports). SOL is P2 and not shown, but its value is kept for the API. */
export const FIXTURE_BALANCES: Record<string, { btc: { confirmed: string; unconfirmed: string }; evm: string; sol: string }> = {
  "1": { btc: { confirmed: "189718", unconfirmed: "0" }, evm: "48979000000000000", sol: "500000000" },
  "2": { btc: { confirmed: "29718", unconfirmed: "0" }, evm: "20000000000000000", sol: "0" },
  "3": { btc: { confirmed: "50000", unconfirmed: "0" }, evm: "14979000000000000", sol: "0" },
  "4": { btc: { confirmed: "0", unconfirmed: "0" }, evm: "10000000000000000", sol: "0" },
  "5": { btc: { confirmed: "19718", unconfirmed: "0" }, evm: "10000000000000000", sol: "0" },
  "6": { btc: { confirmed: "50000", unconfirmed: "0" }, evm: "20000000000000000", sol: "0" },
  "7": { btc: { confirmed: "100000", unconfirmed: "0" }, evm: "20000000000000000", sol: "0" },
};

/**
 * C2 + C3: USDC on Sepolia, and ETH + USDC on Base Sepolia, Arbitrum Sepolia and OP Sepolia (base units). Sepolia's
 * ETH stays `FIXTURE_BALANCES[id].evm`. Tokens not listed hold nothing on the other networks.
 */
export const FIXTURE_EVM_CHAINS: Record<string, Partial<Record<number, { wei?: string; usdc?: string }>>> = {
  // #1 also holds USDC on Arbitrum Sepolia with no ETH there: the USDC send's "needs ETH for the fee" case
  "1": { 11155111: { usdc: "25000000" }, 84532: { wei: "20000000000000000", usdc: "10000000" }, 421614: { usdc: "4000000" }, 11155420: { wei: "5000000000000000" } },
  "2": { 11155111: { usdc: "3500000" }, 84532: { wei: "17000000000000000" } },
  "7": { 84532: { wei: "8000000000000000" } },
};

export function fixtureEvmChains(id: string): { chain_id: number; wei: string; usdc: string }[] {
  const t = FIXTURE_EVM_CHAINS[id] ?? {};
  return [11155111, 84532, 421614, 11155420].map((c) => ({
    chain_id: c,
    wei: c === 11155111 ? (FIXTURE_BALANCES[id]?.evm ?? "0") : (t[c]?.wei ?? "0"),
    usdc: t[c]?.usdc ?? "0",
  }));
}

export const FIXTURE_LOCK = {
  access_keys: 0,
  account_exists: true,
  code_hash_hex: FIXTURE_CODE_HASH,
  birth_tx: NEAR_TX.birth,
  birth_block: BIRTH_HEIGHT,
  birth_actions: ["CreateAccount", "Transfer", "DeployContract", "FunctionCall new", ...Array.from({ length: 7 }, (_, i) => `FunctionCall nft_mint #${i + 1}`)],
  any_signer_tx_count: 0,
  oldest_tx: NEAR_TX.birth,
  mpc_version: "3.17.0",
};

/** What happened, per token, as NEP-297 events would show (Activity). Newest first. */
export interface FixtureEvent {
  tx: string;
  block: number;
  timestampMs: number;
  event: "nft_mint" | "nft_transfer" | "sign_requested" | "sign_resolved" | "listed" | "delisted" | "sold";
  data: Record<string, unknown>;
  chainTx?: { chain: "btc" | "evm"; id: string; amount: string; to: string; fee?: string; token?: "USDC"; chainId?: number };
  /** C7: a signed message (no chain tx) */
  message?: { chain: "evm" | "sol"; text: string };
}

export function fixtureEvents(id: string): FixtureEvent[] {
  const mint: FixtureEvent = { tx: NEAR_TX.birth, block: BIRTH_HEIGHT, timestampMs: tAt(BIRTH_HEIGHT), event: "nft_mint", data: { owner_id: ALICE, token_ids: [id] } };
  const ev: Record<string, FixtureEvent[]> = {
    "1": [
      { tx: NEAR_TX.t1btc, block: H1_BTC, timestampMs: tAt(H1_BTC), event: "sign_requested", data: { token_id: "1", chain: "btc", first_seq: 1, count: 1 }, chainTx: { chain: "btc", id: BTC.t1.spend, amount: BTC.t1.sent, to: BTC.t1.to, fee: "282" } },
      { tx: NEAR_TX.t1evm, block: H1_EVM, timestampMs: tAt(H1_EVM), event: "sign_requested", data: { token_id: "1", chain: "evm", first_seq: 0, count: 1 }, chainTx: { chain: "evm", id: EVM.t1.chainTx, amount: EVM.t1.valueWei, to: EVM.t1.to, fee: "21000000000000" } },
      mint,
    ],
    "2": [
      { tx: NEAR_TX.t2msg, block: H2_MSG, timestampMs: tAt(H2_MSG), event: "sign_requested", data: { token_id: "2", chain: "evm", first_seq: 3, count: 1, kind: "evm_message" }, message: { chain: "evm", text: C2.msg.text } },
      { tx: NEAR_TX.t2base, block: H2_BASE, timestampMs: tAt(H2_BASE), event: "sign_requested", data: { token_id: "2", chain: "evm", first_seq: 2, count: 1 }, chainTx: { chain: "evm", id: C2.base.chainTx, amount: C2.base.valueWei, to: RECIPIENT2, fee: "21000000000000", chainId: 84532 } },
      { tx: NEAR_TX.t2usdc, block: H2_USDC, timestampMs: tAt(H2_USDC), event: "sign_requested", data: { token_id: "2", chain: "evm", first_seq: 1, count: 1 }, chainTx: { chain: "evm", id: C2.usdc.chainTx, amount: C2.usdc.amount, to: RECIPIENT2, fee: "52000000000000", token: "USDC", chainId: 11155111 } },
      { tx: NEAR_TX.t2btc, block: H2_BTC, timestampMs: tAt(H2_BTC), event: "sign_requested", data: { token_id: "2", chain: "btc", first_seq: 0, count: 1, owner_id: BOB }, chainTx: { chain: "btc", id: BTC.t2.spend, amount: BTC.t2.sent, to: BTC.t2.to, fee: "282" } },
      { tx: NEAR_TX.t2xfer, block: H2_XFER, timestampMs: tAt(H2_XFER), event: "nft_transfer", data: { old_owner_id: ALICE, new_owner_id: BOB, token_ids: ["2"] } },
      mint,
    ],
    "3": [
      { tx: NEAR_TX.t3list, block: H3_LIST, timestampMs: tAt(H3_LIST), event: "listed", data: { token_id: "3", listing_id: 3, price: "5000000", currency: "usdc", seller_id: ALICE } },
      { tx: NEAR_TX.t3evm, block: H3_EVM, timestampMs: tAt(H3_EVM), event: "sign_requested", data: { token_id: "3", chain: "evm", first_seq: 0, count: 1 }, chainTx: { chain: "evm", id: EVM.t3.chainTx, amount: EVM.t3.valueWei, to: EVM.t3.to, fee: "21000000000000" } },
      mint,
    ],
    "4": [
      { tx: NEAR_TX.t4list, block: H4_LIST, timestampMs: tAt(H4_LIST), event: "listed", data: { token_id: "4", listing_id: 4, price: "2000000000000000000000000", currency: "near", seller_id: ALICE } },
      { tx: NEAR_TX.t4evm, block: H4_EVM, timestampMs: tAt(H4_EVM), event: "sign_requested", data: { token_id: "4", chain: "evm", first_seq: 0, count: 1, to: EVM.t4.to, amount: EVM.t4.valueWei } },
      mint,
    ],
    "5": [
      { tx: NEAR_TX.t5list, block: H5_LIST, timestampMs: tAt(H5_LIST), event: "listed", data: { token_id: "5", listing_id: 5, price: "1000000000000000000000000", currency: "near", seller_id: ALICE } },
      { tx: NEAR_TX.t5btc, block: H5_BTC, timestampMs: tAt(H5_BTC), event: "sign_requested", data: { token_id: "5", chain: "btc", first_seq: 0, count: 1 }, chainTx: { chain: "btc", id: BTC.t5.spend, amount: BTC.t5.sent, to: BTC.t5.to, fee: "282" } },
      mint,
    ],
    "6": [mint],
    "7": [mint],
  };
  return ev[id] ?? [];
}

/** Where each record's evidence stands on its chain (what the browser checker would find). */
export type FixtureItemStatus = "spent" | "unused" | "expired" | "unfunded" | "settling" | "unknown";
export function fixtureItemStatus(id: string, seq: number): FixtureItemStatus {
  if (id === "4" && seq === 0) return "unused";
  return "spent";
}
export function fixtureEvidence(id: string, seq: number): { line: string; url?: string } {
  const r = FIXTURE_RECORDS[id]?.find((x) => x.seq === seq);
  if (!r) return { line: "" };
  if ("evm" in r.detail) {
    const nonce = r.detail.evm.nonce;
    if (fixtureItemStatus(id, seq) === "unused") return { line: `Nonce ${nonce} not used yet` };
    if (id === "2") {
      const base = r.detail.evm.chain_id === 84532;
      const tx = base ? C2.base.chainTx : C2.usdc.chainTx;
      return { line: `Nonce ${nonce} used by ${tx.slice(0, 6)}…${tx.slice(-4)} · 3 confirmations`, url: base ? `https://sepolia.basescan.org/tx/${tx}` : `https://sepolia.etherscan.io/tx/${tx}` };
    }
    const tx = id === "1" ? EVM.t1.chainTx : EVM.t3.chainTx;
    return { line: `Nonce ${nonce} used by ${tx.slice(0, 6)}…${tx.slice(-4)} · 3 confirmations`, url: `https://sepolia.etherscan.io/tx/${tx}` };
  }
  if ("btc" in r.detail) {
    const spend = id === "1" ? BTC.t1.spend : id === "2" ? BTC.t2.spend : BTC.t5.spend;
    return { line: `Spent in ${spend.slice(0, 8)}…${spend.slice(-4)}`, url: `https://mempool.space/testnet4/tx/${spend}` };
  }
  return { line: "Blockhash expired. It can't be used." };
}

export const FIXTURE_TIME = { tAt, hAgo, BLOCK_MS };
