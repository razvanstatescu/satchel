// THROWAWAY spike 02: build a 2-input P2WPKH testnet4 tx over FABRICATED outpoints (unfunded address),
// compute per-input BIP143 sighashes three ways + via chainsig.js, prove sha256d(preimage) == sighash,
// parse the preimage. Writes out/unsigned-fake.json for spike 03 (real MPC signatures).
import fs from 'node:fs'
import * as bitcoin from 'bitcoinjs-lib'
import { chainAdapters, contracts } from 'chainsig.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { NET, hex, unhex, sha256d, bip143PreimageP2WPKH, parsePreimageP2WPKH, estimateVsizeP2WPKH, DUST_P2WPKH } from './lib.mjs'

const PUB = process.env.PUB || '021e857e1164787e91347a2f7e91b88b16d00a064963a50988798d7185e8bace2d' // satchel/1/btc
const pubkey = unhex(PUB)
const self = bitcoin.payments.p2wpkh({ pubkey, network: NET })
const RECIPIENT = 'tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q' // arbitrary tb1q (a faucet "return coins" address)
const FEE_RATE = 2 // sat/vB

// Fabricated UTXOs (txid = sha256 of a label) -> these do not exist on testnet4.
const NIN = Number(process.env.NIN || 2)
const utxos = Array.from({ length: NIN }, (_, i) => ({
  txid: hex(sha256(new TextEncoder().encode('satchel-fake-utxo-' + (i + 1)))), vout: i % 2, value: 30_000n - 5_000n * BigInt(i) }))
const SEND = 40_000n
const vsize = estimateVsizeP2WPKH(utxos.length, [22, 22])
const fee = BigInt(vsize * FEE_RATE)
const change = utxos.reduce((a, u) => a + u.value, 0n) - SEND - fee
if (change < DUST_P2WPKH) throw new Error('change would be dust; drop it into the fee instead')

const RBF = 0xfffffffd // BIP125 opt-in (Core 28+ also has full-RBF on by default)
const psbt = new bitcoin.Psbt({ network: NET })
psbt.setVersion(2)
psbt.setLocktime(0)
for (const u of utxos) {
  psbt.addInput({ hash: u.txid, index: u.vout, sequence: RBF, witnessUtxo: { script: self.output, value: u.value } })
}
psbt.addOutput({ address: RECIPIENT, value: SEND })
psbt.addOutput({ address: self.address, value: change }) // change back to the same Satchel address

// (a) capture hashes the way chainsig.js does: a fake Signer whose sign() records the hash
const captured = []
const psbtCopy = psbt.clone()
for (let i = 0; i < psbtCopy.inputCount; i++) {
  psbtCopy.signInput(i, { publicKey: pubkey, sign: (h) => { captured[i] = hex(h); return new Uint8Array(64).fill(1) } })
}
// (b) direct hashForWitnessV0 on the unsigned tx; (c) sha256d(manual BIP143 preimage)
const unsignedTx = bitcoin.Transaction.fromBuffer(psbt.data.globalMap.unsignedTx.toBuffer())
const scriptCode = bitcoin.payments.p2pkh({ hash: self.hash }).output // 76a914{pkh}88ac
const inputs = utxos.map((u, i) => {
  const direct = hex(unsignedTx.hashForWitnessV0(i, scriptCode, u.value, bitcoin.Transaction.SIGHASH_ALL))
  const preimage = bip143PreimageP2WPKH(unsignedTx, i, self.hash, u.value)
  const viaPreimage = hex(sha256d(preimage))
  return { index: i, outpoint: `${u.txid}:${u.vout}`, value: u.value.toString(), sighash: direct,
    capturedEqualsDirect: captured[i] === direct, preimageEqualsDirect: viaPreimage === direct,
    preimageHex: hex(preimage), parsed: parsePreimageP2WPKH(preimage) }
})

// chainsig.js 1.1.16 (its own bitcoinjs-lib 6: numbers + Buffers) over the same explicit inputs/outputs
const btc = new chainAdapters.btc.Bitcoin({ network: 'testnet',
  contract: new contracts.ChainSignatureContract({ networkId: 'testnet' }),
  btcRpcAdapter: new chainAdapters.btc.BTCRpcAdapters.Mempool('https://mempool.space/testnet4/api') })
const { hashesToSign, transaction } = await btc.prepareTransactionForSigning({
  publicKey: PUB,
  inputs: utxos.map((u) => ({ txid: u.txid, vout: u.vout, value: Number(u.value), scriptPubKey: Buffer.from(self.output) })),
  outputs: [{ address: RECIPIENT, value: Number(SEND) }, { address: self.address, value: Number(change) }],
})
const chainsigHashes = hashesToSign.map((h) => hex(Uint8Array.from(h)))
const csTx = transaction.psbt.txInputs.map((i) => i.sequence)

const result = {
  pubkey: PUB, address: self.address, vsizeEstimate: vsize, feeRate: FEE_RATE, fee: fee.toString(), change: change.toString(),
  unsignedTxid: unsignedTx.getId(), inputs,
  chainsig: { hashes: chainsigHashes, sequences: csTx,
    note: 'chainsig.js builds inputs with default sequence 0xffffffff (no BIP125 signal), so its hashes differ from our RBF tx' },
  psbtBase64: psbt.toBase64(),
}
// Same tx but with sequence 0xffffffff to show chainsig.js hashes are byte-identical to bitcoinjs v7 for the same tx
const p2 = new bitcoin.Psbt({ network: NET })
for (const u of utxos) p2.addInput({ hash: u.txid, index: u.vout, witnessUtxo: { script: self.output, value: u.value } })
p2.addOutput({ address: RECIPIENT, value: SEND }); p2.addOutput({ address: self.address, value: change })
const h2 = []
for (let i = 0; i < NIN; i++) p2.clone().signInput(i, { publicKey: pubkey, sign: (h) => { h2[i] = hex(h); return new Uint8Array(64).fill(1) } })
result.chainsig.equalsBitcoinjs7_whenSameSequenceAndVersion = JSON.stringify(h2) === JSON.stringify(chainsigHashes)

fs.mkdirSync('out', { recursive: true })
fs.writeFileSync(process.env.OUT || 'out/unsigned-fake.json', JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
console.log(JSON.stringify(result, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
