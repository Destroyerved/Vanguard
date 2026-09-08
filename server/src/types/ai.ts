/**
 * VANGUARD — AI synthesis contracts.
 *
 * HARD RULE enforced by `src/ai/grounding.ts`: every generated claim carries
 * `supportingEventIds`, and any ID that does not resolve to a real event in the
 * store is stripped before the payload leaves the server. A claim whose IDs are
 * all stripped is discarded entirely. This is what makes VANGUARD's AI output
 * verifiable rather than merely plausible.
 */

import type { SourceType, SeverityLevel, ThreatLevel } from './events.js';

/** A single evidence-cited assertion made by the model. */
export interface GroundedClaim {
  /** The assertion itself, one sentence. */
  point: string;
  /** Event IDs that substantiate the assertion. Never empty after grounding. */
  supportingEventIds: string[];
}

/** A prioritized directive for the watchstander. */
export interface PrioritizedAction {
  action: string;
  /** 1 (routine) .. 5 (immediate). */
  urgency: number;
  supportingEventIds: string[];
}

/** A distinct tactical option with explicit operational tradeoffs. */
export interface CourseOfAction {
  id: string;
  title: string;
  description: string;
  pros: string[];
  tradeoffs: string[];
  /** 1 (routine) .. 5 (immediate). */
  recommendedUrgency: number;
  supportingEventIds: string[];
}

/** The full executive briefing returned to the command center. */
export interface AISummary {
  generatedAt: string;
  threatLevel: ThreatLevel;
  headline: string;
  executiveSummary: string;
  keyDevelopments: GroundedClaim[];
  prioritizedActions: PrioritizedAction[];
  coursesOfAction: CourseOfAction[];
  /** Mean confidence of every event cited by this briefing, 0-100. */
  overallConfidence: number;
  /** Which synthesis path produced this briefing. */
  provenance: BriefingProvenance;
}

/** Audit trail describing exactly how a briefing was produced. */
export interface BriefingProvenance {
  /** `gemini` = live model call. `deterministic` = offline rule-based synthesizer. */
  engine: 'gemini' | 'deterministic';
  /** Model ID when engine is gemini. */
  model?: string;
  /** Wall-clock latency of the synthesis step, milliseconds. */
  latencyMs: number;
  /** Number of events supplied to the synthesizer. */
  eventsConsidered: number;
  /** Citations removed because they referenced non-existent events. */
  citationsStripped: number;
  /** Claims discarded because every citation was invalid. */
  claimsDiscarded: number;
  /** Populated when a Gemini call failed and the deterministic path took over. */
  degradedReason?: string;
}

/**
 * Structured filter extracted from a natural-language omnibar query.
 * All fields are optional; an empty filter matches everything.
 */
export interface NLQueryFilter {
  sourceTypes?: SourceType[];
  severities?: SeverityLevel[];
  /** Only events at or above this confidence, 0-100. */
  minConfidence?: number;
  /** Look-back window in minutes from now. */
  withinMinutes?: number;
  /** Spatial constraint expressed as a centre point plus radius. */
  nearPoint?: { lat: number; lng: number; radiusKm: number };
  /** Named zone/sector constraint, matched case-insensitively. */
  zoneName?: string;
  /** Restrict to anomaly-flagged events only. */
  anomaliesOnly?: boolean;
  /** Restrict to events with at least this many corroborating sources. */
  minCorroborations?: number;
  /** Free-text term matched against title and description. */
  textContains?: string;
}

/** Result envelope for the NL command bar. */
export interface NLQueryResult {
  query: string;
  filter: NLQueryFilter;
  /** Plain-English restatement of what the filter does, shown under the omnibar. */
  interpretation: string;
  matchedEventIds: string[];
  matchCount: number;
  parser: 'gemini' | 'heuristic';
  latencyMs: number;
}
