/**
 * Daily challenge derivation. The date string (YYYY-MM-DD) seeds a stable
 * choice of game + difficulty + puzzle seed, so every device sees the same
 * daily puzzle and the server can reproduce it.
 */
import { hashStringToSeed, makeRng } from './rng';
import type { PuzzleRef, SudokuSize } from './factory';
import type { SudokuDifficulty, ZipDifficulty } from './types';

export function dailySeed(dateISO: string): number {
  return hashStringToSeed(`daily:${dateISO}`);
}

const SUDOKU_DIFFS: SudokuDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
const ZIP_DIFFS: ZipDifficulty[] = ['easy', 'medium', 'hard', 'expert'];

/** Deterministic daily puzzle configuration for a given ISO date. */
export function dailyConfig(dateISO: string): PuzzleRef {
  const seed = dailySeed(dateISO);
  const r = makeRng(seed);
  const isSudoku = r.int(2) === 0;
  if (isSudoku) {
    const size: SudokuSize = r.int(2) === 0 ? 4 : 6;
    return {
      type: 'sudoku',
      size,
      difficulty: r.pick(SUDOKU_DIFFS),
      seed,
    };
  }
  return {
    type: 'zip',
    difficulty: r.pick(ZIP_DIFFS),
    seed,
  };
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayISO(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
