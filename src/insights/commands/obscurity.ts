/**
 * insights obscurity — evaluate user's obscurity / hipster score against global Last.fm popularity.
 *
 * Usage:
 *   lastfm insights obscurity --user NAME [--period weekly|monthly|overall] [--limit 20] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsObscurityResponse, InsightsPeriod } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights obscurity --user NAME [--period weekly|monthly|overall] [--limit 20] [--format json|markdown]';

function renderObscurityMarkdown(res: InsightsObscurityResponse): string {
  const lines: string[] = [];
  lines.push(`# Obscurity Score for ${res.user} — ${res.period}`);
  lines.push('');
  lines.push(`**Score:** ${res.obscurityScore.toFixed(1)}/100 · **Category:** ${res.category}`);
  lines.push(`_${res.description}_`);
  lines.push('');
  lines.push(`- **Artists Evaluated:** ${res.totalArtistsEvaluated}`);
  lines.push(`- **Average Global Listeners:** ${Math.round(res.averageGlobalListeners).toLocaleString('en-US')}`);
  lines.push(`- **Median Global Listeners:** ${Math.round(res.medianGlobalListeners).toLocaleString('en-US')}`);
  lines.push('');

  if (res.artists && res.artists.length > 0) {
    lines.push('## Evaluated Artists');
    for (const a of res.artists.slice(0, 10)) {
      lines.push(`- **${a.name}** — obscurity: ${a.obscurityScore.toFixed(1)} (${a.globalListeners.toLocaleString('en-US')} global listeners)`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    period: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: 'overall',
      aliases: ['-p'],
    }),
    limit: flag.number({ default: 20, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getObscurityScore({
    user,
    period: values['period'] as InsightsPeriod,
    limit: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderObscurityMarkdown(res));
  }
}
