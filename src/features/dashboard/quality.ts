/** 0–5 bars from frame rate and, when a hand is visible, its confidence. */
export function qualityBars(fps: number, confidence: number): number {
  const byFps = fps >= 25 ? 5 : fps >= 20 ? 4 : fps >= 15 ? 3 : fps >= 8 ? 2 : fps > 0 ? 1 : 0;
  if (!confidence) return byFps;
  const byConf = confidence >= 0.9 ? 5 : confidence >= 0.8 ? 4 : confidence >= 0.65 ? 3 : confidence >= 0.5 ? 2 : 1;
  return Math.min(byFps, byConf);
}
