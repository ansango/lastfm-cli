/**
 * dispatcher.ts — entry point for `lastfm insights <subcommand> ...`.
 *
 * Maps a subcommand name to the matching `commands/<name>.ts` module and
 * forwards `argv` to its exported `run()`. All commands throw on error;
 * the top-level dispatcher in src/index.ts catches and prints.
 */
import { run as albumHabits } from './commands/album-habits.js';
import { run as binges } from './commands/binges.js';
import { run as bridge } from './commands/bridge.js';
import { run as compare } from './commands/compare.js';
import { run as discoveries } from './commands/discoveries.js';
import { run as forgotten } from './commands/forgotten.js';
import { run as genreEvolution } from './commands/genre-evolution.js';
import { run as genres } from './commands/genres.js';
import { run as groupCompare } from './commands/group-compare.js';
import { run as heatmap } from './commands/heatmap.js';
import { run as hours } from './commands/hours.js';
import { run as mood } from './commands/mood.js';
import { run as nowPlaying } from './commands/now-playing.js';
import { run as obsessions } from './commands/obsessions.js';
import { run as obscurity } from './commands/obscurity.js';
import { run as personality } from './commands/personality.js';
import { run as recommendations } from './commands/recommendations.js';
import { run as streaks } from './commands/streaks.js';
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
  'obscurity',
  'streaks',
  'heatmap',
  'album-habits',
  'genres',
  'genre-evolution',
  'recommendations',
  'bridge',
  'obsessions',
  'forgotten',
  'group-compare',
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
  obscurity: (a) => obscurity(a),
  streaks: (a) => streaks(a),
  heatmap: (a) => heatmap(a),
  'album-habits': (a) => albumHabits(a),
  genres: (a) => genres(a),
  'genre-evolution': (a) => genreEvolution(a),
  recommendations: (a) => recommendations(a),
  bridge: (a) => bridge(a),
  obsessions: (a) => obsessions(a),
  forgotten: (a) => forgotten(a),
  'group-compare': (a) => groupCompare(a),
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
    'lastfm insights — derived analytical and behavioral views over your Last.fm history.',
    '',
    'Usage:',
    '  lastfm insights <subcommand> [flags]',
    '',
    'Subcommands:',
    '  summary          wrapped-style top artists/tracks/albums/tags & Shannon diversity',
    '  now-playing      current or last scrobble enriched with artist bio & similar artists',
    '  hours            diurnal and weekly listening histogram with peak hour detection',
    '  discoveries      newly discovered artists within a recent sliding time window',
    '  trends           differential ranking movement (risers, fallers, newcomers, departures)',
    '  mood             2D psychometric mood profile (energy vs valence quadrants & tags)',
    '  personality      listener archetype scoring across 6 behavioral profiles',
    '  compare          pairwise Jaccard taste overlap and affinity between two users',
    '  binges           consecutive same-artist or same-track listening streak detection',
    '  obscurity        obscurity and hipster score evaluated against global popularity',
    '  streaks          daily listening streaks, active day percentages, and dry spells',
    '  heatmap          daily listening intensity mapped into contribution grid levels',
    '  album-habits     sequential album cohesion and listener purist vs shuffler profiling',
    '  genres           normalized genre breakdown with HHI market concentration index',
    '  genre-evolution  macro shifts and growth rates across musical genres between periods',
    '  recommendations  smart unlistened artist discovery seeded from user top artists',
    '  bridge           artists connecting two distinct musical genres or tag spaces',
    '  obsessions       fixation episodes where a single artist heavily dominates a window',
    '  forgotten        all-time favorite artists with recent activity drop (revival picks)',
    '  group-compare    multi-user taste blend, consensus artists, and outlier clustering',
    '',
    'Run `lastfm insights <subcommand> --help` for flags.',
  ].join('\n');
}
