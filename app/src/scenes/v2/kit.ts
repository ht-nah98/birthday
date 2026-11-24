// Bộ dùng chung cho các plate của trailer v2: màu, chữ, đốm cam (motif "một người"), cú đập theo phách.
// Quy ước chất liệu (theo pdoom TREATMENT.md): nền mực, nét trắng ngà mảnh, MỘT màu cam phát sáng.
// Chỉ cam/ember được vượt ~0.85 tuyến tính (bloom); chữ trắng ngà phải sắc, không loé.
import * as THREE from 'three';
import { FSPass, W, H } from '../../engine/gl';
import { F, font, fitSize } from '../../engine/type';
import { rgba, LIN } from '../../engine/palette';
import { clamp, ease, hash, lerp, pulse, smoothstep, frameIdx } from '../../engine/util';
import type { PostOverrides } from '../../engine/scene';

export const A = W / H;

/** Đặt một FSPass sang chế độ cộng thuần (One/One). Dùng cho mọi lớp phát sáng vẽ đè. */
export function additive(p: FSPass) {
  const m = p.mat; m.blending = THREE.CustomBlending; m.transparent = true; m.blendEquation = THREE.AddEquation;
  m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
  return p;
}
export const INK: [number, number, number] = [0.0031, 0.0031, 0.0036];
export { LIN, rgba };

/** Hậu kỳ mặc định cho mọi plate: không HUD pdoom, bloom vừa, hạt phim nhẹ. */
// ca 0.6: ở 1.4 các nét mảnh sát mép bị tách thành viền tím/xanh, lạc bảng màu.
// bloomThreshold 0.95: chữ trắng ngà (~0.84 tuyến tính) không loé, chỉ cam/ember loé.
export const BASE_POST: PostOverrides = { hud: 0, frame: 0, bloom: 0.6, bloomThreshold: 0.95, grain: 0.05, ca: 0.6, vignette: 0.4, halation: 0.3 };

/**
 * Cú đập: rung khung, đẩy zoom, loé (flash). `hits` là các thời điểm F; `big` = cú lớn.
 * Flash cộng trắng giữ bán rã ngắn và cắt ở 0,2 s (xem docs/02-CONG-NGHE.md, mục bẫy).
 */
export function hitPost(t: number, hits: number[], big: number[] = [], post: PostOverrides = {}): PostOverrides {
  let sh = 0, zm = 0, fl = 0;
  for (const h of hits) {
    if (t < h || t - h > 1) continue;
    const k = big.includes(h) ? 1 : 0.45;
    sh = Math.max(sh, pulse(t, h, 0.07) * k);
    zm = Math.max(zm, pulse(t, h, 0.1) * k);
    // Không dùng flash cộng trắng: 0,06 tuyến tính đã thành xám ~27% cả khung (mất màu đen).
    // Thay bằng đẩy phơi sáng: chỉ chỗ sáng sáng thêm, đen vẫn đen.
    if (big.includes(h) && t - h < 0.25) fl = Math.max(fl, pulse(t, h, 0.05) * (1 - (t - h) / 0.25));
  }
  const fi = frameIdx(t);
  return {
    ...post,
    shake: [(hash(fi, 1) - 0.5) * 30 * sh, (hash(fi, 2) - 0.5) * 22 * sh],
    zoom: (post.zoom ?? 1) + 0.035 * zm,
    exposure: (post.exposure ?? 1) * (1 + 0.9 * fl),
  };
}

// ------------------------------------------------------------------ chữ (Canvas2D, toạ độ px logic 1920x1080)

export interface BigOpts {
  /** giây kể từ lúc chữ vào (đập) */
  lt: number;
  x?: number; y?: number;
  /** bề rộng tối đa (px) và cỡ tối đa */
  w?: number; max?: number;
  /** trục Archivo: width 62..125, weight 300..900 */
  width?: number; weight?: number;
  color?: string; alpha?: number; align?: CanvasTextAlign;
  /** độ "nảy" lúc đập (0 = không) */
  punch?: number;
  tracking?: number;
}

/** Chữ khoá to (Archivo), đập vào đúng `lt = 0`. Trả về cỡ chữ đã dùng. */
export function big(c: CanvasRenderingContext2D, s: string, o: BigOpts) {
  if (o.lt < 0) return 0;
  const fam = F.archivo(o.width ?? 100, o.weight ?? 900), size = fitSize(s, fam, o.w ?? 1640, o.max ?? 300, o.tracking ?? 0);
  const k = 1 + (o.punch ?? 0.28) * Math.exp(-o.lt * 16) + 0.015 * o.lt;
  c.save();
  c.globalAlpha = (o.alpha ?? 1) * clamp(o.lt * 40 + 0.35);
  c.translate(o.x ?? W / 2, o.y ?? H / 2); c.scale(k, k);
  c.font = font(fam, size); c.textAlign = o.align ?? 'center'; c.textBaseline = 'alphabetic';
  if (o.tracking) c.letterSpacing = `${o.tracking}px`;
  c.fillStyle = o.color ?? rgba('bone');
  c.fillText(s, 0, size * 0.35);
  c.restore();
  return size;
}

export interface TypeOpts {
  x: number; y: number; size?: number; color?: string; alpha?: number; align?: CanvasTextAlign;
  /** ký tự mỗi giây */
  cps?: number;
  caret?: boolean;
  /** tô cam một đoạn con (đã gõ tới) */
  highlight?: string;
  weight?: number;
}

/** Gõ máy (IBM Plex Mono): giọng "máy" của phim. Trả về số ký tự đã hiện. */
export function typeLine(c: CanvasRenderingContext2D, s: string, lt: number, o: TypeOpts) {
  if (lt < 0) return 0;
  const chars = Array.from(s), n = Math.min(chars.length, Math.floor(lt * (o.cps ?? 28)));
  const shown = chars.slice(0, n).join('');
  const size = o.size ?? 30, fam = F.mono(o.weight ?? 400);
  c.save();
  c.font = font(fam, size); c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.globalAlpha = o.alpha ?? 1;
  const full = c.measureText(s).width;
  const x0 = o.align === 'center' ? o.x - full / 2 : o.align === 'right' ? o.x - full : o.x;
  c.fillStyle = o.color ?? rgba('bone');
  c.fillText(shown, x0, o.y);
  if (o.highlight) {
    const i = s.indexOf(o.highlight);
    if (i >= 0 && n > i) {
      const pre = c.measureText(s.slice(0, i)).width;
      c.fillStyle = rgba('signal');
      c.fillText(Array.from(o.highlight).slice(0, n - i).join(''), x0 + pre, o.y);
    }
  }
  if (o.caret !== false) {
    const blink = n >= chars.length ? (Math.floor(lt * 2.2) % 2 === 0 ? 1 : 0) : 1;
    if (blink) { c.fillStyle = rgba('signal'); c.fillRect(x0 + c.measureText(shown).width + 3, o.y - size * 0.78, size * 0.5, size * 0.95); }
  }
  c.restore();
  return n;
}

/** Câu chiêm nghiệm (Cormorant nghiêng), hiện mềm, giãn chữ khép dần. */
export function serifLine(c: CanvasRenderingContext2D, s: string, lt: number, dur: number, o: { x?: number; y?: number; size?: number; alpha?: number; color?: string } = {}) {
  const a = Math.min(smoothstep(0, 0.45, lt), 1 - smoothstep(dur - 0.3, dur, lt)) * (o.alpha ?? 1);
  if (a <= 0) return;
  c.save();
  c.font = font(F.serif(600, true), o.size ?? 64); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.globalAlpha = a;
  c.letterSpacing = `${lerp(9, 2, ease.outCubic(clamp(lt / 1.6)))}px`;
  c.fillStyle = o.color ?? rgba('bone');
  c.fillText(s, o.x ?? W / 2, o.y ?? H * 0.82);
  c.restore();
}

/** Nhãn mono nhỏ kiểu chú thích kỹ thuật (đường kẻ mảnh + chữ). */
export function label(c: CanvasRenderingContext2D, s: string, x: number, y: number, o: { size?: number; color?: string; alpha?: number; align?: CanvasTextAlign } = {}) {
  c.save();
  c.font = font(F.mono(400), o.size ?? 16); c.fillStyle = o.color ?? rgba('ash'); c.globalAlpha = o.alpha ?? 1;
  c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic'; c.letterSpacing = '1px';
  c.fillText(s, x, y);
  c.restore();
}

// ------------------------------------------------------------------ đốm cam: "một người"

/**
 * Đốm cam vẽ cộng (additive) lên khung: lõi trắng nóng, quầng cam, tia lấp lánh nhỏ.
 * Vị trí theo px logic (x phải, y xuống). Dùng ở MỌI plate có "người" để giữ vật xuyên suốt.
 */
export class Spark {
  pass = new FSPass(/* glsl */ `
    uniform vec2 pos; uniform float size, amt, t;
    void main() {
      vec2 p = (vUv - vec2(pos.x, 1.0 - pos.y)) * vec2(${A.toFixed(5)}, 1.0) / max(size, 1e-4);
      float d = length(p);
      float fl = 0.9 + 0.1 * snoise(vec2(t * 9.0, 3.1));
      vec3 c = vec3(3.0, 2.3, 1.5) * smoothstep(0.06, 0.0, d) * 2.0;
      c += C_EMBER * 1.6 * exp(-d * 9.0);
      c += C_SIGNAL * 0.5 * exp(-d * 2.2);
      float a = atan(p.y, p.x);
      c += C_EMBER * 0.25 * pow(abs(cos(a * 2.0 + t * 0.7)), 40.0) * exp(-d * 3.0);
      fragColor = vec4(c * amt * fl, 0.0);
    }`, { pos: { value: new THREE.Vector2(0.5, 0.5) }, size: { value: 0.05 }, amt: { value: 1 }, t: { value: 0 } },
  { blending: THREE.CustomBlending, transparent: true });

  constructor() {
    // cộng thuần One/One: AdditiveBlending của three nhân với alpha (= 0) nên sẽ mất hình
    const m = this.pass.mat; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor;
    m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
  }

  /** x, y: px logic; size: bán kính chuẩn theo chiều cao khung (0.05 ≈ 54 px). */
  draw(r: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, x: number, y: number, t: number, amt = 1, size = 0.05) {
    if (amt <= 0.001) return;
    const u = this.pass.u;
    (u.pos!.value as THREE.Vector2).set(x / W, y / H);
    u.size!.value = size; u.amt!.value = amt; u.t!.value = t;
    this.pass.render(r, out);
  }
}

/** Dải đen điện ảnh trên/dưới (tỉ lệ 2.39:1 khi k = 1). */
export function bars(c: CanvasRenderingContext2D, k: number) {
  if (k <= 0.001) return;
  const h = 132 * k; c.save(); c.fillStyle = '#000'; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h); c.restore();
}
