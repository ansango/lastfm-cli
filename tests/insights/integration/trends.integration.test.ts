/**
 * trends.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { diffRankings } from '../../../src/insights/lib/trends.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: trends diff between 7day and 1month', async () => {
  const toA = (await callLastfm('user.getTopArtists', {
    user: 'ansango', period: '7day', limit: 30,
  })) as { topartists?: { artist?: Array<{ name?: string; playcount?: string }> } };
  const toB = (await callLastfm('user.getTopArtists', {
    user: 'ansango', period: '1month', limit: 30,
  })) as { topartists?: { artist?: Array<{ name?: string; playcount?: string }> } };

  const cur = (toA?.topartists?.artist ?? []).map((a) => ({
    name: a.name ?? '',
    playcount: Number(a.playcount ?? 0),
  })).filter((a) => a.name.length > 0);
  const prev = (toB?.topartists?.artist ?? []).map((a) => ({
    name: a.name ?? '',
    playcount: Number(a.playcount ?? 0),
  })).filter((a) => a.name.length > 0);

  const d = diffRankings(cur, prev, { maxResults: 10 });
  assert.ok(Array.isArray(d.risers));
  assert.ok(Array.isArray(d.fallers));
  assert.ok(Array.isArray(d.newcomers));
  assert.ok(Array.isArray(d.departures));
});
