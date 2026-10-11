import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { DIGIT_MAX_DISTANCE } from '../../../core/config';
import { logger } from '../../../core/logger';
import { glyphDistance, type Glyph } from '../domain/glyph';
import type { DigitRecognizer } from '../domain/goalDetector';

/** File format: digit -> glyph pixels as a string of 0 and 1. */
const librarySchema = z.record(z.string().regex(/^\d$/), z.string().regex(/^[01]+$/));

const TEMPORARY_SUFFIX = '.tmp';

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

  /** Remembers the digit for this session even when it cannot be written to disk. */
  learn(digit: number, glyph: Glyph): void {
    this.glyphs.set(digit, glyph);
    const stored = Object.fromEntries([...this.glyphs].map(([key, value]) => [key, encodeGlyph(value)]));
    try {
      // Written aside then renamed, so a crash mid-write cannot leave a truncated library.
      const temporaryPath = `${this.filePath}${TEMPORARY_SUFFIX}`;
      writeFileSync(temporaryPath, JSON.stringify(stored, null, 2));
      renameSync(temporaryPath, this.filePath);
      logger.info({ digit }, 'Learned a new scoreboard digit');
    } catch (error: unknown) {
      logger.warn({ err: error, digit }, 'Learned digit could not be saved');
    }
  }
}
