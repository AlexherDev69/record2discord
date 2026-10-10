import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { DIGIT_MAX_DISTANCE } from '../../../core/config';
import { logger } from '../../../core/logger';
import { glyphDistance, type Glyph } from '../domain/glyph';
import type { DigitRecognizer } from '../domain/goalDetector';

/** File format: digit -> glyph pixels as a string of 0 and 1. */
const librarySchema = z.record(z.string().regex(/^\d$/), z.string().regex(/^[01]+$/));

function encodeGlyph(glyph: Glyph): string {
  return glyph.join('');
}

function decodeGlyph(pixels: string): Glyph {
  return Uint8Array.from(pixels, Number);
}

/** Reference glyphs of the scoreboard digits, persisted so digits learned in a match are kept. */
export class DigitLibrary implements DigitRecognizer {
  private constructor(
    private readonly filePath: string,
    private readonly glyphs: Map<number, Glyph>,
  ) {}

  static load(filePath: string): DigitLibrary {
    const stored = existsSync(filePath) ? librarySchema.parse(JSON.parse(readFileSync(filePath, 'utf8'))) : {};
    const glyphs = new Map(Object.entries(stored).map(([digit, pixels]) => [Number(digit), decodeGlyph(pixels)]));
    return new DigitLibrary(filePath, glyphs);
  }

  recognize(glyph: Glyph): number | null {
    let closest: { digit: number; distance: number } | null = null;
    for (const [digit, reference] of this.glyphs) {
      const distance = glyphDistance(glyph, reference);
      if (closest === null || distance < closest.distance) {
        closest = { digit, distance };
      }
    }
    return closest !== null && closest.distance <= DIGIT_MAX_DISTANCE ? closest.digit : null;
  }

  learn(digit: number, glyph: Glyph): void {
    this.glyphs.set(digit, glyph);
    const stored = Object.fromEntries([...this.glyphs].map(([key, value]) => [key, encodeGlyph(value)]));
    writeFileSync(this.filePath, JSON.stringify(stored, null, 2));
    logger.info({ digit }, 'Learned a new scoreboard digit');
  }
}
