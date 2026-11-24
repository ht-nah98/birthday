// GLSL cho p07-wishes: cột đá raymarch tô nét khắc + viền cam, hoa văn guilloché vàng, nền lưới.

/** Cột đá (VỮNG VÀNG): raymarch SDF, mặt đất có lưới và sóng xung kích, khắc nét theo ánh sáng, viền cam ngược sáng. */
export const PILLAR = /* glsl */ `
uniform vec3 camPos, camR, camU, camF; uniform float tanF, aspect;
uniform vec4 wv[6];      // gốc sóng x, z, bán kính hiện tại, biên độ
uniform float imp, scanY, scanA, uT;

float gau(float x) { return exp(-x * x); }
float sdPillar(vec3 p, out float id) {
  float k = 1.0 - 0.08 * clamp(p.y / 5.5, 0.0, 1.0);
  vec3 q = p - vec3(0.0, 3.0, 0.0);
  float shaft = sdBox3(vec3(q.x / k, q.y, q.z / k), vec3(0.42, 2.55, 0.42)) * k;
  vec3 c = p - vec3(0.0, 5.55, 0.0);
  float pyr = max(-c.y, max(abs(c.x) * 0.9 + c.y * 0.43 - 0.35, abs(c.z) * 0.9 + c.y * 0.43 - 0.35));
  float pl1 = sdBox3(p - vec3(0.0, 0.14, 0.0), vec3(0.82, 0.14, 0.82));
  float pl2 = sdBox3(p - vec3(0.0, 0.36, 0.0), vec3(0.6, 0.08, 0.6));
  float d = shaft; id = 0.0;
  if (pyr < d) { d = pyr; id = 1.0; }
  if (pl1 < d) { d = pl1; id = 2.0; }
  if (pl2 < d) { d = pl2; id = 3.0; }
  return d;
}
float mapD(vec3 p) { float id; return sdPillar(p, id); }

float gline(float x) { float f = abs(fract(x + 0.5) - 0.5); float w = fwidth(x); return 1.0 - smoothstep(0.0, w * 1.2, f - w * 0.2); }

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec3 rd = normalize(camF + camR * ndc.x * aspect * tanF + camU * ndc.y * tanF);
  vec3 ro = camPos;
  float tg = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;
  float t = 0.0, minD = 1e9, tHit = -1.0, id = 0.0;
  for (int i = 0; i < 110; i++) {
    vec3 p = ro + rd * t;
    float d = sdPillar(p, id);
    minD = min(minD, d / max(t * 0.08, 0.05));
    if (d < 0.0006 * t) { tHit = t; break; }
    t += d * 0.9;
    if (t > 60.0 || t > tg) break;
  }
  vec3 col = C_INK;
  // bầu trời: chân trời mảnh
  float hz = exp(-abs(rd.y) * 60.0);
  col += C_BONE * 0.03 * hz;
  vec3 key = normalize(vec3(-0.55, 0.62, 0.55));
  if (tHit < 0.0 && tg < 1e8) {
    vec3 q = ro + rd * tg;
    float dist = tg;
    float fade = exp(-dist * 0.07);
    float g = max(gline(q.x * 1.0), gline(q.z * 1.0)) * 0.55 + max(gline(q.x * 4.0), gline(q.z * 4.0)) * 0.12 * exp(-dist * 0.25);
    float rr = length(q.xz);
    float plaza = gline(rr * 3.0) * smoothstep(3.2, 1.0, rr) * 0.5;
    col += C_BONE * (g + plaza) * fade * 0.28;
    // bóng cột đổ trên đất (hướng ngược ánh sáng chính)
    vec2 sd = -normalize(key.xz);
    vec2 rel = q.xz; float along = dot(rel, sd), perp = abs(rel.x * sd.y - rel.y * sd.x);
    float sh = step(0.0, along) * (1.0 - smoothstep(0.42, 0.6, perp)) * smoothstep(9.0, 2.0, along);
    col *= 1.0 - 0.75 * sh;
    // sóng xung kích trên đất, khuất sau cột
    for (int i = 0; i < 6; i++) {
      vec4 w = wv[i];
      if (w.w <= 0.0) continue;
      vec2 o = w.xy, dv = q.xz - o; float d = length(dv);
      float wd = 0.035 + 0.012 * d;
      float band = gau((d - w.z) / wd);
      float echo = gau((d - w.z + 0.45) / (wd * 0.6)) * 0.35 + gau((d - w.z + 0.9) / (wd * 0.5)) * 0.15;
      vec2 po = -o; float lo = length(po); vec2 dir = po / lo;
      float al = dot(dv, dir), pe = abs(dv.x * dir.y - dv.y * dir.x);
      float shadow = step(lo, al) * (1.0 - smoothstep(0.45 * al / lo, 0.75 * al / lo, pe));
      float inside = smoothstep(w.z + 0.2, w.z - 0.4, d);
      col += (C_SIGNAL * 2.2 * band + C_BONE * 0.35 * echo + C_SIGNAL * 0.05 * inside * exp(-max(w.z - d, 0.0) * 1.5)) * w.w * (1.0 - 0.92 * shadow) * exp(-dist * 0.04);
    }
  }
  if (tHit > 0.0) {
    vec3 p = ro + rd * tHit;
    float e = 0.0015 * tHit; vec2 kk = vec2(1.0, -1.0);
    vec3 n = normalize(kk.xyy * mapD(p + kk.xyy * e) + kk.yyx * mapD(p + kk.yyx * e) + kk.yxy * mapD(p + kk.yxy * e) + kk.xxx * mapD(p + kk.xxx * e));
    float dif = max(dot(n, key), 0.0);
    float amb = 0.18 + 0.12 * n.y;
    float lit = sat(dif * 0.9 + amb * 0.5);
    // toạ độ mặt để khắc theo mặt phẳng
    vec2 fc = abs(n.x) > abs(n.z) ? p.zy : p.xy;
    if (abs(n.y) > 0.7) fc = p.xz;
    float hs = 26.0;
    float ink = hatch(fc.y * hs, lit * 0.6);
    ink = max(ink, hatch((fc.x + fc.y) * hs * 0.7, sat(lit * 1.8 - 1.0)) * 0.8);
    ink = max(ink, hatch(fc.x * hs * 1.3, sat(0.25 - lit) * 1.2) * 0.35);
    // cạnh khối: nét mảnh
    float k = 1.0 - 0.08 * clamp(p.y / 5.5, 0.0, 1.0);
    vec3 q = p - vec3(0.0, 3.0, 0.0);
    float w = 0.012 + 0.0016 * tHit;
    float nx = 1.0 - smoothstep(0.0, w, 0.42 * k - abs(q.x)), nz = 1.0 - smoothstep(0.0, w, 0.42 * k - abs(q.z));
    float edge = id < 0.5 ? nx * nz : 0.0;
    vec3 base = C_INK2 * 0.9;
    col = base + C_BONE * 0.5 * ink + C_BONE * 0.75 * edge;
    // viền cam ngược sáng
    float fres = pow(sat(1.0 - abs(dot(n, -rd))), 3.0);
    vec3 back = normalize(vec3(camF.x, 0.0, camF.z));
    float rim = fres * (0.3 + 0.7 * max(dot(n, back) + 0.4, 0.0));
    col += C_SIGNAL * rim * (1.4 + 3.0 * imp);
    col += C_SIGNAL * edge * (0.25 + 1.5 * imp) * smoothstep(-0.2, 0.6, dot(n, back) + 0.3);
    // dải năng lượng chạy lên thân khi trúng sóng
    col += C_SIGNAL * scanA * gau((p.y - scanY) / 0.06) * 3.0;
    col += C_EMBER * scanA * 0.6 * gau((p.y - scanY + 0.25) / 0.25) * step(p.y, scanY);
  } else {
    // quầng ngược sáng sau cột
    col += C_SIGNAL * exp(-minD * 1.4) * (0.035 + 0.2 * imp);
  }
  fragColor = vec4(col, 1.0);
}`;

/** Hoa văn guilloché (TÀI LỘC VIÊN MÃN): vẽ dần theo góc, vàng kim. Toạ độ px logic. */
export const ROSETTE = /* glsl */ `
uniform vec2 c; uniform float R, rot, reveal, headA, burstR, burstA, closeA, zoom;
uniform vec3 gold;
float gau(float x) { return exp(-x * x); }
float lAA(float d, float w) { float aa = 0.8; return 1.0 - smoothstep(w * 0.5 - aa * 0.5, w * 0.5 + aa * 0.5, abs(d)); }
float rosette(vec2 m, float Rr, float a, float n, float K, float w, float tw) {
  float r = length(m), th = atan(m.y, m.x), ink = 0.0;
  for (int k = 0; k < 14; k++) {
    if (float(k) >= K) break;
    float ph = float(k) * TAU / K + tw;
    float s = sin(n * th + ph);
    float slope = a * n * cos(n * th + ph) / max(r, 1.0);
    ink = max(ink, lAA((r - (Rr + a * s)) / sqrt(1.0 + slope * slope), w));
  }
  return ink;
}
void main() {
  vec2 px = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  vec2 m = (px - c) / zoom;
  m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * m;
  float r = length(m);
  vec3 col = C_INK;
  // nền: dòng an ninh mảnh (graphite)
  vec2 w = px;
  float g1 = hatch((w.y + 22.0 * sin(w.x * 0.011) + 7.0 * sin(w.x * 0.037 + 1.3)) / 13.0, 0.06);
  float g2 = hatch((w.y - 22.0 * sin(w.x * 0.011 + 1.9) - 7.0 * sin(w.x * 0.029)) / 13.0, 0.06);
  col += C_GRAPHITE * (g1 + g2) * 0.12;
  // góc lộ: từ đỉnh, theo chiều kim đồng hồ
  float th = atan(m.x, -m.y); // 0 ở đỉnh
  float ang = fract(th / TAU + 1.0);
  float vis = step(ang, reveal);
  float behind = (reveal - ang) * TAU * max(r, 30.0);
  float head = vis * exp(-max(behind, 0.0) / 60.0) * headA;
  float ink = 0.0;
  float sR = R;
  if (r < sR * 1.42) {
    ink = max(ink, rosette(m, sR * 1.0, sR * 0.055, 36.0, 12.0, 1.0, 0.0));
    ink = max(ink, rosette(m, sR * 0.8, sR * 0.11, 18.0, 12.0, 1.0, 0.3) * 0.9);
    ink = max(ink, rosette(m, sR * 0.8, sR * 0.11, -18.0, 6.0, 0.9, 0.1) * 0.8);
    ink = max(ink, rosette(m, sR * 0.52, sR * 0.12, 12.0, 10.0, 0.9, 0.2) * 0.9);
    ink = max(ink, rosette(m, sR * 0.27, sR * 0.1, 8.0, 8.0, 0.9, 0.0) * 0.85);
    // vành tiện ngoài
    float lathe = hatch((r + 5.0 * sin(atan(m.y, m.x) * 48.0)) / 6.0, 0.08) * smoothstep(sR * 1.12, sR * 1.15, r) * smoothstep(sR * 1.36, sR * 1.32, r);
    ink = max(ink, lathe * 0.55);
    ink = max(ink, lAA(r - sR * 1.1, 1.4));
    ink = max(ink, lAA(r - sR * 1.38, 1.2));
    ink = max(ink, lAA(r - sR * 0.12, 1.0));
  }
  col += gold * 0.72 * ink * vis * (1.0 + 0.5 * closeA);
  col += gold * 3.0 * ink * head;
  // vạch đầu bút
  col += gold * 2.5 * head * exp(-abs(behind) / 3.0) * step(sR * 0.1, r) * step(r, sR * 1.4) * 0.4;
  // vòng bùng khi khép kín
  col += gold * burstA * 2.2 * gau((r - burstR) / (3.0 + burstR * 0.01));
  col += gold * burstA * 0.35 * gau((r - burstR * 0.86) / 2.0);
  col += gold * 0.05 * closeA * exp(-r / (sR * 0.6));
  fragColor = vec4(col, 1.0);
}`;

/** Nền lưới chuẩn (graticule) mảnh cho các lời chúc 2D. */
export const GRID = /* glsl */ `
uniform vec2 c; uniform float amt, cell;
void main() {
  vec2 px = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0) - c;
  vec2 f = abs(fract(px / cell + 0.5) - 0.5) * cell;
  float g = max(pxLine(f.x, 0.2, 0.9), pxLine(f.y, 0.2, 0.9));
  vec2 f2 = abs(fract(px / (cell * 0.2) + 0.5) - 0.5) * cell * 0.2;
  float g2 = max(pxLine(f2.x, 0.1, 0.7), pxLine(f2.y, 0.1, 0.7)) * 0.25;
  float v = exp(-length(px) / 900.0);
  vec3 col = C_INK + C_GRAPHITE * (g * 0.16 + g2 * 0.06) * amt * (0.4 + 0.6 * v);
  fragColor = vec4(col, 1.0);
}`;
