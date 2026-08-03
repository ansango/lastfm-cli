# @ansango/lastfm-cli

CLI for the [Last.fm API](https://www.last.fm/api), built on [`@ansango/lastfm-api`](https://github.com/ansango/lastfm-api).

**Read-only by default.** Loads credentials from a standard `.env` file via `dotenv` (search order: `$LASTFM_CLI_ENV_FILE`, `./.env`, `~/.lastfm-cli/.env`). Emits JSON to stdout, errors to stderr.

## Installation

```bash
npm install -g @ansango/lastfm-cli
# or, from GitHub (no npm publish needed):
npm install -g github:ansango/lastfm-cli
```

## Credentials

The CLI reads `LASTFM_API_KEY` from a standard `.env` file using the
[`dotenv`](https://github.com/motdotla/dotenv) parser (so escapes,
multi-line values, `$VAR` interpolation and `export` prefix all work).

Search order (first hit wins, unless `LASTFM_CLI_ENV_FILE` is set):

1. `$LASTFM_CLI_ENV_FILE` — absolute path override.
2. `./.env` in the current working directory (the dotenv default).
3. `~/.lastfm-cli/.env` — project-scoped fallback.

```
LASTFM_API_KEY=your_api_key
LASTFM_BASE_URL=https://ws.audioscrobbler.com/2.0/   # optional
```

Variables already exported in your shell always win over the file. If none of
the above provide `LASTFM_API_KEY`, the CLI exits with code 2.

Get an API key at **https://www.last.fm/api/account/create**.

## Usage

```bash
lastfm <namespace> <method> [key=value ...]
lastfm <namespace> <method> --json '{...}'
lastfm man [namespace | namespace.method] [--markdown] [--all]
lastfm methods [namespace]
lastfm help [namespace.method]
lastfm config
```

### Namespaces

`user`, `album`, `artist`, `track`, `tag`, `chart`, `geo`, `library`.

### Built-in manual

`lastfm man` ships a curated reference for every method this CLI exposes — parameters, types, required/optional, and an example invocation.

```bash
lastfm man                          # top-level index
lastfm man artist                   # list methods in a namespace
lastfm man artist.getInfo           # full reference for one method
lastfm man --markdown artist        # same listing, emitted as markdown
lastfm man --all --markdown > MAN.md  # dump every method as a single markdown doc
```

### Examples

```bash
# Top artists this week for a user
lastfm user getTopArtists user=ansango period=7day limit=20

# Artist info + similar
lastfm artist getInfo artist=Radiohead
lastfm artist getSimilar artist=Radiohead limit=10

# Album lookup
lastfm album getInfo artist=Radiohead album="OK Computer"

# Top tracks by country
lastfm geo getTopTracks country=spain limit=20

# Global chart
lastfm chart getTopArtists limit=50
```

Periods for `user.getTop*`: `overall | 7day | 1month | 3month | 6month | 12month`.

## Read-only enforcement

`track.scrobble` and `track.scrobbleMany` (the canonical Last.fm names, plus
their deprecated aliases `track.postTrackScrobble` and
`track.postBatchTrackScrobble`) exist on the underlying client but require an
authenticated session. This CLI **does not support writes** — calls to those
methods (or any future write method we add to the blocklist) return a clear
error:

```
ERROR: Method "track.scrobble" is an authenticated write operation. This CLI is read-only.
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | generic error (bad args, unknown method, etc.) |
| 2 | `LASTFM_API_KEY` is not set |
| 3 | Last.fm API returned an error (rate limit, invalid key, …) |

## Development

```bash
git clone https://github.com/ansango/lastfm-cli
cd lastfm-cli
npm install
npm run build       # tsc + shebang
npm test            # node:test runner via tsx
```

## Related

- [`@ansango/lastfm-api`](https://github.com/ansango/@ansango/lastfm-api) — the underlying Last.fm client (this CLI is a thin wrapper on top of it).

## License

MIT
