import { describe, expect, it } from 'vitest';
import { toPixelBox } from './pixelBox';

const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

describe('toPixelBox', () => {
  it('should scale the region to the frame when it is inside it', () => {
    const box = toPixelBox({ left: 0.25, top: 0.5, width: 0.1, height: 0.1 }, FRAME_WIDTH, FRAME_HEIGHT);
    expect(box).toEqual({ left: 480, top: 540, width: 192, height: 108 });
  });

  it('should shrink the box when the region extends past the frame edge', () => {
    const box = toPixelBox({ left: 0.95, top: 0.95, width: 0.2, height: 0.2 }, FRAME_WIDTH, FRAME_HEIGHT);
    expect(box.left + box.width).toBe(FRAME_WIDTH);
    expect(box.top + box.height).toBe(FRAME_HEIGHT);
  });

  it('should keep at least one pixel when the region is empty or starts on the edge', () => {
    const box = toPixelBox({ left: 1, top: 1, width: 0, height: 0 }, FRAME_WIDTH, FRAME_HEIGHT);
    expect(box).toEqual({ left: FRAME_WIDTH - 1, top: FRAME_HEIGHT - 1, width: 1, height: 1 });
  });
});
