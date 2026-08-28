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
  'auth',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

/**
 * Methods that require an authenticated session (`sk`) and are **not**
 * auto-resolved from the `LASTFM_SESSION_KEY` env var because the API
 * library considers them "transport-shaping" — passing `sk` inline vs
 * via the env var changes the signature, and Last.fm rejects the request
 * if `sk` appears in both. The CLI always sets `sk` via the env var
 * (`eval $(lastfm auth.getSession --token=<TOKEN> --export)` from #4),
 * so these methods work without a per-call `sk=...` arg.
 *
 * This set is the surface that was previously blocked by `BLOCKED_METHODS`
 * (see PR history). It is now informational: `callMethod` does not check
 * it. The purpose is for `man` to mark these methods as requiring auth
 * (so the docs hint at the eval-export flow) and for tests to assert
 * the surface stays in sync.
 */
export const AUTH_REQUIRED_METHODS: ReadonlySet<string> = new Set([
  // Canonical names (@ansango/lastfm-api >= 3.1.2)
  'scrobble',
  'scrobbleMany',
  'love',
  'unlove',
  'updateNowPlaying',
  'addTags',
  'removeTag',
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
