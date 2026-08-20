/**
 * insights hours — bucket the user's recent scrobbles by hour & weekday.
 *
 * Defaults to the last 30 days. Uses `from`/`to` on `user.getRecentTracks`
 * to scope the window. The Last.fm API caps recenttracks at 200 per page
 * (limit=200 max); for windows longer than ~weeks you may need to paginate.
 *
 * Usage:
 *   lastfm insights hours --user NAME [--since 30d|7d|90d|365d] [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { buildHourHistogram } from '../lib/hours.js';
import { WEEKDAY_LABELS } from '../lib/hours.js';
import { flag, parseFlags } from '../lib/args.js';

const USAGE =
  'lastfm insights hours --user NAME [--since 30d|7d|90d|365d] [--format json|markdown]';

async function fetchAllTimestamps(
  user: string,
  from: number,
  to: number,
): Promise<number[]> {
  const stamps: number[] = [];
  let page = 1;
  const MAX_PAGES = 50;
  while (page <= MAX_PAGES) {
    const raw = (await callLastfm('user.getRecentTracks', {
      user, from, to, limit: 200, page,
    })) as { recenttracks?: { track?: Array<{ date?: { uts?: string } }> } };
    const tracks = raw?.recenttracks?.track ?? [];
    for (const t of tracks) {
      const uts = t.date?.uts;
      if (uts) stamps.push(Number(uts));
    }
    if (tracks.length < 200) break;
    page++;
  }
  return stamps;
}

function renderHistogramMarkdown(h: ReturnType<typeof buildHourHistogram>, user: string, sinceDays: number): string {
  const lines: string[] = [];
  lines.push(`# Patrón de escucha de ${user} — últimos ${sinceDays} días`);
  lines.push('');
  lines.push(`**Total de scrobbles en la ventana:** ${h.total.toLocaleString('es-ES')}`);
  lines.push('');
  if (h.total === 0) {
    lines.push('_Sin datos en esta ventana._');
    return lines.join('\n').trimEnd() + '\n';
  }

  if (h.peakHour !== null) {
    lines.push(`**Hora pico:** las ${String(h.peakHour).padStart(2, '0')}:00 (${h.peakHourCount} scrobbles)`);
  }
  if (h.peakWeekday !== null && h.peakWeekdayLabel) {
    lines.push(`**Día pico:** ${h.peakWeekdayLabel} (${h.peakWeekdayCount} scrobbles)`);
  }
  lines.push('');

  lines.push('## Horas más activas');
  const hourEntries = h.byHour.map((count, hour) => ({ hour, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  for (const { hour, count } of hourEntries) {
    const bar = '█'.repeat(Math.max(1, Math.round((count / h.peakHourCount!) * 10)));
    lines.push(`\`${String(hour).padStart(2, '0')}:00\` ${bar} ${count}`);
  }
  lines.push('');

  lines.push('## Por día de la semana');
  const maxWd = Math.max(...h.byWeekday);
  for (let i = 0; i < 7; i++) {
    const count = h.byWeekday[i]!;
    const bar = maxWd > 0 ? '█'.repeat(Math.max(count > 0 ? 1 : 0, Math.round((count / maxWd) * 10))) : '';
    lines.push(`\`${WEEKDAY_LABELS.es[i]!.padEnd(10, ' ')}\` ${bar} ${count}`);
  }
  lines.push('');

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    since: flag.days({ default: 30, aliases: ['-s'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const sinceDays = values['since'] as number;
  const to = Math.floor(Date.now() / 1000);
  const from = to - sinceDays * 24 * 60 * 60;

  const stamps = await fetchAllTimestamps(user, from, to);
  const histogram = buildHourHistogram(stamps);

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(histogram, null, 2) + '\n');
  } else {
    process.stdout.write(renderHistogramMarkdown(histogram, user, sinceDays));
  }
}
