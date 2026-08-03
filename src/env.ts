import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { config as dotenvConfig } from 'dotenv';

/**
 * Default search order for the credentials file, evaluated lazily:
 *   1. `$LASTFM_CLI_ENV_FILE` (absolute path, if set)
 *   2. `./.env` in the current working directory (dotenv convention)
 *   3. `~/.lastfm-cli/.env` (project-scoped home fallback)
 */
const DEFAULT_PATHS = [
  path.join(process.cwd(), '.env'),
  path.join(os.homedir(), '.lastfm-cli', '.env'),
];

/** Resolve which env file to use. First existing file wins (after the override). */
function resolveEnvFile(): string {
  if (process.env.LASTFM_CLI_ENV_FILE) {
    return path.resolve(process.env.LASTFM_CLI_ENV_FILE);
  }
  for (const p of DEFAULT_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return DEFAULT_PATHS[0];
}

/** Resolved env file path. Re-evaluated on each access so cwd changes are honoured. */
export function getEnvFile(): string {
  return resolveEnvFile();
}

/**
 * Parse a `.env`-format file using the `dotenv` library, which implements the
 * standard spec (KEY=value, comments, quotes, escape sequences, multi-line
 * values, `$VAR` / `${VAR}` interpolation, `export` prefix).
 *
 * Returns an empty object if the file is missing or unreadable.
 */
export function parseEnvFile(filePath: string): Record<string, string> {
  const result = dotenvConfig({ path: filePath, quiet: true });
  if (result.error) return {};
  return (result.parsed as Record<string, string>) ?? {};
}

/**
 * Load credentials into process.env without overriding already-set vars
 * (so explicit `LASTFM_*=...` from the shell wins over the file).
 */
export function loadCredentials(): { fileExists: boolean; fileVars: Record<string, string> } {
  const filePath = resolveEnvFile();
  const fileExists = fs.existsSync(filePath);
  const fileVars = parseEnvFile(filePath);
  for (const [k, v] of Object.entries(fileVars)) {
    if (!(k in process.env)) process.env[k] = v;
  }
  return { fileExists, fileVars };
}

/** Default Last.fm API endpoint, used when LASTFM_BASE_URL is not set. */
export const DEFAULT_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

/**
 * Backwards-compatible export of the env file path. Returns the cwd `./.env`
 * even if it does not exist (so `lastfm config` can report the intended path).
 */
export const ENV_FILE = resolveEnvFile();