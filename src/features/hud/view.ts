import { create } from 'zustand';
import { recognizer } from '@/pipeline';
import { useController, type Hud } from '@/pipeline/controller';
import type { Pose } from '@/recognizer/features';
import type { Side } from '@/recognizer/types';
import { getActiveProfile, useAppStore } from '@/store';
import { SOURCE_META } from '@/tracking/labels';
import { useTrackingStore } from '@/tracking/manager';

export interface HudTelemetry {
  source: string;
  running: boolean;
  fps: number;
  /** Last gesture, frame → action dispatch (ms). */
  latency: number | null;
  hands: { side: Side; pose: Pose; confidence: number }[];
}

/** Everything the HUD renders; plain data so it can cross to the Electron overlay window. */
export interface HudView {
  hud: Hud | null;
  profileName: string;
  enabled: boolean;
  /** Detailed mode only. */
  telemetry: HudTelemetry | null;
}

const TELEMETRY_MS = 100;

export const useHudView = create<{ view: HudView | null }>(() => ({ view: null }));

function readTelemetry(): HudTelemetry {
  const { sourceId, status, fps } = useTrackingStore.getState();
  const running = status === 'running';
  return {
    source: sourceId ? SOURCE_META[sourceId].name : '—',
    running,
    fps,
    latency: useController.getState().recent[0]?.latency ?? null,
    hands: running
      ? recognizer
          .debug()
          .sort((a, b) => a.side.localeCompare(b.side))
          .map((h) => ({ side: h.side, pose: h.pose, confidence: h.features.confidence }))
      : [],
  };
}

function buildView(): HudView | null {
  const { hud } = useController.getState();
  const { hudDetail, controllerEnabled } = useAppStore.getState().settings;
  const telemetry = hudDetail === 'detailed' ? readTelemetry() : null;
  if (!hud && !telemetry) return null;
  return { hud, telemetry, enabled: controllerEnabled, profileName: getActiveProfile()?.name ?? '' };
}

/** Keeps `useHudView` current and mirrors it to the Electron overlay. Returns a disposer. */
export function startHudSync() {
  let ticker = 0;
  const update = () => useHudView.setState({ view: buildView() });
  const syncTicker = () => {
    clearInterval(ticker);
    if (useAppStore.getState().settings.hudDetail === 'detailed') ticker = window.setInterval(update, TELEMETRY_MS);
    update();
  };

  const offs = [
    useHudView.subscribe((s, prev) => {
      if (s.view !== prev.view) void window.electronAPI?.updateHud?.(s.view);
    }),
    useController.subscribe((s, prev) => {
      if (s.hud !== prev.hud) update();
    }),
    useAppStore.subscribe((s, prev) => {
      if (s.settings.hudDetail !== prev.settings.hudDetail) syncTicker();
      else if (s.settings !== prev.settings || s.profiles !== prev.profiles) update();
    }),
  ];
  syncTicker();

  return () => {
    clearInterval(ticker);
    offs.forEach((off) => off());
  };
}
