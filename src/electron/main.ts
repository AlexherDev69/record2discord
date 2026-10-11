import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { app, BrowserWindow, Menu, nativeImage, safeStorage, Tray } from 'electron';
import { addLogFile, logger } from '../core/logger';
import { SettingsStore, type SettingsCodec } from '../core/settingsStore';
import { DigitLibrary } from '../features/detection/data/digitLibrary';
import { TeamNameReader } from '../features/detection/data/teamNameReader';
import { IPC_CHANNELS, type Settings } from '../shared/types';
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

/** Copies the digits shipped with the app on first run, so digits learned later survive updates. */
function ensureDigitLibrary(): string {
  const libraryPath = userDataPath('digits.json');
  if (!existsSync(libraryPath)) {
    copyFileSync(bundledPath('digits.json', 'assets/digits.json'), libraryPath);
  }
  return libraryPath;
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
  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl) {
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
    digits: DigitLibrary.load(ensureDigitLibrary()),
    teamNames: new TeamNameReader(bundledPath('tessdata', 'node_modules/@tesseract.js-data/eng/4.0.0_best_int')),
    ffmpegPath: bundledPath('ffmpeg.exe', 'node_modules/ffmpeg-static/ffmpeg.exe'),
    onStateChanged: (state) => window?.webContents.send(IPC_CHANNELS.stateChanged, state),
    onSettingsApplied: applyStartWithWindows,
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
  void bootstrap();
} else {
  app.quit();
}
