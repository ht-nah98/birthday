// c14 · Kết phim. Bố cục: các ảnh đại gia đình thu nhỏ, tụ về giữa thành một chòm ảnh rồi tan vào chân dung Cậu ghép bằng chữ
// (vàng, mờ) phía sau tiêu đề, đối xứng với cuối trailer. Chữ tắt, chỉ còn đốm cam, tắt dần về đen đúng DURATION.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, lerp, smoothstep } from '../../engine/util';
import { CHAPTERS, PHOTOS, TEXT, BAR, BEAT } from './cues';
import { GOLD, P2_POST, W, H, drawPhoto, paragraph, photos, rgba, title, warmBackground } from './kit';
import { GlyphPortrait } from '../v2/glyphs';
import { Spark } from '../v2/kit';

const C = CHAPTERS.find((c) => c.id === 'c14-end')!;
const T_TITLE = BAR * 1.5;            // đúng phách, tính từ C.start
const T_EN = T_TITLE + BEAT * 2;      // 5.758
const T_FAM = BAR * 2.5;              // 7.197
const T_OUT = 12.0;                   // chữ tắt (tính từ C.start), trước 3 s im lặng cuối phim
// ảnh: vị trí rải đầu chương → vị trí trong chòm (quanh tâm)
const PH = PHOTOS.end.map((id, i) => {
  const a = (i / PHOTOS.end.length) * Math.PI * 2 + 0.4;
  const spread = [
    { x: 330, y: 250 }, { x: 960, y: 210 }, { x: 1590, y: 250 }, { x: 1590, y: 700 }, { x: 960, y: 740 }, { x: 330, y: 700 },
  ][i]!;
  return { id, ...spread, cx: 960 + Math.cos(a) * 150, cy: 470 + Math.sin(a) * 95, rot: (i % 2 ? 1 : -1) * (0.03 + 0.02 * i), d: i * 0.12 };
});
const FOCUS: Record<string, [number, number]> = { m25: [0.5, 0.68], m53: [0.42, 0.25], m33: [0.5, 0.45], m35: [0.5, 0.57], m17: [0.5, 0.33], m55: [0.5, 0.45] };

export default class Chapter extends Scene {
  bg = new Layer2D();
  fg = new Layer2D();
  spark = new Spark();
  glyph = new GlyphPortrait('/assets/web/h01.png', { rows: 112 });
  img: Record<string, HTMLImageElement> = {};
  override async init() { [this.img] = await Promise.all([photos(PHOTOS.end), this.glyph.init()]); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);

    // ---- nền + chòm ảnh
    const b = this.bg.ctx;
    this.bg.clear();
    warmBackground(b, f.t, 0.55 * (1 - smoothstep(T_OUT, dur - 1.5, lt)), W / 2, H * 0.48);
    for (const p of PH) {
      const u = ease.inOutCubic(clamp((lt - 0.6 - p.d) / 3.6));           // bay về chòm
      const fade = 1 - smoothstep(T_TITLE - 0.3, T_TITLE + 1.6, lt);       // tan vào chân dung
      const sz = lerp(430, 170, u);
      const [fx, fy] = FOCUS[p.id] ?? [0.5, 0.45];
      drawPhoto(b, this.img[p.id]!, {
        x: lerp(p.x, p.cx, u), y: lerp(p.y, p.cy, u), w: sz, h: sz * 0.75, rot: p.rot * (1 - 0.5 * u), frame: 'hairline', shadow: 0.6,
        fx, fy, alpha: smoothstep(0, 0.6, lt - p.d * 0.5) * fade * (1 - 0.25 * u), grade: 'warm', gradeAmt: 0.6 + 0.4 * u,
      });
    }
    // dải tối dưới để câu ket.b đọc rõ, tách khỏi chòm ảnh
    const band = smoothstep(0, 0.5, lt) * (1 - smoothstep(3.6, 4.4, lt));
    if (band > 0) {
      const g = b.createLinearGradient(0, 840, 0, H);
      g.addColorStop(0, 'rgba(8,6,5,0)'); g.addColorStop(0.45, `rgba(8,6,5,${0.8 * band})`); g.addColorStop(1, `rgba(8,6,5,${0.8 * band})`);
      b.fillStyle = g; b.fillRect(0, 840, W, H - 840);
    }
    this.ctx.comp.draw(r, this.bg.upload(), out);

    // ---- chân dung Cậu ghép bằng chữ, mờ, ánh vàng
    this.glyph.draw(r, out, f.t, {
      x: 960, y: 520, h: 1000, ox: 960, oy: 500, fromPoint: 0.5, spread: 320, amt: 0.3, tint: 0.8, fadeBottom: 0.18, flick: 0.012, rise: 1,
      form: ease.inOutCubic(clamp((lt - T_TITLE + 0.4) / 1.8)), diss: smoothstep(T_OUT - 0.2, T_OUT + 1.4, lt),
    });

    // ---- chữ
    const c = this.fg.ctx;
    this.fg.clear();
    paragraph(c, TEXT.ket.b, lt - 0.3, 3.4 - 0.3, { x: W / 2, y: 960, maxW: 1500, size: 62, align: 'center', anchor: 'middle', face: 'serifItalic', wps: 0, highlight: ['thật rực rỡ!'] });
    const out1 = 1 - smoothstep(T_OUT, T_OUT + 0.8, lt);
    title(c, TEXT.end.title, lt - T_TITLE, { y: 420, size: 70, color: GOLD, alpha: out1, track: 14 });
    paragraph(c, TEXT.end.en, lt - T_EN, T_OUT - T_EN, { x: W / 2, y: 560, maxW: 1400, size: 78, align: 'center', anchor: 'middle', face: 'serifItalic', wps: 0, color: rgba('bone') });
    if (lt > T_FAM) {
      // vạch mảnh rồi dòng gia đình
      const k = ease.outCubic(clamp((lt - T_FAM) / 1.0)) * out1;
      c.save(); c.globalAlpha = 0.6 * k; c.fillStyle = GOLD; c.fillRect(W / 2 - 90 * k, 640, 180 * k, 1); c.restore();
    }
    paragraph(c, TEXT.end.fam, lt - T_FAM - 0.2, T_OUT - T_FAM - 0.2, { x: W / 2, y: 720, maxW: 1400, size: 46, align: 'center', anchor: 'middle', wps: 0, color: rgba('bone') });
    this.ctx.comp.draw(r, this.fg.upload(), out);

    // ---- đốm cam: còn lại một mình, tắt dần về đen ở cuối
    const sa = smoothstep(T_OUT - 0.6, T_OUT + 0.8, lt) * (1 - smoothstep(dur - 2.6, dur - 0.05, lt));
    const breath = 0.5 + 0.5 * Math.sin((lt - T_OUT) * 1.6);
    this.spark.draw(r, out, W / 2, H / 2, f.t, sa * (0.75 + 0.25 * breath), 0.03 + 0.008 * breath);
    return { ...P2_POST };
  }
}
