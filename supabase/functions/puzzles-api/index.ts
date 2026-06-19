/**
 * Puzzles backend — a single Supabase Edge Function with an internal router.
 *
 * Endpoints (PRD §12), all under /functions/v1/puzzles-api/<name>:
 *   POST /auth        -> { token, userId, name }
 *   GET/POST /profile -> read / set display name
 *   POST /result      -> server-validated result submission, returns rank
 *   GET  /leaderboard -> best time per player for a board
 *   GET  /daily       -> deterministic daily config
 *   GET  /puzzle      -> a fresh random puzzle ref
 *   GET/POST /sync     -> cross-device meta-state blob
 *   GET  /stats       -> server aggregate of the user's results
 *
 * Runs on Deno; SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the
 * platform, so this function bypasses RLS without any secret being handled by
 * the client. Reuses the bundled pure core for authoritative validation.
 */
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
// Pure core imported from the published bundle via jsDelivr, pinned to a commit
// (same code the client ships; no secrets). Bump the SHA after changing core.
import { validateResult, dailyConfig, todayISO } from 'https://cdn.jsdelivr.net/gh/luizroddev/puzzles-mini-sudoku-zip@7e65c6fa85f10cdc3a46422b480b8496b9926a27/public/core-api.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function db(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey, x-client-info',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS },
  });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function safeName(input: unknown): string {
  if (typeof input !== 'string') return 'Player';
  const t = input.trim().replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 20);
  return t || 'Player';
}

interface UserRow {
  id: string;
  device_id: string;
  name: string;
  token: string;
}

function bearer(req: Request): string | null {
  const m = (req.headers.get('authorization') ?? '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

async function userFromReq(req: Request): Promise<UserRow | null> {
  const token = bearer(req);
  if (!token) return null;
  const { data } = await db().from('puzzles_users').select('*').eq('token', token).maybeSingle();
  return (data as UserRow | null) ?? null;
}

// --- handlers --------------------------------------------------------------

async function handleAuth(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({}));
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : '';
  if (!deviceId) return json({ error: 'deviceId required' }, 400);

  const conn = db();
  const existing = await conn.from('puzzles_users').select('*').eq('device_id', deviceId).maybeSingle();
  if (existing.data) {
    const u = existing.data as UserRow;
    return json({ token: u.token, userId: u.id, name: u.name });
  }
  const token = randomToken();
  const name = `Player ${Math.floor(1000 + Math.random() * 9000)}`;
  const ins = await conn.from('puzzles_users').insert({ device_id: deviceId, token, name }).select('*').single();
  if (ins.error || !ins.data) return json({ error: 'could not create user' }, 500);
  const u = ins.data as UserRow;
  return json({ token: u.token, userId: u.id, name: u.name });
}

async function handleProfile(req: Request): Promise<Response> {
  const user = await userFromReq(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (req.method === 'GET') return json({ userId: user.id, name: user.name });
  const body = await req.json().catch(() => ({}));
  const name = safeName(body.name);
  const { error } = await db().from('puzzles_users').update({ name }).eq('id', user.id);
  return error ? json({ ok: false }, 500) : json({ ok: true, name });
}

async function handleResult(req: Request): Promise<Response> {
  const user = await userFromReq(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const payload = await req.json().catch(() => null);
  if (!payload?.ref) return json({ error: 'missing ref' }, 400);

  const verdict = validateResult({
    ref: payload.ref,
    timeSec: payload.timeSec,
    errors: payload.errors,
    hints: payload.hints,
    grid: payload.grid,
    path: payload.path,
  });
  if (!verdict.valid) return json({ accepted: false, reason: verdict.reason });

  const ref = payload.ref;
  const conn = db();
  const ins = await conn.from('puzzles_results').insert({
    user_id: user.id,
    type: ref.type,
    difficulty: ref.difficulty,
    size: ref.type === 'sudoku' ? ref.size : null,
    seed: ref.seed,
    time_sec: Math.round(payload.timeSec),
    errors: payload.errors,
    hints: payload.hints,
    is_daily: !!payload.isDaily,
    date_iso: payload.isDaily ? payload.dateISO ?? null : null,
  });
  if (ins.error) return json({ error: 'could not store result' }, 500);

  let q = conn
    .from('puzzles_results')
    .select('id', { count: 'exact', head: true })
    .eq('type', ref.type)
    .eq('difficulty', ref.difficulty)
    .lt('time_sec', Math.round(payload.timeSec));
  if (payload.isDaily && payload.dateISO) q = q.eq('is_daily', true).eq('date_iso', payload.dateISO);
  const { count } = await q;
  return json({ accepted: true, rank: (count ?? 0) + 1 });
}

async function handleLeaderboard(req: Request, url: URL): Promise<Response> {
  const type = url.searchParams.get('type');
  const difficulty = url.searchParams.get('difficulty');
  const daily = url.searchParams.get('daily');
  if (!type || !difficulty) return json({ error: 'type and difficulty required' }, 400);
  const me = await userFromReq(req);

  let q = db()
    .from('puzzles_results')
    .select('user_id, time_sec, puzzles_users(name)')
    .eq('type', type)
    .eq('difficulty', difficulty)
    .order('time_sec', { ascending: true })
    .limit(200);
  if (daily) {
    const date = daily === 'today' ? todayISO(new Date()) : daily;
    q = q.eq('is_daily', true).eq('date_iso', date);
  }
  const { data, error } = await q;
  if (error) return json([]);

  const best = new Map<string, { user_id: string; time_sec: number; users: { name: string } | null }>();
  for (const row of (data ?? []) as any[]) if (!best.has(row.user_id)) best.set(row.user_id, row);
  const entries = [...best.values()]
    .sort((a, b) => a.time_sec - b.time_sec)
    .slice(0, 20)
    .map((row, i) => ({
      rank: i + 1,
      name: row.puzzles_users?.name ?? 'Player',
      timeSec: row.time_sec,
      isMe: me ? row.user_id === me.id : false,
    }));
  return json(entries);
}

function handleDaily(url: URL): Response {
  const date = url.searchParams.get('date') || todayISO(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400);
  return json({ date, config: dailyConfig(date) });
}

function handlePuzzle(url: URL): Response {
  const type = url.searchParams.get('type');
  const difficulty = url.searchParams.get('difficulty') ?? 'easy';
  if (!['easy', 'medium', 'hard', 'expert'].includes(difficulty)) return json({ error: 'bad difficulty' }, 400);
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  const seed = a[0] & 0x7fffffff;
  if (type === 'sudoku') {
    const size = url.searchParams.get('size') === '6' ? 6 : 4;
    return json({ ref: { type: 'sudoku', size, difficulty, seed } });
  }
  if (type === 'zip') return json({ ref: { type: 'zip', difficulty, seed } });
  return json({ error: 'type must be sudoku or zip' }, 400);
}

async function handleSync(req: Request): Promise<Response> {
  const user = await userFromReq(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const conn = db();
  if (req.method === 'GET') {
    const { data } = await conn.from('puzzles_users').select('sync_state').eq('id', user.id).maybeSingle();
    return json({ state: (data as { sync_state?: unknown } | null)?.sync_state ?? null });
  }
  const body = await req.json().catch(() => ({}));
  const { error } = await conn.from('puzzles_users').update({ sync_state: body.state ?? null }).eq('id', user.id);
  return error ? json({ ok: false }, 500) : json({ ok: true });
}

async function handleStats(req: Request): Promise<Response> {
  const user = await userFromReq(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { data } = await db().from('puzzles_results').select('type, difficulty, time_sec, hints').eq('user_id', user.id);
  const agg: Record<string, { played: number; totalTimeSec: number; hints: number; best: Record<string, number> }> = {
    sudoku: { played: 0, totalTimeSec: 0, hints: 0, best: {} },
    zip: { played: 0, totalTimeSec: 0, hints: 0, best: {} },
  };
  for (const r of (data ?? []) as any[]) {
    const g = agg[r.type];
    if (!g) continue;
    g.played += 1;
    g.totalTimeSec += r.time_sec;
    g.hints += r.hints;
    const prev = g.best[r.difficulty];
    if (prev === undefined || r.time_sec < prev) g.best[r.difficulty] = r.time_sec;
  }
  return json(agg);
}

// --- router ----------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const i = parts.indexOf('puzzles-api');
  const route = (i >= 0 ? parts.slice(i + 1) : parts).join('/');

  try {
    switch (route) {
      case '':
      case 'health':
        return json({ ok: true, service: 'puzzles-api' });
      case 'auth':
        return await handleAuth(req);
      case 'profile':
        return await handleProfile(req);
      case 'result':
        return await handleResult(req);
      case 'leaderboard':
        return await handleLeaderboard(req, url);
      case 'daily':
        return handleDaily(url);
      case 'puzzle':
        return handlePuzzle(url);
      case 'sync':
        return await handleSync(req);
      case 'stats':
        return await handleStats(req);
      default:
        return json({ error: 'not found', route }, 404);
    }
  } catch (e) {
    return json({ error: 'server error', detail: String(e) }, 500);
  }
});
