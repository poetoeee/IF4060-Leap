import { describe, expect, it } from 'vitest';
import { qualityBars } from './quality';

describe('qualityBars', () => {
  it('uses fps when no hand is visible', () => {
    expect(qualityBars(30, 0)).toBe(5);
    expect(qualityBars(12, 0)).toBe(2);
    expect(qualityBars(0, 0)).toBe(0);
  });

  it('is capped by hand confidence', () => {
    expect(qualityBars(30, 0.7)).toBe(3);
  });
});
