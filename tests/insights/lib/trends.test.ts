/**
 * trends.test.ts — unit tests for `lib/trends.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffRankings, type Ranked } from '../../../src/insights/lib/trends.js';

test('diffRankings: identifies risers, fallers, newcomers and departures', () => {
  const current: Ranked[] = [
    { name: 'A', playcount: 100 }, // rank 1
    { name: 'B', playcount: 80 },  // rank 2
    { name: 'C', playcount: 50 },  // rank 3 (new)
    { name: 'D', playcount: 20 },  // rank 4 (new)
  ];
  const previous: Ranked[] = [
    { name: 'A', playcount: 50 },  // rank 1
    { name: 'E', playcount: 60 },  // rank 2 (gone)
    { name: 'F', playcount: 30 },  // rank 3 (gone)
    { name: 'B', playcount: 100 }, // rank 4 → moved up
  ];
  const d = diffRankings(current, previous);

  const byName = <T extends { name: string }>(arr: T[]): Record<string, T> =>
    Object.fromEntries(arr.map((x) => [x.name, x])) as Record<string, T>;

  // A was rank 1 → rank 1, playcount went 50 → 100 → RISER (delta rank = 0, but delta count > 0)
  const risers = byName(d.risers);
  assert.ok(risers['A']);
  assert.equal(risers['A']!.deltaCount, 50);

  // B was rank 4 → rank 2 → RISER (moved up 2)
  assert.ok(risers['B']);
  assert.equal(risers['B']!.deltaRank, 2);

  // C, D didn't appear in previous → NEWCOMERS
  const newNames = d.newcomers.map((n) => n.name).sort();
  assert.deepEqual(newNames, ['C', 'D']);

  // E, F not in current → DEPARTURES
  const goneNames = d.departures.map((n) => n.name).sort();
  assert.deepEqual(goneNames, ['E', 'F']);
});

test('diffRankings: empty previous → everything is a newcomer', () => {
  const current: Ranked[] = [
    { name: 'X', playcount: 10 },
    { name: 'Y', playcount: 5 },
  ];
  const d = diffRankings(current, []);
  assert.equal(d.newcomers.length, 2);
  assert.equal(d.departures.length, 0);
  assert.equal(d.risers.length, 0);
});

test('diffRankings: empty current → everything is a departure', () => {
  const previous: Ranked[] = [
    { name: 'X', playcount: 10 },
    { name: 'Y', playcount: 5 },
  ];
  const d = diffRankings([], previous);
  assert.equal(d.departures.length, 2);
  assert.equal(d.newcomers.length, 0);
  assert.equal(d.risers.length, 0);
});

test('diffRankings: items with same rank and same count are NOT risers/fallers', () => {
  const current: Ranked[] = [{ name: 'A', playcount: 10 }];
  const previous: Ranked[] = [{ name: 'A', playcount: 10 }];
  const d = diffRankings(current, previous);
  assert.equal(d.risers.length, 0);
  assert.equal(d.fallers.length, 0);
  assert.equal(d.newcomers.length, 0);
  assert.equal(d.departures.length, 0);
});

test('diffRankings: honors maxResults on newcomers and departures', () => {
  const current = Array.from({ length: 50 }, (_, i) => ({ name: `New${i}`, playcount: 100 - i }));
  const previous = Array.from({ length: 50 }, (_, i) => ({ name: `Old${i}`, playcount: 100 - i }));
  const d = diffRankings(current, previous, { maxResults: 10 });
  assert.equal(d.newcomers.length, 10);
  assert.equal(d.departures.length, 10);
});
