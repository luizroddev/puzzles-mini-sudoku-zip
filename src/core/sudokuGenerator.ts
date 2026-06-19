/**
 * Seeded Sudoku generation: build a full solution, then dig holes greedily
 * while keeping the solution unique. Difficulty is graded by clue count.
 * Pure and deterministic given an Rng.
 */
import type { Grid, SudokuDifficulty, SudokuPuzzle, SudokuSpec } from './types';
import type { Rng } from './rng';
import { isValidPlacement } from './sudoku';
import { countSolutions } from './sudokuSolver';

/** Target number of clues to leave, per board size and difficulty. */
export function clueTarget(spec: SudokuSpec, difficulty: SudokuDifficulty): number {
  const total = spec.N * spec.N;
  // Fraction of cells left as clues. Lower = harder.
  const frac: Record<SudokuDifficulty, number> = {
    easy: 0.62,
    medium: 0.5,
    hard: 0.42,
    expert: 0.36,
  };
  return Math.max(spec.N + 1, Math.round(total * frac[difficulty]));
}

/** A complete, valid grid built by seeded randomized backtracking. */
export function generateFullSolution(spec: SudokuSpec, rng: Rng): Grid {
  const { N } = spec;
  const grid: Grid = new Array(N * N).fill(0);
  const values = Array.from({ length: N }, (_, i) => i + 1);

  const fill = (cell: number): boolean => {
    if (cell === grid.length) return true;
    if (grid[cell]) return fill(cell + 1);
    for (const v of rng.shuffle(values)) {
      if (isValidPlacement(spec, grid, cell, v)) {
        grid[cell] = v;
        if (fill(cell + 1)) return true;
        grid[cell] = 0;
      }
    }
    return false;
  };

  fill(0);
  return grid;
}

/**
 * Dig holes from a full solution, removing cells in a seeded order and keeping
 * only removals that preserve a unique solution. Stops at the clue target.
 */
export function generateSudoku(
  spec: SudokuSpec,
  rng: Rng,
  difficulty: SudokuDifficulty,
): SudokuPuzzle {
  const solution = generateFullSolution(spec, rng);
  const given = solution.slice();
  const target = clueTarget(spec, difficulty);

  let clues = given.length;
  const order = rng.shuffle(Array.from({ length: given.length }, (_, i) => i));

  for (const cell of order) {
    if (clues <= target) break;
    const saved = given[cell]!;
    if (saved === 0) continue;
    given[cell] = 0;
    if (countSolutions(spec, given, 2) === 1) {
      clues--;
    } else {
      given[cell] = saved; // removal broke uniqueness — put it back
    }
  }

  const seed = rng.int(0x7fffffff);
  return {
    id: `sudoku-${spec.N}-${difficulty}-${seed}`,
    seed,
    spec,
    given,
    solution,
    difficulty,
  };
}
