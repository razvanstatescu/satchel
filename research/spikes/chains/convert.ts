// THROWAWAY SPIKE (chains agent). Question: exact conversion from a NEAR FinalExecutionOutcome whose
// SuccessValue is the MPC SignatureResponse (as Satchel's on_signed would return it) into per-chain sigs.
// Uses REAL outcomes: EVM MPC tx Dcc3gk... (secp256k1) and a fresh Ed25519 sign over a known message.
// Run: npx tsx convert.ts
import { readFileSync } from 'node:fs'
import { recoverAddress, type Hex } from 'viem'
import * as bitcoin from 'bitcoinjs-lib'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import bs58 from 'bs58'
import { utils as csUtils } from 'chainsig.js'
import { ACCOUNT_ID, NEAR_RPC, mpcSign } from './near.ts'

// ---------- the helpers an implementer would copy (conceptually) ----------
type MpcSecp256k1 = { scheme?: 'Secp256k1'; big_r: { affine_point: string }; s: { scalar: string }; recovery_id: number }
type MpcEd25519 = { scheme: 'Ed25519'; signature: number[] }
type MpcResponse = MpcSecp256k1 | MpcEd25519

/** status.SuccessValue (base64 JSON) of the final outcome; null if the contract returned Option::None. */
function lastResult(outcome: any): MpcResponse | null {
  const st = outcome?.status
  if (!st || st.Failure) throw new Error('tx failed: ' + JSON.stringify(st?.Failure))
  if (typeof st.SuccessValue !== 'string' || st.SuccessValue === '') return null
  return JSON.parse(Buffer.from(st.SuccessValue, 'base64').toString('utf8'))
}
function asSecp(m: MpcResponse): MpcSecp256k1 {
  if (!('big_r' in m)) throw new Error('expected Secp256k1 response')
  if (m.recovery_id !== 0 && m.recovery_id !== 1) throw new Error('recovery_id ' + m.recovery_id)
  if (m.big_r.affine_point.length !== 66 || m.s.scalar.length !== 64) throw new Error('bad lengths')
  return m
}
/** EVM (viem): r = x(R) = big_r without its 02/03 prefix; yParity = recovery_id (NOT the prefix). */
export const toViemSignature = (m: MpcResponse) => {
  const x = asSecp(m)
  return { r: `0x${x.big_r.affine_point.slice(2)}` as Hex, s: `0x${x.s.scalar}` as Hex, yParity: x.recovery_id as 0 | 1 }
}
/** Bitcoin: 64-byte compact r||s for a bitcoinjs-lib Signer.sign(); bitcoinjs DER-encodes + appends sighash. */
export const toBitcoinCompact64 = (m: MpcResponse) => {
  const x = asSecp(m)
  return Buffer.from(x.big_r.affine_point.slice(2) + x.s.scalar, 'hex')
}
/** Solana: the 64 signature bytes. */
export const toSolanaSignature = (m: MpcResponse) => {
  if (!('signature' in m) || m.signature.length !== 64) throw new Error('expected Ed25519 response')
  return Uint8Array.from(m.signature)
}

async function txOutcome(hash: string) {
  const r = await fetch(NEAR_RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tx', params: { tx_hash: hash, sender_account_id: ACCOUNT_ID, wait_until: 'FINAL' } }) })
  return (await r.json()).result
}

async function main() {
  // --- secp256k1 from a real outcome
  const evmLines = readFileSync('out_evm_sign_1.txt', 'utf8').split('\n').filter((l) => l.startsWith('{'))
  const prepared = JSON.parse(evmLines.find((l) => l.includes('"step":"prepared"'))!)
  const mpcLine = JSON.parse(evmLines.find((l) => l.includes('"step":"mpc"'))!)
  const outcome = await txOutcome(mpcLine.txHash)
  const resp = lastResult(outcome)!
  const vsig = toViemSignature(resp)
  const recovered = await recoverAddress({ hash: prepared.hashToSign, signature: vsig })
  const chainsigRsv = csUtils.cryptography.toRSV(resp as any)
  // Bitcoin: compact sig verifies against the compressed derived key (low-S, as BIP-146 policy requires)
  const compact = toBitcoinCompact64(resp)
  const sigOk = secp256k1.verify(compact, Buffer.from(prepared.hashToSign.slice(2), 'hex'), secp256k1.Point.fromHex('04' + Buffer.from(bs58.decode('5soGQPEvS26xNcidU2MbDcJDzzKKZgzgjM3omedem9BPbfg9NPS7a5fKJgFGcE91cH1v8iAJfdZkaKwwRcircAgF')).toString('hex')).toBytes(true), { prehash: false, lowS: true })
  const der = bitcoin.script.signature.encode(compact, bitcoin.Transaction.SIGHASH_ALL)
  console.log(JSON.stringify({ secp: { nearTx: mpcLine.txHash, successValueJson: resp, viemSig: vsig, recovered, chainsigRsv, btcCompactHex: compact.toString('hex'), btcCompactVerifiesLowS: sigOk, btcDerPlusSighashHex: der.toString('hex') } }))

  // --- ed25519: fresh sign over a fixed message, then convert from the *outcome* fetched by hash
  const msg = Buffer.from('010001034ff32bf6a19245fa7842d0146aedfe5bsatchel-convert-test', 'utf8')
  const r = await mpcSign({ payload_v2: { Eddsa: msg.toString('hex') }, path: 'satchel/1/sol', domain_id: 1 }, 50)
  const edOutcome = await txOutcome(r.txHash)
  const edResp = lastResult(edOutcome)!
  const sig = toSolanaSignature(edResp)
  const ok = ed25519.verify(sig, msg, bs58.decode('6P6GgkFNQKcvCtsMncRF1VtFA6Q79LkcFyvaQz5NXPiA'))
  console.log(JSON.stringify({ ed25519: { nearTx: r.txHash, ms: r.ms, scheme: (edResp as any).scheme, sigBase58: bs58.encode(sig), verifies: ok } }))
}
main().catch((e) => { console.error('FATAL', e?.message ?? e); process.exit(1) })
