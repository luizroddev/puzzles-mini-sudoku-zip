/**
 * Key-value persistence. IndexedDB (via idb) with a localStorage fallback,
 * exposed through the same async get/set/del interface the PRD's window.storage
 * used (PRD §18). Everything is JSON-serialized; callers handle their own types.
 */
import { openDB, type IDBPDatabase } from 'idb';

export interface KV {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  del(key: string): Promise<void>;
}

const DB_NAME = 'puzzles';
const STORE = 'kv';

function indexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

function makeIdbKV(): KV {
  let dbp: Promise<IDBPDatabase> | null = null;
  const db = () => {
    if (!dbp) {
      dbp = openDB(DB_NAME, 1, {
        upgrade(d) {
          if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
        },
      });
    }
    return dbp;
  };
  return {
    async get<T>(key: string): Promise<T | null> {
      try {
        const v = await (await db()).get(STORE, key);
        return (v ?? null) as T | null;
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      try {
        await (await db()).put(STORE, value, key);
      } catch {
        /* best-effort */
      }
    },
    async del(key: string): Promise<void> {
      try {
        await (await db()).delete(STORE, key);
      } catch {
        /* best-effort */
      }
    },
  };
}

function makeLocalStorageKV(): KV {
  const mem = new Map<string, string>();
  const ls = (): Storage | null => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null;
    } catch {
      return null;
    }
  };
  const read = (key: string): string | null => ls()?.getItem(key) ?? mem.get(key) ?? null;
  const write = (key: string, val: string) => {
    mem.set(key, val);
    try {
      ls()?.setItem(key, val);
    } catch {
      /* quota / private mode — memory only */
    }
  };
  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = read(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async set<T>(key: string, value: T): Promise<void> {
      write(key, JSON.stringify(value));
    },
    async del(key: string): Promise<void> {
      mem.delete(key);
      try {
        ls()?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export const storage: KV = indexedDbAvailable() ? makeIdbKV() : makeLocalStorageKV();
