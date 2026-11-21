import { useEffect, useState } from 'react';
import { Badge, type BadgeTone } from '@/components/Badge';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';
import type { HudDetail, Sensitivity } from '@/mapping/types';
import { useAppStore } from '@/store';
import { SOURCE_META, SOURCE_OPTIONS } from '@/tracking/labels';
import { restartSource } from '@/tracking/manager';
import type { SourceStatus } from '@/tracking/types';
import { useTracking } from '@/tracking/useTracking';
import { qualityBars } from './quality';

const STATUS_BADGE: Record<SourceStatus, { tone: BadgeTone; label: string }> = {
  running: { tone: 'success', label: 'Connected' },
  starting: { tone: 'warning', label: 'Starting' },
  idle: { tone: 'neutral', label: 'Idle' },
  'no-device': { tone: 'danger', label: 'Disconnected' },
  error: { tone: 'danger', label: 'Error' },
};

const BRIDGE_BADGE: Record<'stopped' | 'starting' | 'running' | 'error', { tone: BadgeTone; label: string }> = {
  running: { tone: 'success', label: 'Running' },
  starting: { tone: 'warning', label: 'Starting' },
  stopped: { tone: 'neutral', label: 'Stopped' },
  error: { tone: 'danger', label: 'Error' },
};

const SENSITIVITY: { value: Sensitivity; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'strict', label: 'Strict' },
];

const HUD_DETAIL: { value: HudDetail; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'detailed', label: 'Detailed' },
];

const BAR_HEIGHTS = [6, 9, 12, 15, 18];

export function SensorCard() {
  const { sourceId, status, detail, fps, handConfidence } = useTracking();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const [bridge, setBridge] = useState<{ state: 'stopped' | 'starting' | 'running' | 'error'; detail?: string }>({
    state: 'stopped',
  });
  const [bridgeBusy, setBridgeBusy] = useState(false);
  const [defaultSdkPath, setDefaultSdkPath] = useState('C:\\Program Files\\Ultraleap\\LeapSDK');

  const running = status === 'running';
  const bars = running ? qualityBars(fps, handConfidence) : 0;
  const quality = bars >= 4 ? ['Good', 'text-success', 'bg-success'] : bars === 3 ? ['Fair', 'text-warning', 'bg-warning'] : ['Poor', 'text-danger', 'bg-danger'];
  const badge = STATUS_BADGE[status];
  const hasNativeBridge = !!window.electronAPI?.startBridge;

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getBridgeStatus) return;
    void api.getBridgeStatus().then((s) => setBridge(s));
    void api.getDefaultLeapSdkPath?.().then((p) => {
      if (p) setDefaultSdkPath(p);
    });
    return api.onBridgeStatus?.((s) => setBridge(s));
  }, []);

  // In web-only mode (no Electron IPC), reflect WebSocket connection status for the bridge
  const effectiveBridgeState = hasNativeBridge
    ? bridge.state
    : settings.trackingSource === 'leap' && (status === 'running' || (status === 'no-device' && detail && !detail.includes('bridge not running')))
      ? 'running'
      : 'stopped';
  const bridgeBadge = BRIDGE_BADGE[effectiveBridgeState];
  const bridgeChecked = effectiveBridgeState === 'running' || effectiveBridgeState === 'starting';

  const toggleBridge = async (nextOn: boolean) => {
    const api = window.electronAPI;
    if (!api?.startBridge || !api?.stopBridge) return;
    setBridgeBusy(true);
    try {
      if (nextOn) {
        const res = await api.startBridge({ sdkPath: settings.leapSdkPath || undefined });
        setBridge(res);
        if (res.state === 'running' && settings.trackingSource === 'leap') {
          restartSource();
        }
      } else {
        const res = await api.stopBridge();
        setBridge(res);
      }
    } finally {
      setBridgeBusy(false);
    }
  };

  const browseSdk = async () => {
    const picked = await window.electronAPI?.browseLeapSdkPath?.();
    if (picked) {
      setSetting('leapSdkPath', picked);
    }
  };

  return (
    <section className="flex flex-col gap-3.5 rounded-card border bg-surface px-5 pb-5 pt-[18px]">
      <div className="flex items-center justify-between">
        <span className="t-overline text-fg-muted">sensor</span>
        <Badge tone={badge.tone} label={badge.label} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-label">Tracking source</span>
          <span className="text-caption text-fg-muted">{sourceId ? SOURCE_META[sourceId].desc : '—'}</span>
        </div>
        <SegmentedControl
          label="Tracking source"
          options={SOURCE_OPTIONS}
          value={settings.trackingSource}
          onChange={(v) => setSetting('trackingSource', v)}
        />
      </div>

      {settings.trackingSource === 'leap' && (
        <div className="flex flex-col gap-2.5 rounded-ctrl-lg border bg-surface-2 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-label">Python bridge</span>
                <Badge tone={bridgeBadge.tone} label={bridgeBadge.label} />
              </div>
              {bridge.state === 'error' && bridge.detail && (
                <span className="text-caption text-danger">{bridge.detail}</span>
              )}
            </div>
            <Toggle
              label="Python bridge"
              checked={bridgeChecked}
              disabled={!hasNativeBridge || bridgeBusy}
              onChange={(v) => void toggleBridge(v)}
            />
          </div>

          <div className="flex flex-col gap-1.5 border-t pt-2">
            <div className="flex items-center justify-between">
              <span className="t-overline text-fg-muted">leapsdk location</span>
              {settings.leapSdkPath && (
                <button
                  type="button"
                  onClick={() => setSetting('leapSdkPath', '')}
                  className="text-caption text-fg-muted hover:text-fg-secondary"
                >
                  Reset default
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={settings.leapSdkPath ?? ''}
                onChange={(e) => setSetting('leapSdkPath', e.target.value)}
                placeholder={defaultSdkPath}
                aria-label="LeapSDK location"
                className="h-8 min-w-0 flex-1 rounded-ctrl border bg-inset px-2.5 font-mono text-caption text-fg-primary outline-none placeholder:text-fg-muted focus:border-accent"
              />
              {hasNativeBridge && (
                <button
                  type="button"
                  onClick={() => void browseSdk()}
                  className="h-8 shrink-0 rounded-ctrl border border-border-strong bg-surface-3 px-2.5 text-caption text-fg-primary hover:bg-surface"
                >
                  Browse
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-3 rounded-ctrl-lg bg-surface-2 px-3 py-2.5 ${running ? '' : 'opacity-40'}`}>
        <span className="t-overline flex-1 text-fg-muted">tracking quality</span>
        <div className="flex items-end gap-[3px]" aria-hidden>
          {BAR_HEIGHTS.map((h, i) => (
            <span key={h} className={`w-[5px] rounded-[1.5px] ${i < bars ? quality[2] : 'bg-border-strong'}`} style={{ height: h }} />
          ))}
        </div>
        <span className={`font-mono text-key ${running ? quality[1] : 'text-fg-muted'}`}>{running ? quality[0] : '—'}</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label">Gesture sensitivity</span>
        <SegmentedControl
          label="Gesture sensitivity"
          options={SENSITIVITY}
          value={settings.sensitivity}
          onChange={(v) => setSetting('sensitivity', v)}
        />
        <span className="text-caption text-fg-muted">Strict needs a steadier hand but avoids accidental triggers.</span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-label">Gesture HUD</span>
        <SegmentedControl label="Gesture HUD" options={HUD_DETAIL} value={settings.hudDetail} onChange={(v) => setSetting('hudDetail', v)} />
        <span className="text-caption text-fg-muted">Detailed stays on screen with live tracking info: hands, pose, fps and latency.</span>
      </div>
    </section>
  );
}
