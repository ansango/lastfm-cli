/**
 * cli.ts — typed wrapper around the @ansango/lastfm-cli binary.
 *
 * Production callers don't pass an `executor`; we use child_process.execFile.
 * Tests inject a fake executor that returns scripted ChildProcess-shaped
 * streams so we can verify argument shaping and error handling without
 * touching the network or the real binary.
 */
import { execFile } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';

/** Minimal subset of execFile's call shape that we actually depend on. */
export type Executor = (
  file: string,
  args: string[],
  options: { timeout?: number; maxBuffer?: number; [key: string]: unknown },
) => ChildProcess;

export interface CallOptions {
  /** Override execFile — only used by tests. */
  readonly executor?: Executor;
  /** Total timeout in ms (default 30s). */
  readonly timeoutMs?: number;
}

export class LastfmCliError extends Error {
  override readonly name = 'LastfmCliError';
  constructor(
    message: string,
    readonly code: number,
    readonly stderr: string,
  ) {
    super(message);
  }
}

const defaultExecutor: Executor = (file, args, options) => {
  // Node's execFile has multiple overloads with strict ExecFileOptions
  // (requires `encoding`/`maxBuffer`/etc). Build a minimal valid object
  // explicitly so TS picks the right overload without complaints.
  const opts: import('node:child_process').ExecFileOptionsWithBufferEncoding = {
    timeout: options.timeout,
    maxBuffer: options.maxBuffer,
    encoding: 'buffer',
  };
  return execFile(file, args, opts);
};

function quoteIfNeeded(value: string): string {
  // Quote anything with whitespace, quotes, or '=' (avoids CLI parser ambiguity).
  if (/[\s"=]/.test(value)) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function serializeArgs(params: Record<string, string | number>): string[] {
  return Object.entries(params).map(([k, v]) => `${k}=${quoteIfNeeded(String(v))}`);
}

async function readStream(stream: NodeJS.ReadableStream | null): Promise<string> {
  if (!stream) return '';
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (c: Buffer | string) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
    );
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', reject);
  });
}

/**
 * Call `lastfm <namespace.method> key=value ...` and return parsed stdout JSON.
 *
 * - `method` is the dotted form: `"user.getInfo"`, `"user.getTopArtists"`.
 * - `params` keys are the CLI's key=value tokens (e.g. `user`, `period`, `limit`).
 * - Values with whitespace are auto-quoted; numerics and `0|1` are passed verbatim.
 * - Throws `LastfmCliError` on non-zero exit or invalid JSON.
 */
export async function callLastfm(
  method: string,
  params: Record<string, string | number>,
  options: CallOptions = {},
): Promise<unknown> {
  // The CLI expects two positional args: namespace and method.
  const dot = method.indexOf('.');
  if (dot <= 0 || dot === method.length - 1) {
    throw new LastfmCliError(
      `method must be in 'namespace.method' form, got: ${method}`,
      1,
      '',
    );
  }
  const ns = method.slice(0, dot);
  const fn = method.slice(dot + 1);
  const args = [ns, fn, ...serializeArgs(params)];
  const exec = options.executor ?? defaultExecutor;
  const child = exec('lastfm', args, { timeout: options.timeoutMs ?? 30_000 });

  const [stdout, stderr, code] = await Promise.all([
    readStream(child.stdout),
    readStream(child.stderr),
    new Promise<number | null>((resolve) => child.on('close', (c) => resolve(c))),
  ]);

  const exitCode = typeof code === 'number' ? code : 0;
  if (exitCode !== 0) {
    throw new LastfmCliError(
      `lastfm ${method} failed (exit ${exitCode}): ${stderr.trim() || '(no stderr)'}`,
      exitCode,
      stderr,
    );
  }
  try {
    return JSON.parse(stdout);
  } catch (cause) {
    throw new LastfmCliError(
      `lastfm ${method} returned invalid JSON: ${(cause as Error).message}`,
      exitCode,
      stderr,
    );
  }
}
