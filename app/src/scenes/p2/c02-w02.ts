// c02 · Lời chúc 02 (gia đình các con). Bố cục: BA KHUNG DỌC (triptych). Ba khung trượt vào lần lượt mỗi nửa ô nhịp,
// xen kẽ từ dưới lên / trên xuống; trong khung ảnh trôi Ken Burns ngược chiều nhau. Lời chúc dài nằm ở dải dưới có nền tối mờ.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BAR } from './cues';
import { P2_POST, W, H, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c02-w02')!;
const PW = 520, PH = 600, PY = 382;
// mỗi khung: tâm x, lúc vào, hướng vào (+1 từ dưới, -1 từ trên), Ken Burns (zoom đầu→cuối, trôi px), điểm lấy nét
const PANELS = [
  { id: PHOTOS.w02[0], x: 400, at: 0, dir: 1, z0: 1.3, z1: 1.42, px: 0, py: 20, fx: 0.6, fy: 0.5 },
  { id: PHOTOS.w02[1], x: 960, at: BAR * 0.5, dir: -1, z0: 1.14, z1: 1.03, px: 40, py: 0, fx: 0.5, fy: 0.4 },
  { id: PHOTOS.w02[2], x: 1520, at: BAR, dir: 1, z0: 1.03, z1: 1.12, px: 0, py: 30, fx: 0.5, fy: 0.4 },
];

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(PANELS.map((p) => p.id)); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.6, W * 0.5, H * 0.35);
    const fadeOut = 1 - smoothstep(dur - 0.35, dur, lt);

    PANELS.forEach((p, i) => {
      const k = clamp((lt - p.at) / 1.0);
      if (k <= 0) return;
      const e = ease.outCubic(k);
      const kb = ease.inOutQuad(clamp((lt - p.at) / (dur - p.at)));
      drawPhoto(c, this.img[p.id]!, {
        x: p.x, y: PY + (1 - e) * 160 * p.dir, w: PW, h: PH, frame: 'hairline', shadow: 0.7,
        reveal: ease.outCubic(clamp(k * 1.25)), revealDir: p.dir > 0 ? 'up' : 'down',
        fx: p.fx, fy: p.fy, zoom: lerp(p.z0, p.z1, kb), panX: lerp(-p.px, p.px, kb) * (i === 1 ? -1 : 1), panY: lerp(-p.py, p.py, kb),
        alpha: smoothstep(0, 0.3, k) * fadeOut,
      });
    });

    // dải chữ dưới: nền tối mờ để đọc rõ
    const band = smoothstep(0, 0.6, lt) * fadeOut;
    const g = c.createLinearGradient(0, 700, 0, H);
    g.addColorStop(0, 'rgba(10,8,6,0)'); g.addColorStop(0.3, `rgba(10,8,6,${0.6 * band})`); g.addColorStop(1, `rgba(10,8,6,${0.8 * band})`);
    c.fillStyle = g; c.fillRect(0, 700, W, H - 700);

    chip(c, TEXT.w02.label, W / 2, 772, lt - 0.1, dur - 0.5 - 0.1, { align: 'center' });
    paragraph(c, TEXT.w02.line, lt - 0.3, dur - 0.5 - 0.3, { x: W / 2, y: 846, maxW: 1700, size: 46, align: 'center', wps: 0, highlight: ['mạnh khỏe, trẻ trung, phong độ'] });

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
