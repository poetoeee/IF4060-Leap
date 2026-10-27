import type { ReactNode } from 'react';
import { GestureGlyph } from '@/components/GestureGlyph';
import { KeyCaps } from '@/components/KeyCap';
import { LedMark } from '@/components/LedMark';
import { GESTURE } from '@/mapping/gestures';
import type { GestureId } from '@/mapping/types';
import { useController } from '@/pipeline/controller';
import { useAppStore, useProfiles } from '@/store';

/** In-page overlay, bottom-right (Figma HUD 14:195): recognized · low confidence · paused. */
export function Hud() {
  const hud = useController((s) => s.hud);
  const activeId = useAppStore((s) => s.settings.activeProfileId);
  const enabled = useAppStore((s) => s.settings.controllerEnabled);
  const profileName = useProfiles().find((p) => p.id === activeId)?.name ?? '';
  if (!hud) return null;

  const accent = hud.state === 'recognized' && hud.entry.outcome === 'sent';
  let glyph: GestureId = 'open_palm';
  let title = '';
  let body: ReactNode = null;
  let titleTone = 'text-fg-primary';

  switch (hud.state) {
    case 'recognized': {
      const e = hud.entry;
      glyph = e.gesture;
      title = `${GESTURE[e.gesture].name} · ${Math.round(e.confidence * 100)}%`;
      body = (
        <>
          {e.caps.length > 0 && <KeyCaps caps={e.caps} dim={e.outcome !== 'sent'} />}
          <span className="text-caption text-fg-secondary">{e.label}</span>
        </>
      );
      break;
    }
    case 'candidate':
      glyph = hud.gesture;
      title = 'Hold steady…';
      titleTone = 'text-warning';
      body = <Meter value={hud.confidence} tone="bg-warning" label={`${Math.round(hud.confidence * 100)}%`} />;
      break;
    case 'holding':
      title = enabled ? 'Keep holding to pause…' : 'Keep holding to resume…';
      body = <Meter value={hud.progress} tone="bg-accent" label="left palm" />;
      break;
    case 'paused':
      title = 'Controller paused';
      body = <span className="text-caption text-fg-secondary">Hold left Open Palm 2s to resume</span>;
      break;
    case 'resumed':
      title = 'Gestures are live';
      body = <span className="text-caption text-fg-secondary">Controller resumed</span>;
      break;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-6 right-6 z-50 flex items-center gap-3.5 rounded-[18px] border bg-inset py-2.5 pl-2.5 pr-4 drop-shadow-[0_16px_20px_rgb(0_0_0/0.55)] ${
        accent ? 'border-accent' : 'border-border-strong'
      }`}
    >
      <span className={`flex size-[46px] items-center justify-center rounded-[12px] ${accent ? 'bg-accent-subtle' : 'bg-surface-2'}`}>
        <GestureGlyph gesture={glyph} size={30} />
      </span>
      <div className="flex flex-col gap-[5px] whitespace-nowrap">
        <span className={`text-label ${titleTone}`}>{title}</span>
        <div className="flex items-center gap-2">{body}</div>
      </div>
      <span className="h-[34px] w-px bg-border-strong" />
      <div className="flex flex-col items-end gap-1.5">
        <LedMark state={enabled ? 'live' : 'idle'} />
        <span className="t-overline text-fg-muted">{profileName}</span>
      </div>
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
