# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`auth` namespace**: `auth.getToken` returns a request token + the pre-built
  `authUrl` from `@ansango/lastfm-api@3.3.0`; `auth.getSession --token=<token>`
  exchanges the request token for a session key. With `--export`, emits a
  single `export LASTFM_SESSION_KEY=...` line for `eval $(...)` capture in
  bash / zsh / fish. No file persistence.
- **Write gate** (issue #5): the 12 write methods (`track.scrobble`,
  `track.scrobbleMany`, `track.love`, `track.unlove`, `track.updateNowPlaying`,
  `track.addTags`, `track.removeTag`, `track.postTrackScrobble`,
  `track.postBatchTrackScrobble`, `album.addTags`, `album.removeTag`,
  `artist.addTags`, `artist.removeTag`) are now reachable. The CLI no longer
  maintains a `BLOCKED_METHODS` deny-list; the API library's `sk` check is
  authoritative, and a dedicated catch handler rephrases the resulting
  `LastFmApiError` into a multi-line actionable message pointing at the
  auth flow. See `src/session-key-error.ts` and `src/index.ts`.
- README: new "Authentication" section documenting the browser flow, the
  `--export` eval trick, and a clear note that `auth.getMobileSession` is
  gone (removed in `@ansango/lastfm-api@3.3.0`).
- README: "Write methods (require auth)" section showing the full surface
  and a live `lastfm track love` example after `eval $(... --export)`.
- `man auth` and `man auth.getToken` / `man auth.getSession` entries.
- `man track.scrobble` / `man track.scrobbleMany` / `man track.postTrackScrobble` /
  `man track.postBatchTrackScrobble` no longer flag "BLOCKED" and include
  working `--export` examples.

### Changed

- Dependency: `@ansango/lastfm-api` bumped from `^3.1.3` to `^3.3.0`. The
  `authUrl` field on the `auth.getToken` response is required by the CLI.
- `src/methods.ts`: `BLOCKED_METHODS` is removed; replaced by the
  informational `AUTH_REQUIRED_METHODS` set (used by tests + the
  `man` system to hint at the auth flow).
- `src/dispatch.ts`: `callMethod` no longer checks a deny-list. Unknown
  namespaces / methods still throw with a clear "Unknown method" message.
- `src/index.ts`: catch handler in `main()` now routes through
  `rephraseSessionKeyError()` for pre-flight API errors (`httpStatus 0`
  with "session key" in the message). All other errors pass through
  unchanged.

## [0.4.0] — 2026-08-21

### Added
- `lastfm insights <subcommand>` namespace with nine derived views over a
  user's Last.fm listening history:
  - `summary` — Wrapped-style top artists / tracks / albums / tags
  - `now-playing` — Last scrobble enriched with artist bio + similar
  - `hours` — Histogram of listening by hour-of-day and day-of-week
  - `discoveries` — New artists since a baseline window
  - `trends` — Diff between two period rankings
  - `mood` — Mood profile (taxonomy + classifier)
  - `personality` — Listener archetype scoring
  - `compare` — Jaccard overlap between two users
  - `binges` — Consecutive-listening runs
- Shared declarative arg parser (`src/insights/lib/args.ts`) used by every
  command — `parseFlags(argv, schema)` with `flag.{string,number,days,enum}`
  helpers. Cuts ~385 lines of duplicated loop/switch logic across the 9
  command files.
- Architecture documentation in `src/insights/README.md` and a Spanish
  translation in `src/insights/README.es.md`, with 13 Mermaid diagrams
  covering the module graph, dispatch flow, entity composition, per-command
  data flows, and the `Caller` DI pattern.
- LICENSE file (MIT) — `package.json` declared MIT since 0.1.0 but the
  repository had no license file.

### Changed
- Test script (`package.json`) now globs both flat (`tests/*.test.ts`) and
  nested (`tests/insights/{lib,integration}/*.test.ts`) test paths.
- `generalHelp()` in `src/help.ts` now lists the new subcommand set so
  `lastfm --help` points users at it.

### Fixed
- Integration test gate was broken (`skip()` at module level only registered
  a placeholder; the actual `test()` call still ran in CI). Rewrote all 9
  integration tests to use `test.skip` binding, gated by
  `RUN_INTEGRATION=1` + `LASTFM_API_KEY`. CI on Node 20/22/24 now sees
  152 pass + 9 skipped, 0 fail.

## [0.3.1] — 2026-08-XX

### Changed
- Dependency updates.

## [0.3.0] — 2026-08-XX

### Added
- `lastfm man` built-in command with curated reference for every method.

## [0.2.0] — 2026-08-XX

### Added
- Initial CLI scaffolding (`lastfm <namespace> <method> [key=value ...]`).
- Eight Last.fm API namespaces: `user`, `album`, `artist`, `track`, `tag`,
  `chart`, `geo`, `library`.
- Built-in helpers: `help`, `methods`, `config`.
- GitHub Actions workflow testing on Node 20 / 22 / 24.

[0.4.0]: https://github.com/ansango/lastfm-cli/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/ansango/lastfm-cli/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/ansango/lastfm-cli/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ansango/lastfm-cli/releases/tag/v0.2.0
