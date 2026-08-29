# `insights/` — architecture

The `lastfm insights <subcommand>` namespace ships nine derived views over a user's Last.fm listening history.

All core analytical engines, mathematical algorithms (Shannon diversity, Jaccard similarity, 2D mood classification, archetype scoring), and pagination loops are provided directly by [`@ansango/lastfm-api/insights`](https://github.com/ansango/lastfm-api).

`lastfm-cli` acts purely as a **presentation and terminal interface layer**.

---

## 1. Module graph

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

    subgraph LIB["lib/ (presentation only)"]
      L_ARGS["args.ts<br/>parseFlags()"]
      L_RND["render.ts<br/>renderMarkdown()"]
    end
  end

  subgraph SDK["@ansango/lastfm-api"]
    API["client.insights.*"]
  end

  IDX --> DISP
  DISP --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8 & C9
  CMD --> L_ARGS
  CMD --> L_RND
  CMD --> API
```

---

## 2. Architecture & Responsibilities

1. **`dispatcher.ts`**: Routes `lastfm insights <subcommand>` to the appropriate command handler.
2. **`commands/<subcommand>.ts`**: Parses CLI flags using `lib/args.ts`, calls `client.insights.<method>()`, and writes formatted Markdown / ASCII charts or JSON to `stdout`.
3. **`lib/`**: Contains presentation-only utilities (`args.ts` for flag parsing and `render.ts` for Markdown transformation).
