/**
 * args.test.ts — unit tests for `lib/args.ts`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flag, parseFlags } from '../../../src/insights/lib/args.js';

// --- parseFlags: shape & defaults -----------------------------------------

test('parseFlags: every schema key is present in `values`', () => {
  const { values } = parseFlags([], {
    user: flag.string(),
    limit: flag.number({ default: 5 }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown' }),
  });
  assert.equal(values['user'], '');
  assert.equal(values['limit'], 5);
  assert.equal(values['format'], 'markdown');
});

test('parseFlags: help defaults to false and is untouched by --help', () => {
  const { help, values } = parseFlags(['--help'], {
    user: flag.string(),
  });
  assert.equal(help, true);
  // --help must not consume the next argv element or mutate other values.
  assert.equal(values['user'], '');
});

test('parseFlags: -h short form is also help', () => {
  const { help } = parseFlags(['-h'], { user: flag.string() });
  assert.equal(help, true);
});

// --- per-helper -----------------------------------------------------------

test('flag.string: stores the next argv element', () => {
  const { values } = parseFlags(['--user', 'ansango'], {
    user: flag.string(),
  });
  assert.equal(values['user'], 'ansango');
});

test('flag.string: aliases match', () => {
  const { values } = parseFlags(['-u', 'ansango'], {
    user: flag.string({ aliases: ['-u'] }),
  });
  assert.equal(values['user'], 'ansango');
});

test('flag.number: parses integers', () => {
  const { values } = parseFlags(['--limit', '7'], {
    limit: flag.number({ default: 0 }),
  });
  assert.equal(values['limit'], 7);
});

test('flag.number: throws on non-numeric value', () => {
  assert.throws(
    () => parseFlags(['--limit', 'abc'], { limit: flag.number({ default: 0 }) }),
    /--limit must be a number/,
  );
});

test('flag.days: parses 30d', () => {
  const { values } = parseFlags(['--since', '90d'], {
    since: flag.days({ default: 30 }),
  });
  assert.equal(values['since'], 90);
});

test('flag.days: throws on bad shape', () => {
  assert.throws(
    () => parseFlags(['--since', '30days'], { since: flag.days({ default: 30 }) }),
    /--since must be Nd/,
  );
});

test('flag.enum: accepts listed values', () => {
  const { values } = parseFlags(['--format', 'json'], {
    format: flag.enum(['json', 'markdown'], { default: 'markdown' }),
  });
  assert.equal(values['format'], 'json');
});

test('flag.enum: throws on unlisted value', () => {
  assert.throws(
    () =>
      parseFlags(['--format', 'xml'], {
        format: flag.enum(['json', 'markdown'], { default: 'markdown' }),
      }),
    /--format must be one of: json, markdown/,
  );
});

// --- error paths ----------------------------------------------------------

test('parseFlags: throws on unknown flag', () => {
  assert.throws(
    () => parseFlags(['--unknown', 'x'], { user: flag.string() }),
    /unknown argument: --unknown/,
  );
});

test('parseFlags: throws when a flag has no value', () => {
  assert.throws(
    () => parseFlags(['--user'], { user: flag.string() }),
    /--user requires a value/,
  );
});

test('parseFlags: short alias consumes the next argv element correctly', () => {
  const { values } = parseFlags(['-l', '5', '--format', 'json'], {
    limit: flag.number({ default: 0, aliases: ['-l'] }),
    format: flag.enum(['json', 'markdown'], { default: 'markdown' }),
  });
  assert.equal(values['limit'], 5);
  assert.equal(values['format'], 'json');
});

test('parseFlags: --help coexists with other flags without consuming values', () => {
  const { values, help } = parseFlags(['--user', 'ansango', '--help', '--format', 'json'], {
    user: flag.string(),
    format: flag.enum(['json', 'markdown'], { default: 'markdown' }),
  });
  assert.equal(help, true);
  assert.equal(values['user'], 'ansango');
  assert.equal(values['format'], 'json');
});
