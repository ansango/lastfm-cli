/**
 * Tests for the method-surface additions in #6–#11.
 *
 * Every method exposed by @ansango/lastfm-api@3.3.0 should now have a
 * NAMESPACES_SPEC entry with a brief, params, and an example. This file
 * asserts the 12 new method entries (added by this PR) are present and
 * properly formed. The generic "every method has a brief and an example"
 * test in tests/man.test.ts is the catch-all; this file is the named
 * coverage for the new surface so a future refactor can target the
 * specific issues (#6, #7, #8, #9, #10, #11).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMethodSpec, NAMESPACES_SPEC } from '../src/man.js';

const NEW_METHODS: Array<{ ns: string; method: string; requiredParams: string[] }> = [
  // #6 — corrections (reads, no sk)
  { ns: 'artist', method: 'getCorrection', requiredParams: ['artist'] },
  { ns: 'track', method: 'getCorrection', requiredParams: ['artist', 'track'] },
  // #7 — getPersonalTags with taggingtype narrowing (read, no sk)
  { ns: 'user', method: 'getPersonalTags', requiredParams: ['user', 'tag', 'taggingtype'] },
  // #8 — album mutations (writes, sk)
  { ns: 'album', method: 'addTags', requiredParams: ['artist', 'album', 'tags'] },
  { ns: 'album', method: 'removeTag', requiredParams: ['artist', 'album', 'tag'] },
  // #9 — artist mutations (writes, sk)
  { ns: 'artist', method: 'addTags', requiredParams: ['artist', 'tags'] },
  { ns: 'artist', method: 'removeTag', requiredParams: ['artist', 'tag'] },
  // #10 — track mutations (writes, sk)
  { ns: 'track', method: 'addTags', requiredParams: ['artist', 'track', 'tags'] },
  { ns: 'track', method: 'removeTag', requiredParams: ['artist', 'track', 'tag'] },
  { ns: 'track', method: 'love', requiredParams: ['artist', 'track'] },
  { ns: 'track', method: 'unlove', requiredParams: ['artist', 'track'] },
  // #11 — updateNowPlaying (write, sk)
  { ns: 'track', method: 'updateNowPlaying', requiredParams: ['artist', 'track'] },
];

test('every new method (#6-#11) has a NAMESPACES_SPEC entry', () => {
  for (const { ns, method } of NEW_METHODS) {
    const spec = NAMESPACES_SPEC[ns]?.methods[method];
    assert.ok(spec, `expected ${ns}.${method} to be in NAMESPACES_SPEC`);
  }
});

test('every new method has a brief, params, and an example', () => {
  for (const { ns, method } of NEW_METHODS) {
    const spec = NAMESPACES_SPEC[ns]?.methods[method];
    assert.ok(spec, `expected ${ns}.${method} in NAMESPACES_SPEC`);
    assert.ok(spec.brief && spec.brief.length > 0, `${ns}.${method} needs a brief`);
    assert.ok(Array.isArray(spec.params) && spec.params.length > 0, `${ns}.${method} needs params`);
    assert.ok(spec.example, `${ns}.${method} needs an example`);
  }
});

test('every new method declares all its required params', () => {
  for (const { ns, method, requiredParams } of NEW_METHODS) {
    const spec = NAMESPACES_SPEC[ns]?.methods[method];
    assert.ok(spec, `expected ${ns}.${method} in NAMESPACES_SPEC`);
    const declared = new Set(spec.params.filter((p) => p.required).map((p) => p.name));
    for (const r of requiredParams) {
      assert.ok(declared.has(r), `${ns}.${method} should declare required param "${r}"`);
    }
  }
});

test('write methods explicitly mention the auth requirement', () => {
  const writeMethods = NEW_METHODS.filter((m) =>
    ['addTags', 'removeTag', 'love', 'unlove', 'updateNowPlaying'].includes(m.method),
  );
  for (const { ns, method } of writeMethods) {
    const spec = NAMESPACES_SPEC[ns]?.methods[method];
    assert.ok(spec, `expected ${ns}.${method} in NAMESPACES_SPEC`);
    assert.match(
		spec.brief,
		/authenticated session|Requires an authenticated session/i,
		`${ns}.${method} brief should mention the auth requirement`,
	);
  }
});

test('read methods (#6, #7) do not require sk', () => {
  const readMethods = [
    { ns: 'artist', method: 'getCorrection' },
    { ns: 'track', method: 'getCorrection' },
    { ns: 'user', method: 'getPersonalTags' },
  ];
  for (const { ns, method } of readMethods) {
    const spec = NAMESPACES_SPEC[ns]?.methods[method];
    assert.ok(spec, `expected ${ns}.${method} in NAMESPACES_SPEC`);
    const sk = spec.params.find((p) => p.name === 'sk');
    assert.equal(sk, undefined, `${ns}.${method} should not have an sk param (read-only)`);
  }
});

test('getMethodSpec resolves every new method', () => {
  for (const { ns, method } of NEW_METHODS) {
    const r = getMethodSpec(`${ns}.${method}`);
    assert.ok(r, `expected getMethodSpec to resolve ${ns}.${method}`);
    assert.equal(r!.ns, ns);
    assert.equal(r!.method.name, method);
  }
});
