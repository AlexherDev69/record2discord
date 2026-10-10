export type ClipQuality = 'low' | 'fair' | 'good';

const REFERENCE_HEIGHT_PX = 1080;
// Video bitrates for 1080p30 gameplay under which the picture looks blocky, then acceptable.
const LOW_QUALITY_MAX_KBPS_AT_1080P = 3000;
const FAIR_QUALITY_MAX_KBPS_AT_1080P = 5000;

/** Rates how a clip will look, scaling the bitrate thresholds with the number of pixels. */
export function rateClipQuality(heightPx: number, videoKbps: number): ClipQuality {
  const pixelRatio = (heightPx / REFERENCE_HEIGHT_PX) ** 2;
  if (videoKbps < LOW_QUALITY_MAX_KBPS_AT_1080P * pixelRatio) {
    return 'low';
  }
  return videoKbps < FAIR_QUALITY_MAX_KBPS_AT_1080P * pixelRatio ? 'fair' : 'good';
}
