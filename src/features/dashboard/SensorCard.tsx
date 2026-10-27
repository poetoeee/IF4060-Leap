import { Badge, type BadgeTone } from '@/components/Badge';
import { SegmentedControl } from '@/components/SegmentedControl';
import type { Sensitivity } from '@/mapping/types';
import { useAppStore } from '@/store';
import { SOURCE_META, SOURCE_OPTIONS } from '@/tracking/labels';
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

const SENSITIVITY: { value: Sensitivity; label: string }[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'strict', label: 'Strict' },
];

const BAR_HEIGHTS = [6, 9, 12, 15, 18];

export function SensorCard() {
  const { sourceId, status, fps, handConfidence } = useTracking();
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  const running = status === 'running';
  const bars = running ? qualityBars(fps, handConfidence) : 0;
  const quality = bars >= 4 ? ['Good', 'text-success', 'bg-success'] : bars === 3 ? ['Fair', 'text-warning', 'bg-warning'] : ['Poor', 'text-danger', 'bg-danger'];
  const badge = STATUS_BADGE[status];

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
    </section>
  );
}
