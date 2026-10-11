import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../../core/settings';
import { changedFieldPatches } from './settingsPatch';

describe('changedFieldPatches', () => {
  it('should return nothing when no field changed', () => {
    expect(changedFieldPatches(DEFAULT_SETTINGS, { ...DEFAULT_SETTINGS })).toEqual([]);
  });

  it('should return one patch per changed field', () => {
    const edited = { ...DEFAULT_SETTINGS, clipSeconds: 30, recordedTeams: 'ACH' };
    expect(changedFieldPatches(DEFAULT_SETTINGS, edited)).toEqual([{ clipSeconds: 30 }, { recordedTeams: 'ACH' }]);
  });

  it('should ignore an object field when its content is the same', () => {
    const edited = { ...DEFAULT_SETTINGS, scoreRegions: structuredClone(DEFAULT_SETTINGS.scoreRegions) };
    expect(changedFieldPatches(DEFAULT_SETTINGS, edited)).toEqual([]);
  });
});
