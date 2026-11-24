"""Nhạc trailer → data/audio.json (lưới nhịp, đường năng lượng, onset). Chạy: python3 tools/analyze_audio.py"""
import json, pathlib
import librosa, numpy as np
R = pathlib.Path(__file__).resolve().parent.parent
PHASE, PERIOD = 0.07, 0.3334  # đo bằng cách quét pha/chu kỳ để tổng lực onset trên lưới lớn nhất
y, sr = librosa.load(R / 'audio/trailer.mp3', sr=22050); n = int(len(y) / sr * 100) + 1
S = np.abs(librosa.stft(y, n_fft=2048, hop_length=220)); f = librosa.fft_frequencies(sr=sr, n_fft=2048)
def band(a, b):
    v = np.sqrt((S[(f >= a) & (f < b)] ** 2).sum(0)); return np.clip(v / np.percentile(v, 99), 0, 1.2)
t = np.arange(S.shape[1]) * 220 / sr; g = np.arange(n) / 100
feat = {k: np.interp(g, t, v).round(4).tolist() for k, v in dict(rms=band(0, 11000), low=band(0, 150), mid=band(150, 2000), high=band(4000, 11000)).items()}
for k in ('vocal', 'drums', 'bass', 'other'): feat[k] = feat['rms']  # chưa tách stem
beats = (PHASE + np.arange(0, 178) * PERIOD).round(4).tolist()
on = librosa.onset.onset_strength(y=y, sr=sr, hop_length=220); ot = librosa.times_like(on, sr=sr, hop_length=220)
pk = librosa.util.peak_pick(on, pre_max=8, post_max=8, pre_avg=40, post_avg=40, delta=1.0, wait=12)
(R / 'data/audio.json').write_text(json.dumps(dict(duration=59.52, bpm=179.96, fps=100, beats=beats, downbeats=beats[::6],
    sections=[dict(name='all', start=0, end=59.52)], onsets=dict(kick=[[float(ot[p]), float(min(1, on[p] / 12))] for p in pk], snare=[], hat=[], vocal=[]), **feat)))
