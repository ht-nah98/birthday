// Bộ hiệu ứng "kiểu CapCut" cho bản 2: ảnh cover, zoom giật, lia ngang, glitch lát cắt, chữ đập / chữ viền / chữ giải mã.
// Mọi thứ là hàm thuần của t (tất định khi render).
import { W, H } from '../../engine/gl';
import { F, font, fitSize } from '../../engine/type';
import { clamp, ease, hash, smoothstep } from '../../engine/util';
import { IMG } from './cues';

export { W, H };
export const CREAM = '#FFF4E2';
export const HOT = '#FF5A36';     // đỏ cam (áo đỏ trong ảnh, bánh sinh nhật)
export const GOLD = '#FFC861';

const cache = new Map<string, Promise<HTMLImageElement>>();
export function load(id: string) {
  const url = id.startsWith('/') ? id : IMG(id);
  if (!cache.has(url)) cache.set(url, (async () => { const im = new Image(); im.src = url; await im.decode(); return im; })());
  return cache.get(url)!;
}
export async function loadAll(ids: string[]) {
  const out: Record<string, HTMLImageElement> = {};
  await Promise.all([...new Set(ids)].map(async (id) => { out[id] = await load(id); }));
  return out;
}

/** Vẽ ảnh cắt cover vào hình chữ nhật (x, y, w, h) quanh điểm (fx, fy), zoom ≥ 1, dịch (px). */
export function cover(c: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number,
  o: { fx?: number; fy?: number; zoom?: number; dx?: number; dy?: number; alpha?: number; filter?: string } = {}) {
  const z = o.zoom ?? 1, k = Math.max(w / im.width, h / im.height) * z, dw = im.width * k, dh = im.height * k;
  let ix = x + w / 2 - dw * (o.fx ?? 0.5) + (o.dx ?? 0), iy = y + h / 2 - dh * (o.fy ?? 0.5) + (o.dy ?? 0);
  ix = Math.min(x, Math.max(x + w - dw, ix)); iy = Math.min(y, Math.max(y + h - dh, iy));
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.globalAlpha = o.alpha ?? 1; if (o.filter) c.filter = o.filter;
  c.drawImage(im, ix, iy, dw, dh);
  c.restore();
}

/** Nền mờ từ chính ảnh (kiểu CapCut "nền làm mờ"). */
export function blurFill(c: CanvasRenderingContext2D, im: HTMLImageElement, dim = 0.45, blur = 36) {
  cover(c, im, 0, 0, W, H, { zoom: 1.15, filter: `blur(${blur}px) saturate(1.15)` });
  c.fillStyle = `rgba(8,6,10,${dim})`; c.fillRect(0, 0, W, H);
}

/** Độ lệch vào cảnh theo kiểu chuyển: trả về {dx, zoom, rot, blurPx} theo giây kể từ lúc cắt. */
export function enter(tr: string, lt: number, dir = 1) {
  const k = clamp(lt / 0.28);
  switch (tr) {
    case 'whip': return { dx: dir * W * 0.6 * (1 - ease.outExpo(k)), zoom: 1.08 - 0.06 * ease.outCubic(k), rot: 0, blur: 40 * (1 - k) };
    case 'punch': return { dx: 0, zoom: 1 + 0.16 * Math.exp(-lt * 9), rot: 0, blur: 0 };
    case 'spin': return { dx: 0, zoom: 1.25 - 0.2 * ease.outBack(k), rot: dir * 0.35 * (1 - ease.outCubic(k)), blur: 18 * (1 - k) };
    default: return { dx: 0, zoom: 1.04 - 0.04 * ease.outCubic(clamp(lt / 0.5)), rot: 0, blur: 0 };
  }
}

/** Glitch lát ngang: sao chép các dải ngang của khung đã vẽ và dịch lệch (vài khung sau khi cắt). */
export function glitch(c: CanvasRenderingContext2D, cv: HTMLCanvasElement, amt: number, seed: number) {
  if (amt <= 0.01) return;
  const s = cv.width / W;
  for (let i = 0; i < 9; i++) {
    const y = hash(seed, i, 1) * H, h = 10 + hash(seed, i, 2) * 90, dx = (hash(seed, i, 3) - 0.5) * 220 * amt;
    c.drawImage(cv, 0, y * s, cv.width, h * s, dx, y, W, h);
  }
  // tách màu giả: một dải đỏ / xanh mảnh cộng sáng
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 * amt;
  c.fillStyle = '#ff0040'; c.fillRect(0, hash(seed, 7) * H, W, 6 + 20 * amt);
  c.fillStyle = '#00c8ff'; c.fillRect(0, hash(seed, 8) * H, W, 4 + 14 * amt);
  c.restore();
}

// ------------------------------------------------------------------ chữ

/** Chữ đập: to, đậm, nảy khi vào (lt = 0), rung nhẹ theo phách; bóng đổ cứng kiểu sticker. */
export function slam(c: CanvasRenderingContext2D, s: string, lt: number, out: number, o: { x?: number; y?: number; size?: number; color?: string; w?: number } = {}) {
  if (lt < 0 || lt > out + 0.25) return;
  const fam = F.archivo(112, 900), size = Math.min(o.size ?? 150, fitSize(s, fam, o.w ?? 1680, o.size ?? 150, 0));
  const k = 1 + 0.45 * Math.exp(-lt * 14), a = clamp(lt * 30) * (1 - smoothstep(out, out + 0.25, lt));
  c.save(); c.translate(o.x ?? W / 2, o.y ?? H / 2); c.scale(k, k); c.rotate(-0.03);
  c.font = font(fam, size); c.textAlign = 'center'; c.textBaseline = 'middle'; c.globalAlpha = a;
  c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(s, 7, 8);
  c.fillStyle = o.color ?? CREAM; c.fillText(s, 0, 0);
  c.restore();
}

/** Chữ viền rỗng cực to, trôi chậm ngang (lớp sau ảnh hoặc đè mờ). */
export function outline(c: CanvasRenderingContext2D, s: string, lt: number, out: number, o: { y?: number; size?: number; color?: string } = {}) {
  if (lt < 0 || lt > out + 0.3) return;
  const fam = F.archivo(125, 900), size = Math.min(o.size ?? 330, fitSize(s, fam, 1840, o.size ?? 330, 0));
  const a = clamp(lt * 12) * (1 - smoothstep(out, out + 0.3, lt));
  c.save(); c.font = font(fam, size); c.textAlign = 'center'; c.textBaseline = 'middle';
  const x = W / 2 + 60 - lt * 40, sc = 1 + 0.25 * Math.exp(-lt * 10);
  c.translate(x, o.y ?? H / 2); c.scale(sc, sc);
  c.globalAlpha = a; c.lineWidth = 5; c.strokeStyle = o.color ?? CREAM; c.strokeText(s, 0, 0);
  c.globalAlpha = a * 0.12; c.fillStyle = o.color ?? CREAM; c.fillText(s, 0, 0);
  c.restore();
}

const POOL = 'ABCDEGHIKLMNOPQRSTUVXYĐĂÂÊÔƠƯ0123456789#*+=/<>';
/** Chữ giải mã (pdoom): ký tự ngẫu nhiên chạy rồi khoá đúng chữ, lần lượt từ trái sang. Trả về bề rộng. */
export function decode(c: CanvasRenderingContext2D, s: string, lt: number, out: number,
  o: { x?: number; y?: number; size?: number; color?: string; face?: 'mono' | 'sans'; align?: CanvasTextAlign; per?: number; glow?: boolean } = {}) {
  if (lt < 0 || lt > out + 0.5) return 0;
  const fam = o.face === 'sans' ? F.archivo(112, 900) : F.mono(600), size = o.size ?? 80;
  const ch = Array.from(s), per = o.per ?? 0.03, fi = Math.floor(lt * 30);
  const outK = smoothstep(out, out + 0.5, lt);
  const txt = ch.map((x, i) => {
    if (x === ' ') return ' ';
    const lock = 0.12 + i * per, scr = outK > 0 && hash(i, 9) < outK;
    if (lt < lock - 0.35) return '';
    if (lt < lock || scr) return POOL[Math.floor(hash(fi, i) * POOL.length)]!;
    return x;
  }).join('');
  c.save(); c.font = font(fam, size); c.textAlign = o.align ?? 'center'; c.textBaseline = 'middle';
  c.globalAlpha = 1 - smoothstep(out + 0.25, out + 0.5, lt);
  // glow: quầng sáng kem (chữ tối trên nền trời sáng); mặc định bóng tối (chữ sáng trên ảnh)
  c.shadowColor = o.glow ? 'rgba(255,248,232,0.95)' : 'rgba(0,0,0,0.6)'; c.shadowBlur = o.glow ? 26 : 20;
  c.fillStyle = o.color ?? CREAM; c.fillText(txt, o.x ?? W / 2, o.y ?? H / 2);
  if (o.glow) { c.shadowBlur = 0; c.globalAlpha *= 1; c.fillText(txt, o.x ?? W / 2, o.y ?? H / 2); }
  const w = c.measureText(s).width; c.restore();
  return w;
}

/** Ngắt dòng theo bề rộng. */
export function wrap(c: CanvasRenderingContext2D, s: string, maxW: number) {
  const out: string[] = []; let cur = '';
  for (const w of s.split(' ')) { const t = cur ? cur + ' ' + w : w; if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}

/** Lời chúc: từng từ bật lên theo nhịp (karaoke), chữ serif nghiêng lớn trên nền tối. */
export function wish(c: CanvasRenderingContext2D, s: string, lt: number, out: number, o: { x: number; y: number; maxW: number; size?: number; wps?: number; align?: CanvasTextAlign }) {
  if (lt < 0 || lt > out + 0.4) return;
  const size = o.size ?? 64, lh = size * 1.18, wps = o.wps ?? 7;
  c.save(); c.font = font(F.serif(600, true), size); c.textBaseline = 'alphabetic';
  const lines = wrap(c, s, o.maxW), y0 = o.y - (lines.length * lh) / 2 + size * 0.75;
  const fade = 1 - smoothstep(out, out + 0.4, lt);
  c.shadowColor = 'rgba(0,0,0,0.65)'; c.shadowBlur = 22;
  let wi = 0;
  lines.forEach((ln, li) => {
    const lw = c.measureText(ln).width;
    let x = o.align === 'center' ? o.x - lw / 2 : o.align === 'right' ? o.x - lw : o.x;
    for (const w of ln.split(' ')) {
      const k = clamp((lt - wi / wps) / 0.25);
      if (k > 0) {
        c.globalAlpha = ease.outCubic(k) * fade;
        c.fillStyle = CREAM;
        const sc = 1 + 0.35 * (1 - ease.outBack(k));
        c.save(); c.translate(x, y0 + li * lh); c.scale(sc, sc); c.fillText(w, 0, 0); c.restore();
      }
      x += c.measureText(w + ' ').width; wi++;
    }
  });
  c.restore();
}

/** Nhãn nhỏ dạng thẻ (pill) kiểu sticker CapCut. */
export function tag(c: CanvasRenderingContext2D, s: string, lt: number, out: number, x: number, y: number, color = HOT) {
  if (lt < 0 || lt > out + 0.2) return;
  const k = ease.outBack(clamp(lt / 0.3)), a = 1 - smoothstep(out, out + 0.2, lt);
  c.save(); c.font = font(F.archivo(112, 800), 40); c.letterSpacing = '3px'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(s).width + 64;
  c.translate(x, y); c.scale(k, k); c.rotate(-0.04); c.globalAlpha = a;
  c.fillStyle = color; c.beginPath(); c.roundRect(-w / 2, -38, w, 76, 38); c.fill();
  c.fillStyle = '#fff'; c.fillText(s, 0, 2);
  c.restore();
}
