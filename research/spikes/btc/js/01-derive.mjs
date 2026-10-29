// THROWAWAY spike 01: derive the P2WPKH testnet address for (predecessor, path) three ways and compare.
//   A) live `derived_public_key` view on v1.signer-prod.testnet (domain 0) -> compress -> bitcoinjs-lib v7 p2wpkh
//   B) chainsig.js 1.1.16 Bitcoin adapter deriveAddressAndPublicKey (uses its own bitcoinjs-lib 6 + local root-key derivation)
//   C) chainsig.js contract.getDerivedPublicKey (local fast path) vs A's uncompressed key
// Usage: node 01-derive.mjs [predecessor] [path]
import * as bitcoin from 'bitcoinjs-lib'
import { chainAdapters, contracts } from 'chainsig.js'
import bs58 from 'bs58'

const RPC = 'https://rpc.testnet.fastnear.com'
const MPC = 'v1.signer-prod.testnet'
const predecessor = process.argv[2] || 'satchel-spk-btc-e9ea1a.testnet'
const path = process.argv[3] || 'satchel/1/btc'

async function view(method, args) {
  const r = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'query',
      params: { request_type: 'call_function', finality: 'final', account_id: MPC, method_name: method,
        args_base64: Buffer.from(JSON.stringify(args)).toString('base64') },
    }),
  })
  const j = await r.json()
  if (j.error || j.result?.error) throw new Error(JSON.stringify(j.error || j.result.error))
  return JSON.parse(Buffer.from(j.result.result).toString())
}

// "secp256k1:<base58 of 64-byte x||y>" -> "04" + hex
function najToUncompressedHex(naj) {
  const [curve, b58] = naj.split(':')
  if (curve !== 'secp256k1') throw new Error('not secp256k1: ' + naj)
  const raw = bs58.decode(b58)
  if (raw.length !== 64) throw new Error('expected 64 bytes, got ' + raw.length)
  return '04' + Buffer.from(raw).toString('hex')
}
function compress(uncompressedHex) {
  const x = uncompressedHex.slice(2, 66)
  const y = uncompressedHex.slice(66)
  return (BigInt('0x' + y) % 2n === 0n ? '02' : '03') + x
}

const t0 = Date.now()
const rootNaj = await view('public_key', { domain_id: 0 })
const derivedNaj = await view('derived_public_key', { path, predecessor, domain_id: 0 })
const tView = Date.now() - t0
const uncompressedA = najToUncompressedHex(derivedNaj)
const compressedA = compress(uncompressedA)
const addrA = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(compressedA, 'hex'), network: bitcoin.networks.testnet }).address

// B) chainsig.js adapter (network 'testnet' is the only non-mainnet option; testnet4 uses the same tb1 HRP)
const contract = new contracts.ChainSignatureContract({ networkId: 'testnet', contractId: MPC, fallbackRpcUrls: [RPC] })
const btc = new chainAdapters.btc.Bitcoin({
  network: 'testnet',
  contract,
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api'),
})
const t1 = Date.now()
const { address: addrB, publicKey: compressedB } = await btc.deriveAddressAndPublicKey(predecessor, path)
const tB = Date.now() - t1
const uncompressedC = await contract.getDerivedPublicKey({ path, predecessor })

const out = {
  predecessor, path,
  root_public_key_live: rootNaj,
  derived_public_key_live: derivedNaj,
  A_view_bitcoinjs7: { compressed: compressedA, address: addrA, ms: tView },
  B_chainsig_adapter: { compressed: compressedB, address: addrB, ms: tB },
  C_chainsig_local_uncompressed_matches_view: uncompressedC === uncompressedA,
  MATCH: addrA === addrB && compressedA === compressedB && uncompressedC === uncompressedA,
}
console.log(JSON.stringify(out, null, 2))
