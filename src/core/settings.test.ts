import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from './settings';

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
