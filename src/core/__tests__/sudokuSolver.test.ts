import { describe, it, expect } from 'vitest';
import { SPEC_4, isComplete, idx } from '../sudoku';
import { solve, countSolutions } from '../sudokuSolver';
import type { Grid } from '../types';

const SOLVED_4: Grid = [
  1, 2, 3, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1,
];

describe('solve', () => {
  it('returns a complete valid grid for an empty board', () => {
    const empty: Grid = new Array(16).fill(0);
    const solution = solve(SPEC_4, empty);
    expect(solution).not.toBeNull();
    expect(isComplete(SPEC_4, solution!)).toBe(true);
  });

  it('completes a partially filled board consistently with its givens', () => {
    const grid = SOLVED_4.slice();
    grid[idx(4, 0, 0)] = 0;
    grid[idx(4, 2, 3)] = 0;
    const solution = solve(SPEC_4, grid);
    expect(solution).toEqual(SOLVED_4);
  });

  it('returns null for an unsolvable board', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[idx(4, 0, 0)] = 1;
    grid[idx(4, 0, 1)] = 1; // immediate row conflict
    expect(solve(SPEC_4, grid)).toBeNull();
  });

  it('does not mutate the input grid', () => {
    const grid: Grid = new Array(16).fill(0);
    const copy = grid.slice();
    solve(SPEC_4, grid);
    expect(grid).toEqual(copy);
  });
});

describe('countSolutions', () => {
  it('counts exactly 1 for a solved grid', () => {
    expect(countSolutions(SPEC_4, SOLVED_4)).toBe(1);
  });

  it('counts 1 for a puzzle with a unique solution', () => {
    // Remove a single clue — still unique.
    const grid = SOLVED_4.slice();
    grid[idx(4, 1, 1)] = 0;
    expect(countSolutions(SPEC_4, grid)).toBe(1);
  });

  it('caps the count at the given limit', () => {
    const empty: Grid = new Array(16).fill(0);
    expect(countSolutions(SPEC_4, empty, 2)).toBe(2);
  });

  it('counts 0 for a grid with a conflict', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[idx(4, 0, 0)] = 1;
    grid[idx(4, 0, 1)] = 1;
    expect(countSolutions(SPEC_4, grid)).toBe(0);
  });
});
