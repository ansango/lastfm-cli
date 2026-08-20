/**
 * personality.integration.test.ts — smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { buildSummary } from '../../../src/insights/lib/summary.js';
import { scoreArchetypes } from '../../../src/insights/lib/personality.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: personality features from real data', async () => {
  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);
  const summary = await buildSummary({ user: 'ansango', period: 'weekly', caller, limit: 30 });
  assert.ok(summary.diversity);
  const r = scoreArchetypes({
    totalScrobbles: summary.totalScrobbles,
    uniqueArtists: summary.diversity!.uniqueArtists,
    top1Share: summary.diversity!.top1Share,
    top3Share: summary.diversity!.top3Share,
    top5Share: summary.diversity!.top5Share,
    normalizedDiversity: summary.diversity!.normalized,
    newArtistsLast30d: 5,
    totalArtistsLast30d: summary.diversity!.uniqueArtists,
    nightHourShare: 0.15,
    morningHourShare: 0.25,
    weekdayShare: 0.75,
  });
  assert.ok(['Devotee', 'Explorer', 'Drifter', 'DJ', 'Nocturnal', 'Archivist'].includes(r.winner));
});
