/**
 * Cross-device sync of the client's meta state (settings/stats/streak/daily).
 * GET  /api/sync → { state } the last uploaded blob (or null)
 * POST /api/sync { state } → { ok: true } stores the blob on the user row.
 */
import { json, preflight, supabase, userFromRequest } from './_shared.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'unauthorized' }, 401);
  const db = supabase();

  if (req.method === 'GET') {
    const { data } = await db.from('users').select('sync_state').eq('id', user.id).maybeSingle();
    return json({ state: (data as { sync_state?: unknown } | null)?.sync_state ?? null });
  }
  if (req.method === 'POST') {
    let body: { state?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad json' }, 400);
    }
    const { error } = await db.from('users').update({ sync_state: body.state ?? null }).eq('id', user.id);
    if (error) return json({ ok: false }, 500);
    return json({ ok: true });
  }
  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/sync' };
