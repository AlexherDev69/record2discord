export const POLL_INTERVAL_MS = 500;
export const OBS_RETRY_INTERVAL_MS = 3000;
export const STABLE_READS_REQUIRED = 3;
export const SCREENSHOT_JPEG_QUALITY = 80;
export const MAX_GOAL_HISTORY = 20;

// Distance under which a glyph is recognized as its closest reference digit.
export const DIGIT_MAX_DISTANCE = 0.15;
export const GLYPH_WIDTH_PX = 64;
export const GLYPH_HEIGHT_PX = 36;
export const GLYPH_GRID_SIZE = 24;
// Gray levels (0-255) that count as digit ink and as scoreboard background.
export const GLYPH_DARK_MAX = 90;
export const GLYPH_LIGHT_MIN = 170;
export const GLYPH_BINARY_THRESHOLD = 128;
// A scoreboard crop is almost only ink and background, with a plausible amount of ink.
export const GLYPH_MIN_CONTRASTED_RATIO = 0.8;
export const GLYPH_MIN_INK_RATIO = 0.03;
export const GLYPH_MAX_INK_RATIO = 0.5;
// Differing pixels, relative to the ink of the larger glyph, under which two glyphs match.
export const GLYPH_MAX_DIFF_RATIO = 0.1;

export const CLIP_FPS = 30;
export const CLIP_AUDIO_KBPS = 96;
export const CLIP_VIDEO_ENCODER = 'h264_nvenc';
export const CLIP_HEIGHT_OPTIONS = [720, 1080] as const;
// Discord upload limits: default server, boost level 2, boost level 3.
export const CLIP_MAX_SIZE_MB_OPTIONS = [10, 50, 100] as const;
// Share of the upload limit actually targeted, to absorb encoder overshoot.
export const CLIP_SIZE_SAFETY_RATIO = 0.9;
export const BYTES_PER_MEGABYTE = 1_000_000;
