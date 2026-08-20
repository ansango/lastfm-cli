/**
 * binges.ts — detect "binge sessions" (consecutive same-artist or
 * same-track plays) from a chronologically ordered list of scrobbles.
 *
 * Pure. The caller supplies `Scrobble[]` sorted by `uts` ascending;
 * the function walks the list, groups runs that share the key, and
 * emits runs whose length >= minLength. A run is also broken if the
 * gap between consecutive scrobbles exceeds maxGapSeconds (default 1 h).
 */
export interface Scrobble {
  readonly artist: string;
  readonly track: string;
  readonly uts: number;
}

export type BingesTrackKey = 'artist' | 'track';

export interface BingesOptions {
  readonly minLength?: number;
  readonly maxGapSeconds?: number;
  readonly trackKey?: BingesTrackKey;
  readonly maxResults?: number;
}

export interface Binge {
  readonly artist: string;
  readonly track?: string;       // present only when trackKey === 'track'
  readonly length: number;
  readonly startUts: number;
  readonly endUts: number;
}

function keyOf(s: Scrobble, k: BingesTrackKey): string {
  return k === 'artist' ? s.artist : `${s.artist}::${s.track}`;
}

export function findBinges(
  scrobbles: readonly Scrobble[],
  options: BingesOptions = {},
): Binge[] {
  const minLength = options.minLength ?? 2;
  const maxGap = options.maxGapSeconds ?? 3600;
  const trackKey: BingesTrackKey = options.trackKey ?? 'artist';

  const out: Binge[] = [];
  let runKey: string | null = null;
  let runArtist: string | null = null;
  let runTrack: string | null = null;
  let runStart = 0;
  let runEnd = 0;
  let runLen = 0;

  const flush = () => {
    if (runLen >= minLength && runKey !== null) {
      out.push({
        artist: runArtist!,
        ...(trackKey === 'track' ? { track: runTrack! } : {}),
        length: runLen,
        startUts: runStart,
        endUts: runEnd,
      });
    }
    runKey = null;
    runLen = 0;
  };

  for (const s of scrobbles) {
    const k = keyOf(s, trackKey);
    if (runKey === null) {
      runKey = k;
      runArtist = s.artist;
      runTrack = s.track;
      runStart = s.uts;
      runEnd = s.uts;
      runLen = 1;
      continue;
    }
    if (k !== runKey || s.uts - runEnd > maxGap) {
      flush();
      runKey = k;
      runArtist = s.artist;
      runTrack = s.track;
      runStart = s.uts;
      runEnd = s.uts;
      runLen = 1;
      continue;
    }
    runEnd = s.uts;
    runLen++;
  }
  flush();

  out.sort((a, b) => b.length - a.length || b.endUts - a.endUts);
  return options.maxResults !== undefined ? out.slice(0, options.maxResults) : out;
}

/** Convenience: turn recenttracks JSON into Scrobble[] sorted ascending. */
export function extractScrobbles(payload: unknown): Scrobble[] {
  const tracks = (payload as { recenttracks?: { track?: unknown[] } })?.recenttracks?.track ?? [];
  const out: Scrobble[] = [];
  for (const t of tracks) {
    const obj = t as {
      artist?: string | { '#text'?: string };
      name?: string;
      date?: { uts?: string | number };
    };
    const artistField = obj.artist;
    const artist =
      typeof artistField === 'string'
        ? artistField
        : artistField && typeof artistField === 'object'
          ? artistField['#text']
          : undefined;
    const track = typeof obj.name === 'string' ? obj.name : undefined;
    const uts = obj.date?.uts;
    if (
      typeof artist === 'string' && artist.length > 0 &&
      typeof track === 'string' && track.length > 0 &&
      (typeof uts === 'string' || typeof uts === 'number')
    ) {
      out.push({ artist, track, uts: Number(uts) });
    }
  }
  // Recenttracks API returns descending; sort ascending.
  out.sort((a, b) => a.uts - b.uts);
  return out;
}
