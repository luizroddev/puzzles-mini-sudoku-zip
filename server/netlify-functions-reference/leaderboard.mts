/**
 * GET /api/leaderboard?type&difficulty[&daily=today|YYYY-MM-DD]
 * Returns the best time per player for the given board, ascending.
 */
import { json, preflight, supabase, userFromRequest } from './_shared.mts';
import { todayISO } from '../../src/core/daily';

interface ResultRow {
  user_id: string;
  time_sec: number;
  users: { name: string } | null;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const difficulty = url.searchParams.get('difficulty');
  const daily = url.searchParams.get('daily');
  if (!type || !difficulty) return json({ error: 'type and difficulty required' }, 400);

  const me = await userFromRequest(req);
  const db = supabase();

  let q = db
    .from('results')
    .select('user_id, time_sec, users(name)')
    .eq('type', type)
    .eq('difficulty', difficulty)
    .order('time_sec', { ascending: true })
    .limit(200);

  if (daily) {
    const date = daily === 'today' ? todayISO(new Date()) : daily;
    q = q.eq('is_daily', true).eq('date_iso', date);
  }

  const { data, error } = await q;
  if (error) return json([], 200);

  // Keep each player's best time only.
  const bestByUser = new Map<string, ResultRow>();
  for (const row of (data ?? []) as unknown as ResultRow[]) {
    if (!bestByUser.has(row.user_id)) bestByUser.set(row.user_id, row);
  }
  const entries = [...bestByUser.values()]
    .sort((a, b) => a.time_sec - b.time_sec)
    .slice(0, 20)
    .map((row, i) => ({
      rank: i + 1,
      name: row.users?.name ?? 'Player',
      timeSec: row.time_sec,
      isMe: me ? row.user_id === me.id : false,
    }));

  return json(entries);
};

export const config = { path: '/api/leaderboard' };
