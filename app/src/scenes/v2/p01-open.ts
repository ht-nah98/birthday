// p01-open (F 0 → S(8)): cold open, "CÓ MỘT NGƯỜI", máy hiện sóng phẳng lặng, đòn bẩy / điểm tựa.
//  F 0–S0   đen tuyền, con trỏ cam nhấp nháy, gõ "Có một người..." (Plex Mono nhỏ, lệch trái).
//  S0       ĐẬP: CÓ MỘT NGƯỜI full khung; con trỏ nổ thành đốm cam (người), kéo ra một đường mảnh.
//  S0+1.45  chữ to thu về làm tiêu đề góc; đốm cam quét ngược về đầu đường (retrace).
//  S2       kính máy hiện sóng bật: lưới khắc, số đọc mono; đường mảnh thành vết lân quang gần như phẳng,
//           đốm cam là tia quét; "Không cần quá nhiều lời nói," gõ cưỡi trên vết.
//  S4       cắt nhỏ: máy quay giật sát vào, con trỏ đo ΔV = 0; "không cần xuất hiện một cách ồn ào,".
//  S6       vết sóng thành thanh đòn bẩy (bản vẽ kỹ thuật), đốm cam trượt xuống thành điểm tựa; ĐIỂM TỰA đập.
//  S7–S8    dâng: chấm trắng ngà (gia đình) rơi lên thanh theo phách, thanh vẫn thăng bằng.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT, W } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, fitSize, measure } from '../../engine/type';
import { clamp, ease, lerp, prog, pulse, hash, noise1, TAU } from '../../engine/util';
import { BASE_POST, INK, LIN, rgba, Spark, big, label, hitPost, typeLine } from './kit';
import { S, B, TEXT } from './cues';
import { Glass } from './p01-glass';

type RGB = [number, number, number];
const T0 = S(0), T2 = S(2), T4 = S(4), T6 = S(6), T7 = S(7), T8 = S(8);
const HITS = [T0, T2, T4, T6];
const DIV = 120;
const MONO = F.mono(400);
const sc = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
const mix3 = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// ---- cold open
const COLD = TEXT.p01.cold.line;
const COLD_SIZE = 34, COLD_BASE = 552, LINE_Y = 540;
const coldN = (t: number) => {
  if (t < 0.62) return 0;
  const n = Math.min(12, Math.floor((t - 0.62) * 13) + 1);
  return n + [1.62, 1.8, 1.96].filter((x) => t >= x).length;
};

// ---- lines of the scope / lever
const LA = TEXT.p01.a.line, LB = TEXT.p01.b.line;
const C1 = 'nhưng vẫn luôn lặng lẽ là điểm tựa';
const C2 = 'cho gia đình, cho các chị và các em.';
const C_LEAD = Array.from('nhưng vẫn luôn lặng lẽ là ').length;
const CPS_A = 22, CPS_B = 30, CPS_C = 45, CPS_C2 = 70;
const TA = T2 + 0.08, TB = T4 + 0.08, TC = T6 - C_LEAD / CPS_C;
const TC2 = TC + Array.from(C1).length / CPS_C + 0.03;
const nOf = (t: number, t0: number, cps: number, len: number) => (t < t0 ? 0 : Math.min(len, Math.floor((t - t0) * cps) + 1));

// ---- lever (screen px)
const LV = { cx: 960, y: 392, hl: 640, th: 11, fy: 512 };
interface Dot { d: number; stack: number; tl: number; fd: number; y0: number; seed: number }

export default class Plate extends Scene {
  text = new Layer2D();
  spark = new Spark();
  glass = new Glass();
  L = new LineBatch(20000);
  dots: Dot[] = [];
  titleFam = F.archivo(100, 900);
  titleSize = fitSize(TEXT.p01.title.big, F.archivo(100, 900), 1540, 290);
  keyFam = F.archivo(100, 900);
  keySize = fitSize(TEXT.p01.c.big, F.archivo(100, 900), 1500, 320);
  cache = new Map<string, number>();

  constructor(ctx: ConstructorParameters<typeof Scene>[0]) {
    super(ctx);
    // the family: symmetric pairs landing on a 16th grid through the 7→8 ramp (one pair earlier)
    const G = (S(8) - S(7)) / 12;
    const sched: [number, number][] = [[T7 - 4 * G, 1], [T7, 1], [T7 + 2 * G, 1], [T7 + 4 * G, 1], [T7 + 5 * G, 1], [T7 + 6 * G, 2], [T7 + 7 * G, 2], [T7 + 8 * G, 2], [T7 + 9 * G, 3], [T7 + 10 * G, 3], [T7 + 11 * G, 4]];
    // 21 slots per side, slightly irregular (a family is not a ruler); pairs fill them outward-in at random
    const order = Array.from({ length: 21 }, (_, i) => i).sort((a, b) => hash(a, 17) - hash(b, 17));
    let k = 0;
    for (const [tl, n] of sched) {
      for (let j = 0; j < n; j++, k++) {
        const col = order[k % 21]!;
        const dd = 34 + col * 28.5 + (hash(col, 5) - 0.5) * 8;
        for (const sgn of [-1, 1]) this.dots.push({ d: sgn * dd, stack: 0, tl, fd: 0.38 + 0.12 * hash(k, sgn, 3), y0: -30 - 140 * hash(k, sgn, 4), seed: k * 2 + (sgn > 0 ? 1 : 0) });
      }
    }
  }

  w(s: string, size: number, fam = MONO) {
    const key = `${fam}|${size}|${s}`;
    let v = this.cache.get(key);
    if (v === undefined) { v = measure(s, fam, size); this.cache.set(key, v); }
    return v;
  }

  // ------------------------------------------------------------ scope camera & beam
  cam(t: number): [number, number, number] {
    if (t < T4) return [1 + 0.03 * ease.inOutCubic(prog(t, T2, T4)), W / 2, LINE_Y];
    const m = ease.outExpo(prog(t, T4, T4 + 0.16));
    return [lerp(1.03, 1.32, m) + 0.035 * prog(t, T4, T6), lerp(960, 1010, m), lerp(LINE_Y, 610, m)];
  }
  toS(t: number, x: number, y: number) {
    const [s, ox, oy] = this.cam(t);
    return { x: ox + x * DIV * s, y: oy - y * DIV * s };
  }
  coldX() { return W / 2 - this.w(COLD, COLD_SIZE) / 2; }
  sparkX0() { return this.coldX() + this.w(COLD, COLD_SIZE) + 3 + COLD_SIZE * 0.25; }
  /** beam position in divisions */
  bx(t: number) {
    const x0 = (this.sparkX0() - W / 2) / DIV;
    if (t < T0 + 1.45) return x0;
    if (t < T2) return lerp(x0, -6.2, ease.inOutExpo(prog(t, T0 + 1.45, T2 - 0.04)));
    if (t < T4) return lerp(-6.2, 6.2, (t - T2) / (T4 - T2));
    return lerp(-5.6, 5.0, (t - T4) / (T6 - T4));
  }
  sweepStart(t: number) { return t < T4 ? T2 : T4; }
  traceY(x: number, t: number) {
    // almost flat: a breath of noise, a faint blip where the beam was on each beat
    let y = 0.01 * noise1(x * 9 + 3.1, Math.round(t * 30) % 7);
    const t0 = this.sweepStart(t);
    for (let k = Math.ceil((t0 - B(0)) / (B(1) - B(0)) + 1e-6); B(k) <= t; k++) {
      const xb = this.bx(B(k));
      const dx = (x - xb) / 0.09;
      if (Math.abs(dx) < 4) y += 0.055 * Math.exp(-dx * dx) * Math.sin(dx * 2.2 + 0.6) * (k % 3 === 0 ? 1.4 : 0.8);
    }
    for (const h of [T2, T4]) y += 0.06 * pulse(t, h, 0.06) * Math.sin(x * 3.7 + 1.3);
    return y;
  }

  drawTrace(t: number, L: LineBatch) {
    const sg = LIN.signal as RGB, em = LIN.ember as RGB;
    const bxx = this.bx(t);
    const ign = 1 - prog(t, T2, T2 + 0.55, ease.outCubic);
    const N = 300;
    let prev: { x: number; y: number } | null = null;
    for (let i = 0; i <= N; i++) {
      const x = -7 + (14 * i) / N;
      const p = this.toS(t, x, this.traceY(x, t));
      if (prev) {
        const d = bxx - x;
        const glow = d >= 0 ? Math.exp(-d / 1.6) : 0;
        const I = (d >= 0 ? 0.32 + 2.4 * glow : 0.1) + 1.6 * ign;
        L.seg2(prev.x, prev.y, p.x, p.y, 1.6 + 0.8 * glow, sc(mix3(sg, em, glow * 0.5), I), 1);
        L.seg2(prev.x, prev.y, p.x, p.y, 9, sc(sg, 0.05 * I), 1);
      }
      prev = p;
    }
  }

  /** CH2 (ỒN ÀO), muted: a dim, dead-flat ash trace nobody is watching. */
  drawCh2(t: number, L: LineBatch, c: CanvasRenderingContext2D) {
    const a = prog(t, T2 + 0.15, T2 + 0.5);
    if (a <= 0) return;
    const ashc = sc(LIN.ash as RGB, 0.3 * a);
    let q: { x: number; y: number } | null = null;
    for (let i = 0; i <= 70; i++) {
      const x = -7 + (14 * i) / 70;
      const p = this.toS(t, x, -2.2 + 0.006 * noise1(x * 5 + t * 7, 41));
      if (q) L.seg2(q.x, q.y, p.x, p.y, 1.2, ashc, 1);
      q = p;
    }
    const p = this.toS(t, -5.3, -2.2);
    label(c, 'CH2 — ồn ào · 0', p.x, p.y - 12, { size: 15, color: rgba('graphite'), alpha: a });
  }

  /** before S2: the bone hairline the spark drags out at its birth (it becomes the trace). */
  drawAxis(t: number, L: LineBatch) {
    const bone = LIN.bone as RGB;
    const sx = this.sparkX0();
    const g = ease.outExpo(prog(t, T0, T0 + 0.9));
    const x0 = Math.max(W / 2 - 7 * DIV, sx - 1200 * g), x1 = Math.min(W / 2 + 7 * DIV, sx + 1200 * g);
    L.seg2(x0, LINE_Y, x1, LINE_Y, 1.2, sc(bone, 0.6), 1);
    for (let k = -7; k <= 7; k++) {
      const x = W / 2 + k * DIV;
      if (x < x0 || x > x1) continue;
      L.seg2(x, LINE_Y - 5, x, LINE_Y + 5, 1, sc(bone, 0.3), 1);
      for (let j = 1; j < 5 && k < 7; j++) { const xx = x + (j * DIV) / 5; if (xx <= x1) L.seg2(xx, LINE_Y - 2.5, xx, LINE_Y + 2.5, 1, sc(bone, 0.16), 1); }
    }
    // birth shock ring
    const u = prog(t, T0, T0 + 0.75);
    if (u < 1) {
      const R = 12 + 560 * ease.outExpo(u), I = 1.6 * (1 - u) ** 2;
      const n = 160;
      for (let j = 0; j < n; j++) {
        const a0 = (j / n) * TAU, a1 = ((j + 1) / n) * TAU;
        L.seg2(sx + Math.cos(a0) * R, LINE_Y + Math.sin(a0) * R, sx + Math.cos(a1) * R, LINE_Y + Math.sin(a1) * R, 1.3, sc(LIN.ember as RGB, I), 1);
      }
    }
  }

  // ------------------------------------------------------------ lever
  theta(t: number) {
    let th = 0, dip = 0;
    for (const d of this.dots) {
      if (t < d.tl || d.d < 0) continue;
      const u = t - d.tl;
      const env = Math.exp(-u * 7);
      th += 0.0011 * env * Math.sin(u * 38 + d.seed) * (hash(d.seed, 9) - 0.5);
      dip += 1.4 * env * Math.cos(u * 34);
    }
    return { th, dip: Math.max(-2.5, Math.min(2.5, dip)) };
  }

  drawLever(t: number, L: LineBatch, dim: number) {
    const bone = LIN.bone as RGB, ash = LIN.ash as RGB, sg = LIN.signal as RGB;
    const lt = t - T6;
    const mt = ease.outExpo(prog(lt, 0, 0.42));
    const { th, dip } = this.theta(t);
    const px = LV.cx, py = LV.y + LV.th + dip; // pivot (apex)
    const cs = Math.cos(th), sn = Math.sin(th);
    const R = (x: number, y: number) => ({ x: px + (x - px) * cs - (y - py) * sn, y: py + (x - px) * sn + (y - py) * cs });
    const seg = (ax: number, ay: number, bx: number, by: number, w: number, c: RGB) => { const a = R(ax, ay + dip), b = R(bx, by + dip); L.seg2(a.x, a.y, b.x, b.y, w, c, 1); };

    // the trace morphing into the beam's centre line
    const [s6, ox6, oy6] = this.cam(T6 - 1e-3);
    const hl = lerp(7 * DIV * s6, LV.hl, mt);
    const cx = lerp(ox6, LV.cx, mt), cy = lerp(oy6, LV.y, mt);
    const k = dim;
    if (mt < 0.999) seg(cx - hl, cy, cx + hl, cy, 1.8, sc(sg, (1.6 - mt) * (1 - mt) * k));
    // dash-dot centre line
    const cl = sc(ash, 0.22 * mt * k);
    for (let x = -LV.hl - 40; x < LV.hl + 40; x += 34) seg(px + x, cy, px + Math.min(x + 20, LV.hl + 40), cy, 1, cl), seg(px + x + 25, cy, px + x + 28, cy, 1, cl);
    // beam edges + end caps
    const o = LV.th * mt;
    const eb = sc(bone, 0.62 * k);
    seg(cx - hl, cy - o, cx + hl, cy - o, 1.25, eb);
    seg(cx - hl, cy + o, cx + hl, cy + o, 1.25, eb);
    if (o > 0.5) { seg(cx - hl, cy - o, cx - hl, cy + o, 1.25, eb); seg(cx + hl, cy - o, cx + hl, cy + o, 1.25, eb); }
    // section hatching, revealed from the centre out
    const rev = LV.hl * ease.outExpo(prog(lt, 0.12, 0.75));
    const hc = sc(ash, 0.2 * k);
    for (let x = -LV.hl; x < LV.hl - 2 * LV.th; x += 11) {
      if (Math.abs(x + LV.th) > rev) continue;
      seg(px + x, cy + LV.th, px + x + 2 * LV.th, cy - LV.th, 0.9, hc);
    }
    // slot ticks along the top (where the family lands)
    const tk = sc(bone, 0.22 * k * prog(lt, 0.3, 0.6));
    for (let j = 0; j < 21; j++) for (const sgn of [-1, 1]) { const x = px + sgn * (34 + j * 28.5 + (hash(j, 5) - 0.5) * 8); seg(x, cy - LV.th - 1, x, cy - LV.th - 5, 1, tk); }

    // fulcrum: hairline triangle + hatched ground (not rotated: it is the world)
    const fu = ease.outCubic(prog(lt, 0.18, 0.5));
    const fb = sc(bone, 0.6 * k);
    const ax = LV.cx, ay = LV.y + LV.th + 1;
    if (fu > 0) {
      const lx = lerp(ax, ax - 46, fu), rx = lerp(ax, ax + 46, fu), by = lerp(ay, LV.fy, fu);
      L.seg2(ax, ay, lx, by, 1.25, fb); L.seg2(ax, ay, rx, by, 1.25, fb); L.seg2(lx, by, rx, by, 1.25, fb);
      const gw = 110 * fu;
      L.seg2(ax - gw, LV.fy, ax + gw, LV.fy, 1.25, fb);
      for (let x = -gw; x < gw - 4; x += 9) L.seg2(ax + x + 10, LV.fy + 1, ax + x, LV.fy + 11, 0.9, sc(ash, 0.28 * k));
    }
    // dimension lines: a = a (balanced)
    const dm = ease.outExpo(prog(lt, 0.32, 0.85));
    if (dm > 0) {
      const dy = 586, dc = sc(ash, 0.4 * k);
      for (const x of [LV.cx - LV.hl, LV.cx + LV.hl]) L.seg2(x, LV.y + LV.th + 8, x, lerp(LV.y + LV.th + 8, dy + 12, dm), 0.9, dc);
      L.seg2(LV.cx, LV.fy + 16, LV.cx, lerp(LV.fy + 16, dy + 12, dm), 0.9, dc);
      for (const sgn of [-1, 1]) {
        const xe = LV.cx + sgn * LV.hl * dm;
        L.seg2(LV.cx, dy, xe, dy, 0.9, dc);
        // arrowheads
        L.seg2(LV.cx, dy, LV.cx + sgn * 10, dy - 4, 0.9, dc); L.seg2(LV.cx, dy, LV.cx + sgn * 10, dy + 4, 0.9, dc);
        if (dm > 0.98) { L.seg2(xe, dy, xe - sgn * 10, dy - 4, 0.9, dc); L.seg2(xe, dy, xe - sgn * 10, dy + 4, 0.9, dc); }
      }
    }

    // the family
    const dc = sc(bone, 0.74 * k);
    for (const d of this.dots) {
      const ts = d.tl - d.fd;
      if (t < ts) continue;
      const rd = 2.8 + 1.6 * hash(d.seed, 5);
      const yl = LV.y - LV.th - 1 - rd - d.stack * 10.5;
      const x = px + d.d;
      if (t < d.tl) {
        const yAt = (tt: number) => lerp(d.y0, yl, clamp((tt - ts) / d.fd) ** 2);
        const y = yAt(t), yp = yAt(t - 0.012);
        L.seg2(x, yp, x, y, 1, sc(bone, 0.25 * k), 1);
        L.seg2(x, y, x, y + 0.01, rd * 2, sc(bone, 0.7 * k), 1);
      } else {
        const u = t - d.tl;
        const b = -3.2 * Math.exp(-u * 16) * Math.abs(Math.sin(u * 42));
        const p = R(x, yl + b + dip);
        L.seg2(p.x, p.y, p.x + 0.01, p.y, rd * 2, dc, 1);
        const im = 1 - prog(u, 0, 0.16);
        if (im > 0) {
          const q = R(x, LV.y - LV.th - 1 + dip), sp = 5 + 16 * (1 - im);
          L.seg2(q.x - sp, q.y, q.x - sp + 6, q.y, 1, sc(bone, 0.6 * im * k), 1);
          L.seg2(q.x + sp - 6, q.y, q.x + sp, q.y, 1, sc(bone, 0.6 * im * k), 1);
        }
      }
    }
    return { th, dip };
  }

  // ------------------------------------------------------------ text helpers
  /** Typed mono text with an orange block caret (blinks when `blink`). */
  typed(c: CanvasRenderingContext2D, s: string, n: number, x: number, y: number, size: number, o: { color?: string; caret?: boolean; blink?: boolean; t?: number; highlight?: string; alpha?: number } = {}) {
    typeLine(c, s, n + 1e-3, { x, y, size, cps: 1, caret: false, color: o.color, highlight: o.highlight, alpha: o.alpha });
    if (o.caret && (!o.blink || Math.floor((o.t ?? 0) * 3.4) % 2 === 0)) {
      const shown = Array.from(s).slice(0, n).join('');
      c.save(); c.globalAlpha = o.alpha ?? 1;
      c.fillStyle = rgba('signal');
      c.fillRect(x + this.w(shown, size) + 3, y - size * 0.78 + 1, size * 0.5, size * 0.95);
      c.restore();
    }
  }

  /** Big Archivo word moving from full-frame (centred) to a left-aligned caption. */
  bigMove(c: CanvasRenderingContext2D, s: string, lt: number, size0: number, from: { x: number; y: number }, to: { left: number; base: number; size: number }, m: number, alpha = 1) {
    const k = lerp(1, to.size / size0, m);
    const w0 = this.w(s, size0, this.titleFam);
    const x = lerp(from.x, to.left + (w0 * to.size / size0) / 2, m);
    const y = lerp(from.y, to.base - 0.35 * to.size, m);
    c.save(); c.translate(x, y); c.scale(k, k);
    big(c, s, { lt: Math.min(lt, 1.4), x: 0, y: 0, w: 4000, max: size0, alpha: alpha * 0.9 });
    c.restore();
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.text.ctx, t = f.t;
    const L = this.L; L.clear();
    this.text.clear();
    clearRT(r, out, INK);

    const scope = t >= T2 && t < T6;
    const lever = t >= T6;
    const [s, ox, oy] = this.cam(t);
    let spk: { x: number; y: number; amt: number; size: number } | null = null;

    // ---------------- background glass
    const bxx = this.bx(t);
    const bp = this.toS(t, bxx, scope ? this.traceY(bxx, t) : 0);
    this.glass.set({
      cam: lever ? [0.5, LV.cx, LV.y] : [s, ox, oy], div: DIV, ext: lever ? [12, 4] : [7, 3.6],
      a: scope ? 0.78 + 0.5 * pulse(t, T2, 0.15) + 0.3 * pulse(t, T4, 0.12) : lever ? 0.42 : 0,
      draw: scope ? ease.outExpo(prog(t, T2, T2 + 0.35)) : lever ? ease.outExpo(prog(t, T6 + 0.3, T6 + 0.9)) : 0,
      bg: t < T0 ? 0 : scope ? 1 : lever ? 0.6 : 0.35,
      glow: scope ? 1 : 0,
      beam: scope ? [bp.x, bp.y, 0.9] : [0, 0, 0],
    });
    this.glass.render(r, out);

    // ---------------- cold open
    if (t < T0) {
      const n = coldN(t);
      const done = n >= Array.from(COLD).length;
      const on = t > 0.18;
      this.typed(c, COLD, n, this.coldX(), COLD_BASE, COLD_SIZE, { color: rgba('bone', 0.92), caret: on, blink: n === 0 || done, t: t - 0.18 });
    }

    // ---------------- S0: title, spark birth, the hairline
    if (t >= T0 && t < T2) {
      const lt = t - T0;
      const m = ease.inOutExpo(prog(t, T0 + 1.45, T2 - 0.03));
      this.bigMove(c, TEXT.p01.title.big, lt, this.titleSize, { x: W / 2, y: 372 }, { left: 120, base: 150, size: 46 }, m);
      if (t < T2) {
        this.drawAxis(t, L);
        const sx = W / 2 + this.bx(t) * DIV;
        spk = { x: sx, y: LINE_Y, amt: 1 + 3.2 * pulse(t, T0, 0.09), size: 0.034 * (1 + 1.6 * pulse(t, T0, 0.12)) };
        // tiny annotation at the birth point
        const la = prog(lt, 0.25, 0.4) * (1 - prog(t, T0 + 1.35, T0 + 1.5));
        if (la > 0) {
          label(c, 't = 0', this.sparkX0() - 2, LINE_Y + 34, { size: 15, alpha: la, color: rgba('ash') });
          label(c, '1 người', this.sparkX0() - 2, LINE_Y + 56, { size: 15, alpha: la * 0.8, color: rgba('graphite') });
        }
      }
    }

    // ---------------- S2–S6: the scope
    if (scope) {
      this.drawCh2(t, L, c);
      this.drawTrace(t, L);
      spk = { x: bp.x, y: bp.y, amt: 0.95 + 0.6 * pulse(t, T2, 0.1) + 0.4 * pulse(t, T4, 0.1), size: 0.026 };
      // readouts (screen-fixed)
      const ra = prog(t, T2, T2 + 0.12);
      c.save(); c.globalAlpha = ra;
      // instrument label plates: ink cards with a hairline edge, so the glass rulings don't cut the type
      const plate = (x: number, y: number, w: number, h: number) => {
        c.fillStyle = rgba('ink'); c.fillRect(x, y, w, h);
        c.strokeStyle = rgba('graphite', 0.9); c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      };
      plate(100, 86, 440, 186); plate(1540, 100, 280, 102);
      this.bigMove(c, TEXT.p01.title.big, t - T0, this.titleSize, { x: W / 2, y: 372 }, { left: 120, base: 150, size: 46 }, 1);
      label(c, 'CH1   LỜI NÓI      −∞ dB', 120, 196, { size: 17, color: rgba('bone', 0.8) });
      label(c, 'CH2   ỒN ÀO        0.000 V', 120, 224, { size: 17, color: rgba('ash', 0.85) });
      label(c, '      (tắt tiếng)', 120, 252, { size: 17, color: rgba('graphite') });
      label(c, 'M  333.4 ms/div', W - 120, 128, { size: 17, color: rgba('bone', 0.8), align: 'right' });
      label(c, 'TRIG’D  CH1', W - 120, 156, { size: 17, color: rgba('ash', 0.85), align: 'right' });
      label(c, 'lặng lẽ · ổn định', W - 120, 184, { size: 17, color: rgba('graphite'), align: 'right' });
      label(c, `T+${(t - T0).toFixed(3)} s`, W - 120, 984, { size: 15, color: rgba('graphite'), align: 'right' });
      c.restore();
      // S4: measurement cursors over a stretch of the trace — ΔV = 0
      const cu = ease.outExpo(prog(t, T4 + 0.05, T4 + 0.4));
      if (cu > 0) {
        const xa = 0.4, xb = 3.4;
        const pa = this.toS(t, xa, 0), pb = this.toS(t, xb, 0);
        const dash = (x0: number, y0: number, x1: number, y1: number) => {
          const len = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(len / 9);
          for (let i = 0; i < n; i += 2) L.seg2(lerp(x0, x1, i / n), lerp(y0, y1, i / n), lerp(x0, x1, (i + 1) / n), lerp(y0, y1, (i + 1) / n), 1, sc(LIN.bone as RGB, 0.32), 1);
        };
        const h = 150 * cu;
        dash(pa.x, pa.y - h, pa.x, pa.y + h); dash(pb.x, pb.y - h, pb.x, pb.y + h);
        L.seg2(pa.x, pa.y + h, pb.x, pb.y + h, 1, sc(LIN.ash as RGB, 0.35 * cu), 1);
        c.save(); c.globalAlpha = cu;
        label(c, 'ΔV = 0.000 V', pb.x + 14, pb.y + h - 26, { size: 16, color: rgba('bone', 0.85) });
        label(c, 'Δt = 1.000 s', pb.x + 14, pb.y + h - 4, { size: 16, color: rgba('ash') });
        c.restore();
      }
      // lines riding the trace
      const slotY = (k: number) => 0.3 + 0.42 * k;
      const lineAt = (str: string, n: number, slot: number, color: string, caret: boolean, done: boolean, hl?: string) => {
        if (n <= 0) return;
        const p = this.toS(t, -5.3, slotY(slot));
        c.save(); c.translate(p.x, p.y); c.scale(s, s);
        this.typed(c, str, n, 0, 0, 34, { color, caret, blink: done, t, highlight: hl });
        c.restore();
      };
      const up1 = ease.outExpo(prog(t, T4, T4 + 0.3));
      const up2 = ease.outExpo(prog(t, TC, TC + 0.25));
      const nA = nOf(t, TA, CPS_A, Array.from(LA).length), nB = nOf(t, TB, CPS_B, Array.from(LB).length), nC = nOf(t, TC, CPS_C, Array.from(C1).length);
      lineAt(LA, nA, up1 + up2, t < T4 ? rgba('bone') : rgba('ash'), t < T4, nA >= Array.from(LA).length);
      lineAt(LB, nB, up2, t < TC ? rgba('bone') : rgba('ash'), t >= TB && t < TC, nB >= Array.from(LB).length);
      lineAt(C1, nC, 0, rgba('bone'), true, false, 'điểm tựa');
    }

    // ---------------- S6–S8: the lever
    let post: PostOverrides = { ...BASE_POST, bloomThreshold: 1.0, halation: 0.18, ca: 0.7 };
    if (lever) {
      const lt = t - T6;
      const hold = 1 - ease.inOutExpo(prog(lt, 0.4, 0.667));
      this.drawLever(t, L, 1 - 0.55 * hold * prog(lt, 0, 0.02));
      // spark slides under the beam and becomes the fulcrum
      const from = this.toS(T6 - 1e-3, this.bx(T6 - 1e-3), 0);
      const u = ease.outExpo(prog(lt, 0.02, 0.5));
      const { dip } = this.theta(t);
      let load = 0;
      for (const d of this.dots) load += pulse(t, d.tl, 0.08) * (d.d > 0 ? 1 : 0);
      spk = { x: lerp(from.x, LV.cx, u), y: lerp(from.y, LV.y + LV.th + 2 + dip, u), amt: 0.95 + 0.5 * pulse(t, T6, 0.1) + 0.35 * Math.min(2, load) + 0.4 * prog(t, T7, T8, ease.inQuad), size: 0.03 };

      // ĐIỂM TỰA: full-frame slam, then it steps down into the caption
      const m = 1 - hold;
      this.bigMove(c, TEXT.p01.c.big, lt, this.keySize, { x: W / 2, y: 560 }, { left: 120, base: 792, size: 132 }, m);
      // callout from the fulcrum to the word
      if (m > 0.98) {
        const wr = 120 + this.w(TEXT.p01.c.big, 132, this.titleFam) + 22;
        const lu = ease.outExpo(prog(lt, 0.7, 1.0));
        const ax = LV.cx - 30, ay = LV.fy + 22, bx = wr + 50, by = 742;
        const qx = lerp(ax, bx, lu), qy = lerp(ay, by, lu);
        L.seg2(ax, ay, qx, qy, 1, sc(LIN.bone as RGB, 0.4), 1);
        if (lu > 0.95) L.seg2(bx, by, wr, by, 1, sc(LIN.bone as RGB, 0.4), 1);
        L.seg2(ax, ay, ax + 0.01, ay, 5, sc(LIN.bone as RGB, 0.6), 1);
      }
      // the line, two rows under the word
      const n1 = nOf(t, TC, CPS_C, Array.from(C1).length), n2 = nOf(t, TC2, CPS_C2, Array.from(C2).length);
      const d2 = n2 >= Array.from(C2).length;
      this.typed(c, C1, n1, 120, 868, 36, { color: rgba('bone'), highlight: 'điểm tựa', caret: n2 === 0 });
      this.typed(c, C2, n2, 120, 920, 36, { color: rgba('bone'), caret: n2 > 0, blink: d2, t });
      // readouts
      const ra = prog(lt, 0.7, 0.8);
      if (ra > 0) {
        const { th } = this.theta(t);
        const deg = (th * 180) / Math.PI;
        c.save(); c.globalAlpha = ra;
        label(c, `θ   ${deg >= 0 ? '+' : '−'}${Math.abs(deg).toFixed(3)}°`, W - 120, 708, { size: 17, color: rgba('bone', 0.85), align: 'right' });
        label(c, 'Σ M   0.000 N·m', W - 120, 736, { size: 17, color: rgba('ash'), align: 'right' });
        label(c, 'Σ tải   cân bằng', W - 120, 764, { size: 17, color: rgba('ash'), align: 'right' });
        c.restore();
        label(c, 'a = 640', LV.cx - LV.hl / 2, 576, { size: 15, color: rgba('ash'), align: 'center', alpha: ra });
        label(c, 'a = 640', LV.cx + LV.hl / 2, 576, { size: 15, color: rgba('ash'), align: 'center', alpha: ra });
      }
      const sa = prog(lt, 0.6, 0.75);
      if (sa > 0) {
        label(c, 'HÌNH 01   ĐÒN BẨY · CÂN BẰNG', LV.cx - 744, 128, { size: 15, color: rgba('ash'), alpha: sa });
        label(c, 'tỉ lệ 1 : 1   ·   đv: px', LV.cx + 744, 128, { size: 15, color: rgba('graphite'), alpha: sa, align: 'right' });
      }
      post = { ...post, zoom: 1 + 0.045 * ease.inQuad(prog(t, T7, T8)) };
    }

    L.render(r, out);
    this.ctx.comp.draw(r, this.text.upload(), out);
    if (spk) this.spark.draw(r, out, spk.x, spk.y, t, spk.amt, spk.size);
    return hitPost(t, HITS, [T0, T6], post);
  }
}
