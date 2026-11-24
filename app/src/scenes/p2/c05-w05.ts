// c05 · Điệp khúc 1 + lời chúc 05. Bố cục: LƯỚI ẢNH TẾT LẬT THEO PHÁCH. Hai hàng 5 ô ảnh sum vầy, mỗi phách một ô lật
// hoặc trượt đổi ảnh (nhạc dày nhất), lời chúc nằm trong dải mực giữa. Cuối cùng các ô lật thành từng mảnh của ảnh
// đông đủ m25, khe hở khép lại thành một ảnh lớn, rồi lắng xuống để vào clip rót rượu.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BEAT } from './cues';
import { P2_POST, W, H, WARM_INK, GOLD, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';
import { cover, foc } from './agB-lib';

const C = CHAPTERS.find((c) => c.id === 'c05-w05')!;
const BIG = PHOTOS.w05[0]; // m25: ảnh đông đủ
const POOL = PHOTOS.w05.slice(1);
// lưới 2 hàng x 5 cột, dải chữ ở giữa
const GAP = 20, MX = 40, TW = (W - 2 * MX - 4 * GAP) / 5, TH = 330;
const ROWS = [40, H - 40 - TH];
const TILES = ROWS.flatMap((y) => [0, 1, 2, 3, 4].map((i) => ({ x: MX + i * (TW + GAP), y, w: TW, h: TH })));
const STRIP = { y: 390, h: 300 };
// lịch đổi ảnh: phách 3..12, mỗi phách một ô (thứ tự rải đều), kiểu lật/trượt xen kẽ
const ORDER = [3, 7, 1, 8, 5, 0, 9, 2, 6, 4];
type Swap = { tile: number; at: number; from: string; to: string; kind: 'flip' | 'up' | 'left' | 'down' };
const SWAPS: Swap[] = [];
{
  const cur = POOL.slice(0, 10) as string[];
  const queue = [...POOL.slice(10)] as string[];
  const kinds = ['flip', 'up', 'flip', 'left', 'flip', 'down'] as const;
  ORDER.forEach((tile, i) => {
    const to = queue.shift()!;
    SWAPS.push({ tile, at: BEAT * (3 + i), from: cur[tile]!, to, kind: kinds[i % kinds.length]! });
    queue.push(cur[tile]!); cur[tile] = to;
  });
}
// hội tụ: phách 14 các ô lật thành mảnh m25 (từ giữa ra), phách 16 khe khép lại
const MOSAIC = BEAT * 14, MERGE = BEAT * 16, MERGED = MERGE + 1.5;
const MOS_ORDER = [2, 7, 1, 3, 6, 8, 0, 4, 5, 9];
const TXT_IN = BEAT, TXT_OUT = MOSAIC + BEAT * 1.5; // chữ hiện 10,4 s (đọc cần 10 s)

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(PHOTOS.w05); }

  /** ảnh của ô ở thời điểm lt: [ảnh cũ, ảnh mới, tiến độ đổi, kiểu] */
  tileState(i: number, lt: number) {
    let id: string = POOL[i]!, sw: Swap | null = null;
    for (const s of SWAPS) if (s.tile === i) { if (lt >= s.at + 0.5) id = s.to; else if (lt >= s.at) sw = s; }
    return { id, sw, k: sw ? ease.inOutCubic(clamp((lt - sw.at) / 0.5)) : 1 };
  }

  photoIn(c: CanvasRenderingContext2D, id: string, t: { x: number; y: number; w: number; h: number }, lt: number, dx = 0, dy = 0) {
    const [fx, fy] = foc(id);
    drawPhoto(c, this.img[id]!, { x: t.x + t.w / 2 + dx, y: t.y + t.h / 2 + dy, w: t.w, h: t.h, fx, fy, zoom: 1.04 + 0.03 * Math.sin(lt * 0.4 + t.x), frame: 'none', shadow: 0.5 });
  }

  /** mảnh m25 nằm đúng dưới ô (để khi khe khép lại, các mảnh ghép liền thành một ảnh) */
  piece(c: CanvasRenderingContext2D, t: { x: number; y: number; w: number; h: number }, zoom: number) {
    const im = this.img[BIG]!, [fx, fy] = foc(BIG), r = cover(im, fx, fy, zoom);
    c.save(); c.beginPath(); c.rect(t.x, t.y, t.w, t.h); c.clip();
    c.filter = 'sepia(0.08) saturate(0.96) contrast(1.02)';
    c.drawImage(im, r.dx, r.dy, r.dw, r.dh); c.filter = 'none'; c.restore();
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.8, W * 0.5, H * 0.5);
    const zoom = 1 + 0.05 * ease.inOutQuad(clamp((lt - MERGE) / (dur - MERGE)));
    const merge = ease.inOutCubic(clamp((lt - MERGE) / (MERGED - MERGE)));

    // ảnh lớn phía sau hiện dần ở khe và dải giữa khi hội tụ
    if (merge > 0) {
      const im = this.img[BIG]!, [fx, fy] = foc(BIG), rr = cover(im, fx, fy, zoom);
      c.save(); c.globalAlpha = merge; c.filter = 'sepia(0.08) saturate(0.96) contrast(1.02)';
      c.drawImage(im, rr.dx, rr.dy, rr.dw, rr.dh); c.restore();
    }

    if (merge < 1) TILES.forEach((t, i) => {
      // vào: lật lần lượt trong 2 phách đầu
      const kin = ease.outCubic(clamp((lt - i * 0.11) / 0.55));
      if (kin <= 0) return;
      const m0 = MOSAIC + MOS_ORDER.indexOf(i) * 0.12, km = clamp((lt - m0) / 0.5);
      const { id, sw, k } = this.tileState(i, lt);
      c.save();
            const cx = t.x + t.w / 2;
      if (km > 0) {
        // lật sang mảnh m25
        const th = ease.inOutCubic(km) * Math.PI, sx = Math.abs(Math.cos(th));
        c.translate(cx, 0); c.scale(Math.max(sx, 0.001), 1); c.translate(-cx, 0);
        if (th < Math.PI / 2) this.photoIn(c, id, t, lt); else this.piece(c, t, zoom);
      } else if (kin < 1) {
        c.translate(cx, 0); c.scale(Math.max(kin, 0.001), 1); c.translate(-cx, 0);
        this.photoIn(c, id, t, lt);
      } else if (sw && sw.kind === 'flip') {
        const th = k * Math.PI, sx = Math.abs(Math.cos(th));
        c.translate(cx, 0); c.scale(Math.max(sx, 0.001), 1); c.translate(-cx, 0);
        this.photoIn(c, th < Math.PI / 2 ? sw.from : sw.to, t, lt);
      } else if (sw) {
        c.beginPath(); c.rect(t.x, t.y, t.w, t.h); c.clip();
        const [vx, vy] = sw.kind === 'up' ? [0, -1] : sw.kind === 'down' ? [0, 1] : [-1, 0];
        this.photoIn(c, sw.from, t, lt, vx * t.w * k, vy * t.h * k);
        this.photoIn(c, sw.to, t, lt, -vx * t.w * (1 - k), -vy * t.h * (1 - k));
      } else this.photoIn(c, id, t, lt);
      c.restore();
      // viền mảnh, tắt khi ghép liền
      c.save(); c.globalAlpha = 0.5 * (1 - merge) * smoothstep(0.85, 1, kin) * (1 - Math.sin(km * Math.PI)); c.strokeStyle = 'rgba(238,233,223,0.8)'; c.lineWidth = 1;
      c.strokeRect(t.x + 0.5, t.y + 0.5, t.w - 1, t.h - 1); c.restore();
    });

    // dải mực giữa + lời chúc
    const sa = smoothstep(TXT_IN - BEAT, TXT_IN, lt) * (1 - smoothstep(TXT_OUT, TXT_OUT + 0.6, lt));
    if (sa > 0) {
      c.save(); c.globalAlpha = sa;
      const g = c.createLinearGradient(0, STRIP.y, 0, STRIP.y + STRIP.h);
      g.addColorStop(0, 'rgba(14,11,9,0.0)'); g.addColorStop(0.12, 'rgba(14,11,9,0.86)'); g.addColorStop(0.88, 'rgba(14,11,9,0.86)'); g.addColorStop(1, 'rgba(14,11,9,0.0)');
      c.fillStyle = g; c.fillRect(0, STRIP.y - 10, W, STRIP.h + 20); c.restore();
    }
    chip(c, TEXT.w05.label, W / 2, STRIP.y + 62, lt - (TXT_IN - BEAT), TXT_OUT - (TXT_IN - BEAT), { align: 'center' });
    paragraph(c, TEXT.w05.line, lt - TXT_IN, TXT_OUT - TXT_IN, { x: W / 2, y: STRIP.y + 178, maxW: 1480, size: 50, wps: 0, align: 'center', anchor: 'middle', highlight: ['Cậu Hưng'], hiColor: GOLD });

    // lắng xuống cuối chương (nhạc lùi), nối sang nền mực của c06
    const settle = smoothstep(dur - 0.75, dur, lt);
    if (settle > 0) { c.save(); c.globalAlpha = 0.92 * settle; c.fillStyle = WARM_INK; c.fillRect(0, 0, W, H); c.restore(); }

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
