/**
 * insights now-playing — last scrobble, enriched with artist bio + similar.
 *
 * Usage:
 *   lastfm insights now-playing --user NAME [--similar-limit N] [--bio-max-chars N] [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { buildNowPlaying } from '../lib/now-playing.js';
import { renderNowPlayingMarkdown } from '../lib/render.js';
import { flag, parseFlags } from '../lib/args.js';

const USAGE =
  'lastfm insights now-playing --user NAME [--similar-limit N] [--bio-max-chars N] [--format json|markdown]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
    'similar-limit': flag.number({ default: 3 }),
    'bio-max-chars': flag.number({ default: 320 }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);

  const np = await buildNowPlaying({
    user,
    caller,
    similarLimit: values['similar-limit'] as number,
    bioMaxChars: values['bio-max-chars'] as number,
  });

  if ((values['format'] as 'json' | 'markdown') === 'json') {
    process.stdout.write(JSON.stringify(np, null, 2) + '\n');
  } else {
    process.stdout.write(renderNowPlayingMarkdown(np));
  }
}
