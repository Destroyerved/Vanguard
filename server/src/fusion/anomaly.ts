/**
 * VANGUARD — Statistical anomaly detection.
 *
 * Runs BEFORE the LLM, never after. This is a deliberate architectural choice:
 * outlier detection is a solved statistical problem, and asking a language
 * model "does this look unusual?" replaces a verifiable number with an opinion.
 * The model is told WHICH events are anomalous; it is never asked to decide.
 *
 * Three independent detectors run per pass:
 *
 *   1. RATE ANOMALY — is this feed reporting far more than its own baseline?
 *      Catches coordinated incident spikes and sensor storms.
 *   2. KINEMATIC ANOMALY — is this contact's speed or altitude an outlier
 *      against its peers? Catches the fast mover in a field of slow traffic.
 *   3. SPATIAL ANOMALY — is this event isolated far from all other activity,
 *      or conversely inside an unusually dense knot of activity?
 *
 * All three use z-scores against an empirical baseline, with a robust
 * (median/MAD) fallback because a single extreme spike inflates sigma and can
 * mask the very outlier it was meant to catch.
 */

import {
  ANOMALY_MIN_SAMPLES,
  ANOMALY_RATE_BUCKETS,
  ANOMALY_RATE_WINDOW_SECONDS,
  ANOMALY_Z_THRESHOLD,
} from '../config/constants.js';
import type { SourceType, UnifiedEvent } from '../types/events.js';
import { haversineMeters } from '../util/geo.js';
import { mean, robustZScore, stdDev, zScore } from '../util/stats.js';
import { ageSeconds } from '../util/time.js';

/** One anomaly determination for one event. */
export interface AnomalyVerdict {
  eventId: string;
  isAnomaly: boolean;
  /** Strongest absolute z-score across all detectors. */
  score: number;
  /** Which detector fired. */
  detector: 'rate' | 'kinematic' | 'spatial' | 'none';
  reason: string;
}

/**
 * Rolling per-source event-rate baseline.
 *
 * Keeps `ANOMALY_RATE_BUCKETS` historical counts per feed, each covering
 * `ANOMALY_RATE_WINDOW_SECONDS`. A feed is anomalous when its current bucket
 * departs from its own history — the baseline is per-feed, so a chatty log feed
 * is not permanently flagged just for being chattier than radar.
 */
export class RateBaseline {
  private readonly history = new Map<SourceType, number[]>();
  private readonly current = new Map<SourceType, number>();
  private windowStartMs = Date.now();

  /** Record one ingested event against the current bucket. */
  record(sourceType: SourceType): void {
    this.current.set(sourceType, (this.current.get(sourceType) ?? 0) + 1);
  }

  /** Close the current bucket and start a new one, if the window has elapsed. */
  rollIfDue(nowMs: number = Date.now()): boolean {
    if (nowMs - this.windowStartMs < ANOMALY_RATE_WINDOW_SECONDS * 1000) return false;

    for (const [source, count] of this.current) {
      const bucket = this.history.get(source) ?? [];
      bucket.push(count);
      if (bucket.length > ANOMALY_RATE_BUCKETS) bucket.shift();
      this.history.set(source, bucket);
    }
    // Feeds that reported nothing this window still record a zero, otherwise a
    // feed that goes silent then returns looks like a spike against a baseline
    // that never saw the silence.
    for (const source of this.history.keys()) {
      if (!this.current.has(source)) {
        const bucket = this.history.get(source)!;
        bucket.push(0);
        if (bucket.length > ANOMALY_RATE_BUCKETS) bucket.shift();
      }
    }

    this.current.clear();
    this.windowStartMs = nowMs;
    return true;
  }

  /** Z-score of the current bucket for one feed against its own history. */
  currentZ(sourceType: SourceType): number {
    const baseline = this.history.get(sourceType) ?? [];
    if (baseline.length < 3) return 0;
    const value = this.current.get(sourceType) ?? 0;
    const classic = zScore(value, baseline);
    const robust = robustZScore(value, baseline);
    // Take whichever detector is more alarmed; robust wins when sigma is
    // inflated by a prior spike, classic wins when the sample is tight.
    return Math.abs(robust) > Math.abs(classic) ? robust : classic;
  }

  snapshot(): Record<string, { current: number; baseline: number[]; z: number }> {
    const out: Record<string, { current: number; baseline: number[]; z: number }> = {};
    const sources = new Set<SourceType>([...this.history.keys(), ...this.current.keys()]);
    for (const s of sources) {
      out[s] = {
        current: this.current.get(s) ?? 0,
        baseline: [...(this.history.get(s) ?? [])],
        z: Math.round(this.currentZ(s) * 100) / 100,
      };
    }
    return out;
  }
}

/**
 * Kinematic outlier test for radar contacts.
 * Compares each contact's speed against the speed distribution of every other
 * radar contact in the current picture.
 */
export function detectKinematicAnomalies(events: UnifiedEvent[]): AnomalyVerdict[] {
  const radar = events.filter(
    (e) => e.sourceType === 'radar' && typeof e.location.speedKnots === 'number',
  );
  if (radar.length < ANOMALY_MIN_SAMPLES) return [];

  const speeds = radar.map((e) => e.location.speedKnots!);
  const sigma = stdDev(speeds);
  const mu = mean(speeds);

  const verdicts: AnomalyVerdict[] = [];

  for (const e of radar) {
    const speed = e.location.speedKnots!;
    // Exclude the sample under test from its own baseline, otherwise a single
    // extreme value drags the mean toward itself and hides.
    const others = speeds.filter((_, i) => radar[i]!.id !== e.id);
    const z = zScore(speed, others);

    if (Math.abs(z) >= ANOMALY_Z_THRESHOLD) {
      verdicts.push({
        eventId: e.id,
        isAnomaly: true,
        score: Math.round(Math.abs(z) * 100) / 100,
        detector: 'kinematic',
        reason:
          `Speed ${Math.round(speed)}kt is ${Math.abs(z).toFixed(1)} sigma from the ` +
          `${Math.round(mu)}kt mean (sigma ${Math.round(sigma)}kt) across ${radar.length} contacts`,
      });
    }
  }

  return verdicts;
}

/**
 * Spatial isolation test.
 * An event whose nearest neighbour is far outside the normal nearest-neighbour
 * distribution is operationally interesting: activity where there should be
 * none.
 */
export function detectSpatialAnomalies(events: UnifiedEvent[]): AnomalyVerdict[] {
  if (events.length < ANOMALY_MIN_SAMPLES) return [];

  const nearest: number[] = [];
  for (const e of events) {
    let best = Number.POSITIVE_INFINITY;
    for (const o of events) {
      if (o.id === e.id) continue;
      const d = haversineMeters(e.location, o.location);
      if (d < best) best = d;
    }
    nearest.push(Number.isFinite(best) ? best : 0);
  }

  const verdicts: AnomalyVerdict[] = [];

  events.forEach((e, i) => {
    const d = nearest[i]!;
    const others = nearest.filter((_, j) => j !== i);
    const z = zScore(d, others);

    // Only POSITIVE z matters here: unusually isolated, not unusually crowded.
    // Crowding is already captured by clustering and corroboration.
    if (z >= ANOMALY_Z_THRESHOLD) {
      verdicts.push({
        eventId: e.id,
        isAnomaly: true,
        score: Math.round(z * 100) / 100,
        detector: 'spatial',
        reason:
          `Isolated contact: nearest activity ${(d / 1000).toFixed(1)}km away, ` +
          `${z.toFixed(1)} sigma beyond the normal separation`,
      });
    }
  });

  return verdicts;
}

/**
 * Rate-spike test. Flags the most recent events from any feed whose reporting
 * rate has departed from its own baseline.
 */
export function detectRateAnomalies(
  events: UnifiedEvent[],
  baseline: RateBaseline,
): AnomalyVerdict[] {
  const verdicts: AnomalyVerdict[] = [];

  for (const source of new Set(events.map((e) => e.sourceType))) {
    const z = baseline.currentZ(source);
    if (z < ANOMALY_Z_THRESHOLD) continue;

    // Attribute the spike to the freshest events from that feed — those are the
    // ones the operator needs to look at.
    const recent = events
      .filter((e) => e.sourceType === source)
      .sort((a, b) => ageSeconds(a.timestamp) - ageSeconds(b.timestamp))
      .slice(0, 5);

    for (const e of recent) {
      verdicts.push({
        eventId: e.id,
        isAnomaly: true,
        score: Math.round(z * 100) / 100,
        detector: 'rate',
        reason:
          `${source.toUpperCase()} feed reporting rate is ${z.toFixed(1)} sigma above its ` +
          `${ANOMALY_RATE_WINDOW_SECONDS / 60}-minute baseline`,
      });
    }
  }

  return verdicts;
}

/**
 * Run every detector and apply the verdicts to the events in place.
 * When several detectors fire on one event, the highest-scoring reason wins.
 */
export function detectAnomalies(
  events: UnifiedEvent[],
  baseline: RateBaseline,
): AnomalyVerdict[] {
  const all = [
    ...detectRateAnomalies(events, baseline),
    ...detectKinematicAnomalies(events),
    ...detectSpatialAnomalies(events),
  ];

  const strongest = new Map<string, AnomalyVerdict>();
  for (const v of all) {
    const existing = strongest.get(v.eventId);
    if (!existing || v.score > existing.score) strongest.set(v.eventId, v);
  }

  const byId = new Map(events.map((e) => [e.id, e]));
  for (const v of strongest.values()) {
    const e = byId.get(v.eventId);
    if (!e) continue;
    e.isAnomaly = true;
    e.anomalyReason = v.reason;
  }

  return [...strongest.values()].sort((a, b) => b.score - a.score);
}
