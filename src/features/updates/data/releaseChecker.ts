import { z } from 'zod';
import { LATEST_RELEASE_API_URL, UPDATE_CHECK_TIMEOUT_MS } from '../../../core/config';
import { isNewerVersion } from '../domain/version';

const NOT_FOUND_STATUS = 404;
const releaseSchema = z.object({ tag_name: z.string() });

/**
 * Asks GitHub for the latest published release, and returns its version when it is
 * newer than the running one. Resolves to null when up to date or when nothing is published.
 */
export async function findNewerRelease(currentVersion: string): Promise<string | null> {
  const response = await fetch(LATEST_RELEASE_API_URL, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(UPDATE_CHECK_TIMEOUT_MS),
  });
  if (response.status === NOT_FOUND_STATUS) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GitHub answered with status ${response.status}`);
  }
  const latestVersion = releaseSchema.parse(await response.json()).tag_name.replace(/^v/, '');
  return isNewerVersion(latestVersion, currentVersion) ? latestVersion : null;
}
