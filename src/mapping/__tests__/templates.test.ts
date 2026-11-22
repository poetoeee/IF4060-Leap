import { describe, expect, it } from 'vitest';
import { GESTURE } from '../gestures';
import { handsOverlap, isReserved, validateMapping } from '../rules';
import { DEFAULT_TEMPLATE_ID, TEMPLATES, getTemplate } from '../templates';
import type { Profile } from '../types';

const emptyProfile: Profile = { id: 'scratch', name: 'Scratch', kind: 'custom', description: '', mappings: [] };

describe('template catalogue', () => {
  it('covers the common activities', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['template', 'scrolling', 'browsing', 'presentation', 'media']);
    expect(DEFAULT_TEMPLATE_ID).toBe('template');
    expect(getTemplate('scrolling')?.name).toBe('Scrolling & Reading');
  });

  it('only maps gestures the recognizer can detect', () => {
    for (const t of TEMPLATES) {
      for (const m of t.mappings) expect(GESTURE[m.gesture].available, `${t.id}/${m.gesture}`).toBe(true);
    }
  });

  it('keeps every template row valid in a fresh profile', () => {
    for (const t of TEMPLATES) {
      for (const m of t.mappings) expect(validateMapping(emptyProfile, m), `${t.id}/${m.gesture}`).toBeNull();
    }
  });

  it('never maps a gesture twice or uses a reserved hand', () => {
    for (const t of TEMPLATES) {
      for (const m of t.mappings) {
        expect(isReserved(m.gesture, m.hand), `${t.id}/${m.gesture}`).toBe(false);
        const clash = t.mappings.find((o) => o.id !== m.id && o.gesture === m.gesture && handsOverlap(o.hand, m.hand));
        expect(clash, `${t.id}/${m.gesture}`).toBeUndefined();
      }
    }
  });

  it('marks the Mapping Template as the recommended one', () => {
    expect(TEMPLATES.filter((t) => t.recommended).map((t) => t.id)).toEqual(['template']);
  });
});
