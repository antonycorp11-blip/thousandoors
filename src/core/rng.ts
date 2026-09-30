// Deterministic seeded randomness. Every random decision in the House goes through here.

export function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  private r: () => number;
  constructor(public seed: number) { this.r = mulberry32(seed); }
  static from(...parts: (string | number)[]): RNG { return new RNG(hashStr(parts.join('|'))); }
  next(): number { return this.r(); }
  float(a: number, b: number): number { return a + (b - a) * this.r(); }
  int(a: number, b: number): number { return Math.floor(a + (b - a + 1) * this.r()); }
  chance(p: number): boolean { return this.r() < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.r() * arr.length)]; }
  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    const total = items.reduce((s, t) => s + Math.max(0, weight(t)), 0);
    let x = this.r() * total;
    for (const t of items) { x -= Math.max(0, weight(t)); if (x <= 0) return t; }
    return items[items.length - 1];
  }
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.r() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/** Stable per-run chance roll: same run + salt → same answer. */
export function seededChance(seed: number, salt: string, p: number): boolean {
  return mulberry32(hashStr(seed + '#' + salt))() < p;
}
export function seededFloat(seed: number, salt: string): number {
  return mulberry32(hashStr(seed + '#' + salt))();
}
