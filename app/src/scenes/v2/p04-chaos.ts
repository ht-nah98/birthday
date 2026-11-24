// p04-chaos: DROP. "Dẫu cuộc sống có bao bộn bề, / vẫn luôn là người mà gia đình có thể tin tưởng, / các con cháu có thể tự hào."
// Trường dòng chảy 3D (curl noise, tích phân trên GPU) gồm hàng nghìn sợi nét trắng ngà; xuyên qua là MỘT đường cam thẳng tắp
// do đốm cam vẽ. S(18) nổ tung + cắt cảnh theo phách; S(22) các sợi được chải thẳng song song đường cam (lan từ đường cam ra);
// S(24) cả bó nét bẻ lên trời thành cột sáng. Cắt cứng ở S(26).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H, clearRT, makeRT, rtScale } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, font, fitSize } from '../../engine/type';
import { clamp, ease, lerp, pulse, smoothstep, springStep, frameIdx } from '../../engine/util';
import { S, P, TEXT } from './cues';
import { A, BASE_POST, INK, LIN, Spark, hitPost, label, rgba, typeLine } from './kit';

const T0 = S(18);
const K = 64; // điểm mỗi sợi
const N = 3000; // số sợi
const LX = 70; // hộp gieo hạt theo trục x (cuộn theo máy quay)

type V3 = [number, number, number];

/** Tích phân dòng: texel (k, i) = điểm thứ k của sợi i. */
const INTEGRATE = /* glsl */ `
uniform float t, camX, chaos, R, rise, burst, ds, colX;
uniform vec3 origin; uniform int stage; uniform sampler2D keyT;
vec3 vel(vec3 p) {
  vec2 c = curl2(p.xy * 0.085 + vec2(0.0, p.z * 0.03), t * 0.35 + p.z * 0.05);
  float cz = snoise(vec3(p * 0.07 + 5.0 + t * 0.25));
  vec3 turb = vec3(c, cz * 1.6);
  float ord = smoothstep(R + 5.0, R, length(p.yz));
  vec3 d = normalize(mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), rise));
  vec3 v = d * 1.1 + turb * chaos * (1.0 - ord) * (1.0 - rise);
  return normalize(v);
}
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  float i = float(ij.y);
  float st = ds * mix(1.0, 1.8, rise);
  if (stage == 1) {
    // từ điểm mốc gần nhất (mỗi 8 bước) đi tiếp: tránh tích phân lại từ đầu sợi
    int k = ij.x, j = k / 8;
    vec4 q = texelFetch(keyT, ivec2(j, ij.y), 0);
    vec3 p = q.xyz;
    for (int s = 0; s < 8; s++) { if (s >= k - j * 8) break; p += vel(p) * st; }
    fragColor = vec4(p, q.w);
    return;
  }
  int k = ij.x * 8;
  vec3 h = hash33(vec3(i * 0.731, 1.7, 9.1)), h2 = hash33(vec3(i * 1.37, 4.2, 2.3));
  float e = fract(h.x - camX / ${LX.toFixed(1)});
  float fade = smoothstep(0.0, 0.18, e) * smoothstep(1.0, 0.7, e);
  vec3 p = vec3(camX + (e - 0.5) * ${LX.toFixed(1)}, (h.y - 0.5) * 22.0, (h.z - 0.5) * 22.0);
  // bó dày hơn quanh đường cam
  if (h2.x < 0.35) p.yz *= 0.3;
  // cột: gom về quanh đầu đốm cam, kéo dài từ dưới lên
  vec3 col = vec3(colX + (h.x - 0.5) * mix(16.0, 4.0, h2.y), -40.0 + h.y * 34.0, (h.z - 0.5) * mix(16.0, 4.0, h2.y));
  p = mix(p, col, rise);
  fade = mix(fade, 1.0, rise);
  p = mix(p, origin + (p - origin) * 0.02, burst);
  for (int s = 0; s < ${K}; s++) { if (s >= k) break; p += vel(p) * st; }
  fragColor = vec4(p, fade * (0.45 + 0.55 * h2.z));
}`;

const LINE_VERT = /* glsl */ `
precision highp float;
in vec3 position; in float iId;
uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
uniform sampler2D P; uniform vec2 res; uniform float pxScale, t, gain, comet, cspeed, wid;
uniform vec3 camPos;
out vec2 vLocal; out float vLen; out float vHalfW; out vec4 vColor;
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main() {
  int id = int(iId + 0.5); int k = id % ${K - 1}; int i = id / ${K - 1};
  vec4 A = texelFetch(P, ivec2(k, i), 0), B = texelFetch(P, ivec2(k + 1, i), 0);
  vec4 ca = projectionMatrix * modelViewMatrix * vec4(A.xyz, 1.0), cb = projectionMatrix * modelViewMatrix * vec4(B.xyz, 1.0);
  if (ca.w <= 0.05 || cb.w <= 0.05) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  vec2 sa = ca.xy / ca.w * 0.5 * res * pxScale, sb = cb.xy / cb.w * 0.5 * res * pxScale;
  float hi = hash11(float(i) * 1.37 + 0.3), hj = hash11(float(i) * 3.11 + 7.0);
  float w = wid * (0.7 + 0.9 * hj * hj) * pxScale;
  float hw = max(w * 0.5, 0.35) + 1.0;
  vec2 d = sb - sa; float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = mix(-hw, len + hw, position.x);
  vec2 p = sa + dir * along + nrm * position.y * hw;
  gl_Position = vec4(p / (0.5 * res * pxScale), 0.0, 1.0);
  vLocal = vec2(along, position.y * hw); vLen = len; vHalfW = max(w * 0.5, 0.35);
  // sao chổi chạy dọc sợi
  float head = fract(t * cspeed * (0.5 + hi) + hi * 7.0) * ${K + 24}.0 - 12.0;
  float dk = head - float(k);
  float cm = dk >= 0.0 ? exp(-dk / 11.0) : exp(dk * 2.0);
  float dist = length(mix(A.xyz, B.xyz, 0.5) - camPos);
  float fog = smoothstep(0.6, 3.5, dist) * exp(-dist * 0.035);
  float ends = smoothstep(0.0, 4.0, float(k)) * smoothstep(${K - 1}.0, ${K - 7}.0, float(k));
  float a = (0.13 + comet * cm) * A.w * fog * ends;
  vColor = vec4(vec3(0.80, 0.76, 0.70) * gain * (0.55 + 0.6 * hj), 1.0) * a * min(1.0, w / 0.7);
}`;

const LINE_FRAG = /* glsl */ `
precision highp float;
in vec2 vLocal; in float vLen; in float vHalfW; in vec4 vColor;
out vec4 fragColor;
void main() {
  float x = clamp(vLocal.x, 0.0, vLen);
  float d = length(vec2(vLocal.x - x, vLocal.y)) - vHalfW;
  float a = clamp(0.5 - d, 0.0, 1.0);
  if (a <= 0.0) discard;
  fragColor = vec4(vColor.rgb * a * vColor.a, 0.0);
}`;

/** Chữ to bị dòng xé (lát ngang trượt + cuốn theo curl) hoặc kéo vệt (chải ngang / bốc lên). */
const TEAR = /* glsl */ `
uniform sampler2D tex; uniform float amt, t, seed; uniform vec2 smear; uniform vec4 rect; // rect: x0, y0, x1, y1 (px, từ trên)
vec4 tap(vec2 uv) { return texture(tex, uv); }
void main() {
  vec2 uv = vUv, px = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  if (px.x < rect.x || px.x > rect.z || px.y < rect.y || px.y > rect.w) { vec4 o = texture(tex, uv); fragColor = vec4(o.rgb * o.a, o.a); return; }
  vec2 q = uv * vec2(${A.toFixed(5)}, 1.0);
  float band = floor(uv.y * 1080.0 / 7.0), hb = hash12(vec2(band, seed));
  float band2 = floor(uv.y * 1080.0 / 41.0), hb2 = hash12(vec2(band2, seed + 1.3));
  uv.x += amt * ((hb > 0.72 ? (hash12(vec2(band, seed + 3.0)) - 0.5) * 0.06 : 0.0) + (hb2 > 0.6 ? (hb2 - 0.8) * 0.05 : 0.0));
  uv += curl2(q * 2.4, t * 0.7) * 0.004 * amt;
  vec4 c = tap(uv);
  float ga = c.a;
  vec3 acc = c.rgb * c.a;
  if (abs(smear.x) + abs(smear.y) > 0.0) {
    for (int i = 1; i < 14; i++) {
      float f = float(i) / 13.0;
      vec2 su = uv - smear * f;
      if ((1.0 - su.y) * 1080.0 < rect.y) break;
      vec4 s = tap(su);
      float w = (1.0 - f) * 0.28;
      acc += s.rgb * s.a * w; ga += s.a * w;
    }
  }
  ga = min(ga, 1.0);
  fragColor = vec4(min(acc, vec3(ga)) * 0.8, ga);
}`;

interface Cam { pos: V3; look: V3; roll: number; fov: number }

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

export default class Plate extends Scene {
  text = new Layer2D();
  spark = new Spark();
  posRT = makeRT(K, N, { pxScale: 1, type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  keyRT = makeRT(K / 8, N, { pxScale: 1, type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  integ = new FSPass(INTEGRATE, {
    stage: { value: 0 }, keyT: { value: null },
    t: { value: 0 }, camX: { value: 0 }, chaos: { value: 1 }, R: { value: -10 }, rise: { value: 0 }, burst: { value: 0 }, ds: { value: 0.5 },
    colX: { value: 0 }, origin: { value: new THREE.Vector3() },
  });
  tear = new FSPass(TEAR, { tex: { value: null }, amt: { value: 0 }, t: { value: 0 }, seed: { value: 0 }, smear: { value: new THREE.Vector2() }, rect: { value: new THREE.Vector4() } },
    { blending: THREE.CustomBlending, transparent: true });
  cam = new THREE.PerspectiveCamera(50, A, 0.1, 300);
  lineScene = new THREE.Scene();
  lineMat: THREE.RawShaderMaterial;
  sig = new LineBatch(256, { screen2D: false, blend: 'add' });

  constructor(ctx: ConstructorParameters<typeof Scene>[0]) {
    super(ctx);
    const m = this.tear.mat; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const n = N * (K - 1), ids = new Float32Array(n);
    for (let i = 0; i < n; i++) ids[i] = i;
    geo.setAttribute('iId', new THREE.InstancedBufferAttribute(ids, 1));
    geo.instanceCount = n;
    this.lineMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      uniforms: {
        P: { value: this.posRT.texture }, res: { value: new THREE.Vector2(W, H) }, pxScale: { value: 1 }, t: { value: 0 }, gain: { value: 1 },
        comet: { value: 1 }, cspeed: { value: 0.5 }, wid: { value: 1.1 }, camPos: { value: new THREE.Vector3() },
      },
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending,
    });
    const lm = this.lineMat; lm.blendEquation = THREE.AddEquation; lm.blendSrc = THREE.OneFactor; lm.blendDst = THREE.OneFactor;
    lm.blendSrcAlpha = THREE.ZeroFactor; lm.blendDstAlpha = THREE.OneFactor;
    const mesh = new THREE.Mesh(geo, this.lineMat); mesh.frustumCulled = false;
    this.lineScene.add(mesh);
  }

  /** Đầu đốm cam (thế giới) theo lt. */
  head(lt: number): V3 {
    const x = 34 * ease.outCubic(clamp(lt / 6)) + 2.5 * lt;
    const xc = 34 + 2.5 * 6;
    if (lt < 6) return [x, 0, 0];
    const u = lt - 6;
    return [xc, 22 * ease.outExpo(clamp(u / 1.1)) + 4 * u, 0];
  }

  shot(lt: number): Cam {
    const b = lt / P; // phách kể từ S(18)
    const Hd = this.head(lt), cx = Hd;
    if (b < 3) { const s = lt; return { pos: add(cx, [-2.5 - s * 1.2, 1.4, 8.5 - s * 2.5]), look: add(cx, [2, 0.2, 0]), roll: 0.14 - s * 0.12, fov: 52 }; }
    if (b < 5) { const s = lt - 3 * P; return { pos: add(cx, [-7 + s * 4, -1.1, 2.4]), look: add(cx, [6, 0.6, -0.4]), roll: -0.38 + 0.25 * (1 - springStep(s, 3, 0.4)), fov: 64 }; }
    if (b < 6) { const s = lt - 5 * P; return { pos: add(cx, [-1.4 - s, 0.5, 3.2]), look: add(cx, [1.2, 0, 0]), roll: 0.22, fov: 30 - s * 8 }; }
    if (b < 8) { const s = lt - 6 * P; return { pos: add(cx, [-3.5, 6.5 - s * 2, 4.5]), look: add(cx, [3, 0, 0]), roll: -0.3 + s * 0.15, fov: 60 }; }
    if (b < 10) { const s = lt - 8 * P; return { pos: add(cx, [-5 + s * 3, 1.0, 12 - s * 3]), look: add(cx, [1, 0.2, 0]), roll: 0.07, fov: 46 }; }
    if (b < 12) { const s = lt - 10 * P; return { pos: add(cx, [3, -1.6, 5.5 - s]), look: add(cx, [-3, 0.6, 0]), roll: 0.42 - s * 0.1, fov: 40 }; }
    if (b < 18) { const s = lt - 12 * P; return { pos: [cx[0] - 14 + s * 1.2, 2.8, 8.5 - s * 0.3], look: [cx[0] + 2 + s * 0.8, 1.4, -1], roll: -0.04, fov: 54 }; }
    const s = lt - 18 * P, up = ease.inOutCubic(clamp(s / 1.2));
    return { pos: [cx[0] - 7 + s * 0.5, lerp(3.4, -4, up), lerp(13.5, 9.5, up)], look: [cx[0] - 1.5, lerp(2.4, 16 + 6 * s, up), 0], roll: lerp(0, -0.08, up), fov: lerp(50, 62, up) };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, t = f.t, lt = t - T0;
    clearRT(r, out, INK);

    // ---------------- trường
    const R = lerp(-6, 34, ease.outCubic(clamp((lt - 4 * 1.0002) / 1.3)));
    const rise = ease.outExpo(clamp((lt - 6 * 1.0002) / 0.9));
    const burst = 1 - ease.outExpo(clamp(lt / 0.55));
    const Hd = this.head(lt);
    const cam = this.shot(lt);
    const iu = this.integ.u;
    iu.t!.value = t * 1.0 + (lt < 4 ? lt * 0.6 : 2.4); iu.camX!.value = cam.look[0] + 8; iu.chaos!.value = 1.35;
    iu.R!.value = R; iu.rise!.value = rise; iu.burst!.value = burst; iu.colX!.value = Hd[0];
    (iu.origin!.value as THREE.Vector3).set(4, 0, 0);
    iu.stage!.value = 0; iu.keyT!.value = this.posRT.texture; this.integ.render(r, this.keyRT);
    iu.stage!.value = 1; iu.keyT!.value = this.keyRT.texture; this.integ.render(r, this.posRT);

    const c3 = this.cam;
    c3.fov = cam.fov; c3.position.set(...cam.pos); c3.up.set(0, 1, 0); c3.lookAt(...cam.look); c3.rotateZ(cam.roll); c3.updateProjectionMatrix(); c3.updateMatrixWorld();

    const lu = this.lineMat.uniforms, s = rtScale(out);
    (lu.res!.value as THREE.Vector2).set(out.width / s, out.height / s); lu.pxScale!.value = s; lu.t!.value = t;
    (lu.camPos!.value as THREE.Vector3).set(...cam.pos);
    const order = smoothstep(4, 5.6, lt);
    lu.gain!.value = (0.85 + 1.4 * pulse(t, T0, 0.15)) * lerp(1, 0.85, order) * (1 + 0.25 * rise);
    lu.comet!.value = lerp(1.9, 1.5, order) * (1 - 0.35 * rise); lu.cspeed!.value = lerp(0.55, 0.9, order) + 0.8 * rise; lu.wid!.value = 1.2;
    r.setRenderTarget(out); r.render(this.lineScene, c3);

    // ---------------- đường cam thẳng tắp
    const L = this.sig; L.clear();
    const x0 = -40, sg = LIN.signal, em = LIN.ember;
    const corner: V3 = [Math.min(Hd[0], 34 + 15), 0, 0];
    const pts: V3[] = lt < 6 ? [[x0, 0, 0], Hd] : [[x0, 0, 0], corner, Hd];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!, b = pts[i]!;
      const n = 40;
      for (let j = 0; j < n; j++) {
        const u0 = j / n, u1 = (j + 1) / n;
        const p0: V3 = [lerp(a[0], b[0], u0), lerp(a[1], b[1], u0), 0], p1: V3 = [lerp(a[0], b[0], u1), lerp(a[1], b[1], u1), 0];
        L.seg(p0[0], p0[1], 0, p1[0], p1[1], 0, 5, sg[0] * 0.9, sg[1] * 0.9, sg[2] * 0.9, 1);
        L.seg(p0[0], p0[1], 0, p1[0], p1[1], 0, 1.6, em[0] * 3.2, em[1] * 3.2, em[2] * 3.2, 1);
      }
    }
    L.render(r, out, c3);
    const hp = new THREE.Vector3(...Hd).project(c3);
    const hx = (hp.x * 0.5 + 0.5) * W, hy = (0.5 - hp.y * 0.5) * H;
    if (hp.z < 1) this.spark.draw(r, out, hx, hy, t, 1.25 + 0.8 * pulse(t, T0, 0.2), 0.05);

    // ---------------- chữ
    this.drawText(f, lt, out);
    const hits = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => S(18 + k)), bigs = [S(18), S(20), S(22), S(24)];
    const post = hitPost(t, hits, bigs, { ...BASE_POST, bloom: 0.75, halation: 0.35, ca: 0.6 });
    return post;
  }

  private drawText(f: Frame, lt: number, out: THREE.WebGLRenderTarget) {
    const r = this.ctx.renderer, t = f.t, c = this.text.ctx, bc = c;
    this.text.clear();
    const ta = TEXT.p04.a, tb = TEXT.p04.b, tc = TEXT.p04.c;
    const la = t - S(ta.T), lb = t - S(tb.T), lc = t - S(tc.T);
    let amt = 0, smear: [number, number] = [0, 0], rect: [number, number, number, number] = [0, 0, 0, 0];

    if (lb < 0) {
      // BỘN BỀ: S(18) một dòng trái; S(20) xếp hai tầng to bên phải
      if (lt < 2 * 1.0002) {
        bigWord(bc, ta.big, la, { x: 120, y: 470, w: 1300, max: 270, width: 125, weight: 900 });
        rect = [0, 280, 1920, 660];
      } else {
        const l2 = t - S(20);
        bigWord(bc, 'BỘN', l2, { x: 1800, y: 380, w: 1150, max: 330, width: 125, weight: 900, align: 'right' });
        bigWord(bc, 'BỀ', l2 - P, { x: 1800, y: 700, w: 1150, max: 330, width: 125, weight: 900, align: 'right' });
        rect = [480, 170, 1920, 880];
      }
      const sub = lt < 2 ? la : t - S(20);
      amt = 0.15 + 0.85 * smoothstep(0.08, 1.2, sub);
      scrim(c, ta.line, 120, 920, la);
      typeLine(c, ta.line, la, { x: 120, y: 920, size: 50, cps: 34, highlight: 'bộn bề' });
    } else if (lc < 0) {
      bigWord(bc, tb.big, lb, { x: 120, y: 300, w: 1500, max: 220, width: 100, weight: 800 });
      smear = [0.05 * Math.exp(-lb * 5), 0]; rect = [0, 150, 1600, 420];
      scrim(c, tb.line, 120, 480, lb);
      typeLine(c, tb.line, lb, { x: 120, y: 480, size: 50, cps: 72, highlight: 'tin tưởng' });
    } else {
      const k = ease.outExpo(clamp(lc / 0.6));
      bigWord(bc, tc.big, lc, { x: 120, y: 330 - 50 * k - 12 * lc, w: 1100, max: 260, width: 112, weight: 900 });
      smear = [0, -0.05 * (0.08 + Math.exp(-lc * 5))]; rect = [0, 140, 1400, 520];
      scrim(c, tc.line, 120, 940, lc);
      typeLine(c, tc.line, lc, { x: 120, y: 940, size: 50, cps: 40, highlight: 'tự hào' });
    }

    // chú thích kỹ thuật
    const ent = lerp(0.97, 0.06, smoothstep(4, 5.8, lt)) + 0.02 * Math.sin(t * 31) * (1 - smoothstep(4, 5, lt));
    const ali = lerp(0.03, 1, smoothstep(4.2, 5.9, lt));
    const lift = smoothstep(6, 7, lt);
    label(c, 'FIG. 04  —  TRƯỜNG DÒNG / FLOW FIELD', 120, 128, { size: 16, color: rgba('ash') });
    const rx = 1800, ry = 128;
    label(c, `ENTROPY   ${ent.toFixed(3)}`, rx, ry, { size: 16, align: 'right', color: rgba('bone', 0.8) });
    label(c, `ALIGN ∥   ${ali.toFixed(3)}`, rx, ry + 26, { size: 16, align: 'right', color: rgba('bone', 0.8) });
    label(c, `LIFT ↑    ${lift.toFixed(3)}`, rx, ry + 52, { size: 16, align: 'right', color: rgba(lift > 0.5 ? 'signal' : 'bone', 0.8) });
    c.save(); c.strokeStyle = rgba('ash', 0.6); c.lineWidth = 1;
    c.beginPath(); c.moveTo(rx - 260, ry + 70); c.lineTo(rx, ry + 70); c.stroke();
    c.fillStyle = rgba('signal'); c.fillRect(rx - 260, ry + 68, 260 * ali, 3);
    c.restore();
    label(c, 'SIGNAL  ─────  CONST', 120, 1000, { size: 14, color: rgba('signal', 0.85) });

    // ghép: chữ to qua bộ xé, rồi lớp chữ nhỏ
    const tu = this.tear.u;
    tu.tex!.value = this.text.upload(); (tu.rect!.value as THREE.Vector4).set(...rect); tu.amt!.value = amt; tu.t!.value = t; tu.seed!.value = frameIdx(t) >> 1;
    (tu.smear!.value as THREE.Vector2).set(smear[0], smear[1]);
    this.tear.render(r, out);
  }
}

function bigWord(c: CanvasRenderingContext2D, s: string, lt: number, o: { x: number; y: number; w: number; max: number; width: number; weight: number; align?: CanvasTextAlign }) {
  if (lt < 0) return;
  const fam = F.archivo(o.width, o.weight), size = fitSize(s, fam, o.w, o.max);
  const k = 1 + 0.3 * Math.exp(-lt * 16);
  c.save();
  c.globalAlpha = clamp(lt * 40 + 0.35);
  c.translate(o.x, o.y); c.scale(k, k);
  c.font = font(fam, size); c.textAlign = o.align ?? 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = rgba('bone');
  c.fillText(s, 0, size * 0.35);
  c.restore();
}

/** Nền tối mềm sau dòng chữ máy (cỡ 50) để sợi nét không cắt qua chữ. */
function scrim(c: CanvasRenderingContext2D, s: string, x: number, y: number, lt: number) {
  if (lt < 0) return;
  c.save();
  c.font = font(F.mono(400), 50);
  const w = c.measureText(s).width;
  c.globalAlpha = 0.78 * clamp(lt / 0.12);
  c.filter = 'blur(22px)'; c.fillStyle = '#000';
  c.fillRect(x - 30, y - 56, w + 90, 84);
  c.restore();
}
