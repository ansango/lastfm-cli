import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvFile } from '../src/env.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('parseEnvFile: returns empty object for missing file', () => {
  assert.deepEqual(parseEnvFile('/nonexistent/.env'), {});
});

test('parseEnvFile: parses simple KEY=value pairs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastfm-cli-test-'));
  const file = join(dir, '.env.lastfm');
  try {
    writeFileSync(file, [
      'LASTFM_API_KEY=abc123',
      '# this is a comment',
      '',
      'LASTFM_BASE_URL=https://example.test/2.0/',
    ].join('\n'));
    const parsed = parseEnvFile(file);
    assert.equal(parsed.LASTFM_API_KEY, 'abc123');
    assert.equal(parsed.LASTFM_BASE_URL, 'https://example.test/2.0/');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseEnvFile: strips surrounding quotes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastfm-cli-test-'));
  const file = join(dir, '.env.lastfm');
  try {
    writeFileSync(file, [
      'A="double quoted"',
      "B='single quoted'",
      'C=unquoted',
    ].join('\n'));
    const parsed = parseEnvFile(file);
    assert.equal(parsed.A, 'double quoted');
    assert.equal(parsed.B, 'single quoted');
    assert.equal(parsed.C, 'unquoted');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parseEnvFile: skips lines without =', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastfm-cli-test-'));
  const file = join(dir, '.env.lastfm');
  try {
    writeFileSync(file, [
      'LASTFM_API_KEY=valid',
      'this line has no equals',
      'ANOTHER=ok',
    ].join('\n'));
    const parsed = parseEnvFile(file);
    assert.equal(parsed.LASTFM_API_KEY, 'valid');
    assert.equal(parsed.ANOTHER, 'ok');
    assert.equal(Object.keys(parsed).length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});