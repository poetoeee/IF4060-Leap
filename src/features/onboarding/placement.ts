export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Size = { w: number; h: number };

const GAP = 16;
const MARGIN = 12;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Top-left corner for a popover next to `target`: right, left, below, then above it, kept on screen.
 * When nothing fits it overlaps the target's top-right corner; with no target it is centred.
 */
export function placePopover(target: Box | null, pop: Size, view: Size): { x: number; y: number } {
  if (!target) return { x: (view.w - pop.w) / 2, y: (view.h - pop.h) / 2 };
  const clampX = (x: number) => clamp(x, MARGIN, view.w - MARGIN - pop.w);
  const clampY = (y: number) => clamp(y, MARGIN, view.h - MARGIN - pop.h);

  const right = target.x + target.w + GAP;
  if (right + pop.w <= view.w - MARGIN) return { x: right, y: clampY(target.y) };
  const left = target.x - GAP - pop.w;
  if (left >= MARGIN) return { x: left, y: clampY(target.y) };
  const below = target.y + target.h + GAP;
  if (below + pop.h <= view.h - MARGIN) return { x: clampX(target.x), y: below };
  const above = target.y - GAP - pop.h;
  if (above >= MARGIN) return { x: clampX(target.x), y: above };
  return { x: clampX(target.x + target.w - pop.w - GAP), y: clampY(target.y + GAP) };
}
