// Bộ dùng chung cho phần 2 (ảnh + lời chúc). Phần 2 ấm, mềm, ý nghĩa hơn trailer, nhưng vẫn cùng ngôn ngữ:
// nền mực ấm, chữ trắng ngà, MỘT màu cam (đốm cam = "Cậu") và vàng nhạt cho tài lộc / tiêu đề.
// Chữ lời chúc: Cormorant (serif, đọc chậm, tình cảm). Nhãn số thứ tự: IBM Plex Mono nhỏ, giãn chữ.
// Mọi thứ là hàm thuần của t. Ảnh vẽ bằng Canvas2D (Layer2D) rồi ghép vào khung HDR tuyến tính.
import { W, H } from '../../engine/gl';
import { F as FONT, font } from '../../engine/type';
import { rgba } from '../../engine/palette';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import type { PostOverrides } from '../../engine/scene';

export { W, H, rgba };
export const GOLD = '#E9C98B';      // vàng nhạt (tiêu đề, tài lộc)
export const WARM_INK = '#0E0B09';  // nền mực ấm

/** Hậu kỳ mặc định phần 2: dịu, không quang sai màu, hạt phim nhẹ. */
export const P2_POST: PostOverrides = { hud: 0, frame: 0, bloom: 0.35, bloomThreshold: 1.0, grain: 0.035, ca: 0, vignette: 0.32, halation: 0.18 };

// ------------------------------------------------------------------ ảnh

const cache = new Map<string, Promise<HTMLImageElement>>();
/** Nạp ảnh theo id: 'm05' → /assets/web/m05.jpg, 'w01' → w01.jpg, 'h01' → h01.png, hoặc đường dẫn đầy đủ. */
export function photo(id: string): Promise<HTMLImageElement> {
  const url = id.startsWith('/') ? id : id.startsWith('h') ? `/assets/web/${id}.png` : `/assets/web/${id}.jpg`;
  if (!cache.has(url)) cache.set(url, (async () => { const im = new Image(); im.src = url; await im.decode(); return im; })());
  return cache.get(url)!;
}
/** Nạp nhiều ảnh, trả về map id → ảnh (gọi trong init()). */
export async function photos(ids: readonly string[]) {
  const out: Record<string, HTMLImageElement> = {};
  await Promise.all(ids.map(async (id) => { out[id] = await photo(id); }));
  return out;
}

export type Frame = 'none' | 'polaroid' | 'hairline' | 'gold' | 'film' | 'round';
export interface PhotoOpts {
  /** tâm khung (px) và kích thước khung (px, phần ảnh, chưa tính viền) */
  x: number; y: number; w: number; h: number;
  rot?: number;            // radian
  scale?: number;          // co giãn cả khung
  alpha?: number;
  /** điểm lấy nét khi cắt cover (0..1) và zoom chậm Ken Burns (1 = vừa khung) */
  fx?: number; fy?: number; zoom?: number;
  /** dịch ảnh trong khung (px), cho chuyển động trôi */
  panX?: number; panY?: number;
  frame?: Frame;
  /** chỉnh màu: 'warm' (ấm nhẹ), 'sepia', 'bw' (đen trắng), 'none'; amount 0..1 */
  grade?: 'warm' | 'sepia' | 'bw' | 'none'; gradeAmt?: number;
  /** bóng đổ mềm dưới khung */
  shadow?: number;
  /** hé lộ (0..1) theo hướng: 'up' | 'down' | 'left' | 'right' | 'iris' */
  reveal?: number; revealDir?: 'up' | 'down' | 'left' | 'right' | 'iris';
  /** dòng chú thích viết tay dưới polaroid (chỉ dùng chữ nguyên văn, không bịa) */
  caption?: string;
}

const FRAME_PAD: Record<Frame, [number, number, number, number]> = { // trên, phải, dưới, trái (theo tỉ lệ cạnh ngắn)
  none: [0, 0, 0, 0], hairline: [0, 0, 0, 0], gold: [0.025, 0.025, 0.025, 0.025], film: [0.0, 0.0, 0.0, 0.0],
  polaroid: [0.05, 0.05, 0.2, 0.05], round: [0, 0, 0, 0],
};

/** Vẽ một ảnh trong khung. Ảnh luôn cắt kiểu cover theo (fx, fy), không méo. */
export function drawPhoto(c: CanvasRenderingContext2D, img: HTMLImageElement, o: PhotoOpts) {
  const a = (o.alpha ?? 1);
  if (a <= 0.003 || (o.reveal ?? 1) <= 0.001) return;
  const fr = o.frame ?? 'none', s = o.scale ?? 1;
  const short = Math.min(o.w, o.h), [pt, pr, pb, pl] = FRAME_PAD[fr].map((v) => v * short) as [number, number, number, number];
  c.save();
  c.translate(o.x, o.y); c.rotate(o.rot ?? 0); c.scale(s, s);
  c.globalAlpha = a;
  const W0 = o.w + pl + pr, H0 = o.h + pt + pb, X0 = -W0 / 2, Y0 = -H0 / 2;
  // vùng hé lộ
  const rv = clamp(o.reveal ?? 1), dir = o.revealDir ?? 'up';
  if (rv < 1) {
    c.beginPath();
    if (dir === 'iris') c.arc(0, 0, Math.hypot(W0, H0) * 0.5 * ease.outCubic(rv), 0, Math.PI * 2);
    else if (dir === 'up') c.rect(X0, Y0 + H0 * (1 - rv), W0, H0 * rv);
    else if (dir === 'down') c.rect(X0, Y0, W0, H0 * rv);
    else if (dir === 'left') c.rect(X0 + W0 * (1 - rv), Y0, W0 * rv, H0);
    else c.rect(X0, Y0, W0 * rv, H0);
    c.clip();
  }
  if ((o.shadow ?? 0) > 0) {
    c.save(); c.shadowColor = `rgba(0,0,0,${0.55 * (o.shadow ?? 0)})`; c.shadowBlur = 40 * (o.shadow ?? 0); c.shadowOffsetY = 14 * (o.shadow ?? 0);
    c.fillStyle = fr === 'polaroid' ? '#F3EEE4' : '#000'; c.fillRect(X0, Y0, W0, H0); c.restore();
  }
  if (fr === 'polaroid') { c.fillStyle = '#F3EEE4'; c.fillRect(X0, Y0, W0, H0); }
  if (fr === 'gold') { const g = c.createLinearGradient(X0, Y0, X0 + W0, Y0 + H0); g.addColorStop(0, '#8C6A33'); g.addColorStop(0.45, '#F2D9A0'); g.addColorStop(1, '#7A5A2A'); c.fillStyle = g; c.fillRect(X0, Y0, W0, H0); }
  // ảnh
  const ix = X0 + pl, iy = Y0 + pt;
  c.save();
  c.beginPath();
  if (fr === 'round') c.arc(ix + o.w / 2, iy + o.h / 2, Math.min(o.w, o.h) / 2, 0, Math.PI * 2); else c.rect(ix, iy, o.w, o.h);
  c.clip();
  const zoom = o.zoom ?? 1, k = Math.max(o.w / img.width, o.h / img.height) * zoom;
  const dw = img.width * k, dh = img.height * k;
  const fx = o.fx ?? 0.5, fy = o.fy ?? 0.5;
  const dx = ix + o.w / 2 - dw * fx + (dw - o.w) * (fx - 0.5) * 0 + (o.panX ?? 0);
  const dy = iy + o.h / 2 - dh * fy + (o.panY ?? 0);
  // kẹp để không lộ mép
  const cx = Math.min(ix, Math.max(ix + o.w - dw, dx)), cy = Math.min(iy, Math.max(iy + o.h - dh, dy));
  const g = o.grade ?? 'warm', ga = o.gradeAmt ?? (g === 'warm' ? 0.5 : 1);
  c.filter = g === 'sepia' ? `sepia(${0.75 * ga}) contrast(${1 + 0.06 * ga}) brightness(${1 - 0.04 * ga})`
    : g === 'bw' ? `grayscale(${ga}) contrast(${1 + 0.1 * ga})`
    : g === 'warm' ? `sepia(${0.16 * ga}) saturate(${1 - 0.08 * ga}) contrast(${1 + 0.04 * ga})` : 'none';
  c.drawImage(img, cx, cy, dw, dh);
  c.filter = 'none';
  c.restore();
  if (fr === 'hairline' || fr === 'gold' || fr === 'polaroid') {
    c.strokeStyle = fr === 'gold' ? 'rgba(255,236,190,0.9)' : fr === 'polaroid' ? 'rgba(0,0,0,0.12)' : 'rgba(238,233,223,0.75)';
    c.lineWidth = fr === 'gold' ? 1.5 : 1; c.strokeRect(fr === 'hairline' ? ix : X0, fr === 'hairline' ? iy : Y0, fr === 'hairline' ? o.w : W0, fr === 'hairline' ? o.h : H0);
  }
  if (fr === 'polaroid' && o.caption) {
    c.fillStyle = 'rgba(40,32,26,0.85)'; c.font = font(FONT.serif(600, true), Math.round(pb * 0.42)); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(o.caption, 0, Y0 + pt + o.h + pb * 0.5);
  }
  c.restore();
}

/** Lỗ dải phim (sprocket) dọc hai mép của một dải ngang (y = tâm dải, h = chiều cao dải). */
export function filmStrip(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, h: number, offset: number, alpha = 1) {
  c.save(); c.globalAlpha = alpha;
  c.fillStyle = '#16120F'; c.fillRect(x0, y - h / 2, x1 - x0, h);
  c.fillStyle = 'rgba(238,233,223,0.18)';
  const step = 34, hw = 16, hh = 11, m = h * 0.085;
  for (let x = x0 - (((offset % step) + step) % step); x < x1; x += step) {
    for (const yy of [y - h / 2 + m, y + h / 2 - m - hh]) { c.beginPath(); c.roundRect(x, yy, hw, hh, 2.5); c.fill(); }
  }
  c.restore();
}

// ------------------------------------------------------------------ chữ

/** Ngắt dòng theo bề rộng (giữ nguyên chữ, chỉ xuống dòng ở khoảng trắng). */
export function wrap(c: CanvasRenderingContext2D, s: string, maxW: number): string[] {
  const words = s.split(' '), lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface ParaOpts {
  x: number; y: number; maxW: number; size?: number; lh?: number;
  align?: CanvasTextAlign; color?: string; alpha?: number;
  /** 'serif' (lời chúc) | 'mono' (nhãn) | 'sans' (từ khoá to) */
  face?: 'serif' | 'serifItalic' | 'mono' | 'sans';
  /** hiện từng chữ: số từ mỗi giây (0 = hiện cả đoạn, mờ dần vào) */
  wps?: number;
  /** tô màu nhấn các cụm trong đoạn */
  highlight?: readonly string[]; hiColor?: string;
  /** neo y: 'top' (y = dòng đầu) | 'middle' (y = giữa khối) | 'bottom' */
  anchor?: 'top' | 'middle' | 'bottom';
  shadow?: boolean;
}

/** Đoạn chữ hiện mềm (từng từ trượt lên + rõ dần). `lt` = giây kể từ lúc bắt đầu hiện, `out` = giây bắt đầu tắt (tính theo lt). Trả về chiều cao khối. */
export function paragraph(c: CanvasRenderingContext2D, s: string, lt: number, out: number, o: ParaOpts) {
  if (lt < 0) return 0;
  const size = o.size ?? 46, lh = o.lh ?? size * 1.32;
  const fam = o.face === 'mono' ? FONT.mono(400) : o.face === 'sans' ? FONT.archivo(100, 800) : FONT.serif(600, o.face === 'serifItalic');
  c.save();
  c.font = font(fam, size); c.textBaseline = 'alphabetic';
  const lines = wrap(c, s, o.maxW);
  const blockH = lines.length * lh;
  const y0 = o.anchor === 'middle' ? o.y - blockH / 2 + size * 0.8 : o.anchor === 'bottom' ? o.y - blockH + size * 0.8 : o.y;
  const fadeOut = 1 - smoothstep(out, out + 0.6, lt);
  if (o.shadow !== false) { c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 18; }
  const wps = o.wps ?? 9;
  let wi = 0;
  // vị trí từng từ để tô nhấn
  const hi = (o.highlight ?? []).map((h) => h.toLowerCase());
  const flat = s.toLowerCase();
  let charPos = 0;
  lines.forEach((ln, li) => {
    const lw = c.measureText(ln).width;
    let x = o.align === 'center' ? o.x - lw / 2 : o.align === 'right' ? o.x - lw : o.x;
    const yy = y0 + li * lh;
    for (const w of ln.split(' ')) {
      const t0 = wps > 0 ? wi / wps : 0;
      const k = wps > 0 ? clamp((lt - t0) / 0.45) : clamp(lt / 0.6);
      if (k > 0) {
        const start = flat.indexOf(w.toLowerCase(), charPos);
        const isHi = hi.some((h) => { const p = flat.indexOf(h); return p >= 0 && start >= p && start < p + h.length; });
        c.globalAlpha = (o.alpha ?? 1) * ease.outCubic(k) * fadeOut;
        c.fillStyle = isHi ? (o.hiColor ?? GOLD) : (o.color ?? rgba('bone'));
        c.fillText(w, x, yy + (1 - ease.outCubic(k)) * size * 0.35);
      }
      const start = flat.indexOf(w.toLowerCase(), charPos); if (start >= 0) charPos = start + w.length;
      x += c.measureText(w + ' ').width; wi++;
    }
  });
  c.restore();
  return blockH;
}

/** Thời gian đọc khuyến nghị (giây) cho một câu: ~2,7 từ/giây cho người lớn tuổi đọc thoải mái, tối thiểu 3 s. */
export const readTime = (s: string) => Math.max(3, s.split(' ').length / 2.7);

/** Nhãn nhỏ kiểu "01 · LỜI CHÚC MỞ ĐẦU" với vạch mảnh, hiện từ trái sang. */
export function chip(c: CanvasRenderingContext2D, s: string, x: number, y: number, lt: number, out = 99, o: { color?: string; align?: CanvasTextAlign; size?: number } = {}) {
  if (lt < 0) return;
  const a = smoothstep(0, 0.5, lt) * (1 - smoothstep(out, out + 0.5, lt));
  if (a <= 0) return;
  c.save();
  c.font = font(FONT.mono(500), o.size ?? 20); c.letterSpacing = '4px'; c.textBaseline = 'alphabetic';
  const w = c.measureText(s).width, x0 = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
  c.globalAlpha = a; c.fillStyle = o.color ?? GOLD;
  const n = Math.floor(Array.from(s).length * ease.outCubic(clamp(lt / 0.7)));
  c.fillText(Array.from(s).slice(0, n).join(''), x0, y);
  c.strokeStyle = o.color ?? GOLD; c.globalAlpha = a * 0.6; c.lineWidth = 1;
  c.beginPath(); c.moveTo(x0, y + 14); c.lineTo(x0 + w * ease.outCubic(clamp(lt / 0.9)), y + 14); c.stroke();
  c.restore();
}

/** Tiêu đề to (Archivo), giãn chữ khép dần. */
export function title(c: CanvasRenderingContext2D, s: string, lt: number, o: { x?: number; y?: number; size?: number; color?: string; alpha?: number; track?: number } = {}) {
  if (lt < 0) return;
  c.save();
  c.font = font(FONT.archivo(112, 800), o.size ?? 96); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.letterSpacing = `${lerp(o.track ?? 26, (o.track ?? 26) * 0.35, ease.outCubic(clamp(lt / 1.6)))}px`;
  c.globalAlpha = (o.alpha ?? 1) * smoothstep(0, 0.7, lt);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 24;
  c.fillStyle = o.color ?? GOLD;
  c.fillText(s, o.x ?? W / 2, o.y ?? H / 2);
  c.restore();
}

// ------------------------------------------------------------------ nền

/** Nền mực ấm có quầng sáng mềm (vẽ trước mọi thứ). `glow` 0..1, (gx, gy) tâm quầng. */
export function warmBackground(c: CanvasRenderingContext2D, t: number, glow = 0.5, gx = W * 0.5, gy = H * 0.45) {
  c.fillStyle = WARM_INK; c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(gx, gy, 0, gx, gy, W * 0.75);
  g.addColorStop(0, `rgba(120,70,35,${0.32 * glow})`); g.addColorStop(0.5, `rgba(60,34,20,${0.16 * glow})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // bụi sáng trôi chậm (bokeh), tất định theo t
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const h1 = Math.sin(i * 91.7) * 43758.5453 % 1, h2 = Math.sin(i * 17.3) * 12345.678 % 1;
    const x = ((Math.abs(h1) * W + t * (8 + 14 * Math.abs(h2))) % (W + 200)) - 100;
    const y = (Math.abs(h2) * H + Math.sin(t * 0.3 + i) * 30);
    const r = 6 + 26 * Math.abs(h1 * h2);
    const gg = c.createRadialGradient(x, y, 0, x, y, r);
    gg.addColorStop(0, `rgba(255,190,120,${0.07 * glow})`); gg.addColorStop(1, 'rgba(255,190,120,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}

/** Ảnh mờ phủ kín khung làm nền (dùng ảnh poster của clip hoặc ảnh chính). */
export function blurCover(c: CanvasRenderingContext2D, img: HTMLImageElement, blur = 40, dim = 0.55, zoom = 1.1) {
  c.save();
  const k = Math.max(W / img.width, H / img.height) * zoom, dw = img.width * k, dh = img.height * k;
  c.filter = `blur(${blur}px) saturate(0.85)`;
  c.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  c.filter = 'none';
  c.fillStyle = `rgba(10,8,6,${dim})`; c.fillRect(0, 0, W, H);
  c.restore();
}

/**
 * Ô chừa cho clip: engine vẽ ô ĐEN TUYỀN đúng `win`, ffmpeg đặt clip vào sau khi render (tools/render_p2.sh).
 * Vẽ thêm viền mảnh và bóng quanh ô. Không vẽ gì đè lên ô.
 */
export function clipHole(c: CanvasRenderingContext2D, win: { x: number; y: number; w: number; h: number }, a = 1) {
  c.save();
  c.globalAlpha = a;
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 50; c.shadowOffsetY = 16;
  c.fillStyle = '#000'; c.fillRect(win.x, win.y, win.w, win.h);
  c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.strokeStyle = 'rgba(238,233,223,0.55)'; c.lineWidth = 1; c.strokeRect(win.x - 8.5, win.y - 8.5, win.w + 17, win.h + 17);
  c.restore();
}
