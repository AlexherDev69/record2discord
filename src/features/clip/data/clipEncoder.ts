import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CLIP_AUDIO_KBPS, CLIP_FPS, CLIP_VIDEO_ENCODER } from '../../../core/config';
import { computeVideoBitrateKbps } from '../domain/bitrate';

const execFileAsync = promisify(execFile);
const CLIP_SUFFIX = '.discord.mp4';

export interface ClipOptions {
  clipSeconds: number;
  height: number;
  targetBytes: number;
}

/** Re-encodes the last `clipSeconds` of a replay so it fits under the Discord upload limit. */
export async function encodeClip(ffmpegPath: string, replayPath: string, options: ClipOptions): Promise<string> {
  const videoKbps = computeVideoBitrateKbps(options.targetBytes, options.clipSeconds, CLIP_AUDIO_KBPS);
  const clipPath = `${replayPath}${CLIP_SUFFIX}`;
  await execFileAsync(ffmpegPath, [
    '-y',
    '-v', 'error',
    '-sseof', `-${options.clipSeconds}`,
    '-i', replayPath,
    '-vf', `scale=-2:${options.height},fps=${CLIP_FPS}`,
    '-c:v', CLIP_VIDEO_ENCODER,
    '-b:v', `${videoKbps}k`,
    '-maxrate', `${videoKbps}k`,
    '-bufsize', `${videoKbps * 2}k`,
    '-c:a', 'aac',
    '-b:a', `${CLIP_AUDIO_KBPS}k`,
    '-movflags', '+faststart',
    clipPath,
  ]);
  return clipPath;
}
