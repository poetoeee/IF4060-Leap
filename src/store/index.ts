import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { reverted, tagSource, validateMapping } from '@/mapping/rules';
import { seedProfiles, TEMPLATE, TEMPLATE_ID } from '@/mapping/seed';
import type { Mapping, Profile, Settings } from '@/mapping/types';

export const STORAGE_KEY = 'gesturmap:v1';

export const DEFAULT_SETTINGS: Settings = {
  controllerEnabled: true,
  activeProfileId: 'presentation',
  sensitivity: 'balanced',
  trackingSource: 'camera',
  cameraPreview: true,
  userName: 'Edo',
};

type Result = { ok: true } | { ok: false; error: string };

interface AppState {
  settings: Settings;
  /** Custom profiles only; the read-only template lives in code. */
  profiles: Profile[];
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  addMapping: (profileId: string, m: Omit<Mapping, 'id' | 'source' | 'enabled'>) => Result;
  updateMapping: (profileId: string, m: Mapping) => Result;
  removeMapping: (profileId: string, mappingId: string) => void;
  toggleMapping: (profileId: string, mappingId: string) => void;
  revertMapping: (profileId: string, mappingId: string) => void;
  /** Restores a previous `profiles` value (toast Undo). */
  restoreProfiles: (profiles: Profile[]) => void;
  resetDemoData: () => void;
}

const newId = () => (crypto.randomUUID?.() ?? `m-${Date.now()}-${Math.random().toString(36).slice(2)}`);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const patchProfile = (id: string, fn: (p: Profile) => Profile) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? fn(p) : p)) }));
      const patchMapping = (pid: string, mid: string, fn: (m: Mapping) => Mapping) =>
        patchProfile(pid, (p) => ({ ...p, mappings: p.mappings.map((m) => (m.id === mid ? fn(m) : m)) }));
      const profile = (id: string) => get().profiles.find((p) => p.id === id);

      return {
        settings: DEFAULT_SETTINGS,
        profiles: seedProfiles(),
        setSetting: (key, value) => set((s) => ({ settings: { ...s.settings, [key]: value } })),

        addMapping: (pid, draft) => {
          const p = profile(pid);
          if (!p) return { ok: false, error: 'Profile not found.' };
          const m: Mapping = { ...draft, id: newId(), enabled: true, source: 'custom' };
          const error = validateMapping(p, m);
          if (error) return { ok: false, error };
          patchProfile(pid, (pp) => ({ ...pp, mappings: [...pp.mappings, m] }));
          return { ok: true };
        },

        updateMapping: (pid, next) => {
          const p = profile(pid);
          const prev = p?.mappings.find((m) => m.id === next.id);
          if (!p || !prev) return { ok: false, error: 'Mapping not found.' };
          const error = validateMapping(p, next);
          if (error) return { ok: false, error };
          patchMapping(pid, next.id, () => ({ ...next, source: tagSource(prev, next, TEMPLATE) }));
          return { ok: true };
        },

        removeMapping: (pid, mid) => patchProfile(pid, (p) => ({ ...p, mappings: p.mappings.filter((m) => m.id !== mid) })),
        toggleMapping: (pid, mid) => patchMapping(pid, mid, (m) => ({ ...m, enabled: !m.enabled })),
        revertMapping: (pid, mid) => patchMapping(pid, mid, (m) => reverted(TEMPLATE, m)),
        restoreProfiles: (profiles) => set({ profiles }),
        resetDemoData: () => set({ profiles: seedProfiles(), settings: { ...get().settings, activeProfileId: DEFAULT_SETTINGS.activeProfileId, controllerEnabled: true } }),
      };
    },
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ settings: s.settings, profiles: s.profiles }),
      merge: (saved, current) => {
        const s = saved as Partial<AppState> | undefined;
        return {
          ...current,
          // Keep defaults for keys added after the data was saved.
          settings: { ...current.settings, ...s?.settings },
          profiles: s?.profiles?.length ? s.profiles : current.profiles,
        };
      },
    },
  ),
);

export const useSettings = () => useAppStore((s) => s.settings);

/** All profiles, template first. */
export const useProfiles = (): Profile[] => {
  const custom = useAppStore((s) => s.profiles);
  return [TEMPLATE, ...custom];
};

export function getProfile(id: string): Profile | undefined {
  return id === TEMPLATE_ID ? TEMPLATE : useAppStore.getState().profiles.find((p) => p.id === id);
}

export const getActiveProfile = () => getProfile(useAppStore.getState().settings.activeProfileId);
