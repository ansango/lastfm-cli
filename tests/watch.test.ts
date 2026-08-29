import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { runWatch } from '../src/watch/command.js';

describe('watch subsystem', () => {
  test('runWatch is an exported function', () => {
    assert.equal(typeof runWatch, 'function');
  });
});
