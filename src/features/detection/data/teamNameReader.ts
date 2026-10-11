import sharp from 'sharp';
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js';
import type { Region } from '../../../shared/types';
import { parseTeamName, teamNameRegion } from '../domain/teamName';

const LANGUAGE = 'eng';
const NAME_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// The name is only a few dozen pixels wide: it is enlarged and given a margin so it can be recognised.
const UPSCALE_FACTOR = 5;
const BORDER_PX = 20;
const BORDER_COLOR = '#ffffff';

async function cropTeamName(frame: Buffer, region: Region): Promise<Buffer> {
  const image = sharp(frame);
  const { width, height } = await image.metadata();
  const cropWidth = Math.max(1, Math.round(region.width * width));
  return image
    .extract({
      left: Math.round(region.left * width),
      top: Math.round(region.top * height),
      width: cropWidth,
      height: Math.max(1, Math.round(region.height * height)),
    })
    .grayscale()
    .resize({ width: cropWidth * UPSCALE_FACTOR, kernel: 'cubic' })
    .normalise()
    .extend({ top: BORDER_PX, bottom: BORDER_PX, left: BORDER_PX, right: BORDER_PX, background: BORDER_COLOR })
    .png()
    .toBuffer();
}

/** Reads the team abbreviation shown next to a score, with a text recognition engine running locally. */
export class TeamNameReader {
  private worker: Promise<Worker> | null = null;

  /** `languageDataDirectory` holds the recognition model shipped with the app, so nothing is downloaded. */
  constructor(private readonly languageDataDirectory: string) {}

  /** Only meaningful on a frame where the scoreboard is visible: elsewhere the engine makes text up. */
  async read(frame: Buffer, scoreRegion: Region): Promise<string | null> {
    const worker = await this.getWorker();
    const { data } = await worker.recognize(await cropTeamName(frame, teamNameRegion(scoreRegion)));
    return parseTeamName(data.text);
  }

  async close(): Promise<void> {
    const worker = await this.worker?.catch(() => null);
    this.worker = null;
    await worker?.terminate();
  }

  /** Starts the engine on first use, and again on the next read if it failed to start. */
  private getWorker(): Promise<Worker> {
    this.worker ??= this.startWorker().catch((error: unknown) => {
      this.worker = null;
      throw error;
    });
    return this.worker;
  }

  private async startWorker(): Promise<Worker> {
    const worker = await createWorker(LANGUAGE, OEM.LSTM_ONLY, {
      langPath: this.languageDataDirectory,
      cacheMethod: 'none',
      gzip: true,
    });
    await worker.setParameters({
      tessedit_char_whitelist: NAME_CHARACTERS,
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    });
    return worker;
  }
}
