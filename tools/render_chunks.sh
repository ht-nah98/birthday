#!/usr/bin/env bash
# Render bản chính thức theo từng đoạn 8 s rồi nối lại, ghép nhạc. Đoạn nào đứt (cửa sổ Chromium bị đóng,
# GPU lỗi) thì tự chạy lại đúng đoạn đó; chạy lại cả script thì bỏ qua các đoạn đã xong.
# Dùng: tools/render_chunks.sh v02      (cần Vite đóng băng ở cổng 5392, xem render_trailer.sh)
# LƯU Ý: trên WSL2 Chromium phải mở cửa sổ (thu nhỏ) mới dùng được GPU. ĐỪNG đóng cửa sổ đen đó khi đang render.
set -uo pipefail
# FILM=2 tools/render_chunks.sh v01 → phần 2 (ảnh + lời chúc): out/phan2_v01_hinh.mp4 (chỉ hình, chưa có clip/âm thanh;
# tools/render_p2.sh ghép clip + âm thanh).
V="${1:?cần số bản, ví dụ v02}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FILM="${FILM:-1}"
if [ "$FILM" = 2 ]; then NAME=phan2; QUERY="--query film=2"; AJSON=audio_p2.json; AUDIO=phan2.wav; else NAME=trailer; QUERY=""; AJSON=audio.json; AUDIO=trailer_v2.wav; fi
OUT="$ROOT/out/${NAME}_$V.mp4"; [ "$FILM" = 2 ] && OUT="$ROOT/out/${NAME}_${V}_hinh.mp4"
[ -e "$OUT" ] && { echo "đã có $OUT"; exit 1; }
DIR="$ROOT/work/chunks_${NAME}_$V"; [ "$FILM" = 1 ] && DIR="$ROOT/work/chunks_$V"; mkdir -p "$DIR"
FPS=60; DUR=$(python3 -c "import json;print(json.load(open('$ROOT/data/$AJSON'))['duration'])")
NF=$(python3 -c "print(round($DUR*$FPS))"); STEP=480   # 8 s
cd "$ROOT/app"
: > "$DIR/list.txt"
for ((a=0; a<NF; a+=STEP)); do
  b=$(( a+STEP < NF ? a+STEP : NF )); f="$DIR/c_$(printf %05d $a).mp4"
  echo "file '$f'" >> "$DIR/list.txt"
  want=$((b-a))
  for try in 1 2 3; do
    if [ -e "$f" ] && [ "$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)" = "$want" ]; then break; fi
    rm -f "$f"; echo "đoạn $a–$b (lần $try)"
    PDOOM_EXTRA_ARGS="--start-minimized" "$ROOT/tools/wsl_render.sh" video --url http://localhost:5392 $QUERY \
      --from "$(python3 -c "print($a/$FPS)")" --to "$(python3 -c "print($b/$FPS)")" --fps $FPS \
      --samples 8 --shutter 0.4 --crf 17 --preset medium --noaudio --out "$f" 2>&1 | tr '\r' '\n' | grep -E "wrote|error|CRASH|navigated" | grep -v "GL Driver"
  done
  [ "$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null)" = "$want" ] || { echo "LỖI: đoạn $a hỏng sau 3 lần"; exit 1; }
done
if [ "$FILM" = 2 ]; then
  ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -c:v copy "$OUT"; echo "xong hình: $OUT (tiếp: tools/render_p2.sh $V)"; exit 0
fi
ffmpeg -v error -y -f concat -safe 0 -i "$DIR/list.txt" -i "$ROOT/audio/$AUDIO" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
ffmpeg -v error -i "$OUT" -c:v libx264 -preset medium -b:v 14M -maxrate 20M -bufsize 28M -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a copy -movflags +faststart "$ROOT/out/${NAME}_${V}_xem.mp4"
echo "xong: $OUT và ${NAME}_${V}_xem.mp4"
