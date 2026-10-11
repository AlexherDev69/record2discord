import type { Region } from '../../../shared/types';

export interface PixelBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clampStart(value: number, frameSize: number): number {
  return Math.min(Math.max(0, Math.round(value)), frameSize - 1);
}

/** Pixel rectangle of a region, always at least one pixel and inside the frame so it can be cropped. */
export function toPixelBox(region: Region, frameWidth: number, frameHeight: number): PixelBox {
  const left = clampStart(region.left * frameWidth, frameWidth);
  const top = clampStart(region.top * frameHeight, frameHeight);
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(region.width * frameWidth), frameWidth - left)),
    height: Math.max(1, Math.min(Math.round(region.height * frameHeight), frameHeight - top)),
  };
}
