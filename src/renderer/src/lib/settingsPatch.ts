import type { Settings } from '../../../shared/types';

/**
 * One patch per field that differs between two versions of the settings.
 * Fields are saved separately so an invalid one does not hold back the others.
 */
export function changedFieldPatches(saved: Settings, edited: Settings): Partial<Settings>[] {
  const keys = Object.keys(edited) as (keyof Settings)[];
  return keys
    .filter((key) => JSON.stringify(saved[key]) !== JSON.stringify(edited[key]))
    .map((key) => ({ [key]: edited[key] }));
}
