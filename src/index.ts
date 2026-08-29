#!/usr/bin/env node
/**
 * @ansango/lastfm-cli - CLI for the Last.fm API, built on @ansango/lastfm-api.
 * Read-only by default. Loads credentials from a standard .env file via
 * dotenv (search order: $LASTFM_CLI_ENV_FILE > ./env > ~/.lastfm-cli/.env).
 */

import { readFileSync } from 'node:fs';
import { LastFmApiError } from '@ansango/lastfm-api';
import { runAuthGetSession, runAuthGetToken } from './auth.js';
import { loadCredentials } from './env.js';
import { rephraseSessionKeyError } from './session-key-error.js';
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
import { handleInsights } from './insights/dispatcher.js';
import { EXIT, NAMESPACES } from './methods.js';

export function getCliVersion(): string {
  try {
    const pkgUrl = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(pkgUrl, 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.6.1';
  }
}

async function main(): Promise<void> {
  loadCredentials();
  const argv = process.argv.slice(2);
  const [first, second] = argv;
  const rest = argv.slice(2);

  try {
    if (first === '-v' || first === '--version' || first === 'version') {
      process.stdout.write(`@ansango/lastfm-cli v${getCliVersion()}\n`);
      return;
    }

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

    if (first === 'insights') {
      await handleInsights(argv.slice(1));
      return;
    }

    if (!second) {
      process.stderr.write(`ERROR: missing method. Try: lastfm ${first} <method> ...\n`);
      process.exit(EXIT.GENERIC);
    }

    const ns = first;
    const method = second;

    // The `auth.*` commands have a non-JSON output shape (eval-friendly
    // export lines, human-readable URL banner). Handle them here before
    // the generic callMethod path so the JSON formatter never touches
    // them. See src/auth.ts for the per-command behaviour.
    if (ns === 'auth') {
      const client = makeClient();
      if (method === 'getToken') {
        process.stdout.write(`${await runAuthGetToken(client)}\n`);
        return;
      }
      if (method === 'getSession') {
        const asExport = rest.includes('--export');
        const useCallback = rest.includes('--callback');
        // The flag set depends on whether --callback is present. Without it,
        // only --export is allowed. With it, --port and --timeout are also
        // accepted.
        const knownFlags = useCallback
          ? new Set(['--export', '--callback', '--port=', '--timeout='])
          : new Set(['--export']);
        for (const arg of rest) {
          if (arg.startsWith('--') && !knownFlags.has(arg) && !arg.startsWith('--port=') && !arg.startsWith('--timeout=')) {
            throw new Error(
              useCallback
                ? `Unknown flag "${arg}". auth.getSession accepts --export, --callback, --port=<port>, --timeout=<seconds>.`
                : `Unknown flag "${arg}". auth.getSession accepts only --export (and --callback / --port / --timeout with the callback flow).`,
            );
          }
        }
        // Parse the optional port / timeout. Default port: 0 (auto-pick).
        // Default timeout: 120s. Both are only meaningful with --callback.
        let callbackPort = 0;
        let callbackTimeoutMs = 120_000;
        if (useCallback) {
          const portArg = rest.find((a) => a.startsWith('--port='));
          if (portArg) {
            const parsed = Number.parseInt(portArg.slice('--port='.length), 10);
            if (!Number.isInteger(parsed) || parsed < 0) {
              throw new Error(`--port must be a non-negative integer (got "${portArg}").`);
            }
            callbackPort = parsed;
          }
          const timeoutArg = rest.find((a) => a.startsWith('--timeout='));
          if (timeoutArg) {
            const parsedSec = Number.parseInt(timeoutArg.slice('--timeout='.length), 10);
            if (!Number.isInteger(parsedSec) || parsedSec <= 0) {
              throw new Error(`--timeout must be a positive integer in seconds (got "${timeoutArg}").`);
            }
            callbackTimeoutMs = parsedSec * 1000;
          }
        }
        const tokenArg = rest.find((a) => a.startsWith('token='));
        const token = tokenArg ? tokenArg.slice('token='.length) : '';
        process.stdout.write(
          `${await runAuthGetSession(client, token, {
            export: asExport,
            callback: useCallback ? { port: callbackPort, timeoutMs: callbackTimeoutMs } : undefined,
          })}\n`,
        );
        return;
      }
      throw new Error(
        `Unknown auth method "${method}". Available: auth.getToken, auth.getSession`,
      );
    }

    const client = makeClient();
    const args = parseJsonArg(rest) ?? parseKVArgs(rest);
    const result = await callMethod(client, ns, method, args);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    return;
  } catch (e) {
    const rephrased = rephraseSessionKeyError(e, first, second);
    const msg = rephrased ?? (e instanceof Error ? e.message : String(e));
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
