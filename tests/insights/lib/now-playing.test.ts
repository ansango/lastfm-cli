/**
 * now-playing.test.ts — unit tests for `lib/now-playing.ts`.
 *
 * Tests inject an inline-data `Caller` so we don't touch the real CLI
 * and don't depend on fixture files.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNowPlaying } from '../../../src/insights/lib/now-playing.js';
import type { Caller } from '../../../src/insights/lib/summary.js';

// --- Synthetic Last.fm payloads ------------------------------------------
// For now-playing we need:
//   user.getRecentTracks     → last scrobble (the one we want to enrich)
//   artist.getInfo           → bio + image + stats for that artist
//   artist.getSimilar        → similar artists

const RECENT_TRACKS = {
  recenttracks: {
    track: [
      {
        name: 'Test Track',
        artist: { '#text': 'Test Artist', mbid: 'mbid-artist', url: 'https://example.com/artist' },
        album: { '#text': 'Test Album', mbid: 'mbid-album' },
        url: 'https://example.com/track',
        date: { uts: '1700000000', '#text': '2024-01-01 00:00:00' },
      },
    ],
    '@attr': { user: 'test-user', nowplaying: 'false' },
  },
};

const ARTIST_INFO = {
  artist: {
    name: 'Test Artist',
    mbid: 'mbid-artist',
    url: 'https://example.com/artist',
    bio: {
      summary: 'A test artist with a real-sounding bio. They make music that is varied.',
      content: 'A test artist with a real-sounding bio. They make music that is varied.',
    },
    stats: { listeners: '1000', playcount: '5000' },
    similar: {
      artist: [
        { name: 'Similar One', url: 'https://example.com/s1' },
        { name: 'Similar Two', url: 'https://example.com/s2' },
        { name: 'Similar Three', url: 'https://example.com/s3' },
      ],
    },
  },
};

const ARTIST_SIMILAR = {
  similarartists: {
    artist: [
      { name: 'Similar One', mbid: '', url: 'https://example.com/s1', match: '0.9' },
      { name: 'Similar Two', mbid: '', url: 'https://example.com/s2', match: '0.7' },
      { name: 'Similar Three', mbid: '', url: 'https://example.com/s3', match: '0.5' },
      { name: 'Similar Four', mbid: '', url: 'https://example.com/s4', match: '0.4' },
      { name: 'Similar Five', mbid: '', url: 'https://example.com/s5', match: '0.3' },
    ],
  },
};

function makeCaller(): Caller {
  return (method: string, _params: Record<string, string | number>) => {
    if (method === 'user.getRecentTracks') return Promise.resolve(RECENT_TRACKS);
    if (method === 'artist.getInfo') return Promise.resolve(ARTIST_INFO);
    if (method === 'artist.getSimilar') return Promise.resolve(ARTIST_SIMILAR);
    throw new Error(`fake caller: no data for ${method}`);
  };
}

test('buildNowPlaying returns the last scrobbled track with artist + album', async () => {
  const s = await buildNowPlaying({ user: 'test-user', caller: makeCaller() });
  assert.ok(s.track);
  assert.ok(s.artist);
  assert.ok(typeof s.track.name === 'string' && s.track.name.length > 0);
  assert.ok(typeof s.artist.name === 'string' && s.artist.name.length > 0);
});

test('buildNowPlaying fetches artist bio summary', async () => {
  const s = await buildNowPlaying({ user: 'test-user', caller: makeCaller() });
  assert.ok(typeof s.bio === 'string' && s.bio.length > 0);
  // Bio is summarized — must not contain raw wiki markup fragments like "[["
  assert.doesNotMatch(s.bio, /\[\[/);
});

test('buildNowPlaying fetches similar artists (top 3 by default)', async () => {
  const s = await buildNowPlaying({ user: 'test-user', caller: makeCaller() });
  assert.ok(s.similar.length <= 3);
  assert.ok(s.similar.length > 0);
  for (const a of s.similar) {
    assert.ok(typeof a.name === 'string' && a.name.length > 0);
  }
});

test('buildNowPlaying surfaces nowplaying flag when true', async () => {
  // Override the recent-tracks payload with @attr.nowplaying=true.
  const recentTracks = JSON.parse(JSON.stringify(RECENT_TRACKS));
  (recentTracks['recenttracks'] as Record<string, unknown>)['@attr'] = {
    user: 'test-user',
    nowplaying: 'true',
  };

  const caller: Caller = async (method) => {
    if (method === 'user.getRecentTracks') return recentTracks;
    if (method === 'artist.getInfo') return ARTIST_INFO;
    if (method === 'artist.getSimilar') return ARTIST_SIMILAR;
    throw new Error(`no data for ${method}`);
  };

  const s = await buildNowPlaying({ user: 'test-user', caller });
  assert.equal(s.nowPlaying, true);
});

test('buildNowPlaying sets nowPlaying=false when @attr says false', async () => {
  const s = await buildNowPlaying({ user: 'test-user', caller: makeCaller() });
  // The synthetic payload has @attr.nowplaying='false' → expect false.
  assert.equal(s.nowPlaying, false);
});

test('buildNowPlaying honors a custom similar limit', async () => {
  const s = await buildNowPlaying({ user: 'test-user', caller: makeCaller(), similarLimit: 1 });
  assert.ok(s.similar.length <= 1);
});
