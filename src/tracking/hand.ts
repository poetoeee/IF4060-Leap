import { DEFAULT_VIEW_ASPECT, VIEW_WIDTH_MM, type HandState, type Vec3 } from './types';

export const dist = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

const PALM = [0, 5, 9, 13, 17];

export function palmCenter(h: HandState): Vec3 {
  const pts = PALM.map((i) => h.landmarks[i]!);
  const n = pts.length;
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / n,
    y: pts.reduce((s, p) => s + p.y, 0) / n,
    z: pts.reduce((s, p) => s + p.z, 0) / n,
  };
}

/** Comfortable tracking zone in view mm (centre origin); the stage draws and checks the same numbers. */
export const OPTIMAL_ZONE = { w: 160, h: 150, cy: 10 };

export const inOptimalZone = (palm: Vec3) =>
  Math.abs(palm.x) <= OPTIMAL_ZONE.w / 2 && Math.abs(palm.y - OPTIMAL_ZONE.cy) <= OPTIMAL_ZONE.h / 2;

/** |wrist → middle MCP|: normalises distances across sources and camera distance. */
export const handSize = (h: HandState) => dist(h.landmarks[0]!, h.landmarks[9]!);

/** Maps the virtual view (centre origin, mm) onto a w×h box with object-fit: cover. */
export function project(p: Vec3, w: number, h: number, aspect = DEFAULT_VIEW_ASPECT) {
  const s = Math.max(w / VIEW_WIDTH_MM, h / (VIEW_WIDTH_MM * aspect));
  return { x: w / 2 + p.x * s, y: h / 2 - p.y * s, scale: s };
}
