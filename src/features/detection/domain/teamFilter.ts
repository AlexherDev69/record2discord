/** Team abbreviations listed in the free text typed by the user, e.g. "ach, cfc" gives ACH and CFC. */
export function parseTeamFilter(text: string): string[] {
  return text
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((name) => name !== '');
}

// Characters the text recognition mixes up, mapped to a single one so that such a misread still matches.
const LOOK_ALIKES: Record<string, string> = { '0': 'O', '1': 'I', '5': 'S', '8': 'B', '2': 'Z', '6': 'G' };

function withoutLookAlikes(name: string): string {
  return name.replace(/[012568]/g, (character) => LOOK_ALIKES[character] ?? character);
}

/**
 * Tells whether a goal should be clipped, given the teams the user wants to record.
 * An empty filter records every goal. A scorer that could not be read is recorded too,
 * since losing a wanted goal is worse than posting an unwanted one.
 */
export function shouldRecordGoal(filterText: string, scorer: string | null): boolean {
  const teams = parseTeamFilter(filterText).map(withoutLookAlikes);
  return teams.length === 0 || scorer === null || teams.includes(withoutLookAlikes(scorer));
}
