import { describe, expect, it } from 'vitest';
import { dist, handSize, palmCenter, project } from '../hand';
import { makeHand } from '../sources/mockHand';
import { MOCK_KEYS, poseAt, restPose, scriptDuration, scriptFrames } from '../sources/mockScripts';

const grabOf = (lm: ReturnType<typeof makeHand>['landmarks']) => {
  const w = lm[0]!;
  const fingers = [[5, 8], [9, 12], [13, 16], [17, 20]] as const;
  const g = fingers.map(([mcp, tip]) => 1 - (dist(lm[tip]!, w) / dist(lm[mcp]!, w) - 1) / 0.6);
  return g.reduce((s, x) => s + Math.min(1, Math.max(0, x)), 0) / 4;
};

describe('mock hand', () => {
  it('has 21 landmarks and a realistic hand size', () => {
    const h = makeHand(restPose('right'));
    expect(h.landmarks).toHaveLength(21);
    expect(handSize(h)).toBeGreaterThan(70);
    expect(handSize(h)).toBeLessThan(110);
  });

  it('puts the right thumb on the user-left and mirrors the left hand', () => {
    const r = makeHand(poseAt('open_palm', 'right', 1000));
    const l = makeHand(poseAt('open_palm', 'left', 1000));
    expect(r.landmarks[4]!.x).toBeLessThan(r.landmarks[20]!.x);
    expect(l.landmarks[4]!.x).toBeGreaterThan(l.landmarks[20]!.x);
  });

  it('curl 1 is a fist, curl 0 is open', () => {
    const open = makeHand({ ...restPose('right'), curl: 0, thumb: 1 });
    const fist = makeHand({ ...restPose('right'), curl: 1, thumb: 1 });
    expect(grabOf(open.landmarks)).toBeLessThan(0.1);
    expect(grabOf(fist.landmarks)).toBeGreaterThan(0.85);
  });

  it('pinch brings thumb tip to index tip', () => {
    const h = makeHand({ ...restPose('right'), pinch: 1 });
    expect(dist(h.landmarks[4]!, h.landmarks[8]!)).toBeLessThan(1);
  });
});

describe('mock scripts', () => {
  it('cover the 7 MVP gestures and end at rest', () => {
    expect(MOCK_KEYS).toHaveLength(7);
    for (const g of MOCK_KEYS) {
      const end = poseAt(g, 'right', scriptDuration(g));
      expect(end).toMatchObject({ curl: restPose('right').curl, pinch: 0 });
      expect(end.wrist).toEqual(restPose('right').wrist);
    }
  });

  it('swipe right moves the palm right by > 1.4 × handSize', () => {
    const frames = scriptFrames('swipe_right');
    const xs = frames.map((f) => palmCenter(f.hand).x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1.4 * handSize(frames[0]!.hand));
  });
});

describe('project', () => {
  it('maps the view centre to the box centre', () => {
    expect(project({ x: 0, y: 0, z: 0 }, 800, 600)).toMatchObject({ x: 400, y: 300 });
  });

  it('keeps +x right and +y up', () => {
    const p = project({ x: 10, y: 10, z: 0 }, 800, 600);
    expect(p.x).toBeGreaterThan(400);
    expect(p.y).toBeLessThan(300);
  });
});
