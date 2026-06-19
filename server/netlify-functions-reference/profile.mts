/**
 * GET  /api/profile → { userId, name }
 * POST /api/profile { name } → { ok: true }
 */
import { json, preflight, supabase, userFromRequest, safeName } from './_shared.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  const user = await userFromRequest(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  if (req.method === 'GET') {
    return json({ userId: user.id, name: user.name });
  }
  if (req.method === 'POST') {
    let body: { name?: string };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'bad json' }, 400);
    }
    const name = safeName(body.name);
    const { error } = await supabase().from('users').update({ name }).eq('id', user.id);
    if (error) return json({ ok: false }, 500);
    return json({ ok: true, name });
  }
  return json({ error: 'method not allowed' }, 405);
};

export const config = { path: '/api/profile' };
