import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
});

const load = async () => {
  vi.resetModules();
  return import('../index');
};

describe('app store', () => {
  beforeEach(() => mem.clear());

  it('persists settings under gesturmap:v1', async () => {
    const { useAppStore, STORAGE_KEY } = await load();
    useAppStore.getState().setSetting('trackingSource', 'mock');
    expect(JSON.parse(mem.get(STORAGE_KEY)!).state.settings.trackingSource).toBe('mock');

    const again = await load();
    expect(again.useAppStore.getState().settings.trackingSource).toBe('mock');
  });

  it('fills defaults for keys missing from saved data', async () => {
    mem.set('gesturmap:v1', JSON.stringify({ state: { settings: { sensitivity: 'strict' } }, version: 1 }));
    const { useAppStore } = await load();
    expect(useAppStore.getState().settings).toMatchObject({ sensitivity: 'strict', userName: 'Edo', trackingSource: 'camera' });
  });
});
