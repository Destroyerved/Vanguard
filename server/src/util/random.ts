/**
 * VANGUARD — deterministic pseudo-random number generation.
 *
 * The simulators must be reproducible. A demo that behaves differently on the
 * judge's machine than on the rehearsal machine is a demo you cannot rehearse.
 * Seeding every simulator from SIM_SEED makes the entire scenario replayable.
 *
 * Algorithm: mulberry32 — a small, fast, well-distributed 32-bit generator.
 */

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** Uniformly pick one element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** Approximately normal deviate via the Box-Muller transform. */
  gaussian(meanValue?: number, stdDev?: number): number;
  /** A new independent generator derived from this one, for per-entity streams. */
  fork(salt: number): Rng;
}

export function createRng(seed: number): Rng {
  // Normalize the seed into a 32-bit unsigned integer.
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng: Rng = {
    next,
    float: (min, max) => min + next() * (max - min),
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: <T,>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('createRng().pick: empty array');
      return items[Math.floor(next() * items.length)]!;
    },
    gaussian: (meanValue = 0, sd = 1) => {
      // Guard against log(0), which would produce Infinity.
      let u = 0;
      while (u === 0) u = next();
      const v = next();
      return meanValue + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    fork: (salt: number) => createRng((seed ^ Math.imul(salt + 1, 0x85ebca6b)) >>> 0),
  };

  return rng;
}

/**
 * Non-seeded generator backed by Math.random, for the few places where
 * reproducibility is genuinely undesirable (connection IDs, request IDs).
 */
export const systemRng: Rng = {
  next: () => Math.random(),
  float: (min, max) => min + Math.random() * (max - min),
  int: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
  chance: (p) => Math.random() < p,
  pick: <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('systemRng.pick: empty array');
    return items[Math.floor(Math.random() * items.length)]!;
  },
  gaussian: (meanValue = 0, sd = 1) => {
    let u = 0;
    while (u === 0) u = Math.random();
    const v = Math.random();
    return meanValue + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  fork: () => systemRng,
};
