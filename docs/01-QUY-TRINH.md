# Quy trình đã làm

Nguyên lý: **mỗi khung hình là hàm thuần của thời gian `t`**. Nhờ vậy xem trước và bản render giống nhau, và sửa một đoạn không phải làm lại cả phim.

1. **Học mẫu.** Bóc tách hai video trong repo `pdoom-video` (bảng dưới).
2. **Gom tư liệu.** Đặt tên lại `p01…p16`, `v01`, `v02`; tìm ảnh trùng (`assets/MANIFEST.md`).
3. **Đo nhạc trước khi nghĩ hình.** librosa: onset, năng lượng, quét pha/chu kỳ lưới.
4. **Viết lời.** Codex nhận bản tả bằng chữ (không nhận ảnh) trong `script/codex_brief.md`, trả về `script/codex_loi.md`. Chọn phương án 1, chỉnh để từ khớp ảnh.
5. **Tách nền** bằng rembg trên máy. Ảnh nhóm hỏng mặt nên bỏ, chỉ giữ ảnh 1–2 người.
6. **Dựng cảnh** thành các hồi (`act1`…`act9`) theo mốc nhạc.
7. **Soi contact sheet, sửa, soi lại** (4 vòng), rồi render cả bài.
8. **Chấm độc lập** bằng agent khác người dựng: *đã giao nhưng bị dừng giữa chừng, chưa có kết quả.*

## Rút ra từ video mẫu
| | pdoom (2:37) | Video mẫu (5:00) |
|---|---|---|
| Chất | Đen, trắng ngà, một màu cam | Nhân vật trong thế giới chữ và hạt |
| Nhịp | 132 BPM, đổi cảnh lớn rơi vào phách | ~2,7 s một ý hình |
| Chuyển cảnh | Cắt cứng, chớp, whip, zoom xuyên | Tan hạt rồi tụ lại |
| Chuyển động YDIF trung vị / đỉnh (đo ở 640×360) | 3,0 / 206,9 | 5,5 / 74,2 |

Bài học: "giật" mà vẫn sang là nhờ **tương phản yên và nổ**, không phải giật liên tục. Mượn thêm **một vật xuyên suốt**: ở đây là ngọn nến, xuất hiện ở hai khoảng lặng của nhạc.

## Nhạc trailer đã đo
Lưới `t = 0,07 + k × 0,3334 s` (3 nhịp gần 1 s). Điểm quan trọng: im lặng khoảng **16,1–17,5 s**; bùng ở 18 s; lắng 26–32 s; cao trào 36–52 s; im lặng khoảng **53,5–54,5 s**; cú đập cuối **55,1 s**.

| Giây | Hồi | Hình |
|---|---|---|
| 0–8 | act1 | Bốn cú đập đen trắng, nhiễu hình |
| 8–16 | act2 | Hoàng hôn đẩy máy chậm, rồi bùng |
| 16–18 | nến | "Cậu có biết không?" |
| 18–26 | act4 | 12 từ, cắt mỗi 0,33 s: ảnh, chữ kín khung, ảnh trong chữ |
| 26–32 | act5 | Bay qua hành lang ảnh 3D |
| 32–36 | act6 | Tường ảnh lật theo nhịp |
| 36–52 | act7 | 16 cụm, mỗi giây một cụm, bốn kiểu xoay vòng |
| 52–55 | nến | "Ước đi, cậu ơi", nến tắt |
| 55–59,5 | act9 | Tiêu đề vàng 3D |

## Cách làm việc
- Ảnh gia đình chỉ xử lý trên máy; không gửi lên AI cloud khi chưa được đồng ý. Không dùng AI vẽ lại mặt người.
- Không bịa tên, tuổi, quan hệ. Lời chúc phải khớp điều nhìn thấy trong ảnh.
- Chữ không đè mặt. Không ghi đè bản render cũ (`v01`, `v02`…).
- Người dựng không tự chấm bài. **Đọc lại sản phẩm của agent trước khi tin báo cáo** (xem 03, mục bài học).
