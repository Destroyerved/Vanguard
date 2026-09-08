/**
 * VANGUARD — statistical primitives for anomaly detection and scoring.
 *
 * Deliberately dependency-free and numerically explicit: every value the UI
 * shows a judge must be reproducible by hand from these functions.
 */

/** Arithmetic mean. Returns 0 for an empty sample. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Sample standard deviation (Bessel-corrected, n-1 denominator).
 * Returns 0 for samples of size 0 or 1, where dispersion is undefined.
 */
export function stdDev(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const mu = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - mu) ** 2;
  return Math.sqrt(acc / (n - 1));
}

/**
 * Standard score of `value` against a baseline sample.
 * Returns 0 when the baseline has no dispersion, which correctly means
 * "no evidence of an outlier" rather than "infinitely anomalous".
 */
export function zScore(value: number, baseline: number[]): number {
  const sigma = stdDev(baseline);
  if (sigma === 0) return 0;
  return (value - mean(baseline)) / sigma;
}

/**
 * Median absolute deviation, a robust dispersion estimate.
 * Used alongside the z-score because a single extreme spike inflates sigma and
 * can mask the very outlier it was meant to catch.
 */
export function medianAbsoluteDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const med = median(values);
  return median(values.map((v) => Math.abs(v - med)));
}

/** Median of a sample. Returns 0 for an empty sample. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!;
}

/**
 * Robust z-score using the median and MAD, scaled by 0.6745 so that for
 * normally distributed data it matches the classical z-score.
 */
export function robustZScore(value: number, baseline: number[]): number {
  const madValue = medianAbsoluteDeviation(baseline);
  if (madValue === 0) return 0;
  return (0.6745 * (value - median(baseline))) / madValue;
}

/** Linear interpolation percentile, `p` in 0..1. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp(p, 0, 1) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

/** Constrain `value` to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Clamp to 0..100 and round to an integer, the canonical VANGUARD score shape. */
export function toScore(value01: number): number {
  return Math.round(clamp(value01, 0, 1) * 100);
}

/** Round to `places` decimals without floating-point display noise. */
export function round(value: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(value * f) / f;
}

/** Map a value from one numeric range to another, clamped to the output range. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}
