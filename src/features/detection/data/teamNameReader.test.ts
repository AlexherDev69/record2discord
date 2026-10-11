import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { TeamNameReader } from './teamNameReader';

const LANGUAGE_DATA_DIRECTORY = join(process.cwd(), 'node_modules/@tesseract.js-data/eng/4.0.0_best_int');
// Top-left quarter of a 2560x1440 frame showing ACH 0 - 0 CFC.
const FRAME = readFileSync(join(import.meta.dirname, 'fixtures/scoreboard.jpg'));
const HOME_SCORE = { left: 0.525, top: 0.2332, width: 0.075, height: 0.075 };
const AWAY_SCORE = { left: 0.525, top: 0.3196, width: 0.075, height: 0.075 };
const ENGINE_TIMEOUT_MS = 30_000;

describe('TeamNameReader', () => {
  const reader = new TeamNameReader(LANGUAGE_DATA_DIRECTORY);

  afterAll(() => reader.close());

  it(
    'should read the team name when given the score region of each row',
    async () => {
      expect(await reader.read(FRAME, HOME_SCORE)).toBe('ACH');
      expect(await reader.read(FRAME, AWAY_SCORE)).toBe('CFC');
    },
    ENGINE_TIMEOUT_MS,
  );
});
