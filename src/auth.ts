/**
 * Authentication flow handlers.
 *
 * The CLI is read-only by default, but exposes a small set of `auth.*`
 * commands so a user can complete the browser auth flow and capture a
 * session key for ad-hoc use with write methods. There is no persistence —
 * the session key is only ever printed to stdout, in a form the user can
 * `eval` in their shell.
 *
 * The flow:
 *   1. `lastfm auth.getToken`
 *      → calls `client.auth.getToken()`
 *      → prints the request token + the pre-built `authUrl` (from v3.3.0)
 *   2. User opens the URL in a browser, authorises, copies the token from
 *      the URL bar (or uses the `--callback` flag — see issue #13)
 *   3. `lastfm auth.getSession --token=<token>`
 *      → calls `client.auth.getSession({ token })`
 *      → prints the session key
 *   4. `lastfm auth.getSession --token=<token> --export`
 *      → prints `export LASTFM_SESSION_KEY=<key>` for `eval` consumption
 *
 * `auth.getMobileSession` is intentionally absent: it was removed in
 * `@ansango/lastfm-api@3.3.0` because Last.fm restricts the endpoint to
 * mobile-classified API keys, which the self-service create form does not
 * expose. See lastfm-api #117.
 */

import type { LastFmClient } from '@ansango/lastfm-api';

/** Plain-text human-readable output for `auth.getToken`. */
export function formatGetTokenResult(token: string, authUrl: string): string {
	return [
		'Open this URL in a browser, log in if prompted, click "Allow access",',
		'then copy the token from the URL bar (or paste it from the page):',
		'',
		`  ${authUrl}`,
		'',
		`Request token: ${token}`,
		'',
		'Next: lastfm auth.getSession --token=' + token,
	].join('\n');
}

/**
 * Plain-text human-readable output for `auth.getSession`. If `asExport` is
 * true, emits a single `export` line suitable for `eval $(...)` capture in
 * bash / zsh / fish. No file I/O.
 */
export function formatGetSessionResult(
	session: { name: string; key: string; subscriber?: number },
	asExport = false,
): string {
	if (asExport) {
		// Single line, no extra whitespace. The session key is opaque so no
		// quoting concerns; if it ever carries a quote in the future, the
		// consumer (bash) will surface a clear parse error.
		return `export LASTFM_SESSION_KEY=${session.key}`;
	}
	const sub = session.subscriber === 1 ? ' (Last.fm Pro subscriber)' : '';
	return [
		`Session key for user ${session.name}${sub}:`,
		'',
		`  ${session.key}`,
		'',
		'Use it for ad-hoc writes:',
		`  eval $(lastfm auth.getSession --token=<TOKEN> --export)`,
		'…or set it in your shell:',
		`  export LASTFM_SESSION_KEY=${session.key}`,
	].join('\n');
}

/**
 * Run the `auth.getToken` command. Returns a string suitable for stdout.
 * The caller writes it; this function does not touch stdout itself so it
 * can be unit-tested without mocking process.
 */
export async function runAuthGetToken(client: LastFmClient): Promise<string> {
	const result = await client.auth.getToken();
	if (!result.token) {
		throw new Error('auth.getToken returned no token — check your API key.');
	}
	// authUrl was added in @ansango/lastfm-api@3.3.0. The CLI requires 3.3.0
	// (see package.json dependency), so this should always be present. If
	// the field is missing the package was downgraded — surface that.
	if (!result.authUrl) {
		throw new Error(
			'auth.getToken response is missing authUrl. ' +
				'@ansango/lastfm-api@3.3.0 is required (authUrl was added in that release). ' +
				'Update the dependency: npm install @ansango/lastfm-api@^3.3.0',
		);
	}
	return formatGetTokenResult(result.token, result.authUrl);
}

/** Run the `auth.getSession` command. */
export async function runAuthGetSession(
	client: LastFmClient,
	token: string,
	opts: { export?: boolean; callback?: CallbackOpts } = {},
): Promise<string> {
	if (!token) {
		throw new Error('auth.getSession requires --token=<token>. Run `lastfm auth.getToken` first.');
	}
	let resolvedToken = token;
	if (opts.callback) {
		// Lazy import to keep the auth module's runtime footprint small when
		// the callback flag is not used (the default code path).
		const { startCallbackServer } = await import('./callback-server.js');
		const server = await startCallbackServer(opts.callback.port ?? 0);
		// Emit the callback URL on a dedicated stderr line so callers can
		// script around it (e.g. `lastfm auth.getSession --callback 2>&1
		// 1>/dev/null | head -1`).
		process.stderr.write(`Callback server listening at: ${server.url}\n`);
		try {
			resolvedToken = await server.waitForToken(opts.callback.timeoutMs ?? 120_000);
		} finally {
			server.close();
		}
	}
	const result = await client.auth.getSession({ token: resolvedToken });
	if (!result.session?.key) {
		throw new Error('auth.getSession returned no session key — did you authorise the request token?');
	}
	return formatGetSessionResult(result.session, opts.export ?? false);
}

/** Options for the `--callback` flag. */
export interface CallbackOpts {
	/** Port to bind the local server to. `0` means auto-pick in the IANA dynamic range. */
	port?: number;
	/** Timeout in milliseconds for the redirect to arrive. */
	timeoutMs?: number;
}
