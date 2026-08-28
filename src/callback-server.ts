/**
 * Local HTTP server that catches the Last.fm auth redirect and extracts the
 * `token` query parameter. Used by the `--callback` flag on
 * `lastfm auth.getSession` (issue #13).
 *
 * Flow:
 *   1. CLI starts a server on 127.0.0.1:<port> (auto-pick or `--port`).
 *   2. CLI prints the URL `http://127.0.0.1:<port>/` so the user knows what
 *      to set as their Last.fm account callback URL.
 *   3. User opens the `authUrl` from `auth.getToken` in a browser, authorises,
 *      Last.fm redirects to `http://127.0.0.1:<port>/?token=<TOKEN>`.
 *   4. The server captures the token, responds with a 200 + a friendly
 *      "you can close this tab" HTML page, and resolves the returned
 *      promise.
 *   5. The CLI uses the captured token to call `client.auth.getSession()`.
 *
 * The server is bound to 127.0.0.1 only (never 0.0.0.0) so it cannot accept
 * connections from the network. The default port range is 49152-65535
 * (the IANA "dynamic/private" range), so collisions with well-known ports
 * are avoided.
 */

import http from 'node:http';
import { AddressInfo } from 'node:net';

export interface CallbackServerResult {
	/** The full URL the user must set as their Last.fm callback URL. */
	url: string;
	/** The port the server is bound to. */
	port: number;
	/** Resolves with the captured `token` query param, or rejects on timeout / error. */
	waitForToken: (timeoutMs: number) => Promise<string>;
	/** Closes the server. Safe to call multiple times. Idempotent. */
	close: () => void;
}

const DEFAULT_PORT_MIN = 49152;
const DEFAULT_PORT_MAX = 65535;

const CAPTURED_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>lastfm-cli auth callback</title>
  <style>body{font-family:system-ui,sans-serif;max-width:32em;margin:4em auto;padding:0 1em;color:#222}code{background:#eee;padding:0.1em 0.3em;border-radius:3px}</style>
</head>
<body>
  <h1>Token captured</h1>
  <p>You can close this tab. The <code>lastfm</code> CLI has the token and is finishing the auth handshake.</p>
  <p>If the CLI did not exit, the token may have expired (60-minute lifetime). Re-run <code>lastfm auth.getToken</code> and try again.</p>
</body>
</html>`;

const MISSING_TOKEN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>lastfm-cli auth callback</title></head>
<body><h1>No token in callback</h1>
<p>The redirect to this server did not include a <code>token</code> query parameter. Re-run <code>lastfm auth.getSession --token=... --callback</code> and authorise the request token in your browser.</p></body></html>`;

/** Pick a free port on 127.0.0.1 by binding to port 0 and reading the chosen port. */
function pickFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const probe = http.createServer();
		probe.once('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const addr = probe.address() as AddressInfo;
			probe.close(() => resolve(addr.port));
		});
	});
}

/** Validate a port number. */
export function isValidPort(port: number): boolean {
	return Number.isInteger(port) && port >= DEFAULT_PORT_MIN && port <= DEFAULT_PORT_MAX;
}

/**
 * Start a one-shot local server that captures the first `?token=...` it sees.
 *
 * If `port` is 0, picks a free port automatically (whatever the OS gives us).
 * Otherwise binds to that exact port (and throws if it is outside the safe
 * dynamic range or unavailable).
 *
 * The server returns a small HTML page on capture and shuts down immediately.
 */
export async function startCallbackServer(port = 0): Promise<CallbackServerResult> {
	if (port !== 0 && !isValidPort(port)) {
		throw new Error(
			`--port must be an integer in [${DEFAULT_PORT_MIN}, ${DEFAULT_PORT_MAX}] (got ${port}).`,
		);
	}
	const actualPort = port === 0 ? await pickFreePort() : port;

	const server = http.createServer();
	const captured: { token: string | null } = { token: null };
	let waiter: ((token: string) => void) | null = null;
	let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
	let rejected = false;
	let rejecter: ((reason: Error) => void) | null = null;
	let closed = false;

	const close = (): void => {
		if (closed) return;
		closed = true;
		if (timeoutHandle) {
			clearTimeout(timeoutHandle);
			timeoutHandle = null;
		}
		server.close(() => {
			// noop; close is fire-and-forget
		});
	};

	server.on('request', (req, res) => {
		try {
			const url = new URL(req.url ?? '/', `http://127.0.0.1:${actualPort}`);
			const token = url.searchParams.get('token');
			if (!token) {
				res.statusCode = 400;
				res.setHeader('content-type', 'text/html; charset=utf-8');
				res.end(MISSING_TOKEN_HTML);
				return;
			}
			captured.token = token;
			res.statusCode = 200;
			res.setHeader('content-type', 'text/html; charset=utf-8');
			res.end(CAPTURED_HTML);
			// Resolve the waiter on next tick so the response can flush.
			setImmediate(() => {
				if (waiter) waiter(token);
				close();
			});
		} catch (e) {
			res.statusCode = 500;
			res.end('internal error');
		}
	});

	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(actualPort, '127.0.0.1', () => resolve());
	});

	const waitForToken = (timeoutMs: number): Promise<string> => {
		return new Promise<string>((resolve, reject) => {
			if (captured.token) {
				resolve(captured.token);
				return;
			}
			if (rejected) {
				reject(new Error('callback server already failed; cannot wait again'));
				return;
			}
			waiter = resolve;
			rejecter = reject;
			timeoutHandle = setTimeout(() => {
				rejected = true;
				close();
				reject(
					new Error(
						`Callback timeout: no redirect to http://127.0.0.1:${actualPort}/?token=... within ${Math.round(timeoutMs / 1000)}s. ` +
							`Make sure your Last.fm account's callback URL is set to http://127.0.0.1:${actualPort}/ and that you clicked "Allow access" in the browser.`,
					),
				);
			}, timeoutMs);
		});
	};

	return {
		url: `http://127.0.0.1:${actualPort}/`,
		port: actualPort,
		waitForToken,
		close,
	};
}
