import { useEffect, useState } from 'react';
import { GestureGlyph } from '@/components/GestureGlyph';
import { KeyCaps } from '@/components/KeyCap';
import { GESTURE } from '@/mapping/gestures';
import { useController, type Entry } from '@/pipeline/controller';

const ago = (at: number, now: number) => {
  const s = Math.round((now - at) / 1000);
  return s < 2 ? 'now' : s < 60 ? `${s}s` : `${Math.round(s / 60)}m`;
};

/** Figma 15:333: last 5 gestures, newest first, fading out; not persisted. */
export function RecentStrip() {
  const recent = useController((s) => s.recent);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!recent.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [recent.length]);

  return (
    <section className="flex shrink-0 flex-col gap-3 rounded-card border bg-surface px-5 pb-4 pt-[15px]">
      <div className="flex items-baseline gap-2">
        <span className="text-label">Recent gestures</span>
        <span className="t-overline text-fg-muted">last 5 · not saved</span>
      </div>
      {recent.length === 0 ? (
        <div className="flex h-[61px] items-center justify-center rounded-ctrl-lg border border-dashed border-border-strong text-caption text-fg-muted">
          Your last 5 gestures will show up here once you start gesturing.
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2.5">
          {recent.map((e, i) => (
            <Chip key={e.id} e={e} newest={i === 0} fade={1 - i * 0.15} age={ago(e.at, now)} />
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({ e, newest, fade, age }: { e: Entry; newest: boolean; fade: number; age: string }) {
  const sent = e.outcome === 'sent';
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 rounded-[12px] border py-2 pl-2.5 pr-3 ${newest && sent ? 'border-accent bg-accent-subtle' : 'border-transparent bg-surface-2'}`}
      style={{ opacity: fade }}
      title={`${GESTURE[e.gesture].name} · ${e.label}`}
    >
      <GestureGlyph gesture={e.gesture} size={26} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-label">{GESTURE[e.gesture].name}</span>
        <span className="flex items-center gap-1.5">
          {e.caps.length > 0 ? <KeyCaps caps={e.caps} dim={!sent} /> : <span className="truncate text-caption text-fg-muted">{e.label}</span>}
          <span className="t-overline text-fg-muted">{age}</span>
        </span>
      </div>
    </div>
  );
}
