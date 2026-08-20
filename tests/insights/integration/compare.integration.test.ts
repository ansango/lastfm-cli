/**
 * compare.integration.test.ts — smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { compareArtists } from '../../../src/insights/lib/compare.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: compare between ansango and rj (real users)', async () => {
  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);
  async function top(user: string) {
    const raw = (await caller('user.getTopArtists', { user, period: 'overall', limit: 50 })) as {
      topartists?: { artist?: Array<{ name?: string; playcount?: string }> };
    };
    return (raw?.topartists?.artist ?? [])
      .map((a) => ({ name: a.name ?? '', playcount: Number(a.playcount ?? 0) }))
      .filter((a) => a.name.length > 0);
  }
  const [a, b] = await Promise.all([top('ansango'), top('rj')]);
  const r = compareArtists(a, b);
  assert.ok(r.jaccard >= 0 && r.jaccard <= 1);
  assert.equal(r.aCount, 50);
  assert.equal(r.bCount, 50);
});
