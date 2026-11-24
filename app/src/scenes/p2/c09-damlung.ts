// c09 · Chèn B: clip đấm lưng (tiếng thật, không nhạc) + lời chúc 06 dí dỏm. Bố cục: ô clip ngang đứng yên bên trái,
// cột chữ bên phải; ba cụm "ngủ ngon", "thở sâu", "ăn ngon miệng" hiện màu cam và nảy nhẹ như con dấu, khớp cái vui của clip.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { F as FONT, font } from '../../engine/type';
import { clamp, ease, smoothstep } from '../../engine/util';
import { CHAPTERS, CLIPS, TEXT } from './cues';
import { P2_POST, W, H, WARM_INK, blurCover, chip, clipHole, photo, rgba, warmBackground, wrap } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c09-damlung')!;
const CL = CLIPS.damlung;
const PAD = CL.F0 - C.start; // 0.6 s
const COL = { x: 1352, maxW: 488, size: 48 };
const ORANGE = '#FF8A3D';
const T_LABEL = 0.9, T_LINE = 1.7, WPS = 6; // hiện từng cụm ~3,7 s, sau đó giữ ~8 s (đọc cần 8,9 s tính từ lúc bắt đầu)

/** Lời chúc từng từ; các từ thuộc cụm khoá tô cam và nảy (outBack) khi hiện. */
function playfulLine(c: CanvasRenderingContext2D, s: string, keys: readonly string[], lt: number, out: number, x: number, yMid: number) {
  if (lt < 0) return;
  const size = COL.size, lh = size * 1.3;
  c.save();
  c.font = font(FONT.serif(600), size); c.textBaseline = 'alphabetic';
  // cụm khoá giữ liền một dòng (khoảng trắng không ngắt, hiển thị y hệt)
  let sn = s; for (const k of keys) sn = sn.replace(k, k.replace(/ /g, '\u00A0'));
  const lines = wrap(c, sn, COL.maxW);
  const y0 = yMid - (lines.length * lh) / 2 + size * 0.8;
  // vị trí ký tự của mỗi cụm khoá trong câu
  const spans = keys.map((k) => { const p = sn.indexOf(k.replace(/ /g, '\u00A0')); return [p, p + k.length] as const; });
  const fade = 1 - smoothstep(out, out + 0.6, lt);
  c.shadowColor = 'rgba(0,0,0,0.55)'; c.shadowBlur = 16;
  let wi = 0, pos = 0;
  lines.forEach((ln, li) => {
    let xx = x;
    const yy = y0 + li * lh;
    for (const w of ln.split(' ')) {
      const st = sn.indexOf(w, pos); pos = st + w.length;
      const isKey = spans.some(([a, b]) => st >= a && st < b);
      const t0 = wi / WPS, ww = c.measureText(w).width;
      if (isKey) {
        const k = clamp((lt - t0) / 0.55);
        if (k > 0) {
          const pop = ease.outBack(k, 2.6), sc = 0.55 + 0.45 * pop;
          c.save();
          c.translate(xx + ww / 2, yy - size * 0.3); c.scale(sc, sc); c.rotate((1 - k) * -0.12);
          c.globalAlpha = smoothstep(0, 0.25, k) * fade; c.fillStyle = ORANGE;
          c.fillText(w, -ww / 2, size * 0.3);
          c.restore();
        }
      } else {
        const k = clamp((lt - t0) / 0.45);
        if (k > 0) {
          c.globalAlpha = ease.outCubic(k) * fade; c.fillStyle = rgba('bone');
          c.fillText(w, xx, yy + (1 - ease.outCubic(k)) * size * 0.35);
        }
      }
      xx += c.measureText(w + ' ').width; wi++;
    }
  });
  c.restore();
}

export default class Chapter extends Scene {
  layer = new Layer2D();
  poster!: HTMLImageElement;
  override async init() { this.poster = await photo(CL.poster); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    const a = smoothstep(0, PAD, lt) * (1 - smoothstep(dur - PAD, dur, lt));
    warmBackground(c, f.t, 0.6, W * 0.75, H * 0.45);
    c.save(); c.globalAlpha = 0.7 * a; blurCover(c, this.poster, 50, 0.55, 1.2); c.restore();

    clipHole(c, CL.win, a);

    const yMid = CL.win.y + CL.win.h / 2 + 30, textOut = dur - PAD - 0.9;
    chip(c, TEXT.w06.label, COL.x, 236, lt - T_LABEL, textOut - T_LABEL + 0.1, { size: 18 });
    playfulLine(c, TEXT.w06.line, TEXT.w06.keys, lt - T_LINE, textOut - T_LINE, COL.x, yMid);

    if (a < 1) { c.save(); c.globalAlpha = 1 - a; c.fillStyle = WARM_INK; c.fillRect(0, 0, W, H); c.restore(); }
    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
