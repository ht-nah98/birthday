// Bộ đếm ngày trong khoảng lặng trước cú đập cuối (p09): hai trống số kiểu đồng hồ cơ lăn về 24 / 11,
// khoá lại, nóng lên khi "hít vào", rồi ở cú đập vỡ tung thành hạt ký tự → CHÚC MỪNG SINH NHẬT.
// Ngày 24/11 do người dùng cung cấp (docs/FEEDBACK.md F7). Không ghi năm, không ghi tuổi.
import type * as THREE from 'three';
import { Layer2D, W } from '../../engine/gl';
import { F, font } from '../../engine/type';
import { rgba } from '../../engine/palette';
import { clamp, ease, smoothstep } from '../../engine/util';
import { GlyphPortrait } from './glyphs';
import { FINAL_HIT } from './cues';
import type { SceneCtx } from '../../engine/scene';

const IN = 63.85;          // nhạc vừa tắt (63.6): khung trống hiện ra
const MONTH_LOCK = 65.2;   // tháng khoá trước
const DAY_LOCK = 66.25;    // ngày khoá ngay trước khi "hít vào" (66.3)
const HIT = FINAL_HIT;     // 67.083
const Y = 392;             // tâm dòng số, trên chân trời (540)
const SIZE = 168;
const DAY = 24, MONTH = 11;

export class Countdown {
  layer = new Layer2D();
  glyph = new GlyphPortrait('', { rows: 46, border: false, edge: 0.55, floor: 0.02 });
  gw = 0; gh = 0; cw = 0;

  init() {
    // ô số đo theo phông mono (mọi chữ số cùng bề rộng)
    const m = document.createElement('canvas').getContext('2d')!;
    m.font = font(F.mono(600), SIZE); this.cw = m.measureText('0').width;
    // bản "chữ ghép từ ký tự" của 24 / 11 để vỡ ở cú đập: dựng đúng khuôn khổ chữ trên màn hình
    const cv = document.createElement('canvas');
    this.gw = Math.ceil(this.width()); this.gh = Math.ceil(SIZE * 1.1);
    cv.width = this.gw; cv.height = this.gh;
    const c = cv.getContext('2d')!;
    c.font = font(F.mono(600), SIZE); c.fillStyle = '#fff'; c.textBaseline = 'middle';
    this.drawText(c, 0, this.gh / 2, (s, x, y) => c.fillText(s, x, y));
    this.glyph.fromCanvas(cv);
  }

  /** bố cục: [2][4] [/] [1][1] */
  private cells() { const g = this.cw * 0.25; return [0, this.cw, 2 * this.cw + g * 1.6, 3 * this.cw + g * 3.2, 4 * this.cw + g * 3.2]; }
  private width() { const c = this.cells(); return c[4]! + this.cw; }
  private drawText(_c: CanvasRenderingContext2D, x0: number, y: number, put: (s: string, x: number, y: number) => void) {
    const c = this.cells();
    put('2', x0 + c[0]!, y); put('4', x0 + c[1]!, y); put('/', x0 + c[2]!, y); put('1', x0 + c[3]!, y); put('1', x0 + c[4]!, y);
  }

  /** Trống số: v là giá trị liên tục (ví dụ 23.4 = đang lăn từ 23 sang 24). */
  private drum(c: CanvasRenderingContext2D, x: number, v: number, digits: 2, col: string) {
    const lh = SIZE * 1.05, top = Y - lh / 2;
    const u = v % 10, uf = u - Math.floor(u);
    // hàng chục chỉ lăn khi hàng đơn vị đi từ 9 sang 0 (như đồng hồ cơ)
    const tens = Math.floor(v / 10) + (Math.floor(u) === 9 ? uf : 0);
    const cols = [tens, u];
    for (let i = 0; i < digits; i++) {
      const val = cols[i]!, d0 = Math.floor(val), f = val - d0, cx = x + i * this.cw;
      c.save();
      c.beginPath(); c.rect(cx - 4, top, this.cw + 8, lh); c.clip();
      for (const [d, off] of [[d0, -f], [d0 + 1, 1 - f]] as const) {
        const yy = Y + off * lh;
        c.globalAlpha = 1 - Math.min(1, Math.abs(off) * 1.4);
        c.fillStyle = col; c.fillText(String(((d % 10) + 10) % 10), cx, yy);
      }
      c.restore();
    }
  }

  draw(ctx: SceneCtx, out: THREE.WebGLRenderTarget, t: number) {
    if (t < IN || t > HIT + 1.4) return;
    const r = ctx.renderer;
    const x0 = W / 2 - this.width() / 2;
    if (t < HIT) {
      const c = this.layer.ctx; this.layer.clear();
      const a = smoothstep(IN, IN + 0.5, t);
      // tháng: 1 → 11, ngày: 1 → 24, chậm dần như sắp tới nơi
      const mv = 1 + (MONTH - 1) * ease.outQuart(clamp((t - IN) / (MONTH_LOCK - IN)));
      const dv = 1 + (DAY - 1) * ease.outQuint(clamp((t - IN - 0.1) / (DAY_LOCK - IN - 0.1)));
      const locked = smoothstep(DAY_LOCK, DAY_LOCK + 0.12, t), inh = smoothstep(66.3, HIT, t);
      c.save();
      c.font = font(F.mono(600), SIZE); c.textBaseline = 'middle'; c.textAlign = 'left'; c.globalAlpha = a;
      const dayCol = locked > 0.5 ? rgba('ember') : rgba('bone');
      const cells = this.cells();
      this.drum(c, x0 + cells[0]!, dv, 2, dayCol);
      c.fillStyle = rgba('graphite'); c.fillText('/', x0 + cells[2]!, Y);
      this.drum(c, x0 + cells[3]!, mv, 2, t > MONTH_LOCK ? rgba('ember') : rgba('bone'));
      // khung mảnh và nhãn máy
      const w = this.width(), lh = SIZE * 1.05, pad = 34;
      c.globalAlpha = a * 0.55; c.strokeStyle = rgba('bone'); c.lineWidth = 1;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        const bx = W / 2 + sx * (w / 2 + pad), by = Y + sy * (lh / 2 + 14);
        c.beginPath(); c.moveTo(bx - sx * 22, by); c.lineTo(bx, by); c.lineTo(bx, by - sy * 22); c.stroke();
      }
      c.font = font(F.mono(400), 18); c.letterSpacing = '3px'; c.fillStyle = rgba('ash'); c.globalAlpha = a * 0.8;
      c.textAlign = 'left'; c.fillText('NGÀY', W / 2 - w / 2 - pad, Y - lh / 2 - 34);
      c.textAlign = 'right'; c.fillText('THÁNG', W / 2 + w / 2 + pad, Y - lh / 2 - 34);
      // quầng nóng khi khoá và hít vào
      if (locked > 0) {
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18 * locked + 0.5 * inh * inh;
        c.font = font(F.mono(600), SIZE); c.textAlign = 'left'; c.letterSpacing = '0px'; c.fillStyle = rgba('signal');
        c.shadowColor = rgba('signal'); c.shadowBlur = 30 + 50 * inh;
        this.drawText(c, x0, Y, (s, x, y) => c.fillText(s, x, y));
      }
      c.restore();
      // 0,08 s cuối tối hẳn cùng khung hình (giữ nhịp trước cú đập)
      const hold = 1 - 0.85 * smoothstep(HIT - 0.1, HIT - 0.02, t);
      ctx.comp.draw(r, this.layer.upload(), out, { opacity: hold });
    } else {
      // vỡ tung: hạt ký tự của 24 / 11 bay ra theo cú đập, tắt trong ~1,3 s
      const lt = t - HIT;
      this.glyph.draw(r, out, t, {
        x: W / 2, y: Y, h: this.gh, form: 1, diss: ease.outCubic(clamp(lt / 1.3)),
        spread: 600, burst: 900, tint: 0.7, amt: 1.6 * (1 - smoothstep(0.6, 1.4, lt)), rise: 0.15, flick: 0.2,
      });
    }
  }
}
