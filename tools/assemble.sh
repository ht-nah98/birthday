#!/usr/bin/env bash
# Ghép video cuối: trailer (v03) + phần 2. Cả hai đã −14 LUFS; chỗ nối là đen + đốm cam ở cả hai phía.
# Dùng: tools/assemble.sh v01 [trailer_v03]
set -euo pipefail
V="${1:?cần số bản, ví dụ v01}"; T="${2:-trailer_v03}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
A="$ROOT/out/$T.mp4"; B="$ROOT/out/phan2_$V.mp4"; OUT="$ROOT/out/sinhnhat_${V}_xem.mp4"
[ -e "$OUT" ] && { echo "đã có $OUT"; exit 1; }
ffmpeg -v error -i "$A" -i "$B" -filter_complex \
  "[0:v]fps=60,format=yuv420p,setsar=1[a];[1:v]fps=60,format=yuv420p,setsar=1[b];[0:a]aresample=48000[x];[1:a]aresample=48000[y];[a][x][b][y]concat=n=2:v=1:a=1[v][au]" \
  -map "[v]" -map "[au]" -c:v libx264 -preset medium -b:v 14M -maxrate 20M -bufsize 28M -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 256k -movflags +faststart "$OUT"
echo "xong: $OUT ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT") s)"
