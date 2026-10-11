import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CLIP_AUDIO_KBPS, CLIP_ENCODE_TIMEOUT_MS, CLIP_FPS, CLIP_VIDEO_ENCODERS } from '../../../core/config';
import { computeVideoBitrateKbps } from '../domain/bitrate';

const execFileAsync = promisify(execFile);
const CLIP_SUFFIX = '.discord.mp4';

export interface ClipOptions {
  clipSeconds: number;
  height: number;
  targetBytes: number;
}

function buildArguments(replayPath: string, clipPath: string, options: ClipOptions, videoEncoder: string): string[] {
  const videoKbps = computeVideoBitrateKbps(options.targetBytes, options.clipSeconds, CLIP_AUDIO_KBPS);
  return [
    '-y',
    '-v', 'error',
    '-sseof', `-${options.clipSeconds}`,
    '-i', replayPath,
    '-vf', `scale=-2:${options.height},fps=${CLIP_FPS}`,
    '-c:v', videoEncoder,
    '-b:v', `${videoKbps}k`,
    '-maxrate', `${videoKbps}k`,
    '-bufsize', `${videoKbps * 2}k`,
    '-c:a', 'aac',
    '-b:a', `${CLIP_AUDIO_KBPS}k`,
    '-movflags', '+faststart',
    clipPath,
  ];
}

function wasStoppedByTimeout(error: unknown): boolean {
  return error instanceof Error && 'killed' in error && error.killed === true;
}

/**
 * Re-encodes the last `clipSeconds` of a replay so it fits under the Discord upload limit.
 * An encoder fails at once when its graphics card is absent, so the next one is tried.
 */
export async function encodeClip(ffmpegPath: string, replayPath: string, options: ClipOptions): Promise<string> {
  const clipPath = `${replayPath}${CLIP_SUFFIX}`;
  let lastError: unknown = null;
  for (const videoEncoder of CLIP_VIDEO_ENCODERS) {
    try {
      const ffmpegArguments = buildArguments(replayPath, clipPath, options, videoEncoder);
      await execFileAsync(ffmpegPath, ffmpegArguments, { timeout: CLIP_ENCODE_TIMEOUT_MS });
      return clipPath;
    } catch (error: unknown) {
      if (wasStoppedByTimeout(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}
