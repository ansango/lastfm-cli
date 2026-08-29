/**
 * compare.integration.test.ts — smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: compare between ansango and rj (real users)', async () => {
  const client = makeClient();
  const r = await client.insights.compareUsers({
    userA: 'ansango',
    userB: 'rj',
    period: 'overall',
    limit: 50,
  });
  assert.ok(r.jaccard >= 0 && r.jaccard <= 1);
  assert.equal(r.aCount, 50);
  assert.equal(r.bCount, 50);
});
