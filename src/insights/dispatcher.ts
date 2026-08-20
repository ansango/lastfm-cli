/**
 * dispatcher.ts — entry point for `lastfm insights <subcommand> ...`.
 *
 * Maps a subcommand name to the matching `commands/<name>.ts` module and
 * forwards `argv` to its exported `run()`. All commands throw on error;
 * the top-level dispatcher in src/index.ts catches and prints.
 */
import { run as binges } from './commands/binges.js';
import { run as compare } from './commands/compare.js';
import { run as discoveries } from './commands/discoveries.js';
import { run as hours } from './commands/hours.js';
import { run as mood } from './commands/mood.js';
import { run as nowPlaying } from './commands/now-playing.js';
import { run as personality } from './commands/personality.js';
import { run as summary } from './commands/summary.js';
import { run as trends } from './commands/trends.js';

export const INSIGHTS_SUBCOMMANDS = [
  'summary',
  'now-playing',
  'hours',
  'discoveries',
  'trends',
  'mood',
  'personality',
  'compare',
  'binges',
] as const;

export type InsightsSubcommand = (typeof INSIGHTS_SUBCOMMANDS)[number];

const RUNNERS: Record<InsightsSubcommand, (argv: string[]) => Promise<void>> = {
  summary: (a) => summary(a),
  binges: (a) => binges(a),
  compare: (a) => compare(a),
  discoveries: (a) => discoveries(a),
  hours: (a) => hours(a),
  mood: (a) => mood(a),
  'now-playing': (a) => nowPlaying(a),
  personality: (a) => personality(a),
  trends: (a) => trends(a),
};

export async function handleInsights(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;
  if (!sub || sub === '-h' || sub === '--help') {
    process.stdout.write(insightsHelp() + '\n');
    return;
  }
  const runner = RUNNERS[sub as InsightsSubcommand];
  if (!runner) {
    throw new Error(
      `Unknown insights subcommand "${sub}". Valid: ${INSIGHTS_SUBCOMMANDS.join(', ')}`,
    );
  }
  await runner(rest);
}

export function insightsHelp(): string {
  return [
    'lastfm insights — derived views over your Last.fm history.',
    '',
    'Usage:',
    '  lastfm insights <subcommand> [flags]',
    '',
    'Subcommands:',
    '  summary       wrapped-style top artists/tracks/albums/tags',
    '  now-playing   last scrobble, enriched with track info',
    '  hours         histogram of listening by hour-of-day and day-of-week',
    '  discoveries   new artists since a baseline window',
    '  trends        diff between two period rankings',
    '  mood          mood profile (taxonomy + classifier)',
    '  personality   listener archetype scoring',
    '  compare       Jaccard overlap between two users',
    '  binges        consecutive-listening runs',
    '',
    'Run `lastfm insights <subcommand> --help` for flags.',
  ].join('\n');
}
