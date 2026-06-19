/**
 * Sudoku backtracking solver. Used both to solve and to count solutions
 * (capped) for uniqueness checks during generation. Pure.
 */
import type { Grid, SudokuSpec } from './types';
import { isValidPlacement } from './sudoku';

/** Pick the empty cell with the fewest candidates (MRV) to prune the search fast. */
function findBestCell(spec: SudokuSpec, grid: Grid): { cell: number; candidates: number[] } | null {
  const { N } = spec;
  let best: { cell: number; candidates: number[] } | null = null;
  for (let cell = 0; cell < grid.length; cell++) {
    if (grid[cell]) continue;
    const candidates: number[] = [];
    for (let v = 1; v <= N; v++) {
      if (isValidPlacement(spec, grid, cell, v)) candidates.push(v);
    }
    if (candidates.length === 0) return { cell, candidates }; // dead end
    if (!best || candidates.length < best.candidates.length) {
      best = { cell, candidates };
      if (candidates.length === 1) break;
    }
  }
  return best;
}

/** First solution of `grid`, or null if none. Input is not mutated. */
export function solve(spec: SudokuSpec, grid: Grid): Grid | null {
  const work = grid.slice();

  const recurse = (): boolean => {
    const best = findBestCell(spec, work);
    if (best === null) return true; // no empty cells left → solved
    if (best.candidates.length === 0) return false;
    for (const v of best.candidates) {
      work[best.cell] = v;
      if (recurse()) return true;
    }
    work[best.cell] = 0;
    return false;
  };

  return recurse() ? work : null;
}

/** Number of solutions, counted up to `limit` (default 2 for uniqueness checks). */
export function countSolutions(spec: SudokuSpec, grid: Grid, limit = 2): number {
  const work = grid.slice();
  let count = 0;

  const recurse = (): void => {
    if (count >= limit) return;
    const best = findBestCell(spec, work);
    if (best === null) {
      count++;
      return;
    }
    if (best.candidates.length === 0) return;
    for (const v of best.candidates) {
      work[best.cell] = v;
      recurse();
      work[best.cell] = 0;
      if (count >= limit) return;
    }
  };

  recurse();
  return count;
}
