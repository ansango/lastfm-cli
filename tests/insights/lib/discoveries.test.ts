/**
 * discoveries.test.ts — unit tests for `lib/discoveries.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findNewArtists, type ArtistTimestamp } from '../../../src/insights/lib/discoveries.js';

test('findNewArtists returns artists that appear in window but not in baseline', () => {
  const window: ArtistTimestamp[] = [
    { name: 'New Artist', firstSeen: 100 },
    { name: 'Old Friend', firstSeen: 50 },
    { name: 'Another New', firstSeen: 110 },
  ];
  const baseline = new Set(['Old Friend', 'Established']);
  const newbies = findNewArtists(window, baseline);
  const names = newbies.map((a) => a.name).sort();
  assert.deepEqual(names, ['Another New', 'New Artist']);
});

test('findNewArtists sorts by firstSeen ascending within the window', () => {
  const window: ArtistTimestamp[] = [
    { name: 'Z', firstSeen: 300 },
    { name: 'A', firstSeen: 100 },
    { name: 'M', firstSeen: 200 },
  ];
  const baseline = new Set<string>();
  const newbies = findNewArtists(window, baseline);
  assert.deepEqual(newbies.map((a) => a.name), ['A', 'M', 'Z']);
});

test('findNewArtists dedupes by name (one entry per artist)', () => {
  const window: ArtistTimestamp[] = [
    { name: 'Dupe', firstSeen: 100 },
    { name: 'Dupe', firstSeen: 50 }, // earlier occurrence — should be kept
  ];
  const baseline = new Set<string>();
  const newbies = findNewArtists(window, baseline);
  assert.equal(newbies.length, 1);
  assert.equal(newbies[0]!.firstSeen, 50); // earliest
});

test('findNewArtists respects a maxResults cap', () => {
  const window: ArtistTimestamp[] = Array.from({ length: 50 }, (_, i) => ({
    name: `Artist ${i}`,
    firstSeen: i,
  }));
  const baseline = new Set<string>();
  const newbies = findNewArtists(window, baseline, { maxResults: 10 });
  assert.equal(newbies.length, 10);
});

test('findNewArtists: empty window returns empty', () => {
  assert.deepEqual(findNewArtists([], new Set(['anything'])), []);
});
