import { describe, it, expect } from 'vitest';
import {
  zipIndex,
  zipNeighbors,
  wallKey,
  hasWall,
  passable,
  isPathValid,
  pathOrderOk,
  expectedNext,
  isSolved,
} from '../zip';
import type { WallSet, ZipPuzzle } from '../types';

// 3x3 board, snake Hamiltonian path:
//  0 1 2
//  3 4 5
//  6 7 8
// path: 0,1,2,5,4,3,6,7,8
const PATH_3: number[] = [0, 1, 2, 5, 4, 3, 6, 7, 8];

function puzzle3(walls: WallSet = new Set()): ZipPuzzle {
  return {
    id: 't',
    seed: 0,
    N: 3,
    checkpoints: { 0: 1, 2: 2, 8: 3 },
    solution: PATH_3,
    walls,
    difficulty: 'easy',
  };
}

describe('geometry', () => {
  it('zipIndex maps (row,col) to offset', () => {
    expect(zipIndex(3, 0, 0)).toBe(0);
    expect(zipIndex(3, 2, 2)).toBe(8);
  });

  it('zipNeighbors returns orthogonal neighbours, respecting edges', () => {
    expect(zipNeighbors(3, 0).sort((a, b) => a - b)).toEqual([1, 3]);
    expect(zipNeighbors(3, 4).sort((a, b) => a - b)).toEqual([1, 3, 5, 7]);
    expect(zipNeighbors(3, 8).sort((a, b) => a - b)).toEqual([5, 7]);
  });
});

describe('walls', () => {
  it('wallKey is order-independent', () => {
    expect(wallKey(2, 5)).toBe(wallKey(5, 2));
  });

  it('hasWall detects a placed wall', () => {
    const walls: WallSet = new Set([wallKey(1, 2)]);
    expect(hasWall(walls, 1, 2)).toBe(true);
    expect(hasWall(walls, 2, 1)).toBe(true);
    expect(hasWall(walls, 0, 1)).toBe(false);
  });

  it('passable requires adjacency and no wall', () => {
    const walls: WallSet = new Set([wallKey(1, 2)]);
    expect(passable(3, walls, 0, 1)).toBe(true);
    expect(passable(3, walls, 1, 2)).toBe(false); // wall
    expect(passable(3, walls, 0, 2)).toBe(false); // not adjacent
  });
});

describe('isPathValid', () => {
  it('accepts a valid wall-free path', () => {
    expect(isPathValid(3, new Set(), PATH_3)).toBe(true);
  });

  it('rejects a path with a non-adjacent jump', () => {
    expect(isPathValid(3, new Set(), [0, 2])).toBe(false);
  });

  it('rejects a path that repeats a cell', () => {
    expect(isPathValid(3, new Set(), [0, 1, 0])).toBe(false);
  });

  it('rejects a path crossing a wall', () => {
    const walls: WallSet = new Set([wallKey(1, 2)]);
    expect(isPathValid(3, walls, [0, 1, 2])).toBe(false);
  });

  it('accepts an empty or single-cell path', () => {
    expect(isPathValid(3, new Set(), [])).toBe(true);
    expect(isPathValid(3, new Set(), [4])).toBe(true);
  });
});

describe('pathOrderOk', () => {
  const cps = { 0: 1, 2: 2, 8: 3 };

  it('accepts checkpoints reached in ascending order', () => {
    expect(pathOrderOk(cps, [0, 1, 2])).toBe(true);
    expect(pathOrderOk(cps, PATH_3)).toBe(true);
  });

  it('rejects reaching a later checkpoint before an earlier one', () => {
    // visiting cell 2 (cp 2) without first visiting cell 0 (cp 1)
    expect(pathOrderOk(cps, [1, 2])).toBe(false);
  });

  it('rejects skipping a checkpoint number', () => {
    expect(pathOrderOk({ 0: 1, 4: 3 }, [0, 1, 4])).toBe(false);
  });
});

describe('expectedNext', () => {
  it('reports the next checkpoint number to reach', () => {
    const cps = { 0: 1, 2: 2, 8: 3 };
    expect(expectedNext(cps, [])).toBe(1);
    expect(expectedNext(cps, [0, 1])).toBe(2);
    expect(expectedNext(cps, [0, 1, 2])).toBe(3);
  });
});

describe('isSolved', () => {
  it('is true for a full, ordered, valid path', () => {
    expect(isSolved(puzzle3(), PATH_3)).toBe(true);
  });

  it('is false if not all cells are covered', () => {
    expect(isSolved(puzzle3(), [0, 1, 2, 5, 4, 3, 6, 7])).toBe(false);
  });

  it('is false if it does not start at checkpoint 1', () => {
    const reversed = [...PATH_3].reverse(); // starts at cell 8 (cp 3)
    expect(isSolved(puzzle3(), reversed)).toBe(false);
  });

  it('is false if checkpoints are out of order', () => {
    // a full-cover path that hits cp 3 (cell 8) before cp 2 (cell 2)
    const p: number[] = [0, 3, 6, 7, 8, 5, 4, 1, 2];
    expect(isSolved(puzzle3(), p)).toBe(false);
  });
});
