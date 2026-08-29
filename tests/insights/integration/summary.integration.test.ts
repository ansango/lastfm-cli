/**
 * summary.integration.test.ts — smoke test against the real @ansango/lastfm-cli.
 *
 * Gated by env: RUN_INTEGRATION=1 AND LASTFM_API_KEY must be present.
 * Skip otherwise so unit CI doesn't hit the network.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeClient } from '../../../src/client.js';
import { renderSummaryMarkdown } from '../../../src/insights/lib/render.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: summary against the real CLI renders without throwing', async () => {
  const client = makeClient();
  const summary = await client.insights.getSummary({
    user: 'ansango',
    period: 'weekly',
    limit: 5,
  });

  // Sanity assertions on the live data — these are user-dependent so we
  // assert shape, not exact values.
  assert.equal(summary.user, 'ansango');
  assert.equal(summary.period, 'weekly');
  assert.ok(summary.topArtists.length > 0);
  assert.ok(summary.totalScrobbles > 0);

  const md = renderSummaryMarkdown(summary);
  assert.match(md, /Resumen de ansango/);
  assert.match(md, /Top artistas/);
});
