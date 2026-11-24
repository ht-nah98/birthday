// c10 · Lời chúc 07 (điệp khúc 2). Bố cục: LỚP ẢNH CHIỀU SÂU (2.5D). Ảnh Cậu với các cháu treo ở nhiều độ sâu bên trái,
// camera trượt ngang + tiến chậm + nghiêng nhẹ nên lớp gần trôi nhanh, to, mờ; lớp xa nhỏ, chậm. Lời chúc ở khoảng trống bên phải.
// Cuối chương mọi thứ lắng tối để vào khoảng lặng (c11).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BEAT } from './cues';
import { P2_POST, W, H, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';
import { darken } from './agC-lib';

const C = CHAPTERS.find((c) => c.id === 'c10-w07')!;
const [P38, P39, P20, P02, P01, P53] = PHOTOS.w07;
// (x, y) = tâm trên màn khi camera ở gốc, (w, h) = cỡ trên màn lúc đầu, z càng lớn càng xa. `at` = phách vào.
const CARDS = [
  { id: P53, x: 620, y: 620, w: 580, h: 435, z: 1.35, rot: 0.015, fx: 0.42, fy: 0.3, at: 0 },
  { id: P39, x: 590, y: 210, w: 400, h: 300, z: 2.0, rot: -0.02, fx: 0.5, fy: 0.3, at: 2 },
  { id: P20, x: 930, y: 250, w: 260, h: 350, z: 2.4, rot: 0.025, fx: 0.5, fy: 0.22, at: 4 },
  { id: P01, x: 200, y: 780, w: 300, h: 400, z: 1.1, rot: -0.035, fx: 0.55, fy: 0.45, at: 6 },
  { id: P38, x: 330, y: 290, w: 380, h: 500, z: 0.9, rot: 0.03, fx: 0.45, fy: 0.5, at: 8 },
  { id: P02, x: 950, y: 790, w: 320, h: 420, z: 0.85, rot: -0.02, fx: 0.5, fy: 0.5, at: 10 },
];
const TX = 1140; // cột chữ

export default class Chapter extends Scene {
  layer = new Layer2D();
  scratch = new Layer2D(); // vẽ ảnh lớp gần ở đây rồi làm mờ (drawPhoto tự đặt filter riêng)
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(CARDS.map((d) => d.id)); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.6, W * 0.3, H * 0.5);

    // camera: trượt ngang, tiến chậm, nghiêng (roll) rất nhẹ
    const u = ease.inOutQuad(clamp(lt / dur));
    const camX = lerp(-60, 70, u), camY = lerp(15, -15, u), dolly = 0.15 * u, roll = 0.018 * Math.sin(lt * 0.21 + 0.4);
    c.save();
    c.translate(W * 0.36, H / 2); c.rotate(roll); c.translate(-W * 0.36, -H / 2);
    for (const d of [...CARDS].sort((a, b) => b.z - a.z)) {
      const k = clamp((lt - d.at * BEAT) / 1.2);
      if (k <= 0) continue;
      const e = ease.outCubic(k);
      const z = d.z + (1 - e) * 0.35 - dolly;                 // trôi tới từ xa khi vào
      const s = d.z / z;                                       // to dần khi camera tiến
      const px = W * 0.36 + (d.x - W * 0.36) * s - camX / z, py = H / 2 + (d.y - H / 2) * s - camY / z;
      const near = clamp((1.05 - z) / 0.4), far = clamp((z - 1.6) / 0.8);
      const o = {
        x: px, y: py, w: d.w, h: d.h, scale: s, rot: d.rot, frame: 'hairline' as const, shadow: 0.6,
        fx: d.fx, fy: d.fy, zoom: 1.02, alpha: e * (1 - 0.35 * far), grade: 'warm' as const, gradeAmt: 0.6 + 0.4 * far,
      };
      if (near <= 0) { drawPhoto(c, this.img[d.id]!, o); continue; }
      const sc = this.scratch.ctx;
      this.scratch.clear();
      sc.setTransform(c.getTransform());
      drawPhoto(sc, this.img[d.id]!, o);
      c.save(); c.resetTransform(); c.filter = `blur(${(near * 5).toFixed(2)}px)`; c.drawImage(this.scratch.canvas, 0, 0, W, H); c.restore();
    }
    c.restore();

    // khoảng trống bên phải: dải tối mềm sau chữ
    const g = c.createLinearGradient(TX - 260, 0, TX + 40, 0);
    g.addColorStop(0, 'rgba(10,8,6,0)'); g.addColorStop(1, 'rgba(10,8,6,0.72)');
    c.fillStyle = g; c.fillRect(TX - 260, 0, W - TX + 260, H);

    chip(c, TEXT.w07.label, TX, 300, lt - BEAT, dur - 1.9);
    paragraph(c, TEXT.w07.line, lt - BEAT * 2, dur - BEAT * 2 - 1.9, { x: TX, y: 390, maxW: 680, size: 50, wps: 0, highlight: ['chỗ dựa vững chắc, đầy yêu thương'] });

    // lắng tối vào khoảng lặng
    darken(c, smoothstep(dur - 1.5, dur - 0.35, lt));
    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
