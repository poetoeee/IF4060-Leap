import type { GestureId } from '@/mapping/types';
import type { Features } from './features';
import { CANDIDATE_MIN, type RecognizerConfig, type Side } from './types';

/** Detector output before cooldowns. `fire` still has to pass the engine's cooldown/refractory checks. */
export interface Hit {
  kind: 'fire' | 'candidate' | 'hold' | 'repeat';
  gesture: GestureId;
  confidence: number;
  holdMs?: number;
  /** Height gestures only: how many centimetres were crossed in this frame. */
  steps?: number;
}

// Margin m: 1 = exactly at threshold, 1.5 = comfortably past it.
/** Higher is better, bounded by `max`. */
const over = (v: number, on: number, max = 1) => (v >= on ? 1 + (0.5 * (v - on)) / Math.max(1e-6, max - on) : v / on);
/** Lower is better. */
const under = (v: number, thr: number) => (v <= thr ? 1 + (0.5 * (thr - v)) / thr : thr / Math.max(v, 1e-6));
/** Margin → confidence: 0.6 at threshold, 1 at m = 1.5, scaled by tracking confidence. */
export const score = (m: number, handConf: number) =>
  Math.min(1, Math.max(0, m < 1 ? 0.6 * m : 0.6 + 0.8 * Math.min(0.5, m - 1))) * (0.5 + 0.5 * handConf);

const SWIPE_WINDOW_MS = 450;
const RETURN_BLOCK_MS = 450;
const RETURN_SETTLE_MS = 150;
const POST_SWIPE_GUARD_MS = 450;
const CANDIDATE_DWELL_MS = 250;
const HOLD_GRACE_MS = 100;
const PINCH_HOLD_MS = 100;
/** Palm speed (handSize/s) below which the hand counts as held still. */
const STILL_SPEED = 1.5;
/** A repeatable swipe must come to rest this soon after firing, otherwise it was a return stroke. */
const REPEAT_SETTLE_MS = 350;
const REPEAT_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 120;

/** One centimetre of height change is one step — and one input. */
export const HEIGHT_STEP_MM = 10;
/** The travelled height is a sum of floats, so the step comparison needs a hair of slack. */
const HEIGHT_EPS = 1e-6;
/** Smoothing of the palm height. */
const HEIGHT_SMOOTH = 0.5;
/** Once the smoothing has caught up this closely, the raw height is used. */
const HEIGHT_SNAP_MM = 1;
/** Palm speed (× hand size) above which the movement is a swipe, not a height change. */
const HEIGHT_SPEED_GUARD = 2.5;
/** Most height steps that may pile up in a single frame. */
const MAX_HEIGHT_STEPS = 3;
/** The hand has to be open enough to be "holding" something. */
const HEIGHT_MAX_GRAB = 0.45;
const HEIGHT_MIN_EXTENDED = 3;

type Dir = 'left' | 'right' | 'up' | 'down';
const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

const isOpen = (f: Features) => f.grab < 0.35 && f.extendedCount >= 3;

interface SwipeSample {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  open: boolean;
}

/** Per-hand detector state. */
export class HandDetectors {
  private swipe: SwipeSample[] = [];
  private blocked: { dir: Dir; until: number } | null = null;
  private lastSwipeAt = -Infinity;
  private motion = { active: false, best: 0, dir: 'right' as Dir, fired: false };
  private sustain: { gesture: GestureId; firedAt: number; stillSince: number | null; lastStill: number; nextAt: number } | null = null;

  private pinchArmed = false;
  private pinchSince: number | null = null;
  private fistArmed = true;
  private fistSince: number | null = null;
  private dwell = new Map<GestureId, number>();
  private candidateSent = new Set<GestureId>();

  private holdStart: number | null = null;
  private holdLastOk = 0;
  private holdsFired = new Set<number>();

  /** Height tracking: smoothed palm height and the height change still to be spent. */
  private height = { smooth: 0, pending: 0, started: false };

  /** Debug snapshot. */
  state() {
    return {
      pinchArmed: this.pinchArmed,
      fistArmed: this.fistArmed,
      holdMs: this.holdStart === null ? 0 : Math.round(this.holdLastOk - this.holdStart),
      blocked: this.blocked?.dir ?? null,
    };
  }

  update(f: Features, cfg: RecognizerConfig, side: Side): Hit[] {
    return [
      ...this.detectSwipe(f, cfg),
      ...this.detectRepeat(f),
      ...this.detectPinch(f, cfg),
      ...this.detectFist(f, cfg),
      ...this.detectPalm(f, cfg),
      ...this.detectHeight(f, cfg, side),
    ];
  }

  /** Height gestures: every centimetre the hand gains or loses is one step. */
  private detectHeight(f: Features, cfg: RecognizerConfig, side: Side): Hit[] {
    const wanted = cfg.heightGestures[side];
    const wantsUp = wanted.includes('height_up');
    const wantsDown = wanted.includes('height_down');
    if (!wantsUp && !wantsDown) {
      this.height = { smooth: 0, pending: 0, started: false };
      return [];
    }

    const height = f.palm.y;
    // A closed hand or a fast stroke is not a height change: rebase and wait.
    if (f.grab > HEIGHT_MAX_GRAB || f.extendedCount < HEIGHT_MIN_EXTENDED || f.speed > HEIGHT_SPEED_GUARD * f.size) {
      this.height = { smooth: height, pending: 0, started: true };
      return [];
    }
    if (!this.height.started) {
      this.height = { smooth: height, pending: 0, started: true };
      return [];
    }

    const prev = this.height.smooth;
    this.height.smooth = this.height.smooth + HEIGHT_SMOOTH * (height - this.height.smooth);
    // Once the smoothing has caught up, take the raw height: the filtered
    // travel lags by a hair, and a 10 cm rise has to count 10 cm — not 9.
    if (Math.abs(height - this.height.smooth) < HEIGHT_SNAP_MM) this.height.smooth = height;
    this.height.pending += this.height.smooth - prev;
    if (Math.abs(this.height.pending) < HEIGHT_STEP_MM - HEIGHT_EPS) return [];

    const up = this.height.pending > 0;
    // Only a mapped direction counts; travel the other way is discarded so it
    // cannot pile up and fire later all at once.
    if (up ? !wantsUp : !wantsDown) {
      this.height.pending = 0;
      return [];
    }

    const steps = Math.min(MAX_HEIGHT_STEPS, Math.max(1, Math.floor((Math.abs(this.height.pending) + HEIGHT_EPS) / HEIGHT_STEP_MM)));
    this.height.pending -= steps * HEIGHT_STEP_MM * (up ? 1 : -1);
    return [{ kind: 'fire', gesture: up ? 'height_up' : 'height_down', confidence: f.confidence, steps }];
  }

  private detectSwipe(f: Features, { k, confirm, repeatGestures }: RecognizerConfig): Hit[] {
    // The return stroke stays blocked while the hand keeps moving fast, not just for the first 450 ms.
    // When the block ends, drop the samples it covered so they can't complete a late opposite swipe.
    if (this.blocked) {
      if (f.t < this.blocked.until && f.speed > 1.5 * f.size) this.blocked.until = Math.max(this.blocked.until, f.t + RETURN_SETTLE_MS);
      if (f.t >= this.blocked.until) {
        this.blocked = null;
        this.swipe = [];
      }
    }

    this.swipe.push({ t: f.t, x: f.palm.x, y: f.palm.y, vx: f.vel.x, vy: f.vel.y, open: isOpen(f) });
    while (this.swipe.length && f.t - this.swipe[0]!.t > SWIPE_WINDOW_MS) this.swipe.shift();

    // If a return stroke in the blocked direction is underway, keep pruning earlier points
    // so residual deceleration never flips into an opposite or perpendicular swipe.
    if (this.blocked) {
      const opp = this.blocked.dir;
      const movingBlocked =
        (opp === 'left' && f.vel.x < -1.2 * f.size) ||
        (opp === 'right' && f.vel.x > 1.2 * f.size) ||
        (opp === 'down' && f.vel.y < -1.2 * f.size) ||
        (opp === 'up' && f.vel.y > 1.2 * f.size);
      if (movingBlocked) {
        this.blocked.until = Math.max(this.blocked.until, f.t + RETURN_SETTLE_MS);
        this.swipe = [this.swipe.at(-1)!];
        return [];
      }
    }

    const minDisp = 1.4 * k * f.size;
    const minSpeed = 6 * k * f.size;

    // Measure displacement from the true stroke origin inside the window (extremum along the current motion)
    // so brief stationary frames before the stroke or curved approach don't dilute the displacement ratio.
    let bestAnchor = this.swipe[0]!;
    let bestDisp = 0;
    for (const s of this.swipe) {
      const d = Math.hypot(f.palm.x - s.x, f.palm.y - s.y);
      if (d > bestDisp) {
        bestDisp = d;
        bestAnchor = s;
      }
    }

    const dx = f.palm.x - bestAnchor.x;
    const dy = f.palm.y - bestAnchor.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const disp = horizontal ? Math.abs(dx) : Math.abs(dy);
    const other = horizontal ? Math.abs(dy) : Math.abs(dx);
    const dir: Dir = horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'up' : 'down';
    const activeSamples = this.swipe.slice(this.swipe.indexOf(bestAnchor));
    const peak = Math.max(...activeSamples.map((s) => Math.abs(horizontal ? s.vx : s.vy)));
    const openRatio = activeSamples.filter((s) => s.open).length / activeSamples.length;

    // Require current velocity to still align with the displacement direction (not already reversing)
    const alignedVel =
      (dir === 'right' && f.vel.x >= 0) ||
      (dir === 'left' && f.vel.x <= 0) ||
      (dir === 'up' && f.vel.y >= 0) ||
      (dir === 'down' && f.vel.y <= 0);

    const valid = openRatio >= 0.8 && disp >= 1.85 * other && alignedVel && this.blocked?.dir !== dir;
    const conf = valid ? score(Math.min(disp / minDisp, peak / minSpeed), f.confidence) : 0;

    // Track one motion episode so a near-miss can be reported once as a candidate.
    const hits: Hit[] = [];
    if (f.speed > 2 * f.size) {
      if (!this.motion.active) this.motion = { active: true, best: 0, dir, fired: false };
      if (conf > this.motion.best) this.motion = { ...this.motion, best: conf, dir };
    } else if (this.motion.active && f.speed < f.size) {
      if (!this.motion.fired && this.motion.best >= CANDIDATE_MIN && this.motion.best < confirm) {
        hits.push({ kind: 'candidate', gesture: `swipe_${this.motion.dir}`, confidence: this.motion.best });
      }
      this.motion.active = false;
    }

    if (valid && conf >= confirm) {
      const gesture: GestureId = `swipe_${dir}`;
      hits.push({ kind: 'fire', gesture, confidence: conf });
      this.sustain = repeatGestures.includes(gesture) ? { gesture, firedAt: f.t, stillSince: null, lastStill: f.t, nextAt: 0 } : null;
      this.swipe = [];
      this.blocked = { dir: OPPOSITE[dir], until: f.t + RETURN_BLOCK_MS };
      this.lastSwipeAt = f.t;
      this.holdStart = null;
      this.holdsFired.clear();
      this.pinchSince = null;
      this.fistSince = null;
      this.motion.fired = true;
    }
    return hits;
  }

  /** After a repeatable swipe, an open hand held still emits `repeat` until it moves, closes or is lost. */
  private detectRepeat(f: Features): Hit[] {
    const s = this.sustain;
    if (!s) return [];
    const still = f.speed < STILL_SPEED * f.size;
    const ended = s.stillSince === null ? f.t - s.firedAt > REPEAT_SETTLE_MS : f.t - s.lastStill > HOLD_GRACE_MS;
    if (!isOpen(f) || (!still && ended)) {
      this.sustain = null;
      return [];
    }
    if (!still) return [];
    s.stillSince ??= f.t;
    s.lastStill = f.t;
    if (f.t - s.stillSince < REPEAT_DELAY_MS || f.t < s.nextAt) return [];
    s.nextAt = f.t + REPEAT_INTERVAL_MS;
    return [{ kind: 'repeat', gesture: s.gesture, confidence: f.confidence }];
  }

  private detectPinch(f: Features, { k, confirm }: RecognizerConfig): Hit[] {
    if (f.t - this.lastSwipeAt < POST_SWIPE_GUARD_MS) {
      this.pinchSince = null;
      return this.settle('pinch');
    }
    const on = Math.min(0.95, 0.8 * k);
    if (f.pinch < 0.45) this.pinchArmed = true;
    // A forming fist also brings thumb and index tips together; a pinch keeps the index reaching out
    // and is held briefly, while a fist passes through that shape in a frame or two.
    if (!this.pinchArmed || f.grab >= 0.7 || f.indexReach < 1.2) {
      this.pinchSince = null;
      return this.settle('pinch');
    }
    const conf = score(over(f.pinch, on), f.confidence);
    if (conf < confirm) {
      this.pinchSince = null;
      return this.nearMiss('pinch', conf, confirm, f.t);
    }
    this.pinchSince ??= f.t;
    if (f.t - this.pinchSince < PINCH_HOLD_MS) return [];
    this.pinchArmed = false;
    this.pinchSince = null;
    this.dwell.delete('pinch');
    return [{ kind: 'fire', gesture: 'pinch', confidence: conf }];
  }

  private detectFist(f: Features, { k, confirm }: RecognizerConfig): Hit[] {
    if (f.t - this.lastSwipeAt < POST_SWIPE_GUARD_MS) {
      this.fistSince = null;
      return this.settle('fist');
    }
    const on = Math.min(0.95, 0.85 * k);
    if (f.grab < 0.5) this.fistArmed = true;
    if (!this.fistArmed) return [];
    const conf = score(over(f.grab, on), f.confidence);
    if (conf < confirm) {
      this.fistSince = null;
      return this.nearMiss('fist', conf, confirm, f.t);
    }
    this.fistSince ??= f.t;
    if (f.t - this.fistSince < 150) return [];
    this.fistArmed = false;
    this.fistSince = null;
    this.dwell.delete('fist');
    return [{ kind: 'fire', gesture: 'fist', confidence: conf }];
  }

  private detectPalm(f: Features, { k, confirm, holdThresholds }: RecognizerConfig): Hit[] {
    // No Open Palm hold during a post-swipe return stroke or while a swipe is held to repeat.
    if (this.sustain || f.t - this.lastSwipeAt < POST_SWIPE_GUARD_MS || (this.blocked && f.t < this.blocked.until)) {
      this.holdStart = null;
      this.holdsFired.clear();
      return [];
    }
    const m = Math.min(under(f.grab, 0.15 / k), under(f.speed, (1.5 * f.size) / k));
    const ok = f.extendedCount === 5 && f.pinch < 0.5 && m >= 1;
    if (ok) {
      this.holdStart ??= f.t;
      this.holdLastOk = f.t;
    } else if (this.holdStart !== null && f.t - this.holdLastOk > HOLD_GRACE_MS) {
      this.holdStart = null;
      this.holdsFired.clear();
    }
    if (this.holdStart === null || !ok) return [];

    const held = f.t - this.holdStart;
    const conf = score(m, f.confidence);
    const hits: Hit[] = [{ kind: 'hold', gesture: 'open_palm', confidence: conf, holdMs: held }];
    for (const th of holdThresholds) {
      if (held < th || this.holdsFired.has(th)) continue;
      this.holdsFired.add(th);
      hits.push({ kind: conf >= confirm ? 'fire' : 'candidate', gesture: 'open_palm', confidence: conf, holdMs: th });
    }
    return hits;
  }

  /** Report a near-miss once it has lasted CANDIDATE_DWELL_MS; once per attempt. */
  private nearMiss(g: GestureId, conf: number, confirm: number, t: number): Hit[] {
    if (conf < CANDIDATE_MIN || conf >= confirm) return this.settle(g);
    const since = this.dwell.get(g) ?? t;
    this.dwell.set(g, since);
    if (t - since < CANDIDATE_DWELL_MS || this.candidateSent.has(g)) return [];
    this.candidateSent.add(g);
    return [{ kind: 'candidate', gesture: g, confidence: conf }];
  }

  private settle(g: GestureId): Hit[] {
    this.dwell.delete(g);
    this.candidateSent.delete(g);
    return [];
  }
}
