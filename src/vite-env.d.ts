/// <reference types="vite/client" />

interface ElectronActionPayload {
  type: 'key' | 'combo' | 'click' | 'scroll';
  key?: string;
  keys?: string[];
  button?: 'left' | 'right';
  direction?: 'up' | 'down';
  amount?: number;
}

type BridgeProcessState = 'stopped' | 'starting' | 'running' | 'error';

interface BridgeStatusPayload {
  state: BridgeProcessState;
  detail?: string;
  pid?: number;
}

interface Window {
  electronAPI?: {
    isElectron: boolean;
    executeAction: (action: ElectronActionPayload) => Promise<{ ok: boolean }>;
    minimizeToTray?: () => Promise<void>;
    updateHud?: (hud: unknown) => Promise<{ ok: boolean }>;
    onHudData?: (callback: (data: unknown) => void) => () => void;
    startBridge?: (options?: { sdkPath?: string }) => Promise<BridgeStatusPayload>;
    stopBridge?: () => Promise<BridgeStatusPayload>;
    getBridgeStatus?: () => Promise<BridgeStatusPayload>;
    getDefaultLeapSdkPath?: () => Promise<string>;
    browseLeapSdkPath?: () => Promise<string | null>;
    onBridgeStatus?: (callback: (status: BridgeStatusPayload) => void) => () => void;
  };
}
