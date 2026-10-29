# THROWAWAY (Phase 0, 2026-10-21): verify the brand fonts' variable axes, OpenType features and glyph coverage
# for kb/81 R3. Reads the TTFs from google/fonts main (downloaded to a scratch dir); writes nothing.
# Run: python3 research/spikes/ux-refs/calc/fonts_r3.py <dir-with-ttfs>
# Fetch the TTFs first (google/fonts main; OFL), into any scratch dir:
#   curl -L -o Bricolage.ttf  'https://raw.githubusercontent.com/google/fonts/main/ofl/bricolagegrotesque/BricolageGrotesque%5Bopsz%2Cwdth%2Cwght%5D.ttf'
#   curl -L -o Instrument.ttf 'https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentsans/InstrumentSans%5Bwdth%2Cwght%5D.ttf'
#   curl -L -o SplineMono.ttf 'https://raw.githubusercontent.com/google/fonts/main/ofl/splinesansmono/SplineSansMono%5Bwght%5D.ttf'
# Results recorded in kb/81 R3 §Typography (2026-10-21). Served-subset check: the fonts.googleapis.com css2 unicode-range
# blocks (latin, latin-ext, vietnamese) exclude U+2248; `&text=≈₿` returns a 16,152-byte variable woff2 with just those glyphs.
import struct, sys, os

def tables(b):
    n = struct.unpack('>H', b[4:6])[0]
    t = {}
    for i in range(n):
        tag, _, off, ln = struct.unpack('>4sIII', b[12 + 16*i: 28 + 16*i])
        t[tag.decode()] = (off, ln)
    return t

def fvar(b, t):
    off, _ = t['fvar']
    _, _, axoff, _res, axcount, axsize = struct.unpack('>HHHHHH', b[off:off+12])
    out = []
    for i in range(axcount):
        p = off + axoff + i*axsize
        tag, mn, df, mx = struct.unpack('>4siii', b[p:p+16])
        out.append((tag.decode(), mn/65536, df/65536, mx/65536))
    return out

def features(b, t, name):
    if name not in t: return []
    off, _ = t[name]
    flo = struct.unpack('>H', b[off+6:off+8])[0]
    p = off + flo
    n = struct.unpack('>H', b[p:p+2])[0]
    return sorted({b[p+2+6*i:p+6+6*i].decode() for i in range(n)})

def cmap_has(b, t, cps):
    off, _ = t['cmap']
    n = struct.unpack('>H', b[off+2:off+4])[0]
    best = None
    for i in range(n):
        pid, eid, so = struct.unpack('>HHI', b[off+4+8*i: off+12+8*i])
        fmt = struct.unpack('>H', b[off+so:off+so+2])[0]
        if fmt in (4, 12) and (best is None or fmt == 12): best = (fmt, off+so)
    fmt, p = best
    have = set()
    if fmt == 12:
        ng = struct.unpack('>I', b[p+12:p+16])[0]
        for i in range(ng):
            s, e, _ = struct.unpack('>III', b[p+16+12*i: p+28+12*i])
            for cp in cps:
                if s <= cp <= e: have.add(cp)
    else:
        segx2 = struct.unpack('>H', b[p+6:p+8])[0]; seg = segx2//2
        ends = struct.unpack('>%dH' % seg, b[p+14:p+14+segx2])
        starts = struct.unpack('>%dH' % seg, b[p+16+segx2:p+16+2*segx2])
        for cp in cps:
            for s, e in zip(starts, ends):
                if s <= cp <= e: have.add(cp); break
    return have

CHARS = {'≈ U+2248': 0x2248, '− U+2212': 0x2212, 'thin space U+2009': 0x2009, '· U+00B7': 0xB7, '… U+2026': 0x2026,
         '→ U+2192': 0x2192, '↗ U+2197': 0x2197, '₿ U+20BF': 0x20BF, 'Ξ U+039E': 0x39E, '◎ U+25CE': 0x25CE, '№ U+2116': 0x2116, '✓ U+2713': 0x2713}
d = sys.argv[1]
for fn, label in [('Bricolage.ttf', 'Bricolage Grotesque'), ('Instrument.ttf', 'Instrument Sans'), ('SplineMono.ttf', 'Spline Sans Mono')]:
    b = open(os.path.join(d, fn), 'rb').read(); t = tables(b)
    print(f'## {label} ({fn}, {len(b)} bytes)')
    print('  axes:', ', '.join(f'{a} {mn:g}–{mx:g} (default {df:g})' for a, mn, df, mx in fvar(b, t)))
    g = features(b, t, 'GSUB'); print('  GSUB features:', ' '.join(g))
    print('  tnum:', 'tnum' in g, '| zero:', 'zero' in g, '| lnum:', 'lnum' in g, '| case:', 'case' in g)
    have = cmap_has(b, t, CHARS.values())
    print('  glyphs:', ' · '.join(f"{k} {'yes' if v in have else 'NO'}" for k, v in CHARS.items()))
