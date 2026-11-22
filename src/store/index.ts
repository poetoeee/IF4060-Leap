import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { referenceTemplate, reverted, tagSource, validateMapping } from '@/mapping/rules';
import { seedProfiles, TEMPLATE, TEMPLATE_ID } from '@/mapping/seed';
import { getTemplate } from '@/mapping/templates';
import type { Mapping, Profile, Settings } from '@/mapping/types';

export const STORAGE_KEY = 'gesturmap:v1';

export const DEFAULT_SETTINGS: Settings = {
  controllerEnabled: true,
  activeProfileId: 'presentation',
  sensitivity: 'balanced',
  trackingSource: 'camera',
  cameraPreview: true,
  irPreview: false,
  hudDetail: 'simple',
  onboardingDone: false,
  userName: 'Edo',
  leapSdkPath: '',
};

type Result = { ok: true } | { ok: false; error: string };

/** Where a new profile gets its mappings from. */
export type ProfileSource =
  | { kind: 'template'; templateId: string }
  | { kind: 'duplicate'; profileId: string }
  | { kind: 'empty' };

export interface CreateProfileInput {
  name: string;
  source: ProfileSource;
  /** Make the new profile the live one right away. */
  activate?: boolean;
}

type CreateResult = { ok: true; profileId: string } | { ok: false; error: string };

export const MAX_PROFILE_NAME = 40;

interface AppState {
  settings: Settings;
  /** Custom profiles only; the read-only template lives in code. */
  profiles: Profile[];
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  createProfile: (input: CreateProfileInput) => CreateResult;
  renameProfile: (profileId: string, name: string) => Result;
  deleteProfile: (profileId: string, replacementId?: string) => Result;
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

/** Empty or duplicate names are rejected. */
export function validateProfileName(name: string, profiles: Profile[], exceptId?: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Give the profile a name.';
  if (trimmed.length > MAX_PROFILE_NAME) return `Keep the name under ${MAX_PROFILE_NAME} characters.`;
  const taken = profiles.some((p) => p.id !== exceptId && p.name.trim().toLowerCase() === trimmed.toLowerCase());
  if (taken || trimmed.toLowerCase() === TEMPLATE.name.toLowerCase()) return 'Another profile already uses that name.';
  return null;
}

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

        createProfile: (input) => {
          const state = get();
          const nameError = validateProfileName(input.name, state.profiles);
          if (nameError) return { ok: false, error: nameError };

          const source = input.source;
          let mappings: Mapping[] = [];
          let templateId: string | undefined;
          let description = 'Your own profile — add mappings as you go.';

          if (source.kind === 'template') {
            const tpl = getTemplate(source.templateId);
            if (!tpl) return { ok: false, error: 'That template is not available.' };
            mappings = tpl.mappings.map((mm) => ({ ...mm, id: newId(), source: 'template' as const }));
            templateId = tpl.id;
            description = tpl.description;
          } else if (source.kind === 'duplicate') {
            const src = state.profiles.find((p) => p.id === source.profileId);
            if (!src) return { ok: false, error: 'That profile no longer exists.' };
            mappings = src.mappings.map((mm) => ({ ...mm, id: newId() }));
            templateId = src.templateId;
            description = `Copy of ${src.name}.`;
          }

          const created: Profile = {
            id: newId(),
            name: input.name.trim(),
            kind: 'custom',
            description,
            mappings,
            ...(templateId ? { templateId } : {}),
          };
          set((s) => ({
            profiles: [...s.profiles, created],
            ...(input.activate ? { settings: { ...s.settings, activeProfileId: created.id } } : {}),
          }));
          return { ok: true, profileId: created.id };
        },

        renameProfile: (profileId, name) => {
          const state = get();
          if (!state.profiles.some((p) => p.id === profileId)) return { ok: false, error: 'Profile not found.' };
          const error = validateProfileName(name, state.profiles, profileId);
          if (error) return { ok: false, error };
          patchProfile(profileId, (p) => ({ ...p, name: name.trim() }));
          return { ok: true };
        },

        deleteProfile: (profileId, replacementId) => {
          const state = get();
          if (!state.profiles.some((p) => p.id === profileId)) return { ok: false, error: 'Profile not found.' };
          const isActive = state.settings.activeProfileId === profileId;
          if (isActive) {
            // The live profile can't just disappear — the user picks what takes over.
            const replacement = state.profiles.find((p) => p.id === replacementId && p.id !== profileId);
            if (!replacement) return { ok: false, error: 'Choose the profile that should take over.' };
            set((s) => ({
              profiles: s.profiles.filter((p) => p.id !== profileId),
              settings: { ...s.settings, activeProfileId: replacement.id },
            }));
            return { ok: true };
          }
          set((s) => ({ profiles: s.profiles.filter((p) => p.id !== profileId) }));
          return { ok: true };
        },

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
          patchMapping(pid, next.id, () => ({ ...next, source: tagSource(prev, next, referenceTemplate(p)) }));
          return { ok: true };
        },

        removeMapping: (pid, mid) => patchProfile(pid, (p) => ({ ...p, mappings: p.mappings.filter((m) => m.id !== mid) })),
        toggleMapping: (pid, mid) => patchMapping(pid, mid, (m) => ({ ...m, enabled: !m.enabled })),
        revertMapping: (pid, mid) => {
          const p = profile(pid);
          if (!p) return;
          patchMapping(pid, mid, (m) => reverted(referenceTemplate(p), m));
        },
        restoreProfiles: (profiles) => set({ profiles }),
        resetDemoData: () =>
          set({ profiles: seedProfiles(), settings: { ...get().settings, activeProfileId: DEFAULT_SETTINGS.activeProfileId, controllerEnabled: true } }),
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
