/**
 * trends.ts — diff two ranked lists (e.g. top artists this week vs last week).
 *
 * Pure: takes two Ranked[] lists and returns the four buckets that matter
 * for a "trends" view: risers, fallers, newcomers, departures. Each bucket
 * preserves the ranking of the current list (so we know where the item sits
 * NOW).
 */

export interface Ranked {
  readonly name: string;
  readonly playcount: number;
}

export interface RankedWithDelta extends Ranked {
  readonly currentRank: number;
  readonly previousRank?: number;
  readonly deltaRank: number; // positive = moved up
  readonly deltaCount: number; // current - previous
}

export interface DiffOptions {
  readonly maxResults?: number;
}

export interface RankingDiff {
  readonly risers: RankedWithDelta[];
  readonly fallers: RankedWithDelta[];
  readonly newcomers: RankedWithDelta[];
  readonly departures: Ranked[];
}

function indexByName(list: readonly Ranked[]): Map<string, { idx: number; item: Ranked }> {
  const m = new Map<string, { idx: number; item: Ranked }>();
  list.forEach((item, idx) => m.set(item.name, { idx, item }));
  return m;
}

export function diffRankings(
  current: readonly Ranked[],
  previous: readonly Ranked[],
  options: DiffOptions = {},
): RankingDiff {
  const curIdx = indexByName(current);
  const prevIdx = indexByName(previous);

  const risers: RankedWithDelta[] = [];
  const fallers: RankedWithDelta[] = [];
  const newcomers: RankedWithDelta[] = [];

  current.forEach((cur, i) => {
    const prev = prevIdx.get(cur.name);
    if (!prev) {
      newcomers.push({
        name: cur.name,
        playcount: cur.playcount,
        currentRank: i,
        deltaRank: 0,
        deltaCount: cur.playcount,
      });
      return;
    }
    const deltaRank = prev.idx - i; // positive = moved up
    const deltaCount = cur.playcount - prev.item.playcount;
    if (deltaRank > 0 || deltaCount > 0) {
      risers.push({
        name: cur.name,
        playcount: cur.playcount,
        currentRank: i,
        previousRank: prev.idx,
        deltaRank,
        deltaCount,
      });
    } else if (deltaRank < 0 || deltaCount < 0) {
      fallers.push({
        name: cur.name,
        playcount: cur.playcount,
        currentRank: i,
        previousRank: prev.idx,
        deltaRank,
        deltaCount,
      });
    }
    // Equal: skip — same rank, same count, no signal.
  });

  const departures: Ranked[] = [];
  previous.forEach((prev) => {
    if (!curIdx.has(prev.name)) {
      departures.push(prev);
    }
  });

  // Sort buckets by current rank (ascending).
  risers.sort((a, b) => a.currentRank - b.currentRank);
  fallers.sort((a, b) => a.currentRank - b.currentRank);
  newcomers.sort((a, b) => a.currentRank - b.currentRank);

  const max = options.maxResults ?? Infinity;
  return {
    risers: risers.slice(0, max),
    fallers: fallers.slice(0, max),
    newcomers: newcomers.slice(0, max),
    departures: departures.slice(0, max),
  };
}
