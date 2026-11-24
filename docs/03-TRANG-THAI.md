# Trạng thái (2026-11-24) và việc còn lại

## Yêu cầu gốc
Video các cháu, các con tặng cậu (Đoàn Đức Hưng, trên màn hình ghi **CẬU HƯNG**) nhân sinh nhật. Phần 1 là trailer cinematic dựng bằng code theo chất pdoom, ảnh chỉ thỉnh thoảng xuất hiện. Phần 2 là ảnh và clip trên nền "Đi Về Nhà". Có intro và outro trong một video. Góp ý nguyên văn: `docs/FEEDBACK.md`.

## Đã xong
- **Trailer v2, 71,5 s** (storyboard `docs/04-STORYBOARD-TRAILER-v2.md`, đã duyệt):
  - Lời chúc nguyên văn ở `script/loi_chuc.md` → `app/src/scenes/v2/cues.ts`.
  - 9 plate trong `app/src/scenes/v2/` (p01…p09), dùng chung `kit.ts`.
  - Nhạc nối theo lưới phách: `tools/splice_trailer.py` → `audio/trailer_v2.wav`, `data/audio.json`. Bản đo gốc ở `data/audio_v1.json`.
  - Bỏ nến. Ảnh thật chỉ xuất hiện ở câu "khoảnh khắc đáng nhớ" (p08, 8 ảnh).
- Render trên WSL2 bằng GPU: `tools/wsl_render.sh`.
- Trailer v1 cũ vẫn xem được bằng `?v=1`.

- **Trailer v03** (`out/trailer_v03_xem.mp4`, 71,5 s, −14 LUFS): v02 cộng thêm chân dung Cậu ghép từ chữ lời chúc (`glyphs.ts`, `portraits.ts`), xuất hiện 5 lần, và bộ đếm 24 / 11 (`countdown.ts`). Tắt bằng `?glyph=0`. Lịch ở storyboard mục 7.
- v02 (`out/trailer_v02_xem.mp4`): bản chính thức trước khi thêm chân dung.
- Render bản chính thức: `tools/render_chunks.sh vXX` (từng đoạn 8 s, tự chạy lại đoạn lỗi) với Vite đóng băng cổng 5392 (`PDOOM_FREEZE=1`). Sửa code thì phải khởi động lại server đó.

## Đang làm
1. Chờ người dùng góp ý vòng cuối trailer (v03).

## Chờ người dùng trả lời
1. Nghe chỗ nối nhạc (46,08 s và khoảng lặng 63,9–65,9 s) xem có lộ không.
2. Ở p02, bảng "từ tiếp theo" trên chữ "thương" có ứng viên "ăn cơm chưa?", "về nhà chưa?", "(im lặng)": giữ không?
3. Ảnh p03 (người lớn tuổi ngồi xe lăn phía sau): hiện chưa dùng.
4. Lời nháp cũ `script/codex_loi.md`: bỏ hay giữ cho phần 2?
5. Clip bé trai `v02`: cần gõ lại nguyên văn lời bé.

## Thứ tự làm tiếp
1. Chấm độc lập v02, sửa, rồi render bản chính thức (`tools/render_trailer.sh v02`, motion blur 8 khung con).
2. Phần 2: đo nhịp "Đi Về Nhà" → storyboard → **duyệt** → `app/src/scenes/memories.ts`.
3. Ghép hai phần: đốm cam cuối trailer là ánh sáng mở phần 2. Hạ nhạc ở chỗ clip bé trai.
4. Âm lượng khoảng −14 LUFS, chấm lần cuối, xuất bản giao.

## Bài học
- Quad instanced vẽ theo toạ độ px (y hướng xuống) bị đảo chiều tam giác: phải đặt `side: DoubleSide`, nếu không thì không ra hình và không báo lỗi.
- Cửa sổ Chromium render (WSL, chế độ headed) mà bị đóng thì render đứt giữa chừng: render từng đoạn để chạy lại được.
- Agent làm ảnh báo p01 "chỉ còn đầu và vai", mở ra vẫn thấy đồ bơi; bản cắt đã bị xoá. **Luôn mở file xem trước khi tin báo cáo.**
- Whisper trả câu "Hãy subscribe…" cho đoạn không nghe rõ: đó là chữ bịa, đã loại.
- Ảnh contact sheet thu nhỏ không đủ để kết luận về dấu, viền tách nền: phải phóng khung gốc.
- Nhạc có bản quyền: xem trong gia đình khác với đăng công khai lên mạng.
- Flash cộng trắng làm cả khung xám: cú đập dùng đẩy phơi sáng (`hitPost` trong kit).
- GLSL `pow(x, 2.0)` với x âm cho NaN trên đường GPU này: dùng `x*x`.

## 2026-11-24: phần 2 + bản ghép v01
- `out/phan2_v01_xem.mp4` (4:45, −13,9 LUFS): lời chúc trên "Đi Về Nhà". `out/sinhnhat_v01_xem.mp4` (5:57, −14,0 LUFS): trailer v03 + phần 2.
- Bản đẹp song song: `DEP=1 tools/render_nhap.sh v01` (3 Chromium cùng lúc, khoảng 70 s cho mỗi đoạn 8 s) → `tools/render_p2.sh v01` → `tools/assemble.sh v01`.
