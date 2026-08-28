import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKVArgs, parseJsonArg, publicMethods } from '../src/dispatch.js';
import { BLOCKED_METHODS, NAMESPACES } from '../src/methods.js';

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

test('BLOCKED_METHODS contains the canonical scrobble methods', () => {
  // @ansango/lastfm-api >= 3.1.2
  assert.ok(BLOCKED_METHODS.has('scrobble'));
  assert.ok(BLOCKED_METHODS.has('scrobbleMany'));
});

test('BLOCKED_METHODS also covers the deprecated scrobble aliases', () => {
  // @ansango/lastfm-api <= 3.1.1, kept as deprecated aliases in 3.1.x
  assert.ok(BLOCKED_METHODS.has('postTrackScrobble'));
  assert.ok(BLOCKED_METHODS.has('postBatchTrackScrobble'));
});

test('NAMESPACES includes auth (the auth foundation from issue #4)', () => {
  // The auth namespace carries the read-only auth flow (getToken, getSession).
  // It is intentionally NOT in the BLOCKED_METHODS list — these are the
	// methods that produce a session key, not write methods that consume one.
	// See src/auth.ts and src/index.ts for the auth dispatch.
	assert.ok(NAMESPACES.includes('auth' as never));
});

test('publicMethods filters out blocked methods', () => {
  const fakeService = {
    getInfo: () => {},
    getSimilar: () => {},
    postTrackScrobble: () => {},
  };
  const out = publicMethods(fakeService);
  assert.deepEqual(out, ['getInfo', 'getSimilar']);
});
