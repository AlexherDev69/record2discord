import type { Score } from '../../../shared/types';

const UNKNOWN = '?';

/** Fills the `{home}`, `{away}` and `{scorer}` placeholders of the Discord message template. */
export function formatGoalMessage(template: string, score: Score, scorer: string | null): string {
  return template
    .replaceAll('{home}', String(score.home ?? UNKNOWN))
    .replaceAll('{away}', String(score.away ?? UNKNOWN))
    .replaceAll('{scorer}', scorer ?? UNKNOWN);
}
