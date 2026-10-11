import { describe, expect, it } from 'vitest';
import { formatGoalMessage, type GoalMessageData } from './goalMessage';

const UNREAD_TEAMS = { home: null, away: null };
const GOAL: GoalMessageData = { score: { home: 2, away: 1 }, teams: { home: 'ACH', away: 'CFC' }, scorer: 'home' };

describe('formatGoalMessage', () => {
  it('should replace both score placeholders when the score is known', () => {
    expect(formatGoalMessage('But ! {home} - {away}', GOAL)).toBe('But ! 2 - 1');
  });

  it('should show a question mark when a side is unknown', () => {
    expect(formatGoalMessage('{home} - {away}', { ...GOAL, score: { home: null, away: 0 } })).toBe('? - 0');
  });

  it('should leave the text untouched when there is no placeholder', () => {
    expect(formatGoalMessage('Goal', GOAL)).toBe('Goal');
  });

  it('should name both teams when they were read', () => {
    expect(formatGoalMessage('{homeTeam} {home} - {away} {awayTeam}', GOAL)).toBe('ACH 2 - 1 CFC');
  });

  it('should name the team on the side that scored', () => {
    expect(formatGoalMessage('But de {scorer}', GOAL)).toBe('But de ACH');
    expect(formatGoalMessage('But de {scorer}', { ...GOAL, scorer: 'away' })).toBe('But de CFC');
  });

  it('should show a question mark when a team name could not be read', () => {
    expect(formatGoalMessage('{homeTeam} - {awayTeam} ({scorer})', { ...GOAL, teams: UNREAD_TEAMS })).toBe(
      '? - ? (?)',
    );
  });
});
