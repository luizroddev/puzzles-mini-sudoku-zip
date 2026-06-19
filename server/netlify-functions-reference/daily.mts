/**
 * GET /api/daily?date=YYYY-MM-DD → the deterministic daily puzzle config.
 * The client can also compute this locally; this endpoint keeps the contract
 * complete and lets the server stay authoritative.
 */
import { json, preflight } from './_shared.mts';
import { dailyConfig, todayISO } from '../../src/core/daily';

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  const url = new URL(req.url);
  const date = url.searchParams.get('date') || todayISO(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400);
  return json({ date, config: dailyConfig(date) });
};

export const config = { path: '/api/daily' };
