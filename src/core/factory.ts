/**
 * Deterministic puzzle factories. Given a (type, difficulty, seed) the same
 * puzzle is produced every time — this is what lets the server regenerate and
 * validate a submitted result from its seed alone.
 */
import type {
  SudokuDifficulty,
  SudokuPuzzle,
  ZipDifficulty,
  ZipPuzzle,
} from './types';
import { makeRng } from './rng';
import { SPEC_4, SPEC_6 } from './sudoku';
import { generateSudoku } from './sudokuGenerator';
import { generateZip } from './zipGenerator';

export type GameType = 'sudoku' | 'zip';
export type SudokuSize = 4 | 6;

export type SudokuRef = {
  type: 'sudoku';
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  seed: number;
};
export type ZipRef = {
  type: 'zip';
  difficulty: ZipDifficulty;
  seed: number;
};
export type PuzzleRef = SudokuRef | ZipRef;

export type AnyPuzzle =
  | ({ kind: 'sudoku' } & SudokuPuzzle)
  | ({ kind: 'zip' } & ZipPuzzle);

export function buildSudoku(
  size: SudokuSize,
  difficulty: SudokuDifficulty,
  seed: number,
): SudokuPuzzle {
  const spec = size === 4 ? SPEC_4 : SPEC_6;
  const p = generateSudoku(spec, makeRng(seed), difficulty);
  return { ...p, seed, id: `sudoku-${size}-${difficulty}-${seed}` };
}

export function buildZip(difficulty: ZipDifficulty, seed: number): ZipPuzzle {
  const p = generateZip(makeRng(seed), difficulty);
  return { ...p, seed, id: `zip-${difficulty}-${seed}` };
}

export function buildPuzzle(ref: PuzzleRef): AnyPuzzle {
  if (ref.type === 'sudoku') {
    return { kind: 'sudoku', ...buildSudoku(ref.size, ref.difficulty, ref.seed) };
  }
  return { kind: 'zip', ...buildZip(ref.difficulty, ref.seed) };
}
