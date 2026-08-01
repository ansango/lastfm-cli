/** Last.fm API namespaces exposed by lastfm-client-ts@3.x. */
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
 */
export const BLOCKED_METHODS: ReadonlySet<string> = new Set([
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