/**
 * insights group-compare — compare taste compatibility and consensus across 3-10 users.
 *
 * Usage:
 *   lastfm insights group-compare --users user1,user2,user3 [--period 1month] [--limit 30] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsCompareTasteGroupResponse, InsightsPeriod } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights group-compare --users user1,user2,user3 [--period 1month] [--limit 30] [--format json|markdown]';

function renderGroupCompareMarkdown(res: InsightsCompareTasteGroupResponse): string {
  const lines: string[] = [];
  lines.push(`# Group Taste Comparison (${res.users.join(', ')}) — ${res.period}`);
  lines.push('');
  lines.push(`- **Group Average Compatibility:** ${(res.groupAverageCompatibility * 100).toFixed(1)}%`);
  if (res.groupAnchor) {
    lines.push(`- **Taste Anchor ⚓:** ${res.groupAnchor.user} (${(res.groupAnchor.averageCompatibility * 100).toFixed(1)}% avg compatibility)`);
  }
  if (res.groupOutlier) {
    lines.push(`- **Eclectic Outlier 🛸:** ${res.groupOutlier.user} (${(res.groupOutlier.averageCompatibility * 100).toFixed(1)}% avg compatibility)`);
  }
  lines.push('');

  if (res.consensusArtists && res.consensusArtists.length > 0) {
    lines.push('## Consensus Artists 🤝');
    for (const a of res.consensusArtists.slice(0, 10)) {
      lines.push(`- **${a.name}** — listened to by ${a.listenerCount}/${res.users.length} members (${a.totalPlays} total plays)`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    users: flag.string(),
    period: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall', '7day', '1month', '3month', '6month', '12month'], {
      default: 'overall',
      aliases: ['-p'],
    }),
    limit: flag.number({ default: 30, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const usersRaw = values['users'] as string;
  if (!usersRaw) throw new Error('--users (comma-separated list of 3-10 usernames) is required');

  const users = usersRaw.split(',').map((u) => u.trim()).filter((u) => u.length > 0);
  if (users.length < 3 || users.length > 10) {
    throw new Error(`--users requires between 3 and 10 usernames (got ${users.length})`);
  }

  const client = makeClient();
  const res = await client.insights.compareTasteGroup({
    users,
    period: values['period'] as InsightsPeriod,
    limit: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderGroupCompareMarkdown(res));
  }
}
