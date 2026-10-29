import { contextBridge, ipcRenderer } from 'electron';

export interface NativeActionPayload {
  type: 'key' | 'combo' | 'click' | 'scroll';
  key?: string;
  keys?: string[];
  button?: 'left' | 'right';
  direction?: 'up' | 'down';
  amount?: number;
}

const electronAPI = {
  isElectron: true,
  executeAction: (action: NativeActionPayload) => ipcRenderer.invoke('execute-action', action),
  minimizeToTray: () => ipcRenderer.invoke('window-minimize-to-tray'),
  updateHud: (hud: unknown) => ipcRenderer.invoke('update-hud', hud),
  onHudData: (callback: (data: unknown) => void) => {
    const listener = (_e: Electron.IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('hud-data', listener);
    return () => {
      ipcRenderer.removeListener('hud-data', listener);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
