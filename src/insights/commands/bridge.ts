/**
 * insights bridge — find artists that bridge two distinct musical genres/tags.
 *
 * Usage:
 *   lastfm insights bridge --tag-a TAG --tag-b TAG [--limit 10] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsBridgeArtistsResponse } from '@ansango/lastfm-api/insights';

const USAGE = 'lastfm insights bridge --tag-a TAG --tag-b TAG [--limit 10] [--format json|markdown]';

function renderBridgeMarkdown(res: InsightsBridgeArtistsResponse): string {
  const lines: string[] = [];
  lines.push(`# Bridge Artists between "${res.tagA}" and "${res.tagB}"`);
  lines.push('');
  if (res.bridgeArtists.length === 0) {
    lines.push('_No overlapping bridge artists found for these two tags._');
    return lines.join('\n').trimEnd() + '\n';
  }
  lines.push('## Connecting Artists');
  for (const b of res.bridgeArtists) {
    lines.push(`- **${b.name}** — combined score: ${b.combinedScore.toFixed(1)} (rank in "${res.tagA}": #${b.rankA}, "${res.tagB}": #${b.rankB})`);
  }
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    'tag-a': flag.string(),
    'tag-b': flag.string(),
    limit: flag.number({ default: 10, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const tagA = values['tag-a'] as string;
  const tagB = values['tag-b'] as string;
  if (!tagA || !tagB) throw new Error('--tag-a and --tag-b are required');

  const client = makeClient();
  const res = await client.insights.getBridgeArtists({
    tagA,
    tagB,
    limit: values['limit'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderBridgeMarkdown(res));
  }
}
