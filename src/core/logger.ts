import { pino } from 'pino';

const streams = pino.multistream([{ stream: process.stdout }]);

export const logger = pino({}, streams);

/** Also writes logs to a file, so a missed goal can be diagnosed after the session. */
export function addLogFile(filePath: string): void {
  streams.add({ stream: pino.destination(filePath) });
}
