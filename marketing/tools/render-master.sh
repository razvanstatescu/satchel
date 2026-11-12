#!/usr/bin/env bash
# Render the film with Remotion, then master the audio: true-peak limiter + two-pass loudnorm to -14 LUFS / -1 dBTP.
# Usage: tools/render-master.sh v3   ->  marketing/out/satchel-hypermotion-v3.mp4  (brand 1.0 film, src/)
#        (brand 2.0: SKIP_RENDER=1 reuses the rendered H0 and body parts and only re-joins and re-masters them;
#         ONLY_H0=1 renders H0 again and reuses the body part already at video/out/<name>-<tag>-body.mp4, which is right
#         only when nothing outside src2/scenes/H0 changed since that body was rendered)
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
if [[ "$ENTRY" == src2/* ]]; then
  # Brand 2.0 film = H0 (the cold open) + Body (H1 … E1), rendered separately and joined. H0's barrage pass is WebGL and
  # needs the GPU (--gl=angle; SwiftShader is 13–20× slower), but --gl=angle also changes the body's edge anti-aliasing
  # (0.6–2.7 % of pixels, PSNR 43–45 dB in H2, C1, T3 and E1; marketing/notes/intro-research/build.md), so the body keeps
  # the default renderer. The join is exact: video is stream-copied, audio decoded per part (no AAC priming gap).
  H0RAW="$ROOT/video/out/$NAME-$TAG-h0.mp4"
  BODYRAW="$ROOT/video/out/$NAME-$TAG-body.mp4"
  LIST="$ROOT/video/out/$NAME-$TAG-parts.txt"
  # SKIP_RENDER=1 re-joins and re-masters the existing parts without rendering them again.
  if [[ -z "${SKIP_RENDER:-}" ]]; then
    if [[ -n "${ONLY_H0:-}" && ! -f "$BODYRAW" ]]; then
      echo "ERROR: ONLY_H0 reuses the body part, but $BODYRAW does not exist (copy the last tag's body part there)"; exit 1
    fi
    npx remotion render "$ENTRY" H0 "$H0RAW" --codec=h264 --crf=16 --audio-bitrate=320k --concurrency=8 --gl=angle --port="${PORT:-3490}"
    # introTail: the ring-out of H0's reveal hit (it lands 7 frames before the join) continues on the body's clock
    if [[ -z "${ONLY_H0:-}" ]]; then
      npx remotion render "$ENTRY" Body "$BODYRAW" --props='{"introTail":true}' --codec=h264 --crf=16 --audio-bitrate=320k --concurrency=8 --port="${PORT:-3490}"
    fi
  fi
  # H0's exact length from its frame count: its AAC track is padded past the last frame (7.0 s is not a whole number of
  # 1024-sample AAC frames), so both the concat list and the audio trim use the picture's length, not the file's.
  H0DUR=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$H0RAW" \
    | python3 -c "import sys; print(int(sys.stdin.read().strip().rstrip(',')) / 30)")
  printf "file '%s'\nduration %s\nfile '%s'\n" "$H0RAW" "$H0DUR" "$BODYRAW" > "$LIST"
  VCAT="$ROOT/video/out/$NAME-$TAG-video.mp4"
  ffmpeg -v error -y -f concat -safe 0 -i "$LIST" -map 0:v -c:v copy "$VCAT"
  # The concat demuxer drops the first part's edit list, so the joined video's first frame sits at its B-frame delay
  # (0.042 s) while the decoded audio starts at 0: muxed in one step, every sound led its picture by ~1 frame (QA v5,
  # notes/qa-v5/verify-0116-end.md N1). Re-reading the joined video as a file makes ffmpeg drop that start offset, so
  # here the video starts at 0 like the audio. The check below fails the build if that ever stops being true.
  ffmpeg -v error -y -i "$VCAT" -i "$H0RAW" -i "$BODYRAW" \
    -filter_complex "[1:a]aresample=48000,atrim=end=${H0DUR},asetpts=PTS-STARTPTS[a1];[2:a]aresample=48000[a2];[a1][a2]concat=n=2:v=0:a=1[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 320k "$RAW"
  V0=$(ffprobe -v error -select_streams v:0 -show_entries frame=pts_time -read_intervals %+#1 -of default=nw=1:nk=1 "$RAW" | head -1 | tr -d ', ')
  python3 -c "import sys; sys.exit(0 if abs(float('$V0')) < 0.001 else 1)" \
    || { echo "ERROR: the joined video starts at ${V0} s, not 0: audio and picture would be out of sync"; exit 1; }
  python3 -I "$ROOT/video/src2/scenes/H0/qa/flashcheck.py" "$H0RAW" || echo "WARNING: H0 failed the flash screen (WCAG 2.3.1)"
else
  npx remotion render ${ENTRY:+"$ENTRY"} Main "$RAW" --codec=h264 --crf=16 --audio-bitrate=320k --concurrency=8 --port="${PORT:-3490}"
fi

read -r I TP LRA TH OFF < <(ffmpeg -hide_banner -i "$RAW" -af "${PRE},loudnorm=I=-14:TP=-1:LRA=11:print_format=json" -f null - 2>&1 \
  | sed -n '/^{/,/^}/p' | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
echo "pass 1: I=${I} TP=${TP} LRA=${LRA}"

ffmpeg -v error -y -i "$RAW" -c:v copy \
  -af "${PRE},loudnorm=I=-14:TP=-1:LRA=11:measured_I=${I}:measured_TP=${TP}:measured_LRA=${LRA}:measured_thresh=${TH}:offset=${OFF}:linear=true,aresample=48000" \
  -c:a aac -b:a 320k -movflags +faststart "$OUT"

ffmpeg -hide_banner -i "$OUT" -af loudnorm=I=-14:TP=-1:print_format=json -f null - 2>&1 | grep -E '"input_(i|tp)"'
ls -la "$OUT"
