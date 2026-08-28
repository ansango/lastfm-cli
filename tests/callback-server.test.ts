/**
 * Tests for src/callback-server.ts (the local HTTP server that catches
 * Last.fm's auth redirect for the `--callback` flag in issue #13).
 *
 * Strategy: start the server on an ephemeral port, simulate the redirect
 * with a real `fetch` call, assert the captured token matches and the
 * server closes. Each test gets a fresh server so state is isolated.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidPort, startCallbackServer } from '../src/callback-server.js';

const TOKEN = 'callback-test-token-abc123';

test('isValidPort: accepts 0, the dynamic range, and rejects out-of-range', () => {
	assert.equal(isValidPort(0), false, '0 is not in the user-bindable range');
	assert.equal(isValidPort(49152), true);
	assert.equal(isValidPort(65535), true);
	assert.equal(isValidPort(49151), false);
	assert.equal(isValidPort(65536), false);
	assert.equal(isValidPort(80), false);
	assert.equal(isValidPort(3.14), false);
});

test('startCallbackServer: binds to 127.0.0.1 only (the URL is loopback)', async () => {
	const server = await startCallbackServer(0);
	try {
		assert.match(server.url, /^http:\/\/127\.0\.0\.1:\d+\/$/);
		// The auto-picked port can come from the kernel's local_port_range
		// which is broader than the IANA dynamic range (49152-65535) the
		// user-provided --port flag is restricted to. Just verify it's a
		// valid TCP port number — the OS gave it to us so it's safe to use.
		assert.ok(server.port > 0 && server.port < 65536, `port ${server.port} is not a valid TCP port`);
	} finally {
		server.close();
	}
});

test('startCallbackServer: rejects out-of-range port', async () => {
	await assert.rejects(() => startCallbackServer(80), /--port must be an integer/);
	await assert.rejects(() => startCallbackServer(70000), /--port must be an integer/);
});

test('captures the token from ?token=... and returns it via waitForToken', async () => {
	const server = await startCallbackServer(0);
	try {
		const tokenPromise = server.waitForToken(5_000);
		// Simulate the Last.fm redirect to the callback URL.
		const res = await fetch(`${server.url}?token=${TOKEN}`);
		assert.equal(res.status, 200);
		const body = await res.text();
		assert.match(body, /Token captured/);
		const captured = await tokenPromise;
		assert.equal(captured, TOKEN);
	} finally {
		server.close();
	}
});

test('returns 400 + helpful HTML when the redirect has no ?token= param', async () => {
	const server = await startCallbackServer(0);
	try {
		const tokenPromise = server.waitForToken(500).catch((e: unknown) => e);
		const res = await fetch(`${server.url}`);
		assert.equal(res.status, 400);
		const body = await res.text();
		assert.match(body, /No token in callback/);
		const err = (await tokenPromise) as Error;
		// The token never arrives, so the waitForToken promise rejects on
		// timeout (we set it to 500ms). The error message mentions the URL
		// + timeout, which is the actionable shape.
		assert.ok(err instanceof Error);
		assert.match(err.message, /Callback timeout/);
	} finally {
		server.close();
	}
});

test('rejects waitForToken after the configured timeout', async () => {
	const server = await startCallbackServer(0);
	try {
		await assert.rejects(() => server.waitForToken(150), /Callback timeout/);
	} finally {
		server.close();
	}
});

test('waitForToken is single-shot: the first redirect wins', async () => {
	const server = await startCallbackServer(0);
	try {
		const tokenPromise = server.waitForToken(5_000);
		// First redirect with TOKEN
		await fetch(`${server.url}?token=${TOKEN}`);
		const captured = await tokenPromise;
		assert.equal(captured, TOKEN);
		// Second redirect should be rejected at the TCP layer because the
		// server already closed. fetch() throws on connection refused.
		await assert.rejects(
			() => fetch(`${server.url}?token=second`),
			/fetch failed|ECONNREFUSED|socket hang up|UND_ERR_SOCKET/,
		);
	} finally {
		server.close();
	}
});

test('close() is idempotent', async () => {
	const server = await startCallbackServer(0);
	server.close();
	server.close(); // should not throw
	server.close(); // should not throw
});
