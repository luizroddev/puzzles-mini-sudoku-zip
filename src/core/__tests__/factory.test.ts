import { describe, it, expect } from 'vitest';
import { buildSudoku, buildZip, buildPuzzle } from '../factory';
import { dailySeed, dailyConfig } from '../daily';
import { isSolved } from '../zip';
import { countSolutions } from '../sudokuSolver';
import { SPEC_4, SPEC_6 } from '../sudoku';

describe('buildSudoku', () => {
  it('is fully reproducible from (size, difficulty, seed)', () => {
    const a = buildSudoku(6, 'hard', 123456);
    const b = buildSudoku(6, 'hard', 123456);
    expect(a).toEqual(b);
    expect(a.seed).toBe(123456);
  });

  it('produces a uniquely solvable puzzle', () => {
    const a = buildSudoku(4, 'medium', 42);
    expect(countSolutions(SPEC_4, a.given)).toBe(1);
    const b = buildSudoku(6, 'expert', 42);
    expect(countSolutions(SPEC_6, b.given)).toBe(1);
  });

  it('encodes size and difficulty in a stable id', () => {
    expect(buildSudoku(4, 'easy', 7).id).toBe('sudoku-4-easy-7');
  });
});

describe('buildZip', () => {
  it('is fully reproducible from (difficulty, seed)', () => {
    const a = buildZip('hard', 999);
    const b = buildZip('hard', 999);
    expect(a.solution).toEqual(b.solution);
    expect([...a.walls].sort()).toEqual([...b.walls].sort());
    expect(a.seed).toBe(999);
  });

  it('produces a solvable puzzle', () => {
    const a = buildZip('medium', 555);
    expect(isSolved(a, a.solution)).toBe(true);
  });
});

describe('buildPuzzle dispatch', () => {
  it('builds sudoku and zip from a ref', () => {
    const s = buildPuzzle({ type: 'sudoku', size: 4, difficulty: 'easy', seed: 1 });
    expect(s.kind).toBe('sudoku');
    const z = buildPuzzle({ type: 'zip', difficulty: 'easy', seed: 1 });
    expect(z.kind).toBe('zip');
  });

  it('is reproducible through the ref API', () => {
    const ref = { type: 'sudoku', size: 6, difficulty: 'hard', seed: 314 } as const;
    expect(buildPuzzle(ref)).toEqual(buildPuzzle(ref));
  });
});

describe('daily', () => {
  it('dailySeed is deterministic per date and differs across dates', () => {
    expect(dailySeed('2026-06-19')).toBe(dailySeed('2026-06-19'));
    expect(dailySeed('2026-06-19')).not.toBe(dailySeed('2026-06-20'));
  });

  it('dailyConfig is deterministic and yields a buildable puzzle', () => {
    const cfg = dailyConfig('2026-06-19');
    expect(dailyConfig('2026-06-19')).toEqual(cfg);
    const puzzle = buildPuzzle(cfg);
    expect(puzzle.kind).toBe(cfg.type);
  });
});
