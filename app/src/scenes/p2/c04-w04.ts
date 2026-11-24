// c04 · Lời chúc 04 (tài lộc). Bố cục: LƯỚI 2×2 KHUNG VÀNG. Bốn thẻ mặt vàng hiện sẵn bên trái, lật mở lần lượt
// mỗi hai phách (lật kiểu thẻ: scaleX 1→0 mặt sau, 0→1 mặt ảnh); bụi vàng lấp lánh nhẹ bay lên. Lời chúc bên phải.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BEAT } from './cues';
import { GOLD, P2_POST, W, H, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c04-w04')!;
const CW = 400, CH = 300, PAD = CH * 0.025;
// thứ tự lật: trái trên → phải trên → trái dưới → phải dưới, mỗi hai phách
const CELLS = [
  { id: PHOTOS.w04[0], x: 330, y: 372, at: BEAT * 1, fx: 0.5, fy: 0.5 },
  { id: PHOTOS.w04[1], x: 764, y: 372, at: BEAT * 3, fx: 0.5, fy: 0.5 },
  { id: PHOTOS.w04[2], x: 330, y: 706, at: BEAT * 5, fx: 0.55, fy: 0.6 },
  { id: PHOTOS.w04[3], x: 764, y: 706, at: BEAT * 7, fx: 0.5, fy: 0.78 },
];
const FLIP = 0.6;

const hash = (i: number, s: number) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(CELLS.map((c) => c.id)); }

  /** mặt sau của thẻ: nền vàng, viền trong mảnh, hình thoi nhỏ ở giữa */
  back(c: CanvasRenderingContext2D, a: number) {
    const W0 = CW + PAD * 2, H0 = CH + PAD * 2;
    c.globalAlpha = a;
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
    const g = c.createLinearGradient(-W0 / 2, -H0 / 2, W0 / 2, H0 / 2);
    g.addColorStop(0, '#6E5226'); g.addColorStop(0.45, '#C9A764'); g.addColorStop(1, '#5E4520');
    c.fillStyle = g; c.fillRect(-W0 / 2, -H0 / 2, W0, H0);
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    c.strokeStyle = 'rgba(255,236,190,0.75)'; c.lineWidth = 1.5; c.strokeRect(-W0 / 2 + 14, -H0 / 2 + 14, W0 - 28, H0 - 28);
    c.fillStyle = 'rgba(255,236,190,0.8)';
    c.beginPath(); c.moveTo(0, -22); c.lineTo(14, 0); c.lineTo(0, 22); c.lineTo(-14, 0); c.closePath(); c.fill();
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.75, W * 0.3, H * 0.5);
    const fadeOut = 1 - smoothstep(dur - 0.35, dur, lt);
    const appear = smoothstep(0, 0.5, lt) * fadeOut;

    CELLS.forEach((cell, i) => {
      const k = clamp((lt - cell.at) / FLIP);
      const lift = 1 + 0.06 * Math.sin(k * Math.PI);                 // nhấc nhẹ khi lật
      const ent = ease.outCubic(clamp((lt - i * 0.08) / 0.6));        // thẻ hiện ra đầu chương
      c.save();
      c.translate(cell.x, cell.y + (1 - ent) * 30);
      if (k < 0.5) {
        const sx = Math.cos(ease.inQuad(k * 2) * Math.PI / 2);
        c.scale(sx * lift, lift);
        this.back(c, appear * ent);
        c.restore();
      } else {
        c.restore();
        const sx = Math.sin(ease.outCubic((k - 0.5) * 2) * Math.PI / 2);
        c.save();
        c.translate(cell.x, cell.y); c.scale(Math.max(sx, 0.001) * lift, lift);
        const kb = clamp((lt - cell.at) / (dur - cell.at));
        drawPhoto(c, this.img[cell.id]!, { x: 0, y: 0, w: CW, h: CH, frame: 'gold', shadow: 0.7, fx: cell.fx, fy: cell.fy, zoom: 1.02 + 0.06 * kb, alpha: fadeOut });
        // ánh vàng quét qua mặt ảnh ngay sau khi lật
        const sweep = clamp((lt - cell.at - FLIP * 0.6) / 0.8);
        if (sweep > 0 && sweep < 1) {
          const sxp = lerp(-CW, CW, sweep);
          const gg = c.createLinearGradient(sxp - 120, 0, sxp + 120, 0);
          gg.addColorStop(0, 'rgba(255,226,160,0)'); gg.addColorStop(0.5, `rgba(255,226,160,${0.28 * fadeOut})`); gg.addColorStop(1, 'rgba(255,226,160,0)');
          c.globalCompositeOperation = 'lighter'; c.fillStyle = gg; c.fillRect(-CW / 2, -CH / 2, CW, CH);
        }
      }
      c.restore();
    });

    // bụi vàng: hạt nhỏ bay lên chậm, lấp lánh, quanh lưới ảnh
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const x = 90 + hash(i, 1) * 960 + Math.sin(f.t * 0.6 + i) * 14;
      const y = H + 40 - ((hash(i, 2) * (H + 80) + f.t * (18 + 26 * hash(i, 3))) % (H + 80));
      const tw = 0.5 + 0.5 * Math.sin(f.t * (2 + 3 * hash(i, 4)) + i * 2.3);
      const rad = 1.2 + 2.6 * hash(i, 5);
      const a = 0.55 * tw * appear;
      const g = c.createRadialGradient(x, y, 0, x, y, rad * 4);
      g.addColorStop(0, `rgba(255,226,160,${a})`); g.addColorStop(1, 'rgba(255,226,160,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, rad * 4, 0, Math.PI * 2); c.fill();
      if (rad > 3 && tw > 0.8) {   // vài hạt lớn có tia chữ thập
        c.strokeStyle = `rgba(255,236,190,${a * 0.8})`; c.lineWidth = 1;
        c.beginPath(); c.moveTo(x - rad * 5, y); c.lineTo(x + rad * 5, y); c.moveTo(x, y - rad * 5); c.lineTo(x, y + rad * 5); c.stroke();
      }
    }
    c.restore();

    chip(c, TEXT.w04.label, 1060, 430, lt - 0.1, dur - 0.5 - 0.1, { color: GOLD });
    paragraph(c, TEXT.w04.line, lt - 0.3, dur - 0.5 - 0.3, {
      x: 1060, y: 515, maxW: 780, size: 52, wps: 0, highlight: ['tài lộc', 'may mắn'],
    });

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
