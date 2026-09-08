/**
 * VANGUARD — The fusion pipeline.
 *
 * This is the function the whole system exists to run. It takes a bag of
 * normalized observations and returns a correlated, corroborated, scored,
 * anomaly-flagged, severity-escalated operational picture.
 *
 * SIX STAGES, IN THIS ORDER, FOR THESE REASONS:
 *
 *   1. DEDUPE       Collapse redundant re-reports FIRST. Every later stage
 *                   counts sources; duplicates would be counted as independent
 *                   confirmation and manufacture false certainty.
 *
 *   2. CORRELATE    Group observations into spatiotemporal clusters. Must
 *                   precede corroboration, which only links within a cluster.
 *
 *   3. CORROBORATE  Score and select the strongest cross-source links, filling
 *                   `corroboratedBy`. Must precede scoring, which reads it.
 *
 *   4. SCORE        Apply the confidence formula. Must precede escalation,
 *                   because the high-confidence promotion rule reads the score.
 *
 *   5. ANOMALY      Statistical outlier detection. Runs after scoring so
 *                   verdicts attach to fully-formed events, and BEFORE any LLM
 *                   ever sees the data.
 *
 *   6. ESCALATE     Apply fusion-driven severity changes and compute the
 *                   aggregate threat posture. The only stage permitted to alter
 *                   `severity` away from what the source reported.
 *
 * The ordering is not incidental — reordering any pair breaks a stated
 * invariant. `FusionResult.stageTimings` reports the cost of each stage so the
 * pipeline stays observable under load.
 */

import { SOURCE_RELIABILITY } from '../config/constants.js';
import { refreshAuditCorroboration } from '../media/authenticity.js';
import type {
  CorrelationCluster,
  SourceType,
  UnifiedEvent,
} from '../types/events.js';
import { createLogger } from '../util/logger.js';
import { computeConfidence } from './confidence.js';
import { correlateEvents, type CorrelationOptions } from './correlate.js';
import { corroborateCluster, type CorroborationLink } from './corroborate.js';
import { dedupeEvents } from './dedupe.js';
import { detectAnomalies, RateBaseline, type AnomalyVerdict } from './anomaly.js';
import {
  applySeverityEscalation,
  computeThreatScore,
  type SeverityChange,
  type ThreatAssessment,
} from './severity.js';

const log = createLogger('fusion');

/** Inputs to one fusion pass. */
export interface FusionInput {
  /** Every event in the active horizon, normalized. */
  events: UnifiedEvent[];
  /** Effective per-feed reliability after health degradation, 0..1. */
  reliabilityBySource?: Partial<Record<SourceType, number>>;
  /** Rate baseline, carried across passes by the orchestrator. */
  rateBaseline?: RateBaseline;
  /** Correlation window overrides, used by the what-if sandbox. */
  correlation?: CorrelationOptions;
  /** Evaluation instant, epoch ms. Injectable so tests are deterministic. */
  referenceMs?: number;
}

/** Everything one fusion pass produces. */
export interface FusionResult {
  /** Fully fused events, ready to serve. */
  events: UnifiedEvent[];
  clusters: CorrelationCluster[];
  anomalies: AnomalyVerdict[];
  severityChanges: SeverityChange[];
  threat: ThreatAssessment;
  /** eventId -> the corroboration links behind its score. */
  corroborationLinks: Map<string, CorroborationLink[]>;
  stats: {
    inputCount: number;
    outputCount: number;
    duplicatesRemoved: number;
    clustersFormed: number;
    anomaliesFlagged: number;
    escalations: number;
    pairwiseComparisons: number;
    meanConfidence: number;
    durationMs: number;
  };
  stageTimings: Record<string, number>;
}

/**
 * Run one complete fusion pass.
 *
 * PURE with respect to the store: it mutates only the event objects it is
 * given (confidence, corroboratedBy, severity, isAnomaly) and holds no state of
 * its own between calls. All cross-pass state lives in the `RateBaseline` the
 * caller owns. That is what makes the pipeline unit-testable in isolation.
 */
export function runFusionPipeline(input: FusionInput): FusionResult {
  const started = performance.now();
  const referenceMs = input.referenceMs ?? Date.now();
  const timings: Record<string, number> = {};
  const mark = (stage: string, from: number): number => {
    timings[stage] = Math.round((performance.now() - from) * 100) / 100;
    return performance.now();
  };

  let t = performance.now();

  /* -- STAGE 1 — DEDUPE ------------------------------------------------ */
  const { events, removed: duplicatesRemoved } = dedupeEvents(input.events);
  t = mark('dedupe', t);

  /* -- STAGE 2 — CORRELATE --------------------------------------------- */
  const correlation = correlateEvents(events, input.correlation ?? {});
  t = mark('correlate', t);

  /* -- STAGE 3 — CORROBORATE ------------------------------------------- */
  const byId = new Map(events.map((e) => [e.id, e]));
  const corroborationLinks = new Map<string, CorroborationLink[]>();

  // Events not in any cluster have nothing to corroborate them. Clear any stale
  // links from a previous pass so confidence never rests on vanished evidence.
  for (const e of events) {
    if (!correlation.clusterByEvent.has(e.id)) {
      e.corroboratedBy = [];
      e.clusterId = undefined;
    }
  }

  for (const cluster of correlation.clusters) {
    const members = cluster.eventIds
      .map((id) => byId.get(id))
      .filter((e): e is UnifiedEvent => e !== undefined);

    for (const m of members) m.clusterId = cluster.id;

    for (const [eventId, links] of corroborateCluster(members, correlation.neighborsByEvent)) {
      corroborationLinks.set(eventId, links);
    }
  }
  t = mark('corroborate', t);

  /* -- STAGE 4 — SCORE ------------------------------------------------- */
  for (const event of events) {
    const corroborators = event.corroboratedBy
      .map((id) => byId.get(id))
      .filter((e): e is UnifiedEvent => e !== undefined);

    // Media audits are classified with corroboration=0 at normalization time.
    // Now that the corroborators are resolved, refresh the corroboration-
    // dependent half (corroborationScore + manipulationCategory) BEFORE scoring,
    // so the confidence formula reads a live verdict — HYBRID_CORROBORATED vs
    // EVENT_FABRICATING is a product of the full evidence picture, not of the
    // clip alone. The media discount itself only depends on manipulation risk,
    // so this refresh cannot be gamed through scoring.
    if (event.mediaAudit && corroborators.length > 0) {
      refreshAuditCorroboration(event.mediaAudit, event, corroborators);
    }

    const effectiveReliability =
      input.reliabilityBySource?.[event.sourceType] ?? SOURCE_RELIABILITY[event.sourceType];

    const result = computeConfidence({
      event,
      corroborators,
      effectiveReliability,
      referenceMs,
    });

    event.confidence = result.confidence;
    event.confidenceBreakdown = result.breakdown;
  }
  t = mark('score', t);

  /* -- STAGE 5 — ANOMALY ----------------------------------------------- */
  const baseline = input.rateBaseline ?? new RateBaseline();
  const anomalies = detectAnomalies(events, baseline);
  t = mark('anomaly', t);

  /* -- STAGE 6 — ESCALATE ---------------------------------------------- */
  const severityChanges = applySeverityEscalation(events, correlation.clusters);

  // Cluster summaries were computed before escalation, so peakSeverity and
  // meanConfidence would otherwise report pre-fusion values.
  for (const cluster of correlation.clusters) {
    const members = cluster.eventIds
      .map((id) => byId.get(id))
      .filter((e): e is UnifiedEvent => e !== undefined);
    if (members.length === 0) continue;

    cluster.meanConfidence = Math.round(
      members.reduce((sum, m) => sum + m.confidence, 0) / members.length,
    );
    for (const m of members) {
      if (severityRankOf(m.severity) > severityRankOf(cluster.peakSeverity)) {
        cluster.peakSeverity = m.severity;
      }
    }
  }

  const threat = computeThreatScore(events, referenceMs);
  mark('escalate', t);

  const durationMs = Math.round((performance.now() - started) * 100) / 100;
  const meanConfidence =
    events.length === 0
      ? 0
      : Math.round(events.reduce((s, e) => s + e.confidence, 0) / events.length);

  const result: FusionResult = {
    events,
    clusters: correlation.clusters,
    anomalies,
    severityChanges,
    threat,
    corroborationLinks,
    stats: {
      inputCount: input.events.length,
      outputCount: events.length,
      duplicatesRemoved,
      clustersFormed: correlation.clusters.length,
      anomaliesFlagged: anomalies.length,
      escalations: severityChanges.length,
      pairwiseComparisons: correlation.comparisons,
      meanConfidence,
      durationMs,
    },
    stageTimings: timings,
  };

  log.debug(
    `pass complete: ${result.stats.inputCount} in -> ${result.stats.outputCount} out, ` +
      `${result.stats.clustersFormed} clusters, ${result.stats.anomaliesFlagged} anomalies, ` +
      `threat ${threat.level} (${threat.score}) in ${durationMs}ms`,
  );

  return result;
}

/** Local severity rank helper, kept private to avoid a circular import. */
function severityRankOf(severity: UnifiedEvent['severity']): number {
  return ['low', 'medium', 'high', 'critical'].indexOf(severity);
}

export { RateBaseline };
