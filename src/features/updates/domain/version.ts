const VERSION_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** Major, minor and patch numbers of a version such as `1.2.9` or `v1.2.9`, or null when it is not one. */
function parseVersion(version: string): number[] | null {
  const match = VERSION_PATTERN.exec(version.trim());
  return match === null ? null : match.slice(1).map(Number);
}

/** Tells whether `candidate` is a later version than `current`. An unreadable version is never newer. */
export function isNewerVersion(candidate: string, current: string): boolean {
  const candidateParts = parseVersion(candidate);
  const currentParts = parseVersion(current);
  if (candidateParts === null || currentParts === null) {
    return false;
  }
  for (const [index, part] of candidateParts.entries()) {
    const currentPart = currentParts[index] ?? 0;
    if (part !== currentPart) {
      return part > currentPart;
    }
  }
  return false;
}
