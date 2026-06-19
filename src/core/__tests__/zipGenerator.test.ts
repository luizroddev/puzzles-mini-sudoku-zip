import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { zipNeighbors, isPathValid, isSolved, hasWall } from '../zip';
import { generateHamiltonianPath, generateZip, zipParams } from '../zipGenerator';
import type { ZipDifficulty } from '../types';

describe('generateHamiltonianPath', () => {
  it('covers every cell exactly once', () => {
    const N = 6;
    const path = generateHamiltonianPath(N, makeRng(1));
    expect(path.length).toBe(N * N);
    expect(new Set(path).size).toBe(N * N);
  });

  it('every step is orthogonally adjacent', () => {
    const N = 6;
    const path = generateHamiltonianPath(N, makeRng(3));
    for (let i = 1; i < path.length; i++) {
      expect(zipNeighbors(N, path[i - 1]!)).toContain(path[i]!);
    }
  });

  it('is deterministic for a seed', () => {
    expect(generateHamiltonianPath(6, makeRng(9))).toEqual(generateHamiltonianPath(6, makeRng(9)));
  });

  it('produces different paths for different seeds', () => {
    expect(generateHamiltonianPath(6, makeRng(1))).not.toEqual(generateHamiltonianPath(6, makeRng(2)));
  });
});

describe('generateZip', () => {
  it('produces a puzzle whose recorded solution actually solves it', () => {
    const p = generateZip(makeRng(5), 'medium');
    expect(isSolved(p, p.solution)).toBe(true);
  });

  it('places checkpoint 1 at the path start and numbers them 1..k contiguously', () => {
    const p = generateZip(makeRng(5), 'medium');
    expect(p.checkpoints[p.solution[0]!]).toBe(1);
    const nums = Object.values(p.checkpoints).sort((a, b) => a - b);
    expect(nums).toEqual(nums.map((_, i) => i + 1));
  });

  it('never places a wall between consecutive solution cells', () => {
    const p = generateZip(makeRng(8), 'hard');
    for (let i = 1; i < p.solution.length; i++) {
      expect(hasWall(p.walls, p.solution[i - 1]!, p.solution[i]!)).toBe(false);
    }
  });

  it('is deterministic for a seed and difficulty', () => {
    const a = generateZip(makeRng(42), 'expert');
    const b = generateZip(makeRng(42), 'expert');
    expect(a.solution).toEqual(b.solution);
    expect([...a.walls].sort()).toEqual([...b.walls].sort());
    expect(a.checkpoints).toEqual(b.checkpoints);
  });

  it('uses the configured board size per difficulty', () => {
    expect(generateZip(makeRng(1), 'easy').N).toBe(zipParams('easy').N);
    expect(generateZip(makeRng(1), 'expert').N).toBe(zipParams('expert').N);
  });
});

describe('property: many seeds yield solvable Zip puzzles', () => {
  it('holds across difficulties', () => {
    const diffs: ZipDifficulty[] = ['easy', 'medium', 'hard', 'expert'];
    for (let seed = 1; seed <= 40; seed++) {
      const d = diffs[seed % diffs.length]!;
      const p = generateZip(makeRng(seed * 7), d);
      expect(isSolved(p, p.solution), `seed ${seed} ${d}`).toBe(true);
      expect(isPathValid(p.N, p.walls, p.solution), `valid seed ${seed}`).toBe(true);
    }
  });
});
