/**
 * playlists export-csv — Export an arbitrary list of track items to CSV.
 *
 * Usage:
 *   lastfm playlists export-csv --tracks '[{"name":"...","artist":"..."}]' [--filename FILE]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE = 'lastfm playlists export-csv --tracks JSON_ARRAY [--filename FILE]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    tracks: flag.string(),
    filename: flag.string({ default: 'playlist.csv', aliases: ['-o'] }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const tracksStr = values['tracks'] as string;
  if (!tracksStr) throw new Error('--tracks (JSON array) is required');

  let tracks: Array<{ name: string; artist: string; album?: string; duration?: number }>;
  try {
    tracks = JSON.parse(tracksStr);
  } catch (e) {
    throw new Error(`Invalid JSON in --tracks: ${e instanceof Error ? e.message : String(e)}`);
  }

  const filename = values['filename'] as string;

  const client = makeClient();
  const res = await client.playlists.exportCsv({
    tracks,
    filename,
  });

  process.stdout.write(res.content + '\n');
}
