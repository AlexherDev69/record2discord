import type { CalibrationPreview } from '../../../shared/types';

export interface LivePreview {
  preview: CalibrationPreview;
  /** False when the scoreboard is hidden and the preview is an older reading. */
  isCurrent: boolean;
}

export function isScoreboardVisible(preview: CalibrationPreview): boolean {
  return preview.home.looksLikeScoreboard && preview.away.looksLikeScoreboard;
}

/** Keeps the last reading taken in a match while the scoreboard is hidden, e.g. when the game pauses. */
export function nextLivePreview(previous: LivePreview | null, latest: CalibrationPreview): LivePreview {
  if (isScoreboardVisible(latest) || previous === null || !isScoreboardVisible(previous.preview)) {
    return { preview: latest, isCurrent: true };
  }
  return { preview: previous.preview, isCurrent: false };
}
