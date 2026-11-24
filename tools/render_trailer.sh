#!/usr/bin/env bash
# Render trọn trailer 1080p60 + bản nhẹ. Dùng: tools/render_trailer.sh v02   (không ghi đè bản cũ)
set -euo pipefail; V="${1:?cần số bản, ví dụ v02}"; cd "$(dirname "$0")/../app"; mkdir -p ../out
[ -e "../out/trailer_$V.mp4" ] && { echo "đã có trailer_$V.mp4"; exit 1; }
bun scripts/render.ts video --url http://localhost:5391 --samples 8 --shutter 0.4 --crf 17 --preset medium --audio ../audio/trailer.mp3 --out "../out/trailer_$V.mp4"
ffmpeg -v error -i "../out/trailer_$V.mp4" -c:v libx264 -preset medium -b:v 14M -maxrate 20M -bufsize 28M -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a copy -movflags +faststart "../out/trailer_${V}_xem.mp4"
