/**
 * reports wrapped — Year in review / wrapped analytical report.
 *
 * Usage:
 *   lastfm reports wrapped --user NAME [--year YYYY] [--format markdown|json]
 */
import { makeClient } from '../../client.js';
import { renderWrappedMarkdown } from '../lib/render.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE = 'lastfm reports wrapped --user NAME [--year YYYY] [--format markdown|json]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    year: flag.number({ default: 0, aliases: ['-y'] }),
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

  const client = makeClient();
  const report = await client.reports.getWrapped({
    user,
    year,
  });

  if ((values['format'] as string) === 'json') {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(renderWrappedMarkdown(report) + '\n');
  }
}
