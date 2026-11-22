import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { placePopover, type Box } from './placement';
import { usePractice, type Practice } from './practice';
import { HelpBody, IntroBody, MappingsBody, PauseBody, PracticeBody, ProfileBody, RecentBody, SensorBody, StageBody } from './steps';
import { finishOnboarding, useOnboarding } from './store';

interface Step {
  /** `data-tour` value of the element to spotlight; none = centred intro. */
  target?: string;
  title: string;
  body: (practice: Practice) => ReactNode;
}

const STEPS: Step[] = [
  { title: 'Welcome to GesturMap', body: () => <IntroBody /> },
  { target: 'stage', title: 'Get your hand tracked', body: () => <StageBody /> },
  { target: 'stage', title: 'Try each gesture', body: (p) => <PracticeBody practice={p} /> },
  { target: 'recent', title: 'See what was sent', body: () => <RecentBody /> },
  { target: 'profile', title: 'Pick a profile per activity', body: () => <ProfileBody /> },
  { target: 'sensor', title: 'Set up the sensor', body: () => <SensorBody /> },
  { target: 'master', title: 'Pause anytime', body: (p) => <PauseBody practice={p} /> },
  { target: 'mappings', title: 'Change what gestures do', body: () => <MappingsBody /> },
  { target: 'help', title: 'Come back anytime', body: () => <HelpBody /> },
];

/** Space between the spotlight ring and its target. */
const RING_PAD = 6;

export function Onboarding() {
  const open = useOnboarding((s) => s.open);
  return open ? <Tour /> : null;
}

/** Spotlight tour over the live Dashboard: dims everything but the step's target and explains it in a popover. */
function Tour() {
  const [index, setIndex] = useState(0);
  const practice = usePractice();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const step = STEPS[index]!;
  const target = useTargetBox(step.target);
  const popRef = useRef<HTMLDivElement>(null);
  const [popSize, setPopSize] = useState({ w: 340, h: 220 });
  const isLast = index === STEPS.length - 1;

  // Every target lives on the Dashboard (or the sidebar next to it).
  useEffect(() => {
    if (pathname !== '/') navigate('/');
  }, [pathname, navigate]);

  useEffect(() => {
    const el = popRef.current!;
    const ro = new ResizeObserver(() => setPopSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finishOnboarding();
    window.addEventListener('keydown', onKey);
    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const pos = placePopover(target, popSize, { w: window.innerWidth, h: window.innerHeight });

  return createPortal(
    <div className={`fixed inset-0 z-50 ${target ? '' : 'bg-inset/80'}`}>
      {target && (
        <div
          className="pointer-events-none absolute rounded-card shadow-[0_0_0_9999px_rgb(var(--bg-inset)/0.78)] ring-2 ring-accent transition-all duration-200"
          style={{ left: target.x - RING_PAD, top: target.y - RING_PAD, width: target.w + 2 * RING_PAD, height: target.h + 2 * RING_PAD }}
        />
      )}
      <div
        ref={popRef}
        role="dialog"
        aria-modal
        aria-label={step.title}
        className="absolute flex w-[340px] flex-col gap-3.5 rounded-[20px] border border-border-strong bg-surface p-5 shadow-[0_24px_60px_rgb(0_0_0/0.6)] transition-[left,top] duration-200"
        style={{ left: pos.x, top: pos.y }}
      >
        <div className="flex items-center justify-between">
          <span className="t-overline text-accent">
            step {index + 1} of {STEPS.length}
          </span>
          <IconButton icon="x" label="Close tour" onClick={finishOnboarding} />
        </div>
        <h2 className="text-h3">{step.title}</h2>
        {step.body(practice)}
        <div className="flex items-center gap-2 border-t pt-3.5">
          {!isLast && (
            <button type="button" onClick={finishOnboarding} className="text-caption text-fg-muted hover:text-fg-secondary">
              Skip tour
            </button>
          )}
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="ghost" onClick={() => setIndex(index - 1)}>
              Back
            </Button>
          )}
          <Button variant="primary" onClick={isLast ? finishOnboarding : () => setIndex(index + 1)}>
            {isLast ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const sameBox = (a: Box | null, b: Box | null) => a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

/** Tracks the target's on-screen box every frame, so it follows layout changes, scrolling and late mounts. */
function useTargetBox(target: string | undefined): Box | null {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!target) return;
    const find = () => document.querySelector(`[data-tour="${target}"]`);
    find()?.scrollIntoView({ block: 'nearest' });
    let raf = 0;
    const tick = () => {
      const r = find()?.getBoundingClientRect();
      const next = r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      setBox((prev) => (sameBox(prev, next) ? prev : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return target ? box : null;
}
