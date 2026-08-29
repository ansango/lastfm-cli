/**
 * mood.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: mood profile builds from real top artists + tags', async () => {
  const client = makeClient();
  const m = await client.insights.getMood({
    user: 'ansango',
    period: '7day',
    topArtistsLimit: 5,
  });
  assert.ok(m.tagSourceCount > 0);
  assert.ok(m.confidence > 0);
  assert.ok(typeof m.label === 'string' && m.label.length > 0);
});
