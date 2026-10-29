/// <reference types="vite/client" />

interface ElectronActionPayload {
  type: 'key' | 'combo' | 'click' | 'scroll';
  key?: string;
  keys?: string[];
  button?: 'left' | 'right';
  direction?: 'up' | 'down';
  amount?: number;
}

interface Window {
  electronAPI?: {
    isElectron: boolean;
    executeAction: (action: ElectronActionPayload) => Promise<{ ok: boolean }>;
    minimizeToTray?: () => Promise<void>;
    updateHud?: (hud: unknown) => Promise<{ ok: boolean }>;
    onHudData?: (callback: (data: unknown) => void) => () => void;
  };
}
