/**
 * POST /api/auth { deviceId } → { token, userId, name }
 * Finds or creates an anonymous user keyed by device id and returns a token.
 */
import { json, preflight, supabase, randomToken, safeName, type UserRow } from './_shared.mts';

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: { deviceId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad json' }, 400);
  }
  const deviceId = typeof body.deviceId === 'string' ? body.deviceId.slice(0, 64) : '';
  if (!deviceId) return json({ error: 'deviceId required' }, 400);

  const db = supabase();
  const existing = await db.from('users').select('*').eq('device_id', deviceId).maybeSingle();
  if (existing.data) {
    const u = existing.data as UserRow;
    return json({ token: u.token, userId: u.id, name: u.name });
  }

  const token = randomToken();
  const name = safeName(`Player ${Math.floor(1000 + Math.random() * 9000)}`);
  const inserted = await db
    .from('users')
    .insert({ device_id: deviceId, token, name })
    .select('*')
    .single();

  if (inserted.error || !inserted.data) {
    return json({ error: 'could not create user' }, 500);
  }
  const u = inserted.data as UserRow;
  return json({ token: u.token, userId: u.id, name: u.name });
};

export const config = { path: '/api/auth' };
