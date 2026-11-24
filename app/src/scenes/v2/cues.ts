// Trailer v2: mốc thời gian và chữ (nguyên văn script/loi_chuc.md). Storyboard: docs/04-STORYBOARD-TRAILER-v2.md
//
// Thời gian phim F (giây trong audio/trailer_v2.wav). Storyboard ghi T (T = 0 ở cú đập đầu).
// Nhạc đã nối đúng lưới phách nên một công thức dùng được cho cả phim:
//   S(T) = 2.0704 + T * 1.0002   (3 phách = 1.0002 s)
// Phách thứ k: B(k) = 2.0704 + k * 0.3334 (B(0) = cú đập đầu). Phách mạnh (downbeat) = mỗi 6 phách = S(chẵn).
export const P = 0.3334;
export const B0 = 2.0704;
export const B = (k: number) => B0 + k * P;
export const S = (T: number) => B0 + T * 1.0002;
/** Cú đập cuối: onset đo được 67.077, trùng lưới S(65). */
export const FINAL_HIT = S(65);
export const DURATION = 71.52;

/**
 * Cửa sổ của từng plate (F). Mỗi plate là một Scene riêng trong src/scenes/v2/, id trùng tên file.
 * Ranh giới đặt đúng phách để cắt cứng.
 */
export const PLATES = [
  { id: 'p01-open', start: 0, end: S(8) },          // cold open + "Có một người" #1 + điểm tựa
  { id: 'p02-prompt', start: S(8), end: S(16) },    // #2: không giỏi thể hiện, hành động giản dị
  { id: 'p03-hush', start: S(16), end: S(18) },     // im lặng: #3
  { id: 'p04-chaos', start: S(18), end: S(26) },    // DROP: bộn bề, tin tưởng, tự hào
  { id: 'p05-time', start: S(26), end: S(35) },     // thời gian, const giá trị, còn mãi
  { id: 'p06-today', start: S(35), end: S(42) },    // và hôm nay, ngày đặc biệt, tuổi mới ×3
  { id: 'p07-wishes', start: S(42), end: S(54) },   // vững vàng + 5 lời chúc
  { id: 'p08-forward', start: S(54), end: S(59) },  // mong… nhiều hơn ×3 + ảnh thật
  { id: 'p09-finale', start: S(59), end: DURATION },// bởi…, chân trời, CHÚC MỪNG SINH NHẬT, CẬU HƯNG, đại gia đình
] as const;

/**
 * Chữ theo thời điểm (T của storyboard). `big` = từ khoá to (Archivo), `line` = câu đầy đủ (gõ máy / serif).
 * Không sửa chữ trong `line`: đó là nguyên văn. Có thể ngắt dòng khi hiển thị.
 */
export const TEXT = {
  p01: {
    cold: { T: -2, line: 'Có một người...' },
    title: { T: 0, big: 'CÓ MỘT NGƯỜI' },
    a: { T: 2, line: 'Không cần quá nhiều lời nói,' },
    b: { T: 4, line: 'không cần xuất hiện một cách ồn ào,' },
    c: { T: 6, line: 'nhưng vẫn luôn lặng lẽ là điểm tựa cho gia đình, cho các chị và các em.', big: 'ĐIỂM TỰA' },
  },
  p02: {
    title: { T: 8, big: 'CÓ MỘT NGƯỜI' },
    a: { T: 9, line: 'Đôi khi chẳng giỏi thể hiện tình cảm,' },
    b: { T: 12, line: 'nhưng luôn dành sự quan tâm và yêu thương bằng những hành động giản dị.', big: 'HÀNH ĐỘNG GIẢN DỊ' },
  },
  p03: { a: { T: 16.2, line: 'Có một người...' } },
  p04: {
    a: { T: 18, line: 'Dẫu cuộc sống có bao bộn bề,', big: 'BỘN BỀ' },
    b: { T: 22, line: 'vẫn luôn là người mà gia đình có thể tin tưởng,', big: 'TIN TƯỞNG' },
    c: { T: 24, line: 'các con cháu có thể tự hào.', big: 'TỰ HÀO' },
  },
  p05: {
    a: { T: 26, line: 'Thời gian có thể làm thay đổi nhiều thứ.', big: 'THỜI GIAN' },
    b: { T: 30, line: 'Nhưng sự chân thành, tình yêu thương', bigs: ['CHÂN THÀNH', 'TÌNH YÊU THƯƠNG'] },
    c: { T: 32, line: 'và những giá trị tốt đẹp sẽ luôn còn mãi.', bigs: ['GIÁ TRỊ', 'CÒN MÃI'] },
  },
  p06: {
    a: { T: 35, line: 'Và hôm nay...' },
    b: { T: 36, line: 'Là ngày đặc biệt của một người đặc biệt.', bigs: ['NGÀY ĐẶC BIỆT', 'NGƯỜI ĐẶC BIỆT'] },
    c: { T: 38, big: 'MỘT TUỔI MỚI.' },
    d: { T: 39.333, big: 'MỘT HÀNH TRÌNH MỚI.' },
    e: { T: 40.667, big: 'MỘT CHƯƠNG MỚI', line: 'của cuộc đời.' },
  },
  p07: {
    a: { T: 42, line: 'Chúc Cậu luôn vững vàng trước mọi thử thách.', big: 'VỮNG VÀNG' },
    w: [
      { T: 44, big: 'SỨC KHỎE DỒI DÀO.' },
      { T: 46, big: 'CÔNG VIỆC HANH THÔNG.' },
      { T: 48, big: 'TÀI LỘC VIÊN MÃN.' },
      { T: 50, big: 'PHONG ĐỘ THEO NĂM THÁNG.' },
      { T: 52, big: 'HẠNH PHÚC TRỌN VẸN.' },
    ],
  },
  p08: {
    a: { T: 54, line: 'Mong những năm tháng phía trước sẽ có' },
    b: { T: 55.333, line: 'nhiều thành công hơn,', big: 'HƠN' },
    c: { T: 56.667, line: 'nhiều tiếng cười hơn', big: 'HƠN' },
    d: { T: 58, line: 'và nhiều khoảnh khắc đáng nhớ hơn.', big: 'HƠN' },
  },
  p09: {
    a: { T: 59, line: 'Bởi những điều tuyệt vời nhất của cuộc đời...' },
    b: { T: 61.6, line: 'Vẫn còn đang chờ ở phía trước.' },
    title: { F: FINAL_HIT, big: 'CHÚC MỪNG SINH NHẬT' },
    name: { F: FINAL_HIT + 1.0, big: 'CẬU HƯNG' },
    family: { F: 69.0, line: 'Với tất cả tình yêu thương từ đại gia đình!' },
  },
} as const;
