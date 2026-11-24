// p03-hush (S16 → S18): im lặng tuyệt đối. Cắt cứng sang đen; chỉ còn đốm cam thở chậm trên một đường chân trời
// mảnh như sợi tóc, và "Có một người..." (Cormorant nghiêng) nhỏ, thấp, giữa khung. 0,15 s cuối: đốm cam
// bừng sáng gắt, nạp vào cú drop ở S18.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT, W } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { ease, lerp, prog, TAU } from '../../engine/util';
import { BASE_POST, INK, LIN, rgba, Spark, label, serifLine } from './kit';
import { S, TEXT } from './cues';

type RGB = [number, number, number];
const T16 = S(16), T18 = S(18), TT = S(TEXT.p03.a.T);
const SX = W / 2, SY = 520;

export default class Plate extends Scene {
  text = new Layer2D();
  spark = new Spark();
  L = new LineBatch(800, { blend: 'max' });

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.text.ctx, t = f.t;
    clearRT(r, out, INK);
    this.text.clear();
    const L = this.L; L.clear();

    const lt = t - T16;
    const surge = ease.inExpo(prog(t, T18 - 0.15, T18));
    // breathing: one slow breath every 4 beats, born out of the dark
    const born = ease.outCubic(prog(lt, 0.05, 0.7));
    const breath = 0.5 - 0.5 * Math.cos((TAU * Math.max(0, lt - 0.05)) / (4 * 0.3334));

    // the horizon: a hair of light drawn outward from the spark, falling off to nothing at its ends
    const reach = 760 * ease.inOutCubic(prog(lt, 0.15, 1.9));
    const N = 96;
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N;
      for (const sgn of [-1, 1]) {
        const x0 = SX + sgn * reach * u0, x1 = SX + sgn * reach * u1;
        const fall = Math.pow(1 - u0, 1.6);
        const lit = Math.exp(-(reach * u0) / 140) * (0.35 + 0.65 * breath);
        const I = (0.2 * fall + 0.14 * lit) * born * (1 + 4 * surge);
        const col: RGB = [
          lerp(LIN.bone[0], LIN.ember[0], Math.min(1, lit * 0.8)) * I,
          lerp(LIN.bone[1], LIN.ember[1], Math.min(1, lit * 0.8)) * I,
          lerp(LIN.bone[2], LIN.ember[2], Math.min(1, lit * 0.8)) * I,
        ];
        L.seg2(x0, SY, x1, SY, 1, col, 1);
      }
    }
    L.render(r, out);

    // the line, low and centred; it gives way to the light in the last instant
    serifLine(c, TEXT.p03.a.line, t - TT, 99, { y: 850, size: 64, alpha: 1 - 0.5 * surge });
    // the scope's last reading, barely there
    label(c, '−∞ dB', SX + 640, SY - 12, { size: 14, color: rgba('graphite'), alpha: 0.55 * prog(lt, 1.2, 1.6) * (1 - surge) });
    this.ctx.comp.draw(r, this.text.upload(), out);

    const amt = born * (0.32 + 0.3 * breath) + 5 * surge;
    this.spark.draw(r, out, SX, SY, t, amt, 0.028 * (1 + 0.12 * breath) + 0.05 * surge);

    return { ...BASE_POST, bloomThreshold: 1.0, halation: 0.2, ca: 0.6, vignette: 0.55, bloom: 0.6 + 0.6 * surge };
  }
}
