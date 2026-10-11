import { OBSWebSocketError } from 'obs-websocket-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { describeObsError, ObsClient } from './obsClient';

const socket = vi.hoisted(() => ({ connect: vi.fn(), disconnect: vi.fn(), call: vi.fn(), once: vi.fn() }));
vi.mock('obs-websocket-js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('obs-websocket-js')>()),
  OBSWebSocket: class {
    connect = socket.connect;
    disconnect = socket.disconnect;
    call = socket.call;
    once = socket.once;
  },
}));

const AUTHENTICATION_FAILED_CODE = 4009;
const CONNECTION_REFUSED_CODE = 1006;

/** Makes the fake OBS answer each request by name. */
function obsAnswers(answers: Record<string, unknown>): void {
  socket.call.mockImplementation((request: string) => Promise.resolve(answers[request]));
}

beforeEach(() => {
  Object.values(socket).forEach((mock) => mock.mockReset());
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
    socket.once.mockImplementation((_event: string, listener: (data: { savedReplayPath: string }) => void) => {
      listener({ savedReplayPath: 'C:/replays/goal.mkv' });
    });
    expect(await new ObsClient().saveReplay()).toBe('C:/replays/goal.mkv');
    expect(socket.call).toHaveBeenCalledWith('SaveReplayBuffer');
  });
});
