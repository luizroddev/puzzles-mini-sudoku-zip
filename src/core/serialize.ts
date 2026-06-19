/**
 * Puzzle (de)serialization. The only non-trivial part is the Zip `walls` Set,
 * which is stored as a sorted array and rehydrated on load. Pure.
 */
import type { SudokuPuzzle, ZipPuzzle } from './types';

export function serializeSudoku(p: SudokuPuzzle): string {
  return JSON.stringify(p);
}

export function deserializeSudoku(json: string): SudokuPuzzle {
  return JSON.parse(json) as SudokuPuzzle;
}

interface ZipWire {
  id: string;
  seed: number;
  N: number;
  checkpoints: Record<number, number>;
  solution: number[];
  walls: string[];
  difficulty: ZipPuzzle['difficulty'];
}

export function zipToWire(p: ZipPuzzle): ZipWire {
  return {
    id: p.id,
    seed: p.seed,
    N: p.N,
    checkpoints: p.checkpoints,
    solution: p.solution,
    walls: [...p.walls].sort(),
    difficulty: p.difficulty,
  };
}

export function zipFromWire(w: ZipWire): ZipPuzzle {
  return {
    id: w.id,
    seed: w.seed,
    N: w.N,
    checkpoints: w.checkpoints,
    solution: w.solution,
    walls: new Set(w.walls),
    difficulty: w.difficulty,
  };
}

export function serializeZip(p: ZipPuzzle): string {
  return JSON.stringify(zipToWire(p));
}

export function deserializeZip(json: string): ZipPuzzle {
  return zipFromWire(JSON.parse(json) as ZipWire);
}
