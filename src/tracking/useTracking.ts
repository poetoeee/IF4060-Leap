import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { setSource, stopSource, subscribeFrames, useTrackingStore } from './manager';
import type { TrackingFrame } from './types';

export { useTrackingStore as useTracking };

/** Keeps the active source in sync with settings. Mount once at the app root. */
export function useTrackingRuntime() {
  const id = useAppStore((s) => s.settings.trackingSource);
  useEffect(() => {
    setSource(id);
    return stopSource;
  }, [id]);
}

/** Calls `cb` on every frame without re-rendering. */
export function useFrames(cb: (f: TrackingFrame) => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => subscribeFrames((f) => ref.current(f)), []);
}
