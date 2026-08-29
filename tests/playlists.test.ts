import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYLISTS_COMMANDS } from '../src/playlists/dispatcher.js';

describe('playlists subsystem', () => {
  test('PLAYLISTS_COMMANDS registers generate, export-m3u, export-csv', () => {
    assert.equal(typeof PLAYLISTS_COMMANDS['generate'], 'function');
    assert.equal(typeof PLAYLISTS_COMMANDS['export-m3u'], 'function');
    assert.equal(typeof PLAYLISTS_COMMANDS['export-csv'], 'function');
  });
});
