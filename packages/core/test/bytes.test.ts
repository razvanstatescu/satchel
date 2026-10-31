/**
 * Round two of the test audit (docs/testing/core-api.md "What remains untested"): `bytes.ts` on its own. Previously
 * only exercised indirectly through btc/evm/sol/near tests; this covers every exported helper's edge cases
 * directly: hex strictness (0x/0X, odd length, bad chars, empty), round-trips, and the integer/bigint boundaries.
 */
import { describe, expect, it } from 'vitest'
import {
  base64ToBytes,
  bigIntToBytesBE,
  bytesToBase64,
  bytesToBigIntBE,
  concatBytes,
  equalBytes,
  hexToBytesStrict,
  readU32le,
  readU64le,
  reverseBytes,
  strip0x,
  to0x,
  toHex,
  u32le,
  u64le,
  utf8,
} from '../src/bytes'

describe('hexToBytesStrict', () => {
  it('decodes plain hex with no prefix', () => {
    expect(hexToBytesStrict('deadbeef')).toEqual(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
  })

  it('strips a 0x or 0X prefix (both cases)', () => {
    expect(hexToBytesStrict('0xdeadbeef')).toEqual(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
    expect(hexToBytesStrict('0Xdeadbeef')).toEqual(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
  })

  it('accepts mixed-case hex digits', () => {
    expect(hexToBytesStrict('DeAdBeEf')).toEqual(Uint8Array.from([0xde, 0xad, 0xbe, 0xef]))
  })

  it('decodes an empty string (0x alone) to an empty array', () => {
    expect(hexToBytesStrict('')).toEqual(new Uint8Array(0))
    expect(hexToBytesStrict('0x')).toEqual(new Uint8Array(0))
  })

  it('throws on odd length', () => {
    expect(() => hexToBytesStrict('abc')).toThrow(/ERR_HEX/)
    expect(() => hexToBytesStrict('0xabc')).toThrow(/ERR_HEX/)
  })

  it('throws on non-hex characters', () => {
    expect(() => hexToBytesStrict('zz')).toThrow(/ERR_HEX/)
    expect(() => hexToBytesStrict('0xgg')).toThrow(/ERR_HEX/)
  })

  it('throws on a 0x prefix found mid-string (only a leading prefix is stripped)', () => {
    // "ab0xcd" has even length (6) and only hits HEX_RE's /^[0-9a-fA-F]*$/ check — "0x" itself is not hex, so it throws.
    expect(() => hexToBytesStrict('ab0xcd')).toThrow(/ERR_HEX/)
  })

  it('does not treat whitespace as valid hex', () => {
    expect(() => hexToBytesStrict('de ad')).toThrow(/ERR_HEX/)
    expect(() => hexToBytesStrict(' deadbeef')).toThrow(/ERR_HEX/)
  })
})

describe('toHex / to0x / strip0x', () => {
  it('toHex produces lowercase, no prefix, zero-padded per byte', () => {
    expect(toHex(Uint8Array.from([0, 1, 0x0f, 0xff]))).toBe('00010fff')
  })

  it('toHex on an empty array is the empty string', () => {
    expect(toHex(new Uint8Array(0))).toBe('')
  })

  it('to0x prefixes with 0x', () => {
    expect(to0x(Uint8Array.from([0xab, 0xcd]))).toBe('0xabcd')
  })

  it('strip0x removes a leading 0x/0X but leaves everything else alone, including a non-leading 0x', () => {
    expect(strip0x('0xabcd')).toBe('abcd')
    expect(strip0x('0Xabcd')).toBe('abcd')
    expect(strip0x('abcd')).toBe('abcd')
    expect(strip0x('ab0xcd')).toBe('ab0xcd')
    expect(strip0x('')).toBe('')
  })

  it('toHex and hexToBytesStrict round-trip for arbitrary bytes', () => {
    const bytes = Uint8Array.from([0, 1, 2, 254, 255, 128, 16])
    expect(hexToBytesStrict(toHex(bytes))).toEqual(bytes)
  })
})

describe('concatBytes', () => {
  it('concatenates in order', () => {
    expect(concatBytes(Uint8Array.from([1, 2]), Uint8Array.from([3]), Uint8Array.from([4, 5]))).toEqual(Uint8Array.from([1, 2, 3, 4, 5]))
  })

  it('with zero parts returns an empty array', () => {
    expect(concatBytes()).toEqual(new Uint8Array(0))
  })

  it('skips over empty parts without affecting the result', () => {
    expect(concatBytes(new Uint8Array(0), Uint8Array.from([1]), new Uint8Array(0))).toEqual(Uint8Array.from([1]))
  })

  it('does not mutate its inputs', () => {
    const a = Uint8Array.from([1, 2])
    const b = Uint8Array.from([3])
    concatBytes(a, b)
    expect(a).toEqual(Uint8Array.from([1, 2]))
    expect(b).toEqual(Uint8Array.from([3]))
  })
})

describe('equalBytes', () => {
  it('true for identical content, even in different Uint8Array instances', () => {
    expect(equalBytes(Uint8Array.from([1, 2, 3]), Uint8Array.from([1, 2, 3]))).toBe(true)
  })

  it('false for a different length, even when one is a prefix of the other', () => {
    expect(equalBytes(Uint8Array.from([1, 2]), Uint8Array.from([1, 2, 3]))).toBe(false)
  })

  it('false when any byte differs', () => {
    expect(equalBytes(Uint8Array.from([1, 2, 3]), Uint8Array.from([1, 9, 3]))).toBe(false)
  })

  it('two empty arrays are equal', () => {
    expect(equalBytes(new Uint8Array(0), new Uint8Array(0))).toBe(true)
  })
})

describe('reverseBytes', () => {
  it('reverses byte order', () => {
    expect(reverseBytes(Uint8Array.from([1, 2, 3]))).toEqual(Uint8Array.from([3, 2, 1]))
  })

  it('does not mutate the input', () => {
    const a = Uint8Array.from([1, 2, 3])
    reverseBytes(a)
    expect(a).toEqual(Uint8Array.from([1, 2, 3]))
  })

  it('an empty array reverses to itself', () => {
    expect(reverseBytes(new Uint8Array(0))).toEqual(new Uint8Array(0))
  })

  it('a single byte reverses to itself', () => {
    expect(reverseBytes(Uint8Array.from([7]))).toEqual(Uint8Array.from([7]))
  })
})

describe('u32le / readU32le', () => {
  it('round-trips 0 and the max u32', () => {
    expect(readU32le(u32le(0), 0)).toBe(0)
    expect(readU32le(u32le(0xffffffff), 0)).toBe(0xffffffff)
  })

  it('is little-endian (low byte first)', () => {
    expect(u32le(1)).toEqual(Uint8Array.from([1, 0, 0, 0]))
    expect(u32le(0x01020304)).toEqual(Uint8Array.from([4, 3, 2, 1]))
  })

  it('throws on a negative number, a non-integer, and anything over 0xffffffff', () => {
    expect(() => u32le(-1)).toThrow(RangeError)
    expect(() => u32le(1.5)).toThrow(RangeError)
    expect(() => u32le(0x100000000)).toThrow(RangeError)
  })

  it('readU32le respects a byte offset and reads independent of buffer length beyond it', () => {
    const b = concatBytes(Uint8Array.from([0xff, 0xff]), u32le(42))
    expect(readU32le(b, 2)).toBe(42)
  })

  it('readU32le throws when reading past the end of the buffer', () => {
    expect(() => readU32le(Uint8Array.from([1, 2, 3]), 0)).toThrow(/read past end/)
  })

  it('readU32le respects a Uint8Array view with a non-zero byteOffset into a shared buffer', () => {
    const buf = new ArrayBuffer(12)
    new DataView(buf).setUint32(4, 99, true)
    const view = new Uint8Array(buf, 4, 4)
    expect(readU32le(view, 0)).toBe(99)
  })
})

describe('u64le / readU64le', () => {
  it('round-trips 0n and the max u64', () => {
    expect(readU64le(u64le(0n), 0)).toBe(0n)
    expect(readU64le(u64le(0xffffffffffffffffn), 0)).toBe(0xffffffffffffffffn)
  })

  it('throws on a negative bigint and anything over the u64 max', () => {
    expect(() => u64le(-1n)).toThrow(RangeError)
    expect(() => u64le(0xffffffffffffffffn + 1n)).toThrow(RangeError)
  })

  it('readU64le throws when reading past the end of the buffer', () => {
    expect(() => readU64le(Uint8Array.from([1, 2, 3, 4, 5, 6, 7]), 0)).toThrow(/read past end/)
  })

  it('readU64le respects a byte offset', () => {
    const b = concatBytes(Uint8Array.from([0, 0]), u64le(123456789n))
    expect(readU64le(b, 2)).toBe(123456789n)
  })
})

describe('bytesToBigIntBE / bigIntToBytesBE', () => {
  it('empty bytes decode to 0n', () => {
    expect(bytesToBigIntBE(new Uint8Array(0))).toBe(0n)
  })

  it('0n encodes to empty bytes (no leading zero byte)', () => {
    expect(bigIntToBytesBE(0n)).toEqual(new Uint8Array(0))
  })

  it('decodes big-endian (most significant byte first)', () => {
    expect(bytesToBigIntBE(Uint8Array.from([0x01, 0x00]))).toBe(256n)
    expect(bytesToBigIntBE(Uint8Array.from([0x00, 0x01]))).toBe(1n)
  })

  it('round-trips arbitrary non-negative bigints, including values spanning many bytes', () => {
    for (const v of [1n, 255n, 256n, 65535n, 2n ** 64n, 2n ** 128n + 7n]) {
      expect(bytesToBigIntBE(bigIntToBytesBE(v))).toBe(v)
    }
  })

  it('bigIntToBytesBE produces the minimal encoding (no leading zero byte) for a value just under a byte boundary', () => {
    expect(bigIntToBytesBE(255n)).toEqual(Uint8Array.from([0xff]))
    expect(bigIntToBytesBE(256n)).toEqual(Uint8Array.from([0x01, 0x00]))
  })

  it('bigIntToBytesBE throws on a negative bigint', () => {
    expect(() => bigIntToBytesBE(-1n)).toThrow(RangeError)
  })

  it('leading zero bytes in the input are preserved by bytesToBigIntBE (they just contribute 0 to the value)', () => {
    expect(bytesToBigIntBE(Uint8Array.from([0x00, 0x00, 0x01]))).toBe(1n)
  })
})

describe('utf8', () => {
  it('encodes ASCII', () => {
    expect(utf8('AB')).toEqual(Uint8Array.from([0x41, 0x42]))
  })

  it('encodes multi-byte UTF-8 characters correctly', () => {
    expect(utf8('€')).toEqual(Uint8Array.from([0xe2, 0x82, 0xac]))
  })

  it('encodes the empty string to an empty array', () => {
    expect(utf8('')).toEqual(new Uint8Array(0))
  })
})

describe('base64ToBytes / bytesToBase64', () => {
  it('round-trips arbitrary bytes, including ones that need padding', () => {
    for (const bytes of [Uint8Array.from([1]), Uint8Array.from([1, 2]), Uint8Array.from([1, 2, 3]), Uint8Array.from([0, 255, 128, 64, 32])]) {
      expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes)
    }
  })

  it('encodes the empty array to the empty string and decodes back', () => {
    expect(bytesToBase64(new Uint8Array(0))).toBe('')
    expect(base64ToBytes('')).toEqual(new Uint8Array(0))
  })

  it('bytesToBase64 matches a known vector', () => {
    expect(bytesToBase64(utf8('hello'))).toBe('aGVsbG8=')
  })

  it('base64ToBytes matches a known vector', () => {
    expect(base64ToBytes('aGVsbG8=')).toEqual(utf8('hello'))
  })
})
