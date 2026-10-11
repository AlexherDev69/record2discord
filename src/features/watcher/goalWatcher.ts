import { rm } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  BYTES_PER_MEGABYTE,
  CLIP_SIZE_SAFETY_RATIO,
  OBS_RETRY_INTERVAL_MS,
  POLL_INTERVAL_MS,
  STABLE_READS_REQUIRED,
} from '../../core/config';
import { logger } from '../../core/logger';
import type { GoalRecord, Score, Settings, WatcherStatus } from '../../shared/types';
import { encodeClip } from '../clip/data/clipEncoder';
import { readScoreboard } from '../detection/data/scoreboardReader';
import type { TeamNameReader } from '../detection/data/teamNameReader';
import { GoalDetector, type DigitRecognizer, type Goal } from '../detection/domain/goalDetector';
import { shouldRecordGoal } from '../detection/domain/teamFilter';
import { publishClip } from '../publishing/data/discordPublisher';
import { formatGoalMessage } from '../publishing/domain/goalMessage';
import { describeObsError, ObsClient } from '../recording/data/obsClient';
import { launchObsIfNeeded } from '../recording/data/obsLauncher';
import { isReplayFile } from '../recording/domain/replayFile';

const MS_PER_SECOND = 1000;
const MANUAL_CLIP_MESSAGE = 'Extrait enregistré manuellement';
const READ_FAILED_MESSAGE = 'Lecture du bandeau impossible : refais la calibration';
const STOPPED_MESSAGE = 'La surveillance redémarre : réessaie dans un instant.';

export interface GoalWatcherOptions {
  settings: Settings;
  ffmpegPath: string;
  digits: DigitRecognizer;
  teamNames: TeamNameReader;
  onStatus: (status: WatcherStatus) => void;
  onGoal: (record: GoalRecord) => void;
}

/** Watches the OBS output for goals and publishes a clip of each one, until stopped. */
export class GoalWatcher {
  private readonly obs = new ObsClient();
  private readonly detector: GoalDetector;
  private readonly stopSignal = new AbortController();
  private readonly publications = new Set<Promise<void>>();
  private obsConnected = false;
  private obsConnecting: Promise<void> | null = null;
  private obsLaunchAttempted = false;
  private manualClipInProgress = false;
  private loop: Promise<void> = Promise.resolve();
  private lastStatus = '';

  constructor(private readonly options: GoalWatcherOptions) {
    this.detector = new GoalDetector(STABLE_READS_REQUIRED, options.digits);
  }

  start(): void {
    this.loop = this.run();
  }

  /** Stops watching, lets the clips being published finish, then leaves OBS. */
  async stop(): Promise<void> {
    this.stopSignal.abort();
    await this.loop;
    await Promise.allSettled([...this.publications]);
    await this.obs.disconnect().catch(() => undefined);
  }

  async captureFrame(): Promise<Buffer> {
    if (this.stopSignal.signal.aborted) {
      throw new Error(STOPPED_MESSAGE);
    }
    try {
      await this.ensureObsConnected();
      return await this.obs.captureProgramFrame();
    } catch (error: unknown) {
      throw new Error(describeObsError(error), { cause: error });
    }
  }

  private async run(): Promise<void> {
    while (!this.stopSignal.signal.aborted) {
      const delayMs = await this.tick();
      await sleep(delayMs, undefined, { signal: this.stopSignal.signal }).catch(() => undefined);
    }
  }

  /** Reads the scoreboard once and returns how long to wait before the next read. */
  private async tick(): Promise<number> {
    let frame: Buffer;
    try {
      await this.ensureObsConnected();
      frame = await this.obs.captureProgramFrame();
    } catch (error: unknown) {
      this.obsConnected = false;
      const status = { obsConnected: false, scoreboardVisible: false, score: this.detector.score };
      this.report({ ...status, error: describeObsError(error) });
      return OBS_RETRY_INTERVAL_MS;
    }
    await this.readFrame(frame);
    return POLL_INTERVAL_MS;
  }

  /** A frame that cannot be read is reported as such, and not mistaken for an OBS failure. */
  private async readFrame(frame: Buffer): Promise<void> {
    try {
      const reading = await readScoreboard(frame, this.options.settings.scoreRegions);
      const goal = this.detector.update(reading);
      this.report({ obsConnected: true, scoreboardVisible: reading !== null, score: this.detector.score, error: null });
      if (goal !== null) {
        logger.info({ score: goal.score, side: goal.scorer }, 'Goal detected');
        this.track(this.publishGoal(goal, frame));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const status = { obsConnected: true, scoreboardVisible: false, score: this.detector.score };
      this.report({ ...status, error: `${READ_FAILED_MESSAGE} (${message})` });
    }
  }

  /** Remembers a publication until it settles, so stopping can wait for it. */
  private track(publication: Promise<void>): void {
    this.publications.add(publication);
    void publication.finally(() => this.publications.delete(publication));
  }

  /** The poll loop and the calibration preview can both ask for OBS: they share one connection attempt. */
  private ensureObsConnected(): Promise<void> {
    if (this.obsConnected) {
      return Promise.resolve();
    }
    this.obsConnecting ??= this.connectToObs().finally(() => {
      this.obsConnecting = null;
    });
    return this.obsConnecting;
  }

  private async connectToObs(): Promise<void> {
    const { settings } = this.options;
    if (settings.launchObs && !this.obsLaunchAttempted) {
      this.obsLaunchAttempted = true;
      await launchObsIfNeeded(settings.obsPath);
    }
    await this.obs.connect(settings.obsWebsocketUrl, settings.obsWebsocketPassword || undefined);
    await this.obs.ensureReplayBufferActive();
    this.obsConnected = true;
  }

  private report(status: WatcherStatus): void {
    const serialized = JSON.stringify(status);
    if (serialized !== this.lastStatus) {
      this.lastStatus = serialized;
      this.options.onStatus(status);
    }
  }

  /** `frame` is the one the goal was detected on, so the scoreboard is visible in it. */
  private async publishGoal({ score, scorer }: Goal, frame: Buffer): Promise<void> {
    const { settings } = this.options;
    const time = Date.now();
    const teams = { home: await this.readTeamName(frame, 'home'), away: await this.readTeamName(frame, 'away') };
    if (!shouldRecordGoal(settings.recordedTeams, teams[scorer])) {
      logger.info({ score, team: teams[scorer] }, 'Goal skipped: team is not in the recorded teams');
      return;
    }
    const message = formatGoalMessage(settings.messageTemplate, { score, teams, scorer });
    await this.publishClipFor({ time, score }, message, settings.postGoalDelaySeconds);
  }

  /** Publishes the last seconds of the replay buffer, on the user's request. */
  async publishManualClip(): Promise<void> {
    // A key held down or pressed twice must not post the same seconds several times.
    if (this.manualClipInProgress) {
      return;
    }
    this.manualClipInProgress = true;
    const publication = this.publishClipFor({ time: Date.now(), score: null }, MANUAL_CLIP_MESSAGE, 0);
    this.track(publication);
    await publication.finally(() => {
      this.manualClipInProgress = false;
    });
  }

  private async publishClipFor(
    clip: Pick<GoalRecord, 'time' | 'score'>,
    message: string,
    delaySeconds: number,
  ): Promise<void> {
    const record: GoalRecord = { ...clip, published: false, error: null };
    try {
      await this.recordAndPublish(message, delaySeconds);
      logger.info({ score: clip.score }, 'Clip published');
      this.options.onGoal({ ...record, published: true });
    } catch (error: unknown) {
      logger.error({ err: error, score: clip.score }, 'Clip failed');
      this.options.onGoal({ ...record, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /** A name that cannot be read must not prevent the clip from being published. */
  private async readTeamName(frame: Buffer, side: keyof Score): Promise<string | null> {
    try {
      return await this.options.teamNames.read(frame, this.options.settings.scoreRegions[side]);
    } catch (error: unknown) {
      logger.warn({ err: error }, 'Team name could not be read');
      return null;
    }
  }

  private async recordAndPublish(message: string, delaySeconds: number): Promise<void> {
    const { settings, ffmpegPath } = this.options;
    if (settings.discordWebhookUrl === '') {
      throw new Error('Le webhook Discord n’est pas configuré.');
    }
    await sleep(delaySeconds * MS_PER_SECOND);
    const replayPath = await this.obs.saveReplay();
    if (!isReplayFile(replayPath)) {
      throw new Error('OBS a annoncé un fichier de replay inattendu.');
    }
    const clipPath = await encodeClip(ffmpegPath, replayPath, {
      clipSeconds: settings.clipSeconds,
      height: settings.clipHeight,
      targetBytes: settings.maxClipSizeMb * BYTES_PER_MEGABYTE * CLIP_SIZE_SAFETY_RATIO,
    });
    await publishClip(settings.discordWebhookUrl, clipPath, message);
    if (settings.deleteLocalFiles) {
      await this.deleteLocalFiles([replayPath, clipPath]);
    }
  }

  /** The clip is already on Discord: a file that cannot be deleted must not turn it into a failure. */
  private async deleteLocalFiles(filePaths: string[]): Promise<void> {
    const results = await Promise.allSettled(filePaths.map((filePath) => rm(filePath, { force: true })));
    const failures = results.filter((result) => result.status === 'rejected');
    if (failures.length > 0) {
      logger.warn({ errors: failures.map((failure) => String(failure.reason)) }, 'Local files could not be deleted');
    }
  }
}
