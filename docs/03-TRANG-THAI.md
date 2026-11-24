# Trạng thái (2026-11-24) và việc còn lại

## Yêu cầu gốc
Video các cháu, các con tặng cậu nhân sinh nhật. Mở đầu cinematic chớp giật kiểu CapCut, chữ bám theo âm nhạc; sau đó nhạc nhẹ đi cùng ảnh, lời chúc và video từng khoảnh khắc; có intro và outro trong một video.

## Đã xong
- Trailer v01: 59,5 s, 1080p60, có nhạc. File trong gói tư liệu: `out/trailer_v01_xem.mp4`.
- Lời nháp (`script/codex_loi.md`), gồm 14 lời dẫn theo ảnh, 3 lời kết, 6 lời chúc dài.
- 14 ảnh đã cân màu trong `assets/clean/` (không có p01, p10). Clip bóp vai 8 s và clip bé trai đã lọc tiếng.

## Dừng giữa chừng, chưa có kết quả
1. **Chấm độc lập trailer**: chính tả và dấu, chữ đè mặt, lệch nhịp đo bằng số (trung vị, p90), số lần chớp mỗi giây (an toàn ≤ 3), chỗ lặp, từ không khớp ảnh.
2. **Đo nhịp "Đi Về Nhà" và storyboard phần 2**: librosa đoán khoảng 83 BPM, **chưa kiểm** (có thể sai gấp đôi hoặc một nửa). Chỉ ghi mốc thời gian, không chép lời bài hát.

## Lỗi đã biết ở v01
- Giây 6: "ẤM HƠN" chạm mặt vài người ở ảnh nhóm.
- Giây 37,9: "CẬU KÍNH MẾN" **tạm đoán** cậu là người bên trái trong ảnh cũ p02.
- Trailer còn dùng ảnh gốc (`web/`), chưa chuyển sang ảnh đã cân màu (`clean/`).
- Chưa đo độ khớp nhịp và độ chớp.

## Chờ người dùng trả lời
1. Ảnh p02: cậu là người bên trái hay bên phải?
2. Ảnh p03: có người lớn tuổi ngồi xe lăn phía sau, có giữ không?
3. Lời chúc thật kèm tên từng cháu.
4. Nghe `assets/clean/v02_clean.mp4` và gõ lại nguyên văn lời bé. Máy chỉ đoán được "Chúc mừng…", "…mạnh khỏe", "Cảm ơn…", độ tin thấp.
5. Cảm giác về v01: giật vừa chưa, đoạn nào thích, đoạn nào chán?
6. Ảnh p01 (lâu đài cát): đề xuất bỏ.

## Thứ tự làm tiếp
1. Ghi feedback vào `docs/FEEDBACK.md` (nguyên văn, kèm giây).
2. Chấm độc lập → trailer v02.
3. Đo nhạc phần 2 → storyboard → **duyệt** → viết `app/src/scenes/memories.ts`.
4. Ghép hai phần (cầu nối từ màn đen cuối trailer), chỗ clip bé trai thì hạ nhạc để nghe giọng, outro.
5. Âm lượng khoảng −14 LUFS, chấm lần cuối, xuất bản giao.

## Bài học
- Agent làm ảnh báo p01 "chỉ còn đầu và vai", mở ra vẫn thấy đồ bơi; bản cắt đã bị xoá. Luôn mở file xem trước khi tin báo cáo.
- Whisper trả câu "Hãy subscribe…" cho đoạn không nghe rõ: đó là chữ bịa, đã loại.
- Ảnh contact sheet thu nhỏ không đủ để kết luận về dấu, viền tách nền: phải phóng khung gốc.
- Nhạc có bản quyền: xem trong gia đình khác với đăng công khai lên mạng.
