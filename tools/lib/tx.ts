/**
 * Transaction plans: plain data describing exactly what a script would sign, printable before anything is signed,
 * and convertible to a near-api-js 7.3.1 Transaction. AddKey (and every other key/code-changing action) is not
 * representable here, by construction.
 */
import { createHash } from 'node:crypto'
import { actions, createTransaction, PublicKey, type Transaction } from 'near-api-js'
import { base58 } from '@scure/base'
import { formatNear, formatTgas } from './units'

export type ActionSpec =
  | { type: 'CreateAccount' }
  | { type: 'Transfer'; deposit: bigint }
  | { type: 'DeployContract'; code: Uint8Array; sha256: string; source?: string }
  | { type: 'FunctionCall'; method: string; args: Record<string, unknown>; gas: bigint; deposit: bigint }

export interface TxPlan {
  /** one line: what this tx is for */
  title: string
  signerId: string
  receiverId: string
  actions: ActionSpec[]
}

export const sha256Hex = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex')

export function functionCall(method: string, args: Record<string, unknown>, gas: bigint, deposit: bigint): ActionSpec {
  return { type: 'FunctionCall', method, args, gas, deposit }
}

export const totalGas = (p: TxPlan): bigint => p.actions.reduce((s, a) => s + (a.type === 'FunctionCall' ? a.gas : 0n), 0n)
export const totalDeposit = (p: TxPlan): bigint =>
  p.actions.reduce((s, a) => s + (a.type === 'FunctionCall' || a.type === 'Transfer' ? a.deposit : 0n), 0n)

/** `"CreateAccount","Transfer",…`: the kinds, as FastNEAR /v0/transactions lists them. */
export const actionKinds = (p: TxPlan): string[] => p.actions.map((a) => a.type)

function describeAction(a: ActionSpec, i: number): string[] {
  const n = `${String(i + 1).padStart(2, ' ')}.`
  switch (a.type) {
    case 'CreateAccount':
      return [`${n} CreateAccount`]
    case 'Transfer':
      return [`${n} Transfer ${formatNear(a.deposit)} (${a.deposit} yocto)`]
    case 'DeployContract':
      return [`${n} DeployContract ${a.code.length} bytes, sha256 ${a.sha256}${a.source ? ` (${a.source})` : ''}`]
    case 'FunctionCall':
      return [
        `${n} FunctionCall ${a.method}  gas ${formatTgas(a.gas)}  deposit ${formatNear(a.deposit)} (${a.deposit} yocto)`,
        `      args ${JSON.stringify(a.args)}`,
      ]
  }
}

/** Human-readable plan. Exactly the actions, args, gas and deposits that would be signed. */
export function formatPlan(p: TxPlan): string {
  const lines = [
    `TX  ${p.title}`,
    `    signer    ${p.signerId}`,
    `    receiver  ${p.receiverId}`,
    `    actions   ${p.actions.length}`,
    ...p.actions.flatMap(describeAction).map((l) => `    ${l}`),
    `    total     gas ${formatTgas(totalGas(p))}, attached ${formatNear(totalDeposit(p))}`,
  ]
  return lines.join('\n')
}

/** Refuse any plan that could add a key or replace code outside a birth batch (defence in depth; INV-22 spirit). */
export function assertSafeActions(p: TxPlan, allow: { deploy?: boolean; createAccount?: boolean } = {}): void {
  for (const a of p.actions) {
    const t = (a as { type: string }).type
    if (t === 'AddKey' || t === 'DeleteKey' || t === 'DeleteAccount' || t === 'Stake' || t === 'DeployGlobalContract' || t === 'UseGlobalContract')
      throw new Error(`refusing action ${t}`)
    if (t === 'DeployContract' && !allow.deploy) throw new Error('refusing DeployContract outside the birth tool')
    if (t === 'CreateAccount' && !allow.createAccount) throw new Error('refusing CreateAccount outside the birth tool')
  }
}

export function toNearActions(p: TxPlan) {
  return p.actions.map((a) => {
    switch (a.type) {
      case 'CreateAccount':
        return actions.createAccount()
      case 'Transfer':
        return actions.transfer(a.deposit)
      case 'DeployContract':
        return actions.deployContract(a.code)
      case 'FunctionCall':
        return actions.functionCall(a.method, a.args, a.gas, a.deposit)
    }
  })
}

export function buildTransaction(p: TxPlan, publicKey: string, nonce: bigint, blockHashBase58: string): Transaction {
  return createTransaction(p.signerId, PublicKey.fromString(publicKey), p.receiverId, nonce, toNearActions(p), base58.decode(blockHashBase58))
}

/** The NEAR tx hash = base58(sha256(borsh(tx))): what the key signs, and the id to track. */
export function transactionHash(tx: Transaction): string {
  return base58.encode(createHash('sha256').update(tx.encode()).digest())
}
