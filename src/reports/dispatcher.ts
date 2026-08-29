/**
 * dispatcher.ts — Subcommand router for `lastfm reports <subcommand>`.
 */
import { EXIT } from '../methods.js';
import { run as runWrapped } from './commands/wrapped.js';
import { run as runMilestones } from './commands/milestones.js';
import { run as runMonthly } from './commands/monthly.js';

export const REPORT_COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  wrapped: runWrapped,
  milestones: runMilestones,
  monthly: runMonthly,
  digest: runMonthly,
};

const HELP = `lastfm reports — automated analytical digests, milestones, and year-in-review.

Usage:
  lastfm reports <subcommand> [flags]

Subcommands:
  wrapped          year-in-review / wrapped listening summary, seasonal soundtrack & busy day
  milestones       historical scrobble milestone tracker & projected date for next milestone
  monthly          monthly listening bulletin and comparative growth against previous month

Run \`lastfm reports <subcommand> --help\` for flags.
`;

export async function handleReports(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;
  if (!sub || sub === '--help' || sub === '-h') {
    process.stdout.write(HELP);
    return;
  }
  const handler = REPORT_COMMANDS[sub];
  if (!handler) {
    process.stderr.write(
      `ERROR: unknown reports subcommand "${sub}". Available: ${Object.keys(REPORT_COMMANDS).join(', ')}\n`,
    );
    process.exit(EXIT.GENERIC);
  }
  await handler(rest);
}
