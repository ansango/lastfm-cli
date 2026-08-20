/**
 * mood-composer.test.ts — unit tests for `lib/mood-composer.ts`.
 *
 * The composer pulls a user's top artists + their tags (from the API),
 * merges them with the user's own topTags (if any), and runs the pure
 * classifier. Tests inject an inline-data Caller.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMoodProfile } from '../../../src/insights/lib/mood-composer.js';
import type { Caller } from '../../../src/insights/lib/summary.js';

// --- Synthetic Last.fm payloads ------------------------------------------
// Each is the exact JSON shape `@ansango/lastfm-api` returns.

const TOP_ARTISTS = {
  topartists: {
    artist: [
      { name: 'Artist One', playcount: '100' },
      { name: 'Artist Two', playcount: '80' },
      { name: 'Artist Three', playcount: '60' },
    ],
  },
};

const USER_TOP_TAGS = {
  toptags: {
    tag: [
      { name: 'rock', count: 100 },
      { name: 'indie', count: 70 },
    ],
  },
};

const ARTIST_TOP_TAGS: Record<string, unknown> = {
  'Artist One': {
    toptags: {
      tag: [
        { name: 'post-punk', count: 100 },
        { name: 'indie rock', count: 80 },
        { name: 'rock', count: 60 },
        { name: 'irish', count: 40 },
        { name: 'indie', count: 30 },
      ],
    },
  },
  'Artist Two': {
    toptags: {
      tag: [
        { name: 'electronic', count: 100 },
        { name: 'french', count: 60 },
        { name: 'indie', count: 40 },
        { name: 'dance', count: 30 },
      ],
    },
  },
  'Artist Three': {
    toptags: {
      tag: [
        { name: 'basque', count: 100 },
        { name: 'folk', count: 80 },
        { name: 'euskal', count: 60 },
        { name: 'world', count: 40 },
        { name: 'rock', count: 30 },
      ],
    },
  },
};

function makeCaller(): Caller {
  return (method: string, params: Record<string, string | number>) => {
    if (method === 'user.getTopArtists') return Promise.resolve(TOP_ARTISTS);
    if (method === 'user.getTopTags') return Promise.resolve(USER_TOP_TAGS);
    if (method === 'artist.getTopTags') {
      const artistName = String(params['artist']);
      const f = ARTIST_TOP_TAGS[artistName];
      if (!f) throw new Error(`fake caller: no data for artist ${artistName}`);
      return Promise.resolve(f);
    }
    throw new Error(`fake caller: unexpected method ${method}`);
  };
}

test('buildMoodProfile returns a MoodProfile with axes', async () => {
  const m = await buildMoodProfile({ user: 'test-user', period: 'weekly', caller: makeCaller(), topArtists: 3 });
  assert.ok(typeof m.label === 'string' && m.label.length > 0);
  assert.ok(m.axes.energy >= -1 && m.axes.energy <= 1);
  assert.ok(m.axes.valence >= -1 && m.axes.valence <= 1);
  assert.ok(Array.isArray(m.categories));
  assert.ok(m.confidence >= 0 && m.confidence <= 1);
  assert.ok(typeof m.tagSourceCount === 'number');
});

test('buildMoodProfile aggregates tags from all the artists requested', async () => {
  const m = await buildMoodProfile({ user: 'test-user', period: 'weekly', caller: makeCaller(), topArtists: 3 });
  // 3 artists × ~5 tags each + 2 user tags ≈ 17 raw tags.
  assert.ok(m.tagSourceCount >= 8, `expected ≥8 raw tags, got ${m.tagSourceCount}`);
});

test('buildMoodProfile caps how many artists to fetch tags from', async () => {
  const calls: Array<[string, Record<string, string | number>]> = [];
  const recordingCaller: Caller = (method, params) => {
    calls.push([method, params]);
    return makeCaller()(method, params);
  };
  await buildMoodProfile({ user: 'test-user', period: 'weekly', caller: recordingCaller, topArtists: 2 });
  const artistCalls = calls.filter(([m]) => m === 'artist.getTopTags');
  assert.equal(artistCalls.length, 2);
});

test('buildMoodProfile: empty fixture falls back gracefully', async () => {
  const emptyCaller: Caller = async () => ({ toptags: { tag: [] } });
  const m = await buildMoodProfile({ user: 'nobody', period: 'weekly', caller: emptyCaller, topArtists: 3 });
  assert.equal(m.confidence, 0);
});
