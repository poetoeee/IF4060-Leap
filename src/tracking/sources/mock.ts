import { BaseSource } from './base';
import { makeHand } from './mockHand';
import { MOCK_KEYS, poseAt, restPose, scriptDuration, type MockGesture, type Side } from './mockScripts';

const FPS = 30;

/** Neutral right hand at 30 fps; keys 1–7 play a gesture script, Shift+key uses the left hand. */
export class MockSource extends BaseSource {
  readonly id = 'mock' as const;
  private timer = 0;
  private playing: { g: MockGesture; side: Side; t0: number } | null = null;

  async start() {
    window.addEventListener('keydown', this.onKey);
    this.timer = window.setInterval(this.tick, 1000 / FPS);
    this.emitStatus('running');
  }

  stop() {
    window.removeEventListener('keydown', this.onKey);
    clearInterval(this.timer);
    this.playing = null;
    this.emitStatus('idle');
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || isTyping(e.target)) return;
    const g = MOCK_KEYS[Number(e.code.replace('Digit', '')) - 1];
    if (g) this.playing = { g, side: e.shiftKey ? 'left' : 'right', t0: performance.now() };
  };

  private tick = () => {
    const now = performance.now();
    const p = this.playing;
    if (p && now - p.t0 > scriptDuration(p.g)) this.playing = null;
    const pose = this.playing ? poseAt(p!.g, p!.side, now - p!.t0) : restPose('right');
    // Small sway so the idle hand looks alive.
    pose.wrist.x += Math.sin(now / 900) * 3;
    pose.wrist.y += Math.sin(now / 1300) * 2;
    this.emitFrame({ source: 'mock', timestamp: now, hands: [makeHand(pose)] });
  };
}

function isTyping(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
}
