#!/usr/bin/env bash
# Bản nháp nhanh phần 2: 30 fps, 1 mẫu/khung, 3 tiến trình song song → out/phan2_<V>_hinh.mp4 (rồi tools/render_p2.sh <V>).
set -uo pipefail
V="${1:?ví dụ v01_nhap}"; J="${J:-3}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# DEP=1: bản đẹp (60 fps, 8 mẫu, màn trập 0.4, crf 17), dùng lại các đoạn của render_chunks.sh (work/chunks_phan2_<V>)
DEP="${DEP:-0}"
if [ "$DEP" = 1 ]; then DIR="$ROOT/work/chunks_phan2_$V"; FPS=60; STEP=480; Q="--samples 8 --shutter 0.4 --crf 17 --preset medium"
else DIR="$ROOT/work/chunks_nhap_$V"; FPS=30; STEP=600; Q="--samples 1 --shutter 0 --crf 20 --preset veryfast"; fi
mkdir -p "$DIR"; OUT="$ROOT/out/phan2_${V}_hinh.mp4"
[ -e "$OUT" ] && { echo "đã có $OUT"; exit 1; }
DUR=$(python3 -c "import json;print(json.load(open('$ROOT/data/audio_p2.json'))['duration'])")
NF=$(python3 -c "print(round($DUR*$FPS))")
one() {  # a b
  local a=$1 b=$2 f="$DIR/c_$(printf %05d $1).mp4" want=$(( $2-$1 ))
  for try in 1 2 3; do
    [ -e "$f" ] && [ "$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)" = "$want" ] && return 0
    rm -f "$f"
    (cd "$ROOT/app" && PDOOM_EXTRA_ARGS="--start-minimized" "$ROOT/tools/wsl_render.sh" video --url http://localhost:5392 --query film=2 \
      --from "$(python3 -c "print($a/$FPS)")" --to "$(python3 -c "print($b/$FPS)")" --fps $FPS \
      $Q --noaudio --out "$f" 2>&1 | tr '\r' '\n' | grep -E "wrote|CRASH" )
  done
}
export -f one; export DIR ROOT FPS Q
: > "$DIR/list.txt"; jobs_in=()
for ((a=0; a<NF; a+=STEP)); do b=$(( a+STEP < NF ? a+STEP : NF )); echo "file '$DIR/c_$(printf %05d $a).mp4'" >> "$DIR/list.txt"; echo "$a $b"; done \
  | xargs -P "$J" -L 1 bash -c 'one $0 $1'
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -c:v copy "$OUT" && echo "xong hình: $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s)"
