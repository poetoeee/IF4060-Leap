import type { Action } from './types';

const KEY_LABELS: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Escape: 'Esc',
  Control: 'Ctrl',
  Meta: 'Win',
  ' ': 'Space',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Backspace: '⌫',
};

const MODIFIER_ORDER = ['Control', 'Alt', 'Shift', 'Meta'];

export const isModifier = (key: string) => MODIFIER_ORDER.includes(key);

export function keyLabel(key: string): string {
  return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

/** KeyboardEvent.key → stored key: letters lower-case, everything else as-is. */
export const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

/** Modifiers first (Ctrl, Alt, Shift, Win), then the rest in press order. */
export function sortKeys(keys: string[]): string[] {
  const mods = MODIFIER_ORDER.filter((m) => keys.includes(m));
  return [...mods, ...keys.filter((k) => !isModifier(k))];
}

/** Key caps shown for an action, e.g. ['Alt', '←'] or ['Left Click']. */
export function actionCaps(a: Action): string[] {
  switch (a.type) {
    case 'key':
      return [keyLabel(a.key)];
    case 'combo':
      return a.keys.map(keyLabel);
    case 'click':
      return [a.button === 'left' ? 'Left Click' : 'Right Click'];
    case 'scroll':
      return [`Scroll ${a.direction === 'up' ? '↑' : '↓'}`];
  }
}

export function actionKind(a: Action): string {
  return { key: 'keyboard · key', combo: 'keyboard · combo', click: 'mouse · click', scroll: 'mouse · scroll' }[a.type];
}

/** Fallback description when a mapping has no label. */
export function actionSummary(a: Action): string {
  switch (a.type) {
    case 'key':
      return `Press ${keyLabel(a.key)}`;
    case 'combo':
      return `Press ${a.keys.map(keyLabel).join(' + ')}`;
    case 'click':
      return a.button === 'left' ? 'Click' : 'Right click';
    case 'scroll':
      return `Scroll ${a.direction} · ${a.amount} lines`;
  }
}

export const sameAction = (a: Action, b: Action) => JSON.stringify(a) === JSON.stringify(b);
