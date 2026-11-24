// c00 · Mở đầu. Bố cục: ĐỐM CAM → DẢI PHIM. Nối từ trailer (đốm cam dưới giữa khung trên nền đen): đốm nở thành quầng
// ấm, nền ấm hiện ra, hai dải phim ảnh xưa (sepia) trôi ngược chiều kẹp tiêu đề và câu mở; dải phim dừng đúng phách mạnh,
// khung ảnh thời trẻ (m05) bật ra phóng to, câu thứ hai hiện bên dưới. Cuối chương nền khớp c01 (warmBackground lệch trái).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { Spark } from '../v2/kit';
import { CHAPTERS, PHOTOS, TEXT, BAR, BEAT } from './cues';
import { P2_POST, W, H, drawPhoto, filmStrip, paragraph, photos, title, warmBackground } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c00-open')!;
// nhạc vào ở F = 1; ranh giới cuối chương (= đầu c01) là phách mạnh → lưới ô nhịp tính lùi từ C.end
const DOWN = (k: number) => C.end - k * BAR;           // DOWN(1) = 21.38, DOWN(4) = 12.74, DOWN(7) = 4.10
const T_TITLE = DOWN(7) - BEAT;                        // 3.38
const T_STRIP = DOWN(7);                               // 4.10: dải phim trượt vào
const T_TITLE_OUT = DOWN(6) - 0.9;                     // ~6.08, tắt xong ~6.8
const T_A = DOWN(6);                                   // 6.98
const T_FREEZE = DOWN(4);                              // 12.74: dải dừng, m05 bật ra
const T_B = T_FREEZE + 2 * BEAT;                       // 14.18
const T_B_OUT = C.end - 1.0;                           // 23.26 (hiện ~9.1 s)
const T_END = C.end - 1.1;                             // ảnh tắt dần để nền khớp c01

// điểm lấy nét từng ảnh khi cắt khung ngang của dải phim (mặt người nằm trong khung)
const FOCUS: Record<string, { fx: number; fy: number; zoom?: number }> = {
  m05: { fx: 0.45, fy: 0.54, zoom: 1.15 }, m54: { fx: 0.5, fy: 0.3 }, m15: { fx: 0.5, fy: 0.3 }, m16: { fx: 0.5, fy: 0.28 },
  m19: { fx: 0.5, fy: 0.33 }, m17: { fx: 0.5, fy: 0.5 }, m18: { fx: 0.5, fy: 0.5 }, m50: { fx: 0.5, fy: 0.55 },
};
const FW = 236, FH = 168, PITCH = 254, SH = 250;      // khung phim, bước, chiều cao dải

export default class Chapter extends Scene {
  layer = new Layer2D();
  spark = new Spark();
  img: Record<string, HTMLImageElement> = {};
  override async init() { this.img = await photos(PHOTOS.open); }

  /** Một dải phim nghiêng: tâm (cx, cy), góc rot, dịch ngang `scroll` px, thứ tự ảnh `ids`. */
  strip(c: CanvasRenderingContext2D, cy: number, rot: number, scroll: number, ids: readonly string[], a: number) {
    if (a <= 0.003) return;
    c.save();
    c.translate(W / 2, cy); c.rotate(rot); c.globalAlpha = a;
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
    c.fillStyle = '#16120F'; c.fillRect(-1300, -SH / 2, 2600, SH);
    c.shadowBlur = 0; c.shadowOffsetY = 0;
    filmStrip(c, -1300, 1300, 0, SH, -scroll, 1);
    const n = ids.length, period = n * PITCH;
    const base = ((scroll % period) + period) % period;
    for (let i = -6; i <= 6 + n; i++) {
      const x = i * PITCH + base - period;
      if (x < -1250 || x > 1250) continue;
      const id = ids[((i % n) + n) % n]!, fo = FOCUS[id]!;
      drawPhoto(c, this.img[id]!, { x, y: 0, w: FW, h: FH, frame: 'none', grade: 'sepia', gradeAmt: 0.85, alpha: a, fx: fo.fx, fy: fo.fy, zoom: fo.zoom ?? 1 });
    }
    c.restore();
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, t = f.t;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();

    // ---- nền ấm hiện ra từ quầng của đốm cam, cuối chương trôi về tâm của c01 (W*0.35, H*0.5, glow 0.7)
    const bgA = smoothstep(1.3, 3.6, t);
    const endK = ease.inOutCubic(clamp((t - (C.end - 3.0)) / 3.0));
    if (bgA > 0) {
      c.save(); c.globalAlpha = bgA;
      warmBackground(c, t, lerp(0.8, 0.7, endK), lerp(W * 0.5, W * 0.35, endK), lerp(lerp(H * 0.86, H * 0.5, smoothstep(1.5, 6, t)), H * 0.5, endK));
      c.restore();
    }
    // quầng ấm mềm do đốm nở ra (Canvas, dưới mọi thứ khác)
    const bloomK = smoothstep(0.9, 3.2, t) * (1 - smoothstep(3.2, 6.5, t));
    if (bloomK > 0) {
      const R = lerp(60, 900, ease.outCubic(smoothstep(0.9, 3.6, t)));
      const g = c.createRadialGradient(W / 2, 930, 0, W / 2, 930, R);
      g.addColorStop(0, `rgba(255,150,70,${0.45 * bloomK})`); g.addColorStop(0.4, `rgba(170,80,35,${0.22 * bloomK})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }

    // ---- hai dải phim: vào lúc T_STRIP, trôi ngược chiều, hãm dừng đúng T_FREEZE, sau đó trôi lại rất chậm
    const sIn = ease.outCubic(clamp((t - T_STRIP) / 1.4));
    const fade = 1 - smoothstep(T_END, C.end - 0.15, t);
    // quãng đường: vận tốc 34 px/s, giảm dần về 0 trong 1 phách trước T_FREEZE, tăng lại 12 px/s sau 1 ô nhịp
    const v0 = 34, brake = BEAT * 1.5;
    const tt = t - T_STRIP;
    const tf = T_FREEZE - T_STRIP;
    let dist: number;
    if (tt < tf - brake) dist = v0 * tt;
    else if (tt < tf) { const u = (tt - (tf - brake)) / brake; dist = v0 * (tf - brake) + v0 * brake * (u - u * u / 2); }
    else { const after = Math.max(0, tt - tf - BAR); dist = v0 * (tf - brake / 2) + 12 * after * smoothstep(0, 2, after); }
    // vị trí dọc: kẹp tiêu đề/câu a ở giữa; sau khi dừng, dải trên lên cao, dải dưới rời khung
    const split = ease.inOutCubic(clamp((t - T_FREEZE - 0.2) / 1.6));
    const yTop = lerp(lerp(-200, 250, sIn), 96, split), yBot = lerp(lerp(1280, 830, sIn), 1300, split);
    const ids = PHOTOS.open, rev = [...ids].reverse();
    this.strip(c, yTop, -0.045, -dist - 120, ids, sIn * fade * lerp(1, 0.55, split));
    this.strip(c, yBot, -0.045, dist + 40, rev, sIn * fade);

    // ---- tiêu đề và câu a giữa hai dải
    if (t < T_TITLE_OUT + 1) {
      title(c, TEXT.open.title, t - T_TITLE, { y: 540, size: 84, alpha: 1 - smoothstep(T_TITLE_OUT, T_TITLE_OUT + 0.7, t) });
    }
    if (t > T_A && t < T_FREEZE + 1) {
      paragraph(c, TEXT.open.a, t - T_A, T_FREEZE - 0.45 - T_A, { x: W / 2, y: 540, maxW: 1700, size: 54, align: 'center', anchor: 'middle', wps: 0 });
    }

    // ---- khung m05 bật ra khỏi dải đúng phách mạnh, phóng to dần
    const pk = clamp((t - T_FREEZE) / 0.9);
    if (pk > 0) {
      const e = ease.outBack(pk, 1.2);
      const push = clamp((t - T_FREEZE) / (C.end - T_FREEZE));
      drawPhoto(c, this.img.m05!, {
        x: W / 2, y: lerp(200, 468, ease.outCubic(pk)), w: 720, h: 500, rot: lerp(-0.045, -0.012, ease.outCubic(pk)),
        scale: lerp(0.42, 1, e), frame: 'hairline', shadow: 0.9, grade: 'sepia', gradeAmt: lerp(0.85, 0.55, ease.outCubic(pk)),
        fx: 0.45, fy: 0.54, zoom: 1.12 + 0.06 * push, alpha: smoothstep(0, 0.15, pk) * fade,
      });
    }
    if (t > T_B) {
      paragraph(c, TEXT.open.b, t - T_B, T_B_OUT - T_B, { x: W / 2, y: 845, maxW: 1560, size: 50, align: 'center', wps: 6 });
    }

    this.ctx.comp.draw(r, this.layer.upload(), out);

    // ---- đốm cam (nối từ trailer): hiện ở dưới giữa khung, rồi nở thành quầng và tan vào nền
    const sparkIn = smoothstep(0.15, 0.7, t);
    const grow = ease.inOutCubic(smoothstep(1.0, 3.4, t));
    const amt = sparkIn * (1 - grow) ** 1.6 * (0.9 + 0.1 * Math.sin(t * 5));
    this.spark.draw(r, out, W / 2, lerp(1000, 930, smoothstep(0.6, 2.4, t)), t, amt, lerp(0.032, 0.22, grow));

    return { ...P2_POST };
  }
}
