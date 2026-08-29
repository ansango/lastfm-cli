/**
 * insights recommendations — traverse Last.fm similarity graph to recommend new artists.
 *
 * Usage:
 *   lastfm insights recommendations --user NAME [--seeds 5] [--limit 10] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsRecommendationsResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights recommendations --user NAME [--seeds 5] [--limit 10] [--format json|markdown]';

function renderRecommendationsMarkdown(res: InsightsRecommendationsResponse): string {
  const lines: string[] = [];
  lines.push(`# Smart Recommendations for ${res.user}`);
  lines.push('');
  if (res.recommendations.length === 0) {
    lines.push('_No unlistened recommendations found with the given seed criteria._');
    return lines.join('\n').trimEnd() + '\n';
  }
  lines.push('## Recommended Artists');
  for (const r of res.recommendations) {
    const scorePct = (r.score * 100).toFixed(0);
    const seeds = r.matchedSeeds.join(', ');
    lines.push(`- **${r.name}** (${scorePct}% match from seeds: _${seeds}_)`);
  }
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    seeds: flag.number({ default: 5, aliases: ['-s'] }),
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
  const res = await client.insights.getSmartRecommendations({
    user,
    seedLimit: values['seeds'] as number,
    limit: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderRecommendationsMarkdown(res));
  }
}
