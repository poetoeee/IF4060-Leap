import type { GestureEvent } from '@/recognizer/types';
import { DEFAULT_HOLD_MS, isReserved, PAUSE_HOLD_MS } from './rules';
import type { Mapping, Profile } from './types';

export type Resolution =
  | { kind: 'toggle'; enabled: boolean }
  | { kind: 'paused' }
  | { kind: 'execute'; mapping: Mapping }
  | { kind: 'disabled'; mapping: Mapping }
  | { kind: 'unmapped' }
  /** Intermediate Open Palm hold threshold nobody listens to. */
  | { kind: 'ignored' };

const holdOf = (m: Mapping) => m.holdMs ?? DEFAULT_HOLD_MS;

/** Order: reserved pause rule → paused → active profile mapping. */
export function resolve(e: GestureEvent, controllerEnabled: boolean, profile: Profile | undefined): Resolution {
  if (e.gesture === 'open_palm' && e.hand === 'left') {
    return e.holdMs === PAUSE_HOLD_MS ? { kind: 'toggle', enabled: !controllerEnabled } : { kind: 'ignored' };
  }
  if (isReserved(e.gesture, e.hand)) return { kind: 'ignored' };

  const candidates = (profile?.mappings ?? [])
    .filter((m) => m.gesture === e.gesture && (m.hand === e.hand || m.hand === 'any'))
    .sort((a, b) => (a.hand === e.hand ? -1 : 0) - (b.hand === e.hand ? -1 : 0));

  let mapping = candidates[0];
  if (e.gesture === 'open_palm') {
    // One hold produces several thresholds; only the mapping's own hold time triggers it.
    mapping = candidates.find((m) => holdOf(m) === e.holdMs);
    if (!mapping && (candidates.length || e.holdMs !== DEFAULT_HOLD_MS)) return { kind: 'ignored' };
  }

  if (!controllerEnabled) return { kind: 'paused' };
  if (!mapping) return { kind: 'unmapped' };
  return mapping.enabled ? { kind: 'execute', mapping } : { kind: 'disabled', mapping };
}
