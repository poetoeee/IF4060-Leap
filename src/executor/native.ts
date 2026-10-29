import type { Action } from '@/mapping/types';
import type { ActionExecutor } from './types';
import { WebActionExecutor } from './web';

export class NativeActionExecutor implements ActionExecutor {
  private fallback = new WebActionExecutor();

  execute(action: Action) {
    if (window.electronAPI?.isElectron) {
      // Send directly to Electron main process -> triggers real Windows SendInput
      window.electronAPI.executeAction(action).catch((err) => {
        console.error('[native-executor] failed to execute action:', action, err);
      });
    } else {
      // Fallback in pure browser environment
      this.fallback.execute(action);
    }
  }
}
