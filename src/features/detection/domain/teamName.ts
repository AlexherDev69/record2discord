import type { Region } from '../../../shared/types';

// Layout of a scoreboard row: the team name sits left of the score digit, past the club badge.
// Measured in widths and heights of the score region, so it follows a recalibrated scoreboard.
const NAME_OFFSET_IN_SCORE_WIDTHS = 2.52;
const NAME_WIDTH_IN_SCORE_WIDTHS = 1.81;
const NAME_MARGIN_IN_SCORE_HEIGHTS = 0.21;
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 4;

/** Region holding the team name of the row whose score digit is in `scoreRegion`. */
export function teamNameRegion(scoreRegion: Region): Region {
  const margin = scoreRegion.height * NAME_MARGIN_IN_SCORE_HEIGHTS;
  return {
    left: Math.max(0, scoreRegion.left - scoreRegion.width * NAME_OFFSET_IN_SCORE_WIDTHS),
    top: Math.max(0, scoreRegion.top - margin),
    width: scoreRegion.width * NAME_WIDTH_IN_SCORE_WIDTHS,
    height: scoreRegion.height + 2 * margin,
  };
}

/** Cleans up recognised text, or returns null when it cannot be a team abbreviation. */
export function parseTeamName(recognisedText: string): string | null {
  const name = recognisedText.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH ? name : null;
}
