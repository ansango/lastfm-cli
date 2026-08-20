/**
 * periods.ts — translate human-friendly period names into both:
 *   - Last.fm's `user.getTop*` `period=` token, and
 *   - a UNIX-seconds `(from, to)` window for `user.getRecentTracks`.
 *
 * Pure module: takes a clock function so tests are deterministic.
 */
export type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'overall';

export interface ResolvedPeriod {
  readonly lastfm: string;
  readonly from?: number; // UNIX seconds; undefined for 'overall'
  readonly to: number;    // UNIX seconds
  readonly label: string; // human label, e.g. "this week"
}

const SECOND = 1;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const LASTFM_BY_PERIOD: Record<Period, string> = {
  daily: '7day',       // Last.fm has no daily period; nearest is 7-day
  weekly: '7day',
  monthly: '1month',
  yearly: '12month',
  overall: 'overall',
};

const LABEL_BY_PERIOD: Record<Period, string> = {
  daily: 'last 24 hours',
  weekly: 'this week',
  monthly: 'this month',
  yearly: 'this year',
  overall: 'all time',
};

const WINDOW_SECONDS: Partial<Record<Period, number>> = {
  daily: 1 * DAY,
  weekly: 7 * DAY,
  monthly: 30 * DAY,
  yearly: 365 * DAY,
};

export function periodToLastfm(p: Period): string {
  return LASTFM_BY_PERIOD[p];
}

export interface Window {
  readonly from: number;
  readonly to: number;
}

export function periodToWindow(p: Period, nowMs: number): Window {
  const span = WINDOW_SECONDS[p];
  if (span === undefined) {
    throw new Error(`period ${p} has no window (use 'overall')`);
  }
  const to = Math.floor(nowMs / 1000);
  const from = to - span;
  return { from, to };
}

/** Build a resolver bound to a clock. Production passes `Date.now`. */
export function resolvePeriod(clock: () => number = Date.now) {
  return function resolve(p: Period): ResolvedPeriod {
    if (!(p in LASTFM_BY_PERIOD)) {
      throw new Error(`unknown period: ${String(p)}`);
    }
    if (p === 'overall') {
      return {
        lastfm: LASTFM_BY_PERIOD[p],
        to: Math.floor(clock() / 1000),
        label: LABEL_BY_PERIOD[p],
      };
    }
    const w = periodToWindow(p, clock());
    return {
      lastfm: LASTFM_BY_PERIOD[p],
      from: w.from,
      to: w.to,
      label: LABEL_BY_PERIOD[p],
    };
  };
}
