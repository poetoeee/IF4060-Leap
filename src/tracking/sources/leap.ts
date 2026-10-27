import type { HandState, SourceStatus } from '../types';
import { BaseSource } from './base';

export const LEAP_BRIDGE_URL = 'ws://127.0.0.1:8765';
const RETRY_MS = 2000;

const MSG = {
  bridge: 'Leap bridge not running — start bridge/leap_bridge.py',
  service: 'Ultraleap Tracking Service not running — start Gemini',
  device: 'Leap Motion not connected — plug it in',
  waiting: 'Bridge connected — waiting for the sensor…',
};

export type BridgeMessage =
  | { type: 'frame'; timestamp: number; hands: HandState[] }
  | { type: 'status'; service: 'running' | 'missing'; device: 'connected' | 'disconnected' };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isHand(h: unknown): h is HandState {
  const x = h as HandState;
  return (
    !!x &&
    (x.side === 'left' || x.side === 'right') &&
    isNum(x.confidence) &&
    Array.isArray(x.landmarks) &&
    x.landmarks.length === 21 &&
    x.landmarks.every((p) => isNum(p?.x) && isNum(p?.y) && isNum(p?.z))
  );
}

/** Validates a bridge message (PRD §4.3); returns null for anything malformed. */
export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let msg: { type?: unknown; data?: Record<string, unknown> };
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  const d = msg.data;
  if (!d) return null;
  if (msg.type === 'frame' && isNum(d.timestamp) && Array.isArray(d.hands) && d.hands.every(isHand)) {
    return { type: 'frame', timestamp: d.timestamp, hands: d.hands };
  }
  if (msg.type === 'status' && (d.service === 'running' || d.service === 'missing') && (d.device === 'connected' || d.device === 'disconnected')) {
    return { type: 'status', service: d.service, device: d.device };
  }
  return null;
}

/** Status the app should show for a bridge status message. */
export function statusOf(m: Extract<BridgeMessage, { type: 'status' }>): [SourceStatus, string?] {
  if (m.service === 'missing') return ['no-device', MSG.service];
  if (m.device === 'disconnected') return ['no-device', MSG.device];
  return ['running'];
}

/** Hand frames from bridge/leap_bridge.py over a local WebSocket; reconnects every 2 s. */
export class LeapSource extends BaseSource {
  readonly id = 'leap' as const;
  private ws: WebSocket | null = null;
  private retry = 0;
  private stopped = true;
  private status: SourceStatus = 'idle';
  /** Maps bridge timestamps onto performance.now() so latency and velocity use one clock. */
  private clockOffset: number | null = null;

  async start() {
    this.stopped = false;
    this.setStatus('starting');
    this.connect();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.retry);
    this.ws?.close();
    this.ws = null;
    this.setStatus('idle');
  }

  private connect() {
    const ws = new WebSocket(LEAP_BRIDGE_URL);
    this.ws = ws;
    this.clockOffset = null;
    ws.onopen = () => this.setStatus('starting', MSG.waiting);
    ws.onmessage = (e) => {
      const m = parseBridgeMessage(String(e.data));
      if (!m) return;
      if (m.type === 'status') return this.setStatus(...statusOf(m));
      if (this.status !== 'running') this.setStatus('running');
      this.clockOffset ??= performance.now() - m.timestamp;
      this.emitFrame({ source: 'leap', timestamp: m.timestamp + this.clockOffset, hands: m.hands });
    };
    ws.onclose = () => {
      if (this.stopped || this.ws !== ws) return;
      this.setStatus('no-device', MSG.bridge);
      this.retry = window.setTimeout(() => this.connect(), RETRY_MS);
    };
  }

  private setStatus(s: SourceStatus, detail?: string) {
    this.status = s;
    this.emitStatus(s, detail);
  }
}
