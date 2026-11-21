import type { ReactNode } from 'react';
import { GestureGlyph } from '@/components/GestureGlyph';
import { KeyCaps } from '@/components/KeyCap';
import { LedMark } from '@/components/LedMark';
import { GESTURE } from '@/mapping/gestures';
import type { GestureId } from '@/mapping/types';
import type { HudTelemetry, HudView } from './view';

interface Content {
  glyph: GestureId;
  title: string;
  titleTone: string;
  body: ReactNode;
  accent: boolean;
}

const caption = (text: string) => <span className="text-caption text-fg-secondary">{text}</span>;

function contentOf({ hud, enabled, telemetry }: HudView): Content {
  const base: Content = { glyph: 'open_palm', title: '', titleTone: 'text-fg-primary', body: null, accent: false };
  if (!hud) {
    // Detailed mode between gestures.
    if (!telemetry?.running) return { ...base, title: 'Sensor offline', titleTone: 'text-danger', body: caption('Check the sensor card on the Dashboard') };
    if (!telemetry.hands.length) return { ...base, title: 'No hand in view', titleTone: 'text-fg-muted', body: caption('Hold your hand above the sensor') };
    return { ...base, title: 'Hand detected', body: caption('Waiting for a gesture') };
  }
  switch (hud.state) {
    case 'recognized': {
      const e = hud.entry;
      return {
        glyph: e.gesture,
        title: `${GESTURE[e.gesture].name} · ${Math.round(e.confidence * 100)}%`,
        titleTone: base.titleTone,
        body: (
          <>
            {e.caps.length > 0 && <KeyCaps caps={e.caps} dim={e.outcome !== 'sent'} />}
            {caption(e.label)}
          </>
        ),
        accent: e.outcome === 'sent',
      };
    }
    case 'candidate':
      return {
        ...base,
        glyph: hud.gesture,
        title: 'Hold steady…',
        titleTone: 'text-warning',
        body: <Meter value={hud.confidence} tone="bg-warning" label={`${Math.round(hud.confidence * 100)}%`} />,
      };
    case 'holding':
      return {
        ...base,
        title: enabled ? 'Keep holding to pause…' : 'Keep holding to resume…',
        body: <Meter value={hud.progress} tone="bg-accent" label="left palm" />,
      };
    case 'paused':
      return { ...base, title: 'Controller paused', body: caption('Hold left Open Palm 2s to resume') };
    case 'resumed':
      return { ...base, title: 'Gestures are live', body: caption('Controller resumed') };
  }
}

/** Figma HUD 14:195 (recognized · low confidence · paused), plus live telemetry in Detailed mode. */
export function HudCard({ view }: { view: HudView }) {
  const { glyph, title, titleTone, body, accent } = contentOf(view);
  return (
    <div
      className={`flex flex-col rounded-[18px] border bg-inset drop-shadow-[0_16px_20px_rgb(0_0_0/0.55)] ${
        accent ? 'border-accent' : 'border-border-strong'
      }`}
    >
      <div role="status" aria-live="polite" className="flex items-center gap-3.5 py-2.5 pl-2.5 pr-4">
        <span className={`flex size-[46px] items-center justify-center rounded-[12px] ${accent ? 'bg-accent-subtle' : 'bg-surface-2'}`}>
          <GestureGlyph gesture={glyph} size={30} />
        </span>
        <div className="flex flex-1 flex-col gap-[5px] whitespace-nowrap">
          <span className={`text-label ${titleTone}`}>{title}</span>
          <div className="flex items-center gap-2">{body}</div>
        </div>
        <span className="h-[34px] w-px bg-border-strong" />
        <div className="flex flex-col items-end gap-1.5">
          <LedMark state={view.enabled ? 'live' : 'idle'} />
          <span className="t-overline text-fg-muted">{view.profileName}</span>
        </div>
      </div>
      {view.telemetry && <Telemetry t={view.telemetry} />}
    </div>
  );
}

function Telemetry({ t }: { t: HudTelemetry }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border-strong px-4 py-2.5">
      <TeleRow label="source" value={t.running ? `${t.source} · ${t.fps} fps` : `${t.source} · offline`} />
      <TeleRow label="latency" value={t.latency === null ? '—' : `${Math.round(t.latency)} ms`} />
      {t.hands.length ? (
        t.hands.map((h) => <TeleRow key={h.side} label={`${h.side} hand`} value={`${h.pose} · ${Math.round(h.confidence * 100)}%`} />)
      ) : (
        <TeleRow label="hands" value="none" tone="text-fg-muted" />
      )}
    </div>
  );
}

function TeleRow({ label, value, tone = 'text-fg-primary' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="t-overline w-[72px] text-fg-muted">{label}</span>
      <span className={`whitespace-nowrap font-mono text-key ${tone}`}>{value}</span>
    </div>
  );
}

function Meter({ value, tone, label }: { value: number; tone: string; label: string }) {
  return (
    <>
      <span className="flex h-1 w-[110px] overflow-hidden rounded-sm bg-surface-3">
        <span className={`h-1 rounded-sm ${tone}`} style={{ width: `${Math.min(100, value * 100)}%` }} />
      </span>
      <span className="font-mono text-key text-fg-muted">{label}</span>
    </>
  );
}
