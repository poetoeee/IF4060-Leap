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

  // Zoom keys: Ctrl+= / Ctrl+- zoom in most apps and browsers.
  Equal: Key.Equal,
  Minus: Key.Minus,
  '=': Key.Equal,
  '-': Key.Minus,
  '+': Key.Equal,

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

const MODIFIER_KEYS: Key[] = [
  Key.LeftControl,
  Key.RightControl,
  Key.LeftAlt,
  Key.RightAlt,
  Key.LeftShift,
  Key.RightShift,
  Key.LeftSuper,
  Key.RightSuper,
];

const MAX_SCROLL_LINES = 20;
/** WHEEL_DELTA (120) is one notch, which Windows scrolls 3 lines by default. */
const WIN_WHEEL_DELTA_PER_LINE = 40;

/** libnut passes the amount through unscaled; on Windows that is raw wheel delta, not lines. */
function wheelSteps(lines: number): number {
  return process.platform === 'win32' ? lines * WIN_WHEEL_DELTA_PER_LINE : lines;
}

function isModifierKey(k: Key): boolean {
  return MODIFIER_KEYS.includes(k);
}

export async function releaseAllModifiers(): Promise<void> {
  try {
    await keyboard.releaseKey(...MODIFIER_KEYS);
  } catch {
    // Ignore errors during defensive modifier cleanup
  }
}

export async function executeNativeAction(action: NativeAction): Promise<void> {
  const pressedKeys: Key[] = [];
  try {
    switch (action.type) {
      case 'key': {
        if (!action.key) return;
        const k = resolveKey(action.key);
        if (k !== undefined) {
          pressedKeys.push(k);
          await keyboard.pressKey(k);
          await keyboard.releaseKey(k);
        }
        break;
      }

      case 'combo': {
        if (!action.keys || !action.keys.length) return;
        const resolved = action.keys.map(resolveKey).filter((k): k is Key => k !== undefined);
        // Ensure modifiers are pressed first and unique keys only
        const unique = [...new Set(resolved)];
        const ordered = [...unique.filter(isModifierKey), ...unique.filter((k) => !isModifierKey(k))];
        if (ordered.length) {
          pressedKeys.push(...ordered);
          try {
            for (const k of ordered) {
              await keyboard.pressKey(k);
            }
          } finally {
            for (const k of [...ordered].reverse()) {
              await keyboard.releaseKey(k);
            }
          }
        }
        break;
      }

      case 'click': {
        const btn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
        await mouse.click(btn);
        break;
      }

      case 'scroll': {
        const amount = wheelSteps(Math.max(1, Math.min(MAX_SCROLL_LINES, action.amount ?? 3)));
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
  } finally {
    // Always guarantee any pressed keys and modifier keys (Ctrl, Alt, Shift, Meta) are released
    if (pressedKeys.length > 0) {
      try {
        await keyboard.releaseKey(...[...pressedKeys].reverse());
      } catch {
        // ignore
      }
    }
    await releaseAllModifiers();
  }
}
