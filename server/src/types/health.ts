/**
 * VANGUARD — feed liveness and system telemetry contracts.
 */

import type { SourceStatus, SourceType, ThreatLevel } from './events.js';

/** Per-feed liveness, trust weight and throughput. */
export interface SourceHealth {
  sourceType: SourceType;
  sourceName: string;
  status: SourceStatus;
  /** ISO timestamp of the most recent successful poll. */
  lastUpdate: string;
  /** Effective trust weight after health degradation, 0.0 - 1.0. */
  reliabilityScore: number;
  /** Nominal trust weight when the feed is fully healthy, 0.0 - 1.0. */
  nominalReliability: number;
  /** Events currently held in the store from this feed. */
  activeCount: number;
  /** Events ingested from this feed since process start. */
  totalIngested: number;
  /** Consecutive failed polls. */
  consecutiveFailures: number;
  /** Mean poll latency, milliseconds. */
  meanLatencyMs: number;
  /** Set when the operator has manually blacked this feed out. */
  manuallyDegraded: boolean;
  /** Human-readable explanation of a non-live status. */
  note?: string;
}

/** One entry in the threat escalation audit log. */
export interface EscalationRecord {
  id: string;
  timestamp: string;
  from: ThreatLevel;
  to: ThreatLevel;
  /** Numeric threat score at the moment of transition. */
  score: number;
  /** Plain-English cause of the transition. */
  reason: string;
  /** The specific events responsible for the shift. */
  triggerEventIds: string[];
}

/** Top-of-screen situational rollup. */
export interface SituationSnapshot {
  timestamp: string;
  threatLevel: ThreatLevel;
  /** Continuous threat score behind the discrete level. */
  threatScore: number;
  activeAlertsCount: number;
  criticalCount: number;
  highCount: number;
  totalEvents: number;
  anomalyCount: number;
  correlatedClusters: number;
  meanConfidence: number;
  /** True while degraded-comms simulation is engaged. */
  degradedMode: boolean;
  headline: string;
}

/** Process-level runtime metrics for the diagnostics panel. */
export interface SystemMetrics {
  uptimeSeconds: number;
  ticks: number;
  eventsIngested: number;
  eventsDeduplicated: number;
  clustersFormed: number;
  meanTickDurationMs: number;
  lastTickDurationMs: number;
  wsClients: number;
  storeSize: number;
  storeCapacity: number;
}
