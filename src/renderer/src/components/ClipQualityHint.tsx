import { BYTES_PER_MEGABYTE, CLIP_AUDIO_KBPS, CLIP_SIZE_SAFETY_RATIO } from '../../../core/config';
import { computeVideoBitrateKbps } from '../../../features/clip/domain/bitrate';
import { rateClipQuality, type ClipQuality } from '../../../features/clip/domain/quality';

interface ClipQualityHintProps {
  clipSeconds: number;
  clipHeight: number;
  maxClipSizeMb: number;
}

const KBPS_PER_MBPS = 1000;

const QUALITY_LABELS: Record<ClipQuality, string> = {
  low: 'image pâteuse : raccourcis le clip ou baisse la résolution',
  fair: 'qualité correcte',
  good: 'bonne qualité',
};

/** Shows the bitrate the current clip settings leave to the video, and how it will look. */
export function ClipQualityHint({ clipSeconds, clipHeight, maxClipSizeMb }: ClipQualityHintProps) {
  const targetBytes = maxClipSizeMb * BYTES_PER_MEGABYTE * CLIP_SIZE_SAFETY_RATIO;
  const videoKbps = computeVideoBitrateKbps(targetBytes, clipSeconds, CLIP_AUDIO_KBPS);
  const quality = rateClipQuality(clipHeight, videoKbps);

  return (
    <p className={`message message-${quality}`}>
      Débit vidéo : {(videoKbps / KBPS_PER_MBPS).toFixed(1)} Mbps, {QUALITY_LABELS[quality]}.
    </p>
  );
}
