import { toHex } from "@satchel/core/bytes";
import { classifySignRequest, signContextFromRecords, type Asset, type CapInput } from "@satchel/core/policy";
import { IS_FIXTURE } from "@/lib/config";
import { FIXTURE_HEIGHT } from "@/lib/data/fixtures";
import { FIXTURE_RECORDS } from "@/lib/data/fixtures";
import {
  fixtureHash,
  simBuy,
  simDebitDelegated,
  simDelist,
  simFundNear,
  simList,
  simMint,
  simOverlay,
  simRevokeAllowance,
  simSetAllowance,
  simSignFor,
  simTransfer,
  simWithdraw,
} from "@/lib/data/sim";
import type { WalletTx } from "@/lib/near/contract";
import type { SigDetailView, SignRequest } from "@/lib/near/types";
import type { WalletAdapter } from "@/lib/near/wallet";

/**
 * FIXTURE MODE ONLY. A stand-in wallet: it "sends" the tx by applying its effect to the in-browser simulation and resolves
 * like Intear would (after a delay, with the tx hash). For sign_for it runs @satchel/core's reference classifier (the TS
 * mirror of the contract policy) to produce exactly the records the contract would write.
 * Test knob: localStorage "satchel:mock-wallet:reject" = "1" → rejects with "User rejected the transaction".
 */

const REJECT_KEY = "satchel:mock-wallet:reject";

function knob(k: string) {
  try {
    return window.localStorage.getItem(k);
  } catch {
    return null;
  }
}

function recordsFor(request: SignRequest, tokenId: string): { chain: "btc" | "evm" | "sol"; payload: string; detail: SigDetailView }[] {
  // Same nonce-gap rule as the contract (D-43): the token's prior records are the fixture records + this browser's sim records.
  const prior = [...(FIXTURE_RECORDS[tokenId] ?? []), ...simOverlay().records(tokenId)];
  // C3: the nonce-gap rule is per chain id (signContextFromRecords gives each chain's highest signed nonce).
  const r = classifySignRequest(request as never, signContextFromRecords(prior));
  if (!r.ok) throw new Error(`Smart contract panicked: ${r.error}: refused by policy`);
  if (r.chain === "evm") {
    const f = r.fields;
    // C2: the view derives `erc20` from the classified tx (absent on native transfers, never null)
    const erc20 = f.erc20 ? { token: f.erc20.token.slice(2), to: f.erc20.to.slice(2), amount: f.erc20.amount.toString() } : undefined;
    return [{ chain: "evm", payload: toHex(r.recordPayloads[0]), detail: { evm: { chain_id: Number(f.chainId), nonce: Number(f.nonce), unsigned_tx: toHex(f.unsignedTx), ...(erc20 ? { erc20 } : {}) } } }];
  }
  if (r.chain === "btc") {
    return r.fields.inputs.map((inp, i) => ({ chain: "btc" as const, payload: toHex(r.recordPayloads[i]), detail: { btc: { txid: inp.txid, vout: inp.vout, amount_sats: inp.amountSats.toString() } } }));
  }
  // C7: a message record (the EVM or the Solana key signs; the record payload is what core computes)
  if (r.chain === "evm_message") return [{ chain: "evm", payload: toHex(r.recordPayloads[0]), detail: { evm_message: { message: toHex(r.fields.message) } } }];
  if (r.chain === "sol_message") return [{ chain: "sol", payload: toHex(r.recordPayloads[0]), detail: { sol_message: { message: toHex(r.fields.message) } } }];
  return [{ chain: "sol", payload: toHex(r.recordPayloads[0]), detail: { sol: { recent_blockhash: toHex(r.fields.recentBlockhash), lamports: r.fields.lamports.toString() } } }];
}

/** Apply one tx's effect to the sim and return the outcome the real wallet/RPC would resolve with. */
function applyTx(tx: WalletTx, accountId: string): unknown {
  const hash = fixtureHash(JSON.stringify(tx) + Date.now() + Math.random()).slice(0, 44);
  const first = tx.actions[0];
  try {
    if (first?.type === "Transfer") {
      simFundNear(tx.receiverId, first.params.deposit);
      return { transaction: { hash }, status: { SuccessValue: "" }, final_execution_status: "EXECUTED_OPTIMISTIC" };
    }
    const action = first?.params;
    const args = (action?.args ?? {}) as Record<string, unknown>;
    const height = simOverlay().height(FIXTURE_HEIGHT);
    switch (action?.methodName) {
      case "sign_for": {
        const tokenId = String(args.token_id);
        const request = args.request as SignRequest;
        // C5: a non-owner caller is a delegate — check and debit its allowance before the (simulated) MPC call,
        // exactly where the contract does it (authorize_signer, then debit_allowance before step 5).
        const owner = simOverlay().token(tokenId)?.owner_id;
        if (owner && owner !== accountId) {
          const listed = !!simOverlay().satchel(tokenId)?.listing;
          const chk = simDebitDelegated(tokenId, accountId, request, listed);
          if (!chk.ok) throw new Error(`Smart contract panicked: ${chk.error}`);
        }
        simSignFor({ tokenId, requester: accountId, items: recordsFor(request, tokenId), height });
        break;
      }
      case "set_allowance": {
        const caps = (args.caps as { asset: Asset; limit: string }[]).map((c): CapInput => ({ asset: c.asset, limit: BigInt(c.limit) }));
        simSetAllowance(String(args.token_id), accountId, String(args.delegate), caps, args.expires_at_ms as number | undefined);
        break;
      }
      case "revoke_allowance":
        simRevokeAllowance(String(args.token_id), accountId, String(args.delegate));
        break;
      case "nft_transfer":
        simTransfer(String(args.token_id), String(args.receiver_id));
        break;
      case "nft_mint": {
        const id = simMint(String(args.receiver_id));
        return { transaction: { hash }, status: { SuccessValue: btoa(JSON.stringify({ token_id: id, owner_id: args.receiver_id })) }, final_execution_status: "EXECUTED_OPTIMISTIC", mintedId: id };
      }
      case "list":
        simList(String(args.token_id), accountId, String(args.price), args.currency as "near" | "usdc", height);
        break;
      case "delist":
        simDelist(String(args.token_id));
        break;
      case "buy":
        simBuy(String(args.token_id), accountId, hash, height);
        break;
      case "withdraw_proceeds": {
        const r = simWithdraw(accountId, args.currency as "near" | "usdc");
        if (!r.ok) throw new Error(`Smart contract panicked: ${r.error}`);
        break;
      }
      case "ft_transfer_call": {
        const msg = JSON.parse(String(args.msg)) as { buy: { token_id: string } };
        simBuy(msg.buy.token_id, accountId, hash, height);
        return { transaction: { hash }, status: { SuccessValue: btoa(JSON.stringify(String(args.amount))) }, final_execution_status: "EXECUTED_OPTIMISTIC" };
      }
    }
    return { transaction: { hash }, status: { SuccessValue: "" }, final_execution_status: "EXECUTED_OPTIMISTIC" };
  } catch (e) {
    return { transaction: { hash }, status: { Failure: { ActionError: { kind: { FunctionCallError: { ExecutionError: e instanceof Error ? e.message : String(e) } } } } }, final_execution_status: "EXECUTED_OPTIMISTIC" };
  }
}

export function mockWallet(accountId: string): WalletAdapter {
  if (!IS_FIXTURE) throw new Error("the mock wallet exists only in fixture mode");
  return {
    kind: "fixture",
    signAndSendTransaction(tx: WalletTx) {
      return new Promise((resolve, reject) => {
        if (knob(REJECT_KEY) === "1") {
          setTimeout(() => reject(new Error("User rejected the transaction")), 300);
          return;
        }
        setTimeout(() => resolve(applyTx(tx, accountId)), 600);
      });
    },
    /** One wallet approval, several transactions in order (A2 Give by link: fund, then transfer). */
    signAndSendTransactions(txs: WalletTx[]) {
      return new Promise((resolve, reject) => {
        if (knob(REJECT_KEY) === "1") {
          setTimeout(() => reject(new Error("User rejected the transaction")), 300);
          return;
        }
        setTimeout(() => resolve(txs.map((tx) => applyTx(tx, accountId))), 600);
      });
    },
  };
}
