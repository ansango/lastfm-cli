/**
 * dispatcher.ts — Subcommand router for `lastfm exporter <subcommand>` (or `lastfm export <subcommand>`).
 */
import { EXIT } from '../methods.js';
import { run as runScrobbles } from './commands/scrobbles.js';
import { run as runLoved } from './commands/loved.js';
import { run as runLibrary } from './commands/library.js';

export const EXPORTER_COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  scrobbles: runScrobbles,
  loved: runLoved,
  library: runLibrary,
};

const HELP = `lastfm exporter — high-fidelity bulk exporter for scrobbles, loved tracks, and libraries.

Usage:
  lastfm exporter <subcommand> [flags]
  lastfm export <subcommand> [flags]

Subcommands:
  scrobbles        export scrobble history (JSON, JSONL, CSV, ListenBrainz format)
  loved            export loved tracks list (JSON, CSV format)
  library          export artist library with playcounts (JSON, CSV format)

Run \`lastfm exporter <subcommand> --help\` for flags.
`;

export async function handleExporter(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;
  if (!sub || sub === '--help' || sub === '-h') {
    process.stdout.write(HELP);
    return;
  }
  const handler = EXPORTER_COMMANDS[sub];
  if (!handler) {
    process.stderr.write(
      `ERROR: unknown exporter subcommand "${sub}". Available: ${Object.keys(EXPORTER_COMMANDS).join(', ')}\n`,
    );
    process.exit(EXIT.GENERIC);
  }
  await handler(rest);
}
