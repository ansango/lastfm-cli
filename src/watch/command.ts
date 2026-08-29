/**
 * watch command — Real-time event-driven scrobble watcher for Last.fm.
 *
 * Usage:
 *   lastfm watch --user NAME [--interval SECONDS] [--idle MINUTES] [--format text|json]
 */
import { makeClient } from '../client.js';
import { flag, parseFlags } from '../insights/lib/args.js';
import type { WatcherTrack, WatcherIdleStatus } from '@ansango/lastfm-api/watcher';

const USAGE =
  'lastfm watch --user NAME [--interval SECONDS] [--idle MINUTES] [--format text|json]';

function formatTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export async function runWatch(argv: string[]): Promise<void> {
  const { values, help } = parseFlags(argv, {
    user: flag.string({ aliases: ['-u'] }),
    interval: flag.number({ default: 10, aliases: ['-i'] }),
    idle: flag.number({ default: 5 }),
    format: flag.enum(['text', 'json'], { default: 'text', aliases: ['-f'] }),
  });

  if (help) {
    process.stdout.write(`Usage: ${USAGE}\n`);
    process.exit(0);
  }

  const user = values['user'] as string;
  if (!user) throw new Error('--user is required');

  const intervalSeconds = values['interval'] as number;
  const idleMinutes = values['idle'] as number;
  const format = values['format'] as 'text' | 'json';

  const client = makeClient();
  const watcher = client.watcher.watchUser({
    user,
    intervalMs: Math.max(intervalSeconds * 1000, 2000),
    idleThresholdMs: Math.max(idleMinutes * 60 * 1000, 30_000),
    autoStart: false,
  });

  if (format === 'text') {
    process.stdout.write(
      `👀 Watching scrobbles for "${user}" (interval: ${intervalSeconds}s, idle alert: ${idleMinutes}m)...\n` +
        `Press Ctrl+C to stop.\n\n`,
    );
  }

  watcher.on('nowPlaying', (track: WatcherTrack) => {
    if (format === 'json') {
      process.stdout.write(
        JSON.stringify({ event: 'nowPlaying', timestamp: Date.now(), track }) + '\n',
      );
    } else {
      const albumStr = track.album ? ` (${track.album})` : '';
      process.stdout.write(
        `[${formatTimestamp()}] 🎵 Now Playing: ${track.artist} - ${track.name}${albumStr}\n`,
      );
    }
  });

  watcher.on('nowPlayingEnd', (track: WatcherTrack) => {
    if (format === 'json') {
      process.stdout.write(
        JSON.stringify({ event: 'nowPlayingEnd', timestamp: Date.now(), track }) + '\n',
      );
    } else {
      process.stdout.write(
        `[${formatTimestamp()}] ⏹️ Now Playing ended: ${track.artist} - ${track.name}\n`,
      );
    }
  });

  watcher.on('scrobble', (track: WatcherTrack) => {
    if (format === 'json') {
      process.stdout.write(
        JSON.stringify({ event: 'scrobble', timestamp: Date.now(), track }) + '\n',
      );
    } else {
      const albumStr = track.album ? ` (${track.album})` : '';
      process.stdout.write(
        `[${formatTimestamp()}] 🎧 Scrobble: ${track.artist} - ${track.name}${albumStr}\n`,
      );
    }
  });

  watcher.on('idle', (status: WatcherIdleStatus) => {
    if (format === 'json') {
      process.stdout.write(
        JSON.stringify({ event: 'idle', timestamp: Date.now(), status }) + '\n',
      );
    } else {
      process.stdout.write(
        `[${formatTimestamp()}] 💤 Idle: No activity detected for ${status.idleMinutes} minutes\n`,
      );
    }
  });

  watcher.on('error', (err: Error) => {
    if (format === 'json') {
      process.stdout.write(
        JSON.stringify({ event: 'error', timestamp: Date.now(), message: err.message }) + '\n',
      );
    } else {
      process.stderr.write(`[${formatTimestamp()}] ⚠️ Error: ${err.message}\n`);
    }
  });

  // Handle graceful termination
  const cleanup = () => {
    watcher.stop();
    if (format === 'text') {
      process.stdout.write(`\n🛑 Watcher stopped.\n`);
    }
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  watcher.start();

  // Keep process alive
  await new Promise(() => {});
}
