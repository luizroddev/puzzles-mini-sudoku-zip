/**
 * Server-side result validation. Regenerates the puzzle from its seed and
 * confirms the submitted board/path is a genuine solution, then sanity-checks
 * the claimed time/errors/hints. Pure — used by the backend (and reusable in
 * tests) so the client can never fake a leaderboard entry.
 */
import type { PuzzleRef } from './factory';
import { buildSudoku, buildZip } from './factory';
import { SPEC_4, SPEC_6, isComplete } from './sudoku';
import { isSolved } from './zip';

export interface SubmittedResult {
  ref: PuzzleRef;
  timeSec: number;
  errors: number;
  hints: number;
  /** Final grid for a sudoku submission. */
  grid?: number[];
  /** Final path for a zip submission. */
  path?: number[];
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/** Lowest believable solve time, in seconds, per cell of the board. */
const MIN_SEC_PER_CELL = 0.15;
const MAX_SEC = 24 * 60 * 60;

function metricsOk(r: SubmittedResult, cells: number): ValidationResult {
  if (!Number.isFinite(r.timeSec) || r.timeSec < cells * MIN_SEC_PER_CELL) {
    return { valid: false, reason: 'time too short' };
  }
  if (r.timeSec > MAX_SEC) return { valid: false, reason: 'time too long' };
  if (!Number.isInteger(r.errors) || r.errors < 0) {
    return { valid: false, reason: 'invalid error count' };
  }
  if (!Number.isInteger(r.hints) || r.hints < 0) {
    return { valid: false, reason: 'invalid hint count' };
  }
  return { valid: true };
}

export function validateResult(r: SubmittedResult): ValidationResult {
  if (r.ref.type === 'sudoku') {
    const puzzle = buildSudoku(r.ref.size, r.ref.difficulty, r.ref.seed);
    const spec = r.ref.size === 4 ? SPEC_4 : SPEC_6;
    const grid = r.grid;
    if (!grid || grid.length !== spec.N * spec.N) {
      return { valid: false, reason: 'missing or malformed grid' };
    }
    const m = metricsOk(r, spec.N * spec.N);
    if (!m.valid) return m;
    if (!isComplete(spec, grid)) return { valid: false, reason: 'grid not complete' };
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] !== puzzle.solution[i]) {
        return { valid: false, reason: 'grid does not match solution' };
      }
    }
    return { valid: true };
  }

  // zip
  const puzzle = buildZip(r.ref.difficulty, r.ref.seed);
  const m = metricsOk(r, puzzle.N * puzzle.N);
  if (!m.valid) return m;
  if (!r.path || !isSolved(puzzle, r.path)) {
    return { valid: false, reason: 'path does not solve puzzle' };
  }
  return { valid: true };
}
