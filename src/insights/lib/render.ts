/**
 * render.ts — turn Summary and NowPlaying into friendly markdown blocks for chat.
 *
 * Pure string transformation. The LLM-friendly version — keeps numbers and
 * ordering deterministic, drops API noise (mbid, image arrays, URL soup).
 */
import type {
  InsightsSummaryResponse as Summary,
  InsightsNowPlayingResponse as NowPlaying,
} from '@ansango/lastfm-api/insights';

function pad(n: number): string {
  return n.toString().padStart(2, ' ');
}

export function renderSummaryMarkdown(s: Summary): string {
  const lines: string[] = [];
  lines.push(`# Summary for ${s.user} — ${s.label}`);
  lines.push('');

  // Total
  lines.push(`**Scrobbles in period:** ${s.totalScrobbles.toLocaleString('en-US')}`);
  lines.push('');

  // Artists
  if (s.topArtists.length > 0) {
    lines.push('## Top artists');
    s.topArtists.forEach((a, i) => {
      lines.push(`${pad(i + 1)}. **${a.name}** — ${a.playcount} plays`);
    });
    lines.push('');
  } else {
    lines.push('_No artist data for this period._');
    lines.push('');
  }

  // Tracks
  if (s.topTracks.length > 0) {
    lines.push('## Top tracks');
    s.topTracks.forEach((t) => {
      const artist = t.artist ? ` — ${t.artist}` : '';
      const album = t.album ? ` _(from album ${t.album})_` : '';
      lines.push(`- **${t.name}**${artist} — ${t.playcount} plays${album}`);
    });
    lines.push('');
  }

  // Albums
  if (s.topAlbums.length > 0) {
    lines.push('## Top albums');
    s.topAlbums.forEach((a) => {
      const artist = a.artist ? ` — ${a.artist}` : '';
      lines.push(`- **${a.name}**${artist} — ${a.playcount} plays`);
    });
    lines.push('');
  }

  // Tags
  if (s.topTags.length > 0) {
    lines.push('## Tags');
    s.topTags.forEach((t) => {
      lines.push(`- \`${t.name}\` (${t.count})`);
    });
    lines.push('');
  }

  // Diversity (only if available)
  if (s.diversity) {
    const d = s.diversity;
    const pct = (n: number) => (n * 100).toFixed(0) + '%';
    lines.push('## Diversity');
    lines.push(`- Unique artists: ${d.uniqueArtists}`);
    lines.push(`- Normalized entropy: ${d.normalized.toFixed(2)} (0 = single-track focus, 1 = maximum eclectic)`);
    lines.push(`- Your top 1: ${pct(d.top1Share)} of plays · top 3: ${pct(d.top3Share)} · top 5: ${pct(d.top5Share)}`);
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}

export function renderNowPlayingMarkdown(np: NowPlaying): string {
  const lines: string[] = [];
  const heading = np.nowPlaying
    ? `# ▶️ Now playing for ${np.user}`
    : `# Last scrobble for ${np.user}`;
  lines.push(heading);
  lines.push('');
  lines.push(`**${np.track.name}** — ${np.artist.name}`);
  if (np.album) lines.push(`_from album ${np.album}_`);
  lines.push('');
  if (np.bio) {
    lines.push(`> ${np.bio}`);
    lines.push('');
  }
  if (np.similar.length > 0) {
    lines.push('**You might like:** ' + np.similar.map((a) => a.name).join(', '));
    lines.push('');
  }
  if (np.track.url) lines.push(`More info: ${np.track.url}`);
  return lines.join('\n').trimEnd() + '\n';
}
