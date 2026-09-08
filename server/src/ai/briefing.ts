/**
 * VANGUARD — Briefing synthesis orchestration.
 *
 * THE SYNTHESIS PATH
 *
 *   1. Select evidence          — the most operationally significant events,
 *                                 not merely the most recent.
 *   2. Try Gemini               — structured JSON against an explicit schema.
 *   3. Ground every citation    — strip invented IDs, discard unsupported claims.
 *   4. Fall back on any failure — the deterministic engine produces a complete
 *                                 briefing with no model call.
 *   5. Cache                    — the latest briefing is always served instantly.
 *
 * Step 4 is unconditional. Any Gemini failure — missing key, timeout, rate
 * limit, malformed output, or a briefing so hallucinated that grounding empties
 * it — lands on the deterministic path. The command center is never without a
 * briefing, and `provenance.engine` always states which path ran.
 */

import { BRIEFING_EVENT_BUDGET } from '../config/constants.js';
import type { AISummary } from '../types/ai.js';
import type { CorrelationCluster, ThreatLevel, UnifiedEvent } from '../types/events.js';
import { nextCoaId } from '../util/ids.js';
import { createLogger } from '../util/logger.js';
import { nowIso } from '../util/time.js';
import { synthesizeDeterministic } from './fallback.js';
import { generateStructured, isGeminiAvailable } from './gemini.js';
import { groundSummary, type EventResolver } from './grounding.js';
import {
  BRIEFING_SCHEMA,
  BRIEFING_SYSTEM_INSTRUCTION,
  buildBriefingPrompt,
} from './prompts.js';

const log = createLogger('ai:brief');

export interface BriefingRequest {
  /** Every event in the active picture; the most significant are selected. */
  events: UnifiedEvent[];
  clusters: CorrelationCluster[];
  threatLevel: ThreatLevel;
  threatScore: number;
  degradedFeeds: string[];
  degradedMode: boolean;
  /** Resolver used to validate citations. The EventStore satisfies this. */
  resolver: EventResolver;
  /** Skip Gemini and go straight to the deterministic engine. */
  forceDeterministic?: boolean;
}

/** Raw model output, before grounding. */
interface RawBriefing {
  threatLevel?: string;
  headline?: string;
  executiveSummary?: string;
  keyDevelopments?: { point?: string; supportingEventIds?: string[] }[];
  prioritizedActions?: { action?: string; urgency?: number; supportingEventIds?: string[] }[];
  coursesOfAction?: {
    title?: string;
    description?: string;
    pros?: string[];
    tradeoffs?: string[];
    recommendedUrgency?: number;
    supportingEventIds?: string[];
  }[];
}

/**
 * Select the evidence pack.
 *
 * Ranked by severity, then confidence, then recency — never purely by time.
 * A CRITICAL event from eight minutes ago matters more to a watchstander than
 * a routine log line from eight seconds ago, and the model can only reason
 * about what it is shown.
 */
export function selectEvidence(
  events: UnifiedEvent[],
  budget = BRIEFING_EVENT_BUDGET,
): UnifiedEvent[] {
  const order = ['low', 'medium', 'high', 'critical'];
  return [...events]
    .sort((a, b) => {
      const bySeverity = order.indexOf(b.severity) - order.indexOf(a.severity);
      if (bySeverity !== 0) return bySeverity;
      // Corroborated events outrank isolated ones at equal severity: they are
      // what the fusion engine is most confident actually happened.
      const byCorroboration = b.corroboratedBy.length - a.corroboratedBy.length;
      if (byCorroboration !== 0) return byCorroboration;
      const byConfidence = b.confidence - a.confidence;
      if (byConfidence !== 0) return byConfidence;
      return Date.parse(b.timestamp) - Date.parse(a.timestamp);
    })
    .slice(0, budget);
}

/** Generate a briefing, falling back to the deterministic engine on any failure. */
export async function generateBriefing(request: BriefingRequest): Promise<AISummary> {
  const evidence = selectEvidence(request.events);

  const deterministicInput = {
    events: evidence,
    clusters: request.clusters,
    threatLevel: request.threatLevel,
    threatScore: request.threatScore,
    degradedFeeds: request.degradedFeeds,
    degradedMode: request.degradedMode,
  };

  if (request.forceDeterministic || !isGeminiAvailable()) {
    const reason = request.forceDeterministic
      ? 'Deterministic engine requested'
      : 'GEMINI_API_KEY not configured';
    log.info(`synthesizing deterministically — ${reason}`);

    const summary = synthesizeDeterministic(deterministicInput);
    summary.provenance.degradedReason = reason;
    return summary;
  }

  const started = Date.now();

  try {
    const prompt = buildBriefingPrompt(deterministicInput);

    const result = await generateStructured<RawBriefing>({
      systemInstruction: BRIEFING_SYSTEM_INSTRUCTION,
      prompt,
      schema: BRIEFING_SCHEMA,
      temperature: 0.25,
      maxOutputTokens: 3_072,
    });

    const draft = shapeRawBriefing(result.data, request.threatLevel, evidence.length, result.model, result.latencyMs);
    const { summary, report } = groundSummary(draft, request.resolver);

    summary.provenance.citationsStripped = report.citationsStripped;
    summary.provenance.claimsDiscarded = report.claimsDiscarded;

    // If grounding emptied the briefing, the model produced nothing usable.
    // Fall back rather than serving an empty panel during a demo.
    if (summary.keyDevelopments.length === 0) {
      log.warn('every key development failed grounding — falling back to deterministic engine');
      const fallbackSummary = synthesizeDeterministic(deterministicInput);
      fallbackSummary.provenance.degradedReason =
        `Gemini output failed citation grounding (${report.citationsStripped} invented citations)`;
      return fallbackSummary;
    }

    log.info(
      `briefing via ${result.model} in ${result.latencyMs}ms — ` +
        `${summary.keyDevelopments.length} developments, ${summary.coursesOfAction.length} COAs, ` +
        `${report.citationsStripped} citations stripped`,
    );

    return summary;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    log.warn(`Gemini synthesis failed after ${Date.now() - started}ms — ${reason}`);

    const summary = synthesizeDeterministic(deterministicInput);
    summary.provenance.degradedReason = `Gemini unavailable: ${reason}`;
    return summary;
  }
}

/** Coerce raw model output into a well-formed AISummary before grounding. */
function shapeRawBriefing(
  raw: RawBriefing,
  threatLevel: ThreatLevel,
  eventsConsidered: number,
  model: string,
  latencyMs: number,
): AISummary {
  return {
    generatedAt: nowIso(),
    // The threat level is computed by the fusion engine. Whatever the model
    // returned in that field is discarded — it does not get a vote on posture.
    threatLevel,
    headline: typeof raw.headline === 'string' ? raw.headline : 'Situation briefing',
    executiveSummary: typeof raw.executiveSummary === 'string' ? raw.executiveSummary : '',
    keyDevelopments: (raw.keyDevelopments ?? [])
      .filter((k) => typeof k?.point === 'string')
      .map((k) => ({
        point: k.point!,
        supportingEventIds: Array.isArray(k.supportingEventIds) ? k.supportingEventIds : [],
      })),
    prioritizedActions: (raw.prioritizedActions ?? [])
      .filter((a) => typeof a?.action === 'string')
      .map((a) => ({
        action: a.action!,
        urgency: typeof a.urgency === 'number' ? a.urgency : 3,
        supportingEventIds: Array.isArray(a.supportingEventIds) ? a.supportingEventIds : [],
      })),
    coursesOfAction: (raw.coursesOfAction ?? [])
      .filter((c) => typeof c?.title === 'string')
      .map((c) => ({
        id: nextCoaId(),
        title: c.title!,
        description: typeof c.description === 'string' ? c.description : '',
        pros: Array.isArray(c.pros) ? c.pros : [],
        tradeoffs: Array.isArray(c.tradeoffs) ? c.tradeoffs : [],
        recommendedUrgency:
          typeof c.recommendedUrgency === 'number' ? c.recommendedUrgency : 3,
        supportingEventIds: Array.isArray(c.supportingEventIds) ? c.supportingEventIds : [],
      })),
    overallConfidence: 0, // recomputed from surviving citations by groundSummary
    provenance: {
      engine: 'gemini',
      model,
      latencyMs,
      eventsConsidered,
      citationsStripped: 0,
      claimsDiscarded: 0,
    },
  };
}

/**
 * Briefing cache.
 *
 * The command center must render instantly. A briefing is regenerated on the
 * orchestrator's cadence in the background and the cached copy is served to
 * every request, so no operator ever waits on an inference call — the demo
 * risk this eliminates is the model stalling in front of a judge.
 */
export class BriefingCache {
  private latest: AISummary | null = null;
  private generating = false;
  private lastGeneratedMs = 0;

  get(): AISummary | null {
    return this.latest;
  }

  set(summary: AISummary): void {
    this.latest = summary;
    this.lastGeneratedMs = Date.now();
  }

  /** Age of the cached briefing in milliseconds; Infinity when empty. */
  ageMs(): number {
    return this.latest === null ? Number.POSITIVE_INFINITY : Date.now() - this.lastGeneratedMs;
  }

  /** True while a generation is in flight — prevents overlapping calls. */
  isGenerating(): boolean {
    return this.generating;
  }

  setGenerating(value: boolean): void {
    this.generating = value;
  }

  clear(): void {
    this.latest = null;
    this.lastGeneratedMs = 0;
  }
}
