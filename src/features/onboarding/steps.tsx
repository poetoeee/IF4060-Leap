import { useEffect, useState, type ReactNode } from 'react';
import { GestureGlyph } from '@/components/GestureGlyph';
import { Icon } from '@/components/Icon';
import { KeyCaps } from '@/components/KeyCap';
import { GESTURE, GESTURES } from '@/mapping/gestures';
import { inOptimalZone, palmCenter } from '@/tracking/hand';
import { getLatestFrame } from '@/tracking/manager';
import type { SourceId } from '@/tracking/types';
import { useTracking } from '@/tracking/useTracking';
import type { Practice } from './practice';

const Text = ({ children }: { children: ReactNode }) => <p className="text-small text-fg-secondary">{children}</p>;
const Em = ({ children }: { children: ReactNode }) => <span className="text-fg-primary">{children}</span>;

export function IntroBody() {
  return (
    <Text>
      GesturMap turns hand gestures into keys, shortcuts, clicks and scrolls for whatever app is in front. This quick tour shows you around the
      Dashboard and lets you practise. <Em>Nothing is sent to other apps while the tour is open.</Em>
    </Text>
  );
}

const PLACEMENT: Record<SourceId, string> = {
  leap: 'Lay the Leap Motion flat between you and the keyboard, green light facing you. Hold your hand about 20 cm above it, palm down.',
  camera: 'Sit about an arm’s length away in even light and raise your hand in front of the camera, palm facing it.',
  mock: 'Mock hand: press keys 1–7 to play a gesture, hold Shift for the left hand.',
};

const CHECK_MS = 250;

function useHandCheck(running: boolean) {
  const [check, setCheck] = useState({ hand: false, inZone: false });
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const hand = getLatestFrame()?.hands[0];
      setCheck({ hand: !!hand, inZone: !!hand && inOptimalZone(palmCenter(hand)) });
    }, CHECK_MS);
    return () => clearInterval(t);
  }, [running]);
  return running ? check : { hand: false, inZone: false };
}

export function StageBody() {
  const { sourceId, status, detail } = useTracking();
  const running = status === 'running';
  const { hand, inZone } = useHandCheck(running);
  return (
    <>
      <Text>This is what the sensor sees. {sourceId && PLACEMENT[sourceId]}</Text>
      <div className="flex flex-col gap-2">
        <Check ok={running} label="Sensor connected" hint={detail ?? 'Starting the tracking source…'} />
        <Check ok={hand} label="Hand detected" hint="Raise one hand where the sensor can see it." />
        <Check ok={inZone} label="Inside the dashed comfort zone" hint="Move your hand into the dashed box." />
      </div>
    </>
  );
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-success-subtle text-success' : 'border bg-surface-3'}`}>
        {ok && <Icon name="check" size={12} />}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className={`text-label ${ok ? 'text-fg-primary' : 'text-fg-secondary'}`}>{label}</span>
        {!ok && <span className="text-caption text-fg-muted">{hint}</span>}
      </div>
    </div>
  );
}

const TOUR = GESTURES.filter((g) => g.available);

export function PracticeBody({ practice: { tried, last } }: { practice: Practice }) {
  const next = TOUR.find((g) => !tried.has(g.id));
  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {TOUR.map((g) => (
          <span
            key={g.id}
            className={`flex h-9 items-center gap-2 rounded-ctrl-lg border pl-1.5 pr-2 text-caption ${
              tried.has(g.id) ? 'border-success bg-success-subtle text-fg-primary' : 'bg-surface-2 text-fg-secondary'
            }`}
          >
            <GestureGlyph gesture={g.id} size={22} />
            <span className="flex-1 truncate">{g.name}</span>
            {tried.has(g.id) && <Icon name="check" size={12} className="text-success" />}
          </span>
        ))}
      </div>
      {last?.kind === 'candidate' ? (
        <span className="text-caption text-warning">Almost a {GESTURE[last.gesture].name}: try it a little bigger or faster.</span>
      ) : next ? (
        <Text>
          <Em>Next, {next.name}:</Em> {next.howTo}
        </Text>
      ) : (
        <span className="text-caption text-success">All {TOUR.length} gestures recognised.</span>
      )}
    </>
  );
}

export function RecentBody() {
  return (
    <Text>
      Every recognised gesture lands here with the input it sent. Outside GesturMap the same information pops up in a small HUD in the
      bottom-right corner of the screen.
    </Text>
  );
}

export function ProfileBody() {
  return (
    <Text>
      A profile maps each gesture to an action for one activity, like <Em>Presentation Mode</Em> or <Em>Web Browsing</Em>. Switch the active
      profile here before you start; the list shows what each gesture will do.
    </Text>
  );
}

export function SensorBody() {
  return (
    <Text>
      Choose <Em>Leap Motion</Em> or the laptop <Em>Camera</Em> as the tracking source. With Leap, turn on <Em>Python bridge</Em> here.{' '}
      <Em>Sensitivity</Em> trades easy triggering for fewer accidents, and <Em>Gesture HUD → Detailed</Em> shows live tracking info when
      something feels off.
    </Text>
  );
}

export function PauseBody({ practice: { pauseProgress, pauseDone } }: { practice: Practice }) {
  return (
    <>
      <Text>
        Pause before typing or talking with your hands: hold your <Em>left</Em> open palm still for 2 seconds, use this switch, or press{' '}
        <span className="inline-flex align-middle">
          <KeyCaps caps={['Ctrl', 'Alt', 'G']} />
        </span>
        . Do it again to resume.
      </Text>
      <div className="flex items-center gap-3 rounded-ctrl-lg border bg-surface-2 p-2.5">
        <GestureGlyph gesture="open_palm" size={26} />
        <div className="flex flex-1 flex-col gap-1.5">
          <span className={`text-caption ${pauseDone ? 'text-success' : 'text-fg-secondary'}`}>
            {pauseDone ? 'Done. That would have paused gestures.' : 'Try it now with your left hand'}
          </span>
          <span className="flex h-1 overflow-hidden rounded-sm bg-surface-3">
            <span className="rounded-sm bg-accent transition-[width]" style={{ width: `${(pauseDone ? 1 : pauseProgress) * 100}%` }} />
          </span>
        </div>
      </div>
    </>
  );
}

export function MappingsBody() {
  return (
    <Text>
      Open a profile here to change what a gesture does: add, edit, turn off or delete mappings. The <Em>Mapping Template</Em> holds the
      defaults every profile can start from.
    </Text>
  );
}

export function HelpBody() {
  return <Text>That’s it. Reopen this tour from here whenever you need it.</Text>;
}
