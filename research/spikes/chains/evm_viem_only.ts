// THROWAWAY SPIKE (chains agent). Question: can the EVM flow be done with viem alone (no chainsig.js)
// and produce byte-identical results? Reuses the REAL MPC response captured in out_evm_sign_1.txt.
// Run: npx tsx evm_viem_only.ts
import { readFileSync } from 'node:fs'
import { keccak256, serializeTransaction, recoverTransactionAddress, type Hex, type TransactionSerializableEIP1559 } from 'viem'

type MpcSecp = { scheme: 'Secp256k1'; big_r: { affine_point: string }; s: { scalar: string }; recovery_id: number }

/** MPC Secp256k1 response -> viem signature. yParity MUST come from recovery_id (not big_r's 02/03 prefix). */
export function mpcToViemSig(m: MpcSecp): { r: Hex; s: Hex; yParity: 0 | 1 } {
  if (m.scheme !== 'Secp256k1') throw new Error('not secp256k1')
  if (m.recovery_id !== 0 && m.recovery_id !== 1) throw new Error('unexpected recovery_id ' + m.recovery_id)
  return { r: `0x${m.big_r.affine_point.slice(2)}`, s: `0x${m.s.scalar}`, yParity: m.recovery_id }
}

const lines = readFileSync('out_evm_sign_1.txt', 'utf8').split('\n').filter((l) => l.startsWith('{'))
const prepared = JSON.parse(lines.find((l) => l.includes('"step":"prepared"'))!)
const mpc = JSON.parse(lines.find((l) => l.includes('"step":"mpc"'))!)
const finalized = JSON.parse(lines.find((l) => l.includes('"step":"finalized"'))!)
const t = prepared.transaction

const unsigned: TransactionSerializableEIP1559 = {
  type: 'eip1559', chainId: 11155111, nonce: t.nonce, to: t.to, value: BigInt(t.value), gas: BigInt(t.gas),
  maxFeePerGas: BigInt(t.maxFeePerGas), maxPriorityFeePerGas: BigInt(t.maxPriorityFeePerGas),
}
const hash = keccak256(serializeTransaction(unsigned)) // the 32-byte payload for payload_v2.Ecdsa (hex without 0x)
const signed = serializeTransaction(unsigned, mpcToViemSig(mpc.response))
const recovered = await recoverTransactionAddress({ serializedTransaction: signed as any })
console.log(JSON.stringify({
  hashMatchesChainsig: hash === prepared.hashToSign,
  signedMatchesChainsigBytes: signed === finalized.signedTx,
  recovered, expected: finalized.derived, ok: recovered === finalized.derived,
  feeMaxWei: (unsigned.gas! * unsigned.maxFeePerGas!).toString(),
}))
