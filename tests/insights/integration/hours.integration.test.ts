/**
 * hours.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { buildHourHistogram } from '../../../src/insights/lib/hours.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: hours histogram builds from real recenttracks', async () => {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 7 * 24 * 60 * 60;
  const raw = (await callLastfm('user.getRecentTracks', {
    user: 'ansango',
    from,
    to,
    limit: 200,
  })) as { recenttracks?: { track?: Array<{ date?: { uts?: string } }> } };
  const stamps = (raw?.recenttracks?.track ?? [])
    .map((t) => (t.date?.uts ? Number(t.date.uts) : null))
    .filter((x): x is number => x !== null);
  const h = buildHourHistogram(stamps);
  assert.ok(h.total > 0);
  assert.equal(h.byHour.length, 24);
  assert.equal(h.byWeekday.length, 7);
});
