// p07-wishes (S(42) → S(54)): VỮNG VÀNG (cột đá khắc nét, sóng xung kích) + năm lời chúc, mỗi lời một "khí cụ":
// điện tim, lộ trình đóng dấu PASS, guilloché vàng, biểu đồ năm tháng, vòng tròn khép kín. Cắt cứng ở S(54).
// Hàm thuần của t. Xem docs/04-STORYBOARD-TRAILER-v2.md và cues.ts.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, clearRT, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { F, font } from '../../engine/type';
import { clamp, ease, hash, mulberry32, pulse, smoothstep, TAU, hexToLinear } from '../../engine/util';
import { BASE_POST, INK, Spark, big, label, rgba, typeLine, hitPost, LIN } from './kit';
import { B, P, S, TEXT } from './cues';
import { Cam, arc2, scrim, BONE, GRAPH, HOT, EMB, mul, type RGB } from './p06-lib';
import { PILLAR, ROSETTE, GRID } from './p07-shaders';

const W0 = S(42); // kết thúc ở S(54) = PLATES end (cắt cứng)
const WS = [S(44), S(46), S(48), S(50), S(52)];
const GOLD = hexToLinear('#FFBE68') as RGB;

// sóng đập vào cột: phách, gốc sóng (x, z), biên độ
const WAVES: { b: number; o: [number, number]; a: number }[] = [
  { b: 126, o: [-5.5, 3.5], a: 1 }, { b: 127, o: [4.5, 4.0], a: 0.6 }, { b: 128, o: [-3.0, 6.0], a: 0.7 },
  { b: 129, o: [6.0, 1.0], a: 1 }, { b: 130, o: [-6.0, -1.0], a: 0.65 }, { b: 131, o: [2.5, 6.5], a: 0.8 },
];
const WAVE_V = 7;

/** ECG: biên độ theo khoảng cách tới đỉnh R gần nhất (giây). */
function ecg(dt: number) {
  return 0.12 * Math.exp(-(((dt + 0.16) / 0.03) ** 2)) - 0.14 * Math.exp(-(((dt + 0.026) / 0.008) ** 2)) + Math.exp(-((dt / 0.011) ** 2))
    - 0.28 * Math.exp(-(((dt - 0.024) / 0.009) ** 2)) + 0.24 * Math.exp(-(((dt - 0.2) / 0.045) ** 2));
}
const ECG_PER = 2 * P; // đỉnh R mỗi 2 phách
const ecgAt = (tau: number) => { const ph = tau - B(132); const n = Math.round(ph / ECG_PER); return ecg(ph - n * ECG_PER); };

/** Biểu đồ phong độ: lên nhanh, giữ cao, đều. */
const perf = (x: number) => 2.35 * (1 - Math.exp(-x * 1.7)) + 0.05 * Math.sin(x * 5.3) + 0.03 * Math.sin(x * 12.1 + 1);

export default class Plate extends Scene {
  text = new Layer2D();
  spark = new Spark();
  lb = new LineBatch(30000);
  lb3 = new LineBatch(40000, { screen2D: false });
  cam = new Cam();
  pillar = new FSPass(PILLAR, {
    camPos: { value: new THREE.Vector3() }, camR: { value: new THREE.Vector3() }, camU: { value: new THREE.Vector3() }, camF: { value: new THREE.Vector3() },
    tanF: { value: 0.4 }, aspect: { value: W / H }, wv: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
    imp: { value: 0 }, scanY: { value: 0 }, scanA: { value: 0 }, uT: { value: 0 },
  });
  rosette = new FSPass(ROSETTE, {
    c: { value: new THREE.Vector2(1240, 470) }, R: { value: 300 }, rot: { value: 0 }, reveal: { value: 0 }, headA: { value: 1 },
    burstR: { value: 0 }, burstA: { value: 0 }, closeA: { value: 0 }, zoom: { value: 1 }, gold: { value: new THREE.Vector3(...GOLD) },
  });
  grid = new FSPass(GRID, { c: { value: new THREE.Vector2(1240, 470) }, amt: { value: 1 }, cell: { value: 120 } });
  bars: { lane: number; x0: number; x1: number }[] = [];
  debris: { a: number; v: number; up: number; life: number }[] = [];
  sparks: { x: number; y: number; amt: number; size: number }[] = [];

  constructor(ctx: any) {
    super(ctx);
    const rnd = mulberry32(4207);
    for (const lane of [-1.7, -0.95, 0.95, 1.7]) {
      let x = -2 + rnd() * 1.2;
      while (x < 16) { const L = 0.8 + rnd() * 2.2; this.bars.push({ lane, x0: x, x1: x + L }); x += L + 0.3 + rnd() * 0.9; }
    }
    for (let i = 0; i < 60; i++) this.debris.push({ a: rnd() * TAU, v: 1 + rnd() * 3, up: 1 + rnd() * 4, life: 0.3 + rnd() * 0.6 });
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, t = f.t;
    clearRT(r, out, INK);
    this.text.clear(); this.lb.clear(); this.lb3.clear(); this.sparks = [];
    let wi = -1; for (let i = 0; i < 5; i++) if (t >= WS[i]!) wi = i;
    let use3D = false, bg: FSPass | null = null;
    const hits = [W0, ...WS], bigs = [W0, ...WS];
    let post: PostOverrides = { ...BASE_POST, ca: 0.5, bloom: 0.7 };
    const c = this.text.ctx;

    if (wi < 0) { use3D = true; bg = this.pillar; this.wishPillar(t); for (const w of WAVES) hits.push(B(w.b)); }
    else if (wi === 0) { use3D = true; this.wishECG(t); for (let k = 0; k < 6; k += 2) hits.push(B(132 + k)); }
    else if (wi === 1) { use3D = true; this.wishRoad(t); for (let k = 1; k < 6; k++) hits.push(B(138 + k)); }
    else if (wi === 2) { bg = this.rosette; this.wishRosette(t); hits.push(B(147)); }
    else if (wi === 3) { use3D = true; this.wishChart(t); hits.push(B(153)); }
    else { bg = this.grid; this.wishCircle(t); hits.push(B(160)); bigs.push(B(160)); }

    // chữ: lời chúc to ở dưới trái, chỉ số nhỏ phía trên
    if (wi >= 0) {
      const ws = WS[wi]!, lt = t - ws;
      scrim(c, 70, 730, 1700, 240, 0.65);
      label(c, `0${wi + 1} / 05`, 124, 768, { size: 18, color: rgba('signal'), alpha: clamp(lt * 8) });
      c.save(); c.globalAlpha = clamp(lt * 8) * 0.7; c.fillStyle = rgba('bone', 0.6); c.fillRect(190, 762, 220 * ease.outExpo(clamp(lt / 0.4)), 1); c.restore();
      big(c, TEXT.p07.w[wi]!.big, { lt, x: 120, y: 868, w: 1560, max: 150, align: 'left', width: 100, punch: 0.1 });
    } else {
      const lt = t - W0;
      scrim(c, 70, 110, 1150, 110, 0.7);
      typeLine(c, TEXT.p07.a.line, lt, { x: 124, y: 178, size: 35, cps: 80, highlight: 'vững vàng', caret: lt < 1.0 });
      scrim(c, 70, 760, 1350, 200, 0.65);
      big(c, TEXT.p07.a.big, { lt, x: 120, y: 868, w: 1300, max: 200, align: 'left', width: 112 });
    }

    if (bg) bg.render(r, out);
    if (use3D) this.lb3.render(r, out, this.cam.cam);
    this.lb.render(r, out);
    this.ctx.comp.draw(r, this.text.upload(), out);
    for (const s of this.sparks) this.spark.draw(r, out, s.x, s.y, t, s.amt, s.size);
    post = hitPost(t, hits, bigs, post);
    if (wi === 2) { post.bloom = 0.8; post.halation = 0.15; }
    return post;
  }

  private camUniforms(p: FSPass) {
    const cm = this.cam.cam, e = cm.matrixWorld.elements;
    (p.u.camPos!.value as THREE.Vector3).copy(cm.position);
    (p.u.camR!.value as THREE.Vector3).set(e[0]!, e[1]!, e[2]!);
    (p.u.camU!.value as THREE.Vector3).set(e[4]!, e[5]!, e[6]!);
    (p.u.camF!.value as THREE.Vector3).set(-e[8]!, -e[9]!, -e[10]!);
    p.u.tanF!.value = Math.tan((cm.fov * Math.PI) / 360);
  }

  // ------------------------------------------------------------------ VỮNG VÀNG: cột đá
  wishPillar(t: number) {
    const lt = t - W0, sub = t >= B(129);
    if (!sub) {
      const a = 0.5 + lt * 0.08, R = 9.0 - lt * 0.6;
      this.cam.set([Math.sin(a) * R - 1.2, 0.7 + lt * 0.05, Math.cos(a) * R], [-1.9, 3.1, 0], 44, -0.03);
    } else {
      const l2 = t - B(129), a = -0.75 - l2 * 0.07, R = 6.2 - l2 * 0.4;
      this.cam.set([Math.sin(a) * R + 0.9, 1.1, Math.cos(a) * R], [-2.0, 2.6, 0.2], 48, 0.04);
    }
    this.camUniforms(this.pillar);
    const wv = this.pillar.u.wv!.value as THREE.Vector4[];
    let imp = 0, scanA = 0, scanY = 0;
    for (let i = 0; i < 6; i++) {
      const w = WAVES[i]!, th = B(w.b), dist = Math.hypot(w.o[0], w.o[1]) - 0.85;
      const rad = dist + WAVE_V * (t - th);
      const age = t - th;
      const amp = rad < 0 ? 0 : w.a * (age < 0 ? smoothstep(0, 0.6, rad) : Math.exp(-age * 1.6));
      wv[i]!.set(w.o[0], w.o[1], Math.max(rad, 0), rad > 18 ? 0 : amp);
      if (age >= 0 && age < 0.8) {
        const e = Math.exp(-age * 7) * w.a;
        if (e > imp) { imp = e; scanY = 0.3 + age * 9; scanA = w.a * Math.exp(-age * 3.5); }
        // mảnh vụn bật lên ở chân cột, phía sóng tới
        const dir = Math.atan2(w.o[1], w.o[0]);
        for (let j = 0; j < 22; j++) {
          const d = this.debris[(j + i * 9) % this.debris.length]!;
          if (age > d.life) continue;
          const aa = dir + (d.a - Math.PI) * 0.35;
          const x = Math.cos(aa) * (0.85 + d.v * age), z = Math.sin(aa) * (0.85 + d.v * age), y = 0.05 + d.up * age - 4.9 * age * age;
          if (y < 0) continue;
          const vy = d.up - 9.8 * age;
          this.lb3.seg(x, y, z, x - Math.cos(aa) * d.v * 0.03, y - vy * 0.03, z - Math.sin(aa) * d.v * 0.03, 1.3, ...EMB(3), 1 - age / d.life);
        }
      }
    }
    this.pillar.u.imp!.value = imp; this.pillar.u.scanA!.value = scanA; this.pillar.u.scanY!.value = scanY; this.pillar.u.uT!.value = t;
    // ghi chú kỹ thuật: dịch chuyển = 0 (đứng yên)
    const c = this.text.ctx, top = this.cam.project(0.45, 3.4, 0.45);
    if (top.ok) {
      const x = top.x + 60, y = top.y;
      this.lb.seg2(top.x + 8, y, x - 6, y, 1, BONE(0.7), 0.7);
      label(c, 'dịch chuyển: 0.000', x, y + 5, { size: 15, alpha: 0.85 });
      label(c, 'lực tác động: tối đa', x, y + 26, { size: 15, alpha: 0.6, color: rgba(imp > 0.3 ? 'signal' : 'ash') });
    }
  }

  // ------------------------------------------------------------------ SỨC KHỎE: điện tim 3D
  wishECG(t: number) {
    const ws = WS[0]!, lt = t - ws, sub = t >= B(135);
    if (!sub) this.cam.set([2.2 - lt * 0.3, 1.7, 4.4 - lt * 0.2], [0.3 + lt * 0.3, -0.05, -1.4], 40, -0.02);
    else { const l2 = t - B(135); this.cam.set([-4.2 + l2 * 0.4, 0.8, 2.4], [0.8, 0.1, -1.6], 44, 0.03); }
    const lb = this.lb3, v = 4, xh = -4 + v * lt, Y = 1.35;
    // các nhịp đã qua lùi về sau (băng chuyền), mỗi đỉnh R một bước
    const sinceR = (() => { const ph = t - B(132); return ph < 0 ? 1 : ph - Math.floor(ph / ECG_PER) * ECG_PER; })();
    const step = 1 - ease.outCubic(clamp(sinceR / 0.22));
    for (let j = 1; j <= 14; j++) {
      const z = -(j + step) * 0.5, al = 0.55 * Math.exp(-j / 6), amp = 1 + (hash(j, 7) - 0.5) * 0.08;
      let px = -4, py = ecgAt(B(132) + ((-4 + 4) / v)) * Y * amp;
      for (let x = -4 + 0.025; x <= 4.001; x += 0.025) {
        const y = ecgAt(B(132) + (x + 4) / v) * Y * amp;
        lb.seg(px, py, z, x, y, z, 0.8, ...BONE(0.8), al);
        px = x; py = y;
      }
    }
    // khung đo (graticule) phía sau dòng sống
    for (let gx = -4; gx <= 4; gx += 0.5) lb.seg(gx, -0.5, -0.05, gx, 1.7, -0.05, 0.5, ...GRAPH(1.2), 0.4);
    for (let gy = -0.5; gy <= 1.71; gy += 0.25) lb.seg(-4, gy, -0.05, 4, gy, -0.05, 0.5, ...GRAPH(1.2), gy === 0 ? 0.8 : 0.3);
    // dòng sống phía trước: phosphor cam, mờ dần sau đầu quét
    const x0 = Math.max(-4, xh - 8);
    let px = x0, py = ecgAt(t - (xh - x0) / v) * Y;
    for (let x = x0 + 0.01; x <= xh; x += 0.01) {
      const tau = t - (xh - x) / v, y = ecgAt(tau) * Y, age = (xh - x) / v, k = Math.exp(-age * 1.1);
      lb.seg(px, py, 0, x, y, 0, 1.2 + 1.8 * k, ...HOT(1.1 + 2.2 * k), 0.35 + 0.65 * k);
      if (k > 0.2) lb.seg(px, py, 0, x, y, 0, 9, ...HOT(0.35), 0.25 * k);
      px = x; py = y;
    }
    // dấu R trên từng đỉnh đã vẽ
    const c = this.text.ctx;
    for (let n = 0; n < 4; n++) {
      const tr = B(132) + n * ECG_PER; if (tr > t) break;
      const xr = xh - (t - tr) * v;
      if (xr < -4) continue;
      const top = this.cam.project(xr, Y + 0.25, 0), bot = this.cam.project(xr, Y + 0.05, 0);
      if (top.ok) { this.lb.seg2(top.x, top.y, bot.x, bot.y, 1, HOT(2), 1); label(c, 'R', top.x - 5, top.y - 8, { size: 15, color: rgba('signal') }); }
    }
    const hp = this.cam.project(xh, ecgAt(t) * Y, 0);
    if (hp.ok) this.sparks.push({ x: hp.x, y: hp.y, amt: 1.6 + 1.4 * pulse(t, B(132) + Math.round((t - B(132)) / ECG_PER) * ECG_PER, 0.1), size: 0.026 });
    label(c, 'NHỊP  ổn định', W - 380, 176, { size: 16, alpha: 0.85 });
    label(c, 'BIÊN ĐỘ  mạnh', W - 380, 200, { size: 16, alpha: 0.6 });
    label(c, 'TÍN HIỆU  liên tục', W - 380, 224, { size: 16, alpha: 0.6 });
  }

  // ------------------------------------------------------------------ CÔNG VIỆC: lộ trình, đóng dấu PASS
  wishRoad(t: number) {
    const MX = 1.6;
    const xs = (MX * (t - B(138))) / P; // đốm cam tới mốc k đúng phách B(138+k)
    const sub = t >= B(141);
    if (!sub) this.cam.set([xs + 0.4, 3.0, 3.4], [xs + 1.0, -0.55, -0.5], 44, 0);
    else this.cam.set([xs - 1.2, 1.0, 2.6], [xs + 1.6, -0.3, -0.6], 48, -0.04);
    const lb = this.lb3, c = this.text.ctx;
    // lưới nền
    for (let gx = Math.floor(xs) - 6; gx <= xs + 14; gx += 0.5) for (let z = -3; z < 3; z += 1) lb.seg(gx, 0, z, gx, 0, z + 1, 0.5, ...GRAPH(1.1), 0.35);
    for (let gz = -3; gz <= 3; gz += 0.5) for (let x = Math.floor(xs) - 6; x < xs + 14; x += 1) lb.seg(x, 0, gz, x + 1, 0, gz, 0.5, ...GRAPH(1.1), 0.35);
    // các làn gantt
    for (const b of this.bars) {
      if (b.x1 < xs - 7 || b.x0 > xs + 14) continue;
      const done = b.x1 < xs, hw = 0.16, z0 = b.lane - hw, z1 = b.lane + hw;
      const col: RGB = done ? BONE(0.8) : GRAPH(1.6), al = done ? 0.75 : 0.6;
      lb.seg(b.x0, 0, z0, b.x1, 0, z0, 0.8, ...col, al); lb.seg(b.x0, 0, z1, b.x1, 0, z1, 0.8, ...col, al);
      lb.seg(b.x0, 0, z0, b.x0, 0, z1, 0.8, ...col, al); lb.seg(b.x1, 0, z0, b.x1, 0, z1, 0.8, ...col, al);
      // phần đã xong: nét gạch chéo
      const xe = Math.min(b.x1, xs);
      for (let x = b.x0 + 0.1; x < xe; x += 0.1) lb.seg(x, 0, z0, Math.min(x + 0.12, xe), 0, z1, 0.5, ...BONE(0.8), 0.35);
    }
    // đường ống chính
    for (let x = Math.max(-1, xs - 8); x < xs; x += 0.25) {
      const x1 = Math.min(x + 0.25, xs);
      lb.seg(x, 0, 0, x1, 0, 0, 2.4, ...HOT(2.2), 1);
      lb.seg(x, 0, 0, x1, 0, 0, 9, ...HOT(0.35), 0.25);
    }
    for (let x = xs + 0.15; x < xs + 14; x += 0.3) lb.seg(x, 0, 0, x + 0.15, 0, 0, 0.9, ...BONE(0.8), 0.6);
    // mốc + cổng mở trước khi đốm cam tới + dấu PASS đúng phách
    for (let k = 0; k < 6; k++) {
      const mx = k * MX, tk = B(138 + k);
      if (mx < xs - 7 || mx > xs + 14) continue;
      const passed = t >= tk, s = 0.2;
      const col: RGB = passed ? EMB(2.2) : BONE(0.8);
      lb.seg(mx - s, 0, 0, mx, 0, -s, 1.2, ...col, 1); lb.seg(mx, 0, -s, mx + s, 0, 0, 1.2, ...col, 1);
      lb.seg(mx + s, 0, 0, mx, 0, s, 1.2, ...col, 1); lb.seg(mx, 0, s, mx - s, 0, 0, 1.2, ...col, 1);
      lb.seg(mx, 0, 0, mx, 0.7, 0, 0.7, ...BONE(0.8), 0.6);
      const open = smoothstep(tk - 0.16, tk - 0.04, t), gz = 0.12 + 0.5 * open;
      for (const sg of [-1, 1]) lb.seg(mx - 0.06, 0.02, sg * gz, mx - 0.06, 0.02, sg * (gz + 0.32), 2, ...BONE(0.8), 0.8);
      const lp = this.cam.project(mx, 0.7, 0);
      if (lp.ok) label(c, `MỐC ${String(k + 1).padStart(2, '0')}`, lp.x + 6, lp.y - 4, { size: 14, alpha: 0.75 });
      if (passed) {
        const age = t - tk, sp = this.cam.project(mx + 0.15, 0, -0.55);
        if (sp.ok) {
          const sc = (1 + 0.9 * Math.exp(-age * 22)) * clamp(this.cam.pxPerUnit(sp.d) / 110, 0.6, 1.9);
          c.save(); c.translate(sp.x, sp.y); c.rotate(-0.16 + 0.05 * hash(k, 3)); c.scale(sc, sc);
          c.globalAlpha = clamp(age * 30);
          c.strokeStyle = rgba('signal'); c.lineWidth = 2.5; c.strokeRect(-62, -24, 124, 48);
          c.lineWidth = 1; c.strokeRect(-56, -18, 112, 36);
          c.font = font(F.mono(700), 28); c.textAlign = 'center'; c.fillStyle = rgba('signal'); c.fillText('PASS', 0, 10);
          c.restore();
        }
      }
    }
    const hp = this.cam.project(xs, 0, 0);
    if (hp.ok) this.sparks.push({ x: hp.x, y: hp.y, amt: 1.8, size: 0.028 });
    label(this.text.ctx, 'TIẾN ĐỘ  thông suốt', W - 380, 176, { size: 16, alpha: 0.85 });
    label(this.text.ctx, 'VƯỚNG MẮC  không', W - 380, 200, { size: 16, alpha: 0.6 });
  }

  // ------------------------------------------------------------------ TÀI LỘC: guilloché vàng
  wishRosette(t: number) {
    const ws = WS[2]!, lt = t - ws, close = B(147);
    const u = this.rosette.u;
    const rev = ease.inOutCubic(clamp(lt / (close - ws)));
    u.reveal!.value = rev; u.headA!.value = t < close ? 1 : 0;
    u.rot!.value = -0.05 * lt;
    u.zoom!.value = 1 + 0.04 * lt + 0.05 * (t >= close ? ease.outExpo(clamp((t - close) / 0.3)) : 0);
    const ba = t - close;
    u.burstR!.value = ba > 0 ? 330 + ease.outCubic(clamp(ba / 0.9)) * 700 : 0;
    u.burstA!.value = ba > 0 ? Math.exp(-ba * 3) : 0;
    u.closeA!.value = ba > 0 ? Math.exp(-ba * 2.5) : 0;
    const cx = 1240, cy = 470, R = 300 * (u.zoom!.value as number);
    // đầu bút: đốm cam ở vành ngoài
    if (t < close) {
      const a = rev * TAU + (u.rot!.value as number) * 0;
      this.sparks.push({ x: cx + Math.sin(a - 0.05 * lt) * R, y: cy - Math.cos(a - 0.05 * lt) * R, amt: 1.2, size: 0.02 });
    }
    const c = this.text.ctx;
    label(c, 'VÒNG  trọn vẹn', W - 380, 176, { size: 16, alpha: 0.85 * smoothstep(0, 0.2, ba) });
    label(c, 'HOA VĂN  bảo chứng', W - 380, 200, { size: 16, alpha: 0.6 });
  }

  // ------------------------------------------------------------------ PHONG ĐỘ: biểu đồ năm tháng
  wishChart(t: number) {
    const ws = WS[3]!, lt = t - ws, sub = t >= B(153);
    const xh = 0.2 + 3.9 * lt;
    if (!sub) this.cam.set([xh - 2.0, 1.9, 5.0], [xh + 0.6, 1.55, 0], 38, 0.02);
    else this.cam.set([xh + 1.8, 0.4, 4.4], [xh - 1.2, 1.7, -0.3], 44, -0.04);
    const lb = this.lb3, c = this.text.ctx, XM = 8.6;
    // các lớp "năm tháng" phía sau: đường cũ, đều ở cao
    for (let j = 1; j <= 6; j++) {
      const z = -j * 0.7, al = 0.6 * Math.exp(-j / 4);
      let px = 0, py = perf(0) * (0.96 + 0.02 * j);
      for (let x = 0.05; x <= XM; x += 0.05) { const y = perf(x + j * 0.7) * (0.96 + 0.02 * j); lb.seg(px, py, z, x, y, z, 0.7, ...BONE(0.8), al); px = x; py = y; }
      lb.seg(0, 0, z, XM, 0, z, 0.5, ...GRAPH(1.2), al);
    }
    // trục
    lb.seg(0, 0, 0, XM + 0.4, 0, 0, 1.2, ...BONE(0.85), 0.9);
    lb.seg(0, 0, 0, 0, 3.0, 0, 1.2, ...BONE(0.85), 0.9);
    lb.seg(XM + 0.4, 0, 0, XM + 0.25, 0.07, 0, 1.2, ...BONE(0.85), 0.9); lb.seg(XM + 0.4, 0, 0, XM + 0.25, -0.07, 0, 1.2, ...BONE(0.85), 0.9);
    for (let x = 0.5; x <= XM; x += 0.5) lb.seg(x, 0, 0, x, Number.isInteger(x) ? -0.12 : -0.06, 0, 0.8, ...BONE(0.8), 0.8);
    for (let y = 0.5; y <= 2.51; y += 0.5) for (let x = 0; x < XM; x += 0.2) lb.seg(x, y, 0, x + 0.08, y, 0, 0.5, ...GRAPH(1.3), 0.5);
    // mức đỉnh
    for (let x = 0; x < XM; x += 0.3) lb.seg(x, 2.35, 0, x + 0.15, 2.35, 0, 0.7, ...EMB(1.2), 0.5);
    // đường cam + màn nét dọc dưới đường
    let px = 0, py = perf(0);
    const xe = Math.min(xh, XM);
    for (let x = 0.02; x <= xe; x += 0.02) {
      const y = perf(x), k = Math.exp(-(xe - x) * 0.25);
      lb.seg(px, py, 0, x, y, 0, 2.6, ...HOT(1.6 + 1.2 * k), 1);
      lb.seg(px, py, 0, x, y, 0, 10, ...HOT(0.3), 0.25);
      if (Math.round(x * 50) % 5 === 0) lb.seg(x, 0, 0, x, y, 0, 0.6, ...BONE(0.8), 0.22 + 0.2 * k);
      px = x; py = y;
    }
    // dấu phách trên đường
    for (let k = 0; k < 6; k++) {
      const tk = B(150 + k); if (tk > t) break;
      const xk = 0.2 + 3.9 * (tk - ws); if (xk > XM) break;
      const yk = perf(xk);
      lb.seg(xk - 0.06, yk + 0.06, 0, xk + 0.06, yk - 0.06, 0, 1, ...EMB(2.5), 1); lb.seg(xk - 0.06, yk - 0.06, 0, xk + 0.06, yk + 0.06, 0, 1, ...EMB(2.5), 1);
    }
    const hp = this.cam.project(xe, perf(xe), 0);
    if (hp.ok) this.sparks.push({ x: hp.x, y: hp.y, amt: 1.8, size: 0.03 });
    const ax = this.cam.project(XM + 0.45, -0.25, 0);
    if (ax.ok) label(c, 'năm tháng →', ax.x - 110, ax.y + 18, { size: 18, alpha: 0.9 });
    const ay = this.cam.project(0, 3.0, 0);
    if (ay.ok) label(c, 'phong độ', ay.x + 10, ay.y - 6, { size: 16, alpha: 0.8 });
    const pk = this.cam.project(Math.min(xe + 0.3, XM), 2.35, 0);
    if (pk.ok && xe > 2) label(c, 'giữ vững ở đỉnh', pk.x + 14, pk.y - 14, { size: 15, color: rgba('signal'), alpha: 0.9 });
  }

  // ------------------------------------------------------------------ HẠNH PHÚC: vòng tròn khép kín
  wishCircle(t: number) {
    const ws = WS[4]!, close = B(160), lt = t - ws;
    const cx = 1240, cy = 470, R = 300;
    const lb = this.lb, c = this.text.ctx;
    this.grid.u.amt!.value = 1;
    const prog = ease.inOutCubic(clamp(lt / (close - ws)));
    const a0 = -Math.PI / 2, a = a0 + TAU * prog;
    const done = t >= close, ba = t - close;
    // dựng hình: tâm, đường dẫn mờ, chữ thập, cánh compa
    arc2(lb, cx, cy, R, 0, TAU, 0.6, GRAPH(1.4), 0.6);
    for (let i = 0; i < 4; i++) { const q = (i * TAU) / 4; lb.seg2(cx + Math.cos(q) * 20, cy + Math.sin(q) * 20, cx + Math.cos(q) * (R + 60), cy + Math.sin(q) * (R + 60), 0.6, GRAPH(1.5), 0.7); }
    arc2(lb, cx, cy, 8, 0, TAU, 1, BONE(0.8), 0.9);
    arc2(lb, cx, cy, R * 0.5, a0, a, 0.6, BONE(0.8), 0.3);
    const nt = 120;
    for (let i = 0; i < nt; i++) {
      const q = a0 + (i / nt) * TAU, L = i % 10 === 0 ? 16 : 7;
      const lit = q <= a;
      const fl = done ? Math.exp(-ba * 4) : 0;
      lb.seg2(cx + Math.cos(q) * (R + 22), cy + Math.sin(q) * (R + 22), cx + Math.cos(q) * (R + 22 + L), cy + Math.sin(q) * (R + 22 + L), i % 10 === 0 ? 1.1 : 0.7, lit ? (fl > 0.05 ? EMB(1 + 2 * fl) : BONE(0.8)) : GRAPH(1.4), lit ? 0.8 : 0.5);
    }
    // dựng hình compa: sáu cánh (vesica) bên trong, mỗi cánh hiện khi bút đi qua
    for (let k = 0; k < 6; k++) {
      const q = a0 + (k * TAU) / 6;
      if (q > a + 1e-3) break;
      const px = cx + Math.cos(q) * R, py = cy + Math.sin(q) * R, dir = q + Math.PI;
      const g = clamp((a - q) / 0.9);
      arc2(lb, px, py, R, dir - Math.PI / 3, dir - Math.PI / 3 + (2 * Math.PI / 3) * g, 0.7, done ? mul(LIN.bone, 0.8) : BONE(0.8), done ? 0.5 : 0.35);
    }
    if (!done) {
      lb.seg2(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.8, BONE(0.8), 0.6);
    }
    // vòng cam
    arc2(lb, cx, cy, R, a0, a, 2.6, HOT(done ? 2.6 + 2 * Math.exp(-ba * 5) : 2.2), 1);
    arc2(lb, cx, cy, R, a0, a, 10, HOT(0.35), 0.3);
    // bùng vòng sáng khi khép
    if (done) {
      for (let j = 0; j < 3; j++) {
        const aj = ba - j * 0.06; if (aj < 0) continue;
        const Rj = R + ease.outCubic(clamp(aj / 0.8)) * (900 - j * 180), al = Math.exp(-aj * 3.2);
        arc2(lb, cx, cy, Rj, 0, TAU, j === 0 ? 2.4 * al + 0.6 : 0.8, j === 0 ? HOT(2.4) : BONE(0.8), al);
      }
      label(c, 'TRỌN VẸN', cx + R + 46, cy - R * 0.62, { size: 16, color: rgba('signal'), alpha: smoothstep(0.05, 0.25, ba) });
      label(c, 'khép kín · không đứt đoạn', cx + R + 46, cy - R * 0.62 + 22, { size: 14, alpha: 0.7 * smoothstep(0.1, 0.35, ba) });
    }
    const amt = done ? 1.3 + 2.5 * Math.exp(-ba * 4) : 1.6;
    this.sparks.push({ x: cx + Math.cos(done ? a0 : a) * R, y: cy + Math.sin(done ? a0 : a) * R, amt, size: done ? 0.03 + 0.03 * Math.exp(-ba * 4) : 0.024 });
  }
}

