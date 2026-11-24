// p05-time (S26 → S35): "Thời gian có thể làm thay đổi nhiều thứ. / Nhưng sự chân thành, tình yêu thương /
// và những giá trị tốt đẹp sẽ luôn còn mãi."
//   S26: mặt đồng hồ khắc khổng lồ nằm ngang, máy quay thấp; kim giây bước một nấc mỗi cú đập (lò xo vượt).
//        THỜI GIAN (Archivo giãn rộng) + câu (a) gõ máy.
//   S28: thời gian bào mòn: lưới không gian võng xuống quanh tâm, nét khắc gãy thành gạch, lệch, mờ; chữ tróc.
//   S30: CHÂN THÀNH, TÌNH YÊU THƯƠNG: thứ duy nhất không bị bào mòn (sắc, khoá bằng ngoặc cam).
//   S32: cắt sang đường hầm vòng thời gian, tăng tốc theo riser. Mã: `let` tan rã, `const` khoá cam.
//        GIÁ TRỊ (S32), CÒN MÃI (S34). Đóng băng rồi tối gần hẳn trước S35 (khoảng thở).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, clearRT, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, font, measure } from '../../engine/type';
import { clamp, ease, hash, lerp, noise1, prog, pulse, smoothstep, springStep, TAU } from '../../engine/util';
import { BASE_POST, INK, LIN, Spark, big, hitPost, rgba, typeLine } from './kit';
import { B, S, TEXT } from './cues';

const TX = TEXT.p05;
const BEAT = B(1) - B(0);
const T_FREEZE = B(103.6);
const T_DARK = B(104.35);

// static dial geometry in plane coords (x, z relative to the dial centre), one entry per segment
interface Seg { ax: number; az: number; bx: number; bz: number; w: number; a: number; h: number; hot?: boolean }

const DIAL_C = { x: 0, z: -7 };
const R = 9;

function buildDial(): Seg[] {
  const out: Seg[] = [];
  const ring = (r: number, n: number, w: number, a: number, gap = 0) => {
    for (let i = 0; i < n; i++) {
      if (gap && i % gap === gap - 1) continue;
      const t0 = (i / n) * TAU, t1 = ((i + 1) / n) * TAU;
      out.push({ ax: Math.cos(t0) * r, az: Math.sin(t0) * r, bx: Math.cos(t1) * r, bz: Math.sin(t1) * r, w, a, h: hash(r * 100, i) });
    }
  };
  const radial = (r0: number, r1: number, th: number, w: number, a: number, hot = false) =>
    out.push({ ax: Math.cos(th) * r0, az: Math.sin(th) * r0, bx: Math.cos(th) * r1, bz: Math.sin(th) * r1, w, a, h: hash(r0 * 37, th * 1000), hot });
  // bezel: double ring
  ring(R, 192, 1.6, 0.85); ring(R - 0.12, 192, 1, 0.5);
  // minute track: 60 ticks, majors every 5
  for (let i = 0; i < 60; i++) {
    const th = (i / 60) * TAU, maj = i % 5 === 0;
    radial(R - 0.25, R - (maj ? 1.3 : 0.6), th, maj ? 2.2 : 1.1, maj ? 0.9 : 0.55);
    if (maj) radial(R - 0.25, R - 1.3, th + 0.006, 1.2, 0.6);
  }
  // fine 240-step scale
  for (let i = 0; i < 240; i++) radial(R - 1.45, R - (i % 4 === 0 ? 1.75 : 1.6), (i / 240) * TAU, 1, 0.35);
  ring(R - 1.45, 160, 1, 0.45); ring(R - 1.9, 160, 1, 0.3);
  // engraved inner bands: concentric hairlines, some broken
  for (let j = 0; j < 16; j++) ring(R - 2.3 - j * 0.28, 128, 1, j % 4 === 0 ? 0.4 : 0.16, j % 3 === 1 ? 9 : 0);
  // knurled band
  for (let i = 0; i < 360; i++) radial(2.2, 2.5, (i / 360) * TAU, 1, 0.3);
  ring(2.2, 96, 1, 0.4); ring(2.55, 96, 1, 0.5); ring(1.1, 64, 1.2, 0.5);
  // hour spokes, faint
  for (let i = 0; i < 12; i++) radial(2.6, R - 2.2, (i / 12) * TAU, 1, 0.1);
  return out;
}

function buildGrid(): Seg[] {
  const out: Seg[] = [];
  const S0 = 1.5, X0 = -36, X1 = 36, Z0 = -40, Z1 = 14;
  for (let x = X0; x <= X1; x += S0) for (let z = Z0; z < Z1; z += 0.75) out.push({ ax: x, az: z, bx: x, bz: z + 0.75, w: 1, a: 0.12, h: hash(x, z, 1) });
  for (let z = Z0; z <= Z1; z += S0) for (let x = X0; x < X1; x += 0.75) out.push({ ax: x, az: z, bx: x + 0.75, bz: z, w: 1, a: 0.12, h: hash(x, z, 2) });
  return out;
}

// code block (shot 2)
interface Code { kw: 'let' | 'const'; name: string; val: string; k: number }
const CODE: Code[] = [
  { kw: 'let', name: 'nhiều_thứ', val: 'thay_đổi(thời_gian);', k: 96 },
  { kw: 'let', name: 'năm_tháng', val: 'trôi();', k: 96.5 },
  { kw: 'const', name: 'chân_thành', val: 'true;', k: 97 },
  { kw: 'const', name: 'yêu_thương', val: 'true;', k: 97.5 },
  { kw: 'const', name: 'giá_trị', val: '"tốt đẹp";', k: 98 },
];
const K_DISSOLVE = 99; // let lines fall apart
const K_LOCK = [99, 99.5, 100]; // const lines lock (in order)

export default class Plate extends Scene {
  ui = new Layer2D();
  spark = new Spark();
  lines = new LineBatch(26000, { screen2D: false });
  cam = new THREE.PerspectiveCamera(38, W / H, 0.05, 400);
  dial = buildDial();
  grid = buildGrid();
  v = new THREE.Vector3();
  comp = new FSPass(/* glsl */ `
    uniform sampler2D ui; uniform float hotBoost, alpha;
    void main() {
      vec4 u = texture(ui, vUv);
      float hot = smoothstep(0.25, 0.7, u.r - u.g * 1.3);
      vec3 c = u.rgb * (1.0 + hotBoost * hot);
      float a = u.a * alpha;
      fragColor = vec4(c * a, a);
    }`, { ui: { value: null }, hotBoost: { value: 1.3 }, alpha: { value: 1 } }, { blending: THREE.CustomBlending, transparent: true });
  veil = new FSPass(/* glsl */ `
    uniform float a;
    void main() { fragColor = vec4(C_INK * a, a); }`, { a: { value: 0 } }, { blending: THREE.CustomBlending, transparent: true });
  // sky / pit glow (additive)
  bg = new FSPass(/* glsl */ `
    uniform vec2 c0; uniform float horizon, glow, aspect, mode;
    void main() {
      vec2 p = (vUv - c0) * vec2(aspect, 1.0);
      float r = length(p);
      vec3 col = vec3(0.0);
      if (mode < 0.5) {
        // a cold haze along the horizon, a whisper of ember at the pivot
        float hz = exp(-abs(vUv.y - horizon) * 9.0);
        col += C_ASH * 0.022 * hz;
        col += heat(0.3 + 0.3 * glow) * 0.12 * glow * exp(-r * 6.0);
      } else {
        col += C_ASH * 0.02 * exp(-r * 2.0);
        col += heat(0.25 + 0.45 * glow) * glow * 0.4 * exp(-r * mix(12.0, 3.5, sat(glow)));
      }
      fragColor = vec4(col, 0.0);
    }`, { c0: { value: new THREE.Vector2(0.5, 0.5) }, horizon: { value: 0.5 }, glow: { value: 0 }, aspect: { value: W / H }, mode: { value: 0 } },
  { blending: THREE.CustomBlending, transparent: true });

  constructor(ctx: ConstructorParameters<typeof Scene>[0]) {
    super(ctx);
    const m = this.comp.mat; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    const g = this.bg.mat; g.blendEquation = THREE.AddEquation; g.blendSrc = THREE.OneFactor; g.blendDst = THREE.OneFactor;
    g.blendSrcAlpha = THREE.ZeroFactor; g.blendDstAlpha = THREE.OneFactor;
    this.comp.u.ui!.value = this.ui.texture;
    const vm = this.veil.mat; vm.blendEquation = THREE.AddEquation; vm.blendSrc = THREE.OneFactor; vm.blendDst = THREE.OneMinusSrcAlphaFactor;
    vm.blendSrcAlpha = THREE.OneFactor; vm.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  }

  private proj(x: number, y: number, z: number) {
    const v = this.v.set(x, y, z).project(this.cam);
    return { x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H, ok: v.z < 1 };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, t = f.t;
    const k = (t - B(0)) / BEAT;
    clearRT(r, out, INK);
    const L = this.ui; L.clear();
    const c = L.ctx;
    const shot2 = t >= S(32);
    let pivot: { x: number; y: number } | null = null;
    let sparkAmt = 0, sparkSize = 0.02;
    const freeze = t >= T_FREEZE;
    const dark = smoothstep(T_FREEZE + 0.05, T_DARK, t);

    if (!shot2) pivot = this.shotDial(r, out, c, t, k);
    else pivot = this.shotTunnel(r, out, c, t, k);
    if (!shot2) { sparkAmt = 0.55 + 0.6 * pulse(t, this.lastHit(t), 0.25); sparkSize = 0.022; }
    else { const rz = prog(t, S(32), S(34.3)); sparkAmt = (0.4 + 1.2 * rz * rz) * (freeze ? 0.6 : 1); sparkSize = 0.02 + 0.05 * rz * rz; }

    L.upload();
    this.comp.u.alpha!.value = 1;
    this.comp.render(r, out);
    // the breath: everything sinks under an ink veil; only the Spark stays, gliding to where p06 picks it up
    if (dark > 0) { this.veil.u.a!.value = dark; this.veil.render(r, out); }
    const m = ease.inOutCubic(dark);
    if (pivot) this.spark.draw(r, out, lerp(pivot.x, 960, m), lerp(pivot.y, 430, m), t, lerp(sparkAmt, 0.4, m), lerp(sparkSize, 0.022, m));

    const post = hitPost(t, [S(26), S(28), S(30)], [S(26), S(28), S(30)], { ...BASE_POST });
    if (shot2 && !freeze) {
      const rz = Math.pow(prog(t, S(32), S(34.3)), 2);
      post.bloom = 0.6 + 0.35 * rz;
      post.ca = 0.6 * (1 - 0.5 * rz);
      post.shake = [noise1(t * 40, 1) * 6 * rz, noise1(t * 40, 2) * 6 * rz];
    }
    return post;
  }

  private lastHit(t: number) {
    let h = -99;
    for (const x of [S(26), S(28), S(30)]) if (t >= x) h = x;
    return h;
  }

  // ================================================================ shot 1: the dial
  private shotDial(r: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, c: CanvasRenderingContext2D, t: number, k: number) {
    const lt = t - S(26);
    const E = 0.8 * ease.inOutCubic(prog(t, S(28), S(30))) + 0.22 * prog(t, S(30), S(32)); // erosion
    const sag = 1.5 * ease.inOutCubic(prog(t, S(28) - 0.1, S(30.5)));
    // camera: low and monumental, slow dolly + orbit; a hair of kick on each tick
    const cam = this.cam;
    const orbit = -0.16 + 0.045 * lt;
    const dist = 11.5 - 0.3 * lt;
    cam.fov = 44;
    cam.position.set(DIAL_C.x + Math.sin(orbit) * dist, 2.7 + 0.05 * lt, DIAL_C.z + Math.cos(orbit) * dist);
    cam.up.set(Math.sin(0.025 * Math.sin(lt * 0.3)), 1, 0);
    cam.lookAt(DIAL_C.x - Math.sin(orbit) * 3, 0.35, DIAL_C.z - Math.cos(orbit) * 3);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();

    const LB = this.lines; LB.clear();
    const bone = LIN.bone, sig = LIN.signal;
    const camP = cam.position;
    const well = (x: number, z: number) => {
      const dx = x - DIAL_C.x, dz = z - DIAL_C.z;
      return -sag / (1 + (dx * dx + dz * dz) / 9);
    };
    const fog = (x: number, z: number) => {
      const d = Math.hypot(x - camP.x, z - camP.z);
      return Math.exp(-Math.max(0, d - 6) * 0.045);
    };
    const push = (s: Seg, ox: number, oz: number, rgb: [number, number, number], aMul: number, erodeK: number) => {
      let ax = s.ax + ox, az = s.az + oz, bx = s.bx + ox, bz = s.bz + oz;
      let a = s.a * aMul;
      let dy = 0;
      if (erodeK > 0) {
        const e = clamp((erodeK - s.h * 0.85) / 0.35);
        if (e > 0) {
          if (e >= 1) return;
          // fragment into a shorter dash, displaced and sinking
          const u0 = 0.5 * e * hash(s.h, 1), u1 = 1 - 0.5 * e * hash(s.h, 2);
          const mx = (hash(s.h, 3) - 0.5) * 1.4 * e, mz = (hash(s.h, 4) - 0.5) * 1.4 * e;
          const nax = lerp(ax, bx, u0) + mx, naz = lerp(az, bz, u0) + mz, nbx = lerp(ax, bx, u1) + mx, nbz = lerp(az, bz, u1) + mz;
          ax = nax; az = naz; bx = nbx; bz = nbz;
          a *= 1 - 0.85 * e;
          dy = -0.9 * e * hash(s.h, 5);
        }
      }
      const fa = fog((ax + bx) / 2, (az + bz) / 2);
      LB.seg(ax, well(ax, az) + dy, az, bx, well(bx, bz) + dy, bz, s.w, rgb[0], rgb[1], rgb[2], a * fa);
    };
    for (const s of this.grid) push(s, 0, 0, bone, 1.0, E * 0.9);
    for (const s of this.dial) push(s, DIAL_C.x, DIAL_C.z, bone, 1.0, E);
    // the second hand: one heavy step per slam, spring overshoot
    let th = -Math.PI / 2 - 0.35;
    for (const h of [S(26), S(28), S(30)]) th += (TAU / 12) * springStep(t - h, 2.6, 0.32);
    const hx = Math.cos(th), hz = Math.sin(th);
    const px = -hz, pz = hx; // perpendicular
    const hl = R - 0.5;
    const hy = well(DIAL_C.x, DIAL_C.z) * 0.6 + 0.12;
    for (let i = -5; i <= 5; i++) {
      const o = i * 0.03;
      const x0 = DIAL_C.x - hx * 2.2 + px * o, z0 = DIAL_C.z - hz * 2.2 + pz * o;
      const x1 = DIAL_C.x + hx * hl + px * o * 0.15, z1 = DIAL_C.z + hz * hl + pz * o * 0.15;
      const N = 12;
      for (let j = 0; j < N; j++) {
        const u0 = j / N, u1 = (j + 1) / N;
        const ax = lerp(x0, x1, u0), az = lerp(z0, z1, u0), bx = lerp(x0, x1, u1), bz = lerp(z0, z1, u1);
        LB.seg(ax, hy, az, bx, hy, bz, i === 0 ? 2.4 : 1, bone[0], bone[1], bone[2], i === 0 ? 0.95 : Math.abs(i) === 5 ? 0.7 : 0.28);
      }
    }
    // orange tip of the hand
    {
      const ax = DIAL_C.x + hx * (hl - 1.2), az = DIAL_C.z + hz * (hl - 1.2), bx = DIAL_C.x + hx * hl, bz = DIAL_C.z + hz * hl;
      LB.seg(ax, hy + 0.01, az, bx, hy + 0.01, bz, 3, sig[0] * 2, sig[1] * 2, sig[2] * 2, 1);
    }
    // the sweep: a fading arc trail behind each step
    for (const h of [S(26), S(28), S(30)]) {
      const a = pulse(t, h, 0.25);
      if (a < 0.02) continue;
      const thEnd = th, thStart = th - TAU / 12;
      for (let j = 0; j < 24; j++) {
        const u0 = j / 24, u1 = (j + 1) / 24;
        const t0 = lerp(thStart, thEnd, u0), t1 = lerp(thStart, thEnd, u1);
        for (const rr of [hl - 0.3, hl - 0.6, hl - 0.9]) {
          const ax = DIAL_C.x + Math.cos(t0) * rr, az = DIAL_C.z + Math.sin(t0) * rr, bx = DIAL_C.x + Math.cos(t1) * rr, bz = DIAL_C.z + Math.sin(t1) * rr;
          LB.seg(ax, hy, az, bx, hy, bz, 1.4, sig[0] * 1.5, sig[1] * 1.5, sig[2] * 1.5, a * u1 * 0.8);
        }
      }
    }
    // background glow, then the lines
    const pv = this.proj(DIAL_C.x, hy, DIAL_C.z);
    const hor = this.proj(DIAL_C.x, 0, DIAL_C.z - 200);
    const bu = this.bg.u;
    (bu.c0!.value as THREE.Vector2).set(pv.x / W, 1 - pv.y / H);
    bu.horizon!.value = 1 - hor.y / H; bu.glow!.value = 0.6 + 0.8 * pulse(t, this.lastHit(t), 0.3); bu.mode!.value = 0;
    this.bg.render(r, out);
    LB.render(r, out, this.cam);

    // ---------------- UI
    // annotations (they decay with E)
    const tick = [S(26), S(28), S(30)].filter((h) => t >= h).length;
    this.erodeBlock(c, E * 1.1, 11, (cc) => {
      cc.font = font(F.mono(500), 13); cc.letterSpacing = '3px'; cc.fillStyle = rgba('bone', 0.6);
      cc.fillText('CHRONO', 1600, 132); cc.fillStyle = rgba('signal', 0.9); cc.fillText('05', 1710, 132);
      cc.letterSpacing = '0px'; cc.font = font(F.mono(400), 14); cc.fillStyle = rgba('ash', 0.8);
      cc.fillText(`tick ${String(tick).padStart(2, '0')} / 12`, 1600, 156);
      cc.fillText(`bước = 30° / nhịp`, 1600, 178);
      cc.fillText(`t = ${(t - S(26)).toFixed(3)} s`, 1600, 200);
    }, 1590, 110, 240, 100);
    this.erodeBlock(c, E * 1.2, 12, (cc) => {
      cc.font = font(F.mono(400), 13); cc.fillStyle = rgba('ash', 0.75);
      cc.fillText('r = 9.000 · bezel', 150, 980);
      cc.fillText('mặt khắc · 60 vạch · 240 vạch phụ', 150, 1000 - 4);
    }, 140, 960, 500, 50);

    // text: THỜI GIAN + line (a); both erode from S28.6, gone before S30
    const Et = 1.3 * ease.inCubic(prog(t, S(28.3), S(29.9)));
    if (t < S(30)) {
      this.erodeBlock(c, Et, 1, (cc) => {
        big(cc, TX.a.big, { lt, x: 150, y: 214, w: 1500, max: 190, align: 'left', width: 125, weight: 900, punch: 0.16 });
      }, 100, 80, 1720, 260, 14);
      const Et2 = 1.3 * ease.inCubic(prog(t, S(28.75), S(29.95)));
      this.erodeBlock(c, Et2, 2, (cc) => {
        scrim(cc, 154, 386, 1220, 54);
        typeLine(cc, TX.a.line, lt - 0.15, { x: 154, y: 386, size: 50, cps: 50, caret: lt < 3 });
      }, 100, 330, 1720, 76, 6);
      // the bracket under THỜI GIAN: a time ruler that ticks with the hand
      this.erodeBlock(c, Et, 3, (cc) => {
        cc.fillStyle = rgba('bone', 0.5);
        cc.fillRect(152, 300, 1100, 1);
        for (let i = 0; i <= 60; i++) cc.fillRect(152 + i * (1100 / 60), 300, 1, i % 5 === 0 ? 10 : 5);
        cc.fillStyle = rgba('signal');
        cc.fillRect(152, 299, (1100 / 12) * (tick + springStep(t - this.lastHit(t), 2.6, 0.32) - 1), 3);
      }, 100, 290, 1300, 20, 4);
    }
    // S30: what time cannot erode
    if (t >= S(30)) {
      const l1 = t - S(30), l2 = t - B(92);
      const s1 = big(c, TX.b.bigs[0], { lt: l1, x: 150, y: 186, w: 1100, max: 150, align: 'left', width: 100, weight: 900, punch: 0.2 });
      lockBracket(c, 150, 186, measure(TX.b.bigs[0], F.archivo(100, 900), s1), s1, l1, 'const · không đổi');
      if (l2 >= 0) {
        const s2 = big(c, TX.b.bigs[1], { lt: l2, x: 150, y: 380, w: 1300, max: 150, align: 'left', width: 100, weight: 900, punch: 0.2 });
        lockBracket(c, 150, 380, measure(TX.b.bigs[1], F.archivo(100, 900), s2), s2, l2, '');
      }
      scrim(c, 154, 566, 1100, 54);
      typeLine(c, TX.b.line, l1 - 0.05, { x: 154, y: 566, size: 50, cps: 60, caret: true });
    }
    return pv.ok ? { x: pv.x, y: pv.y } : null;
  }

  /** Draw `fn` into horizontal slices that shear apart and fade as `e` (0..1+) grows. */
  private erodeBlock(c: CanvasRenderingContext2D, e: number, seed: number, fn: (c: CanvasRenderingContext2D) => void, x: number, y: number, w: number, h: number, n = 6) {
    if (e <= 0.001) { fn(c); return; }
    if (e >= 1.25) return;
    const bh = h / n;
    for (let i = 0; i < n; i++) {
      const hs = hash(seed, i);
      const loc = clamp((e - hs * 0.6) / 0.6);
      if (loc >= 1) continue;
      const dx = (hash(seed, i, 2) - 0.5) * 120 * loc * loc + (hash(seed, i, 3) < 0.3 ? 14 * Math.sign(hs - 0.5) * loc : 0);
      const dy = 18 * loc * loc * hash(seed, i, 4);
      c.save();
      c.beginPath(); c.rect(x - 200, y + i * bh, w + 400, bh * (1 - 0.35 * loc)); c.clip();
      c.globalAlpha = 1 - loc;
      c.translate(dx, dy);
      fn(c);
      c.restore();
    }
  }

  // ================================================================ shot 2: the tunnel of time-rings
  private shotTunnel(r: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, c: CanvasRenderingContext2D, t: number, k: number) {
    const tt = Math.min(t, T_FREEZE);
    const u = tt - S(32);
    // accelerating travel (peaks around S33.5-S34.3), frozen dead at T_FREEZE
    const zc = -(1.2 * u + 3.2 * (Math.exp(1.35 * u) - 1 - 1.35 * u));
    const cam = this.cam;
    cam.fov = 50 + 14 * Math.pow(prog(tt, S(32.5), S(34.4)), 2);
    cam.position.set(0.55 * Math.sin(u * 0.7), 0.35 * Math.cos(u * 0.5), zc);
    cam.up.set(Math.sin(0.15 * u + 0.1 * u * u), Math.cos(0.15 * u + 0.1 * u * u), 0);
    cam.lookAt(-1.25, 0.25, zc - 10);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const LB = this.lines; LB.clear();
    const bone = LIN.bone, sig = LIN.signal;
    const gap = 2.2, RR = 3.4;
    const i0 = Math.floor(-zc / gap);
    for (let i = i0 - 1; i < i0 + 34; i++) {
      const z = -i * gap;
      const d = zc - z; // distance ahead
      if (d < 0.05) continue;
      const fa = Math.exp(-d * 0.045) * smoothstep(0.05, 1.5, d);
      if (fa < 0.01) continue;
      const hot = i % 9 === 0; // some rings are constant: orange
      const rot = i * 0.21;
      const N = 120;
      const col: [number, number, number] = hot ? [sig[0] * 1.8, sig[1] * 1.8, sig[2] * 1.8] : bone;
      const al = hot ? 0.9 : 0.5;
      for (let j = 0; j < N; j++) {
        if (!hot && hash(i, j, 7) < 0.08) continue; // worn gaps
        const a0 = (j / N) * TAU + rot, a1 = ((j + 1) / N) * TAU + rot;
        LB.seg(Math.cos(a0) * RR, Math.sin(a0) * RR, z, Math.cos(a1) * RR, Math.sin(a1) * RR, z, hot ? 2 : 1.2, col[0], col[1], col[2], al * fa);
      }
      // ticks inward
      for (let j = 0; j < 60; j++) {
        const a = (j / 60) * TAU + rot, maj = j % 5 === 0;
        const r1 = RR - (maj ? 0.45 : 0.2);
        LB.seg(Math.cos(a) * RR, Math.sin(a) * RR, z, Math.cos(a) * r1, Math.sin(a) * r1, z, maj ? 1.6 : 1, bone[0], bone[1], bone[2], (maj ? 0.6 : 0.3) * fa);
      }
      // an inner thin ring and an outer guide ring
      for (let j = 0; j < 72; j++) {
        const a0 = (j / 72) * TAU, a1 = ((j + 1) / 72) * TAU;
        LB.seg(Math.cos(a0) * (RR - 0.6), Math.sin(a0) * (RR - 0.6), z, Math.cos(a1) * (RR - 0.6), Math.sin(a1) * (RR - 0.6), z, 1, bone[0], bone[1], bone[2], 0.15 * fa);
      }
    }
    // longitudinal rails + speed streaks
    const speed = clamp((1.2 + 3.2 * 1.35 * (Math.exp(1.35 * u) - 1)) / 14);
    for (let j = 0; j < 24; j++) {
      const a = (j / 24) * TAU;
      const x = Math.cos(a) * (RR + 0.25), y = Math.sin(a) * (RR + 0.25);
      for (let s = 0; s < 16; s++) {
        const z0 = zc - 0.5 - s * 4, z1 = z0 - 4;
        LB.seg(x, y, z0, x, y, z1, 1, bone[0], bone[1], bone[2], 0.12 * Math.exp(-(s * 4) * 0.05));
      }
    }
    if (t < T_FREEZE) {
      const n = Math.floor(170 * speed);
      for (let i = 0; i < n; i++) {
        const a = hash(i, 1) * TAU, rr = RR * (0.75 + 0.4 * hash(i, 2));
        const zz = zc - 1 - ((hash(i, 3) * 60 + u * 25 * (0.5 + hash(i, 4))) % 60);
        const len = 0.5 + 7 * speed;
        const hot = hash(i, 5) < 0.1;
        const cc = hot ? [sig[0] * 1.6, sig[1] * 1.6, sig[2] * 1.6] : bone;
        LB.seg(Math.cos(a) * rr, Math.sin(a) * rr, zz, Math.cos(a) * rr, Math.sin(a) * rr, zz + len, 1, cc[0]!, cc[1]!, cc[2]!, (hot ? 0.8 : 0.3) * speed);
      }
    }
    const pv = this.proj(0, 0, zc - 60);
    const bu = this.bg.u;
    (bu.c0!.value as THREE.Vector2).set(pv.x / W, 1 - pv.y / H);
    bu.glow!.value = 0.2 + 0.55 * Math.pow(prog(tt, S(32), S(34.3)), 2); bu.mode!.value = 1;
    this.bg.render(r, out);
    LB.render(r, out, cam);

    // ---------------- UI
    const lt = t - S(32);
    // keyword: GIÁ TRỊ (S32) → CÒN MÃI (S34)
    if (t < S(34)) {
      const s = big(c, TX.c.bigs[0], { lt, x: 150, y: 196, w: 1000, max: 170, align: 'left', width: 100, weight: 900, punch: 0.2 });
      lockBracket(c, 150, 196, measure(TX.c.bigs[0], F.archivo(100, 900), s), s, lt - 0.1, '');
    } else {
      const l2 = t - S(34);
      const s = big(c, TX.c.bigs[1], { lt: l2, x: 150, y: 196, w: 1000, max: 170, align: 'left', width: 125, weight: 900, punch: 0.25 });
      lockBracket(c, 150, 196, measure(TX.c.bigs[1], F.archivo(125, 900), s), s, l2, '');
    }
    // the code panel
    const x0 = 150, y0 = 352, rowH = 50, size = 28;
    const fam = F.mono(400), adv = measure('0', fam, size);
    c.save();
    c.fillStyle = rgba('ink', 0.85); c.fillRect(x0 - 20, y0 - 44, 900, rowH * CODE.length + 40);
    c.fillStyle = rgba('bone', 0.35); c.fillRect(x0 - 20, y0 - 44, 900, 1); c.fillRect(x0 - 20, y0 - 4 + rowH * CODE.length, 900, 1);
    c.font = font(F.mono(500), 13); c.letterSpacing = '3px'; c.fillStyle = rgba('bone', 0.6);
    c.fillText('giá_trị.ts', x0, y0 - 18); c.letterSpacing = '0px';
    c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 0.75); c.textAlign = 'right';
    c.fillText(k >= K_LOCK[2]! ? 'đã khoá · 3 hằng số' : 'biên dịch…', x0 + 860, y0 - 18); c.textAlign = 'left';
    CODE.forEach((ln, i) => {
      if (k < ln.k) return;
      const y = y0 + 24 + i * rowH;
      const full = `${ln.kw.padEnd(6)}${ln.name.padEnd(11)} = ${ln.val}`;
      const n = Math.floor((k - ln.k) * BEAT * 70);
      const chars = Array.from(full);
      c.font = font(fam, size);
      c.fillStyle = rgba('graphite', 1);
      c.fillText(String(i + 1).padStart(2, ' '), x0, y);
      const tx = x0 + 3 * adv;
      if (ln.kw === 'let') {
        const e = clamp((k - K_DISSOLVE - i * 0.3) / 3.2);
        chars.slice(0, n).forEach((ch, ci) => {
          const he = hash(i, ci, 5);
          const le = clamp((e - he * 0.5) / 0.5);
          if (le >= 1) return;
          c.fillStyle = rgba(ci < 3 ? 'ash' : 'bone', (ci < 3 ? 0.8 : 0.85) * (1 - le));
          c.fillText(ch, tx + ci * adv + (hash(i, ci, 6) - 0.5) * 40 * le * le, y + 60 * le * le * (0.3 + he));
        });
        if (e > 0 && e < 1) { c.fillStyle = rgba('ash', 0.7 * (1 - e)); c.fillRect(tx - 4, y - 9, chars.length * adv * Math.min(1, e * 3), 1.5); }
      } else {
        const li = i - 2;
        const lk = (k - K_LOCK[li]!) * BEAT;
        c.fillStyle = rgba('bone', 0.95);
        c.fillText(chars.slice(0, n).join(''), tx, y);
        if (lk >= 0) {
          c.fillStyle = rgba('signal');
          c.fillText('const', tx, y);
          const nameW = Array.from(ln.name).length * adv;
          c.fillRect(tx + 6 * adv, y + 10, nameW * ease.outExpo(clamp(lk / 0.25)), 2.5);
          // lock tick at the end of the row
          const lx = x0 + 820;
          c.strokeStyle = rgba('signal'); c.lineWidth = 2;
          const sp = 1 + 0.5 * Math.exp(-lk * 18);
          c.save(); c.translate(lx, y - 10); c.scale(sp, sp);
          c.strokeRect(-9, -4, 18, 14);
          c.beginPath(); c.arc(0, -4, 6, Math.PI, 0); c.stroke();
          c.restore();
          if (lk < 0.15) { c.fillStyle = rgba('signal', 0.25 * (1 - lk / 0.15)); c.fillRect(x0 - 20, y - rowH * 0.62, 900, rowH); }
        }
      }
    });
    c.restore();
    // line (c)
    scrim(c, 150, 900, 1280, 54);
    typeLine(c, TX.c.line, lt - 0.15, { x: 150, y: 900, size: 50, cps: 42, caret: t < T_FREEZE, highlight: 'còn mãi' });
    // a small annotation pair at the right, in the tunnel's frame
    c.font = font(F.mono(400), 13); c.fillStyle = rgba('ash', 0.7);
    c.textAlign = 'right';
    c.fillText(`v = ${(speed * 299.8).toFixed(1)} · vòng ${String(Math.max(0, i0)).padStart(3, '0')}`, W - 150, 980);
    c.fillText(t >= T_FREEZE ? 'thời gian: dừng' : 'thời gian: trôi', W - 150, 1000 - 4);
    c.textAlign = 'left';
    return { x: pv.x, y: pv.y };
  }
}

/** Orange corner brackets that snap around a locked word, with a small mono tag. */
function lockBracket(c: CanvasRenderingContext2D, x: number, yc: number, w: number, size: number, lt: number, tag: string) {
  if (lt < 0) return;
  const k = ease.outExpo(clamp(lt / 0.22));
  const pad = lerp(40, 14, k);
  const top = yc - size * 0.62 - pad, bot = yc + size * 0.42 + pad * 0.6, l = x - pad, r = x + w + pad;
  c.save();
  c.globalAlpha = clamp(lt * 12);
  c.strokeStyle = rgba('signal'); c.lineWidth = 2.5;
  const a = 22;
  c.beginPath();
  c.moveTo(l, top + a); c.lineTo(l, top); c.lineTo(l + a, top);
  c.moveTo(r - a, top); c.lineTo(r, top); c.lineTo(r, top + a);
  c.moveTo(l, bot - a); c.lineTo(l, bot); c.lineTo(l + a, bot);
  c.moveTo(r - a, bot); c.lineTo(r, bot); c.lineTo(r, bot - a);
  c.stroke();
  if (tag) {
    c.font = font(F.mono(500), 13); c.letterSpacing = '2px'; c.fillStyle = rgba('signal', 0.95);
    c.fillText(tag, r + 18, top + 16);
  }
  c.restore();
}

/** Soft horizontal ink scrim behind a line of text (baseline y, cap height ~h), fading at both ends. */
function scrim(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const g = c.createLinearGradient(x - 40, 0, x + w + 60, 0);
  g.addColorStop(0, rgba('ink', 0)); g.addColorStop(0.12, rgba('ink', 0.7)); g.addColorStop(0.8, rgba('ink', 0.7)); g.addColorStop(1, rgba('ink', 0));
  c.save(); c.fillStyle = g; c.fillRect(x - 40, y - h - 14, w + 100, h + 34); c.restore();
}
