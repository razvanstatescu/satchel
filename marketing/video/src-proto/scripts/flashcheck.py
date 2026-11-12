#!/usr/bin/env python3
"""Approximate WCAG 2.3.1 flash screen for a rendered clip (whole-frame average luminance only).

Usage (from marketing/video):  python3 -I src-proto/scripts/flashcheck.py out/proto/barrage-test-1080.mp4 [fps]

A general flash = a pair of opposing changes in relative luminance >= 0.1 where the darker side is < 0.8; the clip
passes if no 1-second window holds more than 3. This uses the frame AVERAGE, so a flash covering only part of the frame
(but > 25% of a 10 degree field) can be under-counted: use it as a screen, not a sign-off.
"""
import subprocess
import sys
import tempfile
import os

clip = sys.argv[1]
fps = int(sys.argv[2]) if len(sys.argv) > 2 else 30
with tempfile.TemporaryDirectory() as tmp:
    out = os.path.join(tmp, "y.txt")
    subprocess.run(
        ["ffmpeg", "-loglevel", "error", "-i", clip, "-vf", f"signalstats,metadata=print:key=lavfi.signalstats.YAVG:file={out}", "-f", "null", "-"],
        check=True,
    )
    ys = [float(l.split("=")[1]) for l in open(out) if "YAVG" in l]

lum = [max(0.0, min(1.0, (y - 16) / 219)) ** 2.2 for y in ys]  # limited-range luma -> approx relative luminance
ext = [(0, lum[0])] + [(i, lum[i]) for i in range(1, len(lum) - 1) if (lum[i] - lum[i - 1]) * (lum[i + 1] - lum[i]) < 0] + [(len(lum) - 1, lum[-1])]
trans = [(a[0], b[0], b[1] - a[1]) for a, b in zip(ext, ext[1:]) if abs(b[1] - a[1]) >= 0.1 and min(a[1], b[1]) < 0.8]
flashes, k = [], 0
while k < len(trans) - 1:
    if trans[k][2] * trans[k + 1][2] < 0:
        flashes.append((trans[k][0], trans[k + 1][1]))
        k += 2
    else:
        k += 1
worst = max((sum(1 for s, e in flashes if w <= s and e < w + fps) for w in range(len(lum))), default=0)
print(f"frames {len(lum)}  flashes {flashes}")
print(f"max flashes in any 1 s window: {worst}  ->  {'PASS' if worst <= 3 else 'FAIL'} (screen only)")
sys.exit(0 if worst <= 3 else 1)
