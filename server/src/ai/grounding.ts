/**
 * VANGUARD — Citation grounding enforcement.
 *
 * THIS FILE IS THE ANTI-HALLUCINATION GUARANTEE.
 *
 * A language model asked to summarize a tactical picture will, given the
 * chance, invent an event ID that looks exactly like a real one. Prompting it
 * not to is necessary but not sufficient — prompts are requests, not
 * constraints. So VANGUARD does not trust the model at all:
 *
 *   Every `supportingEventIds` entry is resolved against the event store.
 *   IDs that do not resolve are STRIPPED.
 *   Claims left with zero valid citations are DISCARDED ENTIRELY.
 *
 * The count of stripped citations and discarded claims is reported in
 * `BriefingProvenance`, so the honesty of the model is itself observable
 * rather than assumed. A judge can ask "how do you know it isn't making things
 * up?" and the answer is a number on the screen.
 */

import type { AISummary, CourseOfAction, GroundedClaim, PrioritizedAction } from '../types/ai.js';
import { createLogger } from '../util/logger.js';

const log = createLogger('ai:ground');

/** Anything that can resolve an event ID — the EventStore satisfies this. */
export interface EventResolver {
  has(id: string): boolean;
  get(id: string): { confidence: number } | undefined;
}

export interface GroundingReport {
  citationsChecked: number;
  citationsStripped: number;
  claimsDiscarded: number;
  /** The invented IDs, retained for the diagnostics panel. */
  strippedIds: string[];
}

/** Filter one citation list down to IDs that actually exist. */
function groundIds(
  ids: unknown,
  resolver: EventResolver,
  report: GroundingReport,
): string[] {
  if (!Array.isArray(ids)) return [];

  const valid: string[] = [];
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (id.length === 0) continue;

    report.citationsChecked++;

    if (resolver.has(id)) {
      // Deduplicate: a model citing the same event three times does not make
      // the claim three times better supported.
      if (!valid.includes(id)) valid.push(id);
    } else {
      report.citationsStripped++;
      report.strippedIds.push(id);
    }
  }

  return valid;
}

/**
 * Ground an entire briefing.
 *
 * Returns a summary in which every remaining citation is guaranteed to resolve
 * to a real event, alongside the report describing what was removed.
 */
export function groundSummary(
  summary: AISummary,
  resolver: EventResolver,
): { summary: AISummary; report: GroundingReport } {
  const report: GroundingReport = {
    citationsChecked: 0,
    citationsStripped: 0,
    claimsDiscarded: 0,
    strippedIds: [],
  };

  const keyDevelopments: GroundedClaim[] = [];
  for (const claim of summary.keyDevelopments ?? []) {
    const ids = groundIds(claim.supportingEventIds, resolver, report);
    // A key development with no surviving evidence is exactly the hallucination
    // this system exists to prevent. It does not get displayed.
    if (ids.length === 0) {
      report.claimsDiscarded++;
      continue;
    }
    keyDevelopments.push({ point: claim.point, supportingEventIds: ids });
  }

  const prioritizedActions: PrioritizedAction[] = [];
  for (const action of summary.prioritizedActions ?? []) {
    const ids = groundIds(action.supportingEventIds, resolver, report);
    if (ids.length === 0) {
      report.claimsDiscarded++;
      continue;
    }
    prioritizedActions.push({
      action: action.action,
      urgency: clampUrgency(action.urgency),
      supportingEventIds: ids,
    });
  }

  // Courses of action are held to a softer rule: a COA is a RECOMMENDATION
  // rather than a factual claim, so it survives without citations. Its stated
  // evidence is still stripped to valid IDs, so nothing it displays is fake.
  const coursesOfAction: CourseOfAction[] = (summary.coursesOfAction ?? []).map((coa) => ({
    ...coa,
    recommendedUrgency: clampUrgency(coa.recommendedUrgency),
    pros: Array.isArray(coa.pros) ? coa.pros : [],
    tradeoffs: Array.isArray(coa.tradeoffs) ? coa.tradeoffs : [],
    supportingEventIds: groundIds(coa.supportingEventIds, resolver, report),
  }));

  // Overall confidence is recomputed from the events that actually survived
  // grounding, never taken from the model. The model does not get to assert
  // how confident the system is.
  const citedIds = new Set<string>([
    ...keyDevelopments.flatMap((c) => c.supportingEventIds),
    ...prioritizedActions.flatMap((a) => a.supportingEventIds),
  ]);

  let confidenceSum = 0;
  let confidenceCount = 0;
  for (const id of citedIds) {
    const event = resolver.get(id);
    if (event) {
      confidenceSum += event.confidence;
      confidenceCount++;
    }
  }

  const overallConfidence =
    confidenceCount === 0 ? 0 : Math.round(confidenceSum / confidenceCount);

  if (report.citationsStripped > 0 || report.claimsDiscarded > 0) {
    log.warn(
      `grounding removed ${report.citationsStripped} invented citation(s) and ` +
        `${report.claimsDiscarded} unsupported claim(s)`,
      report.strippedIds.slice(0, 8),
    );
  }

  return {
    summary: {
      ...summary,
      keyDevelopments,
      prioritizedActions,
      coursesOfAction,
      overallConfidence,
    },
    report,
  };
}

/** Constrain an urgency to the documented 1..5 range. */
function clampUrgency(value: unknown): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : 3;
  return n < 1 ? 1 : n > 5 ? 5 : n;
}

/**
 * Post-grounding assertion used by the test suite and the diagnostics endpoint.
 * Returns every citation in a summary that fails to resolve — which must always
 * be empty for a summary that has been through `groundSummary`.
 */
export function findUngroundedCitations(
  summary: AISummary,
  resolver: EventResolver,
): string[] {
  const all = [
    ...summary.keyDevelopments.flatMap((c) => c.supportingEventIds),
    ...summary.prioritizedActions.flatMap((a) => a.supportingEventIds),
    ...summary.coursesOfAction.flatMap((c) => c.supportingEventIds),
  ];
  return [...new Set(all)].filter((id) => !resolver.has(id));
}
