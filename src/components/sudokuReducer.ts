/**
 * Pure reducer for a Sudoku match. Kept separate from the component so it can be
 * unit-tested (PRD §15: place, erase, undo/redo, error modes, completion).
 */
import type { Grid, SudokuErrorMode, SudokuSpec } from '../core/types';
import {
  completedGroups,
  findConflicts,
  isComplete,
  rowIndices,
  colIndices,
  regionIndices,
  idx,
} from '../core/sudoku';

export interface SudokuState {
  grid: Grid;
  notes: Record<number, number[]>;
  selected: number | null;
  past: { grid: Grid; notes: Record<number, number[]> }[];
  future: { grid: Grid; notes: Record<number, number[]> }[];
  errors: number;
  hints: number;
  noteMode: boolean;
  status: 'Playing' | 'Paused' | 'Won' | 'Failed';
  flash: number[];
  shake: number | null;
}

export interface SudokuCtx {
  spec: SudokuSpec;
  solution: Grid;
  given: Grid;
  errorMode: SudokuErrorMode;
  maxErrors: number;
}

export type SudokuAction =
  | { type: 'select'; cell: number }
  | { type: 'move'; dr: number; dc: number }
  | { type: 'input'; value: number }
  | { type: 'erase' }
  | { type: 'toggleNoteMode' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'hint' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'clearFlash' }
  | { type: 'clearShake' };

export function initSudoku(ctx: SudokuCtx, resume?: { grid: Grid; notes: Record<number, number[]>; errors: number; hints: number }): SudokuState {
  return {
    grid: resume ? resume.grid.slice() : ctx.given.slice(),
    notes: resume ? { ...resume.notes } : {},
    selected: null,
    past: [],
    future: [],
    errors: resume?.errors ?? 0,
    hints: resume?.hints ?? 0,
    noteMode: false,
    status: 'Playing',
    flash: [],
    shake: null,
  };
}

function snapshot(s: SudokuState) {
  return { grid: s.grid.slice(), notes: structuredCloneNotes(s.notes) };
}

function structuredCloneNotes(n: Record<number, number[]>): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  for (const k of Object.keys(n)) out[+k] = n[+k]!.slice();
  return out;
}

function newlyCompletedCells(ctx: SudokuCtx, before: Grid, after: Grid): number[] {
  const a = completedGroups(ctx.spec, before);
  const b = completedGroups(ctx.spec, after);
  const cells = new Set<number>();
  const { spec } = ctx;
  for (const r of b.rows) if (!a.rows.includes(r)) rowIndices(spec.N, r).forEach((c) => cells.add(c));
  for (const c of b.cols) if (!a.cols.includes(c)) colIndices(spec.N, c).forEach((x) => cells.add(x));
  // regions: recompute region cell sets by index
  let region = 0;
  for (let r0 = 0; r0 < spec.N; r0 += spec.br) {
    for (let c0 = 0; c0 < spec.N; c0 += spec.bc) {
      if (b.regions.includes(region) && !a.regions.includes(region)) {
        regionIndices(spec, idx(spec.N, r0, c0)).forEach((x) => cells.add(x));
      }
      region++;
    }
  }
  return [...cells];
}

export function reduceSudoku(state: SudokuState, action: SudokuAction, ctx: SudokuCtx): SudokuState {
  const { spec, solution, given } = ctx;
  if (state.status === 'Won' || state.status === 'Failed') {
    if (action.type === 'clearFlash') return { ...state, flash: [] };
    if (action.type === 'clearShake') return { ...state, shake: null };
    return state;
  }

  switch (action.type) {
    case 'select':
      return { ...state, selected: action.cell };

    case 'move': {
      const cur = state.selected ?? 0;
      const r = Math.floor(cur / spec.N);
      const c = cur % spec.N;
      const nr = Math.min(spec.N - 1, Math.max(0, r + action.dr));
      const nc = Math.min(spec.N - 1, Math.max(0, c + action.dc));
      return { ...state, selected: nr * spec.N + nc };
    }

    case 'toggleNoteMode':
      return { ...state, noteMode: !state.noteMode };

    case 'pause':
      return { ...state, status: 'Paused' };
    case 'resume':
      return { ...state, status: 'Playing' };
    case 'clearFlash':
      return { ...state, flash: [] };
    case 'clearShake':
      return { ...state, shake: null };

    case 'input': {
      const cell = state.selected;
      if (cell == null || given[cell] !== 0) return state;
      const { value } = action;

      if (state.noteMode) {
        if (state.grid[cell] !== 0) return state;
        const cur = state.notes[cell] ?? [];
        const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value].sort((a, b) => a - b);
        return { ...state, notes: { ...state.notes, [cell]: next } };
      }

      const before = state.grid;
      const grid = before.slice();
      grid[cell] = value;
      const notes = { ...state.notes };
      delete notes[cell];

      let errors = state.errors;
      let shake: number | null = null;
      let status: SudokuState['status'] = 'Playing';

      if (ctx.errorMode === 'classic' && value !== solution[cell]) {
        errors += 1;
        shake = cell;
        if (errors >= ctx.maxErrors) status = 'Failed';
      } else if (ctx.errorMode === 'relaxed') {
        if (findConflicts(spec, grid).has(cell)) shake = cell;
      }

      const flash = status === 'Playing' ? newlyCompletedCells(ctx, before, grid) : [];

      if (status !== 'Failed' && isComplete(spec, grid)) status = 'Won';

      return {
        ...state,
        grid,
        notes,
        errors,
        status,
        flash,
        shake,
        past: [...state.past, snapshot(state)],
        future: [],
      };
    }

    case 'erase': {
      const cell = state.selected;
      if (cell == null || given[cell] !== 0) return state;
      if (state.grid[cell] === 0 && !(state.notes[cell]?.length)) return state;
      const grid = state.grid.slice();
      grid[cell] = 0;
      const notes = { ...state.notes };
      delete notes[cell];
      return { ...state, grid, notes, past: [...state.past, snapshot(state)], future: [] };
    }

    case 'hint': {
      // Reveal the selected empty cell, or the first empty cell.
      let cell = state.selected;
      if (cell == null || state.grid[cell] !== 0 || given[cell] !== 0) {
        cell = state.grid.findIndex((v, i) => v === 0 && given[i] === 0);
      }
      if (cell == null || cell < 0) return state;
      const before = state.grid;
      const grid = before.slice();
      grid[cell] = solution[cell]!;
      const notes = { ...state.notes };
      delete notes[cell];
      const flash = newlyCompletedCells(ctx, before, grid);
      const status: SudokuState['status'] = isComplete(spec, grid) ? 'Won' : 'Playing';
      return {
        ...state,
        grid,
        notes,
        selected: cell,
        hints: state.hints + 1,
        flash,
        status,
        past: [...state.past, snapshot(state)],
        future: [],
      };
    }

    case 'undo': {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        ...state,
        grid: prev.grid,
        notes: prev.notes,
        past: state.past.slice(0, -1),
        future: [snapshot(state), ...state.future],
      };
    }

    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        grid: next.grid,
        notes: next.notes,
        past: [...state.past, snapshot(state)],
        future: state.future.slice(1),
      };
    }

    default:
      return state;
  }
}
