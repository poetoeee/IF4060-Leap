// Copies MediaPipe wasm into public/ and downloads the hand model, so the app runs offline.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/mediapipe';
const MODEL = `${OUT}/hand_landmarker.task`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

mkdirSync(OUT, { recursive: true });
cpSync('node_modules/@mediapipe/tasks-vision/wasm', `${OUT}/wasm`, { recursive: true });
console.log('[mediapipe] wasm copied');

if (existsSync(MODEL)) {
  console.log('[mediapipe] model present');
} else {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(MODEL, Buffer.from(await res.arrayBuffer()));
    console.log('[mediapipe] model downloaded');
  } catch (err) {
    console.warn(`[mediapipe] model download failed (${err.message}). Run "npm run setup:mediapipe" when online.`);
  }
}
