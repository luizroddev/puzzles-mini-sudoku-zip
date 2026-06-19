import { describe, it, expect } from 'vitest';
import { buildSudoku, buildZip } from '../factory';
import { validateResult } from '../validate';
import type { SubmittedResult } from '../validate';

describe('validateResult — sudoku', () => {
  const puzzle = buildSudoku(4, 'easy', 100);
  const base: SubmittedResult = {
    ref: { type: 'sudoku', size: 4, difficulty: 'easy', seed: 100 },
    timeSec: 60,
    errors: 0,
    hints: 0,
    grid: puzzle.solution,
  };

  it('accepts the correct full solution', () => {
    expect(validateResult(base).valid).toBe(true);
  });

  it('rejects an incomplete grid', () => {
    const grid = puzzle.solution.slice();
    grid[0] = 0;
    expect(validateResult({ ...base, grid }).valid).toBe(false);
  });

  it('rejects a wrong (but full) grid', () => {
    const grid = puzzle.solution.slice();
    // swap two cells to break it
    [grid[0], grid[1]] = [grid[1]!, grid[0]!];
    expect(validateResult({ ...base, grid }).valid).toBe(false);
  });

  it('rejects implausible (too short) times', () => {
    expect(validateResult({ ...base, timeSec: 0 }).valid).toBe(false);
  });

  it('rejects negative error/hint counts', () => {
    expect(validateResult({ ...base, errors: -1 }).valid).toBe(false);
    expect(validateResult({ ...base, hints: -2 }).valid).toBe(false);
  });
});

describe('validateResult — zip', () => {
  const puzzle = buildZip('easy', 100);
  const base: SubmittedResult = {
    ref: { type: 'zip', difficulty: 'easy', seed: 100 },
    timeSec: 30,
    errors: 0,
    hints: 0,
    path: puzzle.solution,
  };

  it('accepts a correct solving path', () => {
    expect(validateResult(base).valid).toBe(true);
  });

  it('rejects a path that does not solve the puzzle', () => {
    expect(validateResult({ ...base, path: puzzle.solution.slice(0, -1) }).valid).toBe(false);
  });

  it('rejects a reversed path that violates checkpoint order', () => {
    expect(validateResult({ ...base, path: [...puzzle.solution].reverse() }).valid).toBe(false);
  });
});
