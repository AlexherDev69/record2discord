import { describe, expect, it } from 'vitest';
import { parseTeamFilter, shouldRecordGoal } from './teamFilter';

describe('parseTeamFilter', () => {
  it('should list the abbreviations in upper case when separated by commas or spaces', () => {
    expect(parseTeamFilter(' ach, cfc  YIN')).toEqual(['ACH', 'CFC', 'YIN']);
  });

  it('should return no team when the text is empty', () => {
    expect(parseTeamFilter('  ')).toEqual([]);
  });
});

describe('shouldRecordGoal', () => {
  it('should record every goal when no team is listed', () => {
    expect(shouldRecordGoal('', 'CFC')).toBe(true);
  });

  it('should record the goal when the scorer is listed', () => {
    expect(shouldRecordGoal('ach', 'ACH')).toBe(true);
  });

  it('should skip the goal when the scorer is not listed', () => {
    expect(shouldRecordGoal('ACH', 'CFC')).toBe(false);
  });

  it('should record the goal when the scorer could not be read', () => {
    expect(shouldRecordGoal('ACH', null)).toBe(true);
  });
});
