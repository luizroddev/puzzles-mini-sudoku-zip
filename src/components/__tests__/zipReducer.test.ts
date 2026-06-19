import { describe, it, expect } from 'vitest';
import { buildZip } from '../../core/factory';
import { initZip, reduceZip, type ZipCtx, type ZipState, type ZipAction } from '../zipReducer';
import { isSolved } from '../../core/zip';

function setup() {
  const puzzle = buildZip('easy', 100);
  const ctx: ZipCtx = { puzzle };
  return { ctx, puzzle };
}

const run = (s: ZipState, ctx: ZipCtx, ...as: ZipAction[]) =>
  as.reduce((acc, a) => reduceZip(acc, a, ctx), s);

describe('starting the path', () => {
  it('only starts on checkpoint 1', () => {
    const { ctx, puzzle } = setup();
    const start = puzzle.solution[0]!;
    const notStart = puzzle.solution[1]!;
    expect(run(initZip(ctx), ctx, { type: 'enter', cell: notStart }).path).toEqual([]);
    expect(run(initZip(ctx), ctx, { type: 'enter', cell: start }).path).toEqual([start]);
  });
});

describe('extending and backtracking', () => {
  it('extends along the solution', () => {
    const { ctx, puzzle } = setup();
    let s = initZip(ctx);
    s = run(s, ctx, { type: 'enter', cell: puzzle.solution[0]! }, { type: 'enter', cell: puzzle.solution[1]! });
    expect(s.path).toEqual(puzzle.solution.slice(0, 2));
  });

  it('backtracks when re-entering an earlier path cell', () => {
    const { ctx, puzzle } = setup();
    let s = initZip(ctx);
    s = run(
      s,
      ctx,
      { type: 'enter', cell: puzzle.solution[0]! },
      { type: 'enter', cell: puzzle.solution[1]! },
      { type: 'enter', cell: puzzle.solution[2]! },
    );
    expect(s.path.length).toBe(3);
    s = run(s, ctx, { type: 'enter', cell: puzzle.solution[1]! });
    expect(s.path).toEqual(puzzle.solution.slice(0, 2));
  });

  it('rejects a non-adjacent jump', () => {
    const { ctx, puzzle } = setup();
    let s = run(initZip(ctx), ctx, { type: 'enter', cell: puzzle.solution[0]! });
    const far = puzzle.solution[5]!;
    s = run(s, ctx, { type: 'enter', cell: far });
    expect(s.path).toEqual([puzzle.solution[0]]);
  });
});

describe('undo and hint', () => {
  it('undo removes the last cell and counts', () => {
    const { ctx, puzzle } = setup();
    let s = run(initZip(ctx), ctx, { type: 'enter', cell: puzzle.solution[0]! }, { type: 'enter', cell: puzzle.solution[1]! });
    s = run(s, ctx, { type: 'undo' });
    expect(s.path).toEqual([puzzle.solution[0]]);
    expect(s.undoCount).toBe(1);
  });

  it('hint extends along the solution and counts', () => {
    const { ctx } = setup();
    let s = run(initZip(ctx), ctx, { type: 'hint' });
    expect(s.path.length).toBe(1);
    expect(s.hints).toBe(1);
    s = run(s, ctx, { type: 'hint' });
    expect(s.path.length).toBe(2);
  });
});

describe('winning', () => {
  it('solves by following the whole solution', () => {
    const { ctx, puzzle } = setup();
    let s = initZip(ctx);
    for (const cell of puzzle.solution) s = reduceZip(s, { type: 'enter', cell }, ctx);
    expect(s.status).toBe('Won');
    expect(isSolved(puzzle, s.path)).toBe(true);
  });

  it('solves entirely via repeated hints', () => {
    const { ctx, puzzle } = setup();
    let s = initZip(ctx);
    for (let i = 0; i < puzzle.N * puzzle.N + 2; i++) s = reduceZip(s, { type: 'hint' }, ctx);
    expect(s.status).toBe('Won');
  });
});
