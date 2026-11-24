#!/usr/bin/env bash
# Render trọn trailer v2 1080p60 + bản nhẹ. Dùng: tools/render_trailer.sh v02   (không ghi đè bản cũ)
# Cần Vite riêng, ĐÓNG BĂNG (không watcher, không reload giữa chừng):
#   cd app && PDOOM_NO_HMR=1 PDOOM_FREEZE=1 bunx vite --port 5392 --strictPort
# Trên WSL2 dùng wrapper GPU (tools/wsl_render.sh); máy Linux thường: đặt RENDER="bun scripts/render.ts".
set -euo pipefail -o pipefail; V="${1:?cần số bản, ví dụ v02}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"; mkdir -p "$ROOT/out"
[ -e "$ROOT/out/trailer_$V.mp4" ] && { echo "đã có trailer_$V.mp4"; exit 1; }
RENDER="${RENDER:-$ROOT/tools/wsl_render.sh}"
cd "$ROOT/app"
$RENDER video --url http://localhost:5392 --samples 8 --shutter 0.4 --crf 17 --preset medium --audio ../audio/trailer_v2.wav --out "../out/trailer_$V.mp4"
ffmpeg -v error -i "../out/trailer_$V.mp4" -c:v libx264 -preset medium -b:v 14M -maxrate 20M -bufsize 28M -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a aac -b:a 256k -movflags +faststart "../out/trailer_${V}_xem.mp4"
