import { describe, expect, it } from 'vitest';
import { placePopover } from '../placement';

const view = { w: 1280, h: 800 };
const pop = { w: 340, h: 200 };

describe('placePopover', () => {
  it('centres without a target', () => {
    expect(placePopover(null, pop, view)).toEqual({ x: 470, y: 300 });
  });

  it('prefers the right side, aligned to the target top', () => {
    expect(placePopover({ x: 20, y: 100, w: 200, h: 40 }, pop, view)).toEqual({ x: 236, y: 100 });
  });

  it('falls back to the left when the right side is too narrow', () => {
    expect(placePopover({ x: 900, y: 100, w: 360, h: 300 }, pop, view)).toEqual({ x: 544, y: 100 });
  });

  it('keeps a side popover on screen for a target near the bottom', () => {
    expect(placePopover({ x: 20, y: 760, w: 200, h: 30 }, pop, view)).toEqual({ x: 236, y: 588 });
  });

  it('goes below a wide target, then above', () => {
    expect(placePopover({ x: 100, y: 100, w: 1100, h: 200 }, pop, view)).toEqual({ x: 100, y: 316 });
    expect(placePopover({ x: 100, y: 500, w: 1100, h: 290 }, pop, view)).toEqual({ x: 100, y: 284 });
  });

  it('overlaps the top-right corner of a target that fills the screen', () => {
    expect(placePopover({ x: 0, y: 0, w: 1280, h: 800 }, pop, view)).toEqual({ x: 924, y: 16 });
  });
});
