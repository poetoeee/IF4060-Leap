import { create } from 'zustand';
import { WebActionExecutor } from '@/executor/web';
import type { ActionExecutor } from '@/executor/types';
import { actionCaps, actionSummary } from '@/mapping/format';
import { resolve } from '@/mapping/resolver';
import { PAUSE_HOLD_MS } from '@/mapping/rules';
import type { GestureId } from '@/mapping/types';
import type { GestureEvent, Side } from '@/recognizer/types';
import { getActiveProfile, useAppStore } from '@/store';
import { subscribeGestures } from './index';

export type Outcome = 'sent' | 'paused' | 'unmapped' | 'disabled' | 'toggle';

export interface Entry {
  id: number;
  gesture: GestureId;
  hand: Side;
  confidence: number;
  at: number;
  outcome: Outcome;
  caps: string[];
  label: string;
}

export type Hud =
  | { state: 'recognized'; entry: Entry }
  | { state: 'candidate'; gesture: GestureId; confidence: number }
  | { state: 'paused' }
  | { state: 'resumed' }
  | { state: 'holding'; progress: number };

interface ControllerState {
  recent: Entry[];
  hud: Hud | null;
}

export const useController = create<ControllerState>(() => ({ recent: [], hud: null }));

const HUD_MS = 1200;
const HUD_TOGGLE_MS = 2500;
/** Pause-hold ring appears once the left palm has been held this long. */
const HOLD_RING_FROM_MS = 400;
let hudTimer = 0;
let nextId = 0;

function showHud(hud: Hud, ms = HUD_MS) {
  clearTimeout(hudTimer);
  useController.setState({ hud });
  hudTimer = window.setTimeout(() => useController.setState({ hud: null }), ms);
}

export function setControllerEnabled(enabled: boolean) {
  useAppStore.getState().setSetting('controllerEnabled', enabled);
  showHud({ state: enabled ? 'resumed' : 'paused' }, HUD_TOGGLE_MS);
}

function record(e: GestureEvent, outcome: Outcome, caps: string[], label: string): Entry {
  const entry: Entry = { id: nextId++, gesture: e.gesture, hand: e.hand, confidence: e.confidence, at: Date.now(), outcome, caps, label };
  useController.setState((s) => ({ recent: [entry, ...s.recent].slice(0, 5) }));
  return entry;
}

function onEvent(e: GestureEvent, executor: ActionExecutor) {
  const { controllerEnabled } = useAppStore.getState().settings;

  if (e.kind === 'hold') {
    if (e.hand === 'left' && (e.holdMs ?? 0) >= HOLD_RING_FROM_MS && (e.holdMs ?? 0) < PAUSE_HOLD_MS) {
      showHud({ state: 'holding', progress: (e.holdMs ?? 0) / PAUSE_HOLD_MS }, 300);
    }
    return;
  }
  if (e.kind === 'candidate') {
    if (controllerEnabled) showHud({ state: 'candidate', gesture: e.gesture, confidence: e.confidence });
    return;
  }

  const r = resolve(e, controllerEnabled, getActiveProfile());
  switch (r.kind) {
    case 'ignored':
      return;
    case 'toggle':
      record(e, 'toggle', [], r.enabled ? 'Resumed' : 'Paused');
      return setControllerEnabled(r.enabled);
    case 'paused':
      record(e, 'paused', [], 'Paused');
      return showHud({ state: 'paused' });
    case 'unmapped':
      return showHud({ state: 'recognized', entry: record(e, 'unmapped', [], 'Not mapped') });
    case 'disabled':
      return showHud({ state: 'recognized', entry: record(e, 'disabled', actionCaps(r.mapping.action), 'Mapping off') });
    case 'execute': {
      const m = r.mapping;
      const entry = record(e, 'sent', actionCaps(m.action), m.label ?? actionSummary(m.action));
      showHud({ state: 'recognized', entry });
      executor.execute(m.action);
      console.debug(`[exec] ${e.gesture} → ${entry.caps.join('+')} · detect→execute ${(performance.now() - e.t).toFixed(1)}ms`);
    }
  }
}

/** Resolves recognised gestures and executes actions. Returns a disposer. */
export function startController() {
  const executor = new WebActionExecutor();
  const offGestures = subscribeGestures((e) => onEvent(e, executor));
  const onKey = (e: KeyboardEvent) => {
    if (e.isTrusted && e.ctrlKey && e.altKey && e.code === 'KeyG') {
      e.preventDefault();
      setControllerEnabled(!useAppStore.getState().settings.controllerEnabled);
    }
  };
  window.addEventListener('keydown', onKey);
  return () => {
    offGestures();
    window.removeEventListener('keydown', onKey);
  };
}
