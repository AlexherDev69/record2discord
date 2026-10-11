import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { GLYPH_HEIGHT_PX, GLYPH_WIDTH_PX } from '../../../core/config';
import { DigitLibrary } from './digitLibrary';
import { cropScoreRegion, readGlyph, readScoreboard } from './scoreboardReader';

// Top-left quarter of a 2560x1440 frame showing ACH 0 - 0 CFC.
const FRAME = readFileSync(join(import.meta.dirname, 'fixtures/scoreboard.jpg'));
const REGIONS = {
  home: { left: 0.525, top: 0.2332, width: 0.075, height: 0.075 },
  away: { left: 0.525, top: 0.3196, width: 0.075, height: 0.075 },
};
const FLAT_FRAME_SIZE_PX = 200;
const FLAT_GRAY = { r: 120, g: 120, b: 120 };

async function flatFrame(): Promise<Buffer> {
  const size = { width: FLAT_FRAME_SIZE_PX, height: FLAT_FRAME_SIZE_PX, channels: 3 as const, background: FLAT_GRAY };
  return sharp({ create: size }).jpeg().toBuffer();
}

describe('cropScoreRegion', () => {
  it('should give a grayscale crop of the glyph size when given a region', async () => {
    const crop = await cropScoreRegion(FRAME, REGIONS.home);
    const { info } = await crop.raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([GLYPH_WIDTH_PX, GLYPH_HEIGHT_PX, 1]);
  });
});

describe('readGlyph', () => {
  it('should return a glyph when the region holds a score digit', async () => {
    expect(await readGlyph(FRAME, REGIONS.home)).not.toBeNull();
  });

  it('should return null when the region does not look like the scoreboard', async () => {
    expect(await readGlyph(await flatFrame(), REGIONS.home)).toBeNull();
  });
});

describe('readScoreboard', () => {
  it('should read digits the shipped library recognises when the scoreboard is visible', async () => {
    const digits = DigitLibrary.load(join(process.cwd(), 'assets/digits.json'));
    const reading = await readScoreboard(FRAME, REGIONS);
    expect(reading).not.toBeNull();
    expect(reading && [digits.recognize(reading.home), digits.recognize(reading.away)]).toEqual([0, 0]);
  });

  it('should return null when the scoreboard is not visible', async () => {
    expect(await readScoreboard(await flatFrame(), REGIONS)).toBeNull();
  });
});
