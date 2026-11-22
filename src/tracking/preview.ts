import { DEFAULT_VIEW_ASPECT, type SourcePreview } from './types';

/** Height/width of the view the landmarks live in: the camera frame when there is one. */
export function previewAspect(preview: SourcePreview | null): number {
  const el = preview?.el;
  return el instanceof HTMLVideoElement && el.videoHeight ? el.videoHeight / el.videoWidth : DEFAULT_VIEW_ASPECT;
}

/**
 * Browsers pause a <video> once it leaves the document, which would freeze tracking.
 * A preview that isn't on screen is therefore parked, invisible, in <body> instead of removed.
 */
export function parkPreview(video: HTMLVideoElement) {
  video.className = 'pointer-events-none fixed left-0 top-0 size-px opacity-0';
  document.body.appendChild(video);
}
