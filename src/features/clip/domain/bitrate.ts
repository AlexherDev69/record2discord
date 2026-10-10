const BITS_PER_BYTE = 8;
const BITS_PER_KILOBIT = 1000;

/** Video bitrate that makes a clip of `durationSeconds` fit in `targetBytes`, audio included. */
export function computeVideoBitrateKbps(targetBytes: number, durationSeconds: number, audioKbps: number): number {
  const totalKbps = (targetBytes * BITS_PER_BYTE) / BITS_PER_KILOBIT / durationSeconds;
  return Math.floor(totalKbps - audioKbps);
}
