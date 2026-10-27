import { describe, expect, it } from 'vitest';
import { parseBridgeMessage, statusOf } from '../sources/leap';

const hand = { side: 'right', confidence: 1, landmarks: Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 })), native: { grab: 0.1, pinch: 0 } };

describe('parseBridgeMessage', () => {
  it('accepts a frame', () => {
    const m = parseBridgeMessage(JSON.stringify({ type: 'frame', data: { timestamp: 12, hands: [hand] } }));
    expect(m).toMatchObject({ type: 'frame', timestamp: 12, hands: [{ side: 'right', native: { grab: 0.1 } }] });
  });

  it('accepts a status', () => {
    expect(parseBridgeMessage(JSON.stringify({ type: 'status', data: { service: 'running', device: 'connected' } }))).toEqual({
      type: 'status',
      service: 'running',
      device: 'connected',
    });
  });

  it.each([
    'not json',
    JSON.stringify({ type: 'frame', data: { timestamp: 1, hands: [{ ...hand, landmarks: [] }] } }),
    JSON.stringify({ type: 'frame', data: { timestamp: 'x', hands: [] } }),
    JSON.stringify({ type: 'status', data: { service: 'ok', device: 'connected' } }),
    JSON.stringify({ type: 'other', data: {} }),
  ])('rejects malformed input %#', (raw) => {
    expect(parseBridgeMessage(raw)).toBeNull();
  });
});

describe('statusOf', () => {
  it('maps service/device state to a source status', () => {
    expect(statusOf({ type: 'status', service: 'running', device: 'connected' })).toEqual(['running']);
    expect(statusOf({ type: 'status', service: 'missing', device: 'disconnected' })[1]).toMatch(/Tracking Service/);
    expect(statusOf({ type: 'status', service: 'running', device: 'disconnected' })[1]).toMatch(/not connected/);
  });
});
