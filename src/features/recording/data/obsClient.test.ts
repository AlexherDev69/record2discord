import { OBSWebSocketError } from 'obs-websocket-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OBS_REPLAY_SAVE_TIMEOUT_MS, OBS_REQUEST_TIMEOUT_MS } from '../../../core/config';
import { describeObsError, ObsClient } from './obsClient';

const socket = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  call: vi.fn(),
  once: vi.fn(),
  off: vi.fn(),
}));
vi.mock('obs-websocket-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('obs-websocket-js')>()),
  OBSWebSocket: class {
    connect = socket.connect;
    disconnect = socket.disconnect;
    call = socket.call;
    once = socket.once;
    off = socket.off;
  },
}));

const AUTHENTICATION_FAILED_CODE = 4009;
const CONNECTION_REFUSED_CODE = 1006;

/** Makes the fake OBS answer each request by name. */
function obsAnswers(answers: Record<string, unknown>): void {
  socket.call.mockImplementation((request: string) => Promise.resolve(answers[request]));
}

/** Makes the fake OBS announce a saved replay to the listener currently waiting for it. */
function replaySaved(savedReplayPath: string): void {
  const listener = socket.once.mock.calls.at(-1)?.[1] as (event: { savedReplayPath: string }) => void;
  listener({ savedReplayPath });
}

beforeEach(() => {
  Object.values(socket).forEach((mock) => mock.mockReset());
  socket.connect.mockResolvedValue(undefined);
});

describe('describeObsError', () => {
  it('should blame the password when OBS rejects the authentication', () => {
    expect(describeObsError(new OBSWebSocketError(AUTHENTICATION_FAILED_CODE, 'auth'))).toContain('mot de passe');
  });

  it('should say OBS is unreachable when the connection fails', () => {
    expect(describeObsError(new OBSWebSocketError(CONNECTION_REFUSED_CODE, 'closed'))).toContain('injoignable');
  });

  it('should keep the message when the error does not come from OBS', () => {
    expect(describeObsError(new Error('disk full'))).toBe('disk full');
  });
});

describe('ObsClient', () => {
  it('should connect with the given address and password', async () => {
    await new ObsClient().connect('ws://127.0.0.1:4455', 'secret');
    expect(socket.connect).toHaveBeenCalledWith('ws://127.0.0.1:4455', 'secret');
  });

  it('should start the replay buffer when it is not running', async () => {
    obsAnswers({ GetReplayBufferStatus: { outputActive: false } });
    await new ObsClient().ensureReplayBufferActive();
    expect(socket.call).toHaveBeenCalledWith('StartReplayBuffer');
  });

  it('should leave the replay buffer alone when it is already running', async () => {
    obsAnswers({ GetReplayBufferStatus: { outputActive: true } });
    await new ObsClient().ensureReplayBufferActive();
    expect(socket.call).not.toHaveBeenCalledWith('StartReplayBuffer');
  });

  it('should decode the screenshot of the current scene when capturing a frame', async () => {
    const imageData = `data:image/jpg;base64,${Buffer.from('frame').toString('base64')}`;
    obsAnswers({ GetCurrentProgramScene: { currentProgramSceneName: 'Jeu' }, GetSourceScreenshot: { imageData } });
    expect((await new ObsClient().captureProgramFrame()).toString()).toBe('frame');
    expect(socket.call).toHaveBeenCalledWith('GetSourceScreenshot', expect.objectContaining({ sourceName: 'Jeu' }));
  });

  it('should resolve with the saved file when OBS reports the replay as saved', async () => {
    obsAnswers({});
    const saving = new ObsClient().saveReplay();
    await vi.waitFor(() => expect(socket.call).toHaveBeenCalledWith('SaveReplayBuffer'));
    replaySaved('C:/replays/goal.mkv');
    expect(await saving).toBe('C:/replays/goal.mkv');
    expect(socket.off).toHaveBeenCalledWith('ReplayBufferSaved', expect.any(Function));
  });

  it('should save replays one after the other when asked for two at once', async () => {
    obsAnswers({});
    const client = new ObsClient();
    const first = client.saveReplay();
    const second = client.saveReplay();
    await vi.waitFor(() => expect(socket.call).toHaveBeenCalledTimes(1));
    replaySaved('C:/replays/first.mkv');
    expect(await first).toBe('C:/replays/first.mkv');
    await vi.waitFor(() => expect(socket.call).toHaveBeenCalledTimes(2));
    replaySaved('C:/replays/second.mkv');
    expect(await second).toBe('C:/replays/second.mkv');
  });

  describe('when OBS stops answering', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should fail instead of waiting forever for a request', async () => {
      socket.call.mockReturnValue(new Promise(() => undefined));
      const capture = expect(new ObsClient().captureProgramFrame()).rejects.toThrow('ne répond plus');
      await vi.advanceTimersByTimeAsync(OBS_REQUEST_TIMEOUT_MS);
      await capture;
    });

    it('should fail and stop listening when the replay is never saved', async () => {
      obsAnswers({});
      const saving = expect(new ObsClient().saveReplay()).rejects.toThrow('ne répond plus');
      await vi.advanceTimersByTimeAsync(OBS_REPLAY_SAVE_TIMEOUT_MS);
      await saving;
      expect(socket.off).toHaveBeenCalledWith('ReplayBufferSaved', expect.any(Function));
    });

    it('should still save a replay after a previous save failed', async () => {
      obsAnswers({});
      const client = new ObsClient();
      const failed = expect(client.saveReplay()).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(OBS_REPLAY_SAVE_TIMEOUT_MS);
      await failed;
      const saving = client.saveReplay();
      await vi.advanceTimersByTimeAsync(0);
      replaySaved('C:/replays/goal.mkv');
      expect(await saving).toBe('C:/replays/goal.mkv');
    });
  });
});
