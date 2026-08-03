import { LastFmClient } from '@ansango/lastfm-api';
import { BLOCKED_METHODS, NAMESPACES, type Namespace } from './methods.js';

/** Parse CLI-style `key=value` args into a plain object. */
export function parseKVArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    if (arg === '--json') continue;
    if (arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq === -1) {
      throw new Error(
        `Bad argument "${arg}". Expected key=value, or use --json '{...}' for structured input.`,
      );
    }
    out[arg.slice(0, eq)] = arg.slice(eq + 1);
  }
  return out;
}

/** Pick up a `--json '{...}'` payload if present. */
export function parseJsonArg(argv: string[]): Record<string, unknown> | null {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') {
      const payload = argv[i + 1];
      if (payload === undefined) {
        throw new Error('--json flag requires a JSON string argument');
      }
      try {
        return JSON.parse(payload);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Invalid JSON after --json: ${msg}`);
      }
    }
  }
  return null;
}

/** List methods on a service instance, filtering out blocked ones. */
export function publicMethods(service: Record<string, unknown>): string[] {
  return Object.keys(service)
    .filter((k) => typeof service[k] === 'function' && !BLOCKED_METHODS.has(k))
    .sort();
}

/** Introspect method names on a client, optionally for one namespace. */
export function listMethods(
  client: LastFmClient,
  ns?: Namespace | string,
): { namespace?: string; methods?: string[]; namespaces?: Record<string, string[]> } {
  if (ns) {
    if (!NAMESPACES.includes(ns as Namespace)) {
      throw new Error(`Unknown namespace "${ns}". Valid: ${NAMESPACES.join(', ')}`);
    }
    return { namespace: ns, methods: publicMethods(client[ns as Namespace] as unknown as Record<string, unknown>) };
  }
  const all: Record<string, string[]> = {};
  for (const n of NAMESPACES) {
    all[n] = publicMethods(client[n] as unknown as Record<string, unknown>);
  }
  return { namespaces: all };
}

/** Dispatch a method call. Throws on unknown ns/method or blocked write method. */
export async function callMethod(
  client: LastFmClient,
  ns: Namespace | string,
  method: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  if (!NAMESPACES.includes(ns as Namespace)) {
    throw new Error(`Unknown namespace "${ns}". Valid: ${NAMESPACES.join(', ')}`);
  }
  if (BLOCKED_METHODS.has(method)) {
    throw new Error(
      `Method "${ns}.${method}" is an authenticated write operation. This CLI is read-only.`,
    );
  }
  const service = client[ns as Namespace] as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>;
  const fn = service[method];
  if (typeof fn !== 'function') {
    const available = publicMethods(service as unknown as Record<string, unknown>);
    throw new Error(
      `Unknown method "${ns}.${method}". Available in '${ns}': ${available.join(', ')}`,
    );
  }
  return await fn(args);
}
