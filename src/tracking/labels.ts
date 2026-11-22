import type { Settings } from '@/mapping/types';
import type { SourceId } from './types';

type PreviewSetting = Extract<keyof Settings, 'cameraPreview' | 'irPreview'>;

interface SourceMeta {
  name: string;
  short: string;
  stageLabel: string;
  desc: string;
  retry: string;
  /** Setting behind the stage's Camera preview toggle; sources without one have no preview. */
  previewSetting?: PreviewSetting;
}

export const SOURCE_META: Record<SourceId, SourceMeta> = {
  camera: { name: 'Camera', short: 'Camera', stageLabel: 'laptop camera', desc: 'Laptop webcam · MediaPipe', retry: 'Allow camera', previewSetting: 'cameraPreview' },
  leap: { name: 'Leap Motion', short: 'Leap', stageLabel: 'leap motion', desc: 'Leap Motion Controller · local bridge', retry: 'Reconnect sensor', previewSetting: 'irPreview' },
  mock: { name: 'Mock', short: 'Mock', stageLabel: 'mock hand', desc: 'Keys 1–7 · Shift = left hand', retry: 'Restart' },
};

export const SOURCE_OPTIONS = (Object.keys(SOURCE_META) as SourceId[]).map((value) => ({ value, label: SOURCE_META[value].short }));
