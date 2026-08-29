/**
 * reports milestones — Historical milestone achievements & projected date for next milestone.
 *
 * Usage:
 *   lastfm reports milestones --user NAME [--targets 1000,5000,10000] [--sample-limit N] [--format markdown|json]
 */
import { makeClient } from '../../client.js';
import { renderMilestonesMarkdown } from '../lib/render.js';
import { flag, parseFlags } from '../../insights/lib/args.js';

const USAGE =
  'lastfm reports milestones --user NAME [--targets 1000,5000,10000] [--sample-limit N] [--format markdown|json]';

export async function run(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    targets: flag.string({ default: '' }),
    'sample-limit': flag.number({ default: 1000 }),
    format: flag.enum(['markdown', 'json'], { default: 'markdown', aliases: ['-f'] }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const targetsStr = values['targets'] as string;
  const targets = targetsStr
    ? targetsStr
        .split(',')
        .map((t) => Number(t.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    : undefined;

  const sampleLimit = values['sample-limit'] as number;

  const client = makeClient();
  const report = await client.reports.getMilestones({
    user,
    targets,
    sampleLimit,
  });

  if ((values['format'] as string) === 'json') {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(renderMilestonesMarkdown(report) + '\n');
  }
}
