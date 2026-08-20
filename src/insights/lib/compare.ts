/**
 * compare.ts — compare two ranked artist lists by name overlap.
 *
 * Pure. Returns intersection, only-in-A, only-in-B, Jaccard similarity,
 * and the intersection sorted by min(playcount) descending (so the most
 * "mutual" artists appear first).
 */
export interface NamedEntry {
  readonly name: string;
  readonly playcount: number;
}

export interface CompareResult {
  readonly aCount: number;
  readonly bCount: number;
  readonly intersection: readonly string[];
  /** Intersection sorted by min(a.playcount, b.playcount) descending. */
  readonly rankedIntersection: readonly NamedEntry[];
  readonly onlyA: readonly string[];
  readonly onlyB: readonly string[];
  readonly jaccard: number;
}

/** Jaccard similarity: |A ∩ B| / |A ∪ B|. Returns 0 for empty inputs. */
export function jaccard<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  if (union === 0) return 0;
  return inter / union;
}

export function compareArtists(a: readonly NamedEntry[], b: readonly NamedEntry[]): CompareResult {
  const mapA = new Map<string, number>();
  const mapB = new Map<string, number>();
  for (const x of a) mapA.set(x.name, x.playcount);
  for (const x of b) mapB.set(x.name, x.playcount);

  const intersection: string[] = [];
  const onlyA: string[] = [];
  const onlyB: string[] = [];

  for (const [name] of mapA) {
    if (mapB.has(name)) intersection.push(name);
    else onlyA.push(name);
  }
  for (const [name] of mapB) {
    if (!mapA.has(name)) onlyB.push(name);
  }

  const rankedIntersection: NamedEntry[] = intersection
    .map((name) => ({
      name,
      playcount: Math.min(mapA.get(name) ?? 0, mapB.get(name) ?? 0),
    }))
    .sort((x, y) => y.playcount - x.playcount);

  const setA = new Set(mapA.keys());
  const setB = new Set(mapB.keys());
  const j = jaccard(setA, setB);

  return {
    aCount: a.length,
    bCount: b.length,
    intersection: intersection.sort(),
    rankedIntersection,
    onlyA: onlyA.sort(),
    onlyB: onlyB.sort(),
    jaccard: j,
  };
}
