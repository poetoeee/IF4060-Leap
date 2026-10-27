import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
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
  const name = useAppStore((s) => s.settings.userName);
  const now = useNow(30_000);
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-screen flex-col gap-5 px-8 pb-7 pt-7">
      <header className="flex items-center justify-between gap-5 py-2.5">
        <div className="flex flex-col gap-1">
          <span className="t-overline text-fg-muted">
            {date.replace(',', '')} · {time}
          </span>
          <h1 className="text-h1">
            {greeting(now.getHours())}, {name}
          </h1>
        </div>
        {/* TODO(P4): master control card. */}
      </header>

      <div className="flex min-h-0 flex-1 gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <TrackingStage />
          {/* TODO(P4): recent gestures strip. */}
        </div>
        <aside className="flex w-[340px] shrink-0 flex-col gap-4">
          {/* TODO(P4): active profile card. */}
          <SensorCard />
        </aside>
      </div>
    </div>
  );
}
