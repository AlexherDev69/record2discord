import type { Score } from '../../../shared/types';

const UNKNOWN_SCORE = '?';

/** Fills the `{home}` and `{away}` placeholders of the Discord message template. */
export function formatGoalMessage(template: string, score: Score): string {
  return template
    .replaceAll('{home}', String(score.home ?? UNKNOWN_SCORE))
    .replaceAll('{away}', String(score.away ?? UNKNOWN_SCORE));
}
