# Video sinh nhật tặng cậu

Phim gồm hai phần dựng **bằng code**: (1) trailer cinematic chớp giật theo nhạc, (2) phần ảnh và lời chúc nhẹ nhàng, kèm intro và outro.

| Phần | Tình trạng |
|---|---|
| 1. Trailer 59,5 s | Có bản thử **v01**. Chưa qua chấm độc lập, chờ feedback |
| 2. Ảnh + lời chúc (nhạc "Đi Về Nhà") | Chưa dựng. Có lời nháp, ảnh và clip đã làm sạch; **chưa có storyboard** |
| Ghép intro + outro | Chưa làm |

Đọc tiếp: [docs/03-TRANG-THAI.md](docs/03-TRANG-THAI.md) (việc còn lại, câu hỏi chờ trả lời) · [docs/01-QUY-TRINH.md](docs/01-QUY-TRINH.md) · [docs/02-CONG-NGHE.md](docs/02-CONG-NGHE.md)

## Chạy lại ở máy khác
Cần: [bun](https://bun.sh), Google Chrome, ffmpeg. Muốn làm lại tư liệu: ImageMagick, Python có `librosa`, `rembg`, `Pillow`.

```sh
git clone https://github.com/ht-nah98/birthday.git && cd birthday
unzip /đường-dẫn/birthday_assets.zip        # ảnh, clip, nhạc: KHÔNG có trong repo
cd app && bun install
bunx vite                                   # xem trực tiếp: http://localhost:5173/?t=18  (space phát/dừng, ←/→ tua)
../tools/render_trailer.sh v02              # render 1080p60 (RTX 4070 Ti: khoảng 3 phút)
```
Xem nhanh vài khung, không cần render cả phim:
```sh
bun scripts/render.ts sheet --url http://localhost:5391 --times 0.15,6.1,18.2,37.9,55.6 --cols 3 --out ../work/sheet.png
```

## Sửa ở đâu
| Muốn sửa | File |
|---|---|
| Chữ trên trailer, ảnh đi với từng từ | `app/src/scenes/words.ts` |
| Hình, hiệu ứng, thời điểm cắt | `app/src/scenes/trailer.ts` (`act1` … `act9`) |
| Tâm nhìn và độ phóng từng ảnh | bảng `PH` và `STRIP` đầu `trailer.ts` |
| Lưới nhạc | `tools/analyze_audio.py` → `data/audio.json` |
| Lời chúc nháp | `script/codex_loi.md` |

## Bản quyền và riêng tư
- Engine lấy từ [pdoom-video](https://www.youtube.com/watch?v=5EoO5413dBY) (MIT, xem `app/LICENSE-pdoom`). Font giữ giấy phép OFL.
- Ảnh gia đình, video trẻ em và nhạc không được commit (`.gitignore`). Nếu muốn đưa lên, hãy chuyển repo sang **private** trước.
