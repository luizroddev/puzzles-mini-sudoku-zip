/**
 * Shared core types. Pure declarations — no runtime behaviour, no React.
 */

/** Row-major grid of cell values. 0 = empty, 1..N = a digit. */
export type Grid = number[];

// ---------------------------------------------------------------------------
// Match lifecycle (shared by both games)
// ---------------------------------------------------------------------------

export type MatchStatus =
  | 'NotStarted'
  | 'Playing'
  | 'Paused'
  | 'Won'
  | 'Failed'
  | 'Abandoned';

// ---------------------------------------------------------------------------
// Sudoku
// ---------------------------------------------------------------------------

export type SudokuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** How mistakes are surfaced. */
export type SudokuErrorMode = 'relaxed' | 'classic' | 'noHelp';

/**
 * Board geometry. `N` is the side length; regions are `br` rows by `bc` cols.
 *   4x4 → { N: 4, br: 2, bc: 2 }
 *   6x6 → { N: 6, br: 2, bc: 3 }
 */
export interface SudokuSpec {
  N: number;
  /** region height (rows) */
  br: number;
  /** region width (cols) */
  bc: number;
}

export interface SudokuPuzzle {
  id: string;
  seed: number;
  spec: SudokuSpec;
  /** Clues; 0 where the player must fill in. */
  given: Grid;
  /** The unique full solution. */
  solution: Grid;
  difficulty: SudokuDifficulty;
}

// ---------------------------------------------------------------------------
// Zip
// ---------------------------------------------------------------------------

export type ZipDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

/** A wall sits on the edge between two orthogonally-adjacent cells. */
export type WallSet = Set<string>;

export interface ZipPuzzle {
  id: string;
  seed: number;
  /** Square board side length. */
  N: number;
  /** cellIndex → checkpoint order (1..k), in the order the path must visit them. */
  checkpoints: Record<number, number>;
  /** Ordered cell indices forming a Hamiltonian path solution. */
  solution: number[];
  /** Walls between non-consecutive solution cells (never block the solution). */
  walls: WallSet;
  difficulty: ZipDifficulty;
}
