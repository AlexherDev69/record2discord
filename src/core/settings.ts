import { z } from 'zod';
import type { ScoreRegions, Settings } from '../shared/types';
import { CLIP_HEIGHT_OPTIONS, CLIP_MAX_SIZE_MB_OPTIONS } from './config';

const MAX_CLIP_SECONDS = 60;
const MAX_POST_GOAL_DELAY_SECONDS = 30;
const MAX_RECORDED_TEAMS_LENGTH = 200;
// Empty, or keys joined with "+", e.g. "Ctrl+Shift+F9".
const SHORTCUT_PATTERN = /^(?:[A-Za-z0-9]+(?:\+[A-Za-z0-9]+){0,3})?$/;

const MAX_CAPTURE_DELAY_SECONDS = 30;
const DISCORD_HOST_PATTERN = /(^|\.)discord(app)?\.com$/;
const DISCORD_WEBHOOK_PATH = '/api/webhooks/';
// A drive letter path: network shares are refused, since the app starts this executable.
const LOCAL_ABSOLUTE_PATH_PATTERN = /^[A-Za-z]:[\\/]/;
// Smallest region side, as a fraction of the frame: below it there is nothing to read.
const MIN_REGION_SIZE = 0.002;
// Tolerance for regions that touch the frame edge, whose sides are computed by subtraction.
const REGION_EDGE_TOLERANCE = 1e-9;

function isDiscordWebhookUrl(value: string): boolean {
  if (!URL.canParse(value)) {
    return false;
  }
  const url = new URL(value);
  return (
    url.protocol === 'https:' && DISCORD_HOST_PATTERN.test(url.hostname) && url.pathname.startsWith(DISCORD_WEBHOOK_PATH)
  );
}

function isWebSocketUrl(value: string): boolean {
  return URL.canParse(value) && ['ws:', 'wss:'].includes(new URL(value).protocol);
}

const fraction = z.number().min(0).max(1);
const regionSide = z.number().min(MIN_REGION_SIZE).max(1);
const regionSchema = z
  .object({ left: fraction, top: fraction, width: regionSide, height: regionSide })
  .refine(
    (region) =>
      region.left + region.width <= 1 + REGION_EDGE_TOLERANCE && region.top + region.height <= 1 + REGION_EDGE_TOLERANCE,
    'Region must stay inside the frame',
  );
const scoreRegionsSchema = z.object({ home: regionSchema, away: regionSchema });
const captureDelaySchema = z.number().min(0).max(MAX_CAPTURE_DELAY_SECONDS);
const patchSchema = z.record(z.string(), z.unknown());

// FC27 scoreboard (top left, one team per row).
const DEFAULT_SCORE_REGIONS = {
  home: { left: 0.13125, top: 0.0583, width: 0.01875, height: 0.01875 },
  away: { left: 0.13125, top: 0.0799, width: 0.01875, height: 0.01875 },
};

const settingsSchema = z.object({
  discordWebhookUrl: z
    .string()
    .refine((value) => value === '' || isDiscordWebhookUrl(value), 'Not a Discord webhook URL')
    .default(''),
  messageTemplate: z.string().default('⚽ But de {scorer} : {homeTeam} {home} - {away} {awayTeam}'),
  deleteLocalFiles: z.boolean().default(true),
  clipSeconds: z.number().min(5).max(MAX_CLIP_SECONDS).default(20),
  postGoalDelaySeconds: z.number().min(0).max(MAX_POST_GOAL_DELAY_SECONDS).default(5),
  clipHeight: z.union(CLIP_HEIGHT_OPTIONS.map((value) => z.literal(value))).default(1080),
  maxClipSizeMb: z.union(CLIP_MAX_SIZE_MB_OPTIONS.map((value) => z.literal(value))).default(10),
  obsWebsocketUrl: z.string().refine(isWebSocketUrl, 'Not a WebSocket URL').default('ws://127.0.0.1:4455'),
  obsWebsocketPassword: z.string().default(''),
  launchObs: z.boolean().default(true),
  obsPath: z.string().regex(LOCAL_ABSOLUTE_PATH_PATTERN).default('C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe'),
  startWithWindows: z.boolean().default(false),
  scoreRegions: scoreRegionsSchema.default(DEFAULT_SCORE_REGIONS),
  recordedTeams: z.string().max(MAX_RECORDED_TEAMS_LENGTH).default(''),
  manualClipShortcut: z.string().regex(SHORTCUT_PATTERN).default(''),
});

/** Validates settings coming from the UI or from disk, filling missing fields with defaults. */
export function parseSettings(raw: unknown): Settings {
  return settingsSchema.parse(raw);
}

/** Applies the fields changed in the UI on top of the current settings, then validates the result. */
export function applySettingsPatch(current: Settings, rawPatch: unknown): Settings {
  return parseSettings({ ...current, ...patchSchema.parse(rawPatch) });
}

/**
 * Reads settings stored by any version of the app: a field that is no longer valid
 * falls back to its default instead of discarding every other setting with it.
 */
export function parseStoredSettings(raw: unknown): Settings {
  let settings = parseSettings({});
  for (const [key, value] of Object.entries(patchSchema.parse(raw))) {
    const patched = settingsSchema.safeParse({ ...settings, [key]: value });
    settings = patched.success ? patched.data : settings;
  }
  return settings;
}

export function parseScoreRegions(raw: unknown): ScoreRegions {
  return scoreRegionsSchema.parse(raw);
}

export function parseCaptureDelay(raw: unknown): number {
  return captureDelaySchema.parse(raw);
}

export const DEFAULT_SETTINGS: Settings = parseSettings({});
