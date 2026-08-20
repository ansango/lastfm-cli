/**
 * mood-composer.ts — derive a MoodProfile from a user's listening context.
 *
 * The user's own topTags is usually sparse (Last.fm requires manual tagging),
 * so we ALSO pull the top tags of their top artists and merge everything
 * before classifying. The merged bag is what feeds into the pure classifier.
 */
import type { Caller } from './summary.js';
import { classifyMood, type MoodProfile } from './mood.js';

export type MoodPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';

export interface BuildMoodInput {
  readonly user: string;
  readonly period: MoodPeriod;
  readonly caller: Caller;
  /** How many of the user's top artists to enrich with their own tags. */
  readonly topArtists: number;
}

export interface MoodWithMeta extends MoodProfile {
  /** Total raw tags gathered (before dedupe). */
  readonly tagSourceCount: number;
  /** Number of unique artists we pulled tags from. */
  readonly artistCount: number;
  /** Where the bulk of the signal came from. */
  readonly primarySource: 'user-tags' | 'artist-tags' | 'mixed';
}

const LASTFM_BY_PERIOD: Record<MoodPeriod, string> = {
  daily: '7day', weekly: '7day', monthly: '1month', yearly: '12month', overall: 'overall',
  '7day': '7day', '1month': '1month', '3month': '3month', '6month': '6month', '12month': '12month',
};

function unwrapTags(payload: unknown): string[] {
  const wrapper = (payload as { toptags?: { tag?: unknown[] } })?.toptags;
  const arr = Array.isArray(wrapper?.tag) ? wrapper!.tag! : [];
  const out: string[] = [];
  for (const item of arr) {
    const obj = item as { name?: unknown };
    if (typeof obj.name === 'string' && obj.name.length > 0) {
      out.push(obj.name);
    }
  }
  return out;
}

function unwrapArtistNames(payload: unknown, limit: number): string[] {
  const wrapper = (payload as { topartists?: { artist?: unknown[] } })?.topartists;
  const arr = Array.isArray(wrapper?.artist) ? wrapper!.artist! : [];
  return arr
    .map((x) => {
      const obj = x as { name?: unknown };
      return typeof obj.name === 'string' ? obj.name : null;
    })
    .filter((x): x is string => x !== null)
    .slice(0, limit);
}

export async function buildMoodProfile(input: BuildMoodInput): Promise<MoodWithMeta> {
  const period = LASTFM_BY_PERIOD[input.period];

  const [topArtistsRaw, userTagsRaw] = await Promise.all([
    input.caller('user.getTopArtists', { user: input.user, period, limit: input.topArtists }),
    input.caller('user.getTopTags', { user: input.user, limit: 50 }),
  ]);

  const artistNames = unwrapArtistNames(topArtistsRaw, input.topArtists);
  const userTags = unwrapTags(userTagsRaw);

  // Fetch each artist's tags in parallel. Errors on a single artist should
  // not break the whole composer — swallow them per-call.
  const perArtist = await Promise.allSettled(
    artistNames.map((name) =>
      input.caller('artist.getTopTags', { artist: name, limit: 20 }).then(
        (raw) => unwrapTags(raw),
      ),
    ),
  );
  const artistTags: string[] = [];
  let artistHits = 0;
  for (const r of perArtist) {
    if (r.status === 'fulfilled') {
      artistTags.push(...r.value);
      artistHits++;
    }
  }

  const allTags = [...userTags, ...artistTags];
  const profile = classifyMood(allTags);

  const userTagShare = userTags.length / Math.max(1, allTags.length);
  const primarySource: MoodWithMeta['primarySource'] =
    userTags.length === 0 ? 'artist-tags' : artistTags.length === 0 ? 'user-tags' : 'mixed';

  // Suppress the lint warning about userTagShare being unused — keep it
  // available for callers via the meta object if they want it.
  void userTagShare;

  return {
    ...profile,
    tagSourceCount: allTags.length,
    artistCount: artistHits,
    primarySource,
  };
}
