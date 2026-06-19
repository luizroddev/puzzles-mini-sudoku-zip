import { describe, it, expect } from 'vitest';
import { buildSudoku } from '../../core/factory';
import { SPEC_4 } from '../../core/sudoku';
import {
  initSudoku,
  reduceSudoku,
  type SudokuCtx,
  type SudokuState,
  type SudokuAction,
} from '../sudokuReducer';

function setup(errorMode: SudokuCtx['errorMode'] = 'classic') {
  const p = buildSudoku(4, 'easy', 100);
  const ctx: SudokuCtx = { spec: SPEC_4, solution: p.solution, given: p.given, errorMode, maxErrors: 3 };
  const empties = p.given.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  return { ctx, p, empties };
}

const run = (s: SudokuState, ctx: SudokuCtx, ...actions: SudokuAction[]) =>
  actions.reduce((acc, a) => reduceSudoku(acc, a, ctx), s);

describe('placement', () => {
  it('places a value into the selected empty cell', () => {
    const { ctx, p, empties } = setup();
    const cell = empties[0]!;
    const s = run(initSudoku(ctx), ctx, { type: 'select', cell }, { type: 'input', value: p.solution[cell]! });
    expect(s.grid[cell]).toBe(p.solution[cell]);
  });

  it('ignores input on a given cell', () => {
    const { ctx, p } = setup();
    const givenCell = p.given.findIndex((v) => v !== 0);
    const s = run(initSudoku(ctx), ctx, { type: 'select', cell: givenCell }, { type: 'input', value: 1 });
    expect(s.grid[givenCell]).toBe(p.given[givenCell]);
  });
});

describe('classic error mode', () => {
  it('counts a wrong entry and flags it', () => {
    const { ctx, p, empties } = setup('classic');
    const cell = empties[0]!;
    const wrong = (p.solution[cell]! % 4) + 1 === p.solution[cell] ? ((p.solution[cell]! % 4) + 2) : (p.solution[cell]! % 4) + 1;
    const s = run(initSudoku(ctx), ctx, { type: 'select', cell }, { type: 'input', value: wrong });
    expect(s.errors).toBe(1);
    expect(s.shake).toBe(cell);
  });

  it('fails after maxErrors wrong entries', () => {
    const { ctx, p, empties } = setup('classic');
    let s = initSudoku(ctx);
    let count = 0;
    for (const cell of empties) {
      const wrong = p.solution.find((_, i) => i === cell) === 1 ? 2 : 1;
      const val = wrong === p.solution[cell] ? (wrong % 4) + 1 : wrong;
      s = run(s, ctx, { type: 'select', cell }, { type: 'input', value: val });
      if (s.status === 'Failed') break;
      count++;
      if (count > 5) break;
    }
    expect(s.status).toBe('Failed');
    expect(s.errors).toBe(3);
  });
});

describe('relaxed error mode', () => {
  it('does not count errors or fail on a wrong-but-conflicting entry', () => {
    const { ctx, p, empties } = setup('relaxed');
    const cell = empties[0]!;
    const wrong = p.solution[cell] === 1 ? 2 : 1;
    const s = run(initSudoku(ctx), ctx, { type: 'select', cell }, { type: 'input', value: wrong });
    expect(s.errors).toBe(0);
    expect(s.status).toBe('Playing');
  });
});

describe('notes', () => {
  it('toggles a pencil mark on and off', () => {
    const { ctx, empties } = setup();
    const cell = empties[0]!;
    let s = run(initSudoku(ctx), ctx, { type: 'toggleNoteMode' }, { type: 'select', cell }, { type: 'input', value: 2 });
    expect(s.notes[cell]).toEqual([2]);
    s = run(s, ctx, { type: 'input', value: 2 });
    expect(s.notes[cell] ?? []).toEqual([]);
  });
});

describe('erase, undo, redo', () => {
  it('erases a placed value', () => {
    const { ctx, p, empties } = setup('relaxed');
    const cell = empties[0]!;
    let s = run(initSudoku(ctx), ctx, { type: 'select', cell }, { type: 'input', value: p.solution[cell]! });
    s = run(s, ctx, { type: 'erase' });
    expect(s.grid[cell]).toBe(0);
  });

  it('undo reverts and redo reapplies', () => {
    const { ctx, p, empties } = setup('relaxed');
    const cell = empties[0]!;
    const v = p.solution[cell]!;
    let s = run(initSudoku(ctx), ctx, { type: 'select', cell }, { type: 'input', value: v });
    s = run(s, ctx, { type: 'undo' });
    expect(s.grid[cell]).toBe(0);
    s = run(s, ctx, { type: 'redo' });
    expect(s.grid[cell]).toBe(v);
  });
});

describe('winning', () => {
  it('reaches Won when the board is completed correctly via hints', () => {
    const { ctx } = setup('relaxed');
    let s = initSudoku(ctx);
    for (let i = 0; i < 16; i++) s = reduceSudoku(s, { type: 'hint' }, ctx);
    expect(s.status).toBe('Won');
  });
});
