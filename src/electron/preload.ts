import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC_CHANNELS, type AppApi, type AppState } from '../shared/types';

const api: AppApi = {
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings),
  saveSettings: (settings) => ipcRenderer.invoke(IPC_CHANNELS.saveSettings, settings),
  getState: () => ipcRenderer.invoke(IPC_CHANNELS.getState),
  onState: (listener) => {
    const handler = (_event: IpcRendererEvent, state: AppState): void => listener(state);
    ipcRenderer.on(IPC_CHANNELS.stateChanged, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.stateChanged, handler);
  },
  testWebhook: (webhookUrl) => ipcRenderer.invoke(IPC_CHANNELS.testWebhook, webhookUrl),
  captureFrame: (delaySeconds) => ipcRenderer.invoke(IPC_CHANNELS.captureFrame, delaySeconds),
  previewRegions: (regions) => ipcRenderer.invoke(IPC_CHANNELS.previewRegions, regions),
};

contextBridge.exposeInMainWorld('api', api);
