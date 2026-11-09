import { describe, expect, it } from 'vitest'
import { base58 } from '@scure/base'
import { fastnearActionKind, proof1, proof2, proof3, proof4, proof6 } from '../deploy/verify-birth'

const H = '97aecbe063628d270ca5578226f0c8f929dbc24fe053b9089254fd34ec3b5683'
const TX = '2AMrb8J8NpLvXGAUWXC1qNMjvAx48Qwe41mbDJkKGtQR'
const INIT = { mpc: 'v1.signer-prod.testnet', usdc: '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af', base_uri: 'https://usesatchel.xyz/api/card/' }
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64')
const fc = (method_name: string, args: unknown) => ({ FunctionCall: { method_name, args: b64(args), gas: 20e12, deposit: '0' } })
const ok = { SuccessValue: '' }

/** The shape FastNEAR /v0/transactions returned for the keyless spike birth (2026-10-21), with Satchel's arguments. */
function birthTx(over: { actions?: unknown[]; receipts?: unknown[]; signer?: string } = {}) {
  return {
    transactions: [
      {
        transaction: {
          hash: TX,
          signer_id: over.signer ?? 'satchelhq.testnet',
          receiver_id: 'rc.satchelhq.testnet',
          actions: over.actions ?? [
            'CreateAccount',
            { Transfer: { deposit: '10000000000000000000000000' } },
            { DeployContract: { code: Buffer.from(H, 'hex').toString('base64') } },
            fc('new', INIT),
            ...Array.from({ length: 7 }, () => fc('nft_mint', { receiver_id: 'alice.satchelhq.testnet' })),
          ],
        },
        execution_outcome: { block_height: 274111787, outcome: { status: { SuccessReceiptId: 'x' } } },
        receipts: over.receipts ?? Array.from({ length: 16 }, () => ({ execution_outcome: { outcome: { status: ok } } })),
      },
    ],
  }
}
const o = { txHash: TX, parent: 'satchelhq.testnet', child: 'rc.satchelhq.testnet', sha256: H, initArgs: INIT, mintTo: 'alice.satchelhq.testnet', mints: 7 }

describe('verify-birth proofs (keyless-birth.md §3)', () => {
  it('reads FastNEAR action kinds in both encodings', () => {
    expect(fastnearActionKind('CreateAccount')).toBe('CreateAccount')
    expect(fastnearActionKind({ Transfer: { deposit: '1' } })).toBe('Transfer')
    expect(fastnearActionKind(null)).toBe('?')
  })
  it('proof 1 passes the exact birth batch and returns its block', () => {
    const r = proof1(birthTx(), o)
    expect(r.checks.filter((c) => !c.pass)).toEqual([])
    expect(r.height).toBe(274111787)
  })
  it('proof 1 fails an AddKey, wrong code, wrong init args, wrong mints, a failed receipt, another signer', () => {
    const base = birthTx().transactions[0]!.transaction.actions
    const fails = (x: ReturnType<typeof birthTx>) => proof1(x, o).checks.filter((c) => !c.pass).map((c) => c.what)
    expect(fails(birthTx({ actions: [...base, { AddKey: {} }] })).join()).toMatch(/actions .*AddKey.*no AddKey/s)
    expect(fails(birthTx({ actions: [base[0], base[1], { DeployContract: { code: Buffer.alloc(32).toString('base64') } }, ...base.slice(3)] }))).toEqual([expect.stringMatching(/code sha256 0{64} = H/)])
    expect(fails(birthTx({ actions: [...base.slice(0, 3), fc('new', { ...INIT, base_uri: 'https://x.y/api/card/' }), ...base.slice(4)] }))).toEqual([expect.stringMatching(/proof 1: new/)])
    expect(fails(birthTx({ actions: [...base.slice(0, 4), fc('nft_mint', { receiver_id: 'bob.satchelhq.testnet' }), ...base.slice(5)] }))).toEqual([expect.stringMatching(/nft_mint to alice/)])
    expect(fails(birthTx({ receipts: [{ execution_outcome: { outcome: { status: { Failure: {} } } } }] }))).toEqual([expect.stringMatching(/1 failed receipt/)])
    expect(fails(birthTx({ signer: 'carol.satchelhq.testnet' }))).toEqual([expect.stringMatching(/is carol/)])
    expect(proof1({ transactions: [] }, o).checks[0]!.pass).toBe(false)
    expect(proof1(null, o).height).toBeNull()
  })
  it('proof 2: code = H and no access keys', () => {
    const code_hash = base58.encode(Buffer.from(H, 'hex'))
    expect(proof2({ code_hash }, 0, H).every((c) => c.pass)).toBe(true)
    expect(proof2({ code_hash }, 1, H).map((c) => c.pass)).toEqual([true, false])
    expect(proof2({ code_hash: base58.encode(new Uint8Array(32)) }, 0, H).map((c) => c.pass)).toEqual([false, true])
    expect(proof2(null, null, H)[0]!.pass).toBe(false)
  })
  it('proof 3: the contract never signed anything', () => {
    expect(proof3({ account_txs: [], txs_count: 0 }).pass).toBe(true)
    expect(proof3({ account_txs: [{}], txs_count: 1 }).pass).toBe(false)
    expect(proof3(null).pass).toBe(false)
  })
  it('proof 4: the oldest tx is the birth tx; block A comes from it', () => {
    const resp = { account_txs: [{ transaction_hash: TX, tx_block_height: 274111787 }], txs_count: 1 }
    expect(proof4(resp, TX)).toEqual({ check: { pass: true, what: expect.stringContaining('block A = 274111787') }, blockA: 274111787 })
    expect(proof4({ account_txs: [{ transaction_hash: 'other', tx_block_height: 1 }] }, TX)).toMatchObject({ check: { pass: false }, blockA: null })
    expect(proof4({ account_txs: [] }, TX).check.pass).toBe(false)
  })
  it('proof 6: first records after A; no record yet is INFO; unknown A fails', () => {
    const r = proof6(new Map([['1', 500], ['2', null], ['3', 100]]), 274)
    expect(r.map((c) => c.pass)).toEqual([true, null, false])
    expect(proof6(new Map([['1', 274]]), 274)[0]!.pass).toBe(false)
    expect(proof6(new Map(), null)[0]!.pass).toBe(false)
  })
})
