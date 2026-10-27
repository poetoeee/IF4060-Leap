import type { SourceId, SourceStatus, TrackingFrame, TrackingSource } from '../types';

export abstract class BaseSource implements TrackingSource {
  abstract readonly id: SourceId;
  private frameCbs = new Set<(f: TrackingFrame) => void>();
  private statusCbs = new Set<(s: SourceStatus, detail?: string) => void>();

  abstract start(): Promise<void>;
  abstract stop(): void;

  onFrame(cb: (f: TrackingFrame) => void) {
    this.frameCbs.add(cb);
    return () => void this.frameCbs.delete(cb);
  }

  onStatus(cb: (s: SourceStatus, detail?: string) => void) {
    this.statusCbs.add(cb);
    return () => void this.statusCbs.delete(cb);
  }

  protected emitFrame(f: TrackingFrame) {
    this.frameCbs.forEach((cb) => cb(f));
  }

  protected emitStatus(s: SourceStatus, detail?: string) {
    this.statusCbs.forEach((cb) => cb(s, detail));
  }
}
