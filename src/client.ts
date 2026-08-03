import { LastFmClient } from '@ansango/lastfm-api';
import { DEFAULT_BASE_URL, ENV_FILE } from './env.js';
import { EXIT } from './methods.js';

/** Subset of LastFmConfig that this CLI uses. */
export interface CliConfig {
  apiKey: string;
  baseUrl: string;
}

/** Resolve config from env. Exits 2 with an actionable message if apiKey missing. */
export function requireConfig(): CliConfig {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    process.stderr.write(
      [
        `ERROR: LASTFM_API_KEY is not set.`,
        ``,
        `Create the credentials file at ${ENV_FILE} with:`,
        `  LASTFM_API_KEY=your_api_key`,
        ``,
        `Get an API key at https://www.last.fm/api/account/create`,
      ].join('\n') + '\n',
    );
    process.exit(EXIT.NO_CREDS);
  }
  return {
    apiKey,
    baseUrl: process.env.LASTFM_BASE_URL || DEFAULT_BASE_URL,
  };
}

/** Instantiate a LastFmClient with the resolved config. */
export function makeClient(): LastFmClient {
  return new LastFmClient(requireConfig());
}
