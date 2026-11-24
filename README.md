# Video sinh nhật tặng cậu

Phim gồm hai phần dựng **bằng code**: (1) trailer cinematic chớp giật theo nhạc, (2) phần ảnh và lời chúc nhẹ nhàng, kèm intro và outro.

| Phần | Tình trạng |
|---|---|
| 1. Trailer **v2** 71,5 s, dựng hoàn toàn bằng code (chất pdoom), lời chúc nguyên văn | 9 plate đã dựng, đang chấm và chỉnh (v01 cũ: `?v=1`) |
| 2. Ảnh + clip (nhạc "Đi Về Nhà") | Chưa dựng, **chưa có storyboard** |
| Ghép intro + outro | Chưa làm |

Đọc tiếp: [docs/03-TRANG-THAI.md](docs/03-TRANG-THAI.md) (việc còn lại, câu hỏi chờ trả lời) · [docs/01-QUY-TRINH.md](docs/01-QUY-TRINH.md) · [docs/02-CONG-NGHE.md](docs/02-CONG-NGHE.md)

## Chạy lại ở máy khác
Cần: [bun](https://bun.sh), Google Chrome, ffmpeg. Muốn làm lại tư liệu: ImageMagick, Python có `librosa`, `rembg`, `Pillow`.

```sh
git clone https://github.com/ht-nah98/birthday.git && cd birthday
unzip /đường-dẫn/birthday_assets.zip        # ảnh, clip, nhạc: KHÔNG có trong repo
cd app && bun install
python3 ../tools/splice_trailer.py          # (một lần) nối audio/trailer.mp3 → audio/trailer_v2.wav
PDOOM_NO_HMR=1 bunx vite --port 5391        # xem trực tiếp: http://localhost:5391/?t=20  (space phát/dừng, ←/→ tua)
../tools/render_trailer.sh v03              # render 1080p60; trên WSL2 tự dùng tools/wsl_render.sh (GPU)
```
Xem nhanh vài khung, không cần render cả phim:
```sh
bun scripts/render.ts sheet --url http://localhost:5391 --times 0.15,6.1,18.2,37.9,55.6 --cols 3 --out ../work/sheet.png
```

## Sửa ở đâu
| Muốn sửa | File |
|---|---|
| Lời chúc (nguyên văn) và mốc thời gian | `script/loi_chuc.md` → `app/src/scenes/v2/cues.ts` |
| Hình từng đoạn | `app/src/scenes/v2/p01-open.ts` … `p09-finale.ts` (bảng ở `docs/04-STORYBOARD-TRAILER-v2.md`) |
| Chữ, đốm cam, cú đập dùng chung | `app/src/scenes/v2/kit.ts` |
| Nối nhạc, lưới nhạc | `tools/splice_trailer.py`, `tools/analyze_audio.py` → `data/audio.json` |
| Trailer v1 cũ | `app/src/scenes/trailer.ts`, `words.ts` (`?v=1`) |

## Bản quyền và riêng tư
- Engine lấy từ [pdoom-video](https://www.youtube.com/watch?v=5EoO5413dBY) (MIT, xem `app/LICENSE-pdoom`). Font giữ giấy phép OFL.
- Ảnh gia đình, video trẻ em và nhạc không được commit (`.gitignore`). Nếu muốn đưa lên, hãy chuyển repo sang **private** trước.
