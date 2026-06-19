import { describe, it, expect } from 'vitest';
import { SPEC_4, SPEC_6, isComplete } from '../sudoku';
import { solve, countSolutions } from '../sudokuSolver';
import { makeRng } from '../rng';
import { generateFullSolution, generateSudoku, clueTarget } from '../sudokuGenerator';
import type { SudokuDifficulty } from '../types';

describe('generateFullSolution', () => {
  it('produces a complete, valid grid', () => {
    const g = generateFullSolution(SPEC_4, makeRng(1));
    expect(g.length).toBe(16);
    expect(isComplete(SPEC_4, g)).toBe(true);
  });

  it('is deterministic for a given seed', () => {
    expect(generateFullSolution(SPEC_4, makeRng(123))).toEqual(generateFullSolution(SPEC_4, makeRng(123)));
    expect(generateFullSolution(SPEC_6, makeRng(123))).toEqual(generateFullSolution(SPEC_6, makeRng(123)));
  });

  it('produces different grids for different seeds', () => {
    expect(generateFullSolution(SPEC_4, makeRng(1))).not.toEqual(generateFullSolution(SPEC_4, makeRng(2)));
  });
});

describe('generateSudoku', () => {
  it('givens are a subset of the solution', () => {
    const p = generateSudoku(SPEC_4, makeRng(5), 'medium');
    for (let i = 0; i < p.given.length; i++) {
      if (p.given[i] !== 0) expect(p.given[i]).toBe(p.solution[i]);
    }
  });

  it('has a unique solution that matches the recorded solution', () => {
    const p = generateSudoku(SPEC_4, makeRng(5), 'medium');
    expect(countSolutions(SPEC_4, p.given)).toBe(1);
    expect(solve(SPEC_4, p.given)).toEqual(p.solution);
    expect(isComplete(SPEC_4, p.solution)).toBe(true);
  });

  it('is deterministic for a given seed and difficulty', () => {
    const a = generateSudoku(SPEC_6, makeRng(77), 'hard');
    const b = generateSudoku(SPEC_6, makeRng(77), 'hard');
    expect(a.given).toEqual(b.given);
    expect(a.solution).toEqual(b.solution);
  });

  it('harder difficulties give no more clues than easier ones', () => {
    const seed = 999;
    const clues = (d: SudokuDifficulty) =>
      generateSudoku(SPEC_6, makeRng(seed), d).given.filter((v) => v !== 0).length;
    expect(clues('easy')).toBeGreaterThanOrEqual(clues('medium'));
    expect(clues('medium')).toBeGreaterThanOrEqual(clues('hard'));
    expect(clues('hard')).toBeGreaterThanOrEqual(clues('expert'));
  });

  it('keeps at least the targeted number of clues', () => {
    const p = generateSudoku(SPEC_4, makeRng(5), 'easy');
    const clues = p.given.filter((v) => v !== 0).length;
    expect(clues).toBeGreaterThanOrEqual(clueTarget(SPEC_4, 'easy'));
  });
});

describe('property: many seeds yield unique, solvable 4x4 puzzles', () => {
  it('holds for 60 seeds across all difficulties', () => {
    const diffs: SudokuDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    for (let seed = 1; seed <= 60; seed++) {
      const d = diffs[seed % diffs.length]!;
      const p = generateSudoku(SPEC_4, makeRng(seed), d);
      expect(countSolutions(SPEC_4, p.given), `seed ${seed} ${d}`).toBe(1);
    }
  });
});

describe('property: many seeds yield unique, solvable 6x6 puzzles', () => {
  it('holds for 15 seeds', () => {
    for (let seed = 1; seed <= 15; seed++) {
      const p = generateSudoku(SPEC_6, makeRng(seed * 13), 'medium');
      expect(countSolutions(SPEC_6, p.given), `seed ${seed}`).toBe(1);
      expect(isComplete(SPEC_6, p.solution)).toBe(true);
    }
  });
});
