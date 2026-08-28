/**
 * Tests for src/auth.ts.
 *
 * Strategy: mock `globalThis.fetch` with a per-test handler so we never hit
 * the real Last.fm API. The mock returns a JSON response shaped like the
 * real one (`{ token, authUrl }` for getToken, `{ session: { name, key } }`
 * for getSession), so the production code path runs end-to-end.
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { LastFmClient } from '@ansango/lastfm-api';
import {
	formatGetSessionResult,
	formatGetTokenResult,
	runAuthGetSession,
	runAuthGetToken,
} from '../src/auth.js';

const API_KEY = 'test-api-key';
const SHARED_SECRET = 'test-shared-secret';
const TOKEN = 'abcd1234TOKEN';
const SESSION_KEY = 'SESSIONKEY_opaque_value_xyz';

afterEach(() => {
	// Restore real fetch so a test failure doesn't poison the next one.
	// @ts-expect-error - we set it to a mock; restoring to undefined is fine
	// in node:test because each test file has its own module scope anyway.
	globalThis.fetch = undefined;
});

/** Install a fetch mock that returns the given JSON with HTTP 200. */
function mockFetchOk(body: unknown): void {
	// @ts-expect-error - mock; runtime is fine
	globalThis.fetch = async (_url: string, _init?: RequestInit) => {
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	};
}

/** Install a fetch mock that returns HTTP 4xx with the given body. */
function mockFetchError(status: number, body: unknown, statusText = ''): void {
	// @ts-expect-error - mock; runtime is fine
	globalThis.fetch = async (_url: string, _init?: RequestInit) => {
		return new Response(JSON.stringify(body), {
			status,
			statusText,
			headers: { 'content-type': 'application/json' },
		});
	};
}

// -----------------------------------------------------------------------------
// formatGetTokenResult (pure function, no fetch involved)
// -----------------------------------------------------------------------------

test('formatGetTokenResult: includes the URL, token, and the next-step hint', () => {
	const out = formatGetTokenResult(TOKEN, `https://www.last.fm/api/auth/?api_key=${API_KEY}&token=${TOKEN}`);
	assert.match(out, /Open this URL in a browser/);
	assert.match(out, /Allow access/);
	assert.match(out, new RegExp(`https://www\\.last\\.fm/api/auth/\\?api_key=${API_KEY}&token=${TOKEN}`));
	assert.match(out, new RegExp(`Request token: ${TOKEN}`));
	assert.match(out, /lastfm auth\.getSession --token=abcd1234TOKEN/);
});

test('formatGetTokenResult: tokens with URL-unsafe chars are still embedded verbatim', () => {
	const weirdToken = 'tok+en/=';
	const out = formatGetTokenResult(weirdToken, `https://www.last.fm/api/auth/?api_key=x&token=${weirdToken}`);
	assert.ok(out.includes(weirdToken), 'expected token to appear verbatim in output');
});

// -----------------------------------------------------------------------------
// formatGetSessionResult (pure function)
// -----------------------------------------------------------------------------

test('formatGetSessionResult: human-readable mode shows the key, user, and usage hints', () => {
	const out = formatGetSessionResult({ name: 'ansango', key: SESSION_KEY });
	assert.match(out, /Session key for user ansango/);
	assert.match(out, new RegExp(SESSION_KEY));
	assert.match(out, /eval \$/);
	assert.match(out, /export LASTFM_SESSION_KEY/);
});

test('formatGetSessionResult: --export mode emits a single export line', () => {
	const out = formatGetSessionResult({ name: 'ansango', key: SESSION_KEY }, true);
	assert.equal(out, `export LASTFM_SESSION_KEY=${SESSION_KEY}`);
});

test('formatGetSessionResult: Pro subscriber flag is shown when subscriber === 1', () => {
	const out = formatGetSessionResult({ name: 'ansango', key: SESSION_KEY, subscriber: 1 });
	assert.match(out, /Last\.fm Pro subscriber/);
});

test('formatGetSessionResult: non-Pro subscribers get no subscriber annotation', () => {
	const out = formatGetSessionResult({ name: 'ansango', key: SESSION_KEY, subscriber: 0 });
	assert.doesNotMatch(out, /Last\.fm Pro subscriber/);
});

// -----------------------------------------------------------------------------
// runAuthGetToken (calls client.auth.getToken() through the real client)
// -----------------------------------------------------------------------------

test('runAuthGetToken: returns the URL and the token from the API response', async () => {
	const expectedUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&token=${TOKEN}`;
	mockFetchOk({ token: TOKEN, authUrl: expectedUrl });
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	const out = await runAuthGetToken(client);
	assert.match(out, new RegExp(TOKEN));
	assert.match(out, new RegExp(expectedUrl.replace(/\?/g, '\\?')));
	assert.match(out, /lastfm auth\.getSession/);
});

test('runAuthGetToken: throws when the response is missing the token field', async () => {
	mockFetchOk({ authUrl: 'https://example.test/' }); // no token
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	await assert.rejects(() => runAuthGetToken(client), /no token/);
});

test('runAuthGetToken: propagates HTTP 401 as a LastFmApiError with the right status', async () => {
	mockFetchError(401, { error: 9, message: 'Invalid API key' });
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	// The API library throws `LastFmApiError("HTTP Error: 401 <statusText>")`
	// for 4xx; the body message is NOT included in the thrown error. The error
	// code (9) is on `e.code`. We assert on the class + status to keep the test
	// robust against changes to the error format.
	let caught: unknown = null;
	try {
		await runAuthGetToken(client);
	} catch (e) {
		caught = e;
	}
	assert.ok(caught instanceof Error, 'expected runAuthGetToken to throw');
	assert.equal((caught as { name: string }).name, 'LastFmApiError');
	assert.equal((caught as { httpStatus: number }).httpStatus, 401);
	assert.equal((caught as { code?: number }).code, 9);
});

// -----------------------------------------------------------------------------
// runAuthGetSession (calls client.auth.getSession({ token }))
// -----------------------------------------------------------------------------

test('runAuthGetSession: returns the session key in human-readable form', async () => {
	mockFetchOk({ session: { name: 'ansango', key: SESSION_KEY } });
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	const out = await runAuthGetSession(client, TOKEN);
	assert.match(out, /Session key for user ansango/);
	assert.match(out, new RegExp(SESSION_KEY));
});

test('runAuthGetSession: --export emits the eval-friendly export line', async () => {
	mockFetchOk({ session: { name: 'ansango', key: SESSION_KEY } });
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	const out = await runAuthGetSession(client, TOKEN, { export: true });
	assert.equal(out, `export LASTFM_SESSION_KEY=${SESSION_KEY}`);
});

test('runAuthGetSession: empty token throws a clear, actionable error', async () => {
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	await assert.rejects(() => runAuthGetSession(client, ''), /--token=<token>/);
});

test('runAuthGetSession: response without a session.key throws', async () => {
	mockFetchOk({ session: {} }); // no key → user did not authorise
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	await assert.rejects(() => runAuthGetSession(client, TOKEN), /authorise the request token/);
});

test('runAuthGetSession: HTTP 401 propagates as LastFmApiError with the right status', async () => {
	mockFetchError(401, { error: 9, message: 'Unauthorized Token' });
	const client = new LastFmClient({ apiKey: API_KEY, sharedSecret: SHARED_SECRET });
	let caught: unknown = null;
	try {
		await runAuthGetSession(client, TOKEN);
	} catch (e) {
		caught = e;
	}
	assert.ok(caught instanceof Error, 'expected runAuthGetSession to throw');
	assert.equal((caught as { name: string }).name, 'LastFmApiError');
	assert.equal((caught as { httpStatus: number }).httpStatus, 401);
	assert.equal((caught as { code?: number }).code, 9);
});
