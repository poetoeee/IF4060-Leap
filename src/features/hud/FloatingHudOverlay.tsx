import { useEffect, useState } from 'react';
import { HudCard } from './HudCard';
import type { HudView } from './view';

/** Content of the transparent, click-through Electron HUD window; the card sits in its bottom-right corner. */
export function FloatingHudOverlay() {
  const [view, setView] = useState<HudView | null>(null);

  useEffect(() => {
    for (const el of [document.documentElement, document.body, document.getElementById('root')]) el?.classList.add('is-overlay');
    return window.electronAPI?.onHudData?.((data) => setView(data as HudView | null));
  }, []);

  if (!view) return null;
  return (
    <div className="flex size-full select-none items-end justify-end p-4">
      <HudCard view={view} />
    </div>
  );
}
