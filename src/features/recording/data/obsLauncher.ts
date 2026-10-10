import { execFile, spawn } from 'node:child_process';
import { basename, dirname } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

async function isRunning(executableName: string): Promise<boolean> {
  const { stdout } = await execFileAsync('tasklist', ['/FI', `IMAGENAME eq ${executableName}`, '/NH']);
  return stdout.toLowerCase().includes(executableName.toLowerCase());
}

/** Starts OBS minimized with its replay buffer running, unless it is already open. */
export async function launchObsIfNeeded(obsPath: string): Promise<void> {
  if (await isRunning(basename(obsPath))) {
    return;
  }
  // OBS only finds its data files when started from its own folder.
  const obs = spawn(obsPath, ['--minimize-to-tray', '--startreplaybuffer'], {
    cwd: dirname(obsPath),
    detached: true,
    stdio: 'ignore',
  });
  obs.on('error', () => undefined);
  obs.unref();
}
