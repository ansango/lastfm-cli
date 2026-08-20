# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
