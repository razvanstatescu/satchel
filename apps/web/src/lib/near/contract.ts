import { revokeAllowanceCall, setAllowanceCall } from "@satchel/core/near";
import type { CapInput } from "@satchel/core/policy";
import { SATCHEL_CONTRACT, USDC_CONTRACT } from "@/lib/config";
import { ATTACH, signAttachDeposit, signAttachTgas, tgas } from "@/lib/near/constants";
import type {
  AllowanceView,
  Chain,
  ConfigView,
  Currency,
  ListingView,
  NftToken,
  ProceedsView,
  SatchelView,
  SigRecordView,
  SignRequest,
  TokenId,
} from "@/lib/near/types";

/**
 * Typed views and call builders for the Satchel contract (kb/90 §5.6, §5.14).
 * Views take a `ViewFn` so the same code runs against live RPC, the fixture source and tests.
 * Call builders return a wallet-ready FunctionCall (near-connect / wallet-selector action shape) with
 * gas and deposit as decimal strings (kb/90 §8.5).
 */

export type ViewFn = <T>(contractId: string, method: string, args: Record<string, unknown>) => Promise<T | null>;

export const SIG_RECORDS_PAGE = 50; // contract limit ≤ 50
export const LISTINGS_PAGE = 50;

export function contractViews(view: ViewFn, contractId: string = SATCHEL_CONTRACT) {
  return {
    config: () => view<ConfigView>(contractId, "config", {}),
    satchel: (token_id: TokenId) => view<SatchelView>(contractId, "satchel", { token_id }),
    sigRecords: async (token_id: TokenId, from_seq: number, limit = SIG_RECORDS_PAGE) =>
      (await view<SigRecordView[]>(contractId, "sig_records", { token_id, from_seq, limit: Math.min(limit, SIG_RECORDS_PAGE) })) ?? [],
    /** Reads seq 0..sig_count (the completeness anchor, kb/90 §7.1). */
    allSigRecords: async (token_id: TokenId, sigCount: number) => {
      const out: SigRecordView[] = [];
      for (let from = 0; from < sigCount; from += SIG_RECORDS_PAGE) {
        const page = (await view<SigRecordView[]>(contractId, "sig_records", { token_id, from_seq: from, limit: SIG_RECORDS_PAGE })) ?? [];
        out.push(...page);
        if (page.length < Math.min(SIG_RECORDS_PAGE, sigCount - from)) break;
      }
      return out;
    },
    listings: async (from_index = 0, limit = LISTINGS_PAGE) =>
      (await view<ListingView[]>(contractId, "listings", { from_index, limit: Math.min(limit, LISTINGS_PAGE) })) ?? [],
    proceedsOf: async (account_id: string) => (await view<ProceedsView[]>(contractId, "proceeds_of", { account_id })) ?? [],
    derivedPath: (token_id: TokenId, chain: Chain) => view<string>(contractId, "derived_path", { token_id, chain }),
    nftToken: (token_id: TokenId) => view<NftToken>(contractId, "nft_token", { token_id }),
    nftTotalSupply: async () => Number((await view<string>(contractId, "nft_total_supply", {})) ?? "0"),
    nftTokensForOwner: async (account_id: string, from_index = "0", limit = 50) =>
      (await view<NftToken[]>(contractId, "nft_tokens_for_owner", { account_id, from_index, limit })) ?? [],
    nftSupplyForOwner: async (account_id: string) =>
      Number((await view<string>(contractId, "nft_supply_for_owner", { account_id })) ?? "0"),
    // C5 (docs/specs/C5.md §1.2): at most MAX_DELEGATES (4) rows, insertion order; [] when none.
    allowancesOf: async (token_id: TokenId) => (await view<AllowanceView[]>(contractId, "allowances_of", { token_id })) ?? [],
    allowance: (token_id: TokenId, delegate: string) => view<AllowanceView>(contractId, "allowance", { token_id, delegate }),
  };
}

export type ContractViews = ReturnType<typeof contractViews>;

/** The wallet action shape near-connect accepts (kb/40 §near-connect API). */
export interface FunctionCallAction {
  type: "FunctionCall";
  params: { methodName: string; args: Record<string, unknown>; gas: string; deposit: string };
}
/** A plain NEAR transfer action (A2 Give by link: funding a fresh implicit account for gas). */
export interface TransferAction {
  type: "Transfer";
  params: { deposit: string };
}
export interface WalletTx {
  receiverId: string;
  actions: (FunctionCallAction | TransferAction)[];
}
/** The function-call-only shape every `calls.*` builder but `transferNear` returns (narrower than `WalletTx`, so
 * callers keep precise `.actions[0].params` typing; it's structurally a `WalletTx` wherever one is expected). */
export interface FunctionCallTx {
  receiverId: string;
  actions: FunctionCallAction[];
}

const fc = (receiverId: string, methodName: string, args: Record<string, unknown>, gas: string, deposit: string): FunctionCallTx => ({
  receiverId,
  actions: [{ type: "FunctionCall", params: { methodName, args, gas, deposit } }],
});

export function requestCount(request: SignRequest): number {
  return "btc" in request ? request.btc.preimages.length : 1;
}

export const calls = {
  nftMint: (receiver_id: string, contractId = SATCHEL_CONTRACT) =>
    fc(contractId, "nft_mint", { receiver_id }, ATTACH.mint.gas, ATTACH.mint.deposit),

  signFor: (token_id: TokenId, request: SignRequest, contractId = SATCHEL_CONTRACT) => {
    const n = requestCount(request);
    return fc(contractId, "sign_for", { token_id, request }, tgas(signAttachTgas(n)), signAttachDeposit(n).toString());
  },

  nftTransfer: (token_id: TokenId, receiver_id: string, contractId = SATCHEL_CONTRACT) =>
    fc(contractId, "nft_transfer", { receiver_id, token_id }, ATTACH.transfer.gas, ATTACH.transfer.deposit),

  /** A plain NEAR transfer (A2 Give by link: funding the claim's fresh implicit account for gas). */
  transferNear: (receiver_id: string, deposit: string): WalletTx => ({ receiverId: receiver_id, actions: [{ type: "Transfer", params: { deposit } }] }),

  list: (token_id: TokenId, price: string, currency: Currency, contractId = SATCHEL_CONTRACT) =>
    fc(contractId, "list", { token_id, price, currency }, ATTACH.list.gas, ATTACH.list.deposit),

  delist: (token_id: TokenId, contractId = SATCHEL_CONTRACT) =>
    fc(contractId, "delist", { token_id }, ATTACH.delist.gas, ATTACH.delist.deposit),

  /** NEAR listing: attach exactly `price` yocto. */
  buyNear: (token_id: TokenId, listing_id: number, expected_sig_count: number, price: string, contractId = SATCHEL_CONTRACT) =>
    fc(contractId, "buy", { token_id, listing_id, expected_sig_count }, ATTACH.buyNearGas, price),

  /** USDC listing: usdc.ft_transfer_call(receiver = satchel, amount = price, msg = {"buy":{…}}). */
  buyUsdc: (
    token_id: TokenId,
    listing_id: number,
    expected_sig_count: number,
    price: string,
    contractId = SATCHEL_CONTRACT,
    usdc = USDC_CONTRACT,
  ) =>
    fc(
      usdc,
      "ft_transfer_call",
      {
        receiver_id: contractId,
        amount: price,
        msg: JSON.stringify({ buy: { token_id, listing_id, expected_sig_count } }),
      },
      ATTACH.buyUsdc.gas,
      ATTACH.buyUsdc.deposit,
    ),

  withdrawProceeds: (currency: Currency, contractId = SATCHEL_CONTRACT) =>
    fc(contractId, "withdraw_proceeds", { currency }, ATTACH.withdraw.gas, ATTACH.withdraw.deposit),

  usdcRegister: (account_id: string, usdc = USDC_CONTRACT) =>
    fc(usdc, "storage_deposit", { account_id, registration_only: true }, ATTACH.usdcRegister.gas, ATTACH.usdcRegister.deposit),

  /** C5: owner only, deposit ≥ measured storage (the core builder validates caps and throws RangeError with the contract's code). */
  setAllowance: (token_id: TokenId, delegate: string, caps: readonly CapInput[], expires_at_ms?: number, contractId = SATCHEL_CONTRACT): WalletTx => {
    const p = setAllowanceCall(token_id, delegate, caps, expires_at_ms);
    return fc(contractId, p.methodName, p.args, p.gas, p.deposit);
  },

  /** C5: owner only, exactly 1 yocto. */
  revokeAllowance: (token_id: TokenId, delegate: string, contractId = SATCHEL_CONTRACT): WalletTx => {
    const p = revokeAllowanceCall(token_id, delegate);
    return fc(contractId, p.methodName, p.args, p.gas, p.deposit);
  },
};

/** Status pill derived from contract state (kb/90 §5.10, kb/81 R3 precedence). */
export type SatchelStatus = "active" | "signing" | "listed" | "needs_attention";

export function deriveStatus(args: {
  satchel: Pick<SatchelView, "listing">;
  records?: Pick<SigRecordView, "status" | "height">[];
  height?: number | null;
  cooldownBlocks?: number;
  localInFlight?: boolean;
  needsAttention?: boolean;
}): SatchelStatus {
  if (args.satchel.listing) return "listed";
  if (args.needsAttention) return "needs_attention";
  if (args.localInFlight) return "signing";
  const cd = args.cooldownBlocks ?? 250;
  const h = args.height ?? null;
  const young = (args.records ?? []).some((r) => r.status === "pending" && (h === null || r.height > h - cd));
  return young ? "signing" : "active";
}

/** Blocks left in the quiet period before `list` is allowed. */
export function blocksUntilListable(satchel: Pick<SatchelView, "listable_at" | "last_sign_height">, height: number): number {
  if (satchel.last_sign_height === 0) return 0;
  return Math.max(0, satchel.listable_at - height);
}
