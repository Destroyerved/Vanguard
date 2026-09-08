/**
 * VANGUARD — time helpers.
 *
 * Every timestamp crossing a module boundary is an ISO 8601 UTC string.
 * Epoch milliseconds are used only inside computations.
 */

/** Current time as an ISO 8601 UTC string. */
export const nowIso = (): string => new Date().toISOString();

/** Convert an ISO string to epoch milliseconds. Returns NaN when unparseable. */
export const toEpochMs = (iso: string): number => Date.parse(iso);

/** Convert epoch milliseconds to an ISO 8601 UTC string. */
export const toIso = (epochMs: number): string => new Date(epochMs).toISOString();

/**
 * Age of an ISO timestamp in seconds relative to `reference` (default: now).
 * Clamped at 0 so clock skew on a source cannot produce negative ages that
 * would inflate the recency factor above 1.
 */
export function ageSeconds(iso: string, reference: number = Date.now()): number {
  const t = toEpochMs(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (reference - t) / 1000);
}

/** Absolute separation between two ISO timestamps, seconds. */
export function deltaSeconds(isoA: string, isoB: string): number {
  const a = toEpochMs(isoA);
  const b = toEpochMs(isoB);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.abs(a - b) / 1000;
}

/** ISO timestamp `seconds` in the past. */
export const isoSecondsAgo = (seconds: number): string => toIso(Date.now() - seconds * 1000);

/** Compact military-style time group, e.g. "081145Z SEP 26". */
export function toDateTimeGroup(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'UNKNOWN';
  const p2 = (n: number): string => String(n).padStart(2, '0');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return (
    `${p2(d.getUTCDate())}${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}Z ` +
    `${months[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`
  );
}

/** Human-friendly relative age, e.g. "4m 12s ago". */
export function humanAge(iso: string, reference: number = Date.now()): string {
  const s = ageSeconds(iso, reference);
  if (!Number.isFinite(s)) return 'unknown';
  if (s < 60) return `${Math.round(s)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${Math.round(s % 60)}s ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}
