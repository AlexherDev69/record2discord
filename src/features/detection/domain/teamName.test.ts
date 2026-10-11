import { describe, expect, it } from 'vitest';
import { parseTeamName, teamNameRegion } from './teamName';

describe('teamNameRegion', () => {
  it('should sit left of the score on the same row when given a score region', () => {
    const score = { left: 0.13125, top: 0.0583, width: 0.01875, height: 0.01875 };
    const name = teamNameRegion(score);
    expect(name.left).toBeCloseTo(0.084, 3);
    expect(name.left + name.width).toBeLessThan(score.left);
    expect(name.top).toBeLessThan(score.top);
    expect(name.top + name.height).toBeGreaterThan(score.top + score.height);
  });

  it('should stay inside the frame when the score is at the frame edge', () => {
    const name = teamNameRegion({ left: 0.01, top: 0, width: 0.02, height: 0.02 });
    expect(name.left).toBe(0);
    expect(name.top).toBe(0);
  });
});

describe('parseTeamName', () => {
  it('should keep the abbreviation when the text has stray characters', () => {
    expect(parseTeamName(' acH.\n')).toBe('ACH');
  });

  it('should keep the digits when the abbreviation contains some', () => {
    expect(parseTeamName('s04')).toBe('S04');
  });

  it('should return null when the text is too short to be a name', () => {
    expect(parseTeamName('|')).toBeNull();
  });

  it('should return null when the text is too long to be a name', () => {
    expect(parseTeamName('SPRINT MAINTENIR')).toBeNull();
  });
});
