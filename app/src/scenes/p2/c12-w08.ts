// c12 · Lời chúc 08 (bridge "Nhà có thể lớn, có thể nhỏ…"). Bố cục: ẢNH LỚN TOÀN KHUNG + CHỮ TRÊN DẢI TỐI (kiểu phim tài liệu).
// Ảnh đẩy chậm, đổi ảnh bằng hé mở ngang theo ô nhịp (vạch vàng mảnh ở mép hé). Mặt người nằm nửa trên, chữ ở dải dưới.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BAR, BEAT } from './cues';
import { GOLD, P2_POST, W, H, chip, drawPhoto, paragraph, photos } from './kit';
import { bottomBand } from './agC-lib';

const C = CHAPTERS.find((c) => c.id === 'c12-w08')!;
// at = giây vào (theo ô nhịp), fx/fy = điểm lấy nét (mặt người), dir = hướng hé mở
const SHOTS = [
  { id: PHOTOS.w08[0], at: 0, fx: 0.42, fy: 0.3, dir: 'right' as const },
  { id: PHOTOS.w08[1], at: BAR * 2, fx: 0.5, fy: 0.6, dir: 'left' as const },
  { id: PHOTOS.w08[2], at: BAR * 3, fx: 0.5, fy: 0.7, dir: 'right' as const },
];
const REV = 0.9; // thời gian hé mở

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(SHOTS.map((d) => d.id)); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear('#0E0B09');

    SHOTS.forEach((s, i) => {
      const next = SHOTS[i + 1];
      if (lt < s.at || (next && lt > next.at + REV)) return;
      const rv = i === 0 ? 1 : ease.inOutCubic(clamp((lt - s.at) / REV));
      const life = clamp((lt - s.at) / ((next?.at ?? dur) - s.at + REV));
      drawPhoto(c, this.img[s.id]!, {
        x: W / 2, y: H / 2, w: W, h: H, fx: s.fx, fy: s.fy, zoom: 1.04 + 0.07 * ease.inOutQuad(life),
        reveal: rv, revealDir: s.dir, grade: 'warm', gradeAmt: 0.7,
      });
      // vạch vàng mảnh ở mép hé mở
      if (rv > 0 && rv < 1) {
        const x = s.dir === 'right' ? W * rv : W * (1 - rv);
        c.save(); c.globalAlpha = Math.sin(rv * Math.PI) * 0.8; c.fillStyle = GOLD; c.fillRect(x - 1, 0, 2, H); c.restore();
      }
    });

    bottomBand(c, 580, 0.92);
    chip(c, TEXT.w08.label, 140, 768, lt - 0.1, dur - 0.8);
    paragraph(c, TEXT.w08.a, lt - 0.2, dur - 0.2 - 0.7, { x: 140, y: 840, maxW: 1640, size: 46, lh: 58, wps: 0, highlight: ['chỗ dựa đầy yêu thương'] });

    // đầu chương sáng dần từ tối (sau clip)
    if (lt < 0.7) { c.save(); c.globalAlpha = 1 - smoothstep(0, 0.7, lt); c.fillStyle = '#070504'; c.fillRect(0, 0, W, H); c.restore(); }
    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
