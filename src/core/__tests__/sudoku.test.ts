import { describe, it, expect } from 'vitest';
import {
  SPEC_4,
  SPEC_6,
  idx,
  rowIndices,
  colIndices,
  regionIndices,
  peers,
  isValidPlacement,
  findConflicts,
  isComplete,
  completedGroups,
} from '../sudoku';
import type { Grid } from '../types';

// A valid full 4x4 solution (regions 2x2):
//  1 2 | 3 4
//  3 4 | 1 2
//  ----+----
//  2 1 | 4 3
//  4 3 | 2 1
const SOLVED_4: Grid = [
  1, 2, 3, 4,
  3, 4, 1, 2,
  2, 1, 4, 3,
  4, 3, 2, 1,
];

describe('specs', () => {
  it('describes 4x4 and 6x6 geometry', () => {
    expect(SPEC_4).toEqual({ N: 4, br: 2, bc: 2 });
    expect(SPEC_6).toEqual({ N: 6, br: 2, bc: 3 });
  });
});

describe('index helpers', () => {
  it('idx maps (row,col) to row-major offset', () => {
    expect(idx(4, 0, 0)).toBe(0);
    expect(idx(4, 1, 2)).toBe(6);
    expect(idx(4, 3, 3)).toBe(15);
  });

  it('rowIndices returns the whole row', () => {
    expect(rowIndices(4, 1)).toEqual([4, 5, 6, 7]);
  });

  it('colIndices returns the whole column', () => {
    expect(colIndices(4, 2)).toEqual([2, 6, 10, 14]);
  });

  it('regionIndices returns the 2x2 block for a 4x4 board', () => {
    // top-right region contains cells (0,2),(0,3),(1,2),(1,3)
    expect(regionIndices(SPEC_4, idx(4, 0, 3)).sort((a, b) => a - b)).toEqual([2, 3, 6, 7]);
  });

  it('regionIndices returns the 2x3 block for a 6x6 board', () => {
    // region containing (0,0): rows 0-1, cols 0-2
    expect(regionIndices(SPEC_6, idx(6, 1, 1)).sort((a, b) => a - b)).toEqual([0, 1, 2, 6, 7, 8]);
  });

  it('peers excludes the cell itself and has no duplicates', () => {
    const p = peers(SPEC_4, idx(4, 0, 0));
    expect(p).not.toContain(idx(4, 0, 0));
    expect(new Set(p).size).toBe(p.length);
    // row(3) + col(3) + region(1 new) = 7 peers in a 4x4
    expect(p.length).toBe(7);
  });
});

describe('isValidPlacement', () => {
  it('allows a non-conflicting digit', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[idx(4, 0, 0)] = 1;
    expect(isValidPlacement(SPEC_4, grid, idx(4, 0, 1), 2)).toBe(true);
  });

  it('rejects a digit duplicated in the row', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[idx(4, 0, 0)] = 1;
    expect(isValidPlacement(SPEC_4, grid, idx(4, 0, 3), 1)).toBe(false);
  });

  it('rejects a digit duplicated in the column', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[idx(4, 0, 0)] = 1;
    expect(isValidPlacement(SPEC_4, grid, idx(4, 3, 0), 1)).toBe(false);
  });

  it('rejects a digit duplicated in the region', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[idx(4, 0, 0)] = 1;
    expect(isValidPlacement(SPEC_4, grid, idx(4, 1, 1), 1)).toBe(false);
  });

  it('ignores the cell being placed when checking', () => {
    const grid = SOLVED_4.slice();
    // Re-placing the same value in an already-filled cell is valid.
    expect(isValidPlacement(SPEC_4, grid, idx(4, 0, 0), 1)).toBe(true);
  });
});

describe('findConflicts', () => {
  it('returns an empty set for a valid solution', () => {
    expect(findConflicts(SPEC_4, SOLVED_4).size).toBe(0);
  });

  it('flags both cells that share a duplicate in a unit', () => {
    const grid = SOLVED_4.slice();
    grid[idx(4, 0, 1)] = 1; // now row 0 has two 1s at cols 0 and 1
    const conflicts = findConflicts(SPEC_4, grid);
    expect(conflicts.has(idx(4, 0, 0))).toBe(true);
    expect(conflicts.has(idx(4, 0, 1))).toBe(true);
  });

  it('ignores empty cells', () => {
    const grid: Grid = new Array(16).fill(0);
    expect(findConflicts(SPEC_4, grid).size).toBe(0);
  });
});

describe('isComplete', () => {
  it('is true for a full valid grid', () => {
    expect(isComplete(SPEC_4, SOLVED_4)).toBe(true);
  });

  it('is false when a cell is empty', () => {
    const grid = SOLVED_4.slice();
    grid[0] = 0;
    expect(isComplete(SPEC_4, grid)).toBe(false);
  });

  it('is false when full but invalid', () => {
    const grid = SOLVED_4.slice();
    grid[idx(4, 0, 0)] = 2; // breaks row/col/region
    expect(isComplete(SPEC_4, grid)).toBe(false);
  });
});

describe('completedGroups', () => {
  it('reports a fully and validly filled row/col/region', () => {
    const grid: Grid = new Array(16).fill(0);
    // Fill row 0 validly: 1 2 3 4
    grid[0] = 1; grid[1] = 2; grid[2] = 3; grid[3] = 4;
    const groups = completedGroups(SPEC_4, grid);
    expect(groups.rows).toContain(0);
    expect(groups.cols).not.toContain(0);
  });

  it('does not report a row that is full but invalid', () => {
    const grid: Grid = new Array(16).fill(0);
    grid[0] = 1; grid[1] = 1; grid[2] = 3; grid[3] = 4; // duplicate 1
    expect(completedGroups(SPEC_4, grid).rows).not.toContain(0);
  });
});
