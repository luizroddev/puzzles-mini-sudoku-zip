import { describe, it, expect } from 'vitest';
import { recordResult, advanceStreak, previousISO } from '../progression';
import { emptyGameStats, DEFAULT_STREAK, type Stats } from '../models';

function freshStats(): Stats {
  return { sudoku: emptyGameStats(), zip: emptyGameStats() };
}

describe('previousISO', () => {
  it('returns the calendar day before', () => {
    expect(previousISO('2026-06-19')).toBe('2026-06-18');
    expect(previousISO('2026-03-01')).toBe('2026-02-28');
    expect(previousISO('2026-01-01')).toBe('2025-12-31');
  });
});

describe('recordResult', () => {
  it('increments played and won, accumulates time and hints', () => {
    let s = freshStats();
    s = recordResult(s, 'sudoku', 'easy', 90, 1, true);
    expect(s.sudoku.played).toBe(1);
    expect(s.sudoku.won).toBe(1);
    expect(s.sudoku.totalTimeSec).toBe(90);
    expect(s.sudoku.hintsUsed).toBe(1);
    expect(s.sudoku.best.easy).toBe(90);
  });

  it('keeps the best (lowest) time per difficulty', () => {
    let s = freshStats();
    s = recordResult(s, 'zip', 'medium', 120, 0, true);
    s = recordResult(s, 'zip', 'medium', 80, 0, true);
    s = recordResult(s, 'zip', 'medium', 200, 0, true);
    expect(s.zip.best.medium).toBe(80);
    expect(s.zip.won).toBe(3);
  });

  it('counts a loss as played but not won and does not set a best', () => {
    let s = freshStats();
    s = recordResult(s, 'sudoku', 'hard', 300, 0, false);
    expect(s.sudoku.played).toBe(1);
    expect(s.sudoku.won).toBe(0);
    expect(s.sudoku.best.hard).toBeUndefined();
  });

  it('does not mutate the input', () => {
    const s = freshStats();
    const out = recordResult(s, 'sudoku', 'easy', 10, 0, true);
    expect(s.sudoku.played).toBe(0);
    expect(out).not.toBe(s);
  });
});

describe('advanceStreak', () => {
  it('starts a streak at 1 from empty', () => {
    const s = advanceStreak(DEFAULT_STREAK, '2026-06-19');
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
    expect(s.lastCompletedISO).toBe('2026-06-19');
  });

  it('increments on consecutive days', () => {
    let s = advanceStreak(DEFAULT_STREAK, '2026-06-18');
    s = advanceStreak(s, '2026-06-19');
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
  });

  it('is idempotent for the same day', () => {
    let s = advanceStreak(DEFAULT_STREAK, '2026-06-19');
    s = advanceStreak(s, '2026-06-19');
    expect(s.current).toBe(1);
  });

  it('resets after a gap but preserves best', () => {
    let s = advanceStreak(DEFAULT_STREAK, '2026-06-15');
    s = advanceStreak(s, '2026-06-16'); // current 2
    s = advanceStreak(s, '2026-06-19'); // gap → reset to 1
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });
});
