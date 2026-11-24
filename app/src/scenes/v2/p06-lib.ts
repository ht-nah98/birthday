// Dụng cụ dùng chung cho p06-today và p07-wishes: máy quay 3D + chiếu ra px, vòng/vạch 3D bằng LineBatch.
import * as THREE from 'three';
import { W, H } from '../../engine/gl';
import type { LineBatch } from '../../engine/lines';
import { LIN } from '../../engine/palette';
import { TAU } from '../../engine/util';

export type RGB = [number, number, number];
export type V3 = [number, number, number];
export const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
/** Bone ở mức an toàn (≤ 0.85 tuyến tính, không bloom). */
export const BONE = (k = 1): RGB => mul(LIN.bone, Math.min(k, 1));
export const GRAPH = (k = 1): RGB => mul(LIN.graphite, k);
export const HOT = (k = 2.5): RGB => mul(LIN.signal, k);
export const EMB = (k = 2.5): RGB => mul(LIN.ember, k);

export class Cam {
  cam = new THREE.PerspectiveCamera(35, W / H, 0.02, 500);
  private v = new THREE.Vector3();
  set(p: V3, target: V3, fov = 35, roll = 0) {
    const c = this.cam;
    c.position.set(p[0], p[1], p[2]);
    c.up.set(Math.sin(roll), Math.cos(roll), 0);
    c.lookAt(target[0], target[1], target[2]);
    c.fov = fov; c.updateProjectionMatrix(); c.updateMatrixWorld(true);
    c.matrixWorldInverse.copy(c.matrixWorld).invert();
    return this;
  }
  /** Chiếu điểm thế giới ra px logic (x phải, y xuống). `d` = độ sâu dương phía trước máy. */
  project(x: number, y: number, z: number) {
    const v = this.v.set(x, y, z).applyMatrix4(this.cam.matrixWorldInverse);
    const d = -v.z;
    v.set(x, y, z).project(this.cam);
    return { x: (v.x * 0.5 + 0.5) * W, y: (0.5 - v.y * 0.5) * H, d, ok: d > 0.05 };
  }
  /** px mỗi đơn vị thế giới ở độ sâu d. */
  pxPerUnit(d: number) { return (H * 0.5) / (Math.tan((this.cam.fov * Math.PI) / 360) * d); }
}

/** Cung tròn 3D: tâm c, trục u/v (đơn vị), bán kính r, từ a0 tới a1. */
export function arc3(lb: LineBatch, c: V3, u: V3, v: V3, r: number, a0: number, a1: number, segs: number, w: number, col: RGB, alpha = 1) {
  const n = Math.max(2, Math.ceil(segs * Math.abs(a1 - a0) / TAU));
  let px = 0, py = 0, pz = 0;
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n), ca = Math.cos(a) * r, sa = Math.sin(a) * r;
    const x = c[0] + u[0] * ca + v[0] * sa, y = c[1] + u[1] * ca + v[1] * sa, z = c[2] + u[2] * ca + v[2] * sa;
    if (i > 0) lb.seg(px, py, pz, x, y, z, w, col[0], col[1], col[2], alpha);
    px = x; py = y; pz = z;
  }
}

/** Cung tròn 2D (px). */
export function arc2(lb: LineBatch, cx: number, cy: number, r: number, a0: number, a1: number, w: number, col: RGB, alpha = 1, ry = r) {
  const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * Math.max(r, 8) / 6));
  let px = cx + Math.cos(a0) * r, py = cy + Math.sin(a0) * ry;
  for (let i = 1; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * ry;
    lb.seg2(px, py, x, y, w, col, alpha);
    px = x; py = y;
  }
}

/** Màn tối mềm sau chữ (vẽ trên lớp chữ, trước chữ) để nét mảnh không cắt qua chữ. */
export function scrim(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 0.6) {
  if (a <= 0) return;
  c.save();
  c.filter = 'blur(28px)';
  c.fillStyle = `rgba(2,2,3,${a})`;
  c.fillRect(x, y, w, h);
  c.restore();
}
