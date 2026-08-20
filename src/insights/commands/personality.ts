/**
 * insights personality — derive the user's "listening personality" archetype.
 *
 * Runs the building blocks in parallel:
 *   - summary weekly  → diversity + totalScrobbles + topN shares + uniqueArtists
 *   - hours 30d       → nightHourShare / morningHourShare / weekdayShare
 *   - discoveries 30d → newArtistsLast30d / totalArtistsLast30d
 *
 * Usage:
 *   lastfm insights personality --user NAME [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { buildSummary } from '../lib/summary.js';
import { buildHourHistogram, bucketTimestamp } from '../lib/hours.js';
import { findNewArtists, extractArtistTimestamps } from '../lib/discoveries.js';
import { scoreArchetypes, ARCHETYPE_LABELS } from '../lib/personality.js';
import type { PersonalityFeatures } from '../lib/personality.js';
import { flag, parseFlags } from '../lib/args.js';

const USAGE = 'lastfm insights personality --user NAME [--format json|markdown]';

async function fetchAllTimestamps(user: string, from: number, to: number): Promise<number[]> {
  const stamps: number[] = [];
  let page = 1;
  const MAX_PAGES = 20;
  while (page <= MAX_PAGES) {
    const raw = (await callLastfm('user.getRecentTracks', {
      user, from, to, limit: 200, page,
    })) as { recenttracks?: { track?: Array<{ date?: { uts?: string } }> } };
    const tracks = raw?.recenttracks?.track ?? [];
    for (const t of tracks) {
      const uts = t.date?.uts;
      if (uts) stamps.push(Number(uts));
    }
    if (tracks.length < 200) break;
    page++;
  }
  return stamps;
}

function hourShare(stamps: readonly number[], pred: (h: number, w: number) => boolean): number {
  if (stamps.length === 0) return 0;
  let n = 0;
  for (const ts of stamps) {
    const b = bucketTimestamp(ts);
    if (pred(b.hour, b.weekday)) n++;
  }
  return n / stamps.length;
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60;

  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);

  const [summary, stamps] = await Promise.all([
    buildSummary({ user, period: 'weekly', caller, limit: 30 }),
    fetchAllTimestamps(user, from, to),
  ]);

  const hist = buildHourHistogram(stamps);
  const nightHourShare = hourShare(stamps, (h) => h >= 22 || h < 6);
  const morningHourShare = hourShare(stamps, (h) => h >= 6 && h < 12);
  const weekdayShare = hourShare(stamps, (_h, w) => w < 5);

  const baselineRaw = (await callLastfm('user.getTopArtists', {
    user, period: 'overall', limit: 200,
  })) as { topartists?: { artist?: Array<{ name?: string }> } };
  const baseline = new Set(
    (baselineRaw?.topartists?.artist ?? [])
      .map((a) => a.name ?? '')
      .filter((n) => n.length > 0),
  );
  const recentDetailed = await callLastfm('user.getRecentTracks', {
    user, from, to, limit: 200, page: 1,
  });
  const windowData = extractArtistTimestamps(recentDetailed);
  const newbies = findNewArtists(windowData, baseline);
  const newArtistsLast30d = newbies.length;
  const totalArtistsLast30d = new Set(windowData.map((w) => w.name)).size;

  const features: PersonalityFeatures = {
    totalScrobbles: summary.totalScrobbles,
    uniqueArtists: summary.diversity?.uniqueArtists ?? summary.topArtists.length,
    top1Share: summary.diversity?.top1Share ?? 0,
    top3Share: summary.diversity?.top3Share ?? 0,
    top5Share: summary.diversity?.top5Share ?? 0,
    normalizedDiversity: summary.diversity?.normalized ?? 0,
    newArtistsLast30d,
    totalArtistsLast30d,
    nightHourShare,
    morningHourShare,
    weekdayShare,
  };

  const result = scoreArchetypes(features);
  const winner = ARCHETYPE_LABELS[result.winner];

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify({ features, result }, null, 2) + '\n');
  } else {
    const lines: string[] = [];
    lines.push(`# Personalidad musical de ${user}`);
    lines.push('');
    lines.push(`## ${winner.emoji} ${winner.es}`);
    lines.push(`_${winner.blurb}_`);
    lines.push('');
    if (result.reasons.length > 0) {
      lines.push('### Por qué');
      for (const r of result.reasons) lines.push(`- ${r}`);
      lines.push('');
    }
    lines.push('### Todos los scores');
    for (const [id, s] of Object.entries(result.scores)) {
      const pct = (s * 100).toFixed(0);
      const bar = '█'.repeat(Math.round(s * 10)).padEnd(10, '·');
      lines.push(`- ${ARCHETYPE_LABELS[id as keyof typeof ARCHETYPE_LABELS].emoji} ${id.padEnd(10, ' ')} ${bar} ${pct}%`);
    }
    lines.push('');
    lines.push(`Datos: ${hist.total} scrobbles en 30d · pico hora ${hist.peakHour}:00 · pico día ${hist.peakWeekdayLabel}`);
    process.stdout.write(lines.join('\n').trimEnd() + '\n');
  }
}
