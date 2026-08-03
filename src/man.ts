/**
 * Curated reference for every method exposed by @ansango/lastfm-api@3.x that
 * this CLI calls, plus the blocked scrobble methods (documented so users
 * understand what the CLI refuses to run).
 *
 * Param shapes mirror the package's request schemas (param names + required/
 * optional). Descriptions are hand-written and intentionally terse.
 */

export interface Param {
  /** CLI argument name, e.g. `user`, `artist`, `period`. */
  name: string;
  /** Human-readable type. */
  type: string;
  required: boolean;
  description: string;
}

export interface MethodSpec {
  /** Method name as exposed on the client service. */
  name: string;
  /** One-line description shown in namespace listings. */
  brief: string;
  /** Optional long-form description shown in the full method reference. */
  description?: string;
  /** Parameters accepted by the method, in the order used by the Last.fm API. */
  params: Param[];
  /** Example CLI invocation. */
  example?: string;
  /** When true, the method exists on the client but is blocked by this CLI. */
  blocked?: boolean;
  /** Reason shown next to blocked methods. */
  blockReason?: string;
}

export interface NamespaceSpec {
  name: string;
  /** One-line description shown in the top-level `man` output. */
  brief: string;
  methods: Record<string, MethodSpec>;
}

const RESTRICTED = 'This CLI is read-only; scrobbling requires an authenticated browser flow.';

export const NAMESPACES_SPEC: Record<string, NamespaceSpec> = {
  user: {
    name: 'user',
    brief: 'Per-user data: profile, friends, top charts, recent tracks, weekly charts.',
    methods: {
      getInfo: {
        name: 'getInfo',
        brief: 'Get a Last.fm user profile.',
        params: [{ name: 'user', type: 'string', required: true, description: 'Last.fm username.' }],
        example: 'lastfm user getInfo user=ansango',
      },
      getFriends: {
        name: 'getFriends',
        brief: "List a user's friends.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
          { name: 'recenttracks', type: '0|1', required: false, description: 'Include each friend’s last-played track.' },
        ],
        example: 'lastfm user getFriends user=ansango limit=50',
      },
      getRecentTracks: {
        name: 'getRecentTracks',
        brief: 'List the tracks a user has scrobbled recently.',
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
          { name: 'from', type: 'unix-ts', required: false, description: 'Start of the time window (UNIX seconds).' },
          { name: 'to', type: 'unix-ts', required: false, description: 'End of the time window (UNIX seconds).' },
          { name: 'extended', type: '0|1', required: false, description: 'Include extended data (e.g. user-loved flag).' },
        ],
        example: 'lastfm user getRecentTracks user=ansango limit=20',
      },
      getLovedTracks: {
        name: 'getLovedTracks',
        brief: 'List the tracks a user has marked as loved.',
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm user getLovedTracks user=ansango limit=20',
      },
      getTopArtists: {
        name: 'getTopArtists',
        brief: "List a user's most-played artists in a period.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'period', type: 'enum', required: false, description: 'overall | 7day | 1month | 3month | 6month | 12month.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm user getTopArtists user=ansango period=7day limit=20',
      },
      getTopAlbums: {
        name: 'getTopAlbums',
        brief: "List a user's most-played albums in a period.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'period', type: 'enum', required: false, description: 'overall | 7day | 1month | 3month | 6month | 12month.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm user getTopAlbums user=ansango period=1month',
      },
      getTopTracks: {
        name: 'getTopTracks',
        brief: "List a user's most-played tracks in a period.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'period', type: 'enum', required: false, description: 'overall | 7day | 1month | 3month | 6month | 12month.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm user getTopTracks user=ansango period=7day',
      },
      getTopTags: {
        name: 'getTopTags',
        brief: 'List the tags a user has applied most.',
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm user getTopTags user=ansango',
      },
      getWeeklyChartList: {
        name: 'getWeeklyChartList',
        brief: 'List the weeks for which a user has chart data.',
        params: [{ name: 'user', type: 'string', required: true, description: 'Last.fm username.' }],
        example: 'lastfm user getWeeklyChartList user=ansango',
      },
      getWeeklyArtistChart: {
        name: 'getWeeklyArtistChart',
        brief: "A user's weekly artist chart for a date range.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'from', type: 'unix-ts', required: true, description: 'Start date (UNIX seconds).' },
          { name: 'to', type: 'unix-ts', required: true, description: 'End date (UNIX seconds).' },
        ],
        example: 'lastfm user getWeeklyArtistChart user=ansango from=1704067200 to=1706745600',
      },
      getWeeklyAlbumChart: {
        name: 'getWeeklyAlbumChart',
        brief: "A user's weekly album chart for a date range.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'from', type: 'unix-ts', required: true, description: 'Start date (UNIX seconds).' },
          { name: 'to', type: 'unix-ts', required: true, description: 'End date (UNIX seconds).' },
        ],
        example: 'lastfm user getWeeklyAlbumChart user=ansango from=1704067200 to=1706745600',
      },
      getWeeklyTrackChart: {
        name: 'getWeeklyTrackChart',
        brief: "A user's weekly track chart for a date range.",
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'from', type: 'unix-ts', required: true, description: 'Start date (UNIX seconds).' },
          { name: 'to', type: 'unix-ts', required: true, description: 'End date (UNIX seconds).' },
        ],
        example: 'lastfm user getWeeklyTrackChart user=ansango from=1704067200 to=1706745600',
      },
    },
  },

  album: {
    name: 'album',
    brief: 'Album lookups, search, and tags.',
    methods: {
      getInfo: {
        name: 'getInfo',
        brief: 'Get metadata for an album.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'album', type: 'string', required: true, description: 'Album name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID. Takes precedence over artist/album.' },
          { name: 'username', type: 'string', required: false, description: 'Username for user-specific data (e.g. playcount).' },
          { name: 'lang', type: 'string', required: false, description: 'Language for the biography (ISO 639-1).' },
        ],
        example: 'lastfm album getInfo artist=Radiohead album="OK Computer"',
      },
      getTags: {
        name: 'getTags',
        brief: "Get a user's tags for an album.",
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'album', type: 'string', required: true, description: 'Album name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
        ],
        example: 'lastfm album getTags user=ansango artist=Radiohead album="OK Computer"',
      },
      getTopTags: {
        name: 'getTopTags',
        brief: 'Get the top tags applied to an album by all users.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'album', type: 'string', required: true, description: 'Album name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
        ],
        example: 'lastfm album getTopTags artist=Radiohead album="OK Computer"',
      },
      search: {
        name: 'search',
        brief: 'Search for an album by name.',
        params: [
          { name: 'album', type: 'string', required: true, description: 'Album search query.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 30, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm album search album="OK Computer" limit=5',
      },
    },
  },

  artist: {
    name: 'artist',
    brief: 'Artist info, similar artists, top tracks/albums, tags, and search.',
    methods: {
      getInfo: {
        name: 'getInfo',
        brief: 'Get metadata for an artist.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID. Takes precedence over artist.' },
          { name: 'lang', type: 'string', required: false, description: 'Language for the biography (ISO 639-1).' },
          { name: 'user', type: 'string', required: false, description: 'Username for user-specific data.' },
        ],
        example: 'lastfm artist getInfo artist=Radiohead',
      },
      getSimilar: {
        name: 'getSimilar',
        brief: 'Get artists similar to this one.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
        ],
        example: 'lastfm artist getSimilar artist=Radiohead limit=10',
      },
      getTags: {
        name: 'getTags',
        brief: "Get a user's tags for an artist.",
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size.' },
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
        ],
        example: 'lastfm artist getTags user=ansango artist=Radiohead',
      },
      getTopAlbums: {
        name: 'getTopAlbums',
        brief: 'Get the top albums for an artist.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm artist getTopAlbums artist=Radiohead limit=10',
      },
      getTopTracks: {
        name: 'getTopTracks',
        brief: 'Get the top tracks for an artist.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm artist getTopTracks artist=Radiohead limit=10',
      },
      getTopTags: {
        name: 'getTopTags',
        brief: 'Get the top tags for an artist.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
        ],
        example: 'lastfm artist getTopTags artist=Radiohead',
      },
      search: {
        name: 'search',
        brief: 'Search for an artist by name.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist search query.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 30, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm artist search artist=Radiohead limit=5',
      },
    },
  },

  track: {
    name: 'track',
    brief: 'Track lookups, similar tracks, tags, and search. Scrobbling is blocked.',
    methods: {
      getInfo: {
        name: 'getInfo',
        brief: 'Get metadata for a track.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'track', type: 'string', required: true, description: 'Track name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID. Takes precedence over artist/track.' },
          { name: 'username', type: 'string', required: false, description: 'Username for user-specific data (e.g. playcount, loved).' },
        ],
        example: 'lastfm track getInfo artist=Radiohead track="OK Computer"',
      },
      getSimilar: {
        name: 'getSimilar',
        brief: 'Get tracks similar to this one.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'track', type: 'string', required: true, description: 'Track name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
        ],
        example: 'lastfm track getSimilar artist=Radiohead track="Karma Police" limit=10',
      },
      getTags: {
        name: 'getTags',
        brief: "Get a user's tags for a track.",
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'track', type: 'string', required: true, description: 'Track name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
          { name: 'user', type: 'string', required: false, description: 'Last.fm username. Defaults to the API-key caller.' },
        ],
        example: 'lastfm track getTags user=ansango artist=Radiohead track="Karma Police"',
      },
      getTopTags: {
        name: 'getTopTags',
        brief: 'Get the top tags applied to a track by all users.',
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'track', type: 'string', required: true, description: 'Track name.' },
          { name: 'mbid', type: 'string', required: false, description: 'MusicBrainz ID.' },
        ],
        example: 'lastfm track getTopTags artist=Radiohead track="Karma Police"',
      },
      search: {
        name: 'search',
        brief: 'Search for a track by name.',
        params: [
          { name: 'track', type: 'string', required: true, description: 'Track search query.' },
          { name: 'artist', type: 'string', required: false, description: 'Optional artist name to narrow the search.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 30, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm track search track="Karma Police" artist=Radiohead limit=5',
      },
      scrobble: {
        name: 'scrobble',
        brief: 'Scrobble a single track. (Blocked — requires an authenticated session.)',
        blocked: true,
        blockReason: RESTRICTED,
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'track', type: 'string', required: true, description: 'Track name.' },
          { name: 'timestamp', type: 'unix-ts', required: true, description: 'When the track was played (UNIX seconds).' },
          { name: 'album', type: 'string', required: false, description: 'Album name (optional).' },
          { name: 'sk', type: 'string', required: true, description: 'Authenticated session key (sk).' },
        ],
      },
      scrobbleMany: {
        name: 'scrobbleMany',
        brief: 'Scrobble a batch of tracks. (Blocked — requires an authenticated session.)',
        blocked: true,
        blockReason: RESTRICTED,
        params: [
          { name: 'tracks', type: 'object[]', required: true, description: 'Array of {artist, track, timestamp, album?} entries.' },
          { name: 'sk', type: 'string', required: true, description: 'Authenticated session key (sk).' },
        ],
      },
      postTrackScrobble: {
        name: 'postTrackScrobble',
        brief: 'Deprecated alias for `scrobble`. (Blocked.)',
        blocked: true,
        blockReason: RESTRICTED,
        params: [
          { name: 'artist', type: 'string', required: true, description: 'Artist name.' },
          { name: 'track', type: 'string', required: true, description: 'Track name.' },
          { name: 'timestamp', type: 'unix-ts', required: true, description: 'UNIX timestamp of the play.' },
        ],
      },
      postBatchTrackScrobble: {
        name: 'postBatchTrackScrobble',
        brief: 'Deprecated alias for `scrobbleMany`. (Blocked.)',
        blocked: true,
        blockReason: RESTRICTED,
        params: [{ name: 'tracks', type: 'object[]', required: true, description: 'Batch of scrobble entries.' }],
      },
    },
  },

  tag: {
    name: 'tag',
    brief: 'Tag info and the top charts for a tag.',
    methods: {
      getInfo: {
        name: 'getInfo',
        brief: 'Get metadata for a tag.',
        params: [
          { name: 'tag', type: 'string', required: true, description: 'Tag name.' },
          { name: 'lang', type: 'string', required: false, description: 'Language for the description (ISO 639-1).' },
        ],
        example: 'lastfm tag getInfo tag=rock',
      },
      getSimilar: {
        name: 'getSimilar',
        brief: 'Get tags similar to this one.',
        params: [{ name: 'tag', type: 'string', required: true, description: 'Tag name.' }],
        example: 'lastfm tag getSimilar tag=rock',
      },
      getTopArtists: {
        name: 'getTopArtists',
        brief: 'Get the top artists for a tag.',
        params: [
          { name: 'tag', type: 'string', required: true, description: 'Tag name.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm tag getTopArtists tag=rock limit=10',
      },
      getTopAlbums: {
        name: 'getTopAlbums',
        brief: 'Get the top albums for a tag.',
        params: [
          { name: 'tag', type: 'string', required: true, description: 'Tag name.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm tag getTopAlbums tag=rock',
      },
      getTopTracks: {
        name: 'getTopTracks',
        brief: 'Get the top tracks for a tag.',
        params: [
          { name: 'tag', type: 'string', required: true, description: 'Tag name.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm tag getTopTracks tag=rock',
      },
      getTopTags: {
        name: 'getTopTags',
        brief: 'Get the global top tags (no input required).',
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm tag getTopTags limit=20',
      },
      getWeeklyChartList: {
        name: 'getWeeklyChartList',
        brief: 'List the weeks for which a tag has chart data.',
        params: [{ name: 'tag', type: 'string', required: true, description: 'Tag name.' }],
        example: 'lastfm tag getWeeklyChartList tag=rock',
      },
    },
  },

  chart: {
    name: 'chart',
    brief: 'Global top charts (artists, tracks, tags). No inputs required.',
    methods: {
      getTopArtists: {
        name: 'getTopArtists',
        brief: 'Get the global top artists chart.',
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm chart getTopArtists limit=50',
      },
      getTopTracks: {
        name: 'getTopTracks',
        brief: 'Get the global top tracks chart.',
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm chart getTopTracks limit=50',
      },
      getTopTags: {
        name: 'getTopTags',
        brief: 'Get the global top tags chart.',
        params: [
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm chart getTopTags',
      },
    },
  },

  geo: {
    name: 'geo',
    brief: 'Top artists and tracks for a country.',
    methods: {
      getTopArtists: {
        name: 'getTopArtists',
        brief: 'Get the top artists for a country.',
        params: [
          { name: 'country', type: 'string', required: true, description: 'Country name (as Last.fm expects it).' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm geo getTopArtists country=spain limit=20',
      },
      getTopTracks: {
        name: 'getTopTracks',
        brief: 'Get the top tracks for a country.',
        params: [
          { name: 'country', type: 'string', required: true, description: 'Country name.' },
          { name: 'location', type: 'string', required: false, description: 'Optional city/metro name to narrow.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm geo getTopTracks country=spain limit=20',
      },
    },
  },

  library: {
    name: 'library',
    brief: "Authenticated access to a user's library (currently artists only).",
    methods: {
      getArtists: {
        name: 'getArtists',
        brief: 'Get the artists a user has added to their library.',
        params: [
          { name: 'user', type: 'string', required: true, description: 'Last.fm username.' },
          { name: 'limit', type: 'number', required: false, description: 'Page size (default 50, max 200).' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default 1).' },
        ],
        example: 'lastfm library getArtists user=ansango limit=50',
      },
    },
  },
};

/** Look up a method spec by `namespace.method`. Returns `null` if not found. */
export function getMethodSpec(target: string): { ns: string; method: MethodSpec } | null {
  const [ns, method] = target.split('.');
  if (!ns || !method) return null;
  const nsSpec = NAMESPACES_SPEC[ns];
  const methodSpec = nsSpec?.methods[method];
  if (!nsSpec || !methodSpec) return null;
  return { ns, method: methodSpec };
}

/** Format a method's parameter list for text output. */
export function formatParamsText(spec: MethodSpec): string {
  if (spec.params.length === 0) return '  (no parameters)';
  const widest = Math.max(...spec.params.map((p) => p.name.length));
  return spec.params
    .map((p) => {
      const req = p.required ? 'required' : 'optional';
      const line = `  ${p.name.padEnd(widest)}  ${p.type.padEnd(8)}  ${req.padEnd(8)}  ${p.description}`;
      return line;
    })
    .join('\n');
}

/** Format the top-level `man` output listing all namespaces. */
export function formatNamespacesText(): string {
  const lines: string[] = [
    '@ansango/lastfm-cli - manual',
    '',
    'Usage:',
    '  lastfm man                  Show this list.',
    '  lastfm man <namespace>      List methods in a namespace.',
    '  lastfm man <ns>.<method>    Full reference for one method.',
    '  lastfm man --markdown ...   Emit output as markdown (default is plain text).',
    '  lastfm man --all            Dump every method on one document (text or markdown).',
    '',
    'Namespaces:',
  ];
  for (const ns of Object.keys(NAMESPACES_SPEC)) {
    const spec = NAMESPACES_SPEC[ns];
    lines.push(`  ${ns.padEnd(10)} ${spec.brief}`);
  }
  lines.push('', 'Tip: `lastfm man <namespace>` lists methods; `lastfm man <ns.method>` shows parameters.');
  return lines.join('\n');
}

/** Format a namespace-level reference (list of methods with one-line briefs). */
export function formatNamespaceText(ns: string): string {
  const spec = NAMESPACES_SPEC[ns];
  if (!spec) {
    return `Unknown namespace "${ns}". Valid: ${Object.keys(NAMESPACES_SPEC).join(', ')}.`;
  }
  const lines: string[] = [
    `Namespace "${ns}" — ${spec.brief}`,
    '',
    'Methods:',
  ];
  for (const m of Object.values(spec.methods)) {
    const tag = m.blocked ? ' [BLOCKED]' : '';
    lines.push(`  ${(ns + ' ' + m.name).padEnd(24)} ${m.brief}${tag}`);
  }
  lines.push('', `For full reference: lastfm man ${ns}.<method>`);
  return lines.join('\n');
}

/** Format a full method reference (plain text). */
export function formatMethodText(ns: string, spec: MethodSpec): string {
  const lines: string[] = [
    `${ns}.${spec.name}`,
    '',
    spec.brief,
  ];
  if (spec.blocked) {
    lines.push('', `BLOCKED: ${spec.blockReason ?? 'not allowed by this CLI.'}`);
  }
  lines.push('', 'Parameters:');
  lines.push(formatParamsText(spec));
  if (spec.example) {
    lines.push('', 'Example:');
    lines.push(`  ${spec.example}`);
  }
  lines.push('', `See: https://www.last.fm/api/show/${ns}.${spec.name}`);
  return lines.join('\n');
}

/** Emit a single method as markdown. */
export function formatMethodMarkdown(ns: string, spec: MethodSpec): string {
  const lines: string[] = [`## \`${ns}.${spec.name}\``, '', spec.brief];
  if (spec.blocked) {
    lines.push('', `> **Blocked.** ${spec.blockReason ?? ''}`);
  }
  if (spec.params.length > 0) {
    lines.push('', '### Parameters', '', '| Name | Type | Required | Description |', '|------|------|----------|-------------|');
    for (const p of spec.params) {
      lines.push(`| \`${p.name}\` | \`${p.type}\` | ${p.required ? 'yes' : 'no'} | ${escapeMd(p.description)} |`);
    }
  } else {
    lines.push('', '### Parameters', '', '_None._');
  }
  if (spec.example) {
    lines.push('', '### Example', '', '```bash', spec.example, '```');
  }
  lines.push('', `[Last.fm docs](https://www.last.fm/api/show/${ns}.${spec.name})`);
  return lines.join('\n');
}

/** Emit a namespace listing as markdown. */
export function formatNamespaceMarkdown(ns: string): string {
  const spec = NAMESPACES_SPEC[ns];
  if (!spec) return `Unknown namespace "${ns}".`;
  const lines: string[] = [`# Namespace \`${ns}\``, '', spec.brief, '', '## Methods', ''];
  for (const m of Object.values(spec.methods)) {
    const flag = m.blocked ? ' *(blocked)*' : '';
    lines.push(`- [\`${m.name}\`](#${ns}${m.name})${flag} — ${m.brief}`);
  }
  return lines.join('\n');
}

/** Emit the top-level man index as markdown. */
export function formatNamespacesMarkdown(): string {
  const lines: string[] = [
    '# @ansango/lastfm-cli — manual',
    '',
    'Auto-generated from the curated registry. Use `lastfm man` after install.',
    '',
    '## Namespaces',
    '',
  ];
  for (const ns of Object.keys(NAMESPACES_SPEC)) {
    const spec = NAMESPACES_SPEC[ns];
    lines.push(`- [\`${ns}\`](#namespace-${ns}) — ${spec.brief}`);
  }
  return lines.join('\n');
}

/** Build a single document containing every method (text or markdown). */
export function formatAll(asMarkdown: boolean): string {
  const parts: string[] = [];
  if (asMarkdown) {
    parts.push(formatNamespacesMarkdown());
    parts.push('\n---\n');
    for (const [ns, spec] of Object.entries(NAMESPACES_SPEC)) {
      parts.push(formatNamespaceMarkdown(ns));
      parts.push('\n---\n');
      for (const m of Object.values(spec.methods)) {
        parts.push(formatMethodMarkdown(ns, m));
        parts.push('\n---\n');
      }
    }
  } else {
    parts.push(formatNamespacesText());
    parts.push('\n----\n');
    for (const ns of Object.keys(NAMESPACES_SPEC)) {
      parts.push(formatNamespaceText(ns));
      parts.push('\n----\n');
      for (const m of Object.values(NAMESPACES_SPEC[ns].methods)) {
        parts.push(formatMethodText(ns, m));
        parts.push('\n----\n');
      }
    }
  }
  return parts.join('\n');
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
