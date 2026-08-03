import { LastFmClient } from 'lastfm-client-ts';
import { NAMESPACES } from './methods.js';
import { ENV_FILE } from './env.js';
import { makeClient } from './client.js';
import { publicMethods } from './dispatch.js';

export function generalHelp(): string {
  return [
    `lastfm - Last.fm CLI (lastfm-client-ts v3.x)`,
    ``,
    `Usage:`,
    `  lastfm <namespace> <method> [key=value ...]`,
    `  lastfm <namespace> <method> --json '{...}'`,
    `  lastfm man [namespace | namespace.method] [--markdown] [--all]`,
    `  lastfm methods [namespace]`,
    `  lastfm help [namespace.method]`,
    `  lastfm config`,
    ``,
    `Namespaces: ${NAMESPACES.join(', ')}`,
    ``,
    `Examples:`,
    `  lastfm artist getInfo artist=Radiohead`,
    `  lastfm artist getSimilar artist=Radiohead limit=10`,
    `  lastfm album search album="OK Computer" limit=5`,
    `  lastfm album getInfo artist=Radiohead album="OK Computer"`,
    `  lastfm user getTopArtists user=ansango period=7day limit=20`,
    `  lastfm user getRecentTracks user=ansango limit=10`,
    `  lastfm chart getTopArtists`,
    `  lastfm geo getTopTracks country=spain limit=10`,
    ``,
    `For parameter docs: lastfm man <namespace>.<method>`,
    `Credentials file: ${ENV_FILE}`,
    `Get API credentials at: https://www.last.fm/api/account/create`,
    ``,
    `Exit codes: 0=ok, 1=generic, 2=missing creds, 3=Last.fm API error.`,
  ].join('\n');
}

export function namespaceHelp(ns: string, client?: LastFmClient): string {
  let methods: string[] = [];
  if (client) {
    methods = publicMethods(client[ns as never] as unknown as Record<string, unknown>);
  } else {
    // Fallback when we can't instantiate the client (e.g. no apiKey).
    const fallback: Record<string, string[]> = {
      user: ['getInfo', 'getFriends', 'getRecentTracks', 'getTopAlbums', 'getTopArtists', 'getTopTags', 'getTopTracks', 'getLovedTracks', 'getWeeklyChartList', 'getWeeklyArtistChart', 'getWeeklyAlbumChart', 'getWeeklyTrackChart'],
      album: ['getInfo', 'getTags', 'getTopTags', 'search'],
      artist: ['getInfo', 'getSimilar', 'getTags', 'getTopAlbums', 'getTopTags', 'getTopTracks', 'search'],
      track: ['getInfo', 'getSimilar', 'getTags', 'getTopTags', 'search'],
      tag: ['getInfo', 'getSimilar', 'getTopArtists', 'getTopAlbums', 'getTopTracks', 'getTopTags', 'getWeeklyChartList'],
      chart: ['getTopArtists', 'getTopTracks', 'getTopTags'],
      geo: ['getTopArtists', 'getTopTracks'],
      library: ['getArtists'],
    };
    methods = fallback[ns] ?? [];
  }
  return [
    `Namespace "${ns}" — methods:`,
    ...methods.map((m) => `  ${ns} ${m}`),
    ``,
    `Run \`lastfm ${ns} <method> key=value\` to call.`,
    `For the input/output schema, see https://www.last.fm/api/show/${ns}.*`,
  ].join('\n');
}

export function methodHelp(ns: string, method: string): string {
  return [
    `Method: ${ns}.${method}`,
    ``,
    `Call with: lastfm ${ns} ${method} key=value ...`,
    `   or:    lastfm ${ns} ${method} --json '{...}'`,
    ``,
    `For authoritative parameter docs, see:`,
    `  https://www.last.fm/api/show/${ns}.${method}`,
  ].join('\n');
}

export interface ConfigReport {
  credentialsFile: string;
  credentialsFileExists: boolean;
  LASTFM_API_KEY: string | null;
  LASTFM_BASE_URL: string | null;
}

export function configReport(): ConfigReport {
  const apiKey = process.env.LASTFM_API_KEY ?? '';
  const mask = (s: string, keep = 4): string | null =>
    !s ? null : `${s.slice(0, keep)}…${s.slice(-keep)} (len=${s.length})`;
  return {
    credentialsFile: ENV_FILE,
    credentialsFileExists: !!process.env.LASTFM_API_KEY,
    LASTFM_API_KEY: mask(apiKey),
    LASTFM_BASE_URL: process.env.LASTFM_BASE_URL ?? null,
  };
}

/** Re-export so callers don't have to import makeClient just to test help. */
export { makeClient };