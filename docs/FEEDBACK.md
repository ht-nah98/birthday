# Feedback của người dùng (ghi nguyên văn)

## Vòng 1 – 2026-11-24, về trailer v01

### F1. Ngọn nến (16–18 s và 52–55 s)
> "Tôi thích dựng ngọn nến là công nghệ code threeJs cơ chứ không phải ảnh xấu xí này. Bạn biết video pdoom chứ?"

- Hiện trạng: nến là một shader 2D phẳng (`flame` trong `app/src/scenes/trailer.ts:122`). Thân nến là hình chữ nhật có sọc, nhìn như ảnh vẽ dẹt, không có khối, không có ánh sáng thật.
- Hướng sửa: dựng nến **3D thật bằng three.js** theo chất pdoom (tham chiếu `/mnt/d/Propose-an-idea/media/ref_pdoom.mp4`).
- Trạng thái: thay bởi F2 (bỏ hẳn nến).

### F2. Hướng mới cho cả trailer
> "Ở phần cinematic này, toi không cần quá nhiều ảnh, tôi chỉ cần các đoạn căng thẳng, cinematic, công nghệ code kiểu tương lai, ảnh chỉ thi thoảng mới addon thôi. Các ảnh sẽ để phía đằng sau hết. Không cần nến đâu, bạn tự tư duy, sáng tạo, xây dựng không gian thời gian, dựng các thể loại nào thật epic công nghệ, đẳng cấp vào. Bạn phân tích thật kĩ lười chúc tôi nói để ghép vào video một cách hợp lyus, điệu nghệ như 1 chuyên gia editor nhé."

- Tham chiếu: https://github.com/mexicat/pdoom-video (TREATMENT.md).
- Lời chúc mới, bản gốc: `script/loi_chuc.md`. Thay toàn bộ chữ cũ trong `words.ts`.
- Kết quả: storyboard `docs/04-STORYBOARD-TRAILER-v2.md`.

### F3. Duyệt storyboard
> "đồng ý nối nhạc 71s, tên đúng rồi, Đoàn Đức Hưng, nhưng có thể ghi là Cậu Hưng nhé"


## Vòng 2 – 2026-11-24, sau khi xem bản xem thử v02 (trước vòng sửa của bản chấm độc lập)

### F4
> "Tôi tưởng chỉ tạo video thôi mà bạn đang làm gì đó nhỉ. Sao bật local host xong đen xì"

- Nguyên nhân: localhost là trình xem trước khi dựng; phim mở bằng 2 s đen (cold open) và trình xem đứng ở giây 0 cho tới khi bấm phím cách. Người dùng chỉ cần file video trong `out/`.
- Bài học: luôn đưa đường dẫn file video để xem; không để người dùng phải dùng công cụ dựng.

### F5
> "okk triển khai đi nhé. Khá đẹp khá mới mẻ Sau đó đúc kết lại tôi sẽ đưa feedback thêm để cải thiện các vòng cuối trailer nhé"

- Hướng v2 được chấp nhận. Việc tiếp: xuất bản chính thức v02, tóm tắt, chờ góp ý vòng cuối.

## Vòng 3 – 2026-11-24, thêm chân dung Cậu và bộ đếm ngày

### F6
> "sau khi hoàn thành tôi muốn bạn giúp tôi update thêm các ảnh này vào trong trailer, bạn biết kiểu dùng các kí tự toán học để vẽ lại ảnh đúng không. Bạn có thể cắt ghép lấy nguyên ảnh chân dung, hoặc làm thế nào đó 1 cách phù hợp, hợp lý với nhạc. Kiểu thi thoảng xuất hiện các hình ảnh của Cậu tôi ở 1 vài nhịp hoặc khung hình. Hình ảnh kiểu được cấu thành bởi các hạt kí hiệu, hoặc element hoặc tan ra tụ lại hiệu ứng ấy."
> "Có thể là ký tự toán hoặc kí tự phù hợp với chất lượng và video của chúng ta. Không nhất thiết là toán đâu nhé. Bạn tự bóc tách chất lượng hình ảnh để tìm phù hợp"
> "\"D:\Video mẫu.mp4\" kiểu kiểu video này nè. Cùng công nghệ pdoom đó"

- 4 ảnh mới: `assets/src/h01–h04.jpg` (gốc ở Downloads của người dùng). Bản cắt chỉ lấy Cậu: `assets/cut/`, `assets/web/hXX.png` (rembg trên máy, không gửi đi đâu).
- Video mẫu: người và vật dựng bằng chữ mono li ti dày đặc; hạt chữ nổ tung, bay, tụ lại.
- Làm: `app/src/scenes/v2/glyphs.ts` (chân dung ghép bằng chữ của lời chúc, viền bằng nét ─╲│╱), `portraits.ts` (lịch xuất hiện).

### F7
> "Xong cái đoạn cuối video trailer là bộ đếm ngày 24/11 rồi nổ chúc mừng sinh nhật cậu Hưng để fade in video nhẹ nhàng tình cảm nhé"

- Ngày sinh nhật **24/11** (người dùng cung cấp). Không ghi năm, không ghi tuổi.
- Làm: `app/src/scenes/v2/countdown.ts`. Hai trống số lăn về 24 / 11 trong khoảng lặng, rồi vỡ thành hạt ở cú đập cuối → CHÚC MỪNG SINH NHẬT / CẬU HƯNG. Đoạn cuối tắt dần về đốm cam, là chỗ nối sang phần 2.

## Vòng 4 – 2026-11-24, duyệt trailer, bắt đầu phần 2

### F8
> "OKKK rồi đó. Tiếp theo là sau đoạn trailer nhạc nhẹ nhàng. Tôi đã đưa ảnh và video vào hết danh sách ở đâyD:\birthday\hello . Phần này sẽ đi ảnh theo giai ddieuj nhẹ nhàng hơn, ý nghĩa hơn và đi cùng các lời chúc, lời nói xen kẽ giữa các đoạn. Tôi có tổng hợp lời chúc ở đây"

- **Trailer v03 được duyệt.**
- Lời chúc phần 2: nguyên văn ở `script/loi_chuc_phan2.md`.

### F9
> "ok làm tiếp đi. Bạn biết capcut đúng không, họ có nhiều template phối ảnh, đặt ở các vị trí, xuất hiện, hiệu ứng etc.. không nhất thiết chỉ dùng 1 kiểu slide lướt lướt nhé. Bạn sáng tạo, tư duy, thẩm mĩ là 1 editor chuyên nghiệp mà. Có những đoạn khoảng lắng có thể không cần nhạc, chỉ cần lyrics hoặc sao đó. bạn cứ ghép edit nhé"

- Phần 2: mỗi đoạn dùng một kiểu bố cục ảnh khác nhau, không chỉ trượt ảnh. Có khoảng lặng không nhạc, chỉ có chữ. Người dùng cho tự dựng, không cần chờ duyệt storyboard.

### F10
> "Và có thể ghép hoặc sử dụng lời chúc của tôi và vợ nữa nè: [lời chúc, nguyên văn ở script/loi_chuc_phan2.md] ddaay là ảnh vợ chồng tôi chắc bạn đã quen"

- Kèm 2 ảnh cưới (Downloads AL_103, AL_104 → `assets/src/w01, w02`). Ảnh 51 (AL_102) cùng buổi.
- Trên ảnh không ghi tên ai, chỉ ghi "hai vợ chồng cháu" như trong lời chúc.

## F11–F13 (2026-11-24, phần 2)
- F11: "Tooi caan ket qua nhanh hon, co the dung subagent" → bản nháp 30 fps/1 mẫu, 3 tiến trình song song (`tools/render_nhap.sh`), gửi dần (`tools/xem_tam.sh`).
- F12: "OK cứ xong bản nào gửi bản đó trước là hợp lý"
- F13: "Bạn tách giúp tôi thành 2 bản. 1 bản full có trailer và 1 bản là bản 4phown lời chúc nhạc đi về nhà nhé" → `out/sinhnhat_v01_xem.mp4` + `out/phan2_v01_xem.mp4`.
