import { useEffect, useState, type ReactNode } from 'react';
import { GestureGlyph } from '@/components/GestureGlyph';
import { KeyCaps } from '@/components/KeyCap';
import { GESTURE } from '@/mapping/gestures';
import type { GestureId } from '@/mapping/types';
import type { Hud } from '@/pipeline/controller';

interface HudDataPayload {
  hud: Hud | null;
  profileName?: string;
  enabled?: boolean;
}

export function FloatingHudOverlay() {
  const [data, setData] = useState<HudDataPayload>({ hud: null });

  useEffect(() => {
    document.documentElement.classList.add('is-overlay');
    document.body.classList.add('is-overlay');
    const root = document.getElementById('root');
    if (root) root.classList.add('is-overlay');

    if (window.electronAPI?.onHudData) {
      return window.electronAPI.onHudData((incoming: unknown) => {
        setData((incoming as HudDataPayload) ?? { hud: null });
      });
    }
  }, []);

  const { hud } = data;
  if (!hud) return null;

  let glyph: GestureId = 'open_palm';
  let content: ReactNode = null;

  switch (hud.state) {
    case 'recognized': {
      const e = hud.entry;
      glyph = e.gesture;
      content = (
        <div className="flex items-center gap-2 text-xs font-medium">
          {e.caps.length > 0 && <KeyCaps caps={e.caps} dim={e.outcome !== 'sent'} />}
          <span className="text-white/90">{e.label || GESTURE[e.gesture]?.name}</span>
        </div>
      );
      break;
    }
    case 'candidate':
      glyph = hud.gesture;
      content = (
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-300/90 font-medium">Hold steady…</span>
          <div className="h-1 w-14 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.round(hud.confidence * 100)}%` }} />
          </div>
        </div>
      );
      break;
    case 'holding':
      content = (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/80 font-medium">Hold to pause…</span>
          <div className="h-1 w-16 overflow-hidden rounded-full bg-white/20">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.round(hud.progress * 100)}%` }} />
          </div>
        </div>
      );
      break;
    case 'paused':
      content = <span className="text-xs text-white/70 font-medium">Gestures Paused</span>;
      break;
    case 'resumed':
      content = <span className="text-xs text-emerald-400 font-medium">Gestures Live</span>;
      break;
  }

  return (
    <div className="flex h-full w-full items-center justify-end pr-2 select-none">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2.5 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 shadow-lg shadow-black/30 backdrop-blur-md transition-all duration-200"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/90">
          <GestureGlyph gesture={glyph} size={16} />
        </span>
        <div className="whitespace-nowrap">{content}</div>
      </div>
    </div>
  );
}
