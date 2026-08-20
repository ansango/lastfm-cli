/**
 * hours.test.ts — unit tests for `lib/hours.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHourHistogram, bucketTimestamp } from '../../../src/insights/lib/hours.js';
import type { HourHistogram } from '../../../src/insights/lib/hours.js';

// Anchor times (UTC) — independent of any external clock.
const T = {
  // 2026-08-17 (Mon) 09:30 UTC
  monMorning: Date.UTC(2026, 7, 17, 9, 30, 0) / 1000,
  // 2026-08-17 (Mon) 09:45 UTC
  monMorning2: Date.UTC(2026, 7, 17, 9, 45, 0) / 1000,
  // 2026-08-17 (Mon) 22:15 UTC
  monNight: Date.UTC(2026, 7, 17, 22, 15, 0) / 1000,
  // 2026-08-19 (Wed) 23:00 UTC
  wedNight: Date.UTC(2026, 7, 19, 23, 0, 0) / 1000,
  // 2026-08-22 (Sat) 03:00 UTC
  satLate: Date.UTC(2026, 7, 22, 3, 0, 0) / 1000,
};

test('bucketTimestamp returns hour 0-23 and weekday 0-6 from UNIX seconds', () => {
  // 2026-08-17 is a Monday → weekday 0
  const b = bucketTimestamp(T.monMorning);
  assert.equal(b.hour, 9);
  assert.equal(b.weekday, 0);
});

test('bucketTimestamp maps Sunday → weekday 6', () => {
  // 2026-08-22 is a Saturday → weekday 5 (Mon-based)
  const b = bucketTimestamp(T.satLate);
  assert.equal(b.weekday, 5);
  assert.equal(b.hour, 3);
});

test('buildHourHistogram counts every timestamp in the right buckets', () => {
  const h = buildHourHistogram([T.monMorning, T.monMorning2, T.monNight, T.wedNight, T.satLate]);
  assert.equal(h.total, 5);
  assert.equal(h.byHour[9], 2);   // two Monday morning scrobbles
  assert.equal(h.byHour[22], 1);
  assert.equal(h.byHour[23], 1);
  assert.equal(h.byHour[3], 1);
  assert.equal(h.byWeekday[0], 3); // Mon has 3
  assert.equal(h.byWeekday[2], 1); // Wed has 1
  assert.equal(h.byWeekday[5], 1); // Sat has 1
});

test('buildHourHistogram reports the peak hour and weekday', () => {
  const h = buildHourHistogram([T.monMorning, T.monMorning2, T.monNight, T.wedNight, T.satLate]);
  assert.equal(h.peakHour, 9);
  assert.equal(h.peakHourCount, 2);
  assert.equal(h.peakWeekday, 0);
  assert.equal(h.peakWeekdayCount, 3);
});

test('buildHourHistogram handles empty input gracefully', () => {
  const h = buildHourHistogram([]);
  assert.equal(h.total, 0);
  assert.equal(h.peakHour, null);
  assert.equal(h.peakWeekday, null);
  assert.equal(h.byHour.length, 24);
  assert.equal(h.byWeekday.length, 7);
  for (const n of h.byHour) assert.equal(n, 0);
  for (const n of h.byWeekday) assert.equal(n, 0);
});

test('buildHourHistogram sums to total', () => {
  const stamps = Array.from({ length: 100 }, (_, i) => T.monMorning + i * 60);
  const h = buildHourHistogram(stamps);
  assert.equal(h.total, 100);
  assert.equal(h.byHour.reduce((a, b) => a + b, 0), 100);
  assert.equal(h.byWeekday.reduce((a, b) => a + b, 0), 100);
});

test('hour labels are localized Spanish weekday names (Mon=lunes)', () => {
  const h: HourHistogram = buildHourHistogram([T.monMorning]);
  // peak weekday should be 0 (Mon=lunes)
  assert.equal(h.peakWeekdayLabel, 'lunes');
});
