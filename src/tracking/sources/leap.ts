import { BaseSource } from './base';

export const LEAP_BRIDGE_URL = 'ws://127.0.0.1:8765';

// TODO(P5): WebSocket client for bridge/leap_bridge.py (retry every 2 s, frame + status messages).
export class LeapSource extends BaseSource {
  readonly id = 'leap' as const;

  async start() {
    this.emitStatus('no-device', 'Leap bridge not running — start bridge/leap_bridge.py');
  }

  stop() {
    this.emitStatus('idle');
  }
}
