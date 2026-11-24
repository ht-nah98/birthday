// c11 · Khoảng lặng + clip bé trai. Bố cục: 12 s IM LẶNG chỉ có chữ trên nền tối ấm và một đốm cam thở chậm (rất tối giản),
// rồi clip dọc của bé (tiếng thật) ở ô giữa, nền là poster clip làm mờ. Không chữ khi clip chạy. Cuối 0,6 s mờ ra.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, smoothstep } from '../../engine/util';
import { CHAPTERS, CLIPS, SILENT, TEXT } from './cues';
import { P2_POST, W, H, blurCover, clipHole, drawPhoto, paragraph, photo, warmBackground } from './kit';
import { darken } from './agC-lib';
import { Spark } from '../v2/kit';

const C = CHAPTERS.find((c) => c.id === 'c11-lang')!;
const CL = CLIPS.be, WIN = CL.win;
const S1 = SILENT.F1 - C.start;            // clip bắt đầu (lt)
const CE = CL.F0 + CL.len - C.start;       // clip hết (lt)
// chữ: cả câu hiện cùng lúc (mờ vào 0,6 s); câu a 0,4 s; câu b 4,8 s dưới câu a; cả hai giữ đến S1 − 0,9 rồi tắt
const A0 = 0.4, B0 = 4.8, OUT = S1 - 0.9;

export default class Chapter extends Scene {
  layer = new Layer2D();
  spark = new Spark();
  poster!: HTMLImageElement;
  override async init() { this.poster = await photo(CL.poster); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();

    if (lt < S1) {
      // khoảng lặng: nền tối ấm, chữ ở giữa
      warmBackground(c, f.t, 0.35 * smoothstep(0, 1.5, lt), W * 0.5, H * 0.5);
      const dimA = 1 - 0.35 * smoothstep(B0, B0 + 1.2, lt);
      paragraph(c, TEXT.lang.a, lt - A0, OUT - A0, { x: W / 2, y: 455, maxW: 960, size: 54, align: 'center', anchor: 'middle', face: 'serifItalic', wps: 0, alpha: dimA });
      paragraph(c, TEXT.lang.b, lt - B0, OUT - B0, { x: W / 2, y: 675, maxW: 1120, size: 52, align: 'center', anchor: 'middle', wps: 0, highlight: ['khỏe mạnh, bình an, hạnh phúc', 'thật nhiều tiếng cười'] });
    }
    // clip: nền poster mờ hiện dần từ 0,6 s trước, ô clip giữ yên từ S1 đến CE
    const bgA = smoothstep(S1 - 0.6, S1, lt);
    if (bgA > 0) {
      c.save(); c.globalAlpha = bgA; blurCover(c, this.poster, 42, 0.5, 1.15); c.restore();
      if (lt < S1) {
        // trước khi clip chạy: poster nét ở đúng ô (khung đầu của clip) để vào mượt
        drawPhoto(c, this.poster, { x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h / 2, w: WIN.w, h: WIN.h, alpha: bgA, grade: 'none' });
      } else if (lt <= CE) {
        clipHole(c, WIN);
      } else {
        clipHole(c, WIN, 1 - smoothstep(CE, dur, lt));
      }
    }
    darken(c, lt > CE ? smoothstep(CE, dur, lt) : 0);
    this.ctx.comp.draw(r, this.layer.upload(), out);

    // đốm cam thở chậm (chu kỳ ~4 s) trong khoảng lặng
    if (lt < S1) {
      const breath = 0.5 + 0.5 * Math.sin((lt / 4.2) * Math.PI * 2 - Math.PI / 2);
      const a = smoothstep(0.2, 1.6, lt) * (1 - smoothstep(OUT, S1 - 0.2, lt)) * (0.45 + 0.35 * breath);
      this.spark.draw(r, out, W / 2, 290, f.t, a * ease.outCubic(clamp(lt / 2)), 0.028 + 0.006 * breath);
    }
    return { ...P2_POST };
  }
}
