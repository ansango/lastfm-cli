/**
 * insights binges — detect binge sessions (consecutive same-artist/track
 * plays) within the user's recent listening.
 *
 * Usage:
 *   lastfm insights binges --user NAME [--since 30d] [--min-length 3]
 *                           [--track-key artist|track] [--max-gap 3600]
 *                           [--limit 10] [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { findBinges, extractScrobbles } from '../lib/binges.js';
import type { Scrobble } from '../lib/binges.js';
import { flag, parseFlags } from '../lib/args.js';

const USAGE =
  'lastfm insights binges --user NAME [--since 30d] [--min-length 3] ' +
  '[--track-key artist|track] [--max-gap 3600] [--limit 10] [--format json|markdown]';

async function fetchAllScrobbles(user: string, from: number, to: number): Promise<Scrobble[]> {
  const all: Scrobble[] = [];
  let page = 1;
  const MAX_PAGES = 20;
  while (page <= MAX_PAGES) {
    const raw = await callLastfm('user.getRecentTracks', {
      user, from, to, limit: 200, page,
    });
    const batch = extractScrobbles(raw);
    all.push(...batch);
    const tracks = (raw as { recenttracks?: { track?: unknown[] } })?.recenttracks?.track ?? [];
    if (tracks.length < 200) break;
    page++;
  }
  return all;
}

function fmtDate(uts: number): string {
  return new Date(uts * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

function renderBingesMarkdown(
  binges: ReturnType<typeof findBinges>,
  user: string,
  sinceDays: number,
  trackKey: 'artist' | 'track',
  minLength: number,
): string {
  const lines: string[] = [];
  lines.push(`# Binges de ${user} — últimos ${sinceDays} días`);
  lines.push('');
  lines.push(`**Track key:** ${trackKey} · **Min length:** ${minLength}`);
  lines.push('');
  if (binges.length === 0) {
    lines.push('_Sin binges detectados con esos parámetros._');
    return lines.join('\n').trimEnd() + '\n';
  }
  for (const b of binges) {
    const dur = Math.round((b.endUts - b.startUts) / 60);
    const header = b.track ? `${b.artist} — ${b.track}` : b.artist;
    lines.push(`## ${header} — ${b.length} plays consecutivos`);
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

  const to = Math.floor(Date.now() / 1000);
  const from = to - (values['since'] as number) * 24 * 60 * 60;
  const scrobbles = await fetchAllScrobbles(user, from, to);
  const binges = findBinges(scrobbles, {
    minLength: values['min-length'] as number,
    trackKey: values['track-key'] as 'artist' | 'track',
    maxGapSeconds: values['max-gap'] as number,
    maxResults: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify({ totalScrobbles: scrobbles.length, binges }, null, 2) + '\n');
  } else {
    process.stdout.write(renderBingesMarkdown(binges, user, values['since'] as number, values['track-key'] as 'artist' | 'track', values['min-length'] as number));
  }
}
