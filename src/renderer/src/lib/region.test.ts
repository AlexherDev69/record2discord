import { describe, expect, it } from 'vitest';
import { isDrawnRegion, regionFromPoints } from './region';

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
    expect(region.left).toBeCloseTo(0.9);
    expect(region.width).toBeCloseTo(0.1);
    expect(region.top).toBe(0);
    expect(region.height).toBeCloseTo(0.9);
  });
});

describe('isDrawnRegion', () => {
  it('should accept a region the size of a score digit', () => {
    expect(isDrawnRegion({ left: 0.1, top: 0.1, width: 0.02, height: 0.02 })).toBe(true);
  });

  it('should refuse a region when the mouse barely moved', () => {
    expect(isDrawnRegion({ left: 0.1, top: 0.1, width: 0.0005, height: 0.02 })).toBe(false);
    expect(isDrawnRegion({ left: 0.1, top: 0.1, width: 0.02, height: 0 })).toBe(false);
  });
});
