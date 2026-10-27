import { describe, expect, it } from 'vitest';
import type { GestureEvent } from '@/recognizer/types';
import { resolve } from '../resolver';
import { seedProfiles } from '../seed';
import type { Profile } from '../types';

const [presentation, web] = seedProfiles() as [Profile, Profile];
const ev = (over: Partial<GestureEvent>): GestureEvent => ({ kind: 'gesture', gesture: 'swipe_right', hand: 'right', confidence: 0.9, t: 0, ...over });

describe('resolve', () => {
  it('executes the matching mapping', () => {
    expect(resolve(ev({}), true, presentation)).toMatchObject({ kind: 'execute', mapping: { id: 'p-swipe-right' } });
  });

  it('left Open Palm held 2 s toggles the controller, also while paused', () => {
    expect(resolve(ev({ gesture: 'open_palm', hand: 'left', holdMs: 2000 }), true, presentation)).toEqual({ kind: 'toggle', enabled: false });
    expect(resolve(ev({ gesture: 'open_palm', hand: 'left', holdMs: 2000 }), false, presentation)).toEqual({ kind: 'toggle', enabled: true });
    expect(resolve(ev({ gesture: 'open_palm', hand: 'left', holdMs: 300 }), true, presentation)).toEqual({ kind: 'ignored' });
  });

  it('does nothing while paused', () => {
    expect(resolve(ev({}), false, presentation)).toEqual({ kind: 'paused' });
  });

  it('reports disabled and unmapped gestures', () => {
    expect(resolve(ev({ gesture: 'pinch' }), true, presentation)).toMatchObject({ kind: 'disabled' });
    expect(resolve(ev({ gesture: 'swipe_up' }), true, presentation)).toEqual({ kind: 'unmapped' });
    expect(resolve(ev({ gesture: 'swipe_right', hand: 'left' }), true, presentation)).toEqual({ kind: 'unmapped' });
  });

  it('matches Open Palm only at the mapping hold time', () => {
    const palm = (holdMs: number) => resolve(ev({ gesture: 'open_palm', holdMs }), true, presentation);
    expect(palm(300)).toEqual({ kind: 'ignored' });
    expect(palm(800)).toMatchObject({ kind: 'execute', mapping: { id: 'p-open-palm' } });
    expect(palm(2000)).toEqual({ kind: 'ignored' });
  });

  it('reports an unmapped right Open Palm once (at the default hold)', () => {
    expect(resolve(ev({ gesture: 'open_palm', holdMs: 300 }), true, web)).toEqual({ kind: 'unmapped' });
    expect(resolve(ev({ gesture: 'open_palm', holdMs: 2000 }), true, web)).toEqual({ kind: 'ignored' });
  });

  it('`any` mappings match either hand; exact hand wins', () => {
    const p: Profile = {
      ...web,
      mappings: [
        { id: 'any', gesture: 'swipe_up', hand: 'any', action: { type: 'key', key: 'a' }, enabled: true, source: 'custom' },
        ...web.mappings.filter((m) => m.gesture !== 'swipe_up'),
      ],
    };
    expect(resolve(ev({ gesture: 'swipe_up', hand: 'left' }), true, p)).toMatchObject({ mapping: { id: 'any' } });
  });
});
