/**
 * insights summary — Wrapped-style summary for the given user & period.
 *
 * Usage:
 *   lastfm insights summary --user NAME --period weekly [--limit N] [--format json|markdown]
 *
 * Reads LASTFM_API_KEY from the environment via the standard CLI search
 * order (handled inside `callLastfm`).
 */
import { makeClient } from '../../client.js';
import { renderSummaryMarkdown } from '../lib/render.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsPeriod } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights summary --user NAME --period weekly [--limit N] [--format json|markdown]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    period: flag.enum(['daily', 'weekly', 'monthly', 'yearly', 'overall'], {
      default: 'weekly',
      aliases: ['-p'],
    }),
    limit: flag.number({ default: 5, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const summary = await client.insights.getSummary({
    user,
    period: values['period'] as InsightsPeriod,
    limit: values['limit'] as number,
  });

  if ((values['format'] as 'json' | 'markdown') === 'json') {
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  } else {
    process.stdout.write(renderSummaryMarkdown(summary));
  }
}
