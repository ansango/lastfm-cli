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

test('NAMESPACES_SPEC covers all 8 read namespaces', () => {
  for (const ns of NAMESPACES) {
    assert.ok(NAMESPACES_SPEC[ns], `expected namespace "${ns}" in the curated registry`);
  }
});

test('every method in NAMESPACES_SPEC has a brief and at least one example OR is blocked', () => {
  for (const [ns, spec] of Object.entries(NAMESPACES_SPEC)) {
    for (const m of Object.values(spec.methods)) {
      assert.ok(m.brief && m.brief.length > 0, `${ns}.${m.name} needs a brief`);
      if (!m.blocked) {
        assert.ok(m.example, `non-blocked method ${ns}.${m.name} should include an example`);
      }
    }
  }
});

test('blocked scrobble methods are all marked blocked with the same reason', () => {
  for (const m of Object.values(NAMESPACES_SPEC.track.methods)) {
    if (['scrobble', 'scrobbleMany', 'postTrackScrobble', 'postBatchTrackScrobble'].includes(m.name)) {
      assert.equal(m.blocked, true, `${m.name} should be blocked`);
      assert.ok(m.blockReason && m.blockReason.length > 0, `${m.name} needs a block reason`);
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

test('formatMethodText flags blocked methods prominently', () => {
  const r = getMethodSpec('track.scrobble')!;
  const text = formatMethodText(r.ns, r.method);
  assert.match(text, /BLOCKED/);
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