// THROWAWAY SPIKE (sec, Phase 0). Question: can a contract that receives the *preimage*
// (unsigned EIP-1559 serialization) instead of a 32-byte hash (1) compute exactly the hash
// that must be signed, (2) parse chainId/nonce/to/value/data back out, and (3) refuse every
// non-transaction payload (EIP-191, EIP-712/permit, EIP-7702 auth, legacy, type-1/4 txs)?
// The strict RLP decoder below mirrors what an on-chain Rust parser would do.
import {
  serializeTransaction, parseTransaction, keccak256, recoverAddress, hashMessage, hashTypedData,
  recoverTransactionAddress, toRlp, hexToBytes, bytesToHex, parseEther, parseGwei, encodeFunctionData,
  concat, numberToHex,
} from 'viem'
import { privateKeyToAccount, sign } from 'viem/accounts'
import { hashAuthorization } from 'viem/utils'
import assert from 'node:assert/strict'

const PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' // throwaway test key
const acct = privateKeyToAccount(PK)
const SEPOLIA = 11155111
const ALLOWED_CHAIN_IDS = new Set([SEPOLIA])
const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // only used as an example ERC-20 address

// ---------------- strict RLP decoder (canonical only) ----------------
function rlpDecode(buf, pos = 0) {
  if (pos >= buf.length) throw new Error('rlp: eof')
  const b = buf[pos]
  if (b < 0x80) return { item: buf.slice(pos, pos + 1), end: pos + 1, list: false }
  if (b <= 0xb7) { // short string
    const len = b - 0x80, s = pos + 1, e = s + len
    if (e > buf.length) throw new Error('rlp: string overflow')
    if (len === 1 && buf[s] < 0x80) throw new Error('rlp: non-canonical single byte')
    return { item: buf.slice(s, e), end: e, list: false }
  }
  if (b <= 0xbf) { // long string
    const ll = b - 0xb7, len = readLen(buf, pos + 1, ll), s = pos + 1 + ll, e = s + len
    if (len < 56) throw new Error('rlp: non-canonical long string')
    if (e > buf.length) throw new Error('rlp: string overflow')
    return { item: buf.slice(s, e), end: e, list: false }
  }
  let len, s
  if (b <= 0xf7) { len = b - 0xc0; s = pos + 1 } else {
    const ll = b - 0xf7; len = readLen(buf, pos + 1, ll); s = pos + 1 + ll
    if (len < 56) throw new Error('rlp: non-canonical long list')
  }
  const e = s + len
  if (e > buf.length) throw new Error('rlp: list overflow')
  const items = []; let p = s
  while (p < e) { const r = rlpDecode(buf, p); items.push(r); p = r.end }
  if (p !== e) throw new Error('rlp: list length mismatch')
  return { item: items, end: e, list: true }
}
function readLen(buf, pos, ll) {
  if (ll > 4) throw new Error('rlp: length too large')
  if (buf[pos] === 0) throw new Error('rlp: non-canonical length (leading zero)')
  let n = 0; for (let i = 0; i < ll; i++) n = n * 256 + buf[pos + i]; return n
}
function asUint(node, maxBytes, name) {
  if (node.list) throw new Error(`${name}: expected integer, got list`)
  const v = node.item
  if (v.length > maxBytes) throw new Error(`${name}: integer wider than ${maxBytes} bytes`)
  if (v.length > 0 && v[0] === 0) throw new Error(`${name}: non-canonical integer (leading zero)`)
  let n = 0n; for (const x of v) n = (n << 8n) | BigInt(x); return n
}

// ---------------- classifier: the on-chain policy, in JS ----------------
// policy 'eth-only' (MVP): data must be empty; 'erc20-transfer' (Phase 2): also allow
// transfer(address,uint256) to an allowlisted token.
function classifyEvmPreimage(bytes, { policy = 'eth-only', tokenAllowlist = [] } = {}) {
  if (bytes.length === 0) return reject('empty')
  const t = bytes[0]
  if (t !== 0x02) {
    const why = t >= 0xc0 ? 'legacy (untyped) tx: no type byte, maybe no chainId' :
      t === 0x19 ? 'EIP-191 / EIP-712 signed data (0x19 prefix), not a tx' :
      t === 0x05 ? 'EIP-7702 authorization (MAGIC 0x05)' :
      t === 0x04 ? 'EIP-7702 set-code tx (type 4)' : t === 0x01 ? 'EIP-2930 tx (type 1)' :
      t === 0x03 ? 'EIP-4844 blob tx (type 3)' : `unknown leading byte 0x${t.toString(16)}`
    return reject(why)
  }
  let r
  try { r = rlpDecode(bytes, 1) } catch (e) { return reject(e.message) }
  if (r.end !== bytes.length) return reject('trailing bytes after RLP list')
  if (!r.list || r.item.length !== 9) return reject(`expected 9-item list, got ${r.list ? r.item.length : 'string'}`)
  const [chainIdN, nonceN, tipN, maxFeeN, gasN, toN, valueN, dataN, alN] = r.item
  try {
    const chainId = asUint(chainIdN, 8, 'chainId'), nonce = asUint(nonceN, 8, 'nonce')
    const maxPriorityFeePerGas = asUint(tipN, 32, 'tip'), maxFeePerGas = asUint(maxFeeN, 32, 'maxFee')
    const gas = asUint(gasN, 8, 'gas'), value = asUint(valueN, 32, 'value')
    if (!ALLOWED_CHAIN_IDS.has(Number(chainId))) return reject(`chainId ${chainId} not allowlisted`)
    if (nonce >= 2n ** 64n - 1n) return reject('nonce >= 2^64-1 (EIP-2681)')
    if (toN.list || toN.item.length !== 20) return reject('to must be 20 bytes (contract creation refused)')
    if (dataN.list) return reject('data must be a byte string')
    if (!alN.list || alN.item.length !== 0) return reject('access list must be empty (MVP)')
    const to = bytesToHex(toN.item), data = dataN.item
    let erc20 = null
    if (data.length > 0) {
      if (policy !== 'erc20-transfer') return reject('calldata refused in eth-only policy (approve/permit/setApprovalForAll/... are standing authorizations)')
      const sel = bytesToHex(data.slice(0, 4))
      if (sel !== '0xa9059cbb' || data.length !== 68) return reject(`selector ${sel} not allowlisted (only transfer(address,uint256))`)
      if (!tokenAllowlist.map((a) => a.toLowerCase()).includes(to.toLowerCase())) return reject('token contract not allowlisted')
      if (value !== 0n) return reject('ERC-20 transfer must carry value 0')
      erc20 = { recipient: bytesToHex(data.slice(16, 36)), amount: BigInt(bytesToHex(data.slice(36, 68))) }
    }
    // worst-case spend (for delegate caps): value + gas * maxFeePerGas
    const maxSpendWei = value + gas * maxFeePerGas
    return { ok: true, payloadHash: keccak256(bytes), fields: { chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gas, to, value, dataLen: data.length, erc20, maxSpendWei } }
  } catch (e) { return reject(e.message) }
}
const reject = (reason) => ({ ok: false, reason })

let pass = 0
const ok = (cond, msg) => { assert.ok(cond, msg); pass++; console.log('  PASS', msg) }

// ---------------- 1. unsigned serialization -> hash -> raw sign -> assemble ----------------
console.log('\n[1] EIP-1559 unsigned preimage -> keccak256 -> raw secp256k1 sign (MPC-style) -> assemble')
const tx = { type: 'eip1559', chainId: SEPOLIA, nonce: 7, maxPriorityFeePerGas: parseGwei('1.5'), maxFeePerGas: parseGwei('30'), gas: 21000n, to: '0x000000000000000000000000000000000000dEaD', value: parseEther('0.0123'), data: '0x', accessList: [] }
const unsigned = serializeTransaction(tx)           // 0x02 || rlp([...9 fields])
const unsignedBytes = hexToBytes(unsigned)
const payloadHash = keccak256(unsigned)
console.log('  unsigned preimage', unsigned, `(${unsignedBytes.length} bytes)`)
console.log('  keccak256(preimage) =', payloadHash)
ok(unsignedBytes[0] === 0x02, 'preimage starts with type byte 0x02')
// raw sign of the 32-byte hash, exactly what the MPC does (no further hashing)
const sig = await sign({ hash: payloadHash, privateKey: PK })
ok((await recoverAddress({ hash: payloadHash, signature: sig })) === acct.address, 'signature over keccak256(unsigned) recovers the sender')
const signedFromRaw = serializeTransaction(tx, sig)
const signedByViem = await acct.signTransaction(tx)
ok(signedFromRaw === signedByViem, 'assembling (unsigned fields + raw MPC-style signature) == wallet signTransaction (RFC6979 deterministic)')
ok((await recoverTransactionAddress({ serializedTransaction: signedFromRaw })) === acct.address, 'recoverTransactionAddress(signed) == sender, i.e. a node computes the same signing hash')
console.log('  signed tx hash (what explorers show) =', keccak256(signedFromRaw), '!= payload hash')
ok(keccak256(signedFromRaw) !== payloadHash, 'tx hash (signed) differs from signing hash (unsigned) — log both')

// ---------------- 2. parse fields back out with the strict decoder ----------------
console.log('\n[2] strict RLP parse of the preimage (mirrors on-chain parser)')
const c = classifyEvmPreimage(unsignedBytes)
ok(c.ok, 'classifier accepts a plain Sepolia ETH transfer')
const p = parseTransaction(unsigned)
ok(c.fields.chainId === BigInt(p.chainId) && c.fields.nonce === BigInt(p.nonce) && c.fields.to.toLowerCase() === p.to.toLowerCase() && c.fields.value === p.value, 'hand-rolled parse == viem.parseTransaction (chainId, nonce, to, value)')
ok(c.payloadHash === payloadHash, 'classifier hash == keccak256(serializeTransaction(tx))')
console.log('  parsed:', JSON.stringify(c.fields, (k, v) => (typeof v === 'bigint' ? v.toString() : v)))

// ---------------- 3. things that must be refused ----------------
console.log('\n[3] refusal cases')
const cases = []
// 3a legacy EIP-155 tx (has chainId inside v but untyped) and pre-155 (no chainId: replayable on every EVM chain)
const legacy155 = serializeTransaction({ type: 'legacy', chainId: SEPOLIA, nonce: 7, gasPrice: parseGwei('30'), gas: 21000n, to: tx.to, value: tx.value })
const legacyPre155 = serializeTransaction({ type: 'legacy', nonce: 7, gasPrice: parseGwei('30'), gas: 21000n, to: tx.to, value: tx.value })
cases.push(['legacy EIP-155 preimage', legacy155], ['legacy pre-EIP-155 preimage (no chainId)', legacyPre155])
// 3b type-1 and type-4 (7702) txs
cases.push(['EIP-2930 type-1 tx', serializeTransaction({ type: 'eip2930', chainId: SEPOLIA, nonce: 7, gasPrice: parseGwei('30'), gas: 21000n, to: tx.to, value: tx.value, accessList: [] })])
const auth = { chainId: 0, address: '0x1111111111111111111111111111111111111111', nonce: 8 } // chainId 0 = valid on EVERY chain
const t4 = serializeTransaction({ type: 'eip7702', chainId: SEPOLIA, nonce: 7, maxPriorityFeePerGas: 1n, maxFeePerGas: 2n, gas: 100000n, to: acct.address, value: 0n, data: '0x', accessList: [], authorizationList: [{ ...auth, r: '0x' + '11'.repeat(32), s: '0x' + '22'.repeat(32), yParity: 0 }] })
cases.push(['EIP-7702 type-4 tx', t4])
// 3c the 7702 authorization preimage itself: 0x05 || rlp([chain_id, address, nonce])
const authPreimage = concat(['0x05', toRlp([numberToHex(0) === '0x0' ? '0x' : numberToHex(0), auth.address, numberToHex(auth.nonce)])])
ok(keccak256(authPreimage) === hashAuthorization({ chainId: 0, address: auth.address, nonce: auth.nonce }), 'our 0x05||rlp(...) preimage == viem hashAuthorization (sanity)')
cases.push(['EIP-7702 authorization preimage (0x05 MAGIC), chain_id=0', authPreimage])
// 3d EIP-191 personal_sign preimage and EIP-712 permit preimage
const msg = 'Sign in to Example'
const personalPreimage = concat([new TextEncoder().encode(`\x19Ethereum Signed Message:\n${msg.length}`), new TextEncoder().encode(msg)])
ok(keccak256(personalPreimage) === hashMessage(msg), 'EIP-191 preimage reproduces hashMessage (sanity)')
cases.push(['EIP-191 personal_sign preimage', bytesToHex(personalPreimage)])
const permitTyped = { domain: { name: 'USDC', version: '2', chainId: SEPOLIA, verifyingContract: USDC_SEPOLIA }, types: { Permit: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'deadline', type: 'uint256' }] }, primaryType: 'Permit', message: { owner: acct.address, spender: '0x000000000000000000000000000000000000bEEF', value: 2n ** 256n - 1n, nonce: 0n, deadline: 2n ** 255n } }
const permitDigest = hashTypedData(permitTyped)
cases.push(['EIP-712 permit preimage (0x19 0x01 || domainSep || structHash) — only its first bytes matter', concat(['0x1901', '0x' + '00'.repeat(64)])])
// 3e non-canonical / malformed variants of a valid tx
const nonCanonNonce = (() => { // re-encode with nonce 0x0007 (leading zero) by hand
  const fields = [numberToHex(SEPOLIA), '0x0007', numberToHex(tx.maxPriorityFeePerGas), numberToHex(tx.maxFeePerGas), numberToHex(tx.gas), tx.to, numberToHex(tx.value), '0x', []]
  return concat(['0x02', toRlp(fields)])
})()
cases.push(['non-canonical nonce (leading zero)', nonCanonNonce], ['trailing byte after RLP list', concat([unsigned, '0x00'])])
cases.push(['chainId 1 (mainnet) not allowlisted', serializeTransaction({ ...tx, chainId: 1 })])
cases.push(['contract creation (to empty)', serializeTransaction({ ...tx, to: undefined, data: '0x6000' })])
const approveData = encodeFunctionData({ abi: [{ type: 'function', name: 'approve', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] }], functionName: 'approve', args: ['0x000000000000000000000000000000000000bEEF', 2n ** 256n - 1n] })
cases.push(['ERC-20 approve(spender, max) — standing authorization', serializeTransaction({ ...tx, to: USDC_SEPOLIA, value: 0n, data: approveData })])
for (const [name, hex] of cases) {
  const res = classifyEvmPreimage(hexToBytes(hex), { policy: 'erc20-transfer', tokenAllowlist: [USDC_SEPOLIA] })
  ok(!res.ok, `refuse ${name} -> ${res.reason}`)
}
// 3f allowed under the Phase-2 erc20 policy only
const transferData = encodeFunctionData({ abi: [{ type: 'function', name: 'transfer', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] }], functionName: 'transfer', args: ['0x000000000000000000000000000000000000bEEF', 1_000_000n] })
const erc20tx = serializeTransaction({ ...tx, to: USDC_SEPOLIA, value: 0n, gas: 65000n, data: transferData })
ok(!classifyEvmPreimage(hexToBytes(erc20tx)).ok, 'ERC-20 transfer refused under MVP eth-only policy')
const e2 = classifyEvmPreimage(hexToBytes(erc20tx), { policy: 'erc20-transfer', tokenAllowlist: [USDC_SEPOLIA] })
ok(e2.ok && e2.fields.erc20.amount === 1_000_000n, 'ERC-20 transfer(…) accepted under Phase-2 policy with amount parsed')
console.log('  erc20 preimage size', hexToBytes(erc20tx).length, 'bytes; eth transfer preimage size', unsignedBytes.length, 'bytes')

// ---------------- 4. blind hashes ----------------
console.log('\n[4] blind hashes: a raw 32-byte payload carries no type information')
const blind = { txSigningHash: payloadHash, personalSignHash: hashMessage(msg), permitDigest, authHash: hashAuthorization({ chainId: 0, address: auth.address, nonce: auth.nonce }) }
for (const [k, v] of Object.entries(blind)) console.log(`  ${k.padEnd(18)} ${v}`)
const permitSig = await sign({ hash: permitDigest, privateKey: PK })
ok((await recoverAddress({ hash: permitDigest, signature: permitSig })) === acct.address, 'a raw-hash signer happily produces a valid permit signature (no account nonce consumed)')

// ---------------- 5. pre-EIP-155 replay & EIP-155 chain binding ----------------
console.log('\n[5] replay: pre-EIP-155 signing hash has no chainId')
const h155a = keccak256(serializeTransaction({ type: 'legacy', chainId: 1, nonce: 0, gasPrice: 1n, gas: 21000n, to: tx.to, value: 1n }))
const h155b = keccak256(serializeTransaction({ type: 'legacy', chainId: SEPOLIA, nonce: 0, gasPrice: 1n, gas: 21000n, to: tx.to, value: 1n }))
const hPre = keccak256(serializeTransaction({ type: 'legacy', nonce: 0, gasPrice: 1n, gas: 21000n, to: tx.to, value: 1n }))
ok(h155a !== h155b, 'EIP-155 hashes differ per chain')
ok(hPre !== h155a && hPre !== h155b, 'pre-155 hash is chain-independent (one signature valid on every EVM chain that still accepts unprotected txs)')

// ---------------- 6. high-water-mark logic ----------------
console.log('\n[6] EVM liveness rule: a signed nonce n is dead iff finalizedNonceCount(chainId) > n')
const signed = [{ chainId: SEPOLIA, nonce: 0n }, { chainId: SEPOLIA, nonce: 1n }, { chainId: SEPOLIA, nonce: 1n /* replacement */ }, { chainId: SEPOLIA, nonce: 2n }]
const hw = new Map(); for (const s of signed) hw.set(s.chainId, s.nonce > (hw.get(s.chainId) ?? -1n) ? s.nonce : hw.get(s.chainId))
const status = (count) => (count > hw.get(SEPOLIA) ? 'spent' : 'unspent')
ok(status(2n) === 'unspent' && status(3n) === 'spent', 'per-chain max signed nonce is a sufficient summary (O(1) storage per chain)')

console.log(`\nALL ${pass} CHECKS PASSED`)
