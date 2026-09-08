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
 * One event's dedupe-relevant fields, expanded once instead of re-derived
 * inside every pairwise comparison. `dedupeEvents` runs an O(n^2) survivor
 * scan; caching the title normalization and timestamp parse turns that from a
 * per-comparison regex into a couple of string and arithmetic checks.
 */
interface PreparedEvent {
  event: UnifiedEvent;
  normalizedTitle: string;
  epochMs: number;
}

function prepare(e: UnifiedEvent): PreparedEvent {
  return { event: e, normalizedTitle: normalizeTitle(e.title), epochMs: toEpochMs(e.timestamp) };
}

/** Duplicate predicate over precomputed fields; same geometry as `isDuplicate`. */
function isPreparedDuplicate(a: PreparedEvent, b: PreparedEvent): boolean {
  if (a.event.sourceType !== b.event.sourceType) return false;
  if (a.normalizedTitle !== b.normalizedTitle) return false;
  if (Math.abs(a.epochMs - b.epochMs) / 1000 > DEDUPE_WINDOW_SECONDS) return false;
  return haversineMeters(a.event.location, b.event.location) <= DEDUPE_RADIUS_METERS;
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
  const sorted = events.map(prepare).sort((a, b) => b.epochMs - a.epochMs);

  const survivors: PreparedEvent[] = [];
  const merged = new Map<string, string[]>();
  let removed = 0;

  for (const candidate of sorted) {
    const survivor = survivors.find((s) => isPreparedDuplicate(s, candidate));

    if (!survivor) {
      survivors.push(candidate);
      continue;
    }

    removed++;
    const survivorEvent = survivor.event;
    const absorbed = merged.get(survivorEvent.id) ?? [];
    absorbed.push(candidate.event.id);
    merged.set(survivorEvent.id, absorbed);

    // The survivor keeps the strongest confidence observed in the group: the
    // best look you got at the contact, not the most recent noisy one.
    if (candidate.event.confidence > survivorEvent.confidence) {
      survivorEvent.confidence = candidate.event.confidence;
    }

    // Preserve the anomaly flag — a duplicate that was flagged still matters.
    if (candidate.event.isAnomaly && !survivorEvent.isAnomaly) {
      survivorEvent.isAnomaly = true;
      survivorEvent.anomalyReason = candidate.event.anomalyReason;
    }

    survivorEvent.raw = {
      ...survivorEvent.raw,
      mergedFrom: absorbed,
      mergeCount: absorbed.length,
    };
  }

  return {
    events: survivors.map((s) => s.event),
    removed,
    merged,
  };
}
