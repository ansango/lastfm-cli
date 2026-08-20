/**
 * insights mood — derive a mood profile from the user's listening context.
 *
 * Strategy: cross the user's own topTags (often sparse) with the top tags
 * of their top artists. The merged tag bag feeds the pure classifier.
 *
 * Usage:
 *   lastfm insights mood --user NAME [--period weekly] [--top-artists 10]
 *                        [--format json|markdown]
 */
import { callLastfm } from '../lib/cli.js';
import { buildMoodProfile } from '../lib/mood-composer.js';
import type { MoodPeriod } from '../lib/mood-composer.js';
import { flag, parseFlags } from '../lib/args.js';

const USAGE =
  'lastfm insights mood --user NAME [--period weekly] [--top-artists 10] [--format json|markdown]';

function moodBar(v: number): string {
  const pos = Math.round((v + 1) * 5);
  const chars = '·'.repeat(10).split('');
  chars[pos] = '│';
  return chars.join('');
}

function renderMoodMarkdown(
  m: Awaited<ReturnType<typeof buildMoodProfile>>,
  user: string,
  period: MoodPeriod,
): string {
  const lines: string[] = [];
  lines.push(`# Mood musical de ${user} — ${period}`);
  lines.push('');
  lines.push(`**Etiqueta:** ${m.label}`);
  lines.push(`**Confianza:** ${(m.confidence * 100).toFixed(0)}% (${m.tagSourceCount} tags analizados, fuente principal: ${m.primarySource})`);
  lines.push('');
  lines.push('## Ejes');
  lines.push(`Energía   ${moodBar(m.axes.energy)}  ${m.axes.energy.toFixed(2)}  (-1 calmado, +1 intenso)`);
  lines.push(`Valencia  ${moodBar(m.axes.valence)}  ${m.axes.valence.toFixed(2)}  (-1 sombrío, +1 eufórico)`);
  lines.push('');
  if (m.categories.length > 0) {
    lines.push(`**Categorías dominantes:** ${m.categories.slice(0, 5).join(', ')}`);
    lines.push('');
  }
  if (m.confidence < 0.3) {
    lines.push('_Confianza baja: pocas tags reconocidas. Amplía `--top-artists` o añade más tags manualmente en Last.fm._');
  }
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    period: flag.string({ default: 'weekly', aliases: ['-p'] }),
    'top-artists': flag.number({ default: 10 }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const caller = (method: string, params: Record<string, string | number>) =>
    callLastfm(method, params);

  const m = await buildMoodProfile({
    user,
    period: values['period'] as MoodPeriod,
    caller,
    topArtists: values['top-artists'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(m, null, 2) + '\n');
  } else {
    process.stdout.write(renderMoodMarkdown(m, user, values['period'] as MoodPeriod));
  }
}
