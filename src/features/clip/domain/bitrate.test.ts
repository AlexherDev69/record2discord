import { describe, expect, it } from 'vitest';
import { computeVideoBitrateKbps } from './bitrate';

describe('computeVideoBitrateKbps', () => {
  it('should leave room for audio when computing the video bitrate', () => {
    expect(computeVideoBitrateKbps(9_000_000, 30, 96)).toBe(2304);
  });

  it('should lower the bitrate when the clip is longer', () => {
    expect(computeVideoBitrateKbps(9_000_000, 60, 96)).toBe(1104);
  });
});
