import { setTimeout as sleep } from 'node:timers/promises';
import { MAX_GOAL_HISTORY } from '../core/config';
import { parseSettings } from '../core/settings';
import type { SettingsStore } from '../core/settingsStore';
import { cropScoreRegion, readGlyph } from '../features/detection/data/scoreboardReader';
import type { DigitRecognizer } from '../features/detection/domain/goalDetector';
import { sendMessage } from '../features/publishing/data/discordPublisher';
import { GoalWatcher } from '../features/watcher/goalWatcher';
import type {
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
  ffmpegPath: string;
  onStateChanged: (state: AppState) => void;
  onSettingsApplied: (settings: Settings) => void;
}

/** Owns the settings, the running watcher and the state shown in the window. */
export class AppController {
  private settings: Settings;
  private watcher: GoalWatcher;
  private state: AppState = { status: INITIAL_STATUS, goals: [] };
  private calibrationFrame: Buffer | null = null;

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

  /** Validates and persists the settings, then restarts the watcher with them. */
  async saveSettings(raw: unknown): Promise<Settings> {
    const settings = parseSettings(raw);
    this.options.store.save(settings);
    this.settings = settings;
    await this.watcher.stop();
    this.watcher = this.createWatcher();
    this.setState({ ...this.state, status: INITIAL_STATUS });
    this.start();
    return settings;
  }

  async testWebhook(webhookUrl: string): Promise<void> {
    if (webhookUrl === '') {
      throw new Error('Renseigne d’abord l’URL du webhook.');
    }
    await sendMessage(parseSettings({ discordWebhookUrl: webhookUrl }).discordWebhookUrl, TEST_MESSAGE);
  }

  /** Captures the OBS output after a delay, leaving time to switch back to the game. */
  async captureFrame(delaySeconds: number): Promise<string> {
    await sleep(delaySeconds * MS_PER_SECOND);
    this.calibrationFrame = await this.watcher.captureFrame();
    return `data:image/jpeg;base64,${this.calibrationFrame.toString('base64')}`;
  }

  async previewRegions(regions: ScoreRegions): Promise<CalibrationPreview> {
    const frame = this.calibrationFrame;
    if (frame === null) {
      throw new Error('Capture d’abord une image du jeu.');
    }
    return this.previewFrame(frame, regions);
  }

  /** Previews the regions on the current OBS output, to check the calibration without capturing. */
  async previewLiveRegions(regions: ScoreRegions): Promise<CalibrationPreview> {
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
    };
  }

  private createWatcher(): GoalWatcher {
    return new GoalWatcher({
      settings: this.settings,
      ffmpegPath: this.options.ffmpegPath,
      digits: this.options.digits,
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
