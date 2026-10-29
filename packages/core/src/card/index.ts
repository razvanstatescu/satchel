/**
 * Per-token leather hue (kb/81 R3 §Per-token leather hue, B-04). Shared by CSS (inline custom properties) and the
 * /api/card SVG, so both render the same hex.
 *
 *   offset = (fnv1a32(utf8("satchel:" + tokenId)) mod 25) − 12        (−12…+12)
 *   hue    = 52 + offset                                                (OKLCH degrees)
 *   body   = oklch(0.220, 0.034, hue)   Night card body
 *   swatch = oklch(0.431, 0.0597, hue)  mini-card swatch (both themes)
 * Hex is gamut-clamped by bisecting chroma.
 */

export const LEATHER_HUE = 52
/** brand Night `surface` (kb/81 R3): the card body takes its lightness */
export const BRAND_SURFACE_NIGHT = '#221812'
/** brand `leather-light`: the swatch takes its lightness and chroma */
export const BRAND_LEATHER_LIGHT = '#6a4730'
/** body chroma: 1.7 × the surface chroma (0.0197 → 0.034) so the hue can show at all */
export const BODY_C = 0.034

/** FNV-1a 32-bit over UTF-8 bytes (offset basis 0x811c9dc5, prime 0x01000193). */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5
  for (const b of new TextEncoder().encode(s)) {
    h ^= b
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function tokenHueOffset(tokenId: string): number {
  return (fnv1a32(`satchel:${tokenId}`) % 25) - 12
}

export function tokenHue(tokenId: string): number {
  return LEATHER_HUE + tokenHueOffset(tokenId)
}

/** OKLCH → linear sRGB (Björn Ottosson's OKLab matrices, 10 digits: the precision the kb/81 vectors were made with). */
function oklchToLinearSrgb(l: number, c: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b
  const s_ = l - 0.0894841775 * a - 1.291485548 * b
  const L = l_ ** 3
  const M = m_ ** 3
  const S = s_ ** 3
  return [
    4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
    -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
    -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
  ]
}

const inGamut = (rgb: number[], eps = 1e-6) => rgb.every((v) => v >= -eps && v <= 1 + eps)

function gammaEncode(v: number): number {
  const x = Math.min(1, Math.max(0, v))
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055
}

/** OKLCH → `#RRGGBB` (uppercase), clamping out-of-gamut colours by bisecting chroma at fixed L and h. */
export function oklchToHex(l: number, c: number, h: number): string {
  let rgb = oklchToLinearSrgb(l, c, h)
  if (!inGamut(rgb)) {
    let lo = 0
    let hi = c
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (inGamut(oklchToLinearSrgb(l, mid, h))) lo = mid
      else hi = mid
    }
    rgb = oklchToLinearSrgb(l, lo, h)
  }
  return `#${rgb.map((v) => Math.round(gammaEncode(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** `#rrggbb` → OKLCH [L, C, h°]. */
export function hexToOklch(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => linearize(Number.parseInt(h.slice(i, i + 2), 16) / 255)) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const C = Math.hypot(A, B)
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return [L, C, H]
}

/** L of the Night surface (≈ 0.220) */
export const BODY_L = hexToOklch(BRAND_SURFACE_NIGHT)[0]
/** L and C of leather-light (≈ 0.431 / 0.0597) */
export const [SWATCH_L, SWATCH_C] = hexToOklch(BRAND_LEATHER_LIGHT)

export interface TokenLeather {
  tokenId: string
  fnv1a32: number
  offset: number
  hue: number
  /** Night card body */
  body: string
  /** swatch (both themes) */
  swatch: string
  /** ready-to-inline CSS custom properties */
  style: { '--satchel-body': string; '--satchel-swatch': string }
}

export function tokenLeather(tokenId: string): TokenLeather {
  const hash = fnv1a32(`satchel:${tokenId}`)
  const offset = (hash % 25) - 12
  const hue = LEATHER_HUE + offset
  const body = oklchToHex(BODY_L, BODY_C, hue)
  const swatch = oklchToHex(SWATCH_L, SWATCH_C, hue)
  return { tokenId, fnv1a32: hash, offset, hue, body, swatch, style: { '--satchel-body': body, '--satchel-swatch': swatch } }
}
