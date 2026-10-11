import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../core/settings';
import type { SettingsStore } from '../core/settingsStore';
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

const WEBHOOK_URL = 'https://discord.test/api/webhooks/1/token';
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
    digits: { recognize: () => 0, learn: () => undefined },
    teamNames,
    ffmpegPath: 'ffmpeg.exe',
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

  it('should reset the status shown in the window when the settings are saved', async () => {
    const controller = createController();
    await controller.saveSettings(DEFAULT_SETTINGS);
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
});
