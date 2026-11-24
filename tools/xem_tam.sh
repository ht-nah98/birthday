#!/usr/bin/env bash
# Bản xem tạm: ghép các đoạn nháp liền nhau đã xong + nhạc + clip (clip nào nằm trong đoạn đã có) → out/phan2_nhap_tam_<giây>s.mp4
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; DIR="$ROOT/work/chunks_nhap_v01_nhap"; T=$(mktemp -d)
: > "$T/list.txt"
for a in $(seq 0 600 9000); do f="$DIR/c_$(printf %05d $a).mp4"
  n=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of csv=p=0 "$f" 2>/dev/null || echo 0)
  [ "$n" -gt 0 ] 2>/dev/null || break; echo "file '$f'" >> "$T/list.txt"; done
ffmpeg -v error -y -f concat -safe 0 -i "$T/list.txt" -c:v copy "$T/hinh.mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$T/hinh.mp4"); S=$(printf %.0f "$D")
OUT="$ROOT/out/phan2_nhap_tam_${S}s.mp4"
CLIPS=$(cd "$ROOT/app" && bun -e "import { CLIPS } from './src/scenes/p2/cues.ts'; console.log(JSON.stringify(CLIPS))")
FC=$(python3 - "$CLIPS" "$ROOT/data/p2_timing.json" "$D" <<'PY'
import json, sys
clips=json.loads(sys.argv[1]); seq=json.load(open(sys.argv[2]))['sequence']; D=float(sys.argv[3])
src={s['id']:s for s in seq if s['kind']=='clip'}; fc=[]; ins=[]; last='[0:v]'; i=0
for k,c in clips.items():
    if c['F0']>=D: continue
    i+=1; s=src[k]; w=c['win']; ins.append(s['src'])
    fc.append(f"[{i}:v]trim=start={s['a']}:end={s['b']},setpts=PTS-STARTPTS+{c['F0']}/TB,scale={w['w']}:{w['h']}:force_original_aspect_ratio=increase,crop={w['w']}:{w['h']}[c{i}]")
    fc.append(f"{last}[c{i}]overlay=x={w['x']}:y={w['y']}:eof_action=pass:enable='between(t,{c['F0']},{c['F0']+c['len']})'[v{i}]"); last=f'[v{i}]'
fc.append(f"{last}null[vo]")
print(json.dumps({'fc':';'.join(fc),'ins':ins}))
PY
)
mapfile -t INS < <(python3 -c "import json,sys;[print(x) for x in json.loads(sys.argv[1])['ins']]" "$FC")
ARGS=(); for x in "${INS[@]}"; do ARGS+=(-i "$ROOT/$x"); done
NA=$(( ${#INS[@]} + 1 ))
cd "$ROOT" && ffmpeg -v error -y -i "$T/hinh.mp4" "${ARGS[@]}" -i audio/phan2.wav -filter_complex "$(python3 -c "import json,sys;print(json.loads(sys.argv[1])['fc'])" "$FC")" \
  -map "[vo]" -map "$NA:a" -t "$D" -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart "$OUT"
rm -rf "$T"; echo "$OUT"
