import { create } from 'zustand';
import { holdThresholds } from '@/mapping/rules';
import { Recognizer } from '@/recognizer/engine';
import type { GestureEvent } from '@/recognizer/types';
import { getActiveProfile, useAppStore } from '@/store';
import { subscribeFrames, useTrackingStore } from '@/tracking/manager';

export interface LoggedEvent extends GestureEvent {
  id: number;
  /** Frame → event processing time (ms). */
  latency: number;
}

const LOG_SIZE = 8;

/** Recent fired/candidate events (no `hold` spam). */
export const useGestureLog = create<{ events: LoggedEvent[] }>(() => ({ events: [] }));

export const recognizer = new Recognizer(useAppStore.getState().settings.sensitivity);

const gestureCbs = new Set<(e: GestureEvent) => void>();
let nextId = 0;

export function subscribeGestures(cb: (e: GestureEvent) => void) {
  gestureCbs.add(cb);
  return () => void gestureCbs.delete(cb);
}

/** Wires frames → recognizer → subscribers. Returns a disposer. */
export function startPipeline() {
  const offFrames = subscribeFrames((f) => {
    const events = recognizer.process(f);
    if (!events.length) return;
    const latency = performance.now() - f.timestamp;
    const logged: LoggedEvent[] = [];
    for (const e of events) {
      gestureCbs.forEach((cb) => cb(e));
      if (e.kind === 'hold') continue;
      logged.push({ ...e, id: nextId++, latency });
      if (e.kind === 'gesture') console.debug(`[gesture] ${e.gesture} ${e.hand} ${(e.confidence * 100).toFixed(0)}% +${latency.toFixed(1)}ms`);
    }
    if (logged.length) useGestureLog.setState((s) => ({ events: [...logged.reverse(), ...s.events].slice(0, LOG_SIZE) }));
  });
  const syncHolds = () => recognizer.setHoldThresholds(holdThresholds(getActiveProfile()));
  syncHolds();
  const offSettings = useAppStore.subscribe((s, prev) => {
    if (s.settings.sensitivity !== prev.settings.sensitivity) recognizer.setSensitivity(s.settings.sensitivity);
    if (s.profiles !== prev.profiles || s.settings.activeProfileId !== prev.settings.activeProfileId) syncHolds();
  });
  const offSource = useTrackingStore.subscribe((s, prev) => {
    if (s.sourceId !== prev.sourceId) recognizer.reset();
  });
  return () => {
    offFrames();
    offSettings();
    offSource();
  };
}
