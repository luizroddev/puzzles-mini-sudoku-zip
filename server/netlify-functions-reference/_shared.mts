/**
 * Shared helpers for the Netlify Functions backend: Supabase service client,
 * bearer-token auth, and small JSON/response utilities.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface UserRow {
  id: string;
  device_id: string;
  name: string;
  token: string;
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env not configured');
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
    },
  });
}

export function preflight(): Response {
  return json({}, 204);
}

export function bearer(req: Request): string | null {
  const h = req.headers.get('authorization') ?? '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1]! : null;
}

export async function userFromRequest(req: Request): Promise<UserRow | null> {
  const token = bearer(req);
  if (!token) return null;
  const { data } = await supabase().from('users').select('*').eq('token', token).maybeSingle();
  return (data as UserRow | null) ?? null;
}

export function randomToken(): string {
  // 32 bytes of hex via Web Crypto (available in the Netlify runtime).
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function safeName(input: unknown): string {
  if (typeof input !== 'string') return 'Player';
  const trimmed = input.trim().replace(/[^\p{L}\p{N} _.-]/gu, '').slice(0, 20);
  return trimmed || 'Player';
}
