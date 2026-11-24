// c13 · Điệp khúc cuối (cao trào), ba phần. (a) câu "…thật nhiều vàng!" dí dỏm trên mưa lấp lánh vàng;
// (b) BẢNG GHÉP LỚN DẦN: câu hiện cả đoạn, mỗi từ khoá (sum vầy, chuyến đi, bữa cơm, kỷ niệm đẹp) sáng vàng đúng phách và thêm một ảnh;
// (c) câu cuối lá thư của hai vợ chồng cháu trên ảnh cưới toàn khung, trái tim cam vẽ tay thay ký tự ❤️ (phông không có).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BAR, BEAT } from './cues';
import { P2_POST, W, H, blurCover, drawPhoto, photos, warmBackground } from './kit';
import { bottomBand, heart, paragraphAt } from './agC-lib';

const C = CHAPTERS.find((c) => c.id === 'c13-ket')!;
const SB = BAR * 2;     // 5.758: vào (b)
const SC = BAR * 6;     // 17.274: vào (c), giữ ~14 s đến hết chương
const K = PHOTOS.ket;
// từ khoá → ảnh, phách xuất hiện (tính từ SB), ô trong bảng ghép
const TILES = [
  { key: TEXT.ket.keys[0], id: K.sumvay, beat: 2, x: 470, y: 330, w: 620, h: 410, rot: -0.02, fx: 0.5, fy: 0.45 },
  { key: TEXT.ket.keys[1], id: K.chuyendi, beat: 4, x: 945, y: 410, w: 300, h: 400, rot: 0.03, fx: 0.5, fy: 0.45 },
  { key: TEXT.ket.keys[2], id: K.buacom, beat: 6, x: 440, y: 770, w: 540, h: 370, rot: 0.015, fx: 0.5, fy: 0.55 },
  { key: TEXT.ket.keys[3], id: K.kyniem, beat: 8, x: 905, y: 800, w: 400, h: 300, rot: -0.03, fx: 0.5, fy: 0.35 },
];
const WORDS = TEXT.ket.a.split(' ');
/** chỉ số từ đầu tiên của cụm từ khoá trong câu a */
const keyIdx = (k: string) => WORDS.findIndex((_, i) => WORDS.slice(i, i + k.split(' ').length).join(' ').toLowerCase().startsWith(k));
const KI = TILES.map((t) => keyIdx(t.key));
const KT = TILES.map((t) => SB + t.beat * BEAT);
/** câu a hiện cả đoạn ngay khi vào (b) cho đủ thời gian đọc; từ khoá chuyển sang vàng đúng phách, cùng lúc ảnh của nó vào */
function hiB(i: number) {
  for (let j = KI.length - 1; j >= 0; j--) if (i >= KI[j]!) return KT[j]!;
  return SB;
}
const LAST = TEXT.thu.last.replace(/\s*❤️\s*$/, '');   // ❤️ vẽ bằng heart()

// mưa lấp lánh vàng (tất định)
const RAIN = Array.from({ length: 90 }, (_, i) => {
  const h = (k: number) => Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % 1;
  return { x: h(1) * W, y0: h(2) * H * 1.4, v: 70 + 120 * h(3), r: 2 + 5 * h(4), ph: h(5) * 6.28, sw: 10 + 25 * h(6) };
});

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos([...TILES.map((t) => t.id), K.last, PHOTOS.w08[0]]); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.7, W * 0.5, H * 0.45);

    // ---- (a) 0 → SB: "…nhiều tiền và thật nhiều vàng!"
    if (lt < SB + 0.6) {
      const a = 1 - smoothstep(SB - 0.5, SB + 0.4, lt);
      c.save(); c.globalAlpha = a; blurCover(c, this.img[PHOTOS.w08[0]]!, 36, 0.62, 1.12); c.restore();
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const p of RAIN) {
        const y = ((p.y0 + lt * p.v) % (H * 1.4)) - H * 0.2, x = p.x + Math.sin(lt * 1.3 + p.ph) * p.sw;
        const tw = 0.55 + 0.45 * Math.sin(lt * 7 + p.ph * 3);
        c.globalAlpha = a * smoothstep(0, 0.8, lt) * tw * 0.8;
        const g = c.createRadialGradient(x, y, 0, x, y, p.r * 3);
        g.addColorStop(0, 'rgba(255,226,160,0.95)'); g.addColorStop(0.3, 'rgba(233,190,110,0.45)'); g.addColorStop(1, 'rgba(233,190,110,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, p.r * 3, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,240,205,0.9)'; c.fillRect(x - p.r * 1.6, y - 0.6, p.r * 3.2, 1.2); c.fillRect(x - 0.6, y - p.r * 1.6, 1.2, p.r * 3.2);
      }
      c.restore();
      // cả câu hiện gần như ngay
      paragraphAt(c, TEXT.w08.b, lt, SB - 0.65, (i) => 0.1 + i * 0.05, { x: W / 2, y: H / 2, maxW: 1280, size: 66, lh: 84, align: 'center', anchor: 'middle', highlight: ['nhiều tiền', 'thật nhiều vàng!'] });
    }

    // ---- (b) SB → SC: bảng ghép lớn dần theo từ khoá
    if (lt > SB - 0.2 && lt < SC + 0.8) {
      const fade = 1 - smoothstep(SC - 0.1, SC + 0.6, lt);
      const grow = lerp(0.9, 1.04, ease.inOutQuad(clamp((lt - SB) / (SC - SB))));
      c.save();
      c.translate(690, 560); c.scale(grow, grow); c.translate(-690, -560);
      for (const [j, t] of TILES.entries()) {
        const k = clamp((lt - KT[j]!) / 0.5);
        if (k <= 0) continue;
        const e = ease.outBack(k);
        drawPhoto(c, this.img[t.id]!, {
          x: t.x, y: t.y, w: t.w, h: t.h, rot: t.rot * e, scale: 0.82 + 0.18 * e, alpha: smoothstep(0, 0.35, k) * fade,
          frame: 'hairline', shadow: 0.7, fx: t.fx, fy: t.fy, zoom: 1.03 + 0.05 * clamp((lt - KT[j]!) / 6), grade: 'warm', gradeAmt: 0.6,
        });
      }
      c.restore();
      paragraphAt(c, TEXT.ket.a, lt, SC - 0.75, () => SB - 0.1, { x: 1200, y: H / 2, maxW: 620, size: 50, anchor: 'middle', highlight: TEXT.ket.keys, hiAt: hiB });
    }

    // ---- (c) SC → hết: câu cuối lá thư trên ảnh cưới
    if (lt > SC) {
      const k = clamp((lt - SC) / 1.1);
      drawPhoto(c, this.img[K.last]!, {
        x: W / 2, y: H / 2, w: W, h: H, fx: 0.5, fy: 0.3, zoom: 1.03 + 0.06 * clamp((lt - SC) / (dur - SC)),
        reveal: k, revealDir: 'iris', grade: 'warm', gradeAmt: 0.5,
      });
      c.save(); c.globalAlpha = smoothstep(0.3, 1.0, k); bottomBand(c, 640, 0.88); c.restore();
      const t0 = SC + 0.3, outT = dur - 0.75;
      const p = paragraphAt(c, LAST, lt, outT, () => t0, { x: W / 2, y: 905, maxW: 1200, size: 50, lh: 64, align: 'center', anchor: 'middle', highlight: ['Chúc mừng sinh nhật Cậu Hưng!'] });
      const hk = clamp((lt - t0 - 0.4) / 0.5);
      heart(c, p.endX + 34, p.endY - 15, 30 * (0.6 + 0.4 * ease.outBack(hk)), smoothstep(0, 0.4, hk) * (1 - smoothstep(outT, outT + 0.6, lt)));
    }

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
