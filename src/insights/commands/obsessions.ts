/**
 * insights obsessions — detect temporal obsession episodes where a single artist heavily dominates.
 *
 * Usage:
 *   lastfm insights obsessions --user NAME [--window 20] [--threshold 0.35] [--format json|markdown]
 */
import { makeClient } from '../../client.js';
import { flag, parseFlags } from '../lib/args.js';
import type { InsightsObsessionsResponse } from '@ansango/lastfm-api/insights';

const USAGE = 'lastfm insights obsessions --user NAME [--window 20] [--threshold 0.35] [--format json|markdown]';

function renderObsessionsMarkdown(res: InsightsObsessionsResponse): string {
  const lines: string[] = [];
  lines.push(`# Listening Obsessions for ${res.user}`);
  lines.push('');
  lines.push(`**Obsession Episodes Detected:** ${res.obsessions.length}`);
  if (res.mostObsessiveArtist) {
    lines.push(`**Most Obsessive Artist:** ${res.mostObsessiveArtist}`);
  }
  lines.push(`_Total scrobbles inspected: ${res.totalScrobblesInspected.toLocaleString('en-US')}_`);
  lines.push('');
  if (res.obsessions.length === 0) {
    lines.push('_No hyper-fixation episodes detected with these threshold parameters._');
    return lines.join('\n').trimEnd() + '\n';
  }
  lines.push('## Fixation Episodes');
  for (const o of res.obsessions) {
    const pct = (o.density * 100).toFixed(0);
    const target = o.track ? `${o.artist} — ${o.track}` : o.artist;
    const start = new Date(o.startTime * 1000).toISOString().slice(0, 10);
    lines.push(`- **${target}** — ${o.scrobbles} plays (${pct}% of ${o.totalInWindow}-track window on ${start})`);
  }
  lines.push('');
  return lines.join('\n').trimEnd() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    window: flag.number({ default: 20, aliases: ['-w'] }),
    threshold: flag.number({ default: 0.35, aliases: ['-t'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown', aliases: ['-f'] }),
  });
  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }
  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const client = makeClient();
  const res = await client.insights.getObsessions({
    user,
    windowSize: values['window'] as number,
    thresholdRatio: values['threshold'] as number,
  });

  const format = values['format'] as 'json' | 'markdown';
  if (format === 'json') {
    process.stdout.write(JSON.stringify(res, null, 2) + '\n');
  } else {
    process.stdout.write(renderObsessionsMarkdown(res));
  }
}
