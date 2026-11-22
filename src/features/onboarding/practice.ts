import { useEffect, useState } from 'react';
import { PAUSE_HOLD_MS } from '@/mapping/rules';
import type { GestureId } from '@/mapping/types';
import { captureGestures } from '@/pipeline/controller';

export interface Practice {
  tried: ReadonlySet<GestureId>;
  /** Latest recognised or almost-recognised gesture; `t` is the frame time (performance clock). */
  last: { gesture: GestureId; confidence: number; kind: 'gesture' | 'candidate'; t: number } | null;
  /** Left Open Palm hold toward the pause threshold, 0–1. */
  pauseProgress: number;
  pauseDone: boolean;
}

/** Hold events stop when the palm drops; reset the meter once they have. */
const HOLD_IDLE_MS = 250;

/** Takes over gesture events while mounted, so practising sends nothing and never pauses the controller. */
export function usePractice(): Practice {
  const [tried, setTried] = useState<ReadonlySet<GestureId>>(() => new Set());
  const [last, setLast] = useState<Practice['last']>(null);
  const [pauseProgress, setPauseProgress] = useState(0);
  const [pauseDone, setPauseDone] = useState(false);

  useEffect(() => {
    let holdIdle = 0;
    const release = captureGestures((e) => {
      if (e.kind === 'hold') {
        if (e.hand !== 'left') return;
        // Quantised so a steady hold doesn't re-render every frame.
        setPauseProgress(Math.min(1, Math.round(((e.holdMs ?? 0) / PAUSE_HOLD_MS) * 20) / 20));
        clearTimeout(holdIdle);
        holdIdle = window.setTimeout(() => setPauseProgress(0), HOLD_IDLE_MS);
        return;
      }
      if (e.kind === 'repeat') return;
      setLast({ gesture: e.gesture, confidence: e.confidence, kind: e.kind, t: e.t });
      if (e.kind !== 'gesture') return;
      setTried((t) => (t.has(e.gesture) ? t : new Set(t).add(e.gesture)));
      if (e.gesture === 'open_palm' && e.hand === 'left' && e.holdMs === PAUSE_HOLD_MS) setPauseDone(true);
    });
    return () => {
      release();
      clearTimeout(holdIdle);
    };
  }, []);

  return { tried, last, pauseProgress, pauseDone };
}
