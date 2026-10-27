import type { GestureId, Sensitivity } from '@/mapping/types';

export type Side = 'left' | 'right';

export interface GestureEvent {
  /** `gesture` fired · `candidate` almost (HUD "Hold steady…") · `hold` Open Palm hold progress. */
  kind: 'gesture' | 'candidate' | 'hold';
  gesture: GestureId;
  hand: Side;
  confidence: number;
  /** Frame timestamp that produced the event (ms). */
  t: number;
  /** Open Palm: threshold reached (`gesture`) or time held so far (`hold`). */
  holdMs?: number;
}

export interface RecognizerConfig {
  /** Thresholds multiplier: higher = stricter. */
  k: number;
  /** Minimum confidence to fire. */
  confirm: number;
  /** Open Palm hold thresholds (ms) that emit a `gesture` event. */
  holdThresholds: number[];
}

export const SENSITIVITY: Record<Sensitivity, Pick<RecognizerConfig, 'k' | 'confirm'>> = {
  relaxed: { k: 0.8, confirm: 0.5 },
  balanced: { k: 1, confirm: 0.6 },
  strict: { k: 1.25, confirm: 0.75 },
};

export const CANDIDATE_MIN = 0.4;
export const DEFAULT_HOLDS = [300, 2000];
