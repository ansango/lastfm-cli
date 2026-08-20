/**
 * discoveries.ts — artists you discovered within a recent window.
 *
 * Algorithm:
 * 1. Take the window's recent tracks → dedupe by artist name → keep the
 *    earliest `date.uts` per artist (the "first scrobble of this artist
 *    inside the window").
 * 2. Compute baseline = set of artists that appear OUTSIDE the window
 *    (typically the user's overall top artists, or the previous period's
 *    top artists). We leave how to build the baseline to the caller.
 * 3. Anything in the window set that's not in the baseline = "new for you".
 *
 * Pure: takes already-fetched data, returns a sorted list.
 */

export interface ArtistTimestamp {
  readonly name: string;
  /** UNIX seconds; the earliest occurrence of this artist in the window. */
  readonly firstSeen: number;
}

export interface FindOptions {
  readonly maxResults?: number;
}

export function findNewArtists(
  window: readonly ArtistTimestamp[],
  baseline: ReadonlySet<string>,
  options: FindOptions = {},
): ArtistTimestamp[] {
  // Dedupe by name; keep earliest firstSeen.
  const earliest = new Map<string, number>();
  for (const a of window) {
    const prev = earliest.get(a.name);
    if (prev === undefined || a.firstSeen < prev) earliest.set(a.name, a.firstSeen);
  }
  const newbies: ArtistTimestamp[] = [];
  for (const [name, firstSeen] of earliest) {
    if (!baseline.has(name)) newbies.push({ name, firstSeen });
  }
  newbies.sort((a, b) => a.firstSeen - b.firstSeen);
  const max = options.maxResults ?? newbies.length;
  return newbies.slice(0, max);
}

/**
 * Convenience: build an ArtistTimestamp[] from a recenttracks payload shape.
 * Pure — does not touch the network.
 */
export function extractArtistTimestamps(payload: unknown): ArtistTimestamp[] {
  const tracks = (payload as { recenttracks?: { track?: unknown[] } })?.recenttracks?.track ?? [];
  const out: ArtistTimestamp[] = [];
  for (const t of tracks) {
    const obj = t as {
      artist?: string | { '#text'?: string };
      date?: { uts?: string | number };
    };
    const artistField = obj.artist;
    const name =
      typeof artistField === 'string'
        ? artistField
        : artistField && typeof artistField === 'object'
          ? artistField['#text']
          : undefined;
    const uts = obj.date?.uts;
    if (typeof name === 'string' && name.length > 0 && (typeof uts === 'string' || typeof uts === 'number')) {
      out.push({ name, firstSeen: Number(uts) });
    }
  }
  return out;
}
