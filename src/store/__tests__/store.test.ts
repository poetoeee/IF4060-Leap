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

describe('profile management', () => {
  beforeEach(() => mem.clear());

  it('creates a profile from a ready-made template', async () => {
    const { useAppStore } = await load();
    const res = useAppStore.getState().createProfile({ name: 'Reading', source: { kind: 'template', templateId: 'scrolling' } });
    if (!res.ok) throw new Error(res.error);

    const created = useAppStore.getState().profiles.find((p) => p.id === res.profileId)!;
    expect(created.name).toBe('Reading');
    expect(created.templateId).toBe('scrolling');
    expect(created.mappings).toHaveLength(6);
    expect(created.mappings.every((m) => m.source === 'template')).toBe(true);
    // Copied rows get their own ids so they can be edited independently.
    expect(created.mappings.map((m) => m.id)).not.toContain('s-swipe-up');
    expect(useAppStore.getState().profiles.map((p) => p.id)).toEqual(['presentation', 'web-browsing', created.id]);
  });

  it('creates an empty profile and an active one', async () => {
    const { useAppStore } = await load();
    const res = useAppStore.getState().createProfile({ name: 'Blank', source: { kind: 'empty' }, activate: true });
    if (!res.ok) throw new Error(res.error);
    const created = useAppStore.getState().profiles.find((p) => p.id === res.profileId)!;
    expect(created.mappings).toEqual([]);
    expect(created.templateId).toBeUndefined();
    expect(useAppStore.getState().settings.activeProfileId).toBe(created.id);
  });

  it('duplicates an existing profile', async () => {
    const { useAppStore } = await load();
    const res = useAppStore.getState().createProfile({ name: 'Copy', source: { kind: 'duplicate', profileId: 'presentation' } });
    if (!res.ok) throw new Error(res.error);
    const copy = useAppStore.getState().profiles.find((p) => p.id === res.profileId)!;
    expect(copy.mappings.map((m) => m.gesture)).toEqual(['swipe_right', 'swipe_left', 'open_palm', 'pinch', 'fist']);
    expect(copy.templateId).toBe('template');
  });

  it('rejects empty and duplicate profile names', async () => {
    const { useAppStore } = await load();
    const s = useAppStore.getState();
    expect(s.createProfile({ name: '   ', source: { kind: 'empty' } }).ok).toBe(false);
    expect(s.createProfile({ name: 'Presentation Mode', source: { kind: 'empty' } }).ok).toBe(false);
    // Case-insensitive, so it can't sneak past the check.
    expect(s.createProfile({ name: 'presentation mode', source: { kind: 'empty' } }).ok).toBe(false);
    expect(useAppStore.getState().profiles).toHaveLength(2);
  });

  it('renames a profile without touching its mappings', async () => {
    const { useAppStore } = await load();
    const before = useAppStore.getState().profiles[0]!;
    expect(useAppStore.getState().renameProfile(before.id, 'Talk').ok).toBe(true);

    const after = useAppStore.getState().profiles[0]!;
    expect(after.name).toBe('Talk');
    expect(after.mappings).toHaveLength(before.mappings.length);
    // A name that is already taken is refused.
    expect(useAppStore.getState().renameProfile(before.id, 'Web Browsing').ok).toBe(false);
  });

  it('asks for a replacement when the live profile is deleted', async () => {
    const { useAppStore } = await load();
    const s = useAppStore.getState();
    expect(s.settings.activeProfileId).toBe('presentation');

    expect(s.deleteProfile('presentation').ok).toBe(false);
    expect(useAppStore.getState().profiles).toHaveLength(2);

    expect(s.deleteProfile('presentation', 'web-browsing').ok).toBe(true);
    expect(useAppStore.getState().profiles.map((p) => p.id)).toEqual(['web-browsing']);
    expect(useAppStore.getState().settings.activeProfileId).toBe('web-browsing');
  });

  it('deletes an inactive profile without touching the live one', async () => {
    const { useAppStore } = await load();
    expect(useAppStore.getState().deleteProfile('web-browsing').ok).toBe(true);
    expect(useAppStore.getState().profiles.map((p) => p.id)).toEqual(['presentation']);
    expect(useAppStore.getState().settings.activeProfileId).toBe('presentation');
  });

  it('reverts to the template the profile was created from', async () => {
    const { useAppStore } = await load();
    const res = useAppStore.getState().createProfile({ name: 'Browse', source: { kind: 'template', templateId: 'browsing' } });
    if (!res.ok) throw new Error(res.error);

    const row = useAppStore.getState().profiles.find((p) => p.id === res.profileId)!.mappings.find((m) => m.gesture === 'swipe_left')!;
    expect(row.action).toEqual({ type: 'combo', keys: ['Alt', 'ArrowLeft'] });

    useAppStore.getState().updateMapping(res.profileId, { ...row, action: { type: 'key', key: 'x' } });
    const edited = useAppStore.getState().profiles.find((p) => p.id === res.profileId)!.mappings.find((m) => m.id === row.id)!;
    expect(edited.source).toBe('edited');

    useAppStore.getState().revertMapping(res.profileId, row.id);
    const back = useAppStore.getState().profiles.find((p) => p.id === res.profileId)!.mappings.find((m) => m.id === row.id)!;
    // Back to the browsing template, not to the generic Mapping Template.
    expect(back.action).toEqual({ type: 'combo', keys: ['Alt', 'ArrowLeft'] });
    expect(back.source).toBe('template');
  });
});

describe('height gesture mappings', () => {
  beforeEach(() => mem.clear());

  it('saves a height mapping and keeps it after a reload', async () => {
    const { useAppStore } = await load();
    const res = useAppStore.getState().addMapping('presentation', {
      gesture: 'height_up',
      hand: 'right',
      action: { type: 'key', key: 'e' },
      label: 'Raise',
    });
    expect(res.ok).toBe(true);

    const again = (await load()).useAppStore.getState().profiles.find((p) => p.id === 'presentation')!;
    expect(again.mappings.find((m) => m.gesture === 'height_up')?.action).toEqual({ type: 'key', key: 'e' });
  });

  it('keeps the two directions apart', async () => {
    const { useAppStore } = await load();
    useAppStore.getState().addMapping('presentation', { gesture: 'height_up', hand: 'right', action: { type: 'key', key: 'e' } });
    useAppStore.getState().addMapping('presentation', { gesture: 'height_down', hand: 'right', action: { type: 'key', key: 'q' } });

    const p = useAppStore.getState().profiles.find((x) => x.id === 'presentation')!;
    expect(p.mappings.find((m) => m.gesture === 'height_up')?.action).toEqual({ type: 'key', key: 'e' });
    expect(p.mappings.find((m) => m.gesture === 'height_down')?.action).toEqual({ type: 'key', key: 'q' });
  });

  it('refuses a second height mapping for the same hand', async () => {
    const { useAppStore } = await load();
    useAppStore.getState().addMapping('presentation', { gesture: 'height_up', hand: 'right', action: { type: 'key', key: 'e' } });
    const res = useAppStore.getState().addMapping('presentation', { gesture: 'height_up', hand: 'right', action: { type: 'key', key: 'q' } });
    expect(res.ok).toBe(false);
  });
});
