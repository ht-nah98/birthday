#!/usr/bin/env python3
"""Âm thanh bản 2 (Da LAB - "Đời Là Đi"): 1 s im lặng + M[147.202, 213.8) của bài gốc, −14 LUFS.

Lưới phách đo bằng librosa trên đoạn 140–210 s: chu kỳ 0.559 s (107.3 BPM), ô nhịp bắt đầu ở 147.202
(chỗ nhạc cụ rút xuống, chỉ còn giọng: hợp cho 9 s mở màn pdoom). Câu 8 ô nhịp: 147.202 / 165.090 /
182.978 / 200.866. Nhạc cụ dày lên ở 156.146; điệp khúc "Ta đi vì ta là đi…" vào 174.034 và 191.922
(giọng hát từ phách thứ 2). Bài tự lắng ở 205–212.
M = giây trong bài gốc, F = giây trong phim: F = M − 146.202.
Đầu ra: audio/ban2.wav, audio/ban2.mp3, data/audio_b2.json.
"""
import json, os, subprocess
import librosa, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONG = os.path.join(ROOT, 'assets/ban2/music/doi_la_di.mp3')
VOC = os.path.join(ROOT, 'assets/ban2/music/sep/htdemucs/doi_la_di/vocals.wav')
M0, M1, LEAD, FADE = 147.202, 213.8, 1.0, 1.6
P = 0.559
OFF = LEAD - M0


def main():
    wav, mp3 = os.path.join(ROOT, 'audio/ban2.wav'), os.path.join(ROOT, 'audio/ban2.mp3')
    os.makedirs(os.path.dirname(wav), exist_ok=True)
    dur = LEAD + (M1 - M0)
    af = (f"atrim={M0}:{M1},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={M1 - M0 - FADE}:d={FADE},"
          f"adelay={int(LEAD * 1000)}:all=1,apad=whole_dur={dur},loudnorm=I=-14:TP=-1.0:LRA=11,aresample=48000")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SONG, '-af', af, '-ac', '2', wav], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-b:a', '256k', mp3], check=True)

    y, sr = librosa.load(wav, sr=22050)
    v, _ = librosa.load(VOC, sr=22050, offset=M0, duration=M1 - M0)
    v = np.concatenate([np.zeros(int(LEAD * sr)), v])
    D = len(y) / sr
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=220)); f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    t = np.arange(S.shape[1]) * 220 / sr; g = np.arange(int(D * 100) + 1) / 100

    def norm(x):
        return np.clip(x / max(np.percentile(x, 99), 1e-6), 0, 1.2)

    def band(a, b):
        return norm(np.sqrt((S[(f >= a) & (f < b)] ** 2).sum(0)))

    feat = {k: np.interp(g, t, x) for k, x in dict(rms=band(0, 11000), low=band(0, 150), mid=band(150, 2000), high=band(4000, 11000)).items()}
    rv = librosa.feature.rms(y=v, hop_length=220)[0]; feat['vocal'] = np.interp(g, np.arange(len(rv)) * 220 / sr, norm(rv))
    feat['drums'] = feat['low']; feat['bass'] = feat['low']; feat['other'] = feat['mid']
    k0 = int(np.ceil((0 - LEAD) / P))
    beats = [round(LEAD + k * P, 4) for k in range(0, int((D - LEAD) / P) + 1)]
    on = librosa.onset.onset_strength(y=y, sr=sr, hop_length=220); ot = librosa.times_like(on, sr=sr, hop_length=220)
    pk = librosa.util.peak_pick(on, pre_max=8, post_max=8, pre_avg=40, post_avg=40, delta=1.0, wait=12)
    lo = np.sqrt((S[f < 150] ** 2).sum(0)); lo = lo / np.percentile(lo, 99)
    kick = [[float(ot[p]), float(min(1, lo[min(p, len(lo) - 1)]))] for p in pk if lo[min(p, len(lo) - 1)] > 0.45]
    von = librosa.onset.onset_strength(y=v, sr=sr, hop_length=220); vt = librosa.times_like(von, sr=sr, hop_length=220)
    vpk = librosa.util.peak_pick(von, pre_max=4, post_max=4, pre_avg=20, post_avg=20, delta=0.8, wait=8)
    vocal = [[round(float(vt[p]), 3), 1.0] for p in vpk if vt[p] >= LEAD]
    F = lambda m: round(m + OFF, 4)
    out = dict(duration=round(D, 4), bpm=round(60 / P, 3), fps=100, beats=beats, downbeats=beats[::4],
               sections=[dict(name='open', start=0, end=F(156.146)), dict(name='build', start=F(156.146), end=F(174.034)),
                         dict(name='chorus1', start=F(174.034), end=F(191.922)), dict(name='chorus2', start=F(191.922), end=F(205.338)),
                         dict(name='outro', start=F(205.338), end=round(D, 4))],
               onsets=dict(kick=kick, snare=[], hat=[], vocal=vocal),
               source='splice_b2.py', **{k: x.round(4).tolist() for k, x in feat.items()})
    json.dump(out, open(os.path.join(ROOT, 'data/audio_b2.json'), 'w'))
    print(f'xong: {wav} ({D:.3f} s), {len(beats)} phách, {len(kick)} kick; điệp khúc F={F(174.034)} / {F(191.922)}')


if __name__ == '__main__':
    main()
