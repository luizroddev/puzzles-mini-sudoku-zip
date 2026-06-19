/**
 * POST /api/result → validates a submission server-side (regenerates the puzzle
 * from its seed via the shared core), records it, and returns the rank.
 */
import { json, preflight, supabase, userFromRequest } from './_shared.mts';
import { validateResult, type SubmittedResult } from '../../src/core/validate';

interface ResultPayload extends SubmittedResult {
  isDaily?: boolean;
  dateISO?: string;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const user = await userFromRequest(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let payload: ResultPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  if (!payload?.ref) return json({ error: 'missing ref' }, 400);

  // Authoritative validation: rebuild the puzzle and verify the solution + metrics.
  const verdict = validateResult({
    ref: payload.ref,
    timeSec: payload.timeSec,
    errors: payload.errors,
    hints: payload.hints,
    grid: payload.grid,
    path: payload.path,
  });
  if (!verdict.valid) {
    return json({ accepted: false, reason: verdict.reason }, 200);
  }

  const ref = payload.ref;
  const size = ref.type === 'sudoku' ? ref.size : null;
  const db = supabase();

  const insert = await db.from('results').insert({
    user_id: user.id,
    type: ref.type,
    difficulty: ref.difficulty,
    size,
    seed: ref.seed,
    time_sec: Math.round(payload.timeSec),
    errors: payload.errors,
    hints: payload.hints,
    is_daily: !!payload.isDaily,
    date_iso: payload.isDaily ? payload.dateISO ?? null : null,
  });
  if (insert.error) return json({ error: 'could not store result' }, 500);

  // Rank: how many submissions beat this time within the same board/difficulty.
  let q = db
    .from('results')
    .select('id', { count: 'exact', head: true })
    .eq('type', ref.type)
    .eq('difficulty', ref.difficulty)
    .lt('time_sec', Math.round(payload.timeSec));
  if (payload.isDaily && payload.dateISO) q = q.eq('is_daily', true).eq('date_iso', payload.dateISO);
  const { count } = await q;

  return json({ accepted: true, rank: (count ?? 0) + 1 });
};

export const config = { path: '/api/result' };
