import { beforeEach, describe, expect, it, vi } from 'vitest';
import { launchObsIfNeeded } from './obsLauncher';

type ExecFileCallback = (error: Error | null, output: { stdout: string; stderr: string }) => void;

const childProcess = vi.hoisted(() => ({ execFile: vi.fn(), spawn: vi.fn() }));
vi.mock('node:child_process', () => childProcess);

const OBS_PATH = 'C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe';

function taskListReturns(stdout: string): void {
  childProcess.execFile.mockImplementation((_file: string, _args: string[], callback: ExecFileCallback) => {
    callback(null, { stdout, stderr: '' });
  });
}

beforeEach(() => {
  childProcess.execFile.mockReset();
  childProcess.spawn.mockReset().mockReturnValue({ on: vi.fn(), unref: vi.fn() });
});

describe('launchObsIfNeeded', () => {
  it('should not start OBS when it is already running', async () => {
    taskListReturns('OBS64.exe                    1234 Console    1    250 000 K');
    await launchObsIfNeeded(OBS_PATH);
    expect(childProcess.spawn).not.toHaveBeenCalled();
  });

  it('should start OBS minimized from its own folder when it is not running', async () => {
    taskListReturns('INFO: No tasks are running which match the specified criteria.');
    await launchObsIfNeeded(OBS_PATH);
    expect(childProcess.spawn).toHaveBeenCalledWith(
      OBS_PATH,
      ['--minimize-to-tray', '--startreplaybuffer'],
      expect.objectContaining({ cwd: 'C:\\Program Files\\obs-studio\\bin\\64bit', detached: true }),
    );
  });
});
