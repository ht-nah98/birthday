// Phần chính 9.94 s → hết: dựng "kiểu CapCut" theo phách từ SHOTS / TEXTS (cues.ts), rồi đoạn kết:
//   K(104) bức sơn dầu → tan thành ảnh thật p10, câu chúc cuối;  K(110) HAPPY BIRTHDAY + pháo giấy + ký tên;
//   ~K(114.5) ảnh thật tan thành chân dung ký tự (khép vòng với mở màn) rồi bay thành tàn lửa, tắt dần.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { F as FONT, font } from '../../engine/type';
import { clamp, ease, hash, pulse, smoothstep, frameIdx } from '../../engine/util';
import { GlyphPortrait } from '../v2/glyphs';
import { K, P, SEC, SHOTS, TEXTS, WISH, WISH_FULL, STYLE_NAME, IMG, DURATION, type Shot } from './cues';
import { W, H, CREAM, GOLD, HOT, loadAll, cover, blurFill, enter, glitch, slam, outline, decode, wish, tag } from './fx';

const OUT0 = K(104), HB = K(110), GLY = K(114.5);
const cutT = SHOTS.map((s) => K(s.k));

function picIds(s: Shot): string[] {
  switch (s.kind) {
    case 'full': case 'one': case 'card': return [s.pic.id];
    case 'tri': case 'grid': return s.pics.map((p) => p.id);
    case 'flip': return s.ids;
  }
}

export default class Main extends Scene {
  override handlesTransition = true;
  layer = new Layer2D();
  img: Record<string, HTMLImageElement> = {};
  g = new GlyphPortrait(IMG('p10_cut'), { rows: 120, text: WISH_FULL, edge: 0.7, floor: 0.0, color: 1, saturate: 1.35, blend: 'normal', flyColor: [1.0, 0.72, 0.25] });

  override async init() {
    this.img = await loadAll([...SHOTS.flatMap(picIds), 'L5', 'p10', 'p16']);
    await this.g.init();
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, t = f.t;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear('#08070A');

    let si = -1; for (let i = 0; i < SHOTS.length; i++) if (t >= cutT[i]!) si = i;
    if (t < OUT0 && si >= 0) this.shot(c, SHOTS[si]!, si, t);
    if (t >= OUT0) this.outro(c, t);
    this.texts(c, t, si >= 0 ? SHOTS[si]! : null);

    // glitch vài khung sau các cú cắt kiểu 'glitch'
    if (si >= 0 && SHOTS[si]!.tr === 'glitch' && t < OUT0) {
      const lt = t - cutT[si]!; glitch(c, this.layer.canvas, 1 - smoothstep(0, 0.22, lt), frameIdx(t));
    }
    this.ctx.comp.draw(r, this.layer.upload(), out);
    // chân dung ký tự cuối phim
    if (t > GLY - 0.2) {
      const form = ease.inOutCubic(clamp((t - GLY) / 0.7)), diss = smoothstep(GLY + 1.4, DURATION - 0.4, t);
      this.g.draw(r, out, t, { x: 960, y: 560, h: 1060, form, diss, spread: 260, amt: 0.9, flick: 0.02, fadeBottom: 0.2, rise: 1, gain: 2.2 });
    }
    // tàn dư của mở màn (chân dung nổ) cộng lên ảnh đầu tiên
    if (f.under && f.tin < 1) this.ctx.comp.draw(r, f.under, out, { mode: 'add', opacity: 1 - ease.inCubic(f.tin) });
    return this.post(t, si);
  }

  // ------------------------------------------------------------------ từng loại cảnh
  private shot(c: CanvasRenderingContext2D, s: Shot, i: number, t: number) {
    const t0 = K(s.k), lt = t - t0, dir = i % 2 ? -1 : 1, next = cutT[i + 1] ?? OUT0, len = next - t0;
    const drift = 1 + 0.035 * (lt / Math.max(len, 0.5));
    switch (s.kind) {
      case 'full': {
        const e = enter(s.tr ?? 'punch', lt, dir);
        c.save(); c.translate(W / 2, H / 2); c.rotate(e.rot); c.translate(-W / 2, -H / 2);
        cover(c, this.img[s.pic.id]!, -40, -40, W + 80, H + 80, { fx: s.pic.fx, fy: s.pic.fy, zoom: e.zoom * drift, dx: e.dx, filter: e.blur > 0.5 ? `blur(${e.blur}px)` : undefined });
        c.restore();
        break;
      }
      case 'tri': {
        const pw = W / 3, step = (s.step ?? 1) * P;
        s.pics.forEach((pic, j) => {
          const a = lt - j * step; if (a < 0) return;
          const k = ease.outExpo(clamp(a / 0.3)), from = j % 2 ? 1 : -1;
          const z = 1 + 0.12 * Math.exp(-a * 8) + 0.03 * a / 3 + (lt > 3 * P ? 0.06 * Math.exp(-(lt - 3 * P) * 6) : 0);
          cover(c, this.img[pic.id]!, j * pw, (1 - k) * from * H, pw, H, { fx: pic.fx, fy: pic.fy, zoom: z });
        });
        c.fillStyle = '#08070A'; c.fillRect(pw - 4, 0, 8, H); c.fillRect(2 * pw - 4, 0, 8, H);
        break;
      }
      case 'one': {
        const im = this.img[s.pic.id]!, e = enter(s.tr ?? 'punch', lt, dir);
        blurFill(c, im, 0.4);
        const h = 960, w = 680, x = W / 2 + (s.side ?? 0) * 330, y = H / 2;
        c.save(); c.translate(x + e.dx * 0.3, y); c.rotate((s.side ?? 0) * 0.035); c.scale(e.zoom, e.zoom);
        c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 50; c.fillStyle = '#fff'; c.fillRect(-w / 2 - 12, -h / 2 - 12, w + 24, h + 24); c.shadowBlur = 0;
        cover(c, im, -w / 2, -h / 2, w, h, { fx: s.pic.fx, fy: s.pic.fy, zoom: drift });
        c.restore();
        break;
      }
      case 'flip': {
        const n = Math.min(s.ids.length - 1, Math.floor(lt / (s.step * P))), id = s.ids[n]!, lf = lt - n * s.step * P;
        cover(c, this.img[id]!, 0, 0, W, H, { fx: 0.5, fy: 0.36, zoom: 1.0 + 0.08 * Math.exp(-lf * 10) + 0.02 * lt });
        if (s.label) tag(c, STYLE_NAME[id] ?? '', lf, s.step * P - 0.05, 210, 110, id === 'p10' ? '#2A2A2A' : HOT);
        break;
      }
      case 'grid': {
        const cols = 4, rows = 4, cw = W / cols, ch = H / rows, step = s.step * P, zg = 1.0 + 0.04 * lt;
        c.save(); c.translate(W / 2, H / 2); c.scale(zg, zg); c.translate(-W / 2, -H / 2);
        s.pics.forEach((pic, j) => {
          const a = lt - j * step * 0.5; if (a < 0) return;
          const k = ease.outBack(clamp(a / 0.25)), x = (j % cols) * cw, y = Math.floor(j / cols) * ch;
          c.save(); c.translate(x + cw / 2, y + ch / 2); c.scale(k, k);
          cover(c, this.img[pic.id]!, -cw / 2 + 5, -ch / 2 + 5, cw - 10, ch - 10, { fx: pic.fx, fy: pic.fy });
          c.restore();
        });
        c.restore();
        // dải tối giữa cho chữ
        const g = c.createLinearGradient(0, 380, 0, 700); g.addColorStop(0, 'rgba(8,7,10,0)'); g.addColorStop(0.3, 'rgba(8,7,10,0.78)'); g.addColorStop(0.7, 'rgba(8,7,10,0.78)'); g.addColorStop(1, 'rgba(8,7,10,0)');
        c.fillStyle = g; c.fillRect(0, 380, W, 320);
        break;
      }
      case 'card': {
        const im = this.img[s.pic.id]!, e = enter(s.tr ?? 'whip', lt, s.side === 'R' ? 1 : -1);
        blurFill(c, im, 0.55, 42);
        const portrait = im.height > im.width * 1.05, w = portrait ? 600 : 820, h = portrait ? 800 : 620;
        const x = s.side === 'R' ? 1390 : 530, y = 540;
        c.save(); c.translate(x + e.dx * 0.5, y); c.rotate((s.side === 'R' ? 0.03 : -0.03) + e.rot); c.scale(e.zoom, e.zoom);
        c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 60; c.shadowOffsetY = 20; c.fillStyle = '#FBF7F0';
        c.fillRect(-w / 2 - 16, -h / 2 - 16, w + 32, h + 32); c.shadowBlur = 0; c.shadowOffsetY = 0;
        cover(c, im, -w / 2, -h / 2, w, h, { fx: s.pic.fx, fy: s.pic.fy, zoom: drift });
        c.restore();
        break;
      }
    }
  }

  private texts(c: CanvasRenderingContext2D, t: number, cur: Shot | null) {
    for (const x of TEXTS) {
      const lt = t - K(x.k0), out = K(x.k1) - K(x.k0) - 0.15;
      if (lt < 0 || lt > out + 0.6) continue;
      if (x.style === 'slam') slam(c, x.s, lt, out, { y: x.y, size: x.size, color: x.color });
      else if (x.style === 'outline') outline(c, x.s, lt, out, { y: x.y, size: x.size, color: x.color });
      else if (x.style === 'decode' && cur?.kind === 'grid') wish(c, x.s, lt - 0.1, out - 0.1, { x: W / 2, y: 540, maxW: 1500, size: 80, align: 'center', wps: 7 });
      else if (x.style === 'decode') decode(c, x.s, lt, out, { y: x.y, size: x.size ?? 80, face: (x.size ?? 80) > 80 ? 'sans' : 'mono', per: 0.022 });
      else if (x.style === 'tag') tag(c, x.s, lt, out, cur?.kind === 'card' && cur.side === 'L' ? 1390 : 530, 860, HOT);
      else if (x.style === 'wish') {
        const right = cur?.kind === 'card' && cur.side === 'L', nw = x.s.split(' ').length;
        const wps = Math.max(6.5, nw / Math.max(1, out - 1.6));
        if (cur?.kind === 'grid') wish(c, x.s, lt - 0.1, out - 0.1, { x: W / 2, y: 540, maxW: 1500, size: 74, align: 'center', wps });
        else wish(c, x.s, lt - 0.15, out - 0.15, { x: right ? 1050 : 110, y: 520, maxW: 780, size: x.s.length > 110 ? 66 : 80, align: 'left', wps });
      }
    }
  }

  private outro(c: CanvasRenderingContext2D, t: number) {
    const lt = t - OUT0;
    // sơn dầu → ảnh thật
    const real = smoothstep(K(106), K(108), t), z = 1.04 + 0.03 * lt;
    cover(c, this.img['L5']!, 0, 0, W, H, { fx: 0.5, fy: 0.36, zoom: z });
    if (real > 0) cover(c, this.img['p10']!, 0, 0, W, H, { fx: 0.5, fy: 0.36, zoom: z, alpha: real });
    // tối dần phía dưới cho chữ; sau HB tối hẳn
    const dark = smoothstep(HB - 0.1, HB + 0.4, t) * 0.55;
    const g = c.createLinearGradient(0, 480, 0, H); g.addColorStop(0, 'rgba(8,7,10,0)'); g.addColorStop(1, 'rgba(8,7,10,0.85)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (dark > 0) { c.fillStyle = `rgba(8,7,10,${dark})`; c.fillRect(0, 0, W, H); }
    // ảnh thật biến thành chữ: mờ dần khi chân dung ký tự tụ
    const gone = smoothstep(GLY - 0.1, GLY + 0.8, t);
    if (gone > 0) { c.fillStyle = `rgba(8,7,10,${gone})`; c.fillRect(0, 0, W, H); }

    wish(c, WISH.last, t - K(104.5), HB - K(104.5) - 0.3, { x: W / 2, y: 930, maxW: 1700, size: 86, align: 'center', wps: 5 });
    if (t >= HB) {
      const lh = t - HB, endA = 1 - smoothstep(DURATION - 1.6, DURATION - 0.6, t);
      this.confetti(c, lh, endA);
      c.save(); c.globalAlpha = endA;
      slam(c, WISH.hb, lh, 99, { y: 470, size: 190, color: GOLD });
      wish(c, WISH.hello, lh - 0.5, 99, { x: W / 2, y: 650, maxW: 1400, size: 80, align: 'center', wps: 8 });
      decode(c, `— ${WISH.from} —`, lh - 1.1, 99, { y: 780, size: 46, per: 0.03, color: 'rgba(255,244,226,0.85)' });
      c.restore();
    }
  }

  private confetti(c: CanvasRenderingContext2D, lt: number, a: number) {
    const cols = [GOLD, HOT, CREAM, '#7FD3FF', '#FF8FB8'];
    c.save(); c.globalAlpha = a;
    for (let i = 0; i < 140; i++) {
      const x0 = hash(i, 1) * W, vy = 260 + 320 * hash(i, 2), sw = 40 * Math.sin(lt * (2 + 3 * hash(i, 3)) + i);
      const y = -40 + (lt - hash(i, 4) * 0.6) * vy; if (y < -40 || y > H + 40) continue;
      const burst = Math.exp(-lt * 3) * (hash(i, 5) - 0.5) * 600;
      c.save(); c.translate(x0 + sw + burst, y); c.rotate(lt * (3 + 6 * hash(i, 6)));
      c.fillStyle = cols[i % cols.length]!; c.fillRect(-7, -4, 14, 8 * Math.abs(Math.cos(lt * 5 + i)) + 2);
      c.restore();
    }
    c.restore();
  }

  // ------------------------------------------------------------------ hậu kỳ theo phách
  private post(t: number, si: number): PostOverrides {
    let cut = 0, fl = 0, beat = 0;
    for (let i = 0; i < SHOTS.length; i++) {
      const s = SHOTS[i]!, t0 = cutT[i]!; if (t < t0 || t - t0 > 1) continue;
      cut = Math.max(cut, pulse(t, t0, 0.09));
      if (s.tr === 'flash') fl = Math.max(fl, pulse(t, t0, 0.07));
      if (s.kind === 'flip') for (let n = 0; n < s.ids.length; n++) { const tn = t0 + n * s.step * P; if (t >= tn) { cut = Math.max(cut, pulse(t, tn, 0.07)); fl = Math.max(fl, 0.35 * pulse(t, tn, 0.04)); } }
      if (s.kind === 'tri') for (let n = 1; n < 4; n++) cut = Math.max(cut, 0.7 * pulse(t, t0 + n * (s.step ?? 1) * P, 0.07));
    }
    if (t >= SEC.build[0] && t < OUT0) { const kb = Math.floor((t - 1.0) / P); beat = pulse(t, K(kb), 0.08); }
    const hb = pulse(t, HB, 0.1); fl = Math.max(fl, hb);
    const fi = frameIdx(t), sh = Math.max(cut * 0.6, hb);
    void si;
    return {
      hud: 0, frame: 0, bloom: 0.45, bloomThreshold: 1.0, grain: 0.04, vignette: 0.3, halation: 0.15,
      ca: 0.4 + 9 * cut, shake: [(hash(fi, 1) - 0.5) * 24 * sh, (hash(fi, 2) - 0.5) * 16 * sh],
      zoom: 1 + 0.03 * cut + 0.012 * beat, exposure: 1 + 0.9 * fl,
      fade: smoothstep(DURATION - 0.9, DURATION - 0.05, t),
    };
  }
}

void FONT; void font;
