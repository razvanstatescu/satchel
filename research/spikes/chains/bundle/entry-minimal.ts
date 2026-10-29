// THROWAWAY: offline derivation with only @noble + viem + bech32 (no chainsig.js)
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha3_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { base58, bech32 } from '@scure/base'
import { publicKeyToAddress } from 'viem/accounts'
const PREFIX = 'near-mpc-recovery v0.1.0 epsilon derivation:'
const ROOT_SECP = '4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3'
const ROOT_ED = '6vSEtQxrQj6txUMh33WC4ERyCWmNMRTdufDWAaDY3Un2'
const tweak = (p: string, path: string) => sha3_256(new TextEncoder().encode(`${PREFIX}${p},${path}`))
export function secp(p: string, path: string) {
  const root = secp256k1.Point.fromHex('04' + bytesToHex(base58.decode(ROOT_SECP)))
  return root.add(secp256k1.Point.BASE.multiply(BigInt('0x' + bytesToHex(tweak(p, path)))))
}
export function evmAddr(p: string, path: string) { return publicKeyToAddress(`0x${bytesToHex(secp(p, path).toBytes(false))}`) }
export function btcAddr(p: string, path: string, hrp = 'tb') {
  const h160 = ripemd160(sha256(secp(p, path).toBytes(true)))
  return bech32.encode(hrp, [0, ...bech32.toWords(h160)])
}
export function solAddr(p: string, path: string) {
  const t = tweak(p, path); let le = 0n
  for (let i = t.length - 1; i >= 0; i--) le = (le << 8n) + BigInt(t[i])
  const pt = ed25519.Point.fromBytes(base58.decode(ROOT_ED)).add(ed25519.Point.BASE.multiply(le % ed25519.Point.Fn.ORDER))
  return base58.encode(pt.toBytes())
}
(globalThis as any).__run = async () => ({ evm: evmAddr('satchel.example.testnet', 'satchel/1/evm'), btc: btcAddr('satchel.example.testnet', 'satchel/1/btc'), sol: solAddr('satchel.example.testnet', 'satchel/1/sol') })
