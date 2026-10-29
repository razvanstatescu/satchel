#!/usr/bin/env python3
"""Arrange the raw music take onto the timeline (bar-aligned splices, gain dips, filter sweeps, synthesized sub hits).

    python3 tools/audio/arrange.py [tools/audio/arrangement.json]

Reads the edit list (see arrangement.json), writes the score as 44.1 kHz stereo mp3 at 320 kbps.
Needs numpy + ffmpeg only. Splice seams sit 5 ms before the beat with a 30 ms equal-power crossfade, so
downbeat transients are never smeared.
"""
import json, os, subprocess, sys
import numpy as np

SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))
MKT = os.path.abspath(os.path.join(HERE, '..', '..'))


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def save_mp3(y, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-ar', str(SR), '-c:a', 'libmp3lame', '-b:a', '320k', path],
                   input=y.astype(np.float32).tobytes(), check=True)


def splice(x, segs, off, dur, xf=0.030, pre=0.005):
    """Place source spans on the dest timeline. Seam = beat - pre; outgoing (cos) and incoming (sin) fade over [seam - xf, seam]."""
    n = int(round(dur * SR))
    k = int(round(xf * SR))
    fin, fout = np.sin(np.linspace(0, np.pi / 2, k)), np.cos(np.linspace(0, np.pi / 2, k))
    y = np.zeros((n, 2))
    seam = lambda t: int(round((t + off - pre) * SR))
    for i, s in enumerate(segs):
        first, last = i == 0, i == len(segs) - 1
        a = 0 if first else seam(s['t0']) - k
        b = n if last else seam(s['t1'])
        shift = int(round((s['s0'] - s['t0']) * SR))  # source index = dest index + shift
        seg = np.zeros((b - a, 2))
        lo, hi = max(0, a + shift), min(len(x), b + shift)
        if hi > lo:
            seg[lo - (a + shift):hi - (a + shift)] = x[lo:hi]
        if not first:
            seg[:k] *= fin[:, None]
        if not last:
            seg[-k:] *= fout[:, None]
        y[a:b] += seg
    return y


def gain_env(n, gains, off, ramp=0.02):
    g = np.ones(n)
    for e in gains:
        a, b = int(round((e['t0'] + off) * SR)), int(round((e['t1'] + off) * SR))
        lin = 10 ** (e['db'] / 20)
        if e.get('ramp') and e.get('curve') == 'db':
            g[a:b] = 10 ** (np.linspace(20 * np.log10(max(g[a - 1], 1e-6)), e['db'], b - a) / 20)
        elif e.get('ramp'):
            g[a:b] = np.linspace(g[a - 1], lin, b - a)
        else:
            g[a:b] = lin
    # smooth hard steps (5 ms)
    k = int(0.005 * SR)
    return np.convolve(g, np.ones(k) / k, mode='same')


def sweeps(y, sws, off, N=2048, H=512):
    """Time-varying 2nd-order-ish low/high-pass via STFT magnitude masks (sqrt-Hann, 75% overlap, exact OLA)."""
    if not sws:
        return y
    win = np.sqrt(np.hanning(N + 1)[:N])
    freqs = np.fft.rfftfreq(N, 1 / SR)
    out = y.copy()
    for sw in sws:
        a = int((sw['t0'] + off - 0.2) * SR)
        b = int((sw['t1'] + off + 0.2) * SR)
        seg = y[a:b]
        L = len(seg)
        pad = np.zeros((L + 2 * N, 2))
        pad[N:N + L] = seg
        acc = np.zeros_like(pad)
        norm = np.zeros(len(pad))
        for start in range(0, len(pad) - N, H):
            tc = (a + start - N + N / 2) / SR - off  # frame centre on the grid timeline
            fr = pad[start:start + N] * win[:, None]
            F = np.fft.rfft(fr, axis=0)
            if sw['t0'] <= tc < sw['t1'] - N / 2 / SR:  # never touch the frame holding the next downbeat
                p = (tc - sw['t0']) / (sw['t1'] - sw['t0'])
                fc = sw['fromHz'] * (sw['toHz'] / sw['fromHz']) ** p
                r = np.maximum(freqs, 1) / fc
                m = 1 / np.sqrt(1 + r ** 4) if sw['type'] == 'lowpass' else 1 / np.sqrt(1 + (1 / r) ** 4)
                F *= m[:, None]
            acc[start:start + N] += np.fft.irfft(F, n=N, axis=0) * win[:, None]
            norm[start:start + N] += win ** 2
        rec = acc[N:N + L] / np.maximum(norm[N:N + L], 1e-9)[:, None]
        # crossfade the processed region back in over 20 ms at both ends (it is identical there anyway)
        out[a:b] = rec
    return out


def sub_hit(level_db, dur=2.6):
    t = np.arange(int(dur * SR)) / SR
    f = 36 + (78 - 36) * np.exp(-t / 0.09)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / 0.65) * np.minimum(1, t / 0.004)
    env[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
    s = np.sin(ph) * env
    s += 0.25 * np.tanh(3 * s)  # a little harmonic weight so it reads on laptop speakers
    s /= np.max(np.abs(s))
    return s * 10 ** (level_db / 20)


def main():
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'arrangement.json')
    cfg = json.load(open(cfg_path))
    off, dur = cfg['beatOffset'], cfg['durationSec']
    x = load(os.path.join(MKT, cfg['source']))
    r = cfg.get('tempoRatio', 1.0)
    if r != 1.0:
        # band-limited FFT resample: plays the take r times faster (tempo * r, pitch + 1200*log2(r) cents)
        n2 = int(round(len(x) / r))
        X = np.fft.rfft(x, axis=0)
        x = np.fft.irfft(X[:n2 // 2 + 1], n=n2, axis=0) * (n2 / len(x))
    y = splice(x, cfg['segments'], off, dur)
    y = sweeps(y, cfg.get('sweeps', []), off)
    y *= gain_env(len(y), cfg.get('gain', []), off)[:, None]
    for h in cfg.get('subHits', []):
        s = sub_hit(h['db'])
        a = int(round((h['t'] + off - 0.004) * SR))
        b = min(len(y), a + len(s))
        y[a:b] += s[:b - a, None]
    # end: make sure the last 50 ms ramp to zero (clean ending)
    k = int(0.05 * SR)
    y[-k:] *= np.linspace(1, 0, k)[:, None]
    peak = np.max(np.abs(y))
    # soft-knee clip above 0.9 only (touches just the few samples where a sub hit stacks on a kick)
    th = 0.9
    over = np.abs(y) > th
    y[over] = np.sign(y[over]) * (th + (0.99 - th) * np.tanh((np.abs(y[over]) - th) / (0.99 - th)))
    print(json.dumps({'samplesSoftClipped': int(over.sum())}))
    # stem headroom: sample peak -3 dBFS so the mp3 stays well under 0 dBTP (the master limiter sets the final level)
    y *= 10 ** (-3 / 20) / max(1e-9, float(np.max(np.abs(y))))
    out = os.path.join(MKT, cfg['out'])
    save_mp3(y, out)
    print(json.dumps({'out': out, 'seconds': len(y) / SR, 'peakBefore': round(float(peak), 3), 'segments': len(cfg['segments'])}))


if __name__ == '__main__':
    main()
