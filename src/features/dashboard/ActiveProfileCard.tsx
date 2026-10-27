import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { KeyCaps } from '@/components/KeyCap';
import { actionCaps, actionSummary } from '@/mapping/format';
import { useAppStore } from '@/store';

/** Figma 15:415 + switch dropdown 05 (16:638). */
export function ActiveProfileCard() {
  const profiles = useAppStore((s) => s.profiles);
  const activeId = useAppStore((s) => s.settings.activeProfileId);
  const setSetting = useAppStore((s) => s.setSetting);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const active = profiles.find((p) => p.id === activeId);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <section className="flex flex-col gap-3.5 rounded-card border bg-surface px-5 pb-5 pt-[18px]">
      <div className="t-overline flex justify-between text-fg-muted">
        <span>active profile</span>
        <span>{active?.mappings.length ?? 0} mappings</span>
      </div>

      <div ref={box} className="relative">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex h-10 w-full items-center gap-2 rounded-ctrl border bg-surface-2 pl-3 pr-2.5 text-left text-body ${open ? 'border-accent' : 'border-border-strong'}`}
        >
          <span className="flex-1 truncate">{active?.name ?? 'Choose a profile'}</span>
          <Icon name="chevron-down" size={16} className={`text-fg-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div role="listbox" className="absolute inset-x-0 top-12 z-30 flex flex-col gap-1 rounded-ctrl-lg border border-border-strong bg-surface-2 p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.5)]">
            <span className="t-overline px-2.5 pb-1 pt-1.5 text-fg-muted">switch profile</span>
            {profiles.map((p) => {
              const selected = p.id === activeId;
              const first = p.mappings[0];
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setSetting('activeProfileId', p.id);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2.5 rounded-ctrl px-2.5 py-2 text-left ${selected ? 'bg-accent-subtle' : 'hover:bg-surface-3'}`}
                >
                  {first && <GestureGlyph gesture={first.gesture} size={22} />}
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-label">{p.name}</span>
                    <span className="t-overline text-fg-muted">
                      {p.mappings.length} mappings{selected ? ' · live' : ''}
                    </span>
                  </span>
                  {selected && <Icon name="check" size={14} className="text-accent" />}
                </button>
              );
            })}
            <span className="flex items-start gap-2 border-t px-2.5 pb-1 pt-2.5 text-caption text-fg-muted">
              <Icon name="info" size={13} className="mt-0.5" />
              Left Open Palm (pause) works in every profile.
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col overflow-hidden rounded-ctrl-lg border">
        {active?.mappings.slice(0, 3).map((m) => (
          <div key={m.id} className={`flex items-center gap-2.5 bg-surface-2 py-2 pl-2.5 pr-3 ${m.enabled ? '' : 'opacity-50'}`}>
            <GestureGlyph gesture={m.gesture} size={22} />
            <span className="h-px w-3.5 bg-border-strong" />
            <KeyCaps caps={actionCaps(m.action)} />
            <span className="min-w-0 flex-1 truncate text-caption text-fg-secondary">{m.label ?? actionSummary(m.action)}</span>
          </div>
        ))}
      </div>

      <Button icon="chevron-right" className="w-full" onClick={() => navigate(`/profiles/${activeId}`)}>
        Open profile
      </Button>
    </section>
  );
}
