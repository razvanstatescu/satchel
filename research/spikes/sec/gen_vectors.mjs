// THROWAWAY: emit cross-language test vectors (hex) from viem / bitcoinjs / web3.js so the Rust
// parser spike can be checked against the JS reference implementations.
import { serializeTransaction, keccak256, parseEther, parseGwei, encodeFunctionData, concat, toRlp, hexToBytes } from 'viem'
import * as bitcoin from 'bitcoinjs-lib'
import * as ecc from 'tiny-secp256k1'
import { ECPairFactory } from 'ecpair'
import { Keypair, SystemProgram, Transaction, TransactionMessage, ComputeBudgetProgram, AddressLookupTableAccount } from '@solana/web3.js'
import bs58 from 'bs58'
import { sha256 } from '@noble/hashes/sha2.js'
import { writeFileSync, mkdirSync } from 'node:fs'

const hex = (u8) => Buffer.from(u8).toString('hex')
const v = []
const add = (name, kind, bytesHex, expect) => v.push({ name, kind, hex: bytesHex.replace(/^0x/, ''), expect })

// ---- EVM ----
const tx = { type: 'eip1559', chainId: 11155111, nonce: 7, maxPriorityFeePerGas: parseGwei('1.5'), maxFeePerGas: parseGwei('30'), gas: 21000n, to: '0x000000000000000000000000000000000000dEaD', value: parseEther('0.0123'), data: '0x', accessList: [] }
const u = serializeTransaction(tx)
add('evm_eth_transfer', 'evm', u, { ok: true, hash: keccak256(u).slice(2), chain_id: 11155111, nonce: 7, value: tx.value.toString(), to: '000000000000000000000000000000000000dead' })
const big = serializeTransaction({ ...tx, nonce: 300, value: 2n ** 80n, gas: 70000n, maxFeePerGas: 10n ** 12n })
add('evm_eth_transfer_bigger_ints', 'evm', big, { ok: true, hash: keccak256(big).slice(2), chain_id: 11155111, nonce: 300, value: (2n ** 80n).toString(), to: '000000000000000000000000000000000000dead' })
add('evm_legacy', 'evm', serializeTransaction({ type: 'legacy', chainId: 11155111, nonce: 7, gasPrice: 1n, gas: 21000n, to: tx.to, value: 1n }), { ok: false })
add('evm_type4', 'evm', serializeTransaction({ type: 'eip7702', chainId: 11155111, nonce: 7, maxPriorityFeePerGas: 1n, maxFeePerGas: 2n, gas: 100000n, to: tx.to, value: 0n, data: '0x', accessList: [], authorizationList: [{ chainId: 0, address: '0x1111111111111111111111111111111111111111', nonce: 8, r: '0x' + '11'.repeat(32), s: '0x' + '22'.repeat(32), yParity: 0 }] }), { ok: false })
add('evm_auth_magic', 'evm', concat(['0x05', toRlp(['0x', '0x1111111111111111111111111111111111111111', '0x08'])]), { ok: false })
add('evm_eip712', 'evm', '0x1901' + '00'.repeat(64), { ok: false })
add('evm_trailing', 'evm', u + '00', { ok: false })
add('evm_mainnet', 'evm', serializeTransaction({ ...tx, chainId: 1 }), { ok: false })
const approve = encodeFunctionData({ abi: [{ type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] }], functionName: 'approve', args: ['0x000000000000000000000000000000000000bEEF', 2n ** 256n - 1n] })
add('evm_calldata', 'evm', serializeTransaction({ ...tx, value: 0n, data: approve }), { ok: false })
add('evm_noncanon', 'evm', concat(['0x02', toRlp(['0xaa36a7', '0x0007', '0x59682f00', '0x06fc23ac00', '0x5208', tx.to, '0x2bb2c8eabcc000', '0x', []])]), { ok: false })

// ---- BTC (BIP143 P2WPKH preimages built by hand, hashes cross-checked with bitcoinjs) ----
bitcoin.initEccLib(ecc)
const ECPair = ECPairFactory(ecc)
const key = ECPair.fromPrivateKey(Uint8Array.from(Buffer.from('1f'.repeat(32), 'hex')))
const pay = bitcoin.payments.p2wpkh({ pubkey: key.publicKey, network: bitcoin.networks.testnet })
const btx = new bitcoin.Transaction(); btx.version = 2
btx.addInput(Uint8Array.from(Buffer.from('aa'.repeat(31) + '01', 'hex').reverse()), 0, 0xfffffffd)
btx.addOutput(pay.output, 1000n)
const sc = bitcoin.payments.p2pkh({ hash: pay.hash }).output
const sha256d = (b) => sha256(sha256(b))
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
const u64 = (n) => { const b = Buffer.alloc(8); b.writeBigUInt64LE(n); return b }
const mk = (ht) => {
  const prevouts = Buffer.concat([Buffer.from(btx.ins[0].hash), u32(0)])
  const hp = ht & 0x80 ? Buffer.alloc(32) : Buffer.from(sha256d(prevouts))
  const hs = (ht & 0x80) || (ht & 0x1f) !== 1 ? Buffer.alloc(32) : Buffer.from(sha256d(u32(0xfffffffd)))
  const ho = (ht & 0x1f) === 2 ? Buffer.alloc(32) : Buffer.from(sha256d(Buffer.concat([u64(1000n), Buffer.from([pay.output.length]), Buffer.from(pay.output)])))
  return Buffer.concat([u32(2), hp, hs, Buffer.from(btx.ins[0].hash), u32(0), Buffer.from([0x19]), Buffer.from(sc), u64(150000n), u32(0xfffffffd), ho, u32(0), u32(ht)])
}
const pre = mk(1)
if (hex(sha256d(pre)) !== hex(btx.hashForWitnessV0(0, sc, 150000n, 1))) throw new Error('btc vector mismatch')
add('btc_p2wpkh_all', 'btc', hex(pre), { ok: true, hash: hex(sha256d(pre)), txid: 'aa'.repeat(31) + '01', vout: 0, amount: '150000', pkh: hex(pay.hash) })
add('btc_none', 'btc', hex(mk(2)), { ok: false })
add('btc_acp', 'btc', hex(mk(0x81)), { ok: false })
add('btc_short', 'btc', hex(pre.subarray(0, 181)), { ok: false })

// ---- Solana ----
const seed = (b) => Keypair.fromSeed(Uint8Array.from(Array(32).fill(b)))
const sat = seed(1), bob = seed(2)
const bh = bs58.encode(Uint8Array.from(Array(32).fill(9)))
const st = new Transaction({ feePayer: sat.publicKey, recentBlockhash: bh }).add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }), SystemProgram.transfer({ fromPubkey: sat.publicKey, toPubkey: bob.publicKey, lamports: 1234567 }))
add('sol_legacy_transfer', 'sol', hex(st.serializeMessage()), { ok: true, blockhash_hex: hex(bs58.decode(bh)), lamports: '1234567', to_hex: hex(bob.publicKey.toBytes()) })
const v0 = new TransactionMessage({ payerKey: sat.publicKey, recentBlockhash: bh, instructions: [SystemProgram.transfer({ fromPubkey: sat.publicKey, toPubkey: bob.publicKey, lamports: 42 })] }).compileToV0Message()
add('sol_v0_transfer', 'sol', hex(v0.serialize()), { ok: true, blockhash_hex: hex(bs58.decode(bh)), lamports: '42', to_hex: hex(bob.publicKey.toBytes()) })
const ntx = new Transaction({ feePayer: sat.publicKey, nonceInfo: { nonce: bh, nonceInstruction: SystemProgram.nonceAdvance({ noncePubkey: seed(4).publicKey, authorizedPubkey: sat.publicKey }) } }).add(SystemProgram.transfer({ fromPubkey: sat.publicKey, toPubkey: bob.publicKey, lamports: 5 }))
add('sol_durable_nonce', 'sol', hex(ntx.serializeMessage()), { ok: false })
const alt = new AddressLookupTableAccount({ key: seed(5).publicKey, state: { deactivationSlot: 2n ** 64n - 1n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, authority: undefined, addresses: [bob.publicKey] } })
add('sol_v0_alt', 'sol', hex(new TransactionMessage({ payerKey: sat.publicKey, recentBlockhash: bh, instructions: [SystemProgram.transfer({ fromPubkey: sat.publicKey, toPubkey: bob.publicKey, lamports: 42 })] }).compileToV0Message([alt]).serialize()), { ok: false })
add('sol_assign', 'sol', hex(new Transaction({ feePayer: sat.publicKey, recentBlockhash: bh }).add(SystemProgram.assign({ accountPubkey: sat.publicKey, programId: seed(8).publicKey })).serializeMessage()), { ok: false })

// emit Rust
const esc = (s) => JSON.stringify(s)
let rs = '// GENERATED by gen_vectors.mjs (throwaway)\npub struct V { pub name: &\'static str, pub kind: &\'static str, pub hex: &\'static str, pub ok: bool, pub hash: &\'static str, pub a: &\'static str, pub b: &\'static str, pub c: &\'static str }\npub const VECTORS: &[V] = &[\n'
for (const x of v) {
  const e = x.expect
  const a = x.kind === 'evm' ? String(e.chain_id ?? '') : x.kind === 'btc' ? (e.txid ?? '') : (e.blockhash_hex ?? '')
  const b = x.kind === 'evm' ? String(e.nonce ?? '') : x.kind === 'btc' ? String(e.vout ?? '') : (e.lamports ?? '')
  const c = x.kind === 'evm' ? (e.value ?? '') + '|' + (e.to ?? '') : x.kind === 'btc' ? (e.amount ?? '') : (e.to_hex ?? '')
  rs += `  V { name: ${esc(x.name)}, kind: ${esc(x.kind)}, hex: ${esc(x.hex)}, ok: ${e.ok}, hash: ${esc(e.hash ?? '')}, a: ${esc(a)}, b: ${esc(b)}, c: ${esc(c)} },\n`
}
rs += '];\n'
mkdirSync('rust-parsers/src', { recursive: true })
writeFileSync('rust-parsers/src/vectors.rs', rs)
writeFileSync('vectors.json', JSON.stringify(v, null, 1))
console.log(`wrote ${v.length} vectors`)
