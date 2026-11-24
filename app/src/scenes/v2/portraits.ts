// Lớp phủ chân dung Cậu ghép từ ký tự, vẽ đè sau mỗi plate (gắn ở timeline.ts, không sửa plate).
// Mạch: mờ → rõ dần. Đầu phim chỉ là dáng thoáng qua ("Có một người" còn giấu mặt); cuối phim mặt tụ trọn sau tên.
// Vị trí đặt tránh chữ của từng plate (đã soi khung 18.6 / 29–32.5 / 39–39.8 / 44.6–45.6 / 67.6–70.5).
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides, type SceneCtx } from '../../engine/scene';
import { clamp, ease, smoothstep } from '../../engine/util';
import { GlyphPortrait, type GlyphState } from './glyphs';
import { Countdown } from './countdown';
import { S, FINAL_HIT, TEXT } from './cues';

const ramp = (t: number, a: number, b: number) => ease.inOutCubic(clamp((t - a) / (b - a)));

type Show = {
  img: 'h01' | 'h02' | 'h03' | 'h04';
  /** form: tụ từ a0 → a1; tan: d0 → d1 */
  a0: number; a1: number; d0: number; d1: number;
  st: Omit<GlyphState, 'form' | 'diss'>;
};

const HIT2 = TEXT.p09.name.F;

export const SHOWS: Show[] = [
  // p03 khoảng lặng "Có một người...": dáng nghiêng mờ sau đốm cam, chưa rõ mặt; nổ tung vào cú drop S18
  { img: 'h03', a0: S(16.35), a1: S(17.6), d0: S(18) - 0.16, d1: S(18) + 0.35,
    st: { x: 960, y: 430, h: 700, ox: 960, oy: 512, fromPoint: 1, spread: 120, amt: 0.3, fadeBottom: 0.2, flick: 0.01, rise: 0.4 } },
  // p05 "THỜI GIAN có thể làm thay đổi nhiều thứ": chàng trai năm xưa…
  { img: 'h04', a0: S(26.5), a1: S(27.7), d0: S(28.7), d1: S(29.8),
    st: { x: 1440, y: 600, h: 560, spread: 260, amt: 0.62, flick: 0.03, rise: 0.2 } },
  // …tan ra, tụ lại thành Cậu hôm nay, đứng yên khi "sự CHÂN THÀNH… còn mãi"
  { img: 'h01', a0: S(28.95), a1: S(30.0), d0: S(33.4), d1: S(34.6),
    st: { x: 1650, y: 740, h: 640, spread: 220, amt: 0.62, flick: 0.025, rise: 0.6 } },
  // p06 "ngày đặc biệt của một NGƯỜI ĐẶC BIỆT": hạt từ tâm vụ nổ sao tụ thành dáng nghiêng, lần này rõ
  { img: 'h03', a0: S(36.45), a1: S(37.35), d0: S(38) - 0.08, d1: S(38) + 0.4,
    st: { x: 960, y: 430, h: 700, ox: 960, oy: 500, fromPoint: 1, spread: 160, amt: 0.6, fadeBottom: 0.22, flick: 0.03, rise: 0.3 } },
  // p07 "VỮNG VÀNG trước mọi thử thách": dáng đứng khoanh tay, bên phải cột đá
  { img: 'h02', a0: S(42.3), a1: S(43.1), d0: S(44) - 0.15, d1: S(44) + 0.4,
    st: { x: 1640, y: 520, h: 860, spread: 200, amt: 0.85, flick: 0.02, rise: 0.4 } },
  // p09 sau khi tên CẬU HƯNG đáp xuống: mặt Cậu tụ trọn, mờ phía sau, ánh vàng; tan thành tàn lửa cùng lúc tắt dần
  { img: 'h01', a0: HIT2 + 0.35, a1: HIT2 + 1.6, d0: 70.1, d1: 71.3,
    st: { x: 960, y: 520, h: 1000, spread: 340, amt: 0.3, tint: 0.85, fadeBottom: 0.18, flick: 0.012, rise: 1 } },
];

const portraits = new Map<string, Promise<GlyphPortrait>>();
function get(k: string) {
  if (!portraits.has(k)) portraits.set(k, (async () => { const g = new GlyphPortrait(`/assets/web/${k}.png`, { rows: 112 }); await g.init(); return g; })());
  return portraits.get(k)!;
}

/** Bọc một lớp Scene: vẽ plate như cũ, rồi vẽ các chân dung đang hiện trong khung giờ của plate. */
export function withPortraits<T extends new (ctx: SceneCtx) => Scene>(Base: T): T {
  const B = Base as unknown as new (ctx: SceneCtx) => any;
  return class extends B {
    shows: { s: Show; g: GlyphPortrait }[] = [];
    count: Countdown | null = null;
    async init() {
      await super.init();
      const me = this as unknown as Scene & { ctx: SceneCtx };
      const mine = SHOWS.filter((s) => s.a0 < me.ctx.end && s.d1 > me.ctx.start);
      if (me.ctx.start <= FINAL_HIT && me.ctx.end > FINAL_HIT) { this.count = new Countdown(); this.count.init(); }
      this.shows = await Promise.all(mine.map(async (s) => ({ s, g: await get(s.img) })));
    }
    render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides | void {
      const post = super.render(f, out);
      const ctx = (this as unknown as { ctx: SceneCtx }).ctx, r = ctx.renderer;
      this.count?.draw(ctx, out, f.t);
      for (const { s, g } of this.shows) {
        if (f.t < s.a0 || f.t > s.d1) continue;
        g.draw(r, out, f.t, { ...s.st, form: ramp(f.t, s.a0, s.a1), diss: smoothstep(s.d0, s.d1, f.t) });
      }
      return post;
    }
  } as unknown as T;
}

export { FINAL_HIT };
