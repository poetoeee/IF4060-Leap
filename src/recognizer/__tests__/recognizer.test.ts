import { describe, expect, it } from 'vitest';
import type { GestureId, Sensitivity } from '@/mapping/types';
import { makeHand, type Pose } from '@/tracking/sources/mockHand';
import { MOCK_KEYS, poseAt, restPose, scriptDuration, type MockGesture, type Side } from '@/tracking/sources/mockScripts';
import type { HandState } from '@/tracking/types';
import { Recognizer } from '../engine';
import { extendedFingers, grabOf, pinchOf } from '../features';
import type { GestureEvent } from '../types';

const DT = 1000 / 30;

/** Feeds rest → script → rest through a fresh recognizer and returns all events. */
function run(
  g: MockGesture | null,
  { side = 'right' as Side, sensitivity = 'balanced' as Sensitivity, scale = 1, restMs = 1000, mutate = (p: Pose) => p } = {},
): GestureEvent[] {
  const rec = new Recognizer(sensitivity);
  const events: GestureEvent[] = [];
  let t = 0;
  const feed = (pose: Pose) => {
    const hand = scaleHand(makeHand(mutate(pose)), scale);
    events.push(...rec.process({ source: 'mock', timestamp: t, hands: [hand] }));
    t += DT;
  };
  for (let i = 0; i < restMs; i += DT) feed(restPose(side));
  if (g) for (let s = 0; s <= scriptDuration(g); s += DT) feed(poseAt(g, side, s));
  for (let i = 0; i < restMs; i += DT) feed(restPose(side));
  return events;
}

const scaleHand = (h: HandState, s: number): HandState =>
  s === 1 ? h : { ...h, landmarks: h.landmarks.map((p) => ({ x: p.x * s, y: p.y * s, z: p.z * s })) };

const fired = (evs: GestureEvent[]) => evs.filter((e) => e.kind === 'gesture').map((e) => `${e.gesture}${e.holdMs ? `@${e.holdMs}` : ''}:${e.hand}`);

const EXPECTED: Record<MockGesture, string[]> = {
  swipe_left: ['swipe_left'],
  swipe_right: ['swipe_right'],
  swipe_up: ['swipe_up'],
  swipe_down: ['swipe_down'],
  pinch: ['pinch'],
  fist: ['fist'],
  open_palm: ['open_palm@600', 'open_palm@2000'],
  // The height script moves the hand slowly — no gesture fires until one is mapped.
  height: [],
};

describe('rest pose', () => {
  it('is relaxed: not an open palm, still open enough to swipe', () => {
    const h = makeHand(restPose('right'));
    const ext = extendedFingers(h.landmarks).filter(Boolean).length;
    expect(ext).toBeGreaterThanOrEqual(3);
    expect(ext).toBeLessThan(5);
    expect(grabOf(h)).toBeLessThan(0.35);
  });

  it('reads a camera-style pinch: tips ~0.25 handSize apart, noisy depth', () => {
    const h = makeHand({ ...restPose('right'), pinch: 1 });
    const size = Math.hypot(h.landmarks[9]!.x - h.landmarks[0]!.x, h.landmarks[9]!.y - h.landmarks[0]!.y);
    const tip = h.landmarks[4]!;
    h.landmarks[4] = { x: tip.x + 0.25 * size, y: tip.y, z: tip.z + 25 };
    expect(pinchOf(h)).toBeGreaterThan(0.8);
  });

  it('fires nothing over 3 s', () => {
    expect(fired(run(null, { restMs: 3000 }))).toEqual([]);
  });
});

describe.each(['right', 'left'] as Side[])('%s hand', (side) => {
  it.each(MOCK_KEYS)('%s fires exactly once, nothing else', (g) => {
    expect(fired(run(g, { side }))).toEqual(EXPECTED[g].map((e) => `${e}:${side}`));
  });
});

describe('robustness', () => {
  it.each(MOCK_KEYS)('%s works on a hand half the size (handSize units)', (g) => {
    expect(fired(run(g, { scale: 0.5 }))).toEqual(EXPECTED[g].map((e) => `${e}:right`));
  });

  it('a fast return stroke right after a swipe does not fire the opposite swipe or open palm', () => {
    const rec = new Recognizer();
    const evs: GestureEvent[] = [];
    const base = restPose('right');
    // 260 mm right in 300 ms, then straight back at the same speed with all 5 fingers open.
    for (let i = 0, t = 0; t <= 1400; i++, t = i * DT) {
      const u = t < 300 ? t / 300 : t < 600 ? 1 - (t - 300) / 300 : 0;
      const pose = { ...base, curl: 0, thumb: 1, wrist: { ...base.wrist, x: base.wrist.x + 260 * u } };
      evs.push(...rec.process({ source: 'mock', timestamp: t, hands: [makeHand(pose)] }));
    }
    expect(fired(evs)[0]).toBe('swipe_right:right');
    expect(fired(evs)).not.toContain('swipe_left:right');
  });

  it('cooldown blocks a second identical gesture within 500 ms', () => {
    const rec = new Recognizer();
    const evs: GestureEvent[] = [];
    let t = 0;
    const feed = (pinch: number) => {
      evs.push(...rec.process({ source: 'mock', timestamp: t, hands: [makeHand({ ...restPose('right'), curl: 0.08, thumb: 0.6, pinch })] }));
      t += DT;
    };
    for (const p of [0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1]) feed(p); // two held pinches ~200 ms apart
    expect(fired(evs)).toEqual(['pinch:right']);
  });

  it('emits hold progress while Open Palm is held', () => {
    const holds = run('open_palm').filter((e) => e.kind === 'hold');
    expect(holds.length).toBeGreaterThan(30);
    expect(Math.max(...holds.map((e) => e.holdMs ?? 0))).toBeGreaterThanOrEqual(2000);
  });

  it('uses custom hold thresholds', () => {
    const rec = new Recognizer('balanced', [300, 800, 2000]);
    const evs: GestureEvent[] = [];
    let t = 0;
    for (let s = 0; s <= scriptDuration('open_palm'); s += DT) {
      evs.push(...rec.process({ source: 'mock', timestamp: t, hands: [makeHand(poseAt('open_palm', 'right', s))] }));
      t += DT;
    }
    expect(fired(evs)).toEqual(['open_palm@300:right', 'open_palm@800:right', 'open_palm@2000:right']);
  });
});

describe('hold-to-repeat', () => {
  const STROKE_END_MS = 430; // swipe_up script: 150 ms wind-up + 280 ms stroke

  /** Swipe up, then either hold the open hand still at the top for `holdMs` or follow the script's slow return. */
  function swipeUp(repeatGestures: GestureId[], holdMs: number | null) {
    const rec = new Recognizer();
    rec.setRepeatGestures(repeatGestures);
    const evs: GestureEvent[] = [];
    let t = 0;
    const feed = (pose: Pose) => {
      evs.push(...rec.process({ source: 'mock', timestamp: t, hands: [makeHand(pose)] }));
      t += DT;
    };
    for (let i = 0; i < 1000; i += DT) feed(restPose('right'));
    const end = holdMs === null ? scriptDuration('swipe_up') : STROKE_END_MS;
    for (let s = 0; s <= end; s += DT) feed(poseAt('swipe_up', 'right', s));
    for (let i = 0; i < (holdMs ?? 0); i += DT) feed(poseAt('swipe_up', 'right', STROKE_END_MS));
    return evs;
  }
  const repeats = (evs: GestureEvent[]) => evs.filter((e) => e.kind === 'repeat');

  it('repeats a held swipe every ~120 ms after a 400 ms delay, without firing Open Palm', () => {
    const evs = swipeUp(['swipe_up'], 1500);
    expect(fired(evs)).toEqual(['swipe_up:right']);
    expect(repeats(evs).length).toBeGreaterThanOrEqual(7);
    expect(repeats(evs).every((e) => e.gesture === 'swipe_up' && e.hand === 'right')).toBe(true);
  });

  it('does not repeat swipes that are not configured', () => {
    expect(repeats(swipeUp([], 1500))).toEqual([]);
  });

  it('does not repeat when the hand moves on after the swipe', () => {
    expect(repeats(swipeUp(['swipe_up'], null))).toEqual([]);
  });
});

describe('height gestures', () => {
  /** Feeds the height script (a slow 10 cm rise and fall) with the height gestures mapped. */
  function heightRun(hands: Record<Side, GestureId[]>, side: Side = 'right') {
    const rec = new Recognizer();
    rec.setHeightGestures(hands);
    const evs: GestureEvent[] = [];
    let t = 0;
    const feed = (pose: Pose) => {
      evs.push(...rec.process({ source: 'mock', timestamp: t, hands: [makeHand(pose)] }));
      t += DT;
    };
    for (let i = 0; i < 1000; i += DT) feed(restPose(side));
    for (let s = 0; s <= scriptDuration('height'); s += DT) feed(poseAt('height', side, s));
    return evs;
  }

  const gestures = (evs: GestureEvent[]) => evs.filter((e) => e.kind === 'gesture');

  it('sends one input per centimetre the hand rises and falls', () => {
    const evs = gestures(heightRun({ left: [], right: ['height_up', 'height_down'] }));
    expect(evs.filter((e) => e.gesture === 'height_up')).toHaveLength(10);
    expect(evs.filter((e) => e.gesture === 'height_down')).toHaveLength(10);
    expect(evs.every((e) => e.steps === 1)).toBe(true);
  });

  it('stays quiet for the hand without a height mapping', () => {
    expect(gestures(heightRun({ left: [], right: [] }))).toEqual([]);
    // The mapping is per hand: the left hand moves, only the right hand is mapped.
    expect(gestures(heightRun({ left: [], right: ['height_up'] }, 'left'))).toEqual([]);
  });

  it('does not fire a direction that is not mapped', () => {
    const evs = gestures(heightRun({ left: [], right: ['height_up'] }));
    expect(evs).toHaveLength(10);
    expect(evs.every((e) => e.gesture === 'height_up')).toBe(true);
  });

  it('reports the travelled distance as steps', () => {
    const evs = gestures(heightRun({ left: [], right: ['height_up', 'height_down'] }));
    expect(evs.reduce((n, e) => n + (e.steps ?? 0), 0)).toBe(20);
  });
});

describe('sensitivity', () => {
  // A shorter swipe: 60 % of the scripted distance.
  const short = (p: Pose): Pose => ({ ...p, wrist: { ...p.wrist, x: restPose(p.side).wrist.x + (p.wrist.x - restPose(p.side).wrist.x) * 0.6 } });

  it('relaxed accepts a short swipe that strict rejects', () => {
    expect(fired(run('swipe_right', { sensitivity: 'relaxed', mutate: short }))).toContain('swipe_right:right');
    expect(fired(run('swipe_right', { sensitivity: 'strict', mutate: short }))).not.toContain('swipe_right:right');
  });

  it('strict still accepts the full scripted gestures', () => {
    for (const g of MOCK_KEYS) expect(fired(run(g, { sensitivity: 'strict' }))).toEqual(EXPECTED[g].map((e) => `${e}:right`));
  });
});
