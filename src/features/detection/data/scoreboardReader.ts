import sharp, { type Sharp } from 'sharp';
import { GLYPH_HEIGHT_PX, GLYPH_WIDTH_PX } from '../../../core/config';
import type { Region, ScoreRegions } from '../../../shared/types';
import { toGlyph, type Glyph } from '../domain/glyph';
import type { ScoreboardReading } from '../domain/goalDetector';
import { toPixelBox } from '../domain/pixelBox';

/** Grayscale crop of a score digit, resized so glyphs are comparable across resolutions. */
export async function cropScoreRegion(frame: Buffer, region: Region): Promise<Sharp> {
  const image = sharp(frame);
  const { width, height } = await image.metadata();
  return image
    .extract(toPixelBox(region, width, height))
    .grayscale()
    .resize(GLYPH_WIDTH_PX, GLYPH_HEIGHT_PX, { fit: 'fill' });
}

export async function readGlyph(frame: Buffer, region: Region): Promise<Glyph | null> {
  const crop = await cropScoreRegion(frame, region);
  return toGlyph(new Uint8Array(await crop.raw().toBuffer()), GLYPH_WIDTH_PX);
}

export async function readScoreboard(frame: Buffer, regions: ScoreRegions): Promise<ScoreboardReading | null> {
  const home = await readGlyph(frame, regions.home);
  const away = await readGlyph(frame, regions.away);
  return home === null || away === null ? null : { home, away };
}
