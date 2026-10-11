import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, globalShortcut, Menu, nativeImage, safeStorage, Tray } from 'electron';
import { addLogFile, logger } from '../core/logger';
import { SettingsStore, type SettingsCodec } from '../core/settingsStore';
import { DigitLibrary } from '../features/detection/data/digitLibrary';
import { TeamNameReader } from '../features/detection/data/teamNameReader';
import { IPC_CHANNELS, type AppState, type Settings } from '../shared/types';
import { AppController } from './appController';
import { registerIpcHandlers } from './ipc';

const WINDOW_WIDTH = 980;
const WINDOW_HEIGHT = 760;
const HIDDEN_FLAG = '--hidden';
const APP_TITLE = 'Record2Discord';

let window: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

/** Files shipped with the app: next to the executable once packaged, in the project during development. */
function bundledPath(packagedName: string, developmentPath: string): string {
  return app.isPackaged ? join(process.resourcesPath, packagedName) : join(app.getAppPath(), developmentPath);
}

function userDataPath(fileName: string): string {
  return join(app.getPath('userData'), fileName);
}

/**
 * Copies the digits shipped with the app on first run, so digits learned later survive updates.
 * A library that became unreadable is replaced by the shipped one instead of blocking the start.
 */
function loadDigitLibrary(): DigitLibrary {
  const libraryPath = userDataPath('digits.json');
  const shippedPath = bundledPath('digits.json', 'assets/digits.json');
  if (!existsSync(libraryPath)) {
    copyFileSync(shippedPath, libraryPath);
  }
  try {
    return DigitLibrary.load(libraryPath);
  } catch (error: unknown) {
    logger.warn({ err: error }, 'Digit library is unreadable, restoring the shipped one');
    copyFileSync(shippedPath, libraryPath);
    return DigitLibrary.load(libraryPath);
  }
}

function sendState(state: AppState): void {
  if (window !== null && !window.isDestroyed()) {
    window.webContents.send(IPC_CHANNELS.stateChanged, state);
  }
}

const encryptedCodec: SettingsCodec = {
  encode: (text) => safeStorage.encryptString(text),
  decode: (data) => safeStorage.decryptString(data),
};

function applyStartWithWindows(settings: Settings): void {
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin: settings.startWithWindows, args: [HIDDEN_FLAG] });
  }
}

/** Binds the system-wide shortcut, which works while the game has the focus. */
function applyManualClipShortcut(shortcut: string, onPressed: () => void): void {
  globalShortcut.unregisterAll();
  if (shortcut === '') {
    return;
  }
  try {
    if (!globalShortcut.register(shortcut, onPressed)) {
      logger.warn({ shortcut }, 'Shortcut is already used by another application');
    }
  } catch (error: unknown) {
    logger.warn({ err: error, shortcut }, 'Shortcut could not be registered');
  }
}

function showWindow(): void {
  window?.show();
  window?.focus();
}

function createWindow(): BrowserWindow {
  const created = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: !process.argv.includes(HIDDEN_FLAG),
    title: APP_TITLE,
    icon: bundledPath('icon.png', 'build/icon.png'),
    autoHideMenuBar: true,
    webPreferences: { preload: join(import.meta.dirname, '../preload/preload.cjs') },
  });
  // Closing the window keeps the app watching from the tray.
  created.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      created.hide();
    }
  });
  // The window only ever shows the app itself: it has access to the settings.
  created.webContents.on('will-navigate', (event) => event.preventDefault());
  created.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl && !app.isPackaged) {
    void created.loadURL(devServerUrl);
  } else {
    void created.loadFile(join(import.meta.dirname, '../renderer/index.html'));
  }
  return created;
}

function createTray(): Tray {
  const created = new Tray(nativeImage.createFromPath(bundledPath('icon.png', 'build/icon.png')));
  created.setToolTip(APP_TITLE);
  created.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Ouvrir', click: showWindow },
      { type: 'separator' },
      { label: 'Quitter', click: () => app.quit() },
    ]),
  );
  created.on('click', showWindow);
  return created;
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  addLogFile(userDataPath('record2discord.log'));

  const controller = new AppController({
    store: new SettingsStore(userDataPath('settings.bin'), encryptedCodec),
    digits: loadDigitLibrary(),
    teamNames: new TeamNameReader(bundledPath('tessdata', 'node_modules/@tesseract.js-data/eng/4.0.0_best_int')),
    ffmpegPath: bundledPath('ffmpeg.exe', 'node_modules/ffmpeg-static/ffmpeg.exe'),
    onStateChanged: sendState,
    onSettingsApplied: (settings) => {
      applyStartWithWindows(settings);
      applyManualClipShortcut(settings.manualClipShortcut, () => void controller.publishManualClip());
    },
  });
  registerIpcHandlers(controller);
  window = createWindow();
  tray = createTray();
  controller.start();
  logger.info('Application started');

  app.on('before-quit', () => {
    isQuitting = true;
    void controller.stop();
  });
}

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', showWindow);
  // The app lives in the tray, so it must not quit when its window is hidden or closed.
  app.on('window-all-closed', () => undefined);
  // A failed start must not leave an invisible process holding the single-instance lock.
  bootstrap().catch((error: unknown) => {
    logger.error({ err: error }, 'Application could not start');
    app.exit(1);
  });
} else {
  app.quit();
}
