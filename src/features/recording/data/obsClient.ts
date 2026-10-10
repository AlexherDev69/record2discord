import { OBSWebSocket, OBSWebSocketError } from 'obs-websocket-js';
import { SCREENSHOT_JPEG_QUALITY } from '../../../core/config';

const AUTHENTICATION_FAILED_CODE = 4009;

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

export class ObsClient {
  private readonly obs = new OBSWebSocket();

  /** Opens a fresh connection, dropping any previous one. */
  async connect(url: string, password?: string): Promise<void> {
    await this.obs.connect(url, password);
  }

  async disconnect(): Promise<void> {
    await this.obs.disconnect();
  }

  async ensureReplayBufferActive(): Promise<void> {
    const { outputActive } = await this.obs.call('GetReplayBufferStatus');
    if (!outputActive) {
      await this.obs.call('StartReplayBuffer');
    }
  }

  async captureProgramFrame(): Promise<Buffer> {
    const { currentProgramSceneName } = await this.obs.call('GetCurrentProgramScene');
    const { imageData } = await this.obs.call('GetSourceScreenshot', {
      sourceName: currentProgramSceneName,
      imageFormat: 'jpg',
      imageCompressionQuality: SCREENSHOT_JPEG_QUALITY,
    });
    return Buffer.from(imageData.slice(imageData.indexOf(',') + 1), 'base64');
  }

  /** Saves the replay buffer and resolves with the path of the written file. */
  async saveReplay(): Promise<string> {
    const saved = new Promise<string>((resolve) => {
      this.obs.once('ReplayBufferSaved', ({ savedReplayPath }) => resolve(savedReplayPath));
    });
    await this.obs.call('SaveReplayBuffer');
    return saved;
  }
}
