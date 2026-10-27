import type { HandState } from '../types';
import { makeHand, type Pose } from './mockHand';

export type MockGesture = 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down' | 'pinch' | 'fist' | 'open_palm';
export type Side = Pose['side'];

/** Keys 1–7 in PRD order. */
export const MOCK_KEYS: MockGesture[] = ['swipe_left', 'swipe_right', 'swipe_up', 'swipe_down', 'pinch', 'fist', 'open_palm'];

type Key = { t: number; dx?: number; dy?: number; curl?: number; thumb?: number; pinch?: number };

/** Relaxed hand: fingers slightly bent, thumb tucked — not an Open Palm, still open enough to swipe. */
const REST = { dx: 0, dy: 0, curl: 0.3, thumb: 0, pinch: 0 };
const OPEN = { curl: 0.08, thumb: 0.6 };

const swipe = (dx: number, dy: number, ms: number): Key[] => [
  { t: 0 },
  { t: 150, ...OPEN, dx: -dx / 2, dy: -dy / 2 },
  { t: 300, ...OPEN, dx: -dx / 2, dy: -dy / 2 },
  { t: 300 + ms, ...OPEN, dx: dx / 2, dy: dy / 2 },
  { t: 450 + ms, ...OPEN, dx: dx / 2, dy: dy / 2 },
  { t: 1300 + ms },
];

const SCRIPTS: Record<MockGesture, Key[]> = {
  swipe_left: swipe(-260, 0, 300),
  swipe_right: swipe(260, 0, 300),
  swipe_up: swipe(0, 220, 280),
  swipe_down: swipe(0, -220, 280),
  pinch: [{ t: 0 }, { t: 100, ...OPEN }, { t: 250, ...OPEN, pinch: 1 }, { t: 550, ...OPEN, pinch: 1 }, { t: 700, ...OPEN }, { t: 900 }],
  fist: [{ t: 0 }, { t: 100 }, { t: 250, curl: 1, thumb: 1 }, { t: 700, curl: 1, thumb: 1 }, { t: 950 }],
  open_palm: [{ t: 0 }, { t: 150, curl: 0, thumb: 1 }, { t: 2650, curl: 0, thumb: 1 }, { t: 2850 }],
};

const smooth = (t: number) => t * t * (3 - 2 * t);

export function restPose(side: Side): Pose {
  return { side, wrist: { x: side === 'right' ? 40 : -40, y: -65, z: 0 }, curl: REST.curl, thumb: REST.thumb, pinch: 0 };
}

export function scriptDuration(g: MockGesture): number {
  return SCRIPTS[g].at(-1)!.t;
}

/** Pose of gesture `g` at `t` ms into its script. */
export function poseAt(g: MockGesture, side: Side, t: number): Pose {
  const keys = SCRIPTS[g];
  const next = keys.findIndex((k) => k.t > t);
  const i = next === -1 ? keys.length - 1 : Math.max(0, next - 1);
  const a = { ...REST, ...keys[i]! };
  const b = { ...REST, ...(keys[i + 1] ?? keys[i]!) };
  const k = b.t === a.t ? 1 : smooth(Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))));
  const mix = (p: number, q: number) => p + (q - p) * k;
  const rest = restPose(side);
  return {
    side,
    wrist: { x: rest.wrist.x + mix(a.dx, b.dx), y: rest.wrist.y + mix(a.dy, b.dy), z: 0 },
    curl: mix(a.curl, b.curl),
    thumb: mix(a.thumb, b.thumb),
    pinch: mix(a.pinch, b.pinch),
  };
}

/** Sampled script for tests: `{ t, hand }` every 1000/fps ms. */
export function scriptFrames(g: MockGesture, side: Side = 'right', fps = 30): { t: number; hand: HandState }[] {
  const out = [];
  for (let t = 0; t <= scriptDuration(g); t += 1000 / fps) out.push({ t, hand: makeHand(poseAt(g, side, t)) });
  return out;
}
