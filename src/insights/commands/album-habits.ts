/**
 * insights album-habits — analyze sequential album listening cohesion and purist profile.
 *
 * Usage:
 *   lastfm insights album-habits --user NAME [--min-tracks 3] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsAlbumHabitsResponse } from '@ansango/lastfm-api/insights';

const USAGE = 'lastfm insights album-habits --user NAME [--min-tracks 3] [--format json|markdown]';

function renderAlbumHabitsMarkdown(res: InsightsAlbumHabitsResponse): string {
  const lines: string[] = [];
  lines.push(`# Album Listening Habits for ${res.user}`);
  lines.push('');
  lines.push(`**Profile:** ${res.profile} · **Cohesion Score:** ${res.cohesionScore.toFixed(1)}/100`);
  lines.push(`_${res.description}_`);
  lines.push('');
  lines.push(`- **Album Sessions:** ${res.albumSessionCount} (avg length: ${res.averageSessionLength.toFixed(1)} tracks)`);
  lines.push(`- **Isolated Tracks:** ${res.isolatedTracksCount}`);
  lines.push('');

  if (res.topAlbums && res.topAlbums.length > 0) {
    lines.push('## Top Albums');
    for (const a of res.topAlbums.slice(0, 10)) {
      lines.push(`- **${a.artist} — ${a.album}** (${a.sessionCount} sessions, ${a.totalTracksPlayed} total tracks)`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    'min-tracks': flag.number({ default: 3 }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getAlbumHabits({
    user,
    minSessionTracks: values['min-tracks'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderAlbumHabitsMarkdown(res));
  }
}
