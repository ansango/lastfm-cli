#!/usr/bin/env node
/**
 * @ansango/lastfm-cli - CLI for the Last.fm API, built on lastfm-client-ts.
 * Read-only by default. Loads credentials from a standard .env file via
 * dotenv (search order: $LASTFM_CLI_ENV_FILE > ./env > ~/.lastfm-cli/.env).
 */

import { LastFmApiError } from 'lastfm-client-ts';
import { loadCredentials } from './env.js';
import { makeClient } from './client.js';
import { callMethod, listMethods, parseJsonArg, parseKVArgs } from './dispatch.js';
import { configReport, generalHelp, methodHelp, namespaceHelp } from './help.js';
import {
  formatAll,
  formatMethodMarkdown,
  formatMethodText,
  formatNamespaceMarkdown,
  formatNamespaceText,
  formatNamespacesMarkdown,
  formatNamespacesText,
  getMethodSpec,
  NAMESPACES_SPEC,
} from './man.js';
import { EXIT, NAMESPACES } from './methods.js';

async function main(): Promise<void> {
  loadCredentials();
  const argv = process.argv.slice(2);
  const [first, second] = argv;
  const rest = argv.slice(2);

  try {
    if (!first || first === '-h' || first === '--help') {
      process.stdout.write(generalHelp() + '\n');
      return;
    }

    if (first === 'help') {
      if (!second) {
        process.stdout.write(generalHelp() + '\n');
        return;
      }
      const [ns, method] = second.split('.');
      if (method) {
        process.stdout.write(methodHelp(ns, method) + '\n');
      } else if ((NAMESPACES as readonly string[]).includes(ns)) {
        process.stdout.write(namespaceHelp(ns) + '\n');
      } else {
        throw new Error(`Unknown target "${second}". Try: lastfm help artist.getInfo`);
      }
      return;
    }

    if (first === 'config') {
      process.stdout.write(JSON.stringify(configReport(), null, 2) + '\n');
      return;
    }

    if (first === 'methods') {
      const client = makeClient();
      process.stdout.write(JSON.stringify(listMethods(client, second), null, 2) + '\n');
      return;
    }

    if (first === 'man') {
      handleMan(argv.slice(1));
      return;
    }

    if (!second) {
      process.stderr.write(`ERROR: missing method. Try: lastfm ${first} <method> ...\n`);
      process.exit(EXIT.GENERIC);
    }

    const ns = first;
    const method = second;
    const client = makeClient();
    const args = parseJsonArg(rest) ?? parseKVArgs(rest);
    const result = await callMethod(client, ns, method, args);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`ERROR: ${msg}\n`);
    if (process.env.DEBUG && e instanceof Error && e.stack) process.stderr.write(e.stack + '\n');
    if (e instanceof LastFmApiError) {
      process.exit(EXIT.API_ERROR);
    }
    process.exit(EXIT.GENERIC);
  }
}

main();

/**
 * Dispatch `lastfm man ...` requests. Supports:
 *   lastfm man                  → list all namespaces
 *   lastfm man <namespace>      → list methods in a namespace
 *   lastfm man <ns>.<method>    → full reference (parameters + example)
 * Flags anywhere in the rest array:
 *   --markdown / -m   → emit markdown instead of plain text
 *   --all / -a        → dump every method on one document
 */
function handleMan(rest: string[]): void {
  const asMarkdown = rest.includes('--markdown') || rest.includes('-m');
  const allFlag = rest.includes('--all') || rest.includes('-a');
  const target = rest.filter((r) => !r.startsWith('-'))[0];

  if (allFlag) {
    process.stdout.write(formatAll(asMarkdown) + '\n');
    return;
  }

  if (!target) {
    process.stdout.write((asMarkdown ? formatNamespacesMarkdown() : formatNamespacesText()) + '\n');
    return;
  }

  const looked = getMethodSpec(target);
  if (looked) {
    process.stdout.write(
      (asMarkdown ? formatMethodMarkdown(looked.ns, looked.method) : formatMethodText(looked.ns, looked.method)) +
        '\n',
    );
    return;
  }

  if ((NAMESPACES as readonly string[]).includes(target)) {
    process.stdout.write(
      (asMarkdown ? formatNamespaceMarkdown(target) : formatNamespaceText(target)) + '\n',
    );
    return;
  }

  if (NAMESPACES_SPEC[target]) {
    // Defensive: should be unreachable given NAMESPACES check above.
    process.stdout.write(
      (asMarkdown ? formatNamespaceMarkdown(target) : formatNamespaceText(target)) + '\n',
    );
    return;
  }

  process.stderr.write(
    `ERROR: unknown man target "${target}". Try: lastfm man, lastfm man artist, lastfm man artist.getInfo\n`,
  );
  process.exit(EXIT.GENERIC);
}