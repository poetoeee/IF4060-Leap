import type { GestureId, Hand } from './types';

interface GestureMeta {
  id: GestureId;
  name: string;
  /** Detected in the MVP (Tap/Circle need Leap). */
  available: boolean;
  howTo: string;
}

/** Fixed set, Figma order. */
export const GESTURES: GestureMeta[] = [
  { id: 'swipe_left', name: 'Swipe Left', available: true, howTo: 'Open hand, palm to the camera. Sweep it left quickly — about a hand’s length.' },
  { id: 'swipe_right', name: 'Swipe Right', available: true, howTo: 'Open hand, palm to the camera. Sweep it right quickly — about a hand’s length.' },
  { id: 'swipe_up', name: 'Swipe Up', available: true, howTo: 'Open hand, palm to the camera. Move it up quickly — about a hand’s length.' },
  { id: 'swipe_down', name: 'Swipe Down', available: true, howTo: 'Open hand, palm to the camera. Move it down quickly — about a hand’s length.' },
  { id: 'pinch', name: 'Pinch', available: true, howTo: 'Touch the tips of your thumb and index finger together, then let go.' },
  { id: 'fist', name: 'Fist', available: true, howTo: 'Close all fingers into a fist and hold it for a moment.' },
  { id: 'open_palm', name: 'Open Palm', available: true, howTo: 'Spread all five fingers, palm to the camera, and hold still.' },
  { id: 'tap', name: 'Tap', available: false, howTo: 'Needs the Leap Motion sensor.' },
  { id: 'circle', name: 'Circle', available: false, howTo: 'Needs the Leap Motion sensor.' },
];

export const GESTURE: Record<GestureId, GestureMeta> = Object.fromEntries(GESTURES.map((g) => [g.id, g])) as Record<GestureId, GestureMeta>;

export const HAND_LABEL: Record<Hand, string> = { right: 'right hand', left: 'left hand', any: 'any hand' };
