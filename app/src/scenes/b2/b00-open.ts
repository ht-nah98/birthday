// Mở màn 0–9.94 s, chủ đề "CHUYẾN ĐI LÚC HOÀNG HÔN" (riêng cho bản 2, khác hẳn trailer đen–cam):
//   bầu trời chàm → hồng → cam mơ, mặt trời lặn trên đường chân trời, con đường chạy về phía mặt trời (vạch đường trôi theo phách);
//   0.2–1.0  ghim bản đồ rơi xuống mặt trời, đường đi chấm chấm vẽ từ trái sang
//   1.0      chân dung hai vợ chồng (p10) tụ từ ghim, ghép bằng ký tự của lời chúc, MỖI KÝ TỰ MANG MÀU THẬT CỦA ẢNH
//   K(4)     "ĐỜI LÀ ĐI";  K(8) "CHÚC MỪNG / SINH NHẬT";  K(12) "— vợ chồng hằng ngọc —";  nhãn kiểu vé máy bay ở góc
//   K(14–16) hít vào, ký tự rung;  K(16) nổ thành tàn vàng → loé → ảnh đầu tiên (b01-main)
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, clearRT } from '../../engine/gl';
import { clamp, ease, pulse, smoothstep, hash, frameIdx, mod } from '../../engine/util';
import { GlyphPortrait } from '../v2/glyphs';
import { K, P, IMG, WISH_FULL } from './cues';
import { W, H, decode, cover } from './fx';

// bảng màu hoàng hôn (sRGB)
const SKY = ['#1F2160', '#4A2C7A', '#A9468A', '#EE6F7E', '#FFB36B'];
const SUN = '#FFD27A', CREAM = '#FFF4E2', SUNTXT = '#FFD166', TEAL = '#5FE0D0';
const NAVY = '#1B2A4E', CORAL = '#FF5A5F';
const HZ = 770;                          // đường chân trời
const SX = 1380;                         // tâm mặt trời / chân dung
const PX = SX, PY = 520, PH_ = 940;
const PIN = { x: 1341, y: 655 };          // mặt trời trong nền AI (assets/ban2/ai/bg_road.png)
/** rơi nảy (Penner outBounce) */
const bounce = (x: number) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };

export default class Open extends Scene {
  layer = new Layer2D();
  g = new GlyphPortrait(IMG('p10_cut'), { rows: 92, text: WISH_FULL, edge: 0.9, floor: 0.0, color: 1, saturate: 1.35, blend: 'normal', flyColor: [1.0, 0.72, 0.25] });
  sil!: HTMLCanvasElement;
  bg: HTMLImageElement | null = null;
  override async init() {
    await this.g.init();
    try { const b = new Image(); b.src = '/assets/ban2/ai/bg_road.png'; await b.decode(); this.bg = b; } catch { this.bg = null; }
    const im = new Image(); im.src = IMG('p10_cut'); await im.decode();
    // nền chân dung = chính ảnh thật (sáng, đúng màu da), mờ đáy 30 % (khớp fadeBottom, bỏ phần bàn ăn)
    const cv = document.createElement('canvas'); cv.width = cv.height = 720; const c = cv.getContext('2d')!;
    c.filter = 'brightness(0.68) saturate(0.9) blur(2px)'; c.drawImage(im, 0, 0, 720, 720); c.filter = 'none';
    c.globalCompositeOperation = 'destination-out';
    const g = c.createLinearGradient(0, 720 * 0.62, 0, 720 * 0.92); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g; c.fillRect(0, 0, 720, 720);
    this.sil = cv;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const r = this.ctx.renderer, c = this.layer.ctx, t = f.t;
    clearRT(r, out, [0, 0, 0]);
    this.layer.clear();
    const form = ease.inOutCubic(clamp((t - 1.0) / 2.6));
    const inhale = smoothstep(K(14), K(16), t);
    const diss = smoothstep(K(16) - 0.05, K(16) + 0.5, t);
    // sau cú nổ K(16): chỉ còn tàn ký tự trên nền đen (cảnh sau cộng phần này lên ảnh đầu)
    if (t < K(16)) {
      if (this.bg) { const z = 1.0 + 0.05 * t / K(16); cover(c, this.bg, 0, 0, W, H, { fx: 0.62, fy: 0.6, zoom: z }); }
      else { this.sky(c, t); this.road(c, t); }
      this.pin(c, t);
      // ảnh thật mờ phía sau chân dung chữ (hiện dần theo form), viền sáng mềm tách khỏi nền
      c.save(); c.globalAlpha = 0.95 * form; c.shadowColor = 'rgba(255,248,230,0.9)'; c.shadowBlur = 40;
      c.drawImage(this.sil, PX - PH_ / 2, PY - PH_ / 2, PH_, PH_); c.restore();
      this.words(c, t);
    }
    this.ctx.comp.draw(r, this.layer.upload(), out);

    this.g.draw(r, out, t, {
      x: PX, y: PY, h: PH_, form, diss, ox: PIN.x, oy: PIN.y, fromPoint: 1, spread: 200,
      amt: 1, flick: 0.012 + 0.08 * inhale, fadeBottom: 0.16, rise: 0.6, burst: 900 * diss, gain: 2.1 + 0.5 * inhale,
    });

    let sh = 0; for (let k = 14; k < 16; k += 0.5) sh = Math.max(sh, pulse(t, K(k), 0.06) * 0.5 * inhale);
    const fi = frameIdx(t), hit = pulse(t, K(16), 0.08);
    return {
      hud: 0, frame: 0, bloom: 0.5, bloomThreshold: 0.9, grain: 0.035, ca: 0.3 + 8 * hit + 2 * inhale, vignette: 0.22, halation: 0.12,
      shake: [(hash(fi, 1) - 0.5) * 22 * sh, (hash(fi, 2) - 0.5) * 16 * sh], zoom: 1 + 0.025 * inhale + 0.06 * hit + 0.01 * t / 10,
      exposure: 1 + 1.4 * hit,
    };
  }

  private sky(c: CanvasRenderingContext2D, t: number) {
    const g = c.createLinearGradient(0, 0, 0, HZ);
    SKY.forEach((col, i) => g.addColorStop(i / (SKY.length - 1), col));
    c.fillStyle = g; c.fillRect(0, 0, W, HZ);
    // sao mờ phía trên
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 11) * W, y = hash(i, 12) * HZ * 0.45, a = 0.25 + 0.35 * Math.sin(t * (1 + 2 * hash(i, 13)) + i);
      c.fillStyle = `rgba(255,244,226,${a * (1 - y / (HZ * 0.45))})`; c.fillRect(x, y, 2, 2);
    }
    // mặt trời + quầng
    const rise = 30 * (1 - ease.outCubic(clamp(t / 3)));
    const halo = c.createRadialGradient(SX, HZ + rise, 0, SX, HZ + rise, 760);
    halo.addColorStop(0, 'rgba(255,214,130,0.55)'); halo.addColorStop(0.35, 'rgba(255,140,110,0.22)'); halo.addColorStop(1, 'rgba(255,120,120,0)');
    c.fillStyle = halo; c.fillRect(0, 0, W, HZ);
    c.save(); c.beginPath(); c.rect(0, 0, W, HZ); c.clip();
    const sg = c.createLinearGradient(0, HZ - 300, 0, HZ); sg.addColorStop(0, '#FFE6A6'); sg.addColorStop(1, '#FF9A6B');
    c.fillStyle = sg; c.beginPath(); c.arc(SX, HZ + rise, 300, 0, Math.PI * 2); c.fill();
    // các vạch cắt ngang mặt trời (hoàng hôn trên biển/đường)
    c.fillStyle = SKY[3]!;
    for (let i = 0; i < 6; i++) { const y = HZ - 20 - i * 34, h = 10 - i * 1.4; if (h > 1) c.fillRect(SX - 320, y, 640, h); }
    c.restore();
    // mây trôi
    c.save(); c.globalAlpha = 0.18; c.fillStyle = CREAM;
    for (let i = 0; i < 6; i++) {
      const x = mod(hash(i, 21) * W + t * (12 + 10 * hash(i, 22)), W + 600) - 300, y = 140 + hash(i, 23) * 360, w = 220 + 260 * hash(i, 24);
      c.beginPath(); c.ellipse(x, y, w, 16 + 10 * hash(i, 25), 0, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  private road(c: CanvasRenderingContext2D, t: number) {
    // mặt đất tím than, con đường hội tụ về mặt trời, vạch giữa trôi về phía người xem theo phách
    const gg = c.createLinearGradient(0, HZ, 0, H); gg.addColorStop(0, '#3A2552'); gg.addColorStop(1, '#140F2A');
    c.fillStyle = gg; c.fillRect(0, HZ, W, H - HZ);
    c.fillStyle = 'rgba(255,190,140,0.10)';
    c.beginPath(); c.moveTo(SX - 6, HZ); c.lineTo(SX + 6, HZ); c.lineTo(SX + 900, H); c.lineTo(SX - 900, H); c.closePath(); c.fill();
    // phản chiếu mặt trời trên mặt đường
    const rf = c.createLinearGradient(0, HZ, 0, H); rf.addColorStop(0, 'rgba(255,200,120,0.35)'); rf.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = rf; c.fillRect(SX - 260, HZ, 520, H - HZ);
    const speed = t < 1 ? 0 : (t - 1) / P * 0.25;
    for (let i = 0; i < 14; i++) {
      const z = mod(i / 14 - speed, 1), zz = z * z, y = HZ + (H - HZ) * zz, w = 2 + 16 * zz, h = 4 + 60 * zz;
      c.fillStyle = `rgba(255,236,200,${0.15 + 0.7 * z})`; c.fillRect(SX - w / 2, y, w, h);
    }
  }

  private pin(c: CanvasRenderingContext2D, t: number) {
    // đường đi chấm chấm từ góc trái dưới tới ghim, rồi mờ đi khi chân dung đã tụ
    const k = ease.inOutCubic(clamp((t - 0.15) / 0.9)), fade = 1 - smoothstep(2.6, 3.6, t);
    if (k > 0 && fade > 0) {
      c.save(); c.globalAlpha = fade; c.strokeStyle = TEAL; c.lineWidth = 5; c.setLineDash([2, 18]); c.lineCap = 'round';
      const x0 = 120, y0 = 1010, cx = 700, cy = 640, n = 60;
      c.beginPath();
      for (let i = 0; i <= n * k; i++) { const u = i / n, x = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * PIN.x, y = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * PIN.y; if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke(); c.restore();
    }
    // ghim rơi + nảy
    const d = clamp((t - 0.25) / 0.55), a = smoothstep(0.2, 0.35, t) * (1 - smoothstep(1.2, 1.9, t));
    if (a <= 0) return;
    const y = PIN.y - 360 * (1 - bounce(d));
    c.save(); c.globalAlpha = a; c.translate(PIN.x, y);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 4 + (PIN.y - y) * 0, 22, 6, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#FF5A6E'; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-34, -46, -34, -92, 0, -92); c.bezierCurveTo(34, -92, 34, -46, 0, 0); c.fill();
    c.fillStyle = CREAM; c.beginPath(); c.arc(0, -64, 12, 0, Math.PI * 2); c.fill();
    c.restore();
    // gợn sóng khi chạm
    const lr = t - 0.8; if (lr > 0 && lr < 0.9) { c.strokeStyle = `rgba(255,244,226,${0.6 * (1 - lr / 0.9)})`; c.lineWidth = 3; c.beginPath(); c.ellipse(PIN.x, PIN.y + 4, 40 + 260 * lr, 10 + 60 * lr, 0, 0, Math.PI * 2); c.stroke(); }
  }

  private words(c: CanvasRenderingContext2D, t: number) {
    const L = 470;
    decode(c, 'ĐỜI LÀ ĐI', t - K(4), K(8) - K(4) - 0.5, { x: L, y: 520, size: 150, face: 'sans', per: 0.06, color: NAVY, glow: true });
    decode(c, 'CHÚC MỪNG', t - K(8), K(16) - K(8) - 0.2, { x: L, y: 450, size: 120, face: 'sans', per: 0.05, color: NAVY, glow: true });
    decode(c, 'SINH NHẬT', t - K(8) - 0.25, K(16) - K(8) - 0.45, { x: L, y: 590, size: 120, face: 'sans', per: 0.05, color: CORAL, glow: true });
    decode(c, '— vợ chồng hằng ngọc —', t - K(12), K(16) - K(12) - 0.2, { x: L, y: 705, size: 36, per: 0.025, color: NAVY, glow: true });
    // nhãn kiểu vé máy bay
    const lab = 'rgba(27,42,78,0.8)';
    decode(c, 'BOARDING PASS  ·  HÀNH TRÌNH TUỔI MỚI', t - 1.2, 99, { x: 70, y: 70, size: 22, align: 'left', per: 0.015, color: lab, glow: true });
    decode(c, 'KHỞI HÀNH: HÔM NAY   →   ĐIỂM ĐẾN: HẠNH PHÚC', t - 2.0, 99, { x: W - 70, y: H - 60, size: 22, align: 'right', per: 0.015, color: lab, glow: true });
  }
}
