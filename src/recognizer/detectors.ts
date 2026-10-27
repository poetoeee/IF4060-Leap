import type { GestureId } from '@/mapping/types';
import type { Features } from './features';
import { CANDIDATE_MIN, type RecognizerConfig } from './types';

/** Detector output before cooldowns. `fire` still has to pass the engine's cooldown/refractory checks. */
export interface Hit {
  kind: 'fire' | 'candidate' | 'hold';
  gesture: GestureId;
  confidence: number;
  holdMs?: number;
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
const RETURN_BLOCK_MS = 350;
const RETURN_SETTLE_MS = 100;
const CANDIDATE_DWELL_MS = 250;
const HOLD_GRACE_MS = 100;
const PINCH_HOLD_MS = 100;

type Dir = 'left' | 'right' | 'up' | 'down';
const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' };

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
  private motion = { active: false, best: 0, dir: 'right' as Dir, fired: false };

  private pinchArmed = false;
  private pinchSince: number | null = null;
  private fistArmed = true;
  private fistSince: number | null = null;
  private dwell = new Map<GestureId, number>();
  private candidateSent = new Set<GestureId>();

  private holdStart: number | null = null;
  private holdLastOk = 0;
  private holdsFired = new Set<number>();

  /** Debug snapshot. */
  state() {
    return {
      pinchArmed: this.pinchArmed,
      fistArmed: this.fistArmed,
      holdMs: this.holdStart === null ? 0 : Math.round(this.holdLastOk - this.holdStart),
      blocked: this.blocked?.dir ?? null,
    };
  }

  update(f: Features, cfg: RecognizerConfig): Hit[] {
    return [...this.detectSwipe(f, cfg), ...this.detectPinch(f, cfg), ...this.detectFist(f, cfg), ...this.detectPalm(f, cfg)];
  }

  private detectSwipe(f: Features, { k, confirm }: RecognizerConfig): Hit[] {
    // The return stroke stays blocked while the hand keeps moving fast, not just for the first 350 ms.
    // When the block ends, drop the samples it covered so they can't complete a late opposite swipe.
    if (this.blocked) {
      if (f.t < this.blocked.until && f.speed > 2 * f.size) this.blocked.until = Math.max(this.blocked.until, f.t + RETURN_SETTLE_MS);
      if (f.t >= this.blocked.until) {
        this.blocked = null;
        this.swipe = [];
      }
    }

    const open = f.grab < 0.35 && f.extendedCount >= 3;
    this.swipe.push({ t: f.t, x: f.palm.x, y: f.palm.y, vx: f.vel.x, vy: f.vel.y, open });
    while (this.swipe.length && f.t - this.swipe[0]!.t > SWIPE_WINDOW_MS) this.swipe.shift();

    const minDisp = 1.4 * k * f.size;
    const minSpeed = 6 * k * f.size;
    const first = this.swipe[0]!;
    const dx = f.palm.x - first.x;
    const dy = f.palm.y - first.y;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const disp = horizontal ? Math.abs(dx) : Math.abs(dy);
    const other = horizontal ? Math.abs(dy) : Math.abs(dx);
    const dir: Dir = horizontal ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'up' : 'down';
    const peak = Math.max(...this.swipe.map((s) => Math.abs(horizontal ? s.vx : s.vy)));
    const openRatio = this.swipe.filter((s) => s.open).length / this.swipe.length;

    const valid = openRatio >= 0.8 && disp >= 2 * other && this.blocked?.dir !== dir;
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
      hits.push({ kind: 'fire', gesture: `swipe_${dir}`, confidence: conf });
      this.swipe = [];
      this.blocked = { dir: OPPOSITE[dir], until: f.t + RETURN_BLOCK_MS };
      this.motion.fired = true;
    }
    return hits;
  }

  private detectPinch(f: Features, { k, confirm }: RecognizerConfig): Hit[] {
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
