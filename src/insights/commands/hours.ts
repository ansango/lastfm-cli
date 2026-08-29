/**
 * insights hours — bucket the user's recent scrobbles by hour & weekday.
 *
 * Defaults to the last 30 days. Uses `client.insights.getHoursHistogram`.
 *
 * Usage:
 *   lastfm insights hours --user NAME [--since 30d|7d|90d|365d] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsHoursResponse } from '@ansango/lastfm-api/insights';

const USAGE =
  'lastfm insights hours --user NAME [--since 30d|7d|90d|365d] [--format json|markdown]';

const WEEKDAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function renderHistogramMarkdown(h: InsightsHoursResponse, user: string, sinceDays: number): string {
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
  const hourEntries = h.byHour
    .map((count, hour) => ({ hour, count }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  for (const { hour, count } of hourEntries) {
    const bar = '█'.repeat(Math.max(1, Math.round((count / h.peakHourCount) * 10)));
    lines.push(`\`${String(hour).padStart(2, '0')}:00\` ${bar} ${count}`);
  }
  lines.push('');

  lines.push('## Por día de la semana');
  const maxWd = Math.max(...h.byWeekday);
  for (let i = 0; i < 7; i++) {
    const count = h.byWeekday[i] ?? 0;
    const label = WEEKDAY_LABELS[i] ?? '';
    const bar = maxWd > 0 ? '█'.repeat(Math.max(count > 0 ? 1 : 0, Math.round((count / maxWd) * 10))) : '';
    lines.push(`\`${label.padEnd(10, ' ')}\` ${bar} ${count}`);
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
  const client = makeClient();
  const histogram = await client.insights.getHoursHistogram({
    user,
    sinceDays,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(histogram, null, 2) + '\n');
  } else {
    process.stdout.write(renderHistogramMarkdown(histogram, user, sinceDays));
  }
}
