import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { VIEW_WIDTH_MM, type HandState } from '../types';
import { BaseSource } from './base';

/**
 * MediaPipe labels handedness assuming a mirrored (selfie) image. Raw webcam frames are not
 * mirrored, so its "Left" is the user's right hand. Flip this if a real hand shows the wrong side.
 */
export const CAMERA_SWAP_HANDEDNESS = false;

const BASE = `${import.meta.env.BASE_URL}mediapipe`;
let landmarker: Promise<HandLandmarker> | null = null;

async function createLandmarker(): Promise<HandLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
  const opts = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: `${BASE}/hand_landmarker.task`, delegate },
    runningMode: 'VIDEO' as const,
    numHands: 2,
  });
  try {
    return await HandLandmarker.createFromOptions(fileset, opts('GPU'));
  } catch (err) {
    console.warn('[camera] GPU delegate failed, falling back to CPU', err);
    return HandLandmarker.createFromOptions(fileset, opts('CPU'));
  }
}

export function toHands(res: HandLandmarkerResult, aspect: number): HandState[] {
  const s = VIEW_WIDTH_MM;
  return res.landmarks.map((lms, i) => {
    const cat = res.handedness[i]?.[0];
    const isRight = (cat?.categoryName === 'Left') !== CAMERA_SWAP_HANDEDNESS;
    return {
      side: isRight ? 'right' : 'left',
      confidence: cat?.score ?? 0,
      landmarks: lms.map((p) => ({ x: (0.5 - p.x) * s, y: (0.5 - p.y) * s * aspect, z: p.z * s })),
    };
  });
}

export class CameraSource extends BaseSource {
  readonly id = 'camera' as const;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private gen = 0;

  getPreview() {
    return this.video;
  }

  async start() {
    const gen = ++this.gen;
    this.emitStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      if (gen !== this.gen) return stream.getTracks().forEach((t) => t.stop());
      this.stream = stream;

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      landmarker ??= createLandmarker();
      const lm = await landmarker;
      if (gen !== this.gen) return;

      this.video = video;
      this.emitStatus('running');
      this.loop(lm, video, gen);
    } catch (err) {
      if (gen !== this.gen) return;
      this.release();
      const name = (err as Error).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        this.emitStatus('no-device', 'Camera access was blocked. Allow it in the browser, then retry.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        this.emitStatus('no-device', 'No camera found. Connect a webcam, then retry.');
      } else if (name === 'NotReadableError') {
        this.emitStatus('no-device', 'Camera is in use by another app. Close it, then retry.');
      } else {
        landmarker = null;
        this.emitStatus('error', `Hand model failed to load: ${(err as Error).message}`);
      }
    }
  }

  private loop(lm: HandLandmarker, video: HTMLVideoElement, gen: number) {
    let lastTime = -1;
    const tick = () => {
      if (gen !== this.gen) return;
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        const now = performance.now();
        const res = lm.detectForVideo(video, now);
        const aspect = video.videoHeight / video.videoWidth || 0.75;
        this.emitFrame({ source: 'camera', timestamp: now, hands: toHands(res, aspect) });
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.gen++;
    this.release();
    this.emitStatus('idle');
  }

  private release() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.video = null;
  }
}
