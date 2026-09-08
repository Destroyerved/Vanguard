/**
 * VANGUARD — Explainable confidence scoring.
 *
 * THE FORMULA (Vanguard_PRD.md §5.1):
 *
 *   Confidence = min(100, round(SourceReliability x RecencyDecay x MediaAuthenticity x CorroborationBoost x 100))
 *
 * `MediaAuthenticity` is the Golden-Rule term for open-source media: it lives
 * in [0.60, 1.0] and equals 1 for events that carry no media audit, so the
 * original four-term formula is a strict special case. A fully fabricated clip
 * is discounted to the floor, never zeroed — matching the media-authenticity
 * rule that uncertain media is surfaced, not silently discarded.
 *
 * Three properties make this defensible in front of defense judges:
 *
 *   1. DETERMINISTIC. No model, no randomness. The same inputs always produce
 *      the same score, and the score can be recomputed by hand.
 *   2. DECOMPOSABLE. Every multiplicand is surfaced individually in
 *      `ConfidenceBreakdown`, so an operator can see WHY a score is what it is
 *      rather than being asked to trust it.
 *   3. BOUNDED. Corroboration is capped, so a flood of low-grade correlated
 *      reports cannot manufacture false certainty.
 */

import {
  CORROBORATION_BOOST_PER_SOURCE,
  CORRELATION_RADIUS_METERS,
  CORRELATION_WINDOW_SECONDS,
  CONFIDENCE_BANDS,
  ESCALATION_DISTINCT_SOURCES,
  MAX_CORROBORATION_BOOST,
  MIN_RECENCY_FACTOR,
  RECENCY_LAMBDA,
  SAME_SOURCE_CORROBORATION_WEIGHT,
  SOURCE_RELIABILITY,
} from '../config/constants.js';
import { mediaAuthenticityFactor } from '../media/authenticity.js';
import type { ConfidenceBreakdown, SourceType, UnifiedEvent } from '../types/events.js';
import { haversineMeters } from '../util/geo.js';
import { clamp, round, toScore } from '../util/stats.js';
import { ageSeconds, deltaSeconds } from '../util/time.js';

/** Inputs required to score one event. */
export interface ConfidenceInput {
  /** The event being scored. */
  event: UnifiedEvent;
  /** Fully resolved events that corroborate it (NOT just their IDs). */
  corroborators: UnifiedEvent[];
  /**
   * Effective source reliability 0..1 after health degradation. When omitted,
   * the nominal weight for the event's source type is used.
   */
  effectiveReliability?: number;
  /** Evaluation instant, epoch ms. Injectable so tests are not clock-dependent. */
  referenceMs?: number;
}

/** The score plus every intermediate value used to derive it. */
export interface ConfidenceResult {
  /** Final integer score, 0-100. */
  confidence: number;
  /** Per-factor decomposition for the explainability drawer. */
  breakdown: ConfidenceBreakdown;
  /** Raw multiplicands, retained for audit and unit tests. */
  factors: {
    sourceReliability: number;
    recencyDecay: number;
    mediaAuthenticity: number;
    corroborationBoost: number;
    /** Weighted count of independent confirmations, including the event itself. */
    effectiveSourceCount: number;
    /** Distinct source types represented, including the event's own. */
    distinctSourceTypes: number;
    ageSeconds: number;
  };
  /** One-line human explanation rendered directly in the UI. */
  explanation: string;
}

/**
 * Exponential recency decay: exp(-lambda * age), floored so that a stale but
 * still-relevant observation never collapses to exactly zero weight.
 */
export function recencyFactor(ageSec: number): number {
  if (!Number.isFinite(ageSec) || ageSec < 0) return MIN_RECENCY_FACTOR;
  return Math.max(MIN_RECENCY_FACTOR, Math.exp(-RECENCY_LAMBDA * ageSec));
}

/**
 * Weighted count of independent confirmations.
 *
 * A corroborator of a DIFFERENT source type contributes 1.0; a corroborator of
 * the SAME source type contributes only `SAME_SOURCE_CORROBORATION_WEIGHT`.
 * Rationale: two returns from the same radar are one instrument's opinion
 * expressed twice, whereas radar plus a thermal tripwire is genuinely
 * independent evidence. Fusion should reward independence, not volume.
 *
 * The event itself always counts as 1.0.
 */
export function effectiveSourceCount(
  ownSource: SourceType,
  corroborators: UnifiedEvent[],
): number {
  let count = 1;
  const seenTypes = new Set<SourceType>([ownSource]);

  for (const c of corroborators) {
    if (seenTypes.has(c.sourceType)) {
      count += SAME_SOURCE_CORROBORATION_WEIGHT;
    } else {
      count += 1;
      seenTypes.add(c.sourceType);
    }
  }
  return count;
}

/**
 * Corroboration multiplier: 1 + BOOST_PER_SOURCE * (N - 1), hard-capped.
 * With the default 0.15 boost and 1.6 cap, five independent sources saturate
 * the term and a sixth adds nothing.
 */
export function corroborationBoost(effectiveCount: number): number {
  const raw = 1 + CORROBORATION_BOOST_PER_SOURCE * Math.max(0, effectiveCount - 1);
  return Math.min(MAX_CORROBORATION_BOOST, raw);
}

/**
 * Mean spatial agreement across corroborators, 0..1.
 * A corroborator co-located with the event scores 1.0; one at exactly the
 * correlation radius scores 0.0. Returns 0 when there is nothing to agree with.
 */
export function spatialAgreement(event: UnifiedEvent, corroborators: UnifiedEvent[]): number {
  if (corroborators.length === 0) return 0;
  let acc = 0;
  for (const c of corroborators) {
    const d = haversineMeters(event.location, c.location);
    acc += clamp(1 - d / CORRELATION_RADIUS_METERS, 0, 1);
  }
  return acc / corroborators.length;
}

/**
 * Mean temporal agreement across corroborators, 0..1.
 * Simultaneous observations score 1.0; observations exactly one correlation
 * window apart score 0.0. Returns 0 when there is nothing to agree with.
 */
export function temporalAgreement(event: UnifiedEvent, corroborators: UnifiedEvent[]): number {
  if (corroborators.length === 0) return 0;
  let acc = 0;
  for (const c of corroborators) {
    const dt = deltaSeconds(event.timestamp, c.timestamp);
    acc += clamp(1 - dt / CORRELATION_WINDOW_SECONDS, 0, 1);
  }
  return acc / corroborators.length;
}

/**
 * Cross-source agreement, 0..1. Saturates at `ESCALATION_DISTINCT_SOURCES`
 * distinct feeds — the same threshold at which the engine escalates severity,
 * so the number an operator sees and the rule the engine applies agree.
 */
export function sourceAgreement(ownSource: SourceType, corroborators: UnifiedEvent[]): number {
  const distinct = new Set<SourceType>([ownSource]);
  for (const c of corroborators) distinct.add(c.sourceType);
  return clamp(distinct.size / ESCALATION_DISTINCT_SOURCES, 0, 1);
}

/**
 * Score one event. This is the single entry point used by the pipeline; nothing
 * else in the codebase is permitted to invent a confidence number.
 */
export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const { event, corroborators } = input;
  const referenceMs = input.referenceMs ?? Date.now();

  const reliability =
    input.effectiveReliability ?? SOURCE_RELIABILITY[event.sourceType] ?? 0.5;

  const age = ageSeconds(event.timestamp, referenceMs);
  const recency = recencyFactor(age);

  const effCount = effectiveSourceCount(event.sourceType, corroborators);
  const boost = corroborationBoost(effCount);

  // Golden-Rule media term: 1 for events without a media audit, else the
  // manipulation-risk projection from the media engine.
  const mediaFactor = event.mediaAudit ? mediaAuthenticityFactor(event.mediaAudit) : 1;

  // The formula, verbatim.
  const confidence = Math.min(
    100,
    Math.round(reliability * recency * mediaFactor * boost * 100),
  );

  const distinctTypes = new Set<SourceType>([event.sourceType]);
  for (const c of corroborators) distinctTypes.add(c.sourceType);

  const breakdown: ConfidenceBreakdown = {
    overall: confidence,
    sourceAgreement: toScore(sourceAgreement(event.sourceType, corroborators)),
    spatialAgreement: toScore(spatialAgreement(event, corroborators)),
    temporalAgreement: toScore(temporalAgreement(event, corroborators)),
    sourceReliability: toScore(reliability),
    dataFreshness: toScore(recency),
    mediaAuthenticity: toScore(mediaFactor),
  };

  return {
    confidence,
    breakdown,
    factors: {
      sourceReliability: round(reliability, 4),
      recencyDecay: round(recency, 4),
      mediaAuthenticity: round(mediaFactor, 4),
      corroborationBoost: round(boost, 4),
      effectiveSourceCount: round(effCount, 3),
      distinctSourceTypes: distinctTypes.size,
      ageSeconds: round(age, 1),
    },
    explanation: explainConfidence(
      reliability,
      recency,
      mediaFactor,
      boost,
      confidence,
      corroborators.length,
    ),
  };
}

/**
 * Render the arithmetic as a sentence an operator can check against the badge.
 * This string is served verbatim by GET /api/v1/events/:id/correlations.
 */
export function explainConfidence(
  reliability: number,
  recency: number,
  mediaAuthenticity: number,
  boost: number,
  confidence: number,
  corroboratorCount: number,
): string {
  const mediaTerm =
    mediaAuthenticity === 1 ? '' : ` x media authenticity ${round(mediaAuthenticity, 2)}`;
  const parts = [
    `reliability ${round(reliability, 2)}`,
    `x recency ${round(recency, 2)}`,
    mediaTerm,
    `x corroboration ${round(boost, 2)}`,
    `= ${confidence}%`,
  ].filter((p) => p.length > 0);
  const suffix =
    corroboratorCount === 0
      ? ' (single-source, uncorroborated)'
      : ` (${corroboratorCount} corroborating observation${corroboratorCount === 1 ? '' : 's'})`;
  return parts.join(' ') + suffix;
}

/** Presentation band for the confidence badge colour. */
export function confidenceBand(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= CONFIDENCE_BANDS.high) return 'high';
  if (confidence >= CONFIDENCE_BANDS.medium) return 'medium';
  return 'low';
}
