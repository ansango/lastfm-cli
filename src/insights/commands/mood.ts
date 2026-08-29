/**
 * insights mood — derive a mood profile from the user's listening context.
 *
 * Usage:
 *   lastfm insights mood --user NAME [--period weekly] [--top-artists 10]
 *                        [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsMoodResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights mood --user NAME [--period weekly] [--top-artists 10] [--format json|markdown]';

function toMoodPeriod(p: string): 'overall' | '7day' | '1month' | '3month' | '6month' | '12month' {
  if (p === 'weekly') return '7day';
  if (p === 'monthly') return '1month';
  if (p === '7day' || p === '1month' || p === '3month' || p === '6month' || p === '12month' || p === 'overall') {
    return p;
  }
  return '7day';
}

function moodBar(v: number): string {
  const pos = Math.max(0, Math.min(9, Math.round((v + 1) * 4.5)));
  const chars = '·'.repeat(10).split('');
  chars[pos] = '│';
  return chars.join('');
}

function renderMoodMarkdown(
  m: InsightsMoodResponse,
  user: string,
  period: string,
): string {
  const lines: string[] = [];
  lines.push(`# Musical mood for ${user} — ${period}`);
  lines.push('');
  lines.push(`**Label:** ${m.label}`);
  lines.push(`**Confidence:** ${(m.confidence * 100).toFixed(0)}% (${m.tagSourceCount} tags analyzed, primary source: ${m.primarySource})`);
  lines.push('');
  lines.push('## Axes');
  lines.push(`Energy   ${moodBar(m.axes.energy)}  ${m.axes.energy.toFixed(2)}  (-1 calm, +1 intense)`);
  lines.push(`Valence  ${moodBar(m.axes.valence)}  ${m.axes.valence.toFixed(2)}  (-1 somber, +1 euphoric)`);
  lines.push('');
  if (m.categories.length > 0) {
    lines.push(`**Dominant categories:** ${m.categories.slice(0, 5).join(', ')}`);
    lines.push('');
  }
  if (m.confidence < 0.3) {
    lines.push('_Low confidence: few tags recognized. Increase `--top-artists` or add more tags on Last.fm._');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    period: flag.string({ default: 'weekly', aliases: ['-p'] }),
    'top-artists': flag.number({ default: 10 }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const periodArg = values['period'] as string;
  const client = makeClient();
  const m = await client.insights.getMood({
    user,
    period: toMoodPeriod(periodArg),
    topArtistsLimit: values['top-artists'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(m, null, 2) + '\n');
  } else {
    process.stdout.write(renderMoodMarkdown(m, user, periodArg));
  }
}
