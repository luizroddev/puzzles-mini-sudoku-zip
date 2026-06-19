/**
 * GET /api/puzzle?type&difficulty[&size] → a server-issued puzzle reference with
 * a fresh random seed. The client builds the actual puzzle from the seed.
 */
import { json, preflight } from './_shared.mts';

const SUDOKU_DIFFS = new Set(['easy', 'medium', 'hard', 'expert']);

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! & 0x7fffffff;
}

export default async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return preflight();
  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const difficulty = url.searchParams.get('difficulty') ?? 'easy';
  if (!SUDOKU_DIFFS.has(difficulty)) return json({ error: 'bad difficulty' }, 400);

  if (type === 'sudoku') {
    const size = url.searchParams.get('size') === '6' ? 6 : 4;
    return json({ ref: { type: 'sudoku', size, difficulty, seed: randomSeed() } });
  }
  if (type === 'zip') {
    return json({ ref: { type: 'zip', difficulty, seed: randomSeed() } });
  }
  return json({ error: 'type must be sudoku or zip' }, 400);
};

export const config = { path: '/api/puzzle' };
