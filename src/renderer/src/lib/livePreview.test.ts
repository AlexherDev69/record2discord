import { describe, expect, it } from 'vitest';
import type { CalibrationPreview, RegionPreview } from '../../../shared/types';
import { isScoreboardVisible, nextLivePreview } from './livePreview';

function side(looksLikeScoreboard: boolean, digit: number | null = null): RegionPreview {
  return { imageDataUrl: '', looksLikeScoreboard, digit, teamName: null };
}

const IN_MATCH: CalibrationPreview = { home: side(true, 2), away: side(true, 1) };
const HIDDEN: CalibrationPreview = { home: side(false), away: side(false) };

describe('isScoreboardVisible', () => {
  it('should be true when both sides look like the scoreboard', () => {
    expect(isScoreboardVisible(IN_MATCH)).toBe(true);
  });

  it('should be false when one side does not look like the scoreboard', () => {
    expect(isScoreboardVisible({ home: side(true, 2), away: side(false) })).toBe(false);
  });
});

describe('nextLivePreview', () => {
  it('should show the latest reading when the scoreboard is visible', () => {
    expect(nextLivePreview({ preview: HIDDEN, isCurrent: true }, IN_MATCH)).toEqual({
      preview: IN_MATCH,
      isCurrent: true,
    });
  });

  it('should show the latest reading when no match reading exists yet', () => {
    expect(nextLivePreview(null, HIDDEN)).toEqual({ preview: HIDDEN, isCurrent: true });
  });

  it('should keep the last match reading when the scoreboard gets hidden', () => {
    expect(nextLivePreview({ preview: IN_MATCH, isCurrent: true }, HIDDEN)).toEqual({
      preview: IN_MATCH,
      isCurrent: false,
    });
  });
});
