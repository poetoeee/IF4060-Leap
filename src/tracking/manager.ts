import { create } from 'zustand';
import { createSource } from './sources';
import type { HandState, SourceId, SourceStatus, TrackingFrame, TrackingSource } from './types';

interface TrackingState {
  sourceId: SourceId | null;
  status: SourceStatus;
  detail?: string;
  fps: number;
  /** Mean confidence of visible hands, 0 when none. */
  handConfidence: number;
  preview: HTMLVideoElement | null;
}

export const useTrackingStore = create<TrackingState>(() => ({
  sourceId: null,
  status: 'idle',
  fps: 0,
  handConfidence: 0,
  preview: null,
}));

const frameCbs = new Set<(f: TrackingFrame) => void>();
let source: TrackingSource | null = null;
let detach: (() => void)[] = [];
let latest: TrackingFrame | null = null;

export function subscribeFrames(cb: (f: TrackingFrame) => void) {
  frameCbs.add(cb);
  return () => void frameCbs.delete(cb);
}

export const getLatestFrame = () => latest;

/** Stops the current source and starts `id`. */
export function setSource(id: SourceId) {
  stopSource();
  const src = createSource(id);
  source = src;
  const meter = fpsMeter();
  detach = [
    src.onStatus((status, detail) =>
      useTrackingStore.setState({ status, detail, preview: status === 'running' ? (src.getPreview?.() ?? null) : null }),
    ),
    src.onFrame((f) => {
      latest = f;
      meter(f);
      frameCbs.forEach((cb) => cb(f));
    }),
  ];
  useTrackingStore.setState({ sourceId: id, fps: 0, handConfidence: 0 });
  void src.start();
}

export function stopSource() {
  detach.forEach((d) => d());
  detach = [];
  source?.stop();
  source = null;
  latest = null;
  useTrackingStore.setState({ status: 'idle', detail: undefined, preview: null, fps: 0, handConfidence: 0 });
}

export function restartSource() {
  const id = useTrackingStore.getState().sourceId;
  if (id) setSource(id);
}

/** Publishes fps + hand confidence to the store twice a second, not per frame. */
function fpsMeter() {
  let count = 0;
  let conf = 0;
  let since = performance.now();
  return (f: TrackingFrame) => {
    count++;
    conf += meanConfidence(f.hands);
    const dt = f.timestamp - since;
    if (dt < 500) return;
    useTrackingStore.setState({ fps: Math.round((count * 1000) / dt), handConfidence: conf / count });
    count = 0;
    conf = 0;
    since = f.timestamp;
  };
}

const meanConfidence = (hands: HandState[]) =>
  hands.length ? hands.reduce((s, h) => s + h.confidence, 0) / hands.length : 0;
