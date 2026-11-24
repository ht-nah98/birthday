// Phần 2: ảnh + lời chúc trên "Đi Về Nhà". Mốc thời gian, chữ (NGUYÊN VĂN script/loi_chuc_phan2.md), ảnh, clip.
// Âm thanh và các khoảng chèn: tools/splice_p2.py → data/p2_timing.json. Storyboard: docs/05-STORYBOARD-PHAN2.md
//
// M = giây trong bài gốc, F = giây trong phim phần 2. F = M + off của đoạn nhạc chứa M.
// Phách đo được: chu kỳ 0.7198 s (83.4 BPM), 4 phách = 1 ô nhịp 2.879 s.
export const BEAT = 0.7198;
export const BAR = 4 * BEAT;
const SEG = [
  { M0: 0, M1: 86.111, off: 1.0 },
  { M0: 86.111, M1: 138.252, off: 14.333 },
  { M0: 138.252, M1: 160.403, off: 29.533 },
  { M0: 160.403, M1: 183.972, off: 65.233 },
  // điệp khúc cuối lặp thêm M[172.547, 183.972) (tools/splice_p2.py REP); sau đó M ≥ 183.972 lệch 76.658
  { M0: 183.972, M1: 205.584, off: 76.658 },
];
/** giây của vòng điệp khúc lặp (lần 2) trong phim: M ∈ [172.547, 183.972) */
export const Frep = (m: number) => m + 76.658;
/** giây trong bài gốc → giây trong phim */
export const F = (m: number) => { for (const s of SEG) if (m >= s.M0 && m < s.M1) return m + s.off; return m + SEG[4]!.off; };
/** như F nhưng điểm cuối đoạn nhạc (M1) thuộc đoạn trước: dùng cho mốc KẾT THÚC */
export const Fend = (m: number) => { for (const s of SEG) if (m > s.M0 && m <= s.M1) return m + s.off; return m + SEG[0]!.off; };
export const DURATION = 285.242;

/** Khoảng chèn (không nhạc). Clip được ffmpeg đặt vào `win` (px trên khung 1920x1080) sau khi render: engine để ô đen. */
export const CLIPS = {
  ruou: { F0: 87.711, len: 12.133, w: 720, h: 1280, win: { x: 1086, y: 90, w: 506, h: 900 }, poster: '/assets/web/clip_ruou.jpg' },
  damlung: { F0: 153.185, len: 14.0, w: 1280, h: 720, win: { x: 160, y: 150, w: 1120, h: 630 }, poster: '/assets/web/clip_damlung.jpg' },
  be: { F0: 204.936, len: 20.1, w: 480, h: 854, win: { x: 707, y: 90, w: 506, h: 900 }, poster: '/assets/web/clip_be.jpg' },
} as const;
export const GAP_A = { F0: 87.111, F1: 100.444 };
export const GAP_B = { F0: 152.585, F1: 167.785 };
export const SILENT = { F0: 189.936, F1: 204.936 };    // khoảng lặng chỉ có chữ
export const GAP_C = { F0: 189.936, F1: 225.636 };

/** Chương = một Scene trong scenes/p2/, id trùng tên file. Ranh giới đúng phách. */
export const CHAPTERS = [
  { id: 'c00-open', start: 0, end: F(23.255) },              // mở đầu: dải phim ảnh xưa + tiêu đề + 2 câu mở
  { id: 'c01-w01', start: F(23.255), end: F(34.679) },       // lời chúc 01: polaroid rơi
  { id: 'c02-w02', start: F(34.679), end: F(46.835) },       // lời chúc 02: ba khung dọc
  { id: 'c03-w03', start: F(46.835), end: F(58.259) },       // lời chúc 03: ảnh giữa + "sticker" vui
  { id: 'c04-w04', start: F(58.259), end: F(68.975) },       // lời chúc 04: khung vàng tài lộc
  { id: 'c05-w05', start: F(68.975), end: GAP_A.F0 },       // điệp khúc 1 + lời chúc 05: lưới ảnh Tết lật theo phách
  { id: 'c06-ruou', start: GAP_A.F0, end: GAP_A.F1 },        // chèn A: clip rót rượu (tiếng thật)
  { id: 'c07-thu', start: GAP_A.F1, end: GAP_B.F0 },        // lá thư của hai vợ chồng cháu (trọn rap 2, 52 s)
  { id: 'c09-damlung', start: GAP_B.F0, end: GAP_B.F1 },     // chèn B: clip đấm lưng (tiếng thật) + lời chúc 06 dí dỏm bên cạnh
  { id: 'c10-w07', start: GAP_B.F1, end: SILENT.F0 }, // điệp khúc 2 + lời chúc 07: lớp ảnh chiều sâu
  { id: 'c11-lang', start: GAP_C.F0, end: GAP_C.F1 },        // khoảng lặng chữ + clip bé trai (tiếng thật)
  { id: 'c12-w08', start: GAP_C.F1, end: F(172.5475) },   // bridge + lời chúc 08 (phần 1)
  { id: 'c13-ket', start: F(172.5475), end: F(192.54) },     // điệp khúc cuối (kéo dài 1 vòng, 31.4 s): vàng, mong ước, câu cuối lá thư
  { id: 'c14-end', start: F(192.54), end: DURATION },        // CHÚC MỪNG SINH NHẬT CẬU HƯNG, Happy Birthday, đại gia đình
] as const;

/** Chữ nguyên văn. Ngắt dòng khi hiển thị được, không sửa chữ. */
export const TEXT = {
  open: {
    title: 'MỪNG SINH NHẬT CẬU HƯNG',
    a: 'Thêm một tuổi mới, thêm những niềm vui, thêm những kỷ niệm đẹp.',
    b: 'Hôm nay, đại gia đình có những lời chúc đặc biệt muốn gửi đến Cậu, thay cho tất cả tình cảm và sự yêu thương.',
  },
  w01: { label: '01 · LỜI CHÚC MỞ ĐẦU', line: 'Chúc mừng sinh nhật Cậu Hưng! Chúc Cậu luôn mạnh khỏe, hạnh phúc, gặp thật nhiều may mắn và tài lộc trong cuộc sống.' },
  w02: { label: '02 · LỜI CHÚC TỪ GIA ĐÌNH CÁC CON', line: 'Gia đình con kính chúc Cậu một sinh nhật thật ý nghĩa. Tuổi mới luôn mạnh khỏe, trẻ trung, phong độ, mọi điều hanh thông và luôn tràn đầy niềm vui, hạnh phúc bên gia đình ạ!' },
  w03: { label: '03 · LỜI CHÚC GIẢN DỊ VÀ CHÂN THÀNH', line: 'Gia đình con chúc Cậu sinh nhật vui vẻ! Tuổi mới không mong gì nhiều, chỉ mong Cậu luôn khỏe mạnh, bình an, vui vẻ và thích gì được nấy ạ!' },
  w04: { label: '04 · LỜI CHÚC TÀI LỘC', line: 'Con kính chúc Cậu tuổi mới thật nhiều sức khỏe, thật nhiều tài lộc, thật nhiều may mắn và bình an. Chúc mừng sinh nhật Cậu Hưng ạ!' },
  w05: { label: '05 · LỜI CHÚC TỪ GIA ĐÌNH CÁC CHÁU', line: 'Gia đình cháu kính chúc mừng sinh nhật Cậu Hưng. Chúc Cậu luôn mạnh khỏe, vui vẻ, hạnh phúc và gặt hái được nhiều thành công ạ!' },
  thu: {
    label: 'LỜI CHÚC CỦA HAI VỢ CHỒNG CHÁU',
    p: [
      'Nhân ngày sinh nhật Cậu, hai vợ chồng cháu kính chúc Cậu tuổi mới luôn dồi dào sức khỏe, bình an, công việc thuận lợi và vạn sự như ý.',
      'Cảm ơn Cậu vì đã luôn dành sự quan tâm, yêu thương cho gia đình và các con cháu, luôn là một điểm tựa vững chắc, là người mà chúng cháu yêu quý và tự hào.',
      'Hai vợ chồng cháu mong rằng, sau những bộn bề và lo toan của cuộc sống, Cậu sẽ có thêm nhiều thời gian dành cho bản thân, được làm những điều mình thích, đi đến những nơi mình muốn và tận hưởng thật nhiều khoảnh khắc hạnh phúc bên những người thân yêu.',
      'Mong Cậu không chỉ thêm tuổi mới mà còn thêm nhiều niềm vui, thêm nhiều thành công và thêm thật nhiều kỷ niệm đẹp.',
      'Chúc Cậu luôn giữ được sự trẻ trung, phong độ, nhiệt huyết và nụ cười trên môi.',
    ],
    last: 'Chúc mừng sinh nhật Cậu Hưng! Hai vợ chồng cháu chúc Cậu những năm tháng phía trước sẽ luôn bình an, rực rỡ và hạnh phúc hơn cả những năm tháng đã qua! ❤️',
  },
  w06: { label: '06 · LỜI CHÚC GẦN GŨI, DÍ DỎM', line: 'Hai vợ chồng cháu chúc Cậu tuổi mới thật nhiều sức khỏe, ngủ ngon, thở sâu, ăn ngon miệng và gặt hái được thật nhiều thành công trong tương lai ạ!', keys: ['ngủ ngon', 'thở sâu', 'ăn ngon miệng'] },
  w07: { label: '07 · LỜI CHÚC TÌNH CẢM DÀNH CHO CẬU', line: 'Chúc mừng sinh nhật Cậu! Gia đình cháu kính chúc Cậu tuổi mới luôn dồi dào sức khỏe, vạn sự bình an và mãi là chỗ dựa vững chắc, đầy yêu thương của đại gia đình mình.' },
  lang: {
    a: 'Mỗi người một lời chúc, mỗi người một cách thể hiện tình yêu thương.',
    b: 'Nhưng tất cả đều có chung một mong ước: mong Cậu luôn khỏe mạnh, bình an, hạnh phúc và có thật nhiều tiếng cười trong cuộc sống.',
  },
  w08: {
    label: '08 · LỜI CHÚC TỪ GIA ĐÌNH THẢO – HƯNG VÀ BÉ BẢO PHONG',
    a: 'Gia đình cháu Thảo, Hưng và bé Bảo Phong kính chúc Cậu – Ông tuổi mới luôn dồi dào sức khỏe, vạn sự bình an, công việc hanh thông và mãi là chỗ dựa đầy yêu thương của đại gia đình mình.',
    b: 'Chúc Cậu – Ông có thật nhiều sức khỏe, nhiều niềm vui, nhiều tiền và thật nhiều vàng!',
  },
  ket: {
    a: 'Mong rằng những năm tháng phía trước, đại gia đình mình sẽ có thêm thật nhiều dịp sum vầy, thêm nhiều chuyến đi, nhiều bữa cơm và nhiều kỷ niệm đẹp bên nhau.',
    /** từ khoá trong câu a → ảnh đổi đúng lúc chữ hiện */
    keys: ['sum vầy', 'chuyến đi', 'bữa cơm', 'kỷ niệm đẹp'],
    b: 'Thương chúc Cậu một tuổi mới thật rực rỡ!',
  },
  end: { title: 'CHÚC MỪNG SINH NHẬT CẬU HƯNG!', en: 'Happy Birthday!', fam: 'Với tất cả tình yêu thương từ đại gia đình.' },
} as const;

/**
 * Ảnh (assets/web/mNN.jpg theo work/hello_index.tsv; w01/w02 = ảnh cưới hai vợ chồng cháu; h01–h04 = bản cắt chỉ có Cậu).
 * Không dùng: 45 (trùng 41), 26 (gần trùng 25), 10 (người lớn tuổi ngồi xe lăn: chưa hỏi được, tạm bỏ), 21/22 (ảnh chụp màn hình).
 */
export const PHOTOS = {
  open: ['m05', 'm54', 'm15', 'm16', 'm19', 'm17', 'm18', 'm50'],   // ảnh xưa
  w01: ['m01', 'm14', 'm42'],
  w02: ['m13', 'm43', 'm04'],   // m04 (dọc) hợp khung dọc hơn m03 (nhóm 7 người ngang)
  w03: ['m49', 'm46', 'm44'],
  w04: ['m03', 'm47', 'm24', 'm11'],
  w05: ['m25', 'm27', 'm28', 'm29', 'm30', 'm31', 'm33', 'm34', 'm35', 'm52', 'm55', 'm12', 'm07', 'm06', 'm09', 'm32'],
  thu: { cover: ['w02', 'w01', 'm51'], p2: ['m38', 'm39', 'm20'], p3: ['m37', 'm40', 'm41', 'm08'], p4: ['m48', 'm23'], p5: ['m41', 'm02'] },
  w07: ['m38', 'm39', 'm20', 'm02', 'm01', 'm53'],
  w08: ['m53', 'm34', 'm55'],
  ket: { sumvay: 'm33', chuyendi: 'm37', buacom: 'm36', kyniem: 'm17', last: 'w02' },
  end: ['m25', 'm53', 'm33', 'm35', 'm17', 'm55'],
} as const;
