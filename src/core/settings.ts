import { z } from 'zod';
import type { Settings } from '../shared/types';
import { CLIP_HEIGHT_OPTIONS, CLIP_MAX_SIZE_MB_OPTIONS } from './config';

const MAX_CLIP_SECONDS = 60;
const MAX_POST_GOAL_DELAY_SECONDS = 30;

const fraction = z.number().min(0).max(1);
const regionSchema = z.object({ left: fraction, top: fraction, width: fraction, height: fraction });

// FC27 scoreboard (top left, one team per row).
const DEFAULT_SCORE_REGIONS = {
  home: { left: 0.13125, top: 0.0583, width: 0.01875, height: 0.01875 },
  away: { left: 0.13125, top: 0.0799, width: 0.01875, height: 0.01875 },
};

const settingsSchema = z.object({
  discordWebhookUrl: z.union([z.literal(''), z.url({ protocol: /^https$/ })]).default(''),
  messageTemplate: z.string().default('⚽ But de {scorer} : {home} - {away}'),
  deleteLocalFiles: z.boolean().default(true),
  clipSeconds: z.number().min(5).max(MAX_CLIP_SECONDS).default(20),
  postGoalDelaySeconds: z.number().min(0).max(MAX_POST_GOAL_DELAY_SECONDS).default(5),
  clipHeight: z.union(CLIP_HEIGHT_OPTIONS.map((value) => z.literal(value))).default(1080),
  maxClipSizeMb: z.union(CLIP_MAX_SIZE_MB_OPTIONS.map((value) => z.literal(value))).default(10),
  obsWebsocketUrl: z.string().min(1).default('ws://127.0.0.1:4455'),
  obsWebsocketPassword: z.string().default(''),
  launchObs: z.boolean().default(true),
  obsPath: z.string().default('C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'),
  startWithWindows: z.boolean().default(false),
  scoreRegions: z.object({ home: regionSchema, away: regionSchema }).default(DEFAULT_SCORE_REGIONS),
});

/** Validates settings coming from the UI or from disk, filling missing fields with defaults. */
export function parseSettings(raw: unknown): Settings {
  return settingsSchema.parse(raw);
}

export const DEFAULT_SETTINGS: Settings = parseSettings({});
