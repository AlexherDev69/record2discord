import type { Region } from '../../../shared/types';

export interface Point {
  x: number;
  y: number;
}

function clampFraction(value: number): number {
  return Math.min(1, Math.max(0, value));
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
