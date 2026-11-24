// p02-prompt (S8 → S16): "Đôi khi chẳng giỏi thể hiện tình cảm, / nhưng luôn dành sự quan tâm và yêu thương
// bằng những hành động giản dị."
//   S8  : CÓ MỘT NGƯỜI lần 2, chữ hẹp (condensed) đặt trong một ô prompt khổng lồ, tách thành token.
//   S9  : ô prompt mảnh giữa khoảng tối; câu (a) gõ theo token trên nửa phách; "tình" rơi đúng S10.
//         Rồi chữ "thương" được gõ, bảng xác suất token nháy phía trên, do dự, và bị xoá lùi từng chữ.
//   S12 : không nói nữa mà chạy lệnh: câu (b) gõ máy, log tiến trình bật ✓ trên từng phách.
//   S14 : HÀNH ĐỘNG GIẢN DỊ đập, dấu mộc "ĐÃ THỰC THI" một phách sau.
//   S15→S16: riser, log chảy thành vệt, hành lang khung chữ nhật lao về máy quay, cắt cứng ở S16.
// Nền: một hành lang các khung prompt chữ nhật lồng nhau (nét mảnh), lùi về điểm tụ.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, clearRT, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, font, measure } from '../../engine/type';
import { clamp, ease, hash, lerp, noise1, prog, pulse, smoothstep, springStep, frameIdx } from '../../engine/util';
import { BASE_POST, INK, LIN, Spark, big, hitPost, rgba } from './kit';
import { B, S, TEXT } from './cues';

const LINE_A = TEXT.p02.a.line;
const LINE_B = TEXT.p02.b.line;
const LINE_B1 = 'nhưng luôn dành sự quan tâm và yêu thương';
const LINE_B2 = LINE_B.slice(LINE_B1.length + 1); // "bằng những hành động giản dị."
const KEY = TEXT.p02.b.big; // HÀNH ĐỘNG GIẢN DỊ
const TITLE = TEXT.p02.title.big;

// beat index k: B(k) ; S(T) = B(3T)
const KS = (T: number) => 3 * T;

// tokens of line (a): text pieces, beat they land on, optional distribution
type Cand = [string, number];
interface Tok { s: string; k: number; dist?: Cand[] }
const TOKS_A: Tok[] = [
  { s: 'Đôi', k: 27 }, { s: ' khi', k: 27.5 },
  { s: ' chẳng', k: 28, dist: [['chẳng', 0.41], ['không', 0.33], ['ít', 0.12], ['vốn', 0.06]] },
  { s: ' giỏi', k: 28.5 }, { s: ' thể', k: 29 }, { s: ' hiện', k: 29.5 },
  { s: ' tình', k: 30, dist: [['tình', 0.58], ['cảm', 0.19], ['ra', 0.11], ['lòng', 0.05]] },
  { s: ' cảm', k: 30.5 }, { s: ',', k: 31 },
];
// the word he does not say
const WORD = ' thương';
const W_TYPE = [31.9, 32.15, 32.35, 32.55, 32.75, 32.95, 33.15]; // each char appears
const W_BACK = [34.0, 34.45, 34.8, 35.05, 35.25, 35.4, 35.55]; // each char removed (last first)
const W_POP0 = 31.45;
const KEYS_A = [...TOKS_A.map((x) => x.k), ...W_TYPE, ...W_BACK]; // popup starts computing
const W_DIST: Cand[] = [['thương', 0.31], ['…', 0.24], ['ăn cơm chưa?', 0.17], ['(im lặng)', 0.15], ['về nhà chưa?', 0.08]];

// execution log rows
interface Row { cmd: string; k0: number; k1: number; skip?: boolean; ms: number }
const ROWS: Row[] = [
  { cmd: 'thể_hiện --bằng-lời', k0: 36, k1: 36.9, skip: true, ms: 0 },
  { cmd: 'quan_tâm', k0: 37, k1: 38, ms: 12 },
  { cmd: 'yêu_thương --lặng-lẽ', k0: 38, k1: 39, ms: 9 },
  { cmd: 'hành_động --giản-dị', k0: 39, k1: 40, ms: 4 },
  { cmd: 'lặp_lại --luôn', k0: 40, k1: 41, ms: 3 },
];
{
  const cyc = ['quan_tâm', 'yêu_thương', 'hành_động --giản-dị', 'lặp_lại --luôn', 'quan_tâm --âm-thầm', 'yêu_thương'];
  let k = 42.5, dk = 1;
  for (let i = 0; i < 40 && k < 47.95; i++) {
    ROWS.push({ cmd: cyc[i % cyc.length]!, k0: k, k1: k + Math.max(0.12, dk * 0.7), ms: 1 + Math.floor(hash(i, 3) * 9) });
    k += dk; dk *= 0.82;
  }
}

const FS_A = 70; // prompt font size (phase A)
const FS_B = 50; // phase B

export default class Plate extends Scene {
  ui = new Layer2D();
  kick = 1;
  spark = new Spark();
  tun = new LineBatch(9000);
  comp = new FSPass(/* glsl */ `
    uniform sampler2D ui; uniform float hotBoost, zoomBlur, alpha, split; uniform vec2 zbCenter;
    void main() {
      vec4 u = texture(ui, vUv);
      if (zoomBlur > 0.0) {
        vec4 acc = vec4(u.rgb * u.a, u.a); float ws = 1.0;
        for (int i = 1; i < 10; i++) { float k = float(i) / 9.0; vec4 s = texture(ui, mix(vUv, zbCenter, k * zoomBlur)); float w = 1.0 - k * 0.7; acc += vec4(s.rgb * s.a, s.a) * w; ws += w; }
        acc /= ws; u = vec4(acc.rgb / max(acc.a, 1e-3), acc.a);
      }
      float hot = smoothstep(0.25, 0.7, u.r - u.g * 1.3);
      vec3 c = u.rgb * (1.0 + hotBoost * hot);
      float a = u.a * alpha;
      // riser: an orange-only ghost offset away from the pit (no RGB split)
      float gA = split > 0.0 ? texture(ui, vUv + (vUv - zbCenter) * split).a : 0.0;
      fragColor = vec4(c * a + C_SIGNAL * 0.55 * gA * (1.0 - a) * sat(split * 60.0), a);
    }`, { ui: { value: null }, hotBoost: { value: 1.3 }, zoomBlur: { value: 0 }, split: { value: 0 }, zbCenter: { value: new THREE.Vector2(0.5, 0.5) }, alpha: { value: 1 } },
  { blending: THREE.CustomBlending, transparent: true });
  // the pit glow behind the corridor (additive)
  bg = new FSPass(/* glsl */ `
    uniform vec2 vp; uniform float glow, aspect, rush;
    void main() {
      vec2 p = (vUv - vp) * vec2(aspect, 1.0);
      float r = length(p);
      vec3 c = C_ASH * 0.018 * exp(-r * 2.5);
      c += heat(0.25 + 0.4 * glow) * glow * 0.3 * exp(-r * mix(14.0, 6.0, rush));
      fragColor = vec4(c, 0.0);
    }`, { vp: { value: new THREE.Vector2(0.5, 0.5) }, glow: { value: 0 }, aspect: { value: W / H }, rush: { value: 0 } },
  { blending: THREE.CustomBlending, transparent: true });

  constructor(ctx: ConstructorParameters<typeof Scene>[0]) {
    super(ctx);
    const m = this.comp.mat; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    const g = this.bg.mat; g.blendEquation = THREE.AddEquation; g.blendSrc = THREE.OneFactor; g.blendDst = THREE.OneFactor;
    g.blendSrcAlpha = THREE.ZeroFactor; g.blendDstAlpha = THREE.OneFactor;
    this.comp.u.ui!.value = this.ui.texture;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, t = f.t;
    const k = (t - B(0)) / (B(1) - B(0)); // continuous beat index
    const riser = Math.pow(prog(t, S(15), S(16)), 2.2);
    const end = prog(t, S(16) - 0.12, S(16));

    // ---------------------------------------------------------------- corridor (screen-space 2D lines)
    let vpx = W * 0.5, vpy = H * 0.47;
    if (t >= S(9) && t < S(12)) { vpx = W * 0.56; vpy = H * 0.52; }
    if (t >= S(12)) { vpx = W * 0.62; vpy = H * 0.5; }
    vpx += noise1(t * 0.3, 1) * 14 * (1 - riser); vpy += noise1(t * 0.27, 2) * 9 * (1 - riser);
    const camZ = 0.32 * (t - S(8)) + 0.45 * clamp(t - S(9), 0, 3) + 3 * Math.pow(prog(t, S(14), S(16)), 2) + 26 * Math.pow(prog(t, S(15), S(16)), 3);
    const roll = 0.02 * noise1(t * 0.2, 7) + 0.22 * riser * riser;
    this.kick = t >= S(9) && t < S(12) ? 1 + 0.9 * pulse(t, this.lastKey(t), 0.09) : 1;
    this.drawCorridor(t, vpx, vpy, camZ, roll, riser);
    clearRT(r, out, INK);
    const bu = this.bg.u;
    (bu.vp!.value as THREE.Vector2).set(vpx / W, 1 - vpy / H);
    bu.glow!.value = 0.15 + 1.1 * riser + 0.4 * this.slam(t);
    bu.rush!.value = riser;
    this.bg.render(r, out);
    this.tun.render(r, out);

    // ---------------------------------------------------------------- UI
    const L = this.ui; L.clear();
    const c = L.ctx;
    let caret: { x: number; y: number; hot: number } | null = null;
    if (t < S(9)) caret = this.drawTitle(c, t, k);
    else if (t < S(12)) caret = this.drawPromptA(c, t, k);
    else caret = this.drawPhaseB(c, t, k, riser);
    L.upload();
    const cu = this.comp.u;
    cu.zoomBlur!.value = 0.05 * Math.pow(prog(t, S(15.7), S(16)), 2.5);
    (cu.zbCenter!.value as THREE.Vector2).set(vpx / W, 1 - vpy / H);
    cu.alpha!.value = 1;
    cu.split!.value = 0.012 * Math.pow(prog(t, S(15.3), S(16)), 2);
    this.comp.render(r, out);

    // ---------------------------------------------------------------- spark: the caret (he), then the pit
    if (caret && caret.hot > 0) this.spark.draw(r, out, caret.x, caret.y, t, caret.hot, 0.016);
    if (t >= S(12)) this.spark.draw(r, out, vpx, vpy, t, 0.25 + 1.3 * riser, 0.02 + 0.06 * riser);

    // ---------------------------------------------------------------- post
    const post = hitPost(t, [S(8), S(10), S(12), S(14)], [S(8), S(12), S(14)], { ...BASE_POST });
    post.bloom = 0.6 + 0.55 * riser;
    post.ca = 0.6 * (1 - 0.6 * riser);
    post.zoom = (post.zoom ?? 1) + 0.04 * riser;
    post.shake = [(post.shake?.[0] ?? 0) + noise1(t * 40, 1) * 8 * riser * riser, (post.shake?.[1] ?? 0) + noise1(t * 40, 2) * 8 * riser * riser];
    post.exposure = (post.exposure ?? 1) * (1 + 0.1 * end);
    return post;
  }

  /** 0..1 decaying pulse on the slams. */
  private slam(t: number) {
    let s = 0;
    for (const h of [S(8), S(10), S(12), S(14)]) s = Math.max(s, pulse(t, h, 0.18));
    return s;
  }

  // ------------------------------------------------------------------ corridor
  private drawCorridor(t: number, vpx: number, vpy: number, camZ: number, roll: number, riser: number) {
    const L = this.tun; L.clear();
    const X = 1.6, Y = 0.9, f = H * 0.62;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const P = (x: number, y: number, z: number): [number, number] => {
      const sx = (x * f) / z, sy = (y * f) / z;
      return [vpx + cr * sx - sr * sy, vpy + sr * sx + cr * sy];
    };
    const bone = LIN.bone, sig = LIN.signal;
    const fog = (z: number) => Math.exp(-z * 0.075) * smoothstep(0.22, 0.9, z);
    const seg3 = (a: [number, number, number], b: [number, number, number], w: number, rgb: [number, number, number], al: number) => {
      const p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]);
      L.seg2(p[0], p[1], q[0], q[1], w, rgb, al);
    };
    const NZ = 34;
    const z0 = 1 - (camZ % 1);
    // signal frames: the slams send one orange frame rushing out of the pit toward the camera
    const sigZ: number[] = [];
    for (const h of [S(8), S(10), S(12), S(14)]) if (t >= h && t - h < 1.2) sigZ.push(30 * Math.exp(-(t - h) * 5.2));
    for (let i = 0; i < NZ; i++) {
      const z = z0 + i * 0.9;
      const idx = Math.floor(camZ) + i; // stable identity of this frame
      const a = fog(z) * 0.55 * this.kick;
      if (a < 0.004) continue;
      const w = 1.0;
      const c: [number, number, number][] = [[-X, -Y, z], [X, -Y, z], [X, Y, z], [-X, Y, z]];
      // every 4th frame is solid; the others are broken into a gap at the corners (registration marks)
      const solid = idx % 4 === 0;
      for (let e = 0; e < 4; e++) {
        const A = c[e]!, Bq = c[(e + 1) % 4]!;
        if (solid) seg3(A, Bq, w, bone, a);
        else {
          const g = 0.16;
          const lx = (u: number) => [lerp(A[0], Bq[0], u), lerp(A[1], Bq[1], u), z] as [number, number, number];
          seg3(A, lx(g), w, bone, a * 0.9); seg3(lx(1 - g), Bq, w, bone, a * 0.9);
        }
      }
      // tick rulers on the floor edge of near frames
      if (z < 9) {
        const n = 24;
        for (let j = 0; j <= n; j++) {
          const x = lerp(-X, X, j / n), tl = j % 6 === 0 ? 0.09 : 0.04;
          seg3([x, Y, z], [x, Y - tl, z], 1, bone, a * 0.7);
          seg3([x, -Y, z], [x, -Y + tl, z], 1, bone, a * 0.5);
        }
        for (let j = 0; j <= 14; j++) {
          const y = lerp(-Y, Y, j / 14), tl = j % 7 === 0 ? 0.09 : 0.04;
          seg3([-X, y, z], [-X + tl, y, z], 1, bone, a * 0.5);
          seg3([X, y, z], [X - tl, y, z], 1, bone, a * 0.5);
        }
      }
    }
    // keystrokes: typing sends a faint bone frame out of the pit toward us; backspace pulls one away
    if (t >= S(9) && t < S(12)) {
      for (const kk of [...TOKS_A.map((x) => x.k), ...W_TYPE]) {
        const h = B(kk), dt = t - h;
        if (dt < 0 || dt > 0.9) continue;
        const zs = 16 * Math.exp(-dt * 4.2);
        if (zs < 0.3) continue;
        const a = Math.min(0.9, fog(zs) * 1.6) * (1 - dt / 0.9);
        const c: [number, number, number][] = [[-X, -Y, zs], [X, -Y, zs], [X, Y, zs], [-X, Y, zs]];
        for (let e = 0; e < 4; e++) seg3(c[e]!, c[(e + 1) % 4]!, 1.4, bone, a);
      }
      for (const kk of W_BACK) {
        const h = B(kk), dt = t - h;
        if (dt < 0 || dt > 0.9) continue;
        const zs = 0.5 * Math.exp(dt * 4.5);
        const a = Math.min(0.45, fog(zs) * 1.2) * (1 - dt / 0.9);
        const c: [number, number, number][] = [[-X, -Y, zs], [X, -Y, zs], [X, Y, zs], [-X, Y, zs]];
        for (let e = 0; e < 4; e++) seg3(c[e]!, c[(e + 1) % 4]!, 1.4, [sig[0] * 1.3, sig[1] * 1.3, sig[2] * 1.3], a);
      }
    }
    for (const zs of sigZ) {
      if (zs < 0.25) continue;
      const a = Math.min(1, fog(zs) * 2.2);
      const c: [number, number, number][] = [[-X, -Y, zs], [X, -Y, zs], [X, Y, zs], [-X, Y, zs]];
      for (let e = 0; e < 4; e++) seg3(c[e]!, c[(e + 1) % 4]!, 2.2, [sig[0] * 2.2, sig[1] * 2.2, sig[2] * 2.2], a);
    }
    // longitudinal rails on floor and ceiling + walls; streak segments on the riser
    const ZS = [0.3, 0.5, 0.8, 1.2, 1.8, 2.6, 3.6, 5, 7, 10, 14, 20, 30];
    const rail = (x: number, y: number, al: number) => {
      for (let i = 1; i < ZS.length; i++) { const za = ZS[i - 1]!, zb = ZS[i]!; seg3([x, y, za], [x, y, zb], 1, bone, al * 2.2 * fog((za + zb) / 2)); }
    };
    for (let j = 0; j <= 16; j++) {
      const x = lerp(-X, X, j / 16);
      const al = (j % 4 === 0 ? 0.2 : 0.09);
      rail(x, Y, al); rail(x, -Y, al * 0.6);
    }
    for (let j = 0; j <= 8; j++) {
      const y = lerp(-Y, Y, j / 8);
      const al = (j % 4 === 0 ? 0.16 : 0.06);
      rail(-X, y, al); rail(X, y, al);
    }
    // riser: speed streaks flying along the walls
    if (riser > 0.01) {
      const n = Math.floor(220 * riser);
      for (let i = 0; i < n; i++) {
        const side = Math.floor(hash(i, 1) * 4), u = hash(i, 2) * 2 - 1;
        const x = side < 2 ? u * X : (side === 2 ? -X : X), y = side < 2 ? (side === 0 ? Y : -Y) : u * Y;
        const zz = 0.4 + ((hash(i, 3) * 30 - camZ * (1 + hash(i, 4))) % 30 + 30) % 30;
        const len = 0.5 + 6 * riser;
        const hot = hash(i, 5) < 0.12;
        seg3([x, y, zz + len], [x, y, zz], hot ? 1.6 : 1, hot ? [sig[0] * 1.6, sig[1] * 1.6, sig[2] * 1.6] : bone, (hot ? 0.9 : 0.35) * riser * fog(zz));
      }
    }
  }

  // ------------------------------------------------------------------ phase 0: CÓ MỘT NGƯỜI, tokenized
  private drawTitle(c: CanvasRenderingContext2D, t: number, k: number) {
    const lt = t - S(8);
    const fx0 = 140, fx1 = W - 140, fy0 = 318, fy1 = 762;
    c.save();
    // the giant prompt slot
    c.fillStyle = rgba('ink', 0.86); c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    const grow = ease.outExpo(clamp(lt / 0.35));
    c.strokeStyle = rgba('bone', 0.5); c.lineWidth = 1;
    c.beginPath(); c.moveTo(fx0, fy0 + 0.5); c.lineTo(lerp(fx0, fx1, grow), fy0 + 0.5);
    c.moveTo(fx1, fy1 - 0.5); c.lineTo(lerp(fx1, fx0, grow), fy1 - 0.5); c.stroke();
    corners(c, fx0, fy0, fx1, fy1, 22, rgba('bone', 0.8));
    c.font = font(F.mono(400), 64); c.fillStyle = rgba('ash', 0.6); c.fillText('›', fx0 + 40, 600);
    // the title, condensed, set like typed input
    const fam = F.archivo(62, 900);
    const words = TITLE.split(' ');
    const x0 = fx0 + 120;
    const size = Math.min(300, 1380 / (measure(TITLE, fam, 100) / 100));
    const kk = 1 + 0.18 * Math.exp(-lt * 14);
    c.save(); c.translate(x0, 640); c.scale(kk, kk);
    c.font = font(fam, size); c.fillStyle = rgba('bone'); c.textBaseline = 'alphabetic';
    c.fillText(TITLE, 0, 0);
    c.restore();
    // token brackets & ids, one per beat
    let wx = x0;
    const sp = measure(' ', fam, size);
    words.forEach((w, i) => {
      const ww = measure(w, fam, size);
      const kt = 24 + i;
      if (k >= kt) {
        const a = ease.outExpo(clamp((k - kt) / 0.5));
        const y = 684;
        c.fillStyle = rgba(i === 2 ? 'signal' : 'bone', i === 2 ? 1 : 0.55);
        c.fillRect(wx + 4, y, (ww - 8) * a, 1.5);
        c.fillRect(wx + 4, y - 9, 1.5, 9); c.fillRect(wx + 4 + (ww - 8) * a - 1.5, y - 9, 1.5, 9);
        c.font = font(F.mono(400), 15); c.fillStyle = rgba('ash', 0.85 * a);
        c.fillText(`${['8467', '30917', '71102'][i]}`, wx + 8, y + 26);
        c.fillStyle = rgba('graphite', a);
        c.fillText(`tok ${String(i + 1).padStart(2, '0')}`, wx + 8, y + 46);
      }
      wx += ww + sp;
    });
    // caret after the title
    const cx = x0 + measure(TITLE, fam, size) * kk + 22;
    const on = lt < 0.5 || Math.floor(lt * 3) % 2 === 0;
    if (on) { c.fillStyle = rgba('signal'); c.fillRect(cx, 640 - size * 0.74, size * 0.07, size * 0.78); }
    // labels: top-left meta, top-right counter
    meta(c, fx0, fy0 - 54, 'PROMPT', '02', 'lần thứ hai · cùng một người');
    c.font = font(F.mono(500), 14); c.letterSpacing = '3px'; c.textAlign = 'right'; c.fillStyle = rgba('bone', 0.6);
    c.fillText(`CONTEXT ${String(Math.min(3, Math.max(0, Math.floor(k - 24) + 1))).padStart(2, '0')} / 8192`, fx1, fy0 - 54);
    c.letterSpacing = '0px'; c.font = font(F.mono(400), 14); c.fillStyle = rgba('ash', 0.75);
    c.fillText('T 0.7 · top-p 0.95 · seed 0x08', fx1, fy0 - 32);
    c.textAlign = 'left';
    c.fillText('history: "Có một người..."  ×1', fx0, fy1 + 40);
    c.restore();
    return on ? { x: cx + 11, y: 430, hot: 0.4 * Math.exp(-lt * 3) } : null;
  }

  // ------------------------------------------------------------------ phase A: typing, "thương", backspace
  private typedA(k: number): { s: string; ghost: { ch: string; i: number; age: number }[]; nA: number } {
    let s = '';
    let nA = 0;
    for (const tk of TOKS_A) if (k >= tk.k) { s += tk.s; nA++; }
    const w = Array.from(WORD);
    let n = 0;
    for (let i = 0; i < w.length; i++) if (k >= W_TYPE[i]!) n = i + 1;
    let del = 0;
    for (let i = 0; i < w.length; i++) if (k >= W_BACK[i]!) del = i + 1;
    const ghost: { ch: string; i: number; age: number }[] = [];
    for (let i = 0; i < del; i++) {
      const ci = w.length - 1 - i;
      ghost.push({ ch: w[ci]!, i: ci, age: (k - W_BACK[i]!) * (B(1) - B(0)) });
    }
    s += w.slice(0, Math.max(0, n - del)).join('');
    return { s, ghost, nA };
  }

  private drawPromptA(c: CanvasRenderingContext2D, t: number, k: number) {
    const fam = F.mono(400), FS = FS_A, adv = measure('0', fam, FS);
    // two rows: "Đôi khi chẳng giỏi" / "thể hiện tình cảm,( thương)"
    const BRK = LINE_A.indexOf(' thể');
    const fx0 = 160, fx1 = 1345, fy0 = 372, fy1 = 668;
    const tx0 = fx0 + 96, base1 = 482, base2 = 590, rowH = base2 - base1;
    const pos = (ci: number) => (ci <= BRK ? { x: tx0 + ci * adv, y: base1 } : { x: tx0 + (ci - BRK - 1) * adv, y: base2 });
    const { s, ghost } = this.typedA(k);
    const chars = Array.from(s);
    // camera: a slow push toward the field (composition 150..1720 stays inside title-safe)
    const lt = t - S(9);
    let z = 1.0 + 0.05 * ease.inOutCubic(clamp(lt / 3)) + 0.02 * ease.outExpo(clamp((t - S(10)) / 0.3));
    z *= 1 + 0.012 * pulse(t, this.lastKey(t), 0.08);
    const cx = 955, cy = 520;
    c.save();
    c.setTransform(z, 0, 0, z, W / 2 - z * cx, H / 2 - z * cy);
    const hair = 1 / z;
    // field, with a faint warm scan under the active row
    c.fillStyle = rgba('ink', 0.96); c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    c.strokeStyle = rgba('bone', 0.5); c.lineWidth = hair; c.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    corners(c, fx0, fy0, fx1, fy1, 16, rgba('bone', 0.8), hair);
    const caret = pos(chars.length);
    c.fillStyle = rgba('signal', 0.05 + 0.05 * pulse(t, this.lastKey(t), 0.12));
    c.fillRect(fx0 + 1, caret.y - FS * 0.95, fx1 - fx0 - 2, rowH * 0.95);
    c.font = font(fam, 48); c.fillStyle = rgba('ash', 0.7); c.fillText('›', fx0 + 36, base1 - 4);
    // history (the title just sent) above, small
    c.font = font(F.mono(400), 18); c.fillStyle = rgba('ash', 0.75);
    c.fillText('01  › Có một người...', fx0, fy0 - 30);
    meta(c, fx0, fy1 + 34, 'PROMPT', '02', `${String(TOKS_A.filter((x) => k >= x.k).length + (k >= W_TYPE[1]! && k < W_BACK[6]! ? 1 : 0)).padStart(2, '0')} tokens · T 0.7 · top-p 0.95`);
    // tokens with brackets
    c.textBaseline = 'alphabetic';
    let ci = 0;
    for (const tk of TOKS_A) {
      const n = Array.from(tk.s).length;
      if (k < tk.k) break;
      const age = (k - tk.k) * (B(1) - B(0));
      const sp = tk.s.startsWith(' ');
      const p0 = pos(ci + (sp ? 1 : 0)), word = tk.s.trimStart();
      const ww = Array.from(word).length * adv;
      const by = p0.y + 20;
      c.fillStyle = rgba('bone', 0.4 * (1 - 0.4 * prog(age, 0.8, 2.5)));
      c.fillRect(p0.x + 2, by, ww - 4, hair);
      c.fillRect(p0.x + 2, by - 5, hair, 5); c.fillRect(p0.x + ww - 2 - hair, by - 5, hair, 5);
      c.font = font(F.mono(400), 12); c.fillStyle = rgba('ash', 0.6);
      c.fillText(String(1000 + Math.floor(hash(tk.k, 7) * 98000)), p0.x + 4, by + 16);
      if (sp && ci !== BRK) { const q = pos(ci); c.fillStyle = rgba('graphite', 0.9); c.fillRect(q.x + adv * 0.5 - 1.5, q.y - FS * 0.2, 3, 3); }
      const drop = (1 - ease.outExpo(clamp(age / 0.18))) * -12;
      const hotW = tk.s === ' tình' || tk.s === ' cảm' ? 1 : 0;
      const cool = prog(age, 0.05, 0.5 + 0.6 * hotW);
      c.font = font(fam, FS);
      c.fillStyle = age < 0.06 ? rgba('ember') : cool < 1 ? mixc('signal', 'bone', cool) : rgba('bone', 0.97);
      c.fillText(word, p0.x, p0.y + drop);
      ci += n;
    }
    // the unsaid word: orange, typed then removed
    const wch = Array.from(WORD);
    const nA = ci;
    const shown = chars.length - nA;
    c.font = font(fam, FS);
    for (let i = 0; i < shown; i++) {
      const ch = wch[i]!, p = pos(nA + i);
      if (ch === ' ') { c.fillStyle = rgba('graphite', 0.9); c.fillRect(p.x + adv * 0.5 - 1.5, p.y - FS * 0.2, 3, 3); continue; }
      const age = (k - W_TYPE[i]!) * (B(1) - B(0));
      c.fillStyle = age < 0.05 ? rgba('ember') : rgba('signal');
      c.fillText(ch, p.x, p.y + (1 - ease.outExpo(clamp(age / 0.15))) * -8);
    }
    for (const g of ghost) {
      if (g.age > 0.45 || g.ch === ' ') continue;
      const p = pos(nA + g.i);
      c.fillStyle = rgba('signal', 0.5 * (1 - g.age / 0.45));
      c.fillText(g.ch, p.x, p.y - 30 * ease.outCubic(g.age / 0.45));
    }
    if (k >= W_BACK[0]!) {
      c.font = font(F.mono(400), 14); c.fillStyle = rgba('ash', 0.85); c.textAlign = 'right';
      c.fillText(`backspace ×${ghost.length}`, fx1, fy1 + 34);
      c.fillStyle = rgba('signal', 0.9);
      if (ghost.length >= 7) c.fillText('không gửi', fx1, fy1 + 56);
      c.textAlign = 'left';
    }
    // distributions live in a panel slot to the right of the field, leader from the token
    const px = fx1 + 34;
    ci = 0;
    for (const tk of TOKS_A) {
      const n = Array.from(tk.s).length;
      if (tk.dist) {
        const a0 = tk.k - 0.45, a1 = tk.k + 1.25;
        if (k >= a0 && k < a1) {
          const p = pos(ci + 1);
          popup(c, px, p.y - FS * 0.35, { x: p.x + (n - 1) * adv + 6, y: p.y - FS * 0.35 }, t, k, tk.k, a1, tk.dist, 0, hair, 330, -1);
        }
      }
      ci += n;
    }
    if (k >= W_POP0) {
      const rej = k >= W_BACK[6]!;
      const endP = pos(chars.length);
      popup(c, px, base2 - FS * 0.35, { x: endP.x + 10, y: base2 - FS * 0.35 }, t, k, W_TYPE[1]!, 99, W_DIST, rej ? 3 : 0, hair, 360, k >= W_BACK[0]! ? 0 : -1,
        k >= W_TYPE[6]! && k < W_BACK[0]! ? 'do dự…' : rej ? 'rút lại' : undefined);
    }
    // caret
    const sinceKey = (t - this.lastKey(t)) / (B(1) - B(0));
    const on = sinceKey < 1.2 || (k % 1) < 0.5;
    if (on) { c.fillStyle = rgba('signal'); c.fillRect(caret.x + 3, caret.y - FS * 0.78, 5, FS * 0.92); }
    c.restore();
    const sx = W / 2 + z * (caret.x + 5 - cx), sy = H / 2 + z * (caret.y - FS * 0.7 - cy);
    const hes = k >= W_TYPE[6]! && k < W_BACK[6]! + 1 ? 0.5 + 0.3 * Math.sin(t * 9) : 0;
    return on ? { x: sx, y: sy, hot: Math.max(hes, sinceKey < 0.6 ? 0.35 * (1 - sinceKey / 0.6) : 0) } : null;
  }

  /** Time (F) of the most recent keystroke in phase A (typing or backspace). */
  private lastKey(t: number) {
    let h = -99;
    for (const kk of KEYS_A) { const x = B(kk); if (x <= t && x > h) h = x; }
    return h;
  }

  // ------------------------------------------------------------------ phase B: actions execute
  private drawPhaseB(c: CanvasRenderingContext2D, t: number, k: number, riser: number) {
    const lt = t - S(12);
    const fam = F.mono(400), FS = FS_B, adv = measure('0', fam, FS);
    const fx0 = 140, fx1 = W - 140, fy0 = 232, fy1 = 420;
    const tx0 = fx0 + 92, base1 = 306, base2 = 382;
    // a gentle camera: settle from a slight push, then the riser pulls toward the pit
    const z = 1.04 - 0.04 * ease.outExpo(clamp(lt / 0.6)) + 0.008 * lt + 0.05 * Math.pow(riser, 2);
    const cx = W / 2 + 40 * riser * riser, cy = H / 2;
    c.save();
    c.setTransform(z, 0, 0, z, W / 2 - z * cx, H / 2 - z * cy);
    const hair = 1 / z;
    // history: line (a), sent; the unsaid word as a struck ghost
    {
      const hw = measure('02  › ' + LINE_A, F.mono(400), 24);
      const g = c.createLinearGradient(fx0 - 40, 0, fx0 + hw + 80, 0);
      g.addColorStop(0, rgba('ink', 0)); g.addColorStop(0.06, rgba('ink', 0.88)); g.addColorStop(0.9, rgba('ink', 0.88)); g.addColorStop(1, rgba('ink', 0));
      c.fillStyle = g; c.fillRect(fx0 - 40, 150, hw + 120, 56);
      c.font = font(F.mono(400), 24); c.fillStyle = rgba('bone', 0.72);
      c.fillText('02  › ' + LINE_A, fx0, 188);
    }
    // field
    c.fillStyle = rgba('ink', 0.96); c.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    c.strokeStyle = rgba('bone', 0.42); c.lineWidth = hair; c.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    corners(c, fx0, fy0, fx1, fy1, 14, rgba('bone', 0.7), hair);
    c.font = font(fam, 44); c.fillStyle = rgba('ash', 0.7); c.fillText('›', fx0 + 34, base1 - 3);
    // line (b): fast machine typing in two rows, the action words warm
    const cps = 46;
    const n = Math.floor(Math.max(0, lt - 0.05) * cps);
    const r1 = Array.from(LINE_B1), r2 = Array.from(LINE_B2);
    const n1 = Math.min(r1.length, n), n2 = clamp(n - r1.length - 1, 0, r2.length);
    c.font = font(fam, FS);
    const hl = (row: string, nn: number, x: number, y: number, words: string[]) => {
      c.fillStyle = rgba('bone', 0.95);
      c.fillText(Array.from(row).slice(0, nn).join(''), x, y);
      for (const w of words) {
        const i = row.indexOf(w);
        if (i < 0) continue;
        const m = Math.min(nn - i, Array.from(w).length);
        if (m <= 0) continue;
        c.fillStyle = rgba('signal');
        c.fillText(Array.from(w).slice(0, m).join(''), x + i * adv, y);
        if (m === Array.from(w).length) { c.fillRect(x + i * adv, y + 14, Array.from(w).length * adv * ease.outExpo(clamp((lt - (i + m) / cps) / 0.3)), 2); }
      }
    };
    hl(LINE_B1, n1, tx0, base1, []);
    for (const w of ['quan tâm', 'yêu thương']) {
      const i = LINE_B1.indexOf(w), m = Array.from(w).length;
      if (n1 >= i + m) { c.fillStyle = rgba('bone', 0.55); c.fillRect(tx0 + i * adv, base1 + 14, m * adv * ease.outExpo(clamp((lt - (i + m) / cps) / 0.3)), 1.5); }
    }
    if (n2 > 0) hl(LINE_B2, n2, tx0, base2, ['hành động giản dị']);
    const cxp = n2 > 0 ? tx0 + n2 * adv : tx0 + n1 * adv, cyp = n2 > 0 ? base2 : base1;
    const done = n >= r1.length + 1 + r2.length;
    const on = !done || (k % 1) < 0.5;
    if (on && riser < 0.5) { c.fillStyle = rgba('signal'); c.fillRect(cxp + 3, cyp - FS * 0.78, 4, FS * 0.92); }
    meta(c, fx0, fy1 + 30, 'PROMPT', '03', 'không nói nữa · chạy lệnh');
    c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.textAlign = 'right'; c.fillStyle = rgba('bone', 0.6);
    c.fillText('MODE  exec', fx1, fy1 + 30); c.letterSpacing = '0px'; c.textAlign = 'left';

    // execution log
    const lx0 = fx0, lx1 = 1240, ly0 = 528, rowH = 38, NV = 6;
    const live = ROWS.filter((r) => k >= r.k0);
    // scroll: rows beyond NV push the list up (eased per arrival)
    let scroll = 0;
    for (let i = NV; i < ROWS.length; i++) {
      const r = ROWS[i]!;
      if (k >= r.k0) scroll += ease.outExpo(clamp((k - r.k0) / Math.min(0.5, (ROWS[i + 1]?.k0 ?? 99) - r.k0 + 0.05)));
    }
    const speed = live.length > NV ? clamp((live.length - NV) / 10) * riser : 0;
    c.save();
    c.beginPath(); c.rect(lx0 - 10, ly0 - 4, W, rowH * NV + 6); c.clip();
    c.fillStyle = rgba('ink', 0.82); c.fillRect(lx0, ly0, lx1 - lx0, rowH * NV);
    ROWS.forEach((row, i) => {
      if (k < row.k0) return;
      const y = ly0 + (i - scroll) * rowH + 27;
      if (y < ly0 - rowH || y > ly0 + rowH * (NV + 1)) return;
      const age = (k - row.k0) * (B(1) - B(0));
      const fin = k >= row.k1;
      const ghosts = speed > 0.05 ? 3 : 0;
      for (let gi = ghosts; gi >= 0; gi--) {
        const gy = y + gi * 16 * speed;
        const ga = gi === 0 ? 1 : 0.22 * (1 - gi / 4);
        this.logRow(c, row, i, lx0, lx1, gy, age, fin, ga, t);
      }
    });
    c.restore();
    // hairline frame of the log + header
    c.fillStyle = rgba('bone', 0.35);
    c.fillRect(lx0, ly0 - 1, lx1 - lx0, hair); c.fillRect(lx0, ly0 + rowH * NV, lx1 - lx0, hair);
    c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('bone', 0.6);
    c.fillText('PROCESS', lx0, ly0 - 14); c.fillStyle = rgba('signal', 0.9); c.fillText('LOG', lx0 + 104, ly0 - 14);
    c.letterSpacing = '0px'; c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 0.75); c.textAlign = 'right';
    const okN = ROWS.filter((r) => k >= r.k1 && !r.skip).length;
    c.fillText(`${String(okN).padStart(2, '0')} ok   0 lỗi   ${live.length > 0 ? 'đang chạy' : 'chờ'}`, lx1, ly0 - 14);
    c.textAlign = 'left';
    // right column: a quiet meter of "care" accumulating, one notch per completed action


    // HÀNH ĐỘNG GIẢN DỊ: bottom-left, on S14
    if (t >= S(14)) {
      const lk = t - S(14);
      const size = big(c, KEY, { lt: lk, x: 150, y: 866, w: 1180, max: 140, align: 'left', width: 100, weight: 900, punch: 0.18 });
      const kw = measure(KEY, F.archivo(100, 900), size) * (1 + 0.015 * lk);
      // underline extends on the beats after the slam
      const steps = clamp(Math.floor(k - 42) + ease.outExpo(clamp(((k - 42) % 1) * 4)), 0, 3) / 3;
      c.fillStyle = rgba('signal'); c.fillRect(150, 936, kw * Math.max(0.08, steps), 4);
      c.font = font(F.mono(400), 14); c.fillStyle = rgba('ash', 0.85);
      c.fillText('= quan tâm + yêu thương, mỗi lần một việc nhỏ', 150, 964);
      // the stamp, one beat later
      if (k >= 43) this.stamp(c, 150 + kw + 200, 846, (k - 43) * (B(1) - B(0)));
    }
    c.restore();
    void riser;
    const sx = W / 2 + z * (cxp + 5 - cx), sy = H / 2 + z * (cyp - FS * 0.7 - cy);
    return on && !done ? { x: sx, y: sy, hot: 0.25 } : null;
  }

  private logRow(c: CanvasRenderingContext2D, row: Row, i: number, x0: number, x1: number, y: number, age: number, fin: boolean, ga: number, t: number) {
    const fam = F.mono(400);
    c.globalAlpha = ga;
    c.font = font(fam, 21);
    c.fillStyle = rgba('graphite', 1);
    c.fillText(`0x${(0x3a + i * 7).toString(16).toUpperCase().padStart(3, '0')}`, x0 + 14, y);
    c.fillStyle = rgba('ash', 0.9);
    c.fillText('$', x0 + 96, y);
    const typed = Array.from(row.cmd).slice(0, Math.floor(age * 90)).join('');
    c.fillStyle = row.skip ? rgba('ash', 0.8) : rgba('bone', 0.95);
    c.fillText(typed, x0 + 124, y);
    const cw = measure(row.cmd, fam, 21);
    if (row.skip && fin) { c.fillStyle = rgba('ash', 0.9); c.fillRect(x0 + 120, y - 7, cw + 8, 1.5); }
    // leader dots
    const sx = 860;
    c.fillStyle = rgba('graphite', 0.9);
    for (let x = x0 + 140 + cw; x < sx - 20; x += 12) c.fillRect(x, y - 2, 2, 2);
    if (!fin) {
      const ph = Math.floor(t * 18) % 4;
      c.fillStyle = rgba('ash', 0.9);
      c.fillText(['·  ', '·· ', '···', ' ··'][ph]!, sx, y);
      // progress bar
      c.fillStyle = rgba('bone', 0.5);
      c.fillRect(sx + 70, y - 8, 120 * clamp(age / 0.3), 2);
    } else if (row.skip) {
      c.fillStyle = rgba('ash', 0.95);
      c.fillText('— bỏ qua', sx, y);
    } else {
      const fa = clamp((age - 0) * 1);
      check(c, sx + 9, y - 8, 9, rgba('signal'), 2.6);
      c.fillStyle = rgba('signal', 0.95);
      c.fillText('xong', sx + 36, y);
      c.fillStyle = rgba('ash', 0.8);
      c.fillText(`${row.ms} ms`, sx + 120, y);
      void fa;
    }
    c.globalAlpha = 1;
    void x1;
  }

  private stamp(c: CanvasRenderingContext2D, x: number, y: number, age: number) {
    const s = 1 + 0.6 * Math.exp(-age * 22) - 0.08 * (springStep(age, 5, 0.4) - 1);
    c.save();
    c.translate(x, y); c.rotate(-0.07); c.scale(s, s);
    c.globalAlpha = clamp(age * 30);
    const w = 300, h = 96;
    c.strokeStyle = rgba('signal'); c.lineWidth = 3; c.strokeRect(-w / 2, -h / 2, w, h);
    c.lineWidth = 1; c.strokeRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14);
    c.fillStyle = rgba('signal');
    c.font = font(F.archivo(100, 900), 30); c.textAlign = 'center'; c.letterSpacing = '2px';
    c.fillText('ĐÃ THỰC THI', 10, 4);
    check(c, -w / 2 + 34, -4, 10, rgba('signal'), 3.4);
    c.font = font(F.mono(500), 12); c.letterSpacing = '3px';
    c.fillText('EXIT 0 · LẶNG LẼ', 0, h / 2 - 16);
    c.restore();
  }
}

// ------------------------------------------------------------------ helpers
function corners(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, tk: number, col: string, lw = 1) {
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.beginPath();
  for (const [x, y, sx, sy] of [[x0, y0, -1, -1], [x1, y0, 1, -1], [x0, y1, -1, 1], [x1, y1, 1, 1]] as const) {
    c.moveTo(x + sx * 6, y); c.lineTo(x + sx * (6 + tk), y);
    c.moveTo(x, y + sy * 6); c.lineTo(x, y + sy * (6 + tk));
  }
  c.stroke(); c.restore();
}

function meta(c: CanvasRenderingContext2D, x: number, y: number, a: string, no: string, sub: string) {
  c.save();
  c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('bone', 0.6);
  c.fillText(a, x, y);
  const pw = measure(a, F.mono(500), 13, 3) + 14;
  c.fillStyle = rgba('signal', 0.9); c.fillText(no, x + pw, y);
  c.letterSpacing = '0px'; c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 0.75);
  c.fillText(sub, x, y + 22);
  c.restore();
}

function check(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, lw: number) {
  c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'square'; c.lineJoin = 'miter';
  c.beginPath(); c.moveTo(x - s, y); c.lineTo(x - s * 0.3, y + s * 0.7); c.lineTo(x + s, y - s * 0.8); c.stroke(); c.restore();
}

function mixc(a: string, b: string, k: number) {
  const pa = rgba(a).match(/\d+/g)!.map(Number), pb = rgba(b).match(/\d+/g)!.map(Number);
  return `rgba(${[0, 1, 2].map((i) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * k)).join(',')},1)`;
}

/**
 * Next-token distribution panel (adapted from pdoom prompt.ts, MIT), as a side panel with its top-left at
 * (px, py - hgt/2) and a leader from the token. pick: highlighted row; strike: row struck out (-1 none).
 */
function popup(c: CanvasRenderingContext2D, px: number, py: number, from: { x: number; y: number }, t: number, k: number, kPick: number, kEnd: number,
  rows: Cand[], pick: number, hair: number, pw: number, strike: number, status?: string) {
  const beat = B(1) - B(0);
  const a0 = kPick - 0.45;
  const built = clamp((k - a0) / 0.45);
  const picked = k >= kPick;
  const collapse = ease.inCubic(clamp((k - kEnd + 0.35) / 0.35));
  const rh = 29, headH = 26, hgt = headH + rows.length * rh + 8;
  const top = clamp(py - hgt / 2, 130, 980 - hgt);
  c.save();
  c.globalAlpha = 1 - collapse;
  // leader: token → panel edge (an elbow)
  c.fillStyle = rgba('bone', 0.5);
  const lx = px - 14;
  c.fillRect(from.x, from.y, Math.max(0, lx - from.x) * (1 - collapse), hair);
  c.fillRect(lx, Math.min(from.y, py), hair, Math.abs(py - from.y) + hair);
  c.fillRect(lx, py, 14, hair);
  c.fillRect(from.x - 2, from.y - 2, 5, 5);
  c.translate(px, top);
  c.scale(1 - collapse, 1);
  c.fillStyle = rgba('ink', 0.92); c.fillRect(0, 0, pw, hgt);
  c.fillStyle = rgba('bone', 0.4); c.fillRect(0, 0, pw, hair); c.fillRect(0, 0, hair, hgt); c.fillRect(pw, 0, hair, hgt); c.fillRect(0, hgt, pw, hair);
  c.textBaseline = 'alphabetic';
  c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 0.85);
  c.fillText('p( next | context )', 10, 18);
  c.textAlign = 'right';
  c.fillStyle = status ? rgba('signal', 0.95) : rgba('ash', 0.85);
  c.fillText(status ?? (picked ? 'sampled' : 'computing…'), pw - 8, 18);
  c.textAlign = 'left';
  const pmax = rows[0]![1];
  rows.forEach(([txt, p], i) => {
    const y = headH + (i + 1) * rh - 6;
    const fl = hash(i, frameIdx(t), kPick) < 0.25 + 0.75 * built;
    if (!picked && !fl) return;
    const jitter = picked ? 1 : 0.3 + 0.7 * built + (hash(i, Math.floor(t * 30), 3) - 0.5) * 0.5 * (1 - built);
    const on = picked && i === pick;
    const flashRow = on ? Math.pow(0.5, ((k - kPick) * beat) / 0.08) : 0;
    if (on) { c.fillStyle = rgba('signal', 0.14 + 0.5 * flashRow); c.fillRect(1, y - 19, pw - 1, rh - 2); }
    c.font = font(F.mono(on ? 500 : 400), 19);
    c.fillStyle = on ? rgba('signal', 1) : rgba(picked ? 'ash' : 'bone', picked ? 0.85 : 0.55);
    if (on) { c.beginPath(); c.moveTo(8, y - 11); c.lineTo(15, y - 6); c.lineTo(8, y - 1); c.closePath(); c.fill(); }
    c.fillText(txt, 22, y);
    if (i === strike) { c.fillStyle = rgba('ash', 0.9); c.fillRect(20, y - 6, measure(txt, F.mono(400), 19) + 4, 1.5); }
    const bx = pw * 0.6, bwm = pw * 0.24;
    const bw = clamp((bwm * p) / pmax * clamp(jitter, 0, 1.2), 1.5, bwm);
    c.fillStyle = on ? rgba('signal', 1) : rgba('bone', picked ? 0.3 : 0.45);
    c.fillRect(bx, y - 11, bw, 7);
    c.font = font(F.mono(400), 14); c.fillStyle = on ? rgba('signal', 1) : rgba('ash', 0.8);
    c.textAlign = 'right'; c.fillText(p.toFixed(2), pw - 8, y); c.textAlign = 'left';
  });
  c.restore();
}
