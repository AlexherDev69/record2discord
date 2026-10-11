import type { Region } from '../../../shared/types';

export interface Point {
  x: number;
  y: number;
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Smallest side of a drawn region, as a fraction of the frame: a click or a twitch is not a drawing.
const MIN_DRAWN_SIZE = 0.003;

/** Tells whether a drag is large enough to be a region drawn on purpose. */
export function isDrawnRegion(region: Region): boolean {
  return region.width >= MIN_DRAWN_SIZE && region.height >= MIN_DRAWN_SIZE;
}

/** Region spanned by a mouse drag between two points, both as fractions of the frame. */
export function regionFromPoints(start: Point, end: Point): Region {
  const left = clampFraction(Math.min(start.x, end.x));
  const top = clampFraction(Math.min(start.y, end.y));
  return {
    left,
    top,
    width: clampFraction(Math.max(start.x, end.x)) - left,
    height: clampFraction(Math.max(start.y, end.y)) - top,
  };
}
