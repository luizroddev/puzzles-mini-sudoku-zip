import { describe, it, expect } from 'vitest';
import { makeRng } from '../rng';
import { SPEC_6 } from '../sudoku';
import { generateSudoku } from '../sudokuGenerator';
import { generateZip } from '../zipGenerator';
import {
  serializeSudoku,
  deserializeSudoku,
  serializeZip,
  deserializeZip,
} from '../serialize';

describe('sudoku serialization', () => {
  it('round-trips a generated puzzle', () => {
    const p = generateSudoku(SPEC_6, makeRng(11), 'hard');
    const back = deserializeSudoku(serializeSudoku(p));
    expect(back).toEqual(p);
  });
});

describe('zip serialization', () => {
  it('round-trips a generated puzzle including the walls Set', () => {
    const p = generateZip(makeRng(11), 'hard');
    const back = deserializeZip(serializeZip(p));
    expect(back.walls instanceof Set).toBe(true);
    expect([...back.walls].sort()).toEqual([...p.walls].sort());
    expect(back.solution).toEqual(p.solution);
    expect(back.checkpoints).toEqual(p.checkpoints);
    expect(back.N).toBe(p.N);
    expect(back.id).toBe(p.id);
  });

  it('produces valid JSON (no Set leaking through)', () => {
    const p = generateZip(makeRng(2), 'easy');
    const json = serializeZip(p);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(json).not.toContain('Set');
  });
});
