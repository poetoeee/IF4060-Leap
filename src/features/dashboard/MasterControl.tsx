import { LedMark } from '@/components/LedMark';
import { Toggle } from '@/components/Toggle';
import { setControllerEnabled } from '@/pipeline/controller';
import { useAppStore } from '@/store';

/** Figma 15:145 (live) / 02 (paused). Same switch as left Open Palm 2 s and Ctrl+Alt+G. */
export function MasterControl() {
  const enabled = useAppStore((s) => s.settings.controllerEnabled);
  return (
    <div
      className={`flex items-center gap-4 rounded-card border py-3 pl-[18px] pr-4 ${
        enabled ? 'border-accent bg-accent-subtle shadow-[0_0_28px_rgb(var(--accent-default)/0.18)]' : 'bg-surface'
      }`}
    >
      <LedMark state={enabled ? 'live' : 'idle'} />
      <div className="flex flex-col gap-0.5 whitespace-nowrap">
        <span className="text-h3">{enabled ? 'Gestures are live' : 'Gestures paused'}</span>
        <span className={`text-caption ${enabled ? 'text-accent-hover' : 'text-fg-muted'}`}>
          {enabled ? 'Controller · sending to this page' : 'Controller · nothing will be triggered'}
        </span>
      </div>
      <span className={`h-9 w-px ${enabled ? 'bg-accent/40' : 'bg-border-strong'}`} />
      <div className="flex flex-col items-center gap-1">
        <Toggle size="lg" label="Gestures live" checked={enabled} onChange={setControllerEnabled} />
        <span className="t-overline whitespace-nowrap text-fg-muted">or hold left palm 2s</span>
      </div>
    </div>
  );
}
