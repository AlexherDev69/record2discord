import { setTimeout as sleep } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';
import { MAX_GOAL_HISTORY } from '../core/config';
import { logger } from '../core/logger';
import { applySettingsPatch, parseCaptureDelay, parseScoreRegions, parseSettings } from '../core/settings';
import type { SettingsStore } from '../core/settingsStore';
import { cropScoreRegion, readGlyph } from '../features/detection/data/scoreboardReader';
import type { TeamNameReader } from '../features/detection/data/teamNameReader';
import type { DigitRecognizer } from '../features/detection/domain/goalDetector';
import { sendMessage } from '../features/publishing/data/discordPublisher';
import { findNewerRelease } from '../features/updates/data/releaseChecker';
import { GoalWatcher } from '../features/watcher/goalWatcher';
import type {
  AppInfo,
  AppState,
  CalibrationPreview,
  GoalRecord,
  Region,
  RegionPreview,
  ScoreRegions,
  Settings,
  WatcherStatus,
} from '../shared/types';

const MS_PER_SECOND = 1000;
const TEST_MESSAGE = '✅ Record2Discord est bien connecté à ce salon.';
const INITIAL_STATUS: WatcherStatus = { obsConnected: false, scoreboardVisible: false, score: null, error: null };

export interface AppControllerOptions {
  store: SettingsStore;
  digits: DigitRecognizer;
  teamNames: TeamNameReader;
  ffmpegPath: string;
  appVersion: string;
  onStateChanged: (state: AppState) => void;
  onSettingsApplied: (settings: Settings) => void;
}

/** Owns the settings, the running watcher and the state shown in the window. */
export class AppController {
  private settings: Settings;
  private watcher: GoalWatcher;
  private state: AppState = { status: INITIAL_STATUS, goals: [], availableUpdate: null };
  private calibrationFrame: Buffer | null = null;
  private pendingSave: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: AppControllerOptions) {
    this.settings = options.store.load();
    this.watcher = this.createWatcher();
  }

  start(): void {
    this.options.onSettingsApplied(this.settings);
    this.watcher.start();
  }

  async stop(): Promise<void> {
    await this.watcher.stop();
  }

  getSettings(): Settings {
    return this.settings;
  }

  getState(): AppState {
    return this.state;
  }

  /**
   * Applies the changed fields, persists the settings and restarts the watcher with them.
   * Saves run one after the other: two restarts at once would leave two watchers running.
   */
  saveSettings(rawPatch: unknown): Promise<Settings> {
    const save = this.pendingSave.then(() => this.applySettings(rawPatch));
    this.pendingSave = save.catch(() => undefined);
    return save;
  }

  private async applySettings(rawPatch: unknown): Promise<Settings> {
    const settings = applySettingsPatch(this.settings, rawPatch);
    if (isDeepStrictEqual(settings, this.settings)) {
      return this.settings;
    }
    this.options.store.save(settings);
    this.settings = settings;
    await this.watcher.stop();
    this.watcher = this.createWatcher();
    this.setState({ ...this.state, status: INITIAL_STATUS });
    this.start();
    return settings;
  }

  getAppInfo(): AppInfo {
    return { version: this.options.appVersion };
  }

  /** Looks for a newer release. A failed check is only logged: the app works the same without it. */
  async checkForUpdate(): Promise<void> {
    try {
      const availableUpdate = await findNewerRelease(this.options.appVersion);
      if (availableUpdate !== this.state.availableUpdate) {
        this.setState({ ...this.state, availableUpdate });
      }
    } catch (error: unknown) {
      logger.warn({ err: error }, 'Update check failed');
    }
  }

  /** Posts the last seconds of the replay buffer, for the keyboard shortcut. */
  async publishManualClip(): Promise<void> {
    await this.watcher.publishManualClip();
  }

  async testWebhook(webhookUrl: unknown): Promise<void> {
    if (webhookUrl === '') {
      throw new Error('Renseigne d’abord l’URL du webhook.');
    }
    await sendMessage(parseSettings({ discordWebhookUrl: webhookUrl }).discordWebhookUrl, TEST_MESSAGE);
  }

  /** Captures the OBS output after a delay, leaving time to switch back to the game. */
  async captureFrame(rawDelaySeconds: unknown): Promise<string> {
    await sleep(parseCaptureDelay(rawDelaySeconds) * MS_PER_SECOND);
    this.calibrationFrame = await this.watcher.captureFrame();
    return `data:image/jpeg;base64,${this.calibrationFrame.toString('base64')}`;
  }

  async previewRegions(rawRegions: unknown): Promise<CalibrationPreview> {
    const frame = this.calibrationFrame;
    if (frame === null) {
      throw new Error('Capture d’abord une image du jeu.');
    }
    return this.previewFrame(frame, parseScoreRegions(rawRegions));
  }

  /** Previews the regions on the current OBS output, to check the calibration without capturing. */
  async previewLiveRegions(rawRegions: unknown): Promise<CalibrationPreview> {
    const regions = parseScoreRegions(rawRegions);
    return this.previewFrame(await this.watcher.captureFrame(), regions);
  }

  private async previewFrame(frame: Buffer, regions: ScoreRegions): Promise<CalibrationPreview> {
    return { home: await this.previewRegion(frame, regions.home), away: await this.previewRegion(frame, regions.away) };
  }

  private async previewRegion(frame: Buffer, region: Region): Promise<RegionPreview> {
    const crop = await cropScoreRegion(frame, region);
    const glyph = await readGlyph(frame, region);
    return {
      imageDataUrl: `data:image/png;base64,${(await crop.png().toBuffer()).toString('base64')}`,
      looksLikeScoreboard: glyph !== null,
      digit: glyph === null ? null : this.options.digits.recognize(glyph),
      // Without a scoreboard there is no name to read, and the engine would make one up.
      teamName: glyph === null ? null : await this.options.teamNames.read(frame, region).catch(() => null),
    };
  }

  private createWatcher(): GoalWatcher {
    return new GoalWatcher({
      settings: this.settings,
      ffmpegPath: this.options.ffmpegPath,
      digits: this.options.digits,
      teamNames: this.options.teamNames,
      onStatus: (status) => this.setState({ ...this.state, status }),
      onGoal: (record) => this.setState({ ...this.state, goals: this.withGoal(record) }),
    });
  }

  private withGoal(record: GoalRecord): GoalRecord[] {
    return [record, ...this.state.goals].slice(0, MAX_GOAL_HISTORY);
  }

  private setState(state: AppState): void {
    this.state = state;
    this.options.onStateChanged(state);
  }
}
