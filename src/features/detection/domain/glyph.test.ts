import { describe, expect, it } from 'vitest';
import { isSameGlyph, toGlyph, type Glyph } from './glyph';

const WIDTH = 20;
const HEIGHT = 20;
const LIGHT = 220;
const DARK = 10;
const MID_GRAY = 128;

type Rect = [x: number, y: number, width: number, height: number];

function crop(inkRects: Rect[], background: number = LIGHT): Uint8Array {
  const pixels = new Uint8Array(WIDTH * HEIGHT).fill(background);
  for (const [x, y, width, height] of inkRects) {
    for (let row = y; row < y + height; row++) {
      pixels.fill(DARK, row * WIDTH + x, row * WIDTH + x + width);
    }
  }
  return pixels;
}

function cornerShape(x: number, y: number): Rect[] {
  return [
    [x, y, 2, 8],
    [x, y + 6, 8, 2],
  ];
}

function glyphOf(inkRects: Rect[]): Glyph {
  const glyph = toGlyph(crop(inkRects), WIDTH);
  if (glyph === null) {
    throw new Error('Expected a valid glyph');
  }
  return glyph;
}

describe('toGlyph', () => {
  it('should return a glyph when the crop shows a dark digit on a light box', () => {
    expect(toGlyph(crop(cornerShape(4, 4)), WIDTH)).not.toBeNull();
  });

  it('should return null when the crop is mostly mid tones', () => {
    expect(toGlyph(crop(cornerShape(4, 4), MID_GRAY), WIDTH)).toBeNull();
  });

  it('should return null when the box is empty', () => {
    expect(toGlyph(crop([]), WIDTH)).toBeNull();
  });

  it('should return null when the crop is mostly dark', () => {
    expect(toGlyph(crop([[0, 0, WIDTH, 16]]), WIDTH)).toBeNull();
  });
});

describe('isSameGlyph', () => {
  it('should match when the same shape sits elsewhere in the crop', () => {
    expect(isSameGlyph(glyphOf(cornerShape(2, 3)), glyphOf(cornerShape(9, 10)))).toBe(true);
  });

  it('should not match when the shapes differ', () => {
    expect(isSameGlyph(glyphOf(cornerShape(4, 4)), glyphOf([[4, 4, 8, 8]]))).toBe(false);
  });
});
