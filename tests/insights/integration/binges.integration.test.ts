/**
 * binges.integration.test.ts — smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: binges from real recenttracks', async () => {
  const client = makeClient();
  const res = await client.insights.getBinges({
    user: 'ansango',
    sinceDays: 30,
    minLength: 3,
    trackKey: 'artist',
    limit: 5,
  });
  assert.ok(Array.isArray(res.binges));
});
