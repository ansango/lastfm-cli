/**
 * summary.ts — compose a "Wrapped"-style period summary from multiple
 * Last.fm API calls. Pure composition + normalization; no LLM, no narration.
 *
 * The composer is decoupled from the CLI by taking a `Caller` function.
 * Production wires `Caller = (method, params) => callLastfm(method, params)`
 * (see `bin/summary.ts`); tests inject a fixture-backed fake.
 */
import { periodToLastfm, type Period, type ResolvedPeriod } from './periods.js';
import { resolvePeriod } from './periods.js';
import { computeDiversity, topNShare } from './diversity.js';

// --- Public types ---------------------------------------------------------

export interface Caller {
  (method: string, params: Record<string, string | number>): Promise<unknown>;
}

export interface ArtistEntry {
  readonly name: string;
  readonly playcount: number;
  readonly mbid?: string;
  readonly url?: string;
}

export interface TrackEntry extends ArtistEntry {
  /** Album title (string) when present. */
  readonly album?: string;
  /** Artist name (best-effort: pulled from the track payload's `artist.#text`). */
  readonly artist?: string;
}

export interface AlbumEntry extends ArtistEntry {
  /** Artist name on the album payload (often the only "artist" field here). */
  readonly artist?: string;
}

export interface TagEntry {
  readonly name: string;
  readonly count: number;
}

export interface DiversityStats {
  readonly shannon: number;
  /** Normalized to [0, 1]; 1 = perfectly even split. */
  readonly normalized: number;
  /** Share of plays consumed by the top 1, 3, 5 artists respectively. */
  readonly top1Share: number;
  readonly top3Share: number;
  readonly top5Share: number;
  readonly uniqueArtists: number;
}

export interface Summary {
  readonly user: string;
  readonly period: Period;
  readonly label: string;
  readonly lastfmPeriod: string;
  readonly from?: number;
  readonly to: number;
  readonly topArtists: ArtistEntry[];
  readonly topTracks: TrackEntry[];
  readonly topAlbums: AlbumEntry[];
  readonly topTags: TagEntry[];
  readonly totalScrobbles: number;
  /** Optional diversity block — only populated when caller asks for `limit >= 5`. */
  readonly diversity?: DiversityStats;
}

export interface BuildSummaryInput {
  readonly period: Period;
  readonly user: string;
  readonly caller: Caller;
  readonly limit?: number;
  readonly clock?: () => number;
}

// --- Normalizers ----------------------------------------------------------

function normalizeArtist(raw: Record<string, unknown>, idx: number): ArtistEntry {
  const playcount = Number(raw['playcount'] ?? 0);
  return {
    name: String(raw['name'] ?? `#${idx}`),
    playcount,
    mbid: typeof raw['mbid'] === 'string' && raw['mbid'].length > 0 ? raw['mbid'] : undefined,
    url: typeof raw['url'] === 'string' && raw['url'].length > 0 ? raw['url'] : undefined,
  };
}

function normalizeTrack(raw: Record<string, unknown>, idx: number): TrackEntry {
  const base = normalizeArtist(raw, idx);
  const albumField = raw['album'];
  const album =
    typeof albumField === 'string'
      ? albumField
      : albumField && typeof albumField === 'object' && '#text' in (albumField as object)
        ? String((albumField as { '#text': unknown })['#text'])
        : undefined;

  // `artist` on a track can be either a string (older payloads) or an object
  // `{ "#text": "Name", mbid, url }` (current Last.fm shape).
  const artistField = raw['artist'];
  const artist =
    typeof artistField === 'string'
      ? artistField
      : artistField && typeof artistField === 'object' && '#text' in (artistField as object)
        ? String((artistField as { '#text': unknown })['#text'])
        : undefined;

  return { ...base, album, artist };
}

function normalizeAlbum(raw: Record<string, unknown>, idx: number): AlbumEntry {
  const base = normalizeArtist(raw, idx);
  // The `artist` field on album payloads is `{ name, mbid, url }`. Pull the name.
  const artistField = raw['artist'];
  const artist =
    artistField && typeof artistField === 'object' && 'name' in (artistField as object)
      ? String((artistField as { name: unknown }).name)
      : undefined;
  return { ...base, artist };
}

function normalizeTag(raw: Record<string, unknown>, idx: number): TagEntry {
  const count = Number(raw['count'] ?? 0);
  return {
    name: String(raw['name'] ?? `#${idx}`),
    count,
  };
}

function unwrapList(payload: unknown, wrapper: string, itemKey: string): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== 'object') return [];
  const w = (payload as Record<string, unknown>)[wrapper];
  if (!w || typeof w !== 'object') return [];
  const items = (w as Record<string, unknown>)[itemKey];
  return Array.isArray(items) ? (items as Array<Record<string, unknown>>) : [];
}

// --- Composer -------------------------------------------------------------

export async function buildSummary(input: BuildSummaryInput): Promise<Summary> {
  const limit = input.limit ?? 5;
  const resolved: ResolvedPeriod = resolvePeriod(input.clock ?? Date.now)(input.period);
  const lastfm = periodToLastfm(input.period);
  const baseParams = { user: input.user, period: lastfm, limit };

  // Fire the 4 top-charts calls in parallel. getInfo is also useful (total
  // playcount) but we'll prefer the sum-from-topartists figure for "scrobbles
  // in this period" — it's accurate; getInfo's playcount is lifetime.
  const [topArtistsRaw, topTracksRaw, topAlbumsRaw, topTagsRaw] = await Promise.all([
    input.caller('user.getTopArtists', baseParams),
    input.caller('user.getTopTracks', baseParams),
    input.caller('user.getTopAlbums', baseParams),
    input.caller('user.getTopTags', { user: input.user, limit }),
  ]);

  const topArtists = unwrapList(topArtistsRaw, 'topartists', 'artist').map(normalizeArtist);
  const topTracks = unwrapList(topTracksRaw, 'toptracks', 'track').map(normalizeTrack);
  const topAlbums = unwrapList(topAlbumsRaw, 'topalbums', 'album').map(normalizeAlbum);
  const topTags = unwrapList(topTagsRaw, 'toptags', 'tag').map(normalizeTag);

  const totalScrobbles = topArtists.reduce((acc, a) => acc + a.playcount, 0);

  // Diversity only meaningful when we have enough artists to compare.
  const diversity =
    topArtists.length >= 2
      ? (() => {
          const counts = Object.fromEntries(topArtists.map((a) => [a.name, a.playcount]));
          const d = computeDiversity(counts);
          return {
            shannon: d.shannon,
            normalized: d.normalized,
            top1Share: topNShare(counts, 1),
            top3Share: topNShare(counts, 3),
            top5Share: topNShare(counts, 5),
            uniqueArtists: d.uniqueCount,
          };
        })()
      : undefined;

  return {
    user: input.user,
    period: input.period,
    label: resolved.label,
    lastfmPeriod: lastfm,
    from: resolved.from,
    to: resolved.to,
    topArtists,
    topTracks,
    topAlbums,
    topTags,
    totalScrobbles,
    diversity,
  };
}
