/**
 * Pure stats and streak transitions. No storage, no React — easy to test.
 */
import type { GameType } from '../core/factory';
import type { SudokuDifficulty, ZipDifficulty } from '../core/types';
import type { Stats, Streak } from './models';

type AnyDifficulty = SudokuDifficulty | ZipDifficulty;

/** The ISO date one calendar day before `iso` (UTC-safe). */
export function previousISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function recordResult(
  stats: Stats,
  type: GameType,
  difficulty: AnyDifficulty,
  timeSec: number,
  hints: number,
  won: boolean,
): Stats {
  const g = stats[type];
  const best = { ...g.best };
  if (won) {
    const prev = best[difficulty];
    if (prev === undefined || timeSec < prev) best[difficulty] = timeSec;
  }
  const updated = {
    played: g.played + 1,
    won: g.won + (won ? 1 : 0),
    totalTimeSec: g.totalTimeSec + timeSec,
    hintsUsed: g.hintsUsed + hints,
    best,
  };
  return { ...stats, [type]: updated };
}

export function advanceStreak(streak: Streak, todayISO: string): Streak {
  if (streak.lastCompletedISO === todayISO) return streak; // already counted today
  const continues = streak.lastCompletedISO === previousISO(todayISO);
  const current = continues ? streak.current + 1 : 1;
  return {
    current,
    best: Math.max(streak.best, current),
    lastCompletedISO: todayISO,
  };
}
