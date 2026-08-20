/**
 * summary.test.ts — unit tests for `lib/summary.ts`.
 *
 * Tests inject an inline-data `Caller` so we don't touch the real CLI and
 * don't depend on fixture files. The synthetic shapes mirror what
 * `@ansango/lastfm-api` returns for each `user.get*` method.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary } from '../../../src/insights/lib/summary.js';
import type { Caller } from '../../../src/insights/lib/summary.js';

// --- Synthetic Last.fm payloads ------------------------------------------
// Each list has 5 items so `limit` slicing (1..5) is exercisable. Playcounts
// vary so diversity math is non-trivial. The shape matches what
// `@ansango/lastfm-api` returns: a wrapper object holding the list under
// its conventional key.

const TOP_ARTISTS = [
  { name: 'Artist A', playcount: '100', mbid: 'mbid-a', url: 'https://example.com/a' },
  { name: 'Artist B', playcount: '80', mbid: 'mbid-b', url: 'https://example.com/b' },
  { name: 'Artist C', playcount: '60', mbid: 'mbid-c', url: 'https://example.com/c' },
  { name: 'Artist D', playcount: '40', mbid: 'mbid-d', url: 'https://example.com/d' },
  { name: 'Artist E', playcount: '20', mbid: 'mbid-e', url: 'https://example.com/e' },
];

const TOP_TRACKS = [
  { name: 'Track A', playcount: '90', artist: { '#text': 'Artist A', mbid: 'mbid-a', url: '' }, album: 'Album A' },
  { name: 'Track B', playcount: '70', artist: { '#text': 'Artist B', mbid: 'mbid-b', url: '' }, album: 'Album B' },
  { name: 'Track C', playcount: '50', artist: { '#text': 'Artist C', mbid: 'mbid-c', url: '' }, album: 'Album C' },
  { name: 'Track D', playcount: '30', artist: { '#text': 'Artist D', mbid: 'mbid-d', url: '' }, album: 'Album D' },
  { name: 'Track E', playcount: '15', artist: { '#text': 'Artist E', mbid: 'mbid-e', url: '' }, album: 'Album E' },
];

const TOP_ALBUMS = [
  { name: 'Album A', playcount: '50', artist: { name: 'Artist A', mbid: 'mbid-a', url: '' }, mbid: '', url: '' },
  { name: 'Album B', playcount: '40', artist: { name: 'Artist B', mbid: 'mbid-b', url: '' }, mbid: '', url: '' },
  { name: 'Album C', playcount: '30', artist: { name: 'Artist C', mbid: 'mbid-c', url: '' }, mbid: '', url: '' },
  { name: 'Album D', playcount: '20', artist: { name: 'Artist D', mbid: 'mbid-d', url: '' }, mbid: '', url: '' },
  { name: 'Album E', playcount: '10', artist: { name: 'Artist E', mbid: 'mbid-e', url: '' }, mbid: '', url: '' },
];

const TOP_TAGS = [
  { name: 'rock', count: 100 },
  { name: 'indie', count: 70 },
  { name: 'electronic', count: 40 },
];

// Maps CLI method → (outer wrapper key, inner item-array key) for slicing.
const LIST_KEYS: Record<string, readonly [string, string]> = {
  'user.getTopArtists': ['topartists', 'artist'],
  'user.getTopTracks': ['toptracks', 'track'],
  'user.getTopAlbums': ['topalbums', 'album'],
  'user.getTopTags': ['toptags', 'tag'],
};

const DATA: Record<string, Array<Record<string, unknown>>> = {
  'user.getTopArtists': TOP_ARTISTS,
  'user.getTopTracks': TOP_TRACKS,
  'user.getTopAlbums': TOP_ALBUMS,
  'user.getTopTags': TOP_TAGS,
};

function makeFakeCaller(): Caller {
  return (method, params) => {
    const items = DATA[method];
    if (!items) throw new Error(`fake caller: no data for ${method}`);
    const [outer, inner] = LIST_KEYS[method] ?? ['', ''];
    let sliced = items;
    const lim = Number(params.limit);
    if (Number.isFinite(lim) && lim > 0) {
      sliced = items.slice(0, lim);
    }
    return Promise.resolve({ [outer]: { [inner]: sliced } });
  };
}

// --- Shape -----------------------------------------------------------------

test('buildSummary returns a Summary with all expected top-level fields', async () => {
  const s = await buildSummary({ period: 'weekly', user: 'test-user', caller: makeFakeCaller() });
  assert.equal(s.user, 'test-user');
  assert.equal(s.period, 'weekly');
  assert.equal(s.label, 'this week');
  assert.equal(s.lastfmPeriod, '7day');
  assert.ok(Array.isArray(s.topArtists));
  assert.ok(Array.isArray(s.topTracks));
  assert.ok(Array.isArray(s.topAlbums));
  assert.ok(Array.isArray(s.topTags));
  assert.ok(typeof s.totalScrobbles === 'number');
});

test('buildSummary caps each top list at the requested limit when synthetic data has enough items', async () => {
  const s = await buildSummary({ period: 'weekly', user: 'test-user', caller: makeFakeCaller(), limit: 3 });
  assert.equal(s.topArtists.length, 3);
  assert.equal(s.topTracks.length, 3);
  assert.equal(s.topAlbums.length, 3);
  assert.ok(s.topTags.length >= 1 && s.topTags.length <= 3);
});

test('buildSummary does not pad top lists shorter than the limit', async () => {
  // Caller that returns a single artist even though limit=5 is requested.
  const tinyCaller: Caller = async (method) => {
    if (method === 'user.getTopArtists') {
      return { topartists: { artist: [{ name: 'Solo Artist', playcount: '10', mbid: '', url: '' }] } };
    }
    const f = makeFakeCaller();
    return f(method, {});
  };
  const s = await buildSummary({ period: 'weekly', user: 'test-user', caller: tinyCaller, limit: 5 });
  assert.equal(s.topArtists.length, 1);
  assert.equal(s.topArtists[0]!.name, 'Solo Artist');
  // With a single artist there's no diversity to compute.
  assert.equal(s.diversity, undefined);
});

test('buildSummary populates diversity when ≥2 artists are returned', async () => {
  const s = await buildSummary({ period: 'weekly', user: 'test-user', caller: makeFakeCaller(), limit: 5 });
  assert.ok(s.diversity);
  assert.ok(s.diversity!.uniqueArtists >= 2);
  assert.ok(s.diversity!.shannon > 0);
  assert.ok(s.diversity!.normalized > 0 && s.diversity!.normalized <= 1);
  assert.ok(s.diversity!.top1Share > 0 && s.diversity!.top1Share <= 1);
  assert.ok(s.diversity!.top3Share >= s.diversity!.top1Share);
  assert.ok(s.diversity!.top5Share >= s.diversity!.top3Share);
});

test('buildSummary exposes playcount as a number, not a string', async () => {
  const s = await buildSummary({ period: 'weekly', user: 'test-user', caller: makeFakeCaller(), limit: 5 });
  for (const a of s.topArtists) {
    assert.equal(typeof a.playcount, 'number');
    assert.ok(a.playcount > 0);
    assert.equal(typeof a.name, 'string');
    assert.ok(a.name.length > 0);
  }
});

test('buildSummary uses Last.fm period = 7day for weekly', async () => {
  const calls: Array<[string, Record<string, string | number>]> = [];
  const recordingCaller: Caller = (method, params) => {
    calls.push([method, params]);
    return makeFakeCaller()(method, params);
  };
  await buildSummary({ period: 'weekly', user: 'test-user', caller: recordingCaller });
  assert.ok(
    calls.some(([, p]) => p.period === '7day'),
    `expected at least one call to pass period=7day, got: ${JSON.stringify(calls)}`,
  );
});

test('buildSummary uses period = overall when asked', async () => {
  const s = await buildSummary({ period: 'overall', user: 'test-user', caller: makeFakeCaller() });
  assert.equal(s.lastfmPeriod, 'overall');
  assert.equal(s.period, 'overall');
});

test('buildSummary aggregates totalScrobbles from topArtists (sum of playcounts)', async () => {
  const s = await buildSummary({ period: 'weekly', user: 'test-user', caller: makeFakeCaller(), limit: 5 });
  const expected = s.topArtists.reduce((acc, a) => acc + a.playcount, 0);
  assert.equal(s.totalScrobbles, expected);
});
