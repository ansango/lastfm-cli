/**
 * render.test.ts — unit tests for `lib/render.ts`.
 *
 * Renders a Summary into a friendly markdown block for chat. Pure string
 * transformation; no I/O.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSummaryMarkdown } from '../../../src/insights/lib/render.js';
import type { InsightsSummaryResponse as Summary } from '@ansango/lastfm-api/insights';

function fakeSummary(): Summary {
  return {
    user: 'ansango',
    period: 'weekly',
    label: 'this week',
    lastfmPeriod: '7day',
    from: 1786700000,
    to: 1786872000,
    topArtists: [
      { name: 'Fontaines D.C.', playcount: 37 },
      { name: 'The Blaze', playcount: 35 },
      { name: 'Huntza', playcount: 29 },
    ],
    topTracks: [
      { name: 'Boys in the Better Land', artist: 'Fontaines D.C.', playcount: 12, album: 'Dogrel' },
      { name: 'Iñundik Iñoare', artist: 'Huntza', playcount: 10 },
    ],
    topAlbums: [
      { name: 'Dogrel', artist: 'Fontaines D.C.', playcount: 40 },
    ],
    topTags: [{ name: 'indie rock', count: 1 }],
    totalScrobbles: 101,
  };
}

test('renderSummaryMarkdown includes the period label and user', () => {
  const md = renderSummaryMarkdown(fakeSummary());
  assert.match(md, /this week/);
  assert.match(md, /ansango/);
});

test('renderSummaryMarkdown lists every top artist with its playcount', () => {
  const md = renderSummaryMarkdown(fakeSummary());
  assert.match(md, /Fontaines D\.C\./);
  assert.match(md, /37/);
  assert.match(md, /The Blaze/);
  assert.match(md, /35/);
});

test('renderSummaryMarkdown lists top tracks with artist name when present', () => {
  const md = renderSummaryMarkdown(fakeSummary());
  assert.match(md, /Boys in the Better Land/);
  assert.match(md, /Fontaines D\.C\./);
});

test('renderSummaryMarkdown includes total scrobbles for the period', () => {
  const md = renderSummaryMarkdown(fakeSummary());
  assert.match(md, /101/);
});

test('renderSummaryMarkdown includes tags section when tags exist', () => {
  const md = renderSummaryMarkdown(fakeSummary());
  assert.match(md, /indie rock/);
});

test('renderSummaryMarkdown omits tags section when there are no tags', () => {
  const s = { ...fakeSummary(), topTags: [] };
  const md = renderSummaryMarkdown(s);
  // No "Tags" heading if there are none
  assert.doesNotMatch(md, /^## Tags/m);
});

test('renderSummaryMarkdown produces empty sections gracefully for empty lists', () => {
  const s = { ...fakeSummary(), topAlbums: [], topTracks: [], topArtists: [] };
  const md = renderSummaryMarkdown(s);
  // Still renders period + total + (zero items gracefully).
  assert.match(md, /this week/);
});
