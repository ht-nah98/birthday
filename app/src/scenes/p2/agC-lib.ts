// Hàm dùng chung cho c10–c14 (chỉ các chương này dùng): đoạn chữ hiện theo mốc riêng từng từ, trái tim cam vẽ tay
// (phông không có ký tự ❤️), màn tối dần.
import { F as FONT, font } from '../../engine/type';
import { clamp, ease, smoothstep } from '../../engine/util';
import { GOLD, W, H, rgba, wrap, type ParaOpts } from './kit';

/** Như kit.paragraph nhưng từ thứ i hiện ở giây `at(i)` (tính theo lt); `hiAt(i)`: từ nhấn đổi sang vàng từ mốc đó. Trả về vị trí cuối từ cuối cùng (để gắn trái tim). */
export function paragraphAt(c: CanvasRenderingContext2D, s: string, lt: number, out: number, at: (i: number) => number, o: ParaOpts & { hiAt?: (i: number) => number }) {
  const size = o.size ?? 46, lh = o.lh ?? size * 1.32;
  const fam = o.face === 'mono' ? FONT.mono(400) : o.face === 'sans' ? FONT.archivo(100, 800) : FONT.serif(600, o.face === 'serifItalic');
  c.save();
  c.font = font(fam, size); c.textBaseline = 'alphabetic';
  const lines = wrap(c, s, o.maxW);
  const blockH = lines.length * lh;
  const y0 = o.anchor === 'middle' ? o.y - blockH / 2 + size * 0.8 : o.anchor === 'bottom' ? o.y - blockH + size * 0.8 : o.y;
  const fadeOut = 1 - smoothstep(out, out + 0.6, lt);
  if (o.shadow !== false) { c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 18; }
  const hi = (o.highlight ?? []).map((h) => h.toLowerCase());
  const flat = s.toLowerCase();
  let charPos = 0, wi = 0, endX = 0, endY = 0;
  lines.forEach((ln, li) => {
    const lw = c.measureText(ln).width;
    let x = o.align === 'center' ? o.x - lw / 2 : o.align === 'right' ? o.x - lw : o.x;
    const yy = y0 + li * lh;
    for (const w of ln.split(' ')) {
      const k = clamp((lt - at(wi)) / 0.45);
      const start = flat.indexOf(w.toLowerCase(), charPos);
      if (k > 0) {
        const isHi = hi.some((h) => { const p = flat.indexOf(h); return p >= 0 && start >= p && start < p + h.length; });
        c.globalAlpha = (o.alpha ?? 1) * ease.outCubic(k) * fadeOut;
        const hk = isHi ? (o.hiAt ? ease.outCubic(clamp((lt - o.hiAt(wi)) / 0.3)) : 1) : 0;
        const yw = yy + (1 - ease.outCubic(k)) * size * 0.35, a0 = c.globalAlpha;
        if (hk < 1) { c.fillStyle = o.color ?? rgba('bone'); c.globalAlpha = a0 * (1 - hk); c.fillText(w, x, yw); }
        if (hk > 0) { c.fillStyle = o.hiColor ?? GOLD; c.globalAlpha = a0 * hk; c.fillText(w, x, yw); }
      }
      if (start >= 0) charPos = start + w.length;
      endX = x + c.measureText(w).width; endY = yy;
      x += c.measureText(w + ' ').width; wi++;
    }
  });
  c.restore();
  return { h: blockH, endX, endY, words: wi };
}

/** Trái tim cam nhỏ (thay ký tự ❤️). (x, y) = tâm, s = cỡ (≈ chiều cao chữ). */
export function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, a = 1) {
  if (a <= 0.003) return;
  c.save();
  c.globalAlpha = a;
  c.translate(x, y); c.scale(s / 32, s / 32);
  c.beginPath();
  c.moveTo(0, 11);
  c.bezierCurveTo(-4, 7, -16, 0, -16, -7);
  c.bezierCurveTo(-16, -13, -11, -16, -7, -16);
  c.bezierCurveTo(-3, -16, -1, -13, 0, -10);
  c.bezierCurveTo(1, -13, 3, -16, 7, -16);
  c.bezierCurveTo(11, -16, 16, -13, 16, -7);
  c.bezierCurveTo(16, 0, 4, 7, 0, 11);
  c.closePath();
  c.shadowColor = 'rgba(255,120,40,0.7)'; c.shadowBlur = 14;
  c.fillStyle = '#F07A2E'; c.fill();
  c.restore();
}

/** Phủ tối toàn khung (0..1), màu mực ấm. */
export function darken(c: CanvasRenderingContext2D, k: number) {
  if (k <= 0.002) return;
  c.save(); c.globalAlpha = clamp(k); c.fillStyle = '#070504'; c.fillRect(0, 0, W, H); c.restore();
}

/** Dải tối mềm (gradient dọc) từ y0 xuống đáy khung, đậm nhất `a`. */
export function bottomBand(c: CanvasRenderingContext2D, y0: number, a = 0.8) {
  const g = c.createLinearGradient(0, y0, 0, H);
  g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(0.35, `rgba(8,6,5,${a * 0.75})`); g.addColorStop(1, `rgba(8,6,5,${a})`);
  c.fillStyle = g; c.fillRect(0, y0, W, H - y0);
}
