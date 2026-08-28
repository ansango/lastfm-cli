/**
 * Rephrase the API library's "session key required" error into a CLI-friendly
 * actionable message. Extracted from src/index.ts so the logic can be unit-
 * tested without invoking the full main() entry point (which would require
 * stubbing process.argv, process.stdout, process.stderr).
 *
 * Returns `null` if the error is not a LastFmApiError with httpStatus 0
 * (the API's pre-flight sentinel) AND a message that mentions "session key".
 * The caller treats `null` as "no rephrasing needed — emit the original
 * message".
 */

import { LastFmApiError } from '@ansango/lastfm-api';

export function rephraseSessionKeyError(
	error: unknown,
	ns: string,
	method: string,
): string | null {
	if (!(error instanceof LastFmApiError)) return null;
	if (error.httpStatus !== 0) return null;
	if (!/session key/i.test(error.message)) return null;
	return [
		`Method "${ns}.${method}" requires a session key.`,
		``,
		`Run the auth flow once and eval-export the session key into your shell:`,
		`  lastfm auth.getToken`,
		`  # → open the URL in a browser, authorise, copy the token`,
		`  eval $(lastfm auth.getSession --token=<TOKEN> --export)`,
		``,
		`Or pass sk=... inline for a one-off call.`,
	].join('\n');
}
