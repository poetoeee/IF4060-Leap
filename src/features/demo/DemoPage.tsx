import { useEffect, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { KeyCaps } from '@/components/KeyCap';
import { useAppStore, useProfiles } from '@/store';
import { SLIDES, type Slide } from './slides';

const HINTS: [string[], string][] = [
  [['→'], 'Next'],
  [['←'], 'Previous'],
  [['F5'], 'Start show'],
  [['Esc'], 'End show'],
  [['B'], 'Black screen'],
];

/**
 * Built-in slide deck. Listens to keys on `window`, so it reacts to both the real keyboard and
 * WebActionExecutor's synthetic events (which never trigger browser defaults).
 */
export function DemoPage() {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [black, setBlack] = useState(false);
  const activeId = useAppStore((s) => s.settings.activeProfileId);
  const profileName = useProfiles().find((p) => p.id === activeId)?.name;

  useEffect(() => {
    const go = (d: number) => {
      setBlack(false);
      setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + d)));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
        case ' ':
          go(1);
          break;
        case 'ArrowLeft':
        case 'PageUp':
          go(-1);
          break;
        case 'Home':
          setIndex(0);
          break;
        case 'F5':
          setShow(true);
          setBlack(false);
          // Only a real key press may enter browser fullscreen; gestures get the full-window show.
          if (e.isTrusted) void document.documentElement.requestFullscreen?.().catch(() => undefined);
          break;
        case 'Escape':
          setShow(false);
          setBlack(false);
          if (document.fullscreenElement) void document.exitFullscreen();
          break;
        case 'b':
        case 'B':
          setBlack((b) => !b);
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const slide = SLIDES[index]!;

  if (show) {
    return (
      <div className="fixed inset-0 z-40 flex bg-app">
        <SlideView slide={slide} big />
        <span className="t-overline absolute bottom-6 left-8 text-fg-muted">
          {index + 1} / {SLIDES.length}
        </span>
        {black && <div className="absolute inset-0 bg-inset" />}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col gap-5 px-8 py-7">
      <header className="flex items-end gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="t-overline text-fg-muted">workspace / demo stage</span>
          <div className="flex items-center gap-2.5">
            <h1 className="text-h1">Demo Stage</h1>
            {profileName && <Badge tone="success" label={profileName} />}
          </div>
          <p className="text-body text-fg-secondary">A built-in slide deck that reacts to the active profile’s actions.</p>
        </div>
        <Button variant="primary" icon="presentation" onClick={() => setShow(true)}>
          Start (F5)
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="relative flex aspect-video max-h-full w-full max-w-[1100px] overflow-hidden rounded-card border bg-surface">
          <SlideView slide={slide} />
          {black && <div className="absolute inset-0 bg-inset" />}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="t-overline text-fg-muted">
          slide {index + 1} / {SLIDES.length}
        </span>
        <span className="flex-1" />
        {HINTS.map(([caps, label]) => (
          <span key={label} className="flex items-center gap-2 text-caption text-fg-secondary">
            <KeyCaps caps={caps} />
            {label}
          </span>
        ))}
      </footer>
    </div>
  );
}

function SlideView({ slide, big = false }: { slide: Slide; big?: boolean }) {
  return (
    <div className={`stage-bg flex flex-1 flex-col justify-center gap-8 ${big ? 'px-24' : 'px-14'}`}>
      <span className="t-overline text-accent">{slide.kicker}</span>
      <h2 className={big ? 'text-[64px] font-extrabold leading-[68px] tracking-[-1.6px]' : 'text-display-xl'}>{slide.title}</h2>
      {slide.body}
    </div>
  );
}
