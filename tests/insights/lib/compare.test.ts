/**
 * compare.test.ts — unit tests for `lib/compare.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jaccard, compareArtists, type NamedEntry } from '../../../src/insights/lib/compare.js';

test('jaccard: identical sets → 1', () => {
  assert.equal(jaccard(new Set(['a', 'b', 'c']), new Set(['a', 'b', 'c'])), 1);
});

test('jaccard: disjoint sets → 0', () => {
  assert.equal(jaccard(new Set(['a', 'b']), new Set(['c', 'd'])), 0);
});

test('jaccard: partial overlap', () => {
  // {a,b,c} ∩ {b,c,d} = {b,c} (size 2)
  // union = {a,b,c,d} (size 4)
  // jaccard = 2/4 = 0.5
  assert.equal(jaccard(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd'])), 0.5);
});

test('jaccard: empty sets → 0', () => {
  assert.equal(jaccard(new Set(), new Set(['a'])), 0);
  assert.equal(jaccard(new Set(), new Set()), 0);
});

test('jaccard is symmetric', () => {
  const a = new Set(['x', 'y', 'z']);
  const b = new Set(['y', 'z', 'w']);
  assert.equal(jaccard(a, b), jaccard(b, a));
});

test('compareArtists returns intersection, union, onlyA, onlyB, jaccard', () => {
  const a: NamedEntry[] = [{ name: 'Foo', playcount: 10 }, { name: 'Bar', playcount: 5 }, { name: 'Baz', playcount: 7 }];
  const b: NamedEntry[] = [{ name: 'Bar', playcount: 8 }, { name: 'Baz', playcount: 4 }, { name: 'Qux', playcount: 2 }];
  const r = compareArtists(a, b);
  assert.deepEqual([...r.intersection].sort(), ['Bar', 'Baz']);
  assert.deepEqual([...r.onlyA].sort(), ['Foo']);
  assert.deepEqual([...r.onlyB].sort(), ['Qux']);
  assert.equal(r.jaccard, 0.5);
  assert.equal(r.aCount, 3);
  assert.equal(r.bCount, 3);
});

test('compareArtists returns ranked intersection by min(playcount) desc', () => {
  const a: NamedEntry[] = [
    { name: 'X', playcount: 5 },
    { name: 'Y', playcount: 100 },
  ];
  const b: NamedEntry[] = [
    { name: 'Y', playcount: 1 },
    { name: 'X', playcount: 50 },
  ];
  const r = compareArtists(a, b);
  // min(5, 50) = 5 for X; min(100, 1) = 1 for Y → X first
  assert.deepEqual(r.rankedIntersection.map((x) => x.name), ['X', 'Y']);
});
