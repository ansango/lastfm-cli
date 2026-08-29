/**
 * insights binges — detect binge sessions (consecutive same-artist/track
 * plays) within the user's recent listening.
 *
 * Usage:
 *   lastfm insights binges --user NAME [--since 30d] [--min-length 3]
 *                           [--track-key artist|track] [--max-gap 3600]
 *                           [--limit 10] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsBingesResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights binges --user NAME [--since 30d] [--min-length 3] ' +
  '[--track-key artist|track] [--max-gap 3600] [--limit 10] [--format json|markdown]';

function fmtDate(uts: number): string {
  return new Date(uts * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

function renderBingesMarkdown(
  res: InsightsBingesResponse,
  sinceDays: number,
  trackKey: 'artist' | 'track',
  minLength: number,
): string {
  const lines: string[] = [];
  lines.push(`# Binges for ${res.user} — last ${sinceDays} days`);
  lines.push('');
  lines.push(`**Track key:** ${trackKey} · **Min length:** ${minLength}`);
  lines.push('');
  if (res.binges.length === 0) {
    lines.push('_No binges detected with these parameters._');
    return lines.join('\n').trimEnd() + '\n';
  }
  for (const b of res.binges) {
    const dur = Math.round(b.durationSeconds / 60);
    const header = b.track ? `${b.artist} — ${b.track}` : b.artist;
    lines.push(`## ${header} — ${b.length} consecutive plays`);
    lines.push(`_${fmtDate(b.startUts)} → ${fmtDate(b.endUts)}_ (${dur} min)`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    since: flag.days({ default: 30, aliases: ['-s'] }),
    'min-length': flag.number({ default: 3 }),
    'track-key': flag.enum(['artist', 'track'], { default: 'artist' }),
    'max-gap': flag.number({ default: 3600 }),
    limit: flag.number({ default: 10, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const sinceDays = values['since'] as number;
  const trackKey = values['track-key'] as 'artist' | 'track';
  const minLength = values['min-length'] as number;
  const maxGapSeconds = values['max-gap'] as number;
  const limit = values['limit'] as number;

  const client = makeClient();
  const res = await client.insights.getBinges({
    user,
    sinceDays,
    minLength,
    trackKey,
    maxGapSeconds,
    maxResults: limit,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderBingesMarkdown(res, sinceDays, trackKey, minLength));
  }
}
