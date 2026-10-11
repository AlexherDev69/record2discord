/** Rectangle expressed as fractions (0 to 1) of the captured frame. */
export interface Region {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A side is null when its digit is not known yet and the match was not watched from a known score. */
export interface Score {
  home: number | null;
  away: number | null;
}

export interface ScoreRegions {
  home: Region;
  away: Region;
}

export interface Settings {
  discordWebhookUrl: string;
  messageTemplate: string;
  deleteLocalFiles: boolean;
  clipSeconds: number;
  postGoalDelaySeconds: number;
  clipHeight: number;
  maxClipSizeMb: number;
  obsWebsocketUrl: string;
  obsWebsocketPassword: string;
  launchObs: boolean;
  obsPath: string;
  startWithWindows: boolean;
  scoreRegions: ScoreRegions;
  /** Team abbreviations whose goals are recorded, as typed by the user. Empty records every goal. */
  recordedTeams: string;
  /** System-wide shortcut posting the last seconds on demand, e.g. `Ctrl+Shift+F9`. Empty disables it. */
  manualClipShortcut: string;
}

export interface WatcherStatus {
  obsConnected: boolean;
  scoreboardVisible: boolean;
  score: Score | null;
  error: string | null;
}

export interface GoalRecord {
  /** Detection time in milliseconds since epoch, also used as identifier. */
  time: number;
  /** Null for a clip requested with the keyboard shortcut. */
  score: Score | null;
  published: boolean;
  error: string | null;
}

export interface AppState {
  status: WatcherStatus;
  goals: GoalRecord[];
  /** Version of a newer release available for download, or null when up to date. */
  availableUpdate: string | null;
}

/** Web pages the window can ask to open in the browser. Only these fixed pages can be opened. */
export const EXTERNAL_PAGES = ['repository', 'latestRelease'] as const;
export type ExternalPage = (typeof EXTERNAL_PAGES)[number];

export interface AppInfo {
  version: string;
}

export interface RegionPreview {
  imageDataUrl: string;
  looksLikeScoreboard: boolean;
  digit: number | null;
  teamName: string | null;
}

export interface CalibrationPreview {
  home: RegionPreview;
  away: RegionPreview;
}

export type IpcResult<T> = { success: true; data: T } | { success: false; error: string };

/** API exposed to the renderer by the preload script. */
export interface AppApi {
  getSettings(): Promise<Settings>;
  /** Saves the given fields only, so that screens editing different fields cannot overwrite each other. */
  saveSettings(patch: Partial<Settings>): Promise<IpcResult<Settings>>;
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  testWebhook(webhookUrl: string): Promise<IpcResult<null>>;
  captureFrame(delaySeconds: number): Promise<IpcResult<string>>;
  previewRegions(regions: ScoreRegions): Promise<IpcResult<CalibrationPreview>>;
  previewLiveRegions(regions: ScoreRegions): Promise<IpcResult<CalibrationPreview>>;
  getAppInfo(): Promise<AppInfo>;
  openExternalPage(page: ExternalPage): Promise<IpcResult<null>>;
}

export const IPC_CHANNELS = {
  getSettings: 'settings:get',
  saveSettings: 'settings:save',
  getState: 'state:get',
  stateChanged: 'state:changed',
  testWebhook: 'discord:test',
  captureFrame: 'calibration:capture',
  previewRegions: 'calibration:preview',
  previewLiveRegions: 'calibration:preview-live',
  getAppInfo: 'app:info',
  openExternalPage: 'app:open-page',
} as const;
