/**
 * VANGUARD — Source health registry.
 *
 * Tracks liveness, latency and throughput for every feed, and — critically —
 * converts health into the EFFECTIVE RELIABILITY that the confidence formula
 * consumes.
 *
 * That coupling is the whole point. When a feed degrades, VANGUARD does not
 * merely paint an amber dot on a status panel; it lowers the trust weight of
 * everything that feed reports, so confidence scores across the entire picture
 * fall automatically. Degradation propagates into the math instead of being a
 * cosmetic warning an operator can ignore.
 */

import {
  DEGRADED_RELIABILITY_MULTIPLIER,
  DOWN_RELIABILITY_MULTIPLIER,
  SOURCE_RELIABILITY,
} from '../config/constants.js';
import type { SourceStatus, SourceType } from '../types/events.js';
import type { SourceHealth } from '../types/health.js';
import { nowIso } from '../util/time.js';

interface FeedRecord {
  sourceType: SourceType;
  sourceName: string;
  nominalReliability: number;
  status: SourceStatus;
  lastUpdate: string;
  totalIngested: number;
  consecutiveFailures: number;
  latencySamples: number[];
  manuallyDegraded: boolean;
  note?: string;
}

/** How many latency samples to average over. */
const LATENCY_WINDOW = 20;

/** Consecutive failures after which a degraded feed is declared down. */
const DOWN_AFTER_FAILURES = 3;

export class SourceHealthRegistry {
  private readonly feeds = new Map<string, FeedRecord>();
  /** Feed keys the operator has manually blacked out. */
  private readonly blackouts = new Set<string>();

  /** Register a feed at boot. Idempotent. */
  register(sourceType: SourceType, sourceName: string, nominalReliability: number): void {
    const key = this.key(sourceType, sourceName);
    if (this.feeds.has(key)) return;

    this.feeds.set(key, {
      sourceType,
      sourceName,
      nominalReliability,
      status: 'live',
      lastUpdate: nowIso(),
      totalIngested: 0,
      consecutiveFailures: 0,
      latencySamples: [],
      manuallyDegraded: false,
    });
  }

  /** Record the outcome of one poll. */
  recordPoll(params: {
    sourceType: SourceType;
    sourceName: string;
    status: SourceStatus;
    latencyMs: number;
    observationCount: number;
    note?: string;
  }): void {
    const key = this.key(params.sourceType, params.sourceName);
    const feed = this.feeds.get(key);
    if (!feed) {
      this.register(
        params.sourceType,
        params.sourceName,
        SOURCE_RELIABILITY[params.sourceType] ?? 0.5,
      );
      return this.recordPoll(params);
    }

    feed.latencySamples.push(params.latencyMs);
    if (feed.latencySamples.length > LATENCY_WINDOW) feed.latencySamples.shift();

    feed.totalIngested += params.observationCount;
    feed.note = params.note;

    if (params.status === 'live') {
      feed.consecutiveFailures = 0;
      feed.lastUpdate = nowIso();
    } else {
      feed.consecutiveFailures++;
    }

    // A manual blackout always wins; otherwise repeated failures escalate a
    // degraded feed to fully down.
    if (this.blackouts.has(key)) {
      feed.status = 'down';
      feed.manuallyDegraded = true;
      feed.note = 'Operator-initiated blackout (degraded comms simulation)';
    } else {
      feed.manuallyDegraded = false;
      feed.status =
        params.status === 'live'
          ? 'live'
          : feed.consecutiveFailures >= DOWN_AFTER_FAILURES
            ? 'down'
            : 'degraded';
    }
  }

  /**
   * Effective reliability for one feed, 0..1.
   * This is the value handed to `computeConfidence` — the single point where
   * feed health becomes fusion math.
   */
  effectiveReliability(sourceType: SourceType): number {
    const feed = this.findByType(sourceType);
    const nominal = feed?.nominalReliability ?? SOURCE_RELIABILITY[sourceType] ?? 0.5;

    if (!feed) return nominal;

    switch (feed.status) {
      case 'live':
        return nominal;
      case 'degraded':
        return nominal * DEGRADED_RELIABILITY_MULTIPLIER;
      case 'down':
        return nominal * DOWN_RELIABILITY_MULTIPLIER;
    }
  }

  /** Effective reliability for every source type, for the fusion pipeline. */
  reliabilityMap(): Partial<Record<SourceType, number>> {
    const map: Partial<Record<SourceType, number>> = {};
    for (const type of [
      'radar',
      'weather',
      'personnel',
      'log',
      'incident',
      'social_media',
      'audio_recording',
    ] as SourceType[]) {
      map[type] = this.effectiveReliability(type);
    }
    return map;
  }

  /** Public health snapshot for GET /api/v1/intelligence/source-health. */
  snapshot(activeCounts: Partial<Record<SourceType, number>> = {}): SourceHealth[] {
    return [...this.feeds.values()].map((feed) => ({
      sourceType: feed.sourceType,
      sourceName: feed.sourceName,
      status: feed.status,
      lastUpdate: feed.lastUpdate,
      reliabilityScore: Math.round(this.effectiveReliability(feed.sourceType) * 1000) / 1000,
      nominalReliability: feed.nominalReliability,
      activeCount: activeCounts[feed.sourceType] ?? 0,
      totalIngested: feed.totalIngested,
      consecutiveFailures: feed.consecutiveFailures,
      meanLatencyMs:
        feed.latencySamples.length === 0
          ? 0
          : Math.round(
              feed.latencySamples.reduce((s, v) => s + v, 0) / feed.latencySamples.length,
            ),
      manuallyDegraded: feed.manuallyDegraded,
      note: feed.note,
    }));
  }

  /**
   * Black out one feed, or every feed when `sourceType` is omitted.
   * Backs the degraded-comms demo: confidence across the board visibly drops
   * because effective reliability drops, not because a banner appeared.
   */
  setBlackout(enabled: boolean, sourceType?: SourceType): string[] {
    const affected: string[] = [];

    for (const [key, feed] of this.feeds) {
      if (sourceType && feed.sourceType !== sourceType) continue;
      if (enabled) this.blackouts.add(key);
      else this.blackouts.delete(key);
      affected.push(feed.sourceName);

      if (enabled) {
        feed.status = 'down';
        feed.manuallyDegraded = true;
        feed.note = 'Operator-initiated blackout (degraded comms simulation)';
      } else {
        feed.status = 'live';
        feed.manuallyDegraded = false;
        feed.consecutiveFailures = 0;
        feed.note = undefined;
      }
    }

    return affected;
  }

  /** True when any feed is currently blacked out. */
  hasBlackout(): boolean {
    return this.blackouts.size > 0;
  }

  /** Overall system health: worst status across all feeds. */
  aggregateStatus(): SourceStatus {
    let worst: SourceStatus = 'live';
    for (const feed of this.feeds.values()) {
      if (feed.status === 'down') return 'down';
      if (feed.status === 'degraded') worst = 'degraded';
    }
    return worst;
  }

  private findByType(sourceType: SourceType): FeedRecord | undefined {
    for (const feed of this.feeds.values()) {
      if (feed.sourceType === sourceType) return feed;
    }
    return undefined;
  }

  private key(sourceType: SourceType, sourceName: string): string {
    return `${sourceType}:${sourceName}`;
  }
}
