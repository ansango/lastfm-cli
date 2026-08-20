/**
 * insights compare — compare two Last.fm users by their top artists.
 *
 * Usage:
 *   lastfm insights compare --user-a NAME --user-b NAME [--period overall|weekly|monthly|3month|6month|12month]
 *                            [--limit 50] [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { compareArtists, type NamedEntry } from '../lib/compare.js';
import { flag, parseFlags } from '../lib/args.js';

type ComparePeriod = 'overall' | 'weekly' | 'monthly' | '3month' | '6month' | '12month';

const USAGE =
  'lastfm insights compare --user-a NAME --user-b NAME ' +
  '[--period overall|weekly|monthly|3month|6month|12month] [--limit 50] [--format json|markdown]';

async function fetchTop(user: string, period: string, limit: number): Promise<NamedEntry[]> {
  const raw = (await callLastfm('user.getTopArtists', {
    user, period, limit,
  })) as { topartists?: { artist?: Array<{ name?: string; playcount?: string | number }> } };
  return (raw?.topartists?.artist ?? [])
    .map((a) => ({ name: a.name ?? '', playcount: Number(a.playcount ?? 0) }))
    .filter((a) => a.name.length > 0);
}

function renderCompareMarkdown(
  r: ReturnType<typeof compareArtists>,
  a: string, b: string,
): string {
  const lines: string[] = [];
  lines.push(`# ${a} vs ${b}`);
  lines.push('');
  const pct = (r.jaccard * 100).toFixed(1);
  const verdict =
    r.jaccard > 0.6 ? 'gemelos musicales' :
    r.jaccard > 0.3 ? 'mucho en común' :
    r.jaccard > 0.1 ? 'algo de solape' :
                      'mundos distintos';
  lines.push(`**Similitud (Jaccard):** ${pct}% — ${verdict}`);
  lines.push('');
  lines.push(`- Top artistas de **${a}**: ${r.aCount}`);
  lines.push(`- Top artistas de **${b}**: ${r.bCount}`);
  lines.push(`- En común: **${r.intersection.length}**`);
  lines.push(`- Solo en ${a}: ${r.onlyA.length} · solo en ${b}: ${r.onlyB.length}`);
  lines.push('');
  if (r.rankedIntersection.length > 0) {
    lines.push('## Artistas en común (top por min plays)');
    const top = r.rankedIntersection.slice(0, 15);
    for (const entry of top) {
      lines.push(`- **${entry.name}** (${entry.playcount} plays)`);
    }
    lines.push('');
  }
  if (r.onlyA.length > 0) {
    lines.push(`## Solo en ${a}`);
    const top = r.onlyA.slice(0, 10);
    for (const name of top) lines.push(`- ${name}`);
    if (r.onlyA.length > 10) lines.push(`- … (+${r.onlyA.length - 10} más)`);
    lines.push('');
  }
  if (r.onlyB.length > 0) {
    lines.push(`## Solo en ${b}`);
    const top = r.onlyB.slice(0, 10);
    for (const name of top) lines.push(`- ${name}`);
    if (r.onlyB.length > 10) lines.push(`- … (+${r.onlyB.length - 10} más)`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    'user-a': flag.string(),
    'user-b': flag.string(),
    period: flag.enum<ComparePeriod>(
      ['overall', 'weekly', 'monthly', '3month', '6month', '12month'],
      { default: 'overall', aliases: ['-p'] },
    ),
    limit: flag.number({ default: 50, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const userA = values['user-a'] as string;
  const userB = values['user-b'] as string;
  if (!userA || !userB) throw new Error('--user-a and --user-b are required');

  const limit = values['limit'] as number;
  const period = values['period'] as ComparePeriod;
  const [a, b] = await Promise.all([
    fetchTop(userA, period, limit),
    fetchTop(userB, period, limit),
  ]);
  const r = compareArtists(a, b);

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
  } else {
    process.stdout.write(renderCompareMarkdown(r, userA, userB));
  }
}
