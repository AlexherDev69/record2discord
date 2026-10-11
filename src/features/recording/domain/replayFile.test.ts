import { describe, expect, it } from 'vitest';
import { isReplayFile } from './replayFile';

describe('isReplayFile', () => {
  it('should accept a video file when it is on a local drive', () => {
    expect(isReplayFile('C:/Users/me/Videos/Replay 2026-10-11.mkv')).toBe(true);
    expect(isReplayFile('D:\\Replays\\goal.MP4')).toBe(true);
  });

  it('should refuse a file when it is not a video', () => {
    expect(isReplayFile('C:/Users/me/Documents/passwords.txt')).toBe(false);
  });

  it('should refuse a path when it is not on a local drive', () => {
    expect(isReplayFile('\\\\server\\share\\goal.mkv')).toBe(false);
    expect(isReplayFile('http://example.com/goal.mkv')).toBe(false);
    expect(isReplayFile('goal.mkv')).toBe(false);
  });
});
