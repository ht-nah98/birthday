# Storyboard phần 2: ảnh + lời chúc trên "Đi Về Nhà" (2026-11-24)

Người dùng cho tự dựng (F9). Lời chúc nguyên văn: `script/loi_chuc_phan2.md`. Mốc, chữ, ảnh: `app/src/scenes/p2/cues.ts`.

## Âm thanh (`tools/splice_p2.py`)
Bài 205,6 s, khoảng 83,4 BPM (phách 0,7198 s). Cắt đúng phách, chèn 3 khoảng không nhạc:
- **86,11** (hết điệp khúc 1): clip rót rượu mừng, tiếng thật. Nhạc lùi 1,2 s trước khi cắt.
- **138,25** (nhạc tự trùng xuống trước điệp khúc 2): clip đấm lưng 10–24 s, tiếng thật.
- **160,40** (trước bridge): **15 s im lặng chỉ có chữ**, rồi clip bé trai, tiếng thật.
- **Điệp khúc cuối lặp thêm 4 ô nhịp** (M 172,55–183,97, nối ở 183,97 nơi "Đường về nhà là vào tim ta" hát lại), để đoạn kết đủ thời gian đọc 3 câu.

Tổng 285,2 s, −14 LUFS.

## Chương

| F (s) | Nhạc | Chương | Bố cục | Chữ |
|---|---|---|---|---|
| 0–24.3 | dạo + điệp khúc hát khẽ | c00-open | đốm cam (nối trailer) → dải phim ảnh xưa sepia | MỪNG SINH NHẬT CẬU HƯNG + 2 câu mở |
| 24.3–35.7 | rap 1 | c01-w01 | polaroid rơi theo ô nhịp | lời chúc 01 |
| 35.7–47.8 | rap 1 | c02-w02 | ba khung dọc (triptych) | lời chúc 02 |
| 47.8–59.3 | rap 1 | c03-w03 | ảnh giữa + "sticker" vui | lời chúc 03 |
| 59.3–70.0 | dạo điệp khúc | c04-w04 | lưới 2×2 khung vàng lật theo phách | lời chúc 04 tài lộc |
| 70.0–87.1 | điệp khúc 1 | c05-w05 | lưới ảnh Tết lật theo phách → hội tụ ảnh đông đủ | lời chúc 05 |
| 87.1–100.4 | không nhạc | c06-ruou | clip rót rượu dọc + nền mờ | — |
| 100.4–152.6 | rap 2 (về nhà, áp lực, hạnh phúc là được về nhà) | c07-thu | **lá thư của hai vợ chồng cháu**, ảnh theo ý từng đoạn | 5 đoạn thư |
| 152.6–167.8 | không nhạc | c09-damlung | clip đấm lưng + lời chúc dí dỏm | lời chúc 06 (nhấn "ngủ ngon, thở sâu, ăn ngon miệng") |
| 167.8–189.9 | điệp khúc 2 | c10-w07 | lớp ảnh chiều sâu (parallax) | lời chúc 07 |
| 189.9–225.6 | **im lặng 15 s**, rồi clip bé | c11-lang | chỉ chữ + đốm cam thở, rồi clip bé trai | "Mỗi người một lời chúc…", "Nhưng tất cả…" |
| 225.6–237.8 | bridge "Nhà có thể lớn…" | c12-w08 | ảnh toàn khung + dải chữ kiểu tài liệu | lời chúc 08 (phần 1) |
| 237.8–269.2 | điệp khúc cuối (lặp 1 vòng) | c13-ket | vàng dí dỏm → collage đổi ảnh theo từ khoá → câu cuối lá thư | 08b, "Mong rằng…", câu cuối thư |
| 269.2–285.2 | kết | c14-end | ảnh tụ thành chân dung ký tự (đối xứng trailer) → đốm cam tắt | Thương chúc…, CHÚC MỪNG SINH NHẬT CẬU HƯNG!, Happy Birthday!, đại gia đình |

## Quy trình xuất
1. `FILM=2 tools/render_chunks.sh v01`: hình, Vite đóng băng cổng 5392.
2. `tools/render_p2.sh v01`: đặt clip vào ô, ghép âm thanh → `out/phan2_v01_xem.mp4`.
3. `tools/assemble.sh v01`: trailer v03 + phần 2 → `out/sinhnhat_v01_xem.mp4`.

## Chưa chắc
- Ảnh người lớn tuổi ngồi xe lăn (10): tạm không dùng.
- Bé trai trong clip: không gắn tên (chưa xác nhận).

## Bài học
- Thời gian đọc: hiện từng chữ làm hụt giờ; lời chúc dài cho hiện cả đoạn (mờ vào 0,6 s) ngay đầu chương và giữ đến gần hết.
- Thiếu chỗ đọc thì kéo dài nhạc (lặp đúng ô nhịp), không cắt lời chúc.
- Vite không tự nhận file chương mới cho `import.meta.glob`: `touch app/src/timeline.ts`.
