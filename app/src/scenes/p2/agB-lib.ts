// Hàm chung nhỏ cho các chương c05, c07 (agB). Không đụng kit.ts.
import { W, H } from './kit';
import { clamp } from '../../engine/util';

/** Vị trí ảnh cắt cover phủ một hộp (mặc định cả khung), lấy nét (fx, fy), kẹp không lộ mép. */
export function cover(img: HTMLImageElement, fx = 0.5, fy = 0.5, zoom = 1, bx = 0, by = 0, bw = W, bh = H) {
  const k = Math.max(bw / img.width, bh / img.height) * zoom, dw = img.width * k, dh = img.height * k;
  const dx = clamp(bx + bw / 2 - dw * fx, bx + bw - dw, bx), dy = clamp(by + bh / 2 - dh * fy, by + bh - dh, by);
  return { dx, dy, dw, dh };
}

/** Lấy nét theo từng ảnh (đã mở xem: tâm nhóm người / mặt). */
export const FOCUS: Record<string, [number, number]> = {
  m25: [0.5, 0.74], m27: [0.6, 0.5], m28: [0.42, 0.55], m29: [0.5, 0.42], m30: [0.33, 0.55], m31: [0.45, 0.5],
  m33: [0.5, 0.55], m34: [0.5, 0.5], m35: [0.5, 0.6], m52: [0.5, 0.5], m55: [0.5, 0.45], m12: [0.5, 0.5],
  m07: [0.45, 0.48], m06: [0.45, 0.45], m09: [0.5, 0.42], m32: [0.5, 0.4],
  w01: [0.5, 0.42], w02: [0.5, 0.42], m38: [0.55, 0.5], m39: [0.45, 0.45], m20: [0.6, 0.3],
  m37: [0.47, 0.6], m40: [0.6, 0.55], m41: [0.35, 0.35], m08: [0.45, 0.55], m48: [0.55, 0.5], m23: [0.55, 0.5], m02: [0.45, 0.62],
};
export const foc = (id: string) => FOCUS[id] ?? [0.5, 0.5];

