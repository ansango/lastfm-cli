/**
 * personality.ts — classify the user into a "listening personality" archetype.
 *
 * Pure: takes a `PersonalityFeatures` object (numbers derived elsewhere)
 * and returns per-archetype scores in [0, 1] plus the winner + reasons.
 *
 * Archetypes (each = a listening behavior):
 *  - Devotee    — extreme focus on a few artists; low diversity, high top1Share.
 *  - Explorer   — very diverse; many new discoveries relative to overall roster.
 *  - Drifter    — moderately diverse; few new discoveries; not extreme in either direction.
 *  - Archivist  — massive library, very even spread, lots of total scrobbles.
 *  - DJ         — many artists, many recent tracks, balanced; high play velocity.
 *  - Nocturnal  — heavy night-time listening (≥50% between 22:00–06:00 UTC).
 *
 * Each archetype's score is a clamped weighted combination of the features
 * it cares about. The winner is the highest score; ties broken by a stable
 * priority order.
 */

export type ArchetypeId = 'Devotee' | 'Explorer' | 'Drifter' | 'DJ' | 'Nocturnal' | 'Archivist';

export const ARCHETYPE_ORDER: readonly ArchetypeId[] = [
  'Devotee', 'Explorer', 'Drifter', 'DJ', 'Nocturnal', 'Archivist',
];

export interface PersonalityFeatures {
  /** Scrobbles in the analysis window. */
  readonly totalScrobbles: number;
  /** Distinct artists in the window. */
  readonly uniqueArtists: number;
  /** Fraction of plays consumed by the top 1 artist. */
  readonly top1Share: number;
  /** Same for top 3. */
  readonly top3Share: number;
  /** Same for top 5. */
  readonly top5Share: number;
  /** Shannon entropy normalized to [0, 1]; 1 = perfectly even. */
  readonly normalizedDiversity: number;
  /** Distinct artists first seen in the last 30 days (NEW for the user). */
  readonly newArtistsLast30d: number;
  /** Distinct artists played at all in the last 30 days. */
  readonly totalArtistsLast30d: number;
  /** Share of scrobbles between 22:00–06:00 UTC. */
  readonly nightHourShare: number;
  /** Share between 06:00–12:00 UTC. */
  readonly morningHourShare: number;
  /** Share on weekdays (Mon–Fri). */
  readonly weekdayShare: number;
}

export interface PersonalityResult {
  readonly scores: Record<ArchetypeId, number>;
  readonly winner: ArchetypeId;
  readonly reasons: readonly string[]; // human-readable, in Spanish
}

// --- Helpers --------------------------------------------------------------

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// --- Scorer ---------------------------------------------------------------

export function scoreArchetypes(features: PersonalityFeatures): PersonalityResult {
  const { scores, reasons } = computeScores(features);
  // Stable tie-break by ARCHETYPE_ORDER.
  let winner: ArchetypeId = ARCHETYPE_ORDER[0]!;
  let best = -Infinity;
  for (const id of ARCHETYPE_ORDER) {
    const s = scores[id];
    if (s > best) {
      best = s;
      winner = id;
    }
  }
  return { scores, winner, reasons: reasons[winner] ?? [] };
}

function computeScores(f: PersonalityFeatures): {
  scores: Record<ArchetypeId, number>;
  reasons: Record<ArchetypeId, string[]>;
} {
  const scores: Record<ArchetypeId, number> = {
    Devotee: 0, Explorer: 0, Drifter: 0, DJ: 0, Nocturnal: 0, Archivist: 0,
  };
  const reasons: Record<ArchetypeId, string[]> = {
    Devotee: [], Explorer: [], Drifter: [], DJ: [], Nocturnal: [], Archivist: [],
  };

  // Devotee: high top1Share + low diversity + small unique roster.
  {
    const focus = clamp01((f.top1Share - 0.15) / 0.5); // 0 at ≤15%, 1 at ≥65%
    const monotony = clamp01((0.6 - f.normalizedDiversity) / 0.6); // 0 above .6, 1 below 0
    const smallness = clamp01((20 - f.uniqueArtists) / 20); // 1 if ≤0, 0 if ≥20
    scores.Devotee = clamp01(0.5 * focus + 0.3 * monotony + 0.2 * smallness);
    if (focus > 0.5) reasons.Devotee.push(`Tu artista principal concentra el ${(f.top1Share * 100).toFixed(0)}% de tus scrobbles.`);
    if (monotony > 0.5) reasons.Devotee.push(`Diversidad baja (${f.normalizedDiversity.toFixed(2)}): vuelves siempre a lo mismo.`);
    if (smallness > 0.5) reasons.Devotee.push(`Solo ${f.uniqueArtists} artistas distintos en la ventana.`);
  }

  // Explorer: high diversity + many new artists relative to total roster.
  {
    const diversity = f.normalizedDiversity;
    const newRatio = f.totalArtistsLast30d > 0
      ? clamp01(f.newArtistsLast30d / f.totalArtistsLast30d)
      : 0;
    scores.Explorer = clamp01(0.5 * diversity + 0.5 * newRatio);
    if (diversity > 0.7) reasons.Explorer.push(`Diversidad muy alta (${diversity.toFixed(2)}).`);
    if (newRatio > 0.2) reasons.Explorer.push(`${f.newArtistsLast30d} artistas nuevos este mes sobre ${f.totalArtistsLast30d} totales.`);
  }

  // Drifter: middle of the road on everything; few new discoveries.
  {
    const midDiversity = 1 - Math.abs(f.normalizedDiversity - 0.65) / 0.35; // peaks at 0.65
    const lowNovelty = clamp01((0.15 - (f.totalArtistsLast30d > 0 ? f.newArtistsLast30d / f.totalArtistsLast30d : 0)) / 0.15);
    const lowFocus = clamp01((0.4 - f.top3Share) / 0.4);
    scores.Drifter = clamp01(0.4 * midDiversity + 0.3 * lowNovelty + 0.3 * lowFocus);
    if (midDiversity > 0.7) reasons.Drifter.push(`Diversidad media (${f.normalizedDiversity.toFixed(2)}): ni ecléctico ni monotemático.`);
    if (lowNovelty > 0.5) reasons.Drifter.push(`Pocas novedades este mes.`);
  }

  // DJ: high total scrobbles + many artists + reasonable diversity.
  {
    const velocity = clamp01((f.totalScrobbles - 200) / 1800); // 0 at ≤200, 1 at ≥2000
    const breadth = clamp01((f.uniqueArtists - 20) / 80); // 0 at ≤20, 1 at ≥100
    scores.DJ = clamp01(0.5 * velocity + 0.3 * breadth + 0.2 * f.normalizedDiversity);
    if (velocity > 0.5) reasons.DJ.push(`${f.totalScrobbles} scrobbles en la ventana: escuchas mucho.`);
    if (breadth > 0.5) reasons.DJ.push(`${f.uniqueArtists} artistas distintos.`);
  }

  // Nocturnal: nightHourShare dominant.
  {
    const nightness = clamp01((f.nightHourShare - 0.4) / 0.2); // 0 at ≤40%, 1 at ≥60%
    const antiDaytime = clamp01((0.3 - f.morningHourShare) / 0.3);
    scores.Nocturnal = clamp01(0.7 * nightness + 0.3 * antiDaytime);
    if (nightness > 0.5) reasons.Nocturnal.push(`${(f.nightHourShare * 100).toFixed(0)}% de tus scrobbles son entre las 22:00 y las 06:00 UTC.`);
  }

  // Archivist: massive library, very even spread, lots of total scrobbles.
  {
    const massive = clamp01((f.totalScrobbles - 1500) / 3500); // 0 at ≤1500, 1 at ≥5000
    const hugeRoster = clamp01((f.uniqueArtists - 100) / 200); // 0 at ≤100, 1 at ≥300
    const spread = clamp01((1 - f.top5Share) / 0.5); // 0 when top5=1, 1 when top5=0.5
    scores.Archivist = clamp01(0.4 * massive + 0.4 * hugeRoster + 0.2 * spread);
    if (massive > 0.5) reasons.Archivist.push(`${f.totalScrobbles} scrobbles: una colección enorme.`);
    if (hugeRoster > 0.5) reasons.Archivist.push(`${f.uniqueArtists} artistas distintos.`);
    if (spread > 0.5) reasons.Archivist.push(`Tu top 5 solo concentra el ${(f.top5Share * 100).toFixed(0)}%.`);
  }

  return { scores, reasons };
}

// --- Public labels for renderers ------------------------------------------

export const ARCHETYPE_LABELS: Record<ArchetypeId, { es: string; emoji: string; blurb: string }> = {
  Devotee: {
    es: 'El Devoto',
    emoji: '🛐',
    blurb: 'Vuelves siempre a tus artistas. Poca dispersión, alta concentración.',
  },
  Explorer: {
    es: 'El Explorador',
    emoji: '🧭',
    blurb: 'Siempre descubriendo algo nuevo. Tu radar es ancho.',
  },
  Drifter: {
    es: 'El Errante',
    emoji: '🍂',
    blurb: 'Escuchas de todo un poco, sin grandes fijaciones ni búsquedas activas.',
  },
  DJ: {
    es: 'El DJ',
    emoji: '🎧',
    blurb: 'Escuchas mucho, en mucha variedad. Tu rotación es intensa.',
  },
  Nocturnal: {
    es: 'El Nocturno',
    emoji: '🌙',
    blurb: 'Tu música vive de noche. La madrugada es tu horario.',
  },
  Archivist: {
    es: 'El Archivista',
    emoji: '📚',
    blurb: 'Tienes una colección masiva y muy ecléctica. Tu historial es profundo.',
  },
};
