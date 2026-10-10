import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './settings';
import { SettingsStore, type SettingsCodec } from './settingsStore';

const plainCodec: SettingsCodec = {
  encode: (text) => Buffer.from(text, 'utf8'),
  decode: (data) => data.toString('utf8'),
};

function temporarySettingsPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'record2discord-')), 'settings.bin');
}

describe('SettingsStore', () => {
  it('should return the defaults when the file does not exist', () => {
    expect(new SettingsStore(temporarySettingsPath(), plainCodec).load()).toEqual(DEFAULT_SETTINGS);
  });

  it('should return what was saved when loaded again', () => {
    const filePath = temporarySettingsPath();
    const settings = { ...DEFAULT_SETTINGS, clipSeconds: 15, deleteLocalFiles: false };
    new SettingsStore(filePath, plainCodec).save(settings);
    expect(new SettingsStore(filePath, plainCodec).load()).toEqual(settings);
  });

  it('should return the defaults when the file is corrupted', () => {
    const filePath = temporarySettingsPath();
    writeFileSync(filePath, 'not json');
    expect(new SettingsStore(filePath, plainCodec).load()).toEqual(DEFAULT_SETTINGS);
  });
});
