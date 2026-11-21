import { HudCard } from './HudCard';
import { useHudView } from './view';

/** Electron shows the HUD in its own always-on-top window instead (FloatingHudOverlay). */
const HAS_OVERLAY_WINDOW = !!window.electronAPI?.isElectron;

/** In-page HUD, bottom-right; browser only. */
export function Hud() {
  const view = useHudView((s) => s.view);
  if (!view || HAS_OVERLAY_WINDOW) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50">
      <HudCard view={view} />
    </div>
  );
}
