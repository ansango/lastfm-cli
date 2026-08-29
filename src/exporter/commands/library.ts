/**
 * exporter library — Exports a user's artist library in JSON or CSV format.
 *
 * Usage:
 *   lastfm exporter library --user NAME [--limit N] [--format json|csv]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE = 'lastfm exporter library --user NAME [--limit N] [--format json|csv]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    limit: flag.number({ default: 1000, aliases: ['-l'] }),
    format: flag.enum(['json', 'csv'], { default: 'json', aliases: ['-f'] }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const limit = values['limit'] as number;
  const format = values['format'] as 'json' | 'csv';

  const client = makeClient();
  const res = await client.exporter.exportLibrary({
    user,
    limit,
    format,
  });

  process.stdout.write(res.content + '\n');
}
