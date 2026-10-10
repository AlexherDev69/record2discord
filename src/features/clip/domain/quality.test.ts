import { describe, expect, it } from 'vitest';
import { rateClipQuality } from './quality';

describe('rateClipQuality', () => {
  it('should rate the clip low when the bitrate is too small for 1080p', () => {
    expect(rateClipQuality(1080, 2300)).toBe('low');
  });

  it('should rate the clip fair when the bitrate is acceptable for 1080p', () => {
    expect(rateClipQuality(1080, 3500)).toBe('fair');
  });

  it('should rate the clip good when the bitrate is comfortable for 1080p', () => {
    expect(rateClipQuality(1080, 17000)).toBe('good');
  });

  it('should be more lenient when the resolution is lower', () => {
    expect(rateClipQuality(720, 2300)).toBe('good');
  });
});
