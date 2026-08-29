/**
 * insights streaks — calculate daily listening streaks and dry spells.
 *
 * Usage:
 *   lastfm insights streaks --user NAME [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsStreaksResponse } from '@ansango/lastfm-api/insights';

const USAGE = 'lastfm insights streaks --user NAME [--format json|markdown]';

function renderStreaksMarkdown(res: InsightsStreaksResponse): string {
  const lines: string[] = [];
  lines.push(`# Listening Streaks for ${res.user}`);
  lines.push('');
  lines.push(`- **Current Active Streak:** ${res.currentStreakDays} consecutive days 🔥`);
  lines.push(`- **Longest Streak:** ${res.longestStreakDays} days`);
  lines.push(`- **Total Active Days:** ${res.activeDaysCount} / ${res.totalDaysEvaluated} days`);
  lines.push(`- **Daily Average:** ${res.averageDailyScrobbles.toFixed(1)} scrobbles/day`);
  lines.push(`- **Longest Dry Spell:** ${res.longestDrySpellDays} days without listening`);
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getListeningStreaks({ user });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderStreaksMarkdown(res));
  }
}
