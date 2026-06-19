/**
 * Zip engine — pure rules for the path puzzle. No generation, no React.
 *
 * Board is N x N, cells row-major. A solution is an ordered list of cell
 * indices forming a Hamiltonian path that starts at checkpoint 1 and visits
 * the numbered checkpoints in ascending order, crossing no walls.
 */
import type { WallSet, ZipPuzzle } from './types';

export function zipIndex(N: number, r: number, c: number): number {
  return r * N + c;
}

export function zipRow(N: number, cell: number): number {
  return Math.floor(cell / N);
}

export function zipCol(N: number, cell: number): number {
  return cell % N;
}

/** Orthogonal grid neighbours of a cell (ignores walls). */
export function zipNeighbors(N: number, cell: number): number[] {
  const r = zipRow(N, cell);
  const c = zipCol(N, cell);
  const out: number[] = [];
  if (r > 0) out.push(zipIndex(N, r - 1, c));
  if (r < N - 1) out.push(zipIndex(N, r + 1, c));
  if (c > 0) out.push(zipIndex(N, r, c - 1));
  if (c < N - 1) out.push(zipIndex(N, r, c + 1));
  return out;
}

/** Order-independent key for the wall between two cells. */
export function wallKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

export function hasWall(walls: WallSet, a: number, b: number): boolean {
  return walls.has(wallKey(a, b));
}

/** True if a→b is a legal single step: orthogonally adjacent and not walled. */
export function passable(N: number, walls: WallSet, a: number, b: number): boolean {
  if (!zipNeighbors(N, a).includes(b)) return false;
  return !hasWall(walls, a, b);
}

/** A path is valid if every step is passable and no cell repeats. */
export function isPathValid(N: number, walls: WallSet, path: number[]): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    const cell = path[i]!;
    if (seen.has(cell)) return false;
    seen.add(cell);
    if (i > 0 && !passable(N, walls, path[i - 1]!, cell)) return false;
  }
  return true;
}

/**
 * True if the checkpoints encountered along the path appear as 1, 2, 3, …
 * with no gaps and in ascending order. Works for partial paths.
 */
export function pathOrderOk(checkpoints: Record<number, number>, path: number[]): boolean {
  let expected = 1;
  for (const cell of path) {
    const num = checkpoints[cell];
    if (num !== undefined) {
      if (num !== expected) return false;
      expected++;
    }
  }
  return true;
}

/** The next checkpoint number the player still needs to reach. */
export function expectedNext(checkpoints: Record<number, number>, path: number[]): number {
  let expected = 1;
  for (const cell of path) {
    if (checkpoints[cell] === expected) expected++;
  }
  return expected;
}

/** True when `path` is a complete, ordered, wall-respecting solution. */
export function isSolved(puzzle: ZipPuzzle, path: number[]): boolean {
  const { N, walls, checkpoints } = puzzle;
  if (path.length !== N * N) return false;
  if (checkpoints[path[0]!] !== 1) return false;
  if (!isPathValid(N, walls, path)) return false;
  return pathOrderOk(checkpoints, path);
}
