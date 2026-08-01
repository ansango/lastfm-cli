import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Path to the credentials file. Follows the Hermes ~/.hermes/.env.* convention. */
export const ENV_FILE = path.join(os.homedir(), '.hermes', '.env.lastfm');

/** Default Last.fm API endpoint, used when LASTFM_BASE_URL is not set. */
export const DEFAULT_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

/** Parse a simple KEY=value file into an object. Strips surrounding quotes. */
export function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Load ~/.hermes/.env.lastfm into process.env without overriding
 * already-set env vars (so explicit `LASTFM_*=...` from the shell wins).
 */
export function loadCredentials(): { fileExists: boolean; fileVars: Record<string, string> } {
  const fileVars = parseEnvFile(ENV_FILE);
  for (const [k, v] of Object.entries(fileVars)) {
    if (!(k in process.env)) process.env[k] = v;
  }
  return { fileExists: fs.existsSync(ENV_FILE), fileVars };
}