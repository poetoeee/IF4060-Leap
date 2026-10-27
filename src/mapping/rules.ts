import { sameAction } from './format';
import { GESTURE, GESTURES } from './gestures';
import type { Action, GestureId, Hand, Mapping, Profile } from './types';

export const HANDS: Hand[] = ['right', 'left', 'any'];
export const MAX_COMBO_KEYS = 3;
/** Left Open Palm held this long toggles the controller (Universal Controller rule). */
export const PAUSE_HOLD_MS = 2000;
export const DEFAULT_HOLD_MS = 300;

/** `any` overlaps both hands. */
export const handsOverlap = (a: Hand, b: Hand) => a === b || a === 'any' || b === 'any';

/** Left Open Palm is reserved for pause; `any` would include the left hand. */
export const isReserved = (g: GestureId, hand: Hand) => g === 'open_palm' && hand !== 'right';

export function findConflict(p: Profile, gesture: GestureId, hand: Hand, ignoreId?: string): Mapping | undefined {
  return p.mappings.find((m) => m.id !== ignoreId && m.gesture === gesture && handsOverlap(m.hand, hand));
}

export type HandBlock = 'taken' | 'reserved' | null;

/** Why each hand can't be used for `gesture` in this profile (null = free). */
export function handBlocks(p: Profile, gesture: GestureId, ignoreId?: string): Record<Hand, HandBlock> {
  const out = {} as Record<Hand, HandBlock>;
  for (const h of HANDS) out[h] = isReserved(gesture, h) ? 'reserved' : findConflict(p, gesture, h, ignoreId) ? 'taken' : null;
  return out;
}

/** Gestures that can still get a new mapping (detectable, with a free hand). */
export function freeGestures(p: Profile): GestureId[] {
  return GESTURES.filter((g) => g.available && Object.values(handBlocks(p, g.id)).includes(null)).map((g) => g.id);
}

export const mappedGestures = (p: Profile) => new Set(p.mappings.map((m) => m.gesture));

export function validateAction(a: Action): string | null {
  switch (a.type) {
    case 'key':
      return a.key ? null : 'Press a key to record it.';
    case 'combo':
      if (a.keys.length < 2) return 'A combination needs at least 2 keys.';
      return a.keys.length > MAX_COMBO_KEYS ? `Up to ${MAX_COMBO_KEYS} keys.` : null;
    case 'click':
      return null;
    case 'scroll':
      return a.amount >= 1 && a.amount <= 20 ? null : 'Scroll 1–20 lines.';
  }
}

/** Returns an error message, or null if `m` may be saved into `p`. */
export function validateMapping(p: Profile, m: Pick<Mapping, 'id' | 'gesture' | 'hand' | 'action'>): string | null {
  if (p.kind === 'template') return 'The Mapping Template is read-only.';
  if (!GESTURE[m.gesture].available) return `${GESTURE[m.gesture].name} needs the Leap Motion sensor.`;
  if (isReserved(m.gesture, m.hand)) return 'Left-hand Open Palm is reserved for pausing gestures.';
  const clash = findConflict(p, m.gesture, m.hand, m.id);
  if (clash) return `${GESTURE[m.gesture].name} is already mapped for the ${clash.hand} hand${clash.hand === 'any' ? 's' : ''}.`;
  return validateAction(m.action);
}

/** The template mapping a profile mapping can revert to (same gesture, overlapping hand). */
export function templateCounterpart(template: Profile, m: Pick<Mapping, 'gesture' | 'hand'>): Mapping | undefined {
  return template.mappings.find((t) => t.gesture === m.gesture && handsOverlap(t.hand, m.hand));
}

/** Source after an edit: template-sourced rows become `edited` once they differ from the template. */
export function tagSource(prev: Mapping, next: Mapping, template: Profile): Mapping['source'] {
  if (prev.source === 'custom') return 'custom';
  const t = templateCounterpart(template, next);
  if (!t) return prev.source;
  return sameAction(t.action, next.action) && (next.holdMs ?? DEFAULT_HOLD_MS) === (t.holdMs ?? DEFAULT_HOLD_MS) ? 'template' : 'edited';
}

export function canRevert(template: Profile, m: Mapping): boolean {
  return m.source === 'edited' && !!templateCounterpart(template, m);
}

export function reverted(template: Profile, m: Mapping): Mapping {
  const t = templateCounterpart(template, m);
  if (!t) return m;
  return { ...m, action: t.action, holdMs: t.holdMs, source: 'template' };
}

/** Hold thresholds the recognizer must emit for a profile (mappings + the pause rule). */
export function holdThresholds(p: Profile | undefined): number[] {
  const own = p?.mappings.filter((m) => m.gesture === 'open_palm').map((m) => m.holdMs ?? DEFAULT_HOLD_MS) ?? [];
  return [...new Set([DEFAULT_HOLD_MS, PAUSE_HOLD_MS, ...own])].sort((a, b) => a - b);
}
