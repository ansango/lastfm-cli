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

## Authentication

The CLI ships a browser-based auth flow to produce a `LASTFM_SESSION_KEY`
that downstream write methods (when they land) can use. The session key is
**never persisted** — the CLI prints it, and you `eval` it into your shell.

```bash
# 1. Get a request token + the URL to open in a browser
lastfm auth.getToken
# → prints:
#   https://www.last.fm/api/auth/?api_key=...&token=ABCD1234
#   Request token: ABCD1234
#   Next: lastfm auth.getSession --token=ABCD1234

# 2. Open the URL, log in, click "Allow access", then either:
#    - copy the token from the URL bar (any callback URL works), or
#    - set your Last.fm account's callback URL to http://127.0.0.1:<port>/
#      and use --callback to auto-catch the redirect (see `lastfm man auth.getSession`)

# 3. Exchange the token for a session key and eval it into your shell:
eval $(lastfm auth.getSession --token=ABCD1234 --export)
# → sets $LASTFM_SESSION_KEY in the current shell (printed as one line)

# Verify it works:
echo "LASTFM_SESSION_KEY=$LASTFM_SESSION_KEY"
```

`auth.getMobileSession` was removed in `@ansango/lastfm-api@3.3.0` and is
not available from this CLI. The web flow works for every self-service
user; the mobile flow required mobile-classified API keys, which the
public self-service create form does not expose.

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

`user`, `album`, `artist`, `track`, `tag`, `chart`, `geo`, `library`, `auth`.

The `auth` namespace carries the browser-based auth flow. See
[Authentication](#authentication) below.

### Insights (derived views)

`lastfm insights <subcommand> ...` ships a curated set of derived views
over your listening history. Each subcommand calls `@ansango/lastfm-cli`
for the raw data, then renders a markdown or JSON report.

```bash
lastfm insights                   # list subcommands
lastfm insights summary --user ansango --period weekly
lastfm insights now-playing --user ansango
lastfm insights hours --user ansango --since 30d
lastfm insights discoveries --user ansango --since 90d
lastfm insights trends --user ansango --now weekly --compare monthly
lastfm insights mood --user ansango --period weekly
lastfm insights personality --user ansango
lastfm insights compare --user-a alice --user-b bob --period overall
lastfm insights binges --user ansango --since 30d --min-length 3
```

Subcommands: `summary`, `now-playing`, `hours`, `discoveries`, `trends`,
`mood`, `personality`, `compare`, `binges`. Each prints its own
`--help` with the full flag list.

These subcommands share the same `LASTFM_API_KEY` env discovery as the
rest of the CLI; no extra configuration is required.

For the architecture of this namespace — module graph, dispatch flow, entity
composition, and per-command data flows — see
[`src/insights/README.md`](src/insights/README.md).

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

# Auth: get a request token, exchange it for a session key
lastfm auth.getToken
eval $(lastfm auth.getSession --token=ABCD1234 --export)
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
