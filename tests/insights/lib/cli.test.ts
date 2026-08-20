/**
 * cli.test.ts — unit tests for the `lib/cli.ts` wrapper around `lastfm`.
 *
 * Strategy: the SUT takes an `executor` via dependency injection (defaults to
 * `node:child_process.execFile` in production). Tests inject a fake executor
 * that captures calls and returns scripted responses. Integration tests under
 * `tests/integration/` exercise the real CLI when RUN_INTEGRATION=1 is set
 * and LASTFM_API_KEY is present.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import { callLastfm, LastfmCliError } from '../../../src/insights/lib/cli.js';
import type { Executor } from '../../../src/insights/lib/cli.js';

// --- Test harness ---------------------------------------------------------

type RecordedCall = { file: string; args: string[]; opts: Record<string, unknown> };
type ScriptedResponse = { stdout: string; stderr?: string; code?: number; delayMs?: number };

function makeExecutor() {
  const calls: RecordedCall[] = [];
  const responses: ScriptedResponse[] = [];
  const enqueue = (r: ScriptedResponse): void => {
    responses.push(r);
  };
  const executor: Executor = (file, args, opts) => {
    calls.push({ file, args: [...args], opts: { ...opts } });
    const next = responses.shift() ?? { stdout: '{}' };
    const child = new EventEmitter() as unknown as import('node:child_process').ChildProcess;
    const stdout = new Readable({ read() {} });
    const stderr = new Readable({ read() {} });
    Object.assign(child, { stdout, stderr });
    setTimeout(() => {
      if (next.stdout) stdout.push(next.stdout);
      stdout.push(null);
      if (next.stderr) stderr.push(next.stderr);
      stderr.push(null);
      child.emit('close', next.code ?? 0);
    }, next.delayMs ?? 0);
    return child;
  };
  return { executor, calls, enqueue };
}

// --- Tests ---------------------------------------------------------------

test('callLastfm splits namespace.method into two positional args', async () => {
  const { executor, calls, enqueue } = makeExecutor();
  enqueue({ stdout: JSON.stringify({ ok: true }) });

  await callLastfm('user.getInfo', { user: 'ansango' }, { executor });
  assert.deepEqual(calls[0]!.args.slice(0, 2), ['user', 'getInfo']);
  assert.equal(calls[0]!.args[2], 'user=ansango');
});

test('callLastfm auto-quotes values that contain spaces', async () => {
  const { executor, calls, enqueue } = makeExecutor();
  enqueue({ stdout: JSON.stringify({ ok: true }) });

  await callLastfm('artist.getInfo', { artist: 'Red Hot Chili Peppers' }, { executor });
  // args[0]=namespace, args[1]=method, args[2] onwards = key=value
  assert.equal(calls[0]!.args[2], 'artist="Red Hot Chili Peppers"');
});

test('callLastfm passes timeout in options', async () => {
  const { executor, calls, enqueue } = makeExecutor();
  enqueue({ stdout: '{}' });

  await callLastfm('user.getTopArtists', { user: 'ansango', period: '7day', limit: 5 }, { executor, timeoutMs: 1234 });
  assert.equal(calls[0]!.opts.timeout, 1234);
});

test('callLastfm parses stdout JSON', async () => {
  const { executor, enqueue } = makeExecutor();
  enqueue({ stdout: '{"user":{"name":"ansango","playcount":"42"}}' });

  const result = await callLastfm('user.getInfo', { user: 'ansango' }, { executor });
  assert.equal((result as { user: { name: string } }).user.name, 'ansango');
  assert.equal((result as { user: { playcount: string } }).user.playcount, '42');
});

test('callLastfm throws LastfmCliError when exit code is non-zero', async () => {
  const { executor, enqueue } = makeExecutor();
  enqueue({ stdout: '', stderr: 'ERROR: missing LASTFM_API_KEY', code: 2 });

  await assert.rejects(
    () => callLastfm('user.getInfo', { user: 'ansango' }, { executor }),
    (err: unknown) => {
      assert.ok(err instanceof LastfmCliError);
      assert.match((err as Error).message, /exit 2/);
      assert.match((err as Error).message, /missing LASTFM_API_KEY/);
      return true;
    },
  );
});

test('callLastfm throws LastfmCliError when stdout is not valid JSON', async () => {
  const { executor, enqueue } = makeExecutor();
  enqueue({ stdout: 'not json at all' });

  await assert.rejects(
    () => callLastfm('user.getInfo', { user: 'ansango' }, { executor }),
    (err: unknown) => {
      assert.ok(err instanceof LastfmCliError);
      assert.match((err as Error).message, /invalid JSON/i);
      return true;
    },
  );
});

test('callLastfm preserves numeric and 0|1 values verbatim', async () => {
  const { executor, calls, enqueue } = makeExecutor();
  enqueue({ stdout: '{}' });

  await callLastfm('user.getRecentTracks', { user: 'ansango', limit: 20, extended: 1 }, { executor });
  assert.ok(calls[0]!.args.includes('limit=20'));
  assert.ok(calls[0]!.args.includes('extended=1'));
  assert.ok(calls[0]!.args.includes('user=ansango'));
});

test('callLastfm splits namespace.method correctly', async () => {
  const { executor, calls, enqueue } = makeExecutor();
  enqueue({ stdout: '{}' });

  await callLastfm('user.getTopArtists', { user: 'ansango' }, { executor });
  assert.deepEqual(calls[0]!.args.slice(0, 2), ['user', 'getTopArtists']);
});
