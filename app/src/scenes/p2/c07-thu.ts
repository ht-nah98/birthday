// c07 · LÁ THƯ của hai vợ chồng cháu (trọn rap 2, 52 s). Bố cục: ba "trang thư" nối nhau, mỗi trang một cách đặt ảnh:
//  A) thiệp cưới: ảnh trong khung vàng bên trái + trang giấy ngà bên phải (p0, rồi p1 với ảnh Cậu và các cháu dịu đổi theo ô nhịp);
//  B) bưu thiếp: trang giấy bên trái, ảnh du lịch thành bưu thiếp trôi ra trước rồi lùi về sau (chiều sâu) bên phải (p2);
//  C) ảnh tràn nửa phải, chữ ngà trên nền mực bên trái (p3, p4). Đoạn sau chỉ hiện khi đoạn trước đã hiện hết.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BEAT, BAR } from './cues';
import { P2_POST, W, H, WARM_INK, chip, drawPhoto, paragraph, photos, warmBackground } from './kit';
import { cover, foc } from './agB-lib';

const C = CHAPTERS.find((c) => c.id === 'c07-thu')!;
const P = TEXT.thu.p;
// Ảnh (PHOTOS.thu, chỉnh trong chương này: m51 gần trùng w01 nên bỏ; m41 để dành cho p4 "nụ cười"; m08 chuyến đi chơi vào p2)
const COVER = [PHOTOS.thu.cover[0], PHOTOS.thu.cover[1]];         // w02 (tay bắn tim), w01
const KIDS = PHOTOS.thu.p2;                                          // m38, m39, m20
const TRAVEL = ['m37', 'm40', 'm08'] as const;                       // hồ, hoàng hôn biển, chuyến đi
const JOY = ['m23', 'm41', 'm02'] as const;                          // p3 kỷ niệm vui; p4 nụ cười, trẻ trung
const ALL = [...COVER, ...KIDS, ...TRAVEL, ...JOY];

// Mốc (giây trong chương, đúng phách). readTime: p0 11,1 · p1 13,3 · p2 19,6 · p3 8,9 · p4 6,3 (tổng 59 s > 52 s,
// nên trang A giữ p0 trên giấy trong lúc p1 hiện, trang C giữ p3 trong lúc p4 hiện).
const T = {
  p0: BEAT * 2, p1: BEAT * 8, aOut: BEAT * 27,
  p2: BEAT * 28, bOut: BEAT * 57,
  p3: BEAT * 58, p4: BEAT * 62, // trang C giữ đến dur - 0.6
};
const WPS = { p0: 0, p1: 0, p2: 0, p3: 0, p4: 0 }; // cả đoạn mờ vào cùng lúc (0,6 s): đọc được ngay từ đầu
const INK = '#2B211A', PAPER = '#F1EADC', SEPIA_GOLD = '#8C6A33';

/** giấy ngà: hơi nghiêng, bóng mềm, vân giấy rất nhẹ */
function paper(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x + w / 2, y + h / 2); c.rotate(rot);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 50; c.shadowOffsetY = 18;
  c.fillStyle = PAPER; c.fillRect(-w / 2, -h / 2, w, h);
  c.shadowBlur = 0; c.shadowOffsetY = 0;
  const g = c.createRadialGradient(0, 0, Math.min(w, h) * 0.2, 0, 0, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(255,250,240,0)'); g.addColorStop(1, 'rgba(150,110,60,0.18)');
  c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = 'rgba(140,106,51,0.35)'; c.lineWidth = 1; c.strokeRect(-w / 2 + 18, -h / 2 + 18, w - 36, h - 36);
  c.restore();
}

export default class Chapter extends Scene {
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(ALL); }

  /** ảnh trong khung vàng (trang A): chuỗi ảnh hoà vào nhau đúng phách */
  framed(c: CanvasRenderingContext2D, seq: { id: string; at: number }[], lt: number, x: number, y: number, w: number, h: number, a: number) {
    // khung vàng (cố định, các ảnh hoà vào nhau bên trong)
    const m = 18;
    c.save(); c.globalAlpha = a; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 44; c.shadowOffsetY = 16;
    const g = c.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
    g.addColorStop(0, '#8C6A33'); g.addColorStop(0.45, '#F2D9A0'); g.addColorStop(1, '#7A5A2A');
    c.fillStyle = g; c.fillRect(x - w / 2 - m, y - h / 2 - m, w + 2 * m, h + 2 * m); c.restore();
    for (let i = 0; i < seq.length; i++) {
      const s = seq[i]!, nx = seq[i + 1];
      const kin = i === 0 ? 1 : smoothstep(s.at, s.at + 0.9, lt);
      if (lt < s.at && i > 0) break;
      if (nx && lt > nx.at + 0.9) continue;
      const [fx, fy] = foc(s.id);
      drawPhoto(c, this.img[s.id]!, { x, y, w, h, fx, fy, zoom: 1.02 + 0.035 * clamp((lt - s.at) / 6), frame: 'none', alpha: a * kin });
    }
    // viền vàng vẽ lại phía trên để các ảnh sau cũng nằm trong khung
    c.save(); c.globalAlpha = a; c.strokeStyle = 'rgba(255,236,190,0.85)'; c.lineWidth = 2; c.strokeRect(x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2); c.restore();
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    const cOut = dur - 0.6;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    warmBackground(c, f.t, 0.65, W * 0.35, H * 0.5);

    // ---------------- trang A: thiệp cưới + p0, Cậu và các cháu + p1
    const aIn = smoothstep(0, 0.9, lt), aOut = smoothstep(T.aOut, T.aOut + 0.7, lt);
    if (aOut < 1) {
      const fa = aIn * (1 - aOut);
      const seq = [
        { id: COVER[0]!, at: 0 }, { id: COVER[1]!, at: BEAT * 4 },
        { id: KIDS[0]!, at: T.p1 }, { id: KIDS[1]!, at: T.p1 + BAR * 1.5 }, { id: KIDS[2]!, at: T.p1 + BAR * 3 },
      ];
      this.framed(c, seq, lt, 500 - aOut * 60, 540 + (1 - ease.outCubic(aIn)) * 30, 800, 600, fa);
      const px = 1000 + (1 - ease.outCubic(smoothstep(0.2, 1.3, lt))) * 140 + aOut * 80;
      paper(c, px, 96, 840, 888, 0.008, fa);
      chip(c, TEXT.thu.label, px + 60, 176, lt - 0.5, T.aOut - 0.5, { color: SEPIA_GOLD, size: 19 });
      const o = { x: px + 64, maxW: 712, size: 50, lh: 62, color: INK, shadow: false } as const;
      const h0 = paragraph(c, P[0], lt - T.p0, T.aOut - T.p0, { ...o, y: 270, wps: WPS.p0 });
      paragraph(c, P[1], lt - T.p1, T.aOut - T.p1, { ...o, y: 270 + Math.max(h0, 300) + 40, wps: WPS.p1, highlight: ['điểm tựa vững chắc'], hiColor: '#A0521E' });
    }

    // ---------------- trang B: bưu thiếp du lịch có chiều sâu + p2
    const bIn = smoothstep(T.aOut + 0.2, T.p2 + 0.3, lt), bOut = smoothstep(T.bOut, T.bOut + 0.7, lt);
    if (bIn > 0 && bOut < 1) {
      const fb = bIn * (1 - bOut), span = (T.bOut - T.p2 + BEAT) / 3; // ~7,2 s mỗi bưu thiếp (2,5 ô nhịp)
      // nền mờ theo bưu thiếp đang ở trước
      const cur = clamp(Math.floor((lt - T.p2 + BEAT) / span), 0, 2);
      const bgIm = this.img[TRAVEL[cur]!]!, bk = cover(bgIm, 0.5, 0.5, 1.15);
      c.save(); c.globalAlpha = 0.32 * fb; c.filter = 'blur(36px) saturate(0.8)'; c.drawImage(bgIm, bk.dx, bk.dy, bk.dw, bk.dh); c.restore();
      // vị trí "phía sau" của các bưu thiếp đã qua
      const BACK = [{ x: 1150, y: 270, rot: -0.09 }, { x: 1660, y: 300, rot: 0.08 }];
      const FRONT = { x: 1390, y: 585 };
      // vẽ từ xa đến gần
      const order = [0, 1, 2].filter((i) => lt >= T.p2 - BEAT + i * span).sort((a, b) => (a === cur ? 1 : b === cur ? -1 : a - b));
      for (const i of order) {
        const id = TRAVEL[i]!, im = this.img[id]!, t0 = T.p2 - BEAT + i * span;
        const portrait = im.height > im.width;
        const cw = portrait ? 480 : 740, ch = portrait ? 640 : 520;
        const kin = ease.outCubic(clamp((lt - t0) / 1.4));                     // từ xa tiến ra trước
        const kback = i < 2 ? ease.inOutCubic(clamp((lt - (t0 + span)) / 1.3)) : 0; // lùi về sau
        const back = BACK[i] ?? FRONT;
        const drift = (lt - t0) * -9;
        const x = kback > 0 ? lerp(FRONT.x + drift, back.x, kback) : lerp(FRONT.x + 260, FRONT.x + drift, kin);
        const y = kback > 0 ? lerp(FRONT.y, back.y, kback) : lerp(FRONT.y - 60, FRONT.y, kin);
        const sc = kback > 0 ? lerp(1, 0.5, kback) : lerp(0.7, 1, kin);
        const rot = kback > 0 ? lerp(0.015, (back as { rot?: number }).rot ?? 0, kback) : lerp(0.08, 0.015, kin) + (i % 2 ? -0.03 : 0);
        const dim = 1 - 0.35 * kback;
        const [fx, fy] = foc(id);
        // viền trắng bưu thiếp
        c.save(); c.globalAlpha = fb * smoothstep(0, 0.3, kin) * dim; c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
        c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 44; c.shadowOffsetY = 16;
        c.fillStyle = '#F4EFE6'; c.fillRect(-cw / 2 - 16, -ch / 2 - 16, cw + 32, ch + 32); c.restore();
        drawPhoto(c, im, { x, y, w: cw * sc, h: ch * sc, rot, fx, fy, zoom: 1.03 + 0.04 * clamp((lt - t0) / span), alpha: fb * smoothstep(0, 0.3, kin) * dim });
      }
      const px = 80 - (1 - ease.outCubic(bIn)) * 140 - bOut * 80;
      paper(c, px, 120, 820, 840, -0.01, fb);
      paragraph(c, P[2], lt - T.p2, T.bOut - T.p2, { x: px + 64, y: 540, anchor: 'middle', maxW: 692, size: 50, lh: 63, color: INK, shadow: false, wps: WPS.p2, highlight: ['đi đến những nơi mình muốn'], hiColor: '#A0521E' });
    }

    // ---------------- trang C: ảnh tràn nửa phải, chữ ngà trên nền mực bên trái + p3, p4
    const cIn = smoothstep(T.bOut + 0.2, T.p3 + 0.4, lt);
    if (cIn > 0) {
      const box = { x: 760, y: 0, w: W - 760, h: H };
      const seq = [{ id: JOY[0], at: T.p3 - BEAT }, { id: JOY[1], at: T.p4 }, { id: JOY[2], at: T.p4 + BAR * 1.25 }];
      for (let i = 0; i < seq.length; i++) {
        const s = seq[i]!, nx = seq[i + 1];
        if (lt < s.at) break;
        if (nx && lt > nx.at + 1.0) continue;
        const im = this.img[s.id]!, [fx, fy] = foc(s.id);
        const z = 1.0 + 0.06 * clamp((lt - s.at) / 8), rr = cover(im, fx, fy, z, box.x, box.y, box.w, box.h);
        c.save(); c.globalAlpha = cIn * (i ? smoothstep(s.at, s.at + 1.0, lt) : 1);
        c.beginPath(); c.rect(box.x, box.y, box.w, box.h); c.clip();
        c.filter = 'sepia(0.08) saturate(0.95) contrast(1.03)'; c.drawImage(im, rr.dx, rr.dy, rr.dw, rr.dh); c.restore();
      }
      // chuyển mềm từ nền mực sang ảnh
      c.save(); c.globalAlpha = cIn;
      const g = c.createLinearGradient(box.x - 10, 0, box.x + 340, 0);
      g.addColorStop(0, 'rgba(14,11,9,1)'); g.addColorStop(1, 'rgba(14,11,9,0)');
      c.fillStyle = g; c.fillRect(box.x - 10, 0, 350, H);
      c.fillStyle = 'rgba(14,11,9,0.92)'; c.fillRect(0, 0, box.x - 9, H); c.restore();
      const o = { x: 100, maxW: 660, size: 56, lh: 72, shadow: true } as const;
      const h3 = paragraph(c, P[3], lt - T.p3, cOut - T.p3, { ...o, y: 250, wps: WPS.p3, highlight: ['kỷ niệm đẹp'] });
      paragraph(c, P[4], lt - T.p4, cOut - T.p4, { ...o, y: 250 + Math.max(h3, 280) + 56, wps: WPS.p4, face: 'serifItalic', highlight: ['nụ cười trên môi'] });
    }

    // nối mềm với chương sau (clip đấm lưng)
    const end = smoothstep(cOut, dur, lt);
    if (end > 0) { c.save(); c.globalAlpha = end; c.fillStyle = WARM_INK; c.fillRect(0, 0, W, H); c.restore(); }
    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
