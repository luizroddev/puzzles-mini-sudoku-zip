/**
 * Typed load/save wrappers over the KV storage, one per PRD §11 key.
 * Every read is defensive: a corrupt or missing value falls back to a default.
 */
import { storage } from './storage';
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

const KEYS = {
  settings: 'gh_settings',
  stats: 'gh_stats',
  streak: 'gh_streak',
  daily: 'gh_daily',
  save: 'gh_save',
} as const;

async function loadWith<T>(key: string, fallback: T): Promise<T> {
  const v = await storage.get<T>(key);
  return v == null ? fallback : { ...fallback, ...v };
}

export const loadSettings = () => loadWith<Settings>(KEYS.settings, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => storage.set(KEYS.settings, s);

export const loadStats = () => loadWith<Stats>(KEYS.stats, DEFAULT_STATS);
export const saveStats = (s: Stats) => storage.set(KEYS.stats, s);

export const loadStreak = () => loadWith<Streak>(KEYS.streak, DEFAULT_STREAK);
export const saveStreak = (s: Streak) => storage.set(KEYS.streak, s);

export const loadDaily = () => loadWith<DailyRecord>(KEYS.daily, DEFAULT_DAILY);
export const saveDaily = (d: DailyRecord) => storage.set(KEYS.daily, d);

export const loadSave = () => storage.get<SaveState>(KEYS.save);
export const writeSave = (s: SaveState) => storage.set(KEYS.save, s);
export const clearSave = () => storage.del(KEYS.save);
