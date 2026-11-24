// p09-finale: "Bởi những điều tuyệt vời nhất…" → mọi thứ thu về đốm cam → im lặng, chân trời rất xa →
// ĐẬP CUỐI: CHÚC MỪNG SINH NHẬT (chữ 3D vàng) → đập phụ: CẬU HƯNG → "Với tất cả tình yêu thương…" → chỉ còn đốm cam.
// Mọi thứ là hàm thuần của t. Xem docs/04-STORYBOARD-TRAILER-v2.md (T 59..hết) và cues.ts.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H, clearRT, makeRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, measure, textPathCommands } from '../../engine/type';
import { clamp, ease, hash, lerp, mulberry32, prog, smoothstep, springStep } from '../../engine/util';
import { A, BASE_POST, INK, LIN, Spark, additive, hitPost, serifLine, typeLine } from './kit';
import { S, FINAL_HIT, DURATION, TEXT } from './cues';

const T0 = S(59);                 // bắt đầu plate (61.083)
const SIL = 63.6;                 // nhạc tắt hẳn
const LINE_B_IN = S(TEXT.p09.b.T) + 0.6; // "Vẫn còn đang chờ…": mốc 63.69, hiện sau khi dòng "Bởi…" đã đọc đủ
const P08_SPARK_X = 830;          // đốm cam ở khung cuối của p08 (điểm tụ lệch trái)
const INHALE = 66.3;              // hít vào trước cú đập
const HIT = FINAL_HIT;            // 67.083
const HIT2 = TEXT.p09.name.F;     // 68.083
const FAM = TEXT.p09.family.F;    // 69.0

// bố cục cuối (px logic): tiêu đề, tên, câu gia đình, vạch chân trời còn lại
const Y_TITLE = 352, Y_NAME = 600, Y_FAM = 836, Y_RULE = 912;
const CAM_Z = 14, FOV = 35;
const PXW = (2 * CAM_Z * Math.tan((FOV / 2) * Math.PI / 180)) / H; // đơn vị thế giới trên 1 px ở z = 0
const wy = (y: number) => (H / 2 - y) * PXW;

type Word = { g: THREE.Group; letters: THREE.Group[]; gold: THREE.MeshStandardMaterial; side: THREE.MeshStandardMaterial; capPx: number; edges: number[][][] };

export default class Plate extends Scene {
  text = new Layer2D();
  spark = new Spark();
  lines = new LineBatch(12000, { screen2D: false, blend: 'add' });
  cam = new THREE.PerspectiveCamera(60, A, 0.05, 400);
  tcam = new THREE.PerspectiveCamera(FOV, A, 0.1, 200);
  title3 = new THREE.Scene();
  burstScene = new THREE.Scene();
  burstMat!: THREE.ShaderMaterial;
  burstPts!: THREE.Points;
  titleRT = makeRT(W, H, { samples: 4 });
  title!: Word;
  name!: Word;
  key = new THREE.PointLight(0xffd6a8, 60, 0, 1.6);
  fill = new THREE.DirectionalLight(0xffe2bd, 1.6);
  under = new THREE.PointLight(0xff6a20, 18, 0, 1.4);

  /** Một vạch sáng ngang: lõi mảnh + quầng cam, mờ dần về hai đầu. Dùng cho khe sáng và chân trời. */
  hline = additive(new FSPass(/* glsl */ `
    uniform vec2 c; uniform float len, th, amt, halo, hot;
    void main() {
      vec2 d = vec2(vUv.x * ${W}.0, (1.0 - vUv.y) * ${H}.0) - c;
      float along = exp(-pow(abs(d.x) / max(len, 1.0), 2.2));
      float core = exp(-(d.y / th) * (d.y / th));
      float near = exp(-abs(d.x) / (len * 0.18 + 40.0));
      vec3 col = mix(C_BONE * 0.9, vec3(2.2, 1.5, 1.0), near * hot) * core;
      col += mix(C_SIGNAL, C_EMBER, near) * (exp(-abs(d.y) / halo) * 0.16 + exp(-abs(d.y) / (halo * 6.0)) * 0.05) * (0.35 + near * hot);
      fragColor = vec4(col * along * amt, 0.0);
    }`, { c: { value: new THREE.Vector2(W / 2, H / 2) }, len: { value: 800 }, th: { value: 1 }, amt: { value: 1 }, halo: { value: 6 }, hot: { value: 1 } }, { blending: THREE.CustomBlending, transparent: true }));

  /** Tia sáng sau tiêu đề (từ trailer v1), có tâm, cộng thuần. */
  rays = additive(new FSPass(/* glsl */ `
    uniform float t, amt; uniform vec2 c;
    void main() {
      vec2 p = (vUv - vec2(c.x, 1.0 - c.y)) * vec2(${A.toFixed(5)}, 1.0); float a = atan(p.y, p.x), r = length(p);
      float s = 0.5 + 0.5 * snoise(vec2(a * 7.0, t * 0.22)); s *= 0.5 + 0.5 * snoise(vec2(a * 19.0 + 4.0, -t * 0.15));
      vec3 col = mix(C_SIGNAL, C_EMBER, s) * pow(s, 3.0) * exp(-r * 2.8) * 0.9 + C_SIGNAL * 0.16 * exp(-r * r * 10.0);
      col *= smoothstep(0.0, 0.05, r);
      fragColor = vec4(col * amt, 0.0);
    }`, { t: { value: 0 }, amt: { value: 1 }, c: { value: new THREE.Vector2(0.5, 0.5) } }, { blending: THREE.CustomBlending, transparent: true }));

  override init() {
    const pm = new THREE.PMREMGenerator(this.ctx.renderer);
    this.title3.environment = pm.fromScene(studio(), 0.02).texture;
    pm.dispose();
    this.title = this.word(TEXT.p09.title.big, F.archivo(112, 700), 1180, 112, 14);
    this.name = this.word(TEXT.p09.name.big, F.archivo(125, 900), 1500, 228, 4);
    this.title3.add(this.title.g, this.name.g, this.key, this.fill, this.under);
    this.fill.position.set(-3, 4, 9);
    this.buildBurst();
  }

  /** Chữ 3D đùn khối từ đường viền opentype (giữ đủ dấu tiếng Việt), mỗi ký tự một nhóm để đập riêng. */
  private word(s: string, fam: string, maxPx: number, capMax: number, trackEm: number): Word {
    const px = 100, cap = 72, depth = 6; // Archivo: chữ hoa cao ~0.72 em; đùn nông như một tấm kim loại khắc
    const chars = Array.from(s), wPx = measure(s, fam, px, trackEm);
    const k = Math.min(maxPx / wPx, capMax / cap) * PXW; // px font → thế giới
    const capPx = (cap * k) / PXW, hatch = (3.4 * cap) / capPx; // nét khắc cách nhau ~3.4 px trên màn hình
    const gold = new THREE.MeshStandardMaterial({ color: 0xf4dcae, metalness: 0.9, roughness: 0.36, emissive: 0xff7a30, emissiveIntensity: 0 });
    const side = new THREE.MeshStandardMaterial({ color: 0x5a3414, metalness: 1, roughness: 0.45, emissive: 0xff5a18, emissiveIntensity: 0 });
    // mặt vàng nhạt, chuyển sắc rất nhẹ theo chiều cao, phủ nét khắc ngang mảnh (ngôn ngữ "khắc bản" của phim)
    gold.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vGy;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGy = position.y;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGy;')
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );',
          `float hu = vGy / ${hatch.toFixed(3)}; float hw = fwidth(hu);` +
          'float hl = (1.0 - smoothstep(0.12 - hw, 0.12 + hw, abs(fract(hu) - 0.5))) * (1.0 - smoothstep(0.25, 0.6, hw));' +
          'vec3 gg = mix(vec3(0.74, 0.6, 0.42), vec3(1.06, 1.0, 0.9), smoothstep(-40.0, 44.0, vGy)) * (1.0 - 0.2 * hl);' +
          'vec4 diffuseColor = vec4( diffuse * gg, opacity );');
    };
    const g = new THREE.Group(), letters: THREE.Group[] = [], edges: number[][][] = [];
    chars.forEach((ch, i) => {
      if (ch === ' ') return;
      const x0 = measure(chars.slice(0, i + 1).join(''), fam, px) - measure(ch, fam, px) + i * trackEm, cw = measure(ch, fam, px);
      const sp = new THREE.ShapePath();
      for (const c of textPathCommands(ch, fam, px, 0, 0) as any[]) {
        if (c.type === 'M') sp.moveTo(c.x, -c.y);
        else if (c.type === 'L') sp.lineTo(c.x, -c.y);
        else if (c.type === 'Q') sp.quadraticCurveTo(c.x1, -c.y1, c.x, -c.y);
        else if (c.type === 'C') sp.bezierCurveTo(c.x1, -c.y1, c.x2, -c.y2, c.x, -c.y);
        else if (c.type === 'Z') sp.currentPath?.closePath();
      }
      const shapes = sp.toShapes();
      const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.35, bevelSegments: 1, curveSegments: 12 });
      geo.translate(-cw / 2, -cap / 2, -depth / 2);
      // đường viền mặt trước (toạ độ cục bộ của ký tự) cho nét chỉ sáng
      const loops: number[][] = [];
      for (const sh of shapes) {
        const ex = sh.extractPoints(10);
        for (const pts of [ex.shape, ...ex.holes]) {
          const a: number[] = [];
          for (const q of pts) a.push(q.x - cw / 2, q.y - cap / 2);
          loops.push(a);
        }
      }
      const m = new THREE.Mesh(geo, [gold, side]);
      const lg = new THREE.Group(); lg.add(m); lg.scale.setScalar(k);
      lg.userData = { x: (x0 + cw / 2 - wPx / 2) * k, i, n: chars.length, front: depth / 2 + 0.5 };
      lg.position.x = lg.userData.x;
      letters.push(lg); g.add(lg); edges.push(loops);
    });
    return { g, letters, gold, side, capPx, edges };
  }

  /** Nét chỉ sáng chạy theo mép mặt chữ (đường khắc), vẽ cộng lên lớp chữ. */
  private outline(w: Word, gain: number) {
    if (gain <= 0.001 || !w.g.visible) return;
    const L = this.lines, v = new THREE.Vector3(), u = new THREE.Vector3();
    w.letters.forEach((lg, n) => {
      if (!lg.visible) return;
      const mw = lg.matrixWorld, z = lg.userData.front as number;
      for (const a of w.edges[n]!) {
        const m = a.length / 2;
        for (let i = 0; i < m; i++) {
          const j = (i + 1) % m;
          v.set(a[i * 2]!, a[i * 2 + 1]!, z).applyMatrix4(mw); u.set(a[j * 2]!, a[j * 2 + 1]!, z).applyMatrix4(mw);
          L.seg(v.x, v.y, v.z, u.x, u.y, u.z, 1.1, 1.7 * gain, 1.38 * gain, 0.95 * gain, 1);
        }
      }
    });
  }

  private buildBurst() {
    const n = 2400, rnd = mulberry32(19), dir = new Float32Array(n * 3), s = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u), v = 3 + 15 * Math.pow(rnd(), 1.7);
      dir.set([r * Math.cos(a) * v * 1.45, r * Math.sin(a) * v * 0.8, u * v * 0.7], i * 3);
      s.set([rnd(), rnd()], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(dir, 3)); g.setAttribute('sd', new THREE.BufferAttribute(s, 2));
    this.burstMat = new THREE.ShaderMaterial({
      uniforms: { lt: { value: 0 }, amt: { value: 1 } }, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec2 sd; uniform float lt; varying float vA; varying float vH;
        void main(){ float k = 1.6 + sd.x * 1.4; vec3 p = position * (1.0 - exp(-k * lt)) / k; p.y -= 0.5 * lt * lt * (0.3 + sd.y);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vH = sd.y; vA = smoothstep(0.02, 0.1, lt) * exp(-lt * (0.5 + 1.3 * sd.x)); gl_PointSize = clamp((1.2 + 4.0 * sd.y * sd.y) * 12.0 / -mv.z, 1.0, 20.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float amt; varying float vA; varying float vH;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(mix(vec3(1.6,0.22,0.03), vec3(2.4,1.3,0.5), vH) * a * a * vA * amt, 0.0); }`,
    });
    this.burstPts = new THREE.Points(g, this.burstMat); this.burstPts.frustumCulled = false; this.burstScene.add(this.burstPts);
  }

  private burst(out: THREE.WebGLRenderTarget, lt: number, amt: number, x: number, y: number) {
    if (lt < 0 || lt > 4 || amt <= 0) return;
    this.burstPts.position.set(x, y, 0.5);
    this.burstMat.uniforms.lt!.value = lt; this.burstMat.uniforms.amt!.value = amt;
    this.ctx.renderer.setRenderTarget(out); this.ctx.renderer.render(this.burstScene, this.tcam);
  }

  private hl(out: THREE.WebGLRenderTarget, y: number, len: number, th: number, amt: number, halo = 6, hot = 1, x = W / 2) {
    if (amt <= 0.001) return;
    const u = this.hline.u; (u.c!.value as THREE.Vector2).set(x, y);
    u.len!.value = len; u.th!.value = th; u.amt!.value = amt; u.halo!.value = halo; u.hot!.value = hot;
    this.hline.render(this.ctx.renderer, out);
  }

  // ------------------------------------------------------------------ B: chân trời rất xa
  private horizon(t: number, out: THREE.WebGLRenderTarget) {
    const inh = prog(t, INHALE, HIT, ease.inCubic);
    const gridA = smoothstep(63.9, 65.4, t) * (1 - 0.5 * inh) * (t < HIT ? 1 : 0);
    if (gridA > 0.002) {
      const L = this.lines, bone = LIN.bone, sig = LIN.signal;
      const zc = -0.42 * (t - SIL) - 3.2 * inh;   // máy quay trôi chậm, rồi lao nhẹ khi hít vào
      this.cam.fov = 50; this.cam.updateProjectionMatrix();
      this.cam.position.set(0, 1.5, zc); this.cam.rotation.set(0, 0, 0);
      L.clear();
      const far = 30, sp = 1.6;
      // vạch ngang (song song chân trời)
      const k0 = Math.ceil(-(zc - 0.4) / sp);
      for (let k = k0; k < k0 + 60; k++) {
        const z = -k * sp, d = zc - z, a = Math.pow(smoothstep(far, 2, d), 2.6) * smoothstep(0.5, 3.0, d) * gridA;
        if (a <= 0.003) continue;
        const I = 0.3;
        L.seg(-60, 0, z, 60, 0, z, 1.0, bone[0] * I, bone[1] * I, bone[2] * I, a);
      }
      // vạch dọc: hội tụ đúng vào đốm cam trên chân trời
      for (let i = -18; i <= 18; i++) {
        const x = i * sp, I = i === 0 ? 1.4 : 0.38, c = i === 0 ? sig : bone;
        for (let s = 0; s < 36; s++) {
          const za = zc - 0.6 - s * 2.5, zb = za - 2.5, d = zc - za;
          const a = Math.pow(smoothstep(far * 1.3, 2, d), 2.0) * gridA * (i === 0 ? 0.55 * smoothstep(3, 14, d) : 0.75);
          if (a <= 0.003) continue;
          L.seg(x, 0, za, x, 0, zb, 1.0, c[0] * I, c[1] * I, c[2] * I, a);
        }
      }
      L.render(this.ctx.renderer, out, this.cam);
    }
  }

  // ------------------------------------------------------------------ C/D: tiêu đề vàng
  private titles(t: number, out: THREE.WebGLRenderTarget, dim: number) {
    const r = this.ctx.renderer, lt = t - HIT, lt2 = t - HIT2;
    const up = prog(t, HIT2, HIT2 + 0.42, ease.outExpo);
    // máy quay: lùi sát rồi đẩy vào rất chậm, lệch nhẹ để mặt vàng bắt sáng
    this.tcam.fov = FOV; this.tcam.updateProjectionMatrix();
    this.tcam.position.set(Math.sin(lt * 0.35) * 0.35, 0.06 + Math.sin(lt * 0.27) * 0.05, CAM_Z + 0.9 * Math.exp(-lt * 3.2) - 0.07 * lt);
    this.tcam.lookAt(0, 0, 0);

    // CHÚC MỪNG SINH NHẬT: từng chữ lao từ phía máy quay vào, từ giữa ra hai bên
    const T = this.title, tn = T.letters.length;
    T.g.position.y = lerp(0, wy(Y_TITLE), up);
    T.g.scale.setScalar(lerp(1.4, 1, up));
    T.letters.forEach((g, n) => {
      const i = g.userData.i as number, m = g.userData.n as number;
      const order = Math.abs(i - (m - 1) / 2), q = lt - order * 0.014;
      const land = ease.outExpo(clamp(q / 0.24));
      const s = springStep(Math.max(0, q - 0.12), 3.2, 0.42);
      g.position.z = (1 - land) * 9;
      g.position.y = (1 - land) * (hash(n, 3) - 0.5) * 2.4;
      g.position.x = g.userData.x * (1 + (1 - land) * 0.6);
      g.rotation.set((1 - s) * 0.45 * (hash(n, 5) - 0.5), (1 - s) * (n % 2 ? 0.9 : -0.9) + Math.sin(lt * 0.8 + n * 0.4) * 0.03, (1 - land) * (hash(n, 7) - 0.5) * 0.8);
      g.visible = q > 0;
    });
    // CẬU HƯNG: đập phụ, rơi từ trên xuống, nặng
    const N = this.name;
    N.g.position.y = wy(Y_NAME);
    N.letters.forEach((g, n) => {
      const q = lt2 - n * 0.022;
      const land = ease.inQuad(clamp(q / 0.13));
      const s = springStep(Math.max(0, q - 0.13), 2.6, 0.3);
      g.position.z = (1 - land) * 2.0;
      g.position.x = g.userData.x * (CAM_Z - g.position.z) / CAM_Z; // giữ chỗ trên màn hình: không tràn khung khi lao tới
      g.position.y = (1 - land) * 0.5;
      g.rotation.set((1 - s) * -0.5 + Math.sin(lt2 * 0.7 + n * 0.5) * 0.025, Math.sin(lt2 * 0.5 + n) * 0.03, 0);
      g.visible = q > 0;
    });
    N.g.visible = lt2 > 0;

    // nóng chảy lúc đập rồi nguội dần; mờ khi kết
    const hotT = 1.4 * Math.exp(-lt * 4.5), hotN = lt2 > 0 ? 1.6 * Math.exp(-lt2 * 4.0) : 0;
    // scene.environment bỏ qua envMapIntensity: chỉnh độ sáng mặt chữ bằng màu (tiêu đề tối hơn tên, ít bloom hơn)
    T.gold.color.setHex(0xf4dcae).multiplyScalar(lerp(0.95, 0.5, up)); N.gold.color.setHex(0xf4dcae).multiplyScalar(0.8);
    T.gold.emissiveIntensity = 0.03 + hotT * 0.6; T.side.emissiveIntensity = hotT;
    N.gold.emissiveIntensity = 0.05 + hotN * 0.6; N.side.emissiveIntensity = hotN;
    this.title3.environmentIntensity = 1.0 * dim;
    // ánh sáng quét ngang mặt chữ sau mỗi cú đập
    const sweep = lt2 > 0 ? prog(lt2, 0, 2.4, ease.inOutCubic) : prog(lt, 0, 0.95, ease.inOutCubic);
    this.key.position.set(lerp(-11, 11, sweep), lt2 > 0 ? 0.4 : 2.0, 6.5);
    this.key.intensity = 26 * dim;
    this.fill.intensity = 1.5 * dim;
    this.under.position.set(0, wy(Y_RULE) + 0.3, 3); this.under.intensity = 7 * dim * smoothstep(0, 0.5, lt);

    clearRT(r, this.titleRT, [0, 0, 0], 0);
    r.setRenderTarget(this.titleRT); r.render(this.title3, this.tcam);
    this.title3.updateMatrixWorld();
    this.lines.clear();
    this.outline(T, dim * lerp(0.7, 0.4, up) * (1 + 1.5 * Math.exp(-lt * 5)));
    this.outline(N, dim * (1 + 1.5 * Math.exp(-Math.max(0, lt2) * 5)));
    this.lines.render(r, this.titleRT, this.tcam);
    this.ctx.comp.draw(r, this.titleRT.texture, out, { mode: 'normal', premult: false, opacity: clamp(dim * 1.2) });
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t, r = this.ctx.renderer, c = this.text.ctx;
    clearRT(r, out, INK);
    this.text.clear();
    const inh = prog(t, INHALE, HIT, ease.inCubic);
    const dim = 1 - prog(t, 69.9, 71.1, ease.inOutCubic) * 0.995;
    let sx = W / 2, sy = H / 2, samt = 1, ssize = 0.05;

    // p08 kết thúc khi đường hầm đã bị hút hết vào đốm cam (lệch trái 130 px). Ở đây chỉ còn dư âm:
    // hai vòng mảnh co nốt vào đốm, rồi đốm trôi chậm về giữa khung.
    const glide = prog(t, T0 + 0.15, T0 + 1.8, ease.inOutCubic);
    sx = lerp(P08_SPARK_X, W / 2, glide);
    const echo = t - T0;
    if (echo < 0.5) {
      c.save(); c.lineWidth = 1;
      for (const [r0, col, dl] of [[260, 'rgba(238,233,223,1)', 0], [170, 'rgba(255,77,18,1)', 0.06]] as const) {
        const q = clamp((echo - dl) / 0.4); if (q <= 0 || q >= 1) continue;
        c.globalAlpha = 0.55 * (1 - q); c.strokeStyle = col;
        c.beginPath(); c.arc(sx, H / 2, r0 * (1 - ease.inExpo(q)) + 2, 0, Math.PI * 2); c.stroke();
      }
      c.restore();
    }
    if (t < HIT) {
      this.horizon(t, out);
      // chân trời: từ đốm cam mở ra rất xa; hít vào thì sáng lên và thắt lại
      const hA = smoothstep(63.55, 65.2, t);
      if (hA > 0) {
        const len = lerp(4, 1500, ease.outQuart(prog(t, 63.55, 65.6)));
        this.hl(out, H / 2, len * (1 - 0.15 * inh), lerp(0.9, 0.75, inh), hA * (0.55 + 3.2 * inh * inh), lerp(5, 2.5, inh), 0.6 + 0.8 * inh);
      }
      // tích nhỏ dọc chân trời (thước đo khoảng cách)
      const tickA = smoothstep(64.6, 65.8, t) * (1 - smoothstep(66.4, 66.9, t));
      if (tickA > 0) {
        c.save(); c.strokeStyle = 'rgba(238,233,223,1)'; c.lineWidth = 1;
        for (let i = -14; i <= 14; i++) {
          if (i === 0) continue;
          const x = W / 2 + i * 56, a = tickA * 0.32 * Math.exp(-Math.abs(i) / 8);
          c.globalAlpha = a; c.beginPath(); c.moveTo(x, H / 2 - (i % 5 === 0 ? 9 : 4)); c.lineTo(x, H / 2 - 1.5); c.stroke();
        }
        c.restore();
      }
      if (t < SIL) { samt = lerp(1.8, 1.15, smoothstep(T0, T0 + 1.2, t)); ssize = lerp(0.065, 0.048, smoothstep(T0, T0 + 1.2, t)); }
      else { samt = lerp(1.15, 0.85, smoothstep(SIL, 64.6, t)) + 2.0 * inh * inh; ssize = lerp(0.048, 0.042, smoothstep(SIL, 64.6, t)) + 0.02 * inh; }
      // giữ nhịp: 0.08 s cuối mọi thứ tối lại, chỉ còn khe sáng, rồi bùng
      const hold = smoothstep(HIT - 0.1, HIT - 0.02, t);
      samt *= 1 - 0.6 * hold;
    } else {
      const lt = t - HIT, lt2 = t - HIT2;
      const yH = t < HIT2 ? H / 2 : Y_RULE;
      // tia sáng sau chữ
      const ry = t < HIT2 ? H / 2 : lerp(H / 2, Y_NAME, prog(t, HIT2, HIT2 + 0.4, ease.outExpo));
      this.rays.u.t!.value = t; (this.rays.u.c!.value as THREE.Vector2).set(0.5, ry / H);
      this.rays.u.amt!.value = (0.07 + 0.6 * Math.exp(-lt * 2.4) + (lt2 > 0 ? 0.35 * Math.exp(-lt2 * 2.2) : 0)) * dim;
      this.rays.render(r, out);
      // chân trời bùng thành vệt sáng, rồi thành vạch gạch chân mảnh dưới tên
      if (lt2 < 0) {
        // bùng rồi tắt trong ~0.1 s, trước khi chữ kịp đáp xuống (không gạch ngang tiêu đề)
        const k = 1 - smoothstep(0.02, 0.11, lt);
        this.hl(out, H / 2, lerp(1500, 2000, ease.outExpo(clamp(lt / 0.1))), lerp(0.9, 0.5, clamp(lt / 0.11)), 2.4 * k, 9, 0.9);
      } else {
        const ruleLen = lerp(10, 380, ease.outExpo(clamp(lt2 / 0.5)));
        const ruleA = (0.55 + 1.2 * Math.exp(-lt2 * 3.5)) * (1 - prog(t, 70.2, 71.0, ease.inOutCubic));
        this.hl(out, yH, ruleLen, 0.85, ruleA, 3 + 5 * Math.exp(-lt2 * 4), 0.9);
      }
      this.titles(t, out, dim);
      this.burst(out, lt, 1.25 * dim, 0, 0);
      this.burst(out, lt2, 0.55 * dim, 0, wy(Y_RULE));
      // đốm cam: nổ ở cú đập, kết lại trên vạch khi tên lộ ra, rồi tách ra trôi xuống
      samt = lt2 > 0 ? smoothstep(0.1, 0.6, lt2) : 0;
      sy = yH;
      const drift = prog(t, 70.05, 71.35, ease.inOutCubic);
      sy = lerp(sy, 1000, drift); sx = W / 2;
      ssize = lerp(0.04, 0.032, drift);
      samt *= 1 - smoothstep(71.15, 71.5, t);
    }

    // ---- chữ
    const ltA = t - T0;
    // cùng chỗ, cùng giọng gõ máy với dòng cuối của p08 (x 120, cỡ 40): câu tiếp nối câu
    if (t < 64.6) typeLine(c, TEXT.p09.a.line, ltA - 0.05, { x: 120, y: 980, size: 40, cps: 40, alpha: 1 - smoothstep(64.0, 64.55, t) });
    if (t > LINE_B_IN && t < HIT) serifLine(c, TEXT.p09.b.line, t - LINE_B_IN, 66.75 - LINE_B_IN, { y: 808, size: 62 });
    if (t > FAM) serifLine(c, TEXT.p09.family.line, t - FAM, 71.05 - FAM, { y: Y_FAM, size: 46, alpha: 0.95 });
    this.ctx.comp.draw(r, this.text.upload(), out);

    this.spark.draw(r, out, sx, sy, t, samt, ssize);

    const post = hitPost(t, [HIT, HIT2], [HIT, HIT2], { ...BASE_POST, bloom: t < HIT ? 0.6 : 0.4, ca: 0.6, vignette: 0.45 });
    post.flash = 0; // loé trắng tuyến tính phủ xám cả khung: thay bằng đẩy phơi sáng (chỗ tối vẫn tối)
    post.exposure = 1 + 0.9 * Math.exp(-Math.max(0, t - HIT) * 9) * (t >= HIT ? 1 : 0) + 0.6 * Math.exp(-Math.max(0, t - HIT2) * 9) * (t >= HIT2 ? 1 : 0);
    post.fade = smoothstep(71.3, DURATION, t) * 0.6;
    return post;
  }
}

/**
 * Môi trường phản chiếu kiểu studio chụp chữ vàng: nền tối, vài hộp đèn dải ngang ấm phía sau máy quay
 * và trên đầu, để mặt chữ bắt những dải sáng - tối rõ (RoomEnvironment cho mặt vàng phẳng, đục).
 */
function studio() {
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x020202);
  const box = (w: number, h: number, x: number, y: number, z: number, ry: number, rx: number, c: number, k: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); sc.add(m);
  };
  // phía sau máy quay (+z): dải chính hơi cao, dải phụ thấp, khe tối ở giữa tạo đường cắt sáng/tối
  box(30, 1.6, 0, 2.2, 9, Math.PI, 0, 0xfff0d8, 7);
  box(30, 0.7, 0, -1.6, 9, Math.PI, 0, 0xffc890, 3);
  box(30, 3.5, 0, -5.5, 9, Math.PI, 0, 0x7a3a10, 1.2);
  // đèn trần và hai bên
  box(14, 4, 0, 9, 0, 0, Math.PI / 2, 0xffe4c0, 4);
  box(4, 12, -10, 0, 2, Math.PI / 2, 0, 0xffb070, 1.6);
  box(4, 12, 10, 0, 2, -Math.PI / 2, 0, 0xffd8a8, 2.2);
  return sc;
}
