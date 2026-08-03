import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCredentials, parseEnvFile } from '../src/env.js';
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

test('parseEnvFile: honours dotenv spec — `export` prefix and escape sequences', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastfm-cli-test-'));
  const file = join(dir, '.env.lastfm');
  try {
    writeFileSync(
      file,
      [
        'export LASTFM_API_KEY=with-export',
        'MULTI="line1\\nline2"',
      ].join('\n'),
    );
    const parsed = parseEnvFile(file);
    assert.equal(parsed.LASTFM_API_KEY, 'with-export');
    assert.equal(parsed.MULTI, 'line1\nline2');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadCredentials: does not override env vars already set in the shell', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastfm-cli-test-'));
  const file = join(dir, '.env.lastfm');
  try {
    writeFileSync(
      file,
      'LASTFM_API_KEY=from-file\nLASTFM_BASE_URL=https://from-file.test/\n',
    );
    const prev = process.env.LASTFM_API_KEY;
    const prevBase = process.env.LASTFM_BASE_URL;
    const prevOverride = process.env.LASTFM_CLI_ENV_FILE;
    // Start from a clean slate for the keys we care about, then set the
    // "shell" value that we expect to win.
    delete process.env.LASTFM_API_KEY;
    delete process.env.LASTFM_BASE_URL;
    process.env.LASTFM_API_KEY = 'from-shell';
    process.env.LASTFM_CLI_ENV_FILE = file;
    try {
      const result = loadCredentials();
      assert.equal(result.fileExists, true);
      assert.equal(process.env.LASTFM_API_KEY, 'from-shell');
      // The base URL was unset in the shell, so it should have been
      // populated from the file.
      assert.equal(process.env.LASTFM_BASE_URL, 'https://from-file.test/');
    } finally {
      if (prev === undefined) delete process.env.LASTFM_API_KEY;
      else process.env.LASTFM_API_KEY = prev;
      if (prevBase === undefined) delete process.env.LASTFM_BASE_URL;
      else process.env.LASTFM_BASE_URL = prevBase;
      if (prevOverride === undefined) delete process.env.LASTFM_CLI_ENV_FILE;
      else process.env.LASTFM_CLI_ENV_FILE = prevOverride;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('loadCredentials: LASTFM_CLI_ENV_FILE override wins over default search paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lastfm-cli-test-'));
  const file = join(dir, '.env.lastfm');
  try {
    writeFileSync(file, 'LASTFM_API_KEY=from-override\n');
    const prev = process.env.LASTFM_API_KEY;
    delete process.env.LASTFM_API_KEY;
    process.env.LASTFM_CLI_ENV_FILE = file;
    try {
      loadCredentials();
      assert.equal(process.env.LASTFM_API_KEY, 'from-override');
    } finally {
      if (prev === undefined) delete process.env.LASTFM_API_KEY;
      else process.env.LASTFM_API_KEY = prev;
      delete process.env.LASTFM_CLI_ENV_FILE;
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});