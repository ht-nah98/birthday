// Đoạn mở đầu cinematic: mọi khung là hàm thuần của t, cắt theo lưới nhạc G(k) = 0.07 + k·0.3334 s.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H, clearRT, makeRT } from '../engine/gl';
import { F, font, fitSize, measure, textPathCommands } from '../engine/type';
import { rgba } from '../engine/palette';
import { clamp, ease, hash, lerp, mulberry32, noise1, prog, pulse, smoothstep, springStep, frameIdx } from '../engine/util';
import { WORDS } from './words';

const P = 0.3334, G0 = 0.07;
const G = (k: number) => G0 + k * P;
const S = (sec: number) => G0 + sec; // mốc theo giây trên lưới (cứ 3 nhịp = 1 s)
const A = W / H;

/** Ảnh: tâm nhìn (x, y tính từ trên), độ phóng tối thiểu, có lớp tách nền không. */
const PH: Record<number, { x: number; y: number; z: number; cut?: boolean }> = {
  2: { x: 0.46, y: 0.25, z: 1.0, cut: true },
  3: { x: 0.32, y: 0.45, z: 1.35, cut: true },
  4: { x: 0.45, y: 0.36, z: 1.15, cut: true },
  5: { x: 0.5, y: 0.42, z: 1.05, cut: true },
  6: { x: 0.5, y: 0.45, z: 1.0 },
  7: { x: 0.4, y: 0.4, z: 1.0, cut: true },
  8: { x: 0.52, y: 0.43, z: 1.75 },
  9: { x: 0.42, y: 0.62, z: 1.05, cut: true },
  11: { x: 0.56, y: 0.48, z: 1.35 },
  12: { x: 0.45, y: 0.38, z: 1.15 },
  13: { x: 0.5, y: 0.52, z: 1.0, cut: true },
  14: { x: 0.52, y: 0.42, z: 1.08 },
  15: { x: 0.5, y: 0.55, z: 1.15 },
  16: { x: 0.58, y: 0.52, z: 1.1 },
};

/** Tâm mặt cho kiểu ba dải: x, y (từ trên), độ phóng tuyệt đối. */
const STRIP: Record<number, [number, number, number]> = { 7: [0.28, 0.40, 1.7], 5: [0.39, 0.38, 2.0], 4: [0.47, 0.38, 2.0], 2: [0.34, 0.26, 1.5], 8: [0.52, 0.42, 2.0], 13: [0.40, 0.52, 1.6], 3: [0.30, 0.42, 1.8], 11: [0.41, 0.48, 2.2], 12: [0.36, 0.38, 2.2], 9: [0.30, 0.60, 1.7] };
const STRIP_ORDER = [7, 2, 5, 13, 8, 4, 3, 12, 11, 9, 7, 5];

interface Shot { zoom?: number; dx?: number; dy?: number; rot?: number; chroma?: number; glitch?: number; blur?: number; mono?: number; bright?: number; depth?: number; warm?: number }

export default class Trailer extends Scene {
  text = new Layer2D();
  mtext = new Layer2D();
  tmp = makeRT();
  tex: Record<number, THREE.Texture> = {};
  cut: Record<number, THREE.Texture> = {};
  blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);

  photo = new FSPass(/* glsl */ `
    uniform sampler2D img, cutT; uniform float ia, zoom, rot, chroma, glitch, blur, mono, bright, depth, seed, warm;
    uniform vec2 focus; uniform bool hasCut;
    vec2 cover(vec2 v, float z) {
      vec2 p = (v - 0.5) * vec2(${A.toFixed(5)}, 1.0); p = rot2(rot) * p; p /= vec2(${A.toFixed(5)}, 1.0);
      vec2 span = ia > ${A.toFixed(5)} ? vec2(${A.toFixed(5)} / ia, 1.0) : vec2(1.0, ia / ${A.toFixed(5)});
      span /= z;
      vec2 f = clamp(focus, span * 0.5, 1.0 - span * 0.5);
      return f + p * span;
    }
    vec3 one(vec2 v, float lod) {
      vec3 c = textureLod(img, cover(v, zoom), lod).rgb;
      if (hasCut) {
        vec2 u = cover(v, zoom * (1.0 + depth));
        vec4 k = texture(cutT, u);
        if (u.x < 0.0 || u.y < 0.0 || u.x > 1.0 || u.y > 1.0) k.a = 0.0;
        c = mix(c * (1.0 - 0.35 * min(1.0, depth * 14.0)), k.rgb, smoothstep(0.35, 0.95, k.a));
      }
      return c;
    }
    void main() {
      vec2 v = vUv;
      if (glitch > 0.001) {
        float row = floor(v.y * 26.0); float h = hash12(vec2(row, seed));
        v.x += (h > 0.62 ? (hash12(vec2(row, seed + 7.0)) - 0.5) : 0.0) * glitch * 0.22;
      }
      float lod = hasCut ? depth * 45.0 : 0.0;
      vec2 d = (v - 0.5);
      vec3 c = vec3(0.0);
      const int N = 8;
      for (int i = 0; i < N; i++) {
        float s = 1.0 - blur * (float(i) / float(N - 1));
        vec2 q = 0.5 + d * s;
        vec2 o = d * chroma + vec2(chroma * 0.25, 0.0);
        c += vec3(one(q + o, lod).r, one(q, lod).g, one(q - o, lod).b);
      }
      c /= float(N);
      float l = luma(c);
      vec3 duo = mix(vec3(0.006, 0.008, 0.012), C_BONE * 0.95, smoothstep(0.0, 0.75, l));
      c = mix(c, duo, mono);
      // chỉnh màu điện ảnh: bóng hơi xanh, vùng sáng ấm
      c = mix(c, c * mix(vec3(0.82, 0.98, 1.12), vec3(1.14, 1.0, 0.82), smoothstep(0.02, 0.5, l)), 0.75);
      c = mix(c, c * vec3(1.35, 0.8, 0.45), warm);
      c = c * c * (3.0 - 2.0 * min(c, 1.0)) * 0.35 + c * 0.65;
      fragColor = vec4(min(c * bright, vec3(0.93)), 1.0);
    }`, {
    img: { value: null }, cutT: { value: null }, ia: { value: 1 }, zoom: { value: 1 }, rot: { value: 0 }, chroma: { value: 0 }, glitch: { value: 0 },
    blur: { value: 0 }, mono: { value: 0 }, bright: { value: 1 }, depth: { value: 0 }, seed: { value: 0 }, warm: { value: 0 }, focus: { value: new THREE.Vector2() }, hasCut: { value: false },
  });

  mask = new FSPass(/* glsl */ `uniform sampler2D img, txt; uniform vec3 bg;
    void main(){ float a = texture(txt, vUv).a; fragColor = vec4(mix(bg, max(texture(img, vUv).rgb * 1.5, vec3(0.42, 0.10, 0.02)), a), 1.0); }`,
    { img: { value: null }, txt: { value: null }, bg: { value: new THREE.Vector3(0.003, 0.003, 0.003) } });

  embers = new FSPass(/* glsl */ `
    uniform float t, amt, rush;
    void main() {
      vec3 c = vec3(0.0);
      for (int L = 0; L < 5; L++) {
        float f = float(L), sc = 4.0 + f * 3.2;
        vec2 p = (vUv - 0.5) * vec2(${A.toFixed(5)}, 1.0) * sc * (1.0 + rush * 0.1 * f);
        p.y -= t * (0.35 + 0.16 * f); p.x += sin(t * 0.3 + f * 2.1) * 0.35;
        vec2 id = floor(p); vec2 q = fract(p) - 0.5;
        vec2 h = hash22(id + f * 31.7);
        if (h.x < 0.5) {
          vec2 o = (hash22(id + 9.1 + f) - 0.5) * 0.6 + 0.12 * vec2(sin(t * 1.3 + h.y * 40.0), cos(t * 1.1 + h.x * 40.0));
          float d = length(q - o), r = mix(0.012, 0.05, h.y * h.y);
          float tw = 0.55 + 0.45 * sin(t * (2.0 + 5.0 * h.x) + h.y * 30.0);
          c += mix(C_SIGNAL, C_EMBER, h.y) * (smoothstep(r, r * 0.2, d) * 1.6 + 0.0035 / (d * d + 0.012) * smoothstep(0.35, 0.05, d)) * tw;
        }
      }
      fragColor = vec4(c * amt, 0.0);
    }`, { t: { value: 0 }, amt: { value: 1 }, rush: { value: 0 } }, { blending: THREE.AdditiveBlending, transparent: true });

  flame = new FSPass(/* glsl */ `
    uniform float t, on, blow, rise;
    void main() {
      vec2 p = (vUv - vec2(0.5, 0.40)) * vec2(${A.toFixed(5)}, 1.0);
      p.y += 0.01;
      vec2 q = p; float up = max(q.y, 0.0);
      q.x += (snoise(vec2(q.y * 5.0 - t * 1.6, t * 0.35)) * 0.018 + blow * 0.55) * smoothstep(0.0, 0.16, up) * (0.5 + up * 4.0);
      float hgt = 0.15 * (0.92 + 0.08 * snoise(vec2(t * 2.2, 3.0))) * mix(1.0, 0.45, blow);
      float yy = clamp(q.y / hgt, 0.0, 1.0);
      float w = 0.034 * sqrt(max(yy, 0.0)) * pow(1.0 - yy, 0.75) * 2.2;
      float d = abs(q.x) - w;
      float in0 = smoothstep(0.006, -0.012, d) * step(0.0, q.y) * step(q.y, hgt);
      vec3 hot = mix(vec3(0.25, 0.35, 1.0) * 0.5, mix(C_EMBER * 2.6, vec3(3.2, 2.5, 1.5), smoothstep(0.25, 0.7, yy)), smoothstep(0.02, 0.28, yy));
      vec3 c = hot * in0 * on;
      float g = length(p - vec2(0.0, 0.075));
      c += (C_EMBER * 0.030 / (g * g * 6.0 + 0.04) * 0.32 + C_SIGNAL * 0.05 * exp(-g * 3.0)) * on * (0.93 + 0.07 * snoise(vec2(t * 3.0, 1.0)));
      // thân nến và bấc
      float body = smoothstep(0.029, 0.026, abs(p.x)) * step(p.y, -0.012);
      float stripe = smoothstep(0.35, 0.5, abs(fract((p.y * 14.0 + p.x * 12.0)) - 0.5) * 2.0);
      vec3 wax = mix(C_BONE, C_SIGNAL * 0.9, stripe) * (0.10 + 0.9 * on * exp(-max(-p.y, 0.0) * 5.0)) * (0.55 + 0.45 * sqrt(max(0.0, 1.0 - p.x * p.x / 0.00085)));
      c = mix(c, wax * 0.62, body);
      c = mix(c, vec3(0.01) + C_SIGNAL * 1.4 * rise, smoothstep(0.004, 0.0025, abs(p.x)) * step(-0.014, p.y) * step(p.y, 0.012));
      // khói sau khi tắt
      if (rise > 0.0) {
        float n = snoise(vec2(p.x * 9.0 + snoise(vec2(p.y * 4.0 - t * 0.8, 2.0)) * 0.6, p.y * 4.0 - t * 0.9));
        c += C_BONE * 0.10 * rise * smoothstep(0.05 + p.y * 0.25, 0.0, abs(p.x + snoise(vec2(p.y * 5.0 - t, 1.0)) * 0.03)) * smoothstep(0.0, 0.04, p.y) * smoothstep(0.5, 0.05, p.y) * (0.5 + n);
      }
      fragColor = vec4(c, 1.0);
    }`, { t: { value: 0 }, on: { value: 1 }, blow: { value: 0 }, rise: { value: 0 } });

  // tia sáng sau tiêu đề
  rays = new FSPass(/* glsl */ `uniform float t, amt;
    void main(){ vec2 p = (vUv - vec2(0.5, 0.52)) * vec2(${A.toFixed(5)}, 1.0); float a = atan(p.y, p.x), r = length(p);
      float s = 0.5 + 0.5 * snoise(vec2(a * 7.0, t * 0.22)); s *= 0.5 + 0.5 * snoise(vec2(a * 19.0 + 4.0, -t * 0.15));
      vec3 c = mix(C_SIGNAL, C_EMBER, s) * pow(s, 2.0) * exp(-r * 1.9) * 0.9 + C_EMBER * 0.20 * exp(-r * r * 9.0);
      fragColor = vec4(c * amt + vec3(0.004, 0.003, 0.004), 1.0); }`, { t: { value: 0 }, amt: { value: 1 } });

  // ---- 3D ----
  cam = new THREE.PerspectiveCamera(42, A, 0.1, 200);
  hall = new THREE.Scene();
  wall = new THREE.Scene();
  title = new THREE.Scene();
  sparks = new THREE.Scene();
  tiles: THREE.Group[] = [];
  letters: THREE.Group[] = [];
  key = new THREE.PointLight(0xffd0a0, 34);
  sparkMat!: THREE.ShaderMaterial;

  override async init() {
    const load = async (url: string) => {
      const im = new Image(); im.src = url; await im.decode();
      const x = new THREE.Texture(im); x.colorSpace = THREE.SRGBColorSpace; x.generateMipmaps = true; x.minFilter = THREE.LinearMipmapLinearFilter; x.anisotropy = 8; x.needsUpdate = true;
      this.ctx.renderer.initTexture(x);
      return x;
    };
    this.blank.needsUpdate = true;
    await Promise.all(Object.entries(PH).map(async ([k, v]) => {
      const n = String(k).padStart(2, '0');
      this.tex[+k] = await load(`/assets/web/p${n}.jpg`);
      if (v.cut) this.cut[+k] = await load(`/assets/web/c${n}.webp`);
    }));
    this.buildHall(); this.buildWall(); this.buildTitle(); this.buildSparks();
  }

  private frame3D(id: number, h: number) {
    const tx = this.tex[id]!, im = tx.image as HTMLImageElement, w = Math.min((h * im.width) / im.height, h * 1.6);
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, color: 0xe2e2e2 }));
    const uv = m.geometry.attributes.uv as THREE.BufferAttribute; // cắt giữa, không méo
    const span = (w / h) / (im.width / im.height);
    if (span < 1) for (let i = 0; i < uv.count; i++) uv.setX(i, 0.5 + (uv.getX(i) - 0.5) * span);
    const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), new THREE.MeshBasicMaterial({ color: 0xd8d2c6, toneMapped: false }));
    b.position.z = -0.05;
    g.add(m, b);
    return g;
  }

  private buildHall() {
    this.hall.fog = new THREE.FogExp2(0x030303, 0.05);
    const ids = [2, 4, 12, 15, 7, 16, 13, 11, 5, 14, 3, 9, 6, 2, 4, 14];
    ids.forEach((id, i) => {
      const g = this.frame3D(id, 3.1), s = i % 2 ? 1 : -1;
      g.position.set(s * (3.1 + hash(i, 3) * 0.8), (hash(i, 5) - 0.5) * 1.6, -6 - i * 4.2);
      g.rotation.set(0, -s * 0.5, (hash(i, 9) - 0.5) * 0.12);
      this.hall.add(g);
    });
    const lm = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.5, 0.28, 0.04), toneMapped: false });
    for (const [x, y] of [[-5.4, -2.7], [5.4, -2.7], [-5.4, 3.1], [5.4, 3.1]] as const) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 160), lm); l.position.set(x, y, -70); this.hall.add(l);
    }
    for (let i = 0; i < 30; i++) for (const y of [-2.7, 3.1]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: 0x55504a, toneMapped: false })); l.position.set(0, y, -i * 4.5); this.hall.add(l);
    }
  }

  private buildWall() {
    const ids = [2, 4, 5, 3, 12, 7, 16, 11, 13, 15, 14, 9];
    ids.forEach((id, i) => {
      const o = new THREE.Group(), tx = this.tex[id]!, im = tx.image as HTMLImageElement, w = 2.9, h = 1.95;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, side: THREE.DoubleSide, color: 0xd6d6d6 }));
      const uv = m.geometry.attributes.uv as THREE.BufferAttribute, ia = im.width / im.height, a = w / h, p = PH[id]!;
      const sx = ia > a ? a / ia : 1, sy = ia > a ? 1 : ia / a;
      const cx = clamp(p.x, sx / 2, 1 - sx / 2), cy = clamp(1 - p.y, sy / 2, 1 - sy / 2);
      for (let k = 0; k < uv.count; k++) uv.setXY(k, cx + (uv.getX(k) - 0.5) * sx, cy + (uv.getY(k) - 0.5) * sy);
      o.add(m); o.position.set((i % 4 - 1.5) * 3.02, (1 - Math.floor(i / 4)) * 2.07, 0);
      this.tiles.push(o); this.wall.add(o);
    });
  }

  private buildTitle() {
    const pm = new THREE.PMREMGenerator(this.ctx.renderer);
    this.title.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    this.title.environmentIntensity = 1.5;
    const gold = new THREE.MeshStandardMaterial({ color: 0xffbe68, metalness: 1, roughness: 0.3, emissive: 0x3a1500 });
    const side = new THREE.MeshStandardMaterial({ color: 0x9a3b0c, metalness: 1, roughness: 0.4 });
    const fam = F.archivo(112, 900), size = 2.2;
    WORDS.a9.forEach((line, li) => {
      const px = 100, k = ((li ? 1.3 : 1) * size) / px, width = measure(line, fam, px) * k;
      const fit = Math.min(1, 10.6 / width);
      const chars = Array.from(line);
      chars.forEach((ch, i) => {
        if (ch === ' ') return;
        const x0 = measure(chars.slice(0, i + 1).join(''), fam, px) - measure(ch, fam, px);
        const sp = new THREE.ShapePath();
        for (const c of textPathCommands(ch, fam, px, 0, 0) as any[]) {
          if (c.type === 'M') sp.moveTo(c.x, -c.y);
          else if (c.type === 'L') sp.lineTo(c.x, -c.y);
          else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
          else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
          else if (c.type === 'Z') sp.currentPath?.closePath();
        }
        const geo = new THREE.ExtrudeGeometry(sp.toShapes(), { depth: 26, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.1, bevelSegments: 4, curveSegments: 14 });
        const m = new THREE.Mesh(geo, [gold, side]);
        const cw = measure(ch, fam, px);
        geo.translate(-cw / 2, -36, -13);
        const g = new THREE.Group(); g.add(m); g.scale.setScalar(k * fit);
        g.position.set((x0 + cw / 2) * k * fit - (width * fit) / 2, 0.78 - li * 2.65, 0);
        g.userData = { li, i };
        this.letters.push(g); this.title.add(g);
      });
    });
    this.title.add(this.key);
    const d = new THREE.DirectionalLight(0xffe2bd, 2.2); d.position.set(-2, 3, 8); this.title.add(d);
    const e = new THREE.PointLight(0xffc890, 14); e.position.set(0, -2.2, 6); this.title.add(e);
  }

  private buildSparks() {
    const n = 2600, rnd = mulberry32(7), dir = new Float32Array(n * 3), s = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), v = 3 + 16 * Math.pow(rnd(), 1.6);
      dir.set([r * Math.cos(a) * v * 1.4, r * Math.sin(a) * v, u * v * 0.8], i * 3);
      s.set([rnd(), rnd()], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dir, 3)); g.setAttribute('sd', new THREE.BufferAttribute(s, 2));
    this.sparkMat = new THREE.ShaderMaterial({
      uniforms: { lt: { value: 0 }, amt: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec2 sd; uniform float lt; varying float vA; varying float vH;
        void main(){ float k = 1.5 + sd.x; vec3 p = position * (1.0 - exp(-k * lt)) / k; p.y -= 0.55 * lt * lt * (0.4 + sd.y);
          p.x += sin(lt * 2.0 + sd.x * 40.0) * 0.12 * lt; vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vH = sd.y; vA = smoothstep(0.0, 0.03, lt) * exp(-lt * (0.35 + 1.1 * sd.x)); gl_PointSize = clamp((1.5 + 5.0 * sd.y * sd.y) * 13.0 / -mv.z, 1.0, 26.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float amt; varying float vA; varying float vH;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(mix(vec3(1.6,0.25,0.03), vec3(2.2,1.15,0.4), vH) * a * a * vA * amt, 0.0); }`,
    });
    const pts = new THREE.Points(g, this.sparkMat); pts.frustumCulled = false; this.sparks.add(pts);
  }

  // ---- dựng hình cơ bản ----
  private shot(id: number, out: THREE.WebGLRenderTarget, o: Shot, t: number) {
    const p = PH[id]!, tx = this.tex[id]!, im = tx.image as HTMLImageElement, u = this.photo.u;
    u.img!.value = tx; u.cutT!.value = this.cut[id] ?? this.blank; u.hasCut!.value = !!this.cut[id];
    u.ia!.value = im.width / im.height; u.zoom!.value = p.z * (o.zoom ?? 1.04); u.rot!.value = o.rot ?? 0;
    (u.focus!.value as THREE.Vector2).set(p.x + (o.dx ?? 0), 1 - p.y - (o.dy ?? 0));
    u.chroma!.value = o.chroma ?? 0; u.glitch!.value = o.glitch ?? 0; u.blur!.value = o.blur ?? 0; u.mono!.value = o.mono ?? 0;
    u.bright!.value = o.bright ?? 1; u.depth!.value = o.depth ?? 0; u.warm!.value = o.warm ?? 0; u.seed!.value = frameIdx(t) >> 1;
    this.photo.render(this.ctx.renderer, out);
  }

  private big(s: string, o: { lt: number; y?: number; max?: number; w?: number; color?: string; x?: number; align?: CanvasTextAlign; width?: number; track?: number; alpha?: number; punch?: number }) {
    const c = this.text.ctx, fam = F.archivo(o.width ?? 100, 900), size = fitSize(s, fam, o.w ?? 1640, o.max ?? 400);
    const k = 1 + (o.punch ?? 0.32) * Math.exp(-o.lt * 16) + 0.018 * o.lt;
    c.save(); c.globalAlpha = (o.alpha ?? 1) * clamp(o.lt * 40 + 0.35);
    c.translate(o.x ?? W / 2, o.y ?? H / 2); c.scale(k, k);
    c.font = font(fam, size); c.textAlign = o.align ?? 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = o.color ?? rgba('bone');
    c.fillText(s, 0, size * 0.35); c.restore();
    return size;
  }

  /** Xếp mỗi từ một dòng cho đầy khung (chữ lồng ảnh). */
  private stack(s: string, lt: number) {
    this.mtext.clear(); const c = this.mtext.ctx, ws = s.split(' '), fam = F.archivo(112, 900), n = ws.length, lh = Math.min(H * (n > 2 ? 0.84 : 0.94) / n, 470), k = 1 + 0.25 * Math.exp(-lt * 14) + 0.03 * lt;
    c.save(); c.translate(W / 2, H / 2); c.scale(k, k); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.fillStyle = '#fff';
    ws.forEach((w, i) => { const size = fitSize(w, fam, 1720, lh * 0.97); c.font = font(fam, size); c.fillText(w, 0, (i - (n - 1) / 2) * lh + lh * 0.39); });
    c.restore();
  }

  private serif(s: string, lt: number, dur: number, y = H * 0.84, size = 62, alpha = 1) {
    const c = this.text.ctx, fam = F.serif(600, true);
    const a = Math.min(smoothstep(0, 0.45, lt), 1 - smoothstep(dur - 0.35, dur, lt)) * alpha;
    if (a <= 0) return;
    c.save(); c.font = font(fam, size); c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.globalAlpha = a;
    c.letterSpacing = `${lerp(10, 2.5, ease.outCubic(clamp(lt / 1.6)))}px`;
    c.shadowColor = 'rgba(0,0,0,.85)'; c.shadowBlur = 22; c.fillStyle = rgba('bone'); c.fillText(s, W / 2, y); c.restore();
  }

  private bars(k: number) {
    if (k <= 0.001) return;
    const c = this.text.ctx, h = 132 * k; c.save(); c.fillStyle = '#000'; c.fillRect(0, 0, W, h); c.fillRect(0, H - h, W, h); c.restore();
  }

  private ember(out: THREE.WebGLRenderTarget, t: number, amt: number, rush = 0) {
    this.embers.u.t!.value = t; this.embers.u.amt!.value = amt; this.embers.u.rush!.value = rush; this.embers.render(this.ctx.renderer, out);
  }

  private burst(out: THREE.WebGLRenderTarget, lt: number, amt = 1) {
    if (lt < 0 || lt > 5) return;
    this.cam.position.set(0, 0, 11); this.cam.rotation.set(0, 0, 0); this.cam.fov = 42; this.cam.updateProjectionMatrix();
    this.sparkMat.uniforms.lt!.value = lt; this.sparkMat.uniforms.amt!.value = amt;
    this.ctx.renderer.setRenderTarget(out); this.ctx.renderer.render(this.sparks, this.cam);
  }

  private three(scene: THREE.Scene, out: THREE.WebGLRenderTarget, clear = true) {
    const r = this.ctx.renderer;
    if (clear) clearRT(r, out, [0.003, 0.003, 0.0035]);
    else { r.setRenderTarget(out); r.clear(false, true, false); }
    r.setRenderTarget(out); r.render(scene, this.cam);
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer: r, comp } = this.ctx, t = f.t, c = this.text.ctx;
    this.text.clear(); c.fillStyle = 'rgba(0,0,0,.01)'; c.fillRect(0, 0, 2, 2);
    const post: PostOverrides = { hud: 0, bloom: 0.6, grain: 0.06, ca: 1.6, vignette: 0.42, halation: 0.3 };
    const hits = [S(0), S(2), S(4), S(6), S(7), S(14), S(15), S(18), S(20), S(22), S(24), S(26), S(28), S(30), S(32), S(33), S(34), S(35), ...Array.from({ length: 16 }, (_, i) => S(36 + i)), S(52), S(55)];
    const big = new Set([S(0), S(14), S(18), S(26), S(36), S(44), S(55)]);
    let sh = 0, fl = 0, zm = 0;
    for (const h of hits) if (t >= h && t - h < 1) {
      const k = big.has(h) ? 1 : 0.45, q = pulse(t, h, 0.07);
      sh = Math.max(sh, q * k); zm = Math.max(zm, pulse(t, h, 0.1) * k);
      if (big.has(h)) fl = Math.max(fl, t - h < 0.2 ? pulse(t, h, 0.03) * 0.5 * (1 - (t - h) / 0.2) : 0);
    }
    const fi = frameIdx(t);
    post.shake = [(hash(fi, 1) - 0.5) * 34 * sh, (hash(fi, 2) - 0.5) * 26 * sh];
    post.zoom = 1 + 0.05 * zm; post.flash = fl; post.ca = 1.6 + 9 * sh;

    if (t < S(8)) this.act1(t, out);
    else if (t < S(16)) this.act2(t, out, post);
    else if (t < S(18)) this.actCandle(t, S(16), S(18), WORDS.a3, out, post, false);
    else if (t < S(26)) this.act4(t, out);
    else if (t < S(32)) this.act5(t, out);
    else if (t < S(36)) this.act6(t, out);
    else if (t < S(52)) this.act7(t, out, post);
    else if (t < S(55)) this.actCandle(t, S(52), S(55), WORDS.a8, out, post, true);
    else this.act9(t, out, post);

    comp.draw(r, this.text.upload(), out);
    if (t > 58.2) post.fade = smoothstep(58.2, 59.4, t);
    return post;
  }

  // 0–8: bốn cú đập trong bóng tối
  private act1(t: number, out: THREE.WebGLRenderTarget) {
    const i = Math.min(3, Math.floor((t - G0) / 2 + 1e-6)), lt = t - S(Math.max(0, i) * 2);
    const ids = [9, 8, 4, 14];
    if (t < G0) { clearRT(this.ctx.renderer, out, [0, 0, 0]); return; }
    // nhịp 1/3 s: lát ảnh loé lên rồi tối dần
    const k = Math.floor((t - G0) / P + 1e-6), tl = t - G(k), main = k % 6 === 0;
    const glow = main ? 1 : 0.34 * (1 - (k % 6) * 0.1);
    this.shot(ids[i]!, out, { zoom: 1.28 - 0.08 * lt + (k % 6) * 0.05, dx: (hash(k, 4) - 0.5) * 0.16, dy: (hash(k, 6) - 0.5) * 0.08, mono: 1, bright: 0.85 * glow * Math.exp(-tl * (main ? 2.6 : 7)) + 0.025, chroma: 0.02 * Math.exp(-tl * 12), glitch: main ? Math.exp(-tl * 14) : 0.25 * Math.exp(-tl * 20), depth: 0.04 }, t);
    this.ember(out, t, 0.28 + 0.1 * i);
    this.bars(1);
    this.shade(); this.big(WORDS.a1[i]!, { lt, max: 190, w: 1500, y: H * 0.745, alpha: 1 - smoothstep(1.45, 1.8, lt), punch: 0.5 }); this.bars(1);
  }

  // 8–16: hoàng hôn, đẩy máy chậm
  private act2(t: number, out: THREE.WebGLRenderTarget, post: PostOverrides) {
    const lt = t - S(8), after = t >= S(14), q = after ? t - S(14) : 0;
    if (!after) {
      this.shot(9, out, { zoom: 1.0 + 0.045 * lt, dx: 0.1 - 0.012 * lt, dy: -0.06 + 0.008 * lt, depth: 0.012 + 0.006 * lt, bright: 0.25 + 0.75 * smoothstep(0, 2.2, lt), rot: 0.004 * lt }, t);
      this.ember(out, t, 0.2 + 0.05 * lt);
      this.bars(1);
      for (let i = 0; i < 3; i++) this.serif(WORDS.a2[i]!, lt - i * 2, 1.95, H * 0.80, 84);
    } else {
      const n = Math.floor(q / P + 1e-6), tl = q - n * P, ids = [7, 5, 4, 13, 16, 12];
      this.shot(ids[n % 6]!, out, { zoom: 1.22 - 0.2 * tl + n * 0.02, chroma: 0.03 * Math.exp(-tl * 9), blur: 0.10 * Math.exp(-tl * 8), depth: 0.025, bright: 0.9 }, t);
      this.burst(out, q, 0.8);
      this.bars(1);
      this.shade(); this.big(WORDS.a2[3]!, { lt: q, max: 190, w: 1500, y: H * 0.765 }); this.bars(1);
      post.zoom = (post.zoom ?? 1) + 0.16 * ease.inCubic(clamp(q / 2));
    }
  }

  // 16–18 và 52–55: im lặng, một ngọn nến
  private actCandle(t: number, a: number, b: number, s: string, out: THREE.WebGLRenderTarget, post: PostOverrides, blowOut: boolean) {
    const lt = t - a, u = this.flame.u, off = b - 0.75;
    u.t!.value = t; u.on!.value = smoothstep(0.02, 0.3, lt) * (blowOut ? 1 - smoothstep(off, off + 0.12, t) : 1);
    u.blow!.value = blowOut ? smoothstep(off - 0.28, off + 0.02, t) : 0; u.rise!.value = blowOut ? smoothstep(off, off + 0.15, t) : 0;
    this.flame.render(this.ctx.renderer, out);
    this.bars(1);
    this.serif(s, lt - 0.15, (blowOut ? off - a : b - a) - 0.1, H * 0.235, 96);
    post.zoom = 1 + 0.02 * lt; post.grain = 0.045;
    if (!blowOut) post.exposure = 1 + 1.6 * ease.inExpo(clamp((t - (b - 0.5)) / 0.5));
  }

  // 18–26: chớp giật, mỗi từ hai nhịp
  private act4(t: number, out: THREE.WebGLRenderTarget) {
    const k = Math.floor((t - S(18)) / P + 1e-6), w = Math.floor(k / 2), lt = t - S(18) - w * 2 * P, tl = t - S(18) - k * P;
    const order = WORDS.a4img;
    const s = WORDS.a4[w]!, kind = w % 4;
    if (kind === 2 && k % 2 === 0) { // chữ kín khung trên nền giấy, đảo sang nền mực
      const inv = tl > P / 2;
      clearRT(this.ctx.renderer, out, inv ? [0.003, 0.003, 0.0035] : [0.82, 0.78, 0.70]);
      this.big(s, { lt, max: 430, w: 1760, color: inv ? rgba('bone') : rgba('ink'), width: 87 });
    } else if (kind === 3 && w < 11) { // ảnh lồng trong chữ
      this.shot(order[k]!, this.tmp, { zoom: 1.2 - 0.2 * tl, bright: 1.15, depth: 0.02 }, t);
      this.stack(s, lt);
      this.mask.u.img!.value = this.tmp.texture; this.mask.u.txt!.value = this.mtext.upload(); this.mask.render(this.ctx.renderer, out);
    } else {
      const dir = k % 2 ? 1 : -1;
      this.shot(order[k]!, out, { zoom: 1.28 - 0.5 * tl, dx: dir * 0.03 * Math.exp(-tl * 10), rot: dir * 0.03 * Math.exp(-tl * 9), chroma: 0.035 * Math.exp(-tl * 10), blur: 0.16 * Math.exp(-tl * 11), glitch: k % 5 === 0 ? Math.exp(-tl * 12) : 0, depth: 0.03, mono: k % 6 === 4 ? 1 : 0, bright: 0.92 }, t);
      this.ember(out, t, 0.25);
      this.shade();
      this.big(s, { lt, max: 230, w: 1300, y: H * 0.80, x: 110, align: 'left', color: rgba('bone') });
      const c = this.text.ctx; c.fillStyle = rgba('signal'); c.fillRect(112, H * 0.905, 420 * ease.outExpo(clamp(lt / 0.4)), 10);
    }
  }

  /** Dải tối mềm dưới chữ để luôn đọc được trên ảnh sáng. */
  private shade() {
    const c = this.text.ctx, g = c.createLinearGradient(0, H * 0.5, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.78)'); c.fillStyle = g; c.fillRect(0, H * 0.5, W, H * 0.5);
  }

  // 26–32: bay qua hành lang ảnh 3D
  private act5(t: number, out: THREE.WebGLRenderTarget) {
    const lt = t - S(26);
    let z = 0; for (let i = 0; i < 3; i++) { const q = lt - i * 2; if (q > 0) z += 13 * ease.outExpo(clamp(q / 1.9)) + 1.2 * Math.min(q, 2); }
    this.cam.fov = 50 + 16 * Math.max(pulse(t, S(26), 0.2), pulse(t, S(28), 0.2), pulse(t, S(30), 0.2)); this.cam.updateProjectionMatrix();
    this.cam.position.set(Math.sin(lt * 0.8) * 0.5, noise1(lt * 0.5, 4) * 0.25, 2 - z);
    this.cam.rotation.set(0, Math.sin(lt * 0.7) * 0.06, Math.sin(lt * 0.9) * 0.035);
    this.three(this.hall, out);
    this.ember(out, t, 0.4, 1);
    this.shade(); this.bars(1);
    for (let i = 0; i < 3; i++) this.serif(WORDS.a5[i]!, lt - i * 2, 1.95, H * 0.80, 96);
  }

  // 32–36: bức tường ảnh lật lên theo từng nhịp
  private act6(t: number, out: THREE.WebGLRenderTarget) {
    const lt = t - S(32);
    this.tiles.forEach((g, i) => { const on = lt - i * P * 0.92; g.visible = on > 0; g.rotation.y = -Math.PI * 0.5 * (1 - springStep(Math.max(0, on), 1.7, 0.45)); g.position.z = 1.4 * (1 - ease.outCubic(clamp(on / 0.5))); });
    this.cam.fov = 42; this.cam.updateProjectionMatrix();
    const k = ease.inOutCubic(clamp(lt / 3.6)), rush = ease.inExpo(clamp((lt - 3.2) / 0.8));
    this.cam.position.set(lerp(-3.4, 0, k), lerp(1.3, 0, k), lerp(6.4, 9.0, k) - 6.5 * rush); this.cam.rotation.set(0, lerp(-0.16, 0, k), lerp(0.05, 0, k) + 0.25 * rush);
    this.three(this.wall, out);
    this.ember(out, t, 0.3);
    const j = lt < 2 ? 0 : 1, q = lt - j * 2;
    c_dim(this.text.ctx, 0.5);
    this.big(WORDS.a6[j]!, { lt: q, max: 270, w: 1660, alpha: 1 - smoothstep(1.7, 1.95, q) });
  }

  // 36–52: cao trào, mỗi giây một cụm, bốn kiểu dựng xoay vòng
  private act7(t: number, out: THREE.WebGLRenderTarget, post: PostOverrides) {
    const lt0 = t - S(36), w = Math.min(15, Math.floor(lt0 + 1e-6)), lt = lt0 - w, k = Math.min(2, Math.floor(lt / P + 1e-6)), tl = lt - k * P, s = WORDS.a7[w]!;
    const order = [14, 7, 4, 5, 2, 16, 13, 12, 3, 11, 15, 9, 8, 14, 16, 7, 5, 13, 4, 12], pick = (n: number) => order[(w * 3 + n) % order.length]!;
    const kind = w % 4;
    if (kind === 0) { // đập chữ đảo màu rồi ảnh
      if (k === 0) {
        const inv = tl > P * 0.5;
        clearRT(this.ctx.renderer, out, inv ? [0.003, 0.003, 0.0035] : w % 8 === 0 ? [1.0, 0.074, 0.006] : [0.82, 0.78, 0.70]);
        this.big(s, { lt, max: 440, w: 1760, color: inv ? rgba('bone') : rgba('ink') });
      } else {
        this.shot(pick(k), out, { zoom: 1.2 - 0.28 * tl, chroma: 0.025 * Math.exp(-tl * 10), blur: 0.12 * Math.exp(-tl * 10), depth: 0.035, bright: 0.95 }, t);
        this.burst(out, lt, 0.7); this.shade();
        this.big(s, { lt: lt - P, max: 250, w: 1640, y: H * 0.80, punch: 0.1 });
      }
    } else if (kind === 1) { // ba dải ảnh trượt vào theo ba nhịp
      clearRT(this.ctx.renderer, out, [0.003, 0.003, 0.0035]);
      for (let n = 0; n <= k; n++) {
        const q = lt - n * P, off = (1 - ease.outExpo(clamp(q / 0.28))) * (n % 2 ? -1 : 1);
        const sid = STRIP_ORDER[((w >> 2) * 3 + n) % STRIP_ORDER.length]!, sp = STRIP[sid]!, ph = PH[sid]!;
        this.shot(sid, this.tmp, { zoom: (sp[2] + 0.06 * q) / ph.z, dx: sp[0] - ph.x, dy: sp[1] - ph.y, bright: 0.95, depth: 0.015 }, t);
        const y0 = n / 3, r = this.ctx.renderer;
        r.setRenderTarget(out); r.setScissorTest(true);
        out.scissorTest = true; out.scissor.set(Math.round((n * out.width) / 3 + 3), 0, Math.round(out.width / 3 - 6), out.height);
        this.ctx.comp.draw(r, this.tmp.texture, out, { offset: [(1 / 3 - y0) * 1, off * 0.9], premult: false });
        out.scissorTest = false; r.setScissorTest(false); out.scissor.set(0, 0, out.width, out.height);
      }
      this.shade();
      this.big(s, { lt, max: 250, w: 1640, y: H * 0.82 });
    } else if (kind === 2) { // ảnh trong chữ, phóng xuyên
      this.shot([14, 16, 15, 12][(w >> 2) % 4]!, this.tmp, { zoom: 1.05 + 0.12 * k, bright: 1.2 }, t);
      this.stack(s, lt);
      this.mask.u.img!.value = this.tmp.texture; this.mask.u.txt!.value = this.mtext.upload(); this.mask.render(this.ctx.renderer, out);
      this.burst(out, lt, 0.5);
    } else { // 2.5D: người nổi khỏi nền
      const solo = [5, 7, 9, 13][(w >> 2) % 4]!;
      this.shot(solo, out, { zoom: 1.0 + 0.06 * lt, depth: 0.02 + 0.05 * ease.outCubic(lt), chroma: 0.03 * Math.exp(-lt * 9), blur: 0.14 * Math.exp(-lt * 9), bright: 0.95, glitch: k > 0 ? 0.5 * Math.exp(-tl * 18) : 0 }, t);
      this.ember(out, t, 0.5, 1); this.shade();
      this.big(s, { lt, max: 260, w: 1640, y: H * 0.82 });
    }
    post.bloom = 0.7;
  }

  // 55–59.5: tiêu đề vàng 3D
  private act9(t: number, out: THREE.WebGLRenderTarget, post: PostOverrides) {
    const lt = t - S(55);
    this.rays.u.t!.value = t; this.rays.u.amt!.value = 0.35 + 0.9 * Math.exp(-lt * 1.2); this.rays.render(this.ctx.renderer, out);
    this.letters.forEach((g, n) => {
      const q = Math.max(0, lt - n * 0.018), s = springStep(q + 0.04, 2.0, 0.5);
      g.rotation.set(0, (1 - s) * (n % 2 ? 1.3 : -1.3) + Math.sin(lt * 0.9 + n * 0.25) * 0.05, 0);
      g.position.z = (1 - ease.outExpo(clamp(q / 0.7))) * 7;
    });
    this.cam.fov = 42; this.cam.updateProjectionMatrix();
    this.cam.position.set(lerp(-1.3, 0.9, clamp(lt / 4.4)), 0.35, 12.0 - 0.28 * lt); this.cam.lookAt(0, -0.35, 0);
    this.key.position.set(lerp(-9, 9, clamp(lt / 3.2)), 2.5, 5);
    this.three(this.title, out, false);
    this.burst(out, lt, 1.3);
    this.ember(out, t, 0.5);
    post.bloom = 0.5; post.vignette = 0.5;
  }
}

function c_dim(c: CanvasRenderingContext2D, a: number) { c.save(); c.fillStyle = `rgba(0,0,0,${a})`; c.fillRect(0, 0, W, H); c.restore(); }
