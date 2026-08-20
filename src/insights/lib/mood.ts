/**
 * mood.ts — derive a "mood profile" from a list of Last.fm tags.
 *
 * Two parts:
 *  1. TAXONOMY — declarative maps that the user can edit without touching
 *     the classifier logic. Tags are case-insensitive and normalized.
 *  2. CLASSIFIER — pure functions: `axesFromTags`, `categoriesFromTags`,
 *     and `classifyMood` (which wraps both and adds a human-readable label
 *     and a confidence score).
 *
 * The taxonomy below is intentionally small but representative. Extend it
 * whenever a new tag pattern shows up in real data. Last.fm has thousands
 * of tags, so this is a curated subset focused on the user's signal.
 *
 * Axes:
 *   energy   ∈ [-1, +1]   -1 = ambient/sleep, +1 = hardcore/thrash
 *   valence  ∈ [-1, +1]   -1 = doom/sad,    +1 = euphoric/uplifting
 *
 * Categories (discrete): rock, electronic, hip-hop, jazz, folk, classical,
 * ambient, experimental, metal, pop, world, punk, country, soul.
 */

// --- Taxonomy -------------------------------------------------------------

/** Tag → contribution to an axis in [-1, +1]. Multiple tags average out. */
const ENERGY: Record<string, number> = {
  // high energy
  hardcore: 1, punk: 0.8, 'punk rock': 0.8, 'hard rock': 0.7, 'thrash metal': 1,
  'speed metal': 1, grindcore: 1, drum: 0.7, 'drum and bass': 0.8, dnb: 0.8,
  techno: 0.6, gabber: 1, 'happy hardcore': 1, rave: 0.9,
  'thrash': 0.9, metal: 0.6, 'heavy metal': 0.7, 'death metal': 0.8,
  'black metal': 0.6, rock: 0.5, 'indie rock': 0.4, pop: 0.3, dance: 0.6,
  hip: 0.5, rap: 0.4, hiphop: 0.5,
  // low energy
  ambient: -1, drone: -0.9, sleep: -1, 'new age': -0.8, meditation: -0.9,
  downtempo: -0.6, chillout: -0.6, chill: -0.6, lounge: -0.5,
  'trip-hop': -0.4, 'slow core': -0.5, 'slowcore': -0.5,
  ballad: -0.4, jazz: -0.2, 'smooth jazz': -0.4, 'bossa nova': -0.3,
};

const VALENCE: Record<string, number> = {
  // high valence (euphoric / happy)
  euphoric: 1, happy: 1, uplifting: 0.9, summer: 0.5, sunshine: 0.6,
  'feel good': 0.8, feelgood: 0.8, dance: 0.6, party: 0.7,
  pop: 0.4, 'power pop': 0.6, 'bubblegum pop': 0.5, 'k-pop': 0.4,
  // low valence (sad / dark)
  doom: -1, sad: -1, melancholic: -0.9, melancholy: -0.9, depressive: -1,
  black: -0.7, 'black metal': -0.7, 'dark ambient': -0.8, dark: -0.6,
  funeral: -1, 'funeral doom': -1, 'doom metal': -0.9, goth: -0.7, gothic: -0.7,
  'gothic rock': -0.6, 'post-punk': -0.4, 'coldwave': -0.6,
  // neutral-ish
  indie: 0, 'indie rock': 0, rock: 0, electronic: 0, experimental: 0,
};

/** tag → category. A tag can map to multiple categories. */
const CATEGORIES: Record<string, readonly string[]> = {
  rock: ['rock', 'indie rock', 'post-rock', 'garage rock', 'hard rock'],
  electronic: ['electronic', 'techno', 'house', 'ambient', 'idm', 'dnb', 'drum and bass', 'dubstep', 'synth'],
  'hip-hop': ['hip-hop', 'hip hop', 'rap', 'trap'],
  jazz: ['jazz', 'bebop', 'bossa nova', 'smooth jazz', 'nu jazz', 'free jazz'],
  folk: ['folk', 'singer-songwriter', 'acoustic', 'indie folk', 'folk rock'],
  classical: ['classical', 'baroque', 'romantic', 'modern classical', 'opera', 'symphony'],
  ambient: ['ambient', 'drone', 'new age', 'meditation', 'dark ambient'],
  experimental: ['experimental', 'noise', 'avant-garde', 'free improvisation'],
  metal: ['metal', 'thrash metal', 'doom metal', 'death metal', 'black metal', 'heavy metal', 'sludge'],
  pop: ['pop', 'synth-pop', 'electropop', 'k-pop', 'indie pop', 'dream pop'],
  world: ['world', 'afrobeat', 'latin', 'flamenco', 'brazilian', 'reggae'],
  punk: ['punk', 'post-punk', 'hardcore', 'anarcho-punk'],
  country: ['country', 'bluegrass', 'outlaw country', 'country rock'],
  soul: ['soul', 'r&b', 'funk', 'motown', 'neo-soul'],
};

// --- Normalization --------------------------------------------------------

function normalize(tag: string): string {
  return tag.toLowerCase().trim();
}

function lookup(map: Record<string, number>, tag: string): number {
  return map[tag] ?? 0;
}

// --- Public types ---------------------------------------------------------

export interface MoodAxes {
  readonly energy: number;
  readonly valence: number;
}

export interface MoodProfile {
  readonly axes: MoodAxes;
  /** Quadrant label derived from the axes, e.g. "agresivo y sombrío". */
  readonly label: string;
  /** Discrete categories with the most tag matches (descending). */
  readonly categories: readonly string[];
  /** [0, 1] — fraction of tags that contributed (recognized). */
  readonly confidence: number;
}

// --- Pure functions -------------------------------------------------------

export function axesFromTags(tags: readonly string[]): MoodAxes {
  if (tags.length === 0) return { energy: 0, valence: 0 };
  let energy = 0;
  let valence = 0;
  for (const t of tags) {
    energy += lookup(ENERGY, normalize(t));
    valence += lookup(VALENCE, normalize(t));
  }
  // Average and clamp.
  const avg = (n: number) => Math.max(-1, Math.min(1, n / tags.length));
  return { energy: round2(avg(energy)), valence: round2(avg(valence)) };
}

export function categoriesFromTags(tags: readonly string[]): readonly string[] {
  if (tags.length === 0) return [];
  const counts = new Map<string, number>();
  for (const tag of tags) {
    const norm = normalize(tag);
    for (const [cat, members] of Object.entries(CATEGORIES)) {
      if (members.includes(norm)) {
        counts.set(cat, (counts.get(cat) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);
}

export function classifyMood(tags: readonly string[]): MoodProfile {
  const axes = axesFromTags(tags);
  const categories = categoriesFromTags(tags);

  // Confidence: fraction of tags that hit at least one taxonomy entry.
  const recognized = tags.filter((t) => {
    const norm = normalize(t);
    return (
      ENERGY[norm] !== undefined ||
      VALENCE[norm] !== undefined ||
      Object.values(CATEGORIES).some((arr) => arr.includes(norm))
    );
  }).length;
  const confidence = tags.length === 0 ? 0 : round2(recognized / tags.length);

  return {
    axes,
    label: labelFromAxes(axes),
    categories,
    confidence,
  };
}

// --- Labeling -------------------------------------------------------------

/** Map axes to a Spanish-language quadrant descriptor. */
export function labelFromAxes({ energy, valence }: MoodAxes): string {
  if (energy === 0 && valence === 0) return 'neutral / indefinido';
  // Two halves × two halves = 4 quadrants + 4 axes + center.
  const eHigh = energy > 0.2;
  const eLow = energy < -0.2;
  const vHigh = valence > 0.2;
  const vLow = valence < -0.2;
  if (eHigh && vHigh) return 'eufórico y enérgico';
  if (eHigh && vLow) return 'agresivo y sombrío';
  if (eLow && vHigh) return 'relajado y luminoso';
  if (eLow && vLow) return 'melancólico y quieto';
  // On an axis (not in any quadrant): describe which way it leans.
  if (eHigh && !vHigh && !vLow) return 'intenso sin carga emocional clara';
  if (eLow && !vHigh && !vLow) return 'calmado sin carga emocional clara';
  if (vHigh && !eHigh && !eLow) return 'luminoso pero contenido';
  if (vLow && !eHigh && !eLow) return 'oscuro pero contenido';
  return 'neutral / indefinido';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- Re-export the raw taxonomy for callers that want to introspect it ---
export const TAXONOMY = {
  energy: ENERGY,
  valence: VALENCE,
  categories: CATEGORIES,
} as const;
