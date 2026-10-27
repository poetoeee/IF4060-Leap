import { isModifier } from '@/mapping/format';
import type { Action } from '@/mapping/types';
import type { ActionExecutor } from './types';

const LINE_PX = 40;

// Last pointer position, tracked once for the page; click/scroll target what's under it.
let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
window.addEventListener('pointermove', (e) => (pointer = { x: e.clientX, y: e.clientY }), { passive: true });

/**
 * Executes actions inside this page only: synthetic key events on `window`, click/scroll at the last pointer position.
 * Synthetic events don't trigger browser defaults (no real Alt+← navigation), so pages listen for them explicitly.
 */
export class WebActionExecutor implements ActionExecutor {
  execute(a: Action) {
    switch (a.type) {
      case 'key':
        return this.press([a.key]);
      case 'combo':
        return this.press(a.keys);
      case 'click':
        return this.click(a.button);
      case 'scroll':
        return this.scroll(a.direction === 'up' ? -1 : 1, a.amount);
    }
  }

  private press(keys: string[]) {
    const flags = {
      ctrlKey: keys.includes('Control'),
      altKey: keys.includes('Alt'),
      shiftKey: keys.includes('Shift'),
      metaKey: keys.includes('Meta'),
    };
    const send = (type: 'keydown' | 'keyup', key: string) =>
      window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...flags }));
    // Modifiers first, main key last — like a person pressing a shortcut.
    const ordered = [...keys.filter(isModifier), ...keys.filter((k) => !isModifier(k))];
    ordered.forEach((k) => send('keydown', k));
    [...ordered].reverse().forEach((k) => send('keyup', k));
  }

  private click(button: 'left' | 'right') {
    const el = document.elementFromPoint(pointer.x, pointer.y) ?? document.body;
    const init = { bubbles: true, cancelable: true, clientX: pointer.x, clientY: pointer.y, button: button === 'left' ? 0 : 2 };
    el.dispatchEvent(new MouseEvent(button === 'left' ? 'click' : 'contextmenu', init));
  }

  private scroll(sign: number, lines: number) {
    let el = document.elementFromPoint(pointer.x, pointer.y);
    while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) el = el.parentElement;
    (el ?? document.scrollingElement ?? document.documentElement).scrollBy({ top: sign * lines * LINE_PX, behavior: 'smooth' });
  }
}
