import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Settings } from '@/mapping/types';

export const STORAGE_KEY = 'gesturmap:v1';

export const DEFAULT_SETTINGS: Settings = {
  controllerEnabled: true,
  activeProfileId: 'presentation',
  sensitivity: 'balanced',
  trackingSource: 'camera',
  cameraPreview: true,
  userName: 'Edo',
};

interface AppState {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings }),
      // Keep defaults for keys added after the data was saved.
      merge: (saved, current) => ({
        ...current,
        settings: { ...current.settings, ...(saved as Partial<AppState> | undefined)?.settings },
      }),
    },
  ),
);

export const useSettings = () => useAppStore((s) => s.settings);
