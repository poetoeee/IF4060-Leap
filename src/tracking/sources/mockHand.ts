import type { HandState, Vec3 } from '../types';

/** Synthetic hand pose. `curl` 0 straight … 1 fist; `thumb` 0 tucked … 1 out; `pinch` 0–1 brings thumb to index tip. */
export interface Pose {
  side: 'left' | 'right';
  wrist: Vec3;
  curl: number;
  thumb: number;
  pinch: number;
}

// Right hand, palm facing the camera, fingers up: thumb sits on the user's left (−x).
const FINGERS = [
  { mcp: [-25, 80], len: [40, 25, 22] },
  { mcp: [-5, 88], len: [45, 28, 24] },
  { mcp: [15, 84], len: [42, 26, 22] },
  { mcp: [32, 74], len: [32, 20, 18] },
] as const;
const CURL_DEG = [90, 100, 80];

const v = (x: number, y: number, z = 0): Vec3 => ({ x, y, z });
const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t);

function finger(mcp: Vec3, len: readonly number[], curl: number): Vec3[] {
  const pts = [mcp];
  let angle = 0;
  let p = mcp;
  len.forEach((l, i) => {
    angle += ((CURL_DEG[i] ?? 0) * curl * Math.PI) / 180;
    // Curl rotates toward the palm side (−z, away from the user).
    p = v(p.x, p.y + Math.cos(angle) * l, p.z - Math.sin(angle) * l);
    pts.push(p);
  });
  return pts;
}

export function makeHand(pose: Pose): HandState {
  const { curl, pinch, thumb: thumbOut } = pose;
  const fingers = FINGERS.map((f, i) => finger(v(f.mcp[0], f.mcp[1]), f.len, i === 0 ? Math.max(curl, pinch * 0.35) : curl));
  const indexTip = fingers[0]![3]!;

  const thumbOpen = [v(-25, 25), v(-45, 45), v(-62, 64), v(-80, 85)];
  const thumbTucked = [v(-22, 25), v(-32, 42), v(-28, 58, -18), v(-12, 64, -26)];
  let thumb = thumbOpen.map((p, i) => lerp(thumbTucked[i]!, p, thumbOut));
  if (pinch > 0) {
    thumb = thumb.map((p, i) => (i < 2 ? p : lerp(p, i === 3 ? indexTip : lerp(thumb[2]!, indexTip, 0.5), pinch)));
  }

  const mirror = pose.side === 'left' ? -1 : 1;
  const local = [v(0, 0), ...thumb, ...fingers.flat()];
  return {
    side: pose.side,
    confidence: 0.95,
    landmarks: local.map((p) => v(pose.wrist.x + p.x * mirror, pose.wrist.y + p.y, pose.wrist.z + p.z)),
  };
}
