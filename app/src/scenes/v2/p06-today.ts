// p06-today (S(35) → S(42)): "Và hôm nay..." → đốm cam nổ thành sao → quỹ đạo khép 360° và khoá →
// phóng thành đường bay 3D, máy quay đuổi theo → trang tiêu đề chương (khắc, lật vào).
// Hàm thuần của t. Xem docs/04-STORYBOARD-TRAILER-v2.md và cues.ts.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, clearRT, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, font, fitSize } from '../../engine/type';
import { clamp, ease, lerp, mulberry32, pulse, smoothstep, springStep, TAU } from '../../engine/util';
import { BASE_POST, INK, Spark, big, label, rgba, serifLine, typeLine, hitPost, LIN } from './kit';
import { B, S, TEXT } from './cues';
import { Cam, arc2, arc3, scrim, BONE, GRAPH, HOT, EMB, type RGB, type V3 } from './p06-lib';

const T35 = S(35), T36 = S(36), T37 = S(37), T38 = S(38);
const LOCK = B(117), LAUNCH = B(118), CHAP = B(122), LINE2 = B(123); // kết thúc S(42)
const CX = 960, CY = 430; // tâm ngôi sao (px)

// ---------------------------------------------------------------- nền: lưới cực, quầng, dải sóng xung kích
const BG = /* glsl */ `
uniform vec2 c; uniform float polarA, rot, glowA, ringR, ringA, ring2R, ring2A;
float gau(float x) { return exp(-x * x); }
float band(float r, float R, float w) { return gau((r - R) / w); }
void main() {
  vec2 px = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  vec2 d = px - c; float r = length(d); float a = atan(d.y, d.x) + rot;
  vec3 col = C_INK;
  if (polarA > 0.0) {
    float dr = abs(fract(r / 120.0 + 0.5) - 0.5) * 120.0;
    float sp = TAU / 72.0; float da = abs(fract(a / sp + 0.5) - 0.5) * sp * r;
    float fade = smoothstep(90.0, 260.0, r) * (1.0 - smoothstep(700.0, 1250.0, r));
    float g = pxLine(dr, 0.25, 1.0) * 0.55 + pxLine(da, 0.2, 0.9) * 0.3 * smoothstep(300.0, 520.0, r);
    col += C_GRAPHITE * g * fade * polarA * 0.35;
  }
  col += C_SIGNAL * glowA * (0.012 * exp(-r / 420.0) + 0.1 * exp(-r / 100.0));
  float s1 = band(r, ringR, 12.0 + ringR * 0.025) * ringA * (r < ringR ? 1.0 : 0.2);
  float s2 = band(r, ring2R, 10.0 + ring2R * 0.02) * ring2A * (r < ring2R ? 1.0 : 0.2);
  col += (C_SIGNAL * 0.3 + C_BONE * 0.03) * (s1 + s2);
  fragColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------- trang tiêu đề lật vào (bản lề ở mép trái)
const PAGE = /* glsl */ `
uniform sampler2D tex; uniform float phi, D, A;
void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 O = vec3(0.0, 0.0, D);
  vec3 rd = normalize(vec3(ndc.x * A / D, ndc.y / D, -1.0));
  vec3 Sp = vec3(-A, 0.0, 0.0);
  vec3 N = vec3(sin(phi), 0.0, cos(phi));
  float den = dot(rd, N);
  if (abs(den) < 1e-4) discard;
  float tt = dot(Sp - O, N) / den;
  if (tt <= 0.0) discard;
  vec3 h = O + rd * tt - Sp;
  vec2 q = vec2(h.x * cos(phi) - h.z * sin(phi), h.y);
  vec2 uv = vec2(q.x / (2.0 * A), q.y * 0.5 + 0.5);
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
  vec4 c = texture(tex, uv);
  float shade = 0.55 + 0.45 * cos(phi);
  fragColor = vec4(c.rgb * c.a * shade, c.a);
}`;

export default class Plate extends Scene {
  text = new Layer2D();
  page = new Layer2D();
  spark = new Spark();
  lb = new LineBatch(24000);
  lb3 = new LineBatch(16000, { screen2D: false });
  cam = new Cam();
  bg = new FSPass(BG, {
    c: { value: new THREE.Vector2(CX, CY) }, polarA: { value: 0 }, rot: { value: 0 }, glowA: { value: 0 },
    ringR: { value: 0 }, ringA: { value: 0 }, ring2R: { value: 0 }, ring2A: { value: 0 },
  });
  pagePass = new FSPass(PAGE, { tex: { value: null }, phi: { value: 0 }, D: { value: 2.4 }, A: { value: W / H } }, { blending: THREE.CustomBlending, transparent: true });

  // tia nổ và tia lửa (tham số cố định, sinh một lần theo seed)
  rays: { a: number; sp: number; len: number; hot: boolean; w: number }[] = [];
  sparks: { a: number; v: number; life: number; g: number }[] = [];
  implo: { a: number; h: number; len: number }[] = [];
  // đường bay (tích phân một lần): điểm cách nhau DS
  path: V3[] = [];
  static DS = 0.05;

  constructor(ctx: any) {
    super(ctx);
    const m = this.pagePass.mat;
    m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    const rnd = mulberry32(3607);
    for (let i = 0; i < 900; i++) {
      const hot = rnd() < 0.16;
      this.rays.push({ a: rnd() * TAU, sp: 0.15 + rnd() ** 2.2 * 1.3, len: 40 + rnd() * 320, hot, w: hot ? 1.6 : 0.9 });
    }
    for (let i = 0; i < 320; i++) this.sparks.push({ a: rnd() * TAU, v: 500 + rnd() ** 1.5 * 2200, life: 0.5 + rnd() * 1.2, g: 200 + rnd() * 500 });
    for (let i = 0; i < 260; i++) this.implo.push({ a: rnd() * TAU, h: rnd(), len: 30 + rnd() * 160 });
    // đường bay: rời quỹ đạo theo tiếp tuyến (-x), lượn vào chiều sâu (-z) và lên cao
    let x = 0, y = 0, z = 1;
    for (let i = 0; i < 1400; i++) {
      const s = i * Plate.DS;
      this.path.push([x, y, z]);
      const hd = (Math.PI / 2) * 0.82 * smoothstep(0.3, 7, s);
      x += -Math.cos(hd) * Plate.DS; z += -Math.sin(hd) * Plate.DS; y += (0.02 + 0.09 * smoothstep(1, 8, s)) * Plate.DS;
    }
  }

  /** điểm trên đường bay ở quãng s (ngoại suy tuyến tính khi s < 0) */
  P(s: number): V3 {
    const p = this.path, ds = Plate.DS;
    if (s <= 0) return [p[0]![0] + s * (p[1]![0] - p[0]![0]) / ds, p[0]![1] + s * (p[1]![1] - p[0]![1]) / ds, p[0]![2] + s * (p[1]![2] - p[0]![2]) / ds];
    const f = s / ds, i = Math.min(Math.floor(f), p.length - 2), u = f - i;
    const a = p[i]!, b = p[i + 1]!;
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  }
  /** quãng đường của đốm cam sau khi phóng */
  sAt(t: number) { const x = Math.max(0, t - LAUNCH); return 2.4 * x + 22 * x * x; }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.text.ctx, t = f.t;
    clearRT(r, out, INK);
    this.text.clear();
    this.lb.clear(); this.lb3.clear();
    const u = this.bg.u;
    u.polarA!.value = 0; u.glowA!.value = 0; u.ringA!.value = 0; u.ring2A!.value = 0;
    let post: PostOverrides = { ...BASE_POST, ca: 0.5 };
    let sparkAt: { x: number; y: number; amt: number; size: number } | null = null;
    let use3D = false;

    if (t < T36) {
      // ------------------------------------------------ A: khoảng thở, năng lượng tụ về đốm cam
      const k = clamp((t - T35) / (T36 - T35));
      const col = BONE(0.55);
      for (const L of this.implo) {
        const s = (L.h + k * 1.7) % 1;
        const head = lerp(980, 14, ease.inCubic(s)) * (1 - 0.9 * smoothstep(0.82, 1, k));
        const tail = head + L.len * (1 - s) * (0.4 + k);
        const a = Math.sin(Math.PI * s) * 0.5 * smoothstep(0, 0.25, k);
        const hot = s > 0.8;
        const cc: RGB = hot ? EMB(1.6) : col;
        this.lb.seg2(CX + Math.cos(L.a) * head, CY + Math.sin(L.a) * head, CX + Math.cos(L.a) * tail, CY + Math.sin(L.a) * tail, hot ? 1.1 : 0.7, cc, a);
      }
      // vòng mảnh co lại
      for (let i = 0; i < 3; i++) {
        const R = (380 + i * 210) * (1 - ease.inQuad(k)) + 30;
        arc2(this.lb, CX, CY, R, 0, TAU, 0.8, GRAPH(1), 0.5 * smoothstep(0, 0.3, k));
      }
      // chữ thập ngắm + nhãn
      const ch = 26, gap = 12;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
        this.lb.seg2(CX + dx * gap, CY + dy * gap, CX + dx * (gap + ch), CY + dy * (gap + ch), 1, BONE(0.7), 0.6);
      label(c, 'một người', CX + 46, CY - 34, { size: 16, alpha: 0.75 * smoothstep(0.1, 0.4, k) });
      scrim(c, 620, 820, 680, 110, 0.6);
      serifLine(c, TEXT.p06.a.line, t - T35 + 0.05, T36 - T35 + 0.25, { y: H * 0.8, size: 66 });
      const tremble = 1 + 0.15 * Math.sin(t * 60) * k;
      u.glowA!.value = 0.25 + 0.6 * k * k;
      sparkAt = { x: CX, y: CY, amt: 0.55 + 0.6 * k * k, size: (0.016 + 0.014 * k * k) * tremble };
      post.zoom = 1 + 0.03 * ease.inQuad(k);
    } else if (t < T38) {
      // ------------------------------------------------ B: nổ thành sao
      const age = t - T36, grow = ease.outExpo(clamp(age / 1.3));
      const fade = 1 - 0.8 * smoothstep(0.2, 1.4, age);
      for (const R of this.rays) {
        const r1 = 20 + grow * R.sp * 1500;
        const tail = Math.max(10, r1 - R.len * (0.3 + grow));
        const col: RGB = R.hot ? EMB(2.6) : BONE(0.75);
        this.lb.seg2(CX + Math.cos(R.a) * tail, CY + Math.sin(R.a) * tail, CX + Math.cos(R.a) * r1, CY + Math.sin(R.a) * r1, R.w, col, fade * (1 - grow * 0.35));
      }
      // tia lửa: bay ra, cản không khí, rơi nhẹ
      for (const P of this.sparks) {
        if (age > P.life) continue;
        const kd = 3.2, e = Math.exp(-kd * age), rr = (P.v * (1 - e)) / kd, v = P.v * e;
        const x = CX + Math.cos(P.a) * rr, y = CY + Math.sin(P.a) * rr + P.g * age * age;
        const st = Math.max(4, v * 0.035), al = 1 - age / P.life;
        this.lb.seg2(x, y, x - Math.cos(P.a) * st, y - Math.sin(P.a) * st - P.g * age * 0.03, 1.4, EMB(3.2), al);
      }
      // sóng xung kích (2 cú: S36 lớn, S37 nhỏ)
      for (const [h, big0, amp] of [[T36, 1500, 1], [T37, 900, 0.6]] as const) {
        const a = t - h;
        if (a < 0 || a > 1.3) continue;
        const R = ease.outCubic(a / 1.3) * big0, al = (1 - a / 1.3) * amp;
        arc2(this.lb, CX, CY, R, 0, TAU, 1 + 2.5 * al, HOT(2.2), al);
        arc2(this.lb, CX, CY, R * 0.93, 0, TAU, 0.7, BONE(0.8), al * 0.6);
        arc2(this.lb, CX, CY, R * 0.84, 0, TAU, 0.6, BONE(0.8), al * 0.3);
        if (h === T36) { u.ringR!.value = R; u.ringA!.value = al; } else { u.ring2R!.value = R; u.ring2A!.value = al; }
      }
      // ngôi sao: gai nhiễu xạ + mặt số khắc quanh
      const pul = pulse(t, T36, 0.25) + 0.6 * pulse(t, T37, 0.2);
      const spike = ease.outExpo(clamp(age / 0.5)) * (300 + 140 * pul);
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 + Math.PI / 8 * 0, L = i % 2 === 0 ? spike : spike * 0.45;
        const n = 14;
        for (let j = 0; j < n; j++) {
          const r0 = 16 + (L * j) / n, r1 = 16 + (L * (j + 1)) / n, q = 1 - j / n;
          this.lb.seg2(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * r1, CY + Math.sin(a) * r1, 0.6 + 2.2 * q, j < 6 ? EMB(1.2 + 2.5 * q) : BONE(0.8), q * q);
        }
      }
      const dial = ease.outQuart(clamp((age - 0.12) / 0.6));
      if (dial > 0) {
        const r0 = 236;
        arc2(this.lb, CX, CY, r0 + 26, -Math.PI / 2, -Math.PI / 2 + TAU * dial, 0.9, BONE(0.75), 0.7);
        arc2(this.lb, CX, CY, r0 - 30, -Math.PI / 2, -Math.PI / 2 - TAU * dial, 0.6, GRAPH(1), 0.8);
        const nt = 180;
        for (let i = 0; i < nt * dial; i++) {
          const a = -Math.PI / 2 + (i / nt) * TAU, L = i % 15 === 0 ? 18 : i % 5 === 0 ? 10 : 5;
          this.lb.seg2(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0, CX + Math.cos(a) * (r0 + L), CY + Math.sin(a) * (r0 + L), i % 15 === 0 ? 1.2 : 0.7, BONE(0.8), i % 15 === 0 ? 0.8 : 0.45);
        }
      }
      u.polarA!.value = smoothstep(0.1, 0.9, age); u.rot!.value = age * 0.04;
      u.glowA!.value = 1.6 * pulse(t, T36, 0.3) + 0.5 + 0.6 * pulse(t, T37, 0.2);
      sparkAt = { x: CX, y: CY, amt: 1.3 + 2.0 * pul, size: 0.04 + 0.05 * pul };
      // chữ
      scrim(c, 70, 660, 1500, 300, 0.7);
      typeLine(c, TEXT.p06.b.line, t - T36, { x: 124, y: 712, size: 35, cps: 72, highlight: 'người đặc biệt', caret: t < T38 - 0.15 });
      const bigs = TEXT.p06.b.bigs;
      if (t < T37) big(c, bigs[0], { lt: t - T36, x: 120, y: 850, w: 1400, max: 176, align: 'left', width: 112, punch: 0.14 });
      else big(c, bigs[1], { lt: t - T37, x: 120, y: 850, w: 1400, max: 176, align: 'left', width: 112, punch: 0.14 });
      label(c, '◆ một người đặc biệt', CX + 290, CY + 190, { size: 16, alpha: 0.8 * dial, color: rgba('ash') });
      post = hitPost(t, [T36, T37], [T36], post);
      post.bloom = 0.75;
    } else if (t < CHAP) {
      // ------------------------------------------------ C + D: quỹ đạo khép & khoá, rồi phóng thành đường bay 3D
      use3D = true;
      this.orbitAndFlight(t);
      const sp = this.headPx;
      if (sp) sparkAt = { x: sp.x, y: sp.y, amt: 1.6 + 1.5 * pulse(t, LOCK, 0.12) + 1.2 * pulse(t, LAUNCH, 0.15), size: 0.03 + 0.03 * pulse(t, LOCK, 0.1) };
      scrim(c, 70, LAUNCH <= t ? 680 : 770, 1500, LAUNCH <= t ? 280 : 190, 0.65);
      if (t < LAUNCH) {
        big(c, TEXT.p06.c.big, { lt: t - T38, x: 120, y: 870, w: 1200, max: 150, align: 'left', width: 112 });
      } else {
        big(c, TEXT.p06.c.big, { lt: 2, x: 120, y: 742, w: 600, max: 60, align: 'left', width: 112, alpha: 0.35, punch: 0 });
        big(c, TEXT.p06.d.big, { lt: t - LAUNCH, x: 120, y: 870, w: 1450, max: 150, align: 'left', width: 112, punch: 0.14 });
      }
      post = hitPost(t, [T38, LOCK, LAUNCH], [T38], post);
      post.bloom = 0.7;
    } else {
      // ------------------------------------------------ E: trang tiêu đề chương
      this.chapter(t);
      post = hitPost(t, [CHAP], [], post);
      post.bloom = 0.55; post.halation = 0.2; post.ca = 0;
    }

    this.bg.render(r, out);
    if (use3D) this.lb3.render(r, out, this.cam.cam);
    this.lb.render(r, out);
    if (t >= CHAP) {
      this.pagePass.u.tex!.value = this.page.upload();
      this.pagePass.render(r, out);
    }
    this.ctx.comp.draw(r, this.text.upload(), out);
    if (sparkAt) this.spark.draw(r, out, sparkAt.x, sparkAt.y, t, sparkAt.amt, sparkAt.size);
    if (t >= CHAP && this.pageSpark) this.spark.draw(r, out, this.pageSpark.x, this.pageSpark.y, t, this.pageSpark.amt, this.pageSpark.size);
    return post;
  }

  headPx: { x: number; y: number } | null = null;
  pageSpark: { x: number; y: number; amt: number; size: number } | null = null;

  /** C: quỹ đạo 360° rồi khoá; D: phóng theo tiếp tuyến, máy quay đuổi. */
  orbitAndFlight(t: number) {
    const lb = this.lb3, cam = this.cam, c = this.text.ctx;
    const U: V3 = [1, 0, 0], V: V3 = [0, 0, 1], O: V3 = [0, 0, 0];
    // máy quay quỹ đạo
    const yaw = 0.42 - 0.1 * (t - T38), Rc = 2.7;
    const oPos: V3 = [Math.sin(yaw) * Rc - 0.2, 1.05, Math.cos(yaw) * Rc];
    const oTgt: V3 = [-0.55, -0.22, 0.05];
    const x = t - LAUNCH, s = this.sAt(t);
    if (x <= 0) cam.set(oPos, oTgt, 38, 0.04);
    else {
      const k = ease.inOutCubic(clamp(x / 0.55));
      const bp = this.P(s - 1.5), ap = this.P(s + 3);
      const cPos: V3 = [bp[0] + 0.15, bp[1] + 0.75, bp[2] + 0.2];
      const pos: V3 = [lerp(oPos[0], cPos[0], k), lerp(oPos[1], cPos[1], k), lerp(oPos[2], cPos[2], k)];
      const tgt: V3 = [lerp(oTgt[0], ap[0], k), lerp(oTgt[1], ap[1] - 0.55, k), lerp(oTgt[2], ap[2], k)];
      cam.set(pos, tgt, lerp(38, 52, k), 0.04 - 0.12 * k * Math.sin(x * 2));
    }
    const camP = cam.cam.position;
    const distA = (p: V3) => Math.hypot(p[0] - camP.x, p[1] - camP.y, p[2] - camP.z);

    // lưới mặt đất
    const gy = -0.9;
    for (let gx = -24; gx <= 12; gx += 1) for (let gz = -64; gz < 6; gz += 1) {
      const d1 = distA([gx, gy, gz + 0.5]), a1 = 0.5 * Math.exp(-d1 / 9);
      if (a1 > 0.01) lb.seg(gx, gy, gz, gx, gy, gz + 1, 0.7, ...BONE(0.8), a1);
      const d2 = distA([gx + 0.5, gy, gz]), a2 = 0.5 * Math.exp(-d2 / 9);
      if (a2 > 0.01 && gx < 12) lb.seg(gx, gy, gz, gx + 1, gy, gz, 0.7, ...BONE(0.8), a2);
    }

    // trần lưới thưa khi bay (đường hầm), lấp nửa trên khung
    if (x > 0) {
      const cy0 = 2.6, ka = smoothstep(0, 0.5, x);
      for (let gx = -24; gx <= 12; gx += 2) for (let gz = -64; gz < 6; gz += 2) {
        const d1 = distA([gx, cy0, gz + 1]), a1 = 0.5 * ka * Math.exp(-d1 / 9);
        if (a1 > 0.01) lb.seg(gx, cy0, gz, gx, cy0, gz + 2, 0.6, ...GRAPH(1.6), a1);
        const d2 = distA([gx + 1, cy0, gz]), a2 = 0.5 * ka * Math.exp(-d2 / 9);
        if (a2 > 0.01 && gx < 12) lb.seg(gx, cy0, gz, gx + 2, cy0, gz, 0.6, ...GRAPH(1.6), a2);
      }
    }
    // quỹ đạo: vành khắc
    const th0 = Math.PI / 2 - TAU;
    const sweep = ease.inOutCubic(clamp((t - T38) / (LOCK - T38)));
    const th = th0 + TAU * sweep;
    const locked = t >= LOCK;
    const flash = pulse(t, LOCK, 0.09);
    const ringA = x > 0 ? 1 - 0.5 * smoothstep(0, 1, x) : 1;
    const tickCol: RGB = [LIN.bone[0] * 0.8 + LIN.ember[0] * 3 * flash, LIN.bone[1] * 0.8 + LIN.ember[1] * 3 * flash, LIN.bone[2] * 0.8 + LIN.ember[2] * 3 * flash];
    arc3(lb, O, U, V, 1, 0, TAU, 220, 1.1, BONE(0.85), 0.75 * ringA);
    arc3(lb, O, U, V, 0.93, 0, TAU, 200, 0.6, GRAPH(1.2), 0.8 * ringA);
    arc3(lb, O, U, V, 1.12, 0, TAU, 220, 0.6, GRAPH(1.2), 0.8 * ringA);
    arc3(lb, O, U, V, 0.22, 0, TAU, 80, 0.6, GRAPH(1.2), 0.8 * ringA);
    // vòng kinh tuyến nghiêng (astrolabe), mờ
    const sw = ease.outCubic(clamp((t - T38) / 0.8));
    arc3(lb, O, [0.94, 0.34, 0], [0, 0, 1], 1.06, -Math.PI / 2, -Math.PI / 2 + TAU * sw, 220, 0.6, GRAPH(1.4), 0.7 * ringA);
    arc3(lb, O, [1, 0, 0], [0, 1, 0], 1.06, Math.PI, Math.PI + TAU * sw, 220, 0.5, GRAPH(1.2), 0.5 * ringA);
    lb.seg(0, -1.25, 0, 0, 1.25 * sw, 0, 0.5, ...GRAPH(1.3), 0.6 * ringA);
    for (let i = 0; i < 360; i += 2) {
      const a = (i / 360) * TAU, L = i % 30 === 0 ? 0.09 : i % 10 === 0 ? 0.05 : 0.025;
      const ca = Math.cos(a), sa = Math.sin(a);
      lb.seg(ca, 0, sa, ca * (1 + L), 0, sa * (1 + L), i % 30 === 0 ? 1.2 : 0.6, ...tickCol, (i % 30 === 0 ? 0.9 : 0.5) * ringA);
    }
    // vành răng ngoài: nhảy một nấc khi khoá
    const notch = TAU / 48, rotB = locked ? notch * springStep(t - LOCK, 7, 0.35) : 0;
    for (let i = 0; i < 48; i++) {
      const a0 = i * notch + rotB, a1 = a0 + notch * 0.55;
      arc3(lb, O, U, V, 1.2, a0, a1, 400, 1.6, i === 0 ? HOT(2) : BONE(0.7), 0.7 * ringA);
    }
    // đường kính chữ thập
    lb.seg(-1.3, 0, 0, 1.3, 0, 0, 0.5, ...GRAPH(1.2), 0.6 * ringA);
    lb.seg(0, 0, -1.3, 0, 0, 1.3, 0.5, ...GRAPH(1.2), 0.6 * ringA);
    // vệt cam đã đi
    arc3(lb, O, U, V, 1, th0, th, 260, 2.6, HOT(2.4), 1);
    arc3(lb, O, U, V, 1, th0, th, 260, 7, HOT(0.5), 0.35);
    // khoá: vạch bấm toả ra ở điểm khoá
    if (locked) {
      const a = t - LOCK;
      if (a < 0.35) for (let i = 0; i < 14; i++) {
        const dir = (i / 14) * TAU, r0 = 0.05 + a * 0.6, r1 = r0 + 0.08 * (1 - a / 0.35);
        lb.seg(Math.cos(dir) * r0, Math.sin(dir) * r0 * 0.5, 1 + Math.sin(dir) * r0, Math.cos(dir) * r1, Math.sin(dir) * r1 * 0.5, 1 + Math.sin(dir) * r1, 1.4, ...EMB(3), 1 - a / 0.35);
      }
      const lk = this.cam.project(0, 0, 1.2);
      if (lk.ok && x <= 0.4) label(c, 'KHOÁ ▸', lk.x + 26, lk.y + 40, { size: 16, color: rgba('signal'), alpha: 1 - smoothstep(0.2, 0.4, x) });
    }
    // nhãn quỹ đạo
    const lp = this.cam.project(-1.12, 0, -0.2);
    if (lp.ok) label(c, 'quỹ đạo', lp.x - 90, lp.y - 14, { size: 15, alpha: 0.7 * ringA });

    // D: đường bay
    let head: V3 = [Math.cos(th), 0, Math.sin(th)];
    if (x > 0) {
      head = this.P(s);
      // vệt cam đã bay (dày dần theo tốc độ)
      const step = 0.1;
      for (let q = Math.max(0, s - 30); q < s; q += step) {
        const a = this.P(q), b = this.P(Math.min(s, q + step)), k = 1 - (s - q) / 30;
        lb.seg(a[0], a[1], a[2], b[0], b[1], b[2], 0.6 + 2.6 * k, ...HOT(1.2 + 1.8 * k), 0.4 + 0.6 * k);
      }
      // lộ trình phía trước: nét đứt mảnh
      for (let q = s + 0.3; q < s + 26; q += 0.5) {
        const a = this.P(q), b = this.P(q + 0.25);
        lb.seg(a[0], a[1], a[2], b[0], b[1], b[2], 0.8, ...BONE(0.8), 0.5 * Math.exp(-(q - s) / 14));
      }
      // cổng mốc vuông góc đường bay, mỗi 3.5 đơn vị
      for (let g = 1; g < 30; g++) {
        const sg = g * 1.8;
        if (sg < s - 4 || sg > s + 30) continue;
        const p = this.P(sg), p2 = this.P(sg + 0.05);
        let fx = p2[0] - p[0], fz = p2[2] - p[2]; const fl = Math.hypot(fx, fz); fx /= fl; fz /= fl;
        const rx = -fz, rz = fx, hw = 0.7, hh = 0.48, br = 0.18;
        const passed = s >= sg;
        const fl2 = passed ? Math.exp(-(s - sg) * 0.6) : 0;
        const col: RGB = passed ? [LIN.bone[0] * 0.6 + LIN.ember[0] * 3 * fl2, LIN.bone[1] * 0.6 + LIN.ember[1] * 3 * fl2, LIN.bone[2] * 0.6 + LIN.ember[2] * 3 * fl2] : BONE(0.8);
        const al = Math.exp(-Math.abs(sg - s) / 16) * (passed ? 0.6 : 0.9);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          const cxw = p[0] + rx * hw * sx, cyw = p[1] + hh * sy, czw = p[2] + rz * hw * sx;
          lb.seg(cxw, cyw, czw, cxw - rx * br * sx, cyw, czw - rz * br * sx, 1.1, ...col, al);
          lb.seg(cxw, cyw, czw, cxw, cyw - br * sy, czw, 1.1, ...col, al);
        }
        // vạch đánh dấu dưới cổng
        lb.seg(p[0] - rx * 0.12, gy, p[2] - rz * 0.12, p[0] + rx * 0.12, gy, p[2] + rz * 0.12, 1, ...BONE(0.8), al * 0.8);
        lb.seg(p[0], gy, p[2], p[0], p[1] - hh, p[2], 0.5, ...GRAPH(1.3), al * 0.6);
      }
      // nhãn hướng bay
      const ap = this.cam.project(...this.P(s + 6));
      if (ap.ok) { scrim(c, ap.x + 6, ap.y - 34, 200, 34, 0.75); label(c, 'hướng: phía trước', ap.x + 18, ap.y - 12, { size: 15, alpha: 0.85 }); }
    }
    const hp = this.cam.project(head[0], head[1], head[2]);
    this.headPx = hp.ok ? { x: hp.x, y: hp.y } : null;
  }

  /** E: trang tiêu đề kiểu sách cổ, lật vào từ phải, bản lề trái. */
  chapter(t: number) {
    const a = t - CHAP;
    const turn = ease.outExpo(clamp(a / 0.55));
    const phi = lerp(-1.25, 0, turn) + 0.012 * Math.sin(a * 3) * (1 - turn);
    const D = lerp(2.4, 2.24, ease.outCubic(clamp(a / 1.4)));
    this.pagePass.u.phi!.value = phi; this.pagePass.u.D!.value = D;
    const L = this.page, c = L.ctx;
    L.clear();
    const bone = (al: number) => rgba('bone', al);
    // khung kép
    c.strokeStyle = bone(0.85); c.lineWidth = 1.6; c.strokeRect(132, 108, W - 264, H - 216);
    c.strokeStyle = bone(0.55); c.lineWidth = 0.8; c.strokeRect(146, 122, W - 292, H - 244);
    // dải hoa văn sóng giữa khung trên/dưới (khắc)
    c.lineWidth = 0.7;
    for (const yb of [176, H - 176]) for (let k = 0; k < 2; k++) {
      c.beginPath();
      for (let xx = 220; xx <= W - 220; xx += 4) { const yy = yb + Math.sin(xx * 0.045 + k * Math.PI) * 7; xx === 220 ? c.moveTo(xx, yy) : c.lineTo(xx, yy); }
      c.strokeStyle = bone(0.35); c.stroke();
    }
    // dấu ghi khớp (registration) ở góc
    for (const [rx, ry] of [[132, 108], [W - 132, 108], [132, H - 108], [W - 132, H - 108]] as const) {
      c.beginPath(); c.arc(rx, ry, 9, 0, TAU); c.strokeStyle = bone(0.7); c.lineWidth = 0.8; c.stroke();
      c.beginPath(); c.moveTo(rx - 18, ry); c.lineTo(rx + 18, ry); c.moveTo(rx, ry - 18); c.lineTo(rx, ry + 18); c.stroke();
    }
    // vật trang trí trên: hai nét mảnh + hình thoi, đốm cam ở giữa (vẽ bằng GL)
    const oy = 318, gr = ease.outCubic(clamp((a - 0.15) / 0.5));
    c.strokeStyle = bone(0.8); c.lineWidth = 1;
    c.beginPath(); c.moveTo(W / 2 - 40, oy); c.lineTo(W / 2 - 40 - 220 * gr, oy); c.moveTo(W / 2 + 40, oy); c.lineTo(W / 2 + 40 + 220 * gr, oy); c.stroke();
    for (const sx of [-1, 1]) { const dx = W / 2 + sx * (40 + 220 * gr + 10); c.beginPath(); c.moveTo(dx - 6, oy); c.lineTo(dx, oy - 6); c.lineTo(dx + 6, oy); c.lineTo(dx, oy + 6); c.closePath(); c.stroke(); }
    // tiêu đề chương
    const s = TEXT.p06.e.big, fam = F.serif(600, false);
    const size = fitSize(s, fam, 1400, 200, 16);
    c.save();
    c.font = font(fam, size); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.letterSpacing = `${lerp(40, 16, ease.outCubic(clamp(a / 1.2)))}px`;
    c.fillStyle = rgba('bone', 1); c.fillText(s, W / 2 + 8, 586);
    c.restore();
    // gạch giữa
    const rw = 300 * ease.outCubic(clamp((a - 0.2) / 0.5));
    c.strokeStyle = bone(0.8); c.lineWidth = 1;
    c.beginPath(); c.moveTo(W / 2 - rw, 660); c.lineTo(W / 2 - 14, 660); c.moveTo(W / 2 + 14, 660); c.lineTo(W / 2 + rw, 660); c.stroke();
    c.beginPath(); c.moveTo(W / 2 - 7, 660); c.lineTo(W / 2, 653); c.lineTo(W / 2 + 7, 660); c.lineTo(W / 2, 667); c.closePath(); c.fillStyle = rgba('signal', 1); c.fill();
    // "của cuộc đời."
    const la = smoothstep(0, 0.35, t - LINE2);
    if (la > 0) {
      c.save();
      c.font = font(F.serif(600, true), 86); c.textAlign = 'center'; c.globalAlpha = la;
      c.letterSpacing = `${lerp(10, 3, ease.outCubic(clamp((t - LINE2) / 0.9)))}px`;
      c.fillStyle = rgba('bone', 1); c.fillText(TEXT.p06.e.line!, W / 2, 776);
      c.restore();
    }
    // ghi chú nhỏ ở lề (mono)
    label(c, 'CHƯƠNG MỚI', 182, H - 140, { size: 14, alpha: 0.6 });
    label(c, 'của cuộc đời', W - 182, H - 140, { size: 14, alpha: 0.6, align: 'right' });
    // đốm cam: chiếu điểm (W/2, oy) của trang qua phép lật
    const A = W / H, X = (W / 2 / W) * 2 * A, Y = 1 - (oy / H) * 2; // toạ độ cục bộ từ bản lề
    const hx = X * Math.cos(phi), hz = -X * Math.sin(phi);
    const wx = -A + hx, wz = hz, sx = (wx * D) / (D - wz), sy = (Y * D) / (D - wz);
    this.pageSpark = { x: (sx / A * 0.5 + 0.5) * W, y: (0.5 - sy * 0.5) * H, amt: 1.2 * turn + 1.2 * pulse(t, CHAP + 0.45, 0.2), size: 0.022 };
  }
}
