import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { KeyCaps } from '@/components/KeyCap';
import { LedMark } from '@/components/LedMark';
import { StatusDot } from '@/components/StatusDot';
import { Toggle } from '@/components/Toggle';
import { GESTURE } from '@/mapping/gestures';
import { recognizer } from '@/pipeline';
import { useController } from '@/pipeline/controller';
import { useAppStore } from '@/store';
import { inOptimalZone, palmCenter } from '@/tracking/hand';
import { SOURCE_META } from '@/tracking/labels';
import { getLatestFrame, restartSource, setPreviewWanted } from '@/tracking/manager';
import { parkPreview, previewAspect } from '@/tracking/preview';
import { useTracking } from '@/tracking/useTracking';
import { OptimalZone } from './OptimalZone';
import { SkeletonCanvas } from './SkeletonCanvas';

/** Leap reports height above the device; the bridge recentres y by −200 mm. */
const HEIGHT_OFFSET_MM = 200;

interface Telemetry {
  tag: string;
  height: string;
  inZone: boolean | null;
}

function readTelemetry(): Telemetry {
  const hands = getLatestFrame()?.hands ?? [];
  if (!hands.length) return { tag: '', height: '—', inZone: null };
  const palm = palmCenter(hands[0]!);
  const tag = recognizer
    .debug()
    .sort((a, b) => a.side.localeCompare(b.side))
    .map((h) => `${h.side === 'left' ? 'L' : 'R'} · ${h.pose}`)
    .join('  ');
  return {
    tag,
    height: `${Math.round((palm.y + HEIGHT_OFFSET_MM) / 10)} cm`,
    inZone: inOptimalZone(palm),
  };
}

export function TrackingStage() {
  const { sourceId, status, detail, fps, preview } = useTracking();
  const meta = sourceId ? SOURCE_META[sourceId] : null;
  const previewSetting = meta?.previewSetting;
  const showPreview = useAppStore((s) => (previewSetting ? s.settings[previewSetting] : false));
  const setSetting = useAppStore((s) => s.setSetting);
  const [tele, setTele] = useState<Telemetry>({ tag: '', height: '—', inZone: null });
  const backdropBox = useRef<HTMLDivElement>(null);
  const insetBox = useRef<HTMLDivElement>(null);
  const running = status === 'running';
  const aspect = previewAspect(preview);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTele(readTelemetry()), 250);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    setPreviewWanted(showPreview);
    return () => setPreviewWanted(false);
  }, [showPreview]);

  useEffect(() => {
    const box = (preview?.aligned ? backdropBox : insetBox).current;
    if (!box || !preview) return;
    const { el } = preview;
    el.className = preview.aligned ? 'size-full -scale-x-100 object-cover' : 'block w-full';
    box.appendChild(el);
    return () => {
      // A stopped camera has already removed its video; only park a live one.
      if (!(el instanceof HTMLVideoElement)) el.remove();
      else if (el.srcObject) parkPreview(el);
    };
  }, [preview]);

  return (
    <div data-tour="stage" className="stage-bg relative min-h-0 flex-1 overflow-hidden rounded-card border">
      <div ref={backdropBox} className={`absolute inset-0 opacity-70 ${preview?.aligned && showPreview ? '' : 'hidden'}`} />

      {running && <OptimalZone aspect={aspect} tag={tele.tag} />}
      {running && <SkeletonCanvas aspect={aspect} />}

      <div className="absolute left-[15px] top-[15px] flex items-center gap-2.5 rounded-ctrl border bg-inset py-1.5 pl-2.5 pr-3">
        <StatusDot tone={running ? 'accent' : 'muted'} size={7} />
        <span className={`t-overline ${running ? 'text-fg-primary' : 'text-fg-muted'}`}>
          {running ? 'live tracking' : 'live tracking · off'}
        </span>
      </div>

      {preview && previewSetting && (
        <div className="absolute right-[15px] top-[11px] flex items-center gap-2.5 rounded-ctrl border bg-inset py-1.5 pl-3 pr-2">
          <Icon name="camera" size={14} className="text-fg-secondary" />
          <span className="text-caption text-fg-secondary">Camera preview</span>
          <Toggle label="Camera preview" checked={showPreview} onChange={(v) => setSetting(previewSetting, v)} />
        </div>
      )}

      <div
        className={`absolute right-[15px] top-[52px] w-[260px] overflow-hidden rounded-ctrl-lg border bg-inset ${
          preview && !preview.aligned && showPreview ? '' : 'hidden'
        }`}
      >
        <div ref={insetBox} />
        <span className="t-overline absolute left-2.5 top-2 text-fg-muted">ir camera · from below</span>
      </div>

      {running ? (
        <div className="absolute bottom-[15px] left-[15px] flex flex-col gap-1.5 rounded-ctrl-lg border bg-inset px-3 py-2.5 font-mono">
          <TeleRow label="height" value={tele.height} />
          <TeleRow
            label="zone"
            value={tele.inZone === null ? 'no hand' : tele.inZone ? 'optimal' : 'outside'}
            tone={tele.inZone === null ? 'text-fg-muted' : tele.inZone ? 'text-success' : 'text-warning'}
          />
          <TeleRow label="rate" value={`${fps} fps`} />
        </div>
      ) : (
        <Offline
          title={status === 'starting' ? 'Starting tracking…' : 'Sensor offline'}
          detail={status === 'starting' ? `Connecting to ${meta?.name ?? 'source'}.` : detail}
          action={status === 'starting' ? undefined : meta?.retry}
        />
      )}

      {running && <LastRecognized />}

      <div className="absolute bottom-[17px] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <LedMark state={running ? 'live' : 'idle'} />
        <span className="t-overline whitespace-nowrap text-fg-muted">{meta?.stageLabel}</span>
      </div>
    </div>
  );
}

const OUTCOME_SUFFIX = { sent: 'sent', paused: 'paused', unmapped: '', disabled: 'off', toggle: '' } as const;

/** Figma 15:316: latest recognised gesture, bottom-right of the stage. */
function LastRecognized() {
  const e = useController((s) => s.recent[0]);
  if (!e) return null;
  const sent = e.outcome === 'sent';
  const suffix = OUTCOME_SUFFIX[e.outcome];
  return (
    <div className={`absolute bottom-[15px] right-[15px] flex items-center gap-3 rounded-[14px] border bg-surface py-2.5 pl-2.5 pr-3.5 ${sent ? 'border-accent' : 'border-border-strong'}`}>
      <span className={`flex size-11 items-center justify-center rounded-[12px] ${sent ? 'bg-accent-subtle' : 'bg-surface-2'}`}>
        <GestureGlyph gesture={e.gesture} size={28} />
      </span>
      <div className="flex flex-col gap-1 whitespace-nowrap">
        <span className="text-label">
          {GESTURE[e.gesture].name} · {Math.round(e.confidence * 100)}%
        </span>
        <span className="flex items-center gap-2">
          {e.caps.length > 0 && <KeyCaps caps={e.caps} dim={!sent} />}
          <span className="text-caption text-fg-secondary">
            {e.label}
            {suffix && ` · ${suffix}`}
          </span>
        </span>
      </div>
    </div>
  );
}

function TeleRow({ label, value, tone = 'text-fg-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="t-overline w-[52px] text-fg-muted">{label}</span>
      <span className={`whitespace-nowrap text-key ${tone}`}>{value}</span>
    </div>
  );
}

function Offline({ title, detail, action }: { title: string; detail?: string; action?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
      <span className="mb-1 flex size-10 items-center justify-center rounded-ctrl-lg border bg-surface-2">
        <Icon name="plug" size={18} className="text-fg-secondary" />
      </span>
      <span className="text-h3">{title}</span>
      {detail && <span className="max-w-md text-small text-fg-secondary">{detail}</span>}
      {action && (
        <Button variant="primary" icon="refresh" className="mt-2" onClick={restartSource}>
          {action}
        </Button>
      )}
    </div>
  );
}
