/**
 * insights discoveries — artists you discovered within a recent window.
 *
 * Usage:
 *   lastfm insights discoveries --user NAME [--since 30d] [--limit 30] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsDiscoveriesResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights discoveries --user NAME [--since 30d] [--limit 30] [--format json|markdown]';

function renderMarkdown(
  res: InsightsDiscoveriesResponse,
  user: string,
  sinceDays: number,
): string {
  const lines: string[] = [];
  lines.push(`# Descubrimientos de ${user} — últimos ${sinceDays} días`);
  lines.push('');
  lines.push(`**Baseline:** ${res.baselineSize} artistas en tu historial global.`);
  lines.push(`**Nuevos en la ventana:** ${res.discoveries.length}`);
  lines.push('');
  if (res.discoveries.length === 0) {
    lines.push('_No has descubierto artistas nuevos en esta ventana._');
    return lines.join('\n').trimEnd() + '\n';
  }
  lines.push('## Artistas nuevos');
  for (const a of res.discoveries) {
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

  const client = makeClient();
  const res = await client.insights.getDiscoveries({
    user,
    windowDays: sinceDays,
    maxResults: limit,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify({ baselineSize: res.baselineSize, newbies: res.discoveries }, null, 2) + '\n');
  } else {
    process.stdout.write(renderMarkdown(res, user, sinceDays));
  }
}
