/**
 * Browsers pause a <video> once it leaves the document, which would freeze tracking.
 * A preview that isn't on screen is therefore parked, invisible, in <body> instead of removed.
 */
export function parkPreview(video: HTMLVideoElement) {
  video.className = 'pointer-events-none fixed left-0 top-0 size-px opacity-0';
  document.body.appendChild(video);
}
