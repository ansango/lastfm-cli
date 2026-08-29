import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderWrappedMarkdown,
  renderMilestonesMarkdown,
  renderMonthlyDigestMarkdown,
} from '../src/reports/lib/render.js';
import { REPORT_COMMANDS } from '../src/reports/dispatcher.js';

describe('reports subsystem', () => {
  test('REPORT_COMMANDS registers wrapped, milestones, monthly, digest', () => {
    assert.equal(typeof REPORT_COMMANDS['wrapped'], 'function');
    assert.equal(typeof REPORT_COMMANDS['milestones'], 'function');
    assert.equal(typeof REPORT_COMMANDS['monthly'], 'function');
    assert.equal(typeof REPORT_COMMANDS['digest'], 'function');
  });

  test('renderWrappedMarkdown renders artists, tracks, and seasonal profile', () => {
    const md = renderWrappedMarkdown({
      user: 'ansango',
      year: 2025,
      from: 1700000000,
      to: 1730000000,
      totalScrobbles: 15420,
      estimatedListeningMinutes: 53970,
      topArtists: [{ name: 'Radiohead', playcount: 1200, percentage: 7.8 }],
      topTracks: [{ name: 'Paranoid Android', artist: 'Radiohead', playcount: 85 }],
      topAlbums: [{ name: 'OK Computer', artist: 'Radiohead', playcount: 320 }],
      busiestDay: {
        date: '2025-06-15',
        scrobbles: 142,
        topArtist: 'Radiohead',
      },
      seasons: {
        winter: { topArtist: 'The Cure', topTrack: 'Disintegration', scrobbles: 3500 },
        spring: { topArtist: 'Radiohead', topTrack: 'Karma Police', scrobbles: 4100 },
        summer: { topArtist: 'LCD Soundsystem', topTrack: 'All My Friends', scrobbles: 4500 },
        fall: { topArtist: 'Portishead', topTrack: 'Glory Box', scrobbles: 3320 },
      },
    });

    assert.ok(md.includes('# 🎁 Last.fm Wrapped: ansango (2025)'));
    assert.ok(md.includes('15,420'));
    assert.ok(md.includes('Radiohead'));
    assert.ok(md.includes('Paranoid Android'));
    assert.ok(md.includes('OK Computer'));
    assert.ok(md.includes('❄️ Winter'));
    assert.ok(md.includes('LCD Soundsystem'));
  });

  test('renderMilestonesMarkdown renders milestones and next projection', () => {
    const md = renderMilestonesMarkdown({
      user: 'ansango',
      totalScrobbles: 125000,
      milestones: [
        {
          milestone: 100000,
          track: 'Weird Fishes/Arpeggi',
          artist: 'Radiohead',
          timestamp: 1700000000,
          date: '2023-11-14 22:13',
        },
      ],
      nextMilestone: {
        target: 150000,
        remainingScrobbles: 25000,
        estimatedDaysRemaining: 120.5,
        projectedDate: '2026-12-25',
      },
    });

    assert.ok(md.includes('# 🎯 Scrobbles Milestones: ansango'));
    assert.ok(md.includes('125,000'));
    assert.ok(md.includes('100,000'));
    assert.ok(md.includes('Weird Fishes/Arpeggi'));
    assert.ok(md.includes('150,000'));
    assert.ok(md.includes('2026-12-25'));
  });

  test('renderMonthlyDigestMarkdown renders monthly summary with growth %', () => {
    const md = renderMonthlyDigestMarkdown({
      user: 'ansango',
      year: 2026,
      month: 8,
      monthName: 'August',
      totalScrobbles: 1200,
      previousMonthScrobbles: 1000,
      growthPercentage: 20.0,
      topArtists: [{ name: 'IDLES', playcount: 150 }],
      topTracks: [{ name: 'Colossus', artist: 'IDLES', playcount: 25 }],
    });

    assert.ok(md.includes('# 📅 Monthly Digest: ansango — August 2026'));
    assert.ok(md.includes('1,200'));
    assert.ok(md.includes('+20.0%'));
    assert.ok(md.includes('IDLES'));
    assert.ok(md.includes('Colossus'));
  });
});
