/**
 * insights trends — diff your top artists/tracks between two periods.
 *
 * Usage:
 *   lastfm insights trends --user NAME [--now weekly|monthly] [--compare weekly|monthly]
 *                          [--kind artist|track] [--limit 10] [--format json|markdown]
 *
 * Examples:
 *   lastfm insights trends --user ansango --now weekly --compare monthly
 *   lastfm insights trends --user ansango --now monthly --compare 3month --kind track
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsTrendsResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights trends --user NAME [--now weekly|monthly] [--compare weekly|monthly] ' +
  '[--kind artist|track] [--limit 10] [--format json|markdown]';

function toPeriod(p: string): 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' {
  if (p === 'weekly') return '7day';
  if (p === 'monthly') return '1month';
  if (p === '7day' || p === '1month' || p === '3month' || p === '6month' || p === '12month' || p === 'overall') {
    return p;
  }
  return '7day';
}

function renderMarkdown(
  diff: InsightsTrendsResponse,
  user: string,
  now: string,
  compare: string,
  kind: 'artist' | 'track',
): string {
  const lines: string[] = [];
  lines.push(`# Trends for ${user} — ${kind}s (${now} vs ${compare})`);
  lines.push('');

  if (diff.risers.length > 0) {
    lines.push(`## Rising (${diff.risers.length})`);
    for (const r of diff.risers) {
      const arrow = r.deltaRank > 0 ? `↑${r.deltaRank}` : '↑';
      lines.push(`- **${r.name}** — now ${r.playcount} plays (${arrow} in rank)`);
    }
    lines.push('');
  }

  if (diff.fallers.length > 0) {
    lines.push(`## Falling (${diff.fallers.length})`);
    for (const f of diff.fallers) {
      const arrow = f.deltaRank < 0 ? `↓${Math.abs(f.deltaRank)}` : '↓';
      lines.push(`- **${f.name}** — now ${f.playcount} plays (${arrow} in rank)`);
    }
    lines.push('');
  }

  if (diff.newcomers.length > 0) {
    lines.push(`## Newcomers (${diff.newcomers.length})`);
    for (const n of diff.newcomers) {
      lines.push(`- **${n.name}** — ${n.playcount} plays (straight to top)`);
    }
    lines.push('');
  }

  if (diff.departures.length > 0) {
    lines.push(`## Departures (${diff.departures.length})`);
    for (const d of diff.departures) {
      lines.push(`- ~~${d.name}~~ (had ${d.playcount} plays in previous period)`);
    }
    lines.push('');
  }

  if (
    diff.risers.length === 0 &&
    diff.fallers.length === 0 &&
    diff.newcomers.length === 0 &&
    diff.departures.length === 0
  ) {
    lines.push('_No significant changes between the two periods._');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    now: flag.string({ default: 'weekly', aliases: ['-n'] }),
    compare: flag.string({ default: 'monthly', aliases: ['-c'] }),
    kind: flag.enum(['artist', 'track'], { default: 'artist', aliases: ['-k'] }),
    limit: flag.number({ default: 10, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const kind = values['kind'] as 'artist' | 'track';
  const limit = values['limit'] as number;
  const nowArg = values['now'] as string;
  const compareArg = values['compare'] as string;

  const client = makeClient();
  const target = kind === 'artist' ? ('artists' as const) : ('tracks' as const);
  const diff = await client.insights.getTrends({
    user,
    target,
    currentPeriod: toPeriod(nowArg),
    previousPeriod: toPeriod(compareArg),
    limit,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(diff, null, 2) + '\n');
  } else {
    process.stdout.write(renderMarkdown(diff, user, nowArg, compareArg, kind));
  }
}
