/**
 * VANGUARD — Ingestion adapter contract.
 *
 * Every feed — the live Open-Meteo API and all four simulators alike —
 * implements this one interface. That uniformity is the point: swapping the
 * radar simulator for a real MIL-STD track feed means writing one new adapter
 * and changing nothing else in the system.
 *
 * Adapters emit RAW payloads only. They never construct a `UnifiedEvent`;
 * that is the normalization layer's sole responsibility, so the boundary
 * between "what the sensor said" and "what VANGUARD believes" stays explicit
 * and auditable.
 */

import type { SourceStatus, SourceType } from '../types/events.js';

/** An untransformed observation exactly as the feed reported it. */
export interface RawObservation {
  sourceType: SourceType;
  sourceName: string;
  /** ISO 8601 UTC, as reported by the source. */
  timestamp: string;
  /** The feed's native payload, passed through untouched to `UnifiedEvent.raw`. */
  payload: Record<string, unknown>;
}

/** Per-poll context handed to every adapter. */
export interface PollContext {
  /** Wall clock at the start of the tick, epoch ms. */
  nowMs: number;
  /** Monotonic tick counter since process start. */
  tick: number;
  /** True while degraded-comms simulation is engaged. */
  degradedMode: boolean;
}

/** What one poll produced, plus the health signal it implies. */
export interface PollOutcome {
  observations: RawObservation[];
  status: SourceStatus;
  latencyMs: number;
  /** Explanation when status is not `live`. */
  note?: string;
}

/** The contract every ingestion source implements. */
export interface SourceAdapter {
  readonly sourceType: SourceType;
  readonly sourceName: string;
  /** Nominal trust weight when fully healthy, 0.0 - 1.0. */
  readonly nominalReliability: number;
  /**
   * Desired poll cadence, milliseconds. The orchestrator polls an adapter only
   * when this much time has elapsed, so a 2-minute weather poll and a 3-second
   * radar sweep coexist on one tick loop without either being wrong.
   */
  readonly pollIntervalMs: number;

  /** Optional one-time setup (warm caches, seed entity state). */
  init?(): Promise<void> | void;

  /** Produce observations for this poll. Must never throw — return a status. */
  poll(context: PollContext): Promise<PollOutcome> | PollOutcome;

  /** Optional teardown on shutdown. */
  shutdown?(): Promise<void> | void;
}

/** Convenience builder for a healthy outcome. */
export function ok(observations: RawObservation[], latencyMs: number): PollOutcome {
  return { observations, status: 'live', latencyMs };
}

/** Convenience builder for a degraded outcome (partial or stale data). */
export function degraded(
  observations: RawObservation[],
  latencyMs: number,
  note: string,
): PollOutcome {
  return { observations, status: 'degraded', latencyMs, note };
}

/** Convenience builder for a failed poll. */
export function down(latencyMs: number, note: string): PollOutcome {
  return { observations: [], status: 'down', latencyMs, note };
}
