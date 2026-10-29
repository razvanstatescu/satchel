/**
 * C7 message vectors (docs/specs/C1-C2-C3-C7.md §3.3): `evm_message` (EIP-191 personal_sign) and `sol_message` (Solana
 * off-chain message v0). Accepted EVM hashes are cross-checked against viem's `hashMessage`; the Solana off-chain bytes
 * are rebuilt here byte by byte from the spec layout.
 */
import { hashMessage, keccak256 } from 'viem'
import { sha256 } from '@noble/hashes/sha2.js'
import { concatBytes, hexToBytesStrict, toHex, utf8 } from '@satchel/core/bytes'
import { assert, vec, type Vector } from './lib'

const SIWE = [
  'satchel.example wants you to sign in with your Ethereum account:',
  '0x61739f33AdbB7F76c1b5B222E4119085257528BE',
  '',
  'Prove you control this Satchel.',
  '',
  'URI: https://satchel.example',
  'Version: 1',
  'Chain ID: 11155111',
  'Nonce: 8f2c41d9',
  'Issued At: 2026-11-05T12:00:00Z',
].join('\n')

/** "\xffsolana offchain" ‖ version 0 ‖ format ‖ u16le(len) ‖ body, written out from the spec table. */
function offchain(body: Uint8Array): Uint8Array {
  const printable = body.every((b) => b >= 0x20 && b <= 0x7e)
  return concatBytes(hexToBytesStrict('ff736f6c616e61206f6666636861696e'), Uint8Array.of(0x00, printable ? 0 : 1, body.length & 0xff, body.length >>> 8), body)
}

export function msgVectors(): Vector[] {
  const v: Vector[] = []
  const evm = (name: string, body: Uint8Array | string, want: Parameters<typeof vec>[3], note?: string) => {
    const hex = typeof body === 'string' ? body : toHex(body)
    const x = vec(name, 'evm_message', { evm_message: { message: hex } }, want, note)
    if (want === 'ok') {
      const m = hexToBytesStrict(hex)
      assert(x.expect.hash === hashMessage({ raw: m }).slice(2), `${name}: viem hashMessage`)
      assert(x.expect.fields!.signed_bytes === toHex(concatBytes(utf8(`\x19Ethereum Signed Message:\n${m.length}`), m)), `${name}: prefix`)
    }
    v.push(x)
  }
  const sol = (name: string, body: Uint8Array | string, want: Parameters<typeof vec>[3], note?: string) => {
    const hex = typeof body === 'string' ? body : toHex(body)
    const x = vec(name, 'sol_message', { sol_message: { message: hex } }, want, note)
    if (want === 'ok') {
      const bytes = offchain(hexToBytesStrict(hex))
      assert(x.expect.fields!.signed_bytes === toHex(bytes), `${name}: off-chain layout`)
      assert(x.expect.hash === toHex(sha256(bytes)), `${name}: sha256`)
      assert(JSON.stringify(x.expect.mpc![0]!.payload_v2) === JSON.stringify({ Eddsa: toHex(bytes) }), `${name}: Eddsa payload`)
    }
    v.push(x)
  }

  // ── EVM personal_sign ───────────────────────────────────────────────────────────────────────
  evm('evm_message_hello', utf8('hello'), 'ok', 'hashMessage("hello") = 0x50b2c43f…7750')
  assert(hashMessage('hello') === '0x50b2c43fd39106bafbba0da34fc430e1f91e3c96ea2acee2bc34119f92b37750', 'known EIP-191 hash')
  evm('evm_message_siwe', utf8(SIWE), 'ok', 'an EIP-4361 sign-in message (multi-line text)')
  evm('evm_message_utf8', utf8('Grüße ✓ 🎒 日本語'), 'ok', 'multi-byte UTF-8')
  evm('evm_message_single_byte', utf8('~'), 'ok')
  evm('evm_message_nul_is_utf8', Uint8Array.of(0), 'ok', 'NUL is valid UTF-8')
  evm('evm_message_1024_bytes', utf8('a'.repeat(1024)), 'ok', 'the cap; the prefix length is "1024"')
  evm('evm_message_0x_uppercase_input', `0X${toHex(utf8('hello')).toUpperCase()}`, 'ok', 'hex input with 0X and uppercase: same bytes as evm_message_hello')
  evm('evm_message_hex_text_of_a_tx', utf8('02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0'), 'ok', 'text that spells a tx in hex is just text: the prefix keeps it from ever being a tx hash')
  evm('evm_message_empty', '', 'ERR_MSG_EMPTY')
  evm('evm_message_1025_bytes', utf8('a'.repeat(1025)), 'ERR_MSG_TOO_LONG')
  evm('evm_message_invalid_utf8', Uint8Array.of(0x68, 0x69, 0xff), 'ERR_MSG_ENCODING')
  evm('evm_message_truncated_utf8', Uint8Array.of(0x61, 0xc3), 'ERR_MSG_ENCODING', 'a dangling 2-byte lead')
  evm('evm_message_utf16_surrogate', Uint8Array.of(0xed, 0xa0, 0x80), 'ERR_MSG_ENCODING', 'CESU / surrogate: not UTF-8')
  evm('evm_message_overlong_nul', Uint8Array.of(0xc0, 0x80), 'ERR_MSG_ENCODING', 'modified UTF-8 NUL')
  const tx = hexToBytesStrict('02ee83aa36a78083030d4883030d5c8252089461739f33adbb7f76c1b5b222e4119085257528be865af3107a400080c0')
  evm('evm_message_raw_tx_bytes', tx, 'ERR_MSG_ENCODING', 'raw transaction bytes are not text')
  const h = hexToBytesStrict(keccak256('0x01').slice(2))
  let rawHashRefused = false
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(h)
  } catch {
    rawHashRefused = true
  }
  assert(rawHashRefused, 'the chosen hash must be invalid UTF-8')
  evm('evm_message_raw_32_byte_hash', h, 'ERR_MSG_ENCODING', 'personal_sign(bytes32) blind signing: a raw hash is not text')
  evm('evm_message_bad_hex', 'zz', 'ERR_HEX')
  evm('evm_message_odd_hex', '686', 'ERR_HEX')

  // ── Solana off-chain message v0 ─────────────────────────────────────────────────────────────
  sol('sol_message_ascii_format0', utf8('Sign in to satchel.example'), 'ok', 'printable ASCII → format 0')
  sol('sol_message_hi', utf8('Hi'), 'ok', 'ff736f6c616e61206f6666636861696e 00 00 0200 4869')
  sol('sol_message_newline_format1', utf8('line\nbreak'), 'ok', 'a newline is not printable ASCII → format 1')
  sol('sol_message_utf8_format1', utf8('Grüße ✓ 🎒'), 'ok', 'UTF-8 → format 1')
  sol('sol_message_tilde_and_space', utf8(' ~'), 'ok', '0x20 and 0x7e are the printable bounds → format 0')
  sol('sol_message_1024_bytes', utf8('x'.repeat(1024)), 'ok', 'the cap; u16le length 0004')
  sol('sol_message_empty', '', 'ERR_MSG_EMPTY')
  sol('sol_message_1025_bytes', utf8('x'.repeat(1025)), 'ERR_MSG_TOO_LONG')
  sol('sol_message_invalid_utf8', Uint8Array.of(0x80), 'ERR_MSG_ENCODING')
  const legacy = hexToBytesStrict(
    '01000103ea4a6c63e29c520abef5507b132ec5f9954776aebebe7b92421eea691446d22c1398f62c6d1a457c51ba6a4b5f3dbd2f69fca93216218dc8997e416bd17d93ca0000000000000000000000000000000000000000000000000000000000000000090909090909090909090909090909090909090909090909090909090909090901020200010c0200000040420f0000000000',
  )
  sol('sol_message_legacy_tx_bytes', legacy, 'ERR_MSG_ENCODING', 'a legacy transaction message is not text (and could never be signed as one: the header starts with 0xff)')
  sol('sol_message_bad_hex', '0xg0', 'ERR_HEX')
  return v
}
