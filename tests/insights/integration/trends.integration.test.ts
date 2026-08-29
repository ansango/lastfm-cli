/**
 * trends.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: trends diff between 7day and 1month', async () => {
  const client = makeClient();
  const d = await client.insights.getTrends({
    user: 'ansango',
    target: 'artist',
    currentPeriod: '7day',
    previousPeriod: '1month',
    limit: 10,
  });
  assert.ok(Array.isArray(d.risers));
  assert.ok(Array.isArray(d.fallers));
  assert.ok(Array.isArray(d.newcomers));
  assert.ok(Array.isArray(d.departures));
});
