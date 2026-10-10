import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Glyph } from '../domain/glyph';
import { DigitLibrary } from './digitLibrary';

const GLYPH_SIZE = 100;
const INK_PIXELS = 20;

function glyph(inkStart: number): Glyph {
  return new Uint8Array(GLYPH_SIZE).fill(1, inkStart, inkStart + INK_PIXELS);
}

function temporaryLibraryPath(): string {
  return join(mkdtempSync(join(tmpdir(), 'record2discord-')), 'digits.json');
}

describe('DigitLibrary', () => {
  it('should recognize nothing when the library file does not exist', () => {
    expect(DigitLibrary.load(temporaryLibraryPath()).recognize(glyph(0))).toBeNull();
  });

  it('should recognize a digit when its glyph was learned', () => {
    const library = DigitLibrary.load(temporaryLibraryPath());
    library.learn(3, glyph(0));
    library.learn(7, glyph(40));
    expect(library.recognize(glyph(40))).toBe(7);
  });

  it('should recognize the closest digit when the glyph is slightly different', () => {
    const library = DigitLibrary.load(temporaryLibraryPath());
    library.learn(3, glyph(0));
    library.learn(7, glyph(40));
    expect(library.recognize(glyph(1))).toBe(3);
  });

  it('should return null when no learned digit is close enough', () => {
    const library = DigitLibrary.load(temporaryLibraryPath());
    library.learn(3, glyph(0));
    expect(library.recognize(glyph(60))).toBeNull();
  });

  it('should keep learned digits when the library is loaded again', () => {
    const filePath = temporaryLibraryPath();
    DigitLibrary.load(filePath).learn(4, glyph(20));
    expect(DigitLibrary.load(filePath).recognize(glyph(20))).toBe(4);
  });
});
