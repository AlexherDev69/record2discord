import { ipcMain } from 'electron';
import { z } from 'zod';
import { logger } from '../core/logger';
import { EXTERNAL_PAGES, IPC_CHANNELS, type ExternalPage, type IpcResult } from '../shared/types';
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

const externalPageSchema = z.enum(EXTERNAL_PAGES);

/** `openPage` opens one of the known web pages in the browser: the window cannot open any other address. */
export function registerIpcHandlers(controller: AppController, openPage: (page: ExternalPage) => Promise<void>): void {
  ipcMain.handle(IPC_CHANNELS.getAppInfo, () => controller.getAppInfo());
  ipcMain.handle(IPC_CHANNELS.openExternalPage, (_event, page: unknown) =>
    toResult(async () => {
      await openPage(externalPageSchema.parse(page));
      return null;
    }),
  );
  ipcMain.handle(IPC_CHANNELS.getSettings, () => controller.getSettings());
  ipcMain.handle(IPC_CHANNELS.getState, () => controller.getState());
  ipcMain.handle(IPC_CHANNELS.saveSettings, (_event, settings: unknown) =>
    toResult(() => controller.saveSettings(settings)),
  );
  ipcMain.handle(IPC_CHANNELS.testWebhook, (_event, webhookUrl: unknown) =>
    toResult(async () => {
      await controller.testWebhook(webhookUrl);
      return null;
    }),
  );
  ipcMain.handle(IPC_CHANNELS.captureFrame, (_event, delaySeconds: unknown) =>
    toResult(() => controller.captureFrame(delaySeconds)),
  );
  ipcMain.handle(IPC_CHANNELS.previewRegions, (_event, regions: unknown) =>
    toResult(() => controller.previewRegions(regions)),
  );
  ipcMain.handle(IPC_CHANNELS.previewLiveRegions, (_event, regions: unknown) =>
    toResult(() => controller.previewLiveRegions(regions)),
  );
}
