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

  it('seeds Presentation Mode and Web Browsing on first run', async () => {
    const { useAppStore } = await load();
    expect(useAppStore.getState().profiles.map((p) => p.id)).toEqual(['presentation', 'web-browsing']);
  });

  it('add, edit, toggle and delete survive a reload', async () => {
    const { useAppStore } = await load();
    const s = useAppStore.getState();
    expect(s.addMapping('presentation', { gesture: 'swipe_down', hand: 'right', action: { type: 'key', key: 'b' }, label: 'Black screen' })).toEqual({ ok: true });
    expect(s.addMapping('presentation', { gesture: 'swipe_down', hand: 'any', action: { type: 'key', key: 'x' } }).ok).toBe(false);

    const fist = useAppStore.getState().profiles[0]!.mappings.find((m) => m.gesture === 'fist')!;
    s.updateMapping('presentation', { ...fist, action: { type: 'key', key: 'q' } });
    s.toggleMapping('presentation', fist.id);
    const pinch = useAppStore.getState().profiles[0]!.mappings.find((m) => m.gesture === 'pinch')!;
    s.removeMapping('presentation', pinch.id);

    const again = (await load()).useAppStore.getState().profiles[0]!;
    expect(again.mappings.find((m) => m.gesture === 'swipe_down')).toMatchObject({ source: 'custom', label: 'Black screen' });
    expect(again.mappings.find((m) => m.gesture === 'fist')).toMatchObject({ source: 'edited', enabled: false, action: { key: 'q' } });
    expect(again.mappings.some((m) => m.gesture === 'pinch')).toBe(false);
  });

  it('resetDemoData restores the seed', async () => {
    const { useAppStore } = await load();
    useAppStore.getState().removeMapping('presentation', 'p-fist');
    useAppStore.getState().resetDemoData();
    expect(useAppStore.getState().profiles[0]!.mappings.some((m) => m.id === 'p-fist')).toBe(true);
  });

  it('fills defaults for keys missing from saved data', async () => {
    mem.set('gesturmap:v1', JSON.stringify({ state: { settings: { sensitivity: 'strict' } }, version: 1 }));
    const { useAppStore } = await load();
    expect(useAppStore.getState().settings).toMatchObject({ sensitivity: 'strict', userName: 'Edo', trackingSource: 'camera' });
  });
});
