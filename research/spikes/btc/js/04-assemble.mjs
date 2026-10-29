// THROWAWAY spike 04: assemble MPC signatures into the PSBT, validate (strict low-S), finalize, extract,
// then try mempool.space testnet4 /txs/test (testmempoolaccept) and optionally POST /tx.
// Also demonstrates that a high-S variant passes bitcoinjs-lib's validator if you give it a loose verifier.
// Usage: node 04-assemble.mjs <unsigned.json> <sigs.json> [--broadcast]
import fs from 'node:fs'
import * as bitcoin from 'bitcoinjs-lib'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { NET, N, HALF_N, hex, unhex, mpcToRS, to64, normalizeLowS, verifyStrict, verifyLoose } from './lib.mjs'

const [uFile, sFile, flag] = process.argv.slice(2)
const MEMPOOL = process.env.MEMPOOL || 'https://mempool.space/testnet4/api'
const u = JSON.parse(fs.readFileSync(uFile, 'utf8'))
const s = JSON.parse(fs.readFileSync(sFile, 'utf8'))
const PUB = unhex(u.pubkey || '021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d')

// Collect one MPC response per input, in input order.
const responses = s.results.flatMap((r) => (r.hashes ? r.sigs : [r.result]))
if (responses.length !== u.inputs.length) throw new Error(`need ${u.inputs.length} sigs, got ${responses.length}`)

const report = { inputs: [] }
const sig64 = u.inputs.map((inp, i) => {
  const rs = mpcToRS(responses[i])
  const norm = normalizeLowS(rs)
  const sig = to64(norm.r, norm.s)
  const msg = unhex(inp.sighash)
  // recover the pubkey from (r, s, recid) as an independent check that recovery_id matches
  const recovered = new secp256k1.Signature(rs.r, rs.s).addRecoveryBit(rs.recid).recoverPublicKey(msg).toBytes(true)
  report.inputs.push({ index: i, r: rs.r.toString(16).padStart(64, '0'), s: rs.s.toString(16).padStart(64, '0'),
    recovery_id: rs.recid, lowS_from_mpc: rs.lowS, s_over_halfN: Number(rs.s * 10000n / HALF_N) / 10000, normalized: norm.flipped,
    verifyStrict: verifyStrict(PUB, msg, sig), recoveredPubMatches: hex(recovered) === hex(PUB) })
  return sig
})

const psbt = bitcoin.Psbt.fromBase64(u.psbtBase64, { network: NET })
for (let i = 0; i < psbt.inputCount; i++) psbt.signInput(i, { publicKey: PUB, sign: () => sig64[i] })
const strictValidator = (pubkey, msghash, signature) => verifyStrict(pubkey, msghash, signature)
report.validateAllStrict = psbt.validateSignaturesOfAllInputs(strictValidator)
psbt.finalizeAllInputs()
const tx = psbt.extractTransaction()
report.txid = tx.getId(); report.wtxid = tx.getHash(true).reverse ? hex(Uint8Array.from(tx.getHash(true)).reverse()) : undefined
report.vsize = tx.virtualSize(); report.weight = tx.weight()
const inSum = u.inputs.reduce((a, i) => a + BigInt(i.value), 0n), outSum = tx.outs.reduce((a, o) => a + o.value, 0n)
report.fee = (inSum - outSum).toString(); report.feeRate = Number(inSum - outSum) / tx.virtualSize()
report.derSigLens = tx.ins.map((i) => i.witness[0].length)
report.rawHex = tx.toHex()

// High-S demo: flip s for input 0 -> bitcoinjs accepts it with a loose verifier; strict verifier rejects.
const rs0 = mpcToRS(responses[0]); const highS = to64(rs0.r, N - rs0.s)
const psbtH = bitcoin.Psbt.fromBase64(u.psbtBase64, { network: NET })
for (let i = 0; i < psbtH.inputCount; i++) psbtH.signInput(i, { publicKey: PUB, sign: () => (i === 0 ? highS : sig64[i]) })
report.highS = { looseValidatorAccepts: psbtH.validateSignaturesOfInput(0, (p, m, sg) => verifyLoose(p, m, sg)),
  strictValidatorAccepts: psbtH.validateSignaturesOfInput(0, (p, m, sg) => verifyStrict(p, m, sg)) }
psbtH.finalizeAllInputs(); report.highS.rawHex = psbtH.extractTransaction().toHex()

async function post(path, body, json) {
  const r = await fetch(MEMPOOL + path, { method: 'POST', body: json ? JSON.stringify(body) : body,
    headers: json ? { 'content-type': 'application/json' } : undefined })
  return { status: r.status, body: (await r.text()).slice(0, 400) }
}
report.testmempoolaccept = await post('/txs/test', [report.rawHex], true)
report.testmempoolaccept_highS = await post('/txs/test', [report.highS.rawHex], true)
if (flag === '--broadcast') report.broadcast = await post('/tx', report.rawHex, false)
if (flag === '--broadcast-highS-first') {
  report.broadcast_highS = await post('/tx', report.highS.rawHex, false)
  report.broadcast = await post('/tx', report.rawHex, false)
}
const outFile = sFile.replace(/\.json$/, '.assembled.json')
fs.writeFileSync(outFile, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ ...report, rawHex: report.rawHex.slice(0, 64) + '…', highS: { ...report.highS, rawHex: '…' } }, null, 2))
