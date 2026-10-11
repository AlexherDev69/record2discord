import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { Settings } from '../shared/types';
import { logger } from './logger';
import { DEFAULT_SETTINGS, parseStoredSettings } from './settings';

/** Turns the settings file content into bytes and back, so secrets can be encrypted at rest. */
export interface SettingsCodec {
  encode(text: string): Buffer;
  decode(data: Buffer): string;
}

export class SettingsStore {
  constructor(
    private readonly filePath: string,
    private readonly codec: SettingsCodec,
  ) {}

  load(): Settings {
    if (!existsSync(this.filePath)) {
      return DEFAULT_SETTINGS;
    }
    try {
      return parseStoredSettings(JSON.parse(this.codec.decode(readFileSync(this.filePath))));
    } catch (error: unknown) {
      logger.warn({ err: error }, 'Settings file is unreadable, falling back to defaults');
      return DEFAULT_SETTINGS;
    }
  }

  save(settings: Settings): void {
    writeFileSync(this.filePath, this.codec.encode(JSON.stringify(settings)));
  }
}
