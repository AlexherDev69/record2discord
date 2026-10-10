import { describe, expect, it } from 'vitest';
import { formatGoalMessage } from './goalMessage';

describe('formatGoalMessage', () => {
  it('should replace both placeholders when the score is known', () => {
    expect(formatGoalMessage('But ! {home} - {away}', { home: 2, away: 1 })).toBe('But ! 2 - 1');
  });

  it('should show a question mark when a side is unknown', () => {
    expect(formatGoalMessage('{home} - {away}', { home: null, away: 0 })).toBe('? - 0');
  });

  it('should leave the text untouched when there is no placeholder', () => {
    expect(formatGoalMessage('Goal', { home: 1, away: 0 })).toBe('Goal');
  });
});
