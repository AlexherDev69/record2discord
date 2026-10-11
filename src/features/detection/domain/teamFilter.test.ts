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

  it('should record the goal when the listed team contains digits', () => {
    expect(shouldRecordGoal('s04, 1fc', 'S04')).toBe(true);
    expect(parseTeamFilter('s04, 1fc')).toEqual(['S04', '1FC']);
  });

  it('should record the goal when a digit was read as its look-alike letter', () => {
    expect(shouldRecordGoal('S04', 'SO4')).toBe(true);
    expect(shouldRecordGoal('ACO', 'AC0')).toBe(true);
  });

  it('should record the goal when the scorer could not be read', () => {
    expect(shouldRecordGoal('ACH', null)).toBe(true);
  });
});
