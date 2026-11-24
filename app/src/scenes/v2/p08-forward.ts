// p08-forward: "Mong những năm tháng phía trước sẽ có / nhiều thành công hơn, nhiều tiếng cười hơn / và nhiều khoảnh khắc đáng nhớ hơn."
// Máy quay bay tới trong đường hầm năm tháng: các vòng khắc vạch (cùng ngôn ngữ vòng thời gian với plate đồng hồ), nhãn +1, +2…
// Ba cú đập HƠN: mỗi lần rộng hơn, đậm hơn, to hơn (Archivo 62→125, 300→900), nằm trong dải dưới phải.
// "Khoảnh khắc đáng nhớ": ảnh thật duy nhất của trailer, 5 ảnh, lần lượt tiến ra hai ô cửa trên cùng (mỗi ảnh vào đúng phách,
// giữ ~0,67 s), chỉnh màu ấm gần đơn sắc. Câu chữ ở khối trái dưới, trên nền tối mềm. S(59): mọi thứ bị hút vào điểm tụ.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H, clearRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, font, fitSize } from '../../engine/type';
import { clamp, ease, hash, lerp, smoothstep, springStep, TAU } from '../../engine/util';
import { S, TEXT } from './cues';
import { A, BASE_POST, INK, LIN, Spark, hitPost, label, rgba, typeLine } from './kit';

const T0 = S(54);
const H1 = S(55.333), H2 = S(56.667), H3 = S(58), END = S(59);
const RS = END - 0.3; // bắt đầu hút vào điểm tụ
const GHOST = S(56.667); // ảnh bắt đầu hiện mờ trong ô cửa
/** Ảnh vào đúng phách, xen kẽ ô trái / ô phải. */
const ENTRY = [S(57), S(57.333), S(57.667), S(58), S(58.333)];
const D = 4; // khoảng cách giữa các vòng
const R = 5; // bán kính đường hầm
const VPY = 210; // đẩy điểm tụ lên (px): giữa hai ô cửa

/** Hai ô cửa (px logic, từ trên trái): x, y, w, h. */
const WIN: [number, number, number, number][] = [[120, 130, 660, 440], [1140, 130, 660, 440]];
/** Ảnh: số, tâm nhìn x, y (từ trên), độ phóng. Chọn khung có người, mặt nằm trọn trong ô 3:2. */
const PHOTOS: [number, number, number, number][] = [[5, 0.5, 0.36, 1.12], [4, 0.36, 0.38, 1.3], [12, 0.43, 0.4, 1.3], [13, 0.5, 0.47, 1.0], [7, 0.42, 0.36, 1.05]];

const PHOTO = /* glsl */ `
uniform sampler2D img; uniform vec4 rect; uniform vec2 focus; uniform float ia, zoom, op;
void main() {
  vec2 px = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  vec2 l = (px - rect.xy) / rect.zw;
  if (l.x < 0.0 || l.y < 0.0 || l.x > 1.0 || l.y > 1.0) discard;
  float a = rect.z / rect.w;
  vec2 span = ia > a ? vec2(a / ia, 1.0) : vec2(1.0, ia / a);
  span /= zoom;
  vec2 f = clamp(focus, span * 0.5, 1.0 - span * 0.5);
  vec2 u = f + (l - 0.5) * span;
  vec3 c = texture(img, vec2(u.x, 1.0 - u.y)).rgb;
  // chỉnh màu: bóng mực, trung tính hổ phách, sáng trắng ngà ấm; giữ lại chút màu thật
  float y = luma(c);
  vec3 amber = vec3(0.30, 0.13, 0.05), bone = vec3(0.80, 0.70, 0.55);
  vec3 duo = mix(mix(C_INK * 0.6, amber, smoothstep(0.0, 0.3, y)), bone, smoothstep(0.22, 0.8, y));
  vec3 tint = c * (luma(duo) / max(y, 1e-3));
  vec3 g = mix(duo, tint, 0.3);
  g = min(g, vec3(0.82));
  // viền tối mềm trong ô
  vec2 e = min(l, 1.0 - l) * rect.zw;
  g *= 0.75 + 0.25 * smoothstep(0.0, 60.0, min(e.x, e.y));
  fragColor = vec4(g * op, op);
}`;

/** Vị trí z máy quay theo t (thuần). */
function camZ(t: number) {
  const lt = t - T0;
  let z = -7 * lt;
  for (const h of [H1, H2, H3]) z -= 6 * ease.outExpo(clamp((t - h) / 0.55));
  z -= 5 * Math.max(0, Math.min(t, RS) - H3);
  z += 320 * ease.inCubic(clamp((t - RS) / 0.3));
  return z;
}

export default class Plate extends Scene {
  text = new Layer2D();
  spark = new Spark();
  cam = new THREE.PerspectiveCamera(62, A, 0.1, 400);
  lines = new LineBatch(30000, { screen2D: false, blend: 'add' });
  photo = new FSPass(PHOTO, {
    img: { value: null }, rect: { value: new THREE.Vector4() }, focus: { value: new THREE.Vector2() }, ia: { value: 1 }, zoom: { value: 1 }, op: { value: 0 },
  }, { blending: THREE.CustomBlending, transparent: true });
  tex: THREE.Texture[] = [];

  override async init() {
    const m = this.photo.mat; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
    m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
    this.tex = await Promise.all(PHOTOS.map(async ([n]) => {
      const im = new Image(); im.src = `/assets/web/p${String(n).padStart(2, '0')}.jpg`; await im.decode();
      const x = new THREE.Texture(im); x.colorSpace = THREE.SRGBColorSpace; x.generateMipmaps = true; x.minFilter = THREE.LinearMipmapLinearFilter; x.anisotropy = 8; x.needsUpdate = true;
      this.ctx.renderer.initTexture(x);
      return x;
    }));
  }

  /** Trạng thái ảnh k: độ đục, tỉ lệ, khung chữ nhật (px). */
  photoState(k: number, t: number, vp: [number, number]) {
    const win = WIN[k % 2]!, enter = ENTRY[k]!, exit = ENTRY[k + 2] ?? Infinity;
    let op = 0, sc = 1;
    if (k < 2 && t < enter) {
      // hiện mờ trong ô cửa trước khi tiến ra
      op = 0.16 * smoothstep(GHOST, GHOST + 0.4, t); sc = 0.9;
    }
    const ui = ease.outCubic(clamp((t - (enter - 0.1)) / 0.1));
    if (t >= enter - 0.1) { op = lerp(k < 2 ? 0.16 : 0, 1, ui); sc = lerp(k < 2 ? 0.9 : 0.86, 1, ui); }
    const uo = clamp((t - (exit - 0.1)) / 0.14);
    if (uo > 0) { op *= 1 - ease.inQuad(uo); sc *= 1 + 0.12 * ease.inQuad(uo); }
    // hút vào điểm tụ
    const ur = ease.inOutCubic(clamp((t - RS) / 0.28));
    const cx = lerp(win[0] + win[2] / 2, vp[0], ur), cy = lerp(win[1] + win[3] / 2, vp[1], ur);
    sc *= 1 - 0.97 * ur;
    const w = win[2] * sc, h = win[3] * sc;
    return { op, rect: [cx - w / 2, cy - h / 2, w, h] as [number, number, number, number], zoom: PHOTOS[k]![3] * (1 + 0.05 * Math.max(0, t - enter)) };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, t = f.t, lt = t - T0;
    clearRT(r, out, INK);
    const cz = camZ(t), czF = camZ(Math.min(t, RS)), cam = this.cam; // czF: sương mù/vòng đóng băng khi bị hút về điểm tụ
    const kick = [H1, H2, H3].reduce((s, h, i) => s + (t >= h ? (i % 2 ? -1 : 1) * 0.07 * (1 - springStep(t - h, 2.2, 0.3)) * Math.exp(-(t - h) * 2) : 0), 0);
    const roll = 0.04 * Math.sin(lt * 0.9) + kick + 0.3 * ease.inCubic(clamp((t - RS) / 0.3));
    cam.fov = 62 + 30 * ease.inCubic(clamp((t - RS) / 0.3));
    cam.position.set(0.25 * Math.sin(lt * 0.7), 0.2 * Math.cos(lt * 0.55), cz);
    cam.up.set(0, 1, 0); cam.lookAt(0, 0, cz - 20); cam.rotateZ(roll);
    cam.setViewOffset(W, H, 0, VPY, W, H);
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();

    // ---------------- vòng năm tháng
    const L = this.lines; L.clear();
    const bone = LIN.bone, sg = LIN.signal;
    const i0 = Math.max(0, Math.floor(-czF / D) - 1);
    for (let i = i0; i < i0 + 20; i++) {
      const z = -i * D, d = czF - z; // >0 phía trước
      if (d < 0.2) continue;
      const fog = Math.exp(-d * 0.05) * smoothstep(0.2, 3, d);
      if (fog < 0.01) continue;
      const g = 0.55 * fog, rot = (i % 2 ? 1 : -1) * (t * 0.18 + i * 0.37);
      const ring = (rad: number, n: number, a0: number, a1: number, wd: number, gain: number, dash = 0) => {
        for (let k = 0; k < n; k++) {
          if (dash && k % dash === dash - 1) continue;
          const u0 = lerp(a0, a1, k / n), u1 = lerp(a0, a1, (k + 1) / n);
          L.seg(Math.cos(u0) * rad, Math.sin(u0) * rad, z, Math.cos(u1) * rad, Math.sin(u1) * rad, z, wd, bone[0] * gain, bone[1] * gain, bone[2] * gain, 1);
        }
      };
      ring(R, 96, 0, TAU, 1.3, g);
      ring(R * 0.955, 96, 0, TAU, 0.9, g * 0.55);
      ring(R * 1.09, 48, rot, rot + TAU * 0.62, 0.9, g * 0.5, 4);
      // vạch khắc
      for (let k = 0; k < 120; k++) {
        const a = rot * 0.5 + (k / 120) * TAU, long = k % 10 === 0, mid = k % 5 === 0;
        const r1 = R * 0.955, r2 = R * (long ? 0.86 : mid ? 0.905 : 0.93);
        const gk = g * (long ? 0.9 : 0.5);
        L.seg(Math.cos(a) * r1, Math.sin(a) * r1, z, Math.cos(a) * r2, Math.sin(a) * r2, z, long ? 1.2 : 0.8, bone[0] * gk, bone[1] * gk, bone[2] * gk, 1);
      }
      // nan dọc nối sang vòng sau (hành lang)
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + 0.13;
        L.seg(Math.cos(a) * R * 1.09, Math.sin(a) * R * 1.09, z, Math.cos(a) * R * 1.09, Math.sin(a) * R * 1.09, z - D, 0.8, bone[0] * g * 0.35, bone[1] * g * 0.35, bone[2] * g * 0.35, 1);
      }
      // cung cam nhỏ: mốc "phía trước" trên mỗi vòng
      const ga = fog * 1.2;
      const a0 = -0.95 + rot * 0.15;
      for (let k = 0; k < 8; k++) {
        const u0 = a0 + k * 0.03, u1 = u0 + 0.03;
        L.seg(Math.cos(u0) * R * 1.03, Math.sin(u0) * R * 1.03, z, Math.cos(u1) * R * 1.03, Math.sin(u1) * R * 1.03, z, 2.2, sg[0] * ga, sg[1] * ga, sg[2] * ga, 1);
      }
    }
    // vòng cam lao tới trên mỗi cú đập
    for (const h of [T0, H1, H2, H3]) {
      const u = t - h;
      if (u < 0 || u > 0.6) continue;
      const z = cz - lerp(60, 0.5, ease.inCubic(u / 0.6)), ga = 2.0 * (1 - u / 0.6) + 0.4;
      for (let k = 0; k < 128; k++) {
        const u0 = (k / 128) * TAU, u1 = ((k + 1) / 128) * TAU;
        L.seg(Math.cos(u0) * R * 0.92, Math.sin(u0) * R * 0.92, z, Math.cos(u1) * R * 0.92, Math.sin(u1) * R * 0.92, z, 2.4, sg[0] * ga, sg[1] * ga, sg[2] * ga, 1);
      }
    }
    // vệt tốc độ dọc thành hầm
    for (let k = 0; k < 90; k++) {
      const a = hash(k, 11) * TAU, rad = R * (1.15 + hash(k, 12) * 0.6), len = 2 + hash(k, 13) * 7;
      const span = 60, d = (((czF + hash(k, 14) * span) % span) + span) % span, z1 = czF - d;
      const fog = Math.exp(-d * 0.05) * smoothstep(1, 5, d), gk = 0.5 * fog;
      L.seg(Math.cos(a) * rad, Math.sin(a) * rad, z1, Math.cos(a) * rad, Math.sin(a) * rad, z1 - len, 0.9, bone[0] * gk, bone[1] * gk, bone[2] * gk, 1);
    }
    L.render(r, out, cam);

    // điểm tụ
    const vp3 = new THREE.Vector3(0, 0, cz - 300).project(cam);
    const vp: [number, number] = [(vp3.x * 0.5 + 0.5) * W, (0.5 - vp3.y * 0.5) * H];

    // ---------------- ảnh: cũ vẽ trước, mới đè lên
    const states = PHOTOS.map((_, k) => this.photoState(k, t, vp));
    states.forEach((s, k) => {
      if (s.op <= 0.002 || s.rect[2] < 2) return;
      const u = this.photo.u, tx = this.tex[k]!, im = tx.image as HTMLImageElement, p = PHOTOS[k]!;
      u.img!.value = tx; u.ia!.value = im.width / im.height; u.zoom!.value = s.zoom; u.op!.value = s.op;
      (u.rect!.value as THREE.Vector4).set(...s.rect); (u.focus!.value as THREE.Vector2).set(p[1], p[2]);
      this.photo.render(r, out);
    });

    const endK = ease.inCubic(clamp((t - RS) / 0.3));
    this.spark.draw(r, out, vp[0], vp[1], t, 0.9 + 0.9 * endK, 0.035 + 0.03 * endK);

    this.drawText(t, cz, states, out);
    const post = hitPost(t, [T0, H1, H2, H3], [H1, H2, H3], { ...BASE_POST, bloom: 0.7 });
    // đẩy phơi sáng nhẹ: khung có ảnh và chữ trắng lớn, không để độ sáng trung bình nhảy
    post.exposure = 1 + ((post.exposure ?? 1) - 1) * 0.2;
    return post;
  }

  private drawText(t: number, cz: number, states: { op: number; rect: [number, number, number, number] }[], out: THREE.WebGLRenderTarget) {
    const c = this.text.ctx, tx = TEXT.p08, cam = this.cam;
    this.text.clear();
    const textFade = 1 - smoothstep(END - 0.12, END - 0.02, t);
    const hudFade = 1 - smoothstep(RS, RS + 0.1, t);
    const photosOn = smoothstep(GHOST, GHOST + 0.4, t);

    // nhãn +n trên các vòng
    const v = new THREE.Vector3();
    const i0 = Math.max(1, Math.floor(-cz / D));
    for (let i = i0; i < i0 + 9; i++) {
      const z = -i * D, d = cz - z;
      if (d < 0.6) continue;
      const a = 0.62;
      v.set(Math.cos(a) * R * 1.13, Math.sin(a) * R * 1.13, z).project(cam);
      if (v.z > 1) continue;
      const x = (v.x * 0.5 + 0.5) * W, y = (0.5 - v.y * 0.5) * H;
      const al = Math.exp(-d * 0.05) * smoothstep(0.6, 3, d) * hudFade * (1 - 0.8 * photosOn);
      const sz = clamp(260 / d, 11, 34);
      label(c, `+${i}`, x, y, { size: sz, color: rgba('bone', al * 0.85) });
    }

    // khung ô cửa: chữ thập góc, nhãn
    WIN.forEach((w, wi) => {
      const al = 0.25 + 0.55 * photosOn;
      const s = states.filter((_, k) => k % 2 === wi).reduce((m, x) => (x.op > m.op ? x : m), { op: 0, rect: w as [number, number, number, number] });
      const [x, y, ww, hh] = s.op > 0.02 ? s.rect : w;
      if (ww < 4) return;
      c.save(); c.strokeStyle = rgba('bone', al * hudFade); c.lineWidth = 1.2;
      const k = Math.min(28, ww * 0.1), o = 10;
      for (const [sx, sy] of [[0, 0], [1, 0], [1, 1], [0, 1]] as const) {
        const px = x + sx * ww + (sx ? o : -o), py = y + sy * hh + (sy ? o : -o), dx = sx ? -k : k, dy = sy ? -k : k;
        c.beginPath(); c.moveTo(px + dx, py); c.lineTo(px, py); c.lineTo(px, py + dy); c.stroke();
      }
      c.strokeStyle = rgba('ash', 0.35 * hudFade); c.lineWidth = 1; c.strokeRect(w[0], w[1], w[2], w[3]);
      c.restore();
      const idx = ENTRY.findIndex((e, k) => k % 2 === wi && t >= e - 0.1 && t < (ENTRY[k + 2] ?? Infinity) - 0.1);
      label(c, idx >= 0 ? `KHOẢNH KHẮC  0${idx + 1}` : 'Ô CỬA  —  TRỐNG', w[0], w[1] + w[3] + 28, { size: 15, color: rgba(idx >= 0 ? 'signal' : 'ash', 0.85 * hudFade) });
    });

    // ---- câu: khối trái dưới trên nền tối mềm
    const SZ = 50, X = 120, Y0 = 640, LH = 62;
    const lines = ['Mong những năm tháng', 'phía trước sẽ có'];
    c.save(); c.globalAlpha = 0.8 * textFade * smoothstep(T0, T0 + 0.15, t);
    c.filter = 'blur(26px)'; c.fillStyle = rgba('#000000'); c.fillRect(X - 40, Y0 - 70, 780, LH * 6 + 40); c.restore();
    c.save(); c.globalAlpha = textFade;
    // gõ dòng a qua hai dòng hiển thị
    const la = t - T0, cps = 40, n1 = Array.from(lines[0]!).length + 1;
    const lb = t - H1, lc = t - H2;
    const dStart = ENTRY[0]!;
    typeLine(c, lines[0]!, la, { x: X, y: Y0, size: SZ, cps, caret: la * cps < n1 });
    typeLine(c, lines[1]!, la - n1 / cps, { x: X, y: Y0 + LH, size: SZ, cps, caret: lb < 0 });
    typeLine(c, tx.b.line, lb, { x: X, y: Y0 + LH * 2, size: SZ, cps: 70, highlight: 'hơn', caret: lc < 0 });
    typeLine(c, tx.c.line, lc, { x: X, y: Y0 + LH * 3, size: SZ, cps: 70, highlight: 'hơn', caret: t < dStart });
    // dòng d hiện theo từ, trên phách
    const words: [string, number, number][] = [['và', 0, ENTRY[0]!], ['nhiều', 0, ENTRY[0]! + 0.167], ['khoảnh', 0, ENTRY[1]!], ['khắc', 0, ENTRY[1]! + 0.083],
      ['đáng', 1, ENTRY[1]! + 0.167], ['nhớ', 1, ENTRY[1]! + 0.25], ['hơn.', 1, ENTRY[2]!]];
    for (const row of [0, 1]) {
      const shown = words.filter(([, r0, wt]) => r0 === row && t >= wt).map(([w]) => w).join(' ');
      if (shown) typeLine(c, shown, 99, { x: X, y: Y0 + LH * (4 + row), size: SZ, highlight: row === 1 ? 'hơn' : undefined, caret: row === 1 && t < END - 0.15 });
    }
    c.restore();

    // ---- HƠN: áp lực chữ tăng dần, dải dưới phải
    const steps = [
      { t: H1, width: 62, weight: 300, max: 210, w: 600 },
      { t: H2, width: 100, weight: 700, max: 300, w: 820 },
      { t: H3, width: 125, weight: 900, max: 400, w: 940 },
    ];
    const word = tx.b.big, HX = 1800, HY = 800;
    steps.forEach((s, i) => {
      const l = t - s.t, next = steps[i + 1];
      if (l < 0) return;
      const fam = F.archivo(s.width, s.weight), size = fitSize(word, fam, s.w, s.max);
      if (next && t >= next.t) {
        // dấu vết lần trước: viền mảnh, bị đẩy lùi
        const ln = t - next.t, k = 1 - 0.1 * ease.outExpo(clamp(ln / 0.3));
        c.save(); c.globalAlpha = 0.45 * Math.exp(-ln * 2.5) * textFade;
        c.translate(HX, HY); c.scale(k, k);
        c.font = font(fam, size); c.textAlign = 'right'; c.textBaseline = 'alphabetic';
        c.strokeStyle = rgba('bone'); c.lineWidth = 1.2; c.strokeText(word, 0, size * 0.35);
        c.restore();
        return;
      }
      const k = 1 + 0.12 * Math.exp(-l * 14);
      c.save(); c.globalAlpha = clamp(l / 0.08) * textFade;
      c.translate(HX, HY); c.scale(k, k);
      c.font = font(fam, size); c.textAlign = 'right'; c.textBaseline = 'alphabetic';
      c.fillStyle = rgba('bone'); c.fillText(word, 0, size * 0.35);
      c.restore();
      label(c, `wdth ${s.width}  wght ${s.weight}`, HX, 975, { size: 15, align: 'right', color: rgba('ash', 0.9 * textFade) });
    });

    // khung chú thích
    label(c, 'FIG. 08  —  NĂM THÁNG PHÍA TRƯỚC', 120, 100, { size: 16, color: rgba('ash', hudFade) });
    const n = Math.max(0, Math.floor(-cz / D));
    label(c, `RING +${String(n).padStart(2, '0')}   ▸ FORWARD`, 1800, 100, { size: 16, align: 'right', color: rgba('bone', 0.8 * hudFade) });
    this.ctx.comp.draw(this.ctx.renderer, this.text.upload(), out);
  }
}
