export type Vec3 = { x: number; y: number; z: number };

export interface HandState {
  /** User's real hand. */
  side: 'left' | 'right';
  confidence: number;
  /** 21 points, MediaPipe order. Pseudo-mm, user's view: +x right, +y up, +z toward the user. */
  landmarks: Vec3[];
  native?: { grab?: number; pinch?: number };
}

export type SourceId = 'camera' | 'leap' | 'mock';

export interface TrackingFrame {
  source: SourceId;
  timestamp: number;
  hands: HandState[];
}

export type SourceStatus = 'idle' | 'starting' | 'running' | 'no-device' | 'error';

export interface TrackingSource {
  readonly id: SourceId;
  start(): Promise<void>;
  stop(): void;
  onFrame(cb: (f: TrackingFrame) => void): () => void;
  onStatus(cb: (s: SourceStatus, detail?: string) => void): () => void;
  getPreview?(): HTMLVideoElement | null;
}

/** Landmark indices (MediaPipe order). */
export const LM = {
  WRIST: 0,
  THUMB: [1, 2, 3, 4],
  INDEX: [5, 6, 7, 8],
  MIDDLE: [9, 10, 11, 12],
  RING: [13, 14, 15, 16],
  PINKY: [17, 18, 19, 20],
} as const;

/** Virtual frame every source maps into: width in mm; height follows the frame aspect. */
export const VIEW_WIDTH_MM = 400;
export const DEFAULT_VIEW_ASPECT = 3 / 4;
