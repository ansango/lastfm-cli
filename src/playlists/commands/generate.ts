/**
 * playlists generate — Generates an algorithmic playlist based on listener patterns.
 *
 * Usage:
 *   lastfm playlists generate --user NAME --mode MODE [--limit N] [--format text|m3u|csv|json]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE =
  'lastfm playlists generate --user NAME --mode time-capsule|deep-cuts|heavy-rotation|discovery-radar [--limit N] [--format text|m3u|csv|json]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    mode: flag.enum(['time-capsule', 'deep-cuts', 'heavy-rotation', 'discovery-radar'], {
      default: 'heavy-rotation',
      aliases: ['-m'],
    }),
    limit: flag.number({ default: 20, aliases: ['-l'] }),
    format: flag.enum(['text', 'm3u', 'csv', 'json'], { default: 'text', aliases: ['-f'] }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const mode = values['mode'] as 'time-capsule' | 'deep-cuts' | 'heavy-rotation' | 'discovery-radar';
  const limit = values['limit'] as number;
  const format = values['format'] as 'text' | 'm3u' | 'csv' | 'json';

  const client = makeClient();
  const playlist = await client.playlists.generate({
    user,
    mode,
    limit,
  });

  if (format === 'json') {
    process.stdout.write(JSON.stringify(playlist, null, 2) + '\n');
    return;
  }

  if (format === 'm3u') {
    process.stdout.write(playlist.formats.m3u + '\n');
    return;
  }

  if (format === 'csv') {
    process.stdout.write(playlist.formats.csv + '\n');
    return;
  }

  // Format: text table
  const lines: string[] = [];
  lines.push(`# 🎶 Playlist: ${playlist.title}`);
  lines.push(`_${playlist.description}_`);
  lines.push('');
  lines.push(`Total Tracks: ${playlist.totalTracks}`);
  lines.push('');
  lines.push('| # | Track | Artist | Reason |');
  lines.push('| :--- | :--- | :--- | :--- |');
  playlist.tracks.forEach((t, i) => {
    lines.push(`| ${i + 1} | ${t.name} | ${t.artist} | ${t.sourceReason ?? '-'} |`);
  });
  lines.push('');
  lines.push('💡 Tip: pass `--format m3u > playlist.m3u` or `--format csv` to export.');

  process.stdout.write(lines.join('\n') + '\n');
}
