import { keyboard, mouse, Key, Button } from '@nut-tree-fork/nut-js';

// Configure nut-js for snappy responsive input
keyboard.config.autoDelayMs = 0;
mouse.config.autoDelayMs = 0;

export interface NativeAction {
  type: 'key' | 'combo' | 'click' | 'scroll';
  key?: string;
  keys?: string[];
  button?: 'left' | 'right';
  direction?: 'up' | 'down';
  amount?: number;
}

const KEY_MAP: Record<string, Key> = {
  // Navigation / Arrows
  ArrowLeft: Key.Left,
  ArrowRight: Key.Right,
  ArrowUp: Key.Up,
  ArrowDown: Key.Down,
  PageUp: Key.PageUp,
  PageDown: Key.PageDown,
  Home: Key.Home,
  End: Key.End,

  // Common Function keys
  Escape: Key.Escape,
  Enter: Key.Enter,
  Space: Key.Space,
  Tab: Key.Tab,
  Backspace: Key.Backspace,
  F5: Key.F5,
  F11: Key.F11,

  // Modifiers
  Control: Key.LeftControl,
  Alt: Key.LeftAlt,
  Shift: Key.LeftShift,
  Meta: Key.LeftSuper,
  Ctrl: Key.LeftControl,
};

function resolveKey(name: string): Key | undefined {
  if (KEY_MAP[name] !== undefined) return KEY_MAP[name];

  const keyDict = Key as unknown as Record<string, Key>;

  // Try uppercase single char (e.g. 'a' -> Key.A)
  if (name.length === 1) {
    const upper = name.toUpperCase();
    if (keyDict[upper] !== undefined) {
      return keyDict[upper];
    }
  }

  // Try direct lookup on Key enum (e.g. 'F1'..'F12')
  if (keyDict[name] !== undefined) {
    return keyDict[name];
  }

  return undefined;
}

export async function executeNativeAction(action: NativeAction): Promise<void> {
  try {
    switch (action.type) {
      case 'key': {
        if (!action.key) return;
        const k = resolveKey(action.key);
        if (k !== undefined) {
          await keyboard.type(k);
        }
        break;
      }

      case 'combo': {
        if (!action.keys || !action.keys.length) return;
        const resolved = action.keys.map(resolveKey).filter((k): k is Key => k !== undefined);
        if (resolved.length) {
          await keyboard.pressKey(...resolved);
          await keyboard.releaseKey(...resolved.reverse());
        }
        break;
      }

      case 'click': {
        const btn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
        await mouse.click(btn);
        break;
      }

      case 'scroll': {
        const amount = Math.max(1, Math.min(20, action.amount ?? 3));
        if (action.direction === 'up') {
          await mouse.scrollUp(amount);
        } else {
          await mouse.scrollDown(amount);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[native-input] failed to execute action:', action, err);
  }
}
