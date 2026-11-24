#!/usr/bin/env bash
# Phần 2, bước cuối: đặt 3 clip (tiếng thật đã nằm trong audio/phan2.wav) vào các ô đen engine chừa sẵn,
# ghép âm thanh, xuất bản xem. Dùng: tools/render_p2.sh v01   (cần out/phan2_v01_hinh.mp4 từ
# FILM=2 tools/render_chunks.sh v01). Vị trí ô và giờ clip lấy từ app/src/scenes/p2/cues.ts (CLIPS).
set -euo pipefail
V="${1:?cần số bản, ví dụ v01}"; ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="$ROOT/out/phan2_${V}_hinh.mp4"; OUT="$ROOT/out/phan2_$V.mp4"; XEM="$ROOT/out/phan2_${V}_xem.mp4"
[ -e "$IN" ] || { echo "thiếu $IN"; exit 1; }
[ -e "$OUT" ] && { echo "đã có $OUT"; exit 1; }
cd "$ROOT"
CLIPS=$(cd app && bun -e "import { CLIPS } from './src/scenes/p2/cues.ts'; console.log(JSON.stringify(CLIPS))")
TIMING="$ROOT/data/p2_timing.json"
ARGS=$(python3 - "$CLIPS" "$TIMING" <<'EOF'
import json, sys
clips = json.loads(sys.argv[1]); seq = json.load(open(sys.argv[2]))['sequence']
src = {s['id']: s for s in seq if s['kind'] == 'clip'}
inputs, fc, last = [], [], '[0:v]'
for i, (k, c) in enumerate(clips.items(), start=1):
    s = src[k]; w = c['win']
    inputs += ['-i', s['src']]
    f0 = c['F0']; a, b = s['a'], s['b']
    fc.append(f"[{i}:v]trim=start={a}:end={b},setpts=PTS-STARTPTS+{f0}/TB,fps=60,scale={w['w']}:{w['h']}:force_original_aspect_ratio=increase,"
              f"crop={w['w']}:{w['h']},format=yuv420p[c{i}]")
    fc.append(f"{last}[c{i}]overlay=x={w['x']}:y={w['y']}:eof_action=pass:enable='between(t,{f0},{f0 + c['len']})'[v{i}]")
    last = f'[v{i}]'
print(json.dumps({'inputs': inputs, 'fc': ';'.join(fc), 'out': last}))
EOF
)
mapfile -t INS < <(python3 -c "import json,sys; [print(x) for x in json.loads(sys.argv[1])['inputs']]" "$ARGS")
FC=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['fc'])" "$ARGS")
VO=$(python3 -c "import json,sys; print(json.loads(sys.argv[1])['out'])" "$ARGS")
NA=$(( ${#INS[@]} / 2 + 1 ))
ffmpeg -v error -y -i "$IN" "${INS[@]}" -i "$ROOT/audio/phan2.wav" -filter_complex "$FC" -map "$VO" -map "$NA:a" \
  -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
ffmpeg -v error -i "$OUT" -c:v libx264 -preset medium -b:v 14M -maxrate 20M -bufsize 28M -pix_fmt yuv420p \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 -c:a copy -movflags +faststart "$XEM"
echo "xong: $OUT và $XEM"
