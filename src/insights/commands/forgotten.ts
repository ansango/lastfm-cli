/**
 * insights forgotten — identify all-time favorite artists with recent listening drop-off.
 *
 * Usage:
 *   lastfm insights forgotten --user NAME [--historic 12month] [--recent 1month] [--limit 10] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsForgottenFavoritesResponse, InsightsPeriod } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights forgotten --user NAME [--historic 12month] [--recent 1month] [--limit 10] [--format json|markdown]';

function renderForgottenMarkdown(res: InsightsForgottenFavoritesResponse): string {
  const lines: string[] = [];
  lines.push(`# Forgotten Favorites for ${res.user} (${res.historicPeriod} vs ${res.recentPeriod})`);
  lines.push('');
  if (res.forgottenArtists.length === 0) {
    lines.push('_No forgotten favorites detected with these period settings._');
    return lines.join('\n').trimEnd() + '\n';
  }
  lines.push(`## Revival Candidates (${res.totalForgotten}) 🕰️`);
  for (const f of res.forgottenArtists) {
    lines.push(`- **${f.name}** — was #${f.historicRank} (${f.historicPlaycount} plays)`);
  }
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    historic: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: '12month',
      aliases: ['-h'],
    }),
    recent: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: '1month',
      aliases: ['-r'],
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
  const res = await client.insights.getForgottenFavorites({
    user,
    historicPeriod: values['historic'] as InsightsPeriod,
    recentPeriod: values['recent'] as InsightsPeriod,
    limit: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderForgottenMarkdown(res));
  }
}
