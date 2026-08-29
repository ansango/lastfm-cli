/**
 * insights compare — compare two Last.fm users by their top artists.
 *
 * Usage:
 *   lastfm insights compare --user-a NAME --user-b NAME [--period overall|weekly|monthly|3month|6month|12month]
 *                            [--limit 50] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsCompareResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights compare --user-a NAME --user-b NAME ' +
  '[--period overall|weekly|monthly|3month|6month|12month] [--limit 50] [--format json|markdown]';

function toComparePeriod(p: string): 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' {
  if (p === 'weekly') return '7day';
  if (p === 'monthly') return '1month';
  if (p === '7day' || p === '1month' || p === '3month' || p === '6month' || p === '12month' || p === 'overall') {
    return p;
  }
  return 'overall';
}

function renderCompareMarkdown(
  r: InsightsCompareResponse,
  a: string, b: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${a} vs ${b}`);
  lines.push('');
  const pct = (r.jaccard * 100).toFixed(1);
  const verdict =
    r.jaccard > 0.6 ? 'musical twins' :
    r.jaccard > 0.3 ? 'a lot in common' :
    r.jaccard > 0.1 ? 'some overlap' :
                      'different worlds';
  lines.push(`**Similarity (Jaccard):** ${pct}% — ${verdict}`);
  lines.push('');
  lines.push(`- Top artists of **${a}**: ${r.userACount}`);
  lines.push(`- Top artists of **${b}**: ${r.userBCount}`);
  lines.push(`- In common: **${r.sharedCount}**`);
  lines.push(`- Only on ${a}: ${r.onlyUserA.length} · only on ${b}: ${r.onlyUserB.length}`);
  lines.push('');
  if (r.sharedArtists.length > 0) {
    lines.push('## Artists in common (top by min plays)');
    const top = r.sharedArtists.slice(0, 15);
    for (const entry of top) {
      lines.push(`- **${entry.name}** (${entry.weight} plays)`);
    }
    lines.push('');
  }
  if (r.onlyUserA.length > 0) {
    lines.push(`## Only on ${a}`);
    const top = r.onlyUserA.slice(0, 10);
    for (const name of top) lines.push(`- ${name}`);
    if (r.onlyUserA.length > 10) lines.push(`- … (+${r.onlyUserA.length - 10} more)`);
    lines.push('');
  }
  if (r.onlyUserB.length > 0) {
    lines.push(`## Only on ${b}`);
    const top = r.onlyUserB.slice(0, 10);
    for (const name of top) lines.push(`- ${name}`);
    if (r.onlyUserB.length > 10) lines.push(`- … (+${r.onlyUserB.length - 10} more)`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    'user-a': flag.string(),
    'user-b': flag.string(),
    period: flag.string({ default: 'overall', aliases: ['-p'] }),
    limit: flag.number({ default: 50, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const userA = values['user-a'] as string;
  const userB = values['user-b'] as string;
  if (!userA || !userB) throw new Error('--user-a and --user-b are required');

  const limit = values['limit'] as number;
  const period = values['period'] as string;

  const client = makeClient();
  const r = await client.insights.compareUsers({
    userA,
    userB,
    period: toComparePeriod(period),
    limit,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  } else {
    process.stdout.write(renderCompareMarkdown(r, userA, userB));
  }
}
