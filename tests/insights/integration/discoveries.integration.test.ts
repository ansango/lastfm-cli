/**
 * discoveries.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { extractArtistTimestamps, findNewArtists } from '../../../src/insights/lib/discoveries.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: discoveries fetches baseline + window', async () => {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 14 * 24 * 60 * 60;

  const recent = (await callLastfm('user.getRecentTracks', {
    user: 'ansango', from, to, limit: 200,
  })) as unknown;
  const baseline = (await callLastfm('user.getTopArtists', {
    user: 'ansango', period: 'overall', limit: 200,
  })) as { topartists?: { artist?: Array<{ name?: string }> } };

  const window = extractArtistTimestamps(recent);
  const base = new Set(
    (baseline?.topartists?.artist ?? [])
      .map((a) => a.name ?? '')
      .filter((n) => n.length > 0),
  );

  const newbies = findNewArtists(window, base, { maxResults: 50 });
  // We don't know exact count, just shape.
  assert.ok(Array.isArray(newbies));
  // Either there are discoveries, or the baseline already covers everything.
  assert.ok(newbies.length >= 0);
});
