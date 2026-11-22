import { describe, expect, it } from 'vitest';
import { parseBridgeMessage, parseIrImage, statusOf } from '../sources/leap';

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

describe('parseIrImage', () => {
  const image = (width: number, height: number, pixels: number) => {
    const buf = new ArrayBuffer(4 + pixels);
    const view = new DataView(buf);
    view.setUint16(0, width, true);
    view.setUint16(2, height, true);
    new Uint8Array(buf, 4).fill(128);
    return buf;
  };

  it('reads the little-endian size header and grayscale pixels', () => {
    const img = parseIrImage(image(320, 120, 320 * 120));
    expect(img).toMatchObject({ width: 320, height: 120 });
    expect(img?.pixels.length).toBe(320 * 120);
    expect(img?.pixels[0]).toBe(128);
  });

  it.each([
    ['too short for a header', new ArrayBuffer(3)],
    ['zero size', image(0, 120, 0)],
    ['pixel count mismatch', image(320, 120, 100)],
  ])('rejects %s', (_, buf) => {
    expect(parseIrImage(buf)).toBeNull();
  });
});
