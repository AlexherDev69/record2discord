import {
  GLYPH_BINARY_THRESHOLD,
  GLYPH_DARK_MAX,
  GLYPH_GRID_SIZE,
  GLYPH_LIGHT_MIN,
  GLYPH_MAX_DIFF_RATIO,
  GLYPH_MAX_INK_RATIO,
  GLYPH_MIN_CONTRASTED_RATIO,
  GLYPH_MIN_INK_RATIO,
} from '../../../core/config';

/** Binarized score digit on a fixed square grid: 1 for ink, 0 for background. */
export type Glyph = Uint8Array;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function countInk(pixels: Uint8Array): number {
  return pixels.reduce((total, pixel) => total + pixel, 0);
}

function looksLikeScoreboard(grayPixels: Uint8Array): boolean {
  const dark = grayPixels.filter((pixel) => pixel <= GLYPH_DARK_MAX).length;
  const light = grayPixels.filter((pixel) => pixel >= GLYPH_LIGHT_MIN).length;
  const inkRatio = dark / grayPixels.length;
  const contrastedRatio = (dark + light) / grayPixels.length;
  return (
    contrastedRatio >= GLYPH_MIN_CONTRASTED_RATIO && inkRatio >= GLYPH_MIN_INK_RATIO && inkRatio <= GLYPH_MAX_INK_RATIO
  );
}

function findInkBox(ink: Uint8Array, width: number): Box {
  let left = width;
  let right = -1;
  let top = ink.length;
  let bottom = -1;
  ink.forEach((pixel, index) => {
    if (pixel === 0) {
      return;
    }
    const x = index % width;
    const y = Math.floor(index / width);
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  });
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** Stretches the inked area onto the grid, so a glyph no longer depends on where the digit sat in the crop. */
function fitToGrid(ink: Uint8Array, width: number): Glyph {
  const box = findInkBox(ink, width);
  return Uint8Array.from({ length: GLYPH_GRID_SIZE * GLYPH_GRID_SIZE }, (_, index) => {
    const gridX = index % GLYPH_GRID_SIZE;
    const gridY = Math.floor(index / GLYPH_GRID_SIZE);
    const x = box.left + Math.floor(((gridX + 0.5) * box.width) / GLYPH_GRID_SIZE);
    const y = box.top + Math.floor(((gridY + 0.5) * box.height) / GLYPH_GRID_SIZE);
    return ink[y * width + x] ?? 0;
  });
}

/**
 * Turns a grayscale crop of a score digit (rows of `width` pixels) into a glyph.
 * Returns null when the crop does not look like the scoreboard (dark digit on a light box),
 * which happens during replays, menus and cutscenes.
 */
export function toGlyph(grayPixels: Uint8Array, width: number): Glyph | null {
  if (!looksLikeScoreboard(grayPixels)) {
    return null;
  }
  const ink = grayPixels.map((pixel) => (pixel < GLYPH_BINARY_THRESHOLD ? 1 : 0));
  return fitToGrid(ink, width);
}

/** Share of differing pixels, relative to the ink of the larger glyph: 0 for identical glyphs. */
export function glyphDistance(a: Glyph, b: Glyph): number {
  const differingPixels = a.reduce((total, pixel, index) => total + (pixel === b[index] ? 0 : 1), 0);
  return differingPixels / Math.max(countInk(a), countInk(b), 1);
}

export function isSameGlyph(a: Glyph, b: Glyph): boolean {
  return glyphDistance(a, b) <= GLYPH_MAX_DIFF_RATIO;
}
