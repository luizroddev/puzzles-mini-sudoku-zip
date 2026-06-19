/**
 * Backend client for the §12 contracts. Every call is best-effort: on any
 * failure (offline, server down, not-yet-deployed) it resolves to null so the
 * app stays fully playable without a backend.
 */
import { storage } from '../state/storage';
import type { PuzzleRef } from '../core/factory';

// Public Supabase Edge Function endpoint + publishable (anon) key. Both are safe
// to ship in the client; the service-role key never leaves the edge runtime.
const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  'https://egdomhlbvdovefxjwava.supabase.co/functions/v1/puzzles-api';
const SUPABASE_KEY =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZG9taGxidmRvdmVmeGp3YXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY5OTA3MTUsImV4cCI6MjAyMjU2NjcxNX0.E-w6ucRXa9R8_yF4ihKzwwL3nguMWVmI5yh2WHnF8g0';

const DEVICE_KEY = 'gh_device';
const AUTH_KEY = 'gh_auth';

export interface AuthInfo {
  token: string;
  userId: string;
  name: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  timeSec: number;
  isMe?: boolean;
}

export interface SubmitPayload {
  ref: PuzzleRef;
  timeSec: number;
  errors: number;
  hints: number;
  grid?: number[];
  path?: number[];
  isDaily: boolean;
  dateISO?: string;
}

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return 'dev-' + Math.abs(Date.now() ^ (performance?.now?.() ?? 0)).toString(36) + Math.random().toString(36).slice(2);
}

async function deviceId(): Promise<string> {
  let id = await storage.get<string>(DEVICE_KEY);
  if (!id) {
    id = randomId();
    await storage.set(DEVICE_KEY, id);
  }
  return id;
}

async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const auth = await storage.get<AuthInfo>(AUTH_KEY);
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        apikey: SUPABASE_KEY,
        ...(auth?.token ? { authorization: `Bearer ${auth.token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function ensureAuth(): Promise<AuthInfo | null> {
  const existing = await storage.get<AuthInfo>(AUTH_KEY);
  if (existing?.token) return existing;
  const id = await deviceId();
  const auth = await request<AuthInfo>('/auth', {
    method: 'POST',
    body: JSON.stringify({ deviceId: id }),
  });
  if (auth) await storage.set(AUTH_KEY, auth);
  return auth;
}

export async function submitResult(
  payload: SubmitPayload,
): Promise<{ accepted: boolean; rank?: number } | null> {
  await ensureAuth();
  return request('/result', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getLeaderboard(params: {
  type: string;
  difficulty: string;
  daily?: string;
}): Promise<LeaderboardEntry[] | null> {
  const q = new URLSearchParams(params as Record<string, string>).toString();
  return request<LeaderboardEntry[]>(`/leaderboard?${q}`);
}

export async function getProfileName(): Promise<string | null> {
  const auth = await ensureAuth();
  return auth?.name ?? null;
}

export async function setProfileName(name: string): Promise<boolean> {
  const res = await request<{ ok: boolean }>('/profile', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (res?.ok) {
    const auth = await storage.get<AuthInfo>(AUTH_KEY);
    if (auth) await storage.set(AUTH_KEY, { ...auth, name });
  }
  return !!res?.ok;
}
