import type { ReactNode } from 'react';
import { GestureGlyph } from '@/components/GestureGlyph';
import { LedMark } from '@/components/LedMark';
import { GESTURES } from '@/mapping/gestures';

export interface Slide {
  kicker: string;
  title: string;
  body: ReactNode;
}

const PIPELINE = (
  <div className="flex flex-wrap items-center gap-3 font-mono text-data">
    {['Camera / Leap', 'Hand landmarks', 'Recognizer', 'Active profile', 'Action'].map((s, i) => (
      <span key={s} className="flex items-center gap-3">
        {i > 0 && <span className="text-accent">→</span>}
        <span className="rounded-ctrl-lg border border-border-strong bg-surface-2 px-4 py-3">{s}</span>
      </span>
    ))}
  </div>
);

export const SLIDES: Slide[] = [
  {
    kicker: 'IF4060 Rekayasa Interaksi · Kelompok 1',
    title: 'GesturMap',
    body: (
      <div className="flex items-center gap-5">
        <LedMark />
        <p className="text-h2 text-fg-secondary">Hand gestures → keyboard & mouse actions.</p>
      </div>
    ),
  },
  {
    kicker: 'The problem',
    title: 'Presenters keep walking back to the laptop',
    body: <p className="max-w-3xl text-h2 font-medium text-fg-secondary">Every “next slide” means a clicker, a keyboard, or a trip across the room. Hands are already free — they just can’t talk to the computer.</p>,
  },
  {
    kicker: 'How it works',
    title: 'From a hand to an action in under 150 ms',
    body: PIPELINE,
  },
  {
    kicker: 'Fixed vocabulary',
    title: 'Seven gestures, recognisable by shape',
    body: (
      <div className="grid grid-cols-7 gap-4">
        {GESTURES.filter((g) => g.available).map((g) => (
          <div key={g.id} className="flex flex-col items-center gap-3 rounded-card border bg-surface-2 px-3 py-5">
            <GestureGlyph gesture={g.id} size={56} />
            <span className="text-label">{g.name}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    kicker: 'Profiles',
    title: 'One gesture, one action — per profile',
    body: <p className="max-w-3xl text-h2 font-medium text-fg-secondary">Presentation Mode swipes through slides; Web Browsing goes back and forward. Add a mapping in under a minute — it works immediately.</p>,
  },
  {
    kicker: 'Stay in control',
    title: 'Hold your left palm to pause',
    body: <p className="max-w-3xl text-h2 font-medium text-fg-secondary">Two seconds of an open left hand pauses every gesture; hold again to resume. The HUD always shows what was recognised and sent.</p>,
  },
  {
    kicker: 'Thank you',
    title: 'Questions?',
    body: <p className="text-h2 font-medium text-fg-secondary">Swipe left to go back · make a fist to end the show.</p>,
  },
];
