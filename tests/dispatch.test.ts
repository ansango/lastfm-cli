import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKVArgs, parseJsonArg, publicMethods } from '../src/dispatch.js';
import { AUTH_REQUIRED_METHODS, NAMESPACES } from '../src/methods.js';

test('parseKVArgs: parses key=value pairs', () => {
  const out = parseKVArgs(['artist=Radiohead', 'limit=10']);
  assert.deepEqual(out, { artist: 'Radiohead', limit: '10' });
});

test('parseKVArgs: skips --json flag and other -- flags', () => {
  const out = parseKVArgs(['--json', 'artist=Radiohead', '--verbose']);
  assert.deepEqual(out, { artist: 'Radiohead' });
});

test('parseKVArgs: throws on argument without =', () => {
  assert.throws(
    () => parseKVArgs(['badarg']),
    /Bad argument "badarg"/,
  );
});

test('parseJsonArg: parses --json payload', () => {
  const out = parseJsonArg(['--json', '{"artist":"Cher","limit":10}']);
  assert.deepEqual(out, { artist: 'Cher', limit: 10 });
});

test('parseJsonArg: returns null when --json absent', () => {
  assert.equal(parseJsonArg(['artist=Radiohead']), null);
});

test('parseJsonArg: throws on invalid JSON', () => {
  assert.throws(
    () => parseJsonArg(['--json', '{not json']),
    /Invalid JSON/,
  );
});

test('parseJsonArg: throws if --json has no payload', () => {
  assert.throws(
    () => parseJsonArg(['--json']),
    /requires a JSON string/,
  );
});

test('AUTH_REQUIRED_METHODS contains the canonical scrobble methods', () => {
  // @ansango/lastfm-api >= 3.1.2
  assert.ok(AUTH_REQUIRED_METHODS.has('scrobble'));
  assert.ok(AUTH_REQUIRED_METHODS.has('scrobbleMany'));
});

test('AUTH_REQUIRED_METHODS also covers the deprecated scrobble aliases', () => {
  // @ansango/lastfm-api <= 3.1.1, kept as deprecated aliases in 3.1.x
  assert.ok(AUTH_REQUIRED_METHODS.has('postTrackScrobble'));
  assert.ok(AUTH_REQUIRED_METHODS.has('postBatchTrackScrobble'));
});

test('AUTH_REQUIRED_METHODS contains the tag / love / now-playing methods', () => {
  // The full write surface (12 names) is described in issue #5. We assert
  // the non-scrobble half here so a future removal of one of these is
  // surfaced as a test failure.
  for (const m of ['love', 'unlove', 'updateNowPlaying', 'addTags', 'removeTag']) {
    assert.ok(AUTH_REQUIRED_METHODS.has(m), `expected "${m}" in AUTH_REQUIRED_METHODS`);
  }
});

test('NAMESPACES includes auth (the auth foundation from issue #4)', () => {
  // The auth namespace carries the read-only auth flow (getToken, getSession).
  // It is intentionally NOT in the AUTH_REQUIRED_METHODS list — these are the
	// methods that produce a session key, not write methods that consume one.
	// See src/auth.ts and src/index.ts for the auth dispatch.
	assert.ok(NAMESPACES.includes('auth' as never));
});

test('publicMethods returns every function on the service (no blocking)', () => {
  // Issue #5 removed the BLOCKED_METHODS deny-list. Write methods are
  // forward-able; the API library enforces the `sk` requirement, and the
  // CLI rephrases the resulting error into the auth-flow hint.
  const fakeService = {
    getInfo: () => {},
    getSimilar: () => {},
    postTrackScrobble: () => {},
    scrobble: () => {},
  };
  const out = publicMethods(fakeService);
  assert.deepEqual(out, ['getInfo', 'getSimilar', 'postTrackScrobble', 'scrobble']);
});
