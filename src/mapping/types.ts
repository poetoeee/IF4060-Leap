import type { SourceId } from '@/tracking/types';

export type GestureId =
  | 'swipe_left'
  | 'swipe_right'
  | 'swipe_up'
  | 'swipe_down'
  | 'pinch'
  | 'fist'
  | 'open_palm'
  | 'tap'
  | 'circle';

export type Hand = 'left' | 'right' | 'any';

export type Action =
  | { type: 'key'; key: string }
  | { type: 'combo'; keys: string[] }
  | { type: 'click'; button: 'left' | 'right' }
  | { type: 'scroll'; direction: 'up' | 'down'; amount: number };

export interface Mapping {
  id: string;
  gesture: GestureId;
  hand: Hand;
  holdMs?: number;
  action: Action;
  label?: string;
  enabled: boolean;
  source: 'template' | 'edited' | 'custom';
}

export interface Profile {
  id: string;
  name: string;
  kind: 'template' | 'custom';
  description: string;
  mappings: Mapping[];
}

export type Sensitivity = 'relaxed' | 'balanced' | 'strict';

export interface Settings {
  controllerEnabled: boolean;
  activeProfileId: string;
  sensitivity: Sensitivity;
  trackingSource: SourceId;
  cameraPreview: boolean;
  userName: string;
}
