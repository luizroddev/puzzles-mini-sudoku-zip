/**
 * Seeded Zip generation.
 *
 * 1. Build a random Hamiltonian path with the backbite algorithm.
 * 2. Distribute checkpoints along it (1 at the start, k at the end).
 * 3. Add walls only between non-consecutive solution cells, so the solution
 *    is never blocked (uniqueness is best-effort — see PRD §19).
 *
 * Pure and deterministic given an Rng.
 */
import type { Rng } from './rng';
import type { WallSet, ZipDifficulty, ZipPuzzle } from './types';
import { zipNeighbors, wallKey } from './zip';

export interface ZipParams {
  N: number;
  checkpoints: number;
  walls: number;
}

export function zipParams(difficulty: ZipDifficulty): ZipParams {
  switch (difficulty) {
    case 'easy':
      return { N: 5, checkpoints: 5, walls: 2 };
    case 'medium':
      return { N: 6, checkpoints: 6, walls: 5 };
    case 'hard':
      return { N: 7, checkpoints: 7, walls: 9 };
    case 'expert':
      return { N: 8, checkpoints: 8, walls: 14 };
  }
}

/** A boustrophedon (snake) Hamiltonian path that covers the whole board. */
function snakePath(N: number): number[] {
  const path: number[] = [];
  for (let r = 0; r < N; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < N; c++) path.push(r * N + c);
    } else {
      for (let c = N - 1; c >= 0; c--) path.push(r * N + c);
    }
  }
  return path;
}

function reverseInPlace(arr: number[], i: number, j: number): void {
  while (i < j) {
    const t = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = t;
    i++;
    j--;
  }
}

/**
 * One backbite move: from a random endpoint, connect to a random grid neighbour
 * and reverse the dangling segment. Keeps the array a Hamiltonian path.
 */
function backbite(N: number, path: number[], rng: Rng): void {
  const n = path.length;
  if (rng.int(2) === 0) {
    // tail end
    const end = path[n - 1]!;
    const w = rng.pick(zipNeighbors(N, end));
    const j = path.indexOf(w);
    if (j < n - 2) reverseInPlace(path, j + 1, n - 1);
  } else {
    // head end
    const end = path[0]!;
    const w = rng.pick(zipNeighbors(N, end));
    const j = path.indexOf(w);
    if (j > 1) reverseInPlace(path, 0, j - 1);
  }
}

export function generateHamiltonianPath(N: number, rng: Rng): number[] {
  const path = snakePath(N);
  const moves = N * N * 12;
  for (let i = 0; i < moves; i++) backbite(N, path, rng);
  return path;
}

/** Pick k strictly-increasing positions in [0, n-1] with 0 and n-1 included. */
function checkpointPositions(n: number, k: number, rng: Rng): number[] {
  const positions = new Set<number>([0, n - 1]);
  // Seed interior positions, jittered around even spacing.
  for (let i = 1; i < k - 1 && positions.size < k; i++) {
    const base = Math.round((i * (n - 1)) / (k - 1));
    const jitter = rng.int(3) - 1;
    let pos = Math.min(n - 2, Math.max(1, base + jitter));
    while (positions.has(pos) && pos < n - 2) pos++;
    while (positions.has(pos) && pos > 1) pos--;
    positions.add(pos);
  }
  // Top up if jitter collisions left us short.
  let fill = 1;
  while (positions.size < k && fill < n - 1) {
    if (!positions.has(fill)) positions.add(fill);
    fill++;
  }
  return [...positions].sort((a, b) => a - b);
}

export function generateZip(rng: Rng, difficulty: ZipDifficulty): ZipPuzzle {
  const { N, checkpoints: k, walls: wallTarget } = zipParams(difficulty);
  const solution = generateHamiltonianPath(N, rng);

  // Checkpoints along the path, numbered 1..k.
  const positions = checkpointPositions(solution.length, k, rng);
  const checkpoints: Record<number, number> = {};
  positions.forEach((pos, i) => {
    checkpoints[solution[pos]!] = i + 1;
  });

  // Candidate walls: adjacent pairs that are NOT consecutive in the solution.
  const consecutive = new Set<string>();
  for (let i = 1; i < solution.length; i++) {
    consecutive.add(wallKey(solution[i - 1]!, solution[i]!));
  }
  const candidates = new Set<string>();
  for (let cell = 0; cell < N * N; cell++) {
    for (const nb of zipNeighbors(N, cell)) {
      const key = wallKey(cell, nb);
      if (!consecutive.has(key)) candidates.add(key);
    }
  }
  const walls: WallSet = new Set(rng.shuffle([...candidates]).slice(0, wallTarget));

  const seed = rng.int(0x7fffffff);
  return {
    id: `zip-${N}-${difficulty}-${seed}`,
    seed,
    N,
    checkpoints,
    solution,
    walls,
    difficulty,
  };
}
