/**
 * binges.integration.test.ts — smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { findBinges, extractScrobbles } from '../../../src/insights/lib/binges.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: binges from real recenttracks', async () => {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60;
  const raw = (await callLastfm('user.getRecentTracks', {
    user: 'ansango', from, to, limit: 200, page: 1,
  }));
  const scrobbles = extractScrobbles(raw);
  assert.ok(scrobbles.length > 0);
  const binges = findBinges(scrobbles, { minLength: 3, trackKey: 'artist', maxResults: 5 });
  assert.ok(Array.isArray(binges));
});
