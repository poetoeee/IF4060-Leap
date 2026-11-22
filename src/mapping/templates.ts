import { m, TEMPLATE, TEMPLATE_ID } from './seed';
import type { Mapping } from './types';

/** Icons are a subset of the app icon set so the gallery can render them directly. */
export type TemplateIcon = 'template' | 'move' | 'globe' | 'presentation' | 'gamepad';

export interface MappingTemplate {
  id: string;
  name: string;
  /** One line shown on the template card. */
  tagline: string;
  /** Description carried over to the profile created from this template. */
  description: string;
  icon: TemplateIcon;
  /** Read-only mappings; copied into a profile when the template is chosen. */
  mappings: Mapping[];
  /** Marked as the recommended starting point in the picker. */
  recommended?: boolean;
}

/** Ready-made templates for common activities. */
export const TEMPLATES: MappingTemplate[] = [
  {
    id: TEMPLATE_ID,
    name: TEMPLATE.name,
    tagline: 'The default action for every gesture.',
    description: TEMPLATE.description,
    icon: 'template',
    mappings: TEMPLATE.mappings,
    recommended: true,
  },
  {
    id: 'scrolling',
    name: 'Scrolling & Reading',
    tagline: 'Long pages, documents and articles.',
    description: 'Scroll fast in any direction and jump between pages without touching the wheel.',
    icon: 'move',
    mappings: [
      m('s-swipe-up', 'swipe_up', 'right', { type: 'scroll', direction: 'up', amount: 5, repeat: true }, { label: 'Scroll up' }),
      m('s-swipe-down', 'swipe_down', 'right', { type: 'scroll', direction: 'down', amount: 5, repeat: true }, { label: 'Scroll down' }),
      m('s-swipe-left', 'swipe_left', 'right', { type: 'key', key: 'PageUp' }, { label: 'Previous page' }),
      m('s-swipe-right', 'swipe_right', 'right', { type: 'key', key: 'PageDown' }, { label: 'Next page' }),
      m('s-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click / select' }),
      m('s-fist', 'fist', 'left', { type: 'key', key: 'Escape' }, { label: 'Cancel' }),
    ],
  },
  {
    id: 'browsing',
    name: 'Web Browsing',
    tagline: 'Navigate and scroll in any browser.',
    description: 'Go back, go forward, scroll and close tabs with plain swipes.',
    icon: 'globe',
    mappings: [
      m('b-swipe-left', 'swipe_left', 'right', { type: 'combo', keys: ['Alt', 'ArrowLeft'] }, { label: 'Back' }),
      m('b-swipe-right', 'swipe_right', 'right', { type: 'combo', keys: ['Alt', 'ArrowRight'] }, { label: 'Forward' }),
      m('b-swipe-up', 'swipe_up', 'right', { type: 'scroll', direction: 'up', amount: 3 }, { label: 'Scroll up' }),
      m('b-swipe-down', 'swipe_down', 'right', { type: 'scroll', direction: 'down', amount: 3 }, { label: 'Scroll down' }),
      m('b-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click / select' }),
      m('b-fist', 'fist', 'left', { type: 'combo', keys: ['Control', 'w'] }, { label: 'Close tab' }),
    ],
  },
  {
    id: 'presentation',
    name: 'Presentation Mode',
    tagline: 'Drive slides hands-free.',
    description: 'Control slides hands-free — swipe through, start and end the show.',
    icon: 'presentation',
    mappings: [
      m('pr-swipe-right', 'swipe_right', 'right', { type: 'key', key: 'ArrowRight' }, { label: 'Next slide' }),
      m('pr-swipe-left', 'swipe_left', 'right', { type: 'key', key: 'ArrowLeft' }, { label: 'Previous slide' }),
      // holdMs 1000 so raising a hand before/after a swipe doesn't start the show.
      m('pr-open-palm', 'open_palm', 'right', { type: 'key', key: 'F5' }, { label: 'Start slideshow', holdMs: 1000 }),
      m('pr-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click' }),
      m('pr-fist', 'fist', 'left', { type: 'key', key: 'Escape' }, { label: 'End slideshow' }),
    ],
  },
  {
    id: 'media',
    name: 'Media Player',
    tagline: 'Playback and volume while you watch.',
    description: 'Play, pause and change the volume of videos and music without leaving the keyboard.',
    icon: 'gamepad',
    mappings: [
      m('md-swipe-right', 'swipe_right', 'right', { type: 'key', key: ' ' }, { label: 'Play / pause' }),
      m('md-swipe-left', 'swipe_left', 'right', { type: 'key', key: 'ArrowLeft' }, { label: 'Previous track' }),
      m('md-swipe-up', 'swipe_up', 'right', { type: 'key', key: 'ArrowUp' }, { label: 'Volume up' }),
      m('md-swipe-down', 'swipe_down', 'right', { type: 'key', key: 'ArrowDown' }, { label: 'Volume down' }),
      m('md-pinch', 'pinch', 'right', { type: 'click', button: 'left' }, { label: 'Click / select' }),
      m('md-fist', 'fist', 'left', { type: 'key', key: 'Escape' }, { label: 'Cancel' }),
    ],
  },
];

export const getTemplate = (id: string | undefined): MappingTemplate | undefined => TEMPLATES.find((t) => t.id === id);

/** The template a new profile starts from when the user doesn't pick one. */
export const DEFAULT_TEMPLATE_ID = TEMPLATES[0]!.id;
