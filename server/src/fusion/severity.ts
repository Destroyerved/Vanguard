/**
 * VANGUARD — Severity escalation and aggregate threat scoring.
 *
 * Fusion is only worth doing if it CHANGES something. These rules are where
 * multi-source agreement stops being a display feature and starts driving
 * operational posture.
 */

import {
  CRITICAL_PROMOTION_CONFIDENCE,
  ESCALATION_DISTINCT_SOURCES,
  EVENT_ACTIVE_HORIZON_SECONDS,
  SEVERITY_WEIGHT,
  THREAT_HYSTERESIS,
  THREAT_THRESHOLDS,
} from '../config/constants.js';
import type {
  CorrelationCluster,
  SeverityLevel,
  ThreatLevel,
  UnifiedEvent,
} from '../types/events.js';
import { SEVERITY_ORDER, THREAT_ORDER } from '../types/events.js';
import { ageSeconds } from '../util/time.js';
import { recencyFactor } from './confidence.js';

/** Raise a severity by `steps` tiers, saturating at `critical`. */
export function escalateSeverity(severity: SeverityLevel, steps = 1): SeverityLevel {
  const idx = SEVERITY_ORDER.indexOf(severity);
  const next = Math.min(SEVERITY_ORDER.length - 1, idx + steps);
  return SEVERITY_ORDER[next]!;
}

/** Numeric rank of a severity tier, 0 (low) .. 3 (critical). */
export const severityRank = (severity: SeverityLevel): number =>
  SEVERITY_ORDER.indexOf(severity);

/** Numeric rank of a threat level, 0 (green) .. 3 (red). */
export const threatRank = (threat: ThreatLevel): number => THREAT_ORDER.indexOf(threat);

/** Record of a single severity change, for the audit trail. */
export interface SeverityChange {
  eventId: string;
  from: SeverityLevel;
  to: SeverityLevel;
  reason: string;
}

/**
 * Apply fusion-driven severity escalation to every event, in place.
 *
 * Two rules, both requiring independent confirmation:
 *
 *   RULE 1 — MULTI-SOURCE CORROBORATION
 *     An event in a cluster confirmed by >= ESCALATION_DISTINCT_SOURCES (3)
 *     distinct feeds is escalated one tier. Three different instruments
 *     agreeing is qualitatively different from one instrument insisting.
 *
 *   RULE 2 — HIGH-CONFIDENCE PROMOTION
 *     A `high` event that also carries >= CRITICAL_PROMOTION_CONFIDENCE (85%)
 *     confidence becomes `critical`. A high-severity event you are 85% sure of
 *     is not something to leave in the second tier of a watch officer's queue.
 *
 * `baseSeverity` always preserves what the source originally reported, so the
 * UI can show "MEDIUM -> HIGH (escalated by fusion)" and the escalation is
 * itself auditable rather than invisible.
 */
export function applySeverityEscalation(
  events: UnifiedEvent[],
  clusters: CorrelationCluster[],
): SeverityChange[] {
  const changes: SeverityChange[] = [];
  const byId = new Map(events.map((e) => [e.id, e]));

  // IDEMPOTENCE. The pipeline re-fuses the whole active picture on every tick,
  // so this function runs repeatedly over the same event objects. Escalating
  // from the CURRENT severity would compound: medium -> high -> critical across
  // three ticks with no new evidence, and within a minute the entire board is
  // critical. Resetting to what the source actually reported means the rules
  // below always evaluate against the original claim, and re-running the stage
  // converges on the same answer instead of ratcheting upward.
  for (const event of events) event.severity = event.baseSeverity;

  // RULE 1 — multi-source corroboration, evaluated PER EVENT.
  //
  // The test is deliberately the event's OWN corroboration links, not the
  // source diversity of the cluster it happens to sit in. Clusters are the
  // transitive closure of pairwise correlation, so a chain of overlapping
  // 5km links can span tens of kilometres and sweep in dozens of unrelated
  // events. Escalating every member of such a cluster escalates almost the
  // whole board — one distant radar contact linked through two intermediaries
  // would inherit "confirmed by three sources" without anything having
  // actually confirmed it.
  //
  // Requiring the event itself to hold links to three distinct feeds keeps the
  // claim honest: this specific observation was independently corroborated.
  for (const event of events) {
    const distinctSources = new Set<string>([event.sourceType]);
    for (const id of event.corroboratedBy) {
      const corroborator = byId.get(id);
      if (corroborator) distinctSources.add(corroborator.sourceType);
    }

    if (distinctSources.size < ESCALATION_DISTINCT_SOURCES) continue;

    const escalated = escalateSeverity(event.severity, 1);
    if (escalated === event.severity) continue;

    const cluster = clusters.find((c) => c.eventIds.includes(event.id));

    changes.push({
      eventId: event.id,
      from: event.severity,
      to: escalated,
      reason:
        `Directly corroborated by ${distinctSources.size} independent sources ` +
        `(${[...distinctSources].join(', ')})` +
        (cluster ? ` in cluster ${cluster.id}` : ''),
    });
    event.severity = escalated;
  }

  // RULE 2 — high-confidence promotion to CRITICAL.
  //
  // Three conditions, all required. Each one removes a failure mode that made
  // CRITICAL meaningless in practice:
  //
  //   a) baseSeverity is already 'high' — the SOURCE called it serious.
  //      Gating on the post-Rule-1 severity instead let the two rules chain
  //      inside a single pass, so a routine 'medium' network log promoted to
  //      'high' by corroboration then promoted again to CRITICAL. A backhaul
  //      latency warning must never reach the top tier in one step.
  //
  //   b) confidence clears the threshold — the usual quantitative bar.
  //
  //   c) at least one INDEPENDENT corroborator. Confidence alone is not
  //      evidence of reality: a fresh reading from a reliable sensor scores
  //      ~92% on source reliability and recency by itself, so without this
  //      condition every uncorroborated radar return became CRITICAL the
  //      instant it appeared. One instrument's unconfirmed opinion is not a
  //      command emergency, however trustworthy the instrument.
  for (const event of events) {
    if (event.baseSeverity !== 'high') continue;
    if (event.severity === 'critical') continue;
    if (event.confidence < CRITICAL_PROMOTION_CONFIDENCE) continue;

    const independent = event.corroboratedBy
      .map((id) => byId.get(id))
      .filter((c): c is UnifiedEvent => c !== undefined && c.sourceType !== event.sourceType);

    if (independent.length === 0) continue;

    changes.push({
      eventId: event.id,
      from: event.severity,
      to: 'critical',
      reason:
        `High-severity report at ${event.confidence}% confidence, independently ` +
        `corroborated by ${independent.length} source(s) ` +
        `(${[...new Set(independent.map((c) => c.sourceType))].join(', ')})`,
    });
    event.severity = 'critical';
  }

  return changes;
}

/** Aggregate threat computation output. */
export interface ThreatAssessment {
  score: number;
  level: ThreatLevel;
  /** The events contributing most of the score, strongest first. */
  topContributors: { eventId: string; contribution: number }[];
  /** Plain-English cause, used verbatim in the escalation timeline. */
  reason: string;
}

/**
 * Aggregate threat score.
 *
 *   score = SUM over live events of  severityWeight x (confidence/100) x recency
 *
 * Each term is load-bearing:
 *   - severityWeight (1/3/7/15) makes the scale superlinear, so one CRITICAL
 *     outweighs four MEDIUMs rather than being averaged away by routine traffic.
 *   - confidence prevents an unverified rumour from driving posture.
 *   - recency lets the score fall on its own as a situation goes quiet, with no
 *     separate decay job needed.
 */
export function computeThreatScore(
  events: UnifiedEvent[],
  referenceMs: number = Date.now(),
): ThreatAssessment {
  const contributions: { eventId: string; contribution: number }[] = [];
  let score = 0;

  for (const e of events) {
    const age = ageSeconds(e.timestamp, referenceMs);
    if (age > EVENT_ACTIVE_HORIZON_SECONDS) continue;

    const contribution =
      SEVERITY_WEIGHT[e.severity] * (e.confidence / 100) * recencyFactor(age);

    score += contribution;
    contributions.push({ eventId: e.id, contribution: Math.round(contribution * 100) / 100 });
  }

  contributions.sort((a, b) => b.contribution - a.contribution);
  const topContributors = contributions.slice(0, 5);

  const level = scoreToLevel(score);

  return {
    score: Math.round(score * 100) / 100,
    level,
    topContributors,
    reason: describeThreat(level, score, events),
  };
}

/** Map a continuous threat score onto a discrete posture, without hysteresis. */
export function scoreToLevel(score: number): ThreatLevel {
  if (score >= THREAT_THRESHOLDS.red) return 'red';
  if (score >= THREAT_THRESHOLDS.orange) return 'orange';
  if (score >= THREAT_THRESHOLDS.yellow) return 'yellow';
  return 'green';
}

/**
 * Apply hysteresis to a proposed level change.
 *
 * Escalation is immediate — you never delay raising an alarm. De-escalation
 * requires the score to fall THREAT_HYSTERESIS (15%) below the threshold it
 * would need to re-enter the higher level. Without this the HUD flickers
 * between ORANGE and RED while the score oscillates around a boundary, which
 * both looks broken and trains operators to ignore the indicator.
 */
export function applyHysteresis(
  current: ThreatLevel,
  proposed: ThreatLevel,
  score: number,
): ThreatLevel {
  if (threatRank(proposed) >= threatRank(current)) return proposed;

  // Proposed is lower. Find the floor of the level we currently hold.
  const currentFloor =
    current === 'red'
      ? THREAT_THRESHOLDS.red
      : current === 'orange'
        ? THREAT_THRESHOLDS.orange
        : current === 'yellow'
          ? THREAT_THRESHOLDS.yellow
          : 0;

  const releaseAt = currentFloor * (1 - THREAT_HYSTERESIS);
  return score < releaseAt ? proposed : current;
}

/** Compose the human-readable justification for the current posture. */
function describeThreat(
  level: ThreatLevel,
  score: number,
  events: UnifiedEvent[],
): string {
  const critical = events.filter((e) => e.severity === 'critical').length;
  const high = events.filter((e) => e.severity === 'high').length;
  const anomalies = events.filter((e) => e.isAnomaly).length;

  const parts: string[] = [`threat score ${score.toFixed(1)}`];
  if (critical > 0) parts.push(`${critical} critical`);
  if (high > 0) parts.push(`${high} high-severity`);
  if (anomalies > 0) parts.push(`${anomalies} anomalous`);

  const posture: Record<ThreatLevel, string> = {
    green: 'Routine posture',
    yellow: 'Elevated monitoring',
    orange: 'Heightened readiness',
    red: 'Immediate action required',
  };

  return `${posture[level]} — ${parts.join(', ')}`;
}
