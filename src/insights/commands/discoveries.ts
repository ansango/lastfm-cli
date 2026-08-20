/**
 * insights discoveries — artists you discovered within a recent window.
 *
 * Strategy: paginate `user.getRecentTracks` over the window to gather every
 * artist that appeared, dedupe, then subtract the baseline set built from
 * `user.getTopArtists period=overall limit=200` (a generous "your historical
 * roster"). What remains = your fresh discoveries.
 *
 * Usage:
 *   lastfm insights discoveries --user NAME [--since 30d] [--limit 30] [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { extractArtistTimestamps, findNewArtists } from '../lib/discoveries.js';
import { flag, parseFlags } from '../lib/args.js';

const USAGE =
  'lastfm insights discoveries --user NAME [--since 30d] [--limit 30] [--format json|markdown]';

async function fetchAllRecent(user: string, from: number, to: number): Promise<unknown> {
  const allTracks: unknown[] = [];
  let page = 1;
  const MAX_PAGES = 20;
  while (page <= MAX_PAGES) {
    const raw = (await callLastfm('user.getRecentTracks', {
      user, from, to, limit: 200, page,
    })) as { recenttracks?: { track?: unknown[]; '@attr'?: Record<string, unknown> } };
    const tracks = raw?.recenttracks?.track ?? [];
    allTracks.push(...tracks);
    if (tracks.length < 200) break;
    page++;
  }
  return { recenttracks: { track: allTracks } };
}

async function fetchBaseline(user: string): Promise<Set<string>> {
  const raw = (await callLastfm('user.getTopArtists', {
    user, period: 'overall', limit: 200,
  })) as { topartists?: { artist?: Array<{ name?: string }> } };
  const arr = raw?.topartists?.artist ?? [];
  return new Set(arr.map((a) => a.name ?? '').filter((n) => n.length > 0));
}

function renderMarkdown(
  newbies: ReturnType<typeof findNewArtists>,
  user: string,
  sinceDays: number,
  baselineSize: number,
): string {
  const lines: string[] = [];
  lines.push(`# Descubrimientos de ${user} — últimos ${sinceDays} días`);
  lines.push('');
  lines.push(`**Baseline:** ${baselineSize} artistas en tu historial global.`);
  lines.push(`**Nuevos en la ventana:** ${newbies.length}`);
  lines.push('');
  if (newbies.length === 0) {
    lines.push('_No has descubierto artistas nuevos en esta ventana._');
    return lines.join('\n').trimEnd() + '\n';
  }
  lines.push('## Artistas nuevos');
  for (const a of newbies) {
    const d = new Date(a.firstSeen * 1000);
    lines.push(`- **${a.name}** — primer scrobble el ${d.toISOString().slice(0, 10)}`);
  }
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    since: flag.days({ default: 30, aliases: ['-s'] }),
    limit: flag.number({ default: 30, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const sinceDays = values['since'] as number;
  const limit = values['limit'] as number;
  const to = Math.floor(Date.now() / 1000);
  const from = to - sinceDays * 24 * 60 * 60;

  const [recentPayload, baseline] = await Promise.all([
    fetchAllRecent(user, from, to),
    fetchBaseline(user),
  ]);

  const windowData = extractArtistTimestamps(recentPayload);
  const newbies = findNewArtists(windowData, baseline, { maxResults: limit });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify({ baselineSize: baseline.size, newbies }, null, 2) + '\n');
  } else {
    process.stdout.write(renderMarkdown(newbies, user, sinceDays, baseline.size));
  }
}
