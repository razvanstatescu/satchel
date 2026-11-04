/**
 * Own MPC key derivation (kb/10 §Key derivation, kb/11 §KDF; kb/90 §8.2 lib/derive). No chainsig.js (D-03,
 * plan/decisions.md).
 *
 *   tweak     = sha3_256("near-mpc-recovery v0.1.0 epsilon derivation:" + predecessor + "," + path)
 *   secp256k1 = root + G · BE(tweak)            (domain 0: BTC and EVM)
 *   ed25519   = root + B · (LE(tweak) mod ℓ)    (domain 1: SOL)
 *
 * The predecessor is the account that calls MPC `sign`: the Satchel contract, never the user.
 * Isomorphic: @noble + @scure only.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { ed25519 } from '@noble/curves/ed25519.js'
import { sha3_256, keccak_256 } from '@noble/hashes/sha3.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'
import { base58, bech32 } from '@scure/base'
import { bytesToBigIntBE, toHex, utf8 } from '../bytes'

export type Network = 'testnet' | 'mainnet'
export type ChainSlug = 'btc' | 'evm' | 'sol'

/** MPC root public keys (NEAR format: base58 of x‖y for secp256k1, of the 32-byte point for ed25519). kb/11 §Live MPC contract facts. */
export const MPC_ROOT_KEYS = {
  testnet: {
    secp256k1: 'secp256k1:4NfTiv3UsGahebgTaHyD9vF8KYKMBnfd6kh94mK6xv8fGBiJB8TBtFMP5WWXz6B89Ac1fbpzPwAvoyQebemHFwx3',
    ed25519: 'ed25519:6vSEtQxrQj6txUMh33WC4ERyCWmNMRTdufDWAaDY3Un2',
  },
  mainnet: {
    secp256k1: 'secp256k1:3tFRbMqmoa6AAALMrEFAYCEoHcqKxeW38YptwowBVBtXK1vo36HDbUWuR6EZmoK4JcH6HDkNMGGqP1ouV7VZUWya',
    ed25519: 'ed25519:G9hwngxWNKdmqMCmU1Yt6LPhFpayJeKFxyAV1HqMNLtF',
  },
} as const

export const MPC_CONTRACT: Record<Network, string> = { testnet: 'v1.signer-prod.testnet', mainnet: 'v1.signer' }

/** MPC domain per chain (spec §5.5: BTC, EVM → 0; SOL → 1). Never `latest_key_version`. */
export const DOMAIN_ID: Record<ChainSlug, 0 | 1> = { btc: 0, evm: 0, sol: 1 }

const TWEAK_PREFIX = 'near-mpc-recovery v0.1.0 epsilon derivation:'
const CANONICAL_TOKEN_ID = /^[1-9][0-9]*$/

/** "satchel/{id}/{chain}". Token ids are canonical decimals ("1", never "01"), or the address changes (kb/30 §Gotchas). */
export function tokenPath(tokenId: string, chain: ChainSlug): string {
  if (!CANONICAL_TOKEN_ID.test(tokenId)) throw new Error(`non-canonical token id: ${JSON.stringify(tokenId)}`)
  return `satchel/${tokenId}/${chain}`
}

export function derivationTweak(predecessor: string, path: string): Uint8Array {
  return sha3_256(utf8(`${TWEAK_PREFIX}${predecessor},${path}`))
}

/** Parse a NEAR-format public key ("secp256k1:…" 64 B x‖y, or "ed25519:…" 32 B). */
export function parseNearPublicKey(key: string): { curve: 'secp256k1' | 'ed25519'; bytes: Uint8Array } {
  const i = key.indexOf(':')
  const curve = key.slice(0, i)
  const bytes = base58.decode(key.slice(i + 1))
  if (curve === 'secp256k1' && bytes.length === 64) return { curve, bytes }
  if (curve === 'ed25519' && bytes.length === 32) return { curve, bytes }
  throw new Error(`bad NEAR public key: ${key}`)
}

function secpRoot(network: Network) {
  const { bytes } = parseNearPublicKey(MPC_ROOT_KEYS[network].secp256k1)
  return secp256k1.Point.fromBytes(Uint8Array.from([0x04, ...bytes]))
}

function edRoot(network: Network) {
  return ed25519.Point.fromBytes(parseNearPublicKey(MPC_ROOT_KEYS[network].ed25519).bytes)
}

export interface Secp256k1Key {
  /** 33-byte SEC1 compressed. */
  compressed: Uint8Array
  /** 65-byte SEC1 uncompressed (0x04 ‖ x ‖ y). */
  uncompressed: Uint8Array
}

/** Derived secp256k1 key (domain 0). */
export function deriveSecp256k1(network: Network, predecessor: string, path: string): Secp256k1Key {
  const t = bytesToBigIntBE(derivationTweak(predecessor, path))
  if (t === 0n || t >= secp256k1.Point.Fn.ORDER) throw new Error('TweakNotOnCurve') // MPC refuses too (p ≈ 2^-128)
  const p = secpRoot(network).add(secp256k1.Point.BASE.multiply(t))
  return { compressed: p.toBytes(true), uncompressed: p.toBytes(false) }
}

/** Derived ed25519 public key (domain 1), 32 bytes. */
export function deriveEd25519(network: Network, predecessor: string, path: string): Uint8Array {
  const tw = derivationTweak(predecessor, path)
  let le = 0n
  for (let i = tw.length - 1; i >= 0; i--) le = (le << 8n) | BigInt(tw[i]!)
  const t = le % ed25519.Point.Fn.ORDER
  const base = edRoot(network)
  const p = t === 0n ? base : base.add(ed25519.Point.BASE.multiply(t))
  return p.toBytes()
}

/** EIP-55 checksummed address from a 65-byte uncompressed (or 64-byte x‖y) secp256k1 key. */
export function publicKeyToEvmAddress(pub: Uint8Array): `0x${string}` {
  const xy = pub.length === 65 ? pub.slice(1) : pub
  if (xy.length !== 64) throw new Error('expected an uncompressed secp256k1 key')
  return toChecksumAddress(toHex(keccak_256(xy).slice(-20)))
}

export function toChecksumAddress(addr: string): `0x${string}` {
  const a = addr.toLowerCase().replace(/^0x/, '')
  if (!/^[0-9a-f]{40}$/.test(a)) throw new Error(`bad EVM address: ${addr}`)
  const h = toHex(keccak_256(utf8(a)))
  let out = '0x'
  for (let i = 0; i < 40; i++) out += Number.parseInt(h[i]!, 16) >= 8 ? a[i]!.toUpperCase() : a[i]!
  return out as `0x${string}`
}

export function hash160(b: Uint8Array): Uint8Array {
  return ripemd160(sha256(b))
}

export function btcHrp(network: Network): 'tb' | 'bc' {
  return network === 'mainnet' ? 'bc' : 'tb'
}

/** P2WPKH (bech32 v0) address of a compressed key. Testnet hrp `tb` is valid on testnet4 (kb/30 §TL;DR 1). */
export function p2wpkhAddress(compressed: Uint8Array, network: Network): string {
  if (compressed.length !== 33) throw new Error('expected a compressed secp256k1 key')
  return bech32.encode(btcHrp(network), [0, ...bech32.toWords(hash160(compressed))])
}

export const evmAddress = (network: Network, predecessor: string, path: string): `0x${string}` =>
  publicKeyToEvmAddress(deriveSecp256k1(network, predecessor, path).uncompressed)

export const btcP2wpkhAddress = (network: Network, predecessor: string, path: string): string =>
  p2wpkhAddress(deriveSecp256k1(network, predecessor, path).compressed, network)

export const btcCompressedPubkeyHex = (network: Network, predecessor: string, path: string): string =>
  toHex(deriveSecp256k1(network, predecessor, path).compressed)

export const solAddress = (network: Network, predecessor: string, path: string): string =>
  base58.encode(deriveEd25519(network, predecessor, path))

/** NEAR-format string of a derived key, to compare with the MPC view `derived_public_key` (kb/70 F19). */
export function nearKeyString(curve: 'secp256k1' | 'ed25519', key: Uint8Array): string {
  if (curve === 'secp256k1') {
    const xy = key.length === 65 ? key.slice(1) : key.length === 33 ? secp256k1.Point.fromBytes(key).toBytes(false).slice(1) : key
    return `secp256k1:${base58.encode(xy)}`
  }
  return `ed25519:${base58.encode(key)}`
}

export interface SatchelAddresses {
  tokenId: string
  paths: Record<ChainSlug, string>
  evm: `0x${string}`
  btc: string
  sol: string
  /** compressed secp256k1 pubkey of the BTC path (needed to finalize P2WPKH witnesses), hex */
  btcPubkey: string
  /** ed25519 pubkey of the SOL path (= base58-decoded sol address), hex */
  solPubkey: string
}

/** All three addresses of one Satchel. ~1 ms. */
export function deriveSatchelAddresses(network: Network, contractId: string, tokenId: string): SatchelAddresses {
  const paths = { btc: tokenPath(tokenId, 'btc'), evm: tokenPath(tokenId, 'evm'), sol: tokenPath(tokenId, 'sol') }
  const btcKey = deriveSecp256k1(network, contractId, paths.btc)
  const solKey = deriveEd25519(network, contractId, paths.sol)
  return {
    tokenId,
    paths,
    evm: evmAddress(network, contractId, paths.evm),
    btc: p2wpkhAddress(btcKey.compressed, network),
    sol: base58.encode(solKey),
    btcPubkey: toHex(btcKey.compressed),
    solPubkey: toHex(solKey),
  }
}

/** Normalise an address for index lookups: EVM and bech32 are case-insensitive; base58 is case-sensitive. */
export function normalizeAddress(addr: string): string {
  const a = addr.trim()
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return a.toLowerCase()
  if (/^(tb|bc|bcrt)1/i.test(a)) return a.toLowerCase()
  return a
}

export interface AddressIndexEntry {
  tokenId: string
  chain: ChainSlug
}

export type AddressIndex = ReadonlyMap<string, AddressIndexEntry>

/**
 * address → token index for ids 1..maxTokenId (spec §8.2: lets the BTC builder recognise Satchel recipients, R-05).
 * Pass `nft_total_supply` (ids are sequential and never reused, INV-21).
 */
export function buildAddressIndex(network: Network, contractId: string, maxTokenId: number): AddressIndex {
  const m = new Map<string, AddressIndexEntry>()
  for (let i = 1; i <= maxTokenId; i++) {
    const a = deriveSatchelAddresses(network, contractId, String(i))
    for (const chain of ['btc', 'evm', 'sol'] as const) m.set(normalizeAddress(a[chain]), { tokenId: a.tokenId, chain })
  }
  return m
}

export function lookupAddress(index: AddressIndex, addr: string): AddressIndexEntry | undefined {
  return index.get(normalizeAddress(addr))
}
