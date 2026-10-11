import { describe, expect, it } from 'vitest';
import { formatGoalMessage } from './goalMessage';

describe('formatGoalMessage', () => {
  it('should replace both placeholders when the score is known', () => {
    expect(formatGoalMessage('But ! {home} - {away}', { home: 2, away: 1 }, null)).toBe('But ! 2 - 1');
  });

  it('should show a question mark when a side is unknown', () => {
    expect(formatGoalMessage('{home} - {away}', { home: null, away: 0 }, null)).toBe('? - 0');
  });

  it('should leave the text untouched when there is no placeholder', () => {
    expect(formatGoalMessage('Goal', { home: 1, away: 0 }, 'ACH')).toBe('Goal');
  });

  it('should name the scoring team when it was read', () => {
    expect(formatGoalMessage('But de {scorer} : {home} - {away}', { home: 1, away: 0 }, 'ACH')).toBe(
      'But de ACH : 1 - 0',
    );
  });

  it('should show a question mark when the scoring team could not be read', () => {
    expect(formatGoalMessage('But de {scorer}', { home: 1, away: 0 }, null)).toBe('But de ?');
  });
});
