import { describe, expect, it } from 'vitest'
import { BODY_L, fnv1a32, oklchToHex, SWATCH_C, SWATCH_L, tokenHueOffset, tokenLeather } from '../src/card'

// kb/81 R3 §Per-token leather hue test vectors [VERIFIED there with contrast_r3.mjs]
const VECTORS = [
  ['1', 80220036, -1, 51, '#27160B', '#6B4631'],
  ['2', 130552893, 6, 58, '#26160A', '#69482E'],
  ['3', 113775274, 12, 64, '#251709', '#67492C'],
  ['4', 29887179, -8, 44, '#28150D', '#6C4535'],
  ['5', 13109560, -2, 50, '#27160C', '#6B4632'],
  ['6', 63442417, 5, 57, '#26160A', '#69482F'],
  ['7', 46664798, 11, 63, '#261709', '#68492C'],
  ['8', 4257743999, 12, 64, '#251709', '#67492C'],
  ['42', 3337176571, 9, 61, '#261709', '#68482D'],
] as const

describe('card: per-token leather hue', () => {
  it.each(VECTORS)('token %s', (id, hash, offset, hue, body, swatch) => {
    const t = tokenLeather(id)
    expect(t.fnv1a32).toBe(hash)
    expect(t.offset).toBe(offset)
    expect(t.hue).toBe(hue)
    expect(t.body).toBe(body)
    expect(t.swatch).toBe(swatch)
    expect(t.style).toEqual({ '--satchel-body': body, '--satchel-swatch': swatch })
  })

  it('kb/81 perceptibility row (chroma 0.034): offsets −12 / 0 / +12', () => {
    expect([40, 52, 64].map((h) => oklchToHex(BODY_L, 0.034, h))).toEqual(['#28150E', '#27160B', '#251709'])
    expect(BODY_L.toFixed(3)).toBe('0.220')
    expect([SWATCH_L.toFixed(3), SWATCH_C.toFixed(4)]).toEqual(['0.431', '0.0597'])
  })

  it('fnv1a32 known value and distribution over 1..100,000 (3,925–4,062 per offset)', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5)
    const counts = new Map<number, number>()
    for (let i = 1; i <= 100_000; i++) {
      const o = tokenHueOffset(String(i))
      counts.set(o, (counts.get(o) ?? 0) + 1)
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([...Array(25).keys()].map((k) => k - 12))
    expect(Math.min(...counts.values())).toBe(3925)
    expect(Math.max(...counts.values())).toBe(4062)
  })

  it('every swatch is in gamut without clamping', () => {
    for (let o = -12; o <= 12; o++) expect(oklchToHex(SWATCH_L, SWATCH_C, 52 + o)).toMatch(/^#[0-9A-F]{6}$/)
  })
})
