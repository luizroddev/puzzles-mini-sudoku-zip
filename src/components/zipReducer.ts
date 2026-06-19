/**
 * Pure reducer for a Zip match: building, extending and backtracking the path.
 * Separated from the component for unit testing (PRD §15).
 */
import type { ZipPuzzle } from '../core/types';
import { passable, expectedNext, isSolved, zipNeighbors, zipRow, zipCol, zipIndex } from '../core/zip';

export interface ZipState {
  path: number[];
  hints: number;
  undoCount: number;
  status: 'Playing' | 'Paused' | 'Won';
  shake: number | null;
}

export interface ZipCtx {
  puzzle: ZipPuzzle;
}

export type ZipAction =
  | { type: 'enter'; cell: number }
  | { type: 'step'; dir: 'up' | 'down' | 'left' | 'right' }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'hint' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'clearShake' };

export function initZip(_ctx: ZipCtx, resume?: { path: number[]; hints: number; undoCount: number }): ZipState {
  return {
    path: resume ? resume.path.slice() : [],
    hints: resume?.hints ?? 0,
    undoCount: resume?.undoCount ?? 0,
    status: 'Playing',
    shake: null,
  };
}

type Dir = 'up' | 'down' | 'left' | 'right';

function dirTarget(N: number, head: number, dir: Dir): number | null {
  const r = zipRow(N, head);
  const c = zipCol(N, head);
  const map = { up: [r - 1, c], down: [r + 1, c], left: [r, c - 1], right: [r, c + 1] } as const;
  const [nr, nc] = map[dir];
  if (nr < 0 || nc < 0 || nr >= N || nc >= N) return null;
  return zipIndex(N, nr, nc);
}

function enter(state: ZipState, cell: number, ctx: ZipCtx): ZipState {
  if (state.status !== 'Playing') return state;
  const { puzzle } = ctx;
  const { N, walls, checkpoints } = puzzle;
  const path = state.path;

  if (path.length === 0) {
    if (checkpoints[cell] === 1) return { ...state, path: [cell] };
    return { ...state, shake: cell };
  }

  const head = path[path.length - 1]!;
  if (cell === head) return state;

  const existing = path.indexOf(cell);
  if (existing >= 0) {
    if (existing === path.length - 1) return state;
    return { ...state, path: path.slice(0, existing + 1) }; // backtrack along own path
  }

  if (!passable(N, walls, head, cell)) return { ...state, shake: cell };

  const cp = checkpoints[cell];
  if (cp !== undefined && cp !== expectedNext(checkpoints, path)) {
    return { ...state, shake: cell }; // out-of-order checkpoint
  }

  const nextPath = [...path, cell];
  const status: ZipState['status'] = isSolved(puzzle, nextPath) ? 'Won' : 'Playing';
  return { ...state, path: nextPath, status };
}

export function reduceZip(state: ZipState, action: ZipAction, ctx: ZipCtx): ZipState {
  const { puzzle } = ctx;
  switch (action.type) {
    case 'enter':
      return enter(state, action.cell, ctx);

    case 'step': {
      const head = state.path[state.path.length - 1] ?? -1;
      if (head < 0) {
        // No path yet — start it at checkpoint 1 if a step is attempted.
        const start = Object.entries(puzzle.checkpoints).find(([, n]) => n === 1)?.[0];
        return start ? enter(state, Number(start), ctx) : state;
      }
      const target = dirTarget(puzzle.N, head, action.dir);
      return target == null ? state : enter(state, target, ctx);
    }

    case 'undo': {
      if (state.path.length === 0) return state;
      return { ...state, path: state.path.slice(0, -1), undoCount: state.undoCount + 1 };
    }

    case 'reset':
      return { ...state, path: [], status: 'Playing' };

    case 'hint': {
      // Extend along the solution by one correct cell from the current head.
      const { solution } = puzzle;
      const path = state.path;
      if (path.length === 0) {
        return { ...state, path: [solution[0]!], hints: state.hints + 1 };
      }
      // If the current path is a prefix of the solution, append the next cell.
      const isPrefix = path.every((c, i) => c === solution[i]);
      if (isPrefix && path.length < solution.length) {
        const nextPath = solution.slice(0, path.length + 1);
        const status: ZipState['status'] = isSolved(puzzle, nextPath) ? 'Won' : 'Playing';
        return { ...state, path: nextPath, hints: state.hints + 1, status };
      }
      // Otherwise reset to the solution prefix up to the first divergence.
      let k = 0;
      while (k < path.length && path[k] === solution[k]) k++;
      const nextPath = solution.slice(0, Math.max(1, k + 1));
      return { ...state, path: nextPath, hints: state.hints + 1 };
    }

    case 'pause':
      return { ...state, status: 'Paused' };
    case 'resume':
      return { ...state, status: 'Playing' };
    case 'clearShake':
      return { ...state, shake: null };

    default:
      return state;
  }
}

export { zipNeighbors };
