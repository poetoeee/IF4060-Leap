import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeNativeAction, type NativeAction } from './input';

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

app.on('window-all-closed', () => {
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

app.whenReady().then(() => {
  createWindow();
  createHudWindow();
});
