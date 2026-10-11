import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeClip } from './clipEncoder';

type ExecFileCallback = (error: Error | null, output: { stdout: string; stderr: string }) => void;

const execFileMock = vi.hoisted(() => vi.fn());
vi.mock('node:child_process', () => ({ execFile: execFileMock }));

const OPTIONS = { clipSeconds: 20, height: 1080, targetBytes: 9_000_000 };
// 9 000 000 bytes over 20 s is 3600 kbps, minus 96 kbps of audio.
const EXPECTED_VIDEO_KBPS = 3504;

function ffmpegArguments(): string[] {
  return execFileMock.mock.calls[0]?.[1] as string[];
}

function argumentAfter(flag: string): string | undefined {
  return ffmpegArguments()[ffmpegArguments().indexOf(flag) + 1];
}

beforeEach(() => {
  execFileMock.mockReset().mockImplementation((_file: string, _args: string[], callback: ExecFileCallback) => {
    callback(null, { stdout: '', stderr: '' });
  });
});

describe('encodeClip', () => {
  it('should write the clip next to the replay when encoding', async () => {
    expect(await encodeClip('ffmpeg.exe', 'C:/replays/goal.mkv', OPTIONS)).toBe('C:/replays/goal.mkv.discord.mp4');
    expect(execFileMock.mock.calls[0]?.[0]).toBe('ffmpeg.exe');
    expect(ffmpegArguments().at(-1)).toBe('C:/replays/goal.mkv.discord.mp4');
  });

  it('should keep only the last seconds at the requested height', async () => {
    await encodeClip('ffmpeg.exe', 'goal.mkv', OPTIONS);
    expect(argumentAfter('-sseof')).toBe('-20');
    expect(argumentAfter('-i')).toBe('goal.mkv');
    expect(argumentAfter('-vf')).toContain('scale=-2:1080');
  });

  it('should cap the video bitrate so the clip fits the target size', async () => {
    await encodeClip('ffmpeg.exe', 'goal.mkv', OPTIONS);
    expect(argumentAfter('-b:v')).toBe(`${EXPECTED_VIDEO_KBPS}k`);
    expect(argumentAfter('-maxrate')).toBe(`${EXPECTED_VIDEO_KBPS}k`);
  });

  it('should throw when ffmpeg fails', async () => {
    execFileMock.mockImplementation((_file: string, _args: string[], callback: ExecFileCallback) => {
      callback(new Error('encoder not found'), { stdout: '', stderr: '' });
    });
    await expect(encodeClip('ffmpeg.exe', 'goal.mkv', OPTIONS)).rejects.toThrow('encoder not found');
  });
});
