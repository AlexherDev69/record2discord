import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../core/settings';
import { IPC_CHANNELS } from '../shared/types';
import type { AppController } from './appController';
import { registerIpcHandlers } from './ipc';

type Handler = (event: unknown, ...args: unknown[]) => unknown;

const handlers = vi.hoisted(() => new Map<string, Handler>());
vi.mock('electron', () => ({
  ipcMain: { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) },
}));

const controller = {
  getSettings: vi.fn(),
  getState: vi.fn(),
  saveSettings: vi.fn(),
  testWebhook: vi.fn(),
  captureFrame: vi.fn(),
  previewRegions: vi.fn(),
  previewLiveRegions: vi.fn(),
};

function invoke(channel: string, ...args: unknown[]): unknown {
  const handler = handlers.get(channel);
  if (handler === undefined) {
    throw new Error(`No handler registered for ${channel}`);
  }
  return handler({}, ...args);
}

beforeEach(() => {
  handlers.clear();
  Object.values(controller).forEach((mock) => mock.mockReset());
  // Only the methods called by the handlers are needed.
  registerIpcHandlers(controller as unknown as AppController);
});

describe('registerIpcHandlers', () => {
  it('should register a handler for every request the window can make', () => {
    const requestChannels = Object.values(IPC_CHANNELS).filter((channel) => channel !== IPC_CHANNELS.stateChanged);
    expect([...handlers.keys()].sort()).toEqual([...requestChannels].sort());
  });

  it('should return the settings as they are when the window asks for them', () => {
    controller.getSettings.mockReturnValue(DEFAULT_SETTINGS);
    expect(invoke(IPC_CHANNELS.getSettings)).toBe(DEFAULT_SETTINGS);
  });

  it('should wrap the saved settings in a success when saving works', async () => {
    controller.saveSettings.mockResolvedValue(DEFAULT_SETTINGS);
    expect(await invoke(IPC_CHANNELS.saveSettings, DEFAULT_SETTINGS)).toEqual({ success: true, data: DEFAULT_SETTINGS });
  });

  it('should turn a thrown error into a failure the window can display', async () => {
    controller.captureFrame.mockRejectedValue(new Error('OBS est injoignable'));
    expect(await invoke(IPC_CHANNELS.captureFrame, 0)).toEqual({ success: false, error: 'OBS est injoignable' });
  });

  it('should answer with null when the webhook test succeeds', async () => {
    controller.testWebhook.mockResolvedValue(undefined);
    expect(await invoke(IPC_CHANNELS.testWebhook, 'https://discord.test/hook')).toEqual({ success: true, data: null });
    expect(controller.testWebhook).toHaveBeenCalledWith('https://discord.test/hook');
  });
});
