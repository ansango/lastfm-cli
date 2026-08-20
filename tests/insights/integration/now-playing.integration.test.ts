/**
 * now-playing.integration.test.ts — smoke test against the real CLI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { callLastfm } from '../../../src/insights/lib/cli.js';
import { buildNowPlaying } from '../../../src/insights/lib/now-playing.js';
import { renderNowPlayingMarkdown } from '../../../src/insights/lib/render.js';

const it = process.env['RUN_INTEGRATION'] === '1' && !!process.env['LASTFM_API_KEY']
  ? test
  : test.skip;

it('integration: now-playing against the real CLI renders without throwing', async () => {
  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);

  const np = await buildNowPlaying({ user: 'ansango', caller });

  assert.ok(np.track.name.length > 0);
  assert.ok(np.artist.name.length > 0);
  // Bio may be empty for some artists; allow either.
  assert.ok(typeof np.bio === 'string');

  const md = renderNowPlayingMarkdown(np);
  assert.ok(md.length > 0);
  assert.match(md, /ansango/);
});
