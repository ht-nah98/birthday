#!/usr/bin/env python3
"""Nối nhạc trailer v2 theo lưới phách (docs/04-STORYBOARD-TRAILER-v2.md, mục 2).

  [2 phách*3 im lặng] + M[0, 44.08) + M[36.08, 44.08) (lặp cao trào) + M[44.08, 53.9)
  + [2.0004 s im lặng] + M[53.9, hết)

Lưới phách 0.3334 s; 8.0016 s = 24 phách và 2.0004 s = 6 phách nên lưới liền mạch.
Đầu ra: audio/trailer_v2.wav, audio/trailer_v2.mp3 (xem trước), data/audio.json (bản đo đã ánh xạ lại;
bản gốc giữ ở data/audio_v1.json). Thời gian M = giây trong nhạc gốc, F = giây trong phim.
Dùng: python3 tools/splice_trailer.py [đường-dẫn-mp3-gốc]
"""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'audio/trailer.mp3')
P = 0.3334
PRE = 6 * P            # mở đầu im lặng
GAP = 6 * P            # kéo dài khoảng lặng trước cú đập cuối
DB36, DB44, SIL = 36.0772, 44.0788, 53.9
# (M bắt đầu, M kết thúc, độ lệch F - M); None = khoảng im lặng (F bắt đầu, độ dài)
REP = DB44 - DB36      # 8.0016 = 24 phách
SEGS = [(0.0, DB44, PRE), (DB36, DB44, PRE + REP), (DB44, SIL, PRE + REP), (SIL, None, PRE + REP + GAP)]


def build_audio(dur_m):
    os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
    fc, labels = [], []
    sr = 48000
    fc.append(f'anullsrc=r={sr}:cl=stereo,atrim=duration={PRE:.6f}[s0]'); labels.append('[s0]')
    for i, (a, b, _) in enumerate(SEGS):
        b = dur_m if b is None else b
        # 4 ms fade ở mỗi mép nối để không lách cách
        fc.append(f'[0:a]aresample={sr},atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS,'
                  f'afade=t=in:d=0.004,afade=t=out:st={b - a - 0.004:.6f}:d=0.004[a{i}]')
        labels.append(f'[a{i}]')
        if i == 2:
            fc.append(f'anullsrc=r={sr}:cl=stereo,atrim=duration={GAP:.6f}[s1]'); labels.append('[s1]')
    fc.append(''.join(labels) + f'concat=n={len(labels)}:v=0:a=1[out]')
    wav = os.path.join(ROOT, 'audio/trailer_v2.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', ';'.join(fc), '-map', '[out]',
                    '-c:a', 'pcm_s16le', wav], check=True)
    master(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '256k',
                    os.path.join(ROOT, 'audio/trailer_v2.mp3')], check=True)
    return wav


def master(wav, lufs=-14.0, tp=-1.5):
    """Chuẩn hoá âm lượng 2 lượt (EBU R128): nhạc gốc −8.9 LUFS, đỉnh +0.8 dBTP → méo trên điện thoại."""
    import json as _j, re as _re
    flt = f'loudnorm=I={lufs}:TP={tp}:LRA=11'
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', wav, '-af', flt + ':print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    m = _j.loads(_re.search(r'\{[^{}]*"input_i"[^{}]*\}', r.stderr).group(0))
    flt2 = (flt + f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    tmp = wav + '.tmp.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-af', flt2, '-ar', '48000', '-c:a', 'pcm_s16le', tmp], check=True)
    os.replace(tmp, wav)


def m2f_list(ts, dur_m):
    """Ánh xạ danh sách thời điểm M sang F (một điểm có thể xuất hiện hai lần do đoạn lặp)."""
    out = []
    for a, b, off in SEGS:
        b = dur_m if b is None else b
        out += [t + off for t in ts if a <= t < b]
    return sorted(out)


def remap_json(dur_m, dur_f):
    v1 = os.path.join(ROOT, 'data/audio_v1.json')
    if not os.path.exists(v1):
        os.rename(os.path.join(ROOT, 'data/audio.json'), v1)
    d = json.load(open(v1))
    fps = d['fps']
    out = dict(d)
    out['duration'] = round(dur_f, 4)
    out['source'] = 'tools/splice_trailer.py (ánh xạ từ data/audio_v1.json)'
    out['splice'] = {'pre': PRE, 'gap': GAP, 'segments_M_to_F': [[a, b, off] for a, b, off in SEGS]}
    # lưới phách liền mạch trên toàn phim
    b0 = d['beats'][0] + PRE
    n = int((dur_f - b0) / P) + 1
    out['beats'] = [round(b0 + k * P, 4) for k in range(n)]
    out['downbeats'] = [round(b0 + k * P, 4) for k in range(0, n, 6)]
    out['sections'] = [{'name': 'all', 'start': 0, 'end': out['duration']}]
    for k, ev in d['onsets'].items():
        res = []
        for a, b, off in SEGS:
            b = dur_m if b is None else b
            res += [[round(t + off, 4), s] for t, s in ev if a <= t < b]
        out['onsets'][k] = sorted(res)
    for key in ('rms', 'low', 'mid', 'high', 'vocal', 'drums', 'bass', 'other'):
        arr = d[key]
        res = [0.0] * round(PRE * fps)
        for i, (a, b, _) in enumerate(SEGS):
            b = len(arr) / fps if b is None else b
            res += arr[round(a * fps):round(b * fps)]
            if i == 2:
                res += [0.0] * round(GAP * fps)
        out[key] = res
    json.dump(out, open(os.path.join(ROOT, 'data/audio.json'), 'w'), ensure_ascii=False)
    return out


if __name__ == '__main__':
    dur_m = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', SRC]))
    wav = build_audio(dur_m)
    dur_f = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]))
    out = remap_json(json.load(open(os.path.join(ROOT, 'data/audio_v1.json' if os.path.exists(os.path.join(ROOT, 'data/audio_v1.json')) else 'data/audio.json')))['duration'], dur_f)
    print(f'M {dur_m:.3f}s -> F {dur_f:.3f}s; beats {len(out["beats"])}, rms frames {len(out["rms"])}')
    print('mốc F: cú đập đầu', round(PRE + 0.07, 3), '| lặp cao trào', round(DB44 + PRE, 3), '| im lặng chèn',
          round(SIL + PRE + REP, 3), '| cú đập cuối', round(55.1 + PRE + REP + GAP, 3))
