# `insights/` — architecture

The `lastfm insights <subcommand>` namespace ships nine derived views over a
user's Last.fm listening history. This document explains **how the code is
composed**, not what each insight computes for the user. For usage and
examples see the top-level [README](../../README.md#insights-derived-views).

---

## 1. Module graph

The namespace has three layers: the **dispatcher** routes `insights <sub>` to
the matching command, **commands** own argv parsing + orchestration, and
**lib** holds the pure logic that the commands compose.

```mermaid
graph LR
  IDX["src/index.ts"]

  subgraph INS["insights/"]
    DISP["dispatcher.ts<br/>handleInsights()"]

    subgraph CMD["commands/"]
      C1[summary]
      C2[now-playing]
      C3[hours]
      C4[discoveries]
      C5[trends]
      C6[mood]
      C7[personality]
      C8[compare]
      C9[binges]
    end

    subgraph LIB["lib/"]
      L_CLI["cli.ts<br/>callLastfm()"]
      L_ARGS["args.ts<br/>parseFlags()"]
      L_PER["periods.ts"]
      L_SUM["summary.ts"]
      L_NP["now-playing.ts"]
      L_HRS["hours.ts"]
      L_DIV["diversity.ts"]
      L_DSC["discoveries.ts"]
      L_TRD["trends.ts"]
      L_MOO["mood.ts"]
      L_MOC["mood-composer.ts"]
      L_PER2["personality.ts"]
      L_CMP["compare.ts"]
      L_BNG["binges.ts"]
      L_RND["render.ts"]
    end
  end

  IDX --> DISP
  DISP --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9

  C1 --> L_CLI & L_ARGS & L_SUM & L_RND
  C2 --> L_CLI & L_ARGS & L_NP & L_RND
  C3 --> L_CLI & L_ARGS & L_HRS
  C4 --> L_CLI & L_ARGS & L_DSC
  C5 --> L_CLI & L_ARGS & L_TRD & L_PER
  C6 --> L_CLI & L_ARGS & L_MOC & L_MOO
  C7 --> L_CLI & L_ARGS & L_SUM & L_HRS & L_DSC & L_PER2
  C8 --> L_CLI & L_ARGS & L_CMP
  C9 --> L_CLI & L_ARGS & L_BNG
```

`personality` is the only command that touches three different lib modules
(`summary` for diversity, `hours` for time-of-day shares, `discoveries` for
the new-artists count). Everything else reaches into one or two libs.

---

## 2. Dispatch flow (generic)

Every subcommand walks this same path from argv to stdout. `src/index.ts`
catches the `insights` keyword, the dispatcher picks the runner, the command
parses flags, fetches via `callLastfm`, composes with a lib function, and
writes to stdout.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant CLI as lastfm binary
  participant IDX as src/index.ts
  participant DISP as dispatcher.ts
  participant CMD as commands/&lt;sub&gt;.ts
  participant ARGS as lib/args.ts
  participant C as lib/cli.ts<br/>(callLastfm)
  participant API as @ansango/lastfm-api
  participant LIB as lib/&lt;composer&gt;.ts
  participant OUT as stdout

  U->>CLI: lastfm insights summary --user ansango --period weekly
  CLI->>IDX: argv = ["insights", "summary", ...]
  IDX->>IDX: first === "insights" → handleInsights(argv.slice(1))
  IDX->>DISP: handleInsights(["summary", ...])
  DISP->>DISP: sub = "summary", rest = [...]
  DISP->>CMD: summaryRun(rest)
  CMD->>ARGS: parseFlags(rest, schema)
  ARGS-->>CMD: { values, help: false }
  CMD->>CMD: validate required flags (e.g. --user)
  loop per Last.fm call
    CMD->>C: callLastfm("user.getTopArtists", params)
    C->>API: spawn lastfm user.getTopArtists ...
    API-->>C: JSON stdout
    C-->>CMD: parsed payload
  end
  CMD->>LIB: buildSummary({user, period, limit, caller})
  LIB-->>CMD: typed result (Summary / NowPlaying / ...)
  alt format == markdown
    CMD->>CMD: renderMarkdown(result)
  else format == json
    CMD->>CMD: JSON.stringify(result)
  end
  CMD-->>OUT: process.stdout.write
```

`callLastfm` is the only network-touching surface — every lib function takes a
`Caller` (or pre-fetched data) so unit tests can inject synthetic payloads
without spawning the real binary.

---

## 3. Entity composition

The lib layer produces typed result objects. Each entity composes lower-level
records; arrows below show "contains" relationships.

```mermaid
classDiagram
  class Summary {
    +user: string
    +period: Period
    +label: string
    +lastfmPeriod: string
    +from?: number
    +to: number
    +topArtists: ArtistEntry[]
    +topTracks: TrackEntry[]
    +topAlbums: AlbumEntry[]
    +topTags: TagEntry[]
    +totalScrobbles: number
    +diversity?: DiversityStats
  }
  class NowPlaying {
    +user: string
    +nowPlaying: boolean
    +track: TrackEntry
    +artist: ArtistEntry
    +album?: string
    +bio: string
    +similar: ArtistEntry[]
  }
  class PersonalityResult {
    +scores: Record~ArchetypeId, number~
    +winner: ArchetypeId
    +reasons: string[]
  }
  class MoodProfile {
    +label: string
    +axes: MoodAxes
    +categories: string[]
    +confidence: number
  }
  class Binge {
    +artist: string
    +track?: string
    +length: number
    +startUts: number
    +endUts: number
  }
  class RankingDiff {
    +risers: RankedWithDelta[]
    +fallers: RankedWithDelta[]
    +newcomers: RankedWithDelta[]
    +departures: Ranked[]
  }
  class CompareResult {
    +aCount: number
    +bCount: number
    +intersection: string[]
    +rankedIntersection: NamedEntry[]
    +onlyA: string[]
    +onlyB: string[]
    +jaccard: number
  }
  class ArtistEntry { +name +playcount +mbid? +url? }
  class TrackEntry { +name +playcount +album? +artist? }
  class DiversityStats { +shannon +normalized +top1Share +top3Share +top5Share +uniqueArtists }
  class MoodAxes { +energy +valence }
  class RankedWithDelta { +name +playcount +currentRank +previousRank? +deltaRank +deltaCount }

  Summary --> "*" ArtistEntry
  Summary --> "*" TrackEntry
  Summary --> "0..1" DiversityStats
  NowPlaying --> TrackEntry
  NowPlaying --> "*" ArtistEntry
  PersonalityResult ..> MoodAxes : uses
  MoodProfile --> MoodAxes
  RankingDiff --> "*" RankedWithDelta
```

| Entity | Produced by | Consumed by |
| --- | --- | --- |
| `Summary` | `lib/summary.ts::buildSummary` | `commands/summary.ts`, `commands/personality.ts` (for diversity + totals) |
| `NowPlaying` | `lib/now-playing.ts::buildNowPlaying` | `commands/now-playing.ts` |
| `PersonalityResult` | `lib/personality.ts::scoreArchetypes` | `commands/personality.ts` |
| `MoodProfile` | `lib/mood.ts::classifyMood` | `lib/mood-composer.ts::buildMoodProfile` |
| `Binge` | `lib/binges.ts::findBinges` | `commands/binges.ts` |
| `RankingDiff` | `lib/trends.ts::diffRankings` | `commands/trends.ts` |
| `CompareResult` | `lib/compare.ts::compareArtists` | `commands/compare.ts` |

---

## 4. Per-command data flows

The diagrams below trace each command's exact path: which Last.fm methods
are called, in what order, which lib function composes the result, and
what's written to stdout. Pagination loops are shown as `loop`.

### 4.1 `summary`

```mermaid
sequenceDiagram
  autonumber
  participant C as summary.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/summary.ts
  participant R as lib/render.ts
  participant OUT as stdout

  par 4 parallel calls
    C->>X: callLastfm("user.getTopArtists", {user, period, limit})
    X->>API: lastfm user.getTopArtists ...
  and
    C->>X: callLastfm("user.getTopTracks", {user, period, limit})
    X->>API: lastfm user.getTopTracks ...
  and
    C->>X: callLastfm("user.getTopAlbums", {user, period, limit})
    X->>API: lastfm user.getTopAlbums ...
  and
    C->>X: callLastfm("user.getTopTags", {user, limit})
    X->>API: lastfm user.getTopTags ...
  end
  X-->>C: 4 JSON payloads
  C->>L: buildSummary({user, period, limit, caller})
  Note over L: unwrapList x4 and normalize
  Note over L: sum playcounts
  Note over L: compute diversity if at least 2 artists
  L-->>C: Summary
  alt format == markdown
    C->>R: renderSummaryMarkdown(s)
    R-->>C: markdown
  else format == json
    C->>C: JSON.stringify(s)
  end
  C-->>OUT: result
```

### 4.2 `now-playing`

```mermaid
sequenceDiagram
  autonumber
  participant C as now-playing.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/now-playing.ts
  participant R as lib/render.ts
  participant OUT as stdout

  C->>X: callLastfm("user.getRecentTracks", {user, limit:1})
  X->>API: lastfm user.getRecentTracks user=X limit=1
  API-->>X: most recent scrobble
  X-->>C: recent payload
  C->>C: extract last track + artist name
  par 2 parallel enrichments
    C->>X: callLastfm("artist.getInfo", {artist})
    X->>API: lastfm artist.getInfo artist=...
  and
    C->>X: callLastfm("artist.getSimilar", {artist, limit:similarLimit})
    X->>API: lastfm artist.getSimilar artist=...
  end
  X-->>C: bio + similar payloads
  C->>L: buildNowPlaying({user, caller, similarLimit, bioMaxChars})
  Note over L: compose track, artist, bio, similar
  Note over L: truncate bio to bioMaxChars
  L-->>C: NowPlaying
  alt format == markdown
    C->>R: renderNowPlayingMarkdown(np)
    R-->>C: markdown
  else format == json
    C->>C: JSON.stringify(np)
  end
  C-->>OUT: result
```

### 4.3 `hours`

```mermaid
sequenceDiagram
  autonumber
  participant C as hours.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/hours.ts
  participant OUT as stdout

  loop page 1..N until <200 tracks returned
    C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
    X->>API: lastfm user.getRecentTracks ...
    API-->>X: page of recenttracks
    X-->>C: payload
    C->>C: collect date.uts from each track
  end
  C->>L: buildHourHistogram(timestamps)
  Note over L: bucketTimestamp per timestamp
  Note over L: tally byHour 0 to 23 and byWeekday 0 to 6
  Note over L: find peaks
  L-->>C: HourHistogram
  alt format == markdown
    C->>C: inline renderHistogramMarkdown(h)
  else format == json
    C->>C: JSON.stringify(h)
  end
  C-->>OUT: result
```

### 4.4 `discoveries`

```mermaid
sequenceDiagram
  autonumber
  participant C as discoveries.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/discoveries.ts
  participant OUT as stdout

  par baseline + window in parallel
    loop page 1..N for the recent window
      C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
      X->>API: lastfm user.getRecentTracks ...
      API-->>X: page
      X-->>C: tracks
    end
  and
    C->>X: callLastfm("user.getTopArtists", {user, period:overall, limit:200})
    X->>API: lastfm user.getTopArtists period=overall ...
    API-->>X: baseline roster
    X-->>C: artist names
    C->>C: baseline = new Set(names)
  end
  C->>L: extractArtistTimestamps(recentPayload)
  L-->>C: ArtistTimestamp[] (window)
  C->>L: findNewArtists(window, baseline, {maxResults})
  Note over L: dedupe window by earliest firstSeen
  Note over L: subtract baseline
  L-->>C: ArtistTimestamp[] (newbies)
  alt format == markdown
    C->>C: inline renderMarkdown(newbies, ...)
  else format == json
    C->>C: JSON.stringify({baselineSize, newbies})
  end
  C-->>OUT: result
```

### 4.5 `trends`

```mermaid
sequenceDiagram
  autonumber
  participant C as trends.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/trends.ts
  participant OUT as stdout

  Note over C: resolve --now and --compare to Last.fm period tokens
  Note over C: weekly maps to 7day, monthly to 1month, etc
  par current + previous in parallel
    C->>X: callLastfm(method, {user, period: nowLastfm, limit: 30})
    X->>API: lastfm user.getTopArtists|Tracks ...
    API-->>X: ranked list
    X-->>C: current raw
  and
    C->>X: callLastfm(method, {user, period: compareLastfm, limit: 30})
    X->>API: lastfm user.getTopArtists|Tracks ...
    API-->>X: ranked list
    X-->>C: previous raw
  end
  C->>C: fetchTop → Ranked[] (normalize both)
  C->>L: diffRankings(current, previous, {maxResults})
  Note over L: bucket into four groups
  Note over L: risers, fallers, newcomers, departures
  L-->>C: RankingDiff
  alt format == markdown
    C->>C: inline renderMarkdown(diff, ...)
  else format == json
    C->>C: JSON.stringify(diff)
  end
  C-->>OUT: result
```

### 4.6 `mood`

```mermaid
sequenceDiagram
  autonumber
  participant C as mood.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant COM as lib/mood-composer.ts
  participant CLS as lib/mood.ts
  participant OUT as stdout

  par topArtists + user topTags
    C->>X: callLastfm("user.getTopArtists", {user, period, limit:topArtists})
    X->>API: lastfm user.getTopArtists ...
  and
    C->>X: callLastfm("user.getTopTags", {user, limit:50})
    X->>API: lastfm user.getTopTags ...
  end
  X-->>C: 2 payloads
  C->>COM: buildMoodProfile({user, period, topArtists, caller})
  Note over COM: unwrapArtistNames from topArtistsRaw
  Note over COM: unwrapTags from userTagsRaw
  loop for each artist name (in parallel)
    COM->>X: callLastfm("artist.getTopTags", {artist, limit:20})
    X->>API: lastfm artist.getTopTags ...
    API-->>X: tags
    X-->>COM: per-artist tags
  end
  Note over COM: merge user tags and artist tags
  Note over COM: call classifyMood on all tags
  COM->>CLS: classifyMood(mergedTags)
  CLS-->>COM: MoodProfile
  COM-->>C: MoodWithMeta (Profile + tagSourceCount, artistCount, primarySource)
  alt format == markdown
    C->>C: inline renderMoodMarkdown(m, ...)
  else format == json
    C->>C: JSON.stringify(m)
  end
  C-->>OUT: result
```

### 4.7 `personality`

The only command that touches three different lib modules. It pulls
diversity + totals from `summary`, time-of-day shares from `hours`, and
new-artists count from `discoveries`, then feeds the assembled feature
vector to the personality scorer.

```mermaid
sequenceDiagram
  autonumber
  participant C as personality.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant LSUM as lib/summary.ts
  participant LHRS as lib/hours.ts
  participant LDSC as lib/discoveries.ts
  participant LPER as lib/personality.ts
  participant OUT as stdout

  par summary + timestamps
    C->>LSUM: buildSummary({user, period:weekly, caller, limit:30})
    LSUM->>X: 4× callLastfm (topArtists/Tracks/Albums/Tags)
    X->>API: lastfm user.getTop* ...
    LSUM-->>C: Summary (diversity + totals)
  and
    loop page 1..N for last 30d
      C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
      X->>API: lastfm user.getRecentTracks ...
      X-->>C: page
    end
    Note over C: collect timestamps
    C->>LHRS: buildHourHistogram(stamps)
    LHRS-->>C: histogram
    C->>C: nightHourShare / morningHourShare / weekdayShare
  end
  par baseline roster + recent window for discoveries
    C->>X: callLastfm("user.getTopArtists", {user, period:overall, limit:200})
    X->>API: lastfm user.getTopArtists ...
    C->>C: baseline = new Set(names)
  and
    C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page:1})
    X->>API: lastfm user.getRecentTracks ...
    X-->>C: recent detailed payload
  end
  C->>LDSC: extractArtistTimestamps(detailed)
  LDSC-->>C: window ArtistTimestamp[]
  C->>LDSC: findNewArtists(window, baseline)
  LDSC-->>C: newbies
  C->>C: assemble PersonalityFeatures
  C->>LPER: scoreArchetypes(features)
  LPER-->>C: PersonalityResult (scores, winner, reasons)
  alt format == markdown
    C->>C: inline render (winner.emoji/es/blurb + scores bars)
  else format == json
    C->>C: JSON.stringify({features, result})
  end
  C-->>OUT: result
```

### 4.8 `compare`

```mermaid
sequenceDiagram
  autonumber
  participant C as compare.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/compare.ts
  participant OUT as stdout

  par both users' top artists in parallel
    C->>X: callLastfm("user.getTopArtists", {user:userA, period, limit})
    X->>API: lastfm user.getTopArtists user=userA ...
    API-->>X: top artists A
    X-->>C: payload
    C->>C: fetchTop → NamedEntry[] (A)
  and
    C->>X: callLastfm("user.getTopArtists", {user:userB, period, limit})
    X->>API: lastfm user.getTopArtists user=userB ...
    API-->>X: top artists B
    X-->>C: payload
    C->>C: fetchTop → NamedEntry[] (B)
  end
  C->>L: compareArtists(A, B)
  Note over L: index by name
  Note over L: compute intersection, onlyA, onlyB
  Note over L: rank intersection by min playcount
  Note over L: compute Jaccard
  L-->>C: CompareResult
  alt format == markdown
    C->>C: inline renderCompareMarkdown(r, A, B)
  else format == json
    C->>C: JSON.stringify(r)
  end
  C-->>OUT: result
```

### 4.9 `binges`

```mermaid
sequenceDiagram
  autonumber
  participant C as binges.ts
  participant X as lib/cli.ts
  participant API as @ansango/lastfm-api
  participant L as lib/binges.ts
  participant OUT as stdout

  loop page 1..N for last sinceDays
    C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
    X->>API: lastfm user.getRecentTracks ...
    API-->>X: page
    X-->>C: payload
    C->>L: extractScrobbles(payload)
    L-->>C: Scrobble[] (artist, track, uts)
  end
  Note over C: scrobbles merged and sorted ascending
  C->>L: findBinges(scrobbles, {minLength, trackKey, maxGapSeconds, maxResults})
  Note over L: walk sorted list
  Note over L: group consecutive by key
  Note over L: break on gap greater than maxGapSeconds
  Note over L: keep runs with length at least minLength
  L-->>C: Binge[]
  alt format == markdown
    C->>C: inline renderBingesMarkdown(binges, ...)
  else format == json
    C->>C: JSON.stringify({totalScrobbles, binges})
  end
  C-->>OUT: result
```

---

## 5. The `Caller` DI pattern

Every lib function that talks to Last.fm takes a `Caller` instead of calling
the CLI directly. This is what makes unit tests cheap — production wires a
`Caller` that wraps `callLastfm`, tests inject a fixture-backed fake.

```mermaid
sequenceDiagram
  autonumber
  participant C as commands/&lt;sub&gt;.ts
  participant L as lib/&lt;composer&gt;.ts
  participant X as lib/cli.ts<br/>(callLastfm)
  participant API as lastfm binary

  Note over C,L: Production wiring
  C->>C: caller = (m, p) => callLastfm(m, p)
  C->>L: composer({ ..., caller })
  L->>C: caller("user.getTopArtists", {...})
  C->>X: callLastfm("user.getTopArtists", {...})
  X->>API: spawn lastfm user.getTopArtists ...
  API-->>X: JSON stdout
  X-->>C: parsed payload
  C-->>L: payload

  Note over C,L: Test wiring (unit/*.test.ts)
  C->>C: caller = fakeCaller(method) → JSON literal
  C->>L: composer({ ..., caller: fakeCaller })
  L->>C: caller("user.getTopArtists", {...})
  C-->>L: payload (literal, no network)
```

The `executor` hook inside `callLastfm` (the `{ executor }` option) is a
second injection point — tests can swap out `execFile` itself to verify
argument shaping without touching Last.fm or even `callLastfm`'s parsing.

---

## 6. Adding a new subcommand

The shape is mechanical once you know it. A new `insights foo` would need:

1. **`src/insights/lib/foo.ts`** — pure logic. Exports the result type and
   one or more functions. Tests live at `tests/insights/lib/foo.test.ts`
   with a fixture-backed `Caller`.
2. **`src/insights/commands/foo.ts`** — argv parsing via `parseFlags`, the
   `run(argv): Promise<void>` entry point, inline markdown rendering (or
   add a function to `lib/render.ts` if the layout is reusable).
3. **`src/insights/dispatcher.ts`** — add `foo` to `INSIGHTS_SUBCOMMANDS`,
   add a `RUNNERS.foo = (a) => fooRun(a)`, and a line in `insightsHelp()`.
4. **`src/index.ts`** — nothing (the dispatcher branch handles all
   `insights <sub>` automatically).
5. **`tests/insights/integration/foo.integration.test.ts`** — gated by
   `RUN_INTEGRATION=1` + `LASTFM_API_KEY`.
6. **`README.md`** — extend the `lastfm insights …` example block.

The test script (`package.json`) globs both flat and nested test paths
already, so no tooling change is needed.
