import { describe, expect, it } from 'vitest';
import {
  applySettingsPatch,
  DEFAULT_SETTINGS,
  parseCaptureDelay,
  parseScoreRegions,
  parseSettings,
  parseStoredSettings,
} from './settings';

describe('parseSettings', () => {
  it('should fill every field with a default when given nothing', () => {
    expect(DEFAULT_SETTINGS.clipSeconds).toBe(20);
    expect(DEFAULT_SETTINGS.deleteLocalFiles).toBe(true);
    expect(DEFAULT_SETTINGS.scoreRegions.home.left).toBeGreaterThan(0);
  });

  it('should keep given values when they are valid', () => {
    const settings = parseSettings({ ...DEFAULT_SETTINGS, clipHeight: 720, maxClipSizeMb: 50 });
    expect(settings.clipHeight).toBe(720);
    expect(settings.maxClipSizeMb).toBe(50);
  });

  it('should accept an empty webhook when it is not configured yet', () => {
    expect(parseSettings({ discordWebhookUrl: '' }).discordWebhookUrl).toBe('');
  });

  it('should throw when the webhook is not an https url', () => {
    expect(() => parseSettings({ discordWebhookUrl: 'not a url' })).toThrow();
  });

  it('should accept a webhook when it is hosted by Discord', () => {
    const webhook = 'https://discord.com/api/webhooks/1/token';
    expect(parseSettings({ discordWebhookUrl: webhook }).discordWebhookUrl).toBe(webhook);
    expect(() => parseSettings({ discordWebhookUrl: 'https://canary.discordapp.com/api/webhooks/1/t' })).not.toThrow();
  });

  it('should throw when the webhook is not hosted by Discord', () => {
    expect(() => parseSettings({ discordWebhookUrl: 'https://example.com/api/webhooks/1/token' })).toThrow();
    expect(() => parseSettings({ discordWebhookUrl: 'https://notdiscord.com/api/webhooks/1/token' })).toThrow();
    expect(() => parseSettings({ discordWebhookUrl: 'https://discord.com/other' })).toThrow();
  });

  it('should throw when the OBS address is not a WebSocket url', () => {
    expect(() => parseSettings({ obsWebsocketUrl: 'ws' })).toThrow();
    expect(() => parseSettings({ obsWebsocketUrl: 'https://127.0.0.1:4455' })).toThrow();
  });

  it('should throw when the OBS path is not on a local drive', () => {
    expect(() => parseSettings({ obsPath: '\\\\server\\share\\obs64.exe' })).toThrow();
    expect(() => parseSettings({ obsPath: 'obs64.exe' })).toThrow();
  });

  it('should throw when a region extends past the frame edge', () => {
    const home = { left: 0.95, top: 0.1, width: 0.1, height: 0.02 };
    expect(() => parseSettings({ scoreRegions: { ...DEFAULT_SETTINGS.scoreRegions, home } })).toThrow();
  });

  it('should throw when a region is too small to hold a digit', () => {
    const home = { left: 0.5, top: 0.5, width: 0, height: 0.02 };
    expect(() => parseSettings({ scoreRegions: { ...DEFAULT_SETTINGS.scoreRegions, home } })).toThrow();
  });

  it('should throw when a region is outside the frame', () => {
    const home = { ...DEFAULT_SETTINGS.scoreRegions.home, left: 1.2 };
    expect(() => parseSettings({ scoreRegions: { ...DEFAULT_SETTINGS.scoreRegions, home } })).toThrow();
  });

  it('should record every team when no team filter is given', () => {
    expect(DEFAULT_SETTINGS.recordedTeams).toBe('');
  });

  it('should accept a shortcut when it is keys joined with a plus sign', () => {
    expect(parseSettings({ manualClipShortcut: 'Ctrl+Shift+F9' }).manualClipShortcut).toBe('Ctrl+Shift+F9');
    expect(DEFAULT_SETTINGS.manualClipShortcut).toBe('');
  });

  it('should throw when the shortcut is not a key combination', () => {
    expect(() => parseSettings({ manualClipShortcut: 'F9; rm' })).toThrow();
  });

  it('should throw when the clip height is not a supported resolution', () => {
    expect(() => parseSettings({ clipHeight: 900 })).toThrow();
  });
});

describe('applySettingsPatch', () => {
  const current = { ...DEFAULT_SETTINGS, recordedTeams: 'ACH' };

  it('should change only the given fields when patching', () => {
    const patched = applySettingsPatch(current, { clipSeconds: 30 });
    expect(patched.clipSeconds).toBe(30);
    expect(patched.recordedTeams).toBe('ACH');
  });

  it('should throw when a patched field is invalid', () => {
    expect(() => applySettingsPatch(current, { clipSeconds: 1 })).toThrow();
  });

  it('should throw when the patch is not an object', () => {
    expect(() => applySettingsPatch(current, 'clipSeconds')).toThrow();
  });
});

describe('parseStoredSettings', () => {
  it('should keep the valid fields when one stored field is no longer valid', () => {
    const stored = { ...DEFAULT_SETTINGS, clipSeconds: 30, obsWebsocketUrl: 'not a websocket url' };
    const settings = parseStoredSettings(stored);
    expect(settings.clipSeconds).toBe(30);
    expect(settings.obsWebsocketUrl).toBe(DEFAULT_SETTINGS.obsWebsocketUrl);
  });

  it('should ignore fields that no longer exist', () => {
    expect(parseStoredSettings({ removedOption: true })).toEqual(DEFAULT_SETTINGS);
  });
});

describe('parseScoreRegions', () => {
  it('should return the regions when they are valid', () => {
    expect(parseScoreRegions(DEFAULT_SETTINGS.scoreRegions)).toEqual(DEFAULT_SETTINGS.scoreRegions);
  });

  it('should throw when a region is missing', () => {
    expect(() => parseScoreRegions({ home: DEFAULT_SETTINGS.scoreRegions.home })).toThrow();
  });
});

describe('parseCaptureDelay', () => {
  it('should return the delay when it is a reasonable number of seconds', () => {
    expect(parseCaptureDelay(10)).toBe(10);
  });

  it('should throw when the delay is not a number or is too long', () => {
    expect(() => parseCaptureDelay('10')).toThrow();
    expect(() => parseCaptureDelay(100000)).toThrow();
  });
});
