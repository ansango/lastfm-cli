/**
 * Tests for the write-gate behaviour introduced in #5.
 *
 * The CLI used to deny-list write methods (BLOCKED_METHODS) and return a
 * generic "this CLI is read-only" error. Post-#5 the gate moved into the
 * API library (which throws LastFmApiError with httpStatus 0 when no `sk`
 * is present), and the CLI's `index.ts` catch handler rephrases that into
 * a CLI-friendly error pointing at the auth flow.
 *
 * We don't invoke the full main() here — that would mean mocking stdin /
 * argv / stdout. Instead we exercise the two key paths directly:
 *
 *  1. `callMethod` from dispatch.ts no longer throws on write methods
 *     (the BLOCKED_METHODS check is gone).
 *  2. The `index.ts` rephrasing logic is exposed as `rephraseSessionKeyError`
 *     and called by the catch handler. We test it directly with a synthetic
 *     LastFmApiError.
 *
 * The rephrasing function lives in src/index.ts which is harder to unit-
 * test directly (it pulls in process.env etc.). So the small rephrase
 * helper is extracted into src/session-key-error.ts and imported from
 * both index.ts and these tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LastFmApiError } from '@ansango/lastfm-api';
import { rephraseSessionKeyError } from '../src/session-key-error.js';
import { callMethod } from '../src/dispatch.js';

test('rephraseSessionKeyError: rephrases a session-key-missing error', () => {
	const err = new LastFmApiError(
		'A session key (`sk`) is required to track.love. Pass `sk` in the request params or set `sessionKey` on the LastFmConfig.',
		0,
	);
	const out = rephraseSessionKeyError(err, 'track', 'love');
	assert.ok(out.includes('track.love'));
	assert.ok(out.includes('requires a session key'));
	assert.ok(out.includes('lastfm auth.getToken'));
	assert.ok(out.includes('lastfm auth.getSession'));
	assert.ok(out.includes('--export'));
});

test('rephraseSessionKeyError: returns null for unrelated API errors', () => {
	const err = new LastFmApiError('Last.fm API Error 9: Invalid API key', 401, 9);
	const out = rephraseSessionKeyError(err, 'user', 'getInfo');
	assert.equal(out, null);
});

test('rephraseSessionKeyError: returns null for non-LastFmApiError throws', () => {
	const err = new Error('boom');
	const out = rephraseSessionKeyError(err, 'user', 'getInfo');
	assert.equal(out, null);
});

test('rephraseSessionKeyError: returns null for httpStatus 0 + non-session-key message', () => {
	// The pre-flight sentinel is httpStatus 0, but the message might be
	// something else (e.g. "A `sharedSecret` is required for signed methods.")
	// Don't mis-rewrite those.
	const err = new LastFmApiError('A `sharedSecret` is required for signed methods.', 0);
	const out = rephraseSessionKeyError(err, 'track', 'love');
	assert.equal(out, null);
});

test('callMethod: no longer throws on a write method (write gate is gone)', async () => {
	// We don't actually want to make a network call, so the easiest way to
	// assert "the gate is gone" is to pass an unknown namespace / method
	// combination and verify the error message does NOT mention "read-only"
	// or "blocked" — i.e. the BLOCKED_METHODS branch is not in the code path.
	const fakeClient = {
		track: { scrobble: () => Promise.resolve({ ok: true }) },
	} as unknown as Parameters<typeof callMethod>[0];

	// Sanity: a real write method call against a real-looking method
	// should reach the function (not be blocked). We mock the method to
	// return immediately so no network is hit.
	const result = await callMethod(fakeClient, 'track', 'scrobble', { artist: 'x', track: 'y', timestamp: 1 });
	assert.deepEqual(result, { ok: true });
});

test('callMethod: unknown write method still throws a clear "Unknown method" error (not a block error)', async () => {
	const fakeClient = {
		track: {},
	} as unknown as Parameters<typeof callMethod>[0];
	await assert.rejects(
		() => callMethod(fakeClient, 'track', 'love', { artist: 'x', track: 'y' }),
		(err: unknown) => {
			const msg = err instanceof Error ? err.message : String(err);
			return msg.includes('Unknown method') && !msg.includes('read-only') && !msg.includes('blocked');
		},
	);
});
