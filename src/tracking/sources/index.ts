import type { SourceId, TrackingSource } from '../types';
import { CameraSource } from './camera';
import { LeapSource } from './leap';
import { MockSource } from './mock';

export function createSource(id: SourceId): TrackingSource {
  switch (id) {
    case 'camera':
      return new CameraSource();
    case 'leap':
      return new LeapSource();
    case 'mock':
      return new MockSource();
  }
}
