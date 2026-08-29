/**
 * discoveries.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: discoveries fetches baseline + window', async () => {
  const client = makeClient();
  const res = await client.insights.getDiscoveries({
    user: 'ansango',
    sinceDays: 14,
    maxResults: 50,
  });
  assert.ok(Array.isArray(res.discoveries));
  assert.ok(res.discoveries.length >= 0);
});
