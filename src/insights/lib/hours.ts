/**
 * hours.ts — bucket recent scrobbles by hour-of-day and weekday.
 *
 * Pure: takes UNIX-second timestamps, returns two histograms plus the peaks.
 * Weekday indexing follows the user's locale convention (Mon=0..Sun=6).
 *
 * Why Intl.DateTimeFormat? Because the user's locale controls which day is
 * "weekday 0". We default to en-US (weekStartsOn: Monday), matching the way
 * most Spanish-speaking users reason about weeks.
 */
const WEEKDAY_LABELS_ES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;
const WEEKDAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export interface Bucket {
  /** Hour of the day in 24h format, 0–23 (UTC). */
  readonly hour: number;
  /** Day of the week, 0 = Monday … 6 = Sunday. */
  readonly weekday: number;
}

/**
 * Convert a UNIX-seconds timestamp to (hour, weekday) using the configured
 * locale. `en-US` has weekStartsOn=Monday so output aligns with the labels.
 */
export function bucketTimestamp(unixSeconds: number, locale: string = 'en-US'): Bucket {
  const date = new Date(unixSeconds * 1000);
  const hour = date.getUTCHours();
  // Map JS getUTCDay() (Sun=0..Sat=6) to Mon=0..Sun=6.
  const jsDow = date.getUTCDay();
  const weekday = (jsDow + 6) % 7;
  // We keep `locale` parameter for future expansion (e.g. respecting local
  // time zones via `timeZone` option); for now it only affects nothing
  // because we always bucket in UTC. Documented for callers.
  void locale;
  return { hour, weekday };
}

export interface HourHistogram {
  readonly total: number;
  /** Counts per hour, index = hour (0..23). Length always 24. */
  readonly byHour: number[];
  /** Counts per weekday, index = Mon(0)..Sun(6). Length always 7. */
  readonly byWeekday: number[];
  /** Hour with the highest count, or null when total === 0. */
  readonly peakHour: number | null;
  readonly peakHourCount: number;
  readonly peakWeekday: number | null;
  readonly peakWeekdayCount: number;
  readonly peakWeekdayLabel: string | null;
}

function indexOfMax(arr: readonly number[]): number | null {
  if (arr.length === 0) return null;
  let maxIdx = 0;
  let maxVal = arr[0]!;
  for (let i = 1; i < arr.length; i++) {
    if (arr[i]! > maxVal) {
      maxVal = arr[i]!;
      maxIdx = i;
    }
  }
  return maxVal > 0 ? maxIdx : null;
}

export function buildHourHistogram(timestamps: readonly number[]): HourHistogram {
  const byHour = new Array<number>(24).fill(0);
  const byWeekday = new Array<number>(7).fill(0);
  for (const ts of timestamps) {
    const b = bucketTimestamp(ts);
    byHour[b.hour] = (byHour[b.hour] ?? 0) + 1;
    byWeekday[b.weekday] = (byWeekday[b.weekday] ?? 0) + 1;
  }
  const total = timestamps.length;
  const peakHourIdx = indexOfMax(byHour);
  const peakWeekdayIdx = indexOfMax(byWeekday);
  return {
    total,
    byHour,
    byWeekday,
    peakHour: peakHourIdx,
    peakHourCount: peakHourIdx !== null ? byHour[peakHourIdx]! : 0,
    peakWeekday: peakWeekdayIdx,
    peakWeekdayCount: peakWeekdayIdx !== null ? byWeekday[peakWeekdayIdx]! : 0,
    peakWeekdayLabel: peakWeekdayIdx !== null ? WEEKDAY_LABELS_ES[peakWeekdayIdx]! : null,
  };
}

export const WEEKDAY_LABELS = {
  es: WEEKDAY_LABELS_ES,
  en: WEEKDAY_LABELS_EN,
} as const;
