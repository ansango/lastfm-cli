/**
 * now-playing.ts — fetch the user's last scrobble and enrich it with the
 * artist's short bio and a few similar artists.
 *
 * The Last.fm API exposes:
 *   - user.getRecentTracks(limit=1)  → the latest entry; `nowplaying` flag
 *   - artist.getInfo(artist=X)       → bio + image + stats
 *   - artist.getSimilar(artist=X)    → similar artists with match scores
 *
 * Bio text from Last.fm can contain wiki markup like "[[link|text]]" or raw
 * HTML. We strip a minimal subset and truncate; for richer summarization the
 * caller should pipe the text through an LLM.
 */
import type { Caller } from './summary.js';

export interface SimpleArtist {
  readonly name: string;
  readonly url?: string;
}

export interface NowPlaying {
  readonly user: string;
  readonly nowPlaying: boolean;
  readonly track: { readonly name: string; readonly mbid?: string; readonly url?: string };
  readonly artist: SimpleArtist;
  readonly album?: string;
  readonly imageMega?: string;
  readonly bio: string;
  readonly similar: SimpleArtist[];
}

export interface BuildNowPlayingInput {
  readonly user: string;
  readonly caller: Caller;
  readonly similarLimit?: number;
  readonly bioMaxChars?: number;
}

// --- Helpers --------------------------------------------------------------

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === 'string' || typeof v === 'number' ? Number(v) : undefined;
}

function stripWiki(s: string): string {
  // Last.fm wiki markup: [[link|text]] → text, [[link]] → link, plain text kept.
  return s
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '') // strip raw HTML tags if any sneak in
    .replace(/\s+/g, ' ')
    .trim();
}

function summarizeBio(bio: string | undefined, maxChars: number): string {
  if (!bio) return '';
  const clean = stripWiki(bio);
  if (clean.length <= maxChars) return clean;
  // Truncate on a word boundary
  const cut = clean.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + '…';
}

function findImage(payload: unknown): string | undefined {
  // image arrays come back as [{size, "#text"}, ...]; pick "extralarge" or "mega".
  const all = (payload as { image?: Array<{ size?: string; '#text'?: string }> })?.image;
  if (!Array.isArray(all)) return undefined;
  const byOrder = ['mega', 'extralarge', 'large', 'medium', 'small'];
  for (const size of byOrder) {
    const hit = all.find((i) => i?.size === size && typeof i['#text'] === 'string');
    if (hit) return hit['#text'];
  }
  return undefined;
}

function unwrapSimilar(payload: unknown): SimpleArtist[] {
  const w = (payload as { similarartists?: { artist?: unknown[] } })?.similarartists;
  const arr = Array.isArray(w?.artist) ? w!.artist! : [];
  const out: SimpleArtist[] = [];
  for (const a of arr) {
    const obj = a as { name?: unknown; url?: unknown };
    const name = asString(obj.name);
    if (!name) continue;
    const url = asString(obj.url);
    if (url) out.push({ name, url });
    else out.push({ name });
  }
  return out;
}

// --- Composer -------------------------------------------------------------

export async function buildNowPlaying(input: BuildNowPlayingInput): Promise<NowPlaying> {
  const similarLimit = input.similarLimit ?? 3;
  const bioMaxChars = input.bioMaxChars ?? 320;

  const recent = (await input.caller('user.getRecentTracks', {
    user: input.user,
    limit: 1,
  })) as Record<string, unknown>;

  const recentWrapper = recent['recenttracks'] as Record<string, unknown> | undefined;
  const attr = recentWrapper?.['@attr'] as { nowplaying?: string } | undefined;
  const nowPlaying = attr?.nowplaying === 'true';

  const tracks = (recentWrapper?.['track'] as unknown[]) ?? [];
  const last = (tracks[0] ?? {}) as Record<string, unknown>;

  const artistField = last['artist'];
  const artistName =
    typeof artistField === 'string'
      ? artistField
      : artistField && typeof artistField === 'object' && '#text' in (artistField as object)
        ? asString((artistField as { '#text': unknown })['#text'])
        : undefined;
  if (!artistName) {
    throw new Error('recenttracks.track[0].artist is missing — cannot enrich');
  }
  const trackName = asString(last['name']) ?? '(unknown track)';
  const albumField = last['album'];
  const album =
    typeof albumField === 'string'
      ? albumField
      : albumField && typeof albumField === 'object' && '#text' in (albumField as object)
        ? asString((albumField as { '#text': unknown })['#text'])
        : undefined;

  // Fetch artist info + similar in parallel.
  const [info, similarRaw] = await Promise.all([
    input.caller('artist.getInfo', { artist: artistName, lang: 'en' }) as Promise<Record<string, unknown>>,
    input.caller('artist.getSimilar', { artist: artistName, limit: similarLimit }) as Promise<unknown>,
  ]);

  const artistInfo = info['artist'] as Record<string, unknown> | undefined;
  const bioSummary = asString(
    (artistInfo?.['bio'] as { summary?: string } | undefined)?.summary,
  ) ?? '';

  const similar = unwrapSimilar(similarRaw).slice(0, similarLimit);
  const imageMega = findImage(last);

  return {
    user: input.user,
    nowPlaying,
    track: {
      name: trackName,
      mbid: asString(last['mbid']),
      url: asString(last['url']),
    },
    artist: {
      name: artistName,
      url: asString(artistInfo?.['url']),
    },
    album,
    imageMega,
    bio: summarizeBio(bioSummary, bioMaxChars),
    similar,
  };
}
