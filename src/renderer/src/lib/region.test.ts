import { describe, expect, it } from 'vitest';
import { regionFromPoints } from './region';

describe('regionFromPoints', () => {
  it('should span both points when dragging down and right', () => {
    const region = regionFromPoints({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.5 });
    expect(region.left).toBeCloseTo(0.1);
    expect(region.top).toBeCloseTo(0.2);
    expect(region.width).toBeCloseTo(0.2);
    expect(region.height).toBeCloseTo(0.3);
  });

  it('should give the same region when dragging up and left', () => {
    expect(regionFromPoints({ x: 0.3, y: 0.5 }, { x: 0.1, y: 0.2 })).toEqual(
      regionFromPoints({ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.5 }),
    );
  });

  it('should stay inside the frame when the drag leaves it', () => {
    const region = regionFromPoints({ x: 0.9, y: 0.9 }, { x: 1.4, y: -0.2 });
    expect(region.left + region.width).toBeLessThanOrEqual(1);
    expect(region.top).toBe(0);
  });
});
