// THROWAWAY: can a buyer's browser get a token's derived keys straight from the MPC contract (view call),
// independent of client-side derivation code? Read-only.
import { keccak256, getAddress } from 'viem'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import bs58 from 'bs58'
const RPC = 'https://rpc.testnet.fastnear.com'
const view = async (account_id, method_name, args) => {
  const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'query', params: { request_type: 'call_function', finality: 'final', account_id, method_name, args_base64: Buffer.from(JSON.stringify(args)).toString('base64') } }) })
  const j = await r.json(); if (j.error || j.result?.error) throw new Error(JSON.stringify(j.error ?? j.result.error)); return JSON.parse(Buffer.from(j.result.result).toString())
}
const predecessor = 'satchel.example.testnet' // hypothetical contract account; derivation works for any account id
for (const [path, domain_id] of [['satchel/1/evm', 0], ['satchel/1/btc', 0], ['satchel/1/sol', 1]]) {
  const pk = await view('v1.signer-prod.testnet', 'derived_public_key', { path, predecessor, domain_id })
  let extra = ''
  if (pk.startsWith('secp256k1:')) {
    const raw = bs58.decode(pk.slice(10)) // 64-byte uncompressed (x||y) without 0x04
    const addr = getAddress('0x' + keccak256(raw).slice(-40))
    const compressed = secp256k1.Point.fromHex('04' + Buffer.from(raw).toString('hex')).toBytes(true)
    extra = `evmAddress=${addr} compressed=${Buffer.from(compressed).toString('hex')}`
  } else extra = `solAddress=${pk.slice(8)}`
  console.log(path, 'domain', domain_id, '->', pk.slice(0, 24) + '…', extra)
}
// same path, different predecessor => different key (control comes from the predecessor)
const a = await view('v1.signer-prod.testnet', 'derived_public_key', { path: 'satchel/1/evm', predecessor: 'satchel.example.testnet', domain_id: 0 })
const b = await view('v1.signer-prod.testnet', 'derived_public_key', { path: 'satchel/1/evm', predecessor: 'satchel-v2.example.testnet', domain_id: 0 })
console.log('different predecessor => different key:', a !== b)
