// Chân dung ghép từ ký tự (theo kỹ thuật video mẫu pdoom: người ngồi ghế dựng bằng chữ mono li ti).
// Ảnh được "bóc tách" ngay lúc nạp, không có bước làm sẵn:
//   1. cân sáng theo phân vị 3–97 % trong vùng người (ảnh đêm h01/h03 mềm, ảnh hồ h02 quần áo rất tối);
//   2. tăng tương phản cục bộ nhẹ (unsharp ở lưới 2×) để mắt, kính, viền mặt nổi lên;
//   3. Sobel ở lưới ô: cạnh mạnh → nét kẻ định hướng ─ ╲ │ ╱ theo tiếp tuyến (đường viền như khắc);
//   4. vùng tối → . : · ,   vùng còn lại → CHỮ CỦA LỜI CHÚC, đọc lần lượt theo hàng (mặt Cậu dệt bằng lời chúc).
// Độ sáng quyết định độ đậm và cỡ ký tự, không đổi ký tự (để vẫn đọc được là chữ).
// Hiển thị: mỗi ký tự là một quad instanced, cộng thuần One/One. Mọi chuyển động là hàm thuần của t.
import * as THREE from 'three';
import { W, H } from '../../engine/gl';
import { F, font } from '../../engine/type';
import { LIN } from '../../engine/palette';
import { TEXT } from './cues';

const DARK = ['.', ':', '·', ','];
const EDGE = ['─', '╲', '│', '╱'];

/** Dòng chữ lời chúc (nguyên văn, bỏ khoảng trắng) làm nguồn ký tự. */
function wishStream(): string[] {
  const out: string[] = [];
  const walk = (o: any) => {
    if (!o || typeof o !== 'object') return;
    if (typeof o.line === 'string') out.push(o.line);
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
  };
  walk(TEXT);
  return Array.from(out.join(' ')).filter((c) => !/\s/.test(c));
}

let ATLAS: { tex: THREE.Texture; index: Map<string, number>; grid: number; nText: number; textIdx: number[] } | null = null;

function atlas() {
  if (ATLAS) return ATLAS;
  const stream = wishStream();
  const chars = Array.from(new Set([...DARK, ...EDGE, ...stream]));
  const grid = Math.ceil(Math.sqrt(chars.length)), cs = 64;
  const cv = document.createElement('canvas'); cv.width = cv.height = grid * cs;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  const index = new Map<string, number>();
  chars.forEach((ch, i) => {
    const x = (i % grid) * cs + cs / 2, y = Math.floor(i / grid) * cs + cs / 2;
    const edge = EDGE.includes(ch);
    c.font = font(F.mono(edge ? 300 : 500), edge ? 60 : 50);
    c.fillText(ch, x, y + (edge ? 0 : 3));
    index.set(ch, i);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  const textIdx = Array.from(new Set(stream)).map((ch) => index.get(ch)!);
  ATLAS = { tex, index, grid, nText: textIdx.length, textIdx };
  return ATLAS;
}

const VERT = /* glsl */ `precision highp float;
in vec3 position;
in vec2 iHome; in float iGlyph; in float iLum; in float iSeed; in float iScale;
uniform vec2 res, center, origin; uniform float cell, form, diss, spread, fromPoint, t, flick, grid, amt, halfRows, fadeBottom, rise, burst;
uniform sampler2D textIdx; uniform float nText;
out vec2 vUv; out float vA, vLum, vFly;
float h1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
void main() {
  float s = iSeed;
  float k = clamp(form * 1.8 - s * 0.8, 0.0, 1.0); k = 1.0 - (1.0 - k) * (1.0 - k) * (1.0 - k);
  vec2 home = center + iHome * cell;
  float ang = s * 628.318, rad = (0.25 + h1(s * 91.7)) * spread;
  vec2 dirR = vec2(cos(ang), sin(ang));
  vec2 st = mix(home + dirR * rad, origin + dirR * rad * 0.12, fromPoint);
  vec2 dv = home - st, perp = vec2(-dv.y, dv.x);
  vec2 p = mix(st, home, k) + perp * 0.3 * sin(k * 3.14159) * (h1(s * 13.1) - 0.5);
  float d = clamp(diss * 1.8 - h1(s * 7.31) * 0.8, 0.0, 1.0); d = d * d;
  p += vec2(sin(s * 91.0 + t * 1.7) * 0.7, -rise - h1(s * 3.7)) * d * 300.0 + vec2(cos(s * 53.0 + t * 1.3), sin(s * 71.0 + t)) * d * 140.0;
  vec2 rd = home - center; p += rd / max(length(rd), 1.0) * (1.0 - exp(-d * 4.0)) * burst * (0.5 + h1(s * 5.3));
  p += vec2(sin(t * 2.1 + s * 40.0), cos(t * 1.7 + s * 33.0)) * 0.5;
  float fly = clamp((1.0 - k) + d, 0.0, 1.0);
  float size = cell * iScale * (1.0 + 0.9 * fly);
  vec2 q = p + position.xy * size;
  gl_Position = vec4(q.x / res.x * 2.0 - 1.0, 1.0 - q.y / res.y * 2.0, 0.0, 1.0);
  float fb = fadeBottom > 0.0 ? 1.0 - smoothstep(halfRows * (1.0 - 2.0 * fadeBottom), halfRows, iHome.y) : 1.0;
  vA = k * (1.0 - d) * amt * fb;
  vLum = iLum; vFly = fly;
  // vài ký tự chữ đổi liên tục như dòng mã đang chạy
  float g = iGlyph, fr = floor(t * 10.0);
  if (iGlyph >= 8.0 && h1(s * 97.0 + fr * 0.731) < flick) g = texelFetch(textIdx, ivec2(int(h1(s * 311.0 + fr) * nText), 0), 0).r;
  vec2 cr = vec2(mod(g, grid), floor(g / grid));
  vUv = (cr + position.xy + 0.5) / grid;
}`;

const FRAG = /* glsl */ `precision highp float;
in vec2 vUv; in float vA, vLum, vFly;
uniform sampler2D atlas; uniform vec3 cDim, cBone, cHot, cTint; uniform float tint, gain;
out vec4 fragColor;
void main() {
  float a = texture(atlas, vUv).r;
  if (a * vA < 0.002) discard;
  float l = vLum;
  vec3 base = mix(cDim, cBone, smoothstep(0.12, 0.85, l)) * (0.10 + 0.78 * pow(l, 1.25));
  base = mix(base, cHot * 0.9, smoothstep(0.86, 1.0, l) * 0.55);
  base = mix(base, cTint * (0.12 + 0.8 * pow(l, 1.2)), tint);
  vec3 col = mix(base, cHot * 1.7, vFly * 0.75);
  fragColor = vec4(col * a * vA * gain, 0.0);
}`;

export interface GlyphOpts {
  /** số hàng ký tự (độ mịn) */
  rows?: number;
  /** ngưỡng cạnh (0..1 theo phân vị 95 %) để dùng nét kẻ */
  edge?: number;
  /** bỏ qua ô có độ sáng dưới mức này (sau cân sáng) */
  floor?: number;
  /** false = không làm mờ mép khung (chữ số, hình vẽ) */
  border?: boolean;
}

export interface GlyphState {
  /** tâm (px logic) và chiều cao hình (px) */
  x: number; y: number; h: number;
  /** 0..1 tụ lại; 0..1 tan ra */
  form: number; diss: number;
  /** điểm phát (px) khi tụ từ một điểm (fromPoint = 1) hoặc từ đám mây quanh hình (0) */
  ox?: number; oy?: number; fromPoint?: number;
  /** bán kính phân tán (px) */
  spread?: number;
  amt?: number;
  /** 0..1 pha về màu tint (vàng nhạt ở đoạn kết) */
  tint?: number;
  /** tỉ lệ hàng dưới cùng mờ dần (0 = không) */
  fadeBottom?: number;
  /** tỉ lệ ký tự đang "chạy" */
  flick?: number;
  /** hướng bay lên khi tan (1 = như tàn lửa) */
  rise?: number;
  /** đẩy văng ra từ tâm khi tan (px), cho cú nổ */
  burst?: number;
}

export class GlyphPortrait {
  mesh!: THREE.Mesh;
  scene = new THREE.Scene();
  cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  mat!: THREE.RawShaderMaterial;
  rows = 0; cols = 0; count = 0;

  constructor(private src: string, private o: GlyphOpts = {}) {}

  async init() {
    const im = new Image(); im.src = this.src; await im.decode();
    this.build(im);
  }

  /** Dựng từ một canvas có sẵn (ví dụ chữ số ngày tháng). */
  fromCanvas(cv: HTMLCanvasElement) { this.build(cv); return this; }

  private build(img: HTMLImageElement | HTMLCanvasElement) {
    const A = atlas();
    const rows = this.o.rows ?? 110;
    const iw = img.width, ih = img.height;
    const cols = Math.round((rows * iw) / ih * 1.65); // ô ký tự mono cao ~1,65 lần rộng
    const gw = cols * 2, gh = rows * 2;
    const cv = document.createElement('canvas'); cv.width = gw; cv.height = gh;
    const c = cv.getContext('2d', { willReadFrequently: true })!;
    c.drawImage(img, 0, 0, gw, gh);
    const d = c.getImageData(0, 0, gw, gh).data;
    const L = new Float32Array(gw * gh), Al = new Float32Array(gw * gh);
    const vals: number[] = [];
    for (let i = 0; i < gw * gh; i++) {
      L[i] = (0.2126 * d[i * 4]! + 0.7152 * d[i * 4 + 1]! + 0.0722 * d[i * 4 + 2]!) / 255;
      Al[i] = d[i * 4 + 3]! / 255;
      if (Al[i]! > 0.5) vals.push(L[i]!);
    }
    vals.sort((a, b) => a - b);
    const hi = vals[Math.floor(vals.length * 0.97)] ?? 1;
    // hình phẳng màu (chữ số trắng) có lo = hi: giữ dải tối thiểu 0,35 để không bị dồn về 0
    const lo = Math.min(vals[Math.floor(vals.length * 0.03)] ?? 0, hi - 0.35);
    // cân sáng + unsharp (hộp 5×5 ở lưới 2×)
    const N = new Float32Array(gw * gh);
    for (let i = 0; i < gw * gh; i++) N[i] = Math.min(1, Math.max(0, (L[i]! - lo) / Math.max(hi - lo, 1e-3)));
    const B = new Float32Array(gw * gh);
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
      let s = 0, n = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue; s += N[yy * gw + xx]!; n++;
      }
      B[y * gw + x] = s / n;
    }
    // về lưới ô
    const cl = new Float32Array(cols * rows), ca = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let s = 0, a = 0;
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
        const i = (y * 2 + dy) * gw + x * 2 + dx; s += Math.min(1, Math.max(0, N[i]! + 0.6 * (N[i]! - B[i]!))); a += Al[i]!;
      }
      // mép khung ảnh cắt thẳng (vai, áo) mờ dần thay vì thành cạnh thẳng
      const ex = Math.min(x + 0.5, cols - x - 0.5) / cols, ey = (rows - y - 0.5) / rows, et = (y + 0.5) / rows;
      const ss = (e: number, w: number) => { const k = Math.min(1, Math.max(0, e / w)); return k * k * (3 - 2 * k); };
      const border = this.o.border === false ? 1 : ss(ex, 0.07) * ss(ey, 0.16) * ss(et, 0.03);
      cl[y * cols + x] = Math.pow(s / 4, 0.9); ca[y * cols + x] = (a / 4) * border;
    }
    // Sobel ở lưới ô
    const gx = new Float32Array(cols * rows), gy = new Float32Array(cols * rows), mag = new Float32Array(cols * rows);
    const at = (x: number, y: number) => cl[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))]! * ca[Math.min(rows - 1, Math.max(0, y)) * cols + Math.min(cols - 1, Math.max(0, x))]!;
    const ms: number[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const X = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const Y = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      const i = y * cols + x; gx[i] = X; gy[i] = Y; mag[i] = Math.hypot(X, Y); if (ca[i]! > 0.4) ms.push(mag[i]!);
    }
    ms.sort((a, b) => a - b);
    const m95 = Math.max(ms[Math.floor(ms.length * 0.95)] ?? 1, 1e-3);
    const edgeT = this.o.edge ?? 0.6, floor = this.o.floor ?? 0.05;
    const stream = wishStream(); let si = 0;
    const home: number[] = [], glyph: number[] = [], lum: number[] = [], seed: number[] = [], scale: number[] = [];
    const cw = 1 / 1.65; // bề rộng ô theo đơn vị chiều cao ô
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x, l = cl[i]!, a = ca[i]!;
      if (a < 0.4 || l < floor) continue;
      const e = mag[i]! / m95;
      let ch: string;
      if (l < 0.2) ch = DARK[(x * 7 + y * 13) % DARK.length]!;
      else if (e > edgeT && l > 0.15) {
        // tiếp tuyến vuông góc với gradient; y màn hình hướng xuống
        let ang = Math.atan2(gy[i]!, gx[i]!) + Math.PI / 2; ang = ((ang % Math.PI) + Math.PI) % Math.PI;
        ch = EDGE[Math.round(ang / (Math.PI / 4)) % 4]!;
      } else { ch = stream[si % stream.length]!; si++; }
      home.push((x - cols / 2 + 0.5) * cw, y - rows / 2 + 0.5);
      glyph.push(A.index.get(ch)!);
      lum.push(l * Math.min(1, a * 1.4));
      const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453; seed.push(h - Math.floor(h));
      scale.push(0.72 + 0.36 * l);
    }
    this.rows = rows; this.cols = cols; this.count = lum.length;

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('iHome', new THREE.InstancedBufferAttribute(new Float32Array(home), 2));
    geo.setAttribute('iGlyph', new THREE.InstancedBufferAttribute(new Float32Array(glyph), 1));
    geo.setAttribute('iLum', new THREE.InstancedBufferAttribute(new Float32Array(lum), 1));
    geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(new Float32Array(seed), 1));
    geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(new Float32Array(scale), 1));
    geo.instanceCount = this.count;
    const ti = new THREE.DataTexture(new Float32Array(A.textIdx), A.textIdx.length, 1, THREE.RedFormat, THREE.FloatType);
    ti.needsUpdate = true;
    const v3 = (k: keyof typeof LIN) => new THREE.Vector3(...LIN[k]);
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        res: { value: new THREE.Vector2(W, H) }, center: { value: new THREE.Vector2() }, origin: { value: new THREE.Vector2() },
        cell: { value: 8 }, form: { value: 0 }, diss: { value: 0 }, spread: { value: 300 }, fromPoint: { value: 0 }, t: { value: 0 },
        flick: { value: 0.02 }, grid: { value: A.grid }, amt: { value: 1 }, halfRows: { value: rows / 2 }, fadeBottom: { value: 0 }, rise: { value: 1 }, burst: { value: 0 },
        textIdx: { value: ti }, nText: { value: A.nText }, atlas: { value: A.tex },
        cDim: { value: v3('graphite') }, cBone: { value: v3('bone') }, cHot: { value: v3('ember') },
        cTint: { value: new THREE.Vector3(1.0, 0.62, 0.28) }, tint: { value: 0 }, gain: { value: 1 },
      },
      // y màn hình hướng xuống làm đảo chiều tam giác: vẽ cả hai mặt, nếu không bị cắt hết (không ra hình)
      transparent: true, depthTest: false, depthWrite: false, blending: THREE.CustomBlending, side: THREE.DoubleSide,
    });
    const m = this.mat;
    m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor;
    m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
    this.mesh = new THREE.Mesh(geo, m); this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  draw(r: THREE.WebGLRenderer, out: THREE.WebGLRenderTarget, t: number, s: GlyphState) {
    const amt = s.amt ?? 1;
    if (!this.mat || amt <= 0.001 || s.form <= 0.001 || s.diss >= 0.999) return;
    const u = this.mat.uniforms;
    (u.center!.value as THREE.Vector2).set(s.x, s.y);
    (u.origin!.value as THREE.Vector2).set(s.ox ?? s.x, s.oy ?? s.y);
    u.cell!.value = s.h / this.rows; u.form!.value = s.form; u.diss!.value = s.diss; u.t!.value = t;
    u.spread!.value = s.spread ?? s.h * 0.5; u.fromPoint!.value = s.fromPoint ?? 0; u.amt!.value = amt;
    u.tint!.value = s.tint ?? 0; u.fadeBottom!.value = s.fadeBottom ?? 0; u.flick!.value = s.flick ?? 0.02; u.rise!.value = s.rise ?? 1; u.burst!.value = s.burst ?? 0;
    r.setRenderTarget(out);
    r.render(this.scene, this.cam);
  }
}
