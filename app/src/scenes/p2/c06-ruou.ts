// c06 · Chèn A: clip rót rượu mừng (tiếng thật, không nhạc). Bố cục: ô clip dọc đứng yên bên phải trên nền poster mờ ấm;
// bên trái một tấm polaroid nghiêng (bàn tiệc nâng ly, m48) để khung không trống. Không chữ: để tiếng thật của clip lên tiếng.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, smoothstep } from '../../engine/util';
import { CHAPTERS, CLIPS } from './cues';
import { P2_POST, W, H, WARM_INK, blurCover, clipHole, drawPhoto, photo, warmBackground } from './kit';

const C = CHAPTERS.find((c) => c.id === 'c06-ruou')!;
const CL = CLIPS.ruou;
const PAD = CL.F0 - C.start; // 0.6 s
const SIDE = 'm48'; // bàn tiệc, ly rượu, tay bắn tim (cùng tinh thần nâng ly)

export default class Chapter extends Scene {
  layer = new Layer2D();
  poster!: HTMLImageElement;
  side!: HTMLImageElement;
  override async init() { [this.poster, this.side] = await Promise.all([photo(CL.poster), photo(SIDE)]); }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, lt = f.t - C.start, dur = C.end - C.start;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    // mờ vào / ra ở hai đầu (pad 0.6 s), ô clip đầy đủ từ F0 đến F0 + len
    const fin = smoothstep(0, PAD, lt), fout = 1 - smoothstep(dur - PAD, dur, lt), a = fin * fout;
    warmBackground(c, f.t, 0.6, W * 0.3, H * 0.5);
    c.save(); c.globalAlpha = 0.75 * a; blurCover(c, this.poster, 46, 0.5, 1.15); c.restore();

    // polaroid nghiêng bên trái: trôi rất chậm, vào/ra mềm
    const kin = ease.outCubic(clamp((lt - 0.2) / 1.4)), kout = ease.inCubic(clamp((lt - (dur - 1.2)) / 1.0));
    drawPhoto(c, this.side, {
      x: 548 + 14 * Math.sin(lt * 0.25), y: 545 + (1 - kin) * 60 + kout * 40, w: 640, h: 480, rot: -0.055 + 0.01 * (lt / dur),
      frame: 'polaroid', shadow: 0.9, fx: 0.55, fy: 0.5, zoom: 1.0 + 0.05 * (lt / dur), alpha: kin * (1 - kout),
    });

    // ô clip: đứng yên, đen tuyền suốt clip
    clipHole(c, CL.win, smoothstep(0, PAD, lt) * (1 - smoothstep(dur - PAD, dur, lt)));
    // phủ mực ở hai đầu để nối mềm với chương trước/sau (không đè lên ô khi clip chạy)
    if (a < 1) { c.save(); c.globalAlpha = 1 - a; c.fillStyle = WARM_INK; c.fillRect(0, 0, W, H); c.restore(); }

    this.ctx.comp.draw(r, this.layer.upload(), out);
    return { ...P2_POST };
  }
}
