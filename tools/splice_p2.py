#!/usr/bin/env python3
"""Âm thanh phần 2: "Đi Về Nhà" + 3 khoảng chèn (clip có tiếng thật / im lặng chỉ có chữ).

  [LEAD im lặng] M[0, 86.111)  ·  CHÈN A: clip rót rượu (tiếng thật)
  M[86.111, 138.252)            ·  CHÈN B: clip đấm lưng 10–24 s (tiếng thật)
  M[138.252, 160.403)           ·  CHÈN C: khoảng lặng chỉ có chữ + clip bé trai (tiếng thật)
  M[160.403, hết)  + TAIL im lặng

Điểm cắt đều nằm đúng phách (đo bằng librosa, chu kỳ 0.7198 s). Ở 138.25 nhạc tự trùng xuống; 86.11 cắt giữa
mạch nên nhạc lùi dần 1.2 s trước khi cắt. M = giây trong bài gốc, F = giây trong phim phần 2.
Đầu ra: audio/phan2.wav (−14 LUFS), audio/phan2.mp3, data/audio_p2.json, data/p2_timing.json.
"""
import json, os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONG = os.path.join(ROOT, 'hello/Đen x JustaTee - Đi Về Nhà (M V).mp3')
CLIP = {
    'ruou': ('hello/1795501915117_6743620051909020746_g1466060044457806724.mp4', 0.0, None),
    'damlung': ('hello/4255457585106795934.mp4', 10.0, 24.0),
    'be': ('hello/2aOboREnC4pFfg812ptAk6J0R5umbbgXt0H0nq9g.mp4', 0.0, None),
}
LEAD, TAIL, PAD = 1.0, 3.0, 0.6     # im lặng đầu, cuối; khoảng thở trước/sau mỗi clip
SILENT_CARD = 15.0                  # khoảng lặng chỉ có chữ trước clip bé (2 câu kết: 'Mỗi người…', 'Nhưng tất cả…')
# Điệp khúc cuối lặp thêm 4 ô nhịp M[172.547, 183.972) chèn ở 183.972 (chỗ 'Đường về nhà là vào tim ta' hát lại),
# để đoạn kết đủ thời gian đọc 3 câu (w08.b, ket.a, câu cuối lá thư).
REP = (172.547, 183.972)
CUTS = [86.111, 138.252, 160.403]
FADE_OUT = {86.111: 1.2, 138.252: 0.12, 160.403: 0.35}
SR = 48000


def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))


def plan():
    md = dur(SONG)
    clips = {}
    for k, (p, a, b) in CLIP.items():
        b = dur(os.path.join(ROOT, p)) if b is None else b
        clips[k] = dict(src=p, a=a, b=round(b, 3), len=round(b - a, 3))
    inserts = [
        dict(id='A', items=[('pad', PAD), ('clip', 'ruou'), ('pad', PAD)]),
        dict(id='B', items=[('pad', PAD), ('clip', 'damlung'), ('pad', PAD)]),
        dict(id='C', items=[('silent', SILENT_CARD), ('clip', 'be'), ('pad', PAD)]),
    ]
    seq, f = [], 0.0
    seq.append(dict(kind='silence', F=0.0, len=LEAD)); f = LEAD
    # mảnh nhạc theo thứ tự phim; sau mảnh i có thể có khoảng chèn
    pieces = [(0.0, CUTS[0], 0), (CUTS[0], CUTS[1], 1), (CUTS[1], CUTS[2], 2), (CUTS[2], REP[1], None), (REP[0], REP[1], None), (REP[1], md, None)]
    segs = []
    for m0, m1, ins in pieces:
        segs.append(dict(M0=m0, M1=m1, F0=round(f, 4), off=round(f - m0, 4)))
        seq.append(dict(kind='music', F=round(f, 4), M0=m0, M1=m1, len=round(m1 - m0, 4))); f += m1 - m0
        if ins is not None:
            for kind, v in inserts[ins]['items']:
                if kind == 'clip':
                    c = clips[v]; seq.append(dict(kind='clip', id=v, F=round(f, 4), **c)); f += c['len']
                else:
                    seq.append(dict(kind=kind, F=round(f, 4), len=v)); f += v
    seq.append(dict(kind='silence', F=round(f, 4), len=TAIL)); f += TAIL
    return md, segs, seq, round(f, 4)


def build(md, seq):
    ins, fc, labels = [SONG], [], []
    for i, s in enumerate(seq):
        L = f'[x{i}]'
        if s['kind'] in ('silence', 'pad', 'silent'):
            fc.append(f"anullsrc=r={SR}:cl=stereo,atrim=duration={s['len']:.6f}{L}")
        elif s['kind'] == 'music':
            fo = FADE_OUT.get(s['M1'], 0.004)
            fi = 0.004 if s['M0'] == 0 else 0.06
            if s['M1'] == REP[1] or s['M0'] in REP: fi, fo = (0.01 if s['M0'] in REP else fi), (0.01 if s['M1'] == REP[1] else fo)
            fc.append(f"[0:a]aresample={SR},atrim=start={s['M0']:.6f}:end={s['M1']:.6f},asetpts=PTS-STARTPTS,"
                      f"afade=t=in:d={fi},afade=t=out:st={s['len'] - fo:.6f}:d={fo}{L}")
        else:  # clip: tiếng thật, chuẩn hoá về mức lời nói rồi trộn nhẹ (không nhạc)
            ins.append(os.path.join(ROOT, s['src'])); k = len(ins) - 1
            fc.append(f"[{k}:a]aresample={SR},aformat=channel_layouts=stereo,atrim=start={s['a']:.6f}:end={s['b']:.6f},"
                      f"asetpts=PTS-STARTPTS,loudnorm=I=-18:TP=-2:LRA=11,aresample={SR},"
                      f"afade=t=in:d=0.15,afade=t=out:st={s['len'] - 0.25:.6f}:d=0.25{L}")
        labels.append(L)
    fc.append(''.join(labels) + f'concat=n={len(labels)}:v=0:a=1[out]')
    wav = os.path.join(ROOT, 'audio/phan2.wav')
    cmd = ['ffmpeg', '-v', 'error', '-y']
    for p in ins: cmd += ['-i', p]
    subprocess.run(cmd + ['-filter_complex', ';'.join(fc), '-map', '[out]', '-c:a', 'pcm_s16le', wav], check=True)
    import importlib.util
    spec = importlib.util.spec_from_file_location('st', os.path.join(ROOT, 'tools/splice_trailer.py'))
    st = importlib.util.module_from_spec(spec); spec.loader.exec_module(st)
    st.master(wav)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '256k', os.path.join(ROOT, 'audio/phan2.mp3')], check=True)


def analysis(segs, total, seq):
    import numpy as np
    raw = json.load(open(os.path.join(ROOT, 'data/p2_beats_raw.json')))
    beats_m = raw['beats']
    beats = sorted(round(b + s['off'], 4) for s in segs for b in beats_m if s['M0'] <= b < s['M1'])
    fps = 100
    y = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, 'audio/phan2.wav'), '-ac', '1', '-ar', '8000', '-f', 'f32le', '-'],
                       capture_output=True, check=True).stdout
    a = np.frombuffer(y, np.float32); hop = 80; n = len(a) // hop
    rms = np.sqrt((a[:n * hop].reshape(n, hop) ** 2).mean(1)); rms = np.clip(rms / np.percentile(rms, 99), 0, 1.2)
    feat = rms.round(4).tolist()
    out = dict(duration=total, bpm=60 / raw['period'], fps=fps, beats=beats, downbeats=beats[::4],
               sections=[dict(name='all', start=0, end=total)], onsets=dict(kick=[], snare=[], hat=[], vocal=[]),
               rms=feat, low=feat, mid=feat, high=feat, vocal=feat, drums=feat, bass=feat, other=feat,
               source='tools/splice_p2.py')
    json.dump(out, open(os.path.join(ROOT, 'data/audio_p2.json'), 'w'), ensure_ascii=False)
    json.dump(dict(total=total, segments=segs, sequence=seq), open(os.path.join(ROOT, 'data/p2_timing.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    md, segs, seq, total = plan()
    build(md, seq)
    analysis(segs, total, seq)
    real = dur(os.path.join(ROOT, 'audio/phan2.wav'))
    print(f'phần 2: {total:.3f} s (wav {real:.3f} s)')
    for s in seq: print(f"  F {s['F']:8.3f}  {s['kind']:7s} {s.get('id', '')} {s['len']:.3f}" + (f"  M {s['M0']}–{s['M1']}" if s['kind'] == 'music' else ''))
