import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { EXPORTER_COMMANDS } from '../src/exporter/dispatcher.js';

describe('exporter subsystem', () => {
  test('EXPORTER_COMMANDS registers scrobbles, loved, library', () => {
    assert.equal(typeof EXPORTER_COMMANDS['scrobbles'], 'function');
    assert.equal(typeof EXPORTER_COMMANDS['loved'], 'function');
    assert.equal(typeof EXPORTER_COMMANDS['library'], 'function');
  });
});
