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

export type Sensitivity = 'relaxed' | 'balanced' | 'strict';

export interface Settings {
  controllerEnabled: boolean;
  activeProfileId: string;
  sensitivity: Sensitivity;
  trackingSource: SourceId;
  cameraPreview: boolean;
  userName: string;
}
