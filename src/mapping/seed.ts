import type { GestureId, Hand, Mapping, Profile } from './types';

export const TEMPLATE_ID = 'template';

const m = (id: string, gesture: GestureId, hand: Hand, action: Mapping['action'], rest: Partial<Mapping> = {}): Mapping => ({
  id,
  gesture,
  hand,
  action,
  enabled: true,
  source: 'template',
  ...rest,
});

export const TEMPLATE: Profile = {
  id: TEMPLATE_ID,
  name: 'Mapping Template',
  kind: 'template',
  description: 'Default action for all 9 gestures. Every profile starts here — and can be reset to it.',
  mappings: [
    m('t-swipe-left', 'swipe_left', 'right', { type: 'key', key: 'ArrowLeft' }, { label: 'Previous' }),
    m('t-swipe-right', 'swipe_right', 'right', { type: 'key', key: 'ArrowRight' }, { label: 'Next' }),
    m('t-swipe-up', 'swipe_up', 'right', { type: 'scroll', direction: 'up', amount: 3 }, { label: 'Scroll up' }),
    m('t-swipe-down', 'swipe_down', 'right', { type: 'scroll', direction: 'down', amount: 3 }, { label: 'Scroll down' }),
    m('t-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click / select' }),
    m('t-fist', 'fist', 'left', { type: 'key', key: 'Escape' }, { label: 'Cancel' }),
  ],
};

/** Template rows that need Leap (not executable in the MVP); shown locked. */
export const TEMPLATE_PREVIEW: { gesture: GestureId; hand: Hand; caps: string[]; label: string; kind: string }[] = [
  { gesture: 'open_palm', hand: 'any', caps: ['Move cursor'], label: 'Cursor follows hand', kind: 'mouse · move' },
  { gesture: 'tap', hand: 'right', caps: ['Right Click'], label: 'Context menu', kind: 'mouse · click' },
  { gesture: 'circle', hand: 'right', caps: ['Alt', 'Tab'], label: 'Switch app', kind: 'keyboard · combo' },
];

export function seedProfiles(): Profile[] {
  return [
    {
      id: 'presentation',
      name: 'Presentation Mode',
      kind: 'custom',
      description: 'Control slides hands-free — swipe through, start and end the show.',
      mappings: [
        m('p-swipe-right', 'swipe_right', 'right', { type: 'key', key: 'ArrowRight' }, { label: 'Next slide' }),
        m('p-swipe-left', 'swipe_left', 'right', { type: 'key', key: 'ArrowLeft' }, { label: 'Previous slide' }),
        // holdMs 800 so raising a hand before a swipe doesn't start the show.
        m('p-open-palm', 'open_palm', 'right', { type: 'key', key: 'F5' }, { label: 'Start slideshow', source: 'edited', holdMs: 800 }),
        m('p-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click', enabled: false }),
        m('p-fist', 'fist', 'left', { type: 'key', key: 'Escape' }, { label: 'End slideshow' }),
      ],
    },
    {
      id: 'web-browsing',
      name: 'Web Browsing',
      kind: 'custom',
      description: 'Go back, forward and scroll in any browser with simple swipes.',
      mappings: [
        m('w-swipe-left', 'swipe_left', 'right', { type: 'combo', keys: ['Alt', 'ArrowLeft'] }, { label: 'Back', source: 'edited' }),
        m('w-swipe-right', 'swipe_right', 'right', { type: 'combo', keys: ['Alt', 'ArrowRight'] }, { label: 'Forward', source: 'edited' }),
        m('w-swipe-up', 'swipe_up', 'right', { type: 'scroll', direction: 'up', amount: 3 }, { label: 'Scroll up' }),
        m('w-swipe-down', 'swipe_down', 'right', { type: 'scroll', direction: 'down', amount: 3 }, { label: 'Scroll down' }),
        m('w-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click / select' }),
        m('w-fist', 'fist', 'left', { type: 'combo', keys: ['Control', 'w'] }, { label: 'Close tab', source: 'custom' }),
      ],
    },
  ];
}
