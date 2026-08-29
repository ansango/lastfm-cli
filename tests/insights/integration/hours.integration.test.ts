/**
 * hours.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: hours histogram builds from real recenttracks', async () => {
  const client = makeClient();
  const h = await client.insights.getHoursHistogram({
    user: 'ansango',
    sinceDays: 7,
  });
  assert.ok(h.total >= 0);
  assert.equal(h.byHour.length, 24);
  assert.equal(h.byWeekday.length, 7);
});
