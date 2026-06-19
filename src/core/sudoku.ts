/**
 * Mini Sudoku engine — pure rules, no generation, no React.
 *
 * A board is a flat row-major `Grid` (length N*N). 0 = empty, 1..N = a digit.
 * Regions are `br` rows by `bc` cols (see SudokuSpec).
 */
import type { Grid, SudokuSpec } from './types';

export const SPEC_4: SudokuSpec = { N: 4, br: 2, bc: 2 };
export const SPEC_6: SudokuSpec = { N: 6, br: 2, bc: 3 };

export function idx(N: number, r: number, c: number): number {
  return r * N + c;
}

export function rowOf(N: number, cell: number): number {
  return Math.floor(cell / N);
}

export function colOf(N: number, cell: number): number {
  return cell % N;
}

export function rowIndices(N: number, r: number): number[] {
  const out: number[] = [];
  for (let c = 0; c < N; c++) out.push(idx(N, r, c));
  return out;
}

export function colIndices(N: number, c: number): number[] {
  const out: number[] = [];
  for (let r = 0; r < N; r++) out.push(idx(N, r, c));
  return out;
}

/** Indices of the region (block) containing `cell`. */
export function regionIndices(spec: SudokuSpec, cell: number): number[] {
  const { N, br, bc } = spec;
  const r = rowOf(N, cell);
  const c = colOf(N, cell);
  const r0 = Math.floor(r / br) * br;
  const c0 = Math.floor(c / bc) * bc;
  const out: number[] = [];
  for (let dr = 0; dr < br; dr++) {
    for (let dc = 0; dc < bc; dc++) {
      out.push(idx(N, r0 + dr, c0 + dc));
    }
  }
  return out;
}

/** All cells sharing a unit (row/col/region) with `cell`, excluding `cell` itself. */
export function peers(spec: SudokuSpec, cell: number): number[] {
  const { N } = spec;
  const set = new Set<number>();
  for (const p of rowIndices(N, rowOf(N, cell))) set.add(p);
  for (const p of colIndices(N, colOf(N, cell))) set.add(p);
  for (const p of regionIndices(spec, cell)) set.add(p);
  set.delete(cell);
  return [...set];
}

/** True if placing `val` at `cell` breaks no row/col/region constraint. */
export function isValidPlacement(spec: SudokuSpec, grid: Grid, cell: number, val: number): boolean {
  if (val === 0) return true;
  for (const p of peers(spec, cell)) {
    if (grid[p] === val) return false;
  }
  return true;
}

/** Indices of all cells that participate in a duplicate within some unit. */
export function findConflicts(spec: SudokuSpec, grid: Grid): Set<number> {
  const conflicts = new Set<number>();
  for (let cell = 0; cell < grid.length; cell++) {
    const val = grid[cell];
    if (!val) continue;
    for (const p of peers(spec, cell)) {
      if (grid[p] === val) {
        conflicts.add(cell);
        conflicts.add(p);
      }
    }
  }
  return conflicts;
}

/** True when every cell is filled and there are no conflicts. */
export function isComplete(spec: SudokuSpec, grid: Grid): boolean {
  for (const v of grid) if (!v) return false;
  return findConflicts(spec, grid).size === 0;
}

function unitIsComplete(N: number, grid: Grid, cells: number[]): boolean {
  const seen = new Set<number>();
  for (const cell of cells) {
    const v = grid[cell];
    if (!v) return false;
    if (seen.has(v)) return false;
    seen.add(v);
  }
  return seen.size === N;
}

/** Which rows/cols/regions are fully and validly filled (for the green-flash effect). */
export function completedGroups(
  spec: SudokuSpec,
  grid: Grid,
): { rows: number[]; cols: number[]; regions: number[] } {
  const { N, br, bc } = spec;
  const rows: number[] = [];
  const cols: number[] = [];
  const regions: number[] = [];

  for (let r = 0; r < N; r++) {
    if (unitIsComplete(N, grid, rowIndices(N, r))) rows.push(r);
  }
  for (let c = 0; c < N; c++) {
    if (unitIsComplete(N, grid, colIndices(N, c))) cols.push(c);
  }
  let region = 0;
  for (let r0 = 0; r0 < N; r0 += br) {
    for (let c0 = 0; c0 < N; c0 += bc) {
      if (unitIsComplete(N, grid, regionIndices(spec, idx(N, r0, c0)))) regions.push(region);
      region++;
    }
  }
  return { rows, cols, regions };
}
