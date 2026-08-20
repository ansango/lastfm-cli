/**
 * periods.test.ts — unit tests for `lib/periods.ts`.
 *
 * All tests use a fixed `now` (frozen clock) so results are deterministic.
 * The SUT exposes a `resolvePeriod` factory that takes a clock function so
 * we don't have to monkey-patch Date.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePeriod, periodToLastfm, periodToWindow, type Period } from '../../../src/insights/lib/periods.js';

// Anchor: 2026-08-16 12:00:00 UTC = 1786872000 seconds (computed at test time
// so we don't depend on a hard-coded value drifting). For deterministic
// windows we also assert the math below.
const NOW_MS = Date.UTC(2026, 7, 16, 12, 0, 0); // month is 0-indexed → August
const NOW_S = Math.floor(NOW_MS / 1000);
const clock = () => NOW_MS;

const resolve = resolvePeriod(clock);

// --- Last.fm period token -------------------------------------------------

test('daily maps to 7day (Last.fm has no native daily window)', () => {
  assert.equal(periodToLastfm('daily'), '7day');
});

test('weekly maps to 7day', () => {
  assert.equal(periodToLastfm('weekly'), '7day');
});

test('monthly maps to 1month', () => {
  assert.equal(periodToLastfm('monthly'), '1month');
});

test('yearly maps to 12month', () => {
  assert.equal(periodToLastfm('yearly'), '12month');
});

test('overall passes through', () => {
  assert.equal(periodToLastfm('overall'), 'overall');
});

// --- Window math ----------------------------------------------------------

test('daily window: from = now-24h, to = now', () => {
  const w = periodToWindow('daily', NOW_MS);
  assert.equal(w.to, NOW_S);
  assert.equal(w.from, NOW_S - 24 * 60 * 60);
});

test('weekly window: from = now-7d, to = now', () => {
  const w = periodToWindow('weekly', NOW_MS);
  assert.equal(w.to, NOW_S);
  assert.equal(w.from, NOW_S - 7 * 24 * 60 * 60);
});

test('monthly window: 30 days back', () => {
  const w = periodToWindow('monthly', NOW_MS);
  assert.equal(w.to, NOW_S);
  assert.equal(w.from, NOW_S - 30 * 24 * 60 * 60);
});

test('yearly window: 365 days back', () => {
  const w = periodToWindow('yearly', NOW_MS);
  assert.equal(w.to, NOW_S);
  assert.equal(w.from, NOW_S - 365 * 24 * 60 * 60);
});

// --- Resolved bundle ------------------------------------------------------

test('resolvePeriod returns lastfm token + window + label', () => {
  const r = resolve('weekly');
  assert.equal(r.lastfm, '7day');
  assert.equal(r.to, NOW_S);
  assert.equal(r.from, NOW_S - 7 * 24 * 60 * 60);
  assert.match(r.label, /week/i);
});

test('resolvePeriod surfaces every supported period', () => {
  const periods: Period[] = ['daily', 'weekly', 'monthly', 'yearly', 'overall'];
  for (const p of periods) {
    const r = resolve(p);
    assert.ok(typeof r.lastfm === 'string' && r.lastfm.length > 0);
    assert.ok(typeof r.label === 'string' && r.label.length > 0);
    assert.ok(r.to > 0);
    // 'overall' has no window — from may be undefined
    if (p !== 'overall') {
      assert.ok(r.from !== undefined && r.from > 0);
      assert.ok(r.from <= r.to);
    }
  }
});

test('resolvePeriod throws on unknown period', () => {
  // @ts-expect-error — intentional bad input
  assert.throws(() => resolve('bienal'), /unknown period/i);
});
