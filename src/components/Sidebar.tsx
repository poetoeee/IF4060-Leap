import { useState } from 'react';
import { SOURCE_META } from '@/tracking/labels';
import type { SourceStatus } from '@/tracking/types';
import { useTracking } from '@/tracking/useTracking';
import { Icon } from './Icon';
import { LedMark } from './LedMark';
import { NavItemMain, NavItemSub } from './NavItem';
import { StatusDot, type DotTone } from './StatusDot';

// TODO(P3): read profiles + active profile from the store.
const PROFILES = [
  { id: 'template', name: 'Mapping Template', caption: 'Base · read-only' },
  { id: 'presentation', name: 'Presentation Mode', caption: 'Custom profile' },
  { id: 'web-browsing', name: 'Web Browsing', caption: 'Custom profile' },
];
const ACTIVE_PROFILE_ID = 'presentation';

const STATUS: Record<SourceStatus, { text: string; tone: DotTone }> = {
  running: { text: 'connected', tone: 'success' },
  starting: { text: 'starting', tone: 'warning' },
  idle: { text: 'idle', tone: 'muted' },
  'no-device': { text: 'disconnected', tone: 'danger' },
  error: { text: 'error', tone: 'danger' },
};

export function Sidebar() {
  const [open, setOpen] = useState(true);
  const { sourceId, status, fps } = useTracking();
  const st = STATUS[status];

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col gap-[26px] border-r bg-sidebar px-[14px] pb-4 pt-[22px]">
      <div className="flex items-center gap-3 pl-2">
        <LedMark />
        <div className="flex flex-col gap-px whitespace-nowrap">
          <span className="text-h3">GesturMap</span>
          <span className="t-overline text-fg-muted">gesture → input</span>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        <span className="t-overline pb-2 pl-2.5 text-fg-muted">Workspace</span>
        <NavItemMain to="/" end icon="dashboard" label="Dashboard" />
        <NavItemMain to="/demo" icon="presentation" label="Demo Stage" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex h-10 items-center gap-2.5 rounded-ctrl border-l-2 border-transparent py-2.5 pl-2.5 pr-2.5 text-left hover:bg-surface"
        >
          <Icon name="layers" className="text-fg-secondary" />
          <span className="flex-1 text-body-md">Mappings</span>
          <Icon name="chevron-down" size={16} className={`text-fg-secondary transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {open && (
          <div className="pl-5">
            <div className="flex flex-col gap-0.5 border-l border-border-strong pl-1.5">
              {PROFILES.map((p) => (
                <NavItemSub
                  key={p.id}
                  to={`/profiles/${p.id}`}
                  label={p.name}
                  caption={p.caption}
                  trailing={
                    p.id === 'template' ? (
                      <Icon name="lock" size={14} className="text-fg-muted" />
                    ) : p.id === ACTIVE_PROFILE_ID ? (
                      <StatusDot tone="accent" size={7} />
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 rounded-ctrl-lg border bg-surface px-3 py-2.5">
        <StatusDot tone={st.tone} />
        <div className="flex min-w-0 flex-col gap-px whitespace-nowrap">
          <span className="text-label">{sourceId ? SOURCE_META[sourceId].name : '—'}</span>
          <span className="t-overline text-fg-muted">{status === 'running' ? `${st.text} · ${fps} fps` : st.text}</span>
        </div>
      </div>

      <span className="pl-2 text-caption text-fg-muted">IF4060 · Kelompok 1 · 2026</span>
    </aside>
  );
}
