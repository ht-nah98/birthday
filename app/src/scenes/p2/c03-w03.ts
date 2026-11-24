// c03 · Lời chúc 03 (giản dị, chân thành). Bố cục: ẢNH GIỮA + STICKER. Ảnh chính ở giữa đẩy vào rất chậm (giản dị),
// đúng lúc chữ chạy tới "thích gì được nấy" hai ảnh nhỏ viền trắng bật ra như sticker (nảy, xoay) cho dí dỏm.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BEAT } from './cues';
import { P2_POST, W, H, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c03-w03')!;
const T_TEXT = 0.3;
// cả đoạn hiện cùng lúc; người đọc ~2,7 từ/giây tới "thích" (từ thứ 26) vào khoảng +6.5 s → sticker bật ở phách 9 và 10
const STICKERS = [
  { id: PHOTOS.w03[1], at: 9 * BEAT, x: 318, y: 430, w: 250, h: 330, rot: -0.14, fx: 0.5, fy: 0.45 },
  { id: PHOTOS.w03[2], at: 10 * BEAT, x: 1594, y: 318, w: 380, h: 228, rot: 0.1, fx: 0.5, fy: 0.5 },
];

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(PHOTOS.w03); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.65, W * 0.5, H * 0.38);
    const fadeOut = 1 - smoothstep(dur - 0.35, dur, lt);

    // ảnh chính: hiện mềm, đẩy vào rất chậm suốt chương
    const k0 = clamp(lt / 0.9), push = clamp(lt / dur);
    drawPhoto(c, this.img[PHOTOS.w03[0]]!, {
      x: W / 2, y: 384, w: 820, h: 560, frame: 'hairline', shadow: 0.8, scale: lerp(0.96, 1, ease.outCubic(k0)),
      fx: 0.55, fy: 0.55, zoom: 1.0 + 0.09 * ease.inOutQuad(push), alpha: smoothstep(0, 1, k0) * fadeOut,
    });

    // sticker: viền trắng dày, bóng, bật ra (outBack) + xoay về góc nghiêng + lắc nhẹ tắt dần
    for (const s of STICKERS) {
      const u = lt - s.at;
      if (u <= 0) continue;
      const k = clamp(u / 0.5);
      const sc = ease.outBack(k, 2.2);
      const wob = Math.sin(u * 14) * Math.exp(-u * 4.5) * 0.06;
      const rot = s.rot + (1 - ease.outCubic(k)) * 0.6 * Math.sign(s.rot) + wob;
      c.save();
      c.translate(s.x, s.y); c.rotate(rot); c.scale(sc, sc);
      c.globalAlpha = smoothstep(0, 0.15, k) * fadeOut;
      const pad = 12;
      c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 26; c.shadowOffsetY = 10;
      c.fillStyle = '#F6F2EA'; c.beginPath(); c.roundRect(-s.w / 2 - pad, -s.h / 2 - pad, s.w + pad * 2, s.h + pad * 2, 14); c.fill();
      c.restore();
      c.save();
      c.translate(s.x, s.y); c.rotate(rot); c.scale(sc, sc);
      drawPhoto(c, this.img[s.id]!, { x: 0, y: 0, w: s.w, h: s.h, frame: 'none', fx: s.fx, fy: s.fy, alpha: smoothstep(0, 0.15, k) * fadeOut });
      c.restore();
    }

    chip(c, TEXT.w03.label, W / 2, 764, lt - 0.1, dur - 0.5 - 0.1, { align: 'center' });
    paragraph(c, TEXT.w03.line, lt - T_TEXT, dur - 0.5 - T_TEXT, {
      x: W / 2, y: 840, maxW: 1500, size: 48, align: 'center', wps: 0, highlight: ['thích gì được nấy'],
    });

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
