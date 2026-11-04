#!/usr/bin/env bash
# Render the film with Remotion, then master the audio: true-peak limiter + two-pass loudnorm to -14 LUFS / -1 dBTP.
# Usage: tools/render-master.sh v3   ->  marketing/out/satchel-hypermotion-v3.mp4  (brand 1.0 film, src/)
#        ENTRY=src2/index.ts NAME=satchel-2 tools/render-master.sh v1  ->  marketing/out/satchel-2-v1.mp4  (brand 2.0 film)
set -euo pipefail
TAG="${1:?usage: render-master.sh <tag>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENTRY="${ENTRY:-}"
NAME="${NAME:-satchel-hypermotion}"
RAW="$ROOT/video/out/$NAME-$TAG-raw.mp4"
OUT="$ROOT/out/$NAME-$TAG.mp4"
PRE="alimiter=limit=0.82:attack=3:release=60:level=disabled"

cd "$ROOT/video"
npx tsc --noEmit
npx remotion render ${ENTRY:+"$ENTRY"} Main "$RAW" --codec=h264 --crf=16 --audio-bitrate=320k --concurrency=8 --port="${PORT:-3490}"

read -r I TP LRA TH OFF < <(ffmpeg -hide_banner -i "$RAW" -af "${PRE},loudnorm=I=-14:TP=-1:LRA=11:print_format=json" -f null - 2>&1 \
  | sed -n '/^{/,/^}/p' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
echo "pass 1: I=${I} TP=${TP} LRA=${LRA}"

ffmpeg -v error -y -i "$RAW" -c:v copy \
  -af "${PRE},loudnorm=I=-14:TP=-1:LRA=11:measured_I=${I}:measured_TP=${TP}:measured_LRA=${LRA}:measured_thresh=${TH}:offset=${OFF}:linear=true,aresample=48000" \
  -c:a aac -b:a 320k -movflags +faststart "$OUT"

ffmpeg -hide_banner -i "$OUT" -af loudnorm=I=-14:TP=-1:print_format=json -f null - 2>&1 | grep -E '"input_(i|tp)"'
ls -la "$OUT"
