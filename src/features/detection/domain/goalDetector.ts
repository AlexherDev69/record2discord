import type { Score } from '../../../shared/types';
import { isSameGlyph, type Glyph } from './glyph';

const MAX_SINGLE_DIGIT = 9;

export interface ScoreboardReading {
  home: Glyph;
  away: Glyph;
}

export interface DigitRecognizer {
  recognize(glyph: Glyph): number | null;
  learn(digit: number, glyph: Glyph): void;
}

interface ConfirmedState {
  reading: ScoreboardReading;
  score: Score;
}

function isSameReading(a: ScoreboardReading | null, b: ScoreboardReading | null): boolean {
  return a !== null && b !== null && isSameGlyph(a.home, b.home) && isSameGlyph(a.away, b.away);
}

/**
 * Turns a stream of scoreboard readings into goal events.
 * A goal is one side's digit changing while the other side stays put, unless the new digit
 * is recognized as zero (new match) or as the previous score minus one (disallowed goal).
 * A reading only counts once seen `stableReadsRequired` times in a row, which filters
 * transitions and frames where the scoreboard is hidden.
 * Digits the recognizer does not know or misreads are deduced by counting, then taught to it.
 */
export class GoalDetector {
  private confirmed: ConfirmedState | null = null;
  private candidate: ScoreboardReading | null = null;
  private candidateReads = 0;

  constructor(
    private readonly stableReadsRequired: number,
    private readonly digits: DigitRecognizer,
  ) {}

  /** Last confirmed score, or null before the scoreboard has been read. */
  get score(): Score | null {
    return this.confirmed?.score ?? null;
  }

  update(reading: ScoreboardReading | null): Score | null {
    if (reading === null) {
      this.candidate = null;
      this.candidateReads = 0;
      return null;
    }

    this.candidateReads = isSameReading(reading, this.candidate) ? this.candidateReads + 1 : 1;
    this.candidate = reading;

    const previous = this.confirmed;
    if (this.candidateReads < this.stableReadsRequired || isSameReading(reading, previous?.reading ?? null)) {
      return null;
    }

    const goalScore = previous === null ? null : this.scoreAfterGoal(previous, reading);
    this.confirmed = { reading, score: goalScore ?? this.baselineScore(reading) };
    return goalScore;
  }

  private baselineScore(reading: ScoreboardReading): Score {
    return { home: this.digits.recognize(reading.home), away: this.digits.recognize(reading.away) };
  }

  private scoreAfterGoal(previous: ConfirmedState, reading: ScoreboardReading): Score | null {
    const homeChanged = !isSameGlyph(previous.reading.home, reading.home);
    const awayChanged = !isSameGlyph(previous.reading.away, reading.away);
    if (homeChanged === awayChanged) {
      return null;
    }
    const side = homeChanged ? 'home' : 'away';
    const previousNumber = previous.score[side];
    const expected = previousNumber === null ? null : previousNumber + 1;
    const recognized = this.digits.recognize(reading[side]);

    const isDisallowedGoal = recognized !== null && previousNumber !== null && recognized === previousNumber - 1;
    if (recognized === 0 || isDisallowedGoal) {
      return null;
    }
    // Counting from a known score is trusted over recognition, which can confuse look-alike digits.
    if (expected !== null && expected <= MAX_SINGLE_DIGIT && recognized !== expected) {
      this.digits.learn(expected, reading[side]);
    }
    return { ...previous.score, [side]: expected ?? recognized };
  }
}
