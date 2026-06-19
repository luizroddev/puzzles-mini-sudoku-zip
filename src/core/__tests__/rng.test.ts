import { describe, it, expect } from 'vitest';
import { makeRng, hashStringToSeed } from '../rng';

describe('makeRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() returns floats in [0, 1)', () => {
    const r = makeRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) returns integers in [0, n)', () => {
    const r = makeRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(6);
    }
  });

  it('int(n) eventually hits every value in range (well distributed)', () => {
    const r = makeRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(r.int(6));
    expect(seen).toEqual(new Set([0, 1, 2, 3, 4, 5]));
  });

  it('pick returns an element of the array', () => {
    const r = makeRng(3);
    const arr = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(r.pick(arr));
    }
  });

  it('shuffle returns a permutation (same multiset)', () => {
    const r = makeRng(42);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = r.shuffle(arr);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(arr);
  });

  it('shuffle does not mutate the input array', () => {
    const r = makeRng(42);
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    r.shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it('shuffle is deterministic for a given seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = makeRng(555).shuffle(arr);
    const b = makeRng(555).shuffle(arr);
    expect(a).toEqual(b);
  });
});

describe('hashStringToSeed', () => {
  it('is deterministic', () => {
    expect(hashStringToSeed('2026-06-19')).toBe(hashStringToSeed('2026-06-19'));
  });

  it('produces different seeds for different strings', () => {
    expect(hashStringToSeed('2026-06-19')).not.toBe(hashStringToSeed('2026-06-20'));
  });

  it('returns a 32-bit unsigned integer', () => {
    const v = hashStringToSeed('hello world');
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(0xffffffff);
  });
});
