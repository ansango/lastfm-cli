/**
 * exporter scrobbles — Exports historical scrobbles in JSON, JSONL, CSV, or ListenBrainz format.
 *
 * Usage:
 *   lastfm exporter scrobbles --user NAME [--from UTS] [--to UTS] [--limit N] [--format json|jsonl|csv|listenbrainz]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE =
  'lastfm exporter scrobbles --user NAME [--from UTS] [--to UTS] [--limit N] [--format json|jsonl|csv|listenbrainz]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    from: flag.number({ default: 0 }),
    to: flag.number({ default: 0 }),
    limit: flag.number({ default: 200, aliases: ['-l'] }),
    format: flag.enum(['json', 'jsonl', 'csv', 'listenbrainz'], {
      default: 'json',
      aliases: ['-f'],
    }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const fromNum = values['from'] as number;
  const from = fromNum > 0 ? fromNum : undefined;

  const toNum = values['to'] as number;
  const to = toNum > 0 ? toNum : undefined;

  const limit = values['limit'] as number;
  const format = values['format'] as 'json' | 'jsonl' | 'csv' | 'listenbrainz';

  const client = makeClient();
  const res = await client.exporter.exportScrobbles({
    user,
    from,
    to,
    limit,
    format,
  });

  process.stdout.write(res.content + '\n');
}
