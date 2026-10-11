import type { Score } from '../../../shared/types';

const UNKNOWN = '?';

/** Team names read on the scoreboard, null when a name could not be read. */
export interface TeamNames {
  home: string | null;
  away: string | null;
}

export interface GoalMessageData {
  score: Score;
  teams: TeamNames;
  /** Side whose score went up. */
  scorer: keyof Score;
}

/**
 * Fills the placeholders of the Discord message template: `{home}` and `{away}` (scores),
 * `{homeTeam}` and `{awayTeam}` (team names), `{scorer}` (name of the team that scored).
 */
export function formatGoalMessage(template: string, { score, teams, scorer }: GoalMessageData): string {
  return template
    .replaceAll('{home}', String(score.home ?? UNKNOWN))
    .replaceAll('{away}', String(score.away ?? UNKNOWN))
    .replaceAll('{homeTeam}', teams.home ?? UNKNOWN)
    .replaceAll('{awayTeam}', teams.away ?? UNKNOWN)
    .replaceAll('{scorer}', teams[scorer] ?? UNKNOWN);
}
