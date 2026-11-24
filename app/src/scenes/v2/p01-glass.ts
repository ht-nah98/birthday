// p01: kính máy hiện sóng (graticule khắc trên kính, lưới lọc hộp chống răng cưa) + nền mực.
// Lưới lọc hộp phỏng theo spacetime-lens của pdoom (MIT, sau I. Quilez).
import * as THREE from 'three';
import { FSPass, W, H } from '../../engine/gl';

const FRAG = /* glsl */ `
uniform vec3 uCam;      // s (px/div hệ số), ox, oy: gốc toạ độ trên màn hình (px)
uniform float uDiv;     // px mỗi ô ở s = 1
uniform vec2 uExt;      // nửa kích thước vùng kẻ (ô)
uniform float uA;       // độ sáng lưới
uniform float uDraw;    // 0..1 lưới khắc dần từ tâm
uniform float uBg;      // 0..1 nền kính (0 = đen tuyền)
uniform float uGlow;    // ánh lân quang ấm giữa màn
uniform vec3 uBeam;     // tia quét (px, cường độ): rọi sáng lưới quanh nó

float cov(float d, float w) { return clamp(0.5 * w + 0.5 - d, 0.0, 1.0); }

void main() {
  vec2 p = vec2(vUv.x * ${W}.0, (1.0 - vUv.y) * ${H}.0);
  float px = uDiv * uCam.x;
  vec2 q = vec2(p.x - uCam.y, -(p.y - uCam.z)) / px;
  vec2 ext = uExt * uDraw;
  float inside = step(abs(q.x), ext.x + 0.004) * step(abs(q.y), ext.y + 0.004);
  vec2 dg = abs(fract(q + 0.5) - 0.5) * px;           // khoảng cách px tới đường lưới gần nhất
  float g = max(cov(dg.x, 1.0), cov(dg.y, 1.0)) * inside;
  vec2 da = abs(q) * px;
  float ax = max(cov(da.x, 1.3), cov(da.y, 1.3)) * inside;
  // vạch chia 0.2 ô trên hai trục giữa
  vec2 d5 = abs(fract(q * 5.0 + 0.5) - 0.5) * px / 5.0;
  float tk = max(cov(d5.x, 1.0) * step(da.y, 7.0), cov(d5.y, 1.0) * step(da.x, 7.0)) * inside;
  // chấm chia nhỏ trên mọi đường lưới chính
  float dts = max(cov(d5.x, 1.6) * cov(dg.y, 1.6), cov(d5.y, 1.6) * cov(dg.x, 1.6)) * inside;
  float lum = uA * max(max(0.2 * g, 0.34 * ax), max(0.4 * tk, 0.3 * dts));

  vec2 c = (vUv - 0.5) * vec2(${(W / H).toFixed(5)}, 1.0);
  float rc = length(c);
  vec3 col = C_INK;
  col += C_INK2 * 0.5 * (1.0 - smoothstep(0.05, 1.0, rc)) * uBg;
  col += C_BLOOD * 0.018 * uGlow * (1.0 - smoothstep(0.0, 0.8, rc));
  float bl = uBeam.z * exp(-length(p - uBeam.xy) / 240.0);
  col += mix(C_ASH, C_BONE, 0.45) * lum * (1.0 + 1.8 * bl) + C_EMBER * lum * 0.6 * bl;
  // kính: một vệt phản chiếu chéo rất nhẹ và mép tối
  float d = dot(c, normalize(vec2(1.0, 0.55)));
  col += C_BONE * 0.0045 * uBg * exp(-((d - 0.22) / 0.09) * ((d - 0.22) / 0.09));
  col += C_BONE * 0.0025 * uBg * exp(-((d + 0.38) / 0.03) * ((d + 0.38) / 0.03));
  fragColor = vec4(col, 1.0);
}`;

export class Glass {
  pass = new FSPass(FRAG, {
    uCam: { value: new THREE.Vector3(1, W / 2, H / 2) }, uDiv: { value: 120 }, uExt: { value: new THREE.Vector2(7, 3.6) },
    uA: { value: 1 }, uDraw: { value: 1 }, uBg: { value: 1 }, uGlow: { value: 1 }, uBeam: { value: new THREE.Vector3(0, 0, 0) },
  });
  set(o: { cam: [number, number, number]; div: number; ext: [number, number]; a: number; draw: number; bg: number; glow: number; beam: [number, number, number] }) {
    const u = this.pass.u;
    (u.uCam!.value as THREE.Vector3).set(...o.cam);
    u.uDiv!.value = o.div;
    (u.uExt!.value as THREE.Vector2).set(...o.ext);
    u.uA!.value = o.a; u.uDraw!.value = o.draw; u.uBg!.value = o.bg; u.uGlow!.value = o.glow;
    (u.uBeam!.value as THREE.Vector3).set(...o.beam);
  }
  render(r: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget) { this.pass.render(r, out); }
}
