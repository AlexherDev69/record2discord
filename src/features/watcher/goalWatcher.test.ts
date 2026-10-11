import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { DEFAULT_SETTINGS } from '../../core/settings';
import type { GoalRecord, Settings, WatcherStatus } from '../../shared/types';
import { TeamNameReader } from '../detection/data/teamNameReader';
import { isSameGlyph, type Glyph } from '../detection/domain/glyph';
import type { DigitRecognizer, ScoreboardReading } from '../detection/domain/goalDetector';
import { GoalWatcher } from './goalWatcher';

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  captureProgramFrame: vi.fn(),
  saveReplay: vi.fn(),
  readScoreboard: vi.fn(),
  encodeClip: vi.fn(),
  publishClip: vi.fn(),
  rm: vi.fn(),
}));

// The loop is polled every millisecond so the tests do not wait on real match timing.
vi.mock('../../core/config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../core/config')>()),
  POLL_INTERVAL_MS: 1,
  OBS_RETRY_INTERVAL_MS: 1,
}));
vi.mock('../recording/data/obsClient', () => ({
  describeObsError: (error: unknown) => (error instanceof Error ? error.message : String(error)),
  ObsClient: class {
    connect = mocks.connect;
    disconnect = vi.fn().mockResolvedValue(undefined);
    ensureReplayBufferActive = vi.fn().mockResolvedValue(undefined);
    captureProgramFrame = mocks.captureProgramFrame;
    saveReplay = mocks.saveReplay;
  },
}));
vi.mock('../recording/data/obsLauncher', () => ({ launchObsIfNeeded: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../detection/data/scoreboardReader', () => ({ readScoreboard: mocks.readScoreboard }));
vi.mock('../clip/data/clipEncoder', () => ({ encodeClip: mocks.encodeClip }));
vi.mock('../publishing/data/discordPublisher', () => ({ publishClip: mocks.publishClip }));
vi.mock('node:fs/promises', () => ({ rm: mocks.rm }));

const WEBHOOK_URL = 'https://discord.test/api/webhooks/1/token';
const SETTINGS: Settings = { ...DEFAULT_SETTINGS, discordWebhookUrl: WEBHOOK_URL, postGoalDelaySeconds: 0 };
// Long enough for a publication started by mistake to reach OBS.
const PUBLISH_SETTLE_MS = 50;
const GLYPH_SIZE = 100;
const INK_PIXELS_PER_DIGIT = 10;
const ALL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Fake digit glyph: each digit inks a different slice of the bitmap. */
function digit(value: number): Glyph {
  return new Uint8Array(GLYPH_SIZE).fill(1, value * INK_PIXELS_PER_DIGIT, (value + 1) * INK_PIXELS_PER_DIGIT);
}

function reading(home: number, away: number): ScoreboardReading {
  return { home: digit(home), away: digit(away) };
}

const digits: DigitRecognizer = {
  recognize: (glyph) => ALL_DIGITS.find((value) => isSameGlyph(glyph, digit(value))) ?? null,
  learn: () => undefined,
};

interface RunningWatcher {
  watcher: GoalWatcher;
  onStatus: Mock<(status: WatcherStatus) => void>;
  onGoal: Mock<(record: GoalRecord) => void>;
}

const teamNames = new TeamNameReader('unused');
const running: GoalWatcher[] = [];

function startWatcher(overrides: Partial<Settings> = {}): RunningWatcher {
  const onStatus = vi.fn<(status: WatcherStatus) => void>();
  const onGoal = vi.fn<(record: GoalRecord) => void>();
  const settings = { ...SETTINGS, ...overrides };
  const watcher = new GoalWatcher({ settings, ffmpegPath: 'ffmpeg.exe', digits, teamNames, onStatus, onGoal });
  watcher.start();
  running.push(watcher);
  return { watcher, onStatus, onGoal };
}

/** Lets the watcher confirm 0 - 0, then shows the home side scoring. */
async function scoreHomeGoal({ onStatus }: RunningWatcher): Promise<void> {
  await vi.waitFor(() =>
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ score: { home: 0, away: 0 } })),
  );
  mocks.readScoreboard.mockResolvedValue(reading(1, 0));
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.connect.mockResolvedValue(undefined);
  mocks.captureProgramFrame.mockResolvedValue(Buffer.from('frame'));
  mocks.saveReplay.mockResolvedValue('replay.mkv');
  mocks.readScoreboard.mockResolvedValue(reading(0, 0));
  mocks.encodeClip.mockResolvedValue('replay.mkv.discord.mp4');
  mocks.publishClip.mockResolvedValue(undefined);
  mocks.rm.mockResolvedValue(undefined);
  vi.spyOn(teamNames, 'read').mockImplementation((_frame, region) =>
    Promise.resolve(region === SETTINGS.scoreRegions.home ? 'ACH' : 'CFC'),
  );
});

afterEach(async () => {
  await Promise.all(running.splice(0).map((watcher) => watcher.stop()));
});

describe('GoalWatcher', () => {
  it('should publish a clip naming the teams when a goal is detected', async () => {
    const started = startWatcher();
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(mocks.publishClip).toHaveBeenCalledWith(
      WEBHOOK_URL,
      'replay.mkv.discord.mp4',
      '⚽ But de ACH : ACH 1 - 0 CFC',
    );
    expect(started.onGoal).toHaveBeenCalledWith(
      expect.objectContaining({ score: { home: 1, away: 0 }, published: true, error: null }),
    );
  });

  it('should encode the clip with the configured duration and height', async () => {
    const started = startWatcher({ clipSeconds: 15, clipHeight: 720 });
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(mocks.encodeClip).toHaveBeenCalledWith(
      'ffmpeg.exe',
      'replay.mkv',
      expect.objectContaining({ clipSeconds: 15, height: 720 }),
    );
  });

  it('should delete the local files when the setting is on', async () => {
    const started = startWatcher({ deleteLocalFiles: true });
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(mocks.rm.mock.calls.flat()).toEqual(['replay.mkv', 'replay.mkv.discord.mp4']);
  });

  it('should keep the local files when the setting is off', async () => {
    const started = startWatcher({ deleteLocalFiles: false });
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(mocks.rm).not.toHaveBeenCalled();
  });

  it('should skip the goal when the scoring team is not in the recorded teams', async () => {
    const started = startWatcher({ recordedTeams: 'CFC' });
    await scoreHomeGoal(started);
    await vi.waitFor(() =>
      expect(started.onStatus).toHaveBeenCalledWith(expect.objectContaining({ score: { home: 1, away: 0 } })),
    );
    await started.watcher.stop();
    await new Promise((resolve) => setTimeout(resolve, PUBLISH_SETTLE_MS));
    expect(mocks.saveReplay).not.toHaveBeenCalled();
    expect(started.onGoal).not.toHaveBeenCalled();
  });

  it('should publish the goal when the scoring team is in the recorded teams', async () => {
    const started = startWatcher({ recordedTeams: 'ach' });
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalledWith(expect.objectContaining({ published: true })));
  });

  it('should still publish the clip when the team names cannot be read', async () => {
    vi.spyOn(teamNames, 'read').mockRejectedValue(new Error('engine crashed'));
    const started = startWatcher();
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(mocks.publishClip).toHaveBeenCalledWith(WEBHOOK_URL, expect.any(String), '⚽ But de ? : ? 1 - 0 ?');
  });

  it('should record the failure when the webhook is not configured', async () => {
    const started = startWatcher({ discordWebhookUrl: '' });
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(started.onGoal).toHaveBeenCalledWith(
      expect.objectContaining({ published: false, error: expect.stringContaining('webhook') }),
    );
    expect(mocks.publishClip).not.toHaveBeenCalled();
  });

  it('should record the failure when Discord refuses the clip', async () => {
    mocks.publishClip.mockRejectedValue(new Error('code 413'));
    const started = startWatcher();
    await scoreHomeGoal(started);
    await vi.waitFor(() => expect(started.onGoal).toHaveBeenCalled());
    expect(started.onGoal).toHaveBeenCalledWith(expect.objectContaining({ published: false, error: 'code 413' }));
    expect(mocks.rm).not.toHaveBeenCalled();
  });

  it('should publish the last seconds with the manual message when asked for a manual clip', async () => {
    const started = startWatcher();
    await started.watcher.publishManualClip();
    expect(mocks.publishClip).toHaveBeenCalledWith(
      WEBHOOK_URL,
      'replay.mkv.discord.mp4',
      'Extrait enregistré manuellement',
    );
    expect(started.onGoal).toHaveBeenCalledWith(expect.objectContaining({ score: null, published: true }));
  });

  it('should report OBS as disconnected when the connection fails', async () => {
    mocks.connect.mockRejectedValue(new Error('OBS est injoignable'));
    const { onStatus } = startWatcher();
    await vi.waitFor(() =>
      expect(onStatus).toHaveBeenCalledWith(
        expect.objectContaining({ obsConnected: false, error: 'OBS est injoignable' }),
      ),
    );
  });

  it('should report the scoreboard as hidden when it cannot be read', async () => {
    mocks.readScoreboard.mockResolvedValue(null);
    const { onStatus } = startWatcher();
    await vi.waitFor(() =>
      expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({ obsConnected: true, scoreboardVisible: false })),
    );
  });

  it('should explain the failure when a frame cannot be captured', async () => {
    mocks.captureProgramFrame.mockRejectedValue(new Error('no scene'));
    const watcher = new GoalWatcher({ ...startOptions(), settings: SETTINGS });
    await expect(watcher.captureFrame()).rejects.toThrow('no scene');
  });
});

function startOptions(): Omit<ConstructorParameters<typeof GoalWatcher>[0], 'settings'> {
  return { ffmpegPath: 'ffmpeg.exe', digits, teamNames, onStatus: vi.fn(), onGoal: vi.fn() };
}
