/**
 * personality.integration.test.ts — smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: personality features from real data', async () => {
  const client = makeClient();
  const res = await client.insights.getPersonality({ user: 'ansango' });
  assert.ok(res.features);
  assert.ok(['Devotee', 'Explorer', 'Drifter', 'DJ', 'Nocturnal', 'Archivist'].includes(res.result.winner));
});
