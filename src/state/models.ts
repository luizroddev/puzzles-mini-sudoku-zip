/**
 * App-level (non-core) state models: settings, stats, streak, daily records and
 * the autosave envelope. Kept separate from the pure puzzle core.
 */
import type {
  SudokuDifficulty,
  SudokuErrorMode,
  ZipDifficulty,
} from '../core/types';
import type { GameType, SudokuSize } from '../core/factory';

export type ThemeChoice = 'light' | 'dark' | 'system';

export interface Settings {
  theme: ThemeChoice;
  motion: boolean; // animations on
  sound: boolean;
  haptics: boolean;
  showTimer: boolean;
  highlightPeers: boolean; // sudoku peer highlighting
  errorMode: SudokuErrorMode;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  motion: true,
  sound: true,
  haptics: true,
  showTimer: true,
  highlightPeers: true,
  errorMode: 'classic',
};

export interface GameStats {
  played: number;
  won: number;
  totalTimeSec: number;
  best: Partial<Record<string, number>>; // key: difficulty -> best seconds
  hintsUsed: number;
}

export interface Stats {
  sudoku: GameStats;
  zip: GameStats;
}

export function emptyGameStats(): GameStats {
  return { played: 0, won: 0, totalTimeSec: 0, best: {}, hintsUsed: 0 };
}

export const DEFAULT_STATS: Stats = {
  sudoku: emptyGameStats(),
  zip: emptyGameStats(),
};

export interface Streak {
  current: number;
  best: number;
  lastCompletedISO: string | null;
}

export const DEFAULT_STREAK: Streak = { current: 0, best: 0, lastCompletedISO: null };

export interface DailyRecord {
  /** ISO date -> result summary */
  completed: Record<string, { timeSec: number; type: GameType }>;
}

export const DEFAULT_DAILY: DailyRecord = { completed: {} };

// --- autosave envelope -----------------------------------------------------

export interface SudokuSave {
  kind: 'sudoku';
  size: SudokuSize;
  difficulty: SudokuDifficulty;
  seed: number;
  isDaily: boolean;
  grid: number[];
  notes: Record<number, number[]>;
  errors: number;
  hints: number;
  sec: number;
  errorMode: SudokuErrorMode;
}

export interface ZipSave {
  kind: 'zip';
  difficulty: ZipDifficulty;
  seed: number;
  isDaily: boolean;
  path: number[];
  hints: number;
  undoCount: number;
  sec: number;
}

export type SaveState = SudokuSave | ZipSave;
