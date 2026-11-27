// Bản 2: video chúc mừng sinh nhật bạn (anh áo caro, ảnh p10), từ vợ chồng Hằng Ngọc. Nhạc: Da LAB "Đời Là Đi",
// đoạn M[147.202, 213.8) (tools/splice_b2.py → audio/ban2.wav, data/audio_b2.json). F = giây trong phim.
// Lưới phách: phách k ở F = 1.0 + k·0.559 (107.3 BPM), ô nhịp = 4 phách. Ảnh: assets/ban2/web/ (không lên repo).
export const P = 0.559;
export const K = (k: number) => 1.0 + k * P;
export const DURATION = 67.598;

/** Ranh giới đoạn (theo phách). Mở màn pdoom 0–9.94 s trên đoạn nhạc cụ rút, chỉ còn giọng. */
export const SEC = {
  open: [0, K(16)],        // 0 → 9.944
  build: [K(16), K(48)],   // nhạc cụ dày dần → 27.832
  ch1: [K(48), K(80)],     // điệp khúc 1 → 45.72
  ch2: [K(80), K(104)],    // điệp khúc 2 → 59.136
  outro: [K(104), DURATION],
} as const;

export const IMG = (id: string) => `/assets/ban2/web/${id}.${id.endsWith('_cut') ? 'png' : 'jpg'}`;

/** Năm bức vẽ cùng bố cục từ ảnh p10: lập thể, ukiyo-e, pop-art, màu nước, sơn dầu. */
export const STYLES = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export const STYLE_NAME: Record<string, string> = { L1: 'LẬP THỂ', L2: 'UKIYO-E', L3: 'POP ART', L4: 'MÀU NƯỚC', L5: 'SƠN DẦU', p10: 'BẢN GỐC' };

/** Chữ lời chúc NGUYÊN VĂN (cắt cụm, không sửa chữ). Nguồn: script/loi_chuc_ban2.md */
export const WISH = {
  hello: 'Chúc mừng sinh nhật bạn!',
  w1: 'Chúc bạn bước sang tuổi mới luôn mạnh khỏe, tràn đầy năng lượng tích cực',
  w1b: 'tự tin · bản lĩnh · nhiệt huyết',
  w2: 'Chúc công việc luôn hanh thông, sự nghiệp ngày càng thành công',
  w3: 'Có thật nhiều thời gian để tận hưởng hạnh phúc bên gia đình, những người thân yêu và những người bạn đồng hành.',
  w4: 'Chúc chúng ta sẽ còn có thêm nhiều chuyến đi thật đáng nhớ',
  w5: 'Thời gian có thể làm thay đổi nhiều điều, nhưng mong rằng sự chân thành, tình cảm và tình bạn giữa chúng ta sẽ luôn vẹn nguyên như những ngày đầu.',
  w6: 'Mong rằng trên những chặng đường phía trước, chúng ta vẫn sẽ luôn có nhau',
  last: 'Chúc tình bạn thân hữu của chúng ta mãi mãi bền lâu!',
  hb: 'HAPPY BIRTHDAY!',
  from: 'Vợ chồng Hằng Ngọc',
};

/** Toàn văn lời chúc (nguồn ký tự cho chân dung dệt bằng chữ). */
export const WISH_FULL = `Chúc mừng sinh nhật bạn! Chúc bạn bước sang tuổi mới luôn mạnh khỏe, tràn đầy năng lượng tích cực, giữ vững sự tự tin, bản lĩnh và nhiệt huyết trong mọi điều mình làm. Chúc công việc luôn hanh thông, sự nghiệp ngày càng thành công, mọi dự định đều thuận lợi và mỗi ngày trôi qua đều có thêm những niềm vui mới. Mong bạn luôn tìm được sự cân bằng giữa công việc và cuộc sống, có thật nhiều thời gian để tận hưởng hạnh phúc bên gia đình, những người thân yêu và những người bạn đồng hành. Chúc chúng ta sẽ còn có thêm nhiều chuyến đi thật đáng nhớ, cùng khám phá những vùng đất mới, cùng chia sẻ những tiếng cười và lưu giữ thêm thật nhiều kỷ niệm đẹp. Thời gian có thể làm thay đổi nhiều điều, nhưng mong rằng sự chân thành, tình cảm và tình bạn giữa chúng ta sẽ luôn vẹn nguyên như những ngày đầu. Vợ chồng Hằng Ngọc chúc bạn một tuổi mới thật nhiều sức khỏe, thành công, bình an và hạnh phúc. Mong rằng trên những chặng đường phía trước, chúng ta vẫn sẽ luôn có nhau, cùng đồng hành, cùng sẻ chia và cùng viết tiếp những câu chuyện đẹp của cuộc đời. Chúc tình bạn thân hữu của chúng ta mãi mãi bền lâu! Happy Birthday!`;

// ------------------------------------------------------------------ danh sách cảnh (shot list) theo phách
// kind: full = ảnh phủ kín (ngang); tri = ba ảnh dọc ghép 16:9, mỗi phách vào một tấm; one = ảnh dọc giữa, nền mờ;
// flip = lật phong cách bức vẽ (step phách/lần); grid = tường ảnh bật dần; card = ảnh + lời chúc.
// fx/fy: điểm lấy nét khi cắt cover. tr: hiệu ứng vào (CapCut): punch (zoom giật), whip (lia ngang), glitch, flash, spin.
export type Pic = { id: string; fx?: number; fy?: number };
export type Shot =
  | { k: number; kind: 'full'; pic: Pic; tr?: Tr; drift?: number }
  | { k: number; kind: 'tri'; pics: [Pic, Pic, Pic]; step?: number; tr?: Tr }
  | { k: number; kind: 'one'; pic: Pic; tr?: Tr; side?: number }
  | { k: number; kind: 'flip'; ids: string[]; step: number; tr?: Tr; label?: boolean }
  | { k: number; kind: 'grid'; pics: Pic[]; step: number; tr?: Tr }
  | { k: number; kind: 'card'; pic: Pic; tr?: Tr; side: 'L' | 'R' };
export type Tr = 'punch' | 'whip' | 'glitch' | 'flash' | 'spin' | 'none';

const p = (id: string, fx = 0.5, fy = 0.45): Pic => ({ id, fx, fy });

export const SHOTS: Shot[] = [
  // BUILD (nhạc cụ dày dần) — mỗi ô nhịp một nhịp hình, cắt đúng phách
  { k: 16, kind: 'full', pic: p('p01', 0.5, 0.62), tr: 'flash' },
  { k: 18, kind: 'full', pic: p('p14', 0.5, 0.55), tr: 'whip' },
  { k: 20, kind: 'tri', pics: [p('p02', 0.5, 0.55), p('p05', 0.5, 0.6), p('p09', 0.5, 0.62)], tr: 'punch' },
  { k: 24, kind: 'full', pic: p('p08', 0.5, 0.7), tr: 'glitch' },
  { k: 26, kind: 'full', pic: p('p26', 0.55, 0.6), tr: 'whip' },
  { k: 28, kind: 'tri', pics: [p('p20', 0.5, 0.6), p('p21', 0.45, 0.62), p('p23', 0.5, 0.6)], tr: 'punch' },
  { k: 32, kind: 'full', pic: p('p13', 0.5, 0.5), tr: 'spin' },
  { k: 34, kind: 'full', pic: p('p11', 0.5, 0.55), tr: 'whip' },
  { k: 36, kind: 'tri', pics: [p('p28', 0.5, 0.6), p('p29', 0.5, 0.65), p('p30', 0.5, 0.65)], tr: 'punch' },
  { k: 40, kind: 'one', pic: p('p25', 0.5, 0.6), tr: 'punch', side: -1 },
  { k: 41, kind: 'one', pic: p('p27', 0.5, 0.6), tr: 'glitch', side: 1 },
  { k: 42, kind: 'one', pic: p('p31', 0.5, 0.55), tr: 'punch', side: -1 },
  { k: 43, kind: 'one', pic: p('p22', 0.5, 0.6), tr: 'glitch', side: 1 },
  // dồn: nửa phách một ảnh, zoom tăng dần
  { k: 44, kind: 'full', pic: p('p03', 0.5, 0.5), tr: 'punch' },
  { k: 44.5, kind: 'full', pic: p('p04', 0.5, 0.45), tr: 'punch' },
  { k: 45, kind: 'full', pic: p('p15', 0.5, 0.55), tr: 'punch' },
  { k: 45.5, kind: 'full', pic: p('p17', 0.5, 0.5), tr: 'punch' },
  { k: 46, kind: 'full', pic: p('p18', 0.5, 0.5), tr: 'punch' },
  { k: 46.5, kind: 'full', pic: p('p19', 0.5, 0.4), tr: 'punch' },
  { k: 47, kind: 'full', pic: p('p24', 0.5, 0.5), tr: 'punch' },
  { k: 47.5, kind: 'full', pic: p('p16', 0.5, 0.45), tr: 'punch' },
  // ĐIỆP KHÚC 1 — lật phong cách trên cùng khuôn mặt
  { k: 48, kind: 'flip', ids: ['L1', 'L2', 'L3', 'L4', 'L5', 'L3', 'L1', 'L2'], step: 0.5, tr: 'flash', label: true },
  { k: 52, kind: 'flip', ids: ['L4', 'L2', 'L5', 'p10'], step: 1, tr: 'none', label: true },
  { k: 56, kind: 'card', pic: p('p04', 0.5, 0.42), tr: 'whip', side: 'R' },
  { k: 60, kind: 'card', pic: p('p19', 0.5, 0.42), tr: 'whip', side: 'L' },
  { k: 64, kind: 'card', pic: p('p16', 0.5, 0.45), tr: 'glitch', side: 'R' },
  { k: 68, kind: 'card', pic: p('p24', 0.5, 0.45), tr: 'whip', side: 'L' },
  { k: 72, kind: 'card', pic: p('p00', 0.5, 0.6), tr: 'punch', side: 'R' },
  { k: 76, kind: 'card', pic: p('p17', 0.5, 0.5), tr: 'whip', side: 'L' },
  // ĐIỆP KHÚC 2 — lật nhanh, tường ảnh, kỷ niệm xưa
  { k: 80, kind: 'flip', ids: ['L3', 'L1', 'L5', 'L2', 'L4', 'L3', 'L5', 'p10'], step: 0.5, tr: 'flash', label: true },
  { k: 84, kind: 'grid', pics: [p('p01'), p('p02'), p('p05'), p('p08'), p('p09'), p('p13'), p('p14'), p('p20'), p('p21'), p('p23'), p('p26'), p('p28'), p('p29'), p('p30'), p('p31'), p('p25')], step: 0.5, tr: 'punch' },
  { k: 92, kind: 'card', pic: p('p12', 0.5, 0.62), tr: 'flash', side: 'R' },
  { k: 96, kind: 'card', pic: p('p10', 0.5, 0.4), tr: 'whip', side: 'L' },
  { k: 100, kind: 'card', pic: p('p13', 0.5, 0.5), tr: 'glitch', side: 'R' },
];

/** Chữ theo phách. style: slam (từ khoá to, đập), outline (chữ viền rỗng cực to sau ảnh), decode (ký tự chạy rồi khoá), wish (lời chúc trên card). */
export type Txt = { k0: number; k1: number; s: string; style: 'slam' | 'outline' | 'decode' | 'wish' | 'tag'; x?: number; y?: number; size?: number; color?: string };
export const TEXTS: Txt[] = [
  // từ khoá của bài hát + lời chúc trong đoạn build
  { k0: 16, k1: 20, s: 'ĐỜI LÀ ĐI', style: 'outline', y: 560 },
  { k0: 20, k1: 24, s: 'CÙNG NHAU', style: 'slam', y: 930 },
  { k0: 24, k1: 28, s: 'NHỮNG CHUYẾN ĐI', style: 'outline', y: 560 },
  { k0: 28, k1: 32, s: 'VÙNG ĐẤT MỚI', style: 'slam', y: 930 },
  { k0: 32, k1: 36, s: 'TIẾNG CƯỜI', style: 'outline', y: 560 },
  { k0: 36, k1: 40, s: 'KỶ NIỆM ĐẸP', style: 'slam', y: 930 },
  { k0: 40, k1: 44, s: 'HÀNH TRÌNH CHẲNG GIỐNG AI', style: 'decode', y: 540, size: 92 },
  { k0: 44, k1: 48, s: 'ĐI · ĐI · ĐI', style: 'slam', y: 560 },
  // điệp khúc 1
  { k0: 48, k1: 52, s: 'CHÚC MỪNG SINH NHẬT', style: 'slam', y: 960, size: 120 },
  { k0: 52, k1: 56, s: 'TUỔI MỚI', style: 'outline', y: 560 },
  { k0: 56, k1: 64, s: WISH.w1, style: 'wish' },
  { k0: 60, k1: 64, s: WISH.w1b, style: 'tag' },
  { k0: 64, k1: 72, s: WISH.w2, style: 'wish' },
  { k0: 72, k1: 80, s: WISH.w3, style: 'wish' },
  // điệp khúc 2
  { k0: 80, k1: 84, s: 'CON ĐƯỜNG DÀI', style: 'slam', y: 960, size: 130 },
  { k0: 84, k1: 92, s: WISH.w4, style: 'decode', y: 540, size: 64 },
  { k0: 92, k1: 100, s: WISH.w5, style: 'wish' },
  { k0: 100, k1: 104, s: WISH.w6, style: 'wish' },
];
