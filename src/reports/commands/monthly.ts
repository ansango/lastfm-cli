/**
 * reports monthly — Monthly digest bulletin with growth comparison against previous month.
 *
 * Usage:
 *   lastfm reports monthly --user NAME [--year YYYY] [--month 1-12] [--format markdown|json]
 */
import { makeClient } from '../../client.js';
import { renderMonthlyDigestMarkdown } from '../lib/render.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE =
  'lastfm reports monthly --user NAME [--year YYYY] [--month 1-12] [--format markdown|json]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    year: flag.number({ default: 0, aliases: ['-y'] }),
    month: flag.number({ default: 0, aliases: ['-m'] }),
    format: flag.enum(['markdown', 'json'], { default: 'markdown', aliases: ['-f'] }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const yearNum = values['year'] as number;
  const year = yearNum > 0 ? yearNum : undefined;

  const monthNum = values['month'] as number;
  const month = monthNum >= 1 && monthNum <= 12 ? monthNum : undefined;

  const client = makeClient();
  const report = await client.reports.getMonthlyDigest({
    user,
    year,
    month,
  });

  if ((values['format'] as string) === 'json') {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(renderMonthlyDigestMarkdown(report) + '\n');
  }
}
