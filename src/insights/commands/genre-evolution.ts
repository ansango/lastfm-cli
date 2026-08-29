/**
 * insights genre-evolution — track shifts in musical genre distribution over time.
 *
 * Usage:
 *   lastfm insights genre-evolution --user NAME [--now 1month] [--compare 12month] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsGenreEvolutionResponse, InsightsPeriod } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights genre-evolution --user NAME [--now 1month] [--compare 12month] [--format json|markdown]';

function renderGenreEvolutionMarkdown(res: InsightsGenreEvolutionResponse): string {
  const lines: string[] = [];
  lines.push(`# Genre Evolution for ${res.user} (${res.currentPeriod} vs ${res.previousPeriod})`);
  lines.push('');

  if (res.risingGenres.length > 0) {
    lines.push('## Expanding Genres 📈');
    for (const g of res.risingGenres) {
      lines.push(`- **${g.name}** — now ${g.currentPct.toFixed(1)}% (+${g.deltaPct.toFixed(1)}%)`);
    }
    lines.push('');
  }

  if (res.fadingGenres.length > 0) {
    lines.push('## Declining Genres 📉');
    for (const g of res.fadingGenres) {
      lines.push(`- **${g.name}** — now ${g.currentPct.toFixed(1)}% (${g.deltaPct.toFixed(1)}%)`);
    }
    lines.push('');
  }

  if (res.newGenres.length > 0) {
    lines.push('## Emerging Genres ✨');
    for (const g of res.newGenres) {
      lines.push(`- **${g.name}** — new: ${g.currentPct.toFixed(1)}%`);
    }
    lines.push('');
  }

  if (res.risingGenres.length === 0 && res.fadingGenres.length === 0 && res.newGenres.length === 0) {
    lines.push('_No major genre shifts detected between periods._');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    now: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: '1month',
      aliases: ['-n'],
    }),
    compare: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: '12month',
      aliases: ['-c'],
    }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getGenreEvolution({
    user,
    currentPeriod: values['now'] as InsightsPeriod,
    previousPeriod: values['compare'] as InsightsPeriod,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderGenreEvolutionMarkdown(res));
  }
}
