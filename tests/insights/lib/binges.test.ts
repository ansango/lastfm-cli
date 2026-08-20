/**
 * binges.test.ts — unit tests for `lib/binges.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBinges, type Scrobble } from '../../../src/insights/lib/binges.js';

function s(artist: string, track: string, uts: number): Scrobble {
  return { artist, track, uts };
}

test('findBinges returns empty for empty input', () => {
  assert.deepEqual(findBinges([], { minLength: 2 }), []);
});

test('findBinges with minLength=2 detects a same-artist pair', () => {
  const tracks = [
    s('A', 't1', 100),
    s('A', 't2', 200),
  ];
  const b = findBinges(tracks, { minLength: 2 });
  assert.equal(b.length, 1);
  assert.equal(b[0]!.artist, 'A');
  assert.equal(b[0]!.length, 2);
  assert.equal(b[0]!.startUts, 100);
  assert.equal(b[0]!.endUts, 200);
});

test('findBinges breaks a run when artist changes', () => {
  const tracks = [
    s('A', 't1', 100),
    s('A', 't2', 200),
    s('B', 't3', 300),
    s('B', 't4', 400),
    s('B', 't5', 500),
  ];
  const b = findBinges(tracks, { minLength: 2 });
  assert.equal(b.length, 2);
  // Sorted by length desc: B (3) first, A (2) second.
  assert.equal(b[0]!.artist, 'B');
  assert.equal(b[0]!.length, 3);
  assert.equal(b[1]!.artist, 'A');
  assert.equal(b[1]!.length, 2);
});

test('findBinges with trackKey="track" breaks on different tracks of same artist', () => {
  const tracks = [
    s('A', 't1', 100),
    s('A', 't1', 200),
    s('A', 't2', 300),
    s('A', 't1', 400),
    s('A', 't1', 500),
  ];
  const b = findBinges(tracks, { minLength: 2, trackKey: 'track' });
  assert.equal(b.length, 2);
  assert.equal(b[0]!.length, 2);
  assert.equal(b[0]!.track, 't1');
  assert.equal(b[1]!.length, 2);
  assert.equal(b[1]!.track, 't1');
});

test('findBinges breaks on a time gap larger than maxGapSeconds', () => {
  const tracks = [
    s('A', 't1', 0),
    s('A', 't2', 100),     // gap 100s
    s('A', 't3', 10_000),   // gap 9900s — exceeds maxGap
  ];
  const b = findBinges(tracks, { minLength: 2, maxGapSeconds: 1000 });
  // First run: A at [0, 100] length 2; gap too big → break. Second: A at [10_000] length 1 (filtered out).
  assert.equal(b.length, 1);
  assert.equal(b[0]!.length, 2);
});

test('findBinges filters out runs shorter than minLength', () => {
  const tracks = [
    s('A', 't1', 0),   // length 1 — skip
    s('B', 't2', 100), // length 1 — skip
    s('C', 't3', 200),
    s('C', 't4', 300), // length 2 — keep
  ];
  const b = findBinges(tracks, { minLength: 2 });
  assert.equal(b.length, 1);
  assert.equal(b[0]!.artist, 'C');
});

test('findBinges sorts results by length desc, then by endUts desc', () => {
  const tracks = [
    s('A', 't1', 0), s('A', 't2', 1), s('A', 't3', 2),
    s('B', 't4', 100), s('B', 't5', 101),
  ];
  const b = findBinges(tracks, { minLength: 2 });
  assert.equal(b.length, 2);
  assert.equal(b[0]!.artist, 'A'); // length 3 first
  assert.equal(b[1]!.artist, 'B'); // length 2 second
});

test('findBinges honors maxResults', () => {
  const tracks = [
    s('A', 't', 0), s('A', 't', 1), s('A', 't', 2),
    s('B', 't', 100), s('B', 't', 101), s('B', 't', 102),
    s('C', 't', 200), s('C', 't', 201), s('C', 't', 202),
  ];
  const b = findBinges(tracks, { minLength: 2, maxResults: 2 });
  assert.equal(b.length, 2);
});
