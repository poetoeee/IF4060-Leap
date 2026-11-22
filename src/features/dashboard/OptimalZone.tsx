import { useEffect, useRef, useState } from 'react';
import { OPTIMAL_ZONE, project } from '@/tracking/hand';

/** Dashed comfort-zone box over a tracking stage, optionally tagged with the current poses. */
export function OptimalZone({ aspect, tag = '' }: { aspect: number; tag?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const parent = ref.current!.parentElement!;
    const ro = new ResizeObserver(() => setBox({ w: parent.clientWidth, h: parent.clientHeight }));
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  const { x: left, y: top, scale } = project({ x: -OPTIMAL_ZONE.w / 2, y: OPTIMAL_ZONE.cy + OPTIMAL_ZONE.h / 2, z: 0 }, box.w, box.h, aspect);
  const w = OPTIMAL_ZONE.w * scale;
  const h = OPTIMAL_ZONE.h * scale;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      <div className="absolute rounded-[20px] border border-dashed border-accent bg-accent/5" style={{ left, top, width: w, height: h }} />
      {tag && (
        <span
          className="absolute -translate-y-1/2 whitespace-nowrap rounded-nav bg-accent py-1 pl-2 pr-2.5 font-mono text-key text-fg-on-accent"
          style={{ left, top }}
        >
          {tag}
        </span>
      )}
    </div>
  );
}
