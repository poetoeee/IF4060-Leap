import { holdThresholds, repeatGestures } from '@/mapping/rules';
import { Recognizer } from '@/recognizer/engine';
import type { GestureEvent } from '@/recognizer/types';
import { getActiveProfile, useAppStore } from '@/store';
import { subscribeFrames, useTrackingStore } from '@/tracking/manager';

export const recognizer = new Recognizer(useAppStore.getState().settings.sensitivity);

const gestureCbs = new Set<(e: GestureEvent) => void>();

export function subscribeGestures(cb: (e: GestureEvent) => void) {
  gestureCbs.add(cb);
  return () => void gestureCbs.delete(cb);
}

/** Wires frames → recognizer → subscribers. Returns a disposer. */
export function startPipeline() {
  const offFrames = subscribeFrames((f) => {
    for (const e of recognizer.process(f)) {
      gestureCbs.forEach((cb) => cb(e));
      if (e.kind === 'gesture') console.debug(`[gesture] ${e.gesture} ${e.hand} ${(e.confidence * 100).toFixed(0)}% +${(performance.now() - f.timestamp).toFixed(1)}ms`);
    }
  });
  const syncProfile = () => {
    const profile = getActiveProfile();
    recognizer.setHoldThresholds(holdThresholds(profile));
    recognizer.setRepeatGestures(repeatGestures(profile));
  };
  syncProfile();
  const offSettings = useAppStore.subscribe((s, prev) => {
    if (s.settings.sensitivity !== prev.settings.sensitivity) recognizer.setSensitivity(s.settings.sensitivity);
    if (s.profiles !== prev.profiles || s.settings.activeProfileId !== prev.settings.activeProfileId) syncProfile();
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
