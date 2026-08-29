/**
 * dispatcher.ts — Subcommand router for `lastfm playlists <subcommand>`.
 */
import { EXIT } from '../methods.js';
import { run as runGenerate } from './commands/generate.js';
import { run as runExportM3U } from './commands/export-m3u.js';
import { run as runExportCsv } from './commands/export-csv.js';

export const PLAYLISTS_COMMANDS: Record<string, (argv: string[]) => Promise<void>> = {
  generate: runGenerate,
  'export-m3u': runExportM3U,
  'export-csv': runExportCsv,
};

const HELP = `lastfm playlists — smart algorithmic playlist generation & standard playlist export.

Usage:
  lastfm playlists <subcommand> [flags]

Subcommands:
  generate         generate smart playlists (time-capsule, deep-cuts, heavy-rotation, discovery-radar)
  export-m3u       export track list to M3U format
  export-csv       export track list to CSV format

Run \`lastfm playlists <subcommand> --help\` for flags.
`;

export async function handlePlaylists(argv: string[]): Promise<void> {
  const [sub, ...rest] = argv;
  if (!sub || sub === '--help' || sub === '-h') {
    process.stdout.write(HELP);
    return;
  }
  const handler = PLAYLISTS_COMMANDS[sub];
  if (!handler) {
    process.stderr.write(
      `ERROR: unknown playlists subcommand "${sub}". Available: ${Object.keys(PLAYLISTS_COMMANDS).join(', ')}\n`,
    );
    process.exit(EXIT.GENERIC);
  }
  await handler(rest);
}
