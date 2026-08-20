/**
 * personality.test.ts — unit tests for `lib/personality.ts`.
 *
 * The scorer is pure: takes a `PersonalityFeatures` object (pre-computed
 * numbers about the user's listening), returns the archetype scores + the
 * winner. Tests don't touch the network; the composer that builds features
 * is in `personality-composer.ts` and tested separately.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreArchetypes, type ArchetypeId, type PersonalityFeatures } from '../../../src/insights/lib/personality.js';

function f(over: Partial<PersonalityFeatures> = {}): PersonalityFeatures {
  return {
    totalScrobbles: 100,
    uniqueArtists: 30,
    top1Share: 0.2,
    top3Share: 0.5,
    top5Share: 0.7,
    normalizedDiversity: 0.9,
    newArtistsLast30d: 5,
    totalArtistsLast30d: 30,
    nightHourShare: 0.1,    // 0..1
    morningHourShare: 0.2,
    weekdayShare: 0.7,
    ...over,
  };
}

test('scoreArchetypes returns all 6 archetypes with non-negative scores', () => {
  const r = scoreArchetypes(f());
  const ids: ArchetypeId[] = ['Devotee', 'Explorer', 'Drifter', 'DJ', 'Nocturnal', 'Archivist'];
  for (const id of ids) {
    assert.ok(typeof r.scores[id] === 'number' && r.scores[id] >= 0 && r.scores[id] <= 1);
  }
});

test('low diversity + high top1Share → Devotee wins', () => {
  const r = scoreArchetypes(f({
    normalizedDiversity: 0.2,
    top1Share: 0.6,
    top3Share: 0.85,
    top5Share: 0.95,
    uniqueArtists: 5,
  }));
  assert.equal(r.winner, 'Devotee');
});

test('high diversity + many new artists → Explorer wins', () => {
  const r = scoreArchetypes(f({
    normalizedDiversity: 0.95,
    uniqueArtists: 80,
    newArtistsLast30d: 25,
    totalArtistsLast30d: 80,
  }));
  assert.equal(r.winner, 'Explorer');
});

test('nightHourShare very high → Nocturnal wins', () => {
  const r = scoreArchetypes(f({
    nightHourShare: 0.55,   // >50% of scrobbles between 22:00–06:00
    normalizedDiversity: 0.7,
    uniqueArtists: 50,
  }));
  assert.equal(r.winner, 'Nocturnal');
});

test('balanced diversity, low new discoveries → Drifter', () => {
  const r = scoreArchetypes(f({
    normalizedDiversity: 0.7,
    uniqueArtists: 30,
    newArtistsLast30d: 1,
    totalArtistsLast30d: 30,
    top1Share: 0.15,
    top3Share: 0.4,
    top5Share: 0.55,
  }));
  assert.equal(r.winner, 'Drifter');
});

test('high-volume + wide roster + diversity → DJ or Archivist', () => {
  // DJ should win when: very high play velocity + many artists + reasonable
  // diversity. Archivist is a close cousin but needs a bigger roster still.
  const r = scoreArchetypes(f({
    normalizedDiversity: 0.85,
    uniqueArtists: 200,
    newArtistsLast30d: 8,
    totalArtistsLast30d: 200,
    totalScrobbles: 5000,
    top1Share: 0.05,
    top3Share: 0.15,
    top5Share: 0.25,
  }));
  assert.ok(['DJ', 'Archivist'].includes(r.winner));
});

test('reasons explain why the winner was chosen', () => {
  const r = scoreArchetypes(f({ normalizedDiversity: 0.2, top1Share: 0.6, top3Share: 0.85, uniqueArtists: 5 }));
  assert.ok(r.reasons.length > 0);
  assert.ok(r.reasons.some((line) => line.length > 0));
});
