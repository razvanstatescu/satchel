// THROWAWAY SPIKE helper (chains agent). Calls v1.signer-prod.testnet `sign` directly from
// satchel-spk-chain-e9ea1a.testnet (predecessor = this account) and returns the MPC response.
// The key is read from the legacy keychain at runtime; never printed.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { Account } from '@near-js/accounts'
import { KeyPair, type KeyPairString } from '@near-js/crypto'
import { JsonRpcProvider } from '@near-js/providers'
import { KeyPairSigner } from '@near-js/signers'
import { actionCreators } from '@near-js/transactions'

export const ACCOUNT_ID = 'satchel-spk-chain-e9ea1a.testnet'
export const MPC = 'v1.signer-prod.testnet'
export const NEAR_RPC = process.env.NEAR_RPC ?? 'https://rpc.testnet.fastnear.com'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function loadAccount() {
  const j = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${ACCOUNT_ID}.json`, 'utf8'))
  const kp = KeyPair.fromString(j.private_key as KeyPairString)
  const provider = new JsonRpcProvider({ url: NEAR_RPC })
  return { account: new Account(ACCOUNT_ID, provider, new KeyPairSigner(kp)), provider }
}

export interface MpcSignResult {
  txHash: string
  response: any // raw JSON returned by the MPC (SignatureResponse)
  ms: { submitToIncluded: number; submitToFinal: number }
  gasBurntTotal: bigint
  tokensBurntTotal: bigint
  receipts: number
  outcome: any
}

/** request = {payload_v2: {Ecdsa|Eddsa: hex}, path, domain_id} */
export async function mpcSign(request: { payload_v2: Record<string, string>; path: string; domain_id: number }, gasTgas = 50): Promise<MpcSignResult> {
  const { account, provider } = loadAccount()
  const signed = await account.createSignedTransaction(MPC, [
    actionCreators.functionCall('sign', { request }, BigInt(gasTgas) * 10n ** 12n, 1n),
  ])
  const t0 = performance.now()
  // send and wait only until included; then poll tx status (yield/resume can take many blocks)
  const sent: any = await provider.sendTransactionUntil(signed, 'INCLUDED')
  const tIncl = performance.now() - t0
  const txHash: string = sent?.transaction?.hash ?? sent?.transaction_outcome?.id
  if (!txHash) throw new Error('no tx hash: ' + JSON.stringify(sent).slice(0, 500))
  let outcome: any
  for (let i = 0; i < 120; i++) {
    try {
      outcome = await provider.txStatusReceipts(txHash, ACCOUNT_ID, 'EXECUTED_OPTIMISTIC' as any)
      const st = outcome?.status
      if (st && (st.SuccessValue !== undefined || st.Failure)) break
    } catch (e: any) {
      // RPC wait_until timeout → keep polling
      if (!/TIMEOUT|timeout|UNKNOWN_TRANSACTION|Exceeded/i.test(String(e?.message ?? e))) throw e
    }
    await sleep(1000)
  }
  const tFinal = performance.now() - t0
  const st = outcome.status
  if (st.Failure) {
    const err: any = new Error('MPC sign failed: ' + JSON.stringify(st.Failure))
    err.txHash = txHash
    err.outcome = outcome
    throw err
  }
  const response = JSON.parse(Buffer.from(st.SuccessValue, 'base64').toString())
  let gas = BigInt(outcome.transaction_outcome.outcome.gas_burnt)
  let tok = BigInt(outcome.transaction_outcome.outcome.tokens_burnt)
  for (const r of outcome.receipts_outcome) {
    gas += BigInt(r.outcome.gas_burnt)
    tok += BigInt(r.outcome.tokens_burnt)
  }
  return {
    txHash, response, outcome,
    ms: { submitToIncluded: Math.round(tIncl), submitToFinal: Math.round(tFinal) },
    gasBurntTotal: gas, tokensBurntTotal: tok, receipts: outcome.receipts_outcome.length,
  }
}
