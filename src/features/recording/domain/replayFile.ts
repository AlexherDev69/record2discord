import { win32 } from 'node:path';

// Containers OBS can record a replay in.
const REPLAY_EXTENSIONS = ['.mp4', '.mkv', '.mov', '.flv', '.ts'];

/**
 * Tells whether a path announced by OBS can be a replay file. The path is read, uploaded
 * and deleted afterwards, so anything else than a local video file is refused.
 */
export function isReplayFile(filePath: string): boolean {
  const isLocal = win32.isAbsolute(filePath) && !filePath.startsWith('\\\\') && !filePath.startsWith('//');
  return isLocal && REPLAY_EXTENSIONS.includes(win32.extname(filePath).toLowerCase());
}
