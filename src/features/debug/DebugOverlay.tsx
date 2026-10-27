import { useEffect, useState } from 'react';
import { isTyping } from '@/lib/dom';
import { recognizer, useGestureLog } from '@/pipeline';
import type { HandDebug } from '@/recognizer/engine';
import { useAppStore } from '@/store';
import { useToast } from '@/store/toast';
import { useTracking } from '@/tracking/useTracking';

/** `D` toggles: fps, raw features, detector state, recent events with latency. */
export function DebugOverlay() {
  const [open, setOpen] = useState(false);
  const [hands, setHands] = useState<HandDebug[]>([]);
  const { sourceId, status, fps } = useTracking();
  const sensitivity = useAppStore((s) => s.settings.sensitivity);
  const events = useGestureLog((s) => s.events);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyD' && !e.defaultPrevented && !e.repeat && !e.ctrlKey && !e.altKey && !e.metaKey && !isTyping(e.target)) setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setHands(recognizer.debug()), 100);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;
  const now = performance.now();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 w-[340px] rounded-ctrl-lg border border-border-strong bg-inset/90 p-3 font-mono text-key text-fg-secondary backdrop-blur">
      <div className="mb-2 flex justify-between text-fg-primary">
        <span>debug · D</span>
        <span>
          {sourceId} · {status} · {fps} fps · {sensitivity}
        </span>
      </div>

      {hands.length === 0 && <div className="text-fg-muted">no hand</div>}
      {hands.map(({ side, pose, features: f, state }) => (
        <div key={side} className="mb-2 grid grid-cols-2 gap-x-3 border-t border-border pt-1.5">
          <span className="col-span-2 text-accent">
            {side} · {pose}
          </span>
          <span>grab {f.grab.toFixed(2)}</span>
          <span>pinch {f.pinch.toFixed(2)}</span>
          <span>ext {f.extended.map((e) => (e ? '1' : '0')).join('')}</span>
          <span>size {f.size.toFixed(0)} mm</span>
          <span>speed {(f.speed / f.size).toFixed(1)} hs/s</span>
          <span>conf {f.confidence.toFixed(2)}</span>
          <span>hold {state.holdMs} ms</span>
          <span>
            arm {state.pinchArmed ? 'P' : '-'}
            {state.fistArmed ? 'F' : '-'} {state.blocked ? `⊘${state.blocked}` : ''}
          </span>
        </div>
      ))}

      <div className="border-t border-border pt-1.5">
        {events.length === 0 && <div className="text-fg-muted">no events yet</div>}
        {events.map((e) => (
          <div key={e.id} className={`flex justify-between ${e.kind === 'gesture' ? 'text-fg-primary' : 'text-warning'}`}>
            <span>
              {e.kind === 'candidate' ? '?' : '✓'} {e.gesture}
              {e.holdMs ? `@${e.holdMs}` : ''} {e.hand[0]!.toUpperCase()} {(e.confidence * 100).toFixed(0)}%
            </span>
            <span className="text-fg-muted">
              +{e.latency.toFixed(1)}ms · {((now - e.t) / 1000).toFixed(1)}s
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="pointer-events-auto mt-2 w-full rounded-ctrl border border-border-strong py-1.5 text-danger hover:bg-danger-subtle"
        onClick={() => {
          if (!window.confirm('Reset all profiles and mappings to the demo seed?')) return;
          useAppStore.getState().resetDemoData();
          useToast.getState().show({ title: 'Demo data reset', message: 'Profiles are back to the seed.' });
        }}
      >
        Reset demo data
      </button>
    </div>
  );
}
