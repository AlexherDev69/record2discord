import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../core/settings';
import type { SettingsStore } from '../core/settingsStore';
import { DigitLibrary } from '../features/detection/data/digitLibrary';
import { TeamNameReader } from '../features/detection/data/teamNameReader';
import type { AppState, Settings } from '../shared/types';
import { AppController } from './appController';

interface FakeWatcher {
  settings: Settings;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

const mocks = vi.hoisted(() => ({
  watchers: [] as FakeWatcher[],
  captureFrame: vi.fn(),
  publishManualClip: vi.fn(),
  sendMessage: vi.fn(),
  findNewerRelease: vi.fn(),
}));

vi.mock('../features/watcher/goalWatcher', () => ({
  GoalWatcher: class {
    readonly settings: Settings;
    start = vi.fn();
    stop = vi.fn().mockResolvedValue(undefined);
    captureFrame = mocks.captureFrame;
    publishManualClip = mocks.publishManualClip;

    constructor(options: { settings: Settings }) {
      this.settings = options.settings;
      mocks.watchers.push(this);
    }
  },
}));
vi.mock('../features/publishing/data/discordPublisher', () => ({ sendMessage: mocks.sendMessage }));
vi.mock('../features/updates/data/releaseChecker', () => ({ findNewerRelease: mocks.findNewerRelease }));

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1/token';
const SLOW_STOP_MS = 20;
const APP_VERSION = '1.2.3';
const NEWER_VERSION = '1.2.4';
// Top-left quarter of a 2560x1440 frame showing ACH 0 - 0 CFC.
const FRAME = readFileSync(join(process.cwd(), 'src/features/detection/data/fixtures/scoreboard.jpg'));
const REGIONS = {
  home: { left: 0.525, top: 0.2332, width: 0.075, height: 0.075 },
  away: { left: 0.525, top: 0.3196, width: 0.075, height: 0.075 },
};

const teamNames = new TeamNameReader('unused');
const store = { load: vi.fn<() => Settings>(), save: vi.fn<(settings: Settings) => void>() };
const onStateChanged = vi.fn<(state: AppState) => void>();
const onSettingsApplied = vi.fn<(settings: Settings) => void>();

function createController(): AppController {
  return new AppController({
    // Only `load` and `save` are used by the controller.
    store: store as unknown as SettingsStore,
    digits: DigitLibrary.load(join(process.cwd(), 'assets/digits.json')),
    teamNames,
    ffmpegPath: 'ffmpeg.exe',
    appVersion: APP_VERSION,
    onStateChanged,
    onSettingsApplied,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.watchers.length = 0;
  store.load.mockReturnValue(DEFAULT_SETTINGS);
  mocks.captureFrame.mockResolvedValue(FRAME);
  mocks.sendMessage.mockResolvedValue(undefined);
  mocks.publishManualClip.mockResolvedValue(undefined);
  mocks.findNewerRelease.mockResolvedValue(null);
  vi.spyOn(teamNames, 'read').mockResolvedValue('ACH');
});

describe('AppController', () => {
  it('should start watching with the stored settings when started', () => {
    const controller = createController();
    controller.start();
    expect(controller.getSettings()).toBe(DEFAULT_SETTINGS);
    expect(mocks.watchers[0]?.start).toHaveBeenCalled();
    expect(onSettingsApplied).toHaveBeenCalledWith(DEFAULT_SETTINGS);
  });

  it('should persist the settings and restart the watcher when they are saved', async () => {
    const controller = createController();
    const saved = await controller.saveSettings({ ...DEFAULT_SETTINGS, clipSeconds: 30 });
    expect(saved.clipSeconds).toBe(30);
    expect(store.save).toHaveBeenCalledWith(saved);
    expect(mocks.watchers[0]?.stop).toHaveBeenCalled();
    expect(mocks.watchers[1]?.settings).toBe(saved);
    expect(mocks.watchers[1]?.start).toHaveBeenCalled();
  });

  it('should keep the current settings when the saved ones are invalid', async () => {
    const controller = createController();
    await expect(controller.saveSettings({ ...DEFAULT_SETTINGS, clipSeconds: 1 })).rejects.toThrow();
    expect(store.save).not.toHaveBeenCalled();
    expect(controller.getSettings()).toBe(DEFAULT_SETTINGS);
  });

  it('should change only the given fields when saving a patch', async () => {
    store.load.mockReturnValue({ ...DEFAULT_SETTINGS, recordedTeams: 'ACH' });
    const saved = await createController().saveSettings({ clipSeconds: 30 });
    expect(saved).toEqual({ ...DEFAULT_SETTINGS, recordedTeams: 'ACH', clipSeconds: 30 });
  });

  it('should leave the watcher running when the saved settings are unchanged', async () => {
    const controller = createController();
    await controller.saveSettings({ clipSeconds: DEFAULT_SETTINGS.clipSeconds });
    expect(store.save).not.toHaveBeenCalled();
    expect(mocks.watchers).toHaveLength(1);
    expect(mocks.watchers[0]?.stop).not.toHaveBeenCalled();
  });

  it('should restart the watcher once per save when two saves overlap', async () => {
    const controller = createController();
    mocks.watchers[0]?.stop.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, SLOW_STOP_MS)));
    const saves = [controller.saveSettings({ clipSeconds: 30 }), controller.saveSettings({ recordedTeams: 'ACH' })];
    await Promise.all(saves);
    expect(mocks.watchers).toHaveLength(3);
    expect(mocks.watchers.map((watcher) => watcher.stop.mock.calls.length)).toEqual([1, 1, 0]);
    expect(controller.getSettings()).toEqual({ ...DEFAULT_SETTINGS, clipSeconds: 30, recordedTeams: 'ACH' });
  });

  it('should still save when the previous save was rejected', async () => {
    const controller = createController();
    await expect(controller.saveSettings({ clipSeconds: 1 })).rejects.toThrow();
    expect((await controller.saveSettings({ clipSeconds: 30 })).clipSeconds).toBe(30);
  });

  it('should reset the status shown in the window when the settings are saved', async () => {
    const controller = createController();
    await controller.saveSettings({ clipSeconds: 30 });
    expect(onStateChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: expect.objectContaining({ obsConnected: false, score: null }) }),
    );
  });

  it('should send a test message when the webhook is given', async () => {
    await createController().testWebhook(WEBHOOK_URL);
    expect(mocks.sendMessage).toHaveBeenCalledWith(WEBHOOK_URL, expect.any(String));
  });

  it('should throw when testing without a webhook', async () => {
    await expect(createController().testWebhook('')).rejects.toThrow('webhook');
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it('should throw when testing a webhook that is not an https url', async () => {
    await expect(createController().testWebhook('not a url')).rejects.toThrow();
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });

  it('should ask the current watcher for a clip when a manual clip is requested', async () => {
    await createController().publishManualClip();
    expect(mocks.publishManualClip).toHaveBeenCalled();
  });

  it('should return the captured frame as an image when capturing', async () => {
    expect(await createController().captureFrame(0)).toBe(`data:image/jpeg;base64,${FRAME.toString('base64')}`);
  });

  it('should refuse a capture delay that is not a reasonable number', async () => {
    await expect(createController().captureFrame(100000)).rejects.toThrow();
    await expect(createController().captureFrame('0')).rejects.toThrow();
    expect(mocks.captureFrame).not.toHaveBeenCalled();
  });

  it('should refuse to preview regions that are malformed', async () => {
    await expect(createController().previewLiveRegions({ home: REGIONS.home })).rejects.toThrow();
    expect(mocks.captureFrame).not.toHaveBeenCalled();
  });

  it('should throw when previewing regions before any capture', async () => {
    await expect(createController().previewRegions(REGIONS)).rejects.toThrow('Capture');
  });

  it('should preview what is read in each region of the captured frame', async () => {
    const controller = createController();
    await controller.captureFrame(0);
    const preview = await controller.previewRegions(REGIONS);
    expect(preview.home).toEqual({
      imageDataUrl: expect.stringMatching(/^data:image\/png;base64,/),
      looksLikeScoreboard: true,
      digit: 0,
      teamName: 'ACH',
    });
  });

  it('should preview the current OBS output when asked for a live preview', async () => {
    const preview = await createController().previewLiveRegions(REGIONS);
    expect(mocks.captureFrame).toHaveBeenCalled();
    expect(preview.away.looksLikeScoreboard).toBe(true);
  });

  it('should not read a team name when the region does not look like the scoreboard', async () => {
    const offScoreboard = { left: 0.6, top: 0.02, width: 0.075, height: 0.075 };
    const preview = await createController().previewLiveRegions({ home: offScoreboard, away: offScoreboard });
    expect(preview.home).toEqual(expect.objectContaining({ looksLikeScoreboard: false, digit: null, teamName: null }));
  });

  it('should give the version of the app when asked for its information', () => {
    expect(createController().getAppInfo()).toEqual({ version: APP_VERSION });
  });

  it('should show the newer version when a newer release exists', async () => {
    mocks.findNewerRelease.mockResolvedValue(NEWER_VERSION);
    const controller = createController();
    await controller.checkForUpdate();
    expect(mocks.findNewerRelease).toHaveBeenCalledWith(APP_VERSION);
    expect(controller.getState().availableUpdate).toBe(NEWER_VERSION);
    expect(onStateChanged).toHaveBeenCalledWith(expect.objectContaining({ availableUpdate: NEWER_VERSION }));
  });

  it('should leave the state untouched when no newer release exists', async () => {
    const controller = createController();
    await controller.checkForUpdate();
    expect(controller.getState().availableUpdate).toBeNull();
    expect(onStateChanged).not.toHaveBeenCalled();
  });

  it('should keep running when the update check fails', async () => {
    mocks.findNewerRelease.mockRejectedValue(new Error('offline'));
    const controller = createController();
    await expect(controller.checkForUpdate()).resolves.toBeUndefined();
    expect(controller.getState().availableUpdate).toBeNull();
  });
});
