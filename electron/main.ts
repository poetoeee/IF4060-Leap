import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeNativeAction, releaseAllModifiers, type NativeAction } from './input';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process root directory
process.env.APP_ROOT = path.join(__dirname, '..');

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null = null;
let hudWin: BrowserWindow | null = null;
const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'Gesturmap',
    backgroundColor: '#0c0e12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      // CRITICAL: Prevent camera and gesture recognition from throttling or freezing
      // when the user switches to other applications (e.g. PowerPoint, Chrome, etc.)
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }

  win.on('closed', () => {
    win = null;
    if (hudWin && !hudWin.isDestroyed()) {
      hudWin.close();
    }
  });
}

function createHudWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const winWidth = 320;
  const winHeight = 56;

  hudWin = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 20,
    y: height - winHeight - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Windows: Ensure mouse clicks pass through the HUD to underlying apps
  hudWin.setIgnoreMouseEvents(true, { forward: true });

  const hudUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}#/hud-overlay`
    : `file://${path.join(RENDERER_DIST, 'index.html')}#/hud-overlay`;

  hudWin.loadURL(hudUrl);

  hudWin.on('closed', () => {
    hudWin = null;
  });
}

// IPC Handlers
export type BridgeProcessState = 'stopped' | 'starting' | 'running' | 'error';

export interface BridgeStatusPayload {
  state: BridgeProcessState;
  detail?: string;
  pid?: number;
}

let bridgeProc: ChildProcess | null = null;
let bridgeStatus: BridgeStatusPayload = { state: 'stopped' };

function broadcastBridgeStatus(next: BridgeStatusPayload) {
  bridgeStatus = next;
  if (win && !win.isDestroyed()) {
    win.webContents.send('bridge-status', bridgeStatus);
  }
}

function isBridgePortOpen(port = 8765, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (open: boolean) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(400);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

const SOURCE_REPO_ROOT = process.cwd();

function resolveBridgeScript(): { script: string; rootDir: string } | null {
  const exeDir = path.dirname(app.getPath('exe'));
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR ?? '';
  const candidates = [
    process.env.APP_ROOT ? path.join(process.env.APP_ROOT, 'bridge', 'leap_bridge.py') : '',
    process.resourcesPath ? path.join(process.resourcesPath, 'bridge', 'leap_bridge.py') : '',
    portableDir ? path.join(portableDir, 'bridge', 'leap_bridge.py') : '',
    portableDir ? path.join(portableDir, '..', 'bridge', 'leap_bridge.py') : '',
    path.join(exeDir, 'bridge', 'leap_bridge.py'),
    path.join(exeDir, '..', '..', 'bridge', 'leap_bridge.py'),
    path.join(process.cwd(), 'bridge', 'leap_bridge.py'),
    path.join(SOURCE_REPO_ROOT, 'bridge', 'leap_bridge.py'),
  ].filter(Boolean);

  for (const script of candidates) {
    if (!script.includes('app.asar') && fs.existsSync(script)) {
      return { script, rootDir: path.dirname(path.dirname(script)) };
    }
  }
  return null;
}

function collectParentDirs(startDir: string, depth = 4): string[] {
  const dirs: string[] = [];
  let cur = startDir;
  for (let i = 0; i < depth && cur; i++) {
    dirs.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return dirs;
}

function resolvePythonEnv(rootDir: string): { pythonExe: string; pythonPathEntries: string[] } {
  const isWin = process.platform === 'win32';
  const exeDir = path.dirname(app.getPath('exe'));
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR ?? '';

  const baseCandidates = [
    rootDir,
    process.env.APP_ROOT ?? '',
    process.cwd(),
    portableDir,
    exeDir,
    process.resourcesPath ?? '',
    SOURCE_REPO_ROOT,
  ].filter(Boolean);

  const searchRoots = [...new Set(baseCandidates.flatMap((d) => collectParentDirs(d, 4)))];

  const pythonPathEntries: string[] = [];
  for (const r of searchRoots) {
    const apiSrc = path.join(r, 'leapc-python-bindings', 'leapc-python-api', 'src');
    const cffiSrc = path.join(r, 'leapc-python-bindings', 'leapc-cffi', 'src');
    if (fs.existsSync(apiSrc) && !pythonPathEntries.includes(apiSrc)) pythonPathEntries.push(apiSrc);
    if (fs.existsSync(cffiSrc) && !pythonPathEntries.includes(cffiSrc)) pythonPathEntries.push(cffiSrc);
  }

  for (const r of searchRoots) {
    const venvPy = isWin
      ? path.join(r, '.venv-leap', 'Scripts', 'python.exe')
      : path.join(r, '.venv-leap', 'bin', 'python');
    if (fs.existsSync(venvPy)) {
      return { pythonExe: venvPy, pythonPathEntries };
    }
  }

  return { pythonExe: isWin ? 'python' : 'python3', pythonPathEntries };
}

function getDefaultLeapSdkPath(): string {
  if (process.env.LEAPSDK_INSTALL_LOCATION) return process.env.LEAPSDK_INSTALL_LOCATION;
  if (process.platform === 'win32') return 'C:\\Program Files\\Ultraleap\\LeapSDK';
  if (process.platform === 'darwin') return '/Applications/Ultraleap Hand Tracking.app/Contents/LeapSDK';
  return '/usr/lib/ultraleap-hand-tracking-service';
}

function ensurePythonDependencies(pythonExe: string, requirementsPath: string): void {
  const check = spawnSync(pythonExe, ['-c', 'import websockets, cffi'], { windowsHide: true });
  if (check.status === 0) return;

  broadcastBridgeStatus({
    state: 'starting',
    detail: 'Installing Python bridge packages (websockets, cffi)…',
  });

  if (fs.existsSync(requirementsPath)) {
    spawnSync(pythonExe, ['-m', 'pip', 'install', '--quiet', '-r', requirementsPath], { windowsHide: true });
  } else {
    spawnSync(pythonExe, ['-m', 'pip', 'install', '--quiet', 'websockets>=10,<14', 'cffi>=1.15.0'], { windowsHide: true });
  }
}

async function startBridgeProcess(customSdkPath?: string): Promise<BridgeStatusPayload> {
  if (bridgeProc && bridgeProc.exitCode === null && !bridgeProc.killed) {
    return bridgeStatus;
  }

  if (await isBridgePortOpen()) {
    broadcastBridgeStatus({
      state: 'running',
      detail: 'Bridge active on ws://127.0.0.1:8765',
    });
    return bridgeStatus;
  }

  const resolved = resolveBridgeScript();
  if (!resolved) {
    broadcastBridgeStatus({
      state: 'error',
      detail: 'bridge/leap_bridge.py not found.',
    });
    return bridgeStatus;
  }

  const { pythonExe, pythonPathEntries } = resolvePythonEnv(resolved.rootDir);
  const sdkPath = (customSdkPath && customSdkPath.trim()) || getDefaultLeapSdkPath();

  broadcastBridgeStatus({
    state: 'starting',
    detail: `Starting bridge (${path.basename(pythonExe)})…`,
  });

  try {
    const reqPath = path.join(path.dirname(resolved.script), 'requirements.txt');
    ensurePythonDependencies(pythonExe, reqPath);

    const existingPyPath = process.env.PYTHONPATH ? [process.env.PYTHONPATH] : [];
    const combinedPyPath = [...pythonPathEntries, ...existingPyPath].join(path.delimiter);
    const child = spawn(pythonExe, ['-u', resolved.script], {
      cwd: resolved.rootDir,
      env: {
        ...process.env,
        ...(combinedPyPath ? { PYTHONPATH: combinedPyPath } : {}),
        ...(sdkPath ? { LEAPSDK_INSTALL_LOCATION: sdkPath } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    bridgeProc = child;

    let stderrBuf = '';

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trim();
      if (!text) return;
      if (text.includes('serving ws://') || text.includes('[bridge]')) {
        broadcastBridgeStatus({
          state: 'running',
          pid: child.pid,
          detail: text.split(/\r?\n/).pop() ?? 'Bridge running',
        });
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      stderrBuf += chunk.toString();
    });

    child.on('error', (err) => {
      if (bridgeProc === child) bridgeProc = null;
      broadcastBridgeStatus({
        state: 'error',
        detail: `Failed to start Python bridge: ${err.message}`,
      });
    });

    child.on('exit', (code, signal) => {
      const wasStartingOrRunning = bridgeStatus.state === 'starting' || bridgeStatus.state === 'running';
      if (bridgeProc === child) bridgeProc = null;
      if (code === 0 || signal === 'SIGTERM' || signal === 'SIGINT' || !wasStartingOrRunning) {
        broadcastBridgeStatus({ state: 'stopped', detail: 'Bridge stopped' });
      } else {
        const lastLine =
          stderrBuf
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-2)
            .join(' ') || `Exited with code ${code ?? 'unknown'}`;
        broadcastBridgeStatus({
          state: 'error',
          detail: lastLine,
        });
      }
    });

    // Wait briefly to verify process did not immediately crash and is listening
    await new Promise((r) => setTimeout(r, 600));
    if (bridgeProc === child && child.exitCode === null) {
      broadcastBridgeStatus({
        state: 'running',
        pid: child.pid,
        detail: 'Running on ws://127.0.0.1:8765',
      });
    }
  } catch (err) {
    broadcastBridgeStatus({
      state: 'error',
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  return bridgeStatus;
}

async function stopBridgeProcess(): Promise<BridgeStatusPayload> {
  const child = bridgeProc;
  bridgeProc = null;
  if (child && child.exitCode === null && !child.killed) {
    try {
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { windowsHide: true });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      // ignore kill errors
    }
  }
  broadcastBridgeStatus({ state: 'stopped', detail: 'Bridge stopped' });
  return bridgeStatus;
}

ipcMain.handle('bridge-status', async () => {
  if (!bridgeProc && bridgeStatus.state === 'stopped') {
    if (await isBridgePortOpen()) {
      bridgeStatus = { state: 'running', detail: 'External bridge active on ws://127.0.0.1:8765' };
    }
  }
  return bridgeStatus;
});

ipcMain.handle('bridge-start', async (_event, options?: { sdkPath?: string }) => {
  return startBridgeProcess(options?.sdkPath);
});

ipcMain.handle('bridge-stop', async () => {
  return stopBridgeProcess();
});

ipcMain.handle('bridge-default-sdk-path', () => {
  return getDefaultLeapSdkPath();
});

ipcMain.handle('bridge-browse-sdk', async () => {
  const targetWin = win && !win.isDestroyed() ? win : undefined;
  const res = targetWin
    ? await dialog.showOpenDialog(targetWin, {
        title: 'Select Ultraleap LeapSDK Directory',
        defaultPath: fs.existsSync(getDefaultLeapSdkPath()) ? getDefaultLeapSdkPath() : undefined,
        properties: ['openDirectory'],
      })
    : await dialog.showOpenDialog({
        title: 'Select Ultraleap LeapSDK Directory',
        properties: ['openDirectory'],
      });
  if (res.canceled || !res.filePaths.length) return null;
  return res.filePaths[0] ?? null;
});

ipcMain.handle('execute-action', async (_event, action: NativeAction) => {
  await executeNativeAction(action);
  return { ok: true };
});

ipcMain.handle('update-hud', (_event, payload: { hud?: unknown }) => {
  if (!hudWin || hudWin.isDestroyed()) return { ok: false };

  hudWin.webContents.send('hud-data', payload);

  if (payload && payload.hud) {
    if (!hudWin.isVisible()) {
      // showInactive displays the HUD without stealing focus from active presentation/app
      hudWin.showInactive();
    }
  } else {
    if (hudWin.isVisible()) {
      hudWin.hide();
    }
  }

  return { ok: true };
});

ipcMain.handle('window-minimize-to-tray', () => {
  win?.minimize();
});

app.on('before-quit', () => {
  void stopBridgeProcess();
  void releaseAllModifiers();
});

app.on('window-all-closed', () => {
  if (!hasSingleInstanceLock) return;
  void stopBridgeProcess();
  void releaseAllModifiers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    createHudWindow();
  }
});

if (hasSingleInstanceLock) {
  app.whenReady().then(() => {
    createWindow();
    createHudWindow();
  });
}
