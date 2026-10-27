import type { SourceId } from './types';

interface SourceMeta {
  name: string;
  short: string;
  stageLabel: string;
  desc: string;
  retry: string;
}

export const SOURCE_META: Record<SourceId, SourceMeta> = {
  camera: { name: 'Camera', short: 'Camera', stageLabel: 'laptop camera', desc: 'Laptop webcam · MediaPipe', retry: 'Allow camera' },
  leap: { name: 'Leap Motion', short: 'Leap', stageLabel: 'leap motion', desc: 'Leap Motion Controller · local bridge', retry: 'Reconnect sensor' },
  mock: { name: 'Mock', short: 'Mock', stageLabel: 'mock hand', desc: 'Keys 1–7 · Shift = left hand', retry: 'Restart' },
};

export const SOURCE_OPTIONS = (Object.keys(SOURCE_META) as SourceId[]).map((value) => ({ value, label: SOURCE_META[value].short }));
