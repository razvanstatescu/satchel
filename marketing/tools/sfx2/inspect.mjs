// Hear-proxy inspector for SFX files (we cannot listen, so we read the waveform and spectrum).
//   node tools/sfx2/inspect.mjs [--env 20] [--win 50] [--f0 lo-hi] [--peaks] [--bands] [--from s] [--to s] file...
// Per file: duration; the envelope (peak dB per --env ms bin, relative to the file peak); the spectral centroid (kHz)
// and dominant frequency (Hz) per --win ms window; with --f0, an autocorrelation pitch track (Hz) in lo-hi Hz;
// with --peaks, the six strongest spectral peaks per 100 ms; with --bands, RMS per band relative to the whole file.
// '.' marks windows that are too quiet to measure.
import { execFileSync } from 'node:child_process';

const SR = 44100;
const args = process.argv.slice(2), files = [], opt = { env: 20, win: 50 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--env' || a === '--win' || a === '--from' || a === '--to') opt[a.slice(2)] = Number(args[++i]);
  else if (a === '--f0') { const [lo, hi] = args[++i].split('-').map(Number); opt.f0 = { lo, hi }; }
  else if (a === '--peaks' || a === '--bands') opt[a.slice(2)] = true;
  else files.push(a);
}
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const h = i + k + len / 2, ur = re[i + k], ui = im[i + k], vr = re[h] * cr - im[h] * ci, vi = re[h] * ci + im[h] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[h] = ur - vr; im[h] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function spectrum(x, a, N) { // power spectrum of a Hann-windowed frame starting at a
  const re = new Float64Array(N), im = new Float64Array(N); let e = 0;
  for (let i = 0; i < N && a + i < x.length; i++) { re[i] = x[a + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N)); e += re[i] ** 2; }
  fft(re, im); const p = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) p[k] = re[k] ** 2 + im[k] ** 2;
  return { p, e };
}
function f0At(x, a, lo, hi) { // normalized autocorrelation peak over lags for lo-hi Hz, on a 3-period window
  const maxLag = Math.round(SR / lo), minLag = Math.round(SR / hi), W = Math.min(3 * maxLag, x.length - a - maxLag);
  if (W < maxLag) return null;
  let best = 0, bestLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < W; i++) { const u = x[a + i], v = x[a + i + lag]; s += u * v; e1 += u * u; e2 += v * v; }
    const r = s / Math.sqrt(e1 * e2 + 1e-12);
    if (r > best) { best = r; bestLag = lag; }
  }
  if (best < 0.5) return null;
  // parabolic interpolation around the best lag
  const r = (lag) => { let s = 0, e1 = 0, e2 = 0; for (let i = 0; i < W; i++) { const u = x[a + i], v = x[a + i + lag]; s += u * v; e1 += u * u; e2 += v * v; } return s / Math.sqrt(e1 * e2 + 1e-12); };
  const y0 = r(bestLag - 1), y1 = best, y2 = r(bestLag + 1), d = (y0 - y2) / (2 * (y0 - 2 * y1 + y2) || 1);
  return SR / (bestLag + (Number.isFinite(d) ? d : 0));
}
for (const path of files) {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-af', 'pan=mono|c0=0.5*c0+0.5*c1', '-'], { maxBuffer: 1 << 28 });
  let x = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
  if (opt.from != null || opt.to != null) x = x.slice(Math.round((opt.from ?? 0) * SR), opt.to != null ? Math.round(opt.to * SR) : x.length);
  let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  const w = Math.round((SR * opt.env) / 1000), env = [];
  for (let a = 0; a < x.length; a += w) { let p = 0; for (let i = a; i < Math.min(x.length, a + w); i++) p = Math.max(p, Math.abs(x[i])); env.push(Math.round(20 * Math.log10(p / pk + 1e-9))); }
  const N = 2048, hop = Math.round((SR * opt.win) / 1000), cen = [], dom = [], f0 = [];
  for (let a = 0; a < x.length; a += hop) {
    const { p, e } = spectrum(x, a, N);
    if (e < 1e-7 * N * pk * pk) { cen.push('.'); dom.push('.'); } else {
      let t = 0, c = 0, best = 0, bk = 0;
      for (let k = 1; k < N / 2; k++) { t += p[k]; c += p[k] * k; if (p[k] > best) { best = p[k]; bk = k; } }
      cen.push(Math.round(((c / t) * SR) / N / 100) / 10); dom.push(Math.round((bk * SR) / N));
    }
    if (opt.f0) { const f = f0At(x, a, opt.f0.lo, opt.f0.hi); f0.push(f ? f.toFixed(1) : '.'); }
  }
  console.log(`\n${path.split('/').pop()}  ${(x.length / SR).toFixed(3)} s  peak ${(20 * Math.log10(pk)).toFixed(1)} dBFS (mono sum)`);
  console.log(`  env ${opt.env}ms: ${env.join(' ')}`);
  console.log(`  centroid kHz /${opt.win}ms: ${cen.join(' ')}`);
  console.log(`  dominant Hz /${opt.win}ms: ${dom.join(' ')}`);
  if (opt.f0) console.log(`  f0 Hz /${opt.win}ms: ${f0.join(' ')}`);
  if (opt.peaks) {
    for (let a = 0; a + 4096 <= x.length; a += Math.round(0.1 * SR)) {
      const { p } = spectrum(x, a, 4096), m = [];
      for (let k = 2; k < 2047; k++) if (p[k] > p[k - 1] && p[k] > p[k + 1]) m.push([p[k], k]);
      const top = m.sort((u, v) => v[0] - u[0]).slice(0, 6).map(([, k]) => Math.round((k * SR) / 4096)).sort((u, v) => u - v);
      console.log(`  ${(a / SR).toFixed(1)}s peaks Hz: ${top.join(' ')}`);
    }
  }
  if (opt.bands) {
    const { p } = (() => { // average power spectrum over the file
      const acc = new Float64Array(2048); let n = 0;
      for (let a = 0; a + 4096 <= x.length || (a === 0 && n === 0); a += 2048) { const s = spectrum(x, a, 4096); s.p.forEach((v, k) => (acc[k] += v)); n++; if (a + 4096 > x.length) break; }
      return { p: acc };
    })();
    const tot = p.reduce((s, v) => s + v, 0), band = (lo, hi) => { let s = 0; for (let k = 0; k < p.length; k++) { const f = (k * SR) / 4096; if (f >= lo && f < hi) s += p[k]; } return (10 * Math.log10(s / tot + 1e-12)).toFixed(1); };
    console.log(`  bands dB: <200 ${band(0, 200)} | 200-500 ${band(200, 500)} | 0.5-2k ${band(500, 2000)} | 2-8k ${band(2000, 8000)} | >8k ${band(8000, 22050)}`);
  }
}
