/**
 * insights heatmap — generate daily listening intensity heatmap.
 *
 * Usage:
 *   lastfm insights heatmap --user NAME [--days 90] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsHeatmapResponse } from '@ansango/lastfm-api/insights';

const USAGE = 'lastfm insights heatmap --user NAME [--days 90] [--format json|markdown]';

const INTENSITY_CHARS = ['·', '░', '▒', '▓', '█'];

function renderHeatmapMarkdown(res: InsightsHeatmapResponse): string {
  const lines: string[] = [];
  lines.push(`# Listening Heatmap for ${res.user} — last ${res.days.length} days`);
  lines.push('');
  lines.push(`- **Total Scrobbles:** ${res.totalScrobbles.toLocaleString('en-US')}`);
  lines.push(`- **Max Daily Count:** ${res.maxDailyCount} scrobbles`);
  if (res.busiestDay) {
    lines.push(`- **Busiest Day:** ${res.busiestDay.date} (${res.busiestDay.count} scrobbles)`);
  }
  lines.push('');
  lines.push('## Recent Daily Activity');
  for (const e of res.days.slice(-30)) {
    const char = INTENSITY_CHARS[e.level] ?? '·';
    lines.push(`\`${e.date}\` ${char} ${e.count} plays (level ${e.level})`);
  }
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    days: flag.number({ default: 90, aliases: ['-d'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getListeningHeatmap({
    user,
    days: values['days'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderHeatmapMarkdown(res));
  }
}
