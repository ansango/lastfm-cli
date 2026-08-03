/** Last.fm API namespaces exposed by @ansango/lastfm-api@3.x. */
export const NAMESPACES = [
  'user',
  'album',
  'artist',
  'track',
  'tag',
  'chart',
  'geo',
  'library',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

/**
 * Methods that exist on the package but require an authenticated session.
 * This CLI is read-only — these are blocked at dispatch time with a clear error.
 *
 * @ansango/lastfm-api@3.1.2 renamed `postTrackScrobble` → `scrobble` and
 * `postBatchTrackScrobble` → `scrobbleMany`. We block both the canonical
 * names and the deprecated aliases so older and newer clients are covered.
 */
export const BLOCKED_METHODS: ReadonlySet<string> = new Set([
  // Canonical names (@ansango/lastfm-api >= 3.1.2)
  'scrobble',
  'scrobbleMany',
  // Deprecated aliases (@ansango/lastfm-api <= 3.1.1, kept as aliases in 3.1.x)
  'postTrackScrobble',
  'postBatchTrackScrobble',
]);

/** Process exit codes. */
export const EXIT = {
  OK: 0,
  GENERIC: 1,
  NO_CREDS: 2,
  API_ERROR: 3,
} as const;
