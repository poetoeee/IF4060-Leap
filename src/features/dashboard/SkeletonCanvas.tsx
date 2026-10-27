import { useEffect, useRef } from 'react';
import { project } from '@/tracking/hand';
import type { TrackingFrame } from '@/tracking/types';
import { useFrames } from '@/tracking/useTracking';

const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
] as const;
const PALM = [0, 1, 5, 9, 13, 17];

const token = (name: string, a = 1) =>
  `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim()} / ${a})`;

/** Draws every hand of each frame; source-agnostic via `project`. */
export function SkeletonCanvas({ aspect }: { aspect: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const colors = useRef<Record<string, string>>({});

  useEffect(() => {
    colors.current = {
      bone: token('accent-default'),
      glow: token('accent-default', 0.6),
      ir: token('accent-glow', 0.14),
      irShadow: token('accent-glow', 0.5),
      jointFill: token('text-on-accent'),
      jointStroke: token('accent-hover'),
    };
    const canvas = ref.current!;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, []);

  useFrames((f: TrackingFrame) => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const c = colors.current;
    ctx.clearRect(0, 0, w, h);

    for (const hand of f.hands) {
      const pts = hand.landmarks.map((p) => project(p, w, h, aspect));

      ctx.save();
      ctx.shadowColor = c.irShadow!;
      ctx.shadowBlur = 28;
      ctx.fillStyle = c.ir!;
      ctx.beginPath();
      PALM.forEach((i, n) => (n ? ctx.lineTo(pts[i]!.x, pts[i]!.y) : ctx.moveTo(pts[i]!.x, pts[i]!.y)));
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = c.bone!;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.shadowColor = c.glow!;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (const [a, b] of BONES) {
        ctx.moveTo(pts[a]!.x, pts[a]!.y);
        ctx.lineTo(pts[b]!.x, pts[b]!.y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = c.jointFill!;
      ctx.strokeStyle = c.jointStroke!;
      ctx.lineWidth = 2;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  });

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 size-full" />;
}
