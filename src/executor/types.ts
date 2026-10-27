import type { Action } from '@/mapping/types';

export interface ActionExecutor {
  execute(action: Action): void;
}

// TODO(after MVP): NativeActionExecutor — send actions to the bridge over the Leap WebSocket for OS-wide injection (pynput).
