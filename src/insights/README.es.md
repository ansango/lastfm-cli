# `insights/` — arquitectura

El namespace `lastfm insights <subcommand>` ofrece nueve vistas derivadas
sobre el historial de escucha de un usuario de Last.fm. Este documento
explica **cómo está compuesto el código**, no lo que cada insight calcula
para el usuario. Para uso y ejemplos consulta el [README](../../README.md#insights-vistas-derivadas)
principal.

---

## 1. Grafo de módulos

El namespace tiene tres capas: el **dispatcher** enruta `insights <sub>` al
command que corresponde, los **commands** se ocupan del parseo de argv y la
orquestación, y **lib** contiene la lógica pura que componen los commands.

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

`personality` es el único command que toca tres módulos distintos de lib
(`summary` para diversidad, `hours` para las cuotas por hora del día,
`discoveries` para el contador de artistas nuevos). El resto entra en uno o
dos libs.

---

## 2. Flujo de dispatch (genérico)

Cada subcommand recorre este mismo camino desde argv hasta stdout.
`src/index.ts` captura la palabra clave `insights`, el dispatcher elige el
runner, el command parsea flags, hace fetch vía `callLastfm`, compone con
una función de lib y escribe a stdout.

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuario
  participant CLI as binario lastfm
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
  CMD->>CMD: valida flags requeridas (ej. --user)
  loop por cada llamada a Last.fm
    CMD->>C: callLastfm("user.getTopArtists", params)
    C->>API: spawn lastfm user.getTopArtists ...
    API-->>C: JSON en stdout
    C-->>CMD: payload parseado
  end
  CMD->>LIB: buildSummary({user, period, limit, caller})
  LIB-->>CMD: resultado tipado (Summary / NowPlaying / ...)
  alt format == markdown
    CMD->>CMD: renderMarkdown(result)
  else format == json
    CMD->>CMD: JSON.stringify(result)
  end
  CMD-->>OUT: process.stdout.write
```

`callLastfm` es la única superficie que toca la red — cada función de lib
acepta un `Caller` (o datos ya fetcheados) para que los unit tests puedan
inyectar payloads sintéticos sin spawnear el binario real.

---

## 3. Composición de entidades

La capa lib produce objetos resultado tipados. Cada entidad compone
registros de menor nivel; las flechas de abajo muestran relaciones de
"contiene".

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
  PersonalityResult ..> MoodAxes : usa
  MoodProfile --> MoodAxes
  RankingDiff --> "*" RankedWithDelta
```

| Entidad | Producida por | Consumida por |
| --- | --- | --- |
| `Summary` | `lib/summary.ts::buildSummary` | `commands/summary.ts`, `commands/personality.ts` (para diversidad + totales) |
| `NowPlaying` | `lib/now-playing.ts::buildNowPlaying` | `commands/now-playing.ts` |
| `PersonalityResult` | `lib/personality.ts::scoreArchetypes` | `commands/personality.ts` |
| `MoodProfile` | `lib/mood.ts::classifyMood` | `lib/mood-composer.ts::buildMoodProfile` |
| `Binge` | `lib/binges.ts::findBinges` | `commands/binges.ts` |
| `RankingDiff` | `lib/trends.ts::diffRankings` | `commands/trends.ts` |
| `CompareResult` | `lib/compare.ts::compareArtists` | `commands/compare.ts` |

---

## 4. Flujos por command

Los diagramas de abajo trazan el camino exacto de cada command: qué métodos
de Last.fm se llaman, en qué orden, qué función de lib compone el resultado
y qué se escribe a stdout. Los bucles de paginación se muestran como `loop`.

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

  par 4 llamadas en paralelo
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
  X-->>C: 4 payloads JSON
  C->>L: buildSummary({user, period, limit, caller})
  Note over L: unwrapList x4 y normalize
  Note over L: suma playcounts
  Note over L: calcula diversity si hay al menos 2 artistas
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
  API-->>X: scrobble más reciente
  X-->>C: payload de recientes
  C->>C: extrae último track + nombre del artista
  par 2 enriquecimientos en paralelo
    C->>X: callLastfm("artist.getInfo", {artist})
    X->>API: lastfm artist.getInfo artist=...
  and
    C->>X: callLastfm("artist.getSimilar", {artist, limit:similarLimit})
    X->>API: lastfm artist.getSimilar artist=...
  end
  X-->>C: payloads de bio y similares
  C->>L: buildNowPlaying({user, caller, similarLimit, bioMaxChars})
  Note over L: compone track, artist, bio, similar
  Note over L: trunca bio a bioMaxChars
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

  loop página 1..N hasta recibir menos de 200 tracks
    C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
    X->>API: lastfm user.getRecentTracks ...
    API-->>X: página de recenttracks
    X-->>C: payload
    C->>C: recopila date.uts de cada track
  end
  C->>L: buildHourHistogram(timestamps)
  Note over L: bucketTimestamp por timestamp
  Note over L: suma byHour de 0 a 23 y byWeekday de 0 a 6
  Note over L: encuentra picos
  L-->>C: HourHistogram
  alt format == markdown
    C->>C: renderHistogramMarkdown(h) inline
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

  par baseline y ventana en paralelo
    loop página 1..N para la ventana reciente
      C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
      X->>API: lastfm user.getRecentTracks ...
      API-->>X: página
      X-->>C: tracks
    end
  and
    C->>X: callLastfm("user.getTopArtists", {user, period:overall, limit:200})
    X->>API: lastfm user.getTopArtists period=overall ...
    API-->>X: roster de baseline
    X-->>C: nombres de artistas
    C->>C: baseline = new Set(nombres)
  end
  C->>L: extractArtistTimestamps(payloadRecientes)
  L-->>C: ArtistTimestamp[] (ventana)
  C->>L: findNewArtists(ventana, baseline, {maxResults})
  Note over L: deduplica ventana por el primer firstSeen
  Note over L: resta el baseline
  L-->>C: ArtistTimestamp[] (nuevos)
  alt format == markdown
    C->>C: renderMarkdown inline
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

  Note over C: resuelve --now y --compare a tokens de período de Last.fm
  Note over C: weekly mapea a 7day, monthly a 1month, etc
  par current y previous en paralelo
    C->>X: callLastfm(método, {user, period: nowLastfm, limit: 30})
    X->>API: lastfm user.getTopArtists o getTopTracks ...
    API-->>X: ranking
    X-->>C: current crudo
  and
    C->>X: callLastfm(método, {user, period: compareLastfm, limit: 30})
    X->>API: lastfm user.getTopArtists o getTopTracks ...
    API-->>X: ranking
    X-->>C: previous crudo
  end
  C->>C: fetchTop, normaliza ambos a Ranked[]
  C->>L: diffRankings(current, previous, {maxResults})
  Note over L: agrupa en cuatro grupos
  Note over L: risers, fallers, newcomers, departures
  L-->>C: RankingDiff
  alt format == markdown
    C->>C: renderMarkdown inline
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

  par topArtists y topTags del usuario
    C->>X: callLastfm("user.getTopArtists", {user, period, limit:topArtists})
    X->>API: lastfm user.getTopArtists ...
  and
    C->>X: callLastfm("user.getTopTags", {user, limit:50})
    X->>API: lastfm user.getTopTags ...
  end
  X-->>C: 2 payloads
  C->>COM: buildMoodProfile({user, period, topArtists, caller})
  Note over COM: unwrapArtistNames desde topArtistsRaw
  Note over COM: unwrapTags desde userTagsRaw
  loop por cada nombre de artista (en paralelo)
    COM->>X: callLastfm("artist.getTopTags", {artist, limit:20})
    X->>API: lastfm artist.getTopTags ...
    API-->>X: tags
    X-->>COM: tags por artista
  end
  Note over COM: une tags de usuario y de artistas
  Note over COM: llama a classifyMood sobre todas las tags
  COM->>CLS: classifyMood(tagsUnidas)
  CLS-->>COM: MoodProfile
  COM-->>C: MoodWithMeta (Profile más tagSourceCount,<br/>artistCount, primarySource)
  alt format == markdown
    C->>C: renderMoodMarkdown inline
  else format == json
    C->>C: JSON.stringify(m)
  end
  C-->>OUT: result
```

### 4.7 `personality`

El único command que toca tres módulos distintos de lib. Toma diversidad y
totales de `summary`, las cuotas por hora del día de `hours`, y el contador
de artistas nuevos de `discoveries`, y luego alimenta el vector de features
al scorer de personalidad.

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

  par summary y timestamps en paralelo
    C->>LSUM: buildSummary({user, period:weekly, caller, limit:30})
    LSUM->>X: 4 veces callLastfm (topArtists/Tracks/Albums/Tags)
    X->>API: lastfm user.getTop* ...
    LSUM-->>C: Summary (diversity y totales)
  and
    loop página 1..N para los últimos 30 días
      C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
      X->>API: lastfm user.getRecentTracks ...
      X-->>C: página
    end
    Note over C: recopila timestamps
    C->>LHRS: buildHourHistogram(stamps)
    LHRS-->>C: histograma
    C->>C: nightHourShare, morningHourShare, weekdayShare
  end
  par roster de baseline y ventana reciente para discoveries
    C->>X: callLastfm("user.getTopArtists", {user, period:overall, limit:200})
    X->>API: lastfm user.getTopArtists ...
    C->>C: baseline = new Set(nombres)
  and
    C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page:1})
    X->>API: lastfm user.getRecentTracks ...
    X-->>C: payload detallado de recientes
  end
  C->>LDSC: extractArtistTimestamps(detallado)
  LDSC-->>C: ArtistTimestamp[] de la ventana
  C->>LDSC: findNewArtists(ventana, baseline)
  LDSC-->>C: nuevos
  C->>C: ensambla PersonalityFeatures
  C->>LPER: scoreArchetypes(features)
  LPER-->>C: PersonalityResult (scores, winner, reasons)
  alt format == markdown
    C->>C: render inline con emoji y barra de scores
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

  par top artists de ambos usuarios en paralelo
    C->>X: callLastfm("user.getTopArtists", {user:userA, period, limit})
    X->>API: lastfm user.getTopArtists user=userA ...
    API-->>X: top artists A
    X-->>C: payload
    C->>C: fetchTop produce NamedEntry[] (A)
  and
    C->>X: callLastfm("user.getTopArtists", {user:userB, period, limit})
    X->>API: lastfm user.getTopArtists user=userB ...
    API-->>X: top artists B
    X-->>C: payload
    C->>C: fetchTop produce NamedEntry[] (B)
  end
  C->>L: compareArtists(A, B)
  Note over L: indexa por nombre
  Note over L: calcula intersection, onlyA, onlyB
  Note over L: rankea intersection por el mínimo de playcount
  Note over L: calcula Jaccard
  L-->>C: CompareResult
  alt format == markdown
    C->>C: renderCompareMarkdown inline
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

  loop página 1..N para los últimos sinceDays
    C->>X: callLastfm("user.getRecentTracks", {user, from, to, limit:200, page})
    X->>API: lastfm user.getRecentTracks ...
    API-->>X: página
    X-->>C: payload
    C->>L: extractScrobbles(payload)
    L-->>C: Scrobble[] (artist, track, uts)
  end
  Note over C: scrobbles unidos y ordenados ascendente
  C->>L: findBinges(scrobbles, {minLength, trackKey, maxGapSeconds, maxResults})
  Note over L: recorre la lista ordenada
  Note over L: agrupa consecutivos por key
  Note over L: rompe si el gap supera maxGapSeconds
  Note over L: conserva runs con length de al menos minLength
  L-->>C: Binge[]
  alt format == markdown
    C->>C: renderBingesMarkdown inline
  else format == json
    C->>C: JSON.stringify({totalScrobbles, binges})
  end
  C-->>OUT: result
```

---

## 5. El patrón DI del `Caller`

Cada función de lib que habla con Last.fm acepta un `Caller` en lugar de
llamar al CLI directamente. Esto es lo que hace que los unit tests sean
baratos — producción conecta un `Caller` que envuelve `callLastfm`, los
tests inyectan un fake respaldado por fixtures.

```mermaid
sequenceDiagram
  autonumber
  participant C as commands/&lt;sub&gt;.ts
  participant L as lib/&lt;composer&gt;.ts
  participant X as lib/cli.ts<br/>(callLastfm)
  participant API as binario lastfm

  Note over C,L: Cableado en producción
  C->>C: caller = (m, p) => callLastfm(m, p)
  C->>L: composer({ ..., caller })
  L->>C: caller("user.getTopArtists", {...})
  C->>X: callLastfm("user.getTopArtists", {...})
  X->>API: spawn lastfm user.getTopArtists ...
  API-->>X: JSON en stdout
  X-->>C: payload parseado
  C-->>L: payload

  Note over C,L: Cableado en tests (unit/*.test.ts)
  C->>C: caller = fakeCaller(método) que devuelve JSON literal
  C->>L: composer({ ..., caller: fakeCaller })
  L->>C: caller("user.getTopArtists", {...})
  C-->>L: payload (literal, sin red)
```

El hook `executor` dentro de `callLastfm` (la opción `{ executor }`) es un
segundo punto de inyección — los tests pueden sustituir el propio
`execFile` para verificar el shaping de argumentos sin tocar Last.fm ni el
parseo de `callLastfm`.

---

## 6. Añadir un subcommand nuevo

La forma es mecánica una vez que la conoces. Un nuevo `insights foo`
necesitaría:

1. **`src/insights/lib/foo.ts`** — lógica pura. Exporta el tipo de
   resultado y una o más funciones. Los tests van en
   `tests/insights/lib/foo.test.ts` con un `Caller` respaldado por fixtures.
2. **`src/insights/commands/foo.ts`** — parseo de argv vía `parseFlags`,
   el entry point `run(argv): Promise<void>`, render de markdown inline
   (o añade una función a `lib/render.ts` si el layout es reutilizable).
3. **`src/insights/dispatcher.ts`** — añade `foo` a `INSIGHTS_SUBCOMMANDS`,
   añade `RUNNERS.foo = (a) => fooRun(a)`, y una línea en `insightsHelp()`.
4. **`src/index.ts`** — nada (la rama del dispatcher se ocupa de todos los
   `insights <sub>` automáticamente).
5. **`tests/insights/integration/foo.integration.test.ts`** — gateado por
   `RUN_INTEGRATION=1` + `LASTFM_API_KEY`.
6. **`README.md`** — extiende el bloque de ejemplos `lastfm insights …`.

El script de test (`package.json`) ya hace glob tanto de los tests planos
como de los anidados, así que no hace falta tocar tooling.
