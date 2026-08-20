/**
 * diversity.test.ts — unit tests for `lib/diversity.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDiversity, topNShare } from '../../../src/insights/lib/diversity.js';

test('computeDiversity: single bucket has entropy 0', () => {
  const counts = { A: 10 };
  const d = computeDiversity(counts);
  assert.equal(d.shannon, 0);
  assert.equal(d.uniqueCount, 1);
  assert.equal(d.total, 10);
});

test('computeDiversity: two equal buckets → entropy = ln(2) ≈ 0.693', () => {
  const counts = { A: 5, B: 5 };
  const d = computeDiversity(counts);
  assert.ok(Math.abs(d.shannon - Math.log(2)) < 1e-9);
  assert.equal(d.normalized, 1); // perfectly even split, normalized = 1
});

test('computeDiversity: four equal buckets → normalized = 1', () => {
  const counts = { A: 1, B: 1, C: 1, D: 1 };
  const d = computeDiversity(counts);
  assert.ok(Math.abs(d.shannon - Math.log(4)) < 1e-9);
  assert.equal(d.normalized, 1);
});

test('computeDiversity: extreme skew → low normalized entropy', () => {
  const counts = { A: 99, B: 1 };
  const d = computeDiversity(counts);
  // H = -((99/100)ln(99/100) + (1/100)ln(1/100)) ≈ 0.056
  assert.ok(d.shannon > 0 && d.shannon < 0.1);
  assert.ok(d.normalized > 0 && d.normalized < 0.15);
});

test('computeDiversity: empty counts → all zeros', () => {
  const d = computeDiversity({});
  assert.equal(d.shannon, 0);
  assert.equal(d.normalized, 0);
  assert.equal(d.total, 0);
  assert.equal(d.uniqueCount, 0);
});

test('computeDiversity: ignores zero-count entries', () => {
  const counts = { A: 5, B: 0, C: 5 };
  const d = computeDiversity(counts);
  assert.equal(d.uniqueCount, 2);
  assert.ok(Math.abs(d.shannon - Math.log(2)) < 1e-9);
});

test('topNShare returns the fraction of total plays that the top N consume', () => {
  const counts = { A: 50, B: 30, C: 15, D: 5 };
  assert.equal(topNShare(counts, 1), 0.5);
  assert.equal(topNShare(counts, 2), 0.8);
  assert.equal(topNShare(counts, 4), 1);
});

test('topNShare: N larger than uniqueCount caps at 1', () => {
  const counts = { A: 1, B: 2 };
  assert.equal(topNShare(counts, 10), 1);
});

test('topNShare: empty counts returns 0', () => {
  assert.equal(topNShare({}, 5), 0);
});
