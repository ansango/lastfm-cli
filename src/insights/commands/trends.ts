/**
 * insights trends — diff your top artists/tracks between two periods.
 *
 * Usage:
 *   lastfm insights trends --user NAME [--now weekly|monthly] [--compare weekly|monthly]
 *                          [--kind artist|track] [--limit 10] [--format json|markdown]
 *
 * Examples:
 *   lastfm insights trends --user ansango --now weekly --compare monthly
 *   lastfm insights trends --user ansango --now monthly --compare 3month --kind track
 *
 * Mapping: weekly→7day, monthly→1month, 3month→3month.
 */
import { callLastfm } from '../lib/cli.js';
import { diffRankings, type Ranked } from '../lib/trends.js';
import { periodToLastfm } from '../lib/periods.js';
import { flag, parseFlags } from '../lib/args.js';

type PeriodArg = 'weekly' | 'monthly' | '3month' | '6month' | '12month';

const USAGE =
  'lastfm insights trends --user NAME [--now weekly|monthly] [--compare weekly|monthly] ' +
  '[--kind artist|track] [--limit 10] [--format json|markdown]';

function argToLastfm(arg: PeriodArg): string {
  if (arg === 'weekly') return periodToLastfm('weekly');
  if (arg === 'monthly') return periodToLastfm('monthly');
  if (arg === '3month') return '3month';
  if (arg === '6month') return '6month';
  return '12month';
}

async function fetchTop(
  user: string,
  kind: 'artist' | 'track',
  period: string,
  limit: number,
): Promise<Ranked[]> {
  const method = kind === 'artist' ? 'user.getTopArtists' : 'user.getTopTracks';
  const wrapper = kind === 'artist' ? 'topartists' : 'toptracks';
  const itemKey = kind === 'artist' ? 'artist' : 'track';
  const raw = (await callLastfm(method, { user, period, limit })) as Record<string, Record<string, unknown[]>>;
  const arr = raw?.[wrapper]?.[itemKey];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x: unknown) => {
      const obj = x as { name?: unknown; playcount?: unknown };
      if (typeof obj.name !== 'string' || obj.name.length === 0) return null;
      const pc = Number(obj.playcount ?? 0);
      return { name: obj.name, playcount: pc };
    })
    .filter((x): x is Ranked => x !== null);
}

function renderMarkdown(
  diff: ReturnType<typeof diffRankings>,
  user: string,
  now: string,
  compare: string,
  kind: 'artist' | 'track',
): string {
  const lines: string[] = [];
  lines.push(`# Tendencias de ${user} — ${kind}s (${now} vs ${compare})`);
  lines.push('');

  if (diff.risers.length > 0) {
    lines.push(`## Subiendo (${diff.risers.length})`);
    for (const r of diff.risers) {
      const arrow = r.deltaRank > 0 ? `↑${r.deltaRank}` : '↑';
      lines.push(`- **${r.name}** — ahora ${r.playcount} plays (${arrow} en rank)`);
    }
    lines.push('');
  }

  if (diff.fallers.length > 0) {
    lines.push(`## Bajando (${diff.fallers.length})`);
    for (const f of diff.fallers) {
      const arrow = f.deltaRank < 0 ? `↓${Math.abs(f.deltaRank)}` : '↓';
      lines.push(`- **${f.name}** — ahora ${f.playcount} plays (${arrow} en rank)`);
    }
    lines.push('');
  }

  if (diff.newcomers.length > 0) {
    lines.push(`## Nuevos (${diff.newcomers.length})`);
    for (const n of diff.newcomers) {
      lines.push(`- **${n.name}** — ${n.playcount} plays (entra directo al top)`);
    }
    lines.push('');
  }

  if (diff.departures.length > 0) {
    lines.push(`## Desaparecen (${diff.departures.length})`);
    for (const d of diff.departures) {
      lines.push(`- ~~${d.name}~~ (tenía ${d.playcount} plays en el período anterior)`);
    }
    lines.push('');
  }

  if (
    diff.risers.length === 0 &&
    diff.fallers.length === 0 &&
    diff.newcomers.length === 0 &&
    diff.departures.length === 0
  ) {
    lines.push('_Sin cambios significativos entre los dos períodos._');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    now: flag.string({ default: 'weekly', aliases: ['-n'] }),
    compare: flag.string({ default: 'monthly', aliases: ['-c'] }),
    kind: flag.enum(['artist', 'track'], { default: 'artist', aliases: ['-k'] }),
    limit: flag.number({ default: 10, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const kind = values['kind'] as 'artist' | 'track';
  const limit = values['limit'] as number;
  const nowArg = values['now'] as PeriodArg;
  const compareArg = values['compare'] as PeriodArg;
  const nowLastfm = argToLastfm(nowArg);
  const compareLastfm = argToLastfm(compareArg);

  const [current, previous] = await Promise.all([
    fetchTop(user, kind, nowLastfm, 30),
    fetchTop(user, kind, compareLastfm, 30),
  ]);

  const diff = diffRankings(current, previous, { maxResults: limit });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(diff, null, 2) + '\n');
  } else {
    process.stdout.write(renderMarkdown(diff, user, nowArg, compareArg, kind));
  }
}
