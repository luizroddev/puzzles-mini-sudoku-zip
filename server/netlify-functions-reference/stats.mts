/**
 * GET /api/stats → server-side aggregate of the authenticated user's results.
 */
import { json, preflight, supabase, userFromRequest } from './_shared.mts';

interface Row {
  type: string;
  difficulty: string;
  time_sec: number;
  hints: number;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { data } = await supabase()
    .from('results')
    .select('type, difficulty, time_sec, hints')
    .eq('user_id', user.id);

  const rows = (data ?? []) as Row[];
  const agg: Record<string, { played: number; totalTimeSec: number; hints: number; best: Record<string, number> }> = {
    sudoku: { played: 0, totalTimeSec: 0, hints: 0, best: {} },
    zip: { played: 0, totalTimeSec: 0, hints: 0, best: {} },
  };
  for (const r of rows) {
    const g = agg[r.type];
    if (!g) continue;
    g.played += 1;
    g.totalTimeSec += r.time_sec;
    g.hints += r.hints;
    const prev = g.best[r.difficulty];
    if (prev === undefined || r.time_sec < prev) g.best[r.difficulty] = r.time_sec;
  }
  return json(agg);
};

export const config = { path: '/api/stats' };
