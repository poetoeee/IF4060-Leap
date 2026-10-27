import { dist, handSize, palmCenter } from '@/tracking/hand';
import type { HandState, Vec3 } from '@/tracking/types';

export interface Features {
  t: number;
  palm: Vec3;
  size: number;
  /** thumb, index, middle, ring, pinky */
  extended: boolean[];
  extendedCount: number;
  pinch: number;
  grab: number;
  /** Palm velocity over the last ~150 ms (mm/s). */
  vel: Vec3;
  speed: number;
  confidence: number;
}

export interface Sample {
  t: number;
  palm: Vec3;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const FINGERS = [
  [5, 6, 8],
  [9, 10, 12],
  [13, 14, 16],
  [17, 18, 20],
] as const; // [MCP, PIP, TIP]
const VEL_WINDOW_MS = 150;

export function extendedFingers(lm: Vec3[]): boolean[] {
  const w = lm[0]!;
  const thumb = dist(lm[4]!, lm[5]!) / dist(lm[3]!, lm[5]!) > 1.15;
  return [thumb, ...FINGERS.map(([, pip, tip]) => dist(lm[tip]!, w) / dist(lm[pip]!, w) > 1.15)];
}

export function pinchOf(h: HandState, size = handSize(h)): number {
  return h.native?.pinch ?? clamp01(1 - dist(h.landmarks[4]!, h.landmarks[8]!) / (0.35 * size));
}

export function grabOf(h: HandState): number {
  if (h.native?.grab !== undefined) return h.native.grab;
  const lm = h.landmarks;
  const w = lm[0]!;
  const sum = FINGERS.reduce((s, [mcp, , tip]) => s + clamp01(1 - (dist(lm[tip]!, w) / dist(lm[mcp]!, w) - 1) / 0.6), 0);
  return sum / FINGERS.length;
}

/** `history` holds earlier samples of this hand (oldest first); used for velocity. */
export function computeFeatures(h: HandState, t: number, history: Sample[]): Features {
  const palm = palmCenter(h);
  const size = handSize(h);
  const extended = extendedFingers(h.landmarks);
  const ref = history.find((s) => t - s.t <= VEL_WINDOW_MS) ?? history.at(-1);
  const dt = ref ? (t - ref.t) / 1000 : 0;
  const vel = ref && dt > 0 ? { x: (palm.x - ref.palm.x) / dt, y: (palm.y - ref.palm.y) / dt, z: (palm.z - ref.palm.z) / dt } : { x: 0, y: 0, z: 0 };
  return {
    t,
    palm,
    size,
    extended,
    extendedCount: extended.filter(Boolean).length,
    pinch: pinchOf(h, size),
    grab: grabOf(h),
    vel,
    speed: Math.hypot(vel.x, vel.y),
    confidence: h.confidence,
  };
}

export type Pose = 'open palm' | 'fist' | 'pinch' | 'relaxed';

export function poseOf(f: Features): Pose {
  if (f.grab >= 0.85) return 'fist';
  if (f.pinch >= 0.8) return 'pinch';
  if (f.extendedCount === 5 && f.grab < 0.15) return 'open palm';
  return 'relaxed';
}
