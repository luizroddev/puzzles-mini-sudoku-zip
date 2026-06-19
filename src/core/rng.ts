/**
 * Deterministic, seedable PRNG (mulberry32) plus a string→seed hash.
 *
 * Pure module — no React, no globals. Everything in the puzzle core that needs
 * randomness takes an Rng so generation is fully reproducible from a seed.
 */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** A random element of the array. */
  pick<T>(arr: readonly T[]): T;
  /** A new array containing the same elements in shuffled order (input untouched). */
  shuffle<T>(arr: readonly T[]): T[];
}

/** mulberry32 — small, fast, good-enough statistical quality for puzzle generation. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const int = (maxExclusive: number): number => Math.floor(next() * maxExclusive);

  const pick = <T,>(arr: readonly T[]): T => {
    if (arr.length === 0) throw new Error('pick() on empty array');
    return arr[int(arr.length)]!;
  };

  const shuffle = <T,>(arr: readonly T[]): T[] => {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = int(i + 1);
      const tmp = out[i]!;
      out[i] = out[j]!;
      out[j] = tmp;
    }
    return out;
  };

  return { next, int, pick, shuffle };
}

/** Deterministic 32-bit unsigned hash (FNV-1a). Used to turn dates/strings into seeds. */
export function hashStringToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
