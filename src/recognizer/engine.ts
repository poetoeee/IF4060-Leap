import type { GestureId, Sensitivity } from '@/mapping/types';
import { isHeightGesture } from '@/mapping/rules';
import type { TrackingFrame } from '@/tracking/types';
import { HandDetectors } from './detectors';
import { computeFeatures, poseOf, type Features, type Pose, type Sample } from './features';
import { DEFAULT_HOLDS, SENSITIVITY, type GestureEvent, type RecognizerConfig, type Side } from './types';

const COOLDOWN_MS = 500;
const REFRACTORY_MS = 250;
const HISTORY_MS = 600;
/** Minimum gap between two height steps of the same direction. */
const HEIGHT_STEP_COOLDOWN_MS = 40;

interface HandTrack {
  history: Sample[];
  detectors: HandDetectors;
  features: Features | null;
}

export interface HandDebug {
  side: Side;
  pose: Pose;
  features: Features;
  state: ReturnType<HandDetectors['state']>;
}

/** Source-agnostic gesture recognizer: TrackingFrame in, GestureEvents out. */
export class Recognizer {
  private cfg: RecognizerConfig;
  private hands = new Map<Side, HandTrack>();
  private lastFire = new Map<string, number>();
  private lastAny = -Infinity;

  constructor(sensitivity: Sensitivity = 'balanced', holdThresholds = DEFAULT_HOLDS) {
    this.cfg = { ...SENSITIVITY[sensitivity], holdThresholds, repeatGestures: [], heightGestures: { left: [], right: [] } };
  }

  setSensitivity(s: Sensitivity) {
    this.cfg = { ...this.cfg, ...SENSITIVITY[s] };
  }

  setHoldThresholds(ms: number[]) {
    this.cfg = { ...this.cfg, holdThresholds: [...new Set(ms)].sort((a, b) => a - b) };
  }

  setRepeatGestures(gestures: GestureId[]) {
    this.cfg = { ...this.cfg, repeatGestures: gestures };
  }

  /** Height gestures per hand; empty switches that hand's height tracking off. */
  setHeightGestures(gestures: Record<Side, GestureId[]>) {
    this.cfg = { ...this.cfg, heightGestures: { left: [...gestures.left], right: [...gestures.right] } };
  }

  reset() {
    this.hands.clear();
    this.lastFire.clear();
    this.lastAny = -Infinity;
  }

  process(frame: TrackingFrame): GestureEvent[] {
    const t = frame.timestamp;
    const seen = new Set<Side>();
    const events: GestureEvent[] = [];

    for (const hand of frame.hands) {
      if (seen.has(hand.side)) continue; // MediaPipe can briefly label both hands the same side.
      seen.add(hand.side);
      const track = this.track(hand.side);
      const f = computeFeatures(hand, t, track.history);
      track.history.push({ t, palm: f.palm });
      while (track.history.length && t - track.history[0]!.t > HISTORY_MS) track.history.shift();
      track.features = f;

      for (const hit of track.detectors.update(f, this.cfg, hand.side)) {
        const base = { gesture: hit.gesture, hand: hand.side, confidence: hit.confidence, t, holdMs: hit.holdMs };
        if (hit.kind !== 'fire') {
          events.push({ ...base, kind: hit.kind });
          continue;
        }
        const key = `${hit.gesture}:${hand.side}:${hit.holdMs ?? ''}`;
        if (isHeightGesture(hit.gesture)) {
          // Height steps fire once per centimetre: they don't take part in the
          // gesture cooldown and never hold back the other gestures.
          if (t - (this.lastFire.get(key) ?? -Infinity) < HEIGHT_STEP_COOLDOWN_MS) continue;
          this.lastFire.set(key, t);
          events.push({ ...base, kind: 'gesture', steps: hit.steps });
          continue;
        }
        if (t - (this.lastFire.get(key) ?? -Infinity) < COOLDOWN_MS || t - this.lastAny < REFRACTORY_MS) continue;
        this.lastFire.set(key, t);
        this.lastAny = t;
        events.push({ ...base, kind: 'gesture' });
      }
    }

    for (const side of this.hands.keys()) if (!seen.has(side)) this.hands.delete(side);
    return events;
  }

  debug(): HandDebug[] {
    return [...this.hands.entries()]
      .filter(([, h]) => h.features)
      .map(([side, h]) => ({ side, pose: poseOf(h.features!), features: h.features!, state: h.detectors.state() }));
  }

  private track(side: Side): HandTrack {
    let tr = this.hands.get(side);
    if (!tr) {
      tr = { history: [], detectors: new HandDetectors(), features: null };
      this.hands.set(side, tr);
    }
    return tr;
  }
}
