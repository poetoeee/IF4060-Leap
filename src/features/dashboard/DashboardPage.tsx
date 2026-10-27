import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { ActiveProfileCard } from './ActiveProfileCard';
import { MasterControl } from './MasterControl';
import { RecentStrip } from './RecentStrip';
import { SensorCard } from './SensorCard';
import { TrackingStage } from './TrackingStage';

function useNow(ms: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const greeting = (h: number) => (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening');

export function DashboardPage() {
  const now = useNow(30_000);
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-screen flex-col gap-5 px-8 pb-7 pt-7">
      <header className="flex items-center justify-between gap-5">
        <div className="flex flex-col gap-1">
          <span className="t-overline text-fg-muted">
            {date.replace(',', '')} · {time}
          </span>
          <h1 className="text-h1">
            {greeting(now.getHours())}, <EditableName />
          </h1>
        </div>
        <MasterControl />
      </header>

      <div className="flex min-h-0 flex-1 gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TrackingStage />
          <RecentStrip />
        </div>
        <aside className="flex w-[340px] shrink-0 flex-col gap-4 overflow-y-auto">
          <ActiveProfileCard />
          <SensorCard />
        </aside>
      </div>
    </div>
  );
}

/** Click the name to change it (stored in settings). */
function EditableName() {
  const name = useAppStore((s) => s.settings.userName);
  const setSetting = useAppStore((s) => s.setSetting);
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button type="button" title="Click to change your name" className="rounded-ctrl hover:text-accent-hover" onClick={() => setDraft(name)}>
        {name}
      </button>
    );
  }
  const commit = () => {
    setSetting('userName', draft.trim() || name);
    setDraft(null);
  };
  return (
    <input
      autoFocus
      value={draft}
      maxLength={24}
      aria-label="Your name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
      }}
      className="w-[8ch] rounded-ctrl border-b-2 border-accent bg-transparent text-h1 outline-none"
      style={{ width: `${Math.max(3, draft.length + 1)}ch` }}
    />
  );
}
