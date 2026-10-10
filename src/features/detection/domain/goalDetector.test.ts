import { describe, expect, it } from 'vitest';
import type { Score } from '../../../shared/types';
import { isSameGlyph, type Glyph } from './glyph';
import { GoalDetector, type DigitRecognizer, type ScoreboardReading } from './goalDetector';

const STABLE_READS = 3;
const GLYPH_SIZE = 100;
const INK_PIXELS_PER_DIGIT = 10;
const ALL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** Fake digit glyph: each digit inks a different slice of the bitmap. */
function digit(value: number): Glyph {
  const glyph = new Uint8Array(GLYPH_SIZE);
  return glyph.fill(1, value * INK_PIXELS_PER_DIGIT, (value + 1) * INK_PIXELS_PER_DIGIT);
}

class FakeDigits implements DigitRecognizer {
  readonly learned: number[] = [];
  private readonly references: [label: number, glyph: Glyph][];

  /** `misreads` maps a digit shown on screen to the wrong digit it is recognized as. */
  constructor(knownDigits: number[], misreads: Record<number, number> = {}) {
    this.references = [
      ...knownDigits.map((value): [number, Glyph] => [value, digit(value)]),
      ...Object.entries(misreads).map(([shown, label]): [number, Glyph] => [label, digit(Number(shown))]),
    ];
  }

  recognize(glyph: Glyph): number | null {
    const match = this.references.find(([, reference]) => isSameGlyph(glyph, reference));
    return match?.[0] ?? null;
  }

  learn(value: number, glyph: Glyph): void {
    this.learned.push(value);
    this.references.unshift([value, glyph]);
  }
}

function reading(home: number, away: number): ScoreboardReading {
  return { home: digit(home), away: digit(away) };
}

function feed(detector: GoalDetector, value: ScoreboardReading | null, times: number): (Score | null)[] {
  return Array.from({ length: times }, () => detector.update(value));
}

function detectorAt(home: number, away: number, digits: DigitRecognizer = new FakeDigits(ALL_DIGITS)): GoalDetector {
  const detector = new GoalDetector(STABLE_READS, digits);
  feed(detector, reading(home, away), STABLE_READS);
  return detector;
}

describe('GoalDetector', () => {
  it('should not emit a goal when the first scoreboard is read', () => {
    const detector = new GoalDetector(STABLE_READS, new FakeDigits(ALL_DIGITS));
    expect(feed(detector, reading(2, 1), STABLE_READS)).toEqual([null, null, null]);
  });

  it('should emit a goal with the new score when one side changes and is stable', () => {
    const detector = detectorAt(0, 0);
    expect(feed(detector, reading(1, 0), STABLE_READS)).toEqual([null, null, { home: 1, away: 0 }]);
  });

  it('should give the real score when started in the middle of a match', () => {
    const detector = detectorAt(3, 0);
    expect(feed(detector, reading(4, 0), STABLE_READS).at(-1)).toEqual({ home: 4, away: 0 });
  });

  it('should expose the last confirmed score', () => {
    const detector = new GoalDetector(STABLE_READS, new FakeDigits(ALL_DIGITS));
    expect(detector.score).toBeNull();
    feed(detector, reading(2, 1), STABLE_READS);
    expect(detector.score).toEqual({ home: 2, away: 1 });
  });

  it('should emit the goal only once when the new score keeps being read', () => {
    const detector = detectorAt(0, 0);
    feed(detector, reading(0, 1), STABLE_READS);
    expect(feed(detector, reading(0, 1), STABLE_READS)).toEqual([null, null, null]);
  });

  it('should ignore a change when it is not stable', () => {
    const detector = detectorAt(0, 0);
    feed(detector, reading(1, 0), STABLE_READS - 1);
    expect(feed(detector, reading(0, 0), STABLE_READS)).toEqual([null, null, null]);
  });

  it('should restart the stability count when the scoreboard disappears', () => {
    const detector = detectorAt(0, 0);
    feed(detector, reading(1, 0), STABLE_READS - 1);
    detector.update(null);
    expect(feed(detector, reading(1, 0), STABLE_READS)).toEqual([null, null, { home: 1, away: 0 }]);
  });

  it('should not emit a goal when a side goes back to zero', () => {
    const detector = detectorAt(1, 0);
    expect(feed(detector, reading(0, 0), STABLE_READS)).toEqual([null, null, null]);
  });

  it('should not emit a goal when a goal is disallowed', () => {
    const detector = detectorAt(2, 1);
    expect(feed(detector, reading(1, 1), STABLE_READS)).toEqual([null, null, null]);
  });

  it('should rebaseline without a goal when both sides change', () => {
    const detector = detectorAt(3, 2);
    expect(feed(detector, reading(0, 0), STABLE_READS)).toEqual([null, null, null]);
    expect(feed(detector, reading(0, 1), STABLE_READS).at(-1)).toEqual({ home: 0, away: 1 });
  });

  it('should count and learn the digit when it is not known yet', () => {
    const digits = new FakeDigits([0, 1]);
    const detector = detectorAt(1, 0, digits);
    expect(feed(detector, reading(2, 0), STABLE_READS).at(-1)).toEqual({ home: 2, away: 0 });
    expect(digits.learned).toEqual([2]);
  });

  it('should trust counting and relearn the digit when it is misread', () => {
    const digits = new FakeDigits([0, 5], { 6: 5 });
    const detector = detectorAt(0, 5, digits);
    expect(feed(detector, reading(0, 6), STABLE_READS).at(-1)).toEqual({ home: 0, away: 6 });
    expect(digits.learned).toEqual([6]);
  });

  it('should emit a goal with an unknown number when no digit can be read', () => {
    const detector = detectorAt(7, 0, new FakeDigits([0]));
    expect(feed(detector, reading(8, 0), STABLE_READS).at(-1)).toEqual({ home: null, away: 0 });
  });
});
