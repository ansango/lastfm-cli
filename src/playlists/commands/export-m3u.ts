/**
 * playlists export-m3u — Export an arbitrary list of track items to M3U.
 *
 * Usage:
 *   lastfm playlists export-m3u --tracks '[{"name":"...","artist":"..."}]' [--title "..."]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE = 'lastfm playlists export-m3u --tracks JSON_ARRAY [--title TITLE]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    tracks: flag.string(),
    title: flag.string({ default: 'Custom Playlist', aliases: ['-t'] }),
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

  const title = values['title'] as string;

  const client = makeClient();
  const res = await client.playlists.exportM3U({
    tracks,
    title,
  });

  process.stdout.write(res.content + '\n');
}
