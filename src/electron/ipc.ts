import { ipcMain } from 'electron';
import { logger } from '../core/logger';
import { IPC_CHANNELS, type IpcResult, type ScoreRegions } from '../shared/types';
import type { AppController } from './appController';

/** Runs a handler and turns a thrown error into a result the window can display. */
async function toResult<T>(run: () => Promise<T>): Promise<IpcResult<T>> {
  try {
    return { success: true, data: await run() };
  } catch (error: unknown) {
    logger.warn({ err: error }, 'Request from the window failed');
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function registerIpcHandlers(controller: AppController): void {
  ipcMain.handle(IPC_CHANNELS.getSettings, () => controller.getSettings());
  ipcMain.handle(IPC_CHANNELS.getState, () => controller.getState());
  ipcMain.handle(IPC_CHANNELS.saveSettings, (_event, settings: unknown) =>
    toResult(() => controller.saveSettings(settings)),
  );
  ipcMain.handle(IPC_CHANNELS.testWebhook, (_event, webhookUrl: string) =>
    toResult(async () => {
      await controller.testWebhook(webhookUrl);
      return null;
    }),
  );
  ipcMain.handle(IPC_CHANNELS.captureFrame, (_event, delaySeconds: number) =>
    toResult(() => controller.captureFrame(delaySeconds)),
  );
  ipcMain.handle(IPC_CHANNELS.previewRegions, (_event, regions: ScoreRegions) =>
    toResult(() => controller.previewRegions(regions)),
  );
}
