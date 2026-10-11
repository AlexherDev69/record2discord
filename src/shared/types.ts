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
  score: Score;
  published: boolean;
  error: string | null;
}

export interface AppState {
  status: WatcherStatus;
  goals: GoalRecord[];
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
  saveSettings(settings: Settings): Promise<IpcResult<Settings>>;
  getState(): Promise<AppState>;
  onState(listener: (state: AppState) => void): () => void;
  testWebhook(webhookUrl: string): Promise<IpcResult<null>>;
  captureFrame(delaySeconds: number): Promise<IpcResult<string>>;
  previewRegions(regions: ScoreRegions): Promise<IpcResult<CalibrationPreview>>;
  previewLiveRegions(regions: ScoreRegions): Promise<IpcResult<CalibrationPreview>>;
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
} as const;
