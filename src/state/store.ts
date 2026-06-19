/**
 * Global app store (Zustand): navigation + persisted meta state. Match state
 * itself lives inside the match components and reports back through actions.
 */
import { create } from 'zustand';
import type { GameType, PuzzleRef, SudokuSize } from '../core/factory';
import type { SudokuDifficulty, ZipDifficulty } from '../core/types';
import { dailyConfig, todayISO } from '../core/daily';
import {
  DEFAULT_DAILY,
  DEFAULT_SETTINGS,
  DEFAULT_STATS,
  DEFAULT_STREAK,
  type DailyRecord,
  type SaveState,
  type Settings,
  type Stats,
  type Streak,
} from './models';
import {
  clearSave,
  loadDaily,
  loadSave,
  loadSettings,
  loadStats,
  loadStreak,
  saveDaily,
  saveSettings,
  saveStats,
  saveStreak,
  writeSave,
} from './persistence';
import { advanceStreak, recordResult } from './progression';
import { submitResult } from '../api/client';
import { track } from '../analytics/track';

export interface PlayConfig {
  game: GameType;
  size?: SudokuSize;
  difficulty: SudokuDifficulty | ZipDifficulty;
  seed: number;
  isDaily: boolean;
  dateISO?: string;
}

export type Route =
  | { name: 'home' }
  | { name: 'pregame'; game: GameType }
  | { name: 'play'; config: PlayConfig }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'tutorial' };

export interface MatchResult {
  game: GameType;
  difficulty: SudokuDifficulty | ZipDifficulty;
  size?: SudokuSize;
  seed: number;
  timeSec: number;
  errors: number;
  hints: number;
  won: boolean;
  isDaily: boolean;
  dateISO?: string;
  grid?: number[];
  path?: number[];
}

interface AppState {
  hydrated: boolean;
  route: Route;
  settings: Settings;
  stats: Stats;
  streak: Streak;
  daily: DailyRecord;
  currentSave: SaveState | null;

  hydrate: () => Promise<void>;
  navigate: (route: Route) => void;
  goHome: () => void;
  startGame: (config: PlayConfig) => void;
  startDaily: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setSave: (save: SaveState | null) => void;
  finishMatch: (result: MatchResult) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  hydrated: false,
  route: { name: 'home' },
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  streak: DEFAULT_STREAK,
  daily: DEFAULT_DAILY,
  currentSave: null,

  hydrate: async () => {
    const [settings, stats, streak, daily, currentSave] = await Promise.all([
      loadSettings(),
      loadStats(),
      loadStreak(),
      loadDaily(),
      loadSave(),
    ]);
    set({ settings, stats, streak, daily, currentSave, hydrated: true });
    track('app_open');
  },

  navigate: (route) => set({ route }),
  goHome: () => set({ route: { name: 'home' } }),

  startGame: (config) => {
    track('game_start', { game: config.game, difficulty: config.difficulty });
    set({ route: { name: 'play', config } });
  },

  startDaily: () => {
    const date = todayISO(new Date());
    const ref = dailyConfig(date);
    const config: PlayConfig = refToPlayConfig(ref, true, date);
    track('daily_start', { date });
    set({ route: { name: 'play', config } });
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    void saveSettings(settings);
    track('setting_change', patch as Record<string, unknown>);
  },

  setSave: (save) => {
    set({ currentSave: save });
    if (save) void writeSave(save);
    else void clearSave();
  },

  finishMatch: async (result) => {
    // Clear autosave — the match is over.
    void clearSave();
    set({ currentSave: null });

    // Update stats.
    const stats = recordResult(
      get().stats,
      result.game,
      result.difficulty,
      result.timeSec,
      result.hints,
      result.won,
    );
    set({ stats });
    void saveStats(stats);

    // Daily completion + streak.
    if (result.won && result.isDaily && result.dateISO) {
      const daily: DailyRecord = {
        completed: {
          ...get().daily.completed,
          [result.dateISO]: { timeSec: result.timeSec, type: result.game },
        },
      };
      set({ daily });
      void saveDaily(daily);

      const streak = advanceStreak(get().streak, result.dateISO);
      set({ streak });
      void saveStreak(streak);
      track('daily_complete', { date: result.dateISO, timeSec: result.timeSec });
    }

    track(result.won ? 'game_win' : 'game_fail', {
      game: result.game,
      difficulty: result.difficulty,
      timeSec: result.timeSec,
    });

    // Best-effort backend submission (does nothing offline).
    if (result.won) {
      const ref = playResultToRef(result);
      void submitResult({
        ref,
        timeSec: result.timeSec,
        errors: result.errors,
        hints: result.hints,
        grid: result.grid,
        path: result.path,
        isDaily: result.isDaily,
        dateISO: result.dateISO,
      });
    }
  },
}));

function refToPlayConfig(ref: PuzzleRef, isDaily: boolean, dateISO?: string): PlayConfig {
  if (ref.type === 'sudoku') {
    return { game: 'sudoku', size: ref.size, difficulty: ref.difficulty, seed: ref.seed, isDaily, dateISO };
  }
  return { game: 'zip', difficulty: ref.difficulty, seed: ref.seed, isDaily, dateISO };
}

function playResultToRef(r: MatchResult): PuzzleRef {
  if (r.game === 'sudoku') {
    return { type: 'sudoku', size: (r.size ?? 4) as SudokuSize, difficulty: r.difficulty as SudokuDifficulty, seed: r.seed };
  }
  return { type: 'zip', difficulty: r.difficulty as ZipDifficulty, seed: r.seed };
}
