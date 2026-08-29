/**
 * insights personality — derive the user's "listening personality" archetype.
 *
 * Usage:
 *   lastfm insights personality --user NAME [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsPersonalityResponse } from '@ansango/lastfm-api/insights';

const USAGE = 'lastfm insights personality --user NAME [--format json|markdown]';

function renderPersonalityMarkdown(res: InsightsPersonalityResponse): string {
  const { user, archetype, scores, reasons, features } = res;
  const lines: string[] = [];
  lines.push(`# Musical personality for ${user}`);
  lines.push('');
  lines.push(`## ${archetype.emoji} ${archetype.name}`);
  lines.push(`_${archetype.blurb}_`);
  lines.push('');
  if (reasons.length > 0) {
    lines.push('### Why');
    for (const r of reasons) lines.push(`- ${r}`);
    lines.push('');
  }
  lines.push('### All scores');
  for (const [id, s] of Object.entries(scores)) {
    const num = typeof s === 'number' ? s : 0;
    const pct = (num * 100).toFixed(0);
    const bar = '█'.repeat(Math.round(num * 10)).padEnd(10, '·');
    lines.push(`- ${id.padEnd(12, ' ')} ${bar} ${pct}%`);
  }
  lines.push('');
  lines.push(`Data: ${features.totalScrobbles} scrobbles in 30d · ${features.uniqueArtists} unique artists`);
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
  const res = await client.insights.getPersonality({ user });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderPersonalityMarkdown(res));
  }
}
