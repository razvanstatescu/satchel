/**
 * Pure tx plans for the NFT and sale flows (kb/90 §5.5–§5.7, docs/handoff/contract.md §1). Gas and deposits come from
 * `@satchel/core/near` ATTACH so the scripts and the web app attach the same amounts.
 */
import { ATTACH } from '@satchel/core/near'
import type { ToolConfig } from '../lib/config'
import { functionCall, type TxPlan } from '../lib/tx'
import { TGAS } from '../lib/units'

export const mintPlan = (cfg: ToolConfig, payer: string, receiver: string): TxPlan => ({
  title: `nft_mint → ${receiver}`,
  signerId: payer,
  receiverId: cfg.contract,
  actions: [functionCall('nft_mint', { receiver_id: receiver }, ATTACH.mint.gas, ATTACH.mint.deposit)],
})

/** Refuses the two receivers the contract refuses (ERR_BAD_RECEIVER, R-18) before anything is signed. */
export function transferPlan(cfg: ToolConfig, owner: string, tokenId: string, receiver: string, memo?: string): TxPlan {
  if (receiver === cfg.contract || receiver === cfg.mpc) throw new Error(`ERR_BAD_RECEIVER: ${receiver} would strand the funds (refused before signing)`)
  if (receiver === owner) throw new Error('receiver equals the current owner')
  const args: Record<string, unknown> = { receiver_id: receiver, token_id: tokenId }
  if (memo) args.memo = memo
  return { title: `nft_transfer #${tokenId} ${owner} → ${receiver}`, signerId: owner, receiverId: cfg.contract, actions: [functionCall('nft_transfer', args, ATTACH.transfer.gas, ATTACH.transfer.deposit)] }
}

export function listPlan(cfg: ToolConfig, seller: string, tokenId: string, price: bigint, currency: 'near' | 'usdc'): TxPlan {
  if (price <= 0n) throw new Error('ERR_PRICE: price must be > 0')
  return {
    title: `list #${tokenId} for ${price} ${currency === 'near' ? 'yoctoNEAR' : 'USDC base units'}`,
    signerId: seller,
    receiverId: cfg.contract,
    actions: [functionCall('list', { token_id: tokenId, price: price.toString(), currency }, ATTACH.list.gas, ATTACH.list.deposit)],
  }
}

export const delistPlan = (cfg: ToolConfig, seller: string, tokenId: string): TxPlan => ({
  title: `delist #${tokenId}`,
  signerId: seller,
  receiverId: cfg.contract,
  actions: [functionCall('delist', { token_id: tokenId }, ATTACH.delist.gas, ATTACH.delist.deposit)],
})

export interface BuyRef {
  tokenId: string
  listingId: number
  expectedSigCount: number
}

export const buyNearPlan = (cfg: ToolConfig, buyer: string, ref: BuyRef, price: bigint): TxPlan => ({
  title: `buy #${ref.tokenId} (listing ${ref.listingId}, sig_count ${ref.expectedSigCount}) for ${price} yocto`,
  signerId: buyer,
  receiverId: cfg.contract,
  actions: [functionCall('buy', { token_id: ref.tokenId, listing_id: ref.listingId, expected_sig_count: ref.expectedSigCount }, ATTACH.buyNear.gas, price)],
})

/** The exact `msg` the contract parses (FtMsg::Buy). */
export const buyMsg = (ref: BuyRef): string => JSON.stringify({ buy: { token_id: ref.tokenId, listing_id: ref.listingId, expected_sig_count: ref.expectedSigCount } })

export const buyUsdcPlan = (cfg: ToolConfig, buyer: string, ref: BuyRef, amount: bigint): TxPlan => ({
  title: `usdc.ft_transfer_call ${amount} → ${cfg.contract} (buy #${ref.tokenId}, listing ${ref.listingId})`,
  signerId: buyer,
  receiverId: cfg.usdc,
  actions: [functionCall('ft_transfer_call', { receiver_id: cfg.contract, amount: amount.toString(), msg: buyMsg(ref) }, ATTACH.buyUsdc.gas, ATTACH.buyUsdc.deposit)],
})

/** The direct-call attack (INV-16): anyone calling ft_on_transfer themselves must get ERR_WRONG_TOKEN. */
export const directFtOnTransferPlan = (cfg: ToolConfig, attacker: string, ref: BuyRef, amount: bigint): TxPlan => ({
  title: `direct ft_on_transfer by ${attacker} (must fail ERR_WRONG_TOKEN)`,
  signerId: attacker,
  receiverId: cfg.contract,
  actions: [functionCall('ft_on_transfer', { sender_id: attacker, amount: amount.toString(), msg: buyMsg(ref) }, 30n * TGAS, 0n)],
})

/** NEP-145 registration of `account` at the USDC contract (0.00125 NEAR, registration only). */
export const usdcStorageDepositPlan = (cfg: ToolConfig, payer: string, account: string): TxPlan => ({
  title: `usdc.storage_deposit for ${account}`,
  signerId: payer,
  receiverId: cfg.usdc,
  actions: [functionCall('storage_deposit', { account_id: account, registration_only: true }, 30n * TGAS, 1_250_000_000_000_000_000_000n)],
})

export const withdrawPlan = (cfg: ToolConfig, account: string, currency: 'near' | 'usdc'): TxPlan => ({
  title: `withdraw_proceeds ${currency}`,
  signerId: account,
  receiverId: cfg.contract,
  actions: [functionCall('withdraw_proceeds', { currency }, ATTACH.withdraw.gas, ATTACH.withdraw.deposit)],
})
