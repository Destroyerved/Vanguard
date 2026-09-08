/**
 * VANGUARD — Deduplication.
 *
 * Real sensor networks re-report. A radar refresh emits the same track every
 * sweep; a tripwire bounces; a dispatcher files the same incident twice.
 * Without deduplication these become false corroboration: the engine sees six
 * "independent" reports and manufactures certainty out of one real observation.
 *
 * Two events are duplicates when ALL of the following hold:
 *   - same sourceType
 *   - within DEDUPE_RADIUS_METERS (150 m — inside sensor position error)
 *   - within DEDUPE_WINDOW_SECONDS (30 s)
 *   - same normalized title (the same KIND of observation)
 *
 * Note the deliberate asymmetry with correlation: dedupe requires the SAME
 * source, correlation rewards DIFFERENT sources. One collapses redundancy, the
 * other builds independent confirmation.
 */

import { DEDUPE_RADIUS_METERS, DEDUPE_WINDOW_SECONDS } from '../config/constants.js';
import type { UnifiedEvent } from '../types/events.js';
import { haversineMeters } from '../util/geo.js';
import { deltaSeconds, toEpochMs } from '../util/time.js';

export interface DedupeResult {
  /** Surviving events, one per duplicate group. */
  events: UnifiedEvent[];
  /** Number of events removed. */
  removed: number;
  /** survivingId -> IDs it absorbed, retained for the audit trail. */
  merged: Map<string, string[]>;
}

/** Lowercase, collapse whitespace, strip trailing identifiers for comparison. */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[#\d]+/g, '').replace(/\s+/g, ' ').trim();
}

/** True when two events are redundant observations of the same thing. */
export function isDuplicate(a: UnifiedEvent, b: UnifiedEvent): boolean {
  if (a.sourceType !== b.sourceType) return false;
  if (normalizeTitle(a.title) !== normalizeTitle(b.title)) return false;
  if (deltaSeconds(a.timestamp, b.timestamp) > DEDUPE_WINDOW_SECONDS) return false;
  return haversineMeters(a.location, b.location) <= DEDUPE_RADIUS_METERS;
}

/**
 * Collapse duplicate observations.
 *
 * The survivor of a group is the NEWEST event, because operationally the latest
 * position of a moving contact is the one you act on. The survivor inherits the
 * highest confidence in the group and records the absorbed IDs under
 * `raw.mergedFrom`, so nothing is silently lost from the audit trail.
 */
export function dedupeEvents(events: UnifiedEvent[]): DedupeResult {
  // Newest first, so the first member of each group is the natural survivor.
  const sorted = [...events].sort(
    (a, b) => toEpochMs(b.timestamp) - toEpochMs(a.timestamp),
  );

  const survivors: UnifiedEvent[] = [];
  const merged = new Map<string, string[]>();
  let removed = 0;

  for (const candidate of sorted) {
    const survivor = survivors.find((s) => isDuplicate(s, candidate));

    if (!survivor) {
      survivors.push(candidate);
      continue;
    }

    removed++;
    const absorbed = merged.get(survivor.id) ?? [];
    absorbed.push(candidate.id);
    merged.set(survivor.id, absorbed);

    // The survivor keeps the strongest confidence observed in the group: the
    // best look you got at the contact, not the most recent noisy one.
    if (candidate.confidence > survivor.confidence) {
      survivor.confidence = candidate.confidence;
    }

    // Preserve the anomaly flag — a duplicate that was flagged still matters.
    if (candidate.isAnomaly && !survivor.isAnomaly) {
      survivor.isAnomaly = true;
      survivor.anomalyReason = candidate.anomalyReason;
    }

    survivor.raw = {
      ...survivor.raw,
      mergedFrom: absorbed,
      mergeCount: absorbed.length,
    };
  }

  return { events: survivors, removed, merged };
}
