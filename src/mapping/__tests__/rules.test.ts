import { describe, expect, it } from 'vitest';
import { seedProfiles, TEMPLATE } from '../seed';
import {
  canRevert,
  freeGestures,
  handBlocks,
  heightGestures,
  holdThresholds,
  repeatGestures,
  reverted,
  tagSource,
  validateAction,
  validateMapping,
} from '../rules';
import type { Mapping, Profile } from '../types';

const [presentation, web] = seedProfiles() as [Profile, Profile];
const draft = (over: Partial<Mapping>): Mapping => ({
  id: 'new',
  gesture: 'swipe_down',
  hand: 'right',
  action: { type: 'key', key: 'b' },
  enabled: true,
  source: 'custom',
  ...over,
});

describe('validateMapping', () => {
  it('accepts a free gesture', () => {
    expect(validateMapping(presentation, draft({}))).toBeNull();
  });

  it('rejects a duplicate (gesture, hand)', () => {
    expect(validateMapping(presentation, draft({ gesture: 'swipe_right' }))).toMatch(/already mapped/);
  });

  it('treats `any` as conflicting with left and right', () => {
    expect(validateMapping(presentation, draft({ gesture: 'swipe_right', hand: 'any' }))).toMatch(/already mapped/);
    const withAny: Profile = { ...presentation, mappings: [...presentation.mappings, draft({ id: 'a', gesture: 'swipe_up', hand: 'any' })] };
    expect(validateMapping(withAny, draft({ gesture: 'swipe_up', hand: 'left' }))).toMatch(/already mapped/);
  });

  it('allows the other hand for a mapped gesture', () => {
    expect(validateMapping(presentation, draft({ gesture: 'swipe_right', hand: 'left' }))).toBeNull();
  });

  it('allows editing a mapping in place', () => {
    const fist = presentation.mappings.find((m) => m.gesture === 'fist')!;
    expect(validateMapping(presentation, { ...fist, action: { type: 'key', key: 'q' } })).toBeNull();
  });

  it('reserves left (and any) Open Palm', () => {
    expect(validateMapping(web, draft({ gesture: 'open_palm', hand: 'left' }))).toMatch(/reserved/);
    expect(validateMapping(web, draft({ gesture: 'open_palm', hand: 'any' }))).toMatch(/reserved/);
    expect(validateMapping(web, draft({ gesture: 'open_palm', hand: 'right' }))).toBeNull();
  });

  it('keeps the template read-only', () => {
    expect(validateMapping(TEMPLATE, draft({}))).toMatch(/read-only/);
  });

  it('locks Tap and Circle', () => {
    expect(validateMapping(presentation, draft({ gesture: 'tap' }))).toMatch(/Leap/);
  });
});

describe('validateAction', () => {
  it('limits combos to 2–3 keys', () => {
    expect(validateAction({ type: 'combo', keys: ['Control'] })).not.toBeNull();
    expect(validateAction({ type: 'combo', keys: ['Control', 'Shift', 'Alt', 'x'] })).not.toBeNull();
    expect(validateAction({ type: 'combo', keys: ['Control', 'w'] })).toBeNull();
  });

  it('needs a recorded key', () => {
    expect(validateAction({ type: 'key', key: '' })).not.toBeNull();
  });
});

describe('free gestures and hands', () => {
  it('lists detectable gestures with a free hand', () => {
    // Presentation maps L/R Swipe Right/Left etc. only on one hand, so most stay free on the other.
    expect(freeGestures(presentation)).toEqual(expect.arrayContaining(['swipe_up', 'swipe_down']));
    expect(freeGestures(presentation)).not.toContain('tap');
  });

  it('explains blocked hands', () => {
    expect(handBlocks(presentation, 'open_palm')).toEqual({ right: 'taken', left: 'reserved', any: 'reserved' });
    expect(handBlocks(presentation, 'swipe_right')).toEqual({ right: 'taken', left: null, any: 'taken' });
  });
});

describe('source tagging', () => {
  const tplRow = web.mappings.find((m) => m.gesture === 'swipe_up')!;

  it('marks a template row as edited when its action changes', () => {
    const next = { ...tplRow, action: { type: 'scroll' as const, direction: 'up' as const, amount: 5 } };
    expect(tagSource(tplRow, next, TEMPLATE)).toBe('edited');
  });

  it('keeps template when only the label changes', () => {
    expect(tagSource(tplRow, { ...tplRow, label: 'Up' }, TEMPLATE)).toBe('template');
  });

  it('keeps custom rows custom', () => {
    const fist = web.mappings.find((m) => m.gesture === 'fist')!;
    expect(tagSource(fist, { ...fist, action: { type: 'key', key: 'x' } }, TEMPLATE)).toBe('custom');
  });

  it('reverts an edited row to the template action', () => {
    const back = web.mappings.find((m) => m.gesture === 'swipe_left')!;
    expect(canRevert(TEMPLATE, back)).toBe(true);
    expect(reverted(TEMPLATE, back)).toMatchObject({ action: { type: 'key', key: 'ArrowLeft' }, source: 'template' });
  });

  it('cannot revert when the template has no executable counterpart', () => {
    const palm = presentation.mappings.find((m) => m.gesture === 'open_palm')!;
    expect(canRevert(TEMPLATE, palm)).toBe(false);
  });
});

describe('holdThresholds', () => {
  it('includes default, pause and mapping holds', () => {
    expect(holdThresholds(presentation)).toEqual([600, 1000, 2000]);
    expect(holdThresholds(web)).toEqual([600, 2000]);
  });
});

describe('repeatGestures', () => {
  const withRepeat = (p: Profile, enabled = true): Profile => ({
    ...p,
    mappings: p.mappings.map((m) => (m.action.type === 'scroll' && m.gesture === 'swipe_down' ? { ...m, enabled, action: { ...m.action, repeat: true } } : m)),
  });

  it('lists only enabled scroll mappings with repeat on', () => {
    expect(repeatGestures(web)).toEqual([]);
    expect(repeatGestures(withRepeat(web))).toEqual(['swipe_down']);
    expect(repeatGestures(withRepeat(web, false))).toEqual([]);
    expect(repeatGestures(undefined)).toEqual([]);
  });

  it('accepts up to 20 scroll lines', () => {
    expect(validateAction({ type: 'scroll', direction: 'up', amount: 20 })).toBeNull();
    expect(validateAction({ type: 'scroll', direction: 'up', amount: 21 })).not.toBeNull();
  });
});

describe('height gestures', () => {
  const withHeight = (m: Mapping): Profile => ({ ...presentation, mappings: [...presentation.mappings, m] });

  it('lists the height gestures of the active profile, per hand', () => {
    expect(heightGestures(undefined)).toEqual({ left: [], right: [] });
    expect(heightGestures(presentation)).toEqual({ left: [], right: [] });
    expect(heightGestures(withHeight(draft({ id: 'h', gesture: 'height_up', hand: 'right' })))).toEqual({
      left: [],
      right: ['height_up'],
    });
  });

  it('counts an `any` hand for both hands', () => {
    const p = withHeight(draft({ id: 'h', gesture: 'height_up', hand: 'any' }));
    expect(heightGestures(p)).toEqual({ left: ['height_up'], right: ['height_up'] });
  });

  it('skips disabled mappings', () => {
    const p = withHeight(draft({ id: 'h', gesture: 'height_up', hand: 'right', enabled: false }));
    expect(heightGestures(p)).toEqual({ left: [], right: [] });
  });

  it('keeps the two directions apart', () => {
    const p = withHeight(draft({ id: 'h', gesture: 'height_down', hand: 'left' }));
    expect(heightGestures(p)).toEqual({ left: ['height_down'], right: [] });
  });
});
