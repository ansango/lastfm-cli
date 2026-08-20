/**
 * mood.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { buildMoodProfile } from '../../../src/insights/lib/mood-composer.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: mood profile builds from real top artists + tags', async () => {
  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);
  const m = await buildMoodProfile({
    user: 'ansango',
    period: 'weekly',
    caller,
    topArtists: 5,
  });
  assert.ok(m.tagSourceCount > 0);
  assert.ok(m.confidence > 0);
  assert.ok(typeof m.label === 'string' && m.label.length > 0);
});
