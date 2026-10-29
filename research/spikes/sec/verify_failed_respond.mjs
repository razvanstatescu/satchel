// THROWAWAY: is the signature inside a *failed* MPC `respond` tx a valid signature? (offline math on public data)
import { secp256k1 } from '@noble/curves/secp256k1.js'
import bs58 from 'bs58'
import { readFileSync } from 'node:fs'
const t = JSON.parse(readFileSync('out_failed_respond_nearblocks.json')).txns[0]
const args = JSON.parse(t.actions[0].args)
const rootB58 = '4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3' // testnet domain 0 (from MPC state)
const root = secp256k1.Point.fromHex('04' + Buffer.from(bs58.decode(rootB58)).toString('hex'))
const tweak = BigInt('0x' + Buffer.from(args.request.tweak).toString('hex'))
const derived = root.add(secp256k1.Point.BASE.multiply(tweak)) // derived = root + tweak·G (MPC derive_key_secp256k1)
const msg = Buffer.from(args.request.payload.Ecdsa, 'hex')
const r = secp256k1.Point.fromHex(args.response.big_r.affine_point).x
const s = BigInt('0x' + args.response.s.scalar)
const sig = new secp256k1.Signature(r, s)
const ok = secp256k1.verify(sig.toBytes('compact'), msg, derived.toBytes(true), { prehash: false })
console.log({ tx: t.transaction_hash, txStatus: t.outcomes, signer: t.signer_account_id, payload: args.request.payload.Ecdsa, signatureValidForDerivedKey: ok })
