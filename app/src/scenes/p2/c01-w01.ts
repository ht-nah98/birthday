// c01 · Lời chúc 01 (mở đầu chuỗi lời chúc). Bố cục: POLAROID RƠI. Ba ảnh Cậu lần lượt rơi xuống "mặt bàn" bên trái
// đúng phách mạnh, xoay nhẹ, chồng lên nhau; lời chúc hiện từng chữ bên phải. Camera trôi rất chậm sang trái.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BAR } from './cues';
import { P2_POST, W, H, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c01-w01')!;
// ảnh nào, rơi lúc nào (giây kể từ đầu chương), đáp ở đâu, xoay bao nhiêu, lấy nét ở đâu
const DROPS = [
  { id: PHOTOS.w01[0], at: 0.0, x: 470, y: 520, rot: -0.07, fx: 0.62, fy: 0.38 },
  { id: PHOTOS.w01[1], at: BAR * 1, x: 640, y: 470, rot: 0.06, fx: 0.47, fy: 0.42 },
  { id: PHOTOS.w01[2], at: BAR * 2, x: 520, y: 600, rot: -0.025, fx: 0.5, fy: 0.45 },
];

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(DROPS.map((d) => d.id)); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.7, W * 0.35, H * 0.5);
    const drift = -30 * ease.inOutQuad(clamp(lt / dur));

    for (const d of DROPS) {
      const k = clamp((lt - d.at) / 0.55);
      if (k <= 0) continue;
      // rơi từ trên xuống, nảy nhẹ khi chạm bàn
      const fall = ease.outCubic(k), bounce = Math.sin(clamp((lt - d.at - 0.45) / 0.3) * Math.PI) * 6;
      drawPhoto(c, this.img[d.id]!, {
        x: d.x + drift, y: d.y - (1 - fall) * 520 - bounce, w: 400, h: 400, rot: d.rot * (0.4 + 0.6 * fall) + (1 - fall) * 0.25,
        scale: 1 + (1 - fall) * 0.18, frame: 'polaroid', shadow: 0.4 + 0.6 * fall, fx: d.fx, fy: d.fy, zoom: 1.0 + 0.04 * clamp((lt - d.at) / 8),
        alpha: smoothstep(0, 0.12, k),
      });
    }

    // cả đoạn hiện cùng lúc từ +0.3 s, giữ đến gần hết chương: trọn ~10.7 s để đọc (đủ readTime)
    chip(c, TEXT.w01.label, 1000, 330, lt - 0.1, dur - 0.65);
    paragraph(c, TEXT.w01.line, lt - 0.3, dur - 0.95, { x: 1000, y: 410, maxW: 760, size: 50, wps: 0, highlight: ['Cậu Hưng', 'tài lộc'] });

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
