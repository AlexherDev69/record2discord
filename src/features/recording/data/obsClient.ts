import { OBSWebSocket, OBSWebSocketError } from 'obs-websocket-js';
import { OBS_REPLAY_SAVE_TIMEOUT_MS, OBS_REQUEST_TIMEOUT_MS, SCREENSHOT_JPEG_QUALITY } from '../../../core/config';

const AUTHENTICATION_FAILED_CODE = 4009;
const NO_ANSWER_MESSAGE = 'OBS ne répond plus : vérifie qu’il est toujours lancé.';

type ReplaySavedListener = (event: { savedReplayPath: string }) => void;

/** User-facing explanation of why OBS could not be reached. */
export function describeObsError(error: unknown): string {
  if (error instanceof OBSWebSocketError && error.code === AUTHENTICATION_FAILED_CODE) {
    return 'OBS a refusé le mot de passe WebSocket.';
  }
  if (error instanceof OBSWebSocketError) {
    return 'OBS est injoignable : vérifie qu’il est lancé et que son serveur WebSocket est activé.';
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Rejects when OBS takes too long to answer. A request pending while the connection drops
 * is never settled by the OBS library, which would otherwise freeze the caller for good.
 */
async function withTimeout<Result>(pending: Promise<Result>, timeoutMs: number): Promise<Result> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(NO_ANSWER_MESSAGE)), timeoutMs);
  });
  try {
    return await Promise.race([pending, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export class ObsClient {
  private readonly obs = new OBSWebSocket();
  private replaySaves: Promise<unknown> = Promise.resolve();

  /** Opens a fresh connection, dropping any previous one. */
  async connect(url: string, password?: string): Promise<void> {
    await withTimeout(this.obs.connect(url, password), OBS_REQUEST_TIMEOUT_MS);
  }

  async disconnect(): Promise<void> {
    await this.obs.disconnect();
  }

  async ensureReplayBufferActive(): Promise<void> {
    const { outputActive } = await withTimeout(this.obs.call('GetReplayBufferStatus'), OBS_REQUEST_TIMEOUT_MS);
    if (!outputActive) {
      await withTimeout(this.obs.call('StartReplayBuffer'), OBS_REQUEST_TIMEOUT_MS);
    }
  }

  async captureProgramFrame(): Promise<Buffer> {
    const { currentProgramSceneName } = await withTimeout(
      this.obs.call('GetCurrentProgramScene'),
      OBS_REQUEST_TIMEOUT_MS,
    );
    const { imageData } = await withTimeout(
      this.obs.call('GetSourceScreenshot', {
        sourceName: currentProgramSceneName,
        imageFormat: 'jpg',
        imageCompressionQuality: SCREENSHOT_JPEG_QUALITY,
      }),
      OBS_REQUEST_TIMEOUT_MS,
    );
    return Buffer.from(imageData.slice(imageData.indexOf(',') + 1), 'base64');
  }

  /**
   * Saves the replay buffer and resolves with the path of the written file.
   * Saves run one after the other: OBS does not say which request a saved file answers.
   */
  saveReplay(): Promise<string> {
    const save = this.replaySaves.then(() => this.saveReplayNow());
    this.replaySaves = save.catch(() => undefined);
    return save;
  }

  private async saveReplayNow(): Promise<string> {
    let listener: ReplaySavedListener | undefined;
    const saved = new Promise<string>((resolve) => {
      listener = ({ savedReplayPath }) => resolve(savedReplayPath);
      this.obs.once('ReplayBufferSaved', listener);
    });
    try {
      await withTimeout(this.obs.call('SaveReplayBuffer'), OBS_REQUEST_TIMEOUT_MS);
      return await withTimeout(saved, OBS_REPLAY_SAVE_TIMEOUT_MS);
    } finally {
      if (listener !== undefined) {
        this.obs.off('ReplayBufferSaved', listener);
      }
    }
  }
}
