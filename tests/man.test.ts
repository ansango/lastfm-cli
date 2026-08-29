import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMethodMarkdown,
  formatMethodText,
  formatNamespaceMarkdown,
  formatNamespaceText,
  formatNamespacesMarkdown,
  formatNamespacesText,
  getMethodSpec,
  NAMESPACES_SPEC,
} from '../src/man.js';
import { NAMESPACES } from '../src/methods.js';

test('NAMESPACES_SPEC covers every namespace in NAMESPACES', () => {
  // Post-#4 the auth namespace is exposed too. The test iterates over
  // the canonical NAMESPACES list and asserts each has a NAMESPACES_SPEC
  // entry, so adding a new namespace anywhere will surface as a test
  // failure if its docs are missing.
  for (const ns of NAMESPACES) {
    assert.ok(NAMESPACES_SPEC[ns], `expected namespace "${ns}" in the curated registry`);
  }
});

test('every method in NAMESPACES_SPEC has a brief and at least one example', () => {
  // Issue #5 removed the "blocked" deny-list. Every method exposed by the
  // client is also exposed by the CLI; the auth gating happens in the API
  // library + the CLI's error rephrasing layer. So the example is required
  // for every method, no more `blocked` short-circuit.
  for (const [ns, spec] of Object.entries(NAMESPACES_SPEC)) {
    for (const m of Object.values(spec.methods)) {
      assert.ok(m.brief && m.brief.length > 0, `${ns}.${m.name} needs a brief`);
      assert.ok(m.example, `non-blocked method ${ns}.${m.name} should include an example`);
    }
  }
});

test('write methods are no longer marked blocked in NAMESPACES_SPEC.track', () => {
  // Pre-#5: scrobble / scrobbleMany / postTrackScrobble / postBatchTrackScrobble
  // were flagged `blocked: true`. Post-#5 they're callable; the gating moved
  // from the CLI to the API library's `sk` check.
  for (const m of Object.values(NAMESPACES_SPEC.track.methods)) {
    if (['scrobble', 'scrobbleMany', 'postTrackScrobble', 'postBatchTrackScrobble'].includes(m.name)) {
      assert.equal(m.blocked, undefined, `${m.name} should not be blocked`);
    }
  }
});

test('getMethodSpec resolves namespace.method', () => {
  const r = getMethodSpec('artist.getInfo');
  assert.ok(r);
  assert.equal(r!.ns, 'artist');
  assert.equal(r!.method.name, 'getInfo');
});

test('getMethodSpec returns null for unknown targets', () => {
  assert.equal(getMethodSpec('nope.nope'), null);
  assert.equal(getMethodSpec(''), null);
  assert.equal(getMethodSpec('justnamespace'), null);
});

test('formatMethodText includes params, example and Last.fm URL', () => {
  const r = getMethodSpec('artist.getInfo')!;
  const text = formatMethodText(r.ns, r.method);
  assert.match(text, /artist\.getInfo/);
  assert.match(text, /Parameters:/);
  assert.match(text, /artist\s+string\s+required/);
  assert.match(text, /lastfm artist getInfo artist=Radiohead/);
  assert.match(text, /last\.fm\/api\/show\/artist\.getInfo/);
});

test('formatMethodText no longer flags scrobble as BLOCKED', () => {
  const r = getMethodSpec('track.scrobble')!;
  const text = formatMethodText(r.ns, r.method);
  assert.doesNotMatch(text, /BLOCKED/);
});

test('formatMethodMarkdown renders a GitHub-flavoured table', () => {
  const r = getMethodSpec('user.getInfo')!;
  const md = formatMethodMarkdown(r.ns, r.method);
  assert.match(md, /^## `user\.getInfo`/m);
  assert.match(md, /\| Name \| Type \| Required \| Description \|/);
  assert.match(md, /\| `user` \| `string` \| yes \|/);
  assert.match(md, /\[Last\.fm docs\]\(https:\/\/www\.last\.fm\/api\/show\/user\.getInfo\)/);
});

test('formatNamespaceText enumerates every method', () => {
  const text = formatNamespaceText('user');
  for (const m of Object.keys(NAMESPACES_SPEC.user.methods)) {
    assert.match(text, new RegExp(`user ${m}\\b`), `formatNamespaceText must list user.${m}`);
  }
});

test('formatNamespaceText returns a clear error for unknown namespaces', () => {
  const text = formatNamespaceText('nope');
  assert.match(text, /Unknown namespace "nope"/);
});

test('formatNamespaceMarkdown links every method to its anchor', () => {
  const md = formatNamespaceMarkdown('chart');
  assert.match(md, /^# Namespace `chart`/m);
  for (const m of Object.keys(NAMESPACES_SPEC.chart.methods)) {
    assert.ok(md.includes(`chart${m}`), `markdown must reference chart.${m}`);
  }
});

test('formatNamespacesText lists all 8 namespaces and the man usage hints', () => {
  const text = formatNamespacesText();
  for (const ns of NAMESPACES) {
    assert.ok(text.includes(ns), `top-level man must list ${ns}`);
  }
  assert.match(text, /lastfm man <namespace>/);
  assert.match(text, /--markdown/);
});

test('formatNamespacesMarkdown lists all namespaces under `Namespaces`', () => {
  const md = formatNamespacesMarkdown();
  assert.match(md, /^# @ansango\/lastfm-cli — manual/m);
  assert.match(md, /^## Namespaces/m);
});