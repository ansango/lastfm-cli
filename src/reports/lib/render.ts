import type {
  ReportsWrappedResponse,
  ReportsMilestonesResponse,
  ReportsMonthlyDigestResponse,
} from '@ansango/lastfm-api/reports';

export function renderWrappedMarkdown(res: ReportsWrappedResponse): string {
  const lines: string[] = [];
  const yearLabel = res.year ? `${res.year}` : 'Custom Period';
  const hours = Math.floor(res.estimatedListeningMinutes / 60);
  const minutes = Math.round(res.estimatedListeningMinutes % 60);

  lines.push(`# 🎁 Last.fm Wrapped: ${res.user} (${yearLabel})`);
  lines.push('');
  lines.push(`- **Total Scrobbles:** ${res.totalScrobbles.toLocaleString()}`);
  lines.push(`- **Estimated Listening Time:** ${hours} hours, ${minutes} minutes`);
  lines.push(
    `- **Busiest Day:** ${res.busiestDay.date} (${res.busiestDay.scrobbles} scrobbles${
      res.busiestDay.topArtist ? ` — top artist: ${res.busiestDay.topArtist}` : ''
    })`,
  );
  lines.push('');

  lines.push('## 🏆 Top Artists');
  if (res.topArtists.length === 0) {
    lines.push('_No artists recorded for this period._');
  } else {
    lines.push('| Rank | Artist | Plays | % Total |');
    lines.push('| :--- | :--- | :--- | :--- |');
    res.topArtists.forEach((a, i) => {
      const pct = a.percentage !== undefined ? `${a.percentage.toFixed(1)}%` : '-';
      lines.push(`| #${i + 1} | ${a.name} | ${a.playcount.toLocaleString()} | ${pct} |`);
    });
  }
  lines.push('');

  lines.push('## 🎵 Top Tracks');
  if (res.topTracks.length === 0) {
    lines.push('_No tracks recorded for this period._');
  } else {
    lines.push('| Rank | Track | Artist | Plays |');
    lines.push('| :--- | :--- | :--- | :--- |');
    res.topTracks.forEach((t, i) => {
      lines.push(`| #${i + 1} | ${t.name} | ${t.artist} | ${t.playcount.toLocaleString()} |`);
    });
  }
  lines.push('');

  lines.push('## 💿 Top Albums');
  if (res.topAlbums.length === 0) {
    lines.push('_No albums recorded for this period._');
  } else {
    lines.push('| Rank | Album | Artist | Plays |');
    lines.push('| :--- | :--- | :--- | :--- |');
    res.topAlbums.forEach((alb, i) => {
      lines.push(`| #${i + 1} | ${alb.name} | ${alb.artist} | ${alb.playcount.toLocaleString()} |`);
    });
  }
  lines.push('');

  lines.push('## 🌦️ Seasonal Soundtracks');
  const seasons = [
    { label: '❄️ Winter', data: res.seasons.winter },
    { label: '🌸 Spring', data: res.seasons.spring },
    { label: '☀️ Summer', data: res.seasons.summer },
    { label: '🍂 Fall', data: res.seasons.fall },
  ];
  for (const s of seasons) {
    const artist = s.data.topArtist ?? 'N/A';
    const track = s.data.topTrack ?? 'N/A';
    lines.push(
      `- **${s.label}:** ${s.data.scrobbles.toLocaleString()} scrobbles (Top: ${artist} / ${track})`,
    );
  }
  lines.push('');

  return lines.join('\n');
}

export function renderMilestonesMarkdown(res: ReportsMilestonesResponse): string {
  const lines: string[] = [];
  lines.push(`# 🎯 Scrobbles Milestones: ${res.user}`);
  lines.push('');
  lines.push(`- **All-time Scrobbles:** ${res.totalScrobbles.toLocaleString()}`);
  lines.push('');

  lines.push('## 🏅 Achieved Milestones');
  if (res.milestones.length === 0) {
    lines.push('_No milestones recorded in historical sample._');
  } else {
    lines.push('| Milestone | Track | Artist | Date |');
    lines.push('| :--- | :--- | :--- | :--- |');
    for (const m of res.milestones) {
      lines.push(
        `| **${m.milestone.toLocaleString()}** | ${m.track} | ${m.artist} | ${m.date} |`,
      );
    }
  }
  lines.push('');

  lines.push('## 🚀 Next Milestone Projection');
  lines.push(`- **Target:** ${res.nextMilestone.target.toLocaleString()} scrobbles`);
  lines.push(
    `- **Remaining:** ${res.nextMilestone.remainingScrobbles.toLocaleString()} scrobbles`,
  );
  lines.push(
    `- **Estimated Days:** ~${res.nextMilestone.estimatedDaysRemaining.toFixed(1)} days`,
  );
  lines.push(`- **Projected Date:** ${res.nextMilestone.projectedDate}`);
  lines.push('');

  return lines.join('\n');
}

export function renderMonthlyDigestMarkdown(res: ReportsMonthlyDigestResponse): string {
  const lines: string[] = [];
  const growthSign = res.growthPercentage >= 0 ? '+' : '';
  const growthEmoji = res.growthPercentage >= 0 ? '📈' : '📉';

  lines.push(`# 📅 Monthly Digest: ${res.user} — ${res.monthName} ${res.year}`);
  lines.push('');
  lines.push(`- **Scrobbles this month:** ${res.totalScrobbles.toLocaleString()}`);
  lines.push(
    `- **Previous month:** ${res.previousMonthScrobbles.toLocaleString()} (${growthEmoji} ${growthSign}${res.growthPercentage.toFixed(1)}%)`,
  );
  lines.push('');

  lines.push('## 🏆 Top Artists');
  if (res.topArtists.length === 0) {
    lines.push('_No artists recorded this month._');
  } else {
    res.topArtists.forEach((a, i) => {
      lines.push(`${i + 1}. **${a.name}** — ${a.playcount.toLocaleString()} plays`);
    });
  }
  lines.push('');

  lines.push('## 🎵 Top Tracks');
  if (res.topTracks.length === 0) {
    lines.push('_No tracks recorded this month._');
  } else {
    res.topTracks.forEach((t, i) => {
      lines.push(`${i + 1}. **${t.name}** by *${t.artist}* — ${t.playcount.toLocaleString()} plays`);
    });
  }
  lines.push('');

  return lines.join('\n');
}
