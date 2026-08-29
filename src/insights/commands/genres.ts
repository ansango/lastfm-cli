/**
 * insights genres — compute normalized genre breakdown and HHI market concentration index.
 *
 * Usage:
 *   lastfm insights genres --user NAME [--period weekly|monthly|overall] [--limit 10] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsGenreBreakdownResponse, InsightsPeriod } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights genres --user NAME [--period weekly|monthly|overall] [--limit 10] [--format json|markdown]';

function renderGenresMarkdown(res: InsightsGenreBreakdownResponse): string {
  const lines: string[] = [];
  lines.push(`# Genre Breakdown for ${res.user} — ${res.period}`);
  lines.push('');
  lines.push(`**HHI Concentration:** ${res.hhiIndex} · **Level:** ${res.specializationLevel}`);
  lines.push(`_${res.description}_`);
  lines.push('');
  lines.push('## Top Genres');
  for (const g of res.genres) {
    const bar = '█'.repeat(Math.round(g.percentage / 10)).padEnd(10, '·');
    lines.push(`- \`${g.name.padEnd(16, ' ')}\` ${bar} ${g.percentage.toFixed(1)}% (${g.weight} weight)`);
  }
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    period: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: 'overall',
      aliases: ['-p'],
    }),
    limit: flag.number({ default: 10, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getGenreBreakdown({
    user,
    period: values['period'] as InsightsPeriod,
    limit: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderGenresMarkdown(res));
  }
}
